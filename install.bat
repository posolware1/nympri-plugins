@echo off
REM Install NymPri NP_* plugins into a game www folder.
REM Usage: install.bat "C:\Games\NymPri\www"
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: install.bat "C:\path\to\game\www"
  echo Example: install.bat "D:\Games\Nymphomania Priestess\www"
  exit /b 2
)
where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo Python not found. Install Python 3, or copy manually:
    echo   1^) Copy every plugins\NP_*\NP_*.js into www\js\plugins\
    echo   2^) Copy plugins\*\assets\* into www\ ^(keep img\, movies\, ...^)
    echo   3^) Run: python install.py "www"
    exit /b 1
  )
  py -3 install.py %*
  exit /b %ERRORLEVEL%
)
python install.py %*
exit /b %ERRORLEVEL%
