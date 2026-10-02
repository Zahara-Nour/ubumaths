---
title: Fonction exponentielle 1re SPE — questions
date: 2026-10-02
status: #616 mergée ; 21 modèles en brouillon (2026-10-02) ; #618 (équivalence) mergée
---

# Fonction exponentielle 1re SPE — point de reprise

## Commande de David (2026-10-02)

« Même chose sur le thème de la fonction exponentielle » (cf. `suites-1spe-progress.md`).
Aucun modèle de question n'existait. Décisions (« go » sur mes recommandations) :

1. Rangement : thème « Fonctions », domaine « Fonction exponentielle », sous-domaines par notion.
2. `\exp(3x)` accepté comme juste (notation du programme).
3. `\exponentialE` et `\mathrm{e}` traités comme `e` (même valeur, même forme).
4. Périmètre : tout le catalogue (~22 modèles), en brouillon.

## Lot 0 — notations du nombre e (PR #616, branche `fix/notations-euler`)

Avant : `\exponentialE^{3x}` → mauvaise forme (or les touches e / e^□ du clavier virtuel MathLive
par défaut l'insèrent : vérifié dans mathlive 0.110.0), `\mathrm{e}^{3x}` → faux (`\mathrm`
inconnu du parseur), `\exp(3x)` → mauvaise forme. Correctif : `\mathrm{x}` (une lettre) lu comme
la lettre dans `parseLatex(Safe)` ; étape sans pénalité `unifyEulerNotationAST` en tête du
pipeline de `checkForm`. Tests rouges d'abord ; mathAST + questions + ubumark 22152/22152.

## Modèles (branche `feat/exponentielle-1spe`, `scripts/questions/exponentielle-1spe/`)

| Lot | Sous-domaines                                                             |
| --- | ------------------------------------------------------------------------- |
| A   | Propriétés algébriques (1-5), Équations et inéquations (1-5, intervalles) |
| B   | Dérivation (1-3), Variations (1-3)                                        |
| C   | Représentation graphique (1-3), Suites et modélisation (1-2)              |

**21 modèles créés en BROUILLON en production le 2026-10-02** (A : 10, B : 6, C : 5). Chacun :
`question:specs` vert, 150 tirages par variation, réponses recalculées en Python (fractions, sympy
pour B) ; graphiques C : 3000 blocs passés par l'analyse et la scène ; PDF compilés 4/4 (C par son
agent, A+B par moi : fiche de 16 exercices, corrigé relu).

Retouches faites avant la création : `acceptDecimal` sur les solutions d'équations (A-06 à A-08 :
3,5 juste pour 7/2, 2,33 refusé pour 7/3) ; B-05 demande « le plus grand intervalle » (]r;+∞[ est
refusé) ; `\geqslante` / `\leqslante` collés dans 8 énoncés (A-09, A-10) → PDF en échec, corrigé ;
titres sans `e^(…)` brut ; specs `\exp`, `\exponentialE`, `\mathrm{e}` ajoutées (A-02, B-01).

## Défauts du moteur trouvés

- **#618** (faux négatifs, réponse JUSTE comptée fausse) : `(x+1)e^{-x}` ≢ `\frac{x+1}{e^{x}}`
  (numérateur somme) ; `e\times e` ≢ `e^2` ; `(e^2)^n` ≢ `e^{2n}`. Corrigés par `mathast-expert`.
  Limite non mesurée : somme au DÉNOMINATEUR (`\frac{1}{(x+1)e^x}`).
- Non corrigés, contournés dans les modèles :
  - `y=x+1` ≢ `y=1+x` (équivalence d'équations) → `y=` mis dans l'énoncé, la case porte le membre
    de droite (C-02, C-03) ;
  - réponse attendue réduite à `e` (e¹) : « Variable "e" not found » à la génération, et `e` saisi
    pour un attendu `e^{1}` → mauvaise forme → tirages a = 1 exclus ;
  - `{{eval:…}}` contenant e produit `\euler` dans l'attendu → e écrit en dur ;
  - préfixe `x=` non toléré dans une case « x = ? » (contrairement à `S=` dans les intervalles) ;
  - `{{b;+}}` fait échouer le tirage (écrire `{{eval:b;+}}`).

## À trancher par David

- Décimal exact accepté (A-06 à A-08) : cohérent avec les intervalles, où la borne décimale est
  acceptée ; ailleurs la forme stricte (ADR 0013) le refuse.
- Peu de tirages distincts : A-01, B-06, C-01, C-02 (variations figées).
