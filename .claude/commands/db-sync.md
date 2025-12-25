---
description: Synchroniser le schema DB avec les types TypeScript et la documentation
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite
---

# Synchronisation Database

Tu verifies et synchronises la coherence entre le schema DB, les types TypeScript, et la documentation.

## Phase 1 : Collecter l'Etat Actuel

### Etape 1 : Schema de la base (migrations)

```bash
ls -la supabase/migrations/ | tail -20
```

Lire les dernieres migrations pour comprendre le schema actuel.

### Etape 2 : Types TypeScript

Lire `src/lib/types/database.ts` pour voir les types actuels.

### Etape 3 : Documentation

Lire `docs/architecture/database-schema.md` pour voir la documentation.

---

## Phase 2 : Detecter les Incoherences

### Checklist de verification

Pour chaque table :

- [ ] **Table existe dans migrations** → Doit exister dans types
- [ ] **Colonnes correspondent** → Noms et types identiques
- [ ] **Relations (FK)** → Documentees correctement
- [ ] **RLS policies** → Documentees
- [ ] **Index** → Documentes

### Problemes courants

| Symptome | Cause probable |
|----------|----------------|
| Type manquant | Migration recente non synchronisee |
| Colonne manquante dans type | ALTER TABLE non refllete |
| Documentation obsolete | Pas mise a jour apres migration |
| Type `any` dans le code | Types DB non importes |

---

## Phase 3 : Regenerer les Types (si necessaire)

### Option A : Automatique (Supabase CLI)

```bash
pnpm db:types
```

Cela regenere `src/lib/types/database.ts` depuis le schema Supabase.

**Note** : Necessite que Supabase soit en cours d'execution (`pnpm db:start`).

### Option B : Manuelle

Si la regeneration automatique n'est pas possible, mettre a jour manuellement :

```typescript
// src/lib/types/database.ts

export interface Database {
  public: {
    Tables: {
      nom_table: {
        Row: {
          id: string;
          created_at: string;
          // ... autres colonnes
        };
        Insert: {
          id?: string;
          created_at?: string;
          // ... colonnes optionnelles pour insert
        };
        Update: {
          id?: string;
          created_at?: string;
          // ... colonnes optionnelles pour update
        };
      };
    };
  };
}
```

---

## Phase 4 : Mettre a Jour la Documentation

### Structure attendue de `docs/architecture/database-schema.md`

```markdown
# Database Schema

## Overview

Description generale du schema.

## Tables

### table_name

Description de la table.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| user_id | UUID | NO | - | Reference to auth.users |

**Relations:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_table_name_user_id` on `user_id`

**RLS Policies:**
- `Users can view own data` - SELECT for authenticated users
- `Users can insert own data` - INSERT for authenticated users

---
```

---

## Phase 5 : Verification Croisee

### Script de verification

Pour chaque table dans les migrations :

1. Verifier qu'elle existe dans `database.ts`
2. Verifier que toutes les colonnes correspondent
3. Verifier qu'elle est documentee dans `database-schema.md`

### Rapport d'incoherences

```markdown
## Rapport de Synchronisation - [DATE]

### Tables OK
- [x] users
- [x] classes
- [x] ...

### Incoherences Detectees

#### Table: rewards
- **Migration** : colonne `bonus_multiplier` (INTEGER)
- **Types** : MANQUANT
- **Docs** : MANQUANT

#### Table: achievements
- **Migration** : OK
- **Types** : OK
- **Docs** : Description obsolete

### Actions Requises
1. Ajouter `bonus_multiplier` dans database.ts
2. Mettre a jour documentation de achievements
```

---

## Phase 6 : Appliquer les Corrections

1. **Types** : Editer `src/lib/types/database.ts`
2. **Documentation** : Editer `docs/architecture/database-schema.md`
3. **Verifier** : Relancer la verification

---

## Automatisation

### Pre-commit hook suggere

Ajouter dans `.husky/pre-commit` :

```bash
# Verifier coherence DB (optionnel)
# node scripts/check-db-sync.js
```

---

## Commandes Utiles

```bash
# Regenerer types depuis Supabase
pnpm db:types

# Voir le schema actuel (Supabase local)
pnpm supabase db dump --schema public

# Lister les tables
pnpm supabase db dump --schema public | grep "CREATE TABLE"

# Lister les policies
pnpm supabase db dump --schema public | grep -A5 "CREATE POLICY"
```

---

## Regles

1. **TOUJOURS** synchroniser apres une migration
2. **JAMAIS** de types manuels si regeneration automatique possible
3. **TOUJOURS** documenter les nouvelles tables
4. Les types doivent correspondre EXACTEMENT au schema
