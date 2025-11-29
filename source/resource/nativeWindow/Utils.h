#pragma once
#include <windows.h>
#include <string>
#include <shlobj.h>
#include <filesystem>
#include <sstream>
#include <fstream>
#include <vector>
#include <commdlg.h>

namespace fs = std::filesystem;

/**
 * @namespace Utils
 * @description Utilidades generales para conversión de tipos y manejo de archivos del sistema.
 */
namespace Utils {

    /**
     * Convierte std::string (UTF-8) a std::wstring (Wide Char).
     * @param {std::string} str - La cadena a convertir.
     * @returns {std::wstring} La cadena convertida.
     */
    inline std::wstring ToWString(const std::string& str) {
        if (str.empty()) return std::wstring();
        int size = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
        std::wstring wstr(size, 0);
        MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstr[0], size);
        return wstr;
    }

    /**
     * Convierte std::wstring (Wide Char) a std::string (UTF-8).
     * @param {std::wstring} wstr - La cadena ancha a convertir.
     * @returns {std::string} La cadena UTF-8.
     */
    inline std::string ToString(const std::wstring& wstr) {
        if (wstr.empty()) return std::string();
        int size = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
        std::string str(size, 0);
        WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &str[0], size, NULL, NULL);
        return str;
    }

    /**
     * Guarda contenido en la carpeta AppData/Roaming de la aplicación.
     * @param {std::wstring} appID - ID de la aplicación (nombre de la carpeta).
     * @param {std::wstring} filename - Nombre del archivo.
     * @param {std::wstring} content - Contenido a guardar.
     */
    inline void SaveToAppData(std::wstring appID, std::wstring filename, std::wstring content) {
        PWSTR path = NULL;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &path))) {
            fs::path appDataPath(path); CoTaskMemFree(path);
            fs::path fullPath = appDataPath / appID / filename;
            try {
                if (fullPath.has_parent_path()) fs::create_directories(fullPath.parent_path());
                std::ofstream outfile(fullPath, std::ios::binary);
                outfile << ToString(content);
                outfile.close();
            } catch (...) {}
        }
    }

    /**
     * Carga contenido desde la carpeta AppData/Roaming.
     * @param {std::wstring} appID - ID de la aplicación.
     * @param {std::wstring} filename - Nombre del archivo a leer.
     * @returns {std::wstring} Contenido del archivo o cadena vacía si falla.
     */
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

    /**
     * Abre un cuadro de diálogo nativo para seleccionar archivos.
     * @param {HWND} hWnd - Handle de la ventana padre.
     * @param {std::wstring} filters - Filtros de archivo (ej: "Text Files|*.txt").
     * @returns {std::wstring} Ruta del archivo seleccionado.
     */
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