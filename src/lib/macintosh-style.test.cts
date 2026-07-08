/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '../..');

function readProjectFile(filePath: string) {
  return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
}

test('麦金塔主题使用语义选择器隔离导航和主题菜单状态', () => {
  const css = readProjectFile('src/themes/macintosh-1984/style.css');
  const themeSwitcher = readProjectFile('src/components/ui/ThemeSwitcher.tsx');
  const navigation = readProjectFile('src/components/layout/Navigation.tsx');

  assert.equal(css.includes('[data-theme="macintosh-1984"] nav button {\n'), false);

  [
    'theme-switcher-trigger',
    'theme-switcher-menu',
    'theme-switcher-option',
    '.platform-tab-active',
    '.nav-category-button',
    '.nav-subcategory-button',
    '.hot-news-item',
    '.weather-location-trigger',
    '.air-quality-badge',
  ].forEach((snippet) => {
    const source = [css, themeSwitcher, navigation].join('\n');
    assert.ok(source.includes(snippet), `missing ${snippet}`);
  });
});

test('麦金塔主题呈现 System 1 桌面窗口语汇', () => {
  const css = readProjectFile('src/themes/macintosh-1984/style.css');

  [
    '--mac-highlight: repeating-linear-gradient',
    '--mac-control-shadow: inset 1px 1px 0 var(--mac-paper), inset -2px -2px 0 var(--mac-gray-dark)',
    '--mac-inset-shadow: inset 2px 2px 0 var(--mac-gray-dark), inset -1px -1px 0 var(--mac-paper)',
    '[data-theme="macintosh-1984"] a.group::after',
    'box-shadow: var(--mac-control-shadow)',
    'background: var(--mac-highlight)',
    'image-rendering: pixelated',
  ].forEach((snippet) => {
    assert.ok(css.includes(snippet), `missing ${snippet}`);
  });
});

test('麦金塔主题打磨窗口层级和选中态可读性', () => {
  const css = readProjectFile('src/themes/macintosh-1984/style.css');

  [
    '--mac-hairline: 1px solid var(--mac-ink)',
    '--mac-window-shadow: 3px 3px 0 hsl(0 0% 18%)',
    '--mac-window-shadow-hover: 4px 4px 0 hsl(0 0% 18%)',
    'box-shadow: var(--mac-window-shadow)',
    'box-shadow: var(--mac-window-shadow-hover)',
    'background: var(--mac-titlebar)',
    'nav button.nav-category-button.nav-category-active span',
    'nav button.nav-category-button.nav-category-active svg',
    'nav button.mobile-nav-category-button.mobile-nav-category-active',
    'color: var(--mac-paper) !important',
  ].forEach((snippet) => {
    assert.ok(css.includes(snippet), `missing ${snippet}`);
  });

  assert.equal(css.includes('box-shadow: 6px 6px 0 var(--mac-ink)'), false);
});

test('麦金塔主题链接图标使用浅色内凹图标槽', () => {
  const css = readProjectFile('src/themes/macintosh-1984/style.css');
  const iconRule = css.match(/\[data-theme="macintosh-1984"\] a\.group \.icon-container,[\s\S]*?\n\}/)?.[0] || '';

  [
    '[data-theme="macintosh-1984"] a.group .icon-container,',
    '[data-theme="macintosh-1984"] a.group [class*="bg-muted"] {',
  ].forEach((snippet) => {
    assert.ok(css.includes(snippet), `missing ${snippet}`);
  });

  [
    'color: var(--mac-ink);',
    'background: var(--mac-paper);',
    'box-shadow: var(--mac-inset-shadow);',
  ].forEach((snippet) => {
    assert.ok(iconRule.includes(snippet), `missing icon rule snippet ${snippet}`);
  });
});

test('麦金塔主题窗口装饰只应用在链接卡片，避免挤压小部件内容', () => {
  const css = readProjectFile('src/themes/macintosh-1984/style.css');
  const titlebarRule = css.match(/\[data-theme="macintosh-1984"\] a\.group::before[\s\S]*?\n\}/)?.[0] || '';

  [
    'position: absolute;',
    'top: 0;',
    'left: 0;',
    'right: 0;',
    'z-index: 0;',
  ].forEach((snippet) => {
    assert.ok(titlebarRule.includes(snippet), `missing titlebar rule snippet ${snippet}`);
  });

  assert.equal(css.includes('[data-theme="macintosh-1984"] .widget-card::before'), false);
  assert.equal(css.includes('[data-theme="macintosh-1984"] .widget-card::after'), false);
  assert.equal(css.includes('[data-theme="macintosh-1984"] .group::before'), false);
  assert.equal(css.includes('[data-theme="macintosh-1984"] .group::after'), false);
  assert.equal(css.includes('[data-theme="macintosh-1984"] .group,'), false);
  assert.equal(css.includes('[data-theme="macintosh-1984"] .group:hover'), false);
  assert.equal(titlebarRule.includes('display: block;'), false);
  assert.equal(titlebarRule.includes('margin:'), false);
});

test('麦金塔主题细化被标注区域的对齐和留白', () => {
  const css = readProjectFile('src/themes/macintosh-1984/style.css');
  const linkCardRule = css.match(/\[data-theme="macintosh-1984"\] a\.group \{[\s\S]*?\n\}/)?.[0] || '';
  const headingRule = css.match(/\[data-theme="macintosh-1984"\] a\.group h3[\s\S]*?\n\}/)?.[0] || '';
  const weatherControlRule = css.match(/\[data-theme="macintosh-1984"\] \.weather-widget \.weather-location-trigger[\s\S]*?\n\}/)?.[0] || '';
  const airBadgeRule = css.match(/\[data-theme="macintosh-1984"\] \.weather-widget \.air-quality-badge \{[\s\S]*?\n\}/)?.[0] || '';
  const themeTriggerRule = css.match(/\[data-theme="macintosh-1984"\] \.theme-switcher-trigger \{[\s\S]*?\n\}/)?.[0] || '';

  [
    'padding-top: 1.65rem !important;',
    'min-height: 8.6rem;',
  ].forEach((snippet) => {
    assert.ok(linkCardRule.includes(snippet), `missing link card spacing snippet ${snippet}`);
  });

  [
    'font-size: 1rem;',
    'line-height: 1.2;',
  ].forEach((snippet) => {
    assert.ok(headingRule.includes(snippet), `missing heading snippet ${snippet}`);
  });

  [
    'display: inline-flex;',
    'width: 1.25rem;',
    'height: 1.25rem;',
    'margin-left: 0.35rem;',
    'padding: 0;',
    'vertical-align: middle;',
  ].forEach((snippet) => {
    assert.ok(weatherControlRule.includes(snippet), `missing weather control snippet ${snippet}`);
  });

  [
    'height: 1.35rem;',
    'min-width: 3.4rem;',
    'padding: 0 0.45rem;',
    'justify-content: space-between;',
  ].forEach((snippet) => {
    assert.ok(airBadgeRule.includes(snippet), `missing air badge snippet ${snippet}`);
  });

  [
    'display: inline-flex;',
    'width: 2.45rem;',
    'height: 2.45rem;',
    'align-items: center;',
    'justify-content: center;',
  ].forEach((snippet) => {
    assert.ok(themeTriggerRule.includes(snippet), `missing theme trigger snippet ${snippet}`);
  });

  assert.ok(css.includes('--mac-highlight: repeating-linear-gradient(\n    to bottom,'));
});
