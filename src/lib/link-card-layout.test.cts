/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '../..');

function readProjectFile(filePath: string) {
  return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
}

test('链接卡片把标签固定在卡片底部区域', () => {
  const linkCard = readProjectFile('src/components/ui/LinkCard.tsx');

  // 断言类名序列而非源码字面量：引号风格由 prettier 决定（singleQuote），不该被测试锁死
  assert.ok(
    /["']flex h-full min-h-\[120px\] items-start gap-4 px-4 pt-4/.test(linkCard),
    '跳官网的锚点需要横向排布（左图标、右内容）且占满卡片高度',
  );
  assert.ok(
    /className=["']flex-1 min-w-0 flex flex-col h-full gap-1\.5["']/.test(linkCard),
    '内容列需要是占满高度的纵向 flex 容器，标签才有空间被 mt-auto 推到底部',
  );
  assert.ok(
    /['"]flex flex-wrap items-center gap-1\.5 mt-auto pt-1['"]/.test(linkCard),
    '标签行需要用 mt-auto 吸收上方剩余空间并停在底部，且与入口在带内垂直居中',
  );
  assert.ok(
    /link\.tags\?\.slice\(0, 3\)/.test(linkCard),
    '标签行容器恒渲染：没有标签时也得留着，否则详情入口会浮到描述上去',
  );
});

test('详情弹窗头部整行居中，图标与标题不各自起跑', () => {
  const panel = readProjectFile('src/components/ui/LinkDetailPanel.tsx');

  // 顶对齐时标题从卡片顶起跑，图标 44px、标题行 28px —— 标题整个贴在上半截，看着往上飘。
  // 居中由头部容器统一负责，标题换行时图标也会自动落到标题块中间。
  assert.ok(
    /["']flex items-center gap-3 border-b border-border\/50 p-4["']/.test(panel),
    '头部需要整行纵向居中',
  );
  assert.ok(!/pt-1\.5/.test(panel), '标题不得靠自身内边距错位去凑对齐');
});

test('详情弹窗不摆加载骨架，没有正文的条目全程不留痕', () => {
  const panel = readProjectFile('src/components/ui/LinkDetailPanel.tsx');

  // 多数条目没有正文。任何加载提示在它们身上的结局都是「出现又消失」——
  // 请求越慢，这场空演得越完整，而后半场（骨架消失）比没有骨架更割裂。
  // 所以等的过程不对外展示：正文回来之前，正文区什么都不渲染。
  assert.ok(
    !/LoadingSkeleton|showLoading|LOADING_INDICATOR_DELAY|detail-loading-in/.test(panel),
    '正文区不得再渲染加载骨架',
  );
  assert.ok(
    /if \(state\.status === 'loading'\) \{\s*return null;\s*\}/.test(panel),
    '加载中必须与取回为空表现一致：都不渲染',
  );
  assert.ok(
    /if \(state\.blocks\.length === 0\) return null;/.test(panel),
    '取回为空也不得改成一个空状态占位',
  );
});

test('正文接口把公开名单整体缓存，不逐次重拉全量链接与分类', () => {
  const route = readProjectFile('src/app/api/links/[id]/content/route.ts');

  // 白名单校验要拉全部链接与分类（约 2.4s），是取正文（约 0.4s）的六倍以上，
  // 而名单几分钟才变一次 —— 逐次重拉等于让每一次开弹窗都为同一份答案付费。
  assert.ok(
    /unstable_cache\(/.test(route) && /'public-link-ids'/.test(route),
    '公开名单需要走带缓存的读取',
  );
  // 允许的形态只有一种：请求处理里拿到的必须是缓存好的名单，而不是现拉的全量数据
  const handler = route.slice(route.indexOf('export async function GET'));
  assert.ok(!/getLinks|getCategories/.test(handler), '请求处理里不得直接拉全量链接与分类');
});

test('详情入口与跳转锚点并列而非嵌套', () => {
  const linkCard = readProjectFile('src/components/ui/LinkCard.tsx');

  // 锚点的内容模型不允许交互元素后代，入口必须挂在容器这一层。
  // hover 的 group 锚点同理 —— 挂在锚点上的话，指针移到入口按钮上时卡片反馈会消失。
  assert.ok(
    /["']group relative h-full rounded-lg/.test(linkCard),
    '容器需要承担定位与 hover 反馈，并作为入口展开所依赖的 group 锚点',
  );
});

test('卡片底部行由标签与详情入口共用，不再各占一行', () => {
  const linkCard = readProjectFile('src/components/ui/LinkCard.tsx');
  const shareCard = readProjectFile('src/components/share/ShareCard.tsx');
  const css = readProjectFile('src/app/globals.css');

  // 锚点底部只留 0.5rem：这一行由标签与入口共用，不再给入口单开一条停靠带
  assert.ok(
    /px-4 pt-4 pb-2 rounded-lg glass-card/.test(linkCard),
    '首页锚点底部应为 pb-2，与入口距底距离一致',
  );
  assert.ok(
    /px-5 pt-5 pb-2 rounded-lg border border-border\/50 glass-card/.test(shareCard),
    '分享页锚点底部同为 pb-2',
  );
  assert.ok(
    /onOpenDetail && ['"]card-detail-band['"]/.test(linkCard) &&
      /onOpenDetail && ['"]card-detail-band['"]/.test(shareCard),
    '渲染入口时，底部行才需要给入口留位',
  );

  // 共用带的两条约束：高度对齐入口，右侧净空容纳入口展开后的宽度
  assert.ok(
    /\.card-detail-band\s*\{\s*min-height:\s*1\.5rem;\s*padding-right:\s*2\.75rem;\s*\}/.test(css),
    '共用带需要 min-height 对齐入口高度、padding-right 容纳其展开宽度',
  );

  // 让位只发生在标签区 —— 横向 padding 一旦落到正文上，长描述会被逼着折行
  assert.ok(
    !/card-detail-safe-bottom/.test(linkCard) &&
      !/card-detail-safe-bottom/.test(shareCard) &&
      !/card-detail-safe-bottom/.test(css),
    '独立停靠带已由共用带取代',
  );
  assert.ok(
    !/card-detail-clearance/.test(linkCard) && !/card-detail-clearance/.test(shareCard),
    '内容元素不得再挂横向净空类',
  );
});
