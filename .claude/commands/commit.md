---
description: Preparer un commit structure avec message conventionnel
allowed-tools: Bash(git:*)
---

# Commit

Tu prepares un commit structure en suivant les conventions du projet.

## Phase 1 : Analyser les Changements

### Status actuel

```bash
git status
```

### Changements detailles

```bash
git diff --staged
```

Si rien n'est stage :

```bash
git diff
```

### Historique recent (pour suivre le style)

```bash
git log --oneline -10
```

---

## Phase 2 : Stager les Fichiers

### Option A : Tout stager

```bash
git add -A
```

### Option B : Selection specifique

```bash
git add [fichiers specifiques]
```

### Verification

```bash
git status
```

---

## Phase 3 : Message de Commit

### Format Conventional Commits

```
type(scope): description courte (< 50 caracteres)

[Corps optionnel - description detaillee]

[Footer optionnel - references, breaking changes]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types disponibles

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalite |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement |
| `style` | Formatage (pas de changement logique) |
| `refactor` | Refactoring (pas de nouvelle feature ni fix) |
| `perf` | Amelioration performance |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance, dependances, config |
| `ci` | Configuration CI/CD |

### Scopes courants (UbuMaths)

- `auth` : Authentification
- `api` : Endpoints API
- `db` : Database/migrations
- `ui` : Interface utilisateur
- `components` : Composants reutilisables
- `tests` : Tests
- `docs` : Documentation
- `shop` : Systeme de boutique
- `rewards` : Systeme de recompenses
- `classroom` : Google Classroom
- `chat` : Messagerie

---

## Phase 4 : Creer le Commit

### Commande

```bash
git commit -m "$(cat <<'EOF'
type(scope): description courte

Description detaillee si necessaire.
- Point 1
- Point 2

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 : Verification

```bash
git status
git log -1
```

---

## Exemples

### Feature simple

```bash
git commit -m "$(cat <<'EOF'
feat(rewards): add daily login bonus

Users now receive 10 coins for their first login each day.
Bonus resets at midnight UTC.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Bug fix

```bash
git commit -m "$(cat <<'EOF'
fix(auth): resolve session expiration loop

Problem: Users were stuck in redirect loop when session expired.
Solution: Added proper session refresh before redirect.

Closes #123

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Refactoring

```bash
git commit -m "$(cat <<'EOF'
refactor(components): migrate Button to Svelte 5 runes

- Replace export let with $props()
- Replace $: with $derived()
- Update event handlers to lowercase

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Regles

1. **Description courte** : < 50 caracteres, imperatif ("add" pas "added")
2. **Scope** : Toujours inclure si applicable
3. **Corps** : Expliquer le "pourquoi", pas le "quoi"
4. **References** : Inclure numeros d'issues si applicable
5. **Pas de secrets** : Verifier qu'aucun fichier sensible n'est commite
