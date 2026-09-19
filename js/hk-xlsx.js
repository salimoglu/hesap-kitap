/* hk-xlsx.js — Excel uyumlu .xlsx (OOXML sira + deflate + shared strings) */
(function (global) {
  var ENC = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  var CRC_TAB = null;

  function utf8(str) {
    str = String(str == null ? "" : str);
    if (ENC) return ENC.encode(str);
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var lo = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  function concatU8(parts) {
    var n = 0, i, off = 0, out;
    for (i = 0; i < parts.length; i++) n += parts[i].length;
    out = new Uint8Array(n);
    for (i = 0; i < parts.length; i++) { out.set(parts[i], off); off += parts[i].length; }
    return out;
  }

  function u16(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
  function u32(n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }

  function crcTable() {
    if (CRC_TAB) return CRC_TAB;
    CRC_TAB = new Uint32Array(256);
    var i, c, k;
    for (i = 0; i < 256; i++) {
      c = i;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TAB[i] = c >>> 0;
    }
    return CRC_TAB;
  }

  function crc32(bytes) {
    var tab = crcTable(), crc = 0xFFFFFFFF, i;
    for (i = 0; i < bytes.length; i++) crc = tab[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(d) {
    d = d || new Date();
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function deflateRaw(bytes) {
    try {
      if (typeof process !== "undefined" && typeof require === "function") {
        var zlib = require("zlib");
        var buf = zlib.deflateRawSync(Buffer.from(bytes));
        return Promise.resolve(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      }
    } catch (e) {}
    if (typeof CompressionStream === "function") {
      var cs = new CompressionStream("deflate-raw");
      var writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      if (typeof Response === "function") {
        return new Response(cs.readable).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
      }
    }
    return Promise.resolve(null);
  }

  function zipPack(files, now) {
    var dt = dosDateTime(now);
    var chain = Promise.resolve();
    var packed = [];
    files.forEach(function (f) {
      chain = chain.then(function () {
        var name = utf8(f.name);
        var data = f.data instanceof Uint8Array ? f.data : utf8(f.data);
        var crc = crc32(data);
        return deflateRaw(data).then(function (compressed) {
          var method = 0, payload = data;
          if (compressed && compressed.length && compressed.length < data.length) {
            method = 8;
            payload = compressed;
          }
          packed.push({ name: name, data: data, payload: payload, crc: crc, method: method });
        });
      });
    });
    return chain.then(function () {
      var locals = [], centrals = [], offset = 0, i;
      for (i = 0; i < packed.length; i++) {
        var p = packed[i];
        var local = concatU8([
          u32(0x04034b50), u16(20), u16(0x0800), u16(p.method),
          u16(dt.time), u16(dt.date), u32(p.crc), u32(p.payload.length), u32(p.data.length),
          u16(p.name.length), u16(0), p.name, p.payload
        ]);
        locals.push(local);
        centrals.push(concatU8([
          u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(p.method),
          u16(dt.time), u16(dt.date), u32(p.crc), u32(p.payload.length), u32(p.data.length),
          u16(p.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), p.name
        ]));
        offset += local.length;
      }
      var central = concatU8(centrals);
      var eocd = concatU8([
        u32(0x06054b50), u16(0), u16(0), u16(packed.length), u16(packed.length),
        u32(central.length), u32(offset), u16(0)
      ]);
      return concatU8(locals.concat([central, eocd]));
    });
  }

  function xmlEsc(s) {
    return String(s == null ? "" : s)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function colLetter(n) {
    var s = "", x = n + 1, m;
    while (x > 0) { m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
    return s;
  }

  function cellRef(c, r) { return colLetter(c) + r; }

  function isoNow(d) {
    d = d || new Date();
    return d.toISOString().replace(/\.\d+Z$/, "Z");
  }

  function numStr(n, digits) {
    if (!isFinite(n)) n = 0;
    var f = Math.pow(10, digits == null ? 6 : digits);
    var v = Math.round(n * f) / f;
    if (Object.is && Object.is(v, -0)) v = 0;
    return String(v);
  }

  function sheetSafeName(name) {
    var s = String(name == null ? "Sayfa" : name).replace(/[:\\/?*\[\]]/g, " ").replace(/\s+/g, " ").trim();
    if (!s) s = "Sayfa";
    return s.length > 31 ? s.slice(0, 31) : s;
  }

  function needsPreserve(s) {
    return /^\s|\s$/.test(s) || /  /.test(s);
  }

  function stylesXml(styles) {
    styles = styles || {};
    var fonts = styles.fonts || [{ sz: 11, name: "Calibri", color: "FF1F2933" }];
    var fills = styles.fills || [{ none: true }, { gray125: true }];
    var borders = styles.borders || [{}];
    var xfs = styles.xfs || [{ font: 0, fill: 0, border: 0 }];
    var numFmts = styles.numFmts || [];
    var i, f, b, x, parts;

    parts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'];

    if (numFmts.length) {
      parts.push('<numFmts count="' + numFmts.length + '">');
      for (i = 0; i < numFmts.length; i++) {
        parts.push('<numFmt numFmtId="' + numFmts[i].id + '" formatCode="' + xmlEsc(numFmts[i].code) + '"/>');
      }
      parts.push("</numFmts>");
    }

    parts.push('<fonts count="' + fonts.length + '">');
    for (i = 0; i < fonts.length; i++) {
      f = fonts[i];
      parts.push("<font>");
      if (f.bold) parts.push("<b/>");
      if (f.italic) parts.push("<i/>");
      parts.push('<sz val="' + (f.sz || 11) + '"/>');
      if (f.color) parts.push('<color rgb="' + f.color + '"/>');
      parts.push('<name val="' + xmlEsc(f.name || "Calibri") + '"/>');
      parts.push('<family val="2"/>');
      parts.push("</font>");
    }
    parts.push("</fonts>");

    parts.push('<fills count="' + fills.length + '">');
    for (i = 0; i < fills.length; i++) {
      f = fills[i];
      if (f.none) parts.push('<fill><patternFill patternType="none"/></fill>');
      else if (f.gray125) parts.push('<fill><patternFill patternType="gray125"/></fill>');
      else parts.push('<fill><patternFill patternType="solid"><fgColor rgb="' + f.fg + '"/><bgColor indexed="64"/></patternFill></fill>');
    }
    parts.push("</fills>");

    parts.push('<borders count="' + borders.length + '">');
    for (i = 0; i < borders.length; i++) {
      b = borders[i];
      if (!b.style) {
        parts.push("<border><left/><right/><top/><bottom/><diagonal/></border>");
      } else {
        var side = '<left style="' + b.style + '"><color rgb="' + (b.color || "FFB8C0C8") + '"/></left>' +
          '<right style="' + b.style + '"><color rgb="' + (b.color || "FFB8C0C8") + '"/></right>' +
          '<top style="' + b.style + '"><color rgb="' + (b.color || "FFB8C0C8") + '"/></top>' +
          '<bottom style="' + b.style + '"><color rgb="' + (b.color || "FFB8C0C8") + '"/></bottom><diagonal/>';
        parts.push("<border>" + side + "</border>");
      }
    }
    parts.push("</borders>");

    parts.push('<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>');
    parts.push('<cellXfs count="' + xfs.length + '">');
    for (i = 0; i < xfs.length; i++) {
      x = xfs[i];
      var attrs = 'numFmtId="' + (x.numFmt || 0) + '" fontId="' + (x.font || 0) + '" fillId="' + (x.fill || 0) + '" borderId="' + (x.border || 0) + '" xfId="0"';
      if (x.numFmt) attrs += ' applyNumberFormat="1"';
      if (x.font) attrs += ' applyFont="1"';
      if (x.fill) attrs += ' applyFill="1"';
      if (x.border) attrs += ' applyBorder="1"';
      if (x.align) attrs += ' applyAlignment="1"';
      parts.push("<xf " + attrs + ">");
      if (x.align) {
        var al = '<alignment';
        if (x.align.h) al += ' horizontal="' + x.align.h + '"';
        if (x.align.v) al += ' vertical="' + x.align.v + '"';
        if (x.align.wrap) al += ' wrapText="1"';
        if (x.align.indent) al += ' indent="' + x.align.indent + '"';
        al += "/>";
        parts.push(al);
      }
      parts.push("</xf>");
    }
    parts.push("</cellXfs>");
    parts.push('<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>');
    parts.push("</styleSheet>");
    return parts.join("");
  }

  function sharedStringsXml(list) {
    var parts = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + list.length + '" uniqueCount="' + list.length + '">'
    ];
    var i, t;
    for (i = 0; i < list.length; i++) {
      t = String(list[i]);
      parts.push("<si><t" + (needsPreserve(t) ? ' xml:space="preserve"' : "") + ">" + xmlEsc(t) + "</t></si>");
    }
    parts.push("</sst>");
    return parts.join("");
  }

  function collectSharedStrings(sheets) {
    var map = Object.create(null);
    var list = [];
    function idx(s) {
      s = String(s == null ? "" : s);
      if (Object.prototype.hasOwnProperty.call(map, s)) return map[s];
      map[s] = list.length;
      list.push(s);
      return map[s];
    }
    var i, j, k, row, cell;
    for (i = 0; i < sheets.length; i++) {
      var rows = sheets[i].rows || [];
      for (j = 0; j < rows.length; j++) {
        row = rows[j];
        for (k = 0; k < (row.cells || []).length; k++) {
          cell = row.cells[k];
          if (cell.t === "s" || cell.t === "inlineStr") cell._si = idx(cell.v);
        }
      }
    }
    return list;
  }

  function sheetXml(sheet) {
    var rows = sheet.rows || [];
    var merges = sheet.merges || [];
    var cols = sheet.cols || [];
    var lastRow = 1, lastCol = 0, i, j, r, c, maxC;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (r.r > lastRow) lastRow = r.r;
      maxC = 0;
      for (j = 0; j < (r.cells || []).length; j++) {
        if (r.cells[j].c > maxC) maxC = r.cells[j].c;
      }
      if (maxC > lastCol) lastCol = maxC;
    }
    var dim = "A1:" + cellRef(lastCol, lastRow);
    var parts = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      "<sheetPr><pageSetUpPr fitToPage=\"1\"/></sheetPr>",
      '<dimension ref="' + dim + '"/>',
      "<sheetViews><sheetView workbookViewId=\"0\"" + (sheet.tabSelected ? ' tabSelected="1"' : "") + (sheet.hideGrid ? ' showGridLines="0"' : "") + ">"
    ];
    if (sheet.freezeRow) {
      var top = "A" + (sheet.freezeRow + 1);
      parts.push('<pane ySplit="' + sheet.freezeRow + '" topLeftCell="' + top + '" activePane="bottomLeft" state="frozen"/>');
      parts.push('<selection pane="bottomLeft" activeCell="' + top + '" sqref="' + top + '"/>');
    }
    parts.push("</sheetView></sheetViews>");
    parts.push('<sheetFormatPr defaultRowHeight="' + (sheet.rowH || 15) + '"/>');
    if (cols.length) {
      parts.push("<cols>");
      for (i = 0; i < cols.length; i++) {
        parts.push('<col min="' + cols[i].min + '" max="' + cols[i].max + '" width="' + cols[i].width + '" customWidth="1"/>');
      }
      parts.push("</cols>");
    }
    parts.push("<sheetData>");
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      var rowAttrs = 'r="' + r.r + '" spans="1:' + (lastCol + 1) + '"';
      if (r.ht) rowAttrs += ' ht="' + r.ht + '" customHeight="1"';
      parts.push("<row " + rowAttrs + ">");
      for (j = 0; j < (r.cells || []).length; j++) {
        c = r.cells[j];
        var ref = cellRef(c.c, r.r);
        var ca = 'r="' + ref + '"';
        if (c.s != null) ca += ' s="' + c.s + '"';
        if (c.t === "s" || c.t === "inlineStr") {
          parts.push("<c " + ca + ' t="s"><v>' + (c._si || 0) + "</v></c>");
        } else {
          parts.push("<c " + ca + ' t="n"><v>' + numStr(c.v, c.digits) + "</v></c>");
        }
      }
      parts.push("</row>");
    }
    parts.push("</sheetData>");
    if (sheet.autoFilter && !sheet.tableRid) parts.push('<autoFilter ref="' + sheet.autoFilter + '"/>');
    if (merges.length) {
      parts.push('<mergeCells count="' + merges.length + '">');
      for (i = 0; i < merges.length; i++) parts.push('<mergeCell ref="' + merges[i] + '"/>');
      parts.push("</mergeCells>");
    }
    parts.push('<printOptions horizontalCentered="1"/>');
    parts.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.55" header="0.3" footer="0.3"/>');
    parts.push('<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>');
    if (sheet.footer) {
      parts.push("<headerFooter><oddFooter>" + xmlEsc(sheet.footer) + "</oddFooter></headerFooter>");
    }
    if (sheet.tableRid) {
      parts.push('<tableParts count="1"><tablePart r:id="' + sheet.tableRid + '"/></tableParts>');
    }
    parts.push("</worksheet>");
    return parts.join("");
  }

  function tableXml(table) {
    var cols = table.columns, i;
    var parts = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="' + (table.id || 1) + '" name="' + xmlEsc(table.name) + '" displayName="' + xmlEsc(table.name) + '" ref="' + table.ref + '">',
      '<autoFilter ref="' + table.ref + '"/>',
      '<tableColumns count="' + cols.length + '">'
    ];
    for (i = 0; i < cols.length; i++) {
      parts.push('<tableColumn id="' + (i + 1) + '" name="' + xmlEsc(cols[i]) + '"/>');
    }
    parts.push("</tableColumns>");
    parts.push('<tableStyleInfo name="' + xmlEsc(table.style || "TableStyleMedium2") + '" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>');
    parts.push("</table>");
    return parts.join("");
  }

  function build(spec) {
    spec = spec || {};
    var now = spec.now || new Date();
    var sheets = spec.sheets || [];
    var styles = spec.styles || {};
    var creator = spec.creator || "Hesap Kitap";
    var title = spec.title || "Rapor";
    var files = [];
    var i, sheet, sheetPath, rels, sst = collectSharedStrings(sheets);

    var sheetEls = [];
    var wbRels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'];
    var overrides = [];
    var tableSeq = 0;
    var nextRel = 1;

    for (i = 0; i < sheets.length; i++) {
      sheet = sheets[i];
      sheetPath = "xl/worksheets/sheet" + (i + 1) + ".xml";
      var rid = "rId" + nextRel++;
      sheetEls.push('<sheet name="' + xmlEsc(sheetSafeName(sheet.name)) + '" sheetId="' + (i + 1) + '" r:id="' + rid + '"/>');
      wbRels.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>');
      overrides.push('<Override PartName="/' + sheetPath + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');

      if (sheet.table) {
        tableSeq += 1;
        var tName = "xl/tables/table" + tableSeq + ".xml";
        sheet.table.id = tableSeq;
        sheet.tableRid = "rId1";
        files.push({ name: tName, data: tableXml(sheet.table) });
        overrides.push('<Override PartName="/' + tName + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>');
        rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table' + tableSeq + '.xml"/>' +
          "</Relationships>";
        files.push({ name: "xl/worksheets/_rels/sheet" + (i + 1) + ".xml.rels", data: rels });
      }
      files.push({ name: sheetPath, data: sheetXml(sheet) });
    }

    var stylesRid = "rId" + nextRel++;
    var sstRid = "rId" + nextRel++;
    wbRels.push('<Relationship Id="' + stylesRid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>');
    wbRels.push('<Relationship Id="' + sstRid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>');
    wbRels.push("</Relationships>");

    var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="22228"/>' +
      '<workbookPr/>' +
      "<bookViews><workbookView xWindow=\"0\" yWindow=\"0\" windowWidth=\"24000\" windowHeight=\"15000\"/></bookViews>" +
      "<sheets>" + sheetEls.join("") + "</sheets>" +
      "</workbook>";

    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      overrides.join("") +
      "</Types>";

    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      "</Relationships>";

    var created = isoNow(now);
    var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      "<dc:title>" + xmlEsc(title) + "</dc:title>" +
      "<dc:creator>" + xmlEsc(creator) + "</dc:creator>" +
      "<cp:lastModifiedBy>" + xmlEsc(creator) + "</cp:lastModifiedBy>" +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + created + "</dcterms:created>" +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + created + "</dcterms:modified>" +
      "</cp:coreProperties>";

    var sheetNames = sheets.map(function (s) { return xmlEsc(sheetSafeName(s.name)); });
    var app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      "<Application>Microsoft Excel</Application>" +
      "<DocSecurity>0</DocSecurity>" +
      "<ScaleCrop>false</ScaleCrop>" +
      "<HeadingPairs><vt:vector size=\"2\" baseType=\"variant\"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>" + sheets.length + "</vt:i4></vt:variant></vt:vector></HeadingPairs>" +
      "<TitlesOfParts><vt:vector size=\"" + sheets.length + "\" baseType=\"lpstr\">" +
      sheetNames.map(function (n) { return "<vt:lpstr>" + n + "</vt:lpstr>"; }).join("") +
      "</vt:vector></TitlesOfParts>" +
      "<Company>Hesap Kitap</Company>" +
      "<LinksUpToDate>false</LinksUpToDate>" +
      "<SharedDoc>false</SharedDoc>" +
      "<HyperlinksChanged>false</HyperlinksChanged>" +
      "<AppVersion>16.0300</AppVersion>" +
      "</Properties>";

    files.push({ name: "[Content_Types].xml", data: contentTypes });
    files.push({ name: "_rels/.rels", data: rootRels });
    files.push({ name: "docProps/core.xml", data: core });
    files.push({ name: "docProps/app.xml", data: app });
    files.push({ name: "xl/workbook.xml", data: workbook });
    files.push({ name: "xl/_rels/workbook.xml.rels", data: wbRels.join("") });
    files.push({ name: "xl/styles.xml", data: stylesXml(styles) });
    files.push({ name: "xl/sharedStrings.xml", data: sharedStringsXml(sst) });

    return zipPack(files, now);
  }

  function download(bytes, filename) {
    var copy = new Uint8Array(bytes.byteLength || bytes.length);
    copy.set(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    var blob = new Blob([copy], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "rapor.xlsx";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 20000);
  }

  var api = {
    build: build,
    download: download,
    xmlEsc: xmlEsc,
    colLetter: colLetter,
    cellRef: cellRef,
    sheetSafeName: sheetSafeName
  };

  global.HK_XLSX = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
