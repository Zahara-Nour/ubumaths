# Fix RLS `student_achievements` / `achievement_progress` — Progress

**Date** : 2026-05-24
**Statut** : Implémenté, tests verts, prêt à commit.

## Problème

Logs prod inondés de :

```
new row violates row-level security policy for table "student_achievements"
```

Cause : la migration `20251121000000_create_universal_achievements_system.sql`
créait deux policies INSERT avec `WITH CHECK (false)` :

- `student_achievements` → "System can insert student achievements"
- `achievement_progress` → "System can manage achievement progress"

Commentaire d'origine : "Only via SECURITY DEFINER functions". Ça marche pour
les RPC SECURITY DEFINER (`process_achievement_event`, etc.) parce que leur
owner `postgres` a `BYPASSRLS`. Ça ne marche PAS pour les endpoints
`/api/games/2048/scores` et `/api/games/mathemo/scores` qui inséraient
directement avec le client authentifié de l'utilisateur — ces inserts
étaient systématiquement rejetés.

Symptôme côté UX (intermittent) : un élève gagne un palier, ne reçoit ni la
ligne dans `student_achievements` ni les gidouilles associées.

## Solution

### Migration DB (`20260524100843_unblock_student_achievements_inserts.sql`)

- DROP `"System can insert student achievements"` sur `student_achievements`
- CREATE `"Service role can manage student achievements"` FOR ALL TO service_role
- DROP `"System can manage achievement progress"` sur `achievement_progress`
- CREATE `"Service role can manage achievement progress"` FOR ALL TO service_role

Symétrie volontaire avec la migration d'hier `20260523220626_tighten_permissive_rls_policies.sql` qui a appliqué le même pattern sur `achievement_events`.

**Pas touche à `minesweeper_student_achievements`** : cette table n'a aucune policy INSERT (default-deny pour les rôles normaux, mais SECURITY DEFINER bypasse via BYPASSRLS). Le pattern actuel fonctionne — aucun log d'erreur sur cette table.

### Code (endpoints + helper)

| Fichier                                          | Changement                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/serviceRoleClient.ts`            | Ajout de `/api/games/2048/scores` et `/api/games/mathemo/scores` à `ALLOWED_SERVICE_ROLE_PATHS`                                                                                              |
| `src/lib/server/errorMonitoring.ts`              | Suppression de la version locale dupliquée de `getServiceRoleClient`, import depuis `./serviceRoleClient`                                                                                    |
| `src/routes/api/games/2048/scores/+server.ts`    | `checkAndAward2048Milestones` utilise `createServiceRoleClient()` pour l'INSERT dans `student_achievements` et l'RPC `update_student_gidouilles`. SELECTs restent sur le client authentifié. |
| `src/routes/api/games/mathemo/scores/+server.ts` | Même refactor pour `checkAndAwardMathemoMilestones`                                                                                                                                          |

Choix : on ne crée PAS un nouveau helper `supabase-admin.ts`. Le code reviewer a fait remarquer qu'il existait déjà `serviceRoleClient.ts` (HMR-safe singleton + audit logging des chemins autorisés). On consolide dessus.

### Tests (TDD strict, écrits avant l'implémentation)

| Test              | Fichier                                                                          | Couverture                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration content | `src/lib/server/achievements/__tests__/unblock-student-achievements-rls.test.ts` | 7 assertions sur la migration (filename convention, DROP des anciennes policies, CREATE des nouvelles avec `TO service_role`, immutabilité de `minesweeper_student_achievements`) |
| 2048 endpoint     | `src/routes/api/games/2048/scores/scores-milestone-rls.test.ts`                  | 2 tests : INSERT student_achievements va sur service-role / pas sur auth ; RPC `update_student_gidouilles` va sur service-role / pas sur auth                                     |
| mathemo endpoint  | `src/routes/api/games/mathemo/scores/scores-milestone-rls.test.ts`               | Idem 2048                                                                                                                                                                         |

**Total 11/11 verts.** Tests écrits avant le fix → vu d'abord en rouge, puis verts après implémentation.

## Risques résiduels / suivi

### `WITH CHECK (true)` permissif

Les nouvelles policies acceptent N'IMPORTE QUEL row du moment qu'on est en service_role. C'est intentionnel : la validation business (student_id correct, achievement_id valide, etc.) se fait côté endpoint avant l'insert. Si un dev ajoute un endpoint qui utilise le service-role client de manière incorrecte, il pourra théoriquement insérer des données arbitraires. C'est pour ça que `ALLOWED_SERVICE_ROLE_PATHS` est restrictif et qu'on logge en dev.

### Duplications restantes du service-role singleton

Le reviewer a noté qu'il existe encore 2 autres implémentations privées :

- `src/lib/server/rateLimiter.ts` (singleton local pour le rate limiting)
- `src/lib/tutor/tutor-rate-limiter.ts` (idem pour le tuteur)

Pas dans le scope de ce PR. À consolider plus tard.

### Bugs voisins identifiés (hors scope ce PR)

Pendant l'investigation, 2 autres bugs sont apparus dans les logs prod :

1. **`infinite recursion detected in policy for relation "assessments"`** — beaucoup d'occurrences. Probablement une policy `assessments` qui se référence elle-même via une vue ou fonction.

2. **Minesweeper "victoire en 2s sans récompenses"** — modal `VictoryModal` affiché à un élève authentifié avec `isPublicUser: true` (donc message "Connectez-vous pour gagner des gidouilles !" trompeur). C'est le catch-block de `completeGame()` (lignes 2194-2225 de `minesweeper.svelte.ts`) qui se déclenche quand `/complete` échoue. La cause sous-jacente du failure n'a pas été identifiée — pas d'erreur évidente dans les logs pour `complete_minesweeper_game`.

À traiter dans des PR séparés.

## Validation post-merge

- [ ] Vérifier dans les logs Supabase que les erreurs `student_achievements` RLS disparaissent
- [ ] Tester manuellement : un élève fait un score 2048 ≥ 50k → palier `2048_score_50k` débloqué + gidouilles créditées
- [ ] Pareil sur mathemo (palier `mathemo_first_win` après première victoire)

## Documents produits

- `supabase/migrations/20260524100843_unblock_student_achievements_inserts.sql`
- `src/lib/server/achievements/__tests__/unblock-student-achievements-rls.test.ts`
- `src/routes/api/games/2048/scores/scores-milestone-rls.test.ts`
- `src/routes/api/games/mathemo/scores/scores-milestone-rls.test.ts`
- `docs/wip/fix-student-achievements-rls-progress.md` (ce fichier)

Fichiers modifiés :

- `src/lib/server/errorMonitoring.ts`
- `src/lib/server/serviceRoleClient.ts`
- `src/routes/api/games/2048/scores/+server.ts`
- `src/routes/api/games/mathemo/scores/+server.ts`
