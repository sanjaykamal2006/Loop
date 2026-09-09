# Google Play Store (TWA) Build & Deployment Guide for LOOP

This document provides a step-by-step guide to generating an Android App Bundle (`.aab`) for **LOOP** using Google's **Bubblewrap CLI (Trusted Web Activity)** and publishing it to the Google Play Store.

---

## 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js**: v18 or newer
- **Java Development Kit (JDK)**: JDK 17 or JDK 21 (Bubblewrap will guide or download automatically if missing)
- **Android SDK command-line tools**: Bubblewrap handles installation during first run if not already installed.

---

## 2. Install Bubblewrap CLI
Install Google's official Bubblewrap CLI globally:

```bash
npm install -g @bubblewrap/cli
```

Verify installation:
```bash
bubblewrap --version
```

---

## 3. Prepare Your Production Domain
Before building the APK/AAB for production, ensure your Next.js app is deployed to your production domain (e.g. `https://loop-vit.vercel.app` or your custom domain).

In `bubblewrap.json`, update:
- `"host"`: `"your-domain.vercel.app"` (without `https://`)
- `"iconUrl"`: `"https://your-domain.vercel.app/logo.png"`
- `"maskableIconUrl"`: `"https://your-domain.vercel.app/icon-512.png"`
- `"webManifestUrl"`: `"https://your-domain.vercel.app/manifest.webmanifest"`

---

## 4. Initialize & Build the Android App

### Step 4.1: Initialize Project
In a dedicated build directory (e.g., `twa-build/`), run:

```bash
bubblewrap init --manifest https://YOUR_PRODUCTION_DOMAIN/manifest.webmanifest
```

Bubblewrap will read your `manifest.webmanifest` and prompt for details:
- **Application name**: `LOOP`
- **Short name**: `LOOP`
- **Application ID / Package ID**: `app.loop.twa`
- **Display mode**: `standalone`
- **Status bar color**: `#000000`
- **Navigation bar color**: `#000000`
- **Key store path & password**: Bubblewrap will prompt to create a new signing keystore (`android.keystore`). **Keep this file and password extremely secure!**

### Step 4.2: Build the Android App Bundle (AAB)
Run the build command:

```bash
bubblewrap build
```

This compiles your TWA and outputs:
- `app-release-bundle.aab` (The signed Android App Bundle to upload to Google Play)

---

## 5. Extract SHA-256 Fingerprint & Update Digital Asset Links

For the Android app to run full-screen without showing a browser URL address bar, Android requires domain verification via `/.well-known/assetlinks.json`.

### Extract SHA-256 Fingerprint from Keystore:
```bash
keytool -list -v -keystore android.keystore -alias android
```
Look for the line:
```
Certificate fingerprints:
  SHA256: 12:34:56:78:9A:BC:DE:F0:...
```

### Update Digital Asset Links in LOOP:
1. Update `public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.loop.twa",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```
2. Or set the environment variable in Vercel:
```
ASSETLINKS_SHA256=YOUR_SHA256_FINGERPRINT_HERE
NEXT_PUBLIC_PACKAGE_NAME=app.loop.twa
```
3. Deploy to production and verify in your browser:
Visit `https://YOUR_PRODUCTION_DOMAIN/.well-known/assetlinks.json` to verify the JSON is publicly accessible.

---

## 6. Google Play Console Submission Steps

### Step 6.1: Create App
1. Go to [Google Play Console](https://play.google.com/console).
2. Click **Create app**.
3. App name: `LOOP`
4. Default language: `English (United States)` or `English (India)`
5. App or game: `App`
6. Free or paid: `Free`
7. Accept declarations and click **Create app**.

### Step 6.2: Set Up Store Listing
Go to **Grow → Store presence → Main store listing**:
- **App Name**: `LOOP`
- **Short Description** (from `playstore/description.txt`):
  `Real-time ride coordination for college students. Find rides instantly.`
- **Full Description**: Paste content from `playstore/description.txt`.
- **App Icon**: Upload `public/icon-512.png` (512 x 512).
- **Feature Graphic**: Upload `public/feature-graphic.png` (1024 x 500).
- **Phone Screenshots**: Upload `screenshot-1.png` through `screenshot-6.png` from `playstore/screenshots/`.

### Step 6.3: App Content & Policy Declarations
In **Policy and programs → App content**:
1. **Privacy Policy**: Enter `https://YOUR_PRODUCTION_DOMAIN/privacy`
2. **App Access**: All functionality is available without special access (or provide a test student account email/password).
3. **Ads**: Select "No, my app does not contain ads".
4. **Content Rating**: Complete questionnaire (Select Utility/Communication/Social & Transport). Expected rating: PEGI 3 / Everyone.
5. **Target Audience**: 18 and over (University Students).
6. **Data Safety Section**:
   - Collects: Email address, Name, optional Phone number, user messages in chat.
   - Purpose: App functionality, Account management.
   - Encrypted in transit: Yes (HTTPS).
   - Data deletion: Yes, users can delete their account and data within the app (`Profile → Settings → Delete Account`).

### Step 6.4: Release & Rollout
1. Go to **Release → Production** (or **Closed testing** for internal rollout first).
2. Click **Create new release**.
3. Upload `app-release-bundle.aab`.
4. Enter Release notes:
   `Initial release of LOOP: Real-time purpose-based campus ride coordination.`
5. Review and rollout!
