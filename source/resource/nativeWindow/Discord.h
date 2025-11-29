#pragma once
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>
#include <windows.h>
#include <ctime>

/**
 * @class DiscordClient
 * @description Cliente nativo para Discord Rich Presence usando IPC pipes.
 */
class DiscordClient {
public:
    static DiscordClient& Get() {
        static DiscordClient instance;
        return instance;
    }

    /**
     * Inicializa la conexión RPC.
     * @param {std::string} clientId - ID de la aplicación de Discord.
     */
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

    /**
     * Actualiza el estado de la actividad (Rich Presence).
     */
    void SetActivity(const std::string& details, const std::string& state, const std::string& largeImage, const std::string& smallText) {
        std::lock_guard<std::mutex> lock(queueMutex);
        
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