# PWA ikonlari: krem zemini seffaflastirir; dis sinir = mevcut resimdeki SIYAH CERCEVE
# (disaridan merkeze: ilk yeterince opak VE koyu — cerceve/AA — piksel).
param(
  [string]$Source = "",
  [string]$OutDir = "icons",
  [int]$BackdropTol = 62,
  [int]$AlphaGate = 28,
  [double]$LumMaxBorder = 142,
  [double]$FeatherPx = 1.05
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not $Source) {
  $Source = Join-Path $repoRoot "icons\logo-source-hesap-kitap.png"
}
if (-not (Test-Path $Source)) {
  Write-Error "Source not found: $Source"
}

$OutDirFull = Join-Path $repoRoot $OutDir
New-Item -ItemType Directory -Force -Path $OutDirFull | Out-Null

function Get-CornerAvg([System.Drawing.Bitmap]$bmp, [int]$x0, [int]$y0, [int]$sz) {
  $tr = 0; $tg = 0; $tb = 0; $n = 0
  for ($y = $y0; $y -lt [Math]::Min($y0 + $sz, $bmp.Height); $y++) {
    for ($x = $x0; $x -lt [Math]::Min($x0 + $sz, $bmp.Width); $x++) {
      $c = $bmp.GetPixel($x, $y)
      $tr += [int]$c.R; $tg += [int]$c.G; $tb += [int]$c.B; $n++
    }
  }
  if ($n -eq 0) { return @{ R = 245; G = 245; B = 235 } }
  return @{ R = [int]($tr / $n); G = [int]($tg / $n); B = [int]($tb / $n) }
}

function Color-Dist($c, $avg) {
  return [Math]::Abs([int]$c.R - $avg.R) + [Math]::Abs([int]$c.G - $avg.G) + [Math]::Abs([int]$c.B - $avg.B)
}

function Get-Lum([System.Drawing.Color]$c) {
  return 0.299 * [int]$c.R + 0.587 * [int]$c.G + 0.114 * [int]$c.B
}

# Cerceve pikseli: opak + koyu (siyah hat ve kenar yumusatma)
function Test-BorderPixel([System.Drawing.Color]$c, [int]$alphaGate, [double]$lumMax) {
  if ([int]$c.A -le $alphaGate) { return $false }
  return (Get-Lum $c) -le $lumMax
}

function Remove-Backdrop([System.Drawing.Bitmap]$bmp, [int]$tol) {
  $sz = [Math]::Max(8, [Math]::Floor([Math]::Min($bmp.Width, $bmp.Height) / 10))
  $ca = Get-CornerAvg $bmp 0 0 $sz
  $cb = Get-CornerAvg $bmp ($bmp.Width - $sz) 0 $sz
  $cc = Get-CornerAvg $bmp 0 ($bmp.Height - $sz) $sz
  $cd = Get-CornerAvg $bmp ($bmp.Width - $sz) ($bmp.Height - $sz) $sz
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $d = [Math]::Min(
        (Color-Dist $c $ca),
        [Math]::Min((Color-Dist $c $cb), [Math]::Min((Color-Dist $c $cc), (Color-Dist $c $cd)))
      )
      if ($d -lt $tol) {
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      }
    }
  }
}

function Get-AlphaBBox([System.Drawing.Bitmap]$bmp) {
  $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
  $found = $false
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      if ([int]$bmp.GetPixel($x, $y).A -gt 12) {
        $found = $true
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if (-not $found) {
    return @{ X = 0; Y = 0; W = $bmp.Width; H = $bmp.Height }
  }
  return @{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

function New-SquareCrop([System.Drawing.Bitmap]$src, $box) {
  $side = [Math]::Max($box.W, $box.H)
  $cx = $box.X + ($box.W / 2.0)
  $cy = $box.Y + ($box.H / 2.0)
  $x0 = [int][Math]::Floor($cx - $side / 2.0)
  $y0 = [int][Math]::Floor($cy - $side / 2.0)
  if ($x0 -lt 0) { $x0 = 0 }
  if ($y0 -lt 0) { $y0 = 0 }
  if ($x0 + $side -gt $src.Width) { $x0 = $src.Width - $side }
  if ($y0 + $side -gt $src.Height) { $y0 = $src.Height - $side }
  if ($x0 -lt 0 -or $y0 -lt 0) {
    $side = [Math]::Min($src.Width, $src.Height)
    $x0 = [int](($src.Width - $side) / 2)
    $y0 = [int](($src.Height - $side) / 2)
  }

  $b = New-Object System.Drawing.Bitmap $side, $side, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $side, $side), (New-Object System.Drawing.Rectangle $x0, $y0, $side, $side), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $b
}

# Disaridan merkeze: cerceve (koyu) piksele kadar; olmazsa geri dusus = ilk opak
function Measure-OuterCircle([System.Drawing.Bitmap]$bmp, [double]$cx, [double]$cy, [int]$alphaGate, [double]$lumMax) {
  $w = $bmp.Width
  $h = $bmp.Height
  $diag = [Math]::Sqrt(($w / 2.0) * ($w / 2.0) + ($h / 2.0) * ($h / 2.0))
  $Rmax = [Math]::Ceiling($diag) + 6
  $radii = New-Object System.Collections.ArrayList

  for ($deg = 0; $deg -lt 360; $deg++) {
    $rad = $deg * [Math]::PI / 180.0
    $co = [Math]::Cos($rad)
    $si = [Math]::Sin($rad)
    $got = $false
    for ($rStep = 0; $rStep -le ($Rmax * 2); $rStep++) {
      $r = $Rmax - ($rStep * 0.5)
      if ($r -lt 0) { break }
      $xi = [int][Math]::Round($cx + $r * $co)
      $yi = [int][Math]::Round($cy + $r * $si)
      if ($xi -lt 0 -or $xi -ge $w -or $yi -lt 0 -or $yi -ge $h) { continue }
      $col = $bmp.GetPixel($xi, $yi)
      if (Test-BorderPixel $col $alphaGate $lumMax) {
        [void]$radii.Add($r)
        $got = $true
        break
      }
    }
    if (-not $got) {
      for ($rStep = 0; $rStep -le ($Rmax * 2); $rStep++) {
        $r = $Rmax - ($rStep * 0.5)
        if ($r -lt 0) { break }
        $xi = [int][Math]::Round($cx + $r * $co)
        $yi = [int][Math]::Round($cy + $r * $si)
        if ($xi -lt 0 -or $xi -ge $w -or $yi -lt 0 -or $yi -ge $h) { continue }
        $col = $bmp.GetPixel($xi, $yi)
        if ([int]$col.A -gt $alphaGate) {
          [void]$radii.Add($r)
          break
        }
      }
    }
  }

  if ($radii.Count -eq 0) {
    return [Math]::Min($w, $h) / 2.0 * 0.48
  }
  $sorted = $radii | Sort-Object
  $n = $sorted.Count
  $mid = [int][Math]::Floor($n / 2)
  if (($n % 2) -eq 1) {
    return [double]$sorted[$mid]
  }
  return ([double]$sorted[$mid - 1] + [double]$sorted[$mid]) / 2.0
}

function Get-CenterFromRays([System.Drawing.Bitmap]$bmp, [double]$cx0, [double]$cy0, [int]$alphaGate, [double]$lumMax, [double]$RGuess) {
  $w = $bmp.Width
  $h = $bmp.Height
  $Rmax = [Math]::Max($RGuess + 8, [Math]::Ceiling([Math]::Sqrt(($w / 2.0) * ($w / 2.0) + ($h / 2.0) * ($h / 2.0))) + 6)
  $sx = 0.0
  $sy = 0.0
  $cnt = 0

  for ($deg = 0; $deg -lt 360; $deg++) {
    $rad = $deg * [Math]::PI / 180.0
    $co = [Math]::Cos($rad)
    $si = [Math]::Sin($rad)
    $got = $false
    for ($rStep = 0; $rStep -le ($Rmax * 2); $rStep++) {
      $r = $Rmax - ($rStep * 0.5)
      if ($r -lt 0) { break }
      $xi = [int][Math]::Round($cx0 + $r * $co)
      $yi = [int][Math]::Round($cy0 + $r * $si)
      if ($xi -lt 0 -or $xi -ge $w -or $yi -lt 0 -or $yi -ge $h) { continue }
      $col = $bmp.GetPixel($xi, $yi)
      if (Test-BorderPixel $col $alphaGate $lumMax) {
        $sx += $xi
        $sy += $yi
        $cnt++
        $got = $true
        break
      }
    }
    if (-not $got) {
      for ($rStep = 0; $rStep -le ($Rmax * 2); $rStep++) {
        $r = $Rmax - ($rStep * 0.5)
        if ($r -lt 0) { break }
        $xi = [int][Math]::Round($cx0 + $r * $co)
        $yi = [int][Math]::Round($cy0 + $r * $si)
        if ($xi -lt 0 -or $xi -ge $w -or $yi -lt 0 -or $yi -ge $h) { continue }
        $col = $bmp.GetPixel($xi, $yi)
        if ([int]$col.A -gt $alphaGate) {
          $sx += $xi
          $sy += $yi
          $cnt++
          break
        }
      }
    }
  }

  if ($cnt -eq 0) { return @{ Cx = $cx0; Cy = $cy0 } }
  return @{ Cx = ($sx / $cnt); Cy = ($sy / $cnt) }
}

function Apply-CircleMaskToRadius([System.Drawing.Bitmap]$bmp, [double]$cx, [double]$cy, [double]$R, [double]$feather) {
  $w = $bmp.Width
  $h = $bmp.Height
  $rIn = $R - $feather
  $rOut = $R + $feather

  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $a = [int]$c.A
      if ($a -eq 0) { continue }

      $dx = $x - $cx
      $dy = $y - $cy
      $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)

      if ($dist -ge $rOut) {
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
      }
      elseif ($dist -le $rIn) {
        # tam ic
      }
      else {
        $t = [Math]::Max(0.0, [Math]::Min(1.0, ($rOut - $dist) / (2.0 * $feather)))
        $na = [int][Math]::Round($a * $t)
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($na, $c.R, $c.G, $c.B))
      }
    }
  }
}

function Export-Size([System.Drawing.Bitmap]$src, [int]$s, [string]$path) {
  $b = New-Object System.Drawing.Bitmap $s, $s, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gg = [System.Drawing.Graphics]::FromImage($b)
  $gg.Clear([System.Drawing.Color]::Transparent)
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gg.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $gg.DrawImage($src, 0, 0, $s, $s)
  $b.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $gg.Dispose()
  $b.Dispose()
}

# --- pipeline ---
$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Source))
$b0 = New-Object System.Drawing.Bitmap $img.Width, $img.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g0 = [System.Drawing.Graphics]::FromImage($b0)
$g0.Clear([System.Drawing.Color]::Transparent)
$g0.DrawImage($img, 0, 0, $img.Width, $img.Height)
$g0.Dispose()
$img.Dispose()

Remove-Backdrop $b0 $BackdropTol
$box = Get-AlphaBBox $b0
$square = New-SquareCrop $b0 $box
$b0.Dispose()

$cx0 = $square.Width / 2.0
$cy0 = $square.Height / 2.0
$r0 = Measure-OuterCircle $square $cx0 $cy0 $AlphaGate $LumMaxBorder
$C = Get-CenterFromRays $square $cx0 $cy0 $AlphaGate $LumMaxBorder $r0
$Rfinal = Measure-OuterCircle $square $C.Cx $C.Cy $AlphaGate $LumMaxBorder

Apply-CircleMaskToRadius $square $C.Cx $C.Cy $Rfinal $FeatherPx

$work = 1024
$master = New-Object System.Drawing.Bitmap $work, $work, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gm = [System.Drawing.Graphics]::FromImage($master)
$gm.Clear([System.Drawing.Color]::Transparent)
$gm.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gm.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gm.DrawImage($square, 0, 0, $work, $work)
$gm.Dispose()
$square.Dispose()

$p512 = Join-Path $OutDirFull "icon-512.png"
$p256 = Join-Path $OutDirFull "icon-256.png"
$p192 = Join-Path $OutDirFull "icon-192.png"
$p180 = Join-Path $OutDirFull "icon-180.png"

$master.Save($p512, [System.Drawing.Imaging.ImageFormat]::Png)
Export-Size $master 256 $p256
Export-Size $master 192 $p192
Export-Size $master 180 $p180
$master.Dispose()

Write-Host ("OK R={0:0.##} cx={1:0.##} cy={2:0.##}" -f $Rfinal, $C.Cx, $C.Cy)
Write-Host "OK: $p512, $p256, $p192, $p180"
