# Chantier questions-1techno-grades — niveau `1_TECHNO` des modèles tagués 1TECHNO

Né de la clôture de `questions-1spe-tangente` ([journal archivé](../archive/wip/questions-1spe-tangente-progress.md),
§ 5) : les voisins Tangente tagués 1TECHNO-079 n'avaient que `grades = ['1_SPE']`. Le relevé montre que c'est
le cas de 53 modèles.

## Reprendre ici

_Mis à jour le 2026-11-03, avant la PR._

- **État** : migration `20261103082130_questions_1techno_grades.sql` + test d'intégration (rouge sans, 9/9
  vert avec) · **Prochaine action** : audit, PR, CI, merge, `db:migrate`, vérifier en prod · **En attente de
  David** : les 21 modèles tagués 1GEN sans `1_GEN` (§ 3) · **Pièges en cours** : aucun · **Worktree /
  branche** : `../ubumaths-wt-questions-1techno-grades`, `feat/questions-1techno-grades`.

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
