# Chantier questions-1techno-grades — niveau `1_TECHNO` des modèles tagués 1TECHNO

Né de la clôture de `questions-1spe-tangente` ([journal archivé](../archive/wip/questions-1spe-tangente-progress.md),
§ 5) : les voisins Tangente tagués 1TECHNO-079 n'avaient que `grades = ['1_SPE']`. Le relevé montre que c'est
le cas de 53 modèles.

## Reprendre ici

_Mis à jour le 2026-11-03, après #2280 (mergée, migrée) ; #2285 ouverte._

- **État** : #2280 en prod (53 modèles + `1_TECHNO`, vérifié, trigger `O`). **#2285 OUVERTE**, CI en cours au
  `/clear` : deux migrations, `20261103084609_questions_1gen_grades` (21 modèles + `1_GEN`) et
  `20261103085358_questions_terminale_grades` (07bce646 + T_COMP, 4ff9d049 + T_TECHNO) ; tests rouges sans, 9/9 avec ;
  deux audits `security-auditor` sans finding bloquant · **Prochaine action** : `gh pr checks 2285` (suivre le RUN
  du dernier commit de la branche) → verte : `pnpm check:migrations --pr 2285`, `gh pr merge 2285 --merge`, puis
  depuis le dépôt principal `git pull --rebase` + `pnpm db:migrate` (2 migrations attendues seules) ; vérifier en
  prod (plus aucun écart hors exceptions : `pnpm tsx scripts/questions/garde-niveaux-tags.ts` depuis le worktree
  `garde-niveaux-tags`, trigger `O`) · **En attente de David** : rien · **Pièges en cours** : `db:migrate` seulement
  depuis le dépôt principal (worktree non lié) ; `gh pr checks --watch` rend la main trop tôt · **Worktree /
  branche** : `../ubumaths-wt-questions-1techno-grades`, `feat/questions-1gen-grades`. Chantier frère :
  `garde-niveaux-tags` (#2284).

## 1. Relevé MCP prod (2026-11-03)

Modèles ayant au moins un tag dont le point est de niveau `1_TECHNO`, sans `'1_TECHNO'` dans `grades` :
**53** (48 publiés, 5 brouillons : 0495289a, c90fa022, d2067413 en `['1_SPE']` ; a573d517, 1c65d58e en
`['T_COMP']`). Tous les autres en `['1_SPE']`.

Effet : le cahier de texte filtre `.contains('grades', [classData.grade])` (`teacher/cahier-texte/[classId]/[date]/+page.server.ts`) :
une classe de 1re techno n'en voit aucun ; ajouter un niveau ne retire rien aux autres.

## 2. Décisions (David, 2026-11-03)

- Portée : **les 53 modèles 1TECHNO** ; les 1GEN à part.
- Question d'accès (« qui pourra voir quoi, qu'il ne voyait pas avant ? ») : **élargissement voulu** — le prof et
  les élèves d'une classe de 1re techno voient ces modèles publiés ; personne ne perd rien ; aucune policy.

## 3. Même écart en 1GEN (à trancher)

21 modèles (19 publiés) tagués 1GEN-* sans `'1_GEN'` dans `grades` (niveaux `['1_SPE']` ou `['T_COMP']`).
Même correction possible, même question d'accès (classes de 1re générale).

## 4. Migration et test (2026-11-03)

Ajoute `1_TECHNO` aux 53 (ids en dur, niveaux du relevé), `updated_at` préservé ; garde : niveaux EXACTEMENT
ceux du relevé, tout ou rien ; rollback en commentaire. `tests/integration/questions-1techno-grades.test.ts` :
rouge sans la migration (4 échecs + suite nominale tombée au `beforeAll`), vert avec (9/9).

## 5. Audit (2026-11-03)

`security-auditor` : aucun finding bloquant. F1 (les 5 brouillons apparaissent aussi au sélecteur du prof,
accès inchangé) : commentaire de la migration précisé. F2 (atomicité de `db push`) : après `db:migrate`,
vérifier `select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'` = `O`.

## 6. #2280 en prod, puis le lot 1GEN (2026-11-03)

#2280 mergée (CI verte, intégration comprise), `db:migrate` depuis le dépôt principal (seule migration en attente).
Vérifié en prod : plus aucun modèle tagué 1TECHNO sans `1_TECHNO` ; trigger `O` ; voisins Tangente en
`[1_SPE, 1_TECHNO]` ; aucun `updated_at` du lot touché (le seul récent, dc5d7cb6, est d'une autre session, 08:17).

Lot 1GEN validé par David (« oui, fais 1 », même question d'accès : classes de 1re générale). Relevé APRÈS #2280 :
**21 modèles** (19 publiés), 19 en `[1_SPE, 1_TECHNO]` ou `[T_COMP, 1_TECHNO]`, 2 en `[1_SPE]` (8ed02829,
eb9517ed). Migration `20261103084609_questions_1gen_grades.sql` (même forme) + `tests/integration/questions-1gen-grades.test.ts` :
rouge sans (4 échecs, 5 sautés), vert avec (9/9).

Garde d'alerte (option a) : chantier `garde-niveaux-tags`, #2284.

## 7. Les 2 modèles de Terminale, dans #2285 (2026-11-03)

Trouvés par la garde (#2284), tranchés par David (journal `garde-niveaux-tags` § 2) : 07bce646 `[T_SPE]` + T_COMP
(TCOMP-204), 4ff9d049 `[T_SPE, T_COMP]` + T_TECHNO (TTECHNO-089). Migration à part, même PR (un seul `db:migrate`) :
`20261103085358_questions_terminale_grades.sql` + `tests/integration/questions-terminale-grades.test.ts`, rouge sans
(4 échecs, 5 sautés), vert avec (9/9). Les 5 brouillons de seconde restent `['2']` (questions-2de Q7 c).
