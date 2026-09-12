/* eslint-disable @typescript-eslint/no-require-imports */
import type { Category, Link } from '../types';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCategoryTree, resolveLinks, UNCATEGORIZED_ID } = require('./category.ts') as {
  buildCategoryTree: (records: Category[]) => Category[];
  resolveLinks: (links: Link[], records: Category[]) => Link[];
  UNCATEGORIZED_ID: string;
};

function category(partial: Pick<Category, 'id' | 'name'> & Partial<Category>): Category {
  return {
    iconName: '',
    order: 0,
    enabled: true,
    parentId: null,
    subCategories: [],
    ...partial,
  };
}

function link(partial: Partial<Link>): Link {
  return {
    id: 'link-1',
    name: '示例',
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
    ...partial,
  };
}

test('分类树剔除已关闭的分类', () => {
  const tree = buildCategoryTree([
    category({ id: 'dev', name: '开发资源', order: 1 }),
    category({ id: 'dev-online', name: '在线工具', order: 1, parentId: 'dev' }),
    category({ id: 'dev-dead', name: '已关停', order: 2, parentId: 'dev', enabled: false }),
    category({ id: 'media', name: '影音工具', order: 2, enabled: false }),
    category({ id: 'media-sub', name: '视频下载', order: 1, parentId: 'media' }),
  ]);

  assert.deepEqual(
    tree.map((node) => node.name),
    ['开发资源'],
    '关闭的一级不应出现在树里',
  );
  assert.deepEqual(
    tree[0].subCategories.map((sub) => sub.name),
    ['在线工具'],
    '关闭的二级不应出现，挂在关闭一级下的二级也不应出现',
  );
});

test('relation 指向启用分类时正常解析', () => {
  const records = [
    category({ id: 'dev', name: '开发资源', order: 1 }),
    category({ id: 'dev-online', name: '在线工具', order: 1, parentId: 'dev' }),
  ];

  const [withSub] = resolveLinks([link({ categoryIds: ['dev-online'] })], records);
  assert.equal(withSub.category1Id, 'dev');
  assert.equal(withSub.category2Id, 'dev-online', '指向二级时应顺带得到其父级');

  const [rootOnly] = resolveLinks([link({ categoryIds: ['dev'] })], records);
  assert.equal(rootOnly.category1Id, 'dev');
  assert.equal(rootOnly.category2Id, null, '直接指向一级时二级留空');
});

test('所属分类被关闭的条目直接不显示，不落入「未分类」', () => {
  const records = [
    category({ id: 'digital', name: '数码科技', order: 9, enabled: false }),
    category({ id: 'dev', name: '开发资源', order: 1 }),
    category({ id: 'dev-dead', name: '已关停', order: 2, parentId: 'dev', enabled: false }),
  ];

  const resolved = resolveLinks(
    [
      link({ id: 'a', categoryIds: ['digital'] }),
      link({ id: 'b', categoryIds: ['dev-dead'] }),
      link({ id: 'c', categoryIds: ['dev'] }),
    ],
    records,
  );

  assert.deepEqual(
    resolved.map((item) => item.id),
    ['c'],
    '归入关闭分类的条目应整条收起，而不是挤进「未分类」重新暴露',
  );
});

test('回退只在启用的分类中进行', () => {
  const records = [
    category({ id: 'dev', name: '开发资源', order: 1 }),
    category({ id: 'digital', name: '数码科技', order: 9, enabled: false }),
  ];

  const [rescued] = resolveLinks([link({ category1: '开发资源' })], records);
  assert.equal(rescued.category1Id, 'dev', '旧 Select 名应在启用分类中找回');

  const [closed] = resolveLinks([link({ category1: '数码科技' })], records);
  assert.equal(closed.category1Id, UNCATEGORIZED_ID, '关闭的分类不该被旧字段名找回来');

  const [unknown] = resolveLinks([link({ category1: '不存在的分类' })], records);
  assert.equal(unknown.category1Id, UNCATEGORIZED_ID, '两条路径都解析不出才落到「未分类」');
});

test('relation 指向已删除的分类记录时不算作「被关闭」', () => {
  const records = [category({ id: 'dev', name: '开发资源', order: 1 })];

  const [orphan] = resolveLinks([link({ categoryIds: ['已删除的id'] })], records);
  assert.equal(orphan.category1Id, UNCATEGORIZED_ID, '记录不存在属于归类缺失，应在界面上可见');
});
