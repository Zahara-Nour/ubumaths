# Chantier `idees-6e-problemes` : idées reprises d'ailleurs, rubrique « Résolution de problèmes » de 6e

Skill [`idees-rubrique`](../../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md) (section Sixième, ligne 6N5 prise le
2026-11-27). Relevé : [idees-6e-problemes-releve.md](idees-6e-problemes-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-27, chantier clos._

- **État** : rubrique **publiée** : les 5 modèles neufs (a06458ad, 4048d9c5 sur 6-142 ; 7dcb0da1
  sur 6-120 ; 60ad8893, 2aae946c sur 5-001, niveaux 6e et 5e) sont rangés (#3220) et publiés,
  validés par David ; les 8 variations des 4 publiés (32b7a9bc, 399342ff, 2af325bb, 7deff4e0) sont
  en prod (#3218) ; réservations levées, journal archivé · **Prochaine action** : aucune ·
  **En attente de David** : rien · **Worktree / branche** : aucun.

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
- 2026-11-27 : **lot écrit.** Scripts `docs/wip/questions/idees-6e-problemes-{neufs,publies}.py`
  → `scripts/questions/idees-6e-problemes-{neufs,publies}/`. `question:specs` vert sur les 9
  fichiers (aperçus relus), `create-questions` en simulation vert (5 à créer). Essai local : 5
  neufs créés en base locale (ids retirés des fichiers ensuite), variations des publiés posées par
  PATCH local ; `/dev/modeles` capturé au format iPhone : balances (N1), schémas en barres de F2
  et F3 justes. Migration `20261127072050_questions_idees_6e_problemes_publies_contenu.sql`
  générée (+3, +2, +1, +2 variations), test d'intégration vert.
  - **Écarts à la fiche** (à dire à David) : F1 somme ou différence des quantités = 10 ou 20
    (calcul de tête, comme le modèle) ; F1 grammes = 100, 200 ou 500 g ; F2 et F3 réponse en
    euros avec l'unité (options des publiés inchangées) ; F3 n2 de 2 à 6 (schéma lisible) ; N2
    somme et produit : somme paire seulement ; N4 choix dans l'ordre de l'énoncé (`melanger:
non`, « Aucune » en dernier) ; N4 v3 toujours « Aucune » (comme la fiche) ; N5 manga : deux
    erreurs prévues (pas de troisième réelle) ; N3 fromages : deux erreurs prévues.
  - Niveaux : N1 3, N2 4 (nombre inconnu, après les 1 et 2 existants), N3 10 (multiplication,
    après 9), N4 2, N5 3 (Décimaux : calculs). Options : espaces dès 4 chiffres partout, zéros
    libres sauf N2 et N4.

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
- 2026-11-27 : #3218 mergée. David a lancé `db:migrate` (contenu) et `create-questions --publier` (5 brouillons, ids vérifiés en prod). Nouveau worktree pour la PR de rangement.
- 2026-11-27 : migration de rangement générée par `migration-rangement.ts` (relevé en prod, 5 neufs
  sans nœud ni tag), test `migrations-rangement-tags` vert.
- 2026-11-27 : #3220 mergée, `db:migrate` (seule migration en attente), garde des niveaux verte. Série
  de relecture des 4 publiés écrite, simulation verte.
- 2026-11-27 : série de relecture publiée par David (1b05dafc).
- 2026-11-27 : relecture validée par David (« je valide », dans la conversation), 5 neufs publiés par
  David (`publier-lot.ts --publier`), statuts relus en prod : 9 publiés. Chantier clos.
