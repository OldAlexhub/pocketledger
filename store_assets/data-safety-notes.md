# Data Safety Notes — PocketLedger

For Google Play Data Safety section.

---

## Does your app collect or share any user data?

**No.** PocketLedger does not collect, share, or transmit any user data.

---

## Data Types Collected

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Financial info (transaction data) | No | No | — |
| Personal info (name, email, etc.) | No | No | — |
| Location | No | No | — |
| Contacts | No | No | — |
| Health & fitness | No | No | — |
| Device identifiers | No | No | — |
| Files & documents | No | No | — |

---

## Data Stored On-Device

All app data is stored locally on the user's device using Android's local storage (AsyncStorage). This data never leaves the device and is not accessible to the developer.

| Local Data | Description |
|---|---|
| Transactions | User-entered or imported financial transactions |
| Statements | Metadata about imported statements |
| Budget settings | Monthly income, savings goal, bills, budgets |
| App settings | Currency preference, App Lock toggle, display settings |
| Category corrections | User's reclassification choices for merchants |

---

## App Lock

- App Lock is optional and disabled by default
- Uses Android's built-in biometric (fingerprint, face) or device PIN
- No biometric data is accessed, stored, or transmitted by the app
- Authentication result (success/fail) is returned by Android OS only

---

## Permissions Required

| Permission | Reason |
|---|---|
| `USE_BIOMETRIC` | Optional App Lock — local Android authentication only |
| `USE_FINGERPRINT` | Optional App Lock fallback — local Android authentication only |

**No INTERNET permission is requested or used.**

---

## Google Play Data Safety Answers

- **Does your app collect or share any user data?** No
- **Is all of the user data collected by your app encrypted in transit?** N/A (no data transmitted)
- **Do you provide a way for users to request their data be deleted?** Yes — Settings → Reset All Data

---

## Contact

Developer: OldAlexHub
Package: com.oldalexhub.pocketledger
