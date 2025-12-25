---
description: Creer une Pull Request avec checks et description structuree
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*)
---

# Pull Request

Tu crees une Pull Request complete avec tous les checks necessaires.

## Phase 1 : Pre-Checks

### Etape 1 : Etat de la branche

```bash
git status
git branch --show-current
```

### Etape 2 : Synchronisation avec remote

```bash
git fetch origin
git log origin/main..HEAD --oneline
```

### Etape 3 : Changements a inclure

```bash
git diff origin/main...HEAD --stat
```

---

## Phase 2 : Verification Qualite

### Tests

```bash
pnpm test:unit -- --run
```

### Lint

```bash
pnpm lint
```

### Types

```bash
pnpm check:fast
```

### Build

```bash
pnpm build
```

**Si des erreurs** : Corrige-les avant de continuer.

---

## Phase 3 : Push vers Remote

### Verifier si la branche existe sur remote

```bash
git ls-remote --heads origin $(git branch --show-current)
```

### Push avec upstream

```bash
git push -u origin $(git branch --show-current)
```

---

## Phase 4 : Creer la PR

### Template de PR

```bash
gh pr create --title "[TYPE]: Description courte" --body "$(cat <<'EOF'
## Summary

Brief description of what this PR does.

## Changes

- Change 1
- Change 2
- Change 3

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing

- [ ] Unit tests pass (`pnpm test:unit -- --run`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Type check passes (`pnpm check:fast`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Manual testing completed

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No console.log left in code
- [ ] No `any` types used

## Related Issues

Closes #XXX

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 5 : Verification

### Voir la PR creee

```bash
gh pr view --web
```

### Ou afficher les details

```bash
gh pr view
```

---

## Exemples de Titres

| Type | Exemple |
|------|---------|
| Feature | `feat(rewards): add achievement badges system` |
| Fix | `fix(auth): resolve session timeout issue` |
| Docs | `docs(api): add endpoint documentation` |
| Refactor | `refactor(components): migrate to Svelte 5 runes` |
| Chore | `chore(deps): update dependencies` |

---

## Options Utiles

### PR vers une branche specifique

```bash
gh pr create --base develop --title "..." --body "..."
```

### PR en draft

```bash
gh pr create --draft --title "..." --body "..."
```

### Assigner des reviewers

```bash
gh pr create --reviewer @username --title "..." --body "..."
```

### Ajouter des labels

```bash
gh pr create --label "enhancement" --label "priority:high" --title "..." --body "..."
```

---

## Regles

1. **TOUJOURS** verifier les tests avant de creer la PR
2. **TOUJOURS** un titre descriptif avec type
3. **TOUJOURS** une description claire des changements
4. **JAMAIS** de PR avec des tests qui echouent
5. Mentionner les issues liees
