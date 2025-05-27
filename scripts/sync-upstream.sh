#!/bin/bash
# filepath: sync-upstream.sh

# 用法: ./sync-upstream.sh <upstream/branch> <tmp_dir>
# 示例: ./sync-upstream.sh upstream/master /tmp/astro-protect

set -e

###########################
# 配置区
DEBUG=true  # 设置为 true 启用调试输出
PROTECT_LIST="scripts/git-protect.list" # 保护文件列表路径
###########################

UPSTREAM_BRANCH="$1"
TMP_DIR="$2"

# 打印调试信息
log_debug() {
  if [[ "$DEBUG" == true ]]; then
    echo -e "[DEBUG] $*"
  fi
}

if [[ -z "$UPSTREAM_BRANCH" || -z "$TMP_DIR" ]]; then
  echo "用法: $0 <upstream/branch> <tmp_dir>"
  exit 1
fi

if [[ ! -f "$PROTECT_LIST" ]]; then
  echo "未找到 $PROTECT_LIST 文件"
  exit 1
fi

log_debug "同步上游分支: $UPSTREAM_BRANCH"
log_debug "临时目录: $TMP_DIR"
log_debug "保护列表文件: $PROTECT_LIST"

# 确保复制隐藏文件（如 .env）
shopt -s dotglob

# 1. 备份需要保护的文件/文件夹
mkdir -p "$TMP_DIR"
while IFS= read -r path || [[ -n "$path" ]]; do
  [[ -z "$path" ]] && continue
  [[ "${path:0:1}" == "#" ]] && continue
  if [[ -e "$path" ]]; then
    log_debug "备份: $path"
    mkdir -p "$TMP_DIR/$(dirname "$path")"
    cp -r "$path" "$TMP_DIR/$(dirname "$path")/"
  else
    log_debug "跳过不存在的路径: $path"
  fi
done < "$PROTECT_LIST"

# 2. 用上游分支内容覆盖本地
log_debug "获取上游分支 ${UPSTREAM_BRANCH%%/*}"
git fetch "${UPSTREAM_BRANCH%%/*}"

log_debug "从 $UPSTREAM_BRANCH 覆盖当前目录内容"
git checkout "$UPSTREAM_BRANCH" -- .

# 3. 恢复保护的文件/文件夹
while IFS= read -r path || [[ -n "$path" ]]; do
  [[ -z "$path" ]] && continue
  [[ "${path:0:1}" == "#" ]] && continue
  if [[ -e "$TMP_DIR/$path" ]]; then
    log_debug "恢复: $path"
    rm -rf "$path"
    mkdir -p "$(dirname "$path")"
    cp -r "$TMP_DIR/$path" "$path"
  else
    log_debug "未找到备份，跳过: $path"
  fi
done < "$PROTECT_LIST"

# 4. 清理临时目录
log_debug "删除临时目录: $TMP_DIR"
rm -rf "$TMP_DIR"

echo "✅ 同步完成，已保留保护文件。请检查后 git add/commit/push。"
