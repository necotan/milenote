@echo off
setlocal
rem Double-click to run backup.ps1 with PowerShell 7 (pwsh reads UTF-8 scripts without a BOM correctly; Windows PowerShell 5.1 does not)
rem pwsh is not always on PATH, so try the standard install location first
rem Uses goto instead of parenthesized blocks, which break when a path contains "(x86)"
set "PWSH=%ProgramFiles%\PowerShell\7\pwsh.exe"
if exist "%PWSH%" goto run
where pwsh >nul 2>nul || goto notfound
set "PWSH=pwsh"

:run
"%PWSH%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1" %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%

:notfound
echo PowerShell 7 (pwsh) was not found. Install it and run this again.
pause
exit /b 1
