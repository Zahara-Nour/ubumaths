# Chantier `idees-1re-variables-aleatoires`

## Reprendre ici

_Mis à jour le 2026-11-26, après #3203._

- **État** : phase 0 validée ; modèle neuf `f1-loi-de-x-tableau-a-completer` mergé (#3203), pas
  encore en prod.
- **Prochaine action** : après la création du brouillon en prod, commiter l'id écrit en tête du
  fichier, puis migration de rangement (`migration-rangement.ts --dir
scripts/questions/idees-1re-variables-aleatoires-neufs`), `security-auditor`, PR, `db:migrate`.
- **En attente de David** : `pnpm tsx scripts/create-questions.ts --dir
scripts/questions/idees-1re-variables-aleatoires-neufs --publier` (brouillon en prod).
- **Pièges en cours** : second tag 1TECHNO-095 non posé par `migration-rangement.ts`
  (`outils-manquants.md` n° 66) ; la saisie scriptée des cases d'un tableau dans l'aperçu
  n'active pas « Valider » (jugement vérifié par les specs seulement).
- **Worktree / branche** : aucun (retiré après #3203) ; le suivant sur `origin/main`, même sujet.

## Historique

- 2026-11-26 : rubrique prise (commit direct sur `main`). La rubrique n'a qu'un exercice (1P20-1, trois
  situations). 21 modèles publiés sur les points 1SPE-347 à 358, aucun brouillon ; aucun ne fait
  remplir la loi entière.

- 2026-11-26 : page à cocher publiée ; David : « je valide » (aucun verdict coché : lu comme un oui
  à F1 et à mes recommandations Q1, Q2). Modèle neuf `f1-loi-de-x-tableau-a-completer` : v0 cartes
  (32 ou 52), v1 loterie (prix déduit), v2 deux tirs ; grades 1_SPE + 1_TECHNO, tag 1SPE-355.
  Specs : une violation `reducedFractions` comptée **par case** non réduite ; message réécrit
  `P \left( X = 2 \right)`. Essai local : brouillon créé (id local retiré du fichier), aperçu
  vu (`pnpm voir`), sans erreur de console. PR #3203 mergée (CI verte).
