# Restes `teacher_id` mis de côté (mono-prof — Cluster 2)

> **Contexte** : le retrait de `teacher_id` du **cluster classes** (Cluster 1) est **livré + en prod** (2026-06-20, PR #42 + correctif #44 ; nettoyage refs ancien projet #45). Décision au démarrage : **« Cluster 1 uniquement »** → tout le `teacher_id` « tampon propriétaire d'une ressource » (Cluster 2) et les params `p_teacher_id` associés ont été **délibérément mis de côté**. Ce doc trace ce qui reste.
>
> Détail du chantier livré : `docs/wip/drop-class-teacher-id-progress.md`. Migration : `supabase/migrations/20260620090000_drop_class_teacher_id_mono_teacher.sql`.

**Légende** : 🟢 gardé légitimement (pas vraiment « à faire ») · 🟡 candidat à finir si on veut · 📝 doc à écrire.

---

## 1. 🟢 Colonnes `teacher_id` du Cluster 2 (gardées exprès)

Ce sont des **marqueurs de propriété d'une ressource**, pas une « assignation de classe ». En mono-prof elles valent toujours David, mais les retirer apporte peu et complique (clé de lookup, distinction NULL, audit). _(`teacher_vip_card_overrides` n'est plus dans cette liste : table supprimée — voir §3.)_

| Table                      | Rôle de `teacher_id`            | Pourquoi gardée                                                   |
| -------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `google_classroom_courses` | owner de l'intégration (UNIQUE) | clé naturelle de l'intégration ; 1 ligne/prof                     |
| `google_integrations`      | owner des jetons OAuth (UNIQUE) | **clé de lookup** des tokens ; l'enlever = table singleton tordue |
| `rag_documents`            | owner (NULLABLE)                | `NULL` = doc **système** vs doc du prof — vraie distinction       |
| `orphaned_documents`       | owner du doc supprimé           | **trace d'audit**                                                 |

## 2. ✅ FAIT — Params `p_teacher_id` retirés (PR #46, en prod 2026-06-20)

Finalement **tous nettoyés** (vérifié : 0 param `p_teacher_id` restant en prod). L'investigation a montré qu'ils étaient redondants (« le prof appelant » = `auth.uid()`), et que 3 des fonctions étaient **mortes**.

- ✂️ `award_achievement_manual` / `validate_riddle_attempt` : param retiré → estampillent `unlocked_by` / `validated_by` via `auth.uid()`.
- ✂️ `teacher_owns_riddle(p_teacher_id, p_riddle_id)` → `teacher_owns_riddle(p_riddle_id)` (`created_by = auth.uid()`) + 3 policies `riddle_assignments` réécrites.
- 🗑️ **DROP** (0 appelant) : `is_class_teacher_of` (mort depuis Option B), `get_teacher_override_impact`, `get_teacher_overrides_summary`.

> 🐛 **Bonus** : le test award de #46 a révélé un bug prod indépendant — le trigger `log_achievements_to_events` lisait `NEW.metadata` (colonne inexistante sur `student_achievements`) → décerner un succès était cassé. Corrigé par **PR #47** (en prod).

## 3. ✅ FAIT — Couche `teacher_vip_card_overrides` SUPPRIMÉE (PR #48)

Décision **B pur** (pas « aplatir » mais **supprimer** la couche) : en mono-prof l'override est **redondant** avec le flag global `vip_card_templates.is_enabled` (il était **soustractif** → ne pouvait qu'éteindre une carte déjà active ; même personne prof=admin pilote les deux). Constat prod : 1 seul override (`candy`=TRUE) qui était un **no-op** (candy globalement OFF) → 0 changement de comportement.

- DROP TABLE `teacher_vip_card_overrides` (+ 6 policies) ; DROP `get_available_cards_for_student` (morte) ; `draw_multiple_vip_cards` ne consulte plus d'override (tirable ssi `is_enabled=TRUE`).
- App : endpoints `overrides`/`global-config`, page prof `gamification/vip-cards`, composants `VipCardOverrideGrid`/`VipCardGlobalConfigDisplay` supprimés → gestion ON/OFF des cartes **via la page admin uniquement**.
- ⚠️ Migration `20260620140000` **mergée mais PAS encore en prod** : déploiement destructif à faire (deploy code → `maintenance:on` → `db:migrate` → `db:types`).

_(`get_teacher_override_impact`/`_overrides_summary` étaient déjà droppées en #46.)_

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

**En clair** : **§1** légitimement gardé (pas une dette), **§2 FAIT** (PR #46/#47, en prod), **§3 FAIT** (PR #48, mergé — déploiement destructif en attente). Restent, si on veut : **§4** (caches élève, cosmétique) et **§5** (simple doc). Le Cluster 2 est quasi soldé.
