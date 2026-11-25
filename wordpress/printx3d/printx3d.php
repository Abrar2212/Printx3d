<?php
/**
 * Plugin Name: PrintX3D Customizer
 * Description: 3D keychain designer with WooCommerce cart and STL download. Shortcode: [printx3d]. Settings: PrintX3D in the left menu.
 * Version: 1.1.0
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) exit;

const PRINTX3D_OPTION = 'printx3d_settings';
const PRINTX3D_MATERIALS = ['PLA' => 'Plastic (PLA+)', 'TPU' => 'Flexible (TPU)'];

// Product sizes, saved in font units (the STL prints 1 unit as 16 mm) under the same names and
// ranges as SIZE_SETTINGS / DEFAULT_SIZE in lib/keychain-geometry.ts; keep the two in step.
// name => [label, default, min, max, shown value per unit]
const PRINTX3D_SIZES = [
    'fontSize' => ['Text size (%)', 1.2, 0.8, 1.8, 100 / 1.2],
    'extrusionDepth' => ['Letter height (mm)', 0.18, 0.1, 0.35, 16],
    'baseDepth' => ['Base thickness (mm)', 0.2, 0.12, 0.4, 16],
    'offsetRadius' => ['Border (mm)', 0.11, 0.06, 0.3, 16],
    'earRadius' => ['Ear radius (mm)', 0.25, 0.16, 0.4, 16],
    'holeRadius' => ['Hole diameter (mm)', 0.125, 0.06, 0.2, 32],
];

/** Sizes of a product: $saved in units (anything out of range, e.g. 1.0's extrusionDepth 4, is the default), overridden by $posted as shown in the form. */
function printx3d_sizes(array $saved, array $posted = []) {
    $out = [];
    foreach (PRINTX3D_SIZES as $name => [, $default, $min, $max, $per]) {
        $v = $saved[$name] ?? null;
        $out[$name] = is_numeric($v) && $v >= $min && $v <= $max ? (float) $v : $default;
        if (is_numeric($posted[$name] ?? null)) $out[$name] = min($max, max($min, $posted[$name] / $per));
    }
    // Same limits as keychainSize(): the ear reaches past the border, the hole keeps a wall
    $out['earRadius'] = max($out['earRadius'], $out['offsetRadius'] + 0.05);
    $out['holeRadius'] = min($out['holeRadius'], $out['earRadius'] - 0.06);
    return $out;
}

/** Materials a colour is stocked in; colours saved before 1.1 had no such list and count as both. */
function printx3d_color_materials(array $c) {
    return $c['materials'] ?? array_keys(PRINTX3D_MATERIALS);
}

// Same starting data as prisma/seed.ts
function printx3d_defaults() {
    $c = fn($id, $name, $hex) => ['id' => $id, 'name' => $name, 'hexCode' => $hex, 'materials' => array_keys(PRINTX3D_MATERIALS), 'inStock' => true];
    $s = fn($id, $name, $price, $loop) => [
        'id' => $id, 'name' => $name, 'basePrice' => $price, 'isActive' => true,
        'config' => printx3d_sizes([]) + ['hasKeychainLoop' => $loop, 'maxLines' => 3],
    ];
    return [
        'currency' => '$',
        'defaultText' => 'Your Name',
        'styles' => [
            $s('style-keychain', 'Custom Contour Keychain', 5.99, true),
        ],
        'colors' => [
            $c('color-matte-black', 'Matte Black', '#111111'),
            $c('color-arctic-white', 'Arctic White', '#F8FAFC'),
            $c('color-flame-orange', 'Flame Orange', '#FF6600'),
            $c('color-sky-blue', 'Sky Cyan', '#00A3FF'),
            $c('color-royal-blue', 'Royal Blue', '#0047AB'),
            $c('color-fire-red', 'Fire Red', '#E50914'),
            $c('color-sun-yellow', 'Sunflower Yellow', '#FFD000'),
            $c('color-bubble-pink', 'Hot Pink', '#FF2E93'),
            $c('color-silk-gold', 'Silk Gold', '#D4AF37'),
            $c('color-emerald-green', 'Emerald Green', '#059669'),
            $c('color-lavender-purple', 'Lavender Purple', '#8B5CF6'),
            $c('color-mint-cyan', 'Mint Cyan', '#00E5BA'),
        ],
    ];
}

/** Who may edit colours and products: with WooCommerce, shop managers too; otherwise administrators. */
function printx3d_cap() {
    return class_exists('WooCommerce') ? 'manage_woocommerce' : 'manage_options';
}

/** Fonts shipped in fonts/ (id => display name), written by the build from the font picker's list. */
function printx3d_fonts() {
    static $fonts = null;
    if ($fonts === null) $fonts = json_decode((string) @file_get_contents(__DIR__ . '/fonts/fonts.json'), true) ?: [];
    return $fonts;
}

/** With WooCommerce, its currency (the cart and checkout use it); otherwise the plugin setting. */
function printx3d_currency() {
    return function_exists('get_woocommerce_currency_symbol')
        ? html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8')
        : printx3d_settings()['currency'];
}

require __DIR__ . '/includes/woocommerce.php';

function printx3d_settings() {
    // + fills in settings added in later versions (e.g. currency) for sites that saved before them
    return (get_option(PRINTX3D_OPTION) ?: []) + printx3d_defaults();
}

// ─── Front end: [printx3d] ────────────────────────────────────
add_shortcode('printx3d', function () {
    $s = printx3d_settings();
    $colors = array_map(
        fn($c) => ['materials' => printx3d_color_materials($c)] + $c,
        array_values(array_filter($s['colors'], fn($x) => $x['inStock']))
    );
    $materials = [];
    foreach (PRINTX3D_MATERIALS as $id => $name)
        foreach ($colors as $c)
            if (in_array($id, $c['materials'], true)) { $materials[] = ['id' => $id, 'name' => $name]; break; }
    $data = [
        'fontBase' => plugins_url('fonts/', __FILE__),
        'currency' => printx3d_currency(),
        'defaultText' => $s['defaultText'],
        'styles' => array_values(array_filter($s['styles'], fn($x) => $x['isActive'])),
        'colors' => $colors,
        'materials' => $materials, // only those with a colour in stock
        // null hides the price bar and "Add to cart" (WooCommerce not active)
        'cart' => class_exists('WooCommerce')
            ? ['ajaxUrl' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('printx3d_cart')]
            : null,
    ];
    $ver = filemtime(__DIR__ . '/build/main.js');
    wp_enqueue_style('printx3d', plugins_url('build/customizer.css', __FILE__), [], $ver);
    wp_enqueue_script('printx3d', plugins_url('build/main.js', __FILE__), [], $ver, true);
    wp_add_inline_script('printx3d', 'window.PRINTX3D = ' . wp_json_encode($data) . ';', 'before');
    return '<div class="printx3d-customizer"></div>';
});

// ─── Admin: Settings → PrintX3D ───────────────────────────────
add_action('admin_init', function () {
    register_setting('printx3d', PRINTX3D_OPTION, ['sanitize_callback' => 'printx3d_sanitize']);
});
// options.php checks this before saving (default: administrators only)
add_filter('option_page_capability_printx3d', 'printx3d_cap');

add_action('admin_menu', function () {
    add_menu_page('PrintX3D', 'PrintX3D', printx3d_cap(), 'printx3d', 'printx3d_admin_page', 'dashicons-art', 58);
});

// "Settings" link on the Plugins list row
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('admin.php?page=printx3d')) . '">Settings</a>');
    return $links;
});

/** Turns the posted form rows into clean settings. Rows with "Delete" ticked or no name are dropped. */
function printx3d_sanitize($in) {
    $currency = mb_substr(sanitize_text_field($in['currency'] ?? ''), 0, 5);
    $text = mb_substr(sanitize_text_field($in['defaultText'] ?? ''), 0, 12); // one keychain line holds 12 characters
    $out = [
        'currency' => $currency !== '' ? $currency : '$',
        'defaultText' => $text !== '' ? $text : 'Your Name',
        'colors' => [],
        'styles' => [],
    ];
    foreach ((array) ($in['colors'] ?? []) as $r) {
        $name = sanitize_text_field($r['name'] ?? '');
        $hex = sanitize_hex_color($r['hexCode'] ?? '');
        if ($name === '' || !$hex || !empty($r['delete'])) continue;
        $out['colors'][] = [
            'id' => sanitize_key($r['id'] ?? '') ?: 'color-' . sanitize_title($name) . '-' . base_convert(time(), 10, 36),
            'name' => $name,
            'hexCode' => strtoupper($hex),
            'materials' => array_values(array_intersect(array_keys(PRINTX3D_MATERIALS), (array) ($r['materials'] ?? []))),
            'inStock' => !empty($r['inStock']),
        ];
    }
    foreach ((array) ($in['styles'] ?? []) as $r) {
        $name = sanitize_text_field($r['name'] ?? '');
        if ($name === '' || !empty($r['delete'])) continue;
        // WordPress runs this twice on the first save; the 2nd pass gets our own output, with settings under 'config'
        if (isset($r['config']) && is_array($r['config'])) $r = $r['config'] + $r;
        $out['styles'][] = [
            'id' => sanitize_key($r['id'] ?? '') ?: 'style-' . sanitize_title($name) . '-' . base_convert(time(), 10, 36),
            'name' => $name,
            'basePrice' => max(0, (float) ($r['basePrice'] ?? 0)),
            'isActive' => !empty($r['isActive']),
            'config' => printx3d_sizes($r, (array) ($r['size'] ?? [])) + [
                'hasKeychainLoop' => !empty($r['hasKeychainLoop']),
                'maxLines' => min(3, max(1, (int) ($r['maxLines'] ?? 3))),
            ],
        ];
    }
    if (!$out['colors']) {
        add_settings_error(PRINTX3D_OPTION, 'no-colors', 'Keep at least one colour. Nothing was saved.');
        return printx3d_settings();
    }
    return $out;
}

function printx3d_admin_page() {
    if (!current_user_can(printx3d_cap())) return;
    $s = printx3d_settings();
    $o = PRINTX3D_OPTION;
    $blankColor = ['id' => '', 'name' => '', 'hexCode' => '#000000', 'inStock' => true];
    $blankStyle = ['id' => '', 'name' => '', 'basePrice' => 0, 'isActive' => true,
        'config' => ['hasKeychainLoop' => true, 'maxLines' => 3]];
    ?>
    <div class="wrap">
        <h1>PrintX3D</h1>
        <?php settings_errors(); // top-level menu pages don't show "Settings saved" on their own ?>
        <?php if (!class_exists('WooCommerce')): ?>
            <div class="notice notice-warning inline"><p>Install and activate the free <strong>WooCommerce</strong> plugin to show prices and an <strong>Add to cart</strong> button. Without it the studio is a preview only.</p></div>
        <?php endif; ?>
        <p>Put <code>[printx3d]</code> on any page to show the 3D studio. Fill in the empty last row to add one.
            Orders appear under WooCommerce → Orders, each with a <strong>Download STL</strong> button.</p>
        <form method="post" action="options.php">
            <?php settings_fields('printx3d'); ?>

            <h2>General</h2>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="printx3d-currency">Currency symbol</label></th>
                    <td><?php if (class_exists('WooCommerce')): ?>
                        <strong><?= esc_html(printx3d_currency()) ?></strong>
                        <input type="hidden" name="<?= $o ?>[currency]" value="<?= esc_attr($s['currency']) ?>">
                        <p class="description">Uses the WooCommerce currency. Change it in <a href="<?= esc_url(admin_url('admin.php?page=wc-settings')) ?>">WooCommerce → Settings → General</a>.</p>
                    <?php else: ?>
                        <input id="printx3d-currency" type="text" name="<?= $o ?>[currency]" value="<?= esc_attr($s['currency']) ?>" maxlength="5" style="width:80px">
                        <p class="description">Shown before prices, e.g. $, €, £, ৳.</p>
                    <?php endif; ?></td>
                </tr>
                <tr>
                    <th scope="row"><label for="printx3d-text">Starting text</label></th>
                    <td><input id="printx3d-text" type="text" name="<?= $o ?>[defaultText]" value="<?= esc_attr($s['defaultText']) ?>" maxlength="12">
                        <p class="description">What the keychain says before the customer types (up to 12 characters).</p></td>
                </tr>
            </table>

            <h2>Colours</h2>
            <table class="widefat striped">
                <thead><tr><th>Name</th><th>Colour</th><th>Stocked in</th><th>In stock</th><th>Delete</th></tr></thead>
                <tbody>
                <?php foreach (array_merge($s['colors'], [$blankColor]) as $i => $c): $n = "{$o}[colors][$i]"; ?>
                    <tr>
                        <td><input type="hidden" name="<?= $n ?>[id]" value="<?= esc_attr($c['id']) ?>">
                            <input type="text" name="<?= $n ?>[name]" value="<?= esc_attr($c['name']) ?>" placeholder="New colour"></td>
                        <td><input type="color" name="<?= $n ?>[hexCode]" value="<?= esc_attr($c['hexCode']) ?>"></td>
                        <td><?php foreach (PRINTX3D_MATERIALS as $m => $label): ?>
                            <label style="margin-right:12px"><input type="checkbox" name="<?= $n ?>[materials][]" value="<?= $m ?>" <?php checked(in_array($m, printx3d_color_materials($c), true)) ?>> <?= esc_html($label) ?></label>
                        <?php endforeach; ?></td>
                        <td><input type="checkbox" name="<?= $n ?>[inStock]" value="1" <?php checked($c['inStock']) ?>></td>
                        <td><?php if ($c['id']): ?><input type="checkbox" name="<?= $n ?>[delete]" value="1"><?php endif; ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>

            <h2>Products</h2>
            <div style="overflow-x:auto">
            <table class="widefat striped">
                <thead><tr><th>Name</th><th>Price (<?= esc_html(printx3d_currency()) ?>)</th><?php foreach (PRINTX3D_SIZES as [$label]): ?><th><?= esc_html($label) ?></th><?php endforeach; ?><th>Lines</th><th>Key loop</th><th>Active</th><th>Delete</th></tr></thead>
                <tbody>
                <?php foreach (array_merge($s['styles'], [$blankStyle]) as $i => $st): $n = "{$o}[styles][$i]"; $cf = $st['config']; $sizes = printx3d_sizes($cf); ?>
                    <tr>
                        <td><input type="hidden" name="<?= $n ?>[id]" value="<?= esc_attr($st['id']) ?>">
                            <input type="text" name="<?= $n ?>[name]" value="<?= esc_attr($st['name']) ?>" placeholder="New product"></td>
                        <td><input type="number" step="0.01" min="0" name="<?= $n ?>[basePrice]" value="<?= esc_attr($st['basePrice']) ?>" style="width:90px"></td>
                        <?php foreach (PRINTX3D_SIZES as $k => [$label, , $min, $max, $per]): ?>
                            <td><input type="number" step="any" min="<?= round($min * $per, 2) ?>" max="<?= round($max * $per, 2) ?>" aria-label="<?= esc_attr($label) ?>" name="<?= $n ?>[size][<?= $k ?>]" value="<?= round($sizes[$k] * $per, 2) ?>" style="width:75px"></td>
                        <?php endforeach; ?>
                        <td><select name="<?= $n ?>[maxLines]">
                            <?php foreach ([1, 2, 3] as $l): ?><option <?php selected((int) ($cf['maxLines'] ?? 3), $l) ?>><?= $l ?></option><?php endforeach; ?>
                        </select></td>
                        <td><input type="checkbox" name="<?= $n ?>[hasKeychainLoop]" value="1" <?php checked(!empty($cf['hasKeychainLoop'])) ?>></td>
                        <td><input type="checkbox" name="<?= $n ?>[isActive]" value="1" <?php checked($st['isActive']) ?>></td>
                        <td><?php if ($st['id']): ?><input type="checkbox" name="<?= $n ?>[delete]" value="1"><?php endif; ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            </div>

            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
