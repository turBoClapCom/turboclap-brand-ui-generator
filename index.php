<?php
declare(strict_types=1);

/**
 * Escape HTML output safely.
 */
function appEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/**
 * Load the default sample JSON shown in the editor.
 */
function loadDefaultSample(): string
{
    $samplePath = __DIR__ . '/brand.sample.json';

    if (is_file($samplePath)) {
        $contents = file_get_contents($samplePath);

        if ($contents !== false) {
            return $contents;
        }
    }

    return json_encode(
        [
            'brand' => [
                'name' => 'TurboClap',
                'tagline' => 'Build Faster',
                'logo' => 'https://via.placeholder.com/150',
                'colors' => [
                    'primary' => '#4F46E5',
                    'secondary' => '#22C55E',
                    'accent' => '#F59E0B',
                    'background' => '#FFFFFF',
                    'text' => '#111827',
                ],
                'fonts' => [
                    'heading' => 'Poppins',
                    'body' => 'Inter',
                ],
                'contact' => [
                    'email' => 'hello@brand.com',
                    'phone' => '+911234567890',
                ],
            ],
        ],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
    ) ?: '';
}

$defaultSample = loadDefaultSample();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TurboClap Brand UI Generator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="app-shell min-h-screen">
    <div class="app-noise"></div>
    <div class="workspace-shell">
        <main class="workspace-grid">
            <section class="tools-pane">
                <div class="workspace-brandbar panel-card rounded-[30px] border border-white/70 p-6 shadow-xl shadow-slate-900/5">
                    <div class="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <span class="hero-kicker">Brand Workflow Studio</span>
                            <h1 class="hero-title mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                                Tools on the left. Device preview on the right.
                            </h1>
                            <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                Build the brand payload, switch between mobile, tablet, and desktop frames, then export production-ready assets.
                            </p>
                        </div>
                        <div class="workspace-status-card">
                            <div class="flex items-center justify-between gap-4">
                                <span class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">System status</span>
                                <span id="status-badge" class="status-badge status-idle">Ready</span>
                            </div>
                            <p id="status-text" class="mt-3 text-sm leading-6 text-slate-600">
                                Load a sample or paste your own brand JSON to generate the preview.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="tools-scroll">
                    <div class="panel-card rounded-[30px] border border-white/70 p-6 shadow-xl shadow-slate-900/5">
                        <div class="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Brand Input</h2>
                                <p class="mt-1 text-sm text-slate-600">Paste JSON or load a local file. Validation runs before every request.</p>
                            </div>
                            <button id="reset-sample" type="button" class="secondary-chip">
                                Reset Sample
                            </button>
                        </div>

                        <div class="space-y-5">
                            <label class="block">
                                <span class="mb-2 block text-sm font-semibold text-slate-700">brand.json</span>
                                <textarea id="json-input" class="editor-textarea" spellcheck="false"><?= appEscape($defaultSample) ?></textarea>
                            </label>

                            <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                                <label class="file-drop">
                                    <span class="mb-2 block text-sm font-semibold text-slate-700">Upload JSON file</span>
                                    <input id="json-file" type="file" accept=".json,application/json" class="block w-full text-sm text-slate-700">
                                </label>
                                <button id="generate-button" type="button" class="primary-cta">
                                    Generate Preview
                                </button>
                                <button id="export-button" type="button" class="secondary-cta">
                                    Export HTML
                                </button>
                            </div>

                            <div id="error-box" class="hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>
                        </div>
                    </div>

                    <div class="panel-card rounded-[30px] border border-white/70 p-6 shadow-xl shadow-slate-900/5">
                        <div class="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Examples</h2>
                                <p class="mt-1 text-sm text-slate-600">Load a ready-made profile and tweak it.</p>
                            </div>
                        </div>
                        <div class="grid gap-3 sm:grid-cols-3">
                            <button type="button" class="example-button" data-example="examples/startup.json">Startup</button>
                            <button type="button" class="example-button" data-example="examples/agency.json">Agency</button>
                            <button type="button" class="example-button" data-example="examples/personal.json">Personal</button>
                        </div>
                    </div>

                    <div class="panel-card rounded-[30px] border border-white/70 p-6 shadow-xl shadow-slate-900/5">
                        <div class="mb-5">
                            <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Developer Exports</h2>
                            <p class="mt-1 text-sm text-slate-600">Generated from the latest valid brand payload.</p>
                        </div>

                        <div class="space-y-5">
                            <section class="export-card">
                                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <h3 class="text-lg font-semibold text-slate-900">Tailwind Config</h3>
                                    <div class="flex flex-wrap gap-2">
                                        <button type="button" id="copy-tailwind" class="utility-button">Copy</button>
                                        <button type="button" id="download-tailwind" class="utility-button">Download</button>
                                    </div>
                                </div>
                                <pre id="tailwind-output" class="code-output">Generate a preview to populate the Tailwind config export.</pre>
                            </section>

                            <section class="export-card">
                                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <h3 class="text-lg font-semibold text-slate-900">CSS Variables</h3>
                                    <div class="flex flex-wrap gap-2">
                                        <button type="button" id="copy-css" class="utility-button">Copy</button>
                                        <button type="button" id="download-css" class="utility-button">Download</button>
                                    </div>
                                </div>
                                <pre id="css-output" class="code-output">Generate a preview to populate the CSS variable export.</pre>
                            </section>

                            <div id="export-result" class="hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"></div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="preview-column">
                <div class="preview-panel rounded-[32px] border border-white/70 p-4 shadow-2xl shadow-slate-900/10 sm:p-5">
                    <div class="preview-toolbar">
                        <div>
                            <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Live Preview</h2>
                            <p class="mt-1 text-sm text-slate-600">Switch the device frame to inspect the brand across breakpoints.</p>
                        </div>
                        <div class="preview-actions">
                            <button id="screenshot-button" type="button" class="screenshot-button" title="Download Full HD Screenshot" aria-label="Download Full HD Screenshot">
                                <svg viewBox="0 0 24 24" aria-hidden="true" class="screenshot-icon">
                                    <path d="M9 4.5 7.8 6H5.75A2.75 2.75 0 0 0 3 8.75v8.5A2.75 2.75 0 0 0 5.75 20h12.5A2.75 2.75 0 0 0 21 17.25v-8.5A2.75 2.75 0 0 0 18.25 6H16.2L15 4.5H9Zm3 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.75a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" fill="currentColor"/>
                                </svg>
                                <span>HD Screenshot</span>
                            </button>
                            <div class="device-switcher" role="tablist" aria-label="Preview device modes">
                                <button type="button" class="device-toggle is-active" data-device="mobile" aria-pressed="true">Mobile</button>
                                <button type="button" class="device-toggle" data-device="tablet" aria-pressed="false">Tablet</button>
                                <button type="button" class="device-toggle" data-device="desktop" aria-pressed="false">Desktop</button>
                            </div>
                        </div>
                    </div>
                    <div class="preview-surface">
                        <div id="device-stage" class="device-stage" data-device="mobile">
                            <div class="device-frame">
                                <div class="device-hardware">
                                    <span class="device-camera"></span>
                                    <span class="device-speaker"></span>
                                </div>
                                <div id="preview-root" class="device-screen">
                                    <div class="empty-state">
                                        <div class="empty-orb"></div>
                                        <div>
                                            <h3 class="text-xl font-semibold text-slate-950">Preview will appear here</h3>
                                            <p class="mt-2 max-w-md text-sm leading-6 text-slate-600">
                                                Use the sample payload or upload a brand file to generate a responsive, exportable interface.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="assets/script.js"></script>
</body>
</html>
