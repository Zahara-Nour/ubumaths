# Mathoux — vue de la Chatterie par le professeur — journal

> Branche `feat/mathoux-vue-prof`, worktree `../ubumaths-wt-mathoux-prof`. Démarré le 2026-10-21.
> Suite du § « Hors v1 » de [mathoux.md](../systeme/mathoux.md).

## Reprendre ici

_Mis à jour le 2026-10-21, phase 0 validée._

- **État** : phase 0 validée par David (A : onglet Gamification + page par élève ; B : liste de
  classe lue dans la mémoire seule). Code en cours sur la branche.
- **Prochaine action** : tests rouges → calcul en lecture seule → pages → revue
  (`code-reviewer` + `security-auditor`) → PR.
- **En attente de David** : question d'accès rouverte — le prof ne lit PAS `srs_card_stats` de ses
  élèves (seulement ceux à qui il a assigné un deck) : sans réponse, pas de siestes FSRS en vue prof.
- **Pièges en cours** : la vue prof ne doit JAMAIS écrire la mémoire (elle brûlerait les
  nouveautés de fin de séance de l'élève).
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
- [ ] `readMathouCollection` (lecture seule) + compteurs de classe
- [ ] Pages (onglet Mathoux, Chatterie d'un élève) + composant partagé avec la page élève
- [ ] Doc `docs/systeme/mathoux.md`, revue, PR
