// 数据拉取失败时的降级提示横幅。
// Notion 接口不可达时，首页仍会渲染（空分类 + 空链接），但不该白屏装没事 ——
// 挂一条可见提示，让访客知道「内容暂时拉不到」，而不是误以为站点本来就空。
export default function DataUnavailableBanner() {
  return (
    <div
      role="alert"
      className="w-full bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-400"
    >
      <div className="max-w-3xl mx-auto px-4 py-2.5 text-sm flex items-center gap-2">
        <span aria-hidden="true">⚠️</span>
        <span>内容暂时加载失败，请稍后刷新页面。</span>
      </div>
    </div>
  );
}
