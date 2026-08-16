# Готовит фото для блока «Обо мне»: обрезает под 4:5 и срезает низ со стикерами/реакциями.
#
# Как пользоваться:
#   1. Сохраните фото в assets/img/about-raw.jpg (или .png)
#   2. Правый клик по этому файлу → «Выполнить с помощью PowerShell»
#      (или в терминале: powershell -ExecutionPolicy Bypass -File tools\crop-avatar.ps1)
#   3. Рядом появится assets/img/about.jpg — сайт подхватит его сам
#
# Скрипт уже отработал по текущему фото — запускать заново нужно только
# при замене about-raw.jpg на другой кадр.

# Рамка кропа в долях от размера исходника. Значения подобраны под фото 960×1208
# из Instagram: низ срезан выше кружков сторис, рамка сдвинута к фигуре.
$LEFT   = 0.021
$TOP    = 0.050
$WIDTH  = 0.792   # высота считается автоматически, чтобы вышло ровно 4:5

Add-Type -AssemblyName System.Drawing

$img = Join-Path $PSScriptRoot '..\assets\img'
$raw = Get-ChildItem -Path $img -Filter 'about-raw.*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $raw) {
  Write-Host 'Не найден assets\img\about-raw.jpg — сохраните туда фото и запустите снова.' -ForegroundColor Yellow
  Read-Host 'Enter для выхода'; exit 1
}

$src = [System.Drawing.Image]::FromFile($raw.FullName)

$srcW = [int]($src.Width * $WIDTH)
$srcH = [int]($srcW * 5 / 4)
$left = [int]($src.Width  * $LEFT)
$top  = [int]($src.Height * $TOP)

# не вылезаем за границы кадра
if ($srcH -gt $src.Height) { $srcH = $src.Height; $srcW = [int]($srcH * 4 / 5) }
$left = [Math]::Max(0, [Math]::Min($left, $src.Width  - $srcW))
$top  = [Math]::Max(0, [Math]::Min($top,  $src.Height - $srcH))

$outW = 900; $outH = 1125
$out = New-Object System.Drawing.Bitmap($outW, $outH)
$g   = [System.Drawing.Graphics]::FromImage($out)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src,
  (New-Object System.Drawing.Rectangle(0, 0, $outW, $outH)),
  (New-Object System.Drawing.Rectangle($left, $top, $srcW, $srcH)),
  [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()

$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$prm = New-Object System.Drawing.Imaging.EncoderParameters(1)
$prm.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92L)
$out.Save((Join-Path $img 'about.jpg'), $enc, $prm)
$out.Dispose()

Write-Host "Готово: assets\img\about.jpg  (взято $srcW x $srcH из $($raw.Name))" -ForegroundColor Green
Read-Host 'Enter для выхода'
