; Magic Dialer Installer
; Inno Setup script — free (uses Inno Setup, free; and the packaged agent .exe).
;
; This wraps the customer's PC agent into a single .exe. It:
;   1. installs the agent + setup form to %LocalAppData%\Magic Dialer
;      (per-user only — no admin needed, no elevation/path issues)
;   2. runs a friendly WINDOWED setup form (setup.ps1) that captures the
;      customer's portal URL, access key, product, lead info and email
;   3. "Save & Start" writes the config and launches the agent (heartbeat)
;
; Build: ISCC.exe installer.iss   (requires dist\MagicDialer.exe — see BUILD.md)

[Setup]
AppName=Magic Dialer
AppVersion=1.1.0
DefaultDirName={localappdata}\Magic Dialer
DefaultGroupName=Magic Dialer
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=MagicDialer-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=Magic Dialer
SetupIconFile=assets\logo.ico
WizardStyle=modern

[Files]
Source: "dist\MagicDialer.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "setup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "cockpit.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "run-test-call.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\logo-256.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\logo.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commondesktop}\Magic Dialer"; Filename: "{app}\MagicDialer.exe"; IconFilename: "{app}\logo.ico"; WorkingDir: "{app}"
Name: "{group}\Magic Dialer"; Filename: "{app}\MagicDialer.exe"; IconFilename: "{app}\logo.ico"; WorkingDir: "{app}"

[Run]
; Friendly windowed setup form (asks for portal URL, access key, product, etc.).
; After "Save and Start" it writes the config and launches the agent hidden
; (the agent opens the animated Agent Cockpit window by itself).
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\setup.ps1"""; Flags: nowait skipifsilent; Description: "Run Magic Dialer setup"
