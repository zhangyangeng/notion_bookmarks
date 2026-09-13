/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const { detectPlatform, searchShortcut } = require('./platform');

/** 临时替换 globalThis.navigator，跑完还原 —— Node 里 navigator 是只读 getter */
function withNavigator(value: unknown, fn: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
  try {
    fn();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'navigator', original);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
}

test('userAgentData.platform 优先于 UA 字符串', () => {
  withNavigator(
    { userAgentData: { platform: 'macOS' }, userAgent: 'Mozilla/5.0 (Windows NT 10.0)' },
    () => {
      assert.equal(detectPlatform(), 'mac');
    },
  );
});

test('Windows 判定为非 mac', () => {
  withNavigator({ userAgentData: { platform: 'Windows' }, userAgent: 'Mozilla/5.0' }, () => {
    assert.equal(detectPlatform(), 'other');
  });
});

test('没有 userAgentData 时回落到 UA 字符串', () => {
  withNavigator(
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36' },
    () => assert.equal(detectPlatform(), 'other'),
  );
  withNavigator({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140.0.0.0' }, () =>
    assert.equal(detectPlatform(), 'other'),
  );
});

test('iPadOS 伪装成 Macintosh 时仍判定为 mac', () => {
  withNavigator(
    {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      maxTouchPoints: 5,
    },
    () => assert.equal(detectPlatform(), 'mac'),
  );
  withNavigator(
    {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
      maxTouchPoints: 5,
    },
    () => assert.equal(detectPlatform(), 'mac'),
  );
});

test('挂载前不渲染快捷键，挂载后按平台给出 ⌘ / Ctrl', () => {
  assert.equal(searchShortcut(null), null);
  assert.deepEqual(searchShortcut('mac'), { modifier: '⌘', key: 'K' });
  assert.deepEqual(searchShortcut('other'), { modifier: 'Ctrl', key: 'K' });
});
