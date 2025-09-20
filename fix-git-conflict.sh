#!/bin/bash
# fix-git-conflict.sh - Fix Git conflict after history rewrite

set -e

echo "🔧 Fixing Git conflict after history rewrite..."

# Navigate to project directory
cd /home/deploy/medusa/busbasisberlin

# Reset local branch to match the new remote history
echo "📥 Resetting local branch to match remote..."
git fetch origin
git reset --hard origin/main

echo "✅ Git conflict resolved!"
echo "🗑️ Sensitive file has been completely removed from history"
