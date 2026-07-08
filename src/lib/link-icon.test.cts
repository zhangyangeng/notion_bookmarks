/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  FALLBACK_ICON_SRC,
  getFailedIconState,
  getInitialIconState,
  getLinkIconUrl,
  getTimedOutIconState,
} = require('./link-icon');

test('优先使用 Notion 上传的 iconfile', () => {
  const iconUrl = getLinkIconUrl({
    iconfile: 'https://static.example.com/icon.png',
    iconlink: 'https://example.com/favicon.ico',
  });

  assert.equal(iconUrl, 'https://static.example.com/icon.png');
});

test('没有 iconfile 时使用 iconlink', () => {
  const iconUrl = getLinkIconUrl({
    iconfile: '',
    iconlink: 'https://example.com/favicon.ico',
  });

  assert.equal(iconUrl, 'https://example.com/favicon.ico');
});

test('没有远程图标时直接使用本地图标且不显示 loading', () => {
  const state = getInitialIconState({
    iconfile: '',
    iconlink: '',
  });

  assert.deepEqual(state, {
    src: FALLBACK_ICON_SRC,
    isLoaded: true,
    hasFailed: false,
    showFallback: false,
    showSpinner: false,
  });
});

test('远程图标失败或超时后切到本地图标并结束 loading', () => {
  const state = getFailedIconState();

  assert.deepEqual(state, {
    src: FALLBACK_ICON_SRC,
    isLoaded: true,
    hasFailed: true,
    showFallback: false,
    showSpinner: false,
  });
});

test('远程图标超时后保留原始 src，允许后续加载完成时显示真实图标', () => {
  const state = getTimedOutIconState({
    src: 'https://slow.example.com/favicon.ico',
    isLoaded: false,
    hasFailed: false,
    showFallback: false,
    showSpinner: true,
  });

  assert.deepEqual(state, {
    src: 'https://slow.example.com/favicon.ico',
    isLoaded: false,
    hasFailed: false,
    showFallback: true,
    showSpinner: false,
  });
});
