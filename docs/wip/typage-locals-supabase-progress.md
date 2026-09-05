# Typage `locals.supabase` — progression

> Mesure de référence : **PR #140**, job `Type Check` du 2026-09-05.
> Commande : brancher `SupabaseClient<Database>` sur `locals.supabase` dans `src/app.d.ts`,
> pousser, et lire le job CI (la mesure locale sature la machine 8 Go).

## Pourquoi ce chantier

`src/app.d.ts` déclarait `supabase: SupabaseClient` **sans le générique `Database`**.
Conséquence : aucune requête serveur n'était typée. Des `.select()` demandaient des
colonnes absentes du schéma pendant des mois — PostgREST refusait, le code ignorait
`error`, la page se rendait vide **sans trace**. C'est ainsi que `/automaths` a renvoyé
500 pendant dix mois.

## État de la mesure

**323 erreurs dans 138 fichiers.**

| Catégorie               | Nombre | Nature                                                                   |
| ----------------------- | ------ | ------------------------------------------------------------------------ |
| `type-incompatible`     | 164    | type incompatible — surtout du `Json` Supabase vs types métier           |
| `propriete-inexistante` | 75     | **propriété inexistante — même classe de bug que les colonnes fantômes** |
| `null-non-gere`         | 30     | null/undefined non géré (nullabilité réelle du schéma)                   |
| `surcharge`             | 27     | surcharge non trouvée (souvent un `.insert()` mal formé)                 |
| `cast`                  | 20     | cast `as` impossible (le type réel ne correspond pas)                    |
| `propriete-manquante`   | 4      | propriétés manquantes dans un objet construit                            |
| `autre`                 | 3      | divers                                                                   |

## Lot prioritaire — les 75 propriétés inexistantes

C'est la seule catégorie qui révèle des **bugs de production** et non de la friction
de typage : le code lit une propriété que la requête n'a jamais pu retourner.

- `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.server.ts`
  - `.tolerance` (l.213), `.tolerance` (l.214)
- `src/routes/(protected)/dashboard/student/assessments/[id]/results/+page.svelte`
  - `.max_attempts` (l.101), `.max_attempts` (l.103), `.correct_answers` (l.167), `.duration` (l.170)
- `src/routes/(protected)/dashboard/student/cours/[chapterId]/+page.server.ts`
  - `.answer` (l.193), `.answer` (l.193)
- `src/routes/(protected)/dashboard/student/exercises/[id]/+page.svelte`
  - `.tags` (l.143), `.tags` (l.143), `.tags` (l.145)
- `src/routes/(protected)/dashboard/student/riddles/+page.server.ts`
  - `.assignment_date` (l.28), `.riddle_id` (l.34)
- `src/routes/(protected)/dashboard/student/riddles/archive/+page.svelte`
  - `.assignment_date` (l.92)
- `src/routes/(protected)/dashboard/student/riddles/history/+page.server.ts`
  - `.gidouilles_awarded` (l.52), `.total_attempts_for_success` (l.53), `.total_attempts_for_success` (l.54)
- `src/routes/(protected)/dashboard/student/riddles/history/+page.svelte`
  - `.total_attempts_for_success` (l.252), `.title` (l.259), `.total_attempts_for_success` (l.269), `.gidouilles_awarded` (l.274)
- `src/routes/(protected)/dashboard/student/riddles/leaderboard/+page.svelte`
  - `.total_gidouilles_from_riddles` (l.92), `.total_gidouilles_from_riddles` (l.112), `.total_gidouilles_from_riddles` (l.132), `.total_gidouilles_from_riddles` (l.195)
- `src/routes/(protected)/dashboard/teacher/contenu/enigmes/of-the-day/+page.svelte`
  - `.riddle_number` (l.75), `.difficulty` (l.76), `.difficulty` (l.77), `.genre` (l.79), `.genre` (l.80), `.title` (l.83), `.assignment_date` (l.85), `.assignment_date` (l.91), `.assignment_date` (l.221)
- `src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server.ts`
  - `.id` (l.153), `.id` (l.154), `.question` (l.155), `.answer` (l.156)
- `src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.svelte`
  - `.id` (l.84), `.id` (l.86), `.question` (l.87), `.question` (l.87), `.question` (l.87)
- `src/routes/(public)/automaths/+page.server.ts`
  - `.localeCompare` (l.45)
- `src/routes/api/marketplace/admin/analytics/+server.ts`
  - `.template` (l.238), `.template` (l.238), `.template` (l.238), `.id` (l.240), `.id` (l.242), `.template_id` (l.243)
- `src/routes/api/marketplace/listings/+server.ts`
  - `.new_views` (l.149), `.new_views` (l.150)
- `src/routes/api/marketplace/listings/[id]/proposals/+server.ts`
  - `.success` (l.424), `.trade_id` (l.452), `.error` (l.458)
- `src/routes/api/marketplace/trades/+server.ts`
  - `.can_create_trade` (l.204), `.max_trades` (l.207), `.can_create_trade` (l.224), `.max_trades` (l.227)
- `src/routes/api/marketplace/trades/[id]/accept/+server.ts`
  - `.success` (l.101), `.error` (l.102), `.completed_at` (l.151)
- `src/routes/api/marketplace/trades/[id]/confirm/+server.ts`
  - `.success` (l.153), `.error` (l.154)
- `src/routes/api/marketplace/trades/[id]/offers/+server.ts`
  - `.unlocked_count` (l.189)
- `src/routes/api/moderation/messages/[id]/+server.ts`
  - `.length` (l.163)
- `src/routes/api/python-exercises/[id]/results/+server.ts`
  - `.id` (l.190)
- `src/routes/api/srs/review/due/+server.ts`
  - `.total_reviews` (l.164), `.last_review` (l.165), `.total_reviews` (l.193), `.last_review` (l.194)
- `src/routes/api/worksheets/assignments/[assignmentId]/correction/+server.ts`
  - `.role` (l.101), `.role` (l.101), `.class_id` (l.103), `.role` (l.107)

## Fichiers les plus touchés (toutes catégories)

- 12 — `src/routes/api/marketplace/listings/[id]/proposals/+server.ts`
- 11 — `src/routes/api/marketplace/admin/analytics/+server.ts`
- 11 — `src/routes/(protected)/dashboard/teacher/contenu/enigmes/of-the-day/+page.svelte`
- 10 — `src/routes/api/worksheets/[id]/pdf/batch/+server.ts`
- 9 — `src/routes/api/srs/review/due/+server.ts`
- 8 — `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.server.ts`
- 8 — `src/routes/api/marketplace/trades/+server.ts`
- 8 — `src/routes/(protected)/dashboard/student/riddles/history/+page.svelte`
- 8 — `src/routes/(protected)/dashboard/student/riddles/leaderboard/+page.svelte`
- 7 — `src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server.ts`
- 7 — `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.svelte`
- 7 — `src/routes/(protected)/dashboard/student/assessments/[id]/results/+page.svelte`
- 6 — `src/routes/api/student/worksheets/[assignmentId]/+server.ts`
- 6 — `src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.svelte`
- 5 — `src/routes/(protected)/dashboard/student/riddles/history/+page.server.ts`
- 5 — `src/routes/api/questions/templates/[id]/+server.ts`
- 5 — `src/routes/api/rewards/draw-vip-cards/+server.ts`
- 5 — `src/routes/api/worksheets/assignments/[assignmentId]/correction/+server.ts`
- 5 — `src/routes/api/worksheets/assignments/[assignmentId]/preview/+server.ts`
- 5 — `src/routes/(protected)/dashboard/teacher/contenu/enigmes/stats/+page.svelte`

## Méthode

1. Un lot = un thème cohérent, une PR, des tests d'intégration qui vérifient **les deux
   sens** (la requête corrigée résout ; l'ancien nom est bien refusé).
2. Ne jamais mesurer en local (`check:incremental` sature les 8 Go) : pousser et lire la CI.
3. `src/app.d.ts` n'est livré **qu'en dernier**, quand le compte atteint 0.
4. Quand une requête révèle une fonctionnalité jamais livrée (ex. le quiz de chapitre),
   on retire le code mort sans changer le comportement, et on remonte la décision produit.
