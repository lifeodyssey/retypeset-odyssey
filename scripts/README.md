## 🚀 Create and Maintain Your Own Blog Based on This Repository

This repository provides a visually polished blog template built with [Astro](https://astro.build/) and [Retype](https://retype.com/), designed for seamless deployment and long-term maintenance. Follow the steps below to initialize your own blog and keep it in sync with future upstream updates.

---

### ✅ Step 1: Create Your Own Repository

**Do not fork this repository.**
Instead, click 👉 [Use this template](https://github.com/radishzzz/astro-theme-retypeset) to create a new repository based on this template.

> 📌 **Why not fork?**
> Forked repositories are publicly visible by default, which may expose sensitive configuration data (e.g., deployment tokens, email addresses, API keys), posing a security risk.

---

### ✏️ Step 2: Safeguard Your Custom Content

Declare the files and directories you want to preserve in the `scripts/git-protect.list` file.
This includes your posts, configuration files, and site-specific settings. These items will be automatically backed up and restored during synchronization with the upstream repository, ensuring they are never overwritten.

---

### 🌐 Step 3: Develop and Deploy Your Blog

* Structure and write your content according to the project’s directory layout.
* Deploy the site using platforms such as [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
* Continuous deployment via GitHub Actions is supported but optional.

---

### 🔄 Step 4: Sync with Upstream While Preserving Local Customizations

> Before the first synchronization, add the upstream remote (only required once):

```bash
git remote add upstream https://github.com/radishzzz/astro-theme-retypeset.git
```

Then, run the sync script from the root directory of your repository:

#### macOS / Linux / WSL / Git Bash (Recommended):

```bash
chmod u+x scripts/sync-upstream.sh
bash scripts/sync-upstream.sh upstream/master /tmp/blog-sync
```

#### For Windows Users:

* ✅ **Use Git Bash** to run the above commands;
* ❌ **Avoid using cmd.exe or PowerShell**, as they may cause compatibility issues with file paths;
* For best results, stick with Git Bash even on Windows.Use the `/c/...` format for path arguments and avoid Windows-style paths.

---

### 📎 Frequently Asked Questions

* **Why not automate synchronization with GitHub Actions?**
  Due to the active nature of this upstream repository, automatic merges are not guaranteed to be conflict-free. Manual review is often required.

* **Why are certain files protected?**
  Upstream updates may introduce structural or styling changes. Defining protected files in `git-protect.list` ensures your custom content is preserved during synchronization.

* **Can I still sync if I’ve modified the theme structure?**
  Yes, but you'll need to manually resolve conflicts before syncing. Make sure all critical paths are properly listed in `git-protect.list`.
