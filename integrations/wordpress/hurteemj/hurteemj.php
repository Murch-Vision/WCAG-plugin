<?php
/**
 * Plugin Name: Hurteemj — WCAG 2.2 Accessibility
 * Description: WCAG 2.2 (ISO/IEC 40500) аудит, аюулгүй засвар, хэрэглэгчийн хүртээмжийн самбар.
 * Version: 1.0.0
 * Requires at least: 6.3
 * Requires PHP: 7.4
 * License: MIT
 * Text Domain: hurteemj
 */
if (!defined('ABSPATH')) exit;

const HURTEEMJ_OPT = 'hurteemj_settings';

function hurteemj_defaults() {
  return [
    'level' => 'AA', 'fix' => 'safe', 'ui_lang' => 'mn', 'position' => 'bottom-right', 'color' => '#0b4bd1',
    'statement_url' => '', 'feedback_url' => '', 'ignore' => '', 'auditor_admins' => '1', 'report_endpoint' => '',
  ];
}
function hurteemj_opts() { return wp_parse_args(get_option(HURTEEMJ_OPT, []), hurteemj_defaults()); }

add_action('wp_enqueue_scripts', function () {
  $o = hurteemj_opts();
  wp_enqueue_script('hurteemj', plugins_url('hurteemj.min.js', __FILE__), [], '1.0.0', ['strategy' => 'defer', 'in_footer' => false]);
  $cfg = [
    'level' => $o['level'], 'fix' => $o['fix'] === 'off' ? false : $o['fix'], 'uiLang' => $o['ui_lang'],
    'position' => $o['position'], 'color' => $o['color'],
    'statementUrl' => $o['statement_url'] ?: null, 'feedbackUrl' => $o['feedback_url'] ?: null,
    'ignore' => array_values(array_filter(array_map('trim', explode(',', $o['ignore'])))),
    // Админ хэрэглэгчид хөгжүүлэгчийн тайланг самбарт харна
    'auditor' => $o['auditor_admins'] === '1' && current_user_can('manage_options'),
    'reportEndpoint' => $o['report_endpoint'] ?: null,
    'lang' => substr(get_locale(), 0, 2),
    // WP admin bar зэрэг өөрийн хэсгийг шалгахгүй
    'auto' => true,
  ];
  $cfg['ignore'][] = '#wpadminbar';
  wp_add_inline_script('hurteemj', 'window.HurteemjConfig=' . wp_json_encode($cfg) . ';', 'before');
});

add_action('admin_menu', function () {
  add_options_page('Hurteemj', 'Хүртээмж (WCAG)', 'manage_options', 'hurteemj', 'hurteemj_settings_page');
});

add_action('admin_init', function () {
  register_setting('hurteemj', HURTEEMJ_OPT, ['sanitize_callback' => function ($in) {
    $d = hurteemj_defaults(); $out = [];
    $out['level'] = in_array($in['level'] ?? '', ['A', 'AA', 'AAA'], true) ? $in['level'] : $d['level'];
    $out['fix'] = in_array($in['fix'] ?? '', ['off', 'safe', 'heuristic'], true) ? $in['fix'] : $d['fix'];
    $out['ui_lang'] = in_array($in['ui_lang'] ?? '', ['mn', 'en'], true) ? $in['ui_lang'] : $d['ui_lang'];
    $out['position'] = in_array($in['position'] ?? '', ['bottom-right', 'bottom-left', 'top-right', 'top-left'], true) ? $in['position'] : $d['position'];
    $color = (string) ($in['color'] ?? '');
    $out['color'] = preg_match('/^#([A-Fa-f0-9]{3}){1,2}$/', $color) ? $color : $d['color'];
    $out['statement_url'] = esc_url_raw($in['statement_url'] ?? '');
    $out['feedback_url'] = esc_url_raw($in['feedback_url'] ?? '', ['http', 'https', 'mailto']);
    $out['report_endpoint'] = esc_url_raw($in['report_endpoint'] ?? '');
    $out['ignore'] = sanitize_text_field($in['ignore'] ?? '');
    $out['auditor_admins'] = empty($in['auditor_admins']) ? '0' : '1';
    return $out;
  }]);
});

function hurteemj_settings_page() {
  $o = hurteemj_opts(); $n = HURTEEMJ_OPT;
  $sel = function ($k, $opts) use ($o, $n) {
    echo '<select id="hj-' . esc_attr($k) . '" name="' . esc_attr("{$n}[{$k}]") . '">';
    foreach ($opts as $v => $l) printf('<option value="%s"%s>%s</option>', esc_attr($v), selected($o[$k], $v, false), esc_html($l));
    echo '</select>';
  };
  ?>
  <div class="wrap"><h1>Хүртээмж — WCAG 2.2</h1>
  <p>Энэ plugin нь автомат аудит ба аюулгүй засвар хийх боловч WCAG-д бүрэн нийцүүлэх баталгаа биш. Гараар шалгах шаардлагатай зүйлсийг админ самбарын "Хөгжүүлэгчийн тайлан"-аас харна уу.</p>
  <form method="post" action="options.php"><?php settings_fields('hurteemj'); ?>
  <table class="form-table" role="presentation">
    <tr><th scope="row"><label for="hj-level">Зорилтот түвшин</label></th><td><?php $sel('level', ['A' => 'A', 'AA' => 'AA (зөвлөмж)', 'AAA' => 'AAA']); ?></td></tr>
    <tr><th scope="row"><label for="hj-fix">Автомат засвар</label></th><td><?php $sel('fix', ['off' => 'Унтраах (зөвхөн аудит)', 'safe' => 'Аюулгүй (зөвлөмж)', 'heuristic' => 'Таамаглал (heuristic) — хянаж ашиглана']); ?></td></tr>
    <tr><th scope="row"><label for="hj-ui_lang">Самбарын хэл</label></th><td><?php $sel('ui_lang', ['mn' => 'Монгол', 'en' => 'English']); ?></td></tr>
    <tr><th scope="row"><label for="hj-position">Байршил</label></th><td><?php $sel('position', ['bottom-right' => 'Баруун доор', 'bottom-left' => 'Зүүн доор', 'top-right' => 'Баруун дээр', 'top-left' => 'Зүүн дээр']); ?></td></tr>
    <tr><th scope="row"><label for="hj-color">Өнгө</label></th><td><input type="color" id="hj-color" name="<?php echo esc_attr("{$n}[color]"); ?>" value="<?php echo esc_attr($o['color']); ?>"> <p class="description">Тодрол 4.5:1-ээс бага бол автоматаар бараан болгоно.</p></td></tr>
    <tr><th scope="row"><label for="hj-st">Хүртээмжийн мэдэгдлийн URL</label></th><td><input class="regular-text" type="url" id="hj-st" name="<?php echo esc_attr("{$n}[statement_url]"); ?>" value="<?php echo esc_attr($o['statement_url']); ?>"></td></tr>
    <tr><th scope="row"><label for="hj-fb">Санал хүсэлтийн URL / mailto</label></th><td><input class="regular-text" type="text" id="hj-fb" name="<?php echo esc_attr("{$n}[feedback_url]"); ?>" value="<?php echo esc_attr($o['feedback_url']); ?>"></td></tr>
    <tr><th scope="row"><label for="hj-ig">Шалгахгүй selector</label></th><td><input class="regular-text" type="text" id="hj-ig" name="<?php echo esc_attr("{$n}[ignore]"); ?>" value="<?php echo esc_attr($o['ignore']); ?>" placeholder=".ads, #chat-widget"></td></tr>
    <tr><th scope="row"><label for="hj-re">Тайлан хүлээн авах endpoint</label></th><td><input class="regular-text" type="url" id="hj-re" name="<?php echo esc_attr("{$n}[report_endpoint]"); ?>" value="<?php echo esc_attr($o['report_endpoint']); ?>"></td></tr>
    <tr><th scope="row">Хөгжүүлэгчийн тайлан</th><td><label><input type="checkbox" name="<?php echo esc_attr("{$n}[auditor_admins]"); ?>" value="1" <?php checked($o['auditor_admins'], '1'); ?>> Админуудад самбарт харуулах</label></td></tr>
  </table><?php submit_button(); ?></form></div>
  <?php
}
