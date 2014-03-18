@echo off
set _PRG_DIR=%~dp0

echo Stopping Atlassian Stash
echo .
call "%_PRG_DIR%\shutdown.bat" %1 %2 %3 %4 %5 %6 %7 %8 %9
echo .
set STASH_CONTEXT=
set STASH_HTTPPORT=

FOR /F "eol=# tokens=1,2 delims==" %%a in (%_PRG_DIR%..\conf\scripts.cfg) DO (
    if %%a==stash_context set STASH_CONTEXT=%%b
    if %%a==stash_httpport set STASH_HTTPPORT=%%b
)
echo Stopped Atlassian Stash at http://localhost:%STASH_HTTPPORT%/%STASH_CONTEXT%

