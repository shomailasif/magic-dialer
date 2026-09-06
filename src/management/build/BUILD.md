# Building the customer installer (.exe)

Everything to turn the agent into a Windows `.exe` that a customer installs on
their PC. All tools are **free**. This pipeline has been run and produces a
working installer (see `build/dist/MagicDialer-Setup.exe`).

## The pipeline (what each step does)

1. **Bundle** the agent into one file -> `build/dist/agent-bundle.js` (esbuild, free)
2. **pkg** turns that file into a Windows `.exe` (embeds Node, so the customer
   PC doesn't need Node installed)
3. **Inno Setup** wraps the `.exe` into a friendly installer that installs it
   and runs the **windowed** one-time setup form (`setup.ps1`)

## Prerequisites (installed once)

- Node.js (already used by this project)
- Inno Setup 6 (free) -> `C:\Users\USER\AppData\Local\Programs\Inno Setup 6\ISCC.exe`
- pkg (free, maintained fork) -> `npm install @yao-pkg/pkg --no-save` in the project root

## Step 1 — bundle

```
node build/bundle.js        # -> build/dist/agent-bundle.js
```

## Step 2 — .exe with pkg

```
node "<project>/node_modules/@yao-pkg/pkg/lib-es5/bin.js" ^
     build/dist/agent-bundle.js ^
     --targets node22-win-x64 ^
     --output build/dist/MagicDialer.exe
```

> The agent .exe must not be running while rebuilding (Windows locks the file).
> Stop it first (`Stop-Process -Name MagicDialer -Force`).

`pkg` downloads the Node 22 runtime once and embeds it, producing
`build/dist/MagicDialer.exe` (~55 MB).

> Use `node22-win-x64` (not node18): modern Node has a prebuilt binary, so pkg
> doesn't try to build from source (which needs the Unix `patch` tool not
> present on Windows).

## Step 3 — installer with Inno Setup

`installer.iss` includes BOTH `dist\MagicDialer.exe` and `setup.ps1`.

```
"C:\Users\USER\AppData\Local\Programs\Inno Setup 6\ISCC.exe" build\installer.iss
```

Produces `build/dist/MagicDialer-Setup.exe` (compressed, ~15 MB) — the one-time
installer you give each customer.

## What the installer does on the customer's PC

- Installs per-user (no admin needed) to `%LocalAppData%\Magic Dialer`
- Launches a **windowed setup form** (`setup.ps1`) that captures:
  - the **Magic Dialer portal URL** and the customer's **access key**
  - what the customer sells / their service
  - what lead info they need (comma-separated)
  - the email where qualified leads go
- "Save and Start" writes `%USERPROFILE%\.magicdialer\config.json` and launches
  the agent, which heartbeats to the portal (customer shows ONLINE).

The same `MagicDialer-Setup.exe` works for **every** customer — the portal + key
come from the setup form, so they connect to the right provider's account.

> Keep `setup.ps1` ASCII-only (no em dashes / special characters): PowerShell 5.1
> misreads non-ASCII in a UTF-8 file without a BOM, which breaks the script.

## Result

Customers run **MagicDialer-Setup.exe** once. The portal then shows them online
and lets you disable them remotely. Check the live portal / VOIP status at the
deploy repo (see PORTAL-LIVE.md).