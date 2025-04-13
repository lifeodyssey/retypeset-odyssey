<img alt="Cover Image" src="assets/retypeset-zh-desktop.webp"/>
<img alt="Cover Image" src="assets/retypeset-zh-mobile.webp"/>

<div align="center">
  <a title="en" href="README.md">
    <img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English">
  </a>
  <picture>
    <source media="(prefers-color-scheme: dark)"
            srcset="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-4593F8?style=for-the-badge" />
    <source media="(prefers-color-scheme: light)"
            srcset="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-0A69DA?style=for-the-badge" />
    <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-0A69DA?style=for-the-badge" alt="简体中文">
  </picture>
</div>

# 重新编排

Retypeset 是一款基于 [Astro](https://astro.build/) 框架的静态博客主题，中文名为重新编排。本主题以 [活版印字](https://astro-theme-typography.vercel.app/) 为设计灵感，通过建立全新的视觉规范，对所有页面进行重新编排，打造纸质书页般的阅读体验，再现版式之美。所见皆为细节，方寸尽显优雅。

## 预览

- [重新编排](https://retypeset.radishzz.cc/)
- [重新編排](https://retypeset.radishzz.cc/zh-tw/)
- [再組版](https://retypeset.radishzz.cc/ja/)
- [Retypeset](https://retypeset.radishzz.cc/en/)
- [Retipografía](https://retypeset.radishzz.cc/es/)
- [Переверстка](https://retypeset.radishzz.cc/ru/)

## 特征

- 基于 Astro 与 UnoCSS 开发
- 支持 SEO、Sitemap、OpenGraph、TOC、RSS、MDX 和 KaTeX
- i18n 多语言
- 亮色/暗色模式
- 优雅的过渡动画
- 丰富的主题配置
- 中文排版优化
- 响应式设计
- 评论系统

## 性能

<p align="center">
  <a href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fretypeset.radishzz.cc%2F">
    <img width="710" alt="Retypeset Lighthouse Score" src="assets/retypeset-lighthouse-score.svg">
  <a>
</p>

## 用法

1. 点击 [`Fork`](https://github.com/radishzzz/astro-theme-retypeset/fork) 复刻此仓库，或使用此模版创建新仓库。

2. 在复刻仓库中点击 `Code` 按钮，复制 `HTTPS` 仓库地址，并在终端中执行：

   ```bash
   # 克隆远程仓库至本地
   git clone <仓库地址>

   # 进入本地仓库根目录
   cd <仓库名称>

   # 全局安装 pnpm（若未安装）
   npm install -g pnpm

   # 安装项目依赖
   pnpm install

   # 启动本地开发服务器
   pnpm dev
   ```

3. 在浏览器中打开 [http://localhost:4321/](http://localhost:4321/)，即可实时预览主题效果。

4. 修改主题配置文件 [src/config.ts](https://github.com/radishzzz/astro-theme-retypeset/blob/master/src/config.ts) 来自定义你的博客。

5. 提交并推送你的修改至远程仓库。

## 文档

- [主题上手指南](https://retypeset.radishzz.cc/posts/theme-guide/)
- [Markdown 样式指南](https://retypeset.radishzz.cc/posts/markdown-style-guide/)
- [主题配色指南](https://retypeset.radishzz.cc/posts/theme-color-schemes/)

## 部署

1. 点击下方 `Deploy to Netlify` 或 `Deploy to Vercel`。

[![Deploy to Netlify](assets/deploy-netlify.svg)](https://app.netlify.com/start)
[![Deploy to Vercel](assets/deploy-vercel.svg)](https://vercel.com/new)

1. 跟随指示，选择对应仓库，再点击 `Deploy` 即可开始部署。

2. 其它平台请参考 [Astro 部署指南](https://docs.astro.build/zh-cn/guides/deploy/)。

## 更新

Retypeset 会不定期发布新功能和问题修复。你可以参考 [GitHub 文档](https://docs.github.com/zh/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)，在复刻仓库中执行 `Sync fork` 同步最新分支。注意不要点击 `Discard Changes`，否则会丢失你的更改。

## 指令

以下指令均需要在项目根目录执行：

| 指令                   | 作用                                   |
| :--------------------- | :------------------------------------- |
| `pnpm install`         | 安装项目依赖                           |
| `pnpm dev`             | 在 `localhost:4321` 启动本地开发服务器 |
| `pnpm build`           | 构建网站至 `./dist/`                   |
| `pnpm preview`         | 本地预览已构建的网站                   |
| `pnpm astro ...`       | 执行 `astro add`, `astro check` 等命令 |
| `pnpm astro -- --help` | 获取 Astro CLI 帮助信息                |

## 鸣谢

- [Typography](https://github.com/moeyua/astro-theme-typography)
- [Fuwriu](https://github.com/saicaca/fuwari)
- [Redefine](https://github.com/EvanNotFound/hexo-theme-redefine)
- [AstroPaper](https://github.com/satnaing/astro-paper)
- [赫蹏](https://github.com/sivan/heti)
- [初夏明朝體](https://github.com/GuiWonder/EarlySummerSerif)

## Star History

谢谢每一位 star 的朋友，你们的支持是我持续维护项目的动力！

<p align="center">
<a href="https://star-history.com/#radishzzz/astro-theme-retypeset&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=radishzzz/astro-theme-retypeset&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=radishzzz/astro-theme-retypeset&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=radishzzz/astro-theme-retypeset&type=Date" />
  </picture>
</p>
