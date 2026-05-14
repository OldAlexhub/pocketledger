# PocketLedger

**Private offline budget clarity for Android.**

Import statements, understand spending, detect subscriptions, and find your savings potential privately on your phone.

---

## What PocketLedger Is

PocketLedger is a local-only budget organization app for Android. It helps you:

- Import bank statement text or files and classify transactions locally
- Track income vs. spending by month and category
- Detect recurring subscriptions
- Set budgets and track fixed bills
- Identify spending anomalies and savings opportunities
- Export reports as CSV or HTML
- Lock the app with your device's biometric or PIN

**Everything runs on your device. No backend. No account. No cloud sync.**

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

- **Framework:** Bare React Native 0.85
- **Platform:** Android only
- **Storage:** AsyncStorage (local, on-device)
- **Navigation:** React Navigation v7
- **Authentication:** react-native-biometrics (local device auth only)
- **File Import:** react-native-document-picker + react-native-fs
- **No backend, no cloud, no external APIs**

---

## Build Requirements

- Node.js >= 22.11
- React Native CLI (`@react-native-community/cli`)
- Android Studio with SDK installed
- Java 17+
- Android NDK (installed via Android Studio)

---

## Setup

```bash
# Install dependencies
cd pocketledger
npm install

# Start Metro bundler
npm start

# Run on Android (with emulator or device connected)
npm run android
```

---

## Release Build

Use the included `release.py` script from the **parent directory** of `pocketledger/`:

```bash
# From the Desktop/PocketLedger directory:
python release.py

# Skip screenshots
python release.py --skip-screenshots

# Skip build (just collect assets)
python release.py --skip-build

# Screenshots only
python release.py --screenshots-only

# Clean build before building
python release.py --clean
```

The script outputs artifacts to a `releases/` folder:

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
  store-assets/
    short-description.txt
    full-description.txt
    ...
  docs/
    PRIVACYPOLICY.md
    README.md
```

---

## App Lock

App Lock is optional. When enabled:

- Uses Android's biometric authentication (fingerprint, face unlock) or device PIN
- PocketLedger does **not** collect, store, or transmit biometric data
- Authentication is handled entirely by the Android OS
- Can be enabled/disabled any time from Settings

---

## Statement Import

### Option 1: Paste Statement Text

1. Copy transaction text from your bank's website
2. Open PocketLedger → Import → Paste Statement Text
3. Paste and tap Parse
4. Review extracted transactions
5. Edit categories if needed
6. Tap Import

### Option 2: Select File

1. Import → Select File
2. Choose a `.txt` or `.csv` file from your device
3. App reads and parses it locally
4. Review and confirm transactions

> **Note:** Full PDF OCR requires additional native libraries (e.g., MLKit or Tesseract). The current parser handles plain text and CSV formats. For PDF statements, export as text from your bank's website and use the Paste method.

---

## Logo & App Icon

Place your logo at:

```
pocketledger/assets/logo.png
```

The `release.py` script copies it to `releases/branding/`.

For launcher icons, generate all required density variants and place them in:

```
pocketledger/android/app/src/main/res/mipmap-*/
```

Recommended sizes:
- `mipmap-mdpi`: 48x48
- `mipmap-hdpi`: 72x72
- `mipmap-xhdpi`: 96x96
- `mipmap-xxhdpi`: 144x144
- `mipmap-xxxhdpi`: 192x192

For adaptive icons, also provide a 108x108 foreground layer.

---

## Screenshots

Run `release.py` with an Android emulator open and the app visible:

```bash
python release.py
# or
python release.py --screenshots-only
```

Keep the emulator open with the app running. The script will prompt you to navigate to each screen before capturing.

---

## Permissions

PocketLedger requests minimal permissions:

| Permission | Purpose |
|---|---|
| `USE_BIOMETRIC` | Optional App Lock — local only |
| `USE_FINGERPRINT` | Optional App Lock fallback — local only |

**No INTERNET permission is requested.** The app is fully offline.

---

## Privacy

See [PRIVACYPOLICY.md](PRIVACYPOLICY.md) for full details.

Short version:
- No data leaves your device
- No account required
- No analytics or telemetry
- No bank connection
- No biometric data stored or transmitted

---

## Disclaimer

PocketLedger is a personal budget organization tool. It does not provide financial, tax, credit, loan, investment, or accounting advice. All calculations are estimates based on the information you enter or import.
