#!/bin/bash

# Script to push Log-zilla to GitHub with better error handling

set -e

echo "🚀 Log-zilla GitHub Push Script"
echo "================================"
echo ""

# Check if remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote 'origin' found!"
    echo "Adding remote..."
    git remote add origin https://github.com/arukurmi/Log-zilla.git
fi

# Verify remote
echo "📍 Remote URL:"
git remote -v
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Current branch: $CURRENT_BRANCH"
echo ""

# Make sure we're on main
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Not on main branch. Switching..."
    git checkout main
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes!"
    echo "Please commit or stash them first."
    exit 1
fi

# Show what will be pushed
echo "📦 Commits to push:"
git log origin/main..main --oneline 2>/dev/null || git log --oneline -5
echo ""

# Try pushing with increased buffer
echo "🔧 Configuring Git for large push..."
git config http.postBuffer 524288000 || echo "⚠️  Could not set postBuffer (may need sudo)"
git config http.version HTTP/1.1 || echo "⚠️  Could not set HTTP version"

echo ""
echo "📤 Pushing to GitHub..."
echo "   (You'll be prompted for username and Personal Access Token)"
echo ""

# Push with verbose output
if git push -u origin main --verbose; then
    echo ""
    echo "✅ Success! Your code is on GitHub!"
    echo "🌐 Visit: https://github.com/arukurmi/Log-zilla"
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure you're using a Personal Access Token (not password)"
    echo "2. Token must have 'repo' scope"
    echo "3. Create token at: https://github.com/settings/tokens"
    echo "4. Try: git push -u origin main --verbose"
    exit 1
fi
