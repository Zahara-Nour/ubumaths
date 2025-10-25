# 🛠️ Development

Process de développement et standards pour contribuer à UbuMaths.

---

## Documents

### [Git workflow](git-workflow.md)

Workflow Git, branches, commits conventionnels, pull requests.

### [Gestion de versions](version-management.md)

Système de versioning automatique, releases, changelog, tags.

### [Migrations base de données](database-migrations.md)

Workflow migrations Supabase, naming conventions, rollback.

### [Style de code](code-style.md)

Standards de code, conventions de nommage, patterns recommandés.

### [Migration Svelte 5](svelte5-migration.md)

Guide de migration vers Svelte 5, runes, deprecations résolues.

### [Debug Tools](debug-tools.md)

Outils de débogage et développement dans l'interface admin.

---

## Quick Start Development

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd ubumaths

# Installer dépendances
pnpm install

# Configurer environnement
cp .env.example .env
# Éditer .env avec vos valeurs Supabase

# Démarrer dev server
pnpm dev -- --port 5175  # Port Claude
```

### Avant de commiter

```bash
# Formater le code
pnpm format

# Vérifier types
pnpm check

# Lancer tests
pnpm test:unit
```

### Créer un commit

```bash
# Format: <type>: <subject>
# Types: feat, fix, docs, style, refactor, test, chore

git add .
git commit -m "feat: ajouter système de notifications"
```

### Créer une release (main branch seulement)

```bash
# Le système détecte automatiquement le type de version
# basé sur les commits conventionnels
pnpm release

# Push tags
git push --follow-tags origin main
```

---

## Standards de qualité

### Code Quality

- ✅ Prettier passing (format)
- ✅ Build succeeds (no errors)
- ⚠️ ~280 ESLint warnings (non-blocking, complex types)

### Testing

- Unit tests (Vitest) : Client + Server
- E2E tests (Playwright) : Full flows
- Coverage : Priorité sur logique métier

### Performance

- Dev server : ~1.7s startup
- Build : Code splitting par route
- Conditional loading : Assets on-demand

---

[← Retour à l'index principal](../README.md)
