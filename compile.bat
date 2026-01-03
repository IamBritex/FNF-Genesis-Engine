@echo off
setlocal enabledelayedexpansion
cls
color 07

echo ====================================================
echo      GENESIS ENGINE BUILDER - v6.5 Fast 
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
call :Log "ERROR" "Red" "No se encontro Visual Studio."
pause & exit /b

:EntornoListo
call :Log "OK" "Green" "Compilador listo."
echo.

REM --- 1.2 MENU DE MODO ---
echo  [1] RELEASE (Limpiar todo + Compilar Optimizado + Instalador)
echo  [2] DEBUG   (Solo actualizar archivos + Ejecutar rapido)
echo.
set /p "BUILD_MODE=Elige una opcion [1 o 2]: "

set "IS_DEBUG=0"
if "%BUILD_MODE%"=="2" (
    set "IS_DEBUG=1"
    call :Log "INFO" "Magenta" ">>> MODO DEBUG ACTIVADO <<<"
) else (
    call :Log "INFO" "Green" ">>> MODO RELEASE ACTIVADO <<<"
)

REM --- 1.5 CONFIGURACION DINAMICA ---
call :Log "INFO" "Cyan" "Leyendo configuracion..."
if not exist "%OBJ_DIR%" mkdir "%OBJ_DIR%"

powershell -NoProfile -Command "(Get-Content 'windowConfig.json' | ConvertFrom-Json).title -replace '[\\/:*?\x22<>|]', ''" > "%OBJ_DIR%\name.tmp"
set /p APP_NAME=<"%OBJ_DIR%\name.tmp"
del "%OBJ_DIR%\name.tmp"

powershell -NoProfile -Command "$i = (Get-Content 'windowConfig.json' | ConvertFrom-Json).icon; $i.Replace('/', '\')" > "%OBJ_DIR%\icon.tmp"
set /p APP_ICON=<"%OBJ_DIR%\icon.tmp"
del "%OBJ_DIR%\icon.tmp"

if "%APP_NAME%"=="" set "APP_NAME=GenesisEngine"
if "%APP_ICON%"=="" set "APP_ICON=icons\icon.ico"

echo Nombre: "%APP_NAME%.exe"

REM --- PROCESO DE ICONO ---
REM En Debug, si ya existe el recurso compilado, nos saltamos este paso para ir rapido
if "%IS_DEBUG%"=="1" if exist "%OBJ_DIR%\resource.res" goto :SkipIcon

call :Log "INFO" "Cyan" "Procesando icono..."
where rc.exe >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :SkipIcon
echo IDI_ICON1 ICON "..\%APP_ICON%" > "%OBJ_DIR%\resource.rc"
rc.exe /nologo /fo "%OBJ_DIR%\resource.res" "%OBJ_DIR%\resource.rc"
:SkipIcon

REM --- 2. CLEAN ---
if "%IS_DEBUG%"=="1" goto :SkipClean
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
mkdir "%OUT_DIR%"
:SkipClean
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

REM --- 3. PACKAGES ---
if not exist "nuget.exe" powershell -Command "Invoke-WebRequest https://dist.nuget.org/win-x86-commandline/latest/nuget.exe -OutFile nuget.exe" >nul 2>&1
if not exist "packages\Microsoft.Web.WebView2.%WV2_VERSION%" nuget.exe install Microsoft.Web.WebView2 -Version %WV2_VERSION% -OutputDirectory packages >nul 2>&1

set "PKG_PATH=packages\Microsoft.Web.WebView2.%WV2_VERSION%\build\native"
set "INC_PATH=%PKG_PATH%\include"
set "LIB_PATH=%PKG_PATH%\x64"

REM --- 4. COMPILATION ---
call :Log "INFO" "Cyan" "Verificando ejecutable..."

REM En Debug, si el EXE ya existe, NO recompilamos C++ (ahorra tiempo).
REM Si cambiaste algo en main.cpp, borra la carpeta dist o usa Release una vez.
set "NEEDS_COMPILE=1"
if "%IS_DEBUG%"=="1" if exist "%OUT_DIR%\%APP_NAME%.exe" set "NEEDS_COMPILE=0"

if "%NEEDS_COMPILE%"=="1" (
    call :Log "INFO" "Cyan" "Compilando C++..."
    set "RES_FILE="
    if exist "%OBJ_DIR%\resource.res" set "RES_FILE=%OBJ_DIR%\resource.res"
    
    set "CL_FLAGS=/nologo /EHsc /std:c++17 /D_UNICODE /DUNICODE"
    if "%IS_DEBUG%"=="1" set "CL_FLAGS=/nologo /EHsc /std:c++17 /D_UNICODE /DUNICODE /DDEBUG_MODE /Od /Zi"

    cl.exe !CL_FLAGS! /I "%INC_PATH%" ^
        /Fo"%OBJ_DIR%\\" /Fe"%OUT_DIR%\%APP_NAME%.exe" "%SRC_FILE%" !RES_FILE! ^
        /link /LIBPATH:"%LIB_PATH%" WebView2Loader.dll.lib user32.lib gdi32.lib shlwapi.lib shell32.lib ole32.lib comdlg32.lib psapi.lib
        
    if !ERRORLEVEL! NEQ 0 pause & exit /b
    call :Log "OK" "Green" "Compilacion C++ completada."
) else (
    call :Log "INFO" "Yellow" "Usando EXE existente (Salto compilacion C++)."
)

REM --- 5. COPIADO INTELIGENTE DE ASSETS ---
call :Log "INFO" "Cyan" "Actualizando assets..."

set "XCOPY_FLAGS=/E /I /Y"
REM En debug usamos /D para copiar SOLO archivos nuevos/modificados
if "%IS_DEBUG%"=="1" set "XCOPY_FLAGS=/E /I /Y /D"

copy /Y "%PKG_PATH%\x64\WebView2Loader.dll" "%OUT_DIR%\" >nul
copy /Y "windowConfig.json" "%OUT_DIR%\" >nul
copy /Y "index.html" "%OUT_DIR%\" >nul
if exist "pwa.json" copy /Y "pwa.json" "%OUT_DIR%\" >nul
if exist "icons" xcopy %XCOPY_FLAGS% "icons" "%OUT_DIR%\icons" >nul 2>&1
if exist "source" xcopy %XCOPY_FLAGS% "source" "%OUT_DIR%\source" >nul 2>&1
if exist "public" xcopy %XCOPY_FLAGS% "public" "%OUT_DIR%\public" >nul 2>&1

if "%IS_DEBUG%"=="1" goto :RunDebug

REM --- MODO RELEASE: INSTALADOR ---
echo.
call :Log "QUESTION" "Yellow" "Deseas generar el instalador (Setup.exe)? [S/N]"
set /p "GEN_INSTALLER=> "
if /i "%GEN_INSTALLER%" NEQ "S" goto :Fin

call :Log "INFO" "Magenta" "Iniciando Inno Setup..."
set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "%ISCC_PATH%" (
    if not exist "license.txt" echo GENESIS ENGINE > license.txt
    copy /Y "%OUT_DIR%\%APP_NAME%.exe" "%OUT_DIR%\App.exe" >nul
    "%ISCC_PATH%" setup.iss >nul 2>&1
    if exist "%OUT_DIR%\App.exe" del "%OUT_DIR%\App.exe"
    call :Log "OK" "Green" "Instalador creado."
) else (
    call :Log "ERROR" "Red" "No se encontro Inno Setup."
)
goto :Fin

:RunDebug
echo.
call :Log "OK" "Green" "Lanzando aplicacion..."
cd "%OUT_DIR%"
start "" "%APP_NAME%.exe"
exit /b

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