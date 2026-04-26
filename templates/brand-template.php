<?php
declare(strict_types=1);

/**
 * Escape HTML output safely.
 */
function brandUiEscape(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/**
 * Convert an arbitrary value into a safe display string.
 */
function brandUiText(?string $value, string $fallback = ''): string
{
    $clean = trim((string) $value);

    return $clean !== '' ? $clean : $fallback;
}

/**
 * Normalize a font family value for CSS and remote font loading.
 */
function brandUiNormalizeFont(?string $font, string $fallback): string
{
    $clean = preg_replace('/[^a-zA-Z0-9\s-]/', '', trim((string) $font)) ?? '';
    $clean = preg_replace('/\s+/', ' ', $clean) ?? '';

    return $clean !== '' ? $clean : $fallback;
}

/**
 * Build initials used by the logo fallback badge.
 */
function brandUiBuildInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $initials = '';

    foreach ($parts as $part) {
        if ($part === '') {
            continue;
        }

        $initials .= strtoupper(substr($part, 0, 1));

        if (strlen($initials) >= 2) {
            break;
        }
    }

    return $initials !== '' ? $initials : 'BR';
}

/**
 * Return a full color map with predictable defaults.
 */
function brandUiColorMap(array $brand): array
{
    $colors = $brand['colors'] ?? [];

    return [
        'primary' => $colors['primary'] ?? '#4F46E5',
        'secondary' => $colors['secondary'] ?? '#22C55E',
        'accent' => $colors['accent'] ?? '#F59E0B',
        'background' => $colors['background'] ?? '#FFFFFF',
        'text' => $colors['text'] ?? '#111827',
    ];
}

/**
 * Build a CSS variable array from the current brand payload.
 */
function brandUiVariableMap(array $brand): array
{
    $colors = brandUiColorMap($brand);

    return [
        '--primary' => $colors['primary'],
        '--secondary' => $colors['secondary'],
        '--accent' => $colors['accent'],
        '--background' => $colors['background'],
        '--text' => $colors['text'],
        '--heading-font' => brandUiNormalizeFont($brand['fonts']['heading'] ?? 'Poppins', 'Poppins'),
        '--body-font' => brandUiNormalizeFont($brand['fonts']['body'] ?? 'Inter', 'Inter'),
    ];
}

/**
 * Serialize the variable map for inline style usage.
 */
function brandUiInlineVariables(array $brand): string
{
    $chunks = [];

    foreach (brandUiVariableMap($brand) as $name => $value) {
        $chunks[] = sprintf('%s: %s', $name, $value);
    }

    return implode('; ', $chunks);
}

/**
 * Build a portable CSS variable block for developer exports.
 */
function brandUiBuildCssVariables(array $brand): string
{
    $lines = [':root {'];

    foreach (brandUiVariableMap($brand) as $name => $value) {
        $lines[] = sprintf('  %s: %s;', $name, $value);
    }

    $lines[] = '}';

    return implode("\n", $lines);
}

/**
 * Build a developer-ready Tailwind configuration export.
 */
function brandUiBuildTailwindConfig(array $brand): string
{
    $colors = brandUiColorMap($brand);
    $headingFont = brandUiNormalizeFont($brand['fonts']['heading'] ?? 'Poppins', 'Poppins');
    $bodyFont = brandUiNormalizeFont($brand['fonts']['body'] ?? 'Inter', 'Inter');

    return <<<JS
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "{$colors['primary']}",
        secondary: "{$colors['secondary']}",
        accent: "{$colors['accent']}",
        background: "{$colors['background']}",
        text: "{$colors['text']}"
      },
      fontFamily: {
        heading: ["{$headingFont}", "sans-serif"],
        body: ["{$bodyFont}", "sans-serif"]
      }
    }
  }
};
JS;
}

/**
 * Build a local SVG hero illustration to avoid brittle remote media dependencies.
 */
function brandUiBuildHeroIllustrationDataUri(array $brand): string
{
    $colors = brandUiColorMap($brand);
    $name = brandUiText($brand['name'] ?? '', 'Brand');
    $tagline = brandUiText($brand['tagline'] ?? '', 'Preview Surface');
    $safeName = rawurlencode($name);
    $safeTagline = rawurlencode($tagline);
    $primary = rawurlencode($colors['primary']);
    $secondary = rawurlencode($colors['secondary']);
    $accent = rawurlencode($colors['accent']);

    $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="980" viewBox="0 0 1600 980" fill="none">
  <defs>
    <linearGradient id="bg" x1="120" y1="80" x2="1480" y2="900" gradientUnits="userSpaceOnUse">
      <stop stop-color="{$colors['primary']}"/>
      <stop offset="1" stop-color="{$colors['secondary']}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1180 240) rotate(133.781) scale(658.224 762.146)">
      <stop stop-color="white" stop-opacity="0.72"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="980" rx="48" fill="url(#bg)"/>
  <rect x="68" y="68" width="1464" height="844" rx="40" fill="white" fill-opacity="0.12"/>
  <rect x="118" y="124" width="418" height="272" rx="34" fill="white" fill-opacity="0.88"/>
  <rect x="160" y="168" width="182" height="22" rx="11" fill="{$colors['primary']}" fill-opacity="0.18"/>
  <rect x="160" y="210" width="302" height="34" rx="17" fill="{$colors['primary']}" fill-opacity="0.86"/>
  <rect x="160" y="264" width="254" height="18" rx="9" fill="#0F172A" fill-opacity="0.18"/>
  <rect x="160" y="302" width="214" height="18" rx="9" fill="#0F172A" fill-opacity="0.12"/>
  <rect x="160" y="346" width="136" height="16" rx="8" fill="{$colors['secondary']}" fill-opacity="0.68"/>
  <rect x="624" y="146" width="816" height="542" rx="38" fill="url(#glow)"/>
  <rect x="772" y="238" width="388" height="414" rx="34" fill="white" fill-opacity="0.18"/>
  <rect x="820" y="286" width="292" height="212" rx="28" fill="white" fill-opacity="0.9"/>
  <rect x="850" y="522" width="228" height="18" rx="9" fill="white" fill-opacity="0.72"/>
  <rect x="850" y="558" width="184" height="18" rx="9" fill="white" fill-opacity="0.42"/>
  <rect x="1132" y="320" width="196" height="114" rx="24" fill="{$colors['accent']}" fill-opacity="0.9"/>
  <rect x="1132" y="460" width="196" height="114" rx="24" fill="white" fill-opacity="0.22"/>
  <circle cx="1272" cy="212" r="82" fill="{$colors['accent']}" fill-opacity="0.2"/>
  <circle cx="1388" cy="760" r="126" fill="white" fill-opacity="0.14"/>
  <text x="120" y="792" fill="white" font-family="Arial, sans-serif" font-size="92" font-weight="700">{$name}</text>
  <text x="120" y="850" fill="white" fill-opacity="0.88" font-family="Arial, sans-serif" font-size="34" font-weight="500">{$tagline}</text>
</svg>
SVG;

    return 'data:image/svg+xml;charset=utf-8,' . rawurlencode($svg);
}

/**
 * Read the shared stylesheet so exports stay visually consistent.
 */
function brandUiSharedStyles(): string
{
    $path = dirname(__DIR__) . '/assets/styles.css';
    $styles = is_file($path) ? file_get_contents($path) : '';

    return $styles !== false ? $styles : '';
}

/**
 * Build the Google Fonts URL for the selected type pair.
 */
function brandUiFontsUrl(array $brand): string
{
    $families = array_unique([
        brandUiNormalizeFont($brand['fonts']['heading'] ?? 'Poppins', 'Poppins'),
        brandUiNormalizeFont($brand['fonts']['body'] ?? 'Inter', 'Inter'),
    ]);

    $queryFamilies = [];

    foreach ($families as $family) {
        $queryFamilies[] = 'family=' . str_replace(' ', '+', $family) . ':wght@400;500;600;700;800';
    }

    return 'https://fonts.googleapis.com/css2?' . implode('&', $queryFamilies) . '&display=swap';
}

/**
 * Render the brand preview markup.
 */
function brandUiRenderPreview(array $brand): string
{
    $name = brandUiText($brand['name'] ?? '', 'Untitled Brand');
    $tagline = brandUiText($brand['tagline'] ?? '', 'A polished brand system preview.');
    $logo = brandUiText($brand['logo'] ?? '');
    $heroImage = brandUiText(
        $brand['media']['hero'] ?? '',
        brandUiBuildHeroIllustrationDataUri($brand)
    );
    $email = brandUiText($brand['contact']['email'] ?? '');
    $phone = brandUiText($brand['contact']['phone'] ?? '');
    $colors = brandUiColorMap($brand);
    $initials = brandUiBuildInitials($name);
    $style = brandUiInlineVariables($brand);
    $headingFont = brandUiNormalizeFont($brand['fonts']['heading'] ?? 'Poppins', 'Poppins');
    $bodyFont = brandUiNormalizeFont($brand['fonts']['body'] ?? 'Inter', 'Inter');
    $emailHref = filter_var($email, FILTER_VALIDATE_EMAIL) ? 'mailto:' . $email : '#';
    $phoneHref = $phone !== '' ? 'tel:' . preg_replace('/[^0-9+]/', '', $phone) : '#';

    ob_start();
    ?>
    <section class="brand-preview-shell" style="<?= brandUiEscape($style) ?>">
        <div class="brand-preview-backdrop"></div>
        <div class="brand-preview-content">
            <header class="brand-hero-card">
                <div class="brand-hero-copy">
                    <div class="brand-pill">Live brand identity preview</div>
                    <h1 class="brand-name"><?= brandUiEscape($name) ?></h1>
                    <p class="brand-tagline"><?= brandUiEscape($tagline) ?></p>
                    <div class="brand-button-row">
                        <button type="button" class="brand-button brand-button-primary">Primary Action</button>
                        <button type="button" class="brand-button brand-button-secondary">Secondary Action</button>
                    </div>
                    <div class="brand-stat-row">
                        <div class="brand-stat-card">
                            <span class="brand-stat-label">Identity</span>
                            <strong>Icon + Wordmark</strong>
                        </div>
                        <div class="brand-stat-card">
                            <span class="brand-stat-label">Voice</span>
                            <strong>Clear and modern</strong>
                        </div>
                        <div class="brand-stat-card">
                            <span class="brand-stat-label">Surface</span>
                            <strong>Responsive system</strong>
                        </div>
                    </div>
                </div>
                <div class="brand-hero-media">
                    <div class="brand-logo-frame">
                        <div class="brand-logo-fallback"><?= brandUiEscape($initials) ?></div>
                        <?php if ($logo !== ''): ?>
                            <img
                                src="<?= brandUiEscape($logo) ?>"
                                alt="<?= brandUiEscape($name) ?> logo"
                                class="brand-logo-image"
                                loading="lazy"
                                referrerpolicy="no-referrer"
                            >
                        <?php endif; ?>
                    </div>
                    <div class="brand-hero-visual-card">
                        <img
                            src="<?= brandUiEscape($heroImage) ?>"
                            alt="<?= brandUiEscape($name) ?> showcase"
                            class="brand-hero-image"
                            loading="lazy"
                            referrerpolicy="no-referrer"
                        >
                        <div class="brand-hero-visual-overlay">
                            <span>Campaign Preview</span>
                            <strong><?= brandUiEscape($name) ?> across web, product, and mobile.</strong>
                        </div>
                    </div>
                </div>
            </header>

            <div class="brand-preview-grid">
                <section class="brand-card brand-card-wide">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Logo System</span>
                        <h2>Icon and wordmark</h2>
                    </div>
                    <div class="brand-logo-system">
                        <article class="brand-logo-card">
                            <span class="brand-mini-label">Icon mark</span>
                            <div class="brand-icon-logo"><?= brandUiEscape($initials) ?></div>
                        </article>
                        <article class="brand-logo-card">
                            <span class="brand-mini-label">Text logo</span>
                            <div class="brand-wordmark-logo"><?= brandUiEscape($name) ?></div>
                        </article>
                        <article class="brand-logo-card brand-logo-card-accent">
                            <span class="brand-mini-label">Lockup</span>
                            <div class="brand-lockup-logo">
                                <span class="brand-lockup-badge"><?= brandUiEscape($initials) ?></span>
                                <span class="brand-lockup-text"><?= brandUiEscape($name) ?></span>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="brand-card">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Palette</span>
                        <h2>Color system</h2>
                    </div>
                    <div class="brand-color-grid">
                        <?php foreach ($colors as $label => $hex): ?>
                            <article class="brand-swatch-card">
                                <div class="brand-swatch-chip" style="background: <?= brandUiEscape($hex) ?>"></div>
                                <div class="brand-swatch-meta">
                                    <div>
                                        <p class="brand-swatch-label"><?= brandUiEscape(ucfirst($label)) ?></p>
                                        <p class="brand-swatch-value"><?= brandUiEscape($hex) ?></p>
                                    </div>
                                    <button type="button" class="copy-hex-button" data-copy="<?= brandUiEscape($hex) ?>">Copy</button>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                </section>

                <section class="brand-card">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Typography</span>
                        <h2>Font preview</h2>
                    </div>
                    <div class="brand-type-stack">
                        <div class="brand-type-sample">
                            <p class="brand-type-label">Heading font</p>
                            <h3 style="font-family: <?= brandUiEscape($headingFont) ?>, sans-serif;">
                                <?= brandUiEscape($headingFont) ?> powers high-signal headlines.
                            </h3>
                        </div>
                        <div class="brand-type-sample">
                            <p class="brand-type-label">Body font</p>
                            <p style="font-family: <?= brandUiEscape($bodyFont) ?>, sans-serif;">
                                <?= brandUiEscape($bodyFont) ?> keeps long-form product copy readable across landing pages, dashboards, and documentation.
                            </p>
                        </div>
                    </div>
                </section>

                <section class="brand-card brand-card-wide">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Components</span>
                        <h2>Tabs and cards</h2>
                    </div>
                    <div class="brand-tabs" data-tabs>
                        <div class="brand-tabs-nav" role="tablist" aria-label="Brand component tabs">
                            <button type="button" class="brand-tab-trigger is-active" data-tab-target="overview">Overview</button>
                            <button type="button" class="brand-tab-trigger" data-tab-target="messaging">Messaging</button>
                            <button type="button" class="brand-tab-trigger" data-tab-target="product">Product</button>
                        </div>
                        <div class="brand-tab-panel is-active" data-tab-panel="overview">
                            <div class="brand-feature-cards">
                                <article class="brand-feature-card">
                                    <span class="brand-mini-label">Speed</span>
                                    <h3>Fast setup with reusable tokens</h3>
                                    <p>Design decisions stay consistent from landing page to product screens.</p>
                                </article>
                                <article class="brand-feature-card">
                                    <span class="brand-mini-label">Trust</span>
                                    <h3>Professional brand framing</h3>
                                    <p>Sharper spacing, visual rhythm, and clear hierarchy improve brand perception.</p>
                                </article>
                                <article class="brand-feature-card">
                                    <span class="brand-mini-label">Scale</span>
                                    <h3>Portable handoff output</h3>
                                    <p>Teams can lift colors, typography, and CSS variables straight into implementation.</p>
                                </article>
                            </div>
                        </div>
                        <div class="brand-tab-panel" data-tab-panel="messaging">
                            <div class="brand-message-block">
                                <h3><?= brandUiEscape($name) ?> brand message</h3>
                                <p><?= brandUiEscape($tagline) ?></p>
                                <p>Use concise product language, high-contrast calls to action, and a clean narrative structure.</p>
                            </div>
                        </div>
                        <div class="brand-tab-panel" data-tab-panel="product">
                            <div class="brand-product-strip">
                                <div class="brand-product-pill">Buttons</div>
                                <div class="brand-product-pill">Cards</div>
                                <div class="brand-product-pill">Forms</div>
                                <div class="brand-product-pill">Panels</div>
                                <div class="brand-product-pill">Navigation</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="brand-card">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Contact</span>
                        <h2>Reach the team</h2>
                    </div>
                    <div class="brand-contact-card">
                        <div>
                            <p class="brand-contact-label">Email</p>
                            <?php if ($email !== '' && $emailHref !== '#'): ?>
                                <a href="<?= brandUiEscape($emailHref) ?>" class="brand-contact-value"><?= brandUiEscape($email) ?></a>
                            <?php else: ?>
                                <span class="brand-contact-value">Not provided</span>
                            <?php endif; ?>
                        </div>
                        <div>
                            <p class="brand-contact-label">Phone</p>
                            <?php if ($phone !== '' && $phoneHref !== '#'): ?>
                                <a href="<?= brandUiEscape($phoneHref) ?>" class="brand-contact-value"><?= brandUiEscape($phone) ?></a>
                            <?php else: ?>
                                <span class="brand-contact-value">Not provided</span>
                            <?php endif; ?>
                        </div>
                    </div>
                </section>

                <section class="brand-card brand-card-wide">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Accordion</span>
                        <h2>Brand usage guidance</h2>
                    </div>
                    <div class="brand-accordion" data-accordion>
                        <article class="brand-accordion-item is-open">
                            <button type="button" class="brand-accordion-trigger" aria-expanded="true">
                                Where should the primary color lead?
                            </button>
                            <div class="brand-accordion-panel">
                                <p>Use the primary color for main actions, highlights, and key emphasis points in high-intent surfaces.</p>
                            </div>
                        </article>
                        <article class="brand-accordion-item">
                            <button type="button" class="brand-accordion-trigger" aria-expanded="false">
                                How should imagery feel?
                            </button>
                            <div class="brand-accordion-panel">
                                <p>Prefer clean editorial images, strong depth, bright surfaces, and realistic product-forward compositions.</p>
                            </div>
                        </article>
                        <article class="brand-accordion-item">
                            <button type="button" class="brand-accordion-trigger" aria-expanded="false">
                                What should UI copy sound like?
                            </button>
                            <div class="brand-accordion-panel">
                                <p>Keep copy short, specific, and confident. Focus on outcomes, clarity, and fast comprehension.</p>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="brand-card brand-card-wide">
                    <div class="brand-section-heading">
                        <span class="brand-overline">Form Preview</span>
                        <h2>Lead capture surface</h2>
                    </div>
                    <form class="brand-form-preview" action="#" method="post">
                        <div class="brand-form-grid">
                            <label class="brand-field">
                                <span>Name</span>
                                <input type="text" placeholder="Enter your name">
                            </label>
                            <label class="brand-field">
                                <span>Email</span>
                                <input type="email" placeholder="Enter your email">
                            </label>
                        </div>
                        <label class="brand-field">
                            <span>Project brief</span>
                            <textarea rows="4" placeholder="Describe the product, campaign, or launch goal"></textarea>
                        </label>
                        <div class="brand-form-actions">
                            <button type="submit" class="brand-button brand-button-primary">Submit Inquiry</button>
                            <button type="button" class="brand-button brand-button-secondary">Save Draft</button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    </section>
    <?php

    return (string) ob_get_clean();
}

/**
 * Render a full standalone HTML export with inline styles.
 */
function brandUiRenderStandaloneHtml(array $brand): string
{
    $name = brandUiText($brand['name'] ?? '', 'Brand Preview');
    $styles = brandUiSharedStyles();
    $fontsUrl = brandUiFontsUrl($brand);
    $cssVariables = brandUiBuildCssVariables($brand);
    $preview = brandUiRenderPreview($brand);
    $title = brandUiEscape($name . ' Brand Preview');
    $safeFontsUrl = brandUiEscape($fontsUrl);

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="{$safeFontsUrl}" rel="stylesheet">
    <style>
{$cssVariables}

{$styles}

body {
    margin: 0;
    padding: 32px 16px;
    min-height: 100vh;
    background:
        radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 34%),
        linear-gradient(180deg, #f7f8fc 0%, #edf2f7 100%);
}

.export-shell {
    margin: 0 auto;
    max-width: 1120px;
}
    </style>
</head>
<body>
    <div class="export-shell">
        {$preview}
    </div>
    <script>
    (function () {
        function attachCopyButtons() {
            document.querySelectorAll('.copy-hex-button').forEach(function (button) {
                button.addEventListener('click', function () {
                    var value = button.getAttribute('data-copy') || '';
                    if (!value || !navigator.clipboard) {
                        return;
                    }

                    navigator.clipboard.writeText(value).then(function () {
                        var original = button.textContent;
                        button.textContent = 'Copied';
                        setTimeout(function () {
                            button.textContent = original;
                        }, 1200);
                    });
                });
            });
        }

        function attachLogoFallbacks() {
            document.querySelectorAll('.brand-logo-image').forEach(function (image) {
                image.addEventListener('error', function () {
                    var frame = image.closest('.brand-logo-frame');
                    if (frame) {
                        frame.classList.add('is-fallback');
                    }
                    image.remove();
                });
            });

            document.querySelectorAll('.brand-hero-image').forEach(function (image) {
                image.addEventListener('error', function () {
                    image.style.display = 'none';
                });
            });
        }

        function attachTabs() {
            document.querySelectorAll('.brand-tab-trigger').forEach(function (button) {
                button.addEventListener('click', function () {
                    var tabsRoot = button.closest('[data-tabs]');
                    var target = button.getAttribute('data-tab-target') || '';

                    if (!tabsRoot) {
                        return;
                    }

                    tabsRoot.querySelectorAll('.brand-tab-trigger').forEach(function (item) {
                        item.classList.toggle('is-active', item === button);
                    });

                    tabsRoot.querySelectorAll('.brand-tab-panel').forEach(function (panel) {
                        panel.classList.toggle('is-active', panel.getAttribute('data-tab-panel') === target);
                    });
                });
            });
        }

        function attachAccordion() {
            document.querySelectorAll('.brand-accordion-trigger').forEach(function (button) {
                button.addEventListener('click', function () {
                    var item = button.closest('.brand-accordion-item');
                    var isOpen = item && item.classList.contains('is-open');

                    if (!item) {
                        return;
                    }

                    item.classList.toggle('is-open', !isOpen);
                    button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                });
            });
        }

        function attachFormPreview() {
            document.querySelectorAll('.brand-form-preview').forEach(function (form) {
                form.addEventListener('submit', function (event) {
                    event.preventDefault();
                });
            });
        }

        attachCopyButtons();
        attachLogoFallbacks();
        attachTabs();
        attachAccordion();
        attachFormPreview();
    }());
    </script>
</body>
</html>
HTML;
}
