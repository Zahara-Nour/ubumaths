# 📝 Guide de documentation

Guide complet pour écrire et organiser la documentation d'UbuMaths.

---

## 🤖 Documentation Claude Code (Nouveau 2025-10-31)

### Structure en deux niveaux

**CLAUDE.md (racine)** - Quick-start condensé (~300 lignes)

- Commandes essentielles (dev, test, lint)
- 4 règles critiques (Zod, MySelect, Svelte 5, no `any`)
- Liens vers docs détaillées
- Pre-commit checklist

**docs/claude/** - Documentation détaillée (~1,200 lignes)

- `README.md` - Index navigation
- `architecture.md` - Structure, routing, data fetching, performance
- `best-practices.md` - Svelte 5, TypeScript, anti-patterns
- `ui-components.md` - Shadcn, MySelect, Tailwind
- `database.md` - Supabase, migrations
- `quality-standards.md` ⭐ - Tests, linting, **Zod validation complète**

### Quand modifier quoi ?

| Type de modification          | Fichier à modifier                       |
| ----------------------------- | ---------------------------------------- |
| Nouvelle commande essentielle | `CLAUDE.md`                              |
| Changement règle critique     | `CLAUDE.md` + fichier détaillé approprié |
| Détails d'implémentation      | Fichier dans `docs/claude/`              |
| Nouveaux patterns TypeScript  | `docs/claude/best-practices.md`          |
| Nouveaux patterns Svelte 5    | `docs/claude/best-practices.md`          |
| Standards de tests/linting    | `docs/claude/quality-standards.md`       |
| Ajout composant UI            | `docs/claude/ui-components.md`           |
| Migration database            | `docs/claude/database.md`                |
| Architecture routing/perf     | `docs/claude/architecture.md`            |

### Guidelines pour agents documentation-writer

Quand un agent crée/modifie de la documentation pour Claude Code :

**✅ DO:**

- Toujours lire `CLAUDE.md` et `docs/claude/README.md` en premier
- Suivre la structure existante dans `docs/claude/`
- Mettre à jour **à la fois** `CLAUDE.md` (résumé) ET fichier détaillé approprié
- Utiliser les liens relatifs vers `docs/claude/`
- Inclure lien de navigation en bas : `[← Back to Claude Docs](./README.md)`

**❌ DON'T:**

- Ne PAS créer de nouveaux fichiers dans `docs/claude/` sans justification
- Ne PAS dupliquer l'info entre `CLAUDE.md` et `docs/claude/`
- Ne PAS mettre de détails d'implémentation dans `CLAUDE.md` (max 300 lignes)
- Ne PAS créer de fichiers temporaires dans `docs/claude/`

### Exemple : Ajouter un nouveau composant UI

```bash
# 1. Ajouter résumé dans CLAUDE.md (section "Essential Rules")
# 2. Ajouter détails complets dans docs/claude/ui-components.md
# 3. Mettre à jour docs/claude/README.md (Quick Links)
# 4. Tester les liens
```

---

## 🎯 Principes fondamentaux

### 1. Un feature = un dossier

Chaque fonctionnalité a son propre dossier dans `/docs/features/` :

```
/docs/features/nom-feature/
├── README.md           # Vue d'ensemble + quick start (OBLIGATOIRE)
├── architecture.md     # Architecture technique
├── user-guide.md       # Guide utilisateur
├── api.md             # Documentation API (si applicable)
└── testing.md         # Tests et validation (si applicable)
```

### 2. README.md obligatoire

Chaque dossier de feature DOIT contenir un `README.md` avec :

- **Overview** : Qu'est-ce que c'est ? À quoi ça sert ?
- **Status** : ✅ Complete | 🔄 In Progress | 📝 Planned
- **Quick Start** : Comment l'utiliser en 5 min ?
- **Architecture** : Comment ça marche ? (ou lien vers architecture.md)
- **Roadmap** : Prochaines étapes et améliorations futures
- **Links** : Liens vers documentation détaillée

### 3. Pas de redondance

**❌ MAUVAIS** :

```
/docs/features/questions/
├── overview.md          # Contient intro
├── introduction.md      # Contient aussi intro (doublon)
├── getting-started.md   # Contient aussi intro (triplon)
```

**✅ BON** :

```
/docs/features/questions/
├── README.md           # Contient intro + quick start
├── architecture.md     # Détails techniques
├── api.md             # Documentation API
```

**Règle** : Chaque information existe à UN SEUL endroit. Les autres docs y font référence via liens.

### 4. Status visible

Indiquer clairement le statut d'implémentation :

```markdown
# Feature Name

**Status** : ✅ Production
**Last Updated** : 2025-10-24
**Version** : 2.1.0
```

Statuts possibles :

- ✅ **Production** : Feature complète et déployée
- 🔄 **In Progress** : Développement en cours
- 📝 **Planned** : Planifié mais pas commencé
- 🚧 **Beta** : En test, pas encore stable
- 🗄️ **Archived** : Obsolète, voir `/docs/archive/`

---

## 📐 Structure d'un document

### Template README.md (feature)

```markdown
# 🎯 Feature Name

Brief description (1-2 phrases).

**Status** : ✅ Production
**Version** : 1.0.0
**Last Updated** : 2025-10-24

---

## 🚀 Quick Start

Minimal example to get started in 5 minutes:

\`\`\`typescript
// Code example
\`\`\`

---

## 📖 Overview

What is this feature? Why does it exist? What problems does it solve?

### Key Concepts

- **Concept 1** : Explication
- **Concept 2** : Explication

---

## 🏗️ Architecture

High-level architecture overview. For details, see [architecture.md](architecture.md).

\`\`\`
Component A → Component B → Database
\`\`\`

---

## 📚 Documentation

- [Architecture technique](architecture.md)
- [Guide utilisateur](user-guide.md)
- [Documentation API](api.md)
- [Tests](testing.md)

---

## 🗺️ Roadmap

### Implemented ✅

- Feature X
- Feature Y

### In Progress 🔄

- Feature Z

### Planned 📝

- Feature W
- Feature V

---

## 🔗 Related

- [Related Feature 1](../<feature-name>/README.md) (exemple)
- [Related Architecture](../../architecture/database-schema.md)

---

[← Retour aux features](../README.md)
```

### Template document détaillé

```markdown
# Feature Name - Aspect spécifique

Detailed documentation about a specific aspect of the feature.

---

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Examples](#examples)

---

## Section 1

Detailed explanation...

### Subsection 1.1

...

## Section 2

...

---

## Examples

### Example 1: Basic Usage

\`\`\`typescript
// Code example with comments
const example = createExample({
// Explain each parameter
param1: 'value',
param2: 42
});
\`\`\`

### Example 2: Advanced Usage

...

---

## Best Practices

✅ **DO**:

- Good practice 1
- Good practice 2

❌ **DON'T**:

- Bad practice 1
- Bad practice 2

---

## Troubleshooting

### Problem 1

**Symptom** : Description
**Cause** : Explanation
**Solution** : Fix

---

[← Retour au README](README.md)
```

---

## ✏️ Conventions de nommage

### Fichiers

- **Format** : `kebab-case.md`
- **README** : `README.md` (uppercase)
- **Pas de dates** : `feature-guide.md` ✅, `feature-guide-2025-10-24.md` ❌
- **Pas de suffixes** : `implementation.md` ✅, `implementation-v2-final-complete.md` ❌

### Dossiers

- **Format** : `kebab-case`
- **Pas de pluriel** : `feature/` ✅, `features/` ❌ (sauf pour `/docs/features/`)

### Titres de documents

- **Format** : `# Title Case With Emoji`
- **Exemples** :
  - `# 📝 Question Bank System`
  - `# 🏗️ Architecture Overview`
  - `# 🚀 Quick Start Guide`

---

## 🎨 Style et formatting

### Emojis

Utiliser des emojis pour la navigation visuelle rapide :

| Catégorie       | Emoji       | Usage                 |
| --------------- | ----------- | --------------------- |
| Feature/Product | 🎯 📝 🗂️ 🧩 | En-têtes de features  |
| Architecture    | 🏗️ 🔧 ⚙️    | Docs techniques       |
| Guide           | 📖 📚 🚀    | Guides et tutoriels   |
| Status          | ✅ 🔄 📝 🚧 | Indicateurs de statut |
| Warning         | ⚠️ ❌ ✋    | Avertissements        |

**Important** : Pas d'abus - 1 emoji par titre maximum.

### Code blocks

Toujours spécifier le langage :

```markdown
\`\`\`typescript
// ✅ BON : Langage spécifié
const example = 'code';
\`\`\`

\`\`\`
// ❌ MAUVAIS : Pas de langage
const example = 'code';
\`\`\`
```

### Liens

- **Liens relatifs** : `[Doc](../other/doc.md)` ✅
- **Liens absolus** : `[Doc](/docs/other/doc.md)` ❌
- **Liens externes** : `[Svelte](https://svelte.dev/)` ✅

### Tables

Utiliser des tables pour info structurée :

```markdown
| Command      | Description          |
| ------------ | -------------------- |
| `pnpm dev`   | Start dev server     |
| `pnpm build` | Build for production |
```

---

## 🔄 Quand créer/modifier la documentation ?

### Créer une nouvelle doc

✅ **Créer quand** :

- Nouveau feature majeur
- Architecture complexe qui mérite explication
- Guide utilisateur nécessaire (teacher/student/admin)
- API publique ou workflow important

❌ **Ne PAS créer pour** :

- Bug fix simple (→ git commit message suffit)
- Session de debug temporaire (→ notes locales)
- Changement mineur de code
- Expérimentation/prototype

### Modifier la doc existante

✅ **Mettre à jour quand** :

- Feature évolue significativement
- Bug critique corrigé
- API change
- Workflow modifié

❌ **Ne PAS polluer avec** :

- Changements cosmétiques
- Typos mineures répétées (grouper les fixes)
- Notes de debug temporaires

---

## 📦 Archivage

### Quand archiver ?

Archiver dans `/docs/archive/` quand :

1. **Feature obsolète** : Remplacée par nouvelle version
2. **Doc temporaire** : Session de debug, notes de dev
3. **Version ancienne** : Migration complète vers v2

### Comment archiver ?

```bash
# Déplacer vers archive (préserver git history)
git mv docs/features/old-feature/old-doc.md \
       docs/archive/deprecated/old-doc.md

# Ou pour sessions temporaires
git mv QUESTION_DISPLAY_DEBUG_FIXES.md \
       docs/archive/sessions/question-display-debug-fixes.md
```

### Durée de conservation

- **6 mois** : Sessions de debug, notes temporaires
- **12 mois** : Features obsolètes
- **Indéfini** : Migrations importantes (référence historique)

---

## 🗂️ Organisation par thème

Documentation organisée par **feature** ET par **thème** :

### Par feature (principal)

```
/docs/features/
├── questions/       # Tout sur le système de questions
├── assessments/     # Tout sur les évaluations
└── srs-flashcards/  # Tout sur SRS + flashcards
```

### Par thème (transversal)

```
/docs/architecture/  # Architecture générale
/docs/guides/        # Guides pratiques
/docs/development/   # Process de dev
```

**Règle** : Si la doc est spécifique à une feature → `/features/`. Si transversale → thème approprié.

---

## ✅ Checklist avant commit

Avant de commiter de la documentation :

- [ ] README.md créé si nouveau dossier
- [ ] Status clairement indiqué (✅/🔄/📝)
- [ ] Pas de redondance avec docs existantes
- [ ] Liens internes vérifiés (relatifs)
- [ ] Code examples testés
- [ ] Nommage kebab-case
- [ ] Emojis appropriés (pas d'abus)
- [ ] TOC si doc > 200 lignes
- [ ] Liens "retour" en bas de page

---

## 📊 Exemples

### ✅ Bonne organisation

```
/docs/features/questions/
├── README.md              # Overview + quick start + roadmap
├── architecture.md        # Architecture technique complète
├── variable-system.md     # Détails sur un aspect spécifique
├── syntax-guide.md        # Guide de syntaxe
└── api.md                # Documentation API

Pourquoi c'est bon :
- Un README clair qui résume tout
- Docs séparées par aspect logique
- Pas de redondance
- Nommage cohérent
```

### ❌ Mauvaise organisation

```
/docs/features/questions/
├── intro.md
├── introduction.md
├── overview.md
├── getting_started.md
├── quick-start.md
├── QUESTIONS_IMPLEMENTATION_COMPLETE.md
├── QUESTIONS_FINAL_SUMMARY.md
├── QUESTIONS_SESSION_SUMMARY.md
├── QUESTIONS_DEBUG_FIXES.md

Problèmes :
- Redondance massive (3 intros !)
- Nommage incohérent (snake_case, dates, suffixes)
- Fichiers temporaires non archivés
- Pas de README principal
```

---

## 🔗 Ressources

- [Master index](/docs/README.md)
- [Features documentation](/docs/features/README.md)
- [Architecture](/docs/architecture/README.md)
- [Process de développement](/docs/development/README.md)

---

**Ce guide est vivant** : Proposer des améliorations via PR !

[← Retour au guide de contribution](README.md)
