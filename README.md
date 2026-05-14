# PocketLedger

**Private offline budget clarity for Android.**

Import bank statements, understand your spending, detect subscriptions, and find savings potential — entirely on your device. No backend. No account. No cloud.

---

## What PocketLedger Is

PocketLedger is a local-only budget organization app for Android. It helps you:

- Import bank statements from PDF, CSV, or plain text files — or paste statement text directly
- Classify transactions into 19 spending categories automatically
- Track income vs. spending by month and category
- Detect recurring subscriptions and estimate their yearly cost
- Set a monthly budget and track fixed bills
- Identify spending anomalies and savings opportunities (3 scenarios)
- Export reports as CSV or HTML via Android's share sheet
- Lock the app with your device's biometric or PIN

**Everything runs on your device. No backend. No account. No cloud sync. No internet required.**

---

## What PocketLedger Is NOT

- Not a bank app
- Not a financial advisor
- Not tax software
- Not investment software
- Not connected to any bank or financial institution
- Does not upload statements
- Does not require an internet connection

---

## Package

```
com.oldalexhub.pocketledger
```

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Bare React Native 0.85.3 — Android only |
| Navigation | React Navigation v7 (bottom tabs + native stack) |
| Storage | AsyncStorage — local, on-device only |
| File import | react-native-document-picker + react-native-fs |
| PDF extraction | pako (pure-JS zlib) — parses BT/ET content streams, handles FlateDecode compression |
| App Lock | react-native-biometrics — local Android auth only |
| No backend, no cloud, no external APIs ||

---

## Build Requirements

- Node.js >= 22.11
- React Native CLI (`@react-native-community/cli`)
- Android Studio with Android SDK installed
- Java JDK 17+ (also needed for `keytool` — used by `release.py`)
- Android NDK (installed via Android Studio's SDK Manager)

---

## Setup

```bash
# Install dependencies
cd pocketledger
npm install

# Start Metro bundler
npm start

# Run on Android (emulator or device connected)
npm run android
```

---

## Release Build

Use the `release.py` script from the **parent directory** (`Desktop/PocketLedger/`):

```bash
# Full build (generates keystore on first run, then builds APK + AAB)
python release.py

# Build without capturing screenshots
python release.py --skip-screenshots

# Collect existing artifacts only (no Gradle build)
python release.py --skip-build

# Screenshots only (app must be open on emulator)
python release.py --screenshots-only

# Set up (or regenerate) the release signing keystore only
python release.py --setup-signing

# Clean build
python release.py --clean
```

### Release Signing

On the **first run**, `release.py` automatically generates a release keystore using
`keytool` (bundled with the JDK). You will be prompted for a password once. The
generated files are:

```
pocketledger/android/keystore.properties       ← credentials (gitignored)
pocketledger/android/app/pocketledger-release.keystore  ← keystore (gitignored)
```

> **Back these up.** Losing the keystore means you cannot push updates to the Play Store.

Both files are added to `android/.gitignore` automatically. `build.gradle` reads them
at build time — no manual editing required.

### Output Structure

```
releases/
  builds/
    PocketLedger-release.apk
    PocketLedger-release.aab
  screenshots/
    01-dashboard.png
    02-transactions.png
    ...
  branding/
    PocketLedger-logo.png
    ic_launcher_512.png
    icons/
      mipmap-mdpi/
      mipmap-hdpi/
      ...
  store-assets/
    short-description.txt
    full-description.txt
    ...
  docs/
    PRIVACYPOLICY.md
    README.md
```

---

## Statement Import

### Option 1 — Select File

1. Import → **Select File**
2. Choose a `.pdf`, `.txt`, or `.csv` bank statement from your device
3. The app reads and parses it locally on-device
4. Review extracted transactions, edit categories if needed
5. Tap **Import**

PDF support: the app parses text-based (digitally generated) PDFs using a pure-JS
FlateDecode decompressor. Scanned PDFs (image-only) will prompt you to use the
Paste method instead.

### Option 2 — Paste Statement Text

1. Copy transaction text from your bank's website
2. Import → **Paste Statement Text**
3. Paste and tap **Parse**
4. Review and confirm transactions

---

## App Lock

App Lock is optional. When enabled:

- Uses Android's biometric authentication (fingerprint, face unlock) or device PIN
- PocketLedger does **not** collect, store, or transmit biometric data
- Authentication is handled entirely by the Android OS
- Can be enabled or disabled any time from Settings

---

## Permissions

PocketLedger requests minimal permissions:

| Permission | Purpose |
|---|---|
| `USE_BIOMETRIC` | Optional App Lock — local only |
| `USE_FINGERPRINT` | Optional App Lock fallback — local only |

**No `INTERNET` permission is requested.** The app is fully offline.

---

## Privacy

See [PRIVACYPOLICY.md](PRIVACYPOLICY.md) for the full policy.

Short version:
- No data leaves your device
- No account required
- No analytics or telemetry
- No bank connection
- No biometric data stored or transmitted

---

## Disclaimer

PocketLedger is a personal budget organization tool. It does not provide financial,
tax, credit, loan, investment, or accounting advice. All calculations are estimates
based on the information you enter or import.
