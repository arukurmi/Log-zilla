# Complete GitHub Setup - Step by Step

## Step 1: Create Repository on GitHub

1. Go to: **https://github.com/new**
2. Fill in:
   - **Repository name:** `Log-zilla`
   - **Description:** "Beautiful log monitoring for localhost - New Relic alternative"
   - **Visibility:** Public or Private (your choice)
   - **⚠️ IMPORTANT:** Do NOT check any boxes (no README, no .gitignore, no license)
3. Click **"Create repository"**

## Step 2: Set Up Remote (Run in Terminal)

After creating the repository, run these commands:

```bash
cd /Users/aryanshkurmi/code/Log-zilla

# Remove old remote if it exists
git remote remove origin 2>/dev/null || true

# Add the new remote
git remote add origin https://github.com/arukurmi/Log-zilla.git

# Verify remote
git remote -v
```

## Step 3: Push Your Code

```bash
# Make sure you're on main branch
git checkout main

# Push to GitHub
git push -u origin main
```

**When prompted:**
- **Username:** `arukurmi`
- **Password:** Your Personal Access Token (NOT your GitHub password)

## Step 4: Push Other Branches (Optional)

```bash
# Push specs-status branch
git checkout specs-status
git push -u origin specs-status

# Go back to main
git checkout main
```

## Troubleshooting

### If you get "HTTP 400" error:
- Make sure you're using a Personal Access Token, not your password
- Token must have `repo` scope
- Create new token at: https://github.com/settings/tokens

### If you get network errors:
- Check internet connection
- Try: `ping github.com`
- Wait a minute and retry

### If push says "Everything up-to-date" but repo is empty:
- The remote might be pointing to wrong place
- Run: `git remote remove origin` and add it again
- Then try push again
