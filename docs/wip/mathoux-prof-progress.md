# Mathoux — vue de la Chatterie par le professeur — journal

> Branche `feat/mathoux-vue-prof`, worktree `../ubumaths-wt-mathoux-prof`. Démarré le 2026-10-21.
> Suite du § « Hors v1 » de [mathoux.md](../systeme/mathoux.md).

## Reprendre ici

_Mis à jour le 2026-10-21, code fini, revues en cours._

- **État** : code, tests et doc faits sur la branche (non poussée) ; revues `code-reviewer` +
  `security-auditor` lancées.
- **Prochaine action** : si la session a été vidée avant leurs rapports, RELANCER les deux revues
  (diff `origin/main...HEAD`) ; corriger les findings → push → PR → CI verte → merge → `db:migrate`
  (policy `srs_card_stats`, additive, 4 conditions) → vérification manuelle notée.
- **En attente de David** : rien (accès tranché : le prof lit les cartes de révision de ses élèves).
- **Pièges en cours** : la vue prof ne doit JAMAIS écrire la mémoire (elle brûlerait les
  nouveautés de fin de séance de l'élève). Policy appliquée à la main sur la base locale (psql).
- **Worktree / branche** : `../ubumaths-wt-mathoux-prof` · `feat/mathoux-vue-prof`.

## Phase 0 (validée par David le 2026-10-21)

Question d'accès : personne ne lit rien de neuf. Le prof lisait déjà `student_mathoux`
(`is_my_student`, `is_teacher_or_admin`), `student_point_state` et `srs_card_stats` ; la vue ne fait
que les afficher.

Nominal :

1. Onglet « Mathoux » à côté de « Palotins » (Gamification) : une carte par classe active ;
   dépliée, la liste des élèves avec « 7 Mathoux, dont 2 grands matous ».
2. Un clic sur un élève ouvre sa Chatterie en lecture seule
   (`/dashboard/teacher/students/[id]/chatterie`) : mêmes races, dessins, noms, stades, étoiles,
   siestes ; ni « Réveiller » ni « Faire grandir ». Retour vers l'onglet Mathoux.
3. L'ouvrir ne change rien chez l'élève : ses nouveautés de fin de séance restent intactes.

Limites :

4. Élève sans niveau : « Pas encore de niveau : pas de Chatterie ».
5. Élève sans Mathou : « Aucun Mathou » dans la liste ; sa page montre les silhouettes.
6. La liste compte la mémoire seule (une requête, pas 40 par élève) : un Mathou né depuis la
   dernière visite de l'élève n'y paraît qu'après ; la page de l'élève est toujours exacte. Pas de
   siestes dans la liste.

Erreurs :

7. Élève hors de ses classes → 403 (`verifyTeacherStudentWithRole`) ; identifiant invalide → 400.
8. Lecture en échec → « La Chatterie est fermée pour l'instant », jamais une collection vide.

## Avancement

- [x] Tests rouges (intégration : lecture prof sans écriture, compteurs de classe)
- ⚠️ 2026-10-21 : le test montre que la sieste « carte due » manque à la vue prof. Policy
  « Teachers can view stats for assigned decks » : le prof ne lit les cartes d'un élève que s'il
  lui a assigné un deck. La doc `mathoux.md` (« et le professeur ») était fausse. Les siestes
  « point perdu » (`student_point_state`) passent.
- [x] Question d'accès rouverte, tranchée par David : policy SELECT `is_my_student(user_id)` sur
      `srs_card_stats` (migration `20261021173000`). Une seule PR (une policy ne change aucun type) ;
      tests vérifiés rouges sans elle (3 échecs), verts avec.
- [x] `readMathouCollection` (lecture seule) + `loadMathouxCountsByStudent`
- [x] Pages (onglet Mathoux, Chatterie d'un élève) + `ChatterieRaces` partagé avec la page élève
- [x] Doc : `mathoux.md` § Vue du professeur, `base-de-donnees.md`, `comptes-classes-ecoles.md`,
      `jeux-et-economie.md`
- [ ] Revue, PR, merge, `db:migrate`
