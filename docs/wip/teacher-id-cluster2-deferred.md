# Restes `teacher_id` mis de côté (mono-prof — Cluster 2)

> **Contexte** : le retrait de `teacher_id` du **cluster classes** (Cluster 1) est **livré + en prod** (2026-06-20, PR #42 + correctif #44 ; nettoyage refs ancien projet #45). Décision au démarrage : **« Cluster 1 uniquement »** → tout le `teacher_id` « tampon propriétaire d'une ressource » (Cluster 2) et les params `p_teacher_id` associés ont été **délibérément mis de côté**. Ce doc trace ce qui reste.
>
> Détail du chantier livré : `docs/wip/drop-class-teacher-id-progress.md`. Migration : `supabase/migrations/20260620090000_drop_class_teacher_id_mono_teacher.sql`.

**Légende** : 🟢 gardé légitimement (pas vraiment « à faire ») · 🟡 candidat à finir si on veut · 📝 doc à écrire.

---

## 1. 🟢 Colonnes `teacher_id` du Cluster 2 (gardées exprès)

Ce sont des **marqueurs de propriété d'une ressource**, pas une « assignation de classe ». En mono-prof elles valent toujours David, mais les retirer apporte peu et complique (clé de lookup, distinction NULL, audit).

| Table                        | Rôle de `teacher_id`            | Pourquoi gardée                                                   |
| ---------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `google_classroom_courses`   | owner de l'intégration (UNIQUE) | clé naturelle de l'intégration ; 1 ligne/prof                     |
| `google_integrations`        | owner des jetons OAuth (UNIQUE) | **clé de lookup** des tokens ; l'enlever = table singleton tordue |
| `rag_documents`              | owner (NULLABLE)                | `NULL` = doc **système** vs doc du prof — vraie distinction       |
| `orphaned_documents`         | owner du doc supprimé           | **trace d'audit**                                                 |
| `teacher_vip_card_overrides` | owner de l'override             | préférences cartes VIP du prof — voir §3                          |

## 2. 🟢 Params `p_teacher_id` gardés sur les RPC

Gardés (contrairement aux RPC de classes dont on a **retiré** le param : `get_teacher_classes_with_data` / `_with_students` / `_for_messaging` / `_assignment_stats`) :

- `award_achievement_manual(p_teacher_id, …)`
- `validate_riddle_attempt(…, p_teacher_id, …)`
- `teacher_owns_riddle(p_teacher_id, p_riddle_id)` — via `riddles.created_by`
- `get_teacher_override_impact(p_teacher_id, p_card_id)` — via `teacher_vip_card_overrides`
- `get_teacher_overrides_summary(p_teacher_id)` — idem
- `is_class_teacher_of(p_teacher_id)` — **param gardé, corps déjà réécrit role-based**

## 3. 🟡 Aplatir `teacher_vip_card_overrides` en table **globale**

Seul vrai « résidu multi-prof » du Cluster 2. La logique d'intersection (`tvo.teacher_id IN (SELECT … DISTINCT …)`) supposait plusieurs profs ; on l'a seulement **réécrite in-place** dans la migration (sous-requête → `SELECT id FROM profiles WHERE role='teacher'`, donc « le prof unique »), **sans aplatir la table**. La dimension multi-prof subsiste structurellement.

→ **Candidat n°1** si on veut finir le ménage : supprimer `teacher_id` de `teacher_vip_card_overrides`, en faire des overrides globaux, et simplifier `get_teacher_override_impact`/`_overrides_summary` + le tirage VIP. Migration destructive sur prod (mineurs/RGPD, sous `maintenance:on`) — même prudence que le Cluster 1. Gain : faible/cosmétique.

## 4. 🟡 Champ client `ClassMembership.teacher_id` / `teacher_name`

Côté élève (`src/lib/types/student-cache.ts`), `ClassMembership` garde `teacher_id` + `teacher_name`, **peuplés via le prof unique** (`student/+layout.server.ts`, `student/cours`, `api/student/profile` résolvent `profiles WHERE role='teacher'`). Vestigial mais inoffensif (affichage « ton prof »). Pourrait être aplati (un seul prof affiché) si on veut simplifier les caches élève.

## 5. 📝 Notes « Low » de l'audit sécurité (à documenter)

À consigner dans `docs/architecture/database-schema.md` (non bloquant) :

- Insert/delete `student_warnings` devient **admin-inclusif** (via `is_class_teacher` → `is_teacher_or_admin()`).
- Filtre `cm.status='active'` retiré dans quelques fonctions VIP (n'élargit que la portée du prof unique).

---

## Vérifier l'état (re-lister les restes)

Interroger la prod EU live via `mcp__supabase__*` (`.mcp.json`) ou la CLI — **pas** le connecteur claude.ai si doute (cf. `reference_supabase-mcp-stale-claude-connector` en mémoire) :

```sql
SELECT table_name FROM information_schema.columns
  WHERE table_schema='public' AND column_name='teacher_id' ORDER BY 1;
SELECT proname, pg_get_function_identity_arguments(oid)
  FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND pg_get_function_identity_arguments(oid) ~ 'p_teacher_id' ORDER BY 1;
```

**En clair** : §1-2 sont **légitimement gardés** (pas une dette). Les seuls vrais « à reprendre un jour » sont **§3** (aplatir `teacher_vip_card_overrides`) et accessoirement **§4** (caches élève). §5 = simple doc.
