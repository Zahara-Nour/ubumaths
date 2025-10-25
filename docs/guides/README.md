# 📖 Guides pratiques

Guides pratiques pour utiliser et déployer UbuMaths.

---

## Guides disponibles

### [Import d'élèves](student-import.md)

Workflow complet d'import CSV des élèves, cas particuliers, troubleshooting.

### [Déploiement](deployment.md)

Déploiement sur Vercel, configuration environnement, CI/CD.

### [Dépannage](troubleshooting.md)

Solutions aux problèmes courants, debugging, logs.

### [Guide de tests](testing-guide.md)

Comment tester l'application, structure des tests, commandes.

### [Composants UI](ui-components.md)

Utilisation de Shadcn-svelte, composants disponibles, patterns.

---

## Quick Reference

### Commandes essentielles

```bash
# Développement
pnpm dev              # Démarre le serveur dev (port 5173)
pnpm build            # Build production
pnpm check            # Type checking
pnpm lint             # Vérification format/lint
pnpm format           # Formatage code

# Tests
pnpm test:unit        # Tests unitaires (Vitest)
pnpm test:e2e         # Tests E2E (Playwright)

# Base de données
pnpm db:migrate       # Push migrations vers Supabase
pnpm db:status        # Vérifier statut migrations

# Release
pnpm release          # Créer une release (main branch seulement)
```

### Ports de développement

- **5173** : Port utilisateur (ne pas utiliser pour Claude)
- **5175** : Port Claude (toujours utiliser : `pnpm dev -- --port 5175`)

---

[← Retour à l'index principal](../README.md)
