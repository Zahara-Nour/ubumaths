# Getting Started

Guide de démarrage pour développer sur UbuMaths.

---

## 📋 Prérequis

- **Node.js** : v18+ (recommandé: v20)
- **pnpm** : v8+ (gestionnaire de paquets)
- **Docker** : Pour Supabase local (optionnel, requis pour tests triggers)
- **Git** : Pour version control

---

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/your-org/ubumaths.git
cd ubumaths
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configuration environnement

Créer `.env.local` à la racine :

```bash
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (for AI chatbot)
OPENAI_API_KEY=your_openai_key

# Environment
NODE_ENV=development
```

**Important** : Ne JAMAIS committer `.env.local` !

---

## 💻 Développement

### Démarrer le serveur dev

```bash
# Port Claude (5175) - TOUJOURS utiliser ce port pour Claude Code
pnpm dev -- --port 5175

# Ou port par défaut (5173) - pour développement manuel
pnpm dev
```

### Commandes essentielles

```bash
# Quality checks
pnpm check                 # TypeScript + Svelte type checking
pnpm lint                  # ESLint (cached, fast)
pnpm format                # Prettier formatting

# Tests
pnpm test:unit             # Run unit tests (Vitest)
pnpm test:triggers         # Run database trigger tests (Docker required)

# Database
pnpm db:start              # Start Supabase local (Docker)
pnpm db:stop               # Stop Supabase local
pnpm db:migrate            # Push migrations to Supabase
```

---

## 🗃️ Base de données locale

### Option 1 : Supabase Cloud (recommandé pour démarrage rapide)

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier les clés dans `.env.local`
3. Push les migrations : `pnpm db:migrate`

### Option 2 : Supabase Local (Docker)

```bash
# Start local Supabase
pnpm db:start

# Les credentials apparaissent dans la console
# Mettre à jour .env.local avec les URLs/keys locales

# Push migrations
pnpm db:migrate

# Stop when done
pnpm db:stop
```

**Port local** : http://localhost:54321

---

## 🏗️ Structure du projet

```
ubumaths/
├── src/
│   ├── lib/
│   │   ├── components/     # Composants réutilisables
│   │   ├── server/         # Server-only code
│   │   ├── stores/         # Svelte stores
│   │   ├── utils/          # Utilities
│   │   └── types/          # TypeScript types
│   ├── routes/
│   │   ├── (public)/       # Public routes
│   │   ├── (protected)/    # Protected routes
│   │   └── api/            # API endpoints
│   └── app.html
├── supabase/
│   └── migrations/         # Database migrations
├── tests/                  # Unit tests
├── docs/                   # Documentation
└── static/                 # Static assets
```

**Voir** : [Architecture](../architecture/project-structure.md) pour détails complets

---

## 🎯 Premiers pas

### 1. Lancer l'application

```bash
pnpm dev -- --port 5175
```

Ouvrir http://localhost:5175

### 2. Créer un compte

- Aller sur `/signup`
- Créer un compte enseignant
- Confirmer l'email (check Supabase dashboard si local)

### 3. Explorer les features

- Dashboard enseignant : `/dashboard/teacher`
- Créer une classe
- Ajouter des élèves
- Créer des questions
- Créer une évaluation

---

## 📖 Documentation essentielle

### Pour Claude Code

- **[CLAUDE.md](../../CLAUDE.md)** - Quick start + règles essentielles
- **[docs/claude/](../claude/)** - Documentation détaillée
  - [Quality Standards](../claude/quality-standards.md) ⭐⭐⭐ (Zod validation!)
  - [Best Practices](../claude/best-practices.md) (Svelte 5, TypeScript)
  - [UI Components](../claude/ui-components.md) (MySelect!)

### Pour développeurs

- **[Architecture](../architecture/README.md)** - Vue d'ensemble technique
- **[Features](../features/)** - Documentation par feature
- **[Development](../development/)** - Git workflow, migrations, tests
- **[Contributing](../contributing/)** - Guide de contribution

---

## ⚠️ Points d'attention

### 🚨 CRITICAL Rules

1. **Input Validation** : ALL user input MUST be validated with Zod
   - Voir [Quality Standards - Zod Validation](../claude/quality-standards.md#input-validation-with-zod)

2. **MySelect Component** : ALWAYS use MySelect for dropdowns
   - NEVER use Shadcn Select or native `<select>`
   - Voir [UI Components - MySelect](../claude/ui-components.md#myselect-component)

3. **Svelte 5 Runes** : Use modern runes, not Svelte 4 syntax
   - `$state`, `$derived`, `$effect`, `$props`
   - Voir [Best Practices - Svelte 5](../claude/best-practices.md#svelte-5-runes)

4. **TypeScript** : NEVER use `any` type
   - `@typescript-eslint/no-explicit-any` enforced
   - Voir [Best Practices - TypeScript](../claude/best-practices.md#typescript-best-practices)

---

## 🛠️ Troubleshooting

### Build fails

```bash
# Clear cache and reinstall
rm -rf node_modules .svelte-kit
pnpm install
```

### Type errors

```bash
# Regenerate database types
pnpm db:types
```

### Tests fail

```bash
# Make sure database is running
pnpm db:start

# Run tests
pnpm test:unit
```

**Plus d'aide** : [Troubleshooting Guide](../troubleshooting/README.md)

---

## 🚦 Pre-commit Hook

Un pre-commit hook automatique s'exécute sur `git commit` :

- Lint & format fichiers staged (~1-2s)
- Auto-fix issues quand possible
- **Bloque le commit** si erreurs persistent

**Désactiver temporairement** :

```bash
git commit --no-verify
```

**Note** : Ne désactiver que pour testing, jamais en production !

---

## 📚 Prochaines étapes

1. **Explorer le code** : Commencer par `src/routes/(protected)/dashboard/`
2. **Lire la doc** : [Architecture](../architecture/README.md) et [Features](../features/)
3. **Faire un petit changement** : Modifier un composant UI simple
4. **Écrire un test** : Ajouter un test unitaire
5. **Créer une PR** : Suivre [Git Workflow](../development/git-workflow.md)

---

**Questions?** Consulter la [documentation complète](../README.md) ou contacter l'équipe.

**Navigation** : [← Back to Main Docs](../README.md)
