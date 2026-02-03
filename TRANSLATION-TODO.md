# Blog Translation Task List

## Overview

This document contains a list of tech articles that need translation. The blog supports three languages:
- **zh** (Chinese) - Default language
- **en** (English)
- **ja** (Japanese)

## Translation Guidelines

### File Naming Convention
- Original Chinese article: `article-name.md`
- English translation: `article-name.en.md`
- Japanese translation: `article-name.ja.md`

### Frontmatter Requirements
Each translated file must include:
```yaml
---
title: [Translated title]
lang: en  # or 'ja' for Japanese
slug: [same-as-original]  # IMPORTANT: Must match original for deduplication
# Copy all other frontmatter from original
---
```

### Translation Quality Standards
1. Preserve all code blocks exactly as-is
2. Translate comments within code if they are in Chinese
3. Keep technical terms consistent (e.g., "Machine Learning" not "机器学习" in English)
4. Maintain the same markdown structure and formatting
5. Translate image alt text if present

---

## Prompt for Translation Agent

Use this prompt when starting a new Claude session for translation:

```
You are a technical blog translator. Your task is to translate blog articles between Chinese, English, and Japanese.

**Working Directory**: /Users/zhenjiazhou/Documents/blog/Blog-astro/content/posts/

**Translation Rules**:
1. Read the original article first
2. Create translation files with correct naming: `{original-name}.en.md` and `{original-name}.ja.md`
3. Copy the frontmatter and add `lang: en` or `lang: ja`
4. The `slug` field MUST be identical to the original for proper linking
5. Preserve all code blocks, only translate comments if in Chinese
6. Translate naturally, not word-by-word
7. For Japanese, use appropriate keigo (敬語) level matching the original tone

**After each translation**:
- Mark the article as completed in TRANSLATION-TODO.md
- Move to the next article in the priority list

Start with the HIGH PRIORITY articles first.
```

---

## Articles to Translate

### HIGH PRIORITY (AI/Agent related - most valuable for international readers)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [ ] | `agentic-ai-note.md` | Agentic AI Lecture Note | zh | ✅ Has en/ja |
| [ ] | `claude-code-skills-plugins-guide.md` | Claude Code Skills和Plugins | zh | ✅ Has en/ja |
| [ ] | `fast-track-andrew-ng-agentic-ai.md` | 速通Andrew Ng的Agentic AI课程 | zh | DRAFT - skip |
| [x] | `AWS Inspector mystery cycle.md` | 破解 AWS Inspector 与 ECR 的隐藏关联 | zh | ✅ Done |
| [x] | `Clean Code, Refactoring and Test-Driven Development.md` | Clean Code, Refactoring and TDD | en | ✅ Done |
| [x] | `How-I-understand-React-as-a-Backend-Developer.md` | How I Understand React | en | ✅ Done |

### MEDIUM PRIORITY (Machine Learning / Data Science)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [x] | `AMF.md` | 自动机器学习代码详解 | zh | ✅ Done |
| [x] | `Keras-Tuner.md` | Keras Tuner & Transfer Learning | en | ✅ Done |
| [x] | `machine-learning-on-sever.md` | 服务器部署自动机器学习 | zh | ✅ Done |
| [x] | `Mixture-Density-Network.md` | Mixture Density Network(1) | en | ✅ Done |
| [x] | `Mixture-Density-Network(2).md` | Mixture Density Network(2) | en | ✅ Done |
| [x] | `Mixture-Density-Network-3.md` | Mixture Density Network 3 | en | ✅ Done |
| [x] | `probabilistic-method-in-machine-learning.md` | Probabilistic Method in ML | en | ✅ Done |
| [x] | `tensorflow.md` | tensorflow基础 | zh | ✅ Done |
| [x] | `PyTorch.md` | PyTorch基础 | zh | ✅ Done |

### MEDIUM PRIORITY (Algorithm / LeetCode)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [x] | `Binary-search.md` | Binary search | en | ✅ Done |
| [ ] | `Greedy.md` | Greedy | en | DRAFT - skip |
| [ ] | `Hash.md` | Hash | en | DRAFT - skip |
| [x] | `recursive.md` | Recursive | en | ✅ Done |
| [x] | `two-pointers.md` | Two pointers | en | ✅ Done |
| [ ] | `Leetcode面试高频题分类刷题总结.md` | Leetcode面试高频题分类刷题总结 | zh | PASSWORD PROTECTED - skip |

### LOW PRIORITY (Python / Data Tools)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [x] | `pandas-cheat-sheet.md` | pandas cheat sheet | en | ✅ Done |
| [x] | `pandas基础.md` | pandas基础 | zh | ✅ Done |
| [x] | `python学术绘图.md` | python绘图基础 | zh | ✅ Done |
| [x] | `matplotlib-subplot.md` | matplotlib-subplot | zh | ✅ Done |
| [x] | `Publishable-plot-using-python-R.md` | Publishable plot | zh | ✅ Done |
| [x] | `cartopy.md` | cartopy | zh | ✅ Done |
| [x] | `lambda.md` | Useful python functions | zh | ✅ Done |
| [ ] | `in-python.md` | _ in python | zh | DRAFT - skip |
| [x] | `np-ma-mask.md` | np.ma.mask | en | ✅ Done |
| [x] | `Scipy-optimize.md` | Scipy optimize | en | ✅ Done |
| [x] | `Robust-fit.md` | Robust fit | en | ✅ Done |
| [ ] | `python-step-wise-MLR.md` | python step wise MLR | en | DRAFT - skip |

### LOW PRIORITY (DevOps / Tools)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [x] | `WSL.md` | WSL+anaconda+jupyter | zh | ✅ Done |
| [x] | `CLI.md` | CLI | zh | ✅ Done |
| [x] | `lfs.md` | lfs | zh | ✅ Done |
| [ ] | `Idea-debug.md` | Idea debug/Gradle | zh | DRAFT - skip |
| [ ] | `sql.md` | sql | zh | PASSWORD PROTECTED - skip |
| [ ] | `Jupyer-Lab.md` | Jupyter Lab | zh | DRAFT - skip |
| [x] | `Obsidian-Daily-Record-System.md` | Obsidian Daily Record | zh | ✅ Done |

### LOW PRIORITY (Programming Languages)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [ ] | `java.md` | java | zh | PASSWORD PROTECTED - skip |
| [ ] | `javascript.md` | javascript | zh | PASSWORD PROTECTED - skip |
| [ ] | `html-css.md` | html&css | zh | PASSWORD PROTECTED - skip |
| [x] | `assert.md` | assert | zh | ✅ Done |

### LOW PRIORITY (Ocean Color / Remote Sensing - Domain Specific)

| Status | File | Title | Source Lang | Needs |
|--------|------|-------|-------------|-------|
| [x] | `Chla-retrieval.md` | Chla retrieval | en | ✅ Done |
| [x] | `Ocean-color-Environment-on-Server.md` | Ocean color Environment | zh | ✅ Done |
| [x] | `plot.md` | Basis for subplot2grid | zh | ✅ Done |
| [x] | `Tennary-plot.md` | Tennary plot | zh | ✅ Done |

---

## Translation Workflow

### Step-by-step for each article:

1. **Read original**: `cat {filename}`
2. **Create English version**:
   ```bash
   # Copy original and modify
   cp "{filename}" "{filename%.md}.en.md"
   # Edit frontmatter: add lang: en
   # Translate content
   ```
3. **Create Japanese version**:
   ```bash
   cp "{filename}" "{filename%.md}.ja.md"
   # Edit frontmatter: add lang: ja
   # Translate content
   ```
4. **Update this file**: Mark `[x]` when done

### Example frontmatter for translation:

**Original (Chinese)**:
```yaml
---
title: 自动机器学习代码详解
tags:
  - Machine Learning
  - Python
abbrlink: abc123
slug: amf-tutorial
---
```

**English translation**:
```yaml
---
title: AutoML Code Explained
tags:
  - Machine Learning
  - Python
abbrlink: abc123
slug: amf-tutorial
lang: en
---
```

**Japanese translation**:
```yaml
---
title: 自動機械学習コード詳解
tags:
  - Machine Learning
  - Python
abbrlink: abc123
slug: amf-tutorial
lang: ja
---
```

---

## Progress Tracking

- Total articles: ~49
- Completed: 6 (agentic-ai-note, claude-code-skills-plugins-guide, agent-coding-experience-and-future, AWS Inspector mystery cycle, Clean Code Refactoring TDD, How I Understand React)
- Remaining: ~43

Last updated: 2026-02-02

