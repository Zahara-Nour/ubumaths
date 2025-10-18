# Version Management Guide

This project uses automated version management with Husky git hooks and Conventional Commits.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Understanding Git Hooks with Husky](#understanding-git-hooks-with-husky)
- [Commit Message Format](#commit-message-format)
- [Version Bumping](#version-bumping)
- [Working with Git Tags](#working-with-git-tags)
- [Complete Git Workflow](#complete-git-workflow)
- [Automated Checks](#automated-checks)
- [Workflow Examples](#workflow-examples)
- [Branch Strategies](#branch-strategies)
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

## 🚀 Quick Start

### Daily Development (Feature Branches)

```bash
# Create feature branch (no hooks run)
git checkout -b feature/my-feature

# Make commits (any format works)
git add .
git commit -m "working on feature"  # ✅ No validation

# Push to remote
git push origin feature/my-feature
```

### Merging to Main (Hooks Active)

```bash
# Switch to main
git checkout main

# Merge feature (squash recommended)
git merge --squash feature/my-feature

# Commit with proper format (hooks will validate)
git commit -m "feat: add my feature"  # ✅ Hooks run and validate

# Push to main
git push origin main
```

### Creating a Release

```bash
# When ready to release
pnpm release              # Auto-detects version bump
# OR
pnpm release:patch        # Force patch (0.0.x)
pnpm release:minor        # Force minor (0.x.0)
pnpm release:major        # Force major (x.0.0)

# Push commits AND tags together
git push --follow-tags origin main
```

## 🪝 Understanding Git Hooks with Husky

### What are Git Hooks?

Git hooks are **scripts that run automatically** at specific points in the git workflow. They can:
- ✅ Validate commit messages
- ✅ Run tests before commits
- ✅ Enforce code quality
- ✅ Prevent bad commits from entering the codebase

### How Husky Works

**Husky** manages git hooks for you:

1. **Hooks are stored in `.husky/` directory** (tracked in git)
2. **Everyone on the team gets the same hooks** when they clone
3. **Hooks run automatically** - no manual setup needed
4. **Hooks can be bypassed** in emergencies (see Troubleshooting)

### Our Hooks Setup

This project has **2 active hooks** that only run on the `main` branch:

#### 1. **pre-commit** Hook
**When:** Before commit is created
**What it does:**
- ✅ Runs `pnpm lint` (Prettier + ESLint)
- ✅ Blocks commit if linting fails
- ⏭️ Tests are commented out (enable if needed)

**Location:** `.husky/pre-commit`

#### 2. **commit-msg** Hook
**When:** After you write commit message, before commit is saved
**What it does:**
- ✅ Validates commit message format
- ✅ Ensures conventional commits syntax
- ✅ Blocks commit if format is invalid

**Location:** `.husky/commit-msg`

### Branch Detection Logic

Both hooks check which branch you're on:

```bash
# In .husky/pre-commit and .husky/commit-msg
BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "main" ]; then
  # Run validation
else
  # Skip validation (feature branches)
fi
```

**Result:**
- ✅ **On `main` branch:** Hooks run and enforce quality
- ✅ **On other branches:** Hooks skip for faster development

### Viewing Hook Output

When you commit on `main`, you'll see:

```bash
$ git commit -m "feat: add feature"

🧪 Running pre-commit checks on main branch...
📋 Running linting...
✅ Pre-commit checks passed!
🔍 Validating commit message on main branch...
[main abc1234] feat: add feature
```

When you commit on a feature branch:

```bash
$ git commit -m "work in progress"

ℹ️  Skipping pre-commit checks (not on main branch)
ℹ️  Skipping commit message validation (not on main branch)
[feature/my-branch abc1234] work in progress
```

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
# Push commits AND tags together
git push --follow-tags origin main
```

## 🏷️ Working with Git Tags

### What are Git Tags?

Git tags are **permanent markers** that point to specific commits in your history. They're used to mark important points like releases.

**In this project:**
- Tags mark version releases (e.g., `v0.0.2`, `v0.1.0`, `v1.0.0`)
- Created automatically by `standard-version`
- Must be pushed manually to remote

### Tag Format

All version tags follow this format:
```
v<major>.<minor>.<patch>

Examples:
v0.0.1  → Initial release
v0.1.0  → Minor version with new features
v1.0.0  → Major version with breaking changes
```

### Viewing Tags

```bash
# List all tags
git tag
# or
git tag -l

# Output:
# v0.0.1
# v0.0.2
# v0.1.0

# List tags with pattern
git tag -l "v0.1.*"
# v0.1.0
# v0.1.1
# v0.1.2

# Show tag details
git show v0.0.2
# Shows: commit hash, author, date, commit message, diff
```

### Understanding Tag Types

**Lightweight Tags** (NOT used in this project):
```bash
git tag v1.0.0  # Just a pointer to a commit
```

**Annotated Tags** (used by standard-version):
```bash
git tag -a v1.0.0 -m "Release 1.0.0"  # Contains metadata
```

Standard-version creates annotated tags automatically with the version number as the message.

### Pushing Tags

**IMPORTANT:** Tags are NOT pushed with regular `git push`!

```bash
# ❌ WRONG - doesn't push tags
git push origin main

# ✅ CORRECT - pushes commits AND tags
git push --follow-tags origin main

# Alternative: Push all tags (be careful)
git push --tags origin main
```

**Why `--follow-tags`?**
- Only pushes **annotated tags** (created by standard-version)
- Safer than `--tags` (which pushes ALL tags, including experimental ones)
- Recommended for this workflow

### Tag Workflow Example

```bash
# 1. Make commits
git commit -m "feat: add feature A"
git commit -m "feat: add feature B"

# 2. Create release
pnpm release
# ✅ Bumps version to 0.1.0
# ✅ Creates tag v0.1.0
# ✅ Updates CHANGELOG.md
# ✅ Creates commit

# 3. Check what happened
git log --oneline -2
# abc1234 chore(release): 0.1.0
# def5678 feat: add feature B

git tag -l
# v0.0.1
# v0.0.2
# v0.1.0  ← New tag created

# 4. Push everything
git push --follow-tags origin main
# ✅ Pushes commits
# ✅ Pushes v0.1.0 tag
```

### Checking Remote Tags

```bash
# List tags on remote
git ls-remote --tags origin

# Output:
# abc123  refs/tags/v0.0.1
# def456  refs/tags/v0.0.2
# ghi789  refs/tags/v0.1.0

# Fetch tags from remote
git fetch --tags
```

### Deleting Tags (if needed)

```bash
# Delete local tag
git tag -d v0.1.0

# Delete remote tag
git push origin --delete v0.1.0

# Note: Only delete tags that haven't been released to production!
```

### Tag Troubleshooting

**Problem:** Tag already exists
```bash
$ pnpm release
✖ fatal: tag 'v0.1.0' already exists
```

**Solution:**
```bash
# Check if tag is correct
git show v0.1.0

# If wrong, delete and recreate
git tag -d v0.1.0
pnpm release
```

**Problem:** Forgot to push tags
```bash
$ git push origin main  # Tags not pushed!
```

**Solution:**
```bash
# Push tags separately
git push --tags origin main
```

## 🔄 Complete Git Workflow

### Scenario 1: Feature Development (Recommended)

```bash
# Step 1: Create feature branch
git checkout main
git pull origin main
git checkout -b feature/user-authentication

# Step 2: Develop (hooks don't run)
# ... make changes ...
git add .
git commit -m "wip: implementing OAuth"
git commit -m "wip: adding login page"
git commit -m "almost done"

# Step 3: Push feature branch
git push origin feature/user-authentication

# Step 4: Merge to main (squash commits)
git checkout main
git merge --squash feature/user-authentication

# Step 5: Commit with proper format (hooks RUN)
git commit -m "feat: add OAuth authentication with Google"
# 🧪 Running pre-commit checks...
# 🔍 Validating commit message...
# ✅ All checks passed!

# Step 6: Push to main
git push origin main

# Step 7: When ready to release
pnpm release  # Creates v0.1.0
git push --follow-tags origin main
```

### Scenario 2: Direct Commits to Main

```bash
# Step 1: Make sure you're on main
git checkout main
git pull origin main

# Step 2: Make changes
# ... edit files ...

# Step 3: Commit (hooks RUN)
git add .
git commit -m "fix: resolve database timeout issue"
# 🧪 Running pre-commit checks...
# 🔍 Validating commit message...
# ✅ All checks passed!

# Step 4: Push
git push origin main

# Step 5: Release when ready
pnpm release:patch  # v0.0.2 → v0.0.3
git push --follow-tags origin main
```

### Scenario 3: Multiple Features Before Release

```bash
# Week 1: Feature A
git checkout -b feature/dashboard
# ... develop ...
git commit -m "wip"
git checkout main
git merge --squash feature/dashboard
git commit -m "feat: add admin dashboard"
git push origin main

# Week 2: Feature B
git checkout -b feature/export
# ... develop ...
git commit -m "wip"
git checkout main
git merge --squash feature/export
git commit -m "feat: add PDF export"
git push origin main

# Week 3: Bug fixes
git commit -m "fix: dashboard loading issue"
git commit -m "fix: export formatting"
git push origin main

# Week 4: Release everything
pnpm release
# Analyzes: 2 feat commits + 2 fix commits
# Bumps: v0.0.1 → v0.1.0 (minor because of feat)
# CHANGELOG:
#   ## Features
#   - add admin dashboard
#   - add PDF export
#   ## Bug Fixes
#   - dashboard loading issue
#   - export formatting

git push --follow-tags origin main
```

### Scenario 4: Hotfix Production Bug

```bash
# Emergency fix needed NOW

# Option 1: Proper workflow (recommended)
git checkout main
git pull origin main
# ... fix the bug ...
git add .
git commit -m "fix: critical security vulnerability"
# Hooks run and validate
pnpm release:patch  # Quick patch release
git push --follow-tags origin main

# Option 2: Emergency bypass (use sparingly!)
git add .
git commit --no-verify -m "fix: critical security vulnerability"
# Bypasses hooks for speed
git push origin main
# Release later:
pnpm release:patch
git push --follow-tags origin main
```

### Scenario 5: Breaking Change Release

```bash
# Step 1: Make breaking changes
git checkout -b feature/api-redesign
# ... major refactoring ...

# Step 2: Merge with breaking change marker
git checkout main
git merge --squash feature/api-redesign

# Step 3: Commit with ! or BREAKING CHANGE footer
git commit -m "feat!: redesign REST API structure

BREAKING CHANGE: All API endpoints moved from /api/v1 to /api/v2.
Removed legacy authentication endpoints."

# Step 4: Release (automatic major bump)
pnpm release
# Detects: BREAKING CHANGE
# Bumps: v0.5.3 → v1.0.0 (major!)
# CHANGELOG clearly marks breaking changes

git push --follow-tags origin main
```

## 🌳 Branch Strategies

### Main Branch Protection

**Rules for `main` branch:**
- ✅ All commits must pass linting
- ✅ All commits must follow conventional format
- ✅ Direct pushes allowed (for small teams)
- ✅ Force push NEVER allowed
- ✅ History must be linear (use squash merges)

### Feature Branch Naming

**Recommended conventions:**
```
feature/   → New features (feature/user-auth)
fix/       → Bug fixes (fix/login-timeout)
refactor/  → Code refactoring (refactor/api-client)
docs/      → Documentation (docs/api-guide)
test/      → Test additions (test/auth-integration)
chore/     → Maintenance (chore/update-deps)
```

**Example:**
```bash
git checkout -b feature/dark-mode
git checkout -b fix/navigation-bug
git checkout -b docs/setup-guide
```

### Long-Running Feature Branches

If a feature takes weeks:

```bash
# Keep feature branch updated
git checkout feature/big-feature
git merge main  # or rebase: git rebase main

# Continue development
git commit -m "progress on big feature"

# When done
git checkout main
git merge --squash feature/big-feature
git commit -m "feat: add big feature"
```

### Working with Team Members

**Pull Request Workflow:**
1. Create feature branch
2. Push to remote: `git push origin feature/my-feature`
3. Open Pull Request on GitHub/GitLab
4. Code review
5. Squash and merge to main (use PR squash feature)
6. Delete feature branch

**Git command alternative:**
```bash
# After PR approved
git checkout main
git pull origin main
git merge --squash feature/my-feature
git commit -m "feat: add feature from PR"
git push origin main
git branch -d feature/my-feature  # Delete local
git push origin --delete feature/my-feature  # Delete remote
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
