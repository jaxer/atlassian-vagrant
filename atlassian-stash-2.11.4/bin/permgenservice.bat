set _PRG_DIR=%~dp0

rem Perm Gen size needs to be increased if encountering OutOfMemoryError: PermGen problems. Specifying PermGen size is
rem not valid on IBM JDKs

set STASH_MAX_PERM_SIZE=256m
IF EXIST "%_PRG_DIR%\permgen.bat" goto startPermGenCheck
goto skipPermGenCheck
:startPermGenCheck
call "%_PRG_DIR%\permgen.bat"
if ERRORLEVEL 1 goto endPermGenCheck
"%EXECUTABLE%" //US//%SERVICE_NAME% ++JvmOptions "-XX:MaxPermSize=%STASH_MAX_PERM_SIZE%"
:endPermGenCheck
set STASH_MAX_PERM_SIZE=
rem Clear the errorlevel which may have been set by permgen.bat
cmd /c
:skipPermGenCheck
