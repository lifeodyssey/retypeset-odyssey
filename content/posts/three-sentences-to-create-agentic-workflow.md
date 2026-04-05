---
title: '三句话创建你自己的 Agentic Workflow'
published: 2026-04-06
description: '用 GitHub Agentic Workflows 把 AI Agent 嵌入你的 CI/CD，写 Markdown 就行'
tags:
  - AI
  - GitHub
  - Agentic Workflow
  - CI/CD
  - Automation
slug: three-sentences-to-create-agentic-workflow
toc: true
lang: zh
---

## TLDR

- GitHub Agentic Workflows (gh-aw) 让你用 Markdown 而不是 YAML 来写 CI/CD workflow
- 最小可用 workflow 真的只需要三句话：engine + trigger + 自然语言指令
- 支持 Claude、Codex、Copilot 三种 engine，还能接自定义 base URL
- `gh aw compile` 编译成标准 GitHub Actions YAML，`gh aw run` 直接跑
- 已经在自己的翻译 workflow 里实际用了，效果比手写 YAML 好太多

<!-- more -->

## 1. 起因：我终于受不了 GitHub Actions YAML 了

事情的起因是我的博客翻译 workflow 又挂了。

这个 workflow 的功能很简单——检测到新的中文文章，自动翻译成英文和日文。逻辑上三句话就能说清楚，但写成 GitHub Actions YAML 后……变成了 200 多行的 `.github/workflows/translate.yml`。里面充斥着 `runs-on`、`steps`、`uses`、`with`、`env`、嵌套的 `if` 条件、shell 脚本字符串，还有那个让人抓狂的缩进——YAML 的缩进错误不报语法错误，只是默默地不工作，你得盯着屏幕找半天才发现某一行少了两个空格。

更让人崩溃的是，每次要改 workflow 逻辑，我都得在脑子里做两层翻译：先把"我想做什么"翻译成"GitHub Actions 的概念模型"，再翻译成"YAML 语法"。这两层翻译每一层都可能出错。

然后我看到了 [gh-aw](https://github.com/gh-aw/gh-aw)——GitHub Agentic Workflows。

它的核心理念让我眼前一亮：**用 Markdown 写 workflow，用自然语言描述你想让 agent 做什么，然后编译成标准的 GitHub Actions YAML。**

我的第一反应是"不可能这么简单"。然后我试了。

## 2. 三句话，不是比喻

先看最简单的例子。创建一个文件 `workflows/translate.md`：

```markdown
---
engine: claude
trigger: push
---

When a new Chinese markdown file is added to `content/posts/`,
translate it to English and Japanese.
Keep the frontmatter structure intact.
Commit the translated files with a clear commit message.
```

没了。真的没了。

frontmatter 里的 `engine` 指定用哪个 AI 模型（这里用 Claude），`trigger` 指定什么时候触发（push 时）。剩下的就是自然语言——告诉 agent 你想做什么。

然后：

```bash
gh aw compile workflows/translate.md
```

它会在 `.github/workflows/` 下生成一个标准的 GitHub Actions YAML 文件。你可以 `cat` 出来看看生成了什么——标准的 `on: push`、`jobs`、`steps`，该有的都有，包括 agent 的执行环境配置、权限设置、secret 引用。

想直接跑？

```bash
gh aw run workflows/translate.md
```

本地测试，不用 push 到 GitHub。

所以所谓的"三句话"：
1. **engine**：用哪个 AI
2. **trigger**：什么时候跑
3. **自然语言指令**：做什么

这不是简化了 YAML，这是**换了一种思维方式**。你不再需要思考"怎么用 GitHub Actions 实现这个逻辑"，你只需要思考"我想要什么结果"。

## 3. Engine 选择：不只是 Claude

gh-aw 目前支持三种 engine：

| Engine | 模型 | 适合场景 | 备注 |
|--------|------|---------|------|
| `claude` | Claude (Anthropic) | 代码理解、复杂推理 | 默认推荐 |
| `codex` | Codex (OpenAI) | 代码生成、补全 | 需要 OpenAI API key |
| `copilot` | GitHub Copilot | GitHub 生态内任务 | 需要 Copilot 订阅 |

但更有意思的是 `base_url` 参数。你可以指向任何兼容 OpenAI API 格式的 endpoint：

```markdown
---
engine: claude
base_url: https://your-proxy.example.com/v1
trigger: pull_request
---
```

这意味着你可以用公司内部的 API gateway、用 LiteLLM 做路由、甚至用本地的 Ollama。对于在意数据隐私的团队来说，这是一个关键特性。

## 4. 一个真实的 Code Review Workflow

翻译 workflow 太简单了，来看一个稍微复杂一点的——自动 Code Review：

```markdown
---
engine: claude
trigger: pull_request
---

You are a senior code reviewer for this repository.

When a pull request is opened or updated:

1. Read all changed files in the PR diff
2. Check for:
   - Security issues (hardcoded secrets, SQL injection, XSS)
   - Performance problems (N+1 queries, unnecessary re-renders)
   - Code style violations against the project's ESLint/Prettier config
   - Missing error handling
   - Untested edge cases
3. Post a review comment on the PR with your findings
4. If there are critical security issues, request changes
5. If everything looks good, approve the PR

Be concise. Don't repeat the code back. Focus on actionable feedback.
```

注意这里 trigger 变成了 `pull_request`——PR 创建或更新时触发。指令部分就是你平时跟同事说"帮我 review 一下这个 PR"时会说的话，只是更结构化了一点。

编译之后，gh-aw 会自动处理：
- PR event 的 webhook 配置
- Checkout 代码
- 获取 diff
- 配置 agent 的执行环境和权限
- 把 review 结果 post 回 PR

你不需要关心这些基础设施层面的细节。

## 5. 进阶：多 Workflow 编排和 safe-outputs

真实项目里，workflow 之间往往有依赖关系。gh-aw 支持 `safe-outputs` 来实现 workflow 间的数据传递：

```markdown
---
engine: claude
trigger: push
safe-outputs:
  - name: changed_files
    description: List of files that were modified
  - name: analysis_result
    description: JSON object with code analysis results
---

Analyze all changed files in this push.
Output a JSON object with:
- `changed_files`: array of file paths
- `analysis_result`: object with `score` (0-100), `issues` (array), `suggestions` (array)

Only output the JSON, no explanation.
```

`safe-outputs` 声明了这个 workflow 的输出格式。下游 workflow 可以引用这些输出：

```markdown
---
engine: claude
trigger: workflow_run
depends_on: code-analysis
---

Based on the analysis results from the code-analysis workflow:

If the score is below 70, create a GitHub issue with the title
"Code Quality Alert" and list all issues found.

If there are security-related issues, also ping @security-team
in the issue body.
```

`depends_on` 指定了上游依赖，`workflow_run` 表示在上游 workflow 完成后触发。这比在 YAML 里手写 `workflow_run` event + `jobs.<job_id>.outputs` 要直观得多。

## 6. 我的翻译 Workflow：一个真实案例

回到我自己的博客。之前那个 200 行的 YAML，用 gh-aw 重写之后：

```markdown
---
engine: claude
trigger: push
---

You are a professional translator for a technical blog.
The blog is at `content/posts/`.

When new or modified `.md` files are pushed (not `.en.md` or `.ja.md`):

1. Read the Chinese markdown file
2. Translate to English (save as `<filename>.en.md`)
3. Translate to Japanese (save as `<filename>.ja.md`)

Translation rules:
- Keep all frontmatter fields, only translate `title` and `description`
- Keep code blocks unchanged
- Keep technical terms in English (React, TypeScript, API, CI/CD, etc.)
- Use natural, conversational tone matching the original author's voice
- Do NOT translate URLs, file paths, or variable names

Commit the translated files with message:
"docs: translate <original-filename> to EN and JA"
```

这比 200 行 YAML 可读性好多少，不用我说了吧。

而且——这是我最喜欢的部分——**翻译质量比之前的脚本方案好**。之前我的脚本是 `curl` 调 API，把整个文件丢给模型，没有任何上下文。现在 agent 能看到仓库里其他已翻译的文章，自动学习翻译风格的一致性。比如它会发现我之前的翻译里 "退出码" 对应 "exit code"（而不是 "return code"），然后保持一致。

## 7. 安装和上手

```bash
# 安装 gh-aw CLI extension
gh extension install gh-aw/gh-aw

# 验证安装
gh aw --version

# 创建你的第一个 workflow
mkdir -p workflows
```

然后创建 `workflows/hello.md`：

```markdown
---
engine: claude
trigger: workflow_dispatch
---

When manually triggered, print "Hello from Agentic Workflow!"
to the GitHub Actions log.
```

`workflow_dispatch` 表示手动触发——方便测试。

```bash
# 编译成 GitHub Actions YAML
gh aw compile workflows/hello.md

# 看看生成了什么
cat .github/workflows/hello.yml

# 本地运行测试
gh aw run workflows/hello.md
```

就这样。从安装到跑通第一个 workflow，大概 5 分钟。

## 8. 这东西的本质是什么

gh-aw 本质上是一个**编译器**——把 Markdown 编译成 GitHub Actions YAML。它不是替代 GitHub Actions，而是给 GitHub Actions 加了一层更高级的抽象。

类比一下：
- **GitHub Actions YAML** 相当于汇编语言——精确控制每一步，但写起来痛苦
- **gh-aw Markdown** 相当于高级语言——你描述意图，编译器负责实现

这和整个 AI 工具链的趋势是一致的。我在[之前的文章](/posts/agent-first-cli-design)里讨论过 agent-first 的设计哲学——工具应该对 agent 友好。gh-aw 更进一步：**workflow 本身就是用自然语言写的，连"对 agent 友好"这一步都省了，因为它本来就是给 agent 看的。**

当然，它也有局限性：

| 场景 | gh-aw | 手写 YAML |
|------|-------|----------|
| 简单的 agent 任务 | 极其方便 | 过度工程 |
| 复杂的矩阵构建 | 可能力不从心 | 更精确 |
| 需要精确控制缓存/artifact | 不太适合 | 完全控制 |
| 团队新成员上手 | 读 Markdown 就懂 | 需要学 Actions 语法 |
| Agent 原生任务（review/translate/triage） | 天然适合 | 需要大量 glue code |

我的建议是：**如果你的 workflow 核心逻辑是"让 AI 做某件事"，用 gh-aw。如果核心逻辑是"编译、测试、部署"这种确定性流程，继续用 YAML。** 两者可以共存。

## 9. 写在最后

2026 年的 CI/CD 正在经历一次有趣的转变。传统的 CI/CD 是确定性的——同样的输入永远产生同样的输出。但越来越多的 workflow 需要"智能"——理解代码语义、生成自然语言、做判断决策。这些任务用传统的 shell 脚本和 YAML 来写，就像用汇编写 web server 一样——能做，但何必呢。

gh-aw 不是唯一的解法（类似的项目还有好几个），但它的切入点很好：不要求你学新概念，不要求你搭新基础设施，只是让你用 Markdown 写一段话，然后编译成你已经熟悉的 GitHub Actions。

三句话，够了。
