// Queensland ESO CoC / CoT Main Application Controller (Refined)
// 100% Client-Side, Public-Safe (Zero Hardcoded Private Data), Mobile-Optimized
(function() {
  'use strict';

  const MAX_PRESETS = 30;
  const MAX_DESC_CHARS = 50000;
  const MAX_DESC_LINES = 10000;
  const CURRENT_APP_VERSION = '1.2.1';
  const PRESET_SCHEMA_VERSION = 'v3_standards';

  // Standard Queensland Compliance Presets (Single-string titles, AS/NZS 3000 cited, public-safe)
  const STANDARD_PRESETS = [
    {
      id: 'smoke_alarm',
      title: 'Smoke Alarms',
      text: 'Supply, install, and test interconnected photoelectric smoke alarms in accordance with AS 3786:2014, AS/NZS 3000:2018, Fire and Emergency Services Act 1990 (s104RBA), and Building Regulation 2021:\n- Alarms installed: [Quantity & Types, e.g. 4x Alarms (Hardwired 240V / 10-yr Lithium)]\n- Locations: [Locations, e.g. Bedrooms x3, Hallway x1, Living x1]\n- All alarms are photoelectric, interconnected (RF wireless / hardwired), and in prescribed locations\n- Operational test, interconnection trigger, and tactile hush button verified\n- Earth continuity, polarity, and insulation resistance tested and compliant'
    },
    {
      id: 'battery',
      title: 'Battery',
      text: 'Install battery energy storage system (BESS) in accordance with AS/NZS 5139:2019, AS/NZS 4777.1, and AS/NZS 3000:2018:\n- Inverter: [Make / Model, e.g. Hybrid Inverter 5kW / 10kW]\n- Battery: [Make / Model, e.g. Lithium-ion Battery 10kWh / 15kWh]\n- Dedicated sub-board / PVDB with EPS main switch & manual changeover switch\n- Essential backup sub-circuits relocated downstream of changeover switch\n- Earth continuity (<0.5 Ohm), insulation resistance (>1.0 MOhm), polarity, EFLI, and RCD operation verified\n- Commissioned and functionally tested'
    },
    {
      id: 'solar',
      title: 'Solar PV',
      text: 'Supply and install grid-connected rooftop photovoltaic (PV) solar system in accordance with AS/NZS 5033:2021, AS/NZS 4777.1, and AS/NZS 3000:2018:\n- Inverter: [Make / Model / Capacity, e.g. Inverter 5kW / 8.2kW]\n- PV Array: [Quantity] x [Wattage]W panels (Total DC Capacity: [kW]kW)\n- AC/DC isolation switches and circuit protection installed and labelled\n- Anti-islanding protection and grid disconnection verified\n- Array insulation resistance, earth continuity, and polarity tested and compliant\n- Commissioned and connected to distribution network'
    },
    {
      id: 'ev_charger',
      title: 'EV Charger',
      text: 'Supply and install dedicated electric vehicle (EV) charging station circuit in accordance with AS/NZS 3000:2018 (Section 7.9) and Queensland Electricity Connection Manual (QECM):\n- Charger Unit: [Make / Model, e.g. 7.4kW 1-Phase / 22kW 3-Phase EVSE]\n- Dedicated sub-circuit wired from main switchboard with compliant cable sizing\n- Dedicated Type A/B RCBO (30mA residual current protection with DC fault detection)\n- Earth continuity, insulation resistance (>1.0 MOhm), EFLI, and RCD trip time tested\n- Test charge verified and commissioned'
    },
    {
      id: 'switchboard',
      title: 'Switchboard',
      text: 'Switchboard upgrade and alteration carried out in accordance with AS/NZS 3000:2018 and Queensland Electricity Connection Manual (QECM):\n- Existing fuse board replaced with compliant enclosure and new main switch\n- Final sub-circuits protected by individual Type A RCBOs (30mA)\n- Main earthing conductor, MEN connection, and earth electrode tested (<0.5 Ohm)\n- Surge Protection Device (SPD) installed\n- Consumer mains / sub-mains tested: insulation resistance (>1.0 MOhm) and polarity verified\n- Final sub-circuits (FSC) tested: earth continuity, insulation resistance (>1.0 MOhm), polarity, EFLI, and RCD trip times verified\n- Labelled and circuit schedules updated'
    }
  ];
  const DEFAULT_PRESETS = STANDARD_PRESETS;

  // State
  let currentPresets = [];
  let expandedPresetIds = new Set();
  let isPresetsExpanded = true;
  let pendingPresetUpgrade = false;
  let currentActiveTab = 'form';
  const tabScrollPositions = { form: 0, history: 0, profile: 0 };
  let signaturePadCanvas = null;
  let signaturePadCtx = null;
  let isSigning = false;
  let hasSigned = false;
  let isSigningMode = false;
  let lastX = 0;
  let lastY = 0;
  let historyRecords = [];

  // Helper: HTML Escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Mobile Browser Double-Tap & Pinch Zoom Prevention
  const preventMultiTouch = (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  };
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) => {
    document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
    window.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
  });
  document.addEventListener('touchstart', preventMultiTouch, { passive: false });
  window.addEventListener('touchstart', preventMultiTouch, { passive: false });
  document.addEventListener('touchmove', preventMultiTouch, { passive: false });
  window.addEventListener('touchmove', preventMultiTouch, { passive: false });
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  let lastTouchEndTime = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEndTime <= 300) {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
      }
    }
    lastTouchEndTime = now;
  }, { passive: false });

  // 1. Neutral Device Audit Token
  function getOrCreateDeviceToken() {
    let token = localStorage.getItem('qld_device_token');
    if (!token) {
      const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
      const timeHex = Date.now().toString(16).substring(4).toUpperCase();
      token = `DEV-${randHex}-${timeHex}`;
      localStorage.setItem('qld_device_token', token);
    }
    return token;
  }

  // 2. Initialize App on DOM Ready
  window.addEventListener('DOMContentLoaded', () => {
    initDeviceToken();
    initTabs();
    initContractorSettings();
    initPresets();
    initDates();
    initSignaturePad();
    initAddressAutocomplete();
    initNumericInputs();
    initDraft();
    initHistory();
    initWelcomeOrUpdateModal();
    initPwa();

    if (window.CotPdfGenerator) {
      window.CotPdfGenerator.preloadAssets();
    }
  });

  // Handle BFCache navigation / mobile back restoration
  window.addEventListener('pageshow', () => {
    setTimeout(() => {
      initContractorSettings();
      initDraft();
      updateActiveContractorBadge();
    }, 50);
  });

  function initDeviceToken() {
    const token = getOrCreateDeviceToken();
    const tokenEl = document.getElementById('settingDeviceToken');
    if (tokenEl) tokenEl.value = token;
  }

  let waitingWorker = null;

  function initPwa() {
    // 1. Network Status (Offline Ready Pill)
    function updateNetworkStatus(isInitial = false) {
      const isOnline = navigator.onLine;
      const pill = document.getElementById('offlineStatusPill');
      if (pill) {
        pill.style.display = isOnline ? 'none' : 'inline-flex';
      }
      if (!isInitial) {
        if (!isOnline) {
          showSimpleToast('Offline: Certificate can be created and signed offline. Address autocomplete is unavailable.', 10000);
        } else {
          showSimpleToast('Back online', 2500);
        }
      }
    }

    window.addEventListener('online', () => updateNetworkStatus(false));
    window.addEventListener('offline', () => updateNetworkStatus(false));
    updateNetworkStatus(true);

    // 2. Service Worker Registration & Lifecycle Updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        // Proactively check for updates immediately on launch
        reg.update();

        // Check for updates when resuming from background or navigating back
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update();
          }
        });
        window.addEventListener('pageshow', () => {
          reg.update();
        });

        // If an updated worker is already waiting
        if (reg.waiting && navigator.serviceWorker.controller) {
          waitingWorker = reg.waiting;
          showPwaUpdateBanner();
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = newWorker;
              showPwaUpdateBanner();
            }
          });
        });
      }).catch(err => {
        console.warn('SW registration skipped:', err);
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 3. Delegate iOS PWA standalone link clicks to Mobile Safari
    const brandLogoLink = document.querySelector('.brand-logo-link');
    if (brandLogoLink) {
      brandLogoLink.addEventListener('click', (e) => {
        if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
          e.preventDefault();
          window.open(brandLogoLink.href, '_blank');
        }
      });
    }
  }

  function showPwaUpdateBanner() {
    const banner = document.getElementById('pwaUpdateBanner');
    if (banner) {
      banner.style.display = 'flex';
    }
  }

  window.applyPwaUpdate = function() {
    if (waitingWorker) {
      waitingWorker.postMessage({ action: 'skipWaiting' });
    } else {
      window.location.reload();
    }
  };


  // 3. Tab Switching
  function initTabs() {
    window.switchTab = function(tabName) {
      if (tabName === 'settings') tabName = 'profile';
      if (tabName === currentActiveTab) return;

      // 1. Record current tab's scroll position
      tabScrollPositions[currentActiveTab] = window.scrollY || document.documentElement.scrollTop || 0;

      // 2. Set new active tab (DO NOT clear expandedPresetIds - preserves preset expansion across tabs)
      currentActiveTab = tabName;

      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(`tab-${tabName}`) || document.getElementById('tab-profile');
      if (activeBtn) activeBtn.classList.add('active');

      document.querySelectorAll('.view-tab').forEach(view => view.style.display = 'none');
      const activeView = document.getElementById(`view-${tabName}`) || document.getElementById('view-profile');
      if (activeView) activeView.style.display = 'block';

      if (tabName === 'form' && signaturePadCanvas) {
        setTimeout(resizeSignatureCanvas, 50);
        const descField = document.getElementById('workDescription');
        if (descField) autoResizeTextarea(descField);
      }
      if (tabName === 'history') {
        renderHistoryList();
      }
      if (tabName === 'profile') {
        renderPresetsManager();
      }

      // 3. Restore target tab's scroll position
      const targetScroll = tabScrollPositions[tabName] || 0;
      window.scrollTo({ top: targetScroll, behavior: 'instant' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
      });
    };
  }

  // 4. Contractor Profile Logic (Single Authoritative Source in Profile Tab)
  function getSavedProfile() {
    try {
      return JSON.parse(localStorage.getItem('qld_coc_contractor_profile') || '{}');
    } catch (e) {
      return {};
    }
  }

  function updateActiveContractorBadge() {
    const profile = getSavedProfile();
    const nameEl = document.getElementById('activeContractorName');
    const licEl = document.getElementById('activeContractorLic');
    if (!nameEl) return;

    if (profile && profile.contractorName) {
      nameEl.textContent = profile.contractorName;
      licEl.textContent = profile.contractorLic ? `(Lic: ${profile.contractorLic})` : '';
      nameEl.style.color = '#0f172a';
    } else if (profile && profile.contractorLic) {
      nameEl.textContent = `Contractor Lic: ${profile.contractorLic}`;
      licEl.textContent = '';
      nameEl.style.color = '#0f172a';
    } else {
      nameEl.textContent = 'No Profile Configured';
      licEl.textContent = '(Tap to configure)';
      nameEl.style.color = '#94a3b8';
    }
  }

  window.saveContractorSettings = function(showToast = false) {
    const profile = {
      contractorName: getVal('settingContractorName').trim(),
      contractorLic: getVal('settingContractorLic').trim(),
      contractorPhone: getVal('settingContractorPhone').trim(),
      contractorWebsite: getVal('settingContractorWebsite').trim(),
      testerName: getVal('settingTesterName').trim(),
      testerLicence: getVal('settingTesterLicence').trim()
    };

    localStorage.setItem('qld_coc_contractor_profile', JSON.stringify(profile));
    updateActiveContractorBadge();

    if (showToast) {
      showSimpleToast('Profile saved');
    }
  };

  function attachSmartAutoSave(el, onSaveCallback, toastMsg) {
    if (!el || el._hasSmartAutoSave) return;
    el._hasSmartAutoSave = true;

    el.addEventListener('focus', () => {
      el._initialVal = el.value;
      el._isDirty = false;
    });

    el.addEventListener('input', () => {
      if (el.value !== el._initialVal) {
        el._isDirty = true;
      }
    });

    el.addEventListener('change', () => {
      if (el.value !== el._initialVal) {
        el._isDirty = true;
      }
    });

    el.addEventListener('blur', () => {
      if (el._isDirty && el.value !== el._initialVal) {
        el._isDirty = false;
        el._initialVal = el.value;
        onSaveCallback();
        if (toastMsg) {
          showSimpleToast(toastMsg);
        }
      }
    });
  }

  function initProfileAutoSave() {
    const profileIds = [
      'settingContractorName',
      'settingContractorLic',
      'settingContractorPhone',
      'settingContractorWebsite',
      'settingTesterName',
      'settingTesterLicence'
    ];
    profileIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        attachSmartAutoSave(el, () => window.saveContractorSettings(false), 'Profile saved');
      }
    });

    const formIds = [
      'customerTitle',
      'customerGivenName',
      'customerSurname',
      'fullAddress',
      'jobReference',
      'workDescription',
      'testDate',
      'noticeDate'
    ];
    formIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        attachSmartAutoSave(el, () => saveDraft(), 'Draft saved');
      }
    });
  }

  function initContractorSettings() {
    const profile = getSavedProfile();

    setVal('settingContractorName', profile.contractorName || '');
    setVal('settingContractorLic', profile.contractorLic || '');
    setVal('settingContractorPhone', profile.contractorPhone || '');
    setVal('settingContractorWebsite', profile.contractorWebsite || '');
    setVal('settingTesterName', profile.testerName || '');
    setVal('settingTesterLicence', profile.testerLicence || '');

    updateActiveContractorBadge();
    initLogoUpload();
    initProfileAutoSave();
  }

  window.openProfileSetup = function() {
    closeWelcomeModal();
    window.switchTab('profile');
    const nameInput = document.getElementById('settingContractorName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 150);
    }
  };

  // Numeric Input Sanitizer for Licences and Phones
  function initNumericInputs() {
    const licIds = ['settingContractorLic', 'settingTesterLicence'];
    licIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          el.value = el.value.replace(/[^\d]/g, '');
        });
      }
    });

    const phoneIds = ['settingContractorPhone'];
    phoneIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          el.value = el.value.replace(/[^\d\s\+\(\)\-]/g, '');
        });
      }
    });
  }

  // Logo Upload & Resize Engine (Optimized & downscaled)
  function initLogoUpload() {
    const logoInput = document.getElementById('logoFileInput');
    const previewContainer = document.getElementById('logoPreviewContainer');
    const removeBtn = document.getElementById('btnRemoveLogo');
    const savedLogo = localStorage.getItem('qld_coc_custom_logo');

    if (savedLogo) {
      showLogoPreview(savedLogo);
    } else {
      hideLogoPreview();
    }

    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          showUnifiedToast({
            title: 'Invalid File Type',
            desc: 'Please upload an image file (PNG, JPG, or WebP).',
            buttons: [{ text: 'OK', isPrimary: true, onClick: hideUnifiedToast }]
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            // PDF printable header is ~500pt; at 300 DPI, 1200px provides ultra-crisp resolution with lightweight footprint
            const maxW = 1200;
            const maxH = 300;
            let targetW = img.width;
            let targetH = img.height;

            const scale = Math.min(maxW / targetW, maxH / targetH, 1.0);
            targetW = Math.round(targetW * scale);
            targetH = Math.round(targetH * scale);

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);

            const dataUrl = canvas.toDataURL('image/png');
            try {
              localStorage.setItem('qld_coc_custom_logo', dataUrl);
              showLogoPreview(dataUrl);
              showSimpleToast('Custom logo saved');
            } catch (err) {
              console.error('Failed to save custom logo to localStorage:', err);
              showUnifiedToast({
                title: 'Storage Full',
                desc: 'Could not save custom logo due to browser storage quota limits. Please use a smaller image file.',
                buttons: [{ text: 'OK', isPrimary: true, onClick: hideUnifiedToast }]
              });
            } finally {
              canvas.width = 0;
              canvas.height = 0;
            }
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        localStorage.removeItem('qld_coc_custom_logo');
        if (logoInput) logoInput.value = '';
        hideLogoPreview();
        showSimpleToast('Custom logo removed');
      });
    }
  }

  function showLogoPreview(dataUrl) {
    const previewContainer = document.getElementById('logoPreviewContainer');
    const removeBtn = document.getElementById('btnRemoveLogo');
    if (!previewContainer) return;
    previewContainer.innerHTML = `<img src="${dataUrl}" class="logo-preview-img" alt="Custom Contractor Logo">`;
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  }

  function hideLogoPreview() {
    const previewContainer = document.getElementById('logoPreviewContainer');
    const removeBtn = document.getElementById('btnRemoveLogo');
    if (!previewContainer) return;
    previewContainer.innerHTML = `<span class="logo-preview-placeholder">No custom logo uploaded. Company name will be printed as large clean letterhead.</span>`;
    if (removeBtn) removeBtn.style.display = 'none';
  }

  function cleanEmojiFromTitle(title) {
    if (!title) return '';
    return title.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]\s*/u, '').trim();
  }

  function autoResizePresetTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 80) + 'px';
  }

  // 5. Work Description Presets & Custom Presets Editor
  function initPresets() {
    try {
      const savedVer = localStorage.getItem('qld_coc_presets_ver');
      const saved = localStorage.getItem('qld_coc_presets');
      const isPending = localStorage.getItem('qld_coc_preset_upgrade_pending') === 'true';

      if (saved && savedVer === PRESET_SCHEMA_VERSION && !isPending) {
        currentPresets = JSON.parse(saved);
        currentPresets = currentPresets.map(p => ({
          id: p.id || ('preset_' + Math.random().toString(16).substring(2, 8)),
          title: cleanEmojiFromTitle(p.title) || 'Preset',
          text: p.text || ''
        })).slice(0, MAX_PRESETS);
      } else if (!saved) {
        // Upgrade or first load: brand new user
        currentPresets = JSON.parse(JSON.stringify(STANDARD_PRESETS));
        localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
        localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
      } else {
        // Returning user with existing presets
        let parsed = [];
        try {
          parsed = JSON.parse(saved);
        } catch (_) {
          parsed = [];
        }

        if (isPending) {
          pendingPresetUpgrade = true;
          currentPresets = parsed.slice(0, MAX_PRESETS);
        } else if (parsed.length > 25) {
          // Power users with > 25 presets: silently retain all presets untouched
          currentPresets = parsed.slice(0, MAX_PRESETS);
          localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
        } else {
          // Check if user has unmodified legacy default presets
          const legacyDefaultTexts = new Set([
            'Supply and install energy storage battery system.',
            'Supply & install smoke alarms, tested & verified.',
            'Switchboard upgrade and circuit protection installed and tested.',
            'Supply & install dedicated EV Charger circuit.',
            'Supply & install rooftop Solar PV system.'
          ]);
          const legacyDefaultIds = new Set(['battery', 'smoke_alarm', 'switchboard', 'ev_charger', 'solar']);

          const isUnmodifiedLegacy = parsed.length === 5 &&
            parsed.every(p => legacyDefaultIds.has(p.id) && legacyDefaultTexts.has((p.text || '').trim()));

          if (isUnmodifiedLegacy) {
            // Auto-upgrade silently to standard presets
            currentPresets = JSON.parse(JSON.stringify(STANDARD_PRESETS));
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
            showSimpleToast('Presets updated to Queensland standards');
          } else {
            // User has customized presets (<= 25 items): flag for upgrade review
            pendingPresetUpgrade = true;
            localStorage.setItem('qld_coc_preset_upgrade_pending', 'true');
            currentPresets = parsed.slice(0, MAX_PRESETS);
          }
        }
      }
    } catch (e) {
      currentPresets = JSON.parse(JSON.stringify(STANDARD_PRESETS));
    }
    renderPresetChips();
    renderPresetsManager();
    updatePresetsToggleUI();
  }

  function updatePresetsToggleUI() {
    const userCollapsed = localStorage.getItem('qld_coc_presets_collapsed') === 'true';
    isPresetsExpanded = !userCollapsed;
    const chipsContainer = document.getElementById('presetChipsContainer');
    const toggleArrow = document.getElementById('presetToggleArrow');
    const toggleText = document.getElementById('presetToggleText');
    const toggleBtn = document.getElementById('btnPresetToggle');

    if (chipsContainer) {
      chipsContainer.style.display = isPresetsExpanded ? 'flex' : 'none';
    }
    if (toggleArrow && toggleText) {
      if (isPresetsExpanded) {
        toggleArrow.style.display = 'inline-block';
        toggleArrow.textContent = '▲';
        toggleText.style.display = 'none';
      } else {
        toggleArrow.style.display = 'none';
        toggleText.style.display = 'inline-block';
        toggleText.textContent = 'Preset';
      }
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', isPresetsExpanded ? 'true' : 'false');
      toggleBtn.setAttribute('title', isPresetsExpanded ? 'Collapse Presets' : 'Expand Presets');
    }
  }

  function renderPresetChips() {
    const container = document.getElementById('presetChipsContainer');
    if (!container) return;
    container.innerHTML = '';

    currentPresets.forEach(preset => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'preset-chip';
      chip.innerHTML = `<span>${escapeHtml(preset.title)}</span>`;
      chip.addEventListener('click', () => {
        handlePresetClick(preset);
      });
      container.appendChild(chip);
    });
    updatePresetsToggleUI();
  }

  window.togglePresetsCollapse = function() {
    const container = document.getElementById('presetChipsContainer');
    if (!container) return;
    isPresetsExpanded = !isPresetsExpanded;
    localStorage.setItem('qld_coc_presets_collapsed', isPresetsExpanded ? 'false' : 'true');
    updatePresetsToggleUI();
  };

  window.clearWorkPerformedFor = function() {
    const hasValues = getVal('customerTitle') || getVal('customerGivenName') || getVal('customerSurname') || getVal('fullAddress') || getVal('jobReference');
    if (hasValues) {
      showUnifiedToast({
        title: 'Clear Client & Site Details?',
        desc: 'Do you want to clear client name, installation address, and reference for this section?',
        buttons: [
          { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
          {
            text: 'Clear',
            isPrimary: true,
            isDanger: true,
            onClick: () => {
              setVal('customerTitle', '');
              setVal('customerGivenName', '');
              setVal('customerSurname', '');
              setVal('fullAddress', '');
              setVal('jobReference', '');
              saveDraft();
              hideUnifiedToast();
              showSimpleToast('Client details cleared');
            }
          }
        ]
      });
    } else {
      setVal('customerTitle', '');
      setVal('customerGivenName', '');
      setVal('customerSurname', '');
      setVal('fullAddress', '');
      setVal('jobReference', '');
      saveDraft();
      showSimpleToast('Client details cleared');
    }
  };

  window.clearWorkDescription = function() {
    const descField = document.getElementById('workDescription');
    if (!descField) return;
    if (descField.value.trim().length > 0) {
      showUnifiedToast({
        title: 'Clear Description?',
        desc: 'Do you want to clear the work description text?',
        buttons: [
          { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
          {
            text: 'Clear',
            isPrimary: true,
            isDanger: true,
            onClick: () => {
              descField.value = '';
              updateDescriptionCounter();
              autoResizeTextarea(descField);
              saveDraft();
              hideUnifiedToast();
              showSimpleToast('Description cleared');
            }
          }
        ]
      });
    } else {
      descField.value = '';
      updateDescriptionCounter();
      autoResizeTextarea(descField);
      saveDraft();
      showSimpleToast('Description cleared');
    }
  };

  function handlePresetClick(preset) {
    const descField = document.getElementById('workDescription');
    if (!descField) return;

    const currentText = descField.value.trim();
    const isCleanOrMatchesPreset = !currentText || currentPresets.some(p => p.text.trim() === currentText);

    if (isCleanOrMatchesPreset) {
      descField.value = preset.text;
      updateDescriptionCounter();
      autoResizeTextarea(descField);
      saveDraft();
      showSimpleToast(`Preset applied: ${preset.title}`);
    } else {
      showUnifiedToast({
        title: 'Overwrite Work Description?',
        desc: 'You have entered custom notes in the description. Choose an action:',
        buttons: [
          { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
          {
            text: 'Append',
            isPrimary: true,
            onClick: () => {
              descField.value = descField.value.trim() + '\n\n' + preset.text;
              updateDescriptionCounter();
              autoResizeTextarea(descField);
              saveDraft();
              hideUnifiedToast();
              showSimpleToast(`Preset appended: ${preset.title}`);
            }
          },
          {
            text: 'Replace',
            isPrimary: false,
            isDanger: true,
            onClick: () => {
              descField.value = preset.text;
              updateDescriptionCounter();
              autoResizeTextarea(descField);
              saveDraft();
              hideUnifiedToast();
              showSimpleToast(`Preset applied: ${preset.title}`);
            }
          }
        ]
      });
    }
  }

  window.togglePresetAccordion = function(id) {
    if (expandedPresetIds.has(id)) {
      expandedPresetIds.delete(id);
    } else {
      expandedPresetIds.add(id);
    }
    renderPresetsManager();
  };

  // Preset Drag & Drop Reordering (Unified Pointer & Touch with Live Slot Placeholder & Edge Auto-Scroll)
  function initPresetReordering(item, header, presetId, idx, isExpanded) {
    if (isExpanded) {
      // Expanded presets cannot be dragged. Accordion expansion/collapse is exclusively
      // triggered by clicking the dedicated .btn-preset-toggle button, not header taps.
      return;
    }

    let pressTimer = null;
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentOverIdx = idx;
    let lastClientY = 0;
    let autoScrollRaf = null;
    let autoScrollSpeed = 0;
    let placeholderEl = null;

    const preventTouchScroll = (e) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    function createSlotPlaceholder() {
      if (placeholderEl && placeholderEl.parentNode) return;
      placeholderEl = document.createElement('div');
      placeholderEl.className = 'preset-drag-slot-placeholder';
      const p = currentPresets[idx] || {};
      placeholderEl.innerHTML = `
        <div class="preset-accordion-header">
          <div class="preset-accordion-header-left">
            <span class="preset-drag-handle">⋮⋮</span>
            <span class="preset-accordion-title">${escapeHtml(p.title || 'Untitled')}</span>
          </div>
          <div class="preset-accordion-header-right">
            <span class="btn-preset-action btn-preset-toggle" style="pointer-events:none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
          </div>
        </div>
      `;
    }

    function removeSlotPlaceholder() {
      if (placeholderEl && placeholderEl.parentNode) {
        placeholderEl.parentNode.removeChild(placeholderEl);
      }
      placeholderEl = null;
    }

    function updateOverItem(touchY) {
      const container = document.getElementById('presetsManagerList');
      if (!container) return;

      createSlotPlaceholder();

      const otherItems = Array.from(container.querySelectorAll('.preset-accordion-item')).filter(it => it !== placeholderEl && !it.classList.contains('is-dragging'));

      let targetIdx = otherItems.length;
      for (let i = 0; i < otherItems.length; i++) {
        const rect = otherItems[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (touchY < midY) {
          targetIdx = i;
          break;
        }
      }

      currentOverIdx = targetIdx;

      // Position the full-row slot placeholder in real time
      if (targetIdx < otherItems.length) {
        const targetNode = otherItems[targetIdx];
        if (targetNode && targetNode !== placeholderEl) {
          container.insertBefore(placeholderEl, targetNode);
        }
      } else {
        container.appendChild(placeholderEl);
      }

      const numEl = placeholderEl.querySelector('#dragPlaceholderNum');
      if (numEl) {
        numEl.textContent = `${targetIdx + 1}.`;
      }
    }

    function autoScrollStep() {
      if (!isDragging) {
        autoScrollRaf = null;
        return;
      }
      if (autoScrollSpeed !== 0) {
        window.scrollBy(0, autoScrollSpeed);
        updateOverItem(lastClientY);
      }
      autoScrollRaf = requestAnimationFrame(autoScrollStep);
    }

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('button, input, textarea')) return;

      startX = e.clientX;
      startY = e.clientY;
      lastClientY = e.clientY;
      currentOverIdx = idx;

      const isHandle = !!e.target.closest('.preset-drag-handle');
      const delay = isHandle ? 50 : 240; // 50ms for handle, 240ms for header hold

      pressTimer = setTimeout(() => {
        isDragging = true;
        item.classList.add('is-dragging');
        createSlotPlaceholder();
        item.parentNode.insertBefore(placeholderEl, item);

        window.addEventListener('touchmove', preventTouchScroll, { passive: false });
        if (navigator.vibrate) {
          try { navigator.vibrate(30); } catch (_) {}
        }
        try {
          header.setPointerCapture(e.pointerId);
        } catch (_) {}
      }, delay);
    };

    const onPointerMove = (e) => {
      if (e.target.closest('button, input, textarea')) return;

      if (!isDragging) {
        if (pressTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        return;
      }

      e.preventDefault();
      lastClientY = e.clientY;
      updateOverItem(e.clientY);

      // Edge Auto-Scroll Detection
      const topEdge = 135; // Sticky header (~72px) + sticky tabs (~48px) + buffer
      const bottomEdge = window.innerHeight - 80;

      if (e.clientY < topEdge) {
        const intensity = Math.min(1, Math.max(0, (topEdge - e.clientY) / topEdge));
        autoScrollSpeed = -Math.round(4 + intensity * 14); // -4px to -18px per frame
        if (!autoScrollRaf) {
          autoScrollRaf = requestAnimationFrame(autoScrollStep);
        }
      } else if (e.clientY > bottomEdge) {
        const intensity = Math.min(1, Math.max(0, (e.clientY - bottomEdge) / 80));
        autoScrollSpeed = Math.round(4 + intensity * 14); // +4px to +18px per frame
        if (!autoScrollRaf) {
          autoScrollRaf = requestAnimationFrame(autoScrollStep);
        }
      } else {
        autoScrollSpeed = 0;
      }
    };

    const onPointerUp = (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      if (e.target.closest('button, input, textarea')) return;

      if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }
      autoScrollSpeed = 0;
      window.removeEventListener('touchmove', preventTouchScroll);

      if (isDragging) {
        isDragging = false;
        item.classList.remove('is-dragging');
        removeSlotPlaceholder();
        try {
          header.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (currentOverIdx !== idx && currentOverIdx >= 0 && currentOverIdx < currentPresets.length) {
          window.movePreset(idx, currentOverIdx);
        }
      }
      // Normal tap on header title does NOT toggle accordion anymore.
      // Accordion expansion is exclusively triggered by clicking .btn-preset-toggle.
    };

    header.addEventListener('contextmenu', (e) => e.preventDefault());
    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerup', onPointerUp);
    header.addEventListener('pointercancel', onPointerUp);

    // Defensive click handler: ensure clicks on header/title/handle NEVER toggle accordion
    header.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-preset-toggle')) {
        e.stopPropagation();
      }
    });
  }

  window.movePreset = function(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= currentPresets.length) return;
    if (toIndex < 0 || toIndex >= currentPresets.length) return;
    if (fromIndex === toIndex) return;

    const [moved] = currentPresets.splice(fromIndex, 1);
    currentPresets.splice(toIndex, 0, moved);

    localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
    renderPresetsManager();
    renderPresetChips();
    showSimpleToast(`Preset moved to #${toIndex + 1}`);
  };

  window.expandAllPresets = function() {
    currentPresets.forEach(p => expandedPresetIds.add(p.id));
    renderPresetsManager();
    showSimpleToast('Expanded all presets');
  };

  window.collapseAllPresets = function() {
    expandedPresetIds.clear();
    renderPresetsManager();
    showSimpleToast('Collapsed all presets');
  };

  function renderPresetsManager() {
    const container = document.getElementById('presetsManagerList');
    const badge = document.getElementById('presetsCountBadge') || document.getElementById('presetCountBadge');
    const btnAdd = document.getElementById('btnAddPreset');
    const bannerContainer = document.getElementById('presetUpgradeBannerContainer');

    if (bannerContainer) {
      if (pendingPresetUpgrade) {
        bannerContainer.innerHTML = `
          <div class="preset-upgrade-banner">
            <div class="preset-upgrade-banner-header">
              <span class="preset-upgrade-badge">New in v1.2.0</span>
              <span class="preset-upgrade-title">Queensland Standard Presets Available</span>
            </div>
            <p class="preset-upgrade-desc">
              We've introduced 5 comprehensive, AS/NZS 3000-compliant templates (Smoke Alarms, Battery, Solar PV, EV Charger, Switchboard). Choose how to update your presets:
            </p>
            <div class="preset-upgrade-actions">
              <button type="button" class="btn-brand-sm" onclick="window.appendStandardPresets()">Append to Mine</button>
              <button type="button" class="btn-danger-sm" onclick="window.replaceWithStandardPresets()">Replace All</button>
              <button type="button" class="btn-ghost-sm" onclick="window.dismissPresetUpgrade()">Keep Mine</button>
            </div>
          </div>
        `;
      } else {
        bannerContainer.innerHTML = '';
      }
    }

    if (badge) {
      badge.textContent = `${currentPresets.length}/${MAX_PRESETS}`;
    }
    if (btnAdd) {
      btnAdd.disabled = false;
      btnAdd.style.opacity = currentPresets.length >= MAX_PRESETS ? '0.75' : '1.0';
    }

    if (!container) return;
    container.innerHTML = '';

    currentPresets.forEach((p, idx) => {
      const isExpanded = expandedPresetIds.has(p.id);
      const item = document.createElement('div');
      item.className = `preset-accordion-item${isExpanded ? ' is-expanded' : ''}`;
      item.id = `presetAccordion-${idx}`;
      item.setAttribute('data-id', p.id);
      item.setAttribute('data-index', idx);

      item.innerHTML = `
        <div class="preset-accordion-header" title="${isExpanded ? 'Use toggle button to collapse' : 'Use toggle button to expand, hold & drag to reorder'}">
          ${isExpanded ? `
            <div class="preset-expanded-header-left">
              <input type="text" class="form-input preset-expanded-title-input" maxlength="15" value="${escapeHtml(p.title)}" placeholder="Title (max 15)" onclick="event.stopPropagation()">
            </div>
            <div class="preset-expanded-header-right">
              <button type="button" class="btn-preset-action btn-preset-remove" onclick="event.stopPropagation(); window.deletePreset(${idx})" title="Remove Preset" aria-label="Remove Preset" ${currentPresets.length <= 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
              <button type="button" class="btn-preset-action btn-preset-toggle expanded" onclick="event.stopPropagation(); window.togglePresetAccordion('${p.id}')" title="Collapse Preset" aria-label="Collapse Preset">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
            </div>
          ` : `
            <div class="preset-accordion-header-left">
              <span class="preset-drag-handle" title="Hold &amp; drag to reorder">⋮⋮</span>
              <span class="preset-accordion-title">${escapeHtml(p.title || 'Untitled')}</span>
            </div>
            <div class="preset-accordion-header-right">
              <button type="button" class="btn-preset-action btn-preset-toggle" onclick="event.stopPropagation(); window.togglePresetAccordion('${p.id}')" title="Expand Preset" aria-label="Expand Preset">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>
          `}
        </div>
        ${isExpanded ? `
          <div class="preset-accordion-body">
            <textarea class="form-textarea preset-edit-textarea" maxlength="2000" placeholder="Testing & compliance text template (max 2000 chars)...">${escapeHtml(p.text)}</textarea>
            <div class="preset-edit-footer">
              <span class="preset-char-count" id="presetCharCount-${idx}">${(p.text || '').length} / 2000 chars</span>
            </div>
          </div>
        ` : ''}
      `;

      const header = item.querySelector('.preset-accordion-header');
      initPresetReordering(item, header, p.id, idx, isExpanded);
      container.appendChild(item);

      if (isExpanded) {
        const titleInput = item.querySelector('.preset-expanded-title-input');
        const textarea = item.querySelector('.preset-edit-textarea');

        if (titleInput) {
          titleInput.addEventListener('input', () => {
            const rawVal = titleInput.value;
            const cleanVal = cleanEmojiFromTitle(rawVal);
            currentPresets[idx].title = cleanVal;
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            renderPresetChips();
          });

          titleInput.addEventListener('focus', () => {
            titleInput._initialVal = titleInput.value;
          });

          titleInput.addEventListener('blur', () => {
            const trimmed = cleanEmojiFromTitle((titleInput.value || '').trim()) || 'Untitled';
            titleInput.value = trimmed;
            currentPresets[idx].title = trimmed;
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            renderPresetChips();
            if (titleInput._initialVal !== trimmed) {
              titleInput._initialVal = trimmed;
              showSimpleToast('Preset title saved');
            }
          });
        }

        if (textarea) {
          setTimeout(() => autoResizePresetTextarea(textarea), 0);
          textarea.addEventListener('input', () => {
            currentPresets[idx].text = textarea.value;
            const countEl = item.querySelector(`#presetCharCount-${idx}`);
            if (countEl) {
              countEl.textContent = `${(textarea.value || '').length} / 2000 chars`;
            }
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            renderPresetChips();
            autoResizePresetTextarea(textarea);
          });
          textarea.addEventListener('focus', () => {
            textarea._initialVal = textarea.value;
          });
          textarea.addEventListener('blur', () => {
            if (textarea.value !== textarea._initialVal) {
              textarea._initialVal = textarea.value;
              showSimpleToast('Preset saved');
            }
          });
        }
      }
    });
  }

  window.updatePresetTitle = function(index, val) {
    if (!currentPresets[index]) return;
    currentPresets[index].title = cleanEmojiFromTitle((val || '').trim()) || 'Untitled';
    localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
    renderPresetChips();
    renderPresetsManager();
    showSimpleToast('Preset title updated');
  };

  window.updatePresetText = function(index, val) {
    if (!currentPresets[index]) return;
    currentPresets[index].text = val;
    const countEl = document.getElementById(`presetCharCount-${index}`);
    if (countEl) {
      countEl.textContent = `${(val || '').length} / 2000 chars`;
    }
    localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
    renderPresetChips();
  };

  window.deletePreset = function(index) {
    if (currentPresets.length <= 1) {
      showSimpleToast('At least one preset must be retained');
      return;
    }
    showUnifiedToast({
      title: 'Delete Preset?',
      desc: `Are you sure you want to delete "${currentPresets[index].title}"?`,
      buttons: [
        { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
        {
          text: 'Delete',
          isPrimary: true,
          isDanger: true,
          onClick: () => {
            const p = currentPresets[index];
            if (p) expandedPresetIds.delete(p.id);
            currentPresets.splice(index, 1);
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            renderPresetChips();
            renderPresetsManager();
            hideUnifiedToast();
            showSimpleToast('Preset deleted');
          }
        }
      ]
    });
  };

  window.appendStandardPresets = function() {
    const existingTexts = new Set(currentPresets.map(p => p.text.trim()));
    const existingTitles = new Set(currentPresets.map(p => p.title.trim().toLowerCase()));
    const toAppend = [];

    STANDARD_PRESETS.forEach(std => {
      if (existingTexts.has(std.text.trim())) return;
      let title = std.title;
      if (existingTitles.has(title.toLowerCase())) {
        const candidate = `${title} 2`;
        title = candidate.length <= 15 ? candidate : `${title.substring(0, 13)} 2`;
      }
      toAppend.push({
        id: `std_${std.id}_${Date.now()}_${Math.random().toString(16).substring(2, 6)}`,
        title: title,
        text: std.text
      });
      existingTitles.add(title.toLowerCase());
    });

    if (toAppend.length === 0) {
      showSimpleToast('All standard presets already present in your list');
    } else {
      currentPresets = [...currentPresets, ...toAppend].slice(0, MAX_PRESETS);
      localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
      showSimpleToast(`Appended ${toAppend.length} standard preset(s)`);
    }

    localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
    localStorage.removeItem('qld_coc_preset_upgrade_pending');
    pendingPresetUpgrade = false;
    renderPresetChips();
    renderPresetsManager();
  };

  window.replaceWithStandardPresets = function() {
    showUnifiedToast({
      title: 'Replace All Presets?',
      desc: 'Replace all work description presets with the 5 new Queensland standard presets? Custom modifications will be replaced.',
      buttons: [
        { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
        {
          text: 'Replace All',
          isPrimary: true,
          isDanger: true,
          onClick: () => {
            currentPresets = JSON.parse(JSON.stringify(STANDARD_PRESETS));
            expandedPresetIds.clear();
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
            localStorage.removeItem('qld_coc_preset_upgrade_pending');
            pendingPresetUpgrade = false;
            renderPresetChips();
            renderPresetsManager();
            hideUnifiedToast();
            showSimpleToast('Presets replaced with Queensland standards');
          }
        }
      ]
    });
  };

  window.dismissPresetUpgrade = function() {
    localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
    localStorage.removeItem('qld_coc_preset_upgrade_pending');
    pendingPresetUpgrade = false;
    renderPresetsManager();
    showSimpleToast('Existing presets retained');
  };

  window.resetDefaultPresets = function() {
    showUnifiedToast({
      title: 'Reset Presets?',
      desc: 'Reset all work description presets to Queensland standard defaults? Any custom modifications will be replaced.',
      buttons: [
        { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
        {
          text: 'Reset Defaults',
          isPrimary: true,
          isDanger: true,
          onClick: () => {
            currentPresets = JSON.parse(JSON.stringify(STANDARD_PRESETS));
            expandedPresetIds.clear();
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            localStorage.setItem('qld_coc_presets_ver', PRESET_SCHEMA_VERSION);
            localStorage.removeItem('qld_coc_preset_upgrade_pending');
            pendingPresetUpgrade = false;
            renderPresetChips();
            renderPresetsManager();
            hideUnifiedToast();
            showSimpleToast('Presets reset to Queensland standards');
          }
        }
      ]
    });
  };

  window.addNewCustomPreset = function() {
    if (currentPresets.length >= MAX_PRESETS) {
      showUnifiedToast({
        title: 'Maximum Limit Reached',
        desc: `You have reached the maximum limit of ${MAX_PRESETS} presets. Please edit an existing preset or delete one to add a new one.`,
        buttons: [
          { text: 'Got It', isPrimary: true, onClick: hideUnifiedToast }
        ]
      });
      return;
    }

    const newPreset = {
      id: 'custom_' + Date.now(),
      title: 'New Preset',
      text: ''
    };
    currentPresets.push(newPreset);
    expandedPresetIds.add(newPreset.id);

    localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
    renderPresetChips();
    renderPresetsManager();
    showSimpleToast('New preset added (max 15 char title)');

    setTimeout(() => {
      const el = document.getElementById(`presetAccordion-${currentPresets.length - 1}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  // Universal File Download / Share (iOS Safari "Save to Files" compatible)
  async function downloadOrShareFile(blob, filename, title = 'Profile Backup') {
    const file = new File([blob], filename, { type: blob.type || 'application/json' });
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: 'QLD CoC Profile Backup'
        });
        showSimpleToast('Profile backup saved');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Native share failed, falling back to blob download:', err);
      }
    }

    // Desktop fallback / Blob download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    showSimpleToast('Profile backup downloaded');
  }

  // Profile Configuration Backup (Profile + Compressed Logo + Presets; STRICTLY EXCLUDING SIGNATURE & HISTORY)
  window.exportFullConfigurationBackup = function() {
    try {
      const profile = getSavedProfile();
      const logo = localStorage.getItem('qld_coc_custom_logo') || null;
      const presets = currentPresets;

      const backupData = {
        version: '2.0',
        appName: 'KET CoC Generator',
        exportedAt: new Date().toISOString(),
        profile: profile,
        customLogo: logo,
        presets: presets
        // Explicitly excludes signature, client history, and draft for security and privacy
      };

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const backupFilename = `coc_profile_backup_${y}${m}${d}.json`;

      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      downloadOrShareFile(jsonBlob, backupFilename, 'Profile Backup');
    } catch (err) {
      console.error('Export failed:', err);
      showSimpleToast('Failed to export configuration');
    }
  };

  window.importFullConfigurationBackup = function(eOrFile) {
    const file = (eOrFile && eOrFile.target) ? eOrFile.target.files[0] : (eOrFile instanceof File ? eOrFile : null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        
        // 1. If it's a full bundle object
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (data.profile) {
            localStorage.setItem('qld_coc_contractor_profile', JSON.stringify(data.profile));
            initContractorSettings();
          }
          if (data.customLogo) {
            localStorage.setItem('qld_coc_custom_logo', data.customLogo);
            initLogoUpload();
          }
          if (Array.isArray(data.presets)) {
            currentPresets = data.presets.slice(0, MAX_PRESETS).map(p => ({
              id: p.id || ('preset_' + Math.random().toString(16).substring(2, 8)),
              title: String(p.title || 'Preset').substring(0, 15),
              text: String(p.text || '').substring(0, 2000)
            }));
            localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
            renderPresetChips();
            renderPresetsManager();
          }
          updateActiveContractorBadge();
          showSimpleToast('Profile backup imported successfully');
        } else if (Array.isArray(data)) {
          // Backward compatibility: presets-only array
          currentPresets = data.slice(0, MAX_PRESETS).map(p => ({
            id: p.id || ('preset_' + Math.random().toString(16).substring(2, 8)),
            title: String(p.title || 'Preset').substring(0, 15),
            text: String(p.text || '').substring(0, 2000)
          }));
          localStorage.setItem('qld_coc_presets', JSON.stringify(currentPresets));
          renderPresetChips();
          renderPresetsManager();
          showSimpleToast('Presets imported successfully');
        } else {
          showSimpleToast('Invalid backup file');
        }
      } catch (err) {
        console.error('Import failed:', err);
        showSimpleToast('Failed to parse backup JSON file');
      }
    };
    reader.readAsText(file);
    const inputEl = document.getElementById('configImportInput');
    if (inputEl) inputEl.value = '';
    const legacyInputEl = document.getElementById('presetImportInput');
    if (legacyInputEl) legacyInputEl.value = '';
  };

  // Backwards compatibility aliases
  window.exportPresetsBackup = window.exportFullConfigurationBackup;
  window.importPresetsBackup = window.importFullConfigurationBackup;

  // 6. Dates Management & Auto-expanding Description Textarea
  function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function initDates() {
    const today = getLocalDateString();
    const testDateEl = document.getElementById('testDate');
    const noticeDateEl = document.getElementById('noticeDate');

    if (testDateEl && !testDateEl.value) testDateEl.value = today;
    if (noticeDateEl && !noticeDateEl.value) noticeDateEl.value = today;

    // Fallback: If clicked or focused when empty, populate with today's local date
    [testDateEl, noticeDateEl].forEach(el => {
      if (el) {
        el.addEventListener('focus', () => {
          if (!el.value) el.value = getLocalDateString();
        });
      }
    });

    const descField = document.getElementById('workDescription');
    if (descField) {
      descField.addEventListener('input', () => {
        updateDescriptionCounter();
        autoResizeTextarea(descField);
      });
      updateDescriptionCounter();
      autoResizeTextarea(descField);
    }
  }

  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 340) + 'px';
  }

  // Helper to accurately estimate rendered lines combining explicit newlines and soft wrapping
  function estimateDescLines(text) {
    if (!text) return 0;
    const paragraphs = text.split(/\r?\n/);
    let totalLines = 0;
    const CHARS_PER_LINE = 80;
    for (const para of paragraphs) {
      if (para.length === 0) {
        totalLines += 1;
      } else {
        totalLines += Math.max(1, Math.ceil(para.length / CHARS_PER_LINE));
      }
    }
    return totalLines;
  }

  // Dynamic Page Hint & Char Counter below Description (with thousands separators)
  function updateDescriptionCounter() {
    const descField = document.getElementById('workDescription');
    const hintEl = document.getElementById('descPageHint');
    if (!descField || !hintEl) return;

    const text = descField.value || '';
    const lines = estimateDescLines(text);
    const chars = text.length;

    // Dynamic total pages estimation based on multi-page certificate engine:
    // Page 1 takes up to 18 lines. If > 18 lines, Page 1 takes 13 lines.
    // Every continuation page from Page 2 onwards takes up to 41 lines (+ bottom info bar).
    let estPages = 1;
    if (lines > 18) {
      const annexLines = Math.max(0, lines - 13);
      if (annexLines <= 42) {
        estPages = 2;
      } else {
        const intermediate = Math.ceil((annexLines - 42) / 41);
        estPages = 2 + intermediate;
      }
    }

    if (lines > MAX_DESC_LINES) {
      hintEl.textContent = `Exceeds max limit (${lines.toLocaleString()}/${MAX_DESC_LINES.toLocaleString()} lines) | ${chars.toLocaleString()}/${MAX_DESC_CHARS.toLocaleString()} chars`;
      hintEl.className = 'desc-page-hint exceeded';
    } else if (lines > 18) {
      hintEl.textContent = `Multi-page required (${estPages.toLocaleString()} pages | ${lines.toLocaleString()} lines) | ${chars.toLocaleString()}/${MAX_DESC_CHARS.toLocaleString()} chars`;
      hintEl.className = 'desc-page-hint';
    } else {
      hintEl.textContent = `Fits Page 1 (${lines.toLocaleString()} line${lines === 1 ? '' : 's'}) | ${chars.toLocaleString()}/${MAX_DESC_CHARS.toLocaleString()} chars`;
      hintEl.className = 'desc-page-hint';
    }
  }

  // 7. Certificate Type Toggle & Dynamic Statutory Certification
  window.updateCertType = function(val) {
    const cardInstall = document.getElementById('label-type-install');
    const cardEquip = document.getElementById('label-type-equip');
    const legalBox = document.getElementById('legalBox');

    if (val === 'equipment') {
      if (cardInstall) cardInstall.classList.remove('selected');
      if (cardEquip) cardEquip.classList.add('selected');
      if (legalBox) {
        legalBox.innerHTML = '<strong>Certification (Electrical Safety Regulation 2026 s208):</strong><br>I certify that the electrical equipment, to the extent it is affected by the electrical work, is electrically safe.';
      }
    } else {
      if (cardInstall) cardInstall.classList.add('selected');
      if (cardEquip) cardEquip.classList.remove('selected');
      if (legalBox) {
        legalBox.innerHTML = '<strong>Certification (Electrical Safety Regulation 2026 s229):</strong><br>I certify that the electrical installation, to the extent it is affected by the electrical work, has been tested to ensure that it is electrically safe and is in accordance with the requirements of the wiring rules and any other standard applying under the Electrical Safety Regulation 2026 to the electrical installation.';
      }
    }
    saveDraft();
  };

  // 8. Signature Pad State Machine & Lifecycle
  function isCanvasBlank(canvas) {
    if (!canvas) return true;
    try {
      const ctx = canvas.getContext('2d');
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      return !pixelBuffer.some(color => color !== 0);
    } catch (e) {
      return !hasSigned;
    }
  }

  function updateSignatureUI() {
    const box = document.getElementById('signatureBox');
    const overlay = document.getElementById('signatureLockOverlay');
    const modeBtnRow = document.getElementById('sigModeBtnRow');
    const storageBtnRow = document.getElementById('sigStorageBtnRow');
    const btnSaveSig = document.getElementById('btnSaveSig');
    const btnLoadSig = document.getElementById('btnLoadDefaultSig');
    const hasDefault = !!localStorage.getItem('qld_coc_saved_signature');

    if (!box) return;

    if (isSigningMode) {
      // 1. In Active Signing Mode
      box.classList.add('is-active');
      document.body.classList.add('is-signing-mode');
      if (overlay) overlay.style.display = 'none';
      if (modeBtnRow) modeBtnRow.style.display = 'flex';
      if (storageBtnRow) storageBtnRow.style.display = 'none';
    } else {
      // 2. Outside Signing Mode
      box.classList.remove('is-active');
      document.body.classList.remove('is-signing-mode');
      if (modeBtnRow) modeBtnRow.style.display = 'none';

      if (hasSigned && !isCanvasBlank(signaturePadCanvas)) {
        box.classList.add('has-signature');
        if (overlay) overlay.style.display = 'none';
        if (storageBtnRow) storageBtnRow.style.display = 'flex';
        if (btnSaveSig) btnSaveSig.style.display = 'inline-flex';
        if (btnLoadSig) btnLoadSig.style.display = hasDefault ? 'inline-flex' : 'none';
      } else {
        hasSigned = false;
        box.classList.remove('has-signature');
        if (overlay) overlay.style.display = 'flex';
        if (hasDefault) {
          if (storageBtnRow) storageBtnRow.style.display = 'flex';
          if (btnSaveSig) btnSaveSig.style.display = 'none';
          if (btnLoadSig) btnLoadSig.style.display = 'inline-flex';
        } else {
          if (storageBtnRow) storageBtnRow.style.display = 'none';
          if (btnSaveSig) btnSaveSig.style.display = 'none';
          if (btnLoadSig) btnLoadSig.style.display = 'none';
        }
      }
    }
  }

  function initSignaturePad() {
    signaturePadCanvas = document.getElementById('signaturePad');
    if (!signaturePadCanvas) return;

    signaturePadCtx = signaturePadCanvas.getContext('2d');
    resizeSignatureCanvas();

    const savedSig = localStorage.getItem('qld_coc_saved_signature');
    if (savedSig) {
      loadSignatureImage(savedSig);
    } else {
      updateSignatureUI();
    }

    let isDrawing = false;

    const startDrawing = (e) => {
      if (!isSigningMode) return;
      isDrawing = true;
      const pos = getPointerPos(e);
      lastX = pos.x;
      lastY = pos.y;
    };

    const draw = (e) => {
      if (!isSigningMode || !isDrawing) return;
      e.preventDefault();
      const pos = getPointerPos(e);

      signaturePadCtx.beginPath();
      signaturePadCtx.moveTo(lastX, lastY);
      signaturePadCtx.lineTo(pos.x, pos.y);
      signaturePadCtx.strokeStyle = '#0f172a';
      signaturePadCtx.lineWidth = 2.2;
      signaturePadCtx.lineCap = 'round';
      signaturePadCtx.lineJoin = 'round';
      signaturePadCtx.stroke();

      lastX = pos.x;
      lastY = pos.y;
      hasSigned = true;
    };

    const stopDrawing = () => {
      if (isDrawing) {
        isDrawing = false;
        saveDraft();
      }
    };

    signaturePadCanvas.addEventListener('mousedown', startDrawing);
    signaturePadCanvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    signaturePadCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    signaturePadCanvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);
    window.addEventListener('touchcancel', stopDrawing);

    window.addEventListener('resize', () => {
      if (!hasSigned) resizeSignatureCanvas();
    });
  }

  function resizeSignatureCanvas() {
    if (!signaturePadCanvas) return;
    const rect = signaturePadCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    let tempImgData = null;
    if (hasSigned && signaturePadCtx) {
      tempImgData = signaturePadCanvas.toDataURL();
    }

    signaturePadCanvas.width = rect.width * dpr;
    signaturePadCanvas.height = rect.height * dpr;
    signaturePadCtx.scale(dpr, dpr);

    if (tempImgData) {
      loadSignatureImage(tempImgData);
    }
  }

  function getPointerPos(e) {
    const rect = signaturePadCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function loadSignatureImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      if (signaturePadCtx && signaturePadCanvas) {
        const rect = signaturePadCanvas.getBoundingClientRect();
        signaturePadCtx.clearRect(0, 0, rect.width, rect.height);
        signaturePadCtx.drawImage(img, 0, 0, rect.width, rect.height);
        hasSigned = true;
        isSigningMode = false;
        updateSignatureUI();
      }
    };
    img.src = dataUrl;
  }

  window.activateSignaturePad = function() {
    if (isSigningMode) return;
    isSigningMode = true;
    updateSignatureUI();
  };

  window.finishSignature = function() {
    isSigningMode = false;
    if (!hasSigned || isCanvasBlank(signaturePadCanvas)) {
      hasSigned = false;
    }
    updateSignatureUI();
    saveDraft();
  };

  window.deactivateSignaturePad = function() {
    // Only programmatic finish (outside clicks do not deactivate)
    window.finishSignature();
  };

  window.clearSignature = function(inSigningMode = false) {
    if (!signaturePadCanvas || !signaturePadCtx) return;
    const rect = signaturePadCanvas.getBoundingClientRect();
    signaturePadCtx.clearRect(0, 0, rect.width, rect.height);
    hasSigned = false;
    sessionStorage.removeItem('qld_coc_draft_sig');
    saveDraft();

    if (inSigningMode || isSigningMode) {
      // Stay in signing mode, canvas is cleared ready for redraw
      showSimpleToast('Signature cleared');
    } else {
      updateSignatureUI();
      showSimpleToast('Signature cleared');
    }
  };

  window.saveCurrentSignatureToProfile = function() {
    if (!hasSigned || !signaturePadCanvas || isCanvasBlank(signaturePadCanvas)) {
      showSimpleToast('Please draw your signature first');
      return;
    }
    const sigData = signaturePadCanvas.toDataURL('image/png');
    localStorage.setItem('qld_coc_saved_signature', sigData);
    updateSignatureUI();
    showSimpleToast('Signature saved as default');
  };

  window.loadDefaultSignature = function() {
    const savedSig = localStorage.getItem('qld_coc_saved_signature');
    if (savedSig) {
      loadSignatureImage(savedSig);
      saveDraft();
      showSimpleToast('Default signature loaded');
    } else {
      showSimpleToast('No default signature saved yet');
    }
  };

  // 9. Single Address Input Autocomplete (Optimized 200ms debounce)
  let autocompleteDebounce = null;
  function initAddressAutocomplete() {
    const addrInput = document.getElementById('fullAddress');
    const dropdown = document.getElementById('addressDropdown');
    if (!addrInput || !dropdown) return;

    addrInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(autocompleteDebounce);

      if (!window.SuburbService || !window.SuburbService.isQueryReady(query)) {
        dropdown.classList.remove('visible');
        return;
      }

      autocompleteDebounce = setTimeout(async () => {
        try {
          const results = await window.SuburbService.searchAddresses(query, 6);
          dropdown.innerHTML = '';
          if (!results || results.length === 0) {
            dropdown.classList.remove('visible');
            return;
          }

          results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
              <span class="autocomplete-item-street">${escapeHtml(res.mainLine || res.street)}</span>
              <span class="autocomplete-item-sub">${escapeHtml(res.subLine || (res.suburb + ' QLD ' + res.postcode))}</span>
            `;

            item.addEventListener('click', () => {
              setVal('fullAddress', res.formatted);
              dropdown.classList.remove('visible');
              saveDraft();
            });

            dropdown.appendChild(item);
          });

          dropdown.classList.add('visible');
        } catch (err) {
          console.warn('Address autocomplete search error:', err);
          dropdown.classList.remove('visible');
        }
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!addrInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });
  }

  // 10. Form Data Extraction & Draft Saving
  function getFormData() {
    const certTypeEl = document.querySelector('input[name="certType"]:checked');
    const certType = certTypeEl ? certTypeEl.value : 'installation';
    const sigDataUrl = (hasSigned && signaturePadCanvas) ? signaturePadCanvas.toDataURL('image/png') : null;
    const customLogo = localStorage.getItem('qld_coc_custom_logo') || null;
    const fullAddr = getVal('fullAddress');
    const profile = getSavedProfile();

    // Parse single address automatically in background
    let parsedStreet = '';
    let parsedSuburb = '';
    let parsedPostcode = '';
    if (fullAddr && window.SuburbService) {
      const parsed = window.SuburbService.parseAddress(fullAddr);
      parsedStreet = parsed.street || '';
      parsedSuburb = parsed.suburb || '';
      parsedPostcode = parsed.postcode || '';
    }

    return {
      certType,
      customerTitle: getVal('customerTitle'),
      customerGivenName: getVal('customerGivenName'),
      customerSurname: getVal('customerSurname'),
      fullAddress: fullAddr,
      jobReference: getVal('jobReference'),
      customerStreet: parsedStreet,
      customerSuburb: parsedSuburb,
      customerPostcode: parsedPostcode,
      workDescription: getVal('workDescription'),
      testDate: getVal('testDate'),
      noticeDate: getVal('noticeDate'),
      contractorLic: profile.contractorLic || '',
      contractorName: profile.contractorName || '',
      contractorPhone: profile.contractorPhone || '',
      contractorWebsite: profile.contractorWebsite || '',
      testerName: profile.testerName || '',
      testerLicence: profile.testerLicence || '',
      signatureDataUrl: sigDataUrl,
      contractorLogoDataUrl: customLogo,
      deviceToken: getOrCreateDeviceToken()
    };
  }

  function initDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem('qld_coc_current_draft') || '{}');
      if (draft && Object.keys(draft).length > 0) {
        if (draft.certType) {
          const radio = document.querySelector(`input[name="certType"][value="${draft.certType}"]`);
          if (radio) radio.checked = true;
          updateCertType(draft.certType);
        } else {
          updateCertType('installation');
        }
        if (draft.customerTitle) setVal('customerTitle', draft.customerTitle);
        if (draft.customerGivenName) setVal('customerGivenName', draft.customerGivenName);
        if (draft.customerSurname) setVal('customerSurname', draft.customerSurname);
        if (draft.fullAddress) setVal('fullAddress', draft.fullAddress);
        if (draft.jobReference) setVal('jobReference', draft.jobReference);
        if (draft.workDescription) {
          setVal('workDescription', draft.workDescription);
          const descField = document.getElementById('workDescription');
          if (descField) autoResizeTextarea(descField);
          updateDescriptionCounter();
        }
        if (draft.testDate) setVal('testDate', draft.testDate);
        if (draft.noticeDate) setVal('noticeDate', draft.noticeDate);
      } else {
        updateCertType('installation');
      }

      // Restore temporary drawn signature or saved profile default
      if (!hasSigned) {
        const draftSig = sessionStorage.getItem('qld_coc_draft_sig');
        const savedSig = localStorage.getItem('qld_coc_saved_signature');
        if (draftSig) {
          loadSignatureImage(draftSig);
        } else if (savedSig) {
          loadSignatureImage(savedSig);
        }
      }
    } catch (e) {
      updateCertType('installation');
    }

    const form = document.getElementById('cot-form');
    if (form) {
      form.addEventListener('input', () => {
        saveDraft();
      });
    }
  }

  function saveDraft() {
    try {
      const data = getFormData();
      delete data.signatureDataUrl;
      delete data.contractorLogoDataUrl;
      localStorage.setItem('qld_coc_current_draft', JSON.stringify(data));
      if (hasSigned && signaturePadCanvas) {
        sessionStorage.setItem('qld_coc_draft_sig', signaturePadCanvas.toDataURL('image/png'));
      }
    } catch (e) {}
  }

  window.resetForm = function() {
    showUnifiedToast({
      title: 'Clear Form?',
      desc: 'Start a new blank certificate? This will clear customer and testing details while preserving your contractor profile.',
      buttons: [
        { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
        {
          text: 'Clear',
          isPrimary: true,
          isDanger: true,
          onClick: () => {
            localStorage.removeItem('qld_coc_current_draft');
            sessionStorage.removeItem('qld_coc_draft_sig');
            const form = document.getElementById('cot-form');
            if (form) form.reset();
            setVal('jobReference', '');

            initDates();
            window.clearSignature();
            const descEl = document.getElementById('workDescription');
            if (descEl) autoResizeTextarea(descEl);
            updateDescriptionCounter();
            updateCertType('installation');
            updateActiveContractorBadge();
            hideUnifiedToast();
            showSimpleToast('Form reset');
          }
        }
      ]
    });
  };

  // 11. Unified Modal/Toast System for All Alerts
  function showUnifiedToast({ title, desc, listText, buttons }) {
    const toast = document.getElementById('persistentAlertToast');
    const titleEl = document.getElementById('toastTitle');
    const descEl = document.getElementById('toastDesc');
    const listEl = document.getElementById('toastMissingList');
    const btnRow = document.getElementById('toastBtnRow');

    if (!toast) return;

    if (titleEl) titleEl.textContent = title || 'Notice';
    if (descEl) descEl.textContent = desc || '';
    if (listEl) {
      listEl.textContent = listText || '';
      listEl.style.display = listText ? 'block' : 'none';
    }

    if (btnRow) {
      btnRow.innerHTML = '';
      (buttons || []).forEach(b => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = b.isDanger ? 'toast-btn-danger' : (b.isPrimary ? 'toast-btn-primary' : 'toast-btn-alt');
        btn.textContent = b.text;
        btn.addEventListener('click', b.onClick);
        btnRow.appendChild(btn);
      });
    }

    toast.classList.add('visible');
  }

  function hideUnifiedToast() {
    const toast = document.getElementById('persistentAlertToast');
    if (toast) toast.classList.remove('visible');
  }

  // 12. Soft Validation & Check Contractor Profile
  function checkMissingMandatoryFields(data) {
    const missing = [];
    if (!data.customerGivenName && !data.customerSurname) missing.push('Customer Name');
    if (!data.fullAddress) missing.push('Installation Address');
    if (!data.workDescription) missing.push('Work Description');
    if (!data.testDate) missing.push('Date of Test');
    return missing;
  }

  window.handleGenerateAction = function() {
    saveDraft();
    startPdfProcess();
  };

  // Backwards compatibility aliases
  window.handleDownloadAction = window.handleGenerateAction;
  window.handleShareAction = window.handleGenerateAction;

  function checkNonEnglishInputs(data) {
    const nonLatinRegex = /[\u{4E00}-\u{9FFF}\u{3040}-\u{30FF}\u{AC00}-\u{D7AF}\u{0600}-\u{06FF}\u{0400}-\u{04FF}]/u;
    const testFields = [
      data.customerGivenName,
      data.customerSurname,
      data.fullAddress,
      data.jobReference,
      data.workDescription
    ];
    return testFields.some(txt => txt && nonLatinRegex.test(txt));
  }

  function startPdfProcess() {
    // 1. First ensure contractor licence number is configured
    const profile = getSavedProfile();
    if (!profile.contractorLic) {
      showUnifiedToast({
        title: 'Licence Required',
        desc: 'Please configure your Contractor Licence Number in your Profile before generating certificates.',
        buttons: [
          { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
          {
            text: 'Open Profile',
            isPrimary: true,
            onClick: () => {
              hideUnifiedToast();
              window.switchTab('profile');
            }
          }
        ]
      });
      return;
    }

    const data = getFormData();

    // 2. Description Limit Boundary Check (10,000 lines)
    const descLines = estimateDescLines(data.workDescription);
    if (descLines > MAX_DESC_LINES) {
      showUnifiedToast({
        title: 'Description Limit Exceeded',
        desc: `Your test details span ${descLines.toLocaleString()} lines, exceeding the maximum allowed limit of ${MAX_DESC_LINES.toLocaleString()} lines. Please condense the description or attach an external testing schedule.`,
        buttons: [
          {
            text: 'Review Description',
            isPrimary: true,
            onClick: () => {
              hideUnifiedToast();
              const descEl = document.getElementById('workDescription');
              if (descEl) {
                descEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                descEl.focus();
              }
            }
          }
        ]
      });
      return;
    }

    // 3. English Statutory Compliance Check
    if (checkNonEnglishInputs(data)) {
      showUnifiedToast({
        title: 'English Required for ESO Compliance',
        desc: 'Queensland Electrical Safety Regulation 2026 certificates are official statutory legal documents and must be completed in English. Non-English characters were detected.',
        listText: 'Please review client name, address, or work description fields.',
        buttons: [
          { text: 'Review Form', isPrimary: false, onClick: hideUnifiedToast },
          {
            text: 'Proceed Anyway',
            isPrimary: true,
            onClick: () => {
              hideUnifiedToast();
              checkMandatoryFieldsAndProceed(data);
            }
          }
        ]
      });
      return;
    }

    checkMandatoryFieldsAndProceed(data);
  }

  function checkMandatoryFieldsAndProceed(data) {
    // 3. Check Customer & Job Mandatory Fields
    const missing = checkMissingMandatoryFields(data);
    if (missing.length > 0) {
      showUnifiedToast({
        title: 'Mandatory Fields Missing',
        desc: 'Under Queensland ESO regulations, some required fields are blank. You can still proceed to generate or review the form.',
        listText: 'Missing: ' + missing.join(', '),
        buttons: [
          {
            text: 'Review Form',
            isPrimary: false,
            onClick: () => {
              hideUnifiedToast();
              focusFirstMissingField(data);
            }
          },
          {
            text: 'Proceed Anyway',
            isPrimary: true,
            onClick: () => {
              hideUnifiedToast();
              checkNoticeDateAndProceed(data);
            }
          }
        ]
      });
      return;
    }

    checkNoticeDateAndProceed(data);
  }

  // Check Date notice given and future test date compliance
  function checkNoticeDateAndProceed(data) {
    const today = getLocalDateString();
    if (data.testDate && data.testDate > today) {
      showUnifiedToast({
        title: 'Future Test Date Warning',
        desc: `Date of test (${data.testDate}) is in the future. Under Queensland ESO regulations, electrical testing must be physically completed prior to certification.`,
        buttons: [
          {
            text: 'Review Date',
            isPrimary: false,
            onClick: () => {
              hideUnifiedToast();
              const testDateEl = document.getElementById('testDate');
              if (testDateEl) {
                testDateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                testDateEl.focus();
              }
            }
          },
          {
            text: 'Proceed Anyway',
            isPrimary: true,
            onClick: () => {
              hideUnifiedToast();
              proceedAfterTestDateCheck(data);
            }
          }
        ]
      });
      return;
    }
    proceedAfterTestDateCheck(data);
  }

  function proceedAfterTestDateCheck(data) {
    if (data.noticeDate && data.testDate && data.noticeDate < data.testDate) {
      showUnifiedToast({
        title: 'Notice Date Earlier than Test Date',
        desc: `Date notice given (${data.noticeDate}) is earlier than Date of test (${data.testDate}). Under Queensland ESO regulations, compliance notice is given on or after testing.`,
        buttons: [
          {
            text: 'Review Date',
            isPrimary: false,
            onClick: () => {
              hideUnifiedToast();
              const noticeDateEl = document.getElementById('noticeDate');
              if (noticeDateEl) {
                noticeDateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                noticeDateEl.focus();
              }
            }
          },
          {
            text: 'Proceed Anyway',
            isPrimary: true,
            onClick: () => {
              hideUnifiedToast();
              executePdfAction(data);
            }
          }
        ]
      });
      return;
    }

    executePdfAction(data);
  }

  function focusFirstMissingField(data) {
    let target = null;
    if (!data.customerGivenName && !data.customerSurname) target = document.getElementById('customerGivenName');
    else if (!data.fullAddress) target = document.getElementById('fullAddress');
    else if (!data.workDescription) target = document.getElementById('workDescription');

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus();
    }
  }

  async function executePdfAction(data) {
    const btnGenerate = document.getElementById('btn-generate-main') || document.getElementById('btn-download-main');
    const origText = btnGenerate ? btnGenerate.textContent : 'Generate Certificate (PDF)';

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      if (btnGenerate) {
        btnGenerate.disabled = true;
        btnGenerate.textContent = 'Generating PDF...';
      }

      const result = await window.CotPdfGenerator.generatePdf(data);

      // Save to History (De-duplicated)
      saveRecordToHistory(data, result.filename);

      if (isMobile) {
        // On iOS / mobile devices, native share sheet provides "Save to Files" without blank popups
        await window.CotPdfGenerator.sharePdf(
          result.blob,
          result.filename,
          `CoC - ${data.customerSurname || data.fullAddress || 'Certificate'}`
        );
        showSimpleToast('Certificate generated');
      } else {
        window.CotPdfGenerator.downloadBlob(result.blob, result.filename);
        showSimpleToast('Certificate downloaded');
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
      showUnifiedToast({
        title: 'Generation Failed',
        desc: 'Failed to generate PDF: ' + err.message,
        buttons: [{ text: 'OK', isPrimary: true, onClick: hideUnifiedToast }]
      });
    } finally {
      if (btnGenerate) {
        btnGenerate.disabled = false;
        btnGenerate.textContent = origText;
      }
    }
  }

  // 13. History Management (Recent 30 records, Suburb Truncated)
  function getAddressSuburb(fullAddr) {
    if (!fullAddr) return 'Queensland';
    if (window.SuburbService) {
      const parsed = window.SuburbService.parseAddress(fullAddr);
      if (parsed && parsed.suburb) return parsed.suburb;
    }
    const parts = fullAddr.split(',');
    if (parts.length >= 2) return parts[1].trim();
    return fullAddr;
  }

  function initHistory() {
    try {
      historyRecords = JSON.parse(localStorage.getItem('qld_coc_history') || '[]');
    } catch (e) {
      historyRecords = [];
    }
    updateHistoryCount();
  }

  function saveRecordToHistory(data, filename) {
    const custName = [data.customerGivenName, data.customerSurname].filter(Boolean).join(' ').trim();
    const addr = (data.fullAddress || '').trim();
    const testD = data.testDate || new Date().toISOString().split('T')[0];
    const suburb = addr ? getAddressSuburb(addr) : '';
    const nowTimestamp = new Date().toLocaleString();

    // Check if an existing record has exact matching form contents
    const dupIndex = historyRecords.findIndex(r => {
      const d = r.data;
      if (!d) return false;
      return (
        (d.certType || '') === (data.certType || '') &&
        (d.customerTitle || '') === (data.customerTitle || '') &&
        (d.customerGivenName || '') === (data.customerGivenName || '') &&
        (d.customerSurname || '') === (data.customerSurname || '') &&
        (d.fullAddress || '') === (data.fullAddress || '') &&
        (d.jobReference || '') === (data.jobReference || '') &&
        (d.workDescription || '').trim() === (data.workDescription || '').trim() &&
        (d.testDate || '') === (data.testDate || '') &&
        (d.noticeDate || '') === (data.noticeDate || '')
      );
    });

    let recordId;
    if (dupIndex >= 0) {
      recordId = historyRecords[dupIndex].id;
      historyRecords.splice(dupIndex, 1);
    } else {
      recordId = 'REC_' + Date.now();
    }

    const record = {
      id: recordId,
      date: testD,
      customer: custName,
      address: addr,
      suburb: suburb,
      certType: data.certType,
      data: {
        certType: data.certType,
        customerTitle: data.customerTitle || '',
        customerGivenName: data.customerGivenName || '',
        customerSurname: data.customerSurname || '',
        fullAddress: data.fullAddress || '',
        jobReference: data.jobReference || '',
        workDescription: data.workDescription || '',
        testDate: data.testDate || '',
        noticeDate: data.noticeDate || ''
      },
      filename: filename,
      savedAt: nowTimestamp
    };

    historyRecords.unshift(record);
    // Limit to recent 30 records (FIFO auto-retention)
    if (historyRecords.length > 30) historyRecords.pop();
    localStorage.setItem('qld_coc_history', JSON.stringify(historyRecords));
    updateHistoryCount();
  }

  function updateHistoryCount() {
    const el = document.getElementById('history-count');
    if (el) el.textContent = historyRecords.length;
    const countEl = document.getElementById('historyRecordsCount');
    if (countEl) countEl.textContent = `${historyRecords.length}/30`;
  }

  function renderHistoryList() {
    initHistory();
    updateHistoryCount();
    const container = document.getElementById('historyRecordsList');
    if (!container) return;
    container.innerHTML = '';

    if (historyRecords.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--color-muted);">No generated certificates yet. Certificates created on this device will appear here.</div>';
      return;
    }

    historyRecords.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const custName = (rec.customer || [rec.data?.customerGivenName, rec.data?.customerSurname].filter(Boolean).join(' ')).trim();
      const addr = (rec.address || rec.data?.fullAddress || '').trim();
      const suburb = rec.suburb || (addr ? getAddressSuburb(addr) : '');
      const ref = (rec.data?.jobReference || '').trim();

      // 4-Way Smart Title Display:
      // 1. Neither: "Job" (or "Job — REF" if ref exists)
      // 2. Name only: "[Name]"
      // 3. Address only: "[Suburb]" (no "Customer —")
      // 4. Both: "[Name] — [Suburb]"
      let displayTitle = '';
      if (!custName && !addr) {
        displayTitle = ref ? `Job — ${ref}` : 'Job';
      } else if (custName && !addr) {
        displayTitle = custName;
      } else if (!custName && addr) {
        displayTitle = suburb || 'Queensland';
      } else {
        displayTitle = `${custName} — ${suburb || 'Queensland'}`;
      }

      item.innerHTML = `
        <div>
          <div class="history-info-title">${escapeHtml(displayTitle)}</div>
          <div class="history-info-meta">
            <div class="history-meta-filename">${escapeHtml(rec.filename)}</div>
            <div class="history-meta-time">${escapeHtml(rec.savedAt || rec.date)}</div>
          </div>
        </div>
        <div class="history-actions">
          <button type="button" class="btn-brand-sm" onclick="window.loadHistoryRecord('${rec.id}')">Load</button>
          <button type="button" class="btn-danger-sm" onclick="window.deleteHistoryRecord(${idx})">Delete</button>
        </div>
      `;
      container.appendChild(item);
    });
  }

  // Safe History Re-fill: fills customer and test details WITHOUT overwriting active settings
  window.loadHistoryRecord = function(id) {
    initHistory();
    const rec = historyRecords.find(r => r.id === id);
    if (!rec) return;

    const d = rec.data || {
      certType: rec.certType,
      customerGivenName: rec.customer.split(' ')[0] || '',
      customerSurname: rec.customer.split(' ').slice(1).join(' ') || '',
      fullAddress: rec.address,
      jobReference: '',
      testDate: rec.date,
      noticeDate: rec.date
    };

    if (d.certType) {
      const radio = document.querySelector(`input[name="certType"][value="${d.certType}"]`);
      if (radio) radio.checked = true;
      updateCertType(d.certType);
    }
    setVal('customerTitle', d.customerTitle || '');
    setVal('customerGivenName', d.customerGivenName || '');
    setVal('customerSurname', d.customerSurname || '');
    setVal('fullAddress', d.fullAddress || '');
    setVal('jobReference', d.jobReference || '');
    setVal('workDescription', d.workDescription || '');
    setVal('testDate', d.testDate || '');
    setVal('noticeDate', d.noticeDate || '');

    const descEl = document.getElementById('workDescription');
    if (descEl) autoResizeTextarea(descEl);
    updateDescriptionCounter();

    window.switchTab('form');
    saveDraft();
    showSimpleToast('Loaded certificate details');
  };

  window.deleteHistoryRecord = function(index) {
    showUnifiedToast({
      title: 'Delete Certificate Record?',
      desc: `Delete record for ${historyRecords[index].customer}?`,
      buttons: [
        { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
        {
          text: 'Delete',
          isPrimary: true,
          isDanger: true,
          onClick: () => {
            historyRecords.splice(index, 1);
            localStorage.setItem('qld_coc_history', JSON.stringify(historyRecords));
            updateHistoryCount();
            renderHistoryList();
            hideUnifiedToast();
            showSimpleToast('Record deleted');
          }
        }
      ]
    });
  };

  window.clearAllHistory = function() {
    showUnifiedToast({
      title: 'Clear All History?',
      desc: 'Permanently remove all certificate history records on this device?',
      buttons: [
        { text: 'Cancel', isPrimary: false, onClick: hideUnifiedToast },
        {
          text: 'Clear All',
          isPrimary: true,
          isDanger: true,
          onClick: () => {
            historyRecords = [];
            localStorage.removeItem('qld_coc_history');
            updateHistoryCount();
            renderHistoryList();
            hideUnifiedToast();
            showSimpleToast('History cleared');
          }
        }
      ]
    });
  };

  // 14. First-Time Welcome Modal & Returning User Update Notice
  function initWelcomeOrUpdateModal() {
    const hasDismissedWelcome = localStorage.getItem('qld_coc_welcome_dismissed') === 'true';
    const hasExistingData = Boolean(localStorage.getItem('qld_coc_contractor_profile')) ||
                            Boolean(localStorage.getItem('qld_coc_history'));
    const isReturningUser = hasDismissedWelcome || hasExistingData;
    const lastSeenVersion = localStorage.getItem('qld_coc_last_seen_version');

    if (!isReturningUser) {
      // First-time user: display Welcome Modal
      const welcomeModal = document.getElementById('welcomeModal');
      if (welcomeModal) welcomeModal.style.display = 'flex';
    } else if (lastSeenVersion !== CURRENT_APP_VERSION) {
      // Returning user who hasn't seen this version: display Update Modal
      const updateModal = document.getElementById('updateModal');
      if (updateModal) updateModal.style.display = 'flex';
    }
  }

  window.closeWelcomeModal = function() {
    localStorage.setItem('qld_coc_welcome_dismissed', 'true');
    localStorage.setItem('qld_coc_last_seen_version', CURRENT_APP_VERSION);
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.style.display = 'none';
  };

  window.closeUpdateModal = function() {
    localStorage.setItem('qld_coc_last_seen_version', CURRENT_APP_VERSION);
    const modal = document.getElementById('updateModal');
    if (modal) modal.style.display = 'none';
    if (pendingPresetUpgrade) {
      window.switchTab('profile');
      showSimpleToast('Review new Queensland standard presets below');
    }
  };

  window.openUpdateModal = function() {
    const modal = document.getElementById('updateModal');
    if (modal) modal.style.display = 'flex';
  };

  // 15. Utilities
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  let toastTimer = null;
  function showSimpleToast(msg, duration = 2500) {
    let toast = document.getElementById('simpleToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'simpleToast';
      toast.className = 'simple-toast';
      toast.setAttribute('role', 'alert');
      document.body.appendChild(toast);
    }
    toast.onclick = () => {
      toast.classList.remove('visible');
      if (toastTimer) clearTimeout(toastTimer);
    };
    toast.textContent = msg;

    // Viewport & Keyboard-aware bottom positioning:
    // When virtual keyboard opens, visualViewport shrinks.
    // Toast floats 24px above keyboard or 24px above screen bottom.
    if (window.visualViewport) {
      const keyboardHeight = Math.max(0, window.innerHeight - (window.visualViewport.offsetTop + window.visualViewport.height));
      const bottomOffset = Math.max(24, keyboardHeight + 24);
      toast.style.bottom = `${bottomOffset}px`;
      toast.style.top = 'auto';
    } else {
      toast.style.bottom = '24px';
      toast.style.top = 'auto';
    }

    toast.classList.add('visible');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (!toast.classList.contains('visible')) {
          toast.textContent = '';
        }
      }, 300);
    }, duration);
  }

  window.showSimpleToast = showSimpleToast;
  window.getFormData = getFormData;
  window.initPresets = initPresets;
  window.getSavedProfile = getSavedProfile;
  window.getCurrentPresets = () => currentPresets;

})();
