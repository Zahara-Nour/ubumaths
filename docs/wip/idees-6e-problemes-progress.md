# Chantier `idees-6e-problemes` : idées reprises d'ailleurs, rubrique « Résolution de problèmes » de 6e

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md) (section Sixième, ligne 6N5 prise le
2026-11-27). Relevé : [idees-6e-problemes-releve.md](idees-6e-problemes-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-27, phase 0 validée._

- **État** : phase 0 validée (tout oui, recommandations suivies), 4 modèles publiés réservés et
  exportés · **Prochaine action** : écrire le gros lot (`idees-6e-problemes-neufs.py`,
  `idees-6e-problemes-publies.py`), specs, essai local, PR · **En attente de David** : rien ·
  **Pièges en cours** : aucun ·
  **Worktree / branche** : `../ubumaths-wt-idees-6e-problemes`, `feat/idees-6e-problemes`.

## Journal

- 2026-11-27 : rubrique 6N5 réservée (commit sur `main`), worktree créé. Points de 6e « résoudre des
  problèmes » relevés en prod : 6-120 (produits décimaux, 1 modèle), 6-122 (divisions décimales, 1),
  6-124 (division euclidienne, 1), 6-137 (fractions, 1), 6-142 (schémas en barres, 6), 6-119 (ordre de
  grandeur, 1). Aucun point de 6e pour les problèmes additifs seuls : ils relèvent du cycle 3 (CM).
- 2026-11-27 : relevé écrit ([idees-6e-problemes-releve.md](idees-6e-problemes-releve.md)).
- 2026-11-27 : **phase 0 validée** par David dans la conversation (« je suis tes recos », page à
  cocher laissée vide) : F1 à F4 et N1 à N5 oui, R oui ; **Q1** N4 et N5 sur 5-001, niveaux 6e et
  5e ; **Q2** échiquier noté dans `outils-manquants.md` (n° 67, plus tard) ; **Q3** le nombre qui
  tranche remplace le Oui / Non. Réservés sur `main` : 32b7a9bc, 399342ff, 2af325bb, 7deff4e0
  (exportés de prod dans `scripts/questions/idees-6e-problemes-publies/`). Rangement : N1, N2 →
  Algèbre > Premiers pas algébriques > nombre inconnu (6-142) ; N3 → Décimaux : calculs >
  multiplication (6-120) ; N4, N5 → notion Décimaux : calculs (5-001, comme c241cf63).

## Phase 0 (2026-11-27, validée)

Page à cocher : https://claude.ai/artifact/U47s6Dv5142CRoYX3tuFMn (Oui / Non / Autrement + note,
collection `verdicts`). Si tout est oui : 5 modèles neufs (17 variations) et 8 variations sur 4 modèles
publiés. Question d'accès : personne ne gagne d'accès, on range des modèles.

- **F1** 32b7a9bc (6-120) : (a + b) × p ; (n − m) × p ; deux achats au poids dont un en grammes.
- **F2** 399342ff (6-142) : une part et l'écart donnés, total cherché ; phrase retournée, au dixième.
- **F3** 2af325bb (6-142) : n1 articles à p1 et n2 identiques, total donné, prix au centime.
- **F4** 7deff4e0 (6-119) : ordre de grandeur en situation (verger, carrelage ; packs en litres).
- **N1** « Balances : la masse de deux objets » (6-142), 3 variations (figure de d962df2c).
- **N2** « Deux nombres inconnus : billets et devinettes » (6-142), 3 variations.
- **N3** « Problèmes à plusieurs étapes avec des décimaux » (6-120), 4 variations (régime, fromages,
  cagettes, barquettes).
- **N4** « Quelles informations servent ? » (5-001, niveaux 6e et 5e, voir Q1), 3 variations.
- **N5** « Problèmes avec des données inutiles » (5-001, voir Q1), 4 variations.
- **R** rien : 6N5-10, 6N5-11-2, 6N5-11-4, 6N5-11-5, 6N5-13 (couverts).
- **Q1** point de N4 / N5 : 5-001 (niveau suivant permis) ou sans point.
- **Q2** échiquier (tableau à construire) : le noter dans `outils-manquants.md`, plus tard.
- **Q3** le Oui / Non du régime et de la surcharge remplacé par le nombre qui le tranche.
