# Correctif Migration Templates

## Problème Résolu

**Erreur** : `column "user_id" does not exist` lors de l'application de la migration 097

**Cause** : La table `class_members` utilise la colonne `student_id` et non `user_id`

## Fichiers Corrigés

✅ **3 fichiers mis à jour** :

1. `supabase/migrations/097_create_message_templates.sql`
   - Ligne 158 : `user_id` → `student_id` (RLS policy)

2. `src/routes/api/messages/templates/+server.ts`
   - Ligne 91 : `user_id` → `student_id` (requête class_members)

3. `src/routes/api/messages/templates/match/+server.ts`
   - Ligne 55 : `user_id` → `student_id` (requête class_members)

## Migration Corrigée

Vous pouvez maintenant appliquer la migration sans erreur :

```bash
pnpm db:migrate
```

## Prochaines Étapes

Après application réussie de la migration :

1. Charger les templates par défaut :

   ```bash
   psql -h localhost -U postgres -d ubumaths -f supabase/seed/default_message_templates.sql
   ```

2. Regénérer les types :

   ```bash
   npx supabase gen types typescript --local > src/lib/types/database.ts
   ```

3. Tester les pages de gestion des templates

---

**Status** : ✅ Corrigé
**Date** : 2025-10-22
