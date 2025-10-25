# 🏗️ Structure du projet

Organisation des fichiers et dossiers d'UbuMaths.

---

## 📂 Vue d'ensemble

```
ubumaths/
├── src/                    # Code source
│   ├── lib/                # Bibliothèque partagée
│   ├── routes/             # Pages et API (SvelteKit)
│   ├── app.html            # Template HTML racine
│   └── app.css             # Styles globaux
├── supabase/               # Base de données
│   └── migrations/         # Migrations SQL
├── static/                 # Assets statiques
├── docs/                   # Documentation
├── e2e/                    # Tests end-to-end
└── scripts/                # Scripts utilitaires
```

---

## 📁 src/lib/

Bibliothèque partagée accessible via `$lib` alias.

### Structure

```
src/lib/
├── components/             # Composants réutilisables
│   ├── ui/                 # Composants UI (Shadcn-svelte)
│   ├── rich-text/          # Éditeur rich text
│   └── [feature]/          # Composants par feature
├── server/                 # Code serveur uniquement
│   ├── auth.ts             # Authentification
│   └── [utils]/            # Utilitaires serveur
├── stores/                 # Stores Svelte
│   ├── theme.svelte.ts     # Dark mode
│   └── toaster.svelte.ts   # Notifications
├── utils/                  # Utilitaires partagés
│   ├── questions/          # Logique questions
│   ├── srs/                # Algorithme SRS
│   └── [feature]/          # Utils par feature
└── types/                  # Types TypeScript
    ├── database.ts         # Types Supabase
    └── [feature].ts        # Types par feature
```

### components/

**Composants réutilisables organisés par feature.**

```
components/
├── ui/                     # Shadcn-svelte components
│   ├── button/
│   ├── input/
│   ├── card/
│   └── ...
├── rich-text/              # Rich text editor
│   ├── FormRichTextEditor.svelte
│   └── RichTextDisplay.svelte
├── questions/              # Question bank components
│   ├── QuestionCard.svelte
│   ├── QuestionDisplay.svelte
│   └── QuestionForm.svelte
├── srs/                    # SRS flashcards components
│   ├── FlashcardStudy.svelte
│   └── DeckManager.svelte
└── Sidebar.svelte          # Layout components
```

### server/

**Code qui s'exécute uniquement côté serveur.**

⚠️ **Important** : Ne jamais importer dans code client.

```
server/
├── auth.ts                 # requireAuth(), helpers
├── supabase.ts             # Supabase admin client
└── utils/                  # Server-only utilities
```

### stores/

**State management global avec Svelte stores.**

```
stores/
├── theme.svelte.ts         # Dark mode toggle
├── fontSize.svelte.ts      # Font scaling
└── toaster.svelte.ts       # Toast notifications
```

Usage :

```typescript
import { theme } from '$lib/stores/theme.svelte';
theme.toggle();
```

### utils/

**Fonctions utilitaires partagées client/serveur.**

```
utils/
├── questions/              # Question bank logic
│   ├── generator/          # Question generation
│   ├── parser/             # LaTeX parsing
│   └── validators/         # Validation logic
├── srs/                    # Spaced repetition
│   ├── fsrs.ts             # FSRS algorithm
│   └── scheduler.ts        # Review scheduling
├── cn.ts                   # Tailwind class merger
└── date.ts                 # Date formatting
```

### types/

**Définitions TypeScript.**

```
types/
├── database.ts             # Generated from Supabase
├── question.ts             # Question types
├── assessment.ts           # Assessment types
└── srs.ts                  # SRS types
```

---

## 🛣️ src/routes/

Structure SvelteKit avec file-based routing.

### Structure

```
routes/
├── (public)/               # Routes publiques (non-auth)
│   ├── +layout.svelte      # Layout public
│   ├── demo/               # Pages demo
│   └── games/              # Jeux publics
├── (protected)/            # Routes protégées (auth required)
│   ├── +layout.server.ts   # Auth check
│   ├── +layout.svelte      # Layout protected
│   └── dashboard/          # Dashboard routes
│       ├── +page.svelte    # Dashboard home
│       ├── teacher/        # Teacher routes
│       ├── student/        # Student routes
│       └── admin/          # Admin routes
├── api/                    # API endpoints
│   ├── questions/          # Questions API
│   ├── assessments/        # Assessments API
│   └── [feature]/          # API par feature
├── auth/                   # Auth routes (login, callback)
├── +layout.svelte          # Root layout
└── +page.svelte            # Home page
```

### Route groups

**`(public)` - Routes publiques**

Accessible sans authentification.

```
(public)/
├── +layout.svelte          # Layout sans auth
├── demo/                   # Pages démo
│   ├── +page.svelte
│   └── vip-cards-demo/
└── games/
    ├── mathemo/
    └── wheel/
```

**`(protected)` - Routes protégées**

Nécessite authentification (@voltairedoha.com).

```
(protected)/
├── +layout.server.ts       # Vérifie auth
├── +layout.svelte          # Layout avec sidebar
└── dashboard/
    ├── teacher/            # Prof routes
    │   ├── questions/
    │   ├── assessments/
    │   └── rewards/
    ├── student/            # Élève routes
    │   ├── assignments/
    │   └── flashcards/
    └── admin/              # Admin routes
        ├── import-students/
        └── errors/
```

### API routes

**RESTful API endpoints dans `/api/`.**

```
api/
├── questions/
│   ├── templates/
│   │   ├── +server.ts      # GET, POST /api/questions/templates
│   │   └── [id]/
│   │       └── +server.ts  # GET, PUT, DELETE /api/questions/templates/:id
│   └── generate/
│       └── +server.ts      # POST /api/questions/generate
├── assessments/
│   ├── +server.ts          # GET, POST /api/assessments
│   └── [id]/
│       └── +server.ts      # GET, PUT, DELETE /api/assessments/:id
└── srs/
    └── review/
        └── +server.ts      # POST /api/srs/review
```

**Pattern API endpoint** :

```typescript
// +server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data, error: err } = await supabase.from('table').select('*');

	if (err) throw error(500, err.message);

	return json(data);
};
```

---

## 🗄️ supabase/

Base de données et migrations.

```
supabase/
├── migrations/             # Migrations SQL
│   ├── 001_init.sql
│   ├── 002_add_feature.sql
│   └── ...
└── seed.sql                # Données de test (optionnel)
```

### Migrations

**Convention de nommage** : `<timestamp>_<description>.sql`

```sql
-- Example: 080_create_srs_tables.sql

-- Create table
CREATE TABLE srs_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE srs_cards ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users view own cards"
  ON srs_cards FOR SELECT
  USING (auth.uid() = user_id);
```

**Appliquer migrations** : `pnpm db:migrate`

---

## 📦 static/

Assets statiques servis directement.

```
static/
├── fonts/                  # Fonts custom
├── images/                 # Images, icons
├── favicon.png             # Favicon
└── robots.txt              # SEO
```

Accessible via `/` :

```html
<img src="/images/logo.png" alt="Logo" />
```

---

## 📚 docs/

Documentation du projet (voir [documentation-guide.md](../contributing/documentation-guide.md)).

```
docs/
├── README.md               # Master index
├── features/               # Docs par feature
├── architecture/           # Docs architecture
├── guides/                 # Guides pratiques
├── development/            # Process dev
├── contributing/           # Guide contribution
└── archive/                # Docs obsolètes
```

---

## 🧪 Tests

```
e2e/                        # Playwright E2E tests
├── auth.spec.ts
├── questions.spec.ts
└── assessments.spec.ts

src/
├── **/*.test.ts            # Vitest unit tests (server)
└── **/*.svelte.test.ts     # Vitest component tests (browser)
```

---

## 🔧 Configuration

```
ubumaths/
├── .env                    # Variables d'environnement (local)
├── .env.example            # Template .env
├── svelte.config.js        # Config SvelteKit
├── vite.config.ts          # Config Vite
├── tailwind.config.ts      # Config Tailwind
├── tsconfig.json           # Config TypeScript
├── package.json            # Dependencies + scripts
└── pnpm-lock.yaml          # Lock file pnpm
```

---

## 📋 Conventions de nommage

### Files

| Type         | Convention        | Exemple                |
| ------------ | ----------------- | ---------------------- |
| Component    | PascalCase.svelte | `QuestionCard.svelte`  |
| Route page   | +page.svelte      | `+page.svelte`         |
| Route layout | +layout.svelte    | `+layout.svelte`       |
| API endpoint | +server.ts        | `+server.ts`           |
| Utility      | camelCase.ts      | `questionGenerator.ts` |
| Type         | camelCase.ts      | `question.ts`          |
| Test         | \*.test.ts        | `parser.test.ts`       |

### Folders

| Type      | Convention | Exemple              |
| --------- | ---------- | -------------------- |
| Route     | kebab-case | `teacher-dashboard/` |
| Component | kebab-case | `rich-text/`         |
| Feature   | kebab-case | `srs-flashcards/`    |

---

## 🚀 Ajouter une nouvelle feature

### 1. Backend (si nécessaire)

```
src/lib/
├── types/new-feature.ts
├── utils/new-feature/
│   ├── index.ts
│   ├── logic.ts
│   └── logic.test.ts
└── server/new-feature.ts (si server-only)
```

### 2. Database (si nécessaire)

```
supabase/migrations/
└── 0XX_create_new_feature_tables.sql
```

### 3. Components

```
src/lib/components/new-feature/
├── FeatureCard.svelte
├── FeatureForm.svelte
└── FeatureList.svelte
```

### 4. Routes

```
src/routes/
├── api/new-feature/
│   └── +server.ts
└── (protected)/dashboard/new-feature/
    ├── +page.svelte
    ├── +page.server.ts
    └── create/
        ├── +page.svelte
        └── +page.server.ts
```

### 5. Documentation

```
docs/features/new-feature/
├── README.md
├── architecture.md
└── user-guide.md
```

---

## 💡 Tips

### Imports

Utiliser alias `$lib` pour imports depuis `src/lib/` :

```typescript
// ✅ BON
import { Button } from '$lib/components/ui/button';
import type { Question } from '$lib/types/question';

// ❌ MAUVAIS
import { Button } from '../../../lib/components/ui/button';
```

### Server vs Client

```typescript
// ❌ MAUVAIS : Import server dans client
import { supabaseAdmin } from '$lib/server/supabase';

// ✅ BON : Utiliser locals
export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Use locals.supabase (pas $lib/server)
};
```

### Organisation

- **Par feature** : Grouper code lié dans `$lib/[feature]/`
- **DRY** : Extraire logique commune dans `$lib/utils/`
- **Types centralisés** : Un type = un fichier dans `$lib/types/`

---

[← Retour à l'architecture](README.md)
