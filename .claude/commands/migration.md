---
description: Creer une nouvelle migration Supabase avec workflow complet
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite, AskUserQuestion
argument-hint: [description-migration]
---

# Migration : $1

Tu crees une nouvelle migration Supabase en suivant le workflow complet.

## Phase 1 : Preparation

### Etape 1 : Generer le timestamp

```bash
date +%Y%m%d%H%M%S
```

### Etape 2 : Creer le fichier

Format : `supabase/migrations/<timestamp>_<description_snake_case>.sql`

Exemple : `supabase/migrations/20241226120000_add_user_preferences.sql`

### Etape 3 : Analyser le contexte

1. Lis le schema existant dans `docs/architecture/database-schema.md`
2. Verifie les migrations recentes dans `supabase/migrations/`
3. Identifie les tables/colonnes concernees

---

## Phase 2 : Ecrire la Migration

### Template de migration

```sql
-- Migration: $1
-- Author: Claude Code
-- Date: [DATE]
-- Description: [Description detaillee]

-- ============================================
-- UP MIGRATION
-- ============================================

-- Nouvelles tables
CREATE TABLE IF NOT EXISTS nom_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Colonnes specifiques
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value INTEGER DEFAULT 0 NOT NULL
);

-- Nouvelles colonnes
ALTER TABLE existing_table
ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_nom_table_user_id
ON nom_table(user_id);

-- ============================================
-- RLS POLICIES (OBLIGATOIRE pour tables avec donnees utilisateur)
-- ============================================

-- Activer RLS
ALTER TABLE nom_table ENABLE ROW LEVEL SECURITY;

-- Policy SELECT : utilisateur voit ses propres donnees
CREATE POLICY "Users can view own data"
ON nom_table FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy INSERT : utilisateur peut creer ses donnees
CREATE POLICY "Users can insert own data"
ON nom_table FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE : utilisateur peut modifier ses donnees
CREATE POLICY "Users can update own data"
ON nom_table FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy DELETE : utilisateur peut supprimer ses donnees
CREATE POLICY "Users can delete own data"
ON nom_table FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS (si necessaire)
-- ============================================

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nom_table_updated_at
BEFORE UPDATE ON nom_table
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATA MIGRATION (si necessaire)
-- ============================================

-- Migrer des donnees existantes
-- UPDATE existing_table SET new_column = 'default_value';
```

---

## Phase 3 : Checklist Securite

### RLS Policies OBLIGATOIRES

- [ ] RLS active sur la table (`ENABLE ROW LEVEL SECURITY`)
- [ ] Policy SELECT restrictive
- [ ] Policy INSERT avec WITH CHECK
- [ ] Policy UPDATE avec USING et WITH CHECK
- [ ] Policy DELETE restrictive
- [ ] Policies pour roles specifiques si necessaire (teacher, admin)

### Bonnes pratiques

- [ ] Pas de `SELECT *` dans les policies
- [ ] `auth.uid()` pour identifier l'utilisateur
- [ ] CASCADE sur les FK pour eviter orphelins
- [ ] NOT NULL par defaut, NULL explicite
- [ ] Index sur colonnes de filtrage frequentes

---

## Phase 4 : ATTENDRE Validation Utilisateur

**STOP** - Presente la migration a l'utilisateur et attends sa validation.

```markdown
## Migration proposee : $1

### Changements :
- [Liste des changements]

### RLS Policies :
- [Liste des policies]

### Impact :
- [Tables affectees]
- [Risques potentiels]

Voulez-vous que j'applique cette migration ?
```

---

## Phase 5 : Apres Validation

### Etape 1 : L'utilisateur execute la migration

```bash
pnpm db:migrate
```

**IMPORTANT** : Tu ne peux PAS executer cette commande. Dis a l'utilisateur de le faire.

### Etape 2 : Mettre a jour les types TypeScript

```bash
pnpm db:types
```

Ou manuellement dans `src/lib/types/database.ts` :

```typescript
// Ajouter les nouveaux types
export interface NomTable {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  value: number;
}
```

### Etape 3 : Mettre a jour la documentation

Edite `docs/architecture/database-schema.md` :

```markdown
## nom_table

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Cle primaire |
| user_id | UUID | Reference a auth.users |
| name | TEXT | Nom |
| value | INTEGER | Valeur |

### RLS Policies
- Users can view/insert/update/delete own data
```

---

## Phase 6 : Verification

1. Verifie que la migration s'est bien appliquee
2. Verifie que les types sont a jour
3. Verifie que la documentation est a jour
4. Teste les RLS policies manuellement si possible

---

## Regles Critiques

1. **TOUJOURS** des RLS policies sur les tables utilisateur
2. **JAMAIS** de donnees sensibles sans protection
3. **TOUJOURS** des index sur les FK et colonnes filtrees
4. **TOUJOURS** updated_at trigger
5. Tester les policies avant de deployer en production
