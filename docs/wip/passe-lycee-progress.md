# Passe lycée — progression

Suite de [arbre-notions](arbre-notions-progress.md) (passe décidée par David le 2026-10-21). Décisions :
[ADR 0020 § 7](../adr/0020-arbre-central-programmes-pointeurs.md). Méthode de l'étape a :
[passe-lycee/METHODE.md](passe-lycee/METHODE.md).

## Reprendre ici

_Mis à jour le 2026-10-22, ouverture du chantier._

- **État** : étape a (passe des points) lancée. Relevé fait : 1 105 points actifs du lycée
  (`passe-lycee/points-lycee.csv`, base locale = prod), textes du BO extraits (`passe-lycee/bo/`).
- **Prochaine action** : analyse par programme (agents), consolidation des familles, page à cocher.
- **En attente de David** : rien.
- **Pièges en cours** : seuls les nouveaux programmes comptent ; Tle (spé, compl., techno) = textes de la rentrée
  2027 ; maths expertes = texte de 2019 (seul existant).
- **Worktree / branche** : `../ubumaths-wt-passe-lycee` · `refactor/passe-lycee`.

## Les 5 étapes

a. Passe des points (critère de scission) · b. bornes par point · c. relevé des modèles · d. verdicts en inclusion
stricte · e. page à cocher puis migration des tags. Les 12 modèles sans point s'y traitent.

## Journal

- **2026-10-22 — Ouverture.** David : « dans ce chantier, on ne va travailler uniquement qu'avec les nouveaux
  programmes ». Précision sur la question 1 : deux niveaux — (1a) le point recopie une ligne du BO qui contient
  plusieurs points → **on coupe toujours** ; (1b) puis le critère d'évaluabilité (ADR 0020 § 7).
  Écran de rangement des exercices (51) : noté pour plus tard, hors de ce chantier.
- **2026-10-22 — Puces larges : on les garde (David).** « Il faut garder ce genre de point même s'ils sont larges : on ne
  pourra tout simplement pas les évaluer avec des questions, mais ils font partie du programme. On est plus sur
  l'évaluation par compétence ici. » Consigné dans l'ADR 0020 § 7. Ma reco « laisser la l. 421 retirée » était
  fausse (le retrait du seed, P1 du 2026-10-08, précède les principes du 2026-10-17). À rétablir : puces écartées au
  seed comme trop larges ou « modéliser » — 2de ex-2-099, ex-2-100, 2-332 ; 1re spé ex-129, ex-142, ex-033 ; 1re techno
  « modéliser … suite », « … fonction » ; Tle compl. ex-007, ex-030 ; Tle spé ex-083 (l. 421). Autre catégorie, à
  trancher à part : non repris parce que le BO dit « pas un objectif » ou phrase de présentation / redondance
  (TSPE ex-007, 008, 009, 025 ; TCOMP ex-131 ; 1SPE-062, 1SPE-017, ex-012a).
