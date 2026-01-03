#include <windows.h>
#include <string>
#include <wrl.h>

// Módulos nativos
#include "nativeWindow/Config.h"
#include "nativeWindow/Discord.h"
#include "nativeWindow/WebViewManager.h"

// Librerias del sistema (Linker)
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "shlwapi.lib")
#pragma comment(lib, "comdlg32.lib") 
#pragma comment(lib, "psapi.lib")

using namespace Microsoft::WRL;

// Variable global necesaria para WndProc
AppConfig globalConfig;

/**
 * @function WndProc
 * @description Procesa los mensajes de la ventana de Windows.
 */
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    static ComPtr<ICoreWebView2Controller> controller;

    switch (message) {
    case WM_SIZE: 
        if (controller) { 
            RECT bounds; GetClientRect(hWnd, &bounds); 
            controller->put_Bounds(bounds); 
        } 
        break;
    case WM_GETMINMAXINFO: { 
        MINMAXINFO* mmi = (MINMAXINFO*)lParam; 
        mmi->ptMinTrackSize.x = globalConfig.minWidth; 
        mmi->ptMinTrackSize.y = globalConfig.minHeight; 
        return 0; 
    }
    case WM_DESTROY: 
        DiscordClient::Get().Shutdown(); 
        PostQuitMessage(0); 
        break;
    case WM_USER + 1: 
        controller = (ICoreWebView2Controller*)lParam; 
        break;
    default: 
        return DefWindowProcW(hWnd, message, wParam, lParam);
    }
    return 0;
}

/**
 * @function WinMain
 * @description Punto de entrada principal.
 */
int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int nCmdShow) {
    // 1. Obtener rutas y configuración
    wchar_t buf[MAX_PATH]; GetModuleFileNameW(NULL, buf, MAX_PATH);
    std::wstring exePath(buf);
    std::wstring exeDir = exePath.substr(0, exePath.find_last_of(L"\\/"));
    
    globalConfig = ConfigLoader::Load(exeDir);

    // 2. Control de Instancia Única
    if (globalConfig.singleInstance) {
        CreateMutexW(NULL, TRUE, globalConfig.appID.c_str());
        if (GetLastError() == ERROR_ALREADY_EXISTS) return 0;
    }

    // 3. Iniciar Servicios
    DiscordClient::Get().Initialize("1353177735031423028");

    // 4. Configurar Ventana
    WNDCLASSEXW wc = {0};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInst;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.lpszClassName = L"GenesisClass";
    
    if (!globalConfig.icon.empty()) {
        std::wstring iconP = exeDir + L"\\" + globalConfig.icon;
        for (auto &c : iconP) if (c == L'/') c = L'\\';
        HANDLE hIcon = LoadImageW(NULL, iconP.c_str(), IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE);
        if (hIcon) { wc.hIcon = (HICON)hIcon; wc.hIconSm = (HICON)hIcon; }
    }
    RegisterClassExW(&wc);

    // 5. Crear Ventana
    DWORD style = WS_OVERLAPPEDWINDOW;
    if (!globalConfig.resizable) style &= ~(WS_THICKFRAME | WS_MAXIMIZEBOX);
    if (!globalConfig.frame) style = WS_POPUP;
    DWORD exStyle = globalConfig.alwaysOnTop ? WS_EX_TOPMOST : 0;

    RECT wr = {0, 0, globalConfig.width, globalConfig.height};
    AdjustWindowRectEx(&wr, style, FALSE, exStyle);
    
    HWND hWnd = CreateWindowExW(exStyle, L"GenesisClass", globalConfig.title.c_str(), style, 
        CW_USEDEFAULT, CW_USEDEFAULT, wr.right - wr.left, wr.bottom - wr.top, 
        NULL, NULL, hInst, NULL);
    
    if (!hWnd) return 1;
    if (wc.hIcon) { 
        SendMessage(hWnd, WM_SETICON, ICON_BIG, (LPARAM)wc.hIcon); 
        SendMessage(hWnd, WM_SETICON, ICON_SMALL, (LPARAM)wc.hIcon); 
    }
    
    if (globalConfig.fullscreen) { 
        SetWindowLongPtr(hWnd, GWL_STYLE, WS_POPUP | WS_VISIBLE); 
        ShowWindow(hWnd, SW_MAXIMIZE); 
    } else {
        ShowWindow(hWnd, globalConfig.startMaximized ? SW_SHOWMAXIMIZED : nCmdShow);
    }
    UpdateWindow(hWnd);

    // 6. Iniciar WebView (Con flags de 300FPS en Initialize)
    WebViewManager::Initialize(hWnd, exeDir, globalConfig);

    // 7. Loop de Mensajes
    MSG msg; 
    while (GetMessage(&msg, NULL, 0, 0)) { 
        TranslateMessage(&msg); 
        DispatchMessage(&msg); 
    }
    return (int)msg.wParam;
}