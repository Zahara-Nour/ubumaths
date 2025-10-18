# Git Workflow Quick Reference

**TL;DR:** Work on feature branches freely, merge to `main` with proper commit format, release with `pnpm release`, push with `--follow-tags`.

## ⚠️ Important: Husky Does NOT Bump Versions!

**Common Misconception:** "Husky automatically updates the version"

**Reality:**
- **Husky** = Validates commits (linting + format) ❌ Does NOT change version
- **pnpm release** = Bumps version, creates tags, updates CHANGELOG ✅ Changes version

| Tool | Runs When | Changes Version? |
|------|-----------|------------------|
| Husky | Every commit on main | ❌ No |
| pnpm release | When YOU run it | ✅ Yes |

**Example:**
```bash
git commit "feat: add feature"  # Husky validates ✅, version stays 0.0.2
git commit "fix: bug"           # Husky validates ✅, version stays 0.0.2
pnpm release                    # NOW version bumps to 0.1.0 ✅
```

See [VERSION_MANAGEMENT.md FAQ](VERSION_MANAGEMENT.md#faq) for detailed explanation.

## 🚦 Daily Workflow

### 1. Start New Feature

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

### 2. Develop

```bash
# Make changes, commit freely (any message format)
git add .
git commit -m "wip: working on it"
git commit -m "almost done"
git push origin feature/my-feature
```

### 3. Merge to Main

```bash
git checkout main
git merge --squash feature/my-feature
git commit -m "feat: add my feature"  # ← Proper format required!
git push origin main
```

### 4. Release

```bash
pnpm release                          # Auto-detects version
git push --follow-tags origin main    # Push commits + tags
```

## 📝 Commit Message Format (Main Branch Only)

```
<type>(<scope>): <subject>

Examples:
✅ feat: add user dashboard
✅ fix: resolve login timeout
✅ docs: update README
✅ feat!: redesign API (breaking change)

❌ Added feature (no type)
❌ feature: new thing (wrong type)
```

## 🏷️ Git Tags Cheat Sheet

```bash
# List all tags
git tag

# Show tag details
git show v0.1.0

# Push tags with commits
git push --follow-tags origin main

# Delete tag (local)
git tag -d v0.1.0

# Delete tag (remote)
git push origin --delete v0.1.0
```

## 🎯 Common Commands

### Check Current State

```bash
git status                    # Working directory status
git branch                    # Current branch
git log --oneline -5         # Recent commits
git tag -l                   # All tags
```

### Version Management

```bash
pnpm release                 # Auto-detect bump
pnpm release:patch           # Force patch (0.0.x)
pnpm release:minor           # Force minor (0.x.0)
pnpm release:major           # Force major (x.0.0)
```

### Undoing Changes

```bash
# Unstage files
git restore --staged <file>

# Discard changes
git restore <file>

# Amend last commit (if not pushed)
git commit --amend -m "new message"

# Reset last commit (keep changes)
git reset --soft HEAD~1
```

### Branch Management

```bash
# List branches
git branch -a

# Delete branch (local)
git branch -d feature/my-feature

# Delete branch (remote)
git push origin --delete feature/my-feature

# Rename branch
git branch -m old-name new-name
```

## 🔥 Emergency Procedures

### Quick Hotfix

```bash
git checkout main
git pull origin main
# ... fix bug ...
git add .
git commit -m "fix: critical bug"
pnpm release:patch
git push --follow-tags origin main
```

### Bypass Hooks (Use Sparingly!)

```bash
git commit --no-verify -m "emergency fix"
```

### Fix Wrong Commit Message

```bash
# If not pushed yet
git commit --amend -m "fix: correct message"

# If already pushed (dangerous!)
# DON'T - breaks history for others
```

### Tag Already Exists

```bash
# Delete and recreate
git tag -d v0.1.0
pnpm release
```

## 📊 Workflow Scenarios

### Quick Fix on Main

```bash
git checkout main
git add .
git commit -m "fix: resolve issue"
git push origin main
pnpm release:patch
git push --follow-tags origin main
```

### Multiple Features Before Release

```bash
git commit -m "feat: feature A"
git commit -m "feat: feature B"
git commit -m "fix: bug fix"
pnpm release  # Analyzes all, bumps to 0.1.0
git push --follow-tags origin main
```

### Breaking Change

```bash
git commit -m "feat!: redesign API

BREAKING CHANGE: endpoints moved to /v2"
pnpm release  # Bumps to 1.0.0
git push --follow-tags origin main
```

## 🪝 Hook Behavior

| Branch | Pre-commit (Linting) | Commit-msg (Format) |
|--------|---------------------|---------------------|
| `main` | ✅ Runs | ✅ Validates |
| `feature/*` | ⏭️ Skips | ⏭️ Skips |
| `fix/*` | ⏭️ Skips | ⏭️ Skips |

## 🆘 Troubleshooting

### Linting Fails

```bash
pnpm lint        # See errors
pnpm format      # Auto-fix
git add .
git commit -m "fix: linting"
```

### Commit Message Rejected

```bash
# Error: "type must be one of..."
# Fix: Use valid type
git commit -m "feat: your message"
```

### Forgot to Push Tags

```bash
# Tags are local only
git push --tags origin main
```

### Can't Find Tag on Remote

```bash
# Fetch tags from remote
git fetch --tags

# List remote tags
git ls-remote --tags origin
```

## 📚 Full Documentation

For detailed explanations, see:
- **[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)** - Complete guide with examples
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[commitlint.config.cjs](commitlint.config.cjs)** - Commit rules

## 🎓 Learning Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Tags](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [Semantic Versioning](https://semver.org/)

---

**Remember:** Feature branches = freedom, Main branch = quality 🎯
