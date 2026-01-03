#pragma once
#include <string>
#include <fstream>
#include <sstream>
#include "Utils.h"

/**
 * @struct AppConfig
 * @description Configuración global de la ventana y la aplicación.
 */
struct AppConfig {
    std::wstring title = L"Genesis Engine";
    std::wstring icon = L"";
    std::wstring appID = L"com.genesis.engine";
    int width = 1280; int height = 720; 
    int minWidth = 800; int minHeight = 600;
    
    // [NUEVO] Límite de FPS configurable
    int fpsLimit = 300; 

    bool startMaximized = false; bool resizable = true; bool fullscreen = false;
    bool frame = true; bool alwaysOnTop = false; bool singleInstance = true; bool devTools = true;
};

/**
 * @class ConfigLoader
 * @description Carga la configuración desde windowConfig.json.
 */
class ConfigLoader {
public:
    static AppConfig Load(std::wstring exeDir) {
        AppConfig c;
        std::ifstream f(exeDir + L"\\windowConfig.json");
        if (!f.is_open()) return c;
        std::stringstream buffer; buffer << f.rdbuf(); std::string json = buffer.str();
        
        // Helpers de parseo simple
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

        std::string t = getStr("title"); if(!t.empty()) c.title = Utils::ToWString(t);
        std::string i = getStr("icon"); if(!i.empty()) c.icon = Utils::ToWString(i);
        std::string id = getStr("appID"); if(!id.empty()) c.appID = Utils::ToWString(id);
        
        c.width = getInt("width", 1280); c.height = getInt("height", 720);
        c.minWidth = getInt("minWidth", 800); c.minHeight = getInt("minHeight", 600);
        
        // [NUEVO] Cargar FPS desde el JSON (Default: 300)
        c.fpsLimit = getInt("fpsLimit", 300);
        
        c.startMaximized = getBool("startMaximized", false); c.resizable = getBool("resizable", true);
        c.fullscreen = getBool("fullscreen", false); c.frame = getBool("frame", true);
        c.alwaysOnTop = getBool("alwaysOnTop", false); c.singleInstance = getBool("singleInstance", true);
        c.devTools = getBool("devTools", true);
        return c;
    }
};