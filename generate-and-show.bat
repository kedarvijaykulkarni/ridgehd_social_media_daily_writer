@echo off
setlocal

chcp 65001 >nul

rem Run from this script's own directory — this repo is standalone, no
rem fixed absolute path. %~dp0 always ends with a backslash, so cd /d
rem takes it as-is; then anchor APP_DIR to the resolved current dir.
cd /d "%~dp0"
set "APP_DIR=%CD%"

if not exist "%APP_DIR%\package.json" (
  echo Could not find social-daily app at:
  echo "%APP_DIR%"
  echo.
  pause
  exit /b 1
)

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "RUN_DATE=%%I"
rem Local var only — do NOT name this OUTPUT_DIR, that env var is read by
rem the app and would make it nest the date folder twice.
set "RUN_OUTPUT_DIR=%APP_DIR%\output\%RUN_DATE%"
set "IMAGE_PROMPT=%RUN_OUTPUT_DIR%\image-prompt.txt"
set "SOCIAL_POSTS=%RUN_OUTPUT_DIR%\social-posts.txt"
set "BLOG_POST=%RUN_OUTPUT_DIR%\blog-post.md"
set "LINKEDIN_ARTICLE=%RUN_OUTPUT_DIR%\linkedin-article.md"

echo Running social daily generator (with long-form blog + LinkedIn article)...
echo.
call npm run generate -- --long-form
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
echo.
echo ================================================================
echo blog-post.md
echo ================================================================
if exist "%BLOG_POST%" (
  type "%BLOG_POST%"
) else (
  echo Missing file: "%BLOG_POST%"
)

echo.
echo.
echo ================================================================
echo linkedin-article.md
echo ================================================================
if exist "%LINKEDIN_ARTICLE%" (
  type "%LINKEDIN_ARTICLE%"
) else (
  echo Missing file: "%LINKEDIN_ARTICLE%"
)

echo.
echo Press any key to close this window after you copy the text.
pause >nul
endlocal
