# QLD CoC Generator — Architectural Principles & Design Decisions (ADR)

> **Document Status**: Accepted / Authoritative  
> **Applies To**: `tools/coc/` (`https://tools.kaielectrical.com.au/coc`)  
> **Primary Audience**: Core Engineers, Open Source Contributors, Compliance Auditors, AI Agents  
> **Repository**: [kai-electrical-tech/QLD-CoC-Formatter](https://github.com/kai-electrical-tech/QLD-CoC-Formatter)

---

## 1. Overview & Core Philosophy

**QLD CoC Generator** is a pure client-side, zero-login, offline-ready progressive web application (PWA) engineered specifically for Queensland Licensed Electrical Contractors. It generates fully compliant, tamper-proof Certificates of Testing and Compliance (CoC / CoTC under s229) and Certificates of Testing and Safety (CoTS under s208) in accordance with the Queensland *Electrical Safety Regulation 2026*.

Across all architectural layers and user interactions, the system adheres to one non-negotiable tenet:  
**"On-site operational speed, customer data privacy, and strict statutory compliance take absolute precedence over all other concerns. No architectural complexity, third-party dependency, or UI bloat shall compromise the electrician's workflow."**

This document establishes the seven core Architecture Decision Records (ADRs) that govern the codebase.

---

## 2. Architecture Decision Records (ADRs)

### ADR-01: Zero-Cloud Device-Level Privacy Architecture

* **Status**: Accepted
* **Context & Problem Statement**:
  1. Traditional trades software (e.g., Tradify, ServiceM8) captures customer names, residential addresses, job descriptions, and electrical contractor signatures on remote cloud servers and multi-tenant databases. This introduces critical attack surfaces, data leak risks, subscription costs, and mandatory compliance burdens under the Australian *Privacy Act 1988*.
  2. Under the Queensland *Electrical Safety Regulation 2026* (s229(3) for installations and s208(3) for equipment), the **licensed electrical contractor** is legally mandated to retain signed copies of all issued certificates for a minimum statutory period of **5 years**.
  3. Storing contractor or client data on centralized servers would misplace legal liability and create unnecessary regulatory exposure.
* **Decision**:
  - The application operates with a **100% client-side static architecture**.
  - Zero cloud databases, zero telemetry tracking scripts, and zero server-side storage endpoints.
  - Contractor profiles (business name, licence number, digital signature, custom logo), work description presets, and certificate history are stored exclusively inside the browser's physical device storage (`localStorage`).
  - Users are explicitly informed to download and archive their generated PDF certificates into their own long-term document retention workflows to satisfy the statutory 5-year requirement.
  - A local JSON configuration export/import mechanism is provided to allow seamless device migration without exposing client job histories or digital signatures.

---

### ADR-02: Anti-Tamper Baked Searchable PDF Pipeline (200 DPI Dual-Layer)

* **Status**: Accepted
* **Context & Problem Statement**:
  1. **Vulnerability of Vector/AcroForm PDFs**: Standard fillable PDF forms or plain vector PDFs can easily be modified post-issuance using standard editing software (e.g., Adobe Acrobat, PDF editors). Malicious actors, tenants, or dispute parties could alter test dates, scope of work, or contractor licence numbers, creating catastrophic legal liability for the issuing electrician.
  2. **Drawbacks of Naive Raster Scans**: Flattening documents into low-resolution images eliminates native text selection, prevents keyword searching (`Ctrl+F`), fails operating system search indexing (Windows Search, macOS Spotlight, Google Drive), and produces bloated file sizes (300 DPI images often exceed 700 KB per page).
* **Decision (Four-Stage Hybrid Engine)**:
  1. **Stage 1: Vector Layout (`pdf-lib`)**: Dynamic field population, smart address placement, and vector checkmarks are laid out over the patched Queensland ESO Form V7.09-2026 template.
  2. **Stage 2: 200 DPI Anti-Tamper Baking (`pdf.js` worker)**: The completed vector page is rendered onto an off-screen HTML5 canvas at 200 DPI (`scale = 2.77778`) and compressed into a high-fidelity JPEG (`quality = 0.70`). Every certificate is indelibly stamped with a unique physical device fingerprint (`Device ID: DEV-XXXX-XXXX`) at the bottom-left. The visual surface is rendered permanently uneditable.
  3. **Stage 3: Sub-Pixel In-Place Searchable Text Layer**: The exact affine transform coordinates `(tx, ty)` and bounding geometries of every word are extracted from the vector layer and re-injected above the raster image as an invisible (`opacity: 0`) WinAnsi text layer. Visible raster text and invisible search text achieve pixel-perfect alignment.
  4. **Stage 4: ISO 32000-1 Metadata Packaging**: Standard PDF metadata (Author, Subject, Creator, dynamic Title) is injected.
* **Consequences & Budget**:
  - Delivers a rock-solid, tamper-proof document where visual text cannot be modified.
  - Preserves natural on-page text selection, exact `Ctrl+F` search highlighting, and copy-paste capabilities.
  - Generates an ultra-compact file size of **~230 KB per page** (a 62% reduction compared to 300 DPI), enabling instant transmission over poor mobile cellular reception (AirDrop, Email, SMS, WhatsApp).

---

### ADR-03: Line Capacity Matrix & Autonomous Multi-Page Compliance

* **Status**: Accepted
* **Context & Problem Statement**:
  1. Electrical jobs vary widely: a simple smoke alarm replacement requires 1–3 lines, whereas a complex commercial switchboard upgrade, solar PV, and battery installation can span dozens of lines.
  2. In Australian practice, multi-page certificates historically appended an "Annexure A" sheet. However, if an annexure page becomes detached and lacks the customer name, installation address, contractor licence, or tester signature, it loses standalone legal evidentiary standing during ESO audits or court proceedings.
* **Decision (Capacity Matrix & Statutory Bar)**:
  - **Single-Page Standard Mode** (9.0pt font / 12.0pt line height): Accommodates **1 to 15 lines** of work description.
  - **Single-Page Compact Mode** (8.0pt font / 10.5pt line height): Accommodates **16 to 18 lines** seamlessly on Page 1 without clipping or overflow.
  - **Multi-Page Threshold ($\ge 19$ lines)**:
    - Page 1 encapsulates the first **13 lines** and terminates with a centered notice:  
      `--- Continued on Page 2 ---` at baseline `y = 304`.
    - Continuation pages carry **41 lines** (intermediate pages) or **42 lines** (final page).
    - **Independent Statutory Divider (`y = 138`)**: Starting from Page 2, every continuation sheet contains an authoritative legal divider. Below `y = 138`, each page replicates the full statutory details bar: **Customer Name, Installation Address, Contractor Licence Number, Testing Dates, Qualified Tester Signature, and Device ID**.
  - **Deprecation of Annexure A**: The legacy "Annexure A" banner is 100% eliminated. Every sheet stands as an autonomous, self-contained legal instrument.

---

### ADR-04: Deterministic ESO Form V7.09 Vector Stream Patching (`build_template.py`)

* **Status**: Accepted
* **Context & Problem Statement**:
  Queensland Electrical Safety Office (ESO) Form V7.09-2026 possesses structural flaws in its raw vector stream:
  1. Typographical spelling error in the top-right header (`equipmen` instead of `equipment`).
  2. Asymmetric subtitle parenthetical positioning.
  3. Structural footer margin misalignments (`* Indicates a mandatory field` indented incorrectly, and `V7.09-2026` right margin misaligned with body borders).
  4. The `* Name` section is broken into an isolated header line, pushing the underline onto a separate line and wasting valuable vertical space.
* **Decision**:
  - The raw official PDF must **never** be used directly or patched with visual runtime white-out masks (which corrupt the text extraction layer and inflate file size).
  - All template fixes are compiled deterministically into `assets/template_cot.pdf` via [`scripts/build_template.py`](scripts/build_template.py):
    - Corrects header typography and aligns footer margins (`*` at `x = 59.52`, `V7.09-2026` ending at `x = 534.00`).
    - Lifts the `Title`, `Given name/s`, and `Surname` lines upward by `+11.15pt` (baseline aligned to `574.20`).
    - Lifts `* Address` and all subsequent sections by an equivalent margin, reclaiming an entire row and expanding Page 1 single-page capacity from 15 to **18 lines**.

---

### ADR-05: Strict Zero-UI-Bloat Front-End SEO & GEO Architecture

* **Status**: Accepted
* **Context & Problem Statement**:
  Electricians operate this tool on job sites under harsh, time-constrained conditions (in ceiling cavities, in front of switchboards, or in utility vehicles). Many web tools clutter their main forms with keyword-stuffed FAQ accordions, explanatory text, and promotional banners to rank on search engines. This severely degrades operational speed, increases cognitive load, and compromises professional utility.
* **Decision**:
  - **Zero UI Bloat**: The primary tool interfaces (`FORM` and `HISTORY` tabs) remain strictly 100% minimalist, fast, and native-feeling. No collapsible SEO text boxes or marketing fluff are permitted in the foreground.
  - **Non-Visual Discovery Channels**: All Search Engine Optimization (SEO) and Generative Engine Optimization (GEO) are channeled exclusively through:
    1. Rich `<head>` metadata with exact-match title: `<title>QLD CoC Generator | Electrical Certificate of Compliance</title>` ($\le 60$ characters).
    2. High-resolution 1200×630 Open Graph & Twitter cards ([`assets/og-preview.png`](assets/og-preview.png)).
    3. Comprehensive Schema.org JSON-LD graph (`WebApplication`, `Organization`, `FAQPage`, `HowTo`).
    4. Machine-readable AI search knowledge bases ([`llms.txt`](llms.txt) and [`llms-full.txt`](llms-full.txt)) adhering to the [llmstxt.org](https://llmstxt.org) standard.
    5. Permissive `robots.txt` configuration for major AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`).

---

### ADR-06: Non-Intrusive Silent Release UX Strategy

* **Status**: Accepted
* **Context & Problem Statement**:
  Electricians open the web app to issue an urgent certificate in seconds. Forcing returning users through modal release popups ("What's New in vX.Y.Z") during minor bug fixes, SEO enhancements, or internal tooling updates creates unnecessary friction and operational frustration.
* **Decision**:
  - The `CURRENT_APP_VERSION` constant in `js/app.js` (which controls the returning user `updateModal`) is bumped **only** when there are major, user-visible functional or UI workflow changes.
  - Minor infrastructure releases, SEO updates, and internal engine refactors must remain completely silent to returning users, updating Service Worker caches in the background without modal interruptions.

---

### ADR-07: Automated Multi-Gate Release Preflight Verifier & Quality Gateway (`release_check.py`)

* **Status**: Accepted
* **Context & Problem Statement**:
  1. Manual releases of client-side web applications are prone to version drift and cache invalidation failures (e.g., updating CSS/JS query strings in `index.html` but forgetting `sw.js` cache names or `sitemap.xml` timestamps), causing end users to load stale assets or break offline synchronization.
  2. Statutory compliance requires absolute zero leakage of forbidden terminology (e.g., "official", "Stat Dec", "Statutory Declaration") across code, metadata, and AI search indexing files.
  3. Public open-source standards demand strict privacy sanitization (zero local filesystem paths, zero personal usernames or private emails) and 100% English code/documentation purity.
  4. Core PDF layout and rendering accuracy (sub-pixel text alignment, 200 DPI rasterization, byte budgets, multi-page threshold) must be mathematically verified in headless execution before staging.
* **Decision (Six-Gate Preflight Pipeline)**:
  - All deployments must pass [`scripts/release_check.py`](scripts/release_check.py) covering six sequential validation gates:
    1. **Gate 1: Branch Hygiene & Clean Tree**: Ensures active work originates from `dev` and audits working tree cleanliness.
    2. **Gate 2: Version Consistency Matrix**: Validates exact version parity across `index.html` asset queries (`?v=X.Y.Z`), profile settings card, `sw.js` cache name (`qld-coc-cache-vX.Y.Z`), `README.md` badge/title, and `sitemap.xml` ISO-8601 timestamps.
    3. **Gate 3: Silent Release vs. Modal Policy**: Enforces ADR-06 so returning user modals are triggered only for major UX evolutions, maintaining silent background updates for minor releases.
    4. **Gate 4: Regulatory Forbidden Terms Audit**: Scans tracked files for forbidden regulatory terminology.
    5. **Gate 5: Open-Source Privacy & English Purity**: Enforces corporate committer identity (`Kai Electrical Tech <hello@kaielectrical.com.au>`), 100% English language purity across all files, and scans against local drive paths, Windows usernames, and personal email addresses.
    6. **Gate 6: Dual-Layer Automated Test Suite**: Executes Playwright and PyMuPDF headless browser verification asserting DOM branding, byte budgets, sub-pixel text alignment, and pagination thresholds.
  - **Physical Git Pre-Push Hook Integration**:
    A pre-push hook (`.git/hooks/pre-push`) enforces this gateway locally, physically aborting unverified `git push` attempts.

---

## 3. Governance & Quality Gateways

All pull requests, branch merges, and releases must pass the automated preflight gateway:
```powershell
uv run python tools/scripts/release_check.py
```

### Preflight Verification Requirements
1. **Branch Hygiene**: Work must originate on `dev` and remain clean before staging.
2. **Version Synchronization**: Strict alignment across `index.html` asset queries (`?v=X.Y.Z`), `sw.js` cache name, and `README.md`.
3. **Forbidden Terminology Audit**: Zero occurrences of forbidden phrases (`official`, `Stat Dec`, `Statutory Declaration`) across all public files.
4. **Dual-Layer Test Suite**: 100% pass across Tests 1–5 in `verify_pdf.py` (DOM branding, byte budget, sub-pixel text alignment, single/multi-page capacity thresholds, and Schema.org discoverability).
5. **Privacy & Sanitization**: Zero local paths or non-corporate identifiers.

