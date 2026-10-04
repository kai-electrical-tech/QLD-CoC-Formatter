// Queensland ESO CoC / CoT A4 200 DPI Baked PDF Generator (Official V7.09-2026)
// Features Vector Overlay + Neutral Device ID + Dynamic Annexure A + 200 DPI Anti-Tamper Image Baking + In-Place Searchable Text Overlay
(function(window) {
  'use strict';

  // Configure PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/lib/pdf.worker.min.js';
  }

  function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function fetchArrayBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load asset: ${url} (Status: ${response.status})`);
    }
    return await response.arrayBuffer();
  }

  // Draw crisp vector checkmark
  function drawCheckmark(page, x, y, size = 10, strokeColor = { r: 0.05, g: 0.2, b: 0.45 }) {
    page.drawLine({
      start: { x: x + 1, y: y + 4 },
      end: { x: x + 4, y: y + 1 },
      thickness: 1.8,
      color: strokeColor
    });
    page.drawLine({
      start: { x: x + 4, y: y + 1 },
      end: { x: x + 9, y: y + 9 },
      thickness: 1.8,
      color: strokeColor
    });
  }

  // Wrap text into lines fitting maxWidth
  function wrapText(text, font, fontSize, maxWidth) {
    if (!text) return [];
    const paragraphs = text.split(/\r?\n/);
    const lines = [];

    for (const para of paragraphs) {
      if (para.trim() === '') {
        lines.push('');
        continue;
      }
      const words = para.split(/\s+/);
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    return lines;
  }

  // Normalize website URL (prepend https:// if missing)
  function normalizeUrl(url) {
    if (!url) return '';
    let trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  // Sanitize strings to avoid pdf-lib WinAnsi standard font encoding crashes
  // Pre-normalizes electrical engineering units, iOS smart typography, and symbols
  function safeWinAnsi(str) {
    if (!str) return '';
    return String(str)
      // 1. Electrical engineering units & symbols (prevents 0.15 Ohm turning into blank 0.15)
      .replace(/[\u03A9\u2126]/g, ' Ohm')
      .replace(/\u00B5/g, 'u')
      // 2. iOS & macOS smart typography & quotes
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      // 3. Dashes & list bullets
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2022\u2023\u25E6]/g, '- ')
      // 4. Mathematical & comparison operators
      .replace(/\u2265/g, '>=')
      .replace(/\u2264/g, '<=')
      .replace(/\u00D7/g, 'x')
      // 5. Final WinAnsi fallback
      .replace(/[^\x00-\xFF]/g, ' ');
  }

  const CotPdfGenerator = {
    cachedTemplate: null,

    async preloadAssets() {
      try {
        if (!this.cachedTemplate) {
          this.cachedTemplate = await fetchArrayBuffer('assets/template_cot.pdf');
        }
      } catch (err) {
        console.warn('Preloading PDF template failed (will retry on generation):', err);
      }
    },

    /**
     * Generate QLD Certificate of Testing & Compliance PDF (Official V7.09-2026 standard)
     * Baked at 200 DPI for complete anti-tamper security and fast mobile sharing (~230KB/page)
     * @param {Object} data 
     * @returns {Promise<{blob: Blob, url: string, filename: string, totalPages: number}>}
     */
    async generatePdf(data) {
      if (!window.PDFLib) {
        throw new Error('PDFLib library is not loaded');
      }
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library is not loaded');
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/lib/pdf.worker.min.js';

      // Sanitize all text fields for WinAnsi standard font compatibility
      data = {
        ...data,
        customerTitle: safeWinAnsi(data.customerTitle),
        customerGivenName: safeWinAnsi(data.customerGivenName),
        customerSurname: safeWinAnsi(data.customerSurname),
        fullAddress: safeWinAnsi(data.fullAddress),
        customerStreet: safeWinAnsi(data.customerStreet),
        customerSuburb: safeWinAnsi(data.customerSuburb),
        customerPostcode: safeWinAnsi(data.customerPostcode),
        jobReference: safeWinAnsi(data.jobReference),
        workDescription: safeWinAnsi(data.workDescription),
        contractorLic: safeWinAnsi(data.contractorLic),
        contractorName: safeWinAnsi(data.contractorName),
        contractorPhone: safeWinAnsi(data.contractorPhone),
        contractorWebsite: safeWinAnsi(data.contractorWebsite),
        testerName: safeWinAnsi(data.testerName),
        testerLicence: safeWinAnsi(data.testerLicence),
        deviceToken: safeWinAnsi(data.deviceToken)
      };

      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

      // 1. Ensure template loaded
      if (!this.cachedTemplate) {
        this.cachedTemplate = await fetchArrayBuffer('assets/template_cot.pdf');
      }

      // 2. Clone template & embed standard fonts
      const pdfDoc = await PDFDocument.load(this.cachedTemplate);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const firstPage = pdfDoc.getPages()[0];
      const navyColor = rgb(0.05, 0.2, 0.45);
      const blackColor = rgb(0.1, 0.1, 0.1);
      const grayColor = rgb(0.45, 0.45, 0.45);
      const lightBorderColor = rgb(0.8, 0.85, 0.9);

      // ----------------------------------------------------
      // 3. Contractor Branding Header (Page 1 & Annexure)
      // ----------------------------------------------------
      // Branding Area Box: aligned with content below
      // Left boundary: x = 59.5 (aligns with 'CERTIFICATE OF:')
      // Right boundary: x = 536.0 (aligns with ')' and form underlines)
      // Width = 476.5, Height = 71.0, y = 705.0
      const boxX = 59.5;
      const boxY = 705.0;
      const boxWidth = 476.5;
      const boxHeight = 71.0;
      const normWebsiteUrl = normalizeUrl(data.contractorWebsite);

      let customLogoImage = null;
      if (data.contractorLogoDataUrl) {
        try {
          const logoBytes = dataUrlToUint8Array(data.contractorLogoDataUrl);
          // Check if PNG or JPEG
          if (data.contractorLogoDataUrl.startsWith('data:image/png')) {
            customLogoImage = await pdfDoc.embedPng(logoBytes);
          } else {
            customLogoImage = await pdfDoc.embedJpg(logoBytes);
          }
        } catch (imgErr) {
          console.warn('Failed to embed custom logo, falling back to text:', imgErr);
          customLogoImage = null;
        }
      }

      const drawHeaderBranding = (targetPage, isPage2 = false) => {
        const topY = boxY;
        if (customLogoImage) {
          // Fit inside box maintaining aspect ratio.
          // IMPORTANT: If logo is smaller than display area (scale >= 1.0), do NOT upscale (use 1.0) to prevent blurriness!
          // Always center horizontally & vertically.
          const origW = customLogoImage.width;
          const origH = customLogoImage.height;
          const scale = Math.min(boxWidth / origW, boxHeight / origH, 1.0);
          const drawW = origW * scale;
          const drawH = origH * scale;
          const drawX = boxX + (boxWidth - drawW) / 2; // Center horizontally
          const drawY = topY + (boxHeight - drawH) / 2; // Center vertically

          targetPage.drawImage(customLogoImage, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH
          });
        } else if (data.contractorName && data.contractorName.trim()) {
          // Typographic letterhead branding without logo: large bold contractor name, centered horizontally & vertically
          const contractorName = data.contractorName.trim();
          let fontSize = 18.0;
          let textWidth = helveticaBold.widthOfTextAtSize(contractorName, fontSize);
          if (textWidth > boxWidth) {
            fontSize = Math.max(12.0, fontSize * (boxWidth / textWidth));
            textWidth = helveticaBold.widthOfTextAtSize(contractorName, fontSize);
          }
          const drawX = boxX + (boxWidth - textWidth) / 2; // Horizontally centered
          const drawY = topY + (boxHeight - fontSize) / 2; // Vertically centered
          targetPage.drawText(contractorName, {
            x: drawX,
            y: drawY,
            size: fontSize,
            font: helveticaBold,
            color: blackColor
          });
        }
      };

      drawHeaderBranding(firstPage, false);

      // ----------------------------------------------------
      // 4. Certificate Type Checkbox (s229 vs s208)
      // ----------------------------------------------------
      if (data.certType === 'equipment') {
        drawCheckmark(firstPage, 227.5, 638, 10, blackColor);
      } else {
        drawCheckmark(firstPage, 227.5, 674, 10, blackColor);
      }

      // Top-right centered bracket subtitles: Electrical Installations & Electrical Equipment
      // Center coordinate 505.00 provides optical balance inside the curved parentheses
      const centerBracketX = 505.00;
      firstPage.drawText('Electrical', {
        x: centerBracketX - helveticaBold.widthOfTextAtSize('Electrical', 8.04) / 2,
        y: 678.84,
        size: 8.04,
        font: helveticaBold,
        color: blackColor
      });
      firstPage.drawText('Installations', {
        x: centerBracketX - helveticaBold.widthOfTextAtSize('Installations', 8.04) / 2,
        y: 669.60,
        size: 8.04,
        font: helveticaBold,
        color: blackColor
      });

      firstPage.drawText('Electrical', {
        x: centerBracketX - helveticaBold.widthOfTextAtSize('Electrical', 8.04) / 2,
        y: 642.84,
        size: 8.04,
        font: helveticaBold,
        color: blackColor
      });
      firstPage.drawText('Equipment', {
        x: centerBracketX - helveticaBold.widthOfTextAtSize('Equipment', 8.04) / 2,
        y: 633.96,
        size: 8.04,
        font: helveticaBold,
        color: blackColor
      });

      // ----------------------------------------------------
      // 5. Customer Details (Flush left with underlying labels)
      // ----------------------------------------------------
      const customerTitle = (data.customerTitle || '').trim();
      const customerGivenName = (data.customerGivenName || '').trim();
      const customerSurname = (data.customerSurname || '').trim();

      if (customerTitle) {
        firstPage.drawText(customerTitle, { x: 121.80, y: 574.20, size: 9.5, font: helvetica, color: blackColor });
      }
      if (customerGivenName) {
        firstPage.drawText(customerGivenName, { x: 172.68, y: 574.20, size: 9.5, font: helvetica, color: blackColor });
      }
      if (customerSurname) {
        firstPage.drawText(customerSurname, { x: 330.49, y: 574.20, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 6. Address Details (Flush left with underlying labels)
      // ----------------------------------------------------
      let street = (data.customerStreet || '').trim();
      let suburb = (data.customerSuburb || '').trim();
      let postcode = (data.customerPostcode || '').trim();

      if ((!street || !suburb) && data.fullAddress && window.SuburbService) {
        const parsed = window.SuburbService.parseAddress(data.fullAddress);
        if (!street) street = parsed.street;
        if (!suburb) suburb = parsed.suburb;
        if (!postcode) postcode = parsed.postcode;
      }

      if (street) {
        firstPage.drawText(street, { x: 121.80, y: 541.65, size: 9.5, font: helvetica, color: blackColor });
      }
      if (suburb) {
        firstPage.drawText(suburb, { x: 121.80, y: 514.15, size: 9.5, font: helvetica, color: blackColor });
      }
      if (postcode) {
        firstPage.drawText(postcode, { x: 409.44, y: 514.15, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 7. Dates (Baselines aligned with labels; unified DD / MM / YYYY format)
      // ----------------------------------------------------
      const testDate = data.testDate ? new Date(data.testDate + 'T00:00:00') : new Date();
      const tDay = String(testDate.getDate()).padStart(2, '0');
      const tMonth = String(testDate.getMonth() + 1).padStart(2, '0');
      const tYear = String(testDate.getFullYear());
      const testDateStr = `${tDay} / ${tMonth} / ${tYear}`;
      firstPage.drawText(testDateStr, { x: 138.0, y: 252.24, size: 9.5, font: helvetica, color: blackColor });

      const noticeDate = data.noticeDate ? new Date(data.noticeDate + 'T00:00:00') : testDate;
      const nDay = String(noticeDate.getDate()).padStart(2, '0');
      const nMonth = String(noticeDate.getMonth() + 1).padStart(2, '0');
      const nYear = String(noticeDate.getFullYear());
      const noticeDateStr = `${nDay} / ${nMonth} / ${nYear}`;
      firstPage.drawText(noticeDateStr, { x: 171.0, y: 80.88, size: 9.5, font: helvetica, color: blackColor });

      // ----------------------------------------------------
      // 8. Contractor Details (Baselines aligned with labels)
      // ----------------------------------------------------
      const contractorLic = (data.contractorLic || '').trim();
      const contractorName = (data.contractorName || '').trim();
      const contractorPhone = (data.contractorPhone || '').trim();

      if (contractorLic) {
        firstPage.drawText(contractorLic, { x: 462, y: 252.24, size: 9.5, font: helvetica, color: blackColor });
      }
      if (contractorName) {
        firstPage.drawText(contractorName, { x: 222, y: 229.56, size: 9.5, font: helvetica, color: blackColor });
      }
      if (contractorPhone) {
        firstPage.drawText(contractorPhone, { x: 256, y: 206.64, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 9. Tester Name & Licence (Right-aligned to 530.0 at baseline 80.88)
      // ----------------------------------------------------
      const tName = (data.testerName || '').trim();
      const tLic = (data.testerLicence || '').trim();
      let testerDisplayStr = '';

      if (tName && tLic) {
        testerDisplayStr = `${tName} - ${tLic}`;
      } else if (tName && !tLic) {
        testerDisplayStr = tName;
      } else if (!tName && tLic) {
        testerDisplayStr = `Tester licence: ${tLic}`;
      } else {
        testerDisplayStr = '';
      }

      if (testerDisplayStr) {
        const tWidth = helvetica.widthOfTextAtSize(testerDisplayStr, 9.5);
        firstPage.drawText(testerDisplayStr, { x: 530.0 - tWidth, y: 80.88, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 10. Digital Signature
      // ----------------------------------------------------
      let sigBytes = null;
      let sigImage = null;
      if (data.signatureDataUrl) {
        try {
          sigBytes = dataUrlToUint8Array(data.signatureDataUrl);
          sigImage = await pdfDoc.embedPng(sigBytes);
          firstPage.drawImage(sigImage, {
            x: 415,
            y: 44,
            width: 115,
            height: 30
          });
        } catch (sigErr) {
          console.error('Failed to embed signature PNG:', sigErr);
        }
      }

      // ----------------------------------------------------
      // 11. Work Description & Annexure A Overflow Logic
      // ----------------------------------------------------
      const descText = (data.workDescription || '').trim();
      const descBoxWidth = 466;
      let descFontSize = 9.0;
      let descLineHeight = 12.0;

      let wrappedLines = wrapText(descText, helvetica, descFontSize, descBoxWidth);
      let needsAnnexureA = false;
      let page1Lines = [];
      let annexureLines = [];

      if (wrappedLines.length <= 15) {
        page1Lines = wrappedLines;
      } else if (wrappedLines.length <= 18) {
        descFontSize = 8.0;
        descLineHeight = 10.5;
        page1Lines = wrapText(descText, helvetica, descFontSize, descBoxWidth);
      } else {
        needsAnnexureA = true;
        descFontSize = 9.0;
        descLineHeight = 12.0;
        wrappedLines = wrapText(descText, helvetica, descFontSize, descBoxWidth);
        page1Lines = wrappedLines.slice(0, 13);
        annexureLines = wrappedLines.slice(13);
      }

      // Render Page 1 description
      let currentY = 464.0;
      for (const line of page1Lines) {
        firstPage.drawText(line, {
          x: 68,
          y: currentY,
          size: descFontSize,
          font: helvetica,
          color: blackColor
        });
        currentY -= descLineHeight;
      }

      if (needsAnnexureA) {
        const contText = '--- Continued on Page 2 ---';
        const contW = helveticaOblique.widthOfTextAtSize(contText, 8.5);
        firstPage.drawText(contText, {
          x: 59.52 + (474.48 - contW) / 2,
          y: currentY - 4,
          size: 8.5,
          font: helveticaOblique,
          color: blackColor
        });
      }

      // ----------------------------------------------------
      // 12. Dynamic Multi-Page Annexure Engine
      // ----------------------------------------------------
      const annexurePagesData = [];
      if (needsAnnexureA) {
        let remaining = annexureLines.slice();
        // With top banner removed, description starts at y: 676.
        // Intermediate pages hold up to 41 lines (+ 'Continued on Page X' at y: 148).
        // Final page holds up to 42 lines (+ statutory details divider at y: 138).
        const MAX_ANNEXURE_PAGES = 250;
        while (remaining.length > 0 && annexurePagesData.length < MAX_ANNEXURE_PAGES) {
          if (remaining.length <= 42 || annexurePagesData.length === MAX_ANNEXURE_PAGES - 1) {
            annexurePagesData.push({ lines: remaining, isFinal: true });
            remaining = [];
          } else if (remaining.length <= 41 + 10) {
            // Balance final two pages so the last page doesn't receive just 1-5 lines
            const take = Math.ceil(remaining.length / 2);
            annexurePagesData.push({ lines: remaining.slice(0, take), isFinal: false });
            remaining = remaining.slice(take);
          } else {
            annexurePagesData.push({ lines: remaining.slice(0, 41), isFinal: false });
            remaining = remaining.slice(41);
          }
        }
      }

      const totalPages = 1 + annexurePagesData.length;
      const createdAnnexurePages = [];

      for (let idx = 0; idx < annexurePagesData.length; idx++) {
        const pageInfo = annexurePagesData[idx];
        const pageNum = idx + 2; // Annexure starts at Page 2
        // Standard A4: 595.56 x 842.04
        const aPage = pdfDoc.addPage([595.56, 842.04]);
        createdAnnexurePages.push(aPage);

        // 12.1 Outer fine border matching Page 1 (24, 24 to 571.56, 818.04, linewidth 0.48)
        aPage.drawRectangle({
          x: 24.0,
          y: 24.0,
          width: 547.56,
          height: 794.04,
          borderWidth: 0.48,
          borderColor: rgb(0.2, 0.2, 0.2),
          color: undefined // transparent fill
        });

        // 12.2 Top Header Branding matching Page 1
        drawHeaderBranding(aPage, true);

        // 12.3 Dividing horizontal rule matching Page 1 Title Block bounds (59.52 to 534.00, thickness 0.48)
        aPage.drawLine({
          start: { x: 59.52, y: 698.22 },
          end: { x: 534.00, y: 698.22 },
          thickness: 0.48,
          color: rgb(0.2, 0.2, 0.2)
        });

        // 12.4 Description lines for this page start immediately below top dividing line (x: 59.52, y: 676)
        let aY = 676;
        for (const aLine of pageInfo.lines) {
          aPage.drawText(aLine, {
            x: 59.52,
            y: aY,
            size: 9.0,
            font: helvetica,
            color: blackColor
          });
          aY -= 12.5;
        }

        // 12.5 Intermediate continuation notice positioned right above bottom divider
        if (!pageInfo.isFinal) {
          const contNext = `--- Continued on Page ${pageNum + 1} ---`;
          const contW = helveticaOblique.widthOfTextAtSize(contNext, 8.5);
          aPage.drawText(contNext, {
            x: 59.52 + (474.48 - contW) / 2,
            y: 148,
            size: 8.5,
            font: helveticaOblique,
            color: blackColor
          });
        }

        // 12.6 Bottom Details & Sign-off Section: Drawn on EVERY page from Page 2 onwards!
        const dividerY = 138;
        aPage.drawLine({
          start: { x: 59.52, y: dividerY },
          end: { x: 534.00, y: dividerY },
          thickness: 0.48,
          color: rgb(0.2, 0.2, 0.2)
        });

        const custFullName = [customerTitle, customerGivenName, customerSurname].filter(Boolean).join(' ') || 'Customer';
        const fullAddrStr = [street, suburb, postcode ? `QLD ${postcode}` : 'QLD'].filter(Boolean).join(', ');

        // Left Side: Customer, Address, Lic, Dates (flush left at x: 59.52)
        aPage.drawText(`Customer: ${custFullName}`, { x: 59.52, y: dividerY - 14, size: 8.5, font: helveticaBold, color: blackColor });
        aPage.drawText(`Address: ${fullAddrStr}`, { x: 59.52, y: dividerY - 27, size: 8.5, font: helvetica, color: blackColor });
        aPage.drawText(`Contractor Lic: ${contractorLic || 'N/A'}`, { x: 59.52, y: dividerY - 40, size: 8.5, font: helvetica, color: blackColor });
        aPage.drawText(`Date of test: ${tDay} / ${tMonth} / ${tYear}`, { x: 59.52, y: dividerY - 53, size: 8.5, font: helvetica, color: blackColor });
        aPage.drawText(`Date notice given: ${nDay} / ${nMonth} / ${nYear}`, { x: 59.52, y: dividerY - 66, size: 8.5, font: helvetica, color: blackColor });

        // Right Side: Tester and Signature (flush right to 534.00)
        if (testerDisplayStr) {
          const tAWidth = helvetica.widthOfTextAtSize(testerDisplayStr, 8.5);
          aPage.drawText(testerDisplayStr, { x: 534.00 - tAWidth, y: dividerY - 40, size: 8.5, font: helvetica, color: blackColor });
        }
        if (sigImage) {
          aPage.drawImage(sigImage, {
            x: 534.00 - 115,
            y: dividerY - 76,
            width: 115,
            height: 32
          });
        }

        // 12.7 Footer stamps on this Annexure page

        // Page X/N in center
        aPage.drawText(`Page ${pageNum}/${totalPages}`, {
          x: 275,
          y: 36.1,
          size: 8.5,
          font: helvetica,
          color: grayColor
        });
        // Note: V7.09-2026 is intentionally omitted from Page 2 onwards for a clean layout
      }

      // ----------------------------------------------------
      // 13. Page 1 Footer Stamps & Neutral Device ID
      // ----------------------------------------------------
      const page1Label = `Page 1/${totalPages}`;
      firstPage.drawText(page1Label, {
        x: 275,
        y: 36.1,
        size: 8.5,
        font: helvetica,
        color: grayColor
      });

      // Neutral Device ID & Job Reference (left footer on all pages: x = 59.52)
      const refStr = (data.jobReference || '').trim();
      const deviceToken = data.deviceToken || localStorage.getItem('qld_device_token') || 'DEV-OFFLINE';
      const footerLeftText = refStr ? `Ref: ${refStr}   Device ID: ${deviceToken}` : `Device ID: ${deviceToken}`;
      firstPage.drawText(footerLeftText, {
        x: 59.52,
        y: 13,
        size: 6.0,
        font: helvetica,
        color: grayColor
      });

      for (const aPage of createdAnnexurePages) {
        aPage.drawText(footerLeftText, {
          x: 59.52,
          y: 13,
          size: 6.0,
          font: helvetica,
          color: grayColor
        });
      }

      // Bottom Right Website URL (Page 1 and all Annexure pages: x = 534.00 - websiteWidth)
      if (data.contractorWebsite) {
        const cleanUrl = data.contractorWebsite.trim().replace(/^https?:\/\//i, '');
        const websiteText = `Website: ${cleanUrl}`;
        const websiteWidth = helvetica.widthOfTextAtSize(websiteText, 6.0);
        firstPage.drawText(websiteText, {
          x: 534.00 - websiteWidth,
          y: 13,
          size: 6.0,
          font: helvetica,
          color: grayColor
        });
        for (const aPage of createdAnnexurePages) {
          aPage.drawText(websiteText, {
            x: 534.00 - websiteWidth,
            y: 13,
            size: 6.0,
            font: helvetica,
            color: grayColor
          });
        }
      }


      // ----------------------------------------------------
      // 14. Save Vector PDF
      // ----------------------------------------------------
      const rawVectorBytes = await pdfDoc.save();

      // ----------------------------------------------------
      // 15. 200 DPI ANTI-TAMPER RASTERIZATION & IN-PLACE SEARCHABLE TEXT
      // ----------------------------------------------------
      const loadingTask = window.pdfjsLib.getDocument({ data: rawVectorBytes });
      const renderedPdf = await loadingTask.promise;
      const totalRenderedPages = renderedPdf.numPages;

      // 200 DPI scale: 200 / 72 = 2.77778 (optimal balance of sharpness and ~230KB/page size)
      const scale = 2.77778;
      const bakedDoc = await PDFDocument.create();
      const bakedFont = await bakedDoc.embedFont(StandardFonts.Helvetica);

      // Determine certificate type & dynamic filename
      const certTypeName = data.certType === 'equipment'
        ? 'Certificate of Testing and Safety'
        : 'Certificate of Testing and Compliance';

      const dateStr = `${tYear}${tMonth}${tDay}`;
      const cleanStreet = (street || 'Job')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const filename = `CoC_${dateStr}_${cleanStreet}.pdf`;

      // Set ISO 32000-1 Document Metadata
      const authorParts = [contractorName, contractorLic ? `(Lic: ${contractorLic})` : ''].filter(Boolean);
      if (authorParts.length > 0) {
        bakedDoc.setAuthor(authorParts.join(' '));
      }
      bakedDoc.setTitle(filename);

      const toolAttribution = 'KET CoC Generator (https://tools.kaielectrical.com.au)';
      bakedDoc.setCreator(toolAttribution);
      bakedDoc.setProducer(toolAttribution);
      bakedDoc.setSubject(certTypeName);

      // Prepare metadata summary for system-wide indexing fallback (Spotlight / Windows Search)
      const customerFullName = [customerTitle, customerGivenName, customerSurname].filter(Boolean).join(' ');

      for (let pNum = 1; pNum <= totalRenderedPages; pNum++) {
        const page = await renderedPdf.getPage(pNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const bakedImgData = canvas.toDataURL('image/jpeg', 0.70);

        const imgBytes = dataUrlToUint8Array(bakedImgData);
        const embeddedImg = await bakedDoc.embedJpg(imgBytes);

        // Standard A4: 595.28 x 841.89
        const finalPage = bakedDoc.addPage([595.28, 841.89]);
        finalPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: 595.28,
          height: 841.89
        });

        // In-Place Searchable & Selectable Text Overlay (opacity: 0)
        // Extracts all visual text items and coordinates directly from the vector page,
        // placing invisible text at the exact visual positions so users can highlight, copy,
        // and search (Ctrl+F) directly over the visible rendered text.
        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if (!item.str || !item.str.trim()) continue;
          const sanitized = safeWinAnsi(item.str);
          if (!sanitized.trim()) continue;

          // item.transform: [scaleX, skewY, skewX, scaleY, tx, ty]
          const tx = item.transform[4];
          const ty = item.transform[5];
          const fontSize = Math.hypot(item.transform[0], item.transform[1]) || 8;

          finalPage.drawText(sanitized, {
            x: tx,
            y: ty,
            size: fontSize,
            font: bakedFont,
            color: rgb(0, 0, 0),
            opacity: 0
          });
        }

        // Secondary metadata line on Page 1 footer margin for full-text search engines
        if (pNum === 1) {
          const indexSummary = safeWinAnsi([
            certTypeName,
            customerFullName ? `Customer: ${customerFullName}` : '',
            data.fullAddress ? `Address: ${data.fullAddress}` : '',
            refStr ? `Ref: ${refStr}` : '',
            contractorLic ? `Lic: ${contractorLic}` : '',
            `Device ID: ${deviceToken}`
          ].filter(Boolean).join(' | '));

          if (indexSummary) {
            finalPage.drawText(indexSummary, {
              x: 36,
              y: 2,
              size: 2,
              font: bakedFont,
              color: rgb(0, 0, 0),
              opacity: 0
            });
          }
        }

        // Explicitly release canvas bitmap to prevent WebKit / mobile Safari memory pressure
        canvas.width = 0;
        canvas.height = 0;
      }

      // ----------------------------------------------------
      // 16. Final Export Blob & Filename
      // ----------------------------------------------------
      const finalPdfBytes = await bakedDoc.save();
      const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      return {
        blob: finalBlob,
        filename: filename,
        totalPages: totalRenderedPages
      };
    },

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 2000);
    },

    async sharePdf(blob, filename, title = 'Certificate of Testing & Compliance') {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: `Attached is the Queensland Certificate of Testing & Compliance (${filename}).`
          });
          return true;
        } catch (shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.warn('Native share failed, falling back to download:', shareErr);
            this.downloadBlob(blob, filename);
          }
          return false;
        }
      } else {
        // Desktop browser fallback
        this.downloadBlob(blob, filename);
        return false;
      }
    }
  };

  window.CotPdfGenerator = CotPdfGenerator;
})(window);
