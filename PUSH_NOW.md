# Push to GitHub - Step by Step

## You have your token - Let's push!

### Step 1: Clear old credentials (if any)

```bash
cd /Users/aryanshkurmi/code/Log-zilla

# Clear any cached credentials
git credential-osxkeychain erase <<EOF
host=github.com
protocol=https
EOF
```

### Step 2: Push your code

```bash
git push -u origin main
```

### Step 3: When prompted, enter:

- **Username:** `arukurmi`
- **Password:** Paste your Personal Access Token here (NOT your GitHub password)

**Important:** 
- The token will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Copy the ENTIRE token
- Paste it when asked for password
- You won't see what you type (it's hidden for security)

### Step 4: Success!

If successful, you'll see:
```
Enumerating objects: 434, done.
Counting objects: 100% (434/434), done.
Delta compression using up to 8 threads
Compressing objects: 100% (185/185), done.
Writing objects: 100% (434/434), 1.11 MiB | X.XX MiB/s, done.
Total 434 (delta 251), reused 391 (delta 232)
To https://github.com/arukurmi/Log-zilla.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

Then visit: **https://github.com/arukurmi/Log-zilla**

## If you get HTTP 400 error:

1. Make sure token has `repo` scope
2. Try creating a NEW token (old one might be invalid)
3. Make sure you're pasting the FULL token (starts with `ghp_`)

## Quick Copy-Paste Commands:

```bash
cd /Users/aryanshkurmi/code/Log-zilla && git credential-osxkeychain erase <<EOF
host=github.com
protocol=https
EOF
git push -u origin main
```
