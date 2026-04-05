---
title: '我如何用 AI 在一个晚上迁移了整个博客'
published: 2026-04-06
description: '从 Hexo 到 Astro：用 Claude Code 完成 192 篇文章的迁移、测试和部署'
tags:
  - AI
  - Blog
  - Migration
  - Astro
  - Claude Code
slug: how-i-migrated-blog-with-ai
toc: true
lang: zh
---

## TLDR

- 用 Claude Code 在一个晚上把博客从 Hexo 迁移到了 Astro（Retypeset 主题）
- 192 篇文章、三语 i18n、826 页、20 个 e2e 测试，全程 AI 驱动
- 最终架构：Blog-src（内容）→ Blog-astro（主题）→ Cloudflare Workers（部署）
- AI 擅长重复性迁移和 schema 映射，但 URL 策略和内容分类仍需人类判断

<!-- more -->

## 1. 为什么要迁移

我的博客跑在 Hexo 上已经好几年了。说实话，Hexo 没什么大毛病——它能用，NexT 主题也算经典。但"能用"和"好用"之间差了一个时代。

几个痛点越来越明显：

- **构建速度**：Hexo 的 Node.js 单线程渲染，文章多了以后构建时间肉眼可见地变长
- **i18n 支持**：我需要中文、英文、日文三语。Hexo 的 i18n 方案基本等于"你自己想办法"
- **现代化**：Astro 的 island architecture、partial hydration、Vite 构建——这些不是花哨的 buzzword，是真的能让博客更快
- **主题**：Retypeset 这个 Astro 主题的排版太好看了。作为一个对字体有执念的人，这一条就够了

问题在于，192 篇文章的迁移不是 `cp -r` 能解决的事。Hexo 的 frontmatter 格式、URL 结构（abbrlink）、分类体系、资源文件路径——每一个都是坑。

手动迁移？我算了一下，保守估计需要两个完整的周末。

所以我决定让 AI 来干。

## 2. 一个晚上的迁移：Phase by Phase

### Phase 0：让 AI 先做功课

2026 年 1 月 13 日晚上 9:55，我启动了 Claude Code，给了它三样东西：

1. 一份 PRD（Product Requirements Document），描述了迁移的所有需求
2. Retypeset 主题的文档
3. Blog-src 里现有的 Hexo 文章

Claude 做的第一件事不是写代码——是**研究**。它分析了 Hexo 的 frontmatter 结构，数了文章总数（192 篇），调研了 Astro 的 `build.format` 配置，研究了 Pagefind 集成方案，甚至提前看了 Cloudflare Pages 的部署文档。

20 分钟后，它输出了一份完整的 `task_plan.md`——12 个 phase，每个 phase 有明确的 acceptance criteria。

这个阶段让我意识到一件事：**AI 最被低估的能力不是写代码，是做调研。** 让我自己去翻 Retypeset 的源码、对比 Astro 的 build format 选项、查 Cloudflare Workers 的路由规则，至少要花两个小时。Claude 用 20 分钟搞定了，而且整理得比我自己做的好。

### Phase 1：Astro 项目配置

```typescript
// astro.config.ts 的关键改动
export default defineConfig({
  site: 'https://blog.zhenjia.org',
  build: {
    format: 'file',  // 生成 .html 文件，而不是目录
  },
  trailingSlash: 'never',
})
```

`build.format: 'file'` 是一个关键决策。Hexo 的 abbrlink 系统生成的 URL 形如 `/posts/17683e80.html`，我想保持这个格式以避免 SEO 断链。Astro 默认用目录模式（`/posts/17683e80/index.html`），改成 `'file'` 模式才能匹配。

i18n 配置也在这一步完成——中文为默认语言（不加 `/zh/` 前缀），英文和日文分别用 `/en/` 和 `/ja/` 前缀。

从启动到 Phase 1 完成：**23 分钟**。

### Phase 2：Content Loader——最有趣的部分

这是整个迁移中技术含量最高的一步。问题是：Hexo 和 Astro 的 frontmatter 格式不一样。

Hexo 的文章长这样：

```yaml
---
title: 'GAM 模型详解'
date: 2023-03-15 14:30:00
tags: machine-learning
categories: Tech
abbrlink: '17683e80'
mathjax: true
---
```

Astro（Retypeset）期望的格式：

```yaml
---
title: 'GAM 模型详解'
published: 2023-03-15T14:30:00Z
tags:
  - machine-learning
---
```

差异不少：`date` vs `published`、`tags` 可能是 string 也可能是 array、`abbrlink` 是 Hexo 特有的、还有 `mathjax`、`password`、`copyright` 这些 Hexo 特有字段。

Claude 的解法是修改 Astro 的 Zod schema，让它**接受** Hexo 格式并自动转换：

```typescript
// src/content.config.ts
const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    // 接受 date 或 published，统一转成 published
    date: z.coerce.date().optional(),
    published: z.coerce.date().optional(),
    // tags 可能是 string（单个）、array、或 undefined
    tags: z.union([
      z.array(z.string()),
      z.string().transform(s => [s]),
    ]).optional().default([]),
    // Hexo 特有字段——接受但不报错
    abbrlink: z.string().optional(),
    mathjax: z.boolean().optional(),
    categories: z.union([
      z.array(z.string()),
      z.string().transform(s => [s]),
    ]).optional(),
    // ...更多字段
  }).transform(data => ({
    ...data,
    published: data.published ?? data.date,  // date → published
  })),
})
```

这个 schema 的设计思路是"宽进严出"——接受所有 Hexo 的 frontmatter 格式，内部统一转换成 Astro 需要的格式。这样就不需要批量修改 171 篇文章的 frontmatter，而是让 content loader 来做适配。

**这是 AI 做得最漂亮的一步。** 手写这个 Zod schema 需要仔细分析每篇文章的 frontmatter 差异——有些文章的 `tags` 是字符串，有些是数组；有些有 `abbrlink`，有些没有；有些日期格式带时区，有些不带。Claude 扫了一遍所有文章，把所有变体都处理了。

### Phase 3：路由——零代码改动

这是最让我惊喜的一步。我以为 URL 路由需要大量自定义配置，结果 Claude 检查了 Retypeset 的源码后告诉我：**主题已经支持 abbrlink 了。** 它的路由逻辑是 `abbrlink || post.id`，如果文章有 abbrlink 字段，直接用它做 URL slug。

零代码改动。

（有时候最好的代码就是不写代码。）

### Phase 4：内容迁移——真正的脏活

```
175 posts copied
4 empty drafts removed (abbrlink: '0')
2 duplicate abbrlinks fixed (fc1cc4fb, fbd0b1b0)
16 asset folders migrated
Final: 171 posts → 169 published + 2 drafts
Build: 823 pages in ~93s
```

听起来很顺利？其实不是。

第一次 build 直接报错——有些文章的 YAML frontmatter 里有 `null` 值（比如 `tags: null`）。Zod 的 strict parsing 不接受这个。Claude 加了一个 preprocess 步骤来处理 null 值。

然后发现了两个 duplicate abbrlink——两篇不同的文章用了相同的 abbrlink。这种问题在 Hexo 里不会报错（它只是默默地覆盖了其中一篇），但 Astro 的文件路由会冲突。Claude 手动给这两篇文章生成了新的 abbrlink。

还有 4 篇"空文章"——abbrlink 是 `'0'`，内容为空。大概是之前不小心 `hexo new` 了但没写内容。直接删除。

**这个阶段的教训：迁移的难点永远不在"正常"的文章，而在边缘情况。** null 值、重复 ID、空文章——这些在源系统里可能不会出问题，但迁移到新系统时全都会炸。AI 的优势在于它能**耐心地**处理每一个边缘情况，不会因为枯燥而犯错。（惨的是人类修 YAML 修到第 50 篇的时候大概率会开始复制粘贴然后引入新 bug。）

### Phase 5-6：功能对齐和 SEO

- Pagefind 全文搜索——集成并工作
- KaTeX 数学公式渲染——配置完成
- Mermaid 图表——预渲染模式工作
- RSS/Atom feeds——生成
- Dark mode——正常切换
- OG tags——每篇文章都有
- llms.txt——生成（给 AI 爬虫看的站点描述）
- Sitemap——生成

这些功能的集成过程比较平淡，因为 Retypeset 主题本身支持得很好。Claude 主要做的是确认每个功能都正常工作，以及配置参数是否正确。

### Phase 7：Playwright 测试——AI 写测试比写代码更稳

```typescript
test.describe('URL Structure', () => {
  test('posts have .html extension', async ({ page }) => {
    await page.goto('/posts/13a77735.html')
    expect(page.url()).toMatch(/\.html$/)
  })

  test('default language has no prefix', async ({ page }) => {
    await page.goto('/posts/13a77735.html')
    expect(page.url()).not.toMatch(/\/zh\//)
  })

  test('english posts have /en/ prefix', async ({ page }) => {
    await page.goto('/en/posts/13a77735.html')
    expect(page.url()).toMatch(/\/en\//)
  })
})
```

20 个测试，覆盖 URL 结构、i18n、搜索、RSS、sitemap、OG tags。全部通过。

说实话，**让 AI 写 e2e 测试是整个迁移中 ROI 最高的部分。** 测试的逻辑通常很直白（"访问这个 URL，检查这个元素存在"），但写起来非常枯燥。AI 不怕枯燥，而且它刚刚做完了迁移，对所有 URL 和功能了如指掌——这个上下文是手动写测试的人不具备的。

从 Phase 0 到 Phase 7，总耗时约 **3 小时**。826 页构建成功，20 个测试全部通过。

## 3. Phase 8+：三仓架构和 CI/CD

一个晚上能做完核心迁移，但"能 build"和"能上线"之间还有不少工作。接下来的几天里，我和 Claude 一起搭建了完整的 production 架构。

### 三仓架构

```
Blog-src (内容仓库)    →    Blog-astro (主题仓库)    →    Cloudflare Workers
   │                            │                            │
   │  GitHub Actions            │  pnpm build                │
   │  sync-to-blog-astro.yml   │  astro build               │
   └────────────────────────────┘────────────────────────────┘
```

**Blog-src** 是内容的 source of truth。所有文章在这里编写和管理，保留了 Hexo 时代的目录结构（`source/_posts/posts/{zh|en|ja}/`）。

**Blog-astro** 是主题和构建仓库。它从 Blog-src 同步内容，用 Astro 构建，然后部署到 Cloudflare Workers。

这个分离的好处是：我可以在 Blog-src 里纯粹地写文章，不需要关心主题代码；主题升级只影响 Blog-astro，不会碰到内容文件。

### 翻译流水线：多 Agent 协作

这是最能体现 "AI-powered" 的部分。我搭了一个三阶段翻译 pipeline：

1. **Gemini**（初译）——速度快、成本低，负责生成草稿
2. **Claude**（反思）——检查术语一致性、语法、文化适配性
3. **o3**（审校）——最终质量把关

每篇新文章推送到 Blog-src 后，GitHub Actions 自动触发翻译流程，生成英文和日文版本，然后同步到 Blog-astro。

为什么用三个不同的模型？因为翻译和写代码不一样——**多样性比一致性更重要。** 同一个模型翻译再审校，容易陷入自己的 blind spot（比如 Claude 翻日文时偶尔会过度使用敬語）。不同模型互相 review，反而能 catch 到更多问题。

## 4. 关键数字

| 指标 | 数值 |
|------|------|
| 文章总数 | 222 篇 + 21 notes + 32 journals |
| 构建页面 | 826 页 |
| 构建时间 | ~93 秒 |
| e2e 测试 | 20 个，全部通过 |
| 迁移核心耗时 | ~3 小时（一个晚上） |
| 支持语言 | 中文、英文、日文 |
| 部署平台 | Cloudflare Workers |

## 5. AI 擅长什么，不擅长什么

做完这次迁移，我对 "AI 能做什么" 有了更清晰的认知。

### AI 非常擅长的事

**重复性迁移工作**——171 篇文章的 frontmatter 分析、null 值修复、duplicate 检测。这种需要耐心但不需要创造力的工作，AI 做得比人好 10 倍。

**Schema 映射**——Hexo frontmatter → Astro Zod schema 的转换。AI 能一次性扫完所有文章，识别出所有变体，然后写一个兼容所有情况的 schema。人类做这件事需要来回调试很多轮。

**测试编写**——AI 刚做完迁移，对系统的每个细节都记得清清楚楚。让它趁热打铁写测试，效率和覆盖率都很高。

**文档调研**——同时阅读 Astro 文档、Retypeset 源码、Cloudflare Workers 文档，交叉参考找到最优方案。这是 AI 的 context window 优势——它能同时"看"几万行文档。

### 仍然需要人类判断的事

**URL 策略**——保留 Hexo 的 abbrlink 还是用 Astro 的 slug？这涉及 SEO 影响、永久链接承诺、未来可维护性。AI 可以列出 pros and cons，但最终决策需要人来做。

**内容分类**——哪些文章归为 posts、哪些归为 notes、哪些归为 journals？这涉及对内容本身的理解和个人偏好。

**设计决策**——三仓架构 vs 单仓？Cloudflare Workers vs Pages？这些决策的 tradeoff 需要结合团队规模、维护能力、长期规划来判断。

**翻译质量的最终判断**——AI 翻译的 85% 是好的，但剩下的 15% 需要人来 review。特别是涉及文化语境和个人风格的部分。

### 一个总结

AI 是一个**极其高效的执行者**，但不是决策者。迁移这件事最关键的决策——迁移到哪个框架、用什么主题、URL 怎么设计、架构怎么分——都是人做的。但一旦决策做完，AI 能以惊人的速度和准确性执行。

我的工作模式是：**人类做 10% 的决策，AI 做 90% 的执行。** 这个比例感觉刚好。

## 6. 这篇文章本身

是的，这篇文章也是在 AI 辅助下写的。但不是"让 AI 写一篇文章"这么简单——而是我提供了迁移的真实 progress log、技术细节、个人感受，让 AI 帮我组织成一篇结构完整的博文。

技术事实来自 `progress.md` 里的真实记录。个人观点是我的。AI 做的是把散乱的素材变成有叙事结构的文章。这和迁移本身的工作模式一样——**人类提供方向和判断，AI 提供执行和组织。**

如果你正在考虑做类似的迁移，我的建议是：

1. **写一份清晰的 PRD**——你越清楚自己要什么，AI 执行得越好
2. **让 AI 先做调研**——不要直接让它写代码，让它先理解目标系统
3. **分阶段执行，每个阶段验证**——不要一口气让 AI 做完所有事
4. **保留决策权**——架构、URL、分类这些事，自己拿主意
5. **让 AI 写测试**——这是 ROI 最高的 AI 用法之一

迁移完成后，我的博客现在跑在 Astro + Retypeset + Cloudflare Workers 上，支持三语，构建 826 页只要 93 秒，有 20 个 e2e 测试保驾护航。整个过程从开始到核心迁移完成，用了一个晚上。

不夸张地说，如果没有 AI，这个项目至少需要两个完整的周末。而有了 AI，它变成了一个晚上加几天的 polish。

这大概就是 2026 年做 side project 的正确姿势——**把重复劳动交给 AI，把创造性决策留给自己。**
