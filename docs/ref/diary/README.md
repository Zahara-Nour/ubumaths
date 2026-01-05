# Cahier de Texte - Documentation Technique

Documentation technique complete du systeme "Cahier de Texte" (Class Journal) d'UbuMaths.

## Vue d'ensemble

Le cahier de texte est une fonctionnalite permettant aux enseignants de documenter le contenu de chaque seance de cours et d'assigner des devoirs. Les eleves peuvent consulter les entrees publiees pour leurs classes.

### Objectifs fonctionnels

1. **Pour les enseignants** :

   - Documenter le contenu de chaque seance (format Ubumark/rich text)
   - Assigner des devoirs avec date limite optionnelle
   - Controler la visibilite (brouillon/publie)
   - Navigation hebdomadaire intuitive
   - Statistiques de suivi

2. **Pour les eleves** :
   - Consulter le contenu des seances passees
   - Voir les devoirs a venir avec countdown
   - Filtrer par classe (si plusieurs)

### Caracteristiques techniques

| Aspect          | Implementation                      |
| --------------- | ----------------------------------- |
| Base de donnees | PostgreSQL (Supabase) avec RLS      |
| Securite        | Row Level Security + validation Zod |
| Contrainte      | Une entree par classe par date      |
| Format contenu  | Ubumark (HTML + MathLive)           |
| Navigation      | Hebdomadaire (lundi-dimanche)       |
| Realtime        | Non implemente                      |

---

## Table des matieres

| Document                             | Description                             |
| ------------------------------------ | --------------------------------------- |
| [architecture.md](./architecture.md) | Structure du code, routes, fichiers     |
| [database.md](./database.md)         | Schema SQL, RLS policies, indexes       |
| [api.md](./api.md)                   | Fonctions serveur, validation Zod       |
| [components.md](./components.md)     | Composants Svelte, props, usage         |
| [flows.md](./flows.md)               | Flux de donnees, diagrammes de sequence |
| [types.md](./types.md)               | Types TypeScript, interfaces            |

---

## Architecture en bref

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  Teacher Routes                    │  Student Routes            │
│  /dashboard/teacher/cahier-texte   │  /dashboard/student/       │
│    └─ [classId]/[date]             │  cahier-texte              │
│                                    │    └─ [entryId]            │
├─────────────────────────────────────────────────────────────────┤
│                        COMPONENTS                               │
│  JournalWeekGrid │ JournalDatePicker │ HomeworkCard │ ...      │
├─────────────────────────────────────────────────────────────────┤
│                        SERVER LAYER                             │
│  +page.server.ts  │  Form Actions  │  Server Functions          │
│  (load data)      │  (CRUD)        │  (journal.ts)              │
├─────────────────────────────────────────────────────────────────┤
│                        VALIDATION                               │
│  Zod Schemas (validation/journal.ts)                           │
├─────────────────────────────────────────────────────────────────┤
│                         DATABASE                                │
│  class_journal_entries + RLS Policies                          │
│  FK: classes, profiles, class_members                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Publication

```
   ENSEIGNANT                              ELEVE
       │                                     │
       │  1. Cree entree                     │
       │     (is_published=false)            │
       │     ────────────────►               │
       │                                     │
       │  2. Modifie contenu                 │
       │     (draft mode)                    │
       │                                     │
       │  3. Publie                          │
       │     (is_published=true)             │
       │     ────────────────────────────►   │
       │                                     │  Visible si:
       │                                     │  - is_published = true
       │                                     │  - entry_date <= today
       │                                     │  - membre actif classe
       │                                     │
       │  4. Peut depublier                  │
       │     ◄────────────────────────────   │  Disparait de la vue
       │                                     │
```

---

## Fichiers cles

### Routes

```
src/routes/(protected)/dashboard/
├── teacher/cahier-texte/
│   ├── +page.svelte              # Vue hebdomadaire
│   ├── +page.server.ts           # Chargement classes + semaine
│   └── [classId]/[date]/
│       ├── +page.svelte          # Editeur d'entree
│       └── +page.server.ts       # Actions CRUD
└── student/cahier-texte/
    ├── +page.svelte              # Vue hebdomadaire + devoirs
    ├── +page.server.ts           # Chargement entrees publiees
    └── [entryId]/
        ├── +page.svelte          # Detail lecture seule
        └── +page.server.ts       # Chargement entree unique
```

### Server

```
src/lib/server/
├── journal.ts                    # Fonctions CRUD + queries
├── journal.test.ts               # Tests unitaires
└── validation/
    ├── journal.ts                # Schemas Zod
    └── journal.test.ts           # Tests validation
```

### Composants

```
src/lib/components/journal/
├── index.ts                      # Exports
├── JournalWeekGrid.svelte        # Grille 7 jours
├── JournalDatePicker.svelte      # Navigation semaine
├── JournalEntryCard.svelte       # Carte resume
└── HomeworkCard.svelte           # Carte devoir eleve
```

### Types

```
src/lib/types/
├── journal.ts                    # Types application
└── database.ts                   # Types DB generes
```

### Database

```
supabase/migrations/
└── 20260104200000_create_journal_entries.sql
```

---

## Securite

### Row Level Security (RLS)

| Role                 | SELECT                                  | INSERT            | UPDATE      | DELETE      |
| -------------------- | --------------------------------------- | ----------------- | ----------- | ----------- |
| Enseignant (proprio) | Toutes ses entrees                      | Si proprio classe | Ses entrees | Ses entrees |
| Eleve                | Publiees + date <= today + membre actif | -                 | -           | -           |
| Admin                | Toutes                                  | Toutes            | Toutes      | Toutes      |

### Validation Zod

- **Tous les inputs** valides cote serveur
- **UUIDs** valides
- **Dates** format YYYY-MM-DD
- **Contenu** max 50,000 caracteres
- **Regles metier** : date due >= date entree

---

## Dependencies

### Externes

- `@supabase/supabase-js` - Client DB
- `zod` - Validation
- `lucide-svelte` - Icones

### Internes

- `MySelect` / `MyCheckbox` - Composants standardises
- `RichTextEditor` - Editeur Ubumark
- `transformMathHtml()` - Rendu securise HTML+math
- `toaster` - Notifications

---

## Pour aller plus loin

- [architecture.md](./architecture.md) - Details structure code
- [database.md](./database.md) - Schema complet + RLS
- [api.md](./api.md) - Reference fonctions serveur
- [components.md](./components.md) - Guide composants
- [flows.md](./flows.md) - Diagrammes de sequence
