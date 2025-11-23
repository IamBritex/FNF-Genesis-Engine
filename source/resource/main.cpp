#include <windows.h>
#include <shlobj.h>
#include <string>
#include <wrl.h>
#include <fstream>
#include <sstream>
#include <vector>
#include <psapi.h>
#include <commdlg.h>
#include <shellapi.h>
#include <filesystem>
#include <thread>
#include <atomic>
#include <mutex>
#include "WebView2.h"
#include "WebView2EnvironmentOptions.h"

// Librerias del sistema
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "shlwapi.lib")
#pragma comment(lib, "comdlg32.lib") 
#pragma comment(lib, "psapi.lib")

using namespace Microsoft::WRL;
namespace fs = std::filesystem;

// --- DISCORD RPC NATIVO (Cliente Integrado) ---
class DiscordClient {
public:
    static DiscordClient& Get() {
        static DiscordClient instance;
        return instance;
    }

    // Inicializa la conexión con TU CLAVE
    void Initialize(const std::string& clientId) {
        this->clientId = clientId;
        running = true;
        workerThread = std::thread(&DiscordClient::WorkerLoop, this);
    }

    void Shutdown() {
        running = false;
        if (workerThread.joinable()) workerThread.join();
        Close();
    }

    void SetActivity(const std::string& details, const std::string& state, const std::string& largeImage, const std::string& smallText) {
        std::lock_guard<std::mutex> lock(queueMutex);
        
        // Construcción manual del JSON para evitar dependencias
        // Se usan tus botones por defecto
        currentActivityJson = 
            "{\"cmd\":\"SET_ACTIVITY\",\"args\":{\"pid\":" + std::to_string(GetCurrentProcessId()) + 
            ",\"activity\":{\"details\":\"" + EscapeJson(details) + "\"" +
            ",\"state\":\"" + EscapeJson(state) + "\"" +
            ",\"assets\":{\"large_image\":\"" + EscapeJson(largeImage) + "\",\"large_text\":\"Genesis Engine\"}" +
            ",\"timestamps\":{\"start\":" + std::to_string(startTime) + "}" +
            ",\"buttons\":[{\"label\":\"Ver Proyecto\",\"url\":\"https://github.com/IamBritex/FNF-Genesis-Engine\"},{\"label\":\"Unirme al Discord\",\"url\":\"https://discord.gg/tuinvitelink\"}]" +
            "}},\"nonce\":\"" + std::to_string(GetTickCount64()) + "\"}";
        
        needsUpdate = true;
    }

private:
    DiscordClient() { startTime = std::time(nullptr); }
    ~DiscordClient() { Shutdown(); }

    std::string clientId;
    std::atomic<bool> running{false};
    std::thread workerThread;
    HANDLE hPipe = INVALID_HANDLE_VALUE;
    std::string currentActivityJson;
    bool needsUpdate = false;
    std::mutex queueMutex;
    std::time_t startTime;

    std::string EscapeJson(const std::string& s) {
        std::string res;
        for (char c : s) {
            if (c == '"') res += "\\\"";
            else if (c == '\\') res += "\\\\";
            else res += c;
        }
        return res;
    }

    void WorkerLoop() {
        while (running) {
            if (hPipe == INVALID_HANDLE_VALUE) {
                Connect();
                std::this_thread::sleep_for(std::chrono::seconds(2)); 
                continue;
            }

            bool update = false;
            std::string payload;
            {
                std::lock_guard<std::mutex> lock(queueMutex);
                if (needsUpdate) {
                    payload = currentActivityJson;
                    needsUpdate = false;
                    update = true;
                }
            }

            if (update) {
                Send(1, payload); // Opcode 1 = Frame
            }

            std::this_thread::sleep_for(std::chrono::milliseconds(500));
        }
    }

    void Connect() {
        for (int i = 0; i < 10; i++) {
            std::string pipeName = "\\\\.\\pipe\\discord-ipc-" + std::to_string(i);
            hPipe = CreateFileA(pipeName.c_str(), GENERIC_READ | GENERIC_WRITE, 0, NULL, OPEN_EXISTING, 0, NULL);
            if (hPipe != INVALID_HANDLE_VALUE) break;
        }

        if (hPipe != INVALID_HANDLE_VALUE) {
            // Handshake (Opcode 0)
            std::string handshake = "{\"v\":1,\"client_id\":\"" + clientId + "\"}";
            Send(0, handshake);
        }
    }

    void Close() {
        if (hPipe != INVALID_HANDLE_VALUE) {
            CloseHandle(hPipe);
            hPipe = INVALID_HANDLE_VALUE;
        }
    }

    bool Send(int opcode, const std::string& json) {
        if (hPipe == INVALID_HANDLE_VALUE) return false;

        std::vector<char> packet;
        packet.resize(8 + json.length());
        
        *(int*)&packet[0] = opcode;
        *(int*)&packet[4] = (int)json.length();
        memcpy(&packet[8], json.data(), json.length());

        DWORD bytesWritten;
        if (!WriteFile(hPipe, packet.data(), (DWORD)packet.size(), &bytesWritten, NULL)) {
            Close(); 
            return false;
        }
        return true;
    }
};

// --- Configuración Global ---
struct AppConfig {
    std::wstring title = L"Genesis Engine";
    std::wstring icon = L"";
    std::wstring appID = L"com.genesis.engine";
    int width = 1280; int height = 720; 
    int minWidth = 800; int minHeight = 600;
    bool startMaximized = false; bool resizable = true; bool fullscreen = false;
    bool frame = true; bool alwaysOnTop = false; bool singleInstance = true; bool devTools = true;
};
AppConfig globalConfig;

// --- Utilidades ---
std::wstring ToWString(const std::string& str) {
    if (str.empty()) return std::wstring();
    int size = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstr(size, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstr[0], size);
    return wstr;
}

std::string ToString(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    int size = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string str(size, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &str[0], size, NULL, NULL);
    return str;
}

// --- Parser JSON ---
AppConfig LoadConfig(std::wstring exeDir) {
    AppConfig c;
    std::ifstream f(exeDir + L"\\windowConfig.json");
    if (!f.is_open()) return c;
    std::stringstream buffer; buffer << f.rdbuf(); std::string json = buffer.str();
    
    auto getStr = [&](std::string k) {
        size_t p = json.find("\"" + k + "\""); if (p == std::string::npos) return std::string("");
        size_t co = json.find(":", p); size_t fQ = json.find("\"", co + 1);
        if (fQ == std::string::npos) return std::string("");
        size_t sQ = json.find("\"", fQ + 1); return json.substr(fQ + 1, sQ - fQ - 1);
    };
    auto getInt = [&](std::string k, int def) {
        size_t p = json.find("\"" + k + "\""); if (p == std::string::npos) return def;
        size_t co = json.find(":", p); size_t vs = json.find_first_not_of(" \t\n\r", co + 1);
        size_t ve = json.find_first_of(",}", vs); try { return std::stoi(json.substr(vs, ve - vs)); } catch(...) { return def; }
    };
    auto getBool = [&](std::string k, bool def) {
        size_t p = json.find("\"" + k + "\""); if (p == std::string::npos) return def;
        size_t co = json.find(":", p); size_t vs = json.find_first_not_of(" \t\n\r", co + 1);
        if (json.substr(vs, 4) == "true") return true; if (json.substr(vs, 5) == "false") return false; return def;
    };

    std::string t = getStr("title"); if(!t.empty()) c.title = ToWString(t);
    std::string i = getStr("icon"); if(!i.empty()) c.icon = ToWString(i);
    std::string id = getStr("appID"); if(!id.empty()) c.appID = ToWString(id);
    
    c.width = getInt("width", 1280); c.height = getInt("height", 720);
    c.minWidth = getInt("minWidth", 800); c.minHeight = getInt("minHeight", 600);
    
    c.startMaximized = getBool("startMaximized", false); c.resizable = getBool("resizable", true);
    c.fullscreen = getBool("fullscreen", false); c.frame = getBool("frame", true);
    c.alwaysOnTop = getBool("alwaysOnTop", false); c.singleInstance = getBool("singleInstance", true);
    c.devTools = getBool("devTools", true);
    return c;
}

// --- Funciones Nativas ---
void SaveToAppData(std::wstring filename, std::wstring content) {
    PWSTR path = NULL;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &path))) {
        fs::path appDataPath(path); CoTaskMemFree(path);
        fs::path fullPath = appDataPath / globalConfig.appID / filename;
        try {
            if (fullPath.has_parent_path()) fs::create_directories(fullPath.parent_path());
            std::ofstream outfile(fullPath, std::ios::binary);
            outfile << ToString(content);
            outfile.close();
        } catch (...) {}
    }
}

std::wstring LoadFromAppData(std::wstring filename) {
    PWSTR path = NULL;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &path))) {
        fs::path appDataPath(path); CoTaskMemFree(path);
        fs::path fullPath = appDataPath / globalConfig.appID / filename;
        if (fs::exists(fullPath)) {
            std::ifstream infile(fullPath, std::ios::binary);
            if (infile.is_open()) {
                std::stringstream buffer; buffer << infile.rdbuf();
                return ToWString(buffer.str());
            }
        }
    }
    return L"";
}

std::wstring OpenFileDialog(HWND hWnd, std::wstring filters) {
    OPENFILENAMEW ofn;
    wchar_t szFile[260] = { 0 };
    ZeroMemory(&ofn, sizeof(ofn));
    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = hWnd;
    ofn.lpstrFile = szFile;
    ofn.nMaxFile = sizeof(szFile);
    std::vector<wchar_t> filterBuf(filters.begin(), filters.end());
    for (auto& c : filterBuf) if (c == L'|') c = L'\0';
    filterBuf.push_back(L'\0'); filterBuf.push_back(L'\0');
    ofn.lpstrFilter = filterBuf.data();
    ofn.nFilterIndex = 1;
    ofn.Flags = OFN_PATHMUSTEXIST | OFN_FILEMUSTEXIST;
    if (GetOpenFileNameW(&ofn)) return std::wstring(ofn.lpstrFile);
    return L"";
}

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    static ComPtr<ICoreWebView2Controller> controller;
    switch (message) {
    case WM_SIZE: if (controller) { RECT bounds; GetClientRect(hWnd, &bounds); controller->put_Bounds(bounds); } break;
    case WM_GETMINMAXINFO: { MINMAXINFO* mmi = (MINMAXINFO*)lParam; mmi->ptMinTrackSize.x = globalConfig.minWidth; mmi->ptMinTrackSize.y = globalConfig.minHeight; return 0; }
    case WM_DESTROY: 
        DiscordClient::Get().Shutdown(); // Cerrar conexión con Discord
        PostQuitMessage(0); 
        break;
    case WM_USER + 1: controller = (ICoreWebView2Controller*)lParam; break;
    default: return DefWindowProcW(hWnd, message, wParam, lParam);
    }
    return 0;
}

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int nCmdShow) {
    wchar_t buf[MAX_PATH]; GetModuleFileNameW(NULL, buf, MAX_PATH);
    std::wstring exePath(buf);
    std::wstring exeDir = exePath.substr(0, exePath.find_last_of(L"\\/"));
    
    globalConfig = LoadConfig(exeDir);

    if (globalConfig.singleInstance) {
        CreateMutexW(NULL, TRUE, globalConfig.appID.c_str());
        if (GetLastError() == ERROR_ALREADY_EXISTS) return 0;
    }

    // --- INICIAR DISCORD RPC CON TU CLAVE ---
    DiscordClient::Get().Initialize("1353177735031423028");

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
    if (wc.hIcon) { SendMessage(hWnd, WM_SETICON, ICON_BIG, (LPARAM)wc.hIcon); SendMessage(hWnd, WM_SETICON, ICON_SMALL, (LPARAM)wc.hIcon); }
    
    if (globalConfig.fullscreen) { SetWindowLongPtr(hWnd, GWL_STYLE, WS_POPUP | WS_VISIBLE); ShowWindow(hWnd, SW_MAXIMIZE); }
    else ShowWindow(hWnd, globalConfig.startMaximized ? SW_SHOWMAXIMIZED : nCmdShow);
    UpdateWindow(hWnd);

    auto options = Make<CoreWebView2EnvironmentOptions>();
    
    // --- FLAGS OPTIMIZADOS (RAM baja, VSync activado) ---
    std::wstring flags = L"";
    flags += L"--allow-file-access-from-files ";
    flags += L"--disable-web-security ";
    flags += L"--renderer-process-limit=1 "; 
    flags += L"--max-active-webgl-contexts=1 "; 
    flags += L"--disable-features=Translate,OptimizationHints,MediaRouter,msSmartScreenProtection,SpellCheck,AutofillServerCommunication ";
    flags += L"--disable-extensions ";
    flags += L"--disable-background-networking ";
    flags += L"--disable-component-update ";
    
    options->put_AdditionalBrowserArguments(flags.c_str());

    CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, options.Get(),
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [hWnd, exeDir](HRESULT, ICoreWebView2Environment* env) -> HRESULT {
                if(!env) { MessageBoxW(hWnd, L"Error WebView2", L"Error", MB_OK); return S_FALSE; }
                env->CreateCoreWebView2Controller(hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                    [hWnd, exeDir](HRESULT, ICoreWebView2Controller* c) -> HRESULT {
                        if (!c) return S_FALSE; c->AddRef();
                        SendMessage(hWnd, WM_USER + 1, 0, (LPARAM)c);
                        RECT b; GetClientRect(hWnd, &b); c->put_Bounds(b);
                        ComPtr<ICoreWebView2> wv; c->get_CoreWebView2(&wv);
                        ComPtr<ICoreWebView2_3> wv3; wv.As(&wv3);
                        if (wv3) wv3->SetVirtualHostNameToFolderMapping(L"app.genesis", exeDir.c_str(), COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW);

                        ComPtr<ICoreWebView2Settings> settings; wv->get_Settings(&settings);
                        settings->put_IsScriptEnabled(TRUE); settings->put_IsWebMessageEnabled(TRUE);
                        settings->put_AreDevToolsEnabled(globalConfig.devTools ? TRUE : FALSE);
                        settings->put_AreDefaultContextMenusEnabled(FALSE);

                        // Ocultar descargas
                        ComPtr<ICoreWebView2_4> wv4; wv.As(&wv4);
                        if (wv4) {
                            wv4->add_DownloadStarting(Callback<ICoreWebView2DownloadStartingEventHandler>(
                                [](ICoreWebView2*, ICoreWebView2DownloadStartingEventArgs* a) -> HRESULT {
                                    a->put_Handled(TRUE); return S_OK;
                                }).Get(), nullptr);
                        }

                        std::wstring jsInject = L"window.__GENESIS_PATHS__ = { gameDir: '";
                        for(auto c : exeDir) { jsInject += (c == L'\\') ? L"\\\\" : std::wstring(1, c); }
                        jsInject += L"' };";
                        wv->AddScriptToExecuteOnDocumentCreated(jsInject.c_str(), nullptr);

                        wv->add_WebMessageReceived(Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                            [hWnd, exeDir](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                                LPWSTR p; args->TryGetWebMessageAsString(&p);
                                std::wstring msg(p); CoTaskMemFree(p);
                                
                                if (msg.find(L"resize:") == 0) {
                                    std::wstring d = msg.substr(7);
                                    int w = std::stoi(d.substr(0, d.find(L",")));
                                    int h = std::stoi(d.substr(d.find(L",") + 1));
                                    SetWindowPos(hWnd, 0, 0, 0, w, h, SWP_NOMOVE | SWP_NOZORDER);
                                }
                                else if (msg == L"maximize") ShowWindow(hWnd, SW_MAXIMIZE);
                                else if (msg == L"minimize") ShowWindow(hWnd, SW_MINIMIZE);
                                else if (msg == L"close") PostMessage(hWnd, WM_CLOSE, 0, 0);
                                else if (msg.find(L"setTitle:") == 0) SetWindowTextW(hWnd, msg.substr(9).c_str());
                                else if (msg.find(L"saveFile:") == 0) {
                                    std::wstring data = msg.substr(9);
                                    size_t pipe = data.find(L"|");
                                    if (pipe != std::wstring::npos) SaveToAppData(data.substr(0, pipe), data.substr(pipe + 1));
                                }
                                else if (msg.find(L"loadFile:") == 0) {
                                    std::wstring key = msg.substr(9);
                                    std::wstring content = LoadFromAppData(key + L".json");
                                    std::wstring reply = L"fileLoaded:" + key + L"|" + content;
                                    sender->PostWebMessageAsString(reply.c_str());
                                }
                                else if (msg.find(L"listDir:") == 0) {
                                    std::wstring relPath = msg.substr(8);
                                    for (auto &c : relPath) if (c == L'/') c = L'\\';
                                    std::wstring fullDir = exeDir + L"\\" + relPath;
                                    std::wstring fileList = L"";
                                    if (fs::exists(fullDir) && fs::is_directory(fullDir)) {
                                        for (const auto & entry : fs::directory_iterator(fullDir)) {
                                            if (entry.is_regular_file()) {
                                                if (!fileList.empty()) fileList += L"|";
                                                fileList += entry.path().filename().wstring();
                                            }
                                        }
                                    }
                                    std::wstring reply = L"dirListed:" + relPath + L"|" + fileList;
                                    sender->PostWebMessageAsString(reply.c_str());
                                }
                                else if (msg.find(L"openExternal:") == 0) ShellExecuteW(NULL, L"open", msg.substr(13).c_str(), NULL, NULL, SW_SHOWNORMAL);
                                else if (msg.find(L"msgBox:") == 0) {
                                    std::wstring data = msg.substr(7);
                                    size_t p1 = data.find(L"|"); size_t p2 = data.find_last_of(L"|");
                                    std::wstring title = data.substr(0, p1);
                                    std::wstring body = data.substr(p1 + 1, p2 - p1 - 1);
                                    int type = std::stoi(data.substr(p2 + 1));
                                    MessageBoxW(hWnd, body.c_str(), title.c_str(), type);
                                    sender->PostWebMessageAsString(L"dialogClosed");
                                }
                                else if (msg.find(L"openFile:") == 0) {
                                    std::wstring res = OpenFileDialog(hWnd, msg.substr(9));
                                    std::wstring reply = L"fileSelected:" + res;
                                    sender->PostWebMessageAsString(reply.c_str());
                                }
                                else if (msg == L"getMemory") {
                                    PROCESS_MEMORY_COUNTERS pmc;
                                    if (GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc))) {
                                        std::wstring reply = L"memInfo:" + std::to_wstring(pmc.WorkingSetSize);
                                        sender->PostWebMessageAsString(reply.c_str());
                                    }
                                }
                                // --- COMANDO DISCORD ---
                                else if (msg.find(L"discord:") == 0) {
                                    std::wstring data = msg.substr(8);
                                    size_t p = data.find(L"|");
                                    std::string state = ToString(data.substr(0, p));
                                    std::string details = (p != std::wstring::npos) ? ToString(data.substr(p + 1)) : "";
                                    // Usa la clave fija definida en el cliente
                                    DiscordClient::Get().SetActivity(details, state, "fnf_icon", "Genesis Engine");
                                }
                                return S_OK;
                            }).Get(), nullptr);

                        wv->Navigate(L"https://app.genesis/index.html");
                        return S_OK;
                    }).Get());
                return S_OK;
            }).Get());

    MSG msg; while (GetMessage(&msg, NULL, 0, 0)) { TranslateMessage(&msg); DispatchMessage(&msg); }
    return (int)msg.wParam;
}