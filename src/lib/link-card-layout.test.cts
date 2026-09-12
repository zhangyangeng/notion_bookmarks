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
    /["']group flex h-full flex-col p-4/.test(linkCard),
    'LinkCard 根节点需要是占满高度的纵向 flex 容器',
  );
  assert.ok(
    /className=["']flex flex-wrap gap-1\.5 mt-auto flex-shrink-0["']/.test(linkCard),
    '标签行需要用 mt-auto 吸收上方剩余空间并停在底部',
  );
});
