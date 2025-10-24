# ✅ Code Review Checklist

Checklist complète pour reviewer une pull request.

---

## 🎯 Vue d'ensemble

Avant de commencer le review détaillé :

- [ ] Le titre de la PR est clair et descriptif
- [ ] La description explique le "pourquoi" pas juste le "quoi"
- [ ] Les changements sont atomiques (une feature/fix par PR)
- [ ] La PR est de taille raisonnable (< 500 lignes idéalement)
- [ ] Les tests automatiques passent (CI/CD)

---

## 📝 Code Quality

### TypeScript

- [ ] Pas d'erreurs TypeScript (`pnpm check` passe)
- [ ] Types explicites (pas de `any` sauf justifié)
- [ ] Interfaces/types partagés définis dans `src/lib/types/`
- [ ] Enums utilisés pour valeurs constantes

### Style et formatage

- [ ] Code formaté avec Prettier (`pnpm format`)
- [ ] Pas de warnings ESLint critiques
- [ ] Conventions de nommage respectées (camelCase, PascalCase, kebab-case)
- [ ] Pas de code commenté/dead code

### Qualité générale

- [ ] Early returns utilisés pour réduire complexité
- [ ] Fonctions < 50 lignes (sinon décomposer)
- [ ] Noms descriptifs (variables, fonctions, composants)
- [ ] Pas de console.log oubliés
- [ ] Commentaires uniquement pour logique complexe

---

## 🎭 Svelte 5 Patterns

### Runes (Svelte 5)

- [ ] `$state()` utilisé (pas `let` pour state réactif)
- [ ] `$derived()` utilisé (pas `$:`)
- [ ] `$effect()` utilisé (pas `$:` pour side effects)
- [ ] `$props()` utilisé (pas `export let`)

### Components

- [ ] Props typées correctement
- [ ] Event handlers préfixés avec "handle"
- [ ] Lowercase events (`onclick`, pas `on:click`)
- [ ] Pas de mutation directe des props

### Performances

- [ ] Pas de logique lourde dans template
- [ ] `$derived` utilisé pour calculs complexes
- [ ] Éviter re-renders inutiles

---

## 🗄️ Base de données

### Migrations

- [ ] Fichier dans `supabase/migrations/` avec timestamp
- [ ] Nom descriptif : `<timestamp>_<description>.sql`
- [ ] Migration testée localement (`pnpm db:migrate`)
- [ ] RLS policies ajoutées/mises à jour
- [ ] Indexes créés pour colonnes filtrées/joinées

### Queries

- [ ] Queries optimisées (pas de N+1)
- [ ] Indexes utilisés correctement
- [ ] `.select()` spécifie colonnes nécessaires (pas `*` sauf justifié)
- [ ] Error handling approprié

### RLS

- [ ] Policies créées pour toutes opérations (SELECT, INSERT, UPDATE, DELETE)
- [ ] Users peuvent uniquement accéder leurs données
- [ ] Admins ont accès approprié
- [ ] Policies testées avec différents rôles

---

## 🔒 Sécurité

### Authentication

- [ ] Routes protégées avec `requireAuth()`
- [ ] Vérification user dans actions serveur
- [ ] Pas de données sensibles en logs

### Données

- [ ] Input validation côté serveur
- [ ] Sanitization des inputs utilisateur
- [ ] Pas de SQL injection possible
- [ ] Pas de XSS possible

### API

- [ ] Rate limiting si nécessaire
- [ ] CORS configuré correctement
- [ ] Pas de clés API hardcodées

---

## 🧪 Tests

### Coverage

- [ ] Tests unitaires pour logique métier
- [ ] Tests pour edge cases
- [ ] Tests passent tous (`pnpm test:unit`)

### Qualité des tests

- [ ] Tests clairs et descriptifs
- [ ] Un concept par test
- [ ] Pas de tests fragiles (timing, order-dependent)
- [ ] Mocks appropriés pour services externes

---

## 🎨 UI/UX

### Design

- [ ] Composants Shadcn-svelte utilisés (cohérence)
- [ ] Responsive design testé (mobile, tablet, desktop)
- [ ] Dark mode fonctionne correctement
- [ ] Font scaling respecté

### Accessibilité

- [ ] HTML sémantique
- [ ] Labels pour inputs
- [ ] ARIA attributes si nécessaire
- [ ] Keyboard navigation fonctionne

### Feedback utilisateur

- [ ] Loading states implémentés
- [ ] Error messages clairs
- [ ] Toast notifications pour actions importantes
- [ ] Confirmation pour actions destructives

---

## 📚 Documentation

### Code

- [ ] Fonctions complexes commentées
- [ ] README mis à jour si nécessaire
- [ ] Types documentés avec JSDoc si complexe

### Feature

- [ ] Documentation dans `/docs/features/` si nouvelle feature
- [ ] README.md créé avec overview + roadmap
- [ ] Architecture documentée si complexe
- [ ] `docs/README.md` mis à jour

---

## ⚡ Performance

### Frontend

- [ ] Pas de bundling inutile
- [ ] Images optimisées (format, taille)
- [ ] Lazy loading si approprié
- [ ] Debouncing pour inputs fréquents

### Backend

- [ ] Queries optimisées (indexes, select minimal)
- [ ] Caching si approprié
- [ ] Pas de N+1 queries

---

## 🔄 Workflow

### Git

- [ ] Commits atomic et descriptifs
- [ ] Commit messages suivent convention (`feat:`, `fix:`, etc.)
- [ ] Pas de merge conflicts
- [ ] Branche à jour avec `main`

### Déploiement

- [ ] Pas de breaking changes non documentés
- [ ] Variables d'environnement documentées si ajoutées
- [ ] Migration DB peut être rollback si nécessaire

---

## 💡 Questions à poser

### Logique

- [ ] Y a-t-il une façon plus simple ?
- [ ] Les edge cases sont gérés ?
- [ ] Le code est maintenable ?

### Architecture

- [ ] Le code est au bon endroit ?
- [ ] Les abstractions sont appropriées ?
- [ ] Le code est réutilisable ?

### Alternatives

- [ ] Y a-t-il une meilleure approche ?
- [ ] Peut-on utiliser un outil existant ?
- [ ] La complexité est justifiée ?

---

## ✅ Approval Criteria

Approuver la PR seulement si :

- [ ] Toutes les sections critiques sont ✅
- [ ] Les tests passent
- [ ] La documentation est à jour
- [ ] Le code est lisible et maintenable
- [ ] Pas de régression introduite
- [ ] Les performances sont acceptables

---

## 💬 Feedback

### Comment donner du feedback

**✅ BON** : Constructif, spécifique, propose solution

> "Cette fonction fait 150 lignes et gère plusieurs responsabilités. Considère la décomposer en `validateInput()`, `processData()`, et `saveResult()` pour améliorer la lisibilité."

**❌ MAUVAIS** : Vague, critique sans aide

> "Cette fonction est trop longue."

### Niveaux de feedback

- **🚨 Blocker** : Doit être corrigé avant merge (bug, sécurité, breaking)
- **⚠️ Important** : Devrait être corrigé (best practices, maintenabilité)
- **💡 Suggestion** : Nice-to-have (optimisation mineure, style)
- **❓ Question** : Demande clarification

---

## 📋 Checklist finale

Avant d'approuver :

- [ ] Tous les blockers résolus
- [ ] Code compilé et testé localement
- [ ] Documentation à jour
- [ ] Pas de console.log/debug code
- [ ] PR prête à être mergée dans `main`

---

[← Retour au guide de contribution](README.md)
