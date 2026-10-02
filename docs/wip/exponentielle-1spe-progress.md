---
title: Fonction exponentielle 1re SPE — questions
date: 2026-10-02
status: lot 0 en PR (#616) ; modèles en cours (3 agents)
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

Specs `\exp` / `\exponentialE` / `\mathrm{e}` à ajouter après le merge de #616.
