/* eslint-disable @typescript-eslint/no-require-imports */
import type { Collection, Link } from '../types';

const assert = require('node:assert/strict');
const test = require('node:test');

const { searchItems, readInitialQuery, planQuerySync } = require('./search.ts') as {
  searchItems: (
    items: import('./search').SearchItem[],
    query: string,
  ) => import('./search').SearchItem[];
  readInitialQuery: (href: string) => string;
  planQuerySync: (options: {
    open: boolean;
    query: string;
    justClosed: boolean;
  }) => import('./search').QuerySync;
};
const { assertUniqueSlugs, resolveCollections, resolveCollectionBySlug } =
  require('./collection.ts') as {
    assertUniqueSlugs: (collections: Collection[]) => void;
    resolveCollections: (collections: Collection[]) => Collection[];
    resolveCollectionBySlug: (
      collections: Collection[],
      links: Link[],
      slug: string,
    ) => { collection: Collection; links: Link[] } | null;
  };

function item(partial: Partial<import('./search').SearchItem>): import('./search').SearchItem {
  return {
    id: 'i-1',
    name: 'Snipaste',
    desc: '截图贴图工具',
    url: 'https://example.com',
    tags: [],
    review: '贴图用过就回不去',
    categoryName: '桌面软件',
    ...partial,
  };
}

function collection(
  partial: Partial<Collection> & Pick<Collection, 'id' | 'name' | 'slug'>,
): Collection {
  return {
    description: '',
    cover: '',
    order: 0,
    visible: true,
    linkIds: [],
    ...partial,
  };
}

function link(partial: Partial<Link>): Link {
  return {
    id: 'l-1',
    name: 'x',
    created: '2026-01-01T00:00:00.000Z',
    desc: '',
    url: 'https://example.com',
    categoryIds: [],
    category1Id: null,
    category2Id: null,
    category1: '',
    category2: '',
    iconfile: '',
    iconlink: '',
    tags: [],
    collectionIds: [],
    review: '',
    ...partial,
  };
}

test('搜索命中名称 / 描述 / 点评 / 分类名', () => {
  const items = [item({})];
  assert.equal(searchItems(items, 'snip').length, 1, '名称命中');
  assert.equal(searchItems(items, '截图').length, 1, '描述命中');
  assert.equal(searchItems(items, '回不去').length, 1, '点评命中');
  assert.equal(searchItems(items, '桌面').length, 1, '分类名命中');
  assert.equal(searchItems(items, '不存在').length, 0, '无命中');
});

test('搜索空格分词做 AND 匹配', () => {
  const items = [item({})];
  assert.equal(searchItems(items, 'snip 截图').length, 1, '两个 token 都命中');
  assert.equal(searchItems(items, 'snip 不存在').length, 0, '任一 token 不中则排除');
});

test('从地址栏解析初始查询词', () => {
  const base = 'https://nav.wrysmile.cn/';
  assert.equal(readInitialQuery(`${base}?q=${encodeURIComponent('图床')}`), '图床', '读取 q');
  assert.equal(
    readInitialQuery(`${base}?q=%E5%9B%BE%E5%BA%8A+%E5%85%8D%E8%B4%B9`),
    '图床 免费',
    '百分号编码与 + 号都还原',
  );
  assert.equal(readInitialQuery(`${base}?q=%20%20`), '', '纯空白视为无查询');
  assert.equal(readInitialQuery(`${base}?other=1`), '', '无 q 返回空串');
  assert.equal(readInitialQuery(''), '', 'href 为空时不抛错');
});

test('地址栏 q 的同步时机：关闭才清，首帧不动', () => {
  assert.equal(
    planQuerySync({ open: true, query: '图床', justClosed: false }),
    'set',
    '打开且有词时写入',
  );
  assert.equal(
    planQuerySync({ open: true, query: '', justClosed: false }),
    'none',
    '打开但尚未输入时不碰地址栏，保留分享链接带来的 q',
  );
  assert.equal(
    planQuerySync({ open: false, query: '', justClosed: true }),
    'delete',
    '关闭面板时清掉，避免被收藏或在刷新时误触发面板',
  );
  assert.equal(
    planQuerySync({ open: false, query: '', justClosed: false }),
    'none',
    '首帧本就是关闭态，不能清掉别人分享链接里的 q',
  );
});

test('slug 重复时抛错并报出冲突的两个合集', () => {
  assert.throws(
    () =>
      assertUniqueSlugs([
        collection({ id: 'a', name: '免费图床', slug: 'tuchuang' }),
        collection({ id: 'b', name: '图床', slug: 'tuchuang' }),
      ]),
    /tuchuang/,
    '重复 slug 应抛错',
  );
});

test('resolveCollections 只保留可见合集并按 order 升序', () => {
  const result = resolveCollections([
    collection({ id: 'a', name: 'B', slug: 'b', order: 200, visible: true }),
    collection({ id: 'c', name: 'A', slug: 'a', order: 100, visible: true }),
    collection({ id: 'd', name: '隐藏', slug: 'hidden', order: 0, visible: false }),
  ]);
  assert.deepEqual(
    result.map((c) => c.slug),
    ['a', 'b'],
    '私人的应被过滤，公开的按 order 排序',
  );
});

test('resolveCollectionBySlug 定位合集并挂上成员链接', () => {
  const collections = [collection({ id: 'col-1', name: '免费图床', slug: 'tuchuang' })];
  const links = [
    link({ id: 'x', collectionIds: ['col-1'], review: 'A' }),
    link({ id: 'y', collectionIds: [] }),
    link({ id: 'z', collectionIds: ['col-1'], tags: ['推荐'] }),
  ];

  const result = resolveCollectionBySlug(collections, links, 'tuchuang');
  assert.ok(result, '应定位到合集');
  assert.deepEqual(
    result!.links.map((l) => l.id),
    ['z', 'x'],
    '推荐优先，其余按创建时间',
  );

  assert.equal(resolveCollectionBySlug(collections, links, 'nope'), null, 'slug 不存在返回 null');
});
