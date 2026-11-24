# Relevé « fonction exponentielle » de Première spécialité (2026-11-24)

Chantier [`idees-1re-exponentielle`](idees-1re-exponentielle-progress.md). Les 11 exercices de la
rubrique 1AN3 de l'autre plateforme (1AN30-1, 1AN31-1 à 4, 1AN32-1 et 2, 1AN33-1 à 4), lus dans leur
code source (copie locale, sans les `Old`). Ils sont comparés à nos modèles publiés en prod (MCP en
lecture seule : énoncés, variables et cases des variations). Les ids sont ceux de la plateforme.

**Leur forme** : 1AN30 à 1AN32 se saisissent au clavier : une expression, un ensemble `S = …` ou un
intervalle. 1AN33-1 et 1AN33-2 sont des études en plusieurs questions, sans saisie. 1AN33-3 et
1AN33-4 montrent un tableau de variations dans le corrigé, sans saisie non plus.

**Bornes de 1re** ([1spe.md](../systeme/programmes/bornes/lycee/1spe.md)) :

- pas de logarithme, donc une équation se ramène toujours à eᵘ = eᵛ ;
- dérivées : la seule composée permise est e^{at} (e^{ax + b} = e^b·e^{ax} est déjà utilisé par nos modèles), avec produit et quotient ;
- aucun calcul de limite, donc un tableau de variations sans limites aux bornes.

## Nos modèles (prod, publiés, 1re spé)

| Id court | Titre                                                      | Var. | Point    |
| -------- | ---------------------------------------------------------- | ---- | -------- |
| e6b429b4 | Produit d'exponentielles                                   | 2    | 1SPE-294 |
| 6137a555 | Quotient d'exponentielles                                  | 3    | 1SPE-294 |
| bd45ed7f | Puissance et inverse d'une exponentielle                   | 3    | 1SPE-294 |
| a4272b10 | Simplifier une expression exponentielle                    | 2    | 1SPE-294 |
| c24d21e1 | Exponentielle d'une somme (QCM)                            | 2    | 1SPE-290 |
| 56ec6a7c | Exponentielle de l'opposé (QCM)                            | 2    | 1SPE-404 |
| 68166a11 | Signe de l'exponentielle (vrai / faux)                     | 3    | 1SPE-292 |
| 9a4592bf | Équations particulières ((ax + b)eˣ = 0, e^{ax+b} = k ≤ 0) | 3    | 1SPE-292 |
| e572933c | Résoudre e^(ax+b) = 1                                      | 1    | 1SPE-405 |
| 6fe11613 | Résoudre eᵘ = eᶜ                                           | 2    | 1SPE-405 |
| 7179a3b5 | Résoudre eᵘ = eᵛ (et eᵘ = 1/eᵛ)                            | 2    | 1SPE-405 |
| 6a5e58da | Résoudre eᵘ < eᶜ (c de −9 à 9, écrit e^{c})                | 4    | 1SPE-405 |
| d73d7929 | Résoudre eᵘ ≤ eᵛ                                           | 4    | 1SPE-405 |
| cffdd283 | Dériver une somme d'exponentielle et de polynôme (eˣ)      | 3    | 1SPE-274 |
| 496f958d | Dériver (ax + b)eˣ                                         | 2    | 1SPE-274 |
| 227f2c9c | Dériver e^{ax+b}, e^{−x+b}, e^{ax}                         | 3    | 1SPE-295 |
| 9a04eb9f | Intervalle où f est croissante, f′ = (ax + b)e^{±x}        | 4    | 1SPE-281 |
| a86fc757 | Extremum de (±x + a)eˣ                                     | 2    | 1SPE-401 |
| c7b5130d | Sens de variation de c·e^{kx} (QCM)                        | 5    | 1SPE-283 |
| 15d3aaa0 | Tangente à la courbe de exp en un point                    | 3    | 1SPE-272 |
| 9765d776 | Tangente à la courbe de exp en 0                           | 2    | 1SPE-272 |

Et, autour : f40e8a4a, 5a132ffc, a2852ea5 (courbes) ; 245b4eb1, 22141fa4, ca8f40c2 (modélisation,
suites) ; démonstrations 57e21851, 14e1838e, 98acee83 ; Python a6d5ec1e, 3762e1e9. Aucun brouillon
de 1re sur l'exponentielle.

## Relevé

| Id      | Ce qu'on demande                                                                                                                                                    | Forme chez eux                   | Nos modèles                                      | Verdict                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1AN30-1 | Simplifier : produit, puissance, produit de puissances, **distributivité e^u(e^v + e^w)**, **(e^{mx})^p − e^{nx}e^{ox}**, fractions (exposants entiers, ax, ax + b) | saisie ou QCM                    | e6b429b4, 6137a555, bd45ed7f, a4272b10           | 🟡 manquent le développement (le résultat est une somme de deux exponentielles) et la différence réduite |
| 1AN31-1 | e^{ax+b} = 0 ou = 1 ; e^u = e^v (sans solution si même coefficient)                                                                                                 | saisie `S =`                     | 9a4592bf (= k ≤ 0 → ∅), e572933c, 7179a3b5       | ✅ ; le cas « même coefficient » ne sort chez eux que par hasard                                         |
| 1AN31-2 | Équation produit nul : (ax + b)(e^v + m), (ax + b)(e^v − c), (e^u − c)(e^v − c′), (e^u − c)(e^v + m), (e^u + n)(e^v + m), c ∈ {1 ; e ; 1/e}                         | saisie `S =`                     | 9a4592bf ((ax + b)eˣ = 0 seulement)              | ❌ modèle à écrire                                                                                       |
| 1AN31-3 | Inéquation e^{ax+b} comparé à 0, 1, e, 1/e ; e^u comparé à e^v                                                                                                      | saisie (intervalle)              | 6a5e58da, d73d7929                               | 🟡 manquent « > 0 » (ℝ ou ∅) et les seconds membres écrits 1 et 1/e (chez nous e^{0}, e^{−1})            |
| 1AN31-4 | Inéquation produit : (ax + b)(e^v − c), (e^u − c)(e^v − c′), (ax + b)(e^v + n) comparé à 0                                                                          | saisie (intervalle, réunion)     | aucun                                            | ❌ modèle à écrire                                                                                       |
| 1AN32-1 | Dériver : ae^x + bx + c, (ax + b)eˣ, ke^x/(ax + b), (ax + b)/(ke^x), (ax² + bx + c)eˣ, me^x/(ax² + b), (ax² + bx + c)/eˣ                                            | saisie                           | cffdd283, 496f958d                               | 🟡 manquent le produit par un degré 2 et les quatre quotients                                            |
| 1AN32-2 | Dériver avec e^{kx} : e^{kx}, ae^{kx} + bx + c, (ax + b)e^{kx}, me^{kx}/(ax + b), (ax + b)/e^{kx}, (ax² + bx + c)e^{kx}, me^{kx}/(ax² + c), (ax² + bx + c)/e^{kx}   | saisie (forme factorisée)        | 227f2c9c (e^{ax+b})                              | 🟡 manquent la somme ae^{kx} + bx + c, les produits et les quotients                                     |
| 1AN33-1 | Étude de (ax + b)e^{kx} : f′ factorisée, signe, variations, tangente en un point                                                                                    | sans saisie                      | 9a04eb9f, a86fc757 (k = 1), 15d3aaa0 (exp seule) | 🟡 manquent k ≠ 1, le tableau à remplir, la tangente à (ax + b)e^{kx}                                    |
| 1AN33-2 | f(x) = e^{2x} + 2(b − 1)eˣ − 2bx : f′ = 2(eˣ + b)(eˣ − 1) à vérifier, variations, signe de f, position de la courbe et d'une droite                                 | sans saisie                      | aucun                                            | 🟡 l'étape « variations à partir de f′ = (eˣ − 1)(eˣ + b) » se reprend ; le problème entier, non         |
| 1AN33-3 | Variations de ax + be^x + c, ke^x/(x − c)ⁿ, (ax + b)eˣ                                                                                                              | sans saisie (tableau au corrigé) | a86fc757, 9a04eb9f                               | 🟡 manque le tableau à remplir ; sans ln, le zéro de a + beˣ n'est simple que pour a = −b (racine 0)     |
| 1AN33-4 | Variations de ke^{ax} + c, (px + q)e^{ax}                                                                                                                           | sans saisie (tableau au corrigé) | c7b5130d (ke^{ax} + c)                           | 🟡 (px + q)e^{ax} : même manque que 1AN33-3                                                              |

Compte : 1 ✅, 8 🟡, 2 ❌.

## Ce que leur format fait et pas le nôtre

Rien de bloquant. Leurs études (1AN33-1, 1AN33-2) ne sont pas interactives. Chez nous, le tableau de
variations à compléter (` ```variation ` avec des cases `?`, double barre comprise) fait mieux, et
l'ensemble fini `{a ; b}`, `∅` ou une réunion d'intervalles se saisit dans une case `intervalles`.
