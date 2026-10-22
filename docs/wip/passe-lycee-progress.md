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
