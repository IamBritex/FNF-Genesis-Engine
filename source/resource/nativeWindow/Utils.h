#pragma once
#include <windows.h>
#include <string>
#include <shlobj.h>
#include <filesystem>
#include <sstream>
#include <fstream>
#include <vector>
#include <commdlg.h>
#include <algorithm> // Para transform (lowercase)
#include <wincrypt.h> // Para decodificar Base64

// Link automático a la librería de criptografía de Windows
#pragma comment(lib, "Crypt32.lib")

namespace fs = std::filesystem;

/**
 * @namespace Utils
 * @description Utilidades generales para conversión de tipos y manejo de archivos del sistema.
 */
namespace Utils {

    inline std::wstring ToWString(const std::string& str) {
        if (str.empty()) return std::wstring();
        int size = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
        std::wstring wstr(size, 0);
        MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstr[0], size);
        return wstr;
    }

    inline std::string ToString(const std::wstring& wstr) {
        if (wstr.empty()) return std::string();
        int size = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
        std::string str(size, 0);
        WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &str[0], size, NULL, NULL);
        return str;
    }

    /**
     * Crea un directorio (y sus padres) dentro de AppData/Roaming/AppID.
     */
    inline void CreateDir(std::wstring appID, std::wstring relativePath) {
        PWSTR path = NULL;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &path))) {
            fs::path appDataPath(path); CoTaskMemFree(path);
            fs::path targetDir = appDataPath / appID / relativePath;
            try {
                fs::create_directories(targetDir);
            } catch (...) {}
        }
    }

    /**
     * Guarda contenido en la carpeta AppData/Roaming.
     * - Crea automáticamente carpetas si no existen.
     * - Detecta imágenes por extensión y decodifica Base64.
     */
    inline void SaveToAppData(std::wstring appID, std::wstring filename, std::wstring content) {
        PWSTR path = NULL;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &path))) {
            fs::path appDataPath(path); CoTaskMemFree(path);
            
            // Construye la ruta completa (ej: .../com.genesis.engine/screenshoot/foto.png)
            fs::path fullPath = appDataPath / appID / filename;

            try {
                // Crear directorios padres si no existen
                if (fullPath.has_parent_path()) {
                    fs::create_directories(fullPath.parent_path());
                }

                // 1. Detectar si es imagen por su extensión
                std::wstring ext = fullPath.extension().wstring();
                std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
                
                bool isImage = (ext == L".png" || ext == L".jpg" || ext == L".jpeg" || ext == L".webp");

                // 2. Si es imagen, decodificar Base64 a Binario
                if (isImage) {
                    DWORD binarySize = 0;
                    // CRYPT_STRING_BASE64_ANY intenta detectar headers (data:image/...) o raw base64
                    if (CryptStringToBinaryW(content.c_str(), 0, CRYPT_STRING_BASE64_ANY, NULL, &binarySize, NULL, NULL)) {
                        std::vector<BYTE> binaryData(binarySize);
                        if (CryptStringToBinaryW(content.c_str(), 0, CRYPT_STRING_BASE64_ANY, binaryData.data(), &binarySize, NULL, NULL)) {
                            std::ofstream outfile(fullPath, std::ios::binary);
                            outfile.write(reinterpret_cast<char*>(binaryData.data()), binarySize);
                            outfile.close();
                            return; // Terminado, no guardar como texto
                        }
                    }
                }

                // 3. Guardado estándar para texto/JSON (si no es imagen o falló el decode)
                std::ofstream outfile(fullPath, std::ios::binary);
                outfile << ToString(content);
                outfile.close();

            } catch (...) {}
        }
    }

    inline std::wstring LoadFromAppData(std::wstring appID, std::wstring filename) {
        PWSTR path = NULL;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &path))) {
            fs::path appDataPath(path); CoTaskMemFree(path);
            fs::path fullPath = appDataPath / appID / filename;
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

    inline std::wstring OpenFileDialog(HWND hWnd, std::wstring filters) {
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
}