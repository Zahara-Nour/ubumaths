---
title: Dérivation 1re SPE — questions
date: 2026-10-02
status: lot 0 en cours (2 PR) ; modèles en cours (3 agents)
---

# Dérivation 1re SPE — point de reprise

## Commande de David (2026-10-02)

« Même chose » que suites, exponentielle et trigonométrie. Existant : `a86442c1` (dérivées usuelles,
publié) et `74d77343` (b/x, une variation, astuce `x|x`), cartes de cours « Étude de fonction ».
Décisions validées (« ok » sur mes recommandations) :

1. Faux négatif `\frac{1}{2}x^{-\frac12}` ≢ `\frac{1}{2\sqrt x}` à corriger → `fix/puissances-fractionnaires`.
2. Clé `tangente: f ; a` dans le bloc ```courbe → PR #637.
3. `form: warn` pour « calcule f′(x) » (ADR 0013, la valeur est l'objet) ; `strict` si l'énoncé exige
   une forme (factorisée pour étudier un signe).
4. `74d77343` corrigé en place (astuce retirée, variations ajoutées en fin de liste).
5. Domaine « Dérivation » : Apprivoiser, Nombre dérivé, Tangente, Fonctions dérivées, Variations.

## Modèles (`scripts/questions/derivation-1spe/`)

| Lot | Contenu                                                                                            |
| --- | -------------------------------------------------------------------------------------------------- |
| A   | Nombre dérivé (taux, f′(a) calculé, lu), Tangente (à partir de f(a), f′(a) ; calcul complet ; lue) |
| B   | Fonctions dérivées (polynômes, ku et sommes, produit, quotient, 1/v, composée)                     |
| C   | Variations (signe de f′, intervalles de croissance, extremum degré 3, courbe de f′) + 74d77343     |
