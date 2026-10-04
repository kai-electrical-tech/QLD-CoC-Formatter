#!/usr/bin/env python3
"""
tools/scripts/build_template.py

Standardized template stream patcher for KET CoC Generator (template_cot.pdf).
Applies modular vector stream transformations to fix official ESO template defects.

Modular Architecture:
1. Structural Grid & Alignment Patches (Version-Independent):
   - Page 1 Customer Name Underlines & Address Shift (+11.1518pt upward)
     Aligns customer title/name underlines directly with "* Name" baseline (y=574.20)
     and unlocks 18 lines of work description capacity on Page 1.
   - Page 1 Footer Alignment:
     Aligns "*" left margin to x=59.52 and right margin of version stamp to x=534.00.
2. Version-Specific Text & Typo Patches (V7.09-2026 Specific):
   - Upper-right typo patch ('equipmen' -> 'equipment')
   - Bracket subtitle centering

Usage:
  python tools/scripts/build_template.py [--source path/to/raw_template.pdf] [--output path/to/template_cot.pdf]
"""

import sys
import os
import argparse
import pymupdf


def apply_structural_grid_patches(doc):
    """
    Applies long-standing structural grid alignment patches.
    These defects have persisted across ESO template generations (pre-2026 and 2026):
    - Name underlines floating on a row below '* Name'
    - Footer margins not aligned with the standard 59.52 - 534.00 content bounds
    """
    print("[*] Applying Modular Patch 1: Structural Grid & Row Alignment (+11.1518pt)...")
    delta = 11.1518

    # 1.1 xref 109: Title/Given/Surname labels, * Address, Street label
    stream109 = doc.xref_stream(109).decode('latin1')
    old_title_tm = "6.96 121.8 549.84 Tm"
    new_title_tm = f"6.96 121.8 {549.84 + delta:.4f} Tm"
    if old_title_tm in stream109:
        stream109 = stream109.replace(old_title_tm, new_title_tm)
        stream109 = stream109.replace("12 65.04 530.4 Tm", f"12 65.04 {530.4 + delta:.4f} Tm")
        stream109 = stream109.replace("9.96 72.48 530.4 Tm", f"9.96 72.48 {530.4 + delta:.4f} Tm")
        stream109 = stream109.replace("6.96 111.24 530.16 Tm", f"6.96 111.24 {530.16 + delta:.4f} Tm")
        stream109 = stream109.replace("156.24 558.12 Tm", f"156.24 {558.12 + delta:.4f} Tm")
        stream109 = stream109.replace("111.24 539.04 Tm", f"111.24 {539.04 + delta:.4f} Tm")
        doc.update_stream(109, stream109.encode('latin1'))
        print("    [+] xref 109: Name labels, Address header, and Street label shifted up.")
    else:
        print("    [!] xref 109: Title label already shifted or not found.")

    # 1.2 xref 110: Suburb/Postcode labels & Test details header
    stream110 = doc.xref_stream(110).decode('latin1')
    old_suburb_tm = "6.96 121.8 490.92 Tm"
    new_suburb_tm = f"6.96 121.8 {490.92 + delta:.4f} Tm"
    if old_suburb_tm in stream110:
        stream110 = stream110.replace(old_suburb_tm, new_suburb_tm)
        stream110 = stream110.replace("393.24 498.12 Tm", f"393.24 {498.12 + delta:.4f} Tm")
        stream110 = stream110.replace("12 59.52 466.92 Tm", f"12 59.52 {466.92 + delta:.4f} Tm")
        stream110 = stream110.replace("11.04 67.56 466.92 Tm", f"11.04 67.56 {466.92 + delta:.4f} Tm")
        stream110 = stream110.replace("42 500.76 Tm", f"42 {500.76 + delta:.4f} Tm")
        stream110 = stream110.replace("42 480.24 Tm", f"42 {480.24 + delta:.4f} Tm")
        stream110 = stream110.replace("42 452.4 Tm", f"42 {452.4 + delta:.4f} Tm")
        doc.update_stream(110, stream110.encode('latin1'))
        print("    [+] xref 110: Suburb/Postcode and Test details header shifted up.")
    else:
        print("    [!] xref 110: Suburb label already shifted or not found.")

    # 1.3 xref 114: Underlines for Title, Given name/s, Surname, Street, Suburb, Postcode
    stream114 = doc.xref_stream(114).decode('latin1')
    old_l1 = "116.25 559.1274 cm"
    new_l1 = f"116.25 {559.1274 + delta:.4f} cm"
    if old_l1 in stream114:
        stream114 = stream114.replace(old_l1, new_l1)
        stream114 = stream114.replace("167.0498 559.1274 cm", f"167.0498 {559.1274 + delta:.4f} cm")
        stream114 = stream114.replace("325.3999 559.1274 cm", f"325.3999 {559.1274 + delta:.4f} cm")
        stream114 = stream114.replace("116.0501 526.4792 cm", f"116.0501 {526.4792 + delta:.4f} cm")
        stream114 = stream114.replace("116.25 499.0073 cm", f"116.25 {499.0073 + delta:.4f} cm")
        stream114 = stream114.replace("404.2998 499.0073 cm", f"404.2998 {499.0073 + delta:.4f} cm")
        doc.update_stream(114, stream114.encode('latin1'))
        print("    [+] xref 114: Name and Address horizontal underlines shifted up.")
    else:
        print("    [!] xref 114: Horizontal underlines already shifted or not found.")

    # 1.4 xref 113 & 114: Page 1 Footer Alignment (* at 59.52, V7.09-2026 ending at 534.00)
    print("[*] Applying Modular Patch 2: Footer Margin Alignment (59.52 - 534.00)...")
    stream113 = doc.xref_stream(113).decode('latin1')
    if "12 53.52 36.12 Tm" in stream113:
        stream113 = stream113.replace("12 53.52 36.12 Tm", "12 59.52 36.12 Tm")
        stream113 = stream113.replace("9 61.56 36.12 Tm", "9 67.56 36.12 Tm")
        doc.update_stream(113, stream113.encode('latin1'))
        print("    [+] xref 113: Footer '*' left margin aligned to 59.52.")

    stream114 = doc.xref_stream(114).decode('latin1')
    if "6.96 504.96 36.12 Tm" in stream114:
        stream114 = stream114.replace("6.96 504.96 36.12 Tm", "6.96 497.84 36.12 Tm")
        doc.update_stream(114, stream114.encode('latin1'))
        print("    [+] xref 114: Footer 'V7.09-2026' right margin aligned to 534.00.")


def apply_version_specific_patches(doc):
    """
    Applies version-specific text typo and layout patches for Form V7.09-2026.
    Note: These are specific to this release of the ESO form and may differ in future forms.
    """
    print("[*] Applying Modular Patch 3: Version-Specific Typo Patches (V7.09-2026)...")
    # xref 108: Top right typo (equipmen -> equipment)
    stream108 = doc.xref_stream(108).decode('latin1')
    if "equipmen" in stream108 and "equipment" not in stream108:
        stream108 = stream108.replace("equipmen", "equipment")
        doc.update_stream(108, stream108.encode('latin1'))
        print("    [+] xref 108: Corrected typo 'equipmen' -> 'equipment'.")
    else:
        print("    [!] xref 108: Typo already patched or not present.")


def main():
    parser = argparse.ArgumentParser(description="Build and patch KET CoC Generator PDF template.")
    parser.add_argument("--source", default="tools/assets/template_cot.pdf", help="Source PDF to patch")
    parser.add_argument("--output", default="tools/assets/template_cot.pdf", help="Destination PDF path")
    args = parser.parse_args()

    if not os.path.exists(args.source):
        print(f"[!] Source file not found: {args.source}")
        sys.exit(1)

    doc = pymupdf.open(args.source)
    apply_structural_grid_patches(doc)
    apply_version_specific_patches(doc)

    temp_out = args.output + ".tmp.pdf"
    doc.save(temp_out, deflate=True)
    doc.close()

    if os.path.exists(args.output):
        os.remove(args.output)
    os.rename(temp_out, args.output)
    print(f"\n[SUCCESS] Template patched successfully and written to {args.output}!")


if __name__ == "__main__":
    main()
