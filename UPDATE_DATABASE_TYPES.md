# Mise à jour des Types Database

Après avoir appliqué la migration `097_create_message_templates.sql`, vous devez regénérer les types TypeScript pour Supabase.

## Étapes

1. Appliquer la migration :

```bash
pnpm db:migrate
```

2. Regénérer les types (si vous avez la CLI Supabase configurée) :

```bash
npx supabase gen types typescript --local > src/lib/types/database.ts
```

OU si vous utilisez Supabase hébergé :

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts
```

## Type ajouté

La nouvelle table `message_templates` a été ajoutée avec les colonnes suivantes :

- id (UUID)
- title (TEXT)
- description (TEXT, nullable)
- subject_template (TEXT)
- body_template (TEXT)
- trigger_type (TEXT avec CHECK)
- trigger_config (JSONB)
- scope (TEXT: 'system' | 'class')
- created_by (UUID, FK vers profiles)
- class_id (UUID, FK vers classes, nullable)
- variables (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

Les types devraient être automatiquement générés dans la section `Tables` de `database.ts`.
