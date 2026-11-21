<?php
/**
 * WooCommerce: "Add to cart" from the 3D studio, the design on cart and order lines, and the
 * staff-only "Download STL" button on the order screen.
 *
 * Trust rule: the browser only sends choices (text, font, ids). Everything is re-checked here and
 * the price always comes from the plugin settings, never from the request.
 */

if (!defined('ABSPATH')) exit;

const PRINTX3D_MAX_LINE_CHARS = 12;

function printx3d_find(array $rows, string $id) {
    foreach ($rows as $row) if (($row['id'] ?? null) === $id) return $row;
    return null;
}

/** Same rules as lib/keychain-text.ts: up to $maxLines non-empty lines of at most 12 characters. */
function printx3d_clean_text(string $text, int $maxLines): string {
    $lines = [];
    foreach (preg_split('/\r?\n/', $text) as $line) {
        $line = trim(mb_substr(trim(wp_strip_all_tags($line)), 0, PRINTX3D_MAX_LINE_CHARS));
        if ($line !== '') $lines[] = $line;
    }
    return implode("\n", array_slice($lines, 0, max(1, min(3, $maxLines))));
}

/**
 * Checks a design sent by the studio. Returns the design to store, or a WP_Error whose message is
 * shown to the customer.
 */
function printx3d_validate_design(array $in) {
    $s = printx3d_settings();
    $style = printx3d_find($s['styles'], (string) ($in['style'] ?? ''));
    if (!$style || empty($style['isActive'])) return new WP_Error('style', 'That product is no longer available. Please reload the page.');

    $text = printx3d_clean_text((string) ($in['text'] ?? ''), (int) ($style['config']['maxLines'] ?? 3));
    if ($text === '') return new WP_Error('text', 'Please type the text for your keychain.');

    $fonts = printx3d_fonts();
    $font = (string) ($in['font'] ?? '');
    if (!isset($fonts[$font])) return new WP_Error('font', 'That font is not available. Please pick another.');

    $colors = [];
    foreach (['textColor' => 'Letter colour', 'baseColor' => 'Base colour'] as $key => $label) {
        $c = printx3d_find($s['colors'], (string) ($in[$key] ?? ''));
        if (!$c || empty($c['inStock'])) return new WP_Error('color', "$label is out of stock. Please pick another colour.");
        $colors[$key] = ['id' => $c['id'], 'name' => $c['name'], 'hex' => $c['hexCode'], 'material' => $c['materialType']];
    }

    // A snapshot: the order keeps what the customer saw even if the settings change later
    return [
        'text' => $text,
        'font' => $font,
        'fontName' => $fonts[$font],
        'styleId' => $style['id'],
        'styleName' => $style['name'],
        'price' => (float) $style['basePrice'],
        'hasKeychainLoop' => !empty($style['config']['hasKeychainLoop']),
        'textColor' => $colors['textColor'],
        'baseColor' => $colors['baseColor'],
    ];
}

/** The hidden "Custom keychain" product every design is sold as; created on first use. */
function printx3d_product_id(): int {
    $id = (int) get_option('printx3d_product_id');
    $product = $id ? wc_get_product($id) : null;
    if ($product && $product->get_status() !== 'trash') return $id;

    $product = new WC_Product_Simple();
    $product->set_name('Custom keychain');
    $product->set_status('publish');
    $product->set_catalog_visibility('hidden'); // only reachable through the studio
    $product->set_regular_price('0'); // the real price is set per cart line from the design
    $product->set_reviews_allowed(false);
    $id = $product->save();
    update_option('printx3d_product_id', $id);
    return $id;
}

function printx3d_add_to_cart() {
    if (!check_ajax_referer('printx3d_cart', 'nonce', false)) {
        wp_send_json_error(['message' => 'Your session expired. Please reload the page and try again.'], 403);
    }
    if (!class_exists('WooCommerce')) wp_send_json_error(['message' => 'The shop is not available right now.'], 503);

    $design = printx3d_validate_design(wp_unslash($_POST));
    if (is_wp_error($design)) wp_send_json_error(['message' => $design->get_error_message()], 400);

    if (null === WC()->cart && function_exists('wc_load_cart')) wc_load_cart();
    $GLOBALS['printx3d_adding'] = true; // lets our own add through printx3d_block_direct_add
    $key = WC()->cart->add_to_cart(printx3d_product_id(), 1, 0, [], ['printx3d' => $design]);
    $GLOBALS['printx3d_adding'] = false;
    if (!$key) {
        wc_clear_notices();
        wp_send_json_error(['message' => 'Could not add to cart. Please try again.'], 500);
    }
    wp_send_json_success(['cartUrl' => wc_get_cart_url()]);
}
add_action('wp_ajax_printx3d_add_to_cart', 'printx3d_add_to_cart');
add_action('wp_ajax_nopriv_printx3d_add_to_cart', 'printx3d_add_to_cart');

/** Blocks adding the keychain product any other way (e.g. ?add-to-cart=ID): it would cost 0. */
function printx3d_block_direct_add($passed, $product_id) {
    if ((int) $product_id === (int) get_option('printx3d_product_id') && empty($GLOBALS['printx3d_adding'])) {
        wc_add_notice('Please design your keychain in the 3D studio first.', 'error');
        return false;
    }
    return $passed;
}
add_filter('woocommerce_add_to_cart_validation', 'printx3d_block_direct_add', 10, 2);

/**
 * Prices every keychain line from the current settings (the stored snapshot if the product was
 * deleted since), and drops keychain lines without a design, whichever way they got in.
 */
add_action('woocommerce_before_calculate_totals', function ($cart) {
    $productId = (int) get_option('printx3d_product_id');
    foreach ($cart->get_cart() as $key => $item) {
        if ((int) $item['product_id'] !== $productId) continue;
        if (empty($item['printx3d'])) {
            $cart->remove_cart_item($key);
            continue;
        }
        $style = printx3d_find(printx3d_settings()['styles'], $item['printx3d']['styleId']);
        $item['data']->set_price($style ? (float) $style['basePrice'] : (float) $item['printx3d']['price']);
    }
});

/** The design rows shown under the product on the cart and checkout pages. */
function printx3d_design_rows(array $d): array {
    return [
        'Text' => str_replace("\n", ' / ', $d['text']),
        'Font' => $d['fontName'],
        'Letter colour' => $d['textColor']['name'],
        'Base colour' => $d['baseColor']['name'],
        'Type' => $d['styleName'],
    ];
}

add_filter('woocommerce_get_item_data', function ($data, $item) {
    if (empty($item['printx3d'])) return $data;
    foreach (printx3d_design_rows($item['printx3d']) as $name => $value) $data[] = ['name' => $name, 'value' => $value];
    return $data;
}, 10, 2);

/** Saves the design on the order line: readable rows for everyone, the full design hidden (leading _). */
add_action('woocommerce_checkout_create_order_line_item', function ($item, $key, $values) {
    if (empty($values['printx3d'])) return;
    foreach (printx3d_design_rows($values['printx3d']) as $name => $value) $item->add_meta_data($name, $value, true);
    $item->add_meta_data('_printx3d_design', $values['printx3d'], true);
}, 10, 3);

// ─── Staff only: "Download STL" on the order screen ──────────
add_action('woocommerce_after_order_itemmeta', function ($itemId, $item) {
    if (!current_user_can('edit_shop_orders') || !is_callable([$item, 'get_meta'])) return;
    $d = $item->get_meta('_printx3d_design');
    if (empty($d['text'])) return;
    $file = 'PrintX3D_' . sanitize_file_name(str_replace("\n", '_', $d['text'])) . '_order-' . $item->get_order_id() . '.stl';
    $design = ['text' => $d['text'], 'font' => $d['font'], 'hasKeychainLoop' => (bool) $d['hasKeychainLoop']];
    printf(
        '<p><button type="button" class="button printx3d-stl" data-design="%s" data-filename="%s">Download STL</button> <span class="description">Letters: %s · Base: %s</span></p>',
        esc_attr(wp_json_encode($design)),
        esc_attr($file),
        esc_html($d['textColor']['name'] . ' (' . $d['textColor']['material'] . ')'),
        esc_html($d['baseColor']['name'] . ' (' . $d['baseColor']['material'] . ')')
    );
}, 10, 2);

// The STL builder loads only on order screens, and only for staff who can edit orders
add_action('admin_enqueue_scripts', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || !in_array($screen->id, ['shop_order', 'woocommerce_page_wc-orders'], true)) return;
    if (!current_user_can('edit_shop_orders')) return;
    $file = dirname(__DIR__) . '/build/admin.js';
    wp_enqueue_script('printx3d-admin', plugins_url('build/admin.js', dirname(__FILE__)), [], filemtime($file), true);
    wp_add_inline_script('printx3d-admin', 'window.PRINTX3D_ADMIN = ' . wp_json_encode(['fontBase' => plugins_url('fonts/', dirname(__FILE__))]) . ';', 'before');
});
