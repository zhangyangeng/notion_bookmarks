/* eslint-disable @typescript-eslint/no-require-imports */
import type { Category, Link } from '../types';
import type { CategoryAnchor } from './category';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildCategoryTree,
  resolveLinks,
  parseCategoryAnchor,
  subCategoryAnchorId,
  anchorIdToSlug,
  UNCATEGORIZED_ID,
} = require('./category.ts') as {
  buildCategoryTree: (records: Category[]) => Category[];
  resolveLinks: (links: Link[], records: Category[]) => Link[];
  parseCategoryAnchor: (hash: string, categories: Category[]) => CategoryAnchor | null;
  subCategoryAnchorId: (categoryId: string, subCategoryId: string) => string;
  anchorIdToSlug: (anchorId: string, categories: Category[]) => string;
  UNCATEGORIZED_ID: string;
};

function category(partial: Pick<Category, 'id' | 'name'> & Partial<Category>): Category {
  return {
    slug: null,
    iconName: '',
    icon: null,
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
    collectionIds: [],
    review: '',
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

/*
 * 锚点解析。id 一律用 Notion 那种带连字符的 UUID 形态 ——
 * 这正是「不能按 `-` 拆分」的由来：拆出来的段数不固定，只能精确比对。
 */
const DEV = '1a2b3c4d-1111-2222-3333-444455556666';
const DEV_ONLINE = 'e5f6a7b8-9999-8888-7777-666655554444';

function anchorTree(): Category[] {
  return buildCategoryTree([
    category({ id: DEV, name: '开发资源', order: 1 }),
    category({ id: DEV_ONLINE, name: '在线工具', order: 1, parentId: DEV }),
  ]);
}

test('锚点解析：一级与二级分别命中', () => {
  const tree = anchorTree();

  assert.deepEqual(parseCategoryAnchor(`#${DEV}`, tree), { categoryId: DEV, subCategoryId: null });
  assert.deepEqual(parseCategoryAnchor(`#${DEV}-${DEV_ONLINE}`, tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
  assert.deepEqual(
    parseCategoryAnchor(DEV, tree),
    { categoryId: DEV, subCategoryId: null },
    '缺 # 也要认',
  );
});

test('锚点解析：id 自带连字符时不会被拆错', () => {
  const tree = anchorTree();

  // 按 '-' 拆的实现会把这段切成七段，从而把二级 id 认成一级
  assert.deepEqual(parseCategoryAnchor(`#${DEV}-${DEV_ONLINE}`, tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
});

test('锚点解析：二级已不在树上时退到它所属的一级', () => {
  const tree = anchorTree();
  const closedSub = 'deadbeef-0000-0000-0000-000000000000';

  assert.deepEqual(
    parseCategoryAnchor(`#${DEV}-${closedSub}`, tree),
    { categoryId: DEV, subCategoryId: null },
    '二级被关闭或已无链接时，保留「跳到这一类」的意图',
  );
});

test('锚点解析：解析不出时返回 null，由调用方回落到默认视图', () => {
  const tree = anchorTree();

  assert.equal(parseCategoryAnchor('', tree), null);
  assert.equal(parseCategoryAnchor('#', tree), null);
  assert.equal(parseCategoryAnchor('#不存在的分类', tree), null);
  assert.equal(
    parseCategoryAnchor(`#${DEV_ONLINE}`, tree),
    null,
    '二级 id 单独出现不算命中 —— 锚点必须是完整拼法',
  );
});

/*
 * 短名锚点。一级短名充当命名空间（`dev`），二级短名只在自己一级内需唯一（`dev/online-tools`）。
 * 与 id 锚点同样不做拆分 —— 一级短名里允许出现 `-`。
 */
function slugTree(): Category[] {
  return buildCategoryTree([
    category({ id: DEV, name: '开发资源', order: 1, slug: 'dev' }),
    category({ id: DEV_ONLINE, name: '在线工具', order: 1, parentId: DEV, slug: 'online-tools' }),
  ]);
}

test('短名锚点：一级与二级分别命中', () => {
  const tree = slugTree();

  assert.deepEqual(parseCategoryAnchor('#dev', tree), { categoryId: DEV, subCategoryId: null });
  assert.deepEqual(parseCategoryAnchor('#dev/online-tools', tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
});

test('短名锚点：大小写不影响命中', () => {
  const tree = slugTree();

  assert.deepEqual(
    parseCategoryAnchor('#DEV', tree),
    { categoryId: DEV, subCategoryId: null },
    '短名人手填写，大小写不该把链接打断',
  );
  assert.deepEqual(parseCategoryAnchor('#Dev/OnLine-Tools', tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
});

test('短名锚点：一级短名自带连字符时不会被拆错', () => {
  const tree = buildCategoryTree([
    category({ id: DEV, name: '开发资源', order: 1, slug: 'dev-tools' }),
    category({ id: DEV_ONLINE, name: '在线工具', order: 1, parentId: DEV, slug: 'online-tools' }),
  ]);

  assert.deepEqual(parseCategoryAnchor('#dev-tools/online-tools', tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
});

test('短名锚点：没填短名的分类退回记录 id，链接不会失效', () => {
  const tree = buildCategoryTree([
    category({ id: DEV, name: '开发资源', order: 1, slug: 'dev' }),
    category({ id: DEV_ONLINE, name: '在线工具', order: 1, parentId: DEV }),
  ]);

  assert.equal(anchorIdToSlug(DEV, tree), 'dev');
  assert.equal(
    anchorIdToSlug(subCategoryAnchorId(DEV, DEV_ONLINE), tree),
    subCategoryAnchorId(DEV, DEV_ONLINE),
    '二级漏填短名时写回记录 id —— 链接变长，但仍能打开',
  );
  assert.deepEqual(parseCategoryAnchor(`#${subCategoryAnchorId(DEV, DEV_ONLINE)}`, tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
});

test('短名锚点：一级漏填时二级也退回记录 id', () => {
  const tree = buildCategoryTree([
    category({ id: DEV, name: '开发资源', order: 1 }),
    category({ id: DEV_ONLINE, name: '在线工具', order: 1, parentId: DEV, slug: 'online-tools' }),
  ]);

  assert.equal(
    anchorIdToSlug(subCategoryAnchorId(DEV, DEV_ONLINE), tree),
    subCategoryAnchorId(DEV, DEV_ONLINE),
    '短名是两段拼的，缺一段就拼不出完整键',
  );
});

test('短名锚点：生成与解析互为逆运算', () => {
  const tree = slugTree();

  assert.equal(anchorIdToSlug(DEV, tree), 'dev');
  assert.equal(anchorIdToSlug(subCategoryAnchorId(DEV, DEV_ONLINE), tree), 'dev/online-tools');
  assert.deepEqual(parseCategoryAnchor('#dev/online-tools', tree), {
    categoryId: DEV,
    subCategoryId: DEV_ONLINE,
  });
});

test('短名锚点：不在树上的短名仍返回 null', () => {
  const tree = slugTree();

  assert.equal(parseCategoryAnchor('#dev/closed', tree), null);
  assert.equal(parseCategoryAnchor('#nope', tree), null);
  assert.equal(anchorIdToSlug('unknown-anchor', tree), 'unknown-anchor', '认不出就原样返回');
});
