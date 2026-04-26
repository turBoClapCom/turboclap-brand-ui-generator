<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/brand-template.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * Send a JSON response and end execution.
 */
function respondJson(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Read and decode the request payload.
 */
function readRequestPayload(): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respondJson(['success' => false, 'error' => 'Only POST requests are allowed.'], 405);
    }

    $rawBody = file_get_contents('php://input');
    $payload = $rawBody !== false ? trim($rawBody) : '';

    if ($payload === '' && isset($_POST['payload'])) {
        $payload = trim((string) $_POST['payload']);
    }

    if ($payload === '') {
        respondJson(['success' => false, 'error' => 'Request body is empty.'], 422);
    }

    $decoded = json_decode($payload, true);

    if (!is_array($decoded)) {
        respondJson(['success' => false, 'error' => 'Invalid JSON payload.'], 422);
    }

    return $decoded;
}

/**
 * Collapse whitespace and strip tags from freeform text.
 */
function sanitizeText(?string $value, int $maxLength = 160): string
{
    $clean = strip_tags((string) $value);
    $clean = preg_replace('/\s+/', ' ', trim($clean)) ?? '';

    return substr($clean, 0, $maxLength);
}

/**
 * Extract a valid email from plain text or markdown-like input.
 */
function sanitizeEmail(?string $value): string
{
    $clean = sanitizeText($value, 200);

    if (preg_match('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', $clean, $matches) === 1) {
        $email = $matches[0];

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
    }

    return '';
}

/**
 * Sanitize a phone number while preserving common display characters.
 */
function sanitizePhone(?string $value): string
{
    $clean = preg_replace('/[^0-9+\s().-]/', '', (string) $value) ?? '';
    $clean = preg_replace('/\s+/', ' ', trim($clean)) ?? '';

    return substr($clean, 0, 40);
}

/**
 * Validate and normalize a hex color.
 */
function sanitizeHexColor(?string $value): string
{
    $clean = strtoupper(trim((string) $value));

    if (preg_match('/^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/', $clean) === 1) {
        return $clean;
    }

    return '';
}

/**
 * Sanitize a public logo URL.
 */
function sanitizeUrl(?string $value): string
{
    $clean = trim(strip_tags((string) $value));

    if ($clean === '') {
        return '';
    }

    return filter_var($clean, FILTER_VALIDATE_URL) ? $clean : '';
}

/**
 * Sanitize a font family name.
 */
function sanitizeFont(?string $value, string $fallback): string
{
    $clean = preg_replace('/[^a-zA-Z0-9\s-]/', '', trim((string) $value)) ?? '';
    $clean = preg_replace('/\s+/', ' ', $clean) ?? '';

    return $clean !== '' ? substr($clean, 0, 80) : $fallback;
}

/**
 * Sanitize the incoming brand payload into a predictable structure.
 */
function sanitizeBrand(array $payload): array
{
    $brand = $payload['brand'] ?? [];
    $colors = is_array($brand['colors'] ?? null) ? $brand['colors'] : [];
    $fonts = is_array($brand['fonts'] ?? null) ? $brand['fonts'] : [];
    $contact = is_array($brand['contact'] ?? null) ? $brand['contact'] : [];
    $media = is_array($brand['media'] ?? null) ? $brand['media'] : [];

    return [
        'name' => sanitizeText($brand['name'] ?? '', 120),
        'tagline' => sanitizeText($brand['tagline'] ?? '', 180),
        'logo' => sanitizeUrl($brand['logo'] ?? ''),
        'colors' => [
            'primary' => sanitizeHexColor($colors['primary'] ?? ''),
            'secondary' => sanitizeHexColor($colors['secondary'] ?? '') ?: '#22C55E',
            'accent' => sanitizeHexColor($colors['accent'] ?? '') ?: '#F59E0B',
            'background' => sanitizeHexColor($colors['background'] ?? '') ?: '#FFFFFF',
            'text' => sanitizeHexColor($colors['text'] ?? '') ?: '#111827',
        ],
        'fonts' => [
            'heading' => sanitizeFont($fonts['heading'] ?? 'Poppins', 'Poppins'),
            'body' => sanitizeFont($fonts['body'] ?? 'Inter', 'Inter'),
        ],
        'contact' => [
            'email' => sanitizeEmail($contact['email'] ?? ''),
            'phone' => sanitizePhone($contact['phone'] ?? ''),
        ],
        'media' => [
            'hero' => sanitizeUrl($media['hero'] ?? ''),
        ],
    ];
}

/**
 * Enforce the required schema fields.
 */
function validateBrand(array $brand): void
{
    if (($brand['name'] ?? '') === '') {
        respondJson(['success' => false, 'error' => 'Missing required field: brand.name'], 422);
    }

    if (($brand['colors']['primary'] ?? '') === '') {
        respondJson(['success' => false, 'error' => 'Missing or invalid required field: brand.colors.primary'], 422);
    }
}

/**
 * Build a filesystem-safe export filename from the brand name.
 */
function buildExportFilename(string $brandName): string
{
    $slug = preg_replace('/[^a-z0-9]+/i', '-', strtolower($brandName)) ?? '';
    $slug = trim($slug, '-');

    return ($slug !== '' ? $slug : 'brand-preview') . '.html';
}

/**
 * Save the standalone HTML export to disk.
 */
function saveStandaloneExport(array $brand): array
{
    $fileName = buildExportFilename($brand['name']);
    $exportDir = dirname(__DIR__) . '/exports';

    if (!is_dir($exportDir) && !mkdir($exportDir, 0777, true) && !is_dir($exportDir)) {
        respondJson(['success' => false, 'error' => 'Unable to create the exports directory.'], 500);
    }

    $filePath = $exportDir . '/' . $fileName;
    $html = brandUiRenderStandaloneHtml($brand);

    if (file_put_contents($filePath, $html) === false) {
        respondJson(['success' => false, 'error' => 'Unable to write the export file.'], 500);
    }

    return [
        'fileName' => $fileName,
        'url' => 'exports/' . rawurlencode($fileName),
    ];
}

$payload = readRequestPayload();
$brand = sanitizeBrand($payload);
validateBrand($brand);

$response = [
    'success' => true,
    'data' => $brand,
    'preview_html' => brandUiRenderPreview($brand),
    'tailwind_config' => brandUiBuildTailwindConfig($brand),
    'css_variables' => brandUiBuildCssVariables($brand),
];

if (($payload['action'] ?? 'preview') === 'export') {
    $response['export'] = saveStandaloneExport($brand);
}

respondJson($response);
