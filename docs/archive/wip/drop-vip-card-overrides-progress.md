# Suppression couche override VIP (B pur) — progress

> **Décision** : mono-prof → la couche `teacher_vip_card_overrides` (niveau 2) est **redondante** avec le flag global `vip_card_templates.is_enabled` (niveau 1). Choix **B pur** : supprimer la table + l'UI prof + l'endpoint ; toute la gestion ON/OFF des cartes passe par la **page admin** (toggle déjà existant). Voir l'historique : [[project_mono-teacher-teacher-id-removal]].
>
> **Constat prod** : 1 seule ligne override = `candy` (override=TRUE, global=FALSE) → **no-op** (le flag global gagne, candy OFF). 0 override `FALSE` → **0 changement de comportement** en supprimant.

## Périmètre

**DB (migration destructive, après deploy, sous maintenance)** :

- [ ] `draw_multiple_vip_cards` : retirer les 2 blocs `AND NOT EXISTS(... teacher_vip_card_overrides ...)` (tirage + fallback common)
- [ ] `DROP FUNCTION get_available_cards_for_student` (morte : 0 appel app)
- [ ] `DROP TABLE teacher_vip_card_overrides` (drop ses 6 policies en cascade)

**App** :

- [ ] DELETE endpoint `api/teacher/vip-cards/overrides/+server.ts`
- [ ] DELETE endpoint orphelin `api/teacher/vip-cards/global-config/+server.ts` (0 fetch app)
- [ ] DELETE page `teacher/gamification/vip-cards/` (+page.server.ts + +page.svelte)
- [ ] DELETE composants `VipCardOverrideGrid.svelte` + `VipCardGlobalConfigDisplay.svelte` (utilisés QUE par cette page)
- [ ] Retirer onglet nav « VIP Cards » + import `Sparkles` dans `teacher/gamification/+layout.svelte`
- [ ] Retirer redirect legacy `/dashboard/teacher/vip-cards` dans `hooks.server.ts`
- [ ] Types `vip-card-admin.ts` : suppr. `TeacherVipCardOverride`, `TeacherOverride`, `UpdateOverridesRequest`, `TeacherOverridesResponse`
- [ ] Validation `vip-card-admin.ts` : suppr. `teacherOverrideSchema`, `updateOverridesSchema`, `UpdateOverridesInput`
- [ ] Tests : DELETE `tests/integration/vip-card-teacher-overrides.test.ts` → remplacé par `vip-card-draw-global-flag.test.ts`
- [ ] Régénérer `database.ts`

## Vérifs faites (read-only prod + code)

- `get_available_cards_for_student` + `global-config` endpoint = **morts** (0 appel app).
- `draw_multiple_vip_cards` appelé par `api/rewards/draw-vip-cards` (signature inchangée → OK).
- Types/schemas override **non importés** hors fichiers supprimés.
- Admin peut déjà toggler `is_enabled` (`admin/vip-cards` → `handleToggleCard`).
- Test validation `vip-card-admin.test.ts` : **0 cas override** (ne pas toucher).

## Definition of Done

- [ ] test intégration vert (tirage = flag global only ; table absente)
- [ ] `check:incremental` 0 · security-auditor (RLS/SECURITY DEFINER/destructif) · code-reviewer
- [ ] PR ouverte, **stop avant merge**
- [ ] Déploiement : deploy code → `maintenance:on` → `db:migrate` → vérif tirage → `maintenance:off` → `db:types`
