# Relevé « compléments sur la dérivation » de Terminale spécialité (2026-11-23)

Chantier [`idees-tle-derivation`](idees-tle-derivation-progress.md). 14 exercices de la rubrique TSA3
d'une autre plateforme (TSA3-26, 30 à 32, 41 à 50), lus dans leur code source (copie locale, sans les
anciennes versions), comparés à nos modèles publiés en prod (MCP en lecture seule, énoncés et
variables des variations lus). Les trois TCA7 (maths complémentaires) ne font que reprendre TSA3-30,
31 et 32 (√u retiré par défaut) : rien à part. Relevé par deux agents (Sonnet), quelques points
vérifiés dans le code (plages de TSA3-30, tableau de TSA3-32, distracteurs de TSA3-46) ; les verdicts
sont les miens, posés contre nos variations en base. Les ids sont ceux de la plateforme.

**Leur forme** : 8 exercices se saisissent (expression, équation, intervalle, nombre) ou se cochent
(QCM, menus) ; TSA3-32 a un tableau de variations à compléter ; TSA3-45, 49 et 50 sont des sujets
rédigés sans saisie.

## Nos modèles (prod, publiés, Tle spé)

| Id court | Titre                                                             | Var. | Point    |
| -------- | ----------------------------------------------------------------- | ---- | -------- |
| bc1807a1 | Composée de deux fonctions : calculer v∘u                         | 3    | TSPE-407 |
| 8b599a53 | Dériver g(ax + b) ((ax + b)ⁿ, √(ax + b))                          | 3    | TSPE-408 |
| a3fa892a | Calculer une dérivée seconde (degré 3, (ax + b)eˣ, ln, keᵃˣ)      | 4    | TSPE-409 |
| 12ed13ec | Convexité : position par rapport aux sécantes (QCM)               | 3    | TSPE-410 |
| eeb72d3a | Convexité : position par rapport aux tangentes (QCM, abstrait)    | 3    | TSPE-411 |
| 08f9ad7b | Abscisse d'un point d'inflexion (degré 3, f″ donnée, (ax + b)e⁻ˣ) | 3    | TSPE-412 |
| 50feeefd | Dérivée de eᵘ, ln u et u² (e^(ax² + b), ln(ax + b), (ax + b)²…)   | 5    | TSPE-413 |
| f52b93c4 | Dérivée d'une composée : √(x² + c), (x² + b)ⁿ, cos, sin           | 4    | TSPE-413 |
| 723779c8 | Dérivée d'une fonction avec ln                                    | 4    | TSPE-414 |
| 7f13ca89 | Intervalle de croissance d'une fonction avec ln                   | 4    | TSPE-416 |
| e814175b | Inégalité déduite de la convexité (exp, ln, carré, racine ; QCM)  | 4    | TSPE-417 |
| 21840f6c | Reconnaître l'allure d'une courbe à partir de tableaux            | 2    | TSPE-418 |
| 37ce7759 | Convexité : lecture sur la courbe de f (degré 3, QCM)             | 1    | TSPE-419 |
| c4775a3a | Intervalle de convexité par le signe de f″                        | 4    | TSPE-420 |
| aa8e1716 | Démontrer : f″ ≥ 0 ⇒ courbe au-dessus des tangentes               | 4    | TSPE-421 |
| cfd13223 | Convexité et croissance de la dérivée (QCM abstrait)              | 3    | TSPE-585 |
| a80a780f | Caractérisations de la convexité et du point d'inflexion          | 5    | TSPE-586 |
| 98f9d4b2 | Point d'inflexion : lecture graphique (degré 3, QCM)              | 1    | TSPE-587 |
| e3e19d28 | Convexité : lecture sur la courbe de f′ (parabole, QCM)           | 1    | TSPE-588 |
| 9102bbb0 | Point d'inflexion lu sur la courbe de f′ (parabole, cubique)      | 2    | TSPE-589 |
| 225c8682 | Convexité : lecture sur la courbe de f″ (droite, QCM)             | 1    | TSPE-590 |
| 5ffe398a | Point d'inflexion lu sur la courbe de f″ (dont racine double)     | 2    | TSPE-591 |

Aussi : fdbc6cb0 (Lorenz), 9a8bf09c (dérivée n-ième), 8ce83078 (inégalité arithmético-géométrique),
b4096cd8 ; en 1re, 227f2c9c (e^(ax + b)), 496f958d ((ax + b)eˣ), 782bf7f8 et 17f64f63 (f′ et
variations). Aucun brouillon, aucun de ces modèles réservé par une autre session (2026-11-23).

## Relevé

| Id      | Ce qu'on demande                                                                                                                                                      | Forme chez eux                  | Nos modèles                                                   | Verdict                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TSA3-26 | Dériver e^(ax + b), e^(ax² + bx + c) (a parfois décimal), (ax + b)e^(mx) sous forme factorisée                                                                        | saisie                          | 227f2c9c (1re), 50feeefd (e^(ax² + b)), 496f958d (1re, m = 1) | 🟡 manquent le trinôme complet dans l'exponentielle et (ax + b)e^(mx), m ≠ 1, forme factorisée                       |
| TSA3-30 | Dériver uⁿ, eᵘ, √u ; u polynôme de 2 ou 3 monômes (degré ≤ 6) ou u = αe^(kx) + b                                                                                      | saisie, forme imposée           | 8b599a53, 50feeefd, f52b93c4                                  | 🟡 manquent u de degré 3 ou plus (ex. (x³ − 2x)⁴) et u exponentielle (√(e^(2x) + 3), (eˣ − 2)³)                      |
| TSA3-31 | Équation réduite de la tangente en a à uⁿ, eᵘ, √u (u trinôme), fractions irréductibles                                                                                | saisie « y = … »                | aucun en Tle (1re : 05387201, 15d3aaa0)                       | ❌ nouveau modèle                                                                                                    |
| TSA3-32 | f = uⁿ, eᵘ, √u avec u = α(x − x₀)² + k : f′(x) puis tableau de variations (x₀, signes, f(x₀), flèches)                                                                | saisie + tableau à compléter    | 7f13ca89 (ln seulement), 7026a36a (trigo)                     | ❌ nouveau modèle                                                                                                    |
| TSA3-41 | QCM de convexité sur la courbe de f ((x − a)³, tangente horizontale), de f′ (cubique, 3 intervalles), de f″ (parabole)                                                | QCM 4 choix                     | 37ce7759, e3e19d28, 225c8682, 98f9d4b2                        | 🟡 manquent f′ cubique (intervalle de concavité) et f″ parabole (deux intervalles)                                   |
| TSA3-42 | QCM de bac : signes comparés de f, f′, f″ sur un intervalle ; f′ en spline ; nombre d'inflexions sur f″ ; convexité d'après le tableau de variations de f′            | QCM 4 choix                     | 5ffe398a (racine double ✅), e3e19d28, cfd13223 (abstrait)    | 🟡 manquent la convexité lue sur un tableau de variations de f′ et les signes de f′ et f″ lus sur la courbe de f     |
| TSA3-43 | Signe de f(a), f′(b), f″(c) lu sur la courbe de f (positif, négatif, nul), tangentes tracées                                                                          | menus                           | aucun                                                         | ❌ nouveau modèle (f′ et f″ ; le signe de f est du programme de 2de)                                                 |
| TSA3-44 | Coordonnées du point d'inflexion d'un polynôme de degré 3 (entières)                                                                                                  | 2 champs                        | 08f9ad7b (abscisse seule)                                     | 🟡 manque l'ordonnée                                                                                                 |
| TSA3-45 | Convexité de (ax² + bx + c)eˣ, deux points d'inflexion                                                                                                                | rédigé                          | c4775a3a (f″ = (x + a + 2)eˣ donnée)                          | 🟡 manque f″ à calculer avec un trinôme, intervalle [r₁ ; r₂]                                                        |
| TSA3-46 | Reconnaître parmi 4 courbes celle de f, f′ ou f″ à partir d'une autre (6 sens), distracteurs : opposée, décalée, mauvais ordre                                        | QCM 4 courbes                   | 21840f6c (tableau → courbe), 782bf7f8 (1re)                   | ❌ pour f″ ↔ f ; f ↔ f′ est de 1re                                                                                   |
| TSA3-47 | Courbe sinusoïdale (0, 1 ou 2 inflexions), tangentes colorées : intervalle convexe / concave, nombre et abscisses des inflexions, position par rapport à une tangente | intervalle, nombre, liste, menu | 37ce7759, 98f9d4b2 (degré 3, QCM)                             | 🟡 manquent la saisie d'un intervalle, une courbe à 0 ou 2 inflexions, la position par rapport à une tangente tracée |
| TSA3-48 | 2 à 4 tangentes tracées : au voisinage de a, f est convexe ou concave                                                                                                 | menu 2 choix                    | eeb72d3a (abstrait, sans courbe)                              | 🟡 manque la lecture sur une courbe avec tangente tracée                                                             |
| TSA3-49 | Tangente en x₀, convexité (f″ de signe constant), inégalité f(x) ≥ tangente ; f = ax⁴ + bx² + cx + d, aeˣ + bx² + cx + d, ae^(kx) + bx + c                            | rédigé                          | e814175b (exp, ln, carré, racine ; QCM)                       | 🟡 manque l'inégalité à écrire pour une fonction tirée                                                               |
| TSA3-50 | Étude complète de (ax + b)e⁻ˣ + cx + d (limites, f′, f″, inflexion, variations de f′, position par rapport à Δ)                                                       | rédigé                          | 08f9ad7b v2, c4775a3a, modèles de limites                     | ✅ couvert par morceaux, rien à écrire                                                                               |

## Ce que leur format fait et pas le nôtre

- Plusieurs sous-questions sur un même graphique (TSA3-43, 47, 48) : chez nous, une case par
  variation ; on garde l'idée, une question par variation. Pas un outil manquant.
- Le tableau de variations de TSA3-32 se complète chez nous (`?flèche`, `?valeur`) ; ses bornes en ±∞
  restent vides, comme chez eux (aucune limite à cacher, donc pas l'outil n° 50).
- Coordonnées d'un point dans une case : notre format n'a pas de nature « point (x ; y) » ; TSA3-44 se
  réduit à l'ordonnée (l'abscisse est déjà dans 08f9ad7b). Rien à ajouter à `outils-manquants.md`
  (une seule case suffit ici).

## Idées en attente prises ici

- TSA1-44 (suite homographique, étude de f), TSA2-34 (variations d'une homographique), TSA2-52
  (fonction auxiliaire g(x) = eˣ − (ax + b)) : fiche F7.
