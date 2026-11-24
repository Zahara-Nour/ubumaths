# Relevé « fonctions affines et linéaires » de Troisième (2026-11-24)

Chantier [`idees-3e-fonctions-affines`](idees-3e-fonctions-affines-progress.md). 13 exercices d'une
autre plateforme (codes 3F2, anciennes versions exclues), lus dans leur code source par un agent ;
trois d'entre eux importent un exercice de Seconde (lu aussi). Verdicts face à nos modèles :
§ Verdicts ; fiches de phase 0 dans le journal.

## Notes de lecture brutes

- **3F20** — Fonction **linéaire**, 8 types : image par l'expression, image quand on connaît
  f(x₀) = y₀, image par un point de la droite tracée ; les trois mêmes pour l'antécédent ;
  expression f(x) = ax par f(x₀) = y₀ ou par le graphique. x₀ impair de 5 à 21, a ∈ ±[2 ; 10] ou
  fraction ±p/x₀. Saisie ; fraction jugée par égalité. Corrigé : a = y₀/x₀ puis f(x) = ax.
- **3F20-1** — Les mêmes 8 types pour f(x) = ax + b : f(0) = b et f(x₀) = y₀ donnés (ou lus sur
  la droite), on retrouve a puis on calcule. x₀ impair de 5 à 11, b ∈ ±[1 ; 10], a ∈ ±[2 ; 8] ou
  fraction. Corrigé : b = f(0), a = (y₀ − b)/x₀.
- **3F20-2** — Mélange de 3F20 et 3F20-1, rien de propre.
- **3F20-3** (importe une Seconde) — **Tracer** la droite de f(x) = ax + b dans une figure
  interactive (points, droite), jugée par deux points (0 ; b) et (1 ; a + b). a ∈ [−4 ; 4] (0
  possible : fonction constante), b ∈ {0, ±1…±3} ; option a = k/2. Corrigé : A(0 ; b), puis
  « avancer de 1, monter de a ».
- **3F20-4** — Coefficient directeur et ordonnée à l'origine **lus sur l'expression**, deux cases.
  12 formes : ax + b, b + ax, ax, b, (a/c)x + b/d, avec racine carrée, (ax + b)/c, c(ax + b),
  ax + b + cx, ax + b + c, ax + b + cx + d, x/c + b/d. Coefficients de [−9 ; 9] sans −1, 0, 1.
  Corrigé : réécrire sous la forme mx + p.
- **3F21 / 3F21-1** — Une à cinq droites tracées : « donner l'expression de f₁, f₂… ». Pente
  entière de [−3 ; 3], en demis ou en quarts ; ordonnée à l'origine entière, petite. Saisie
  « f(x) = », jugée comme fonction. Corrigé : b = f(0), f(1) = a + b. 3F21 : linéaires seules.
- **3F21-2** — **Deux images données** : « f est affine, f(x₁) = y₁ et f(x₂) = y₂ ; donner
  f(x) ». 5 cas : constante, l'un des x vaut 0, x₂ = x₁ + 1, quelconque à coefficients entiers,
  quelconque à coefficients fractionnaires. Valeurs de [−5 ; 5]. Saisie de l'expression.
  Corrigé : a = (y₂ − y₁)/(x₂ − x₁), puis b.
- **3F21-3** — Une droite tracée ; trois cases : ordonnée à l'origine, coefficient directeur,
  expression. a ∈ ±[1 ; 5] ou demis, b ∈ ±[1 ; 4] (0 si linéaire). Corrigé dessiné : point sur
  l'axe des ordonnées entouré, triangle de pente.
- **3F23** — **Intersection** de deux droites d'équations données, par le calcul : abscisse puis
  ordonnée, deux cases, fractions possibles. Coefficients de [−9 ; 9].
- **3F23-1** — **Antécédent par le calcul** : f(x) = ax + b (petits ou grands coefficients),
  a(x + b) + c, a(bx + c) + dx + e. Réponse en fraction irréductible ou entier. Option QCM dont
  les leurres sont des erreurs d'élève : distributivité oubliée, réduction incomplète, image prise
  pour l'antécédent, signe non changé, quotient inversé, division oubliée.
- **3F23-2** (importe une Seconde) — f(x) = (a/d)x + b/2 : deux images, deux antécédents, puis
  « laquelle des quatre droites représente f ? » (leurres : (a ; −b), (b ; a), droite par (0 ; a)
  et (b ; 0)).
- **3F24DNB-1** — Sujet de brevet sans saisie : parabole (x + c)(x + d) lue, « est-elle affine ? »,
  tableau par lecture, formule de tableur ; g affine (images, antécédent, tracé) ; f(x) = g(x) par
  produit nul.

### Ce que leur format fait et pas le nôtre

- **Plusieurs droites à lire dans un seul repère** (3F21-1, jusqu'à 5) : notre ` ```courbe ` porte
  plusieurs fonctions ; on garde une droite par question (plus lisible, une case par question).
  Rien ne manque.
- **Tracer une droite** (3F20-3) : notre geste `tracer:` du bloc ` ```courbe ` (modèle de Seconde
  8d4bd94d) le fait. Rien ne manque.
- **Animation de la pente** dans le corrigé (3F23-2) : pas chez nous ; le corrigé ` ```courbe ` peut
  porter les points (0 ; b) et (1 ; a + b). Pas un manque à noter.

Aucun outil manquant pour cette rubrique.

## Verdicts (2026-11-24)

Comparés aux modèles de prod (MCP, lecture seule, variations et variables lues). 3e : 81dda1bd
(image, linéaire, 3-064, 4 variations), 15ddcc75 (image, affine, 3-066, 1), 7c07749c (point sur la
droite, 3-066), 7c7b7593 (image ou antécédent par une formule, 3-040, 5 : antécédents entiers de
ax et ax + b), 45247528 (linéaire et proportionnalité, 3-043, 4 : coefficient par un tableau ou
par f(n), deux contextes), 4aaa75c0 (images puis placer les points, 3-039), 0612be84 (reconnaître
une linéaire, 3-041), 0d43f797, 1c5bce2c (reconnaître une affine, 3-044), 2d29792b (vocabulaire :
nommer a et b, QCM, 3-044), c64028b0 (lire l'ordonnée à l'origine, 3-045), 0d0e88f5, b9771108
(lire le coefficient directeur, 3-067), eb04ebf7, 77500c81 (f(x) = k, f(x) ⩽ k, 3-042, 3-065),
27ac630c (brouillon, relier droite et fonction, 3-067, en attente d'essai de David). 2de :
8d4bd94d (tracer une droite, 2-316), 6e074f0e (droite par deux points), 718b7183 (intersection,
2-319), d49de3f3 (f(x) = k algébrique, 2-455). Bornes : `cycle4.json` ; BO 3e
(`transcriptions/cycle-4/3-fonctions.md`) : « Définir et utiliser les fonctions affines »,
« Déterminer graphiquement les coefficients d'une fonction affine ».

| Id        | Nos modèles                                            | Verdict                                                                                      | Fiche |
| --------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----- |
| 3F20      | 81dda1bd, 7c7b7593 v4, 45247528 v1-v2                  | 🟡 manque l'expression f(x) = ax à partir de f(x₀) = y₀, puis image ou antécédent d'un autre | F3    |
| 3F20-1    | 15ddcc75, 7c7b7593 v5                                  | 🟡 manque l'expression par f(0) et f(x₀) ; image avec coefficient fractionnaire              | F1 N2 |
| 3F20-2    | —                                                      | mélange de 3F20 et 3F20-1                                                                    | —     |
| 3F20-3    | 8d4bd94d (2de) ; 4aaa75c0 (placer des points calculés) | ❌ en 3e : tracer la droite d'une fonction affine                                            | N4    |
| 3F20-4    | 2d29792b (nommer a et b, QCM)                          | ❌ lire a et b sur une expression écrite autrement que ax + b                                | N1    |
| 3F21      | 0d0e88f5 (coefficient seul)                            | 🟡 manque l'expression complète lue sur la droite                                            | N3    |
| 3F21-1    | c64028b0, 0d0e88f5, b9771108 (lectures séparées)       | 🟡 idem                                                                                      | N3    |
| 3F21-3    | idem                                                   | 🟡 idem                                                                                      | N3    |
| 3F21-2    | 6e074f0e (2de, équation de droite par deux points)     | ❌ en 3e : fonction affine par deux images                                                   | N2    |
| 3F23      | 718b7183 (2de, 2-319)                                  | hors des points de 3e ; la Seconde le couvre                                                 | —     |
| 3F23-1    | 7c7b7593 v4-v5 (antécédents entiers de ax, ax + b)     | 🟡 manque a(x + b) + c, l'antécédent fractionnaire, les erreurs prévues                      | F2    |
| 3F23-2    | 15ddcc75, 7c7b7593, 27ac630c (brouillon)               | ✅ tout est couvert                                                                          | —     |
| 3F24DNB-1 | 1c5bce2c, d820232a, 6ad254b4, 7c7b7593                 | rubrique « brevet », à faire en dernier                                                      | —     |
