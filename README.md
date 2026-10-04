# ⚡ KET CoC Generator `v1.0.8`

[![Version](https://img.shields.io/badge/version-1.0.8-00dd66.svg)](https://tools.kaielectrical.com.au)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/PWA-Offline%20Ready-green.svg)](https://tools.kaielectrical.com.au)

> Official Queensland *Electrical Safety Regulation 2026* Certificate of Testing & Compliance (CoC / CoT / CoTC) Generator.  
> Pure static client-side PWA web application deployed at **[tools.kaielectrical.com.au](https://tools.kaielectrical.com.au)**, built by [Kai Electrical Tech Pty Ltd](https://kaielectrical.com.au).

---

## 🌟 Key Features

1. **🏛️ Compliance Disclaimer & Regulatory Formatter**
   - Pure client-side PDF generation formatter designed for Queensland licensed electrical contractors.
   - Formatted in accordance with Queensland *Electrical Safety Regulation 2026* provisions:
     - **s229**: Testing and compliance (Electrical installation)
     - **s208**: Testing and safety (Electrical equipment)
   - Testing verification and statutory declarations remain solely the responsibility of the qualified person.

2. **🏷️ 100% Free & Watermark-Free**
   - Free to use with zero subscriptions, zero account logins, and no paywalls.
   - Generated certificates are completely clean with no vendor watermarks or advertisements.

3. **🔐 100% Device-Level Privacy & Zero Cloud Storage**
   - Zero server transmission, zero cloud databases, and zero third-party tracking scripts.
   - All contractor profiles, worker credentials, letterhead logos, and client job data remain strictly on your physical device (`localStorage`).

4. **📁 Mandatory 5-Year Record-Keeping Compliance**
   - Because our servers store zero user data, contractors must export and archive generated certificates locally.
   - Designed to satisfy the Queensland *Electrical Safety Regulation 2026* mandatory **5-year statutory retention requirement** (s229(3) / s208(3)).

5. **📍 Smart Australian Street Address Autocomplete**
   - Instant street-level suggestions via Photon / OpenStreetMap API with a built-in offline Queensland suburbs database fallback.
   - Automatically parses street, suburb, and postcode into official ESO fields.

6. **🔒 200 DPI Anti-Tamper Baking & In-Place Searchable Text Layer**
   - High-clarity 200 DPI rasterization via PDF.js worker into flat image PDFs with zero editable form fields, preventing post-issuance tampering.
   - Features an invisible in-place searchable text layer matching the exact visual positions of every word, allowing natural on-page text selection, copying, and `Ctrl+F` search highlighting.
   - Highly optimized file size (~230 KB per page) for rapid sharing over mobile networks (AirDrop, Email, SMS).
   - Every certificate is stamped with a unique physical Device ID (`DEV-XXXX-XXXX`) at the bottom-left to prove the originating device.

7. **📑 Official Standard & Multi-Page Annexure A**
   - Formatted to official Queensland ESO Form V7.09-2026 specifications.
   - Automatically generates a standardized **Annexure A** continuation sheet if the work description exceeds Page 1 capacity (17 lines).

8. **💾 Portable Profile Configuration Backup**
   - One-click `.json` backup and restore to safeguard contractor details, custom logo, and work description presets across devices or browser cache clearing.
   - Excludes digital signatures and client certificate history for maximum security.

9. **📱 Mobile-Optimized One-Tap Share & Offline PWA**
   - Web Share API (`navigator.share`) for instant AirDrop, Mail, WhatsApp, or Save to Files.
   - Full Service Worker (`sw.js`) caching for 100% offline job site usability without mobile reception.
   - Formatted for standard Australian A4 printing (1:1 scale, 300 DPI).

---

## 💻 Local Preview

Serve the static files locally with any web server:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.
