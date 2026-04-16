# Premium PWA icon: remove textured backdrop, place art on brand gradient.
param(
  [string]$Source = "",
  [string]$OutDir = "icons"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not $Source) {
  $Source = Join-Path (Join-Path $repoRoot "icons") "icon-source.png"
}
if (-not (Test-Path $Source)) {
  Write-Error "Source not found: $Source"
}

$OutDir = Join-Path $repoRoot $OutDir | Resolve-Path
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Get-CornerAvg([System.Drawing.Bitmap]$bmp, [int]$x0, [int]$y0, [int]$sz) {
  $tr = 0; $tg = 0; $tb = 0; $n = 0
  for ($y = $y0; $y -lt [Math]::Min($y0 + $sz, $bmp.Height); $y++) {
    for ($x = $x0; $x -lt [Math]::Min($x0 + $sz, $bmp.Width); $x++) {
      $c = $bmp.GetPixel($x, $y)
      $tr += [int]$c.R; $tg += [int]$c.G; $tb += [int]$c.B; $n++
    }
  }
  if ($n -eq 0) { return @{ R = 40; G = 40; B = 40 } }
  return @{ R = [int]($tr / $n); G = [int]($tg / $n); B = [int]($tb / $n) }
}

function Manhattan([System.Drawing.Color]$c, $avg) {
  return [Math]::Abs([int]$c.R - $avg.R) + [Math]::Abs([int]$c.G - $avg.G) + [Math]::Abs([int]$c.B - $avg.B)
}

function Remove-Backdrop([System.Drawing.Bitmap]$bmp, [int]$tol) {
  $sz = [Math]::Min(24, [Math]::Floor([Math]::Min($bmp.Width, $bmp.Height) / 8))
  $ca = Get-CornerAvg $bmp 0 0 $sz
  $cb = Get-CornerAvg $bmp ($bmp.Width - $sz) 0 $sz
  $cc = Get-CornerAvg $bmp 0 ($bmp.Height - $sz) $sz
  $cd = Get-CornerAvg $bmp ($bmp.Width - $sz) ($bmp.Height - $sz) $sz
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $d = [Math]::Min(
        (Manhattan $c $ca),
        [Math]::Min((Manhattan $c $cb), [Math]::Min((Manhattan $c $cc), (Manhattan $c $cd)))
      )
      if ($d -lt $tol) {
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      }
    }
  }
}

# Load & center-crop (focus on white tile + art)
$img = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
$cropSide = [Math]::Max(64, [Math]::Floor([Math]::Min($img.Width, $img.Height) * 0.86))
$cropX = [int](($img.Width - $cropSide) / 2)
$cropY = [int](($img.Height - $cropSide) / 2)

$bCrop = New-Object System.Drawing.Bitmap $cropSide, $cropSide, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCrop = [System.Drawing.Graphics]::FromImage($bCrop)
$gCrop.DrawImage(
  $img,
  (New-Object System.Drawing.Rectangle 0, 0, $cropSide, $cropSide),
  (New-Object System.Drawing.Rectangle $cropX, $cropY, $cropSide, $cropSide),
  [System.Drawing.GraphicsUnit]::Pixel
)
$gCrop.Dispose()
$img.Dispose()

Remove-Backdrop $bCrop 88

# Final 512 canvas — brand gradient + soft gold bloom
$W = 512
$out = New-Object System.Drawing.Bitmap $W, $W, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(255, 15, 25, 35))

$gBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
  ([System.Drawing.Point]::new(0, 0)), `
  ([System.Drawing.Point]::new(0, $W)), `
  ([System.Drawing.Color]::FromArgb(255, 15, 25, 35)), `
  ([System.Drawing.Color]::FromArgb(255, 26, 40, 58))
$g.FillRectangle($gBrush, 0, 0, $W, $W)
$gBrush.Dispose()

$g.FillEllipse(
  (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(22, 240, 184, 64))),
  [int]($W * 0.12), [int]($W * 0.10), [int]($W * 0.76), [int]($W * 0.76)
)

$target = [int]($W * 0.70)
$dstX = [int](($W - $target) / 2)
$dstY = [int](($W - $target) / 2)

$g.DrawImage($bCrop, $dstX, $dstY, $target, $target)
$bCrop.Dispose()
$g.Dispose()

function Export-Size([System.Drawing.Bitmap]$src, [int]$s, [string]$path) {
  $b = New-Object System.Drawing.Bitmap $s, $s, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gg = [System.Drawing.Graphics]::FromImage($b)
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.DrawImage($src, 0, 0, $s, $s)
  $b.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $gg.Dispose()
  $b.Dispose()
}

$p512 = Join-Path $OutDir "icon-512.png"
$p192 = Join-Path $OutDir "icon-192.png"
$p180 = Join-Path $OutDir "icon-180.png"
$out.Save($p512, [System.Drawing.Imaging.ImageFormat]::Png)
Export-Size $out 192 $p192
Export-Size $out 180 $p180
$out.Dispose()

Write-Host "OK: $p512, $p192, $p180"
