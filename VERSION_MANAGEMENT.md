# Version Management Guide

This project uses automated version management with Husky git hooks and Conventional Commits.

## 📋 Table of Contents

- [Overview](#overview)
- [Commit Message Format](#commit-message-format)
- [Version Bumping](#version-bumping)
- [Automated Checks](#automated-checks)
- [Workflow Examples](#workflow-examples)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The project uses:
- **Husky**: Git hooks manager
- **Commitlint**: Enforce conventional commit messages
- **Standard-version**: Automatic versioning and CHANGELOG generation

**Branch Restrictions:**
- Hooks **only run on `main` branch**
- Feature branches are unrestricted for faster development
- Quality gates enforce standards before merging to main

## 📝 Commit Message Format

All commits on the `main` branch must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Valid Types

| Type | Description | Version Bump | Visible in CHANGELOG |
|------|-------------|--------------|---------------------|
| **feat** | New feature | Minor (0.x.0) | ✅ Yes |
| **fix** | Bug fix | Patch (0.0.x) | ✅ Yes |
| **perf** | Performance improvement | Patch (0.0.x) | ✅ Yes |
| **docs** | Documentation only | - | ✅ Yes |
| **style** | Code style (formatting, etc.) | - | ❌ Hidden |
| **refactor** | Code restructuring | - | ❌ Hidden |
| **test** | Adding/updating tests | - | ❌ Hidden |
| **build** | Build system changes | - | ❌ Hidden |
| **ci** | CI/CD changes | - | ❌ Hidden |
| **chore** | Maintenance tasks | - | ❌ Hidden |
| **revert** | Revert previous commit | - | ✅ Yes |

### Breaking Changes

For breaking changes, add `!` after type or add `BREAKING CHANGE:` in footer:

```bash
# Option 1: Using !
feat!: redesign authentication API

# Option 2: Using footer
feat: redesign authentication API

BREAKING CHANGE: removed legacy /auth/login endpoint
```

This triggers a **major** version bump (x.0.0).

### Examples

**✅ Valid Commits:**
```bash
feat: add dark mode toggle
fix: resolve navigation bug on mobile
docs: update README with API documentation
perf: optimize database queries for user search
feat(auth)!: migrate to OAuth 2.0
```

**❌ Invalid Commits:**
```bash
Added dark mode           # Missing type prefix
feature: dark mode        # Wrong type (should be "feat")
feat:dark mode           # Missing space after colon
FIX: bug                 # Wrong case (should be lowercase)
```

## 🚀 Version Bumping

### Automatic Version Determination

Run `pnpm release` to analyze commits since last tag and automatically bump version:

```bash
# Commits since last release:
# - feat: add user dashboard
# - fix: resolve login issue
# - docs: update README

pnpm release
# Result: Minor bump (feat detected) → 0.1.0
```

### Manual Version Control

Override automatic detection with specific bump:

```bash
# Patch: 0.0.1 → 0.0.2 (bug fixes)
pnpm release:patch

# Minor: 0.0.1 → 0.1.0 (new features)
pnpm release:minor

# Major: 0.0.1 → 1.0.0 (breaking changes)
pnpm release:major
```

### What `standard-version` Does

When you run `pnpm release`:

1. ✅ Analyzes commit history since last tag
2. ✅ Determines version bump from commit types
3. ✅ Updates `package.json` version
4. ✅ Updates `CHANGELOG.md` with grouped changes
5. ✅ Creates git commit: `chore(release): x.y.z`
6. ✅ Creates git tag: `vx.y.z`

**Important:** It does NOT push to remote automatically. You must push manually.

### Pushing Releases

After running `pnpm release`:

```bash
# Push commits AND tags
git push --follow-tags origin main
```

## 🔒 Automated Checks

### Pre-commit Hook

Runs before commit is created (only on `main` branch):

1. **Linting** (`pnpm lint`)
   - Prettier formatting check
   - ESLint rules validation
   - Blocks commit if failed

2. **Tests** (commented out by default)
   - Uncomment in `.husky/pre-commit` to enable
   - Runs `pnpm test:unit --run`

**Bypass (not recommended):**
```bash
git commit --no-verify -m "emergency fix"
```

### Commit-msg Hook

Validates commit message format (only on `main` branch):

- Checks conventional commit syntax
- Enforces allowed types
- Validates header length (max 100 chars)
- Blocks commit if invalid

## 📚 Workflow Examples

### Example 1: Feature Development

```bash
# On feature branch (no hooks)
git checkout -b feature/user-profile
git add .
git commit -m "added user profile"  # ✅ Allowed (not on main)
git push origin feature/user-profile

# Merge to main
git checkout main
git merge feature/user-profile
# Now squash into proper commit
git reset --soft HEAD~1
git commit -m "feat: add user profile page"  # ✅ Valid conventional commit

# When ready to release
pnpm release         # Bumps to 0.1.0 (feat = minor)
git push --follow-tags origin main
```

### Example 2: Bug Fix Release

```bash
# On main branch
git add .
git commit -m "fix: resolve database connection timeout"
# ✅ Pre-commit: Linting passes
# ✅ Commit-msg: Valid format

# Release patch version
pnpm release:patch   # 0.1.0 → 0.1.1
git push --follow-tags origin main
```

### Example 3: Breaking Change Release

```bash
# On main branch
git add .
git commit -m "feat!: redesign REST API endpoints

BREAKING CHANGE: removed /api/v1/* endpoints, use /api/v2/*"
# ✅ Hooks pass

# Release major version
pnpm release         # Automatically detects breaking change → 1.0.0
git push --follow-tags origin main
```

### Example 4: Multiple Commits Before Release

```bash
# Make several commits
git commit -m "feat: add export to PDF"
git commit -m "feat: add export to CSV"
git commit -m "fix: resolve export formatting issue"
git commit -m "docs: update export documentation"

# Release (analyzes all commits)
pnpm release
# Result: Minor bump (feat commits detected) → 0.2.0
# CHANGELOG includes all 4 commits grouped by type
```

## 🛠 Troubleshooting

### Hook Not Running

```bash
# Ensure hooks are executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

# Reinstall hooks
pnpm prepare
```

### Commit Message Rejected

```bash
# Error: "type must be one of [feat, fix, ...]"
# Fix: Use valid type
git commit -m "feat: your message"  # ✅ Correct

# Error: "subject may not be empty"
# Fix: Add description after colon
git commit -m "feat: add feature"   # ✅ Correct
```

### Linting Fails

```bash
# Check what's failing
pnpm lint

# Auto-fix formatting issues
pnpm format

# Then commit again
git add .
git commit -m "fix: resolve linting errors"
```

### Want to Skip Hooks (Emergency)

```bash
# NOT RECOMMENDED - bypasses all checks
git commit --no-verify -m "emergency: critical production fix"

# Better: Fix properly then commit normally
```

### CHANGELOG Conflicts

If you get merge conflicts in CHANGELOG.md:

```bash
# Accept incoming changes and regenerate
git checkout --theirs CHANGELOG.md
pnpm release         # Regenerates CHANGELOG from commits
```

## 📖 Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Standard-version Documentation](https://github.com/conventional-changelog/standard-version)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Commitlint Documentation](https://commitlint.js.org/)

## 🔄 Version Update Workflow Summary

1. Make commits on `main` with conventional format
2. When ready to release: `pnpm release`
3. Push to remote: `git push --follow-tags origin main`
4. Version displays automatically in app footer and admin settings
5. CHANGELOG.md updated with all changes

**Current version:** See `package.json` or run `pnpm version`
