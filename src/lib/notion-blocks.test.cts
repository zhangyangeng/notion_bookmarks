/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '../..');

function readProjectFile(filePath: string) {
  return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
}

test('正文归一化丢弃空文本块', () => {
  const source = readProjectFile('src/lib/notion-blocks.ts');

  // Notion 里的空行（多按一次回车）会被原样取回。若照渲染，结果是占了一段高度却什么都没有 ——
  // 读者会以为正文还在加载。判空放在归一化这一层，客户端不必再认识这件事。
  assert.ok(
    /function isEmptyBlock\(block: ContentBlock\): boolean \{/.test(source),
    '需要显式的判空函数',
  );
  assert.ok(
    /if \('spans' in block\) return block\.spans\.length === 0;/.test(source),
    '文本块以 spans 是否为空判定',
  );
  assert.ok(
    /if \(mapped && !isEmptyBlock\(mapped\)\) result\.push\(mapped\);/.test(source),
    '空块不得进入结果',
  );
  // 空的折叠块里可能装着有内容的子块 —— 判空只管块自己，不许连累递归
  assert.ok(
    /block\.has_children && !SKIP_CHILD_TYPES\.has\(block\.type\)/.test(source),
    '判空不得阻止子块递归',
  );
});
