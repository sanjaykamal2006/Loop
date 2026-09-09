# Google Play Store Screenshot & Graphic Asset Guide

This guide details Google Play Console store listing visual asset requirements for **LOOP**.

---

## 1. Phone Screenshots Requirements
- **Minimum count:** 2 screenshots
- **Maximum count:** 8 screenshots per device form factor
- **Aspect Ratio:** 16:9 or 9:16 (Standard: 9:16 Portrait)
- **Standard Resolution:** 1080 x 1920 px (or minimum 1080 x 2400 / 320px to 3840px on any side)
- **Format:** PNG (24-bit with no alpha) or JPEG
- **File size:** Max 8 MB each

### Current Screenshot Set (in `playstore/screenshots/` and `public/screenshots/`):
1. **`screenshot-1.png` (Home Screen):** Live feed of active rides, destination cards, search, joined tags, and female-only indicators.
2. **`screenshot-2.png` (Create Ride Form):** Intuitive ride creation interface with origin, destination, vehicle selector (Auto, Share Auto, Bike, Cab), seat count slider, and departure time picker.
3. **`screenshot-3.png` (Real-Time Chat):** Ride group chat with presence, shared live map location pin, typing indicators, and co-passenger messages.
4. **`screenshot-4.png` (Ride Details & Fare Splitter):** Complete ride overview with verified passengers, fair cost calculator per person, and quick actions.
5. **`screenshot-5.png` (Profile & Customization):** Student profile, verified tag, registration number, bio, trusted driver directory, and Buy Me a Coffee support link.
6. **`screenshot-6.png` (Dark Mode Aesthetic):** The signature high-contrast pitch black (#000000) dot-matrix theme with yellow (#FFC554) accents.

---

## 2. Feature Graphic Requirements
- **Dimensions:** 1024 x 500 px (exact)
- **Format:** JPEG or PNG (24-bit no alpha)
- **File size:** Max 15 MB
- **File location:** `public/feature-graphic.png` and `playstore/feature-graphic.png`
- **Design Guidelines:**
  - Center-focused title and branding.
  - Safe zone: keep logos and text away from outer 15% margins to prevent cutoff on various screen sizes.
  - High contrast on dark backgrounds.

---

## 3. App Icon Requirements
- **Dimensions:** 512 x 512 px (exact 32-bit PNG)
- **File location:** `public/icon-512.png`
- **File size:** Max 1 MB
- **Design Guidelines:**
  - Square icon with full bleed (Google Play automatically applies rounded corners and drop shadows).
