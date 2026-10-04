"""
Script to generate high-resolution 1200x630 Open Graph (OG) social card for QLD CoC Generator.
Uses Playwright to render pixel-perfect HTML/CSS layout and export tools/assets/og-preview.png.
"""

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT / "assets" / "og-preview.png"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: #080c14;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 56px 64px 48px 64px;
    position: relative;
  }

  /* Subtle background radial glows */
  .bg-glow-1 {
    position: absolute;
    top: -120px;
    left: -100px;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0, 221, 102, 0.14) 0%, rgba(0, 221, 102, 0) 70%);
    pointer-events: none;
  }
  .bg-glow-2 {
    position: absolute;
    bottom: -150px;
    right: 100px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0) 70%);
    pointer-events: none;
  }
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 2;
  }
  .brand-group {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-logo-text {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #94a3b8;
    text-transform: uppercase;
  }
  .brand-logo-accent {
    color: #00dd66;
  }
  .badge-reg {
    background: rgba(0, 221, 102, 0.12);
    border: 1px solid rgba(0, 221, 102, 0.35);
    color: #00dd66;
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Main Body Split */
  .main-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 48px;
    z-index: 2;
    margin-top: 12px;
    margin-bottom: 12px;
  }
  .content-col {
    flex: 1.2;
    max-width: 660px;
  }
  .title-main {
    font-size: 56px;
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.025em;
    color: #ffffff;
    margin-bottom: 14px;
  }
  .title-main span {
    color: #00dd66;
  }
  .subtitle {
    font-size: 21px;
    font-weight: 400;
    line-height: 1.45;
    color: #94a3b8;
    margin-bottom: 28px;
  }

  /* Feature Grid / Pills */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .feature-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #e2e8f0;
  }
  .feature-icon {
    color: #00dd66;
    font-size: 16px;
    font-weight: 700;
  }

  /* Certificate Preview Mockup */
  .preview-col {
    flex: 0.85;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
  .cert-card {
    width: 320px;
    height: 410px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 
      0 24px 48px -12px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.15),
      0 0 40px rgba(0, 221, 102, 0.15);
    transform: rotate(2.5deg);
    padding: 20px 22px;
    color: #1e293b;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    border-top: 5px solid #00dd66;
  }
  .cert-header {
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  .cert-org {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #64748b;
    text-transform: uppercase;
  }
  .cert-title {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 3px;
    line-height: 1.3;
  }
  .cert-row {
    margin-bottom: 8px;
  }
  .cert-label {
    font-size: 7.5px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
  }
  .cert-val {
    font-size: 9px;
    font-weight: 600;
    color: #1e293b;
    border-bottom: 1px dotted #cbd5e1;
    padding-bottom: 2px;
    margin-top: 1px;
  }
  .cert-desc-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    font-size: 8px;
    color: #334155;
    line-height: 1.4;
    margin-top: 4px;
    margin-bottom: 8px;
  }
  .cert-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .stamp-box {
    border: 1.5px dashed #00dd66;
    background: rgba(0, 221, 102, 0.08);
    color: #00aa44;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-align: center;
  }
  .device-id-tag {
    font-family: monospace;
    font-size: 7px;
    color: #94a3b8;
  }

  /* Footer bar */
  .footer {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #64748b;
    z-index: 2;
  }
  .footer-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .footer-dot {
    width: 4px;
    height: 4px;
    background: #475569;
    border-radius: 50%;
  }
  .footer-url {
    font-family: monospace;
    font-size: 14px;
    font-weight: 600;
    color: #00dd66;
  }
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="grid-pattern"></div>

  <!-- Top Navigation Header -->
  <div class="header">
    <div class="brand-group">
      <svg viewBox="68 88 1820 658" width="90" height="32" preserveAspectRatio="xMinYMid meet">
        <path fill="#00DD66" fill-rule="evenodd" d="M 739 92 L 739 579 L 1253 579 L 1253 464 L 946 464 L 944 462 L 945 383 L 1194 382 L 1194 275 L 944 274 L 945 203 L 1253 203 L 1253 91 Z M 68 91 L 68 579 L 264 579 L 264 467 L 305 425 L 337 396 L 337 397 L 341 402 L 342 405 L 357 427 L 395 488 L 419 524 L 434 549 L 449 571 L 450 574 L 454 579 L 682 579 L 674 566 L 658 544 L 645 524 L 470 272 L 469 269 L 641 91 L 454 91 L 265 293 L 264 91 Z M 1293 88 L 1293 203 L 1485 204 L 1485 579 L 1693 579 L 1694 203 L 1888 203 L 1888 88 Z"/>
        <path fill="#94A3B8" fill-rule="evenodd" d="M 1803 643 L 1803 745 L 1835 745 L 1843 744 L 1853 741 L 1863 736 L 1867 733 L 1872 728 L 1877 721 L 1880 715 L 1883 705 L 1884 697 L 1884 688 L 1882 675 L 1878 665 L 1873 658 L 1869 654 L 1865 651 L 1857 647 L 1851 645 L 1839 643 Z M 1818 657 L 1840 657 L 1845 658 L 1851 660 L 1855 662 L 1858 665 L 1859 665 L 1861 667 L 1861 668 L 1864 671 L 1867 677 L 1869 687 L 1869 699 L 1868 705 L 1866 711 L 1864 715 L 1861 719 L 1857 723 L 1853 726 L 1849 728 L 1843 730 L 1838 731 L 1817 730 Z M 1723 643 L 1723 657 L 1751 658 L 1751 745 L 1765 745 L 1766 657 L 1793 657 L 1793 643 Z M 1668 643 L 1669 745 L 1721 745 L 1721 731 L 1683 730 L 1683 643 Z M 1476 643 L 1476 657 L 1503 658 L 1504 745 L 1518 745 L 1519 657 L 1546 656 L 1547 650 L 1549 653 L 1555 666 L 1576 707 L 1576 745 L 1590 745 L 1590 707 L 1598 691 L 1612 666 L 1623 643 L 1607 644 L 1598 663 L 1596 665 L 1585 688 L 1582 688 L 1571 666 L 1571 664 L 1561 644 Z M 1452 645 L 1443 643 L 1409 643 L 1410 745 L 1424 744 L 1425 707 L 1443 707 L 1450 705 L 1459 700 L 1465 694 L 1468 689 L 1471 679 L 1471 668 L 1469 661 L 1466 655 L 1461 650 Z M 1425 657 L 1443 657 L 1450 660 L 1454 664 L 1456 669 L 1456 680 L 1454 685 L 1449 690 L 1443 693 L 1437 694 L 1424 693 Z M 1277 643 L 1277 745 L 1291 745 L 1292 700 L 1338 701 L 1338 745 L 1352 745 L 1352 643 L 1338 643 L 1337 686 L 1291 685 L 1291 643 Z M 1123 643 L 1123 745 L 1177 745 L 1177 731 L 1137 730 L 1138 700 L 1172 700 L 1172 687 L 1137 686 L 1138 657 L 1175 657 L 1175 643 Z M 1042 644 L 1043 657 L 1070 658 L 1070 745 L 1084 745 L 1085 657 L 1112 657 L 1112 643 Z M 949 644 L 950 745 L 1002 745 L 1002 731 L 964 730 L 964 643 Z M 889 644 L 889 646 L 887 649 L 886 654 L 882 662 L 875 683 L 859 725 L 855 733 L 854 738 L 852 741 L 852 743 L 851 745 L 867 744 L 869 740 L 875 721 L 877 717 L 915 717 L 924 743 L 926 745 L 941 745 L 940 743 L 940 741 L 938 738 L 937 733 L 912 667 L 908 659 L 903 644 Z M 896 667 L 898 670 L 899 675 L 907 697 L 909 700 L 908 703 L 883 702 L 883 699 L 894 669 Z M 743 643 L 743 745 L 757 745 L 757 643 Z M 664 643 L 664 745 L 678 745 L 679 703 L 690 703 L 693 704 L 699 710 L 701 713 L 708 728 L 716 743 L 718 745 L 734 745 L 733 742 L 731 740 L 726 729 L 714 707 L 712 704 L 709 701 L 709 697 L 715 694 L 720 689 L 723 684 L 725 678 L 725 665 L 724 661 L 720 654 L 716 650 L 713 648 L 707 645 L 699 643 Z M 679 657 L 699 657 L 704 659 L 709 664 L 710 667 L 710 678 L 708 682 L 704 686 L 698 689 L 678 688 Z M 584 643 L 584 657 L 611 658 L 612 745 L 626 745 L 627 657 L 654 656 L 653 643 Z M 439 643 L 439 745 L 493 745 L 493 731 L 453 730 L 454 700 L 488 700 L 488 687 L 455 687 L 453 685 L 454 657 L 491 657 L 491 643 Z M 375 643 L 375 745 L 428 745 L 428 731 L 389 730 L 389 643 Z M 306 643 L 306 745 L 361 744 L 360 731 L 320 730 L 320 702 L 322 700 L 356 700 L 356 687 L 322 687 L 320 685 L 321 657 L 358 657 L 358 643 Z M 235 643 L 235 745 L 249 745 L 249 643 Z M 71 644 L 72 745 L 86 745 L 87 703 L 116 737 L 124 745 L 152 745 L 154 741 L 160 722 L 162 718 L 164 716 L 199 716 L 201 718 L 204 726 L 204 728 L 208 739 L 210 742 L 211 745 L 226 745 L 226 743 L 225 740 L 221 732 L 216 717 L 210 702 L 197 666 L 190 650 L 189 645 L 188 643 L 175 643 L 174 645 L 174 647 L 172 650 L 171 655 L 167 663 L 140 736 L 138 739 L 135 736 L 127 726 L 118 717 L 97 693 L 97 691 L 106 682 L 133 652 L 140 643 L 122 643 L 115 650 L 101 667 L 87 682 L 86 643 Z M 181 667 L 183 669 L 184 674 L 194 699 L 193 703 L 168 702 L 168 700 L 170 697 L 172 689 L 177 678 L 179 670 Z M 1227 642 L 1222 643 L 1212 647 L 1206 651 L 1196 661 L 1194 664 L 1189 674 L 1186 686 L 1186 705 L 1189 717 L 1193 725 L 1200 734 L 1205 738 L 1214 743 L 1224 746 L 1244 746 L 1256 743 L 1260 741 L 1262 739 L 1262 725 L 1259 726 L 1257 728 L 1255 729 L 1246 732 L 1240 733 L 1229 733 L 1219 730 L 1213 726 L 1209 722 L 1206 718 L 1203 712 L 1201 705 L 1200 695 L 1201 685 L 1203 678 L 1207 670 L 1210 666 L 1217 660 L 1223 657 L 1231 655 L 1243 655 L 1248 656 L 1254 658 L 1262 662 L 1261 646 L 1257 644 L 1248 642 Z M 812 642 L 802 645 L 794 649 L 790 652 L 783 659 L 780 663 L 775 673 L 772 683 L 771 690 L 771 702 L 772 708 L 775 718 L 779 726 L 782 730 L 789 737 L 795 741 L 802 744 L 809 746 L 830 746 L 835 745 L 846 741 L 847 725 L 838 730 L 832 732 L 826 733 L 815 733 L 807 731 L 800 727 L 793 720 L 789 713 L 787 707 L 786 702 L 786 688 L 788 679 L 790 674 L 793 669 L 801 661 L 804 659 L 816 655 L 828 655 L 837 657 L 847 662 L 847 646 L 839 643 L 834 642 Z M 543 642 L 535 644 L 522 651 L 513 660 L 509 666 L 504 678 L 502 688 L 502 703 L 503 709 L 505 716 L 512 729 L 520 737 L 526 741 L 530 743 L 540 746 L 561 746 L 566 745 L 577 741 L 578 725 L 569 730 L 557 733 L 546 733 L 538 731 L 532 728 L 523 719 L 519 711 L 517 703 L 517 687 L 518 682 L 520 676 L 524 669 L 532 661 L 535 659 L 542 656 L 547 655 L 559 655 L 568 657 L 578 662 L 578 646 L 570 643 L 565 642 Z"/>
      </svg>
      <div class="brand-logo-text">Kai Electrical Tech</div>
    </div>
    <div class="badge-reg">
      <span>⚡</span> QLD ELECTRICAL SAFETY REGULATION 2026
    </div>
  </div>

  <!-- Main Hero Layout -->
  <div class="main-body">
    <div class="content-col">
      <h1 class="title-main">QLD <span>CoC</span> Generator</h1>
      <p class="subtitle">Certificate of Testing & Compliance (s229 Installation) and Certificate of Testing & Safety (s208 Equipment).</p>

      <div class="features-grid">
        <div class="feature-pill">
          <span class="feature-icon">✓</span>
          <span>100% Free · No Subscription</span>
        </div>
        <div class="feature-pill">
          <span class="feature-icon">✓</span>
          <span>Zero-Cloud Local Privacy</span>
        </div>
        <div class="feature-pill">
          <span class="feature-icon">✓</span>
          <span>Anti-Tamper Baked 200 DPI</span>
        </div>
        <div class="feature-pill">
          <span class="feature-icon">✓</span>
          <span>Searchable OCR · Offline PWA</span>
        </div>
      </div>
    </div>

    <!-- Certificate Mockup Card -->
    <div class="preview-col">
      <div class="cert-card">
        <div>
          <div class="cert-header">
            <div class="cert-org">Queensland Government · ESO Form V7.09-2026</div>
            <div class="cert-title">Certificate of Testing and Compliance</div>
          </div>
          <div class="cert-row">
            <div class="cert-label">Work Performed For</div>
            <div class="cert-val">John Smith · 10 Sample St, Brisbane QLD</div>
          </div>
          <div class="cert-row">
            <div class="cert-label">Work Description</div>
            <div class="cert-desc-box">
              Switchboard upgrade. Installed main switch 63A, RCBOs fitted to all sub-circuits, tested to AS/NZS 3000:2018. Earth continuity &lt; 0.5Ω, insulation resistance &gt; 50MΩ.
            </div>
          </div>
        </div>
        <div class="cert-footer">
          <div>
            <div class="stamp-box">COMPLIANT (s229)</div>
            <div class="device-id-tag" style="margin-top:4px;">Device ID: DEV-8F29</div>
          </div>
          <div style="text-align:right;">
            <div class="cert-label">Licence / Signature</div>
            <div style="font-family:cursive; font-size:13px; color:#0f172a; margin-top:2px;">K. Taylor</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Info Bar -->
  <div class="footer">
    <div class="footer-left">
      <span>Standard: ESO Form V7.09-2026</span>
      <span class="footer-dot"></span>
      <span>Queensland ESR 2026 s229/s208</span>
      <span class="footer-dot"></span>
      <span>Mandatory 5-Year Retention</span>
    </div>
    <div class="footer-url">tools.kaielectrical.com.au</div>
  </div>
</body>
</html>
"""

def generate():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        page.set_content(HTML_TEMPLATE)
        # Wait a moment for layout stabilization
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUTPUT_FILE), type="png")
        browser.close()
    
    print(f"[OK] OG image generated: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size} bytes)")

if __name__ == "__main__":
    generate()
