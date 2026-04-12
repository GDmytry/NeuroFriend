# Ollama Setup

This project now supports the following connection path:

`Expo app -> Node bridge -> Ollama -> qwen3:8b`

The mobile app should call the Node bridge, not Ollama directly.

## 1. Check Ollama on Windows

Open PowerShell and run:

```powershell
ollama list
```

You should see `qwen3:8b` in the list.

Then run a quick test:

```powershell
ollama run qwen3:8b "Привет! Ответь одним предложением."
```

If the model answers, Ollama is ready.

### If Ollama is installed on drive `E:`

That is fine. The install disk does not block this setup.

Important:

- the Ollama app may be installed on `E:`
- the models may also be stored on `E:` if `OLLAMA_MODELS` is configured
- logs and service files on Windows can still appear under `%LOCALAPPDATA%\\Ollama` on drive `C:`

If you want to force models to stay on `E:`, set a system environment variable like this:

```powershell
setx OLLAMA_MODELS "E:\Ollama\Models" /M
```

Then restart Ollama.

## 2. Prepare the Node bridge

Copy the example file:

```powershell
Copy-Item server\.env.example server\.env
```

Open `server\.env` and check these values:

```env
CHAT_SERVER_HOST=0.0.0.0
CHAT_SERVER_PORT=3001
CHAT_SERVER_API_KEY=replace_me_with_a_long_random_string
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_KEEP_ALIVE=10m
```

Generate a random API key in PowerShell if needed:

```powershell
[guid]::NewGuid().ToString("N")
```

Paste that value into `CHAT_SERVER_API_KEY`.

## 3. Start the Node bridge

Run:

```powershell
npm.cmd run server:start
```

If everything is correct, you will see a message that the server is listening on port `3001`.

## 4. Check the bridge health

In another PowerShell window run:

```powershell
Invoke-WebRequest http://127.0.0.1:3001/health
```

Or open this in your browser:

`http://127.0.0.1:3001/health`

Expected result:

- `ollamaReachable: true`
- `modelAvailable: true`

If `modelAvailable` is `false`, run:

```powershell
ollama pull qwen3:8b
```

## 5. Find your computer IP for phone testing on the same Wi-Fi

Run:

```powershell
ipconfig
```

Find the `IPv4 Address` of your active Wi-Fi or Ethernet adapter. Example:

`192.168.1.50`

## 6. Configure the mobile app

Open `app.json` and change the `extra` block:

```json
"extra": {
  "useMockAi": false,
  "aiApiUrl": "http://192.168.1.50:3001/chat",
  "aiApiKey": "your_same_random_key"
}
```

Replace:

- `192.168.1.50` with your actual local IP
- `your_same_random_key` with the value from `CHAT_SERVER_API_KEY`

## 7. Restart the Expo app

Stop Expo if it is running, then start it again:

```powershell
npm.cmd start
```

Open the app on the device and send a message.

## 8. If the phone cannot connect on the same network

Allow Node.js through Windows Firewall when Windows asks for permission.

If Windows did not ask, open PowerShell as Administrator and run:

```powershell
New-NetFirewallRule -DisplayName "Neuro Chat Bridge 3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

Also make sure:

- the phone and PC are on the same Wi-Fi
- the Node bridge is still running
- `app.json` points to your real local IP, not `127.0.0.1`

## 9. For users outside your local network

Recommended approach: do not expose Ollama directly. Expose only the Node bridge.

### Safer option: Cloudflare Tunnel

Cloudflare Tunnel publishes a local service without opening inbound ports on your router.

Basic steps:

1. Create a Cloudflare account.
2. Add your domain to Cloudflare.
3. Install `cloudflared`.
4. Log in with `cloudflared tunnel login`.
5. Create a tunnel with `cloudflared tunnel create neuro-chat`.
6. Route a hostname to the tunnel.
7. Point the tunnel to `http://localhost:3001`.

Official docs:

- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Create a locally-managed tunnel: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/

After that, replace `aiApiUrl` in `app.json` with:

```json
"aiApiUrl": "https://api.your-domain.com/chat"
```

### Riskier option: direct port forwarding

This is not recommended for Ollama itself. If you insist on opening ports:

1. Open only the Node bridge port, for example `3001`.
2. Forward router port `3001` to your PC.
3. Use a DDNS name or static public IP.
4. Add HTTPS through a reverse proxy or tunnel.
5. Keep the bearer token enabled.

Do not publish `11434` directly unless you clearly understand the security implications.
