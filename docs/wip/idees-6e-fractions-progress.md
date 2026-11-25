# Chantier `idees-6e-fractions` : idées reprises d'ailleurs, rubrique « Fractions » de 6e (6N3)

Skill `idees-rubrique`. Rubrique réservée le 2026-11-24 (commit `331a401c9` sur `main`).

## Reprendre ici

_Mis à jour le 2026-11-25, après #3126, `db:migrate` et la relecture de David._

- **État** : migrations vérifiées en prod (6 neufs rangés et tagués, 13 publiés aux bons nombres de variations). David a validé les modèles (« je valide les modèles », 2026-11-25) **par message** : aucun verdict en base (`question_template_reviews` vide pour ce lot).
- **Prochaine action** : `pnpm tsx scripts/questions/garde-niveaux-tags.ts`, puis `pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/idees-6e-fractions-neufs` en simulation (prod, lecture), puis donner à David la commande `!` avec `--publier`. Les 13 publiés n'ont rien à publier (variations déjà en ligne par la migration de contenu).
- **En attente de David** : le `--publier` des 6 neufs, après la simulation.
- **Pièges en cours** : N6 (517dce40) en CM2. Ensuite : tableau de répartition (rubrique « publiée », réservations des 13 modèles levées) et versement du journal.
- **Worktree / branche** : aucun ; doc seule → commit direct sur `main`.

## Décisions de phase 0 (David, 2026-11-25 : « je suis tes recos »)

- **Oui** : F1 à F12 (variations de 93147367, 000368e1, 6fdcdda1, c415d81d, 5aa1d44c, afebbb91 + 6818662d, 83c835bb, 58bbee5d, 0be55013, 5cd25c2b, f9e9637c, 5c8a6da6), N1 à N6 (N6 en CM2-130).
- **Rien** : R1 à R4.
- **Q1** : oui, « graduer un segment » ajouté à `outils-manquants.md` (n° 61). **Q2** : non.
- **Question d'accès** : personne ne gagne d'accès.
- Priorités si le lot devait rétrécir : F7, F9, N1, N2 ; les plus faibles : F12, N6.

## Couverture des points de 6e en prod (2026-11-24, avant le lot)

Points des fractions et des pourcentages (6-125 à 6-141, 6-203, 6-205) : modèles publiés par point.

- **0 modèle** : 6-129 « Graduer un segment de longueur donnée », 6-138 « Inventer des problèmes » (hors de portée d'une question jugée).
- **1 modèle** : 6-126 définition du quotient, 6-127 égalités à trous multiplicatives, 6-128 placer une fraction, 6-130 entier / décimal / non décimal, 6-134 ranger des fractions, 6-137 problèmes de fractions, 6-139 sens d'un pourcentage, 6-203 encadrer une fraction.
- **2 à 6 modèles** : 6-125, 6-131 à 6-133, 6-135, 6-136, 6-140, 6-141, 6-205.

## Historique

- 2026-11-24 : rubrique prise, worktree créé. Liste des modèles de prod (non archivés, 1079) relevée pour la comparaison.
- 2026-11-24 : relevé en quatre lots (agents Sonnet), verdicts relus dans le code et en prod (6N3F corrigé en ✅). Phase 0 publiée.
- 2026-11-25 : David suit toutes les recos de phase 0. Modèles réservés, outil 61 ajouté sur `main`.
- 2026-11-25 : lot écrit (§ « Lot écrit »).

## Lot écrit (2026-11-25)

- **Publiés** (variations à la fin) : 93147367 +2 (F1), 000368e1 +2 (F2), 6fdcdda1 +2 (F3), c415d81d +2 (F4), 5aa1d44c +2 (F5), afebbb91 +1 et 6818662d +1 (F6), 83c835bb +2 (F7), 58bbee5d +2 (F8), 0be55013 +2 (F9), 5cd25c2b +2 (F10), f9e9637c +2 (F11), 5c8a6da6 +1 (F12).
- **Neufs** : N1 « Lire une fraction par la définition du quotient » (6-126, niveau 16), N2 « Placer une fraction sur une demi-droite graduée en 1/d » (6-128, 14), N3 « Mettre deux fractions au même dénominateur » (6-132, 10), N4 « Situer une fraction par rapport à 1/2 et à 1 » (6-133, 18), N5 « Appliquer un pourcentage en le décomposant » (6-141, 9), N6 « Le labyrinthe des multiples » (CM2-130, 18). Niveaux : premier libre de la sous-notion en prod le 2026-11-25.
- **Vérifié** : `create-questions` en simulation (19 fichiers verts), `question:specs` (specs et 50 tirages par variation), `sonde-horloges` (0 problème, 600 droites), aucun `{{…}}` non résolu sur 40 aperçus par modèle. Base locale : les 6 neufs et une copie brouillon des 13 publiés créés, aperçus admin regardés avec `pnpm voir` (N1, N2, N4, N6 : 0 erreur de console), puis supprimés de la base locale.
- **Écarts à la fiche, à confirmer par David** :
  - F6 (6818662d) : la variation 0 compare déjà deux fractions de part et d'autre de 1 avec des dénominateurs différents. À la place : une fraction égale à 1 (n/n) face à une fraction plus petite, égale ou plus grande que 1 (leur cas « 5/5 et 7/7 »).
  - F6 (afebbb91) : la réponse n'est pas toujours « = » (sinon elle se devine) : la seconde fraction vaut k·a/k·b, ou son numérateur est à 1 près.
- **Autres choix** : F9 demande l'écriture décimale (le juge du modèle refuse 27/2, ses options jugent toutes les variations) ; F10 garde un total ≤ 990 (pas d'espace des milliers dans `${{N}}$`) ; F2 n'a que 2 erreurs prévues par case, F4 (trou au dénominateur) et F8 (segments) une seule, faute d'autre erreur réelle.

## Brouillons en prod, migrations (2026-11-25)

- David a lancé `create-questions --publier` : 6 brouillons, vérifiés par MCP (statut, niveau, sans nœud). Niveaux relevés de nouveau : toujours libres.
- `migration-rangement.ts` : 6 « rangé ». `migration-contenu.ts` : 13 « migré » (+23 variations, specs). Tests `migrations-rangement-tags` et `migrations-contenu-publie` verts (256 passés).
- `security-auditor` : aucun finding bloquant ; deux faibles hérités du générateur (`set local lock_timeout` sans effet hors transaction explicite, `disable trigger` = verrou bref), identiques aux migrations jumelles déjà mergées.

## #3126 mergée, migrations en prod (2026-11-25)

- CI verte, `pr:merger` a mergé (e9981fa3c). Seules ces deux migrations étaient en attente en prod ; `db:migrate` lancé par David.
- Écarts F6 (6818662d : fraction égale à 1 ; afebbb91 : « = » une fois sur deux) : David « je te suis ».
