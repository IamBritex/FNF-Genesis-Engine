@echo off
setlocal enabledelayedexpansion
cls
color 07

echo ====================================================
echo      GENESIS ENGINE BUILDER - v5.1 (Interactive)
echo ====================================================
echo.

set "WV2_VERSION=1.0.2903.40"
set "OUT_DIR=dist"
set "OBJ_DIR=obj"
set "SRC_FILE=source\resource\main.cpp"

REM --- 1. BUSCAR COMPILADOR ---
call :Log "INFO" "Cyan" "Buscando Visual Studio..."
where cl.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :EntornoListo

set "VS_PATH_1=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
set "VS_PATH_2=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

if exist "%VS_PATH_1%" ( call "%VS_PATH_1%" >nul & goto :EntornoListo )
if exist "%VS_PATH_2%" ( call "%VS_PATH_2%" >nul & goto :EntornoListo )
call :Log "ERROR" "Red" "No se encontro Visual Studio." & pause & exit /b

:EntornoListo
call :Log "OK" "Green" "Compilador listo."

REM --- 2. CLEAN ---
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
mkdir "%OUT_DIR%"
if not exist "%OBJ_DIR%" mkdir "%OBJ_DIR%"

REM --- 3. PACKAGES ---
if not exist "nuget.exe" powershell -Command "Invoke-WebRequest https://dist.nuget.org/win-x86-commandline/latest/nuget.exe -OutFile nuget.exe" >nul 2>&1
if not exist "packages\Microsoft.Web.WebView2.%WV2_VERSION%" nuget.exe install Microsoft.Web.WebView2 -Version %WV2_VERSION% -OutputDirectory packages >nul 2>&1

set "PKG_PATH=packages\Microsoft.Web.WebView2.%WV2_VERSION%\build\native"
set "INC_PATH=%PKG_PATH%\include"
set "LIB_PATH=%PKG_PATH%\x64"

REM --- 4. COMPILATION ---
call :Log "INFO" "Cyan" "Compilando App.exe..."
cl.exe /nologo /EHsc /std:c++17 /D_UNICODE /DUNICODE /I "%INC_PATH%" ^
    /Fo"%OBJ_DIR%\\" /Fe"%OUT_DIR%\App.exe" "%SRC_FILE%" ^
    /link /LIBPATH:"%LIB_PATH%" WebView2Loader.dll.lib user32.lib gdi32.lib shlwapi.lib shell32.lib ole32.lib comdlg32.lib psapi.lib

if %ERRORLEVEL% NEQ 0 ( call :Log "ERROR" "Red" "Fallo la compilacion." & pause & exit /b )
call :Log "OK" "Green" "Compilacion exitosa."

REM --- 5. ASSETS ---
call :Log "INFO" "Cyan" "Copiando archivos a dist..."
copy /Y "%PKG_PATH%\x64\WebView2Loader.dll" "%OUT_DIR%\" >nul
copy /Y "windowConfig.json" "%OUT_DIR%\" >nul
copy /Y "index.html" "%OUT_DIR%\" >nul
if exist "pwa.json" copy /Y "pwa.json" "%OUT_DIR%\" >nul
if exist "icons" xcopy /E /I /Y "icons" "%OUT_DIR%\icons" >nul 2>&1
if exist "source" xcopy /E /I /Y "source" "%OUT_DIR%\source" >nul 2>&1
if exist "public" xcopy /E /I /Y "public" "%OUT_DIR%\public" >nul 2>&1

REM --- 6. PREGUNTA INTERACTIVA PARA EL INSTALADOR ---
echo.
call :Log "QUESTION" "Yellow" "Deseas generar el instalador (Setup.exe)? [S/N]"
set /p "GEN_INSTALLER=> "

if /i "%GEN_INSTALLER%" NEQ "S" goto :Fin

REM --- 7. GENERAR INSTALADOR ---
call :Log "INFO" "Magenta" "Iniciando Inno Setup..."
set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if not exist "%ISCC_PATH%" (
    call :Log "WARNING" "Yellow" "No tienes Inno Setup instalado."
    goto :Fin
)
if not exist "setup.iss" (
    call :Log "ERROR" "Red" "Falta el archivo setup.iss"
    goto :Fin
)
if not exist "license.txt" echo GENESIS ENGINE > license.txt

"%ISCC_PATH%" setup.iss >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call :Log "OK" "Green" "Instalador creado: GenesisInstaller.exe"
) else (
    call :Log "ERROR" "Red" "Error al crear instalador."
)

:Fin
echo.
echo ====================================================
echo      PROCESO FINALIZADO
echo ====================================================
pause
exit /b

:Log
powershell -NoProfile -Command "Write-Host '[%~1]' -NoNewline -ForegroundColor %~2; Write-Host ' %~3'"
exit /b