# Évaluation écrite 2de « Fonctions » (sujets A et B) — journal

## Reprendre ici

_Mis à jour le 2026-11-05, après la rédaction (aucune PR encore)._

- **État** : sujets A et B rédigés (agent Opus), `assert_all.py` + `check:ubumark` + `fiche:verifier` verts, pages relues ; script `scripts/create-evaluation-fonctions-2nde.ts` commité, **simulation OK** (6 exercices, 2 fiches `assessment` 55 min /20). Correctif du générateur vartable commité (« 0 » de borne non envoyé, plantage du corrigé B).
- **Prochaine action** : `--publier` sur l'accord de David, puis aperçu PDF des deux fiches en prod (points, mention calculatrice) ; PR (correctif + script + doc), CI, merge.
- **En attente de David** : accord pour `--publier`.
- **Pièges en cours** : contenu dans le scratchpad de la session `09504a5e…/scratchpad/eval-fonctions/{A,B}` (perdu au redémarrage : publier avant) ; `fiche:verifier` rend une fiche ordinaire (« [guided] », pas de points) ; « 0 » de borne absent au PDF par choix (outils-manquants.md).
- **Worktree / branche** : `../ubumaths-wt-eval-fonctions` · `feat/evaluation-fonctions-2nde`.

## Cadre (réponses de David, 2026-11-05)

- Source : fiche d'entraînement `41737393` « Fonctions : généralités » (repassée par David en « Fiche d'exercices »).
- Consignes données aux élèves : ensemble de définition, tableau de variation, tableau de signe, extremums, image / antécédent, f(x)=k et f(x)>0, graphiquement ou par calcul.
- **55 min**, **calculatrice interdite**, **deux sujets**, ensemble de définition par le calcul **seulement pour le quotient**.
- Forme (choix de Claude, présenté à David sans objection) : deux fiches « Évaluation : fonctions (sujet A) » / « (sujet B) », type `assessment`, `show_points: true`, `calculator: forbidden`, réponses sur copie (`answers_on_sheet: false`), brouillon, FR + EN, thème `Fonctions`, grade `2`.
- Points ouverts posés à David et tranchés par « je suis tes recos » = plan tel que proposé : puis David a précisé (2026-11-05) : tableaux de signes et de variation **graphiquement seulement** → retirés de l'exercice 3 (17 questions) (pistes d'allègement si besoin : f(1+√3) / f(−2+√2), ensemble de définition de h).

## Plan validé (/20)

### Exercice 1 — Lecture graphique (9 pts)

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

### Exercice 3 — Par le calcul (6 pts)

**David, 2026-11-05 : tableau de signes et tableau de variation SEULEMENT graphiquement** (exercice 1) → aucun tableau dans l'exercice 3.

A : f(x)=(x−1)²−4 sur ℝ | B : f(x)=(x+2)²−9 sur ℝ

1. Images : A f(0)=−3, f(−3)=12, f(1+√3)=−1 | B f(0)=−5, f(−3)=−8, f(−2+√2)=−7
2. Montrer : A f(x)=(x+1)(x−3) | B f(x)=(x+5)(x−1)
3. Résoudre f(x)=0 (produit nul, forme factorisée) : A {−1;3} | B {−5;1}
4. Résoudre : A f(x)=−3 → {0;2} | B f(x)=−8 → {−3;−1} (forme canonique)
5. Montrer f(x) ≥ −4 (A) / ≥ −9 (B), en déduire le minimum : A −4 en 1 | B −9 en −2

Barème révisé : ex. 1 = 9 pts, ex. 2 = 5 pts, ex. 3 = 6 pts.

### Modèles de forme

Énoncés et corrigés de la fiche `41737393` (« Étude graphique complète » `bfc93002`, « Lire le signe d'une fonction » `2b042898`, « Images et valeurs interdites » `ae6783c0`, « Antécédents : carré, inverse, produit nul » `6a9ff764`) : notation `~…~`, blocs ` ```variation ` (`variation:` / `sign:` avec `z`), ensembles `$\mathcal{S}=…$`. Règles : `docs/pratiques/fiches-exercices.md` § 4.

## Historique

- 2026-11-05 : cadrage, recherche des courbes (quotients de trinômes à extremums et zéros entiers), plan validé, worktree créé.
- 2026-11-05 : rédaction par l'agent (aucun écart mathématique ; titres « Évaluation A/B : lecture graphique / fonctions quotients / étude par le calcul »). Corrigé B : plantage vartable sur le « 0 » de borne droite → David : corriger le générateur (pas de 0 en borne au PDF). Script écrit, simulation OK.
