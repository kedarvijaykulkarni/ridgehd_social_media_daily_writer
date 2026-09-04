@echo off
setlocal

chcp 65001 >nul

rem Run from this script's own directory — this repo is standalone, no
rem fixed absolute path.
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

if not exist "%APP_DIR%\package.json" (
  echo Could not find social-daily app at:
  echo "%APP_DIR%"
  echo.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "RUN_DATE=%%I"
set "OUTPUT_DIR=%APP_DIR%\output\%RUN_DATE%"
set "IMAGE_PROMPT=%OUTPUT_DIR%\image-prompt.txt"
set "SOCIAL_POSTS=%OUTPUT_DIR%\social-posts.txt"

echo Running social daily generator...
echo.
call npm run generate
if errorlevel 1 (
  echo.
  echo npm run generate failed. Output files were not displayed.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo image-prompt.txt
echo ================================================================
if exist "%IMAGE_PROMPT%" (
  type "%IMAGE_PROMPT%"
) else (
  echo Missing file: "%IMAGE_PROMPT%"
)

echo.
echo.
echo ================================================================
echo social-posts.txt
echo ================================================================
if exist "%SOCIAL_POSTS%" (
  type "%SOCIAL_POSTS%"
) else (
  echo Missing file: "%SOCIAL_POSTS%"
)

echo.
echo Press any key to close this window after you copy the text.
pause >nul
endlocal
