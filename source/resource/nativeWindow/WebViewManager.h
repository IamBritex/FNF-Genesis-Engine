#pragma once
#include <windows.h>
#include <wrl.h>
#include <string>
#include <psapi.h>
#include <shellapi.h>
#include "WebView2.h"
#include "WebView2EnvironmentOptions.h"
#include "Config.h"
#include "Utils.h"
#include "Discord.h"

using namespace Microsoft::WRL;

class WebViewManager {
public:
    static void Initialize(HWND hWnd, std::wstring exeDir, AppConfig config) {
        auto options = Make<CoreWebView2EnvironmentOptions>();
        
        std::wstring flags = L"";
        
        // --- RENDIMIENTO ---
        flags += L"--use-angle=default "; 
        flags += L"--ignore-gpu-blocklist "; 
        flags += L"--enable-gpu-rasterization ";
        flags += L"--enable-zero-copy ";

        // --- ARRANQUE Y LIMPIEZA ---
        flags += L"--no-proxy-server "; 
        flags += L"--disable-background-networking "; 
        flags += L"--disable-component-update "; 
        flags += L"--disable-default-apps "; 
        flags += L"--disable-sync "; 
        flags += L"--allow-file-access-from-files ";
        flags += L"--disable-web-security "; 
        flags += L"--disable-site-isolation-trials "; 
        flags += L"--renderer-process-limit=1 "; 
        flags += L"--disable-features=Translate,OptimizationHints,MediaRouter,msSmartScreenProtection,SpellCheck,AutofillServerCommunication,BackForwardCache ";
        flags += L"--disable-extensions ";
        flags += L"--disable-breakpad "; 
        
        options->put_AdditionalBrowserArguments(flags.c_str());

        CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, options.Get(),
            Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
                [hWnd, exeDir, config](HRESULT, ICoreWebView2Environment* env) -> HRESULT {
                    if(!env) { MessageBoxW(hWnd, L"Error WebView2", L"Error", MB_OK); return S_FALSE; }
                    
                    env->CreateCoreWebView2Controller(hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                        [hWnd, exeDir, config](HRESULT, ICoreWebView2Controller* c) -> HRESULT {
                            if (!c) return S_FALSE; 
                            c->AddRef();
                            SendMessage(hWnd, WM_USER + 1, 0, (LPARAM)c);
                            
                            RECT b; GetClientRect(hWnd, &b); c->put_Bounds(b);
                            ComPtr<ICoreWebView2> wv; c->get_CoreWebView2(&wv);
                            ComPtr<ICoreWebView2_3> wv3; wv.As(&wv3);
                            
                            if (wv3) wv3->SetVirtualHostNameToFolderMapping(L"app.genesis", exeDir.c_str(), COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW);

                            ComPtr<ICoreWebView2Settings> settings; wv->get_Settings(&settings);
                            settings->put_IsScriptEnabled(TRUE); 
                            settings->put_IsWebMessageEnabled(TRUE);
                            settings->put_AreDevToolsEnabled(config.devTools ? TRUE : FALSE);
                            settings->put_AreDefaultContextMenusEnabled(FALSE);
                            settings->put_IsStatusBarEnabled(FALSE); 

                            // [MODIFICACIÓN CLAVE]
                            // Hemos eliminado el bloque "add_DownloadStarting" que bloqueaba las descargas.
                            // Ahora WebView2 permitirá descargar archivos (Capturas, JSONs, etc.) nativamente.

                            std::wstring jsInject = L"window.__GENESIS_PATHS__ = { gameDir: '";
                            for(auto ch : exeDir) { jsInject += (ch == L'\\') ? L"\\\\" : std::wstring(1, ch); }
                            jsInject += L"' };";
                            
                            wv->AddScriptToExecuteOnDocumentCreated(jsInject.c_str(), nullptr);
                            
                            wv->add_WebMessageReceived(Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                                [hWnd, exeDir, config](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                                    LPWSTR p; args->TryGetWebMessageAsString(&p);
                                    std::wstring msg(p); CoTaskMemFree(p);
                                    HandleWebMessage(hWnd, sender, msg, exeDir, config);
                                    return S_OK;
                                }).Get(), nullptr);

                            wv->Navigate(L"https://app.genesis/index.html");
                            return S_OK;
                        }).Get());
                    return S_OK;
                }).Get());
    }

private:
    static void HandleWebMessage(HWND hWnd, ICoreWebView2* sender, std::wstring msg, std::wstring exeDir, AppConfig config) {
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
        
        // Mantenemos la API de archivos por si quieres guardar cosas internas (config, saves)
        else if (msg.find(L"createDir:") == 0) {
            std::wstring dirName = msg.substr(10);
            Utils::CreateDir(config.appID, dirName);
        }
        else if (msg.find(L"saveFile:") == 0) {
            std::wstring data = msg.substr(9);
            size_t pipe = data.find(L"|");
            if (pipe != std::wstring::npos) 
                Utils::SaveToAppData(config.appID, data.substr(0, pipe), data.substr(pipe + 1));
        }
        else if (msg.find(L"loadFile:") == 0) {
            std::wstring key = msg.substr(9);
            std::wstring filename = key;
            if (filename.find(L".") == std::wstring::npos) filename += L".json";
            std::wstring content = Utils::LoadFromAppData(config.appID, filename);
            if (content.empty() && filename != key) content = Utils::LoadFromAppData(config.appID, key);
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
            std::wstring res = Utils::OpenFileDialog(hWnd, msg.substr(9));
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
        else if (msg.find(L"discord:") == 0) {
            std::wstring data = msg.substr(8);
            size_t p = data.find(L"|");
            std::string state = Utils::ToString(data.substr(0, p));
            std::string details = (p != std::wstring::npos) ? Utils::ToString(data.substr(p + 1)) : "";
            DiscordClient::Get().SetActivity(details, state, "fnf_icon", "Genesis Engine");
        }
    }
};