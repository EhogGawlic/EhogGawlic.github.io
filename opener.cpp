#include <windows.h>
#include <shellapi.h>
#include <wininet.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <string>

#pragma comment(lib, "wininet.lib")

// Helper function to read raw binary file bytes
std::vector<char> ReadBinaryFile(const std::wstring& filePath) {
    std::ifstream file(filePath.c_str(), std::ios::binary | std::ios::ate);
    if (!file.is_open()) return {};
    
    std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);
    
    std::vector<char> buffer(size);
    if (file.read(buffer.data(), size)) {
        return buffer;
    }
    return {};
}

// Function to upload the binary file to Netlify and get a short key back
std::string UploadToNetlify(const std::vector<char>& fileData) {
    std::string responseBody = "";
    HINTERNET hInternet = InternetOpenW(L"BoxSandOpener", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
    if (!hInternet) return responseBody;

    // Connect to your Netlify site domain
    HINTERNET hConnect = InternetConnectW(hInternet, L"boxsand.netlify.app", INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
    if (hConnect) {
        // Targeted Netlify Function endpoint
        HINTERNET hRequest = HttpOpenRequestW(hConnect, L"POST", L"/.netlify/functions/upload-psv", NULL, NULL, NULL, INTERNET_FLAG_SECURE, 0);
        if (hRequest) {
            std::wstring headers = L"Content-Type: application/octet-stream";
            
            // Send the raw binary file payload
            BOOL sent = HttpSendRequestW(hRequest, headers.c_str(), headers.length(), (LPVOID)fileData.data(), fileData.size());
            if (sent) {
                char buffer[1024];
                DWORD bytesRead;
                while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                    buffer[bytesRead] = '\0';
                    responseBody += buffer;
                }
            }
            InternetCloseHandle(hRequest);
        }
        InternetCloseHandle(hConnect);
    }
    InternetCloseHandle(hInternet);
    return responseBody; // Returns the generated file ID
}

int wmain(int argc, wchar_t* argv[]) {
    std::string baseUrl = "https://netlify.app";
    
    if (argc > 1) {
        std::wstring filePath = argv[1];
        std::vector<char> data = ReadBinaryFile(filePath);
        
        if (!data.empty()) {
            std::string fileId = UploadToNetlify(data);
            if (!fileId.empty()) {
                // Attach the temporary file id 
                baseUrl += "?fileId=" + fileId;
            }
        }
    }

    std::wstring wUrl(baseUrl.begin(), baseUrl.end());
    ShellExecuteW(NULL, L"open", wUrl.c_str(), NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
