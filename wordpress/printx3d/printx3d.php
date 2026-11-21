<?php
/**
 * Plugin Name: PrintX3D Customizer
 * Description: 3D keychain preview. Shortcode: [printx3d]. Settings: PrintX3D in the left menu.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

const PRINTX3D_OPTION = 'printx3d_settings';
const PRINTX3D_MATERIALS = ['PLA', 'PETG', 'TPU'];

// Same starting data as prisma/seed.ts
function printx3d_defaults() {
    $c = fn($id, $name, $hex, $m = 'PLA') => ['id' => $id, 'name' => $name, 'hexCode' => $hex, 'materialType' => $m, 'inStock' => true];
    $s = fn($id, $name, $price, $depth, $bevel, $loop) => [
        'id' => $id, 'name' => $name, 'basePrice' => $price, 'isActive' => true,
        'config' => ['extrusionDepth' => $depth, 'bevel' => $bevel, 'hasBasePlate' => true, 'hasKeychainLoop' => $loop, 'maxLines' => 3],
    ];
    return [
        'styles' => [
            $s('style-keychain', 'Custom Contour Keychain', 5.99, 4, 0.5, true),
        ],
        'colors' => [
            $c('color-matte-black', 'Matte Black', '#111111'),
            $c('color-arctic-white', 'Arctic White', '#F8FAFC'),
            $c('color-flame-orange', 'Flame Orange', '#FF6600'),
            $c('color-sky-blue', 'Sky Cyan', '#00A3FF'),
            $c('color-royal-blue', 'Royal Blue', '#0047AB', 'PETG'),
            $c('color-fire-red', 'Fire Red', '#E50914'),
            $c('color-sun-yellow', 'Sunflower Yellow', '#FFD000'),
            $c('color-bubble-pink', 'Hot Pink', '#FF2E93'),
            $c('color-silk-gold', 'Silk Gold', '#D4AF37'),
            $c('color-emerald-green', 'Emerald Green', '#059669'),
            $c('color-lavender-purple', 'Lavender Purple', '#8B5CF6'),
            $c('color-mint-cyan', 'Mint Cyan', '#00E5BA', 'TPU'),
        ],
    ];
}

function printx3d_settings() {
    return get_option(PRINTX3D_OPTION) ?: printx3d_defaults();
}

// ─── Front end: [printx3d] ────────────────────────────────────
add_shortcode('printx3d', function () {
    $s = printx3d_settings();
    $data = [
        'fontBase' => plugins_url('fonts/', __FILE__),
        'styles' => array_values(array_filter($s['styles'], fn($x) => $x['isActive'])),
        'colors' => array_values(array_filter($s['colors'], fn($x) => $x['inStock'])),
    ];
    $ver = filemtime(__DIR__ . '/build/customizer.js');
    wp_enqueue_style('printx3d', plugins_url('build/customizer.css', __FILE__), [], $ver);
    wp_enqueue_script('printx3d', plugins_url('build/customizer.js', __FILE__), [], $ver, true);
    wp_add_inline_script('printx3d', 'window.PRINTX3D = ' . wp_json_encode($data) . ';', 'before');
    return '<div class="printx3d-customizer"></div>';
});

// ─── Admin: Settings → PrintX3D ───────────────────────────────
add_action('admin_init', function () {
    register_setting('printx3d', PRINTX3D_OPTION, ['sanitize_callback' => 'printx3d_sanitize']);
});

add_action('admin_menu', function () {
    add_menu_page('PrintX3D', 'PrintX3D', 'manage_options', 'printx3d', 'printx3d_admin_page', 'dashicons-art', 58);
});

// "Settings" link on the Plugins list row
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('admin.php?page=printx3d')) . '">Settings</a>');
    return $links;
});

/** Turns the posted form rows into clean settings. Rows with "Delete" ticked or no name are dropped. */
function printx3d_sanitize($in) {
    $out = ['colors' => [], 'styles' => []];
    foreach ((array) ($in['colors'] ?? []) as $r) {
        $name = sanitize_text_field($r['name'] ?? '');
        $hex = sanitize_hex_color($r['hexCode'] ?? '');
        if ($name === '' || !$hex || !empty($r['delete'])) continue;
        $out['colors'][] = [
            'id' => sanitize_key($r['id'] ?? '') ?: 'color-' . sanitize_title($name) . '-' . base_convert(time(), 10, 36),
            'name' => $name,
            'hexCode' => strtoupper($hex),
            'materialType' => in_array($r['materialType'] ?? '', PRINTX3D_MATERIALS, true) ? $r['materialType'] : 'PLA',
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
            'config' => [
                'extrusionDepth' => min(20, max(1, (float) ($r['extrusionDepth'] ?? 4))),
                'bevel' => min(2, max(0, (float) ($r['bevel'] ?? 0.5))),
                'hasBasePlate' => true,
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
    if (!current_user_can('manage_options')) return;
    $s = printx3d_settings();
    $o = PRINTX3D_OPTION;
    $blankColor = ['id' => '', 'name' => '', 'hexCode' => '#000000', 'materialType' => 'PLA', 'inStock' => true];
    $blankStyle = ['id' => '', 'name' => '', 'basePrice' => 0, 'isActive' => true,
        'config' => ['extrusionDepth' => 4, 'bevel' => 0.5, 'hasKeychainLoop' => true, 'maxLines' => 3]];
    ?>
    <div class="wrap">
        <h1>PrintX3D</h1>
        <?php settings_errors(); // top-level menu pages don't show "Settings saved" on their own ?>
        <p>Put <code>[printx3d]</code> on any page to show the 3D studio. Fill in the empty last row to add one.</p>
        <form method="post" action="options.php">
            <?php settings_fields('printx3d'); ?>

            <h2>Colours</h2>
            <table class="widefat striped">
                <thead><tr><th>Name</th><th>Colour</th><th>Material</th><th>In stock</th><th>Delete</th></tr></thead>
                <tbody>
                <?php foreach (array_merge($s['colors'], [$blankColor]) as $i => $c): $n = "{$o}[colors][$i]"; ?>
                    <tr>
                        <td><input type="hidden" name="<?= $n ?>[id]" value="<?= esc_attr($c['id']) ?>">
                            <input type="text" name="<?= $n ?>[name]" value="<?= esc_attr($c['name']) ?>" placeholder="New colour"></td>
                        <td><input type="color" name="<?= $n ?>[hexCode]" value="<?= esc_attr($c['hexCode']) ?>"></td>
                        <td><select name="<?= $n ?>[materialType]">
                            <?php foreach (PRINTX3D_MATERIALS as $m): ?>
                                <option <?php selected($c['materialType'], $m) ?>><?= $m ?></option>
                            <?php endforeach; ?>
                        </select></td>
                        <td><input type="checkbox" name="<?= $n ?>[inStock]" value="1" <?php checked($c['inStock']) ?>></td>
                        <td><?php if ($c['id']): ?><input type="checkbox" name="<?= $n ?>[delete]" value="1"><?php endif; ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>

            <h2>Products</h2>
            <table class="widefat striped">
                <thead><tr><th>Name</th><th>Price (৳)</th><th>Letter height (depth)</th><th>Bevel</th><th>Lines</th><th>Key loop</th><th>Active</th><th>Delete</th></tr></thead>
                <tbody>
                <?php foreach (array_merge($s['styles'], [$blankStyle]) as $i => $st): $n = "{$o}[styles][$i]"; $cf = $st['config']; ?>
                    <tr>
                        <td><input type="hidden" name="<?= $n ?>[id]" value="<?= esc_attr($st['id']) ?>">
                            <input type="text" name="<?= $n ?>[name]" value="<?= esc_attr($st['name']) ?>" placeholder="New product"></td>
                        <td><input type="number" step="0.01" min="0" name="<?= $n ?>[basePrice]" value="<?= esc_attr($st['basePrice']) ?>" style="width:90px"></td>
                        <td><input type="number" step="0.5" min="1" max="20" name="<?= $n ?>[extrusionDepth]" value="<?= esc_attr($cf['extrusionDepth']) ?>" style="width:80px"></td>
                        <td><input type="number" step="0.1" min="0" max="2" name="<?= $n ?>[bevel]" value="<?= esc_attr($cf['bevel']) ?>" style="width:70px"></td>
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

            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
