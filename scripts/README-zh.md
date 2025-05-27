## 🚀 基于本仓库创建并维护你自己的博客项目

本仓库为 [Astro](https://astro.build/) + [Retype](https://retype.com/) 构建的高颜值博客模板，支持一键部署和持续更新。以下是创建你自己的博客并与本模板保持同步的标准流程。

### ✅ 第一步：创建你自己的仓库

请**不要 Fork** 本仓库。
相反，请点击 👉 [Use this template](https://github.com/radishzzz/astro-theme-retypeset) 创建一个新的仓库副本。

> 📌 原因说明：Fork 仓库将强制公开，并可能暴露你的私人配置（例如部署密钥、邮箱、API Token 等），不利于信息保护。

---

### ✏️ 第二步：保护你的自定义内容

你将在 `scripts/git-protect.list` 文件中声明需要保护的内容（如你撰写的文章、配置文件、页面自定义设置等）。
这些文件在后续执行上游同步时会被自动备份和恢复，确保不会被覆盖。

---

### 🌐 第三步：开发并部署你的博客

* 根据项目目录结构撰写你的内容；
* 使用平台如 [Vercel](https://vercel.com/)、[Netlify](https://www.netlify.com/) 等部署站点；

---

### 🔄 第四步：同步上游更新并保留本地定制

> 在你首次同步前，需添加上游远程地址（只需执行一次）：

```bash
git remote add upstream https://github.com/radishzzz/astro-theme-retypeset.git
```

之后每次同步只需在项目根目录执行以下命令：

#### macOS / Linux / WSL / Git Bash（推荐）：

```bash
chmod u+x scripts/sync-upstream.sh
bash scripts/sync-upstream.sh upstream/master /tmp/blog-sync
```

#### Windows 用户注意：

* **请使用 Git Bash** 执行上述命令；
* ❌ **不建议使用 cmd.exe 或 PowerShell**，以避免路径兼容与权限问题；
* 如需使用 Windows 运行脚本，推荐 Git Bash。路径参数使用 `/c/...` 格式，避免 Windows 风格路径。

---

### 📎 常见问题

* **为什么不通过Github Actions 自动化处理？**

  由于游仓库的活跃，无法保证合并不需要人工介入。

* **为何要保护文件？**

  上游可能会变更主题逻辑、样式或结构。通过 `git-protect.list` 声明关键文件，可在合并更新时避免被覆盖。

* **我修改了主题结构，是否还能同步？**

  可以。但需在同步前手动解决冲突，并确保 `git-protect.list` 保护的路径无误。
