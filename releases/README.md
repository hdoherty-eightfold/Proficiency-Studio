# Proficiency Studio — distribution and installs (macOS / Windows / Linux)

This desktop app is **not** distributed through the macOS App Store, Microsoft Store, or Linux app stores unless explicitly stated in a given release. Official builds may be published via **[EightfoldAI/SRS-Apps — Releases](https://github.com/EightfoldAI/SRS-Apps/releases)** or another channel your team names.

This `releases/` folder holds **documentation only**. Installers are **not** stored in git; they are attached to release tags or supplied by IT.

## macOS

### “Apple could not verify … is free of malware” (only **Move to Trash** and **Done**)

On recent macOS versions, Gatekeeper may show this strict dialog. **Simply opening the app again with a double‑click usually does not make the warning go away.**

#### 1) Control‑click → Open (try this first)

1. In **Finder**, select **`Proficiency Studio.app`** (for example in **Applications**).
2. **Control‑click** (right‑click) the app → choose **Open**.
3. If the dialog offers **Open**, click **Open**.

#### 2) System Settings → Privacy & Security → Open Anyway

1. Click **Done** on the blocking dialog.
2. Open **System Settings** → **Privacy & Security**.
3. Scroll to **Security**. After a blocked launch, macOS often shows **“Proficiency Studio” was blocked** with **Open Anyway**.
4. Click **Open Anyway** and confirm (Touch ID or password may be required).

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
