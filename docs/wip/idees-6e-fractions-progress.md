# Chantier `idees-6e-fractions` : idées reprises d'ailleurs, rubrique « Fractions » de 6e (6N3)

Skill `idees-rubrique`. Rubrique réservée le 2026-11-24 (commit `331a401c9` sur `main`).

## Reprendre ici

_Mis à jour le 2026-11-25, après les verdicts de phase 0._

- **État** : phase 0 tranchée (David suit toutes mes recos, 2026-11-25, voir « Décisions de phase 0 ») ; 13 modèles publiés réservés et outil n° 61 « graduer un segment » ajouté sur `main` (`03398b278`) · **Prochaine action** : écrire le gros lot d'un coup : F1-F12 (export des 13 modèles de prod dans `scripts/questions/idees-6e-fractions-publies/`, variations à la fin), N1-N6 (`docs/wip/questions/idees-6e-fractions-<x>.py`), testSpecs + 3 erreurs prévues par case + coup de pouce ; bornes de `cycle3.md` · **En attente de David** : rien · **Pièges en cours** : N6 va en CM2 (CM2-130), pas de point de 6e pour les multiples ; 6-129 sans modèle tant que l'outil 61 n'existe pas ; fiches détaillées dans la page https://claude.ai/artifact/9zQXcoLFb3GMuoKyrdANzq et `idees-6e-fractions-releve.md` · **Worktree / branche** : `../ubumaths-wt-idees-6e-fractions` / `feat/idees-6e-fractions`

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
