import * as LucideIcons from 'lucide-react';
import type { CategoryIconData } from '@/types';

// NOTE: 此处全量导入 lucide，与「图标禁止全量导入」的约定看似冲突，实为服务端专用例外 ——
//       那条约定针对的是客户端 bundle；本模块只被路由的服务端组件引用，
//       不会被客户端组件间接引入，因此不进浏览器产物。客户端侧早已不持有图标库。
//       若将来有 'use client' 组件 import 它，整个图标库会被拖进产物 —— 新增引用前先确认调用方。

/** lucide 图标名全部由 ASCII 字符构成；含非 ASCII 即视为用户想填 emoji 或符号 */
const ASCII_ONLY = /^[\x00-\x7F]*$/;

/** 图标的图形数据：[SVG 元素名, 属性表][]，如 `[['path', { d: 'M12 7v14' }]]` */
type IconNode = Array<[string, Record<string, string | number>]>;

/**
 * lucide 图标组件。它是 React 的 forwardRef 对象，其 render 会把图形数据透传给内部元素 ——
 * 这是当前版本取出原始数据的唯一途径，故判据里一并要求 render 可调用。
 */
interface LucideIconComponent {
  readonly render: (props: unknown, ref: unknown) => { props?: { iconNode?: unknown } };
}

/**
 * 判断导出成员是否为图标组件。
 * lucide-react 除图标外还导出 `createLucideIcon`（函数）与 `icons`（数据对象），需一并排除掉。
 * 用正向判据，而非硬编码排除名单 —— 后者每次 lucide 发版都要重维护。
 */
function isIconComponent(value: unknown): value is LucideIconComponent {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $$typeof?: symbol }).$$typeof === Symbol.for('react.forward_ref') &&
    typeof (value as { render?: unknown }).render === 'function'
  );
}

/**
 * 官网命名（kebab-case）转 React 导出名（PascalCase）。
 * 对已是 PascalCase 的输入幂等，故可无条件套用。
 * 注意方向不可反：PascalCase → kebab 不可靠（`PlayCircle` 的官网名是 `circle-play`）。
 */
function toPascalCase(name: string): string {
  return name.replace(/(^|-)([a-zA-Z0-9])/g, (_, __, char: string) => char.toUpperCase());
}

const lucideExports = LucideIcons as unknown as Record<string, unknown>;

/**
 * 按**自有属性**取导出成员。
 * `IconName` 是自由文本，`__proto__` / `constructor` / `toString` 这类键会命中原型链 ——
 * 直接下标访问可能把原型对象当成图标组件，必须先挡一道。
 */
function pickExport(key: string): unknown {
  return Object.hasOwn(lucideExports, key) ? lucideExports[key] : undefined;
}

/** 取出图标的图形数据。通用组件 `Icon` 走另一条渲染路径，取不到即返回 null。 */
function getIconNode(icon: LucideIconComponent): IconNode | null {
  try {
    const element = icon.render({}, null);
    const node = element?.props?.iconNode;
    return Array.isArray(node) ? (node as IconNode) : null;
  } catch {
    return null;
  }
}

/**
 * 把图形数据拼成 `<svg>` 的内部标记。
 *
 * 属性名在原数据中已是 SVG 原生名（`d` / `cx` / `points`…），无需改写；
 * 但 `key` 是 React 的列表标识、不是 SVG 属性，必须滤掉。
 */
function serializeIconNode(node: IconNode): string {
  return node
    .map(([tag, attrs]) => {
      const attrText = Object.entries(attrs)
        .filter(([name]) => name !== 'key')
        .map(([name, value]) => ` ${name}="${String(value).replace(/"/g, '&quot;')}"`)
        .join('');
      return `<${tag}${attrText}/>`;
    })
    .join('');
}

/**
 * 把 Notion 的 `IconName` 解析成可渲染形态；认不出返回 null，交调用方兜底。
 *
 * 命中采用两级查找：先按原样匹配（覆盖 PascalCase 与历史别名），
 * 再按 kebab → PascalCase 转换后匹配（覆盖 lucide.dev 官网命名）。
 *
 * NOTE: 只在服务端调用。名字写错时只 warn 不抛错 —— 一个图标不该让整页渲染失败。
 */
export function resolveCategoryIcon(name: string | null | undefined): CategoryIconData | null {
  const key = name?.trim();
  if (!key) return null;

  if (!ASCII_ONLY.test(key)) {
    return { kind: 'text', value: key };
  }

  const Icon = pickExport(key) ?? pickExport(toPascalCase(key));

  if (!isIconComponent(Icon)) {
    console.warn(`[icon] 无法识别的图标名「${key}」，已回退默认图标`);
    return null;
  }

  const node = getIconNode(Icon);
  if (!node) {
    console.warn(`[icon] 图标「${key}」取不到图形数据，已回退默认图标`);
    return null;
  }

  return { kind: 'svg', inner: serializeIconNode(node) };
}
