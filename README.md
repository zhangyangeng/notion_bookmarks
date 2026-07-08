# Notion 导航站


## 更新说明
🎉更新内容及更新方法见[保姆级教程](https://moyuguy.github.io/docs_notion_bookmarks/guide/getting-started.html)

<details>
  <summary> 2026/7/1</summary>
 - 2026/7/1 新增「自选股」小组件，支持在桌面组件区查看 A 股、ETF、港股和指数行情。</br>
 - 支持按名称或代码搜索添加标的，自选列表保存在浏览器本地，并提供单列/双列两种展示模式。</br>
 - 行情刷新采用纯前端数据源，东方财富失败时会回退到腾讯行情源，尽量减少浏览器 fetch 异常影响。</br>
 - 新增暂时关闭、收盘后隐藏、满仓提示、搜索浮层防遮挡和主题滚动条适配，和包豪斯、赛博朋克、麦金塔等主题保持一致。</br>
</details>

<details>
  <summary> 2026/6/28</summary>
 - 2026/6/28 新增麦金塔 1984 复古主题，用黑白像素边框、经典窗口标题栏、内凹按钮和灰阶桌面纹理还原早期 Macintosh System 风格。</br>
 - 优化该主题下的桌面侧边导航、主题切换按钮、天气定位控件、空气质量标签、热榜和链接卡片，避免小组件内容错位或被窗口装饰挤压。</br>
 - 新增麦金塔主题样式回归测试，覆盖主题注册、选择器隔离、卡片标题栏留白和小组件对齐。</br>
</details>

<details>
  <summary> 2026/6/27</summary>
 - 2026/6/27 新增包豪斯经典三原色主题，使用红、黄、蓝和粗黑线条构建更鲜明的仪表盘视觉风格。</br>
 - 优化主题切换、桌面侧边导航、移动端顶部导航、一级分类标题和二级分类选中态，选中层级更清晰。</br>
 - 优化天气、空气质量、热榜、链接卡片等组件在包豪斯主题下的可读性和一致性。</br>
 - 热榜可恢复抓取失败改为调试日志，避免开发环境被可降级错误打断。</br>
</details>

<details>
  <summary> 2026/6/23</summary>
 - 2026/6/23 修复网站图标加载异常：远程图标请求超时或失败时会停止加载动画，并显示本地默认图标兜底；如果远程图标随后加载成功，会自动恢复真实图标。</br>
 - 移除未使用的 axios 依赖，处理 GitHub Dependabot 的 axios 安全告警。</br>
 - 项目继续使用 pnpm 管理依赖，请保留 `pnpm-lock.yaml`，不要提交 `package-lock.json`。</br>
</details>

<details>
  <summary> 2025/5/19</summary>
 - 2025/5/19 新增小组件功能，简易时钟/天气/圆形时钟/IP信息/热搜</br>
  <img width="800" alt="demo" src="https://github.com/user-attachments/assets/d81be672-06b9-4df9-b1ec-a80d406284c0" />
  <img width="800" alt="demo" src="https://github.com/user-attachments/assets/31266996-f917-4e6e-8f04-1f6743c9bf32" />
</details>

<details>
  <summary> 2025/3/7</summary>
 - 2025/3/7 新增主题配置，新增赛博朋克主题 </br>
  <img width="800" alt="demo" src="https://github.com/user-attachments/assets/c94456fc-fc4f-4d10-bd64-1a0df53af1ba" />
</details>

## 项目预览
> 🔗 [在线演示](https://portal.ezho.top/)
![项目预览](https://github.com/user-attachments/assets/1d864d20-44b3-4678-b649-6ba96821f1c4)



## 项目简介
这是一个使用 Notion 作为数据库后端的个人导航网站项目。通过 Notion 数据库管理书签和导航链接，并以清晰现代的网页界面呈现。

### 主要特性
- 使用 Notion 作为数据库，无需部署数据库
- 清晰现代的网页界面
- 支持多级分类导航
- 响应式设计，支持桌面和移动端
- 支持多主题切换（简约主题、赛博朋克主题、包豪斯经典三原色主题、麦金塔 1984 复古主题）
- 支持桌面小组件（时钟、天气、IP 信息、热搜、自选股等），自选股支持 A 股、ETF、港股和指数行情
- 一键部署到 Vercel

## 快速开始
[保姆级教程](https://ezho.top/code/2025/02/21/notion-bookmarks-handbook)

### 本地开发

```bash
pnpm install
pnpm dev
```

常用检查命令：

```bash
pnpm test
pnpm lint
pnpm build
```
