# Évaluation écrite 2de « Fonctions » (sujets A et B) — journal

## Reprendre ici

_Mis à jour le 2026-11-05, avant la rédaction (aucune PR encore)._

- **État** : plan de contenu validé par David (« je suis tes recos », 2026-11-05) ; rien de rédigé, rien en base.
- **Prochaine action** : lancer UN agent `pedagogy-expert` (model **opus**) avec le brief du § « Plan validé » ci-dessous → dossier scratchpad (`md/ sol/ en/ sol-en/`, `plan.json`, `verif/assert_all.py`, `pnpm check:ubumark` à 0) ; puis `pnpm fiche:verifier`, relecture des pages, script `scripts/create-evaluation-fonctions-2nde.ts` (copie de `create-fonctions-generalites-2nde.ts`, DEUX fiches `type: 'assessment'`, `points` par exercice), simulation montrée à David, `--publier` sur son accord seulement.
- **En attente de David** : rien avant la simulation.
- **Pièges en cours** : le bloc ` ```courbe ` ne trace que des formules → courbes choisies pour que tout se lise sur un nœud (vérifié en fractions exactes) ; titres d'exercices uniques dans le thème `Fonctions`.
- **Worktree / branche** : `../ubumaths-wt-eval-fonctions` · `feat/evaluation-fonctions-2nde`.

## Cadre (réponses de David, 2026-11-05)

- Source : fiche d'entraînement `41737393` « Fonctions : généralités » (repassée par David en « Fiche d'exercices »).
- Consignes données aux élèves : ensemble de définition, tableau de variation, tableau de signe, extremums, image / antécédent, f(x)=k et f(x)>0, graphiquement ou par calcul.
- **55 min**, **calculatrice interdite**, **deux sujets**, ensemble de définition par le calcul **seulement pour le quotient**.
- Forme (choix de Claude, présenté à David sans objection) : deux fiches « Évaluation : fonctions (sujet A) » / « (sujet B) », type `assessment`, `show_points: true`, `calculator: forbidden`, réponses sur copie (`answers_on_sheet: false`), brouillon, FR + EN, thème `Fonctions`, grade `2`.
- Points ouverts posés à David et tranchés par « je suis tes recos » = plan tel que proposé : tableau de signes d'un produit par le calcul GARDÉ ; sens de variation ADMIS (« on admet que… ») ; les 18 questions GARDÉES (pistes d'allègement si besoin : f(1+√3) / f(−2+√2), ensemble de définition de h).

## Plan validé (/20)

### Exercice 1 — Lecture graphique (8 pts)

Courbes (bloc ` ```courbe `, grille 1 ; 1) :

- **A** : `f(x) = -3*(x+3)*(x-1)/(x^2-2*x+3) sur [-3 ; 6]` — f(−3)=0, f(−1)=2, f(0)=3 (max), f(1)=0, f(2)=−5, f(3)=−6 (min), f(6)=−5.
- **B** : `f(x) = -3*(x+2)*(x-2)/(x^2+4*x+6) sur [-7 ; 2]` — f(−7)=−5, f(−4)=−6 (min), f(−3)=−5, f(−2)=0, f(−1)=3 (max), f(0)=2, f(2)=0.

Questions (A | B) :

1. Ensemble de définition : [−3 ; 6] | [−7 ; 2]
2. Images : f(−1)=2, f(2)=−5 | f(0)=2, f(−3)=−5
3. Antécédents de −5 : 2 et 6 | −7 et −3
4. Résoudre f(x)=3 : {0} | {−1}
5. Tableau de signes : 0 en −3, + sur ]−3;1[, 0 en 1, − sur ]1;6] | − sur [−7;−2[, 0 en −2, + sur ]−2;2[, 0 en 2
6. f(x)>0 : ]−3 ; 1[ | ]−2 ; 2[
7. Tableau de variation : ↗ [−3;0] ↘ [0;3] ↗ [3;6] (0, 3, −6, −5) | ↘ [−7;−4] ↗ [−4;−1] ↘ [−1;2] (−5, −6, 3, 0)
8. Extremums : max 3 en 0, min −6 en 3 | max 3 en −1, min −6 en −4

### Exercice 2 — Quotients (5 pts)

1. D de g : A g(x)=(3x+1)/(2x−5) → ℝ∖{5/2} | B g(x)=(5x−1)/(2x+3) → ℝ∖{−3/2}
2. D de h : A h(x)=4/(x²−9) → ℝ∖{−3;3} | B h(x)=6/(x²−4) → ℝ∖{−2;2}
3. g(0), g(1/2) : A −1/5, −5/8 | B −1/3, 3/8
4. Antécédent de 2 par g : A 11 | B 7 (vérifier ≠ valeur interdite)

### Exercice 3 — Par le calcul (7 pts)

A : f(x)=(x−1)²−4 sur ℝ | B : f(x)=(x+2)²−9 sur ℝ

1. Images : A f(0)=−3, f(−3)=12, f(1+√3)=−1 | B f(0)=−5, f(−3)=−8, f(−2+√2)=−7
2. Montrer : A f(x)=(x+1)(x−3) | B f(x)=(x+5)(x−1)
3. Résoudre : A f(x)=−3 → {0;2} | B f(x)=−8 → {−3;−1}
4. Tableau de signes du produit puis f(x)>0 : A ]−∞;−1[∪]3;+∞[ | B ]−∞;−5[∪]1;+∞[
5. Montrer f(x) ≥ −4 (A) / ≥ −9 (B), en déduire le minimum : A −4 en 1 | B −9 en −2
6. Sens de variation admis (décroissante puis croissante), tableau de variation.

### Modèles de forme

Énoncés et corrigés de la fiche `41737393` (« Étude graphique complète » `bfc93002`, « Lire le signe d'une fonction » `2b042898`, « Images et valeurs interdites » `ae6783c0`, « Antécédents : carré, inverse, produit nul » `6a9ff764`) : notation `~…~`, blocs ` ```variation ` (`variation:` / `sign:` avec `z`), ensembles `$\mathcal{S}=…$`. Règles : `docs/pratiques/fiches-exercices.md` § 4.

## Historique

- 2026-11-05 : cadrage, recherche des courbes (quotients de trinômes à extremums et zéros entiers), plan validé, worktree créé.
