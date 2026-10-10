# DSL de géométrie — référence des builtins

Référence de ce qu'on peut écrire dans un script de figure (éditeur `GeometryCanvas`, bloc
ubumark ` ```figure `, constructions animées). Vue d'ensemble du système : [README.md](README.md).

> **Source de vérité** : `BUILTIN_NAMES` (92 noms) et la table `HANDLERS` (92 entrées, mêmes
> noms) dans `src/lib/geometry-core/dsl/builtins.ts`. Les formes acceptées par chaque builtin sont
> aussi celles que liste son message d'erreur (`DslRuntimeError` → champ `forms`) : en cas de
> doute, lire le handler `handleXxx`.
>
> Vérifié contre le code le 2026-10-10.

---

## 1. Le langage en bref

| Construction              | Exemple                                                     | Code                                |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Affectation, commentaire  | `A = point(0, 0)  # origine`                                | `parser.ts`                         |
| Arguments nommés          | `cercle(O, rayon=2, couleur="rouge")`                       |                                     |
| Tuple, déstructuration    | `(M, N) = extremites(s)`                                    | `destructuring`                     |
| Nom indexé                | `P[i] = point(i, 0)`                                        | `indexedAssignment`                 |
| Boucles (1000 tours max)  | `pour i de 0 a n - 1:` · `pour x dans liste:`               | `forRange`, `forIn`                 |
| Condition                 | `si … :` / `sinon:`                                         | `if`                                |
| Macro utilisateur         | `macro creer(x, y):` … `retourne P` (profondeur ≤ 10)       | `macro-registry.ts`                 |
| Coordonnée réactive       | `A.x`, `A.y` (seules propriétés acceptées)                  | `interpreter.ts` (`propertyAccess`) |
| Fonctions mathématiques   | `sqrt abs sin cos tan asin acos atan`                       | `MATH_FUNCTIONS`                    |
| Constantes                | `\pi`, `inf` / `+inf` / `-inf`                              | `interpreter.ts`                    |
| Unité d'angle             | `unite_angle("degres")` (défaut) / `unite_angle("radians")` | appel spécial, hors `BUILTIN_NAMES` |
| Calcul sur vecteurs       | `u + v`, `3*u`, `-u`                                        | `interpreter.ts` (`isVectorValue`)  |
| Directive (animation)     | `@pause(500)`, `@instrument("regle")`                       | `DslDirective` → `onDirective`      |
| Décorateur (chorégraphie) | `d = mediatrice(A, B) @euclide @complet -arcs`              | `parseTrailingDecorators`           |

- Mots réservés : `KEYWORDS` (`dsl/keywords.ts`). Identifiants : lettres latines, chiffres,
  lettres grecques Unicode (`Ω = point(0, 1)`) ; `α` et `alpha` sont deux noms différents, `π`
  est un nom ordinaire (la constante s'écrit `\pi`).
- Une expression « mathématique pure » (nombres, identifiants, opérateurs, fonctions non-builtins)
  est confiée à mathAST et reste **exacte** (`math-pure-expr.ts`) ; dès qu'un opérande est un
  curseur ou un scalaire, le résultat devient un scalaire réactif.
- Une macro utilisateur du même nom qu'un builtin le remplace. `dsl/stdlib.ts` est vide :
  toutes les anciennes macros sont devenues des builtins TypeScript.
- Limites : script ≤ 100 000 caractères (`MAX_DSL_SOURCE_LENGTH`), 1 000 tours par boucle, budget
  `maxSteps` optionnel (`InterpretOptions`, utilisé par le bloc ` ```figure `).

## 2. Arguments communs (style)

Acceptés par tout builtin qui crée un objet visible (`STYLE_ARGS`, appliqués par `applyInlineStyle`)
et par `style(X, …)` / `montre(X, …)` :

| Argument                                                 | Valeurs                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `couleur`                                                | nom (`bleu rouge vert orange violet jaune cyan marron rose gris noir blanc`, synonymes anglais acceptés) ou hexadécimal |
| `trait` (alias `style`)                                  | `"continu"`, `"tirets"`, `"pointilles"` (`"pointille"` accepté) ; valeur inconnue = erreur                              |
| `epaisseur`                                              | nombre                                                                                                                  |
| `remplissage`, `opacite_fond`                            | couleur de fond ; opacité 0..1 (défaut de rendu 0,3)                                                                    |
| `forme` (points)                                         | `point` (défaut), `cercle`, `croix`, `carre`/`carré` (+ `dot circle cross square`)                                      |
| `etiquette` (points)                                     | `haut bas gauche droite haut-gauche haut-droite bas-gauche bas-droite aucune`                                           |
| `visible`                                                | `faux` : objet créé masqué (comme `masque(X)`)                                                                          |
| `rendu`, `rugosite`, `courbure`, `motif`, `sommets_nets` | mode main levée (rough.js) : `rendu="croquis"`, `motif="hachure"\|"plein"\|"zigzag"\|"croise"\|"points"\|"tirets"`      |

Une couleur NOMMÉE suit le thème (variable `--color-fig-<nom>` à l'écran, variante claire au PDF) ;
un hexadécimal reste fixe. Code : `src/lib/theme/named-colors.ts` (`resolveNamedColor`).

`etiquette=` est lue par le bloc ` ```figure ` (écran et PDF, table `rendering/label-placement.ts`) ;
`GeometryCanvas` et les exports SVG/TikZ écrivent toujours le nom en haut à droite.

## 3. Les 92 builtins par famille

Retour : **point**, **ligne** (droite/segment/demi-droite), **objet**, **scalaire** (valeur réactive,
invisible sauf `mesure`), **transf.** (objet transformation), **réf.** (référence à un objet
existant, rien n'est créé), **—** (effet seul).

### Points

| Builtin          | Formes                                                                                                                                                                                                         | Retour           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `point`          | `point(x, y)` (libre, déplaçable) · `point(A, longueur=L, angle=θ \| direction=B \| vecteur=u)`                                                                                                                | point            |
| `milieu`         | `milieu(A, B)` · `milieu(s)`                                                                                                                                                                                   | point            |
| `point_sur`      | `point_sur(s)` (t = 0,5) · `point_sur(s, t)` · `point_sur(d, t)` · `point_sur(c, θ)` · `point_sur(f, x0)` · `point_sur(courbe_param, t0)`                                                                      | point (glissant) |
| `intersection`   | `intersection(d1, d2)` · `(d, c, k)` · `(c1, c2, k)` · `(d, q, k)` · `(q1, q2, k)` (k = 1..4) · `(d, f, k)` · `(f1, f2, k)` · courbes paramétriques × {param., droite, cercle, fonction, segment, demi-droite} | point            |
| `centre_gravite` | `centre_gravite(A, B, C)`                                                                                                                                                                                      | point            |
| `orthocentre`    | `orthocentre(A, B, C)`                                                                                                                                                                                         | point            |
| `zeros`          | `zeros(f)` (fonction ; aussi conique)                                                                                                                                                                          | points           |
| `extrema`        | `extrema(f)`                                                                                                                                                                                                   | points           |
| `inflections`    | `inflections(f)`                                                                                                                                                                                               | points           |
| `foyers`         | `foyers(c)` (conique) : crée des points libres (`createFreePoint`)                                                                                                                                             | points           |

`zeros`/`extrema`/`inflections` cherchent sur `[-10 ; 10]` (`FUNCTION_SEARCH_XMIN/XMAX`).
`point_sur` d'une courbe paramétrique se déplace par Newton (`findClosestParameterOnCurve`).

### Lignes

| Builtin           | Formes                                                                                  | Retour   |
| ----------------- | --------------------------------------------------------------------------------------- | -------- |
| `segment`         | `segment(A, B)` · `segment(A, longueur=L, angle=θ \| direction=B \| vecteur=u)`         | ligne    |
| `droite`          | `droite(A, B)`                                                                          | ligne    |
| `demidroite`      | `demidroite(O, A)`                                                                      | ligne    |
| `mediatrice`      | `mediatrice(A, B)`                                                                      | ligne    |
| `perpendiculaire` | `perpendiculaire(P, A, B)` : par `P`, ⟂ `(AB)`                                          | ligne    |
| `parallele`       | `parallele(P, A, B)` : par `P`, ∥ `(AB)`                                                | ligne    |
| `mediane`         | `mediane(A, B, C)` : issue de `A`                                                       | ligne    |
| `hauteur`         | `hauteur(A, B, C)` : issue de `A`                                                       | ligne    |
| `bissectrice`     | `bissectrice(A, V, B)` · `bissectrice(α)`                                               | ligne    |
| `droite_euler`    | `droite_euler(A, B, C)` (erreur si équilatéral)                                         | ligne    |
| `corde`           | `corde(c, d)` : segment entre les 2 intersections                                       | ligne    |
| `tangente`        | `tangente(f, x0)` · `tangente(f, P)` · `tangente(courbe_param, t0)` (+ vecteur tangent) | ligne    |
| `asymptotes`      | `asymptotes(h)` (hyperbole)                                                             | 2 lignes |
| `axes`            | `axes(c)` (conique)                                                                     | lignes   |
| `directrice`      | `directrice(p)` (parabole)                                                              | ligne    |
| `polaire`         | `polaire(M, c)`                                                                         | ligne    |

### Cercles, arcs, polygones

| Builtin                | Formes                                                                     |
| ---------------------- | -------------------------------------------------------------------------- |
| `cercle`               | `cercle(O, rayon=r)` · `cercle(O, passant=P)` · `cercle(A, B, C)`          |
| `arc`                  | `arc(A, O, B)` (sens trigonométrique) · `arc(O, rayon=r, debut=0, fin=90)` |
| `secteur`              | `secteur(O, A, B)` · `secteur(O, rayon=r, debut=0, fin=90)`                |
| `couronne`             | `couronne(O, r1=2, r2=3)`                                                  |
| `cercle_circonscrit`   | `cercle_circonscrit(A, B, C)`                                              |
| `cercle_inscrit`       | `cercle_inscrit(A, B, C)`                                                  |
| `cercle_euler`         | `cercle_euler(A, B, C)` (cercle des neuf points)                           |
| `cercle_osculateur`    | `cercle_osculateur(courbe_param, t0)`                                      |
| `polygone`             | `polygone(A, B, C, …)`                                                     |
| `triangle`             | `triangle(A, B, C)`                                                        |
| `triangle_equilateral` | `triangle_equilateral(A, B)`                                               |
| `triangle_isocele`     | `triangle_isocele(A, B, angle=40)` (défaut 40)                             |
| `triangle_rectangle`   | `triangle_rectangle(A, B, angle=45)` : rectangle en `A`                    |
| `parallelogramme`      | `parallelogramme(A, B, C)` : `D` calculé                                   |
| `rectangle`            | `rectangle(A, B, largeur=2)`                                               |
| `carre`                | `carre(A, B)`                                                              |
| `losange`              | `losange(A, B, angle=60)`                                                  |
| `polygone_regulier`    | `polygone_regulier(O, r, n)`                                               |
| `etoile`               | `etoile(O, r, n, saut=2)`                                                  |

Convention « un builtin = un objet principal » : les points intermédiaires sont créés masqués ;
on les récupère par les accesseurs (`centre(c)`, `sommet(p, i)`…) et on les montre par `montre()`.
`polygone_regulier` et `etoile` rendent un polygone (plus un tableau de points).

### Courbes

| Builtin   | Formes                                                                                                                                                                                                                               | Retour |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `courbe`  | `courbe("x^2 - 1")` (y = f(x)) · `courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*pi)` · `courbe("r = 1 + cos(theta)", theta_min=0, theta_max=2*pi)` · `courbe("x^2 + y^2 = 1")` (droite, conique ou implicite selon l'équation) | courbe |
| `derivee` | `derivee(f)`                                                                                                                                                                                                                         | courbe |
| `lieu`    | `lieu(M, P)` : trace de `M` quand `P` (un `point_sur`) parcourt son support                                                                                                                                                          | courbe |
| `trace`   | `trace(M)` : trace dynamique qui s'allonge quand `M` bouge                                                                                                                                                                           | objet  |

Domaine et morceaux (cartésien) : `courbe("y = x^2 sur ]-1 ; 2]")`, `… avec 0 < x <= 2`
(`dsl/domain-parser.ts`) ; `courbe("y = { -x si x < 0, x^2 si x >= 0 }")` ou forme `sur` — on
ne mélange pas `si` et `sur` (`dsl/piecewise-parser.ts`). Bornes : nombres, curseurs, `±infini`.
Les formes polaires sont réécrites en paramétriques.

### Vecteurs

| Builtin            | Formes                                                                              | Retour   |
| ------------------ | ----------------------------------------------------------------------------------- | -------- |
| `vecteur`          | `vecteur(A, B)` (lié) · `vecteur(dx, dy)` · `vecteur(dx, dy, ancre=(x, y))` (libre) | objet    |
| `norme`            | `norme(u)`                                                                          | scalaire |
| `produit_scalaire` | `produit_scalaire(u, v)`                                                            | scalaire |

### Transformations

Sans objet en 1ᵉʳ argument, le builtin rend un **objet transformation** réutilisable ; avec un
objet, il rend son image (`dsl/transform-apply.ts`, toutes familles d'objets et de courbes).

| Builtin       | Formes                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `symetrie`    | `symetrie(centre=O)` · `symetrie(axe=d)` · `symetrie(M, centre=O \| axe=d)`                                                |
| `rotation`    | `rotation(centre=O, angle=θ)` · `rotation(M, centre=O, angle=θ)` ; `angle=` accepte un nombre, un scalaire ou un angle `α` |
| `translation` | `translation(vecteur=u)` · `translation(vecteur=(A, B))` · `translation(M, vecteur=u)`                                     |
| `homothetie`  | `homothetie(centre=O, rapport=k)` · `homothetie(M, centre=O, rapport=k)`                                                   |
| `similitude`  | `similitude(M, centre=O, angle=θ, rapport=k)` (sans `M` : transf.)                                                         |
| `projection`  | `projection(axe=d)` · `projection(M, axe=d)`                                                                               |
| `affinite`    | `affinite(axe=d, rapport=k)` · `affinite(M, axe=d, rapport=k)`                                                             |
| `inversion`   | `inversion(centre=O, rayon=r)` · `inversion(M, centre=O, rayon=r)`                                                         |
| `transforme`  | `transforme(t, M)` : applique la transformation `t`                                                                        |
| `compose`     | `compose(t1, t2, …)`                                                                                                       |

### Mesures et calculs (scalaires)

| Builtin         | Formes                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `distance`      | `distance(A, B)` · `distance(A, d)` (d droite, segment ou demi-droite)                                              |
| `longueur`      | `longueur(c)` · `longueur(c, t1, t2)` : longueur d'arc d'une courbe paramétrique (Simpson)                          |
| `courbure`      | `courbure(c, t0)` : courbure signée                                                                                 |
| `perimetre`     | `perimetre(A, B, C, …)`                                                                                             |
| `aire`          | `aire(A, B, C, …)` (polygone) · `aire(f, a, b)` (voir §5)                                                           |
| `aire_entre`    | `aire_entre(f, g, a, b)` (voir §5)                                                                                  |
| `integrale`     | `integrale(f, a, b)` (voir §5)                                                                                      |
| `pente`         | `pente(d)`                                                                                                          |
| `rayon`         | `rayon(c)`                                                                                                          |
| `puissance`     | `puissance(M, c)`                                                                                                   |
| `excentricite`  | `excentricite(c)`                                                                                                   |
| `angle_polaire` | `angle_polaire(O, P)` : angle de `OP` avec l'axe des abscisses, en radians dans `[-π ; π]`                          |
| `mesure`        | `mesure(α)` · `mesure(α, unite="deg")` · `mesure(A, V, B)` · `mesure(u, v)` : angles seulement (radians par défaut) |
| `slider`        | `slider(min=0, max=10, valeur=…, pas=…)` (défauts : 0, 10, milieu) : curseur                                        |

### Angles et repères

| Builtin          | Formes (détail §4)                                                         | Retour |
| ---------------- | -------------------------------------------------------------------------- | ------ |
| `angle`          | `angle(A, V, B)` · `angle(u, v)` · `angle(s1, s2)` · `angle(d1, d2)`       | objet  |
| `transporte`     | `transporte(α, V')` · `(α, V', P)` · `(α, V', vec=v)` · `(α, V', angle=θ)` | objet  |
| `marque_segment` | `marque_segment(A, B)` · `marque_segment(A, B, traits=2)`                  | objet  |

### Accesseurs (réf. : rien n'est créé)

| Builtin      | Formes                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| `centre`     | `centre(c)` (cercle, arc, secteur, conique) · `centre(quad)` (diagonales) |
| `extremite`  | `extremite(s, 1)` · `extremite(s, 2)`                                     |
| `extremites` | `extremites(s)` (tuple)                                                   |
| `sommet`     | `sommet(α)` · `sommet(p, i)` (i à partir de 1)                            |
| `sommets`    | `sommets(p)` (tuple)                                                      |
| `cote`       | `cote(α, 1)` · `cote(α, 2)`                                               |

Un tuple n'est rendu que si le résultat est intrinsèquement pluriel (`sommets`, `extremites`, `foyers`).

### Textes, images, visibilité

| Builtin  | Formes                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------- |
| `texte`  | `texte(x, y, "…")` · `texte(P, "…", dx=0.2, dy=-0.1)` · `ancre=` (§6) ; `{A:.2f}` interpole un scalaire |
| `mtexte` | `mtexte(x, y, "\\frac{a}{b}")` · `mtexte(P, "…")` : LaTeX (MathLive)                                    |
| `rtexte` | `rtexte(x, y, "**gras** _italique_")` · `rtexte(P, "…", dx=…, dy=…)`                                    |
| `image`  | `image("url", x, y, largeur=w)` · `image("url", A, largeur=w)` · `image("url", A, B, largeur=w)`        |
| `style`  | `style(X, …args de style)` : modifie un objet existant                                                  |
| `montre` | `montre(X, …args de style)` : rend visible et stylise                                                   |
| `masque` | `masque(X)`                                                                                             |

---

## 4. Angles (`GeoAngle`)

```
α = angle(A, V, B)            # 3 points : côté A, sommet V, côté B
α = angle(u, v)               # 2 vecteurs : angle non orienté dans [0 ; π]
α = angle(s1, s2)             # 2 segments : sommet = extrémité commune, sinon intersection
α = angle(d1, d2)             # 2 droites : convention angle aigu, [0 ; π/2]
```

Arguments nommés, sur toutes les formes : `marque` (`arc` défaut, `arcs2`, `arcs3`, `carre`,
`aucune`), `kind` (`saillant` défaut, `rentrant`), `orientation` (`auto`, `direct`, `indirect`),
`showLabel` (`aucun`, `nom`, `mesure`, `mesure+nom`), `unite` (`rad`, `deg`), `arcRadiusPx` (25),
`arcSpacingPx` (6, strictement positif), `remplissage=` (secteur rempli pour les marques en arc).

- Segments ou droites parallèles : erreur structurée. Pour `angle(d1, d2)`, le choix du côté est
  figé à la construction : la mesure suit le déplacement mais peut franchir π/2 sans permutation.
- Réactif au déplacement dans toutes les combinaisons (vecteurs liés ou libres, via
  `createTranslatedPointByVector` / `createFreeVectorPoint`).
- `mesure(α)` met le scalaire en cache sur l'angle (`measureScalarIds`) ; `mesure(A, V, B)` crée un
  angle masqué ; `mesure()` de tout autre objet (vecteur seul, segment, scalaire…) est une erreur.
  Pour afficher une valeur : `texte(P, "AB = {d:.2f}")` ou `mtexte(…)`.
- `rotation(M, centre=O, angle=α)` accepte un angle : la rotation suit ses points.
- `transporte(α, V', …)` : nouvel angle de même mesure au sommet `V'` ; les trois modes de direction
  (3ᵉ point, `vec=`, `angle=`) s'excluent ; le style de `α` est hérité. Avec `@euclide`, report
  au compas animé (chorégraphie `core/choreographies/transporte.ts`, voie `compas_report`).
- Builtins retirés (lèvent une erreur) : `marque_angle(P1, V, P2[, arcs=n])` → `angle(…, marque=
"arcs2")`, `angle_droit(…)` → `angle(…, marque="carre")`, `angle_vecteurs(u, v)` →
  `mesure(u, v)`, `angle(O, P)` → `angle_polaire(O, P)`. Scripts : `scripts/lint-angle-builtins.ts`
  (vérifie le code) et `scripts/migrate-angle-builtins-supabase.ts` (colonne
  `constructions.dsl_script`, à blanc par défaut, `--apply` pour écrire).

## 5. Intégrales et aires : `integrale`, `aire`, `aire_entre`

Trois builtins, une même mécanique (`dsl/area-builtin-helper.ts`, `interpretAreaBuiltin`) : ils
rendent un **scalaire** réactif ET dessinent une zone liée (les arguments de style vont à la zone,
`styleTargetId`). `f` et `g` doivent être des courbes cartésiennes `courbe("…")`.

| Builtin                  | Valeur            | Zone fermée par     | Couleur par défaut       |
| ------------------------ | ----------------- | ------------------- | ------------------------ | ------------------- | ---------------- |
| `integrale(f, a, b)`     | ∫ₐᵇ f, **signée** | l'axe des abscisses | bleu (défaut de la zone) |
| `aire(f, a, b)`          | ∫                 | f                   | , toujours ≥ 0           | l'axe des abscisses | vert `#22c55e`   |
| `aire_entre(f, g, a, b)` | ∫                 | f − g               | , toujours ≥ 0           | la courbe `g`       | orange `#fb923c` |

- **Vocabulaire** : l'intégrale peut être négative ; l'aire est une grandeur géométrique. Elles ne
  coïncident que si f ≥ 0 sur [a ; b]. `integrale(x^3 - x, -1, 1)` = 0, `aire(…)` = 0,5.
- **Bornes** : nombres, curseurs ou scalaires (`distance(O, P)`…) ; elles suivent le mouvement.
  `integrale(f, b, a) = −integrale(f, a, b)` ; `aire` et `aire_entre` ignorent l'ordre. Bornes
  égales → 0 ; `aire_entre(f, f, a, b)` → 0, rien n'est dessiné.
- **Bornes infinies** (intégrales impropres) : `inf`, `+inf`, `-inf`. Exemples testés :
  `integrale(exp(-x), 0, +inf)` ≈ 1, `integrale(exp(-x^2), -inf, +inf)` ≈ √π ; une intégrale
  divergente rend `NaN` (`figure.createImproperIntegralArea`).
- **Calcul** : primitive symbolique compilée et mise en cache si elle existe, sinon Simpson
  adaptatif (≈ 10⁻⁶). `aire`/`aire_entre` découpent sur les zéros de f (ou f − g) dans l'intervalle.
- **Singularités** : les discontinuités de l'intégrande sont analysées à la création ; un pôle ou une
  discontinuité essentielle DANS [a ; b] donne `NaN` (réactif : une borne qui franchit le pôle
  passe à `NaN` puis revient) ; une discontinuité éliminable ne gêne pas (`sin(x)/x` sur [-1 ; 1]).
  Un avertissement console est émis quand une singularité est soupçonnée.
- **Rendu** : la zone passe sous la courbe ; opacité de fond 0,3 par défaut. `integrale` éclaircit
  les sous-régions où f < 0 ; `aire` et `aire_entre` gardent une teinte uniforme.
- Hors périmètre : plus de deux courbes, détection automatique des intersections (donner [a ; b]).
- Démos : `/geometry-demo/sliders/integrale`, `…/aire`, `…/aire-entre`, `…/integrale-improper`.
  Tests : `dsl/__tests__/interpreter-integrale.test.ts`, `interpreter-aire-undercurve.test.ts`,
  `interpreter-aire-entre.test.ts`, `interpreter-improper.test.ts`,
  `interpreter-singularity-nan.test.ts`.

```
f = courbe("y = sin(x)")
a = slider(min=-3, max=0, valeur=-2)
b = slider(min=0, max=4, valeur=3)
A = aire(f, a, b, couleur="rouge", opacite_fond=0.4)
mtexte(2, 1.5, "\\int_{a}^{b} |\\sin(x)|\\, dx = {A:.3f}")
```

## 6. Textes : `ancre=`, flèche combinante

- `texte(x, y, "5 cm", ancre="bas-gauche")` : point de la boîte du texte posé sur la position
  (`centre` défaut, `haut`, `bas`, `gauche`, `droite`, et les 4 coins). Boîte = de la ligne de base
  à la hauteur des capitales. Bloc ` ```figure ` : identique à l'écran et au PDF ;
  `GeometryCanvas` garde son ancrage historique (début du texte, ligne de base).
- Flèche combinante dans `texte` : `"n⃗"` (n + U+20D7 ; aussi U+20D6, U+20E1, U+20D1) = lettre en
  italique surmontée de la flèche, à l'écran comme au PDF (`rendering/combining-accents.ts`).
  `texte` n'accepte pas de LaTeX : c'est le rôle de `mtexte`.

## 7. Bloc ubumark ` ```figure ` : ce qui change

Le bloc interprète le même DSL, sans interactivité (`ubumark/utils/figure-scene.ts`) :

- **En-tête** avant `---` : `fenetre: xmin ; xmax ; ymin ; ymax`, `axes: oui|non`,
  `grille: oui|non|pas|pas x ; pas y`, `graduations: pas|pas x ; pas y|oui|non` (exige `axes: oui`).
  Erreurs situées (`Ligne N : …`) ; plus de 200 lignes de grille ou de graduations refusé. Code :
  `ubumark/parser/figure-parser.ts`, `buildFigureFrame`, `figure-svg.ts`, `frameToTypst`.
- **Refusés avant exécution** (`REFUSED_CALLS`) : courbes et analyse (`courbe tangente derivee
integrale zeros extrema inflections asymptotes courbure cercle_osculateur axes directrice foyers
excentricite polaire`), `aire`, `aire_entre`, `lieu`, `trace`, `image`, `slider`, `secteur`,
  `couronne`, `mtexte`, `rtexte`, et les directives d'animation. Le message renvoie au bloc
  ` ```courbe ` pour les fonctions.
- `;` séparateur et virgule décimale française sont normalisés (`normalizeFigureScript`).
- Budget : taille du script, nombre d'objets (`Figure.setElementLimit`), `maxSteps`.
- PDF : `exportToTypst({ clipToViewport: true, underlay })` — traits et remplissages découpés à la
  fenêtre, noms et textes jamais coupés.
