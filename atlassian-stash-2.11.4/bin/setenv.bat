rem
rem Note: If running Atlassian Stash as a Service, settings in this file have no
rem effect. See http://confluence.atlassian.com/display/STASH/Increasing+STASH+memory
rem

rem
rem One way to set the STASH_HOME path is here via this variable.  Simply uncomment it and set a valid path like
rem C:\stash\home. You can of course set it outside in the command terminal; that will also work.
rem
rem WARNING: DO NOT wrap the STASH_HOME value in quotes when setting it here, even if it contains spaces.
rem
rem set STASH_HOME=

rem
rem The Microsoft SQL Server JDBC driver includes native DLLs that can be used to enable integrated authentication,
rem allowing the system to authenticate with the database using the credentials of the user running it. To use this
rem integrated authentication, rename the architecture-appropriate "sqljdbc_auth-(x86|x64).dll" file in lib\native
rem to "sqljdbc_auth.dll". Additional native DLLs such as the Tomcat native library can also be placed here for use
rem by Stash.
rem
rem Alternatively, native DLLs can also be placed in %STASH_HOME%\lib\native, where they will also be included in the
rem library path used by the JVM. By placing DLLs in %STASH_HOME%, they can be preserved across Stash upgrades.
rem
rem NOTE: You must choose the DLL architecture, x86 or x64, based on the JVM you'll be running, _not_ based on Windows.
rem
set JVM_LIBRARY_PATH=%CATALINA_HOME%\lib\native;%STASH_HOME%\lib\native

rem
rem Occasionally Atlassian Support may recommend that you set some specific JVM arguments.  You can use this variable
rem below to do that.
rem
set JVM_SUPPORT_RECOMMENDED_ARGS=

rem
rem The following 2 settings control the minimum and maximum given to the Atlassian Stash Java virtual machine.
rem In larger Stash instances, the maximum amount will need to be increased.
rem
set JVM_MINIMUM_MEMORY=512m
set JVM_MAXIMUM_MEMORY=768m

rem
rem File encoding passed into the Atlassian Stash Java virtual machine
rem
set JVM_FILE_ENCODING=UTF-8

rem
rem The following are the required arguments needed for Atlassian Stash.
rem
set JVM_REQUIRED_ARGS=-Djava.awt.headless=true -Dfile.encoding=%JVM_FILE_ENCODING% -Datlassian.standalone=STASH -Dorg.apache.jasper.runtime.BodyContentImpl.LIMIT_BUFFER=true -Dmail.mime.decodeparameters=true -Dorg.apache.catalina.connector.Response.ENFORCE_ENCODING_IN_GET_WRITER=false

rem --------------------------------------------------------------------------
rem
rem In general don't make changes below here
rem
rem --------------------------------------------------------------------------

set _PRG_DIR=%~dp0

rem Checks if the program directory has a space in it (will cause issues)
set _marker="x%_PRG_DIR%"
set _marker=%_marker: =%
if %_marker% == "x%_PRG_DIR%" goto STASHHOMECHECK
echo.
echo -------------------------------------------------------------------------------
echo   Stash directory "%_PRG_DIR%" contains spaces.
echo   Please change to a location without spaces and try again.
echo -------------------------------------------------------------------------------
exit /b 1

:STASHHOMECHECK
set STASH_HOME_MINUSD=
if "x%STASH_HOME%x" == "xx" goto NOSTASHHOME

rem Remove any trailing backslash in STASH_HOME
if %STASH_HOME:~-1%==\ SET STASH_HOME=%STASH_HOME:~0,-1%

rem Checks if the STASH_HOME has a space in it (can cause issues)
set _marker="x%STASH_HOME%"
set _marker=%_marker: =%
if %_marker% == "x%STASH_HOME%" goto STASHHOME
echo.
echo -------------------------------------------------------------------------------
echo   STASH_HOME "%STASH_HOME%" contains spaces.
echo   Please change to a location without spaces if this causes problems.
echo -------------------------------------------------------------------------------

:STASHHOME
set STASH_HOME_MINUSD=-Dstash.home="%STASH_HOME%"
goto :CONFIGURE_JAVA_OPTS

:NOSTASHHOME
echo.
echo -------------------------------------------------------------------------------
echo   Stash doesn't know where to store its data. Please configure the STASH_HOME
echo   environment variable with the directory where Stash should store its data.
echo   Ensure that the path to STASH_HOME does not contain spaces. STASH_HOME may
echo   be configured in setenv.bat, if preferred, rather than exporting it as an
echo   environment variable.
echo -------------------------------------------------------------------------------
pause
exit /b 1

:CONFIGURE_JAVA_OPTS
if "x%JVM_LIBRARY_PATH%x" == "xx" goto SET_JAVA_OPTS
rem If a native library path has been specified, add it to the required arguments
set JVM_LIBRARY_PATH_MINUSD=-Djava.library.path=%JVM_LIBRARY_PATH%
set JVM_REQUIRED_ARGS=%JVM_REQUIRED_ARGS% %JVM_LIBRARY_PATH_MINUSD%

:SET_JAVA_OPTS
set JAVA_OPTS=%JAVA_OPTS% -Xms%JVM_MINIMUM_MEMORY% -Xmx%JVM_MAXIMUM_MEMORY% %JVM_REQUIRED_ARGS% %JVM_SUPPORT_RECOMMENDED_ARGS% %STASH_HOME_MINUSD%

rem Checks if the JAVA_HOME has a space in it (can cause issues)
set _marker="x%JAVA_HOME%"
set _marker=%_marker: =%
if %_marker% == "x%JAVA_HOME%" goto RUN_JAVA
echo.
echo -------------------------------------------------------------------------------
echo   JAVA_HOME "%JAVA_HOME%" contains spaces.
echo   Please change to a location without spaces if this causes problems.
echo -------------------------------------------------------------------------------

:RUN_JAVA
rem Check that JAVA_HOME is valid
if exist "%JAVA_HOME%\bin\java.exe" goto PERMGEN
echo.
echo -------------------------------------------------------------------------------
echo   JAVA_HOME "%JAVA_HOME%" does not point to a valid version of Java.
echo -------------------------------------------------------------------------------


:PERMGEN
rem PermGen size needs to be increased if encountering OutOfMemoryError: PermGen problems. Specifying PermGen size is
rem not valid on IBM JDKs
set STASH_MAX_PERM_SIZE=256m
if not exist "%_PRG_DIR%\permgen.bat" goto skipPermGenCheck
call "%_PRG_DIR%\permgen.bat"
if errorlevel 1 goto endPermGenCheck
set JAVA_OPTS=-XX:MaxPermSize=%STASH_MAX_PERM_SIZE% %JAVA_OPTS%
:endPermGenCheck
set STASH_MAX_PERM_SIZE=
rem Clear the errorlevel which may have been set by permgen.bat
cmd /c
:skipPermGenCheck

echo.
echo Using STASH_HOME:      "%STASH_HOME%"
