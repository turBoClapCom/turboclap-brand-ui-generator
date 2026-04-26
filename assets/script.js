const state = {
    brand: null,
    tailwindConfig: '',
    cssVariables: '',
    defaultSample: '',
    currentDevice: 'mobile',
    previewReady: false,
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch((error) => {
        setError(error.message || 'Unable to initialize the app.');
    });
});

document.addEventListener('submit', (event) => {
    if (event.target.closest('.brand-form-preview')) {
        event.preventDefault();
    }
});

/**
 * Cache DOM references and boot the default preview.
 */
async function initializeApp() {
    cacheElements();
    state.defaultSample = elements.jsonInput.value;
    bindEvents();
    setDeviceMode(state.currentDevice);
    toggleExportUtilities(false);
    toggleScreenshotAvailability(false);
    await requestBrandPreview('preview');
}

/**
 * Store the elements used throughout the UI.
 */
function cacheElements() {
    elements.jsonInput = document.getElementById('json-input');
    elements.jsonFile = document.getElementById('json-file');
    elements.generateButton = document.getElementById('generate-button');
    elements.exportButton = document.getElementById('export-button');
    elements.resetSample = document.getElementById('reset-sample');
    elements.errorBox = document.getElementById('error-box');
    elements.previewRoot = document.getElementById('preview-root');
    elements.tailwindOutput = document.getElementById('tailwind-output');
    elements.cssOutput = document.getElementById('css-output');
    elements.copyTailwind = document.getElementById('copy-tailwind');
    elements.downloadTailwind = document.getElementById('download-tailwind');
    elements.copyCss = document.getElementById('copy-css');
    elements.downloadCss = document.getElementById('download-css');
    elements.statusBadge = document.getElementById('status-badge');
    elements.statusText = document.getElementById('status-text');
    elements.exportResult = document.getElementById('export-result');
    elements.deviceStage = document.getElementById('device-stage');
    elements.deviceToggles = Array.from(document.querySelectorAll('.device-toggle'));
    elements.screenshotButton = document.getElementById('screenshot-button');
}

/**
 * Register interactive behavior for the page.
 */
function bindEvents() {
    elements.generateButton.addEventListener('click', () => {
        requestBrandPreview('preview').catch(handleAsyncError);
    });

    elements.exportButton.addEventListener('click', () => {
        requestBrandPreview('export').catch(handleAsyncError);
    });

    elements.resetSample.addEventListener('click', () => {
        elements.jsonInput.value = state.defaultSample;
        hideExportMessage();
        requestBrandPreview('preview').catch(handleAsyncError);
    });

    elements.jsonFile.addEventListener('change', handleFileUpload);
    elements.screenshotButton.addEventListener('click', () => {
        capturePreviewScreenshot().catch(handleAsyncError);
    });

    document.addEventListener('click', handleDocumentClick);

    document.querySelectorAll('[data-example]').forEach((button) => {
        button.addEventListener('click', () => {
            loadExample(button.dataset.example || '').catch(handleAsyncError);
        });
    });

    elements.copyTailwind.addEventListener('click', () => {
        copyText(state.tailwindConfig, 'Tailwind config copied.').catch(handleAsyncError);
    });

    elements.copyCss.addEventListener('click', () => {
        copyText(state.cssVariables, 'CSS variables copied.').catch(handleAsyncError);
    });

    elements.downloadTailwind.addEventListener('click', () => {
        downloadTextFile(buildFileName('tailwind.config.js'), state.tailwindConfig, 'application/javascript');
        setStatus('Tailwind config downloaded.', 'success');
    });

    elements.downloadCss.addEventListener('click', () => {
        downloadTextFile(buildFileName('brand-tokens.css'), state.cssVariables, 'text/css');
        setStatus('CSS variables downloaded.', 'success');
    });

    elements.deviceToggles.forEach((button) => {
        button.addEventListener('click', () => {
            setDeviceMode(button.dataset.device || 'mobile');
        });
    });
}

/**
 * Read the selected JSON file into the editor and trigger a preview refresh.
 */
async function handleFileUpload(event) {
    const [file] = event.target.files || [];

    if (!file) {
        return;
    }

    const fileText = await file.text();
    elements.jsonInput.value = fileText;
    hideExportMessage();
    setStatus(`Loaded ${file.name}.`, 'idle');
    await requestBrandPreview('preview');
}

/**
 * Load a bundled example file into the editor.
 */
async function loadExample(path) {
    if (!path) {
        return;
    }

    setStatus('Loading example JSON...', 'working');

    const response = await fetch(path, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error('Unable to load the selected example.');
    }

    elements.jsonInput.value = await response.text();
    hideExportMessage();
    await requestBrandPreview('preview');
}

/**
 * Catch promise rejections from UI events and surface them cleanly.
 */
function handleAsyncError(error) {
    setError(error.message || 'An unexpected error occurred.');
}

/**
 * Parse the editor contents before sending anything to the API.
 */
function readEditorPayload() {
    const raw = elements.jsonInput.value.trim();

    if (!raw) {
        throw new Error('Paste a brand JSON payload before submitting.');
    }

    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error('Invalid JSON. Fix the syntax and try again.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON payload must be an object.');
    }

    if (!parsed.brand || typeof parsed.brand !== 'object' || Array.isArray(parsed.brand)) {
        throw new Error('JSON payload must include a top-level brand object.');
    }

    return parsed;
}

/**
 * Send the current payload to the server and refresh the UI.
 */
async function requestBrandPreview(action) {
    clearError();
    hideExportMessage();
    setLoadingState(true, action);

    try {
        const payload = readEditorPayload();
        payload.action = action;

        const response = await fetch('api/parse.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await safeJson(response);

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Unable to process the brand payload.');
        }

        renderServerResult(result, action);
    } finally {
        setLoadingState(false, action);
    }
}

/**
 * Decode a JSON response while preserving server-side errors.
 */
async function safeJson(response) {
    try {
        return await response.json();
    } catch (error) {
        throw new Error('Server returned an invalid response.');
    }
}

/**
 * Update the UI with the latest validated brand payload.
 */
function renderServerResult(result, action) {
    state.brand = result.data;
    state.tailwindConfig = result.tailwind_config || '';
    state.cssVariables = result.css_variables || '';
    state.previewReady = Boolean(result.preview_html);

    elements.previewRoot.innerHTML = result.preview_html || '';
    elements.tailwindOutput.textContent = state.tailwindConfig || 'No Tailwind export available.';
    elements.cssOutput.textContent = state.cssVariables || 'No CSS variable export available.';

    applyPreviewTheme();
    attachPreviewMediaFallbacks();
    toggleExportUtilities(Boolean(state.tailwindConfig && state.cssVariables));
    toggleScreenshotAvailability(state.previewReady);

    if (result.export) {
        showExportMessage(result.export);
        setStatus(`Generated preview and saved ${result.export.fileName}.`, 'success');
        return;
    }

    const brandName = state.brand?.name || 'brand';
    setStatus(`Generated preview for ${brandName}.`, action === 'preview' ? 'success' : 'idle');
}

/**
 * Attach graceful fallbacks for preview images.
 */
function attachPreviewMediaFallbacks() {
    elements.previewRoot.querySelectorAll('.brand-logo-image').forEach((image) => {
        image.addEventListener(
            'error',
            () => {
                const frame = image.closest('.brand-logo-frame');

                if (frame) {
                    frame.classList.add('is-fallback');
                }

                image.remove();
            },
            { once: true }
        );
    });

    elements.previewRoot.querySelectorAll('.brand-hero-image').forEach((image) => {
        image.addEventListener(
            'error',
            () => {
                image.src = buildImageFallbackDataUrl('Brand Preview');
            },
            { once: true }
        );
    });
}

/**
 * Switch the preview shell between mobile, tablet, and desktop frames.
 */
function setDeviceMode(device) {
    const nextDevice = ['mobile', 'tablet', 'desktop'].includes(device) ? device : 'mobile';
    state.currentDevice = nextDevice;

    if (elements.deviceStage) {
        elements.deviceStage.dataset.device = nextDevice;
    }

    elements.deviceToggles.forEach((button) => {
        const isActive = (button.dataset.device || '') === nextDevice;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

/**
 * Enable or disable the screenshot control based on preview availability.
 */
function toggleScreenshotAvailability(enabled) {
    elements.screenshotButton.disabled = !enabled;
}

/**
 * Handle copy buttons and component interactions rendered in the live preview.
 */
function handleDocumentClick(event) {
    const copyButton = event.target.closest('.copy-hex-button');
    const tabButton = event.target.closest('.brand-tab-trigger');
    const accordionButton = event.target.closest('.brand-accordion-trigger');

    if (tabButton) {
        event.preventDefault();
        activateBrandTab(tabButton);
        return;
    }

    if (accordionButton) {
        event.preventDefault();
        toggleAccordionItem(accordionButton);
        return;
    }

    if (!copyButton) {
        return;
    }

    event.preventDefault();
    copyText(copyButton.dataset.copy || '', 'Color value copied.')
        .then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied';
            window.setTimeout(() => {
                copyButton.textContent = originalText;
            }, 1200);
        })
        .catch(handleAsyncError);
}

/**
 * Push the current brand colors into the device screen for themed scrollbars.
 */
function applyPreviewTheme() {
    if (!elements.previewRoot || !elements.previewRoot.firstElementChild) {
        return;
    }

    const previewShell = elements.previewRoot.firstElementChild;
    const style = window.getComputedStyle(previewShell);

    elements.previewRoot.style.setProperty('--primary', style.getPropertyValue('--primary').trim() || '#4f46e5');
    elements.previewRoot.style.setProperty('--secondary', style.getPropertyValue('--secondary').trim() || '#22c55e');
}

/**
 * Capture the current preview mode as a Full HD PNG download.
 */
async function capturePreviewScreenshot() {
    if (!state.previewReady || !elements.deviceStage) {
        throw new Error('Generate a preview before taking a screenshot.');
    }

    const targetWidth = 1920;
    const targetHeight = 1080;

    setStatus('Preparing Full HD screenshot...', 'working');
    toggleScreenshotAvailability(false);

    try {
        const svgMarkup = buildBrandedScreenshotSvg(state.brand || {}, state.currentDevice, targetWidth, targetHeight);
        const imageBlob = await rasterizeSvgMarkup(svgMarkup, targetWidth, targetHeight);

        downloadBlob(buildFileName(`${state.currentDevice}-preview.png`), imageBlob);
        setStatus('Full HD screenshot downloaded.', 'success');
    } finally {
        toggleScreenshotAvailability(state.previewReady);
    }
}

/**
 * Build a dedicated vector screenshot so the export never depends on tainted DOM content.
 */
function buildBrandedScreenshotSvg(brand, device, width, height) {
    const colors = {
        primary: brand.colors?.primary || '#4F46E5',
        secondary: brand.colors?.secondary || '#22C55E',
        accent: brand.colors?.accent || '#F59E0B',
        background: brand.colors?.background || '#FFFFFF',
        text: brand.colors?.text || '#111827',
    };
    const name = brand.name || 'Brand Preview';
    const tagline = brand.tagline || 'Polished brand system preview';
    const headingFont = brand.fonts?.heading || 'Poppins';
    const bodyFont = brand.fonts?.body || 'Inter';
    const contactEmail = brand.contact?.email || 'hello@brand.com';
    const contactPhone = brand.contact?.phone || '+91 12345 67890';
    const initials = buildInitials(name);
    const deviceLabel = `${device.charAt(0).toUpperCase()}${device.slice(1)} Preview`;
    const spec = getScreenshotDeviceSpec(device);
    const screen = {
        x: spec.x + spec.bezel,
        y: spec.y + spec.screenTopInset,
        width: spec.width - (spec.bezel * 2),
        height: spec.height - spec.screenTopInset - spec.screenBottomInset,
        radius: spec.screenRadius,
    };
    const titleLines = wrapTextForSvg(name, device === 'mobile' ? 12 : 20, 2);
    const taglineLines = wrapTextForSvg(tagline, device === 'desktop' ? 38 : 24, 3);
    const paletteMarkup = buildScreenshotPaletteMarkup(colors, screen, device);
    const screenMarkup = buildScreenshotScreenMarkup(screen, device, {
        colors,
        name,
        titleLines,
        taglineLines,
        headingFont,
        bodyFont,
        contactEmail,
        contactPhone,
        initials,
    });
    const standMarkup = device === 'desktop'
        ? `
            <rect x="${spec.x + (spec.width / 2) - 92}" y="${spec.y + spec.height + 14}" width="184" height="18" rx="9" fill="#64748B" opacity="0.28"/>
            <rect x="${spec.x + (spec.width / 2) - 18}" y="${spec.y + spec.height - 8}" width="36" height="38" rx="12" fill="#475569" opacity="0.42"/>
        `
        : '';

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
        <linearGradient id="posterBg" x1="120" y1="80" x2="1780" y2="1040" gradientUnits="userSpaceOnUse">
            <stop stop-color="#F8FAFF"/>
            <stop offset="1" stop-color="#E9EFFD"/>
        </linearGradient>
        <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${colors.primary}"/>
            <stop offset="100%" stop-color="${colors.secondary}"/>
        </linearGradient>
        <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${colors.primary}"/>
            <stop offset="100%" stop-color="${colors.accent}"/>
        </linearGradient>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#posterBg)"/>
    <circle cx="240" cy="170" r="160" fill="${hexToRgba(colors.primary, 0.12)}"/>
    <circle cx="1720" cy="220" r="190" fill="${hexToRgba(colors.secondary, 0.12)}"/>
    <circle cx="1600" cy="920" r="220" fill="${hexToRgba(colors.accent, 0.10)}"/>

    <text x="96" y="110" fill="#64748B" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="3.2">FULL HD BRAND PREVIEW</text>
    <text x="96" y="168" fill="#0F172A" font-family="Arial, sans-serif" font-size="52" font-weight="800">${escapeXml(name)}</text>
    <text x="96" y="214" fill="#475569" font-family="Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(tagline)}</text>

    <rect x="1560" y="76" width="264" height="54" rx="27" fill="#FFFFFF" opacity="0.92"/>
    <text x="1692" y="111" text-anchor="middle" fill="#0F172A" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(deviceLabel)}</text>

    <rect x="${spec.x}" y="${spec.y}" width="${spec.width}" height="${spec.height}" rx="${spec.radius}" fill="#0F172A"/>
    <rect x="${spec.x + 8}" y="${spec.y + 8}" width="${spec.width - 16}" height="${spec.height - 16}" rx="${Math.max(spec.radius - 8, 12)}" fill="#1E293B"/>
    ${spec.hardware}
    <rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" fill="${colors.background}"/>
    ${screenMarkup}
    ${paletteMarkup}
    ${standMarkup}

    <text x="96" y="1012" fill="#64748B" font-family="Arial, sans-serif" font-size="20" font-weight="600">Generated from TurboClap Brand UI Generator</text>
</svg>`;
}

/**
 * Build the main layout inside the device screen.
 */
function buildScreenshotScreenMarkup(screen, device, data) {
    const pad = device === 'desktop' ? 34 : 26;
    const gap = 18;
    const isMobile = device === 'mobile';
    const isDesktop = device === 'desktop';
    const titleMarkup = renderSvgTextLines(data.titleLines, screen.x + pad + 24, screen.y + pad + 88, 54);
    const taglineMarkup = renderSvgTextLines(data.taglineLines, screen.x + pad + 24, screen.y + pad + 150, 28);

    if (isMobile) {
        const copyX = screen.x + pad;
        const copyY = screen.y + pad;
        const copyWidth = screen.width - (pad * 2);
        const mediaY = copyY + 236;
        const paletteY = mediaY + 188;
        const summaryY = paletteY + 170;

        return `
            <rect x="${copyX}" y="${copyY}" width="${copyWidth}" height="218" rx="28" fill="#FFFFFF" opacity="0.94"/>
            <rect x="${copyX + 24}" y="${copyY + 22}" width="160" height="30" rx="15" fill="${hexToRgba(data.colors.primary, 0.12)}"/>
            <text x="${copyX + 104}" y="${copyY + 42}" text-anchor="middle" fill="${data.colors.primary}" font-family="Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="1.2">BRAND SYSTEM</text>
            <text x="${copyX + 24}" y="${copyY + 88}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="38" font-weight="800">${titleMarkup}</text>
            <text x="${copyX + 24}" y="${copyY + 150}" fill="#475569" font-family="Arial, sans-serif" font-size="20" font-weight="500">${taglineMarkup}</text>
            <rect x="${copyX + 24}" y="${copyY + 170}" width="154" height="40" rx="20" fill="url(#brandGradient)"/>
            <rect x="${copyX + 190}" y="${copyY + 170}" width="132" height="40" rx="20" fill="#F8FAFC" stroke="#CBD5E1"/>
            <text x="${copyX + 101}" y="${copyY + 196}" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="16" font-weight="700">Primary</text>
            <text x="${copyX + 256}" y="${copyY + 196}" text-anchor="middle" fill="#0F172A" font-family="Arial, sans-serif" font-size="16" font-weight="700">Secondary</text>

            <rect x="${copyX}" y="${mediaY}" width="${copyWidth}" height="170" rx="28" fill="url(#brandGradient)"/>
            <rect x="${copyX + 16}" y="${mediaY + 16}" width="${copyWidth - 32}" height="138" rx="22" fill="rgba(255,255,255,0.18)"/>
            <circle cx="${copyX + 66}" cy="${mediaY + 58}" r="26" fill="#FFFFFF" opacity="0.88"/>
            <text x="${copyX + 66}" y="${mediaY + 67}" text-anchor="middle" fill="${data.colors.primary}" font-family="Arial, sans-serif" font-size="22" font-weight="800">${escapeXml(data.initials)}</text>
            <rect x="${copyX + 110}" y="${mediaY + 42}" width="${copyWidth - 146}" height="16" rx="8" fill="#FFFFFF" opacity="0.88"/>
            <rect x="${copyX + 110}" y="${mediaY + 72}" width="${copyWidth - 184}" height="14" rx="7" fill="#FFFFFF" opacity="0.54"/>
            <rect x="${copyX + 28}" y="${mediaY + 104}" width="${copyWidth - 56}" height="32" rx="16" fill="#FFFFFF" opacity="0.92"/>
            <text x="${copyX + 48}" y="${mediaY + 125}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="15" font-weight="700">Responsive workflow preview</text>

            <rect x="${copyX}" y="${paletteY}" width="${copyWidth}" height="152" rx="26" fill="#FFFFFF" opacity="0.94"/>
            <text x="${copyX + 22}" y="${paletteY + 34}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="21" font-weight="800">Color System</text>
            ${buildScreenshotColorChips(copyX + 22, paletteY + 52, copyWidth - 44, 2, data.colors)}

            <rect x="${copyX}" y="${summaryY}" width="${copyWidth}" height="188" rx="26" fill="#FFFFFF" opacity="0.94"/>
            <text x="${copyX + 22}" y="${summaryY + 34}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="21" font-weight="800">Typography and Contact</text>
            <text x="${copyX + 22}" y="${summaryY + 68}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="24" font-weight="800">${escapeXml(data.headingFont)}</text>
            <text x="${copyX + 22}" y="${summaryY + 96}" fill="#475569" font-family="Arial, sans-serif" font-size="16" font-weight="500">${escapeXml(data.bodyFont)} for interface copy and product text.</text>
            <rect x="${copyX + 22}" y="${summaryY + 118}" width="90" height="30" rx="15" fill="${hexToRgba(data.colors.primary, 0.12)}"/>
            <rect x="${copyX + 122}" y="${summaryY + 118}" width="84" height="30" rx="15" fill="${hexToRgba(data.colors.secondary, 0.12)}"/>
            <rect x="${copyX + 216}" y="${summaryY + 118}" width="76" height="30" rx="15" fill="${hexToRgba(data.colors.accent, 0.14)}"/>
            <text x="${copyX + 67}" y="${summaryY + 137}" text-anchor="middle" fill="${data.colors.primary}" font-family="Arial, sans-serif" font-size="13" font-weight="700">Tabs</text>
            <text x="${copyX + 164}" y="${summaryY + 137}" text-anchor="middle" fill="${data.colors.secondary}" font-family="Arial, sans-serif" font-size="13" font-weight="700">Cards</text>
            <text x="${copyX + 254}" y="${summaryY + 137}" text-anchor="middle" fill="${data.colors.accent}" font-family="Arial, sans-serif" font-size="13" font-weight="700">Forms</text>
            <text x="${copyX + 22}" y="${summaryY + 164}" fill="#64748B" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="1.1">EMAIL</text>
            <text x="${copyX + 22}" y="${summaryY + 184}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(contactTrim(data.contactEmail, 30))}</text>
        `;
    }

    const copyWidth = isMobile ? screen.width - (pad * 2) : Math.floor(screen.width * 0.46);
    const mediaWidth = isMobile ? screen.width - (pad * 2) : screen.width - (pad * 3) - copyWidth;
    const copyX = screen.x + pad;
    const copyY = screen.y + pad;
    const mediaX = isMobile ? copyX : copyX + copyWidth + gap;
    const mediaY = isMobile ? copyY + 266 : copyY;
    const mediaHeight = isMobile ? 210 : 280;
    const paletteY = isMobile ? mediaY + mediaHeight + gap : copyY + 300;
    const lowerY = paletteY + 184;
    const paletteWidth = isMobile ? screen.width - (pad * 2) : Math.floor(screen.width * 0.42);
    const lowerX = isMobile ? copyX : copyX + paletteWidth + gap;
    const lowerWidth = isMobile ? screen.width - (pad * 2) : screen.width - (pad * 3) - paletteWidth;

    return `
            <rect x="${copyX}" y="${copyY}" width="${copyWidth}" height="${isMobile ? 248 : 280}" rx="28" fill="#FFFFFF" opacity="0.94"/>
        <rect x="${copyX + 24}" y="${copyY + 24}" width="172" height="32" rx="16" fill="${hexToRgba(data.colors.primary, 0.12)}"/>
        <text x="${copyX + 110}" y="${copyY + 46}" text-anchor="middle" fill="${data.colors.primary}" font-family="Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="1.4">BRAND SYSTEM</text>
        <text x="${copyX + 24}" y="${copyY + 100}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="${isMobile ? 40 : 46}" font-weight="800">${titleMarkup}</text>
        <text x="${copyX + 24}" y="${copyY + 176}" fill="#475569" font-family="Arial, sans-serif" font-size="22" font-weight="500">${taglineMarkup}</text>
        <rect x="${copyX + 24}" y="${copyY + (isMobile ? 194 : 214)}" width="164" height="44" rx="22" fill="url(#brandGradient)"/>
        <rect x="${copyX + 202}" y="${copyY + (isMobile ? 194 : 214)}" width="164" height="44" rx="22" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="${copyX + 106}" y="${copyY + (isMobile ? 222 : 242)}" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="18" font-weight="700">Primary Action</text>
        <text x="${copyX + 284}" y="${copyY + (isMobile ? 222 : 242)}" text-anchor="middle" fill="#0F172A" font-family="Arial, sans-serif" font-size="18" font-weight="700">Secondary</text>

        <rect x="${mediaX}" y="${mediaY}" width="${mediaWidth}" height="${mediaHeight}" rx="28" fill="url(#brandGradient)"/>
        <rect x="${mediaX + 18}" y="${mediaY + 18}" width="${mediaWidth - 36}" height="${mediaHeight - 36}" rx="22" fill="rgba(255,255,255,0.18)"/>
        <circle cx="${mediaX + 74}" cy="${mediaY + 72}" r="32" fill="#FFFFFF" opacity="0.88"/>
        <text x="${mediaX + 74}" y="${mediaY + 84}" text-anchor="middle" fill="${data.colors.primary}" font-family="Arial, sans-serif" font-size="28" font-weight="800">${escapeXml(data.initials)}</text>
        <rect x="${mediaX + 132}" y="${mediaY + 56}" width="${Math.max(mediaWidth - 170, 120)}" height="20" rx="10" fill="#FFFFFF" opacity="0.88"/>
        <rect x="${mediaX + 132}" y="${mediaY + 90}" width="${Math.max(mediaWidth - 212, 100)}" height="16" rx="8" fill="#FFFFFF" opacity="0.56"/>
        <rect x="${mediaX + 44}" y="${mediaY + 136}" width="${Math.max(mediaWidth - 88, 180)}" height="${Math.max(mediaHeight - 182, 80)}" rx="22" fill="#FFFFFF" opacity="0.92"/>
        <rect x="${mediaX + 68}" y="${mediaY + 160}" width="${Math.max(mediaWidth - 220, 120)}" height="18" rx="9" fill="${hexToRgba(data.colors.primary, 0.22)}"/>
        <rect x="${mediaX + 68}" y="${mediaY + 194}" width="${Math.max(mediaWidth - 136, 140)}" height="24" rx="12" fill="${hexToRgba(data.colors.secondary, 0.72)}"/>
        <rect x="${mediaX + 68}" y="${mediaY + 234}" width="${Math.max(mediaWidth - 168, 110)}" height="16" rx="8" fill="#CBD5E1"/>
        <rect x="${mediaX + 68}" y="${mediaY + 264}" width="${Math.max(mediaWidth - 190, 90)}" height="16" rx="8" fill="#E2E8F0"/>

        <rect x="${copyX}" y="${paletteY}" width="${paletteWidth}" height="166" rx="26" fill="#FFFFFF" opacity="0.94"/>
        <text x="${copyX + 22}" y="${paletteY + 36}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="22" font-weight="800">Color System</text>
        ${buildScreenshotColorChips(copyX + 22, paletteY + 58, paletteWidth - 44, isMobile ? 2 : 3, data.colors)}

        <rect x="${lowerX}" y="${paletteY}" width="${lowerWidth}" height="166" rx="26" fill="#FFFFFF" opacity="0.94"/>
        <text x="${lowerX + 22}" y="${paletteY + 36}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="22" font-weight="800">Typography</text>
        <text x="${lowerX + 22}" y="${paletteY + 74}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="30" font-weight="800">${escapeXml(data.headingFont)}</text>
        <text x="${lowerX + 22}" y="${paletteY + 104}" fill="#475569" font-family="Arial, sans-serif" font-size="18" font-weight="500">Headline font for sharp, confident messaging.</text>
        <text x="${lowerX + 22}" y="${paletteY + 138}" fill="#475569" font-family="Arial, sans-serif" font-size="18" font-weight="500">${escapeXml(data.bodyFont)} for product copy, content, and UI text.</text>

        <rect x="${copyX}" y="${lowerY}" width="${isMobile ? screen.width - (pad * 2) : Math.floor(screen.width * 0.32)}" height="${isDesktop ? 154 : 176}" rx="26" fill="#FFFFFF" opacity="0.94"/>
        <text x="${copyX + 22}" y="${lowerY + 36}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="22" font-weight="800">Components</text>
        <rect x="${copyX + 22}" y="${lowerY + 58}" width="120" height="34" rx="17" fill="${hexToRgba(data.colors.primary, 0.12)}"/>
        <rect x="${copyX + 152}" y="${lowerY + 58}" width="112" height="34" rx="17" fill="${hexToRgba(data.colors.secondary, 0.12)}"/>
        <rect x="${copyX + 274}" y="${lowerY + 58}" width="92" height="34" rx="17" fill="${hexToRgba(data.colors.accent, 0.14)}"/>
        <text x="${copyX + 82}" y="${lowerY + 80}" text-anchor="middle" fill="${data.colors.primary}" font-family="Arial, sans-serif" font-size="15" font-weight="700">Tabs</text>
        <text x="${copyX + 208}" y="${lowerY + 80}" text-anchor="middle" fill="${data.colors.secondary}" font-family="Arial, sans-serif" font-size="15" font-weight="700">Cards</text>
        <text x="${copyX + 320}" y="${lowerY + 80}" text-anchor="middle" fill="${data.colors.accent}" font-family="Arial, sans-serif" font-size="15" font-weight="700">Forms</text>
        <rect x="${copyX + 22}" y="${lowerY + 110}" width="${Math.max((isMobile ? screen.width - (pad * 2) : Math.floor(screen.width * 0.32)) - 44, 180)}" height="18" rx="9" fill="#E2E8F0"/>
        <rect x="${copyX + 22}" y="${lowerY + 138}" width="${Math.max((isMobile ? screen.width - (pad * 2) : Math.floor(screen.width * 0.32)) - 110, 120)}" height="14" rx="7" fill="#CBD5E1"/>

        <rect x="${isMobile ? copyX : lowerX}" y="${isMobile ? lowerY + 194 : lowerY}" width="${isMobile ? screen.width - (pad * 2) : lowerWidth}" height="${isDesktop ? 154 : 176}" rx="26" fill="#FFFFFF" opacity="0.94"/>
        <text x="${(isMobile ? copyX : lowerX) + 22}" y="${(isMobile ? lowerY + 194 : lowerY) + 36}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="22" font-weight="800">Contact</text>
        <text x="${(isMobile ? copyX : lowerX) + 22}" y="${(isMobile ? lowerY + 194 : lowerY) + 78}" fill="#64748B" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="1.2">EMAIL</text>
        <text x="${(isMobile ? copyX : lowerX) + 22}" y="${(isMobile ? lowerY + 194 : lowerY) + 108}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(contactTrim(data.contactEmail, isMobile ? 28 : 40))}</text>
        <text x="${(isMobile ? copyX : lowerX) + 22}" y="${(isMobile ? lowerY + 194 : lowerY) + 138}" fill="#64748B" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="1.2">PHONE</text>
        <text x="${(isMobile ? copyX : lowerX) + 22}" y="${(isMobile ? lowerY + 194 : lowerY) + 168}" fill="${data.colors.text}" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(contactTrim(data.contactPhone, isMobile ? 22 : 30))}</text>
    `;
}

/**
 * Draw the bottom summary palette outside the screen for a poster-style export.
 */
function buildScreenshotPaletteMarkup(colors, screen, device) {
    const entries = [
        ['Primary', colors.primary],
        ['Secondary', colors.secondary],
        ['Accent', colors.accent],
        ['Background', colors.background],
        ['Text', colors.text],
    ];
    const baseY = Math.min(device === 'mobile' ? screen.y + screen.height + 14 : screen.y + screen.height + 28, 982);
    const startX = device === 'desktop' ? 220 : 320;
    const gap = 20;
    const chipWidth = 250;

    return entries.map(([label, value], index) => {
        const x = startX + (index * (chipWidth + gap));

        return `
            <rect x="${x}" y="${baseY}" width="${chipWidth}" height="78" rx="22" fill="#FFFFFF" opacity="0.94"/>
            <rect x="${x + 18}" y="${baseY + 18}" width="42" height="42" rx="14" fill="${value}" stroke="#CBD5E1"/>
            <text x="${x + 76}" y="${baseY + 34}" fill="#64748B" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="1.2">${escapeXml(label.toUpperCase())}</text>
            <text x="${x + 76}" y="${baseY + 58}" fill="#0F172A" font-family="Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(value)}</text>
        `;
    }).join('');
}

/**
 * Build the color chips that appear inside the screenshot palette card.
 */
function buildScreenshotColorChips(x, y, width, columns, colors) {
    const entries = [
        ['Primary', colors.primary],
        ['Secondary', colors.secondary],
        ['Accent', colors.accent],
        ['Background', colors.background],
        ['Text', colors.text],
    ];
    const chipGap = 12;
    const chipWidth = Math.floor((width - (chipGap * (columns - 1))) / columns);

    return entries.map(([label, value], index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const chipX = x + (column * (chipWidth + chipGap));
        const chipY = y + (row * 54);

        return `
            <rect x="${chipX}" y="${chipY}" width="${chipWidth}" height="42" rx="16" fill="${hexToRgba(value, 0.12)}"/>
            <rect x="${chipX + 12}" y="${chipY + 11}" width="20" height="20" rx="8" fill="${value}" stroke="#CBD5E1"/>
            <text x="${chipX + 42}" y="${chipY + 18}" fill="#64748B" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1">${escapeXml(label.toUpperCase())}</text>
            <text x="${chipX + 42}" y="${chipY + 33}" fill="#0F172A" font-family="Arial, sans-serif" font-size="14" font-weight="700">${escapeXml(value)}</text>
        `;
    }).join('');
}

/**
 * Return the frame geometry for the requested preview mode.
 */
function getScreenshotDeviceSpec(device) {
    if (device === 'tablet') {
        return {
            x: 360,
            y: 96,
            width: 1200,
            height: 820,
            radius: 42,
            bezel: 18,
            screenTopInset: 28,
            screenBottomInset: 20,
            screenRadius: 30,
            hardware: `
                <circle cx="960" cy="114" r="6" fill="#0F172A" opacity="0.78"/>
            `,
        };
    }

    if (device === 'desktop') {
        return {
            x: 150,
            y: 136,
            width: 1620,
            height: 720,
            radius: 28,
            bezel: 16,
            screenTopInset: 18,
            screenBottomInset: 50,
            screenRadius: 18,
            hardware: `
                <rect x="909" y="148" width="102" height="8" rx="4" fill="#0F172A" opacity="0.82"/>
                <circle cx="960" cy="176" r="5" fill="#0F172A" opacity="0.3"/>
            `,
        };
    }

    return {
        x: 650,
        y: 64,
        width: 620,
        height: 952,
        radius: 54,
        bezel: 18,
        screenTopInset: 42,
        screenBottomInset: 18,
        screenRadius: 34,
        hardware: `
            <rect x="858" y="78" width="204" height="28" rx="14" fill="#020617"/>
            <circle cx="896" cy="92" r="6" fill="#334155"/>
        `,
    };
}

/**
 * Convert SVG markup into a PNG blob.
 */
async function rasterizeSvgMarkup(svgMarkup, width, height) {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
        const image = await loadImage(svgUrl);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        if (!context) {
            throw new Error('Unable to prepare the screenshot canvas.');
        }

        context.drawImage(image, 0, 0, width, height);

        const pngBlob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png', 1);
        });

        if (!pngBlob) {
            throw new Error('Unable to generate the screenshot image.');
        }

        return pngBlob;
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}

/**
 * Load an image source into an Image element.
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to render the screenshot preview.'));
        image.src = src;
    });
}

/**
 * Build initials from a brand name.
 */
function buildInitials(name) {
    return String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'BR';
}

/**
 * Wrap text for svg output.
 */
function wrapTextForSvg(text, maxCharsPerLine, maxLines) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;

        if (candidate.length <= maxCharsPerLine) {
            current = candidate;
            return;
        }

        if (current) {
            lines.push(current);
        }

        current = word;
    });

    if (current) {
        lines.push(current);
    }

    return lines.slice(0, maxLines);
}

/**
 * Render multi-line svg text using tspans.
 */
function renderSvgTextLines(lines, x, y, lineHeight) {
    return lines.map((line, index) => {
        const dy = index === 0 ? 0 : lineHeight;
        return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    }).join('');
}

/**
 * Trim longer contact strings for poster layouts.
 */
function contactTrim(value, maxLength) {
    const clean = String(value || '');
    return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

/**
 * Escape XML text safely.
 */
function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Build a themed placeholder image when remote media cannot be embedded.
 */
function buildImageFallbackDataUrl(label) {
    const primary = state.brand?.colors?.primary || '#4f46e5';
    const secondary = state.brand?.colors?.secondary || '#22c55e';
    const safeLabel = String(label || 'Brand Preview').replace(/[<>&]/g, '');
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${primary}"/>
            <stop offset="100%" stop-color="${secondary}"/>
        </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#g)"/>
    <rect x="80" y="80" width="1440" height="740" rx="40" fill="rgba(255,255,255,0.16)"/>
    <text x="800" y="430" text-anchor="middle" fill="#ffffff" font-size="72" font-family="Arial, sans-serif" font-weight="700">${safeLabel}</text>
    <text x="800" y="510" text-anchor="middle" fill="rgba(255,255,255,0.82)" font-size="30" font-family="Arial, sans-serif">Preview media fallback</text>
</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Convert a hex color into an rgba string.
 */
function hexToRgba(hex, alpha) {
    const normalized = String(hex || '').replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map((part) => part + part).join('')
        : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
        return `rgba(79, 70, 229, ${alpha})`;
    }

    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Switch a preview tab set to the selected target panel.
 */
function activateBrandTab(button) {
    const tabsRoot = button.closest('[data-tabs]');

    if (!tabsRoot) {
        return;
    }

    const target = button.dataset.tabTarget || '';

    tabsRoot.querySelectorAll('.brand-tab-trigger').forEach((item) => {
        item.classList.toggle('is-active', item === button);
    });

    tabsRoot.querySelectorAll('.brand-tab-panel').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.tabPanel === target);
    });
}

/**
 * Open or close an accordion item inside the preview.
 */
function toggleAccordionItem(button) {
    const item = button.closest('.brand-accordion-item');

    if (!item) {
        return;
    }

    const isOpen = item.classList.contains('is-open');

    item.classList.toggle('is-open', !isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
}

/**
 * Copy plain text to the clipboard with a textarea fallback.
 */
async function copyText(text, successMessage) {
    if (!text) {
        throw new Error('Nothing to copy yet.');
    }

    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
    } else {
        fallbackCopy(text);
    }

    setStatus(successMessage, 'success');
}

/**
 * Copy text through a temporary textarea when the Clipboard API is unavailable.
 */
function fallbackCopy(text) {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'readonly');
    helper.style.position = 'absolute';
    helper.style.left = '-9999px';
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    document.body.removeChild(helper);
}

/**
 * Download generated text content as a local file.
 */
function downloadTextFile(fileName, content, mimeType) {
    if (!content) {
        setError('Generate a valid preview before downloading exports.');
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    downloadBlob(fileName, blob);
}

/**
 * Download a blob payload as a local file.
 */
function downloadBlob(fileName, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Build a readable export filename derived from the current brand name.
 */
function buildFileName(suffix) {
    const brandName = state.brand?.name || 'brand-preview';
    const slug = brandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${slug || 'brand-preview'}-${suffix}`;
}

/**
 * Toggle copy and download controls based on export availability.
 */
function toggleExportUtilities(enabled) {
    [elements.copyTailwind, elements.downloadTailwind, elements.copyCss, elements.downloadCss].forEach((button) => {
        button.disabled = !enabled;
    });
}

/**
 * Reflect loading state in the main action buttons and status badges.
 */
function setLoadingState(isLoading, action) {
    elements.generateButton.disabled = isLoading;
    elements.exportButton.disabled = isLoading;
    elements.resetSample.disabled = isLoading;
    elements.screenshotButton.disabled = isLoading || !state.previewReady;

    if (isLoading) {
        setStatus(action === 'export' ? 'Generating preview and writing HTML export...' : 'Validating payload and rendering preview...', 'working');
    }
}

/**
 * Show a success message for exported standalone HTML files.
 */
function showExportMessage(exportInfo) {
    elements.exportResult.classList.remove('hidden');
    elements.exportResult.textContent = '';

    const label = document.createElement('span');
    label.textContent = `Saved ${exportInfo.fileName}. `;

    const link = document.createElement('a');
    link.href = exportInfo.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'font-semibold underline decoration-emerald-400 underline-offset-4';
    link.textContent = 'Open export';

    elements.exportResult.appendChild(label);
    elements.exportResult.appendChild(link);
}

/**
 * Hide the export message when the payload changes.
 */
function hideExportMessage() {
    elements.exportResult.classList.add('hidden');
    elements.exportResult.textContent = '';
}

/**
 * Display a status message with visual tone.
 */
function setStatus(message, tone) {
    elements.statusText.textContent = message;
    elements.statusBadge.textContent = statusLabelForTone(tone);
    elements.statusBadge.className = `status-badge status-${tone}`;
}

/**
 * Map a status tone to a short badge label.
 */
function statusLabelForTone(tone) {
    switch (tone) {
        case 'working':
            return 'Working';
        case 'success':
            return 'Success';
        case 'error':
            return 'Error';
        default:
            return 'Ready';
    }
}

/**
 * Surface a user-facing validation or request error.
 */
function setError(message) {
    elements.errorBox.textContent = message;
    elements.errorBox.classList.remove('hidden');
    setStatus(message, 'error');
}

/**
 * Clear the current error message.
 */
function clearError() {
    elements.errorBox.textContent = '';
    elements.errorBox.classList.add('hidden');
}
