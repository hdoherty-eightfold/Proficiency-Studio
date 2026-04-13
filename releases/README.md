# Proficiency Studio — distribution and installs (macOS / Windows / Linux)

This desktop app is **not** distributed through the macOS App Store, Microsoft Store, or Linux app stores unless explicitly stated in a given release. Official builds may be published via **[EightfoldAI/SRS-Apps — Releases](https://github.com/EightfoldAI/SRS-Apps/releases)** or another channel your team names.

This `releases/` folder holds **documentation only**. Installers are **not** stored in git; they are attached to release tags or supplied by IT.

## macOS

### “Apple could not verify … is free of malware” (only **Move to Trash** and **Done**)

On recent macOS versions, Gatekeeper may show this strict dialog. **Simply opening the app again with a double‑click usually does not make the warning go away.**

#### 1) Control‑click → **Open** in Finder (try this first)

1. In **Finder**, go to **Applications** (or wherever the `.app` is).
2. **Control‑click** (right‑click) **`Proficiency Studio.app`**.
3. Choose **Open** from the menu (the normal **Open** at the top — there is no **Open Anyway** in this menu; that label lives elsewhere).

A Gatekeeper dialog may appear next. If it includes an **Open** button, click **Open**. If it only offers **Move to Trash** and **Done**, click **Done** and go to step 2.

#### 2) **Open Anyway** — correct screen in System Settings

**Open Anyway** does **not** appear in the Finder menu, and **not** inside **Privacy & Security → Files & Folders** (the long list of apps like Chrome, Cursor, Terminal). That list is only for file/folder access.

1. Trigger the block once (double‑click the app, or **Control‑click → Open**, until you get the “could not verify” / malware warning), then click **Done**.
2. Open **System Settings** → **Privacy & Security**.
3. Make sure you are on the **main** Privacy & Security page: the heading at the top should be **Privacy & Security**, not **Files & Folders**. If you see that app list, click the **< Back** button (top left) until you return to the overview.
4. On that **overview** page, scroll **all the way down** — past Location, Contacts, Photos, Bluetooth, **Files & Folders**, Full Disk Access, etc. Near the bottom, under **Security**, look for a line about **Proficiency Studio** being blocked and a button such as **Open Anyway** or **Allow** (wording varies by macOS version).
5. If you see it, click it and confirm (Touch ID or password).

**If you still never see Open Anyway on that overview page:** many **IT‑managed** Macs (Kandji, Jamf, etc.) hide or disable this override — use step 3 with IT approval, or ask IT to allowlist the app / ship a **notarized** build.

#### 3) Quarantine (trusted source only)

If IT confirms the build is legitimate, copy the app to **`/Applications`**, then in **Terminal**:

```bash
xattr -dr com.apple.quarantine "/Applications/Proficiency Studio.app"
```

Then use **Control‑click → Open** once. Adjust the path if your `.app` lives elsewhere.

#### 4) Permanent fix for all users

Ship **Developer ID–signed and notarized** macOS builds (with hardened runtime as required by Apple).

### DMG

Drag the app into **Applications**, eject the DMG, then use the steps above on the **Applications** copy—not only the copy on the disk image.

## Windows

**SmartScreen:** **More info** → **Run anyway** only if you trust the source.

## Linux

**AppImage:** `chmod +x` then run; see release notes for distro-specific Electron requirements.

## Local build output

`npm run build:mac` (and other platform scripts) write installers to the **`release/`** directory (singular) at the project root—that is **Electron Builder output**, not this docs folder.
