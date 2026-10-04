# QLD CoC Generator `v1.1.1`

[![Version](https://img.shields.io/badge/version-1.1.1-00dd66.svg)](https://tools.kaielectrical.com.au)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/PWA-Offline%20Ready-green.svg)](https://tools.kaielectrical.com.au)

> Queensland *Electrical Safety Regulation 2026* Certificate of Testing & Compliance (CoC / CoT / CoTC) Generator.  
> Pure static client-side PWA web application deployed at **[tools.kaielectrical.com.au](https://tools.kaielectrical.com.au)**, built by [Kai Electrical Tech Pty Ltd](https://kaielectrical.com.au).

---

## 🌟 Key Features

1. **🏛️ Compliance Disclaimer & Regulatory Formatter**
   - Pure client-side PDF generation formatter designed for Queensland licensed electrical contractors.
   - Formatted in accordance with Queensland *Electrical Safety Regulation 2026* provisions:
     - **s229**: Testing and compliance (Electrical installation)
     - **s208**: Testing and safety (Electrical equipment)
   - Testing verification and statutory compliance remain solely the responsibility of the qualified person.

2. **🏷️ 100% Free & Watermark-Free**
   - Free to use with zero subscriptions, zero account logins, and no paywalls.
   - Generated certificates are completely clean with no vendor watermarks or advertisements.

3. **🔐 100% Device-Level Privacy & Zero Cloud Storage**
   - Zero server transmission, zero cloud databases, and zero third-party tracking scripts.
   - All contractor profiles, worker credentials, letterhead logos, and client job data remain strictly on your physical device (`localStorage`).
   - Because our servers store zero user data and browser storage technologies may lose cache or local data due to browser clearing, updates, or OS storage management, users are solely responsible for downloading, exporting, and retaining generated PDF certificates for the mandatory 5-year statutory record-keeping period required under the Queensland *Electrical Safety Regulation 2026* (s229(3) / s208(3)).

4. **📍 Smart Australian Street Address Autocomplete**
   - Instant street-level suggestions via Photon / OpenStreetMap API with a built-in offline Queensland suburbs database fallback.
   - Automatically parses street, suburb, and postcode into official ESO fields.

5. **🔒 Anti-Tamper Baking & In-Place Searchable Text Layer**
   - High-clarity rasterization via PDF.js worker into flat image PDFs with zero editable form fields, preventing post-issuance tampering.
   - Features an invisible in-place searchable text layer matching the exact visual positions of every word, allowing natural on-page text selection, copying, and `Ctrl+F` search highlighting.
   - Highly optimized file size (~230 KB per page) for rapid sharing over mobile networks (AirDrop, Email, SMS).
   - Every certificate is stamped with a unique physical Device ID (`DEV-XXXX-XXXX`) at the bottom-left to prove the originating device.

6. **📑 Multi-Page Continuation Engine**
   - Formatted to Queensland ESO Form V7.09-2026 specifications.
   - Standard jobs of 1 to 15 lines fit standard Page 1, 16 to 18 lines fit compact Page 1.
   - For jobs exceeding 18 lines, automatically generates clean continuation sheets with complete customer, address, contractor licence, and signature bars on every single page.

7. **💾 Portable Profile Configuration Backup**
   - One-click `.json` backup and restore to safeguard contractor details, custom logo, and work description presets across devices or browser cache clearing.
   - Excludes digital signatures and client certificate history for maximum security.

8. **📱 Mobile-Optimized One-Tap Share & Offline PWA**
   - Web Share API (`navigator.share`) for instant AirDrop, Mail, WhatsApp, or Save to Files.
   - Full Service Worker (`sw.js`) caching for 100% offline job site usability without mobile reception.
   - Formatted for standard Australian A4 printing (1:1 scale).

---

## 💻 Local Preview

Serve the static files locally with any web server:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.
