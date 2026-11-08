@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "LOG=%~dp0install-log.txt"
set "RC=1"
set "NP_MODE="
set "NP_PY="

where py >nul 2>&1
if not errorlevel 1 (
  py -3 -c "import sys; raise SystemExit(0 if sys.version_info[0]>=3 else 1)" >nul 2>&1
  if not errorlevel 1 set "NP_MODE=py"
)

if defined NP_MODE goto run
where python >nul 2>&1
if errorlevel 1 goto no_python
for /f "delims=" %%F in ('where python 2^>nul') do (
  echo %%F | find /I "WindowsApps" >nul
  if errorlevel 1 if not defined NP_PY set "NP_PY=%%F"
)
if not defined NP_PY goto no_python
"%NP_PY%" -c "import sys; raise SystemExit(0 if sys.version_info[0]>=3 else 1)" >nul 2>&1
if errorlevel 1 goto no_python
set "NP_MODE=direct"

:run
chcp 65001 >nul
if "%NP_MODE%"=="py" goto run_py
"%NP_PY%" -u "%~dp0install.py" %*
set "RC=%ERRORLEVEL%"
goto after
:run_py
py -3 -u "%~dp0install.py" %*
set "RC=%ERRORLEVEL%"
goto after

:no_python
echo Python 3 was not found.
echo Install it from https://www.python.org/downloads/
echo On the first screen, tick Add python.exe to PATH.
echo The python icon from the Microsoft Store does not run this installer.
echo.
echo Failed. Open install-log.txt next to install.bat and send that file.
>>"%LOG%" echo Python 3 was not found. Install from https://www.python.org/downloads/ and tick Add python.exe to PATH. The Microsoft Store python alias does not run this installer.
set "RC=1"

:after
echo.
echo %cmdcmdline% | find /I "%~nx0" >nul
if not errorlevel 1 pause
exit /b %RC%
