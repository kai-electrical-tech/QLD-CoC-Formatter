// Queensland ESO CoC / CoT A4 300 DPI Baked PDF Generator (Official V7.09-2026)
// Features Vector Overlay + Neutral Device ID + Dynamic Annexure A + 300 DPI Anti-Tamper Image Baking
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
     * Baked at 300 DPI for complete anti-tamper security
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
        drawCheckmark(firstPage, 227.5, 638, 10, navyColor);
      } else {
        drawCheckmark(firstPage, 227.5, 674, 10, navyColor);
      }

      // ----------------------------------------------------
      // 5. Customer Details
      // ----------------------------------------------------
      const customerTitle = (data.customerTitle || '').trim();
      const customerGivenName = (data.customerGivenName || '').trim();
      const customerSurname = (data.customerSurname || '').trim();

      if (customerTitle) {
        firstPage.drawText(customerTitle, { x: 118, y: 563, size: 9.5, font: helvetica, color: blackColor });
      }
      if (customerGivenName) {
        firstPage.drawText(customerGivenName, { x: 169, y: 563, size: 9.5, font: helvetica, color: blackColor });
      }
      if (customerSurname) {
        firstPage.drawText(customerSurname, { x: 328, y: 563, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 6. Address Details
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
        firstPage.drawText(street, { x: 118, y: 531, size: 9.5, font: helvetica, color: blackColor });
      }
      if (suburb) {
        firstPage.drawText(suburb, { x: 118, y: 503, size: 9.5, font: helvetica, color: blackColor });
      }
      if (postcode) {
        firstPage.drawText(postcode, { x: 425, y: 503, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 7. Dates
      // ----------------------------------------------------
      const testDate = data.testDate ? new Date(data.testDate + 'T00:00:00') : new Date();
      const tDay = String(testDate.getDate()).padStart(2, '0');
      const tMonth = String(testDate.getMonth() + 1).padStart(2, '0');
      const tYear = String(testDate.getFullYear());

      firstPage.drawText(tDay, { x: 136, y: 251, size: 9.5, font: helvetica, color: blackColor });
      firstPage.drawText(tMonth, { x: 168, y: 251, size: 9.5, font: helvetica, color: blackColor });
      firstPage.drawText(tYear, { x: 200, y: 251, size: 9.5, font: helvetica, color: blackColor });

      const noticeDate = data.noticeDate ? new Date(data.noticeDate + 'T00:00:00') : testDate;
      const nDay = String(noticeDate.getDate()).padStart(2, '0');
      const nMonth = String(noticeDate.getMonth() + 1).padStart(2, '0');
      const nYear = String(noticeDate.getFullYear());

      firstPage.drawText(nDay, { x: 168, y: 80, size: 9.5, font: helvetica, color: blackColor });
      firstPage.drawText(nMonth, { x: 200, y: 80, size: 9.5, font: helvetica, color: blackColor });
      firstPage.drawText(nYear, { x: 240, y: 80, size: 9.5, font: helvetica, color: blackColor });

      // ----------------------------------------------------
      // 8. Contractor Details
      // ----------------------------------------------------
      const contractorLic = (data.contractorLic || '').trim();
      const contractorName = (data.contractorName || '').trim();
      const contractorPhone = (data.contractorPhone || '').trim();

      if (contractorLic) {
        firstPage.drawText(contractorLic, { x: 462, y: 251, size: 9.5, font: helvetica, color: blackColor });
      }
      if (contractorName) {
        firstPage.drawText(contractorName, { x: 222, y: 228, size: 9.5, font: helvetica, color: blackColor });
      }
      if (contractorPhone) {
        firstPage.drawText(contractorPhone, { x: 256, y: 205, size: 9.5, font: helvetica, color: blackColor });
      }

      // ----------------------------------------------------
      // 9. Tester Name & Licence (Unified across Page 1 & Page 2)
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
        firstPage.drawText(testerDisplayStr, { x: 385, y: 80, size: 9.5, font: helvetica, color: blackColor });
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

      if (wrappedLines.length <= 14) {
        page1Lines = wrappedLines;
      } else if (wrappedLines.length <= 17) {
        descFontSize = 8.0;
        descLineHeight = 10.5;
        page1Lines = wrapText(descText, helvetica, descFontSize, descBoxWidth);
      } else {
        needsAnnexureA = true;
        descFontSize = 9.0;
        descLineHeight = 12.0;
        wrappedLines = wrapText(descText, helvetica, descFontSize, descBoxWidth);
        page1Lines = wrappedLines.slice(0, 12);
        annexureLines = wrappedLines.slice(12);
      }

      // Render Page 1 description
      let currentY = 452;
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
        firstPage.drawText('--- Continued on Annexure A ---', {
          x: 68,
          y: currentY - 4,
          size: 8.5,
          font: helveticaOblique,
          color: navyColor
        });
      }

      // ----------------------------------------------------
      // 12. Dynamic Multi-Page Annexure A Engine
      // ----------------------------------------------------
      const annexurePagesData = [];
      if (needsAnnexureA) {
        let remaining = annexureLines.slice();
        // Intermediate pages hold up to 42 lines (span y=608 down to y=83)
        // Final page holds up to 37 lines + statutory sign-off box (at y: 46..124)
        while (remaining.length > 0) {
          if (remaining.length <= 37) {
            annexurePagesData.push({ lines: remaining, isFinal: true });
            remaining = [];
          } else if (remaining.length <= 42 + 10) {
            // Balance final two pages so the last page doesn't receive just 1-5 lines
            const take = Math.ceil(remaining.length / 2);
            annexurePagesData.push({ lines: remaining.slice(0, take), isFinal: false });
            remaining = remaining.slice(take);
          } else {
            annexurePagesData.push({ lines: remaining.slice(0, 42), isFinal: false });
            remaining = remaining.slice(42);
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

        // 12.3 Dividing horizontal rule matching Page 1 (y: 698.22, thickness 0.48)
        aPage.drawLine({
          start: { x: 48.7, y: 698.22 },
          end: { x: 550.0, y: 698.22 },
          thickness: 0.48,
          color: rgb(0.2, 0.2, 0.2)
        });

        // 12.4 Annexure A Title Banner
        aPage.drawText('ANNEXURE A — ELECTRICAL INSTALLATION / EQUIPMENT TESTED', {
          x: 48.7,
          y: 678,
          size: 10.5,
          font: helveticaBold,
          color: navyColor
        });

        // 12.5 Job Reference Information Box (Customer & Address only)
        aPage.drawRectangle({
          x: 48.7,
          y: 626,
          width: 501.3,
          height: 42,
          color: rgb(0.97, 0.98, 0.99),
          borderColor: lightBorderColor,
          borderWidth: 0.5
        });

        const custFullName = [customerTitle, customerGivenName, customerSurname].filter(Boolean).join(' ') || 'Customer';
        const fullAddrStr = [street, suburb, postcode ? `QLD ${postcode}` : 'QLD'].filter(Boolean).join(', ');

        aPage.drawText(`Customer: ${custFullName}`, { x: 58, y: 650, size: 8.5, font: helveticaBold, color: blackColor });
        aPage.drawText(`Site Address: ${fullAddrStr}`, { x: 58, y: 636, size: 8.5, font: helvetica, color: blackColor });

        // 12.6 Draw Annexure continuation lines for this page
        let aY = 608;
        for (const aLine of pageInfo.lines) {
          aPage.drawText(aLine, {
            x: 58,
            y: aY,
            size: 9.0,
            font: helvetica,
            color: blackColor
          });
          aY -= 12.5;
        }

        // 12.7 Intermediate continuation notice vs Final Sign-off Box
        if (!pageInfo.isFinal) {
          aPage.drawText(`--- Continued on Page ${pageNum + 1} ---`, {
            x: 58,
            y: 56,
            size: 8.5,
            font: helveticaOblique,
            color: navyColor
          });
        } else {
          // Bottom Sign-off Box matching Page 1
          aPage.drawRectangle({
            x: 48.7,
            y: 46,
            width: 501.3,
            height: 78,
            color: rgb(0.98, 0.98, 0.99),
            borderColor: lightBorderColor,
            borderWidth: 0.5
          });

          // Left Side: Contractor Lic, Date of test, Date notice given
          aPage.drawText(`Contractor Lic: ${contractorLic || 'N/A'}`, { x: 58, y: 106, size: 8.5, font: helvetica, color: blackColor });
          aPage.drawText(`Date of test: ${tDay} / ${tMonth} / ${tYear}`, { x: 58, y: 92, size: 8.5, font: helvetica, color: blackColor });
          aPage.drawText(`Date notice given: ${nDay} / ${nMonth} / ${nYear}`, { x: 58, y: 78, size: 8.5, font: helvetica, color: blackColor });
          aPage.drawText(`Certified safe and compliant under Electrical Safety Regulation 2026 (${data.certType === 'equipment' ? 's208' : 's229'}).`, { x: 58, y: 60, size: 7.5, font: helveticaOblique, color: grayColor });

          // Right Side: Tester and Signature (matching Page 1 formatting)
          if (testerDisplayStr) {
            aPage.drawText(testerDisplayStr, { x: 360, y: 106, size: 8.5, font: helvetica, color: blackColor });
          }
          if (sigImage) {
            aPage.drawImage(sigImage, {
              x: 385,
              y: 58,
              width: 115,
              height: 32
            });
          }
        }

        // 12.8 Footer stamps on this Annexure page
        // Page X/N in center
        aPage.drawText(`Page ${pageNum}/${totalPages}`, {
          x: 275,
          y: 36.1,
          size: 8.5,
          font: helvetica,
          color: grayColor
        });

        // Template version in right corner
        aPage.drawText('V7.09-2026', {
          x: 505,
          y: 36.1,
          size: 8.5,
          font: helvetica,
          color: grayColor
        });
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

      // Neutral Device ID & Job Reference (left footer on all pages)
      const refStr = (data.jobReference || '').trim();
      const deviceToken = data.deviceToken || localStorage.getItem('qld_device_token') || 'DEV-OFFLINE';
      const footerLeftText = refStr ? `Ref: ${refStr}   Device ID: ${deviceToken}` : `Device ID: ${deviceToken}`;
      firstPage.drawText(footerLeftText, {
        x: 48.7,
        y: 13,
        size: 6.0,
        font: helvetica,
        color: grayColor
      });

      for (const aPage of createdAnnexurePages) {
        aPage.drawText(footerLeftText, {
          x: 48.7,
          y: 13,
          size: 6.0,
          font: helvetica,
          color: grayColor
        });
      }

      // Bottom Right Website URL (Page 1 and all Annexure pages)
      if (data.contractorWebsite) {
        const cleanUrl = data.contractorWebsite.trim().replace(/^https?:\/\//i, '');
        const websiteText = `Website: ${cleanUrl}`;
        const websiteWidth = helvetica.widthOfTextAtSize(websiteText, 6.0);
        firstPage.drawText(websiteText, {
          x: 550.0 - websiteWidth,
          y: 13,
          size: 6.0,
          font: helvetica,
          color: grayColor
        });
        for (const aPage of createdAnnexurePages) {
          aPage.drawText(websiteText, {
            x: 550.0 - websiteWidth,
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
      // 15. 300 DPI ANTI-TAMPER RASTERIZATION (IMAGE BAKING)
      // ----------------------------------------------------
      const loadingTask = window.pdfjsLib.getDocument({ data: rawVectorBytes });
      const renderedPdf = await loadingTask.promise;
      const totalRenderedPages = renderedPdf.numPages;

      // 300 DPI scale: 300 / 72 = 4.16667
      const scale = 4.16667;
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

      // Prepare Searchable Text Layer for full-text indexing (Spotlight / Windows Search / Acrobat Ctrl+F)
      const customerFullName = [customerTitle, customerGivenName, customerSurname].filter(Boolean).join(' ');
      const installAddress = [street, suburb, postcode].filter(Boolean).join(' ');
      const testDateFormatted = `${tDay}/${tMonth}/${tYear}`;
      const noticeDateFormatted = `${nDay}/${nMonth}/${nYear}`;

      const searchableLines = [
        certTypeName,
        customerFullName ? `Customer: ${customerFullName}` : '',
        data.fullAddress ? `Customer Address: ${data.fullAddress}` : '',
        installAddress ? `Installation Address: ${installAddress}` : '',
        refStr ? `Job Ref: ${refStr}` : '',
        descText ? `Work Description: ${descText}` : '',
        `Date of Testing: ${testDateFormatted}`,
        `Date of Notice: ${noticeDateFormatted}`,
        contractorName ? `Contractor: ${contractorName}` : '',
        contractorLic ? `Contractor Licence: ${contractorLic}` : '',
        contractorPhone ? `Contractor Phone: ${contractorPhone}` : '',
        testerDisplayStr ? `Tester: ${testerDisplayStr}` : '',
        `Device ID: ${deviceToken}`
      ].filter(Boolean);

      for (let pNum = 1; pNum <= totalRenderedPages; pNum++) {
        const page = await renderedPdf.getPage(pNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const bakedImgData = canvas.toDataURL('image/jpeg', 0.82);

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

        // Invisible Searchable Text Overlay (opacity: 0)
        if (pNum === 1) {
          let sY = 820;
          for (const item of searchableLines) {
            const wrapped = wrapText(item, bakedFont, 7, 520);
            for (const line of wrapped) {
              if (sY > 20) {
                finalPage.drawText(safeWinAnsi(line), {
                  x: 36,
                  y: sY,
                  size: 7,
                  font: bakedFont,
                  color: rgb(0, 0, 0),
                  opacity: 0
                });
                sY -= 8;
              }
            }
          }
        } else if (pNum > 1 && annexurePagesData[pNum - 2]) {
          let sY = 820;
          const aData = annexurePagesData[pNum - 2];
          finalPage.drawText(safeWinAnsi(`${certTypeName} - Annexure A (Page ${pNum} of ${totalRenderedPages})`), {
            x: 36,
            y: sY,
            size: 7,
            font: bakedFont,
            color: rgb(0, 0, 0),
            opacity: 0
          });
          sY -= 10;
          for (const aLine of aData.lines) {
            if (sY > 20) {
              finalPage.drawText(safeWinAnsi(aLine), {
                x: 36,
                y: sY,
                size: 7,
                font: bakedFont,
                color: rgb(0, 0, 0),
                opacity: 0
              });
              sY -= 8;
            }
          }
        }

        // Explicitly release huge 300 DPI canvas bitmap to prevent WebKit memory pressure
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
