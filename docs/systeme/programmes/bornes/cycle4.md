# Bornes des points du cycle 4 (5e, 4e, 3e)

Objectif : pour chaque point de programme neuf (`curriculum_points`, `node_id` non nul, non archivé), dire jusqu'où vont les questions générées (« seulement »). 291 points lus en prod le 2026-10-18 : 143 en 5e, 82 en 4e, 66 en 3e.

## Sources et façon de citer

| Abréviation                | Document                                                                                                                       | Page citée                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **BO c4**                  | Programme de mathématiques du cycle 4, en vigueur (`docs/ref/programmes/`)                                                     | page du PDF                                       |
| **Exemples 2026**          | « Exemples pour la mise en œuvre des programmes – Cycle 4 – 2026 » (eduscol, aligné sur ce BO)                                 | numéro imprimé en bas de page (= page du PDF − 1) |
| **Attendus 5e/4e/3e 2019** | Attendus de fin d'année (eduscol 2019)                                                                                         | page du PDF                                       |
| **Repères c4 2019**        | Repères annuels de progression (eduscol 2019)                                                                                  | page du PDF                                       |
| **ressource 2016**         | Ressources d'accompagnement « ra16 » (zips : puissances, fractions, relatifs, calcul littéral, probabilités, géométrie plane…) | nom du thème                                      |

**Force** : `BO` = écrit dans le programme ; `acc.` = écrit dans un document d'accompagnement qui ne contredit pas le BO ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point). ; `décision` = choix de David du 2026-10-18 entre plusieurs lectures (la source cite la question de `questions.json`, puis le texte d'origine).

Hiérarchie suivie : BO, puis Exemples 2026 (écrit pour ce BO), puis 2019/2016 seulement en appui. Un document de 2019 ou 2016 qui contredit le BO n'a jamais servi de borne : la contradiction est signalée.

## Ce qui est le plus utile pour la vérification « seulement »

- **Relatifs (5e)** : seulement l'addition et la soustraction de décimaux relatifs ; produit et quotient en 4e.
- **Fractions** : en 5e, fractions positives, dénominateurs **quelconques**, aucune simplification exigée ; en 4e, simplifier (sans exiger l'irréductible), les quatre opérations, fractions relatives ; en 3e, l'irréductible.
- **Puissances** : en 5e, carré et cube seulement ; en 4e, exposants entiers **naturels** (a⁰ = 1), aᵐ × aⁿ et (ab)ⁿ ; en 3e, exposants **relatifs**, produit et quotient, notation scientifique A × 10ⁿ avec 1 ≤ A < 10.
- **Racines carrées** : définition et encadrement en 4e (carrés parfaits ≤ 144) ; x² = a en 3e ; aucune propriété algébrique (√20 n'a pas à devenir 2√5).
- **Équations** : en 5e, x + b = c et ax = c par opération inverse ; en 4e, ax + b = c (coefficients entiers relatifs) et ax + b = cx + d ; en 3e, produit nul (ax + b)(cx + d) = 0, x² = a, inéquations du seul type ax ⩾ b (a ≠ 0).
- **Calcul littéral** : distributivité simple jusqu'en 4e ; double distributivité et les trois identités en 3e.
- **Statistiques** : moyenne simple en 5e ; moyenne pondérée, médiane (effectif ≤ 30) et étendue en 4e ; quartiles et boîte à moustaches en 3e.
- **Probabilités** : une épreuve en 5e ; deux épreuves et notations ensemblistes en 4e ; P(A ∪ B) + P(A ∩ B) = P(A) + P(B) en 3e.

## Contradictions entre les documents 2016/2019 et le BO en vigueur

Ces documents datent du programme précédent. Là où ils contredisent le BO, c'est le BO qui fait la borne :

1. **Fractions 5e** : 2019 limite aux dénominateurs « égaux ou multiples » ; le BO dit « quelconques ».
2. **Nombres premiers** : 2019 les demande dès la 5e (≤ 30) puis en 4e (< 100) ; le BO n'en fait qu'un prolongement culturel, avec la décomposition en facteurs premiers en automatisme de 3e.
3. **Moyenne pondérée** : en 5e dans les Attendus 2019, en 4e dans le BO.
4. **Ratio et partage proportionnel** : en 5e dans les Attendus 2019, en 4e et 3e dans le BO.
5. **Puissances de 10 d'exposant négatif, notation scientifique, préfixes** : en 4e en 2019, en 3e dans le BO.
6. **Formules sur les puissances** : « pas un attendu » selon 2016/2019 ; formules données par les Exemples 2026, et opérations inscrites au BO.
7. **Équations (méthode algébrique)** : en 3e selon la ressource 2016, en 4e dans le BO.
8. **Thalès (triangles emboîtés) et cosinus** : en 4e en 2019, en 3e dans le BO.
9. **Translation, vecteurs** : « définitions ponctuelles hors programme » selon les Repères 2019 ; au programme de 3e dans le BO.
10. **Probabilités** : notations ensemblistes « pas un attendu » selon 2016, au programme de 4e dans le BO. Deux épreuves : en 3e avec tableaux seulement et sans arbre selon 2019 ; en 4e dans le BO, et les Exemples 2026 admettent l'arbre.
11. **Médianes d'un triangle** : « pas un attendu » selon 2016 ; au programme de 5e dans le BO.
12. **Algorithmique** : conditionnelles dès le niveau 1 (fin de 5e) en 2019 ; en 4e dans le BO.
13. **Absents du BO en vigueur** mais présents dans les Attendus 3e 2019 : rotation, homothétie, triangles semblables, histogrammes, latitude et longitude. **Aucun point ne doit les générer.**
14. **Test d'égalité en 5e** : « une ou deux indéterminées » en 2019 ; « une variable » dans le BO.

## Décisions de David (2026-10-18)

Les incertitudes du cycle 4 sont tranchées (détail : `questions.json`, champ `decision`).

- **Valeur absolue (5-120)** (c4-1) : admise en mots (« valeur absolue de −3 », appui sur la droite graduée), sans la notation |a| ni calcul sur |a|.
- **Quartiles (3-029)** (c4-2) : Q1 (Q3) = plus petite valeur de la série dont l'effectif cumulé atteint 25 % (75 %) de l'effectif total.
- **Médiane d'effectif pair (4-040)** (c4-3) : le correcteur accepte toute valeur entre les deux valeurs centrales, bornes comprises (ou le modèle ne tire que des effectifs impairs).
- **Sections de solides (3-020)** (c4-4) : liste du BO seulement (pavé, cylindre, boule).
- **Inéquations (3-014)** (c4-5) : les quatre sens (⩾, >, ⩽, <), a ≠ 0 éventuellement négatif.
- **Notations fonctionnelles en 4e** (c4-6 ; 4-062, 4-063, 4-064, 4-081 et borne générale de 4e) : utilisables dans l'énoncé, jamais exigées dans la réponse ; vocabulaire image/antécédent et f : x ↦ réservés à la 3e.
- **Exemples 2026 p.17 (racine carrée)** (c4-7 ; 4-019) : coquille, on lit « nombre positif ».
- **Fractions mal extraites du PDF** (c4-8) : les fractions du BO et des Exemples sont extraites du PDF en deux lignes (numérateurs, puis dénominateurs) et réassemblées colonne par colonne. Contrôle par Claude sur le rendu image des pages, écarts signalés à David ; **contrôle pas encore fait** : d'ici là, ces exemples (5-025, 5-026, 5-123) ne servent pas à refuser un modèle.

## Cinquième (143 points, 108 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Les nombres négatifs sont des décimaux relatifs ; seules l'addition et la soustraction de relatifs sont au programme de 5e (produit et quotient de relatifs : 4e). — _BO c4 p.7-9_ (BO)
- Les relatifs sont construits d'abord sur des entiers, puis sur des décimaux ; les décimaux relatifs rencontrés sont « simples ». — _Exemples 2026 p.10 ; Repères c4 2019 p.2_ (acc.)
- Fractions positives seulement : les rationnels relatifs (quotient d'entiers relatifs, opposé d'un rationnel) arrivent en 4e. — _BO c4 p.9_ (déduite)
- Pas d'exposant autre que 2 et 3 (carré et cube) ; puissances d'exposant entier naturel quelconque en 4e. — _BO c4 p.8-9_ (BO)
- Équations limitées aux types x + b = c et ax = c, résolues par opérations inverses (pas de méthode algébrique : 4e). — _BO c4 p.9_ (BO)
- Statistiques : moyenne simple seulement (moyenne pondérée, médiane, étendue : 4e). — _BO c4 p.16-17_ (BO)
- Probabilités : une seule épreuve, en situation d'équiprobabilité (expériences à deux épreuves : 4e). — _BO c4 p.17_ (déduite)
- Pas de translation, de théorème de Pythagore, de Thalès ni de trigonométrie (4e et 3e). — _BO c4 p.14-15_ (BO)
- Pensée informatique : variable seulement en lecture d'une donnée saisie ; boucle « répéter n fois » ; pas d'instruction conditionnelle (4e). — _BO c4 p.20_ (BO)

### Espace et géométrie > Angles

- **5-057** — Caractériser le parallélisme par les angles : angles alternes internes, angles correspondants.
  - Angles alternes-internes et correspondants (et leurs réciproques) seulement. — _BO c4 p.13 ; Exemples 2026 p.24_ (BO)

### Espace et géométrie > Angles > Automatismes

- **5-056** — Connaitre les mesures des angles de l'équerre dont dispose l'élève (30° 60° 90° ou 45° 45° 90°).
  - Équerres 30°-60°-90° ou 45°-45°-90°. — _BO c4 p.13_ (BO)

### Espace et géométrie > Parallélogrammes

- **5-067** — Définir le parallélogramme. — _hérite des bornes générales_
- **5-068** — Construire des parallélogrammes. — _hérite des bornes générales_
- **5-069** — Connaitre les propriétés caractéristiques des côtés opposés et des diagonales d'un parallélogramme. — _hérite des bornes générales_
- **5-070** — Donner la nature d'un quadrilatère à l'aide d'une propriété de ses côtés ou de ses diagonales. — _hérite des bornes générales_
- **5-071** — Définir les parallélogrammes particuliers (rectangle, losange, carré).
  - Rectangle = parallélogramme ayant un angle droit ; losange = deux côtés consécutifs égaux ; carré = rectangle et losange. — _Exemples 2026 p.26_ (acc.)
- **5-072** — Connaitre les propriétés caractéristiques des parallélogrammes particuliers (rectangle, losange, carré). — _hérite des bornes générales_
- **5-073** — Savoir calculer l'aire d'un parallélogramme.
  - Aire = base × hauteur, à partir de l'aire du rectangle. — _Exemples 2026 p.26_ (acc.)
- **5-074** — Résoudre des problèmes faisant appel à des conversions d'unités de longueur et d'unités d'aires.
  - Unités de longueur et d'aire. — _BO c4 p.13_ (BO)
- **5-115** — Savoir calculer l'aire de figures complexes.
  - Figures complexes construites à partir de parallélogrammes, triangles et disques. — _BO c4 p.13 ; Exemples 2026 p.26_ (acc.)
- **5-133** — Construire un parallélogramme à l'aide d'une propriété de ses côtés ou de ses diagonales. — _hérite des bornes générales_

### Espace et géométrie > Représentation de l'espace

- **5-048** — Construire et mettre en relation différentes représentations en perspectives cavalières des solides suivants : pavé droit, cube, cylindre de révolution, prisme droit.
  - Solides : pavé droit, cube, cylindre de révolution, prisme droit. — _BO c4 p.12_ (BO)
- **5-049** — Savoir mettre en relation une représentation en perspective cavalière et un patron d'un pavé, d'un prisme droit ou d'un cylindre de révolution.
  - Pavé, prisme droit (base triangle ou parallélogramme), cylindre de révolution. — _BO c4 p.12 ; Exemples 2026 p.22_ (BO)
- **5-050** — Calculer le volume du cube, du pavé droit.
  - Cube, pavé droit. — _BO c4 p.12_ (BO)
- **5-051** — Convertir des unités de volume (m³, dm³, cm³).
  - Unités de volume m³, dm³, cm³ (libellé). — _BO c4 p.12_ (BO)
- **5-052** — Calculer l'aire du disque.
  - A = πr². — _Exemples 2026 p.23_ (acc.)
- **5-053** — Calculer le volume du cylindre de révolution.
  - V = πr²h (aire de base × hauteur). — _Exemples 2026 p.23_ (acc.)
- **5-108** — Calculer le volume du prisme droit.
  - V = aire de base × hauteur. — _Exemples 2026 p.23_ (acc.)
- **5-129** — Convertir des unités de contenance et passer d'une unité de volume à une unité de contenance (1 L = 1 dm³).
  - 1 L = 1 dm³ ; 1 000 L = 1 m³ (ex. 33 cL en cm³ ; 1 500 cm³ en L). — _Exemples 2026 p.23 ; Attendus 5e 2019 p.7_ (acc.)

### Espace et géométrie > Représentation de l'espace > Automatismes

- **5-144** — Reconnaître un cube, un pavé représenté en perspective cavalière.
  - Cube et pavé seulement. — _BO c4 p.12_ (BO)

### Espace et géométrie > Repérage sur une droite et dans le plan

- **5-046** — Lire l'abscisse d'un point sur une droite graduée.
  - Abscisses décimales (relatives, en lien avec le thème des relatifs). — _BO c4 p.12 ; Exemples 2026 p.22_ (acc.)
- **5-047** — Lire les coordonnées d'un point dans un repère orthogonal.
  - Coordonnées décimales relatives simples ; vocabulaire origine, axes, abscisse, ordonnée. — _Exemples 2026 p.22 ; Attendus 5e 2019 p.9_ (acc.)
- **5-127** — Placer sur une droite graduée un point d'abscisse donnée.
  - Abscisses décimales (relatives, en lien avec le thème des relatifs). — _BO c4 p.12 ; Exemples 2026 p.22_ (acc.)
- **5-128** — Placer un point de coordonnées données dans un repère orthogonal.
  - Coordonnées décimales relatives simples ; vocabulaire origine, axes, abscisse, ordonnée. — _Exemples 2026 p.22 ; Attendus 5e 2019 p.9_ (acc.)

### Espace et géométrie > Transformations

- **5-054** — Définir le demi-tour, ou symétrie centrale. — _hérite des bornes générales_
- **5-055** — Connaitre les propriétés du demi-tour.
  - Conservation de l'alignement, du parallélisme, des longueurs, des angles (admises). — _Exemples 2026 p.23_ (acc.)

### Espace et géométrie > Triangles

- **5-058** — Connaître la somme des angles d'un triangle (deux angles de 40° et 65° : le troisième ?).
  - Somme 180° ; calcul du 3e angle connaissant les deux autres ; cas particuliers équilatéral, isocèle, rectangle. — _BO c4 p.13 ; Exemples 2026 p.24_ (BO)
- **5-059** — Construire des triangles à partir de données partielles.
  - Données : trois longueurs (inégalité triangulaire), une longueur et deux angles, deux longueurs et un angle. — _Repères c4 2019 p.11 ; Attendus 5e 2019 p.10_ (acc.)
- **5-060** — Connaitre les propriétés des médiatrices et du cercle circonscrit dans le cas de triangles particuliers.
  - Triangles particuliers ; le triangle rectangle inscrit dans un demi-cercle est observé et admis (démontré en 4e). — _Exemples 2026 p.25_ (acc.)
- **5-061** — Calculer l'aire d'un triangle.
  - Aire = côté × hauteur associée ÷ 2. — _Exemples 2026 p.25_ (acc.)
- **5-062** — Définir une hauteur d'un triangle (quel segment est la hauteur issue de A ?). — _hérite des bornes générales_
- **5-063** — Savoir que les hauteurs d'un triangle sont concourantes. — _hérite des bornes générales_
- **5-064** — Définir une médiane d'un triangle (quel segment est la médiane issue de A ?). — _hérite des bornes générales_
  - ⚠ Contradiction : la ressource 2016 (géométrie plane) dit que les autres droites remarquables que les hauteurs « ne sont pas un attendu » ; le BO en vigueur inscrit les médianes en 5e.
- **5-065** — Démontrer qu'une médiane partage un triangle en deux triangles d'aires égales. — _hérite des bornes générales_
- **5-066** — Utiliser les propriétés des hauteurs et des médianes dans le cas de triangles particuliers. — _hérite des bornes générales_
- **5-130** — Savoir démontrer la somme des angles d'un triangle (démontre que la somme vaut 180°, sur papier).
  - Preuve par les angles alternes-internes ou la symétrie centrale. — _Exemples 2026 p.24_ (acc.)
- **5-131** — Tracer une hauteur d'un triangle. — _hérite des bornes générales_
- **5-132** — Tracer une médiane d'un triangle. — _hérite des bornes générales_

### La pensée informatique

- **5-100** — Manipuler des instructions simples et les séquencer.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
  - ⚠ Contradiction : les Attendus 5e 2019 (niveau 1, p.12) incluent les instructions conditionnelles ; le BO en vigueur les met en 4e.
- **5-101** — Identifier les entrées et sorties d'un programme.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
- **5-102** — Représenter des formules sous la forme d'une expression informatique dans un langage de programmation par blocs.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
- **5-103** — Calculer la valeur de formules à l'aide d'une suite d'instruction dans un langage de programmation par blocs.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
- **5-104** — Prévoir la valeur d'une expression informatique avant son exécution.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
- **5-105** — Analyser un programme simple donné et modifier ses paramètres.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
- **5-106** — Effectuer une boucle inconditionnelle simple permettant de répéter une séquence linéaire d'instructions un nombre précis de fois.
  - Programmation par blocs ; variable en lecture d'une donnée saisie seulement ; pas d'instruction conditionnelle. — _BO c4 p.20_ (BO)
  - Boucle inconditionnelle simple « répéter n fois » d'une séquence linéaire. — _BO c4 p.20_ (BO)

### Nombres et calculs > Calcul littéral et algébrique

- **5-034** — Produire des formules pour un nombre : double, triple, carré, successeur, prédécesseur (triple de n : 3n ; successeur de n : n + 1).
  - Formules : double, triple, moitié, carré, successeur, prédécesseur (d'un nombre n). — _BO c4 p.8 ; Exemples 2026 p.13_ (BO)
- **5-035** — Calculer la valeur d'une expression littérale par substitution.
  - Valeurs substituées décimales positives (produit de relatifs : 4e) ; une ou deux lettres (7a, a + 17 pour a = 8 ; 3x + 5y pour x = 2, y = 1). — _Attendus 5e 2019 p.4_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Valeurs substituées décimales positives (produit de relatifs : 4e) ; une ou deux lettres (7a, a + 17 pour a = 8 ; 3x + 5y pour x = 2, y = 1).
- **5-036** — Tester si une égalité entre expressions algébriques comportant une variable est vraie ou fausse.
  - Égalité comportant une seule variable. — _BO c4 p.9_ (BO)
  - ⚠ Contradiction : les Attendus 5e 2019 (p.4) admettent « une ou deux indéterminées » ; le BO en vigueur dit « une variable ».
- **5-037** — Déterminer si une expression littérale est une somme ou un produit.
  - Somme ou produit, selon la dernière opération à effectuer. — _Exemples 2026 p.13_ (acc.)
- **5-038** — Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser une expression littérale.
  - Distributivité simple seulement : k(a + b), k(a − b) (double distributivité : 3e). — _BO c4 p.9_ (BO)
  - Réduction de ax + bx avec a, b décimaux, attention au cas b = 1. — _Exemples 2026 p.13_ (acc.)
  - Facteur k décimal positif (produit de relatifs : 4e). — _BO c4 p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Facteur k décimal positif (produit de relatifs : 4e).
- **5-039** — Réduire une expression littérale de la forme ax + b, où a et b sont des nombres décimaux.
  - Forme ax + b, a et b décimaux (ex. 5,2x + 3,4x ; 2,4x − 2,1x). — _BO c4 p.9 ; Attendus 5e 2019 p.4_ (BO)
  - Une seule lettre, termes du premier degré (x² n'apparaît qu'en automatisme de 4e : 3x × 2x = 6x²). — _BO c4 p.10_ (déduite)
  - ⚠ Les Attendus 5e 2019 (p.4) font simplifier 4x × 2x × 3x ; le BO en vigueur place ce type de produit en automatisme de 4e. Lecture déduite (texte implicite) : Une seule lettre, termes du premier degré (x² n'apparaît qu'en automatisme de 4e : 3x × 2x = 6x²).
- **5-040** — Démontrer une propriété générale par le calcul littéral.
  - Propriétés d'entiers (somme de deux pairs, de trois consécutifs…). — _Exemples 2026 p.13 ; Attendus 5e 2019 p.4_ (acc.)
- **5-041** — Utiliser un contre-exemple pour démontrer qu'une assertion est fausse. — _hérite des bornes générales_
- **5-042** — Formuler des conjectures en s'appuyant sur un langage algorithmique ou un tableur. — _hérite des bornes générales_
- **5-043** — Donner à la lettre le statut d'inconnue. — _hérite des bornes générales_
- **5-044** — Modéliser par une équation du type x + b = c un problème relevant d'une addition à trou.
  - Type x + b = c seulement. — _BO c4 p.9_ (BO)
  - a, b, c décimaux ou fractions simples ; méthode arithmétique (opération inverse), solution vérifiée. — _Exemples 2026 p.13-14_ (acc.)
- **5-045** — Résoudre une équation du type x + b = c par l'opération inverse (x + 7 = 12 : x = 12 − 7).
  - Type x + b = c seulement. — _BO c4 p.9_ (BO)
  - a, b, c décimaux ou fractions simples ; méthode arithmétique (opération inverse), solution vérifiée. — _Exemples 2026 p.13-14_ (acc.)
- **5-107** — Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour développer une expression littérale.
  - Distributivité simple seulement : k(a + b), k(a − b) (double distributivité : 3e). — _BO c4 p.9_ (BO)
  - Réduction de ax + bx avec a, b décimaux, attention au cas b = 1. — _Exemples 2026 p.13_ (acc.)
  - Facteur k décimal positif (produit de relatifs : 4e). — _BO c4 p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Facteur k décimal positif (produit de relatifs : 4e).
- **5-124** — Produire des formules de grandeurs : aire, périmètre (aire d'un rectangle de longueur L et de largeur l : L × l).
  - Formules de grandeurs : aire, périmètre. — _BO c4 p.8_ (BO)
- **5-125** — Modéliser par une équation du type ax = c un problème relevant d'une multiplication à trou.
  - Type ax = c seulement. — _BO c4 p.9_ (BO)
  - a, b, c décimaux ou fractions simples ; méthode arithmétique (opération inverse), solution vérifiée. — _Exemples 2026 p.13-14_ (acc.)
  - Cas particuliers 2x = 0 et x/2 = 0 explicités. — _Exemples 2026 p.13_ (acc.)
  - a et c positifs (le quotient de relatifs est de 4e). — _BO c4 p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : a et c positifs (le quotient de relatifs est de 4e).
- **5-126** — Résoudre une équation du type ax = c par l'opération inverse (3x = 12 : x = 12 ÷ 3).
  - Type ax = c seulement. — _BO c4 p.9_ (BO)
  - a, b, c décimaux ou fractions simples ; méthode arithmétique (opération inverse), solution vérifiée. — _Exemples 2026 p.13-14_ (acc.)
  - Cas particuliers 2x = 0 et x/2 = 0 explicités. — _Exemples 2026 p.13_ (acc.)
  - a et c positifs (le quotient de relatifs est de 4e). — _BO c4 p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : a et c positifs (le quotient de relatifs est de 4e).

### Nombres et calculs > Nombres rationnels

- **5-025** — Comparer des fractions.
  - Fractions positives (rationnels relatifs : 4e). — _BO c4 p.9_ (déduite)
  - Dénominateurs quelconques ; méthode la plus adaptée (fractions égales, comparaison à 1, à 0,5). Automatismes : 2/7 et 5/7 ; 8/12 et 8/21 ; 3/4 et 7/18 ; 8/3 et 6/7. — _BO c4 p.8 ; Exemples 2026 p.12_ (BO)
  - ⚠ Contradiction : Attendus 5e 2019 (p.2) et Repères 2019 (p.2) limitent aux dénominateurs « égaux ou multiples l'un de l'autre » ; le BO en vigueur ne pose pas cette limite (ex. 3/4 et 7/18). Lecture déduite (texte implicite) : Fractions positives (rationnels relatifs : 4e). Fractions recollées depuis le PDF (BO c4 p.8, Exemples 2026 p.12) : contrôle visuel par Claude décidé le 2026-10-18 (question c4-8), écarts signalés à David ; tant qu'il n'est pas fait, ces exemples ne servent pas à refuser un modèle.
- **5-026** — Additionner des fractions de dénominateurs quelconques (2/3 + 1/4 = ?).
  - Fractions positives (rationnels relatifs : 4e). — _BO c4 p.9_ (déduite)
  - Dénominateurs quelconques ; dénominateur commun cherché parmi les multiples (3/8 + 7/6 ; 5/12 − 2/9). Automatismes : 3/5 + 4/5 ; 1 − 2/3 ; 4/7 − 2/21 ; 3 + 2/5 ; 2/5 + 1/4. — _BO c4 p.8 ; Exemples 2026 p.12_ (BO)
  - La simplification du résultat n'est pas exigible (simplifier : 4e ; irréductible : 3e). — _BO c4 p.9-10_ (déduite)
  - ⚠ Contradiction : Attendus 5e 2019 (p.3) et Repères 2019 (p.2) limitent aux dénominateurs égaux ou multiples ; le BO en vigueur dit « dénominateurs quelconques » (et le libellé en prod aussi). Lecture déduite (texte implicite) : Fractions positives (rationnels relatifs : 4e). | La simplification du résultat n'est pas exigible (simplifier : 4e ; irréductible : 3e). Fractions recollées depuis le PDF (BO c4 p.8, Exemples 2026 p.12) : contrôle visuel par Claude décidé le 2026-10-18 (question c4-8), écarts signalés à David ; tant qu'il n'est pas fait, ces exemples ne servent pas à refuser un modèle.
- **5-027** — Résoudre des problèmes avec des additions et soustractions de fractions.
  - Fractions positives (rationnels relatifs : 4e). — _BO c4 p.9_ (déduite)
  - Additions et soustractions de fractions seulement (multiplication et division : 4e). — _BO c4 p.8-9_ (BO)
  - ⚠ Lecture déduite (texte implicite) : Fractions positives (rationnels relatifs : 4e).
- **5-123** — Soustraire des fractions de dénominateurs quelconques (2/3 − 1/4 = ?).
  - Fractions positives (rationnels relatifs : 4e). — _BO c4 p.9_ (déduite)
  - Dénominateurs quelconques ; dénominateur commun cherché parmi les multiples (3/8 + 7/6 ; 5/12 − 2/9). Automatismes : 3/5 + 4/5 ; 1 − 2/3 ; 4/7 − 2/21 ; 3 + 2/5 ; 2/5 + 1/4. — _BO c4 p.8 ; Exemples 2026 p.12_ (BO)
  - La simplification du résultat n'est pas exigible (simplifier : 4e ; irréductible : 3e). — _BO c4 p.9-10_ (déduite)
  - ⚠ Contradiction : Attendus 5e 2019 (p.3) et Repères 2019 (p.2) limitent aux dénominateurs égaux ou multiples ; le BO en vigueur dit « dénominateurs quelconques » (et le libellé en prod aussi). Lecture déduite (texte implicite) : Fractions positives (rationnels relatifs : 4e). | La simplification du résultat n'est pas exigible (simplifier : 4e ; irréductible : 3e). Fractions recollées depuis le PDF (BO c4 p.8, Exemples 2026 p.12) : contrôle visuel par Claude décidé le 2026-10-18 (question c4-8), écarts signalés à David ; tant qu'il n'est pas fait, ces exemples ne servent pas à refuser un modèle.

### Nombres et calculs > Nombres relatifs

- **5-012** — Définir les nombres relatifs.
  - Relatifs construits d'abord entiers puis décimaux ; opposé défini par a + b = 0. — _Exemples 2026 p.10 ; Repères c4 2019 p.2_ (acc.)
- **5-013** — Donner l'opposé d'un nombre relatif (opposé de −3 = ?).
  - Opposé d'un décimal relatif ; −(−a) = a. — _Exemples 2026 p.10_ (acc.)
- **5-014** — Définir la notion de nombre positif, strictement positif, négatif, strictement négatif. — _hérite des bornes générales_
- **5-015** — Utiliser les nombres relatifs pour représenter des grandeurs observables qui peuvent prendre des valeurs inférieures à zéro (température, temps, altitude, etc.), en particulier dans le cadre de la résolution de problèmes.
  - Contextes : température, temps, altitude, etc. — _BO c4 p.7_ (BO)
- **5-016** — Lire l'abscisse d'un point sur une droite graduée (nombres relatifs).
  - Abscisses décimales relatives « simples » ; graduations en dixièmes, moitiés, quarts, tiers possibles. — _Exemples 2026 p.10 ; BO c4 p.8_ (acc.)
- **5-017** — Comparer deux nombres décimaux relatifs (−3,5 … −5).
  - Décimaux relatifs ; méthode signe + distance à zéro, droite graduée en appui. — _Exemples 2026 p.10_ (acc.)
- **5-018** — Additionner deux nombres décimaux relatifs.
  - Décimaux relatifs ; règle établie d'abord sur des entiers. — _Exemples 2026 p.10_ (acc.)
  - Décimaux à une ou deux décimales (automatisme du thème). — _BO c4 p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Décimaux à une ou deux décimales (automatisme du thème).
- **5-019** — Additionner plusieurs nombres décimaux relatifs.
  - Décimaux relatifs ; règle établie d'abord sur des entiers. — _Exemples 2026 p.10_ (acc.)
  - Décimaux à une ou deux décimales (automatisme du thème). — _BO c4 p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Décimaux à une ou deux décimales (automatisme du thème).
- **5-020** — Soustraire deux nombres décimaux relatifs.
  - Décimaux relatifs ; règle établie d'abord sur des entiers. — _Exemples 2026 p.10_ (acc.)
  - Décimaux à une ou deux décimales (automatisme du thème). — _BO c4 p.7_ (déduite)
  - Exemples : −9 + 6 ; −5,6 − 3 ; 4 − 9 ; −12 − (−2). — _Attendus 5e 2019 p.3_ (acc.)
  - ⚠ Lecture déduite (texte implicite) : Décimaux à une ou deux décimales (automatisme du thème).
- **5-021** — Connaitre et justifier les situations dans lesquelles des parenthèses sont indispensables au sens des écritures.
  - Écritures du type (−2), −(−2), −(2 + 3), 3 + (−2), −(2 − 3). — _Exemples 2026 p.11_ (acc.)
- **5-022** — Simplifier l'écriture de sommes comportant des parenthèses.
  - Sommes avec parenthèses de décimaux relatifs, ex. (−3) + (−4) − (+5) − (−2) = −3 − 4 − 5 + 2. — _Exemples 2026 p.11_ (acc.)
  - ⚠ Léger écart : la ressource 2016 (nombres relatifs) recommande d'éviter les écritures du type (+3) ; l'exemple 2026 utilise −(+5).
- **5-023** — Enchainer additions et soustractions de décimaux relatifs.
  - Décimaux relatifs ; règle établie d'abord sur des entiers. — _Exemples 2026 p.10_ (acc.)
  - Décimaux à une ou deux décimales (automatisme du thème). — _BO c4 p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Décimaux à une ou deux décimales (automatisme du thème).
- **5-024** — Résoudre des problèmes mobilisant addition et soustraction de nombres décimaux relatifs.
  - Addition et soustraction de décimaux relatifs seulement. — _BO c4 p.8_ (BO)
- **5-120** — Donner la valeur absolue d'un nombre relatif (valeur absolue de −3 = ?).
  - Valeur absolue admise en mots (« valeur absolue de −3 »), appui sur la droite graduée ; ni la notation |a| ni calcul sur |a| (|−3|, |x| = 3, |a − b| hors point). — _Décision de David, 2026-10-18 (question c4-1) ; d'après Exemples 2026 p.10_ (**décision**)
  - ⚠ Les Exemples 2026 disent que le terme « ne fait pas l'objet d'exercice » et que la notation n'est pas exigible, mais aussi que l'élève « donne la valeur absolue ».
- **5-121** — Placer sur une droite graduée un point d'abscisse relative donnée.
  - Abscisses décimales relatives « simples » ; graduations en dixièmes, moitiés, quarts, tiers possibles. — _Exemples 2026 p.10 ; BO c4 p.8_ (acc.)
- **5-122** — Ranger des nombres décimaux relatifs dans l'ordre croissant ou décroissant.
  - Décimaux relatifs ; méthode signe + distance à zéro, droite graduée en appui. — _Exemples 2026 p.10_ (acc.)

### Nombres et calculs > Opérations

- **5-001** — Additionner, soustraire, multiplier et diviser pour résoudre des problèmes et contrôler la vraisemblance de son résultat.
  - Opérations sur les décimaux positifs (les opérations ×, ÷ sur les relatifs sont de 4e). — _BO c4 p.7-9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Opérations sur les décimaux positifs (les opérations ×, ÷ sur les relatifs sont de 4e).
- **5-002** — Connaitre le sens et les situations d'emploi de l'addition, de la soustraction, de la multiplication et de la division. — _hérite des bornes générales_
- **5-003** — Diviser par un nombre décimal.
  - Diviseur décimal non entier, ramené à un diviseur entier (1,5 ÷ 0,3 = 15 ÷ 3 = 5). — _Exemples 2026 p.9_ (acc.)
- **5-004** — Enchainer des opérations.
  - Enchaînements des quatre opérations sur des décimaux positifs, avec ou sans parenthèses, à effectuer mentalement ou à la main (calculatrice exceptionnelle). — _Exemples 2026 p.9_ (acc.)
  - Exemples de réussite : 5 + 3 × 4 ; 10 − (1 + 6) ; 5,5 + 6 × 2,4 ; 12 − (5,3 + 3,8). — _Attendus 5e 2019 p.3_ (acc.)
- **5-005** — Traduire un problème en une seule expression (Léo achète 3 cahiers à 2 € et un stylo à 1 € : écris le calcul du prix).
  - Une seule expression, avec ou sans parenthèses. — _BO c4 p.7_ (BO)
- **5-006** — Nommer un calcul : dire s'il est une somme ou un produit (3 + 4 × 5 est une somme).
  - Nature du calcul : somme ou produit seulement (le vocabulaire complet — différence, quotient — est l'objet du point 4-004). — _BO c4 p.7 ; 9_ (déduite)
  - ⚠ Le BO de 5e dit « distinguer sommes et produits, termes et facteurs » ; le vocabulaire quotient/différence n'est explicite qu'en 4e. Lecture déduite (texte implicite) : Nature du calcul : somme ou produit seulement (le vocabulaire complet — différence, quotient — est l'objet du point 4-004).
- **5-007** — Connaitre et utiliser les priorités opératoires.
  - × et ÷ prioritaires sur + et − ; parenthèses ; les puissances simples relèvent du point 5-032. — _Exemples 2026 p.9_ (acc.)
  - Décimaux positifs. — _BO c4 p.7-9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Décimaux positifs.
- **5-008** — Connaitre et utiliser la distributivité simple sur des exemples numériques.
  - Sur des exemples numériques : k(a + b) = ka + kb et k(a − b) = ka − kb (27 × 99 ; 1,5 × 0,7 + 1,5 × 0,3). — _Exemples 2026 p.9_ (acc.)
  - Décimaux positifs. — _BO c4 p.7-9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Décimaux positifs.
- **5-009** — Utiliser les notions de multiples et diviseurs.
  - Entiers naturels ; vocabulaire « multiple de », « divisible par », « diviseur de » ; tables de multiplication ou division euclidienne. — _Exemples 2026 p.9_ (acc.)
  - Pas de nombres premiers ni de décomposition en facteurs premiers (simple prolongement culturel en 5e ; décomposition en 3e). — _BO c4 p.7 ; 11_ (BO)
  - ⚠ Contradiction : les Attendus 5e 2019 (p.3-4) demandent les nombres premiers ≤ 30 et la décomposition en facteurs premiers ; le BO en vigueur ne les met qu'en prolongement (5e) et en automatisme de 3e.
- **5-010** — Connaître le critère de divisibilité par 3 (4 518 est-il divisible par 3 ?).
  - Critère de divisibilité par 3 sur des entiers naturels. — _BO c4 p.7_ (BO)
- **5-011** — Mobiliser un algorithme dans le cadre du calcul numérique.
  - Algorithme de la division (recherche des diviseurs, nombre de diviseurs), Scratch ou tableur. — _Exemples 2026 p.10_ (acc.)
- **5-116** — Traduire une succession donnée d'opérations en une seule expression (ajoute 3 à 5, puis multiplie le résultat par 2 : écris le calcul).
  - Une seule expression, avec ou sans parenthèses. — _BO c4 p.7_ (BO)
- **5-117** — Traduire un programme de calcul en une seule expression (choisis 5, ajoute 3, multiplie par 2 : écris l'expression).
  - Une seule expression, avec ou sans parenthèses. — _BO c4 p.7_ (BO)
- **5-118** — Identifier les termes d'une somme ou les facteurs d'un produit.
  - Vocabulaire : termes d'une somme, facteurs d'un produit. — _BO c4 p.7_ (BO)
- **5-119** — Connaître le critère de divisibilité par 9 (4 518 est-il divisible par 9 ?).
  - Critère de divisibilité par 9 sur des entiers naturels. — _BO c4 p.7_ (BO)

### Nombres et calculs > Puissances

- **5-028** — Découvrir la notion de puissance d'un nombre et sa notation dans le cas du carré et du cube.
  - Carré et cube d'un décimal positif seulement. — _BO c4 p.8 ; Exemples 2026 p.12_ (BO)
- **5-029** — Connaitre les carrés des entiers de 0 à 12.
  - Carrés des entiers de 0 à 12. — _BO c4 p.8_ (BO)
- **5-030** — Connaitre le cube de 10.
  - Le seul cube exigé est 10³ = 1 000. — _BO c4 p.8_ (BO)
- **5-031** — Savoir écrire un nombre sous la forme d'une puissance 2 ou 3.
  - Écrire « si possible » un nombre sous la forme a² et/ou a³ (64 = 8² = 4³) ; bases entières. — _Exemples 2026 p.12_ (acc.)
- **5-032** — Calculer la valeur numérique d'expressions contenant des puissances simples, additions, soustractions et produits.
  - Puissances d'exposant 2 ou 3, avec additions, soustractions et produits (pas de quotient) : 3 × 5² − 7 vs (3 × 5)² − 7. — _BO c4 p.8 ; Exemples 2026 p.12_ (BO)
  - Bases décimales positives. — _BO c4 p.8-9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Bases décimales positives.
- **5-033** — Calculer la valeur d'une expression littérale contenant une puissance simple.
  - Un terme en x² ou x³ : A = 3x² − 7, (3x)² − 7. — _Exemples 2026 p.12_ (acc.)
  - Valeur substituée décimale positive (le carré d'un négatif suppose le produit de relatifs : 4e). — _BO c4 p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Valeur substituée décimale positive (le carré d'un négatif suppose le produit de relatifs : 4e).

### Organisation et gestion de données et probabilités > Probabilités

- **5-082** — Utiliser le vocabulaire des probabilités dans des contextes concrets : expérience aléatoire, issue, évènement. — _hérite des bornes générales_
- **5-083** — Attribuer des probabilités dans des cas simples (équiprobabilité).
  - Une épreuve, équiprobabilité ; probabilité sous forme de fraction, de décimal ou de pourcentage. — _BO c4 p.17_ (BO)
- **5-084** — Répéter matériellement une expérience aléatoire simple. Enregistrer les résultats observés dans un tableau d'effectifs et de fréquences.
  - Expérience simple réellement répétée (ex. vingt lancers d'une pièce ou d'un dé). — _Exemples 2026 p.35_ (acc.)

### Organisation et gestion de données et probabilités > Statistiques

- **5-075** — Recueillir et organiser des données. — _hérite des bornes générales_
- **5-076** — Calculer des effectifs à partir de données. — _hérite des bornes générales_
- **5-077** — Lire une donnée sur un graphique (quelle est la valeur en 2020 ?). — _hérite des bornes générales_
- **5-078** — Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau. — _hérite des bornes générales_
- **5-079** — Choisir une représentation adaptée à ce qu'il convient de mettre en avant. — _hérite des bornes générales_
- **5-080** — Calculer la moyenne simple d'une série de données (12, 15, 9, 14 → ?).
  - Moyenne simple seulement (pondérée : 4e). — _BO c4 p.16-17_ (BO)
  - Données souvent entières ; la moyenne peut être non entière (329 SMS / 14 jours = 23,5). — _Exemples 2026 p.34_ (acc.)
  - ⚠ Contradiction : les Attendus 5e 2019 (p.5) demandent la moyenne « simple ou pondérée » ; le BO en vigueur met la pondérée en 4e.
- **5-109** — Lire une donnée dans un tableau (combien d'élèves ont 12 ans ?). — _hérite des bornes générales_
- **5-110** — Lire une donnée sur un diagramme en barres (combien d'élèves ont 12 ans ?). — _hérite des bornes générales_
- **5-111** — Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).
  - Diagramme circulaire sans mesure d'angle supérieure à 180° (diagramme semi-circulaire aussi). — _Attendus 5e 2019 p.5_ (acc.)
  - ⚠ Borne issue des Attendus 2019 seulement (non contredite par le BO, mais non reprise par l'accompagnement 2026).
- **5-112** — Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un diagramme en barres. — _hérite des bornes générales_
- **5-113** — Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un diagramme circulaire.
  - Diagramme circulaire sans mesure d'angle supérieure à 180° (diagramme semi-circulaire aussi). — _Attendus 5e 2019 p.5_ (acc.)
  - ⚠ Borne issue des Attendus 2019 seulement (non contredite par le BO, mais non reprise par l'accompagnement 2026).
- **5-114** — Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un graphique cartésien. — _hérite des bornes générales_
- **5-134** — Calculer une fréquence (sous forme décimale, fractionnaire ou de pourcentage).
  - Fréquence sous forme décimale, fractionnaire ou de pourcentage. — _BO c4 p.16_ (BO)
- **5-135** — Interpréter les données d'un graphique (entre quelles années la valeur a-t-elle le plus augmenté ?). — _hérite des bornes générales_
- **5-136** — Interpréter les données d'un tableau (quel âge est le plus fréquent ?). — _hérite des bornes générales_
- **5-137** — Interpréter les données d'un diagramme en barres (quel âge est le plus fréquent ?). — _hérite des bornes générales_
- **5-138** — Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?). — _hérite des bornes générales_
- **5-139** — Interpréter la moyenne simple d'une série de données (une moyenne de 12 veut-elle dire que chacun a 12 ?). — _hérite des bornes générales_

### Proportionnalité, fonctions > Fonctions

- **5-092** — Employer l'expression « en fonction de » dans des contextes concrets ou mathématiques.
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
- **5-093** — Produire un tableau de valeurs.
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
- **5-094** — Lire une donnée dans un tableau de valeurs (quelle valeur correspond à 3 ?).
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
- **5-095** — Placer dans un repère orthogonal donné des points correspondant à un tableau de valeurs.
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
- **5-096** — Lire une donnée sur un graphique cartésien, courbe ou nuage de points (quelle est l'ordonnée du point d'abscisse 2 ?).
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
- **5-097** — Traduire la relation de dépendance entre deux grandeurs par un tableau de valeurs à partir d'une formule.
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
  - Formule donnée (distance de freinage, température ressentie…). — _Exemples 2026 p.42_ (acc.)
- **5-098** — Produire une formule simple représentant la dépendance de deux grandeurs.
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
  - Formule simple (aire du carré de côté c ; volume d'un cylindre de rayon 3 cm en fonction de sa hauteur). — _Exemples 2026 p.42_ (acc.)
- **5-099** — Caractériser graphiquement la proportionnalité.
  - Droite passant par l'origine. — _Exemples 2026 p.42_ (acc.)
- **5-142** — Interpréter les données d'un tableau de valeurs (la grandeur augmente-t-elle quand x augmente ?).
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)
- **5-143** — Interpréter les données d'un graphique cartésien, courbe ou nuage de points (pour quelles valeurs la grandeur dépasse-t-elle 10 ?).
  - Pas de notation fonctionnelle exigible (le professeur peut introduire A(c) = c²). — _Exemples 2026 p.42_ (acc.)

### Proportionnalité, fonctions > Proportionnalité

- **5-085** — Utiliser des proportions, des pourcentages.
  - Pourcentages simples : automatismes 1 %, 10 %, 50 % ; attendus 10 %, 25 %, 50 %. — _BO c4 p.8 ; Attendus 5e 2019 p.6_ (acc.)
  - Sans coefficient multiplicateur (4e). — _BO c4 p.19_ (BO)
- **5-086** — Calculer une proportion ou un pourcentage (part du tout : 12 sur 48 = ? %).
  - Proportion d'un effectif en pourcentage (ex. 6 voix sur 24 ; 22 sur 40). — _BO c4 p.18 ; Exemples 2026 p.40_ (BO)
- **5-087** — Identifier des situations de proportionnalité dans des contextes concrets (prix, recettes, distances, échelles).
  - Contextes : prix, recettes, distances, échelles. — _BO c4 p.18_ (BO)
- **5-088** — Utiliser un coefficient de proportionnalité dans des contextes concrets (prix unitaire, vitesse moyenne, échelle, etc.).
  - Entiers, décimaux, fractions ou quotients, « mais doivent rester simples » ; unités conservées. — _Exemples 2026 p.40_ (acc.)
- **5-089** — Représenter une situation de proportionnalité par un tableau ou un graphique.
  - Tableau à deux lignes (ou colonnes) associé à une situation concrète ; pas de tableau de nombres décontextualisé. — _Exemples 2026 p.40_ (acc.)
- **5-090** — Reconnaître une situation de proportionnalité à partir d'un tableau (quotients égaux).
  - Tableau à deux lignes (ou colonnes) associé à une situation concrète ; pas de tableau de nombres décontextualisé. — _Exemples 2026 p.40_ (acc.)
- **5-091** — Reconnaitre graphiquement qu'un nuage de points est ou n'est pas associé à une situation de proportionnalité entre données discrètes. — _hérite des bornes générales_
- **5-140** — Appliquer une proportion ou un pourcentage à une quantité (25 % de 48 = ?).
  - Pourcentages simples : automatismes 1 %, 10 %, 50 % ; attendus 10 %, 25 %, 50 %. — _BO c4 p.8 ; Attendus 5e 2019 p.6_ (acc.)
  - Sans coefficient multiplicateur (4e). — _BO c4 p.19_ (BO)
- **5-141** — Reconnaître une situation de proportionnalité à partir d'un graphique (points alignés avec l'origine).
  - Points alignés avec l'origine. — _Exemples 2026 p.42_ (acc.)

## Quatrième (82 points, 69 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Décimaux relatifs pour les quatre opérations ; rationnels relatifs (quotients d'entiers relatifs). — _BO c4 p.9_ (BO)
- Puissances d'exposant entier naturel seulement (a⁰ = 1) ; exposants négatifs et notation scientifique en 3e. — _BO c4 p.9-10 ; Exemples 2026 p.17_ (BO)
- Équations du premier degré ax + b = c et ax + b = cx + d ; pas d'inéquation, pas d'équation produit (3e). — _BO c4 p.10-11_ (BO)
- Distributivité simple seulement ; double distributivité et identités remarquables en 3e. — _BO c4 p.10-11_ (BO)
- Racine carrée : définition et encadrement ; aucune propriété algébrique des racines (√a × √b…). — _BO c4 p.10 ; Repères c4 2019 p.4_ (acc.)
- Pas de théorème de Thalès ni de trigonométrie (3e) ; translation sans définition ponctuelle. — _BO c4 p.14-15 ; Exemples 2026 p.28_ (BO)
- Notation fonctionnelle (A(c), p(t)) utilisable dans l'énoncé, jamais exigée dans la réponse ; vocabulaire image/antécédent et notation f : x ↦ réservés à la 3e. — _Décision de David, 2026-10-18 (question c4-6) ; d'après BO c4 p.18_ (**décision**)

### Espace et géométrie > Parallélogrammes et translations

- **4-030** — Comprendre l'effet d'une translation.
  - La définition ponctuelle de la translation n'est pas au programme de 4e (elle l'est en 3e). — _Exemples 2026 p.28_ (acc.)
- **4-031** — Faire le lien entre la translation et les parallélogrammes, les angles.
  - La définition ponctuelle de la translation n'est pas au programme de 4e (elle l'est en 3e). — _Exemples 2026 p.28_ (acc.)
- **4-032** — Connaitre et utiliser les propriétés de conservations des translations.
  - La définition ponctuelle de la translation n'est pas au programme de 4e (elle l'est en 3e). — _Exemples 2026 p.28_ (acc.)
  - Conservation des distances et des angles (et du parallélisme, des aires). — _Exemples 2026 p.28 ; Attendus 4e 2019 p.8_ (acc.)

### Espace et géométrie > Représentation de l'espace

- **4-027** — Reconnaitre des solides (pyramide, cône de révolution).
  - Pyramide, cône de révolution. — _BO c4 p.14_ (BO)
- **4-028** — Construire et mettre en relation différentes représentations des solides (pavé droit, cube, cylindre de révolution, prisme droit, pyramides et cônes de révolution).
  - Pavé droit, cube, cylindre de révolution, prisme droit, pyramides, cônes de révolution. — _BO c4 p.14_ (BO)
- **4-029** — Connaître le volume d'une pyramide (V = B × h / 3).
  - V = aire de base × hauteur ÷ 3. — _Exemples 2026 p.27_ (acc.)
- **4-076** — Connaître le volume d'un cône de révolution (V = π r² h / 3).
  - V = πr²h ÷ 3. — _Exemples 2026 p.27_ (acc.)

### Espace et géométrie > Triangles

- **4-033** — Connaitre les trois théorèmes relatifs à la droite des milieux dans un triangle.
  - Les trois théorèmes : droite des milieux parallèle au 3e côté ; parallèle par un milieu coupe le 3e côté en son milieu ; segment des milieux = moitié du 3e côté. — _Exemples 2026 p.28_ (acc.)
- **4-034** — Connaitre le théorème de Pythagore.
  - Calculer un côté connaissant les deux autres ; résultat exact (√) ou approché à la calculatrice. — _Exemples 2026 p.28 ; Attendus 4e 2019 p.3_ (acc.)
  - ⚠ Les Attendus 4e 2019 (p.9-10) ajoutent le cosinus et Thalès (triangles emboîtés) en 4e : contradiction avec le BO en vigueur (3e).
- **4-035** — Mener un travail de logique sur la réciproque et la contraposée : savoir que si une propriété est vraie alors sa contraposée l'est aussi, sans pour autant que sa réciproque soit vraie. — _hérite des bornes générales_
- **4-036** — Caractériser un triangle rectangle à l'aide de son cercle circonscrit, par son inscription dans un demi-cercle dont le diamètre est un côté du triangle.
  - Propriété démontrée en 4e. — _Exemples 2026 p.29_ (acc.)
- **4-037** — Déterminer le centre du cercle circonscrit d'un triangle rectangle. — _hérite des bornes générales_
- **4-038** — Construire des rectangles sans équerre. — _hérite des bornes générales_
- **4-072** — Connaitre la réciproque et la contraposée du théorème de Pythagore.
  - Le mot « contraposée » est attendu. — _Exemples 2026 p.28_ (acc.)

### La pensée informatique

- **4-065** — Représenter des conditions simples.
  - Conditions simples avec les opérateurs <, > et =. — _Exemples 2026 p.48_ (acc.)
- **4-066** — Écrire des instructions conditionnelles.
  - Conditions simples avec les opérateurs <, > et =. — _Exemples 2026 p.48_ (acc.)
- **4-067** — Manipuler une variable.
  - Une seule variable (ex. accumulation dans une boucle). — _Exemples 2026 p.48_ (acc.)
- **4-068** — Écrire un programme simple donné pour réaliser un objectif ou résoudre un problème. — _hérite des bornes générales_
- **4-069** — Modifier un programme donné pour changer son comportement. — _hérite des bornes générales_

### Nombres et calculs > Calcul littéral et algébrique

- **4-021** — Produire des formules et tester leur vraisemblance : nombres pairs/impairs (un nombre pair : 2n).
  - Pair : 2n ; impair : 2n + 1, n entier. — _Exemples 2026 p.18_ (acc.)
- **4-022** — Connaitre et utiliser la distributivité simple pour développer une expression algébrique.
  - Distributivité simple dans les quatre sens k(a + b), (a + b)k ; rôle du facteur −1 ; expressions à une variable pouvant contenir x² (x² − x = x(x − 1)). — _Exemples 2026 p.18_ (acc.)
  - Pas de double distributivité (3e). — _BO c4 p.11_ (BO)
- **4-023** — Utiliser le calcul algébrique pour produire des démonstrations.
  - Ex. équivalence de programmes de calcul, somme de 3 entiers consécutifs multiple de 3. — _Exemples 2026 p.18_ (acc.)
- **4-024** — Résoudre une équation du premier degré du type ax + b = c.
  - ax + b = c avec a, b, c entiers relatifs (4x + 2 = 0 ; 5x − 7 = 3). — _Exemples 2026 p.18 ; Attendus 4e 2019 p.4_ (acc.)
  - ⚠ Contradiction : la ressource 2016 (calcul littéral) dit que la méthode algébrique de résolution « est explicitée en classe de 3e » ; le BO en vigueur la place en 4e.
- **4-025** — Résoudre une équation du premier degré du type ax + b = cx + d.
  - Coefficients entiers relatifs (2x + 5 = −x − 4 ; 5x − 6 = 3x + 2). — _Attendus 4e 2019 p.4_ (acc.)
  - Équation du premier degré à une inconnue (pas de produit nul ni de x² : 3e). — _BO c4 p.10-11_ (BO)
  - ⚠ Contradiction : la ressource 2016 (calcul littéral) dit que la méthode algébrique de résolution « est explicitée en classe de 3e » ; le BO en vigueur la place en 4e.
- **4-026** — Formuler des conjectures à l'aide d'un algorithme ou d'un tableur pour résoudre de manière exacte ou approchée une équation.
  - Résolution exacte ou approchée au tableur ou par algorithme. — _Exemples 2026 p.18_ (acc.)
- **4-070** — Connaitre et utiliser la distributivité simple pour factoriser une expression algébrique.
  - Distributivité simple dans les quatre sens k(a + b), (a + b)k ; rôle du facteur −1 ; expressions à une variable pouvant contenir x² (x² − x = x(x − 1)). — _Exemples 2026 p.18_ (acc.)
  - Pas de double distributivité (3e). — _BO c4 p.11_ (BO)
- **4-071** — Mettre en équation un problème à l'aide d'une équation du premier degré du type ax + b = cx + d.
  - Coefficients entiers relatifs (2x + 5 = −x − 4 ; 5x − 6 = 3x + 2). — _Attendus 4e 2019 p.4_ (acc.)
  - Équation du premier degré à une inconnue (pas de produit nul ni de x² : 3e). — _BO c4 p.10-11_ (BO)
- **4-075** — Produire des formules et tester leur vraisemblance : aires de formes géométriques simples (aire d'un triangle de base b et de hauteur h).
  - Aires de formes géométriques simples (triangle de base b et hauteur h). — _BO c4 p.10_ (BO)

### Nombres et calculs > Nombres rationnels

- **4-005** — Simplifier une fraction.
  - Simplifier, sans exiger la forme irréductible (irréductible : 3e). — _BO c4 p.9-10_ (déduite)
  - ⚠ Contradiction : Attendus 4e 2019 (p.3) et Repères 2019 (p.4) font simplifier à l'aide des nombres premiers < 100 ; le BO en vigueur ne cite pas les nombres premiers en 4e. Lecture déduite (texte implicite) : Simplifier, sans exiger la forme irréductible (irréductible : 3e).
- **4-006** — Définir la notion de nombre rationnel : le quotient de deux nombres entiers relatifs.
  - Quotient de deux entiers relatifs, dénominateur non nul ; un rationnel peut être entier, décimal, ou ni l'un ni l'autre. — _BO c4 p.9 ; Exemples 2026 p.15_ (BO)
- **4-007** — Exprimer l'opposé d'un nombre rationnel.
  - −a/b = −(a/b), établi sur des exemples génériques. — _Exemples 2026 p.15_ (acc.)
- **4-008** — Calculer le produit de nombres rationnels.
  - Produit de deux rationnels (fractions relatives). — _Exemples 2026 p.15_ (acc.)
- **4-009** — Calculer la fraction d'une fraction, d'un nombre ou d'une quantité (2/3 de 3/5 = ?).
  - La fraction d'une fraction se calcule par le produit (2/3 de 4/5 = 8/15). — _Exemples 2026 p.16_ (acc.)
- **4-010** — Définir l'inverse d'un nombre et connaitre sa notation.
  - Inverse de a ≠ 0, noté 1/a. — _Exemples 2026 p.16_ (acc.)
- **4-011** — Déterminer l'inverse d'une fraction.
  - Inverse de a/b (a, b non nuls) : b/a. — _Exemples 2026 p.16_ (acc.)
- **4-012** — Diviser des fractions.
  - Diviser par une fraction revient à multiplier par son inverse. — _Exemples 2026 p.16_ (acc.)
- **4-013** — Calculer la valeur d'expressions comportant plusieurs opérations avec des fractions.
  - Enchaînements avec priorités, ex. 7/4 − 3/4 × 9/8. — _Exemples 2026 p.16_ (acc.)
- **4-014** — Résoudre des problèmes mobilisant les opérations sur les fractions : addition, soustraction, multiplication, division, inverse.
  - Addition, soustraction, multiplication, division, inverse. — _BO c4 p.9_ (BO)
- **4-074** — Représenter la fraction d'une fraction ou d'une quantité (par un schéma).
  - Représentation sur un carré unité ou un schéma en barres. — _Exemples 2026 p.16_ (acc.)

### Nombres et calculs > Opérations sur les nombres relatifs

- **4-001** — Multiplier deux nombres relatifs : d'abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où les deux facteurs sont négatifs.
  - Décimaux relatifs ; introduit sur des entiers puis étendu aux décimaux non entiers. — _Exemples 2026 p.14_ (acc.)
  - Exemples : −3 × 4 + 5 ; (7 − 9) × (−2) ; 2,4 × (−0,5). — _Exemples 2026 p.14 ; Attendus 4e 2019 p.3_ (acc.)
- **4-002** — Diviser deux nombres relatifs.
  - Décimaux relatifs ; introduit sur des entiers puis étendu aux décimaux non entiers. — _Exemples 2026 p.14_ (acc.)
  - Exemples : −12,8 : 2 ; −63 : (−0,7) ; 7,2 : (−5). — _Attendus 4e 2019 p.3_ (acc.)
- **4-003** — Savoir calculer un enchainement d'opérations avec des nombres relatifs.
  - Décimaux relatifs ; introduit sur des entiers puis étendu aux décimaux non entiers. — _Exemples 2026 p.14_ (acc.)
  - Quatre opérations avec priorités : (−3) + (−4) × (+7) ; −5(2 − 7). — _Exemples 2026 p.15_ (acc.)
- **4-004** — Nommer un enchaînement d'opérations avec le vocabulaire (somme, produit, quotient…) : (3 + 5) × 2 est « le produit de la somme de 3 et 5 par 2 ».
  - Vocabulaire somme, différence, produit, quotient. — _BO c4 p.9_ (BO)
- **4-073** — Écrire l'enchaînement d'opérations décrit par une phrase (« le quotient de 12 par la somme de 2 et 4 » = ?).
  - Vocabulaire somme, différence, produit, quotient. — _BO c4 p.9_ (BO)

### Nombres et calculs > Opérations sur les nombres relatifs > Automatismes

- **4-082** — Somme des opposés : savoir que la somme de deux nombres opposés est nulle (−7,5 + 7,5 = 0).
  - Décimaux relatifs (−7,5 + 7,5 = 0). — _BO c4 p.9_ (BO)

### Nombres et calculs > Puissances

- **4-015** — Définir les puissances d'exposant positif d'un nombre a.
  - Exposant entier naturel ; a⁰ = 1 par convention ; pas d'exposant négatif. — _BO c4 p.10 ; Exemples 2026 p.17_ (BO)
  - ⚠ Contradiction : Attendus 4e 2019 (p.2) et ressource 2016 (puissances) placent les puissances de 10 d'exposant négatif, la notation scientifique et les préfixes nano→giga en 4e ; le BO en vigueur les place en 3e.
- **4-016** — Multiplier des puissances d'exposant entier naturel d'un même nombre entre elles.
  - m, n entiers naturels. — _Exemples 2026 p.17_ (acc.)
  - aᵐ × aⁿ = aᵐ⁺ⁿ, découverte sur des exemples génériques. — _Exemples 2026 p.17_ (acc.)
  - ⚠ Contradiction : Repères 2019 (p.4) et ressource 2016 disent que la connaissance des formules générales sur les puissances « n'est pas un attendu » ; l'accompagnement 2026 donne les formules.
- **4-017** — Multiplier des puissances d'un même exposant entier naturel de deux nombres entre elles.
  - m, n entiers naturels. — _Exemples 2026 p.17_ (acc.)
  - (ab)ⁿ = aⁿbⁿ. — _Exemples 2026 p.17_ (acc.)
  - ⚠ Contradiction : Repères 2019 (p.4) et ressource 2016 disent que la connaissance des formules générales sur les puissances « n'est pas un attendu » ; l'accompagnement 2026 donne les formules.
- **4-018** — Résoudre des problèmes faisant intervenir des puissances.
  - m, n entiers naturels. — _Exemples 2026 p.17_ (acc.)

### Nombres et calculs > Racine carrée

- **4-019** — Comprendre et connaitre la définition de la racine carrée d'un nombre positif.
  - Côté d'un carré d'aire carré parfait ≤ 144, mentalement ; carrés des entiers de 0 à 12. — _Exemples 2026 p.17 ; BO c4 p.10_ (acc.)
  - Racine carrée d'un nombre positif quelconque (√2, √20 dans le point) : « nombre entier positif » (Exemples 2026 p.17) est une coquille. — _Décision de David, 2026-10-18 (question c4-7) ; d'après BO c4 p.10_ (**décision**)
  - ⚠ La borne des carrés parfaits ≤ 144 vaut pour le calcul mental.
- **4-020** — Encadrer la racine carrée d'un entier par deux nombres entiers consécutifs.
  - Racine d'un entier encadrée par deux entiers consécutifs (aire 20 cm² → entre 4 et 5). — _BO c4 p.10 ; Exemples 2026 p.17_ (BO)

### Organisation et gestion de données et probabilités > Probabilités

- **4-046** — Utiliser le vocabulaire et les notations ensemblistes pour décrire une expérience aléatoire dans des cas simples et définir la notion d'évènement.
  - Univers, évènements comme ensembles d'issues ; complémentaire, ∪, ∩, ∅. — _BO c4 p.17 ; Exemples 2026 p.37_ (BO)
  - ⚠ Contradiction : la ressource 2016 (probabilités) dit que « la formalisation ensembliste n'est pas un attendu » ; le BO en vigueur l'inscrit en 4e.
- **4-047** — Définir : complémentaire, réunion, intersection, ensemble vide (évènement impossible).
  - Univers, évènements comme ensembles d'issues ; complémentaire, ∪, ∩, ∅. — _BO c4 p.17 ; Exemples 2026 p.37_ (BO)
  - ⚠ Contradiction : la ressource 2016 (probabilités) dit que « la formalisation ensembliste n'est pas un attendu » ; le BO en vigueur l'inscrit en 4e.
- **4-048** — Calculer la probabilité d'un évènement. — _hérite des bornes générales_
- **4-049** — Calculer la probabilité d'un évènement dans des exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.).
  - Deux épreuves : deux pièces, une pièce et un dé, deux dés… ; issues équiprobables justifiées. — _BO c4 p.17_ (BO)
  - Dénombrement par tableau ou arbre. — _Exemples 2026 p.37_ (acc.)
  - ⚠ Contradiction : Repères 2019 (p.7) mettent les deux épreuves en 3e « dans des cas très simples », avec des tableaux uniquement (« la notion d'arbre ne figurant pas au programme ») ; BO en vigueur (4e) et accompagnement 2026 (arbre admis).
- **4-050** — À partir de la répétition d'une expérience aléatoire, réalisée matériellement ou simulée, comparer des graphiques de distributions (fréquentielle et probabiliste). — _hérite des bornes générales_
- **4-051** — Observer la fluctuation des fréquences pour un nombre de répétitions fixé de l'expérience aléatoire. — _hérite des bornes générales_
- **4-079** — Calculer la probabilité de l'évènement contraire (P(non A) = 1 − P(A)).
  - P(non A) = 1 − P(A). — _BO c4 p.17_ (BO)

### Organisation et gestion de données et probabilités > Statistiques

- **4-039** — Calculer une moyenne pondérée dans le cas d'une série discrète de petits effectifs présentée sous forme de données brutes, d'un tableau ou d'un diagramme en barres.
  - Série discrète de petits effectifs ; données brutes, tableau ou diagramme en barres. — _BO c4 p.17_ (BO)
- **4-040** — Déterminer la médiane d'une série de petit effectif présentée sous forme de données brutes (3, 7, 8, 12, 15 → ?).
  - Série de petit effectif en données brutes (effectif total ≤ 30, pair ou impair). — _BO c4 p.17 ; Attendus 4e 2019 p.5_ (BO)
  - Médiane = toute valeur qui partage la série ordonnée en deux sous-séries de même effectif ; pour un effectif pair, elle n'est pas unique. — _Exemples 2026 p.36_ (acc.)
  - Effectif pair : le correcteur accepte toute valeur comprise entre les deux valeurs centrales, bornes comprises (3, 7, 8, 12 : de 7 à 8) (ou le modèle ne tire que des effectifs impairs). — _Décision de David, 2026-10-18 (question c4-3), bornes précisées le 2026-10-20 ; d'après Exemples 2026 p.36_ (**décision**)
  - ⚠ Un modèle à effectif pair qui n'accepte que la demi-somme est à corriger.
- **4-041** — Calculer l'étendue d'une série présentée sous forme de données brutes, d'un tableau ou d'un diagramme.
  - Données brutes, tableau, diagramme en barres, diagramme circulaire. — _BO c4 p.17_ (BO)
- **4-042** — Comprendre l'évolution de la médiane et de la moyenne quand on ajoute une valeur extrême. — _hérite des bornes générales_
- **4-043** — Résoudre des problèmes faisant intervenir les différents indicateurs. — _hérite des bornes générales_
- **4-044** — Résoudre des problèmes de comparaison de séries statistiques. — _hérite des bornes générales_
- **4-045** — Utiliser le tableur pour calculer une moyenne, une médiane et l'étendue d'une série statistique.
  - Fonctions somme, moyenne, médiane, max, min, nb du tableur. — _Exemples 2026 p.36_ (acc.)
- **4-077** — Interpréter la médiane d'une série de petit effectif (que dire des valeurs si la médiane vaut 8 ?).
  - Série de petit effectif en données brutes (effectif total ≤ 30, pair ou impair). — _BO c4 p.17 ; Attendus 4e 2019 p.5_ (BO)
  - Médiane = toute valeur qui partage la série ordonnée en deux sous-séries de même effectif ; pour un effectif pair, elle n'est pas unique. — _Exemples 2026 p.36_ (acc.)
- **4-078** — Interpréter l'étendue d'une série (laquelle des deux classes a les notes les plus dispersées ?).
  - Données brutes, tableau, diagramme en barres, diagramme circulaire. — _BO c4 p.17_ (BO)

### Proportionnalité, fonctions > Fonctions

- **4-060** — Appliquer un programme de calcul à plusieurs étapes à un nombre donné.
  - Programme à deux (plusieurs) étapes appliqué à un nombre « simple ». — _BO c4 p.19_ (BO)
- **4-061** — Savoir retrouver le nombre de départ après avoir remonté un programme de calcul simple.
  - Programme de calcul simple. — _BO c4 p.19_ (BO)
- **4-062** — Produire une formule littérale représentant la dépendance d'une grandeur en fonction d'une autre.
  - Notation fonctionnelle (A(c), p(t)) utilisable dans l'énoncé, jamais exigée dans la réponse ; vocabulaire image/antécédent et notation f : x ↦ réservés à la 3e. — _Décision de David, 2026-10-18 (question c4-6) ; d'après BO c4 p.18_ (**décision**)
  - ⚠ Le BO en vigueur (« utilisées progressivement dans tous les chapitres ») prime sur les Repères 2019 (« non formalisées en 4e »).
- **4-063** — Représenter l'expression d'une grandeur en fonction d'une autre par un graphique.
  - Notation fonctionnelle (A(c), p(t)) utilisable dans l'énoncé, jamais exigée dans la réponse ; vocabulaire image/antécédent et notation f : x ↦ réservés à la 3e. — _Décision de David, 2026-10-18 (question c4-6) ; d'après BO c4 p.18_ (**décision**)
  - ⚠ Le BO en vigueur (« utilisées progressivement dans tous les chapitres ») prime sur les Repères 2019 (« non formalisées en 4e »).
- **4-064** — Comprendre qu'une formule, un graphique ou un tableau de valeurs traduisent la dépendance d'une grandeur en fonction d'une autre.
  - Notation fonctionnelle (A(c), p(t)) utilisable dans l'énoncé, jamais exigée dans la réponse ; vocabulaire image/antécédent et notation f : x ↦ réservés à la 3e. — _Décision de David, 2026-10-18 (question c4-6) ; d'après BO c4 p.18_ (**décision**)
  - ⚠ Le BO en vigueur (« utilisées progressivement dans tous les chapitres ») prime sur les Repères 2019 (« non formalisées en 4e »).
- **4-081** — Appliquer un programme de calcul à plusieurs étapes à une variable (écrire l'expression obtenue en fonction de x).
  - Notation fonctionnelle (A(c), p(t)) utilisable dans l'énoncé, jamais exigée dans la réponse ; vocabulaire image/antécédent et notation f : x ↦ réservés à la 3e. — _Décision de David, 2026-10-18 (question c4-6) ; d'après BO c4 p.18_ (**décision**)
  - ⚠ Le BO en vigueur (« utilisées progressivement dans tous les chapitres ») prime sur les Repères 2019 (« non formalisées en 4e »).

### Proportionnalité, fonctions > Proportionnalité

- **4-052** — Utiliser des grandeurs quotients, avec ou sans unités.
  - Grandeurs quotients : €/L, €/kg, €/m, vitesse, masse volumique, consommation. — _Exemples 2026 p.42_ (acc.)
- **4-053** — Comparer deux nombres ou deux grandeurs à l'aide de leur rapport ou ratio. — _hérite des bornes générales_
- **4-054** — Exprimer la proportionnalité entre deux suites de nombres par des égalités de rapports ou sous forme de ratio.
  - a/2 = b/3 = c/7 ; ratio 2 : 3 : 7. — _Exemples 2026 p.42_ (acc.)
- **4-055** — Déterminer une quatrième proportionnelle.
  - Produit en croix (a/b = c/d ⇔ ad = bc), sans exclusivité des autres procédures. — _Exemples 2026 p.42_ (acc.)
- **4-056** — Calculer avec des pourcentages.
  - Automatismes : a % de c pour a = 100, 50, 25, 10, 1 ; 20 % de 120. — _BO c4 p.19_ (BO)
- **4-057** — Traduire une augmentation de t % par un coefficient multiplicateur (+ 20 % → × 1,2).
  - Augmenter de t % = multiplier par 1 + t/100 (+15 % → × 1,15). — _Exemples 2026 p.43_ (acc.)
- **4-058** — Définir le coefficient multiplicateur. — _hérite des bornes générales_
- **4-059** — Résoudre des problèmes de partage proportionnel.
  - Partage en parts proportionnelles à a, b (ou a, b, c) : ratio 5 : 11, 4 : 3 : 2. — _Exemples 2026 p.43_ (acc.)
- **4-080** — Traduire une diminution de t % par un coefficient multiplicateur (− 20 % → × 0,8).
  - Diminuer de t % = multiplier par 1 − t/100 (−20 % → × 0,8). — _Exemples 2026 p.43_ (acc.)

## Troisième (66 points, 55 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Tous les nombres du cycle : décimaux relatifs, rationnels, racines carrées ; puissances d'exposant entier relatif. — _BO c4 p.10-11_ (BO)
- Aucune propriété algébrique des racines carrées n'est attendue (√20 n'a pas à être écrit 2√5). — _Repères c4 2019 p.4_ (acc.)
- Pas de rotation, d'homothétie, de triangles semblables, d'histogramme ni de repérage sur la sphère : présents dans les Attendus 3e 2019, absents du BO en vigueur. — _BO c4 p.15-20_ (BO)
- « Aucune virtuosité calculatoire n'est attendue dans les développements et les factorisations. » — _Repères c4 2019 p.6_ (acc.)

### Espace et géométrie > Représentation de l'espace

- **3-018** — Définir la boule et la sphère. — _hérite des bornes générales_
- **3-019** — Définir les grands cercles et le diamètre d'une sphère. — _hérite des bornes générales_
- **3-020** — Visualiser et réaliser des sections de pavé parallèlement à une face, de cylindre parallèlement ou perpendiculairement à son axe, d'une boule.
  - Pavé parallèlement à une face, cylindre parallèlement ou perpendiculairement à son axe, boule. — _BO c4 p.15_ (BO)
  - ⚠ Les ajouts des Exemples 2026 p.30 (cube parallèlement à une arête, pyramide et cône parallèlement à la base) sont hors point : liste du BO seulement.
- **3-021** — Connaitre et utiliser la formule du volume d'une boule de rayon donné.
  - V = 4/3 πr³ (formule admise). — _Exemples 2026 p.30_ (acc.)

### Espace et géométrie > Translations et vecteurs

- **3-024** — Définir et utiliser la translation : définition ponctuelle avec parallélogramme.
  - Translation de vecteur AB : C a pour image l'unique D tel que ABDC soit un parallélogramme (éventuellement aplati). — _Exemples 2026 p.31_ (acc.)
  - ⚠ Contradiction : Repères 2019 (p.12) — « les définitions ponctuelles d'une translation… ne figurent pas au programme » et aucune connaissance sur l'objet vecteur ; le BO en vigueur les inscrit en 3e.
- **3-025** — Définir et utiliser les notions de vecteur, de vecteurs égaux, de vecteur nul, d'opposé d'un vecteur.
  - Vecteur non nul : direction, sens, longueur ; représentation sur quadrillage. — _Exemples 2026 p.31_ (acc.)
  - ⚠ Contradiction : Repères 2019 (p.12) — « les définitions ponctuelles d'une translation… ne figurent pas au programme » et aucune connaissance sur l'objet vecteur ; le BO en vigueur les inscrit en 3e.
- **3-026** — Définir et utiliser la somme de deux vecteurs par enchainement de deux translations. — _hérite des bornes générales_
- **3-027** — Découvrir et utiliser la relation de Chasles. — _hérite des bornes générales_

### Espace et géométrie > Triangles

- **3-022** — Reconnaître une configuration où le théorème de Thalès s'applique : triangles emboîtés ou papillon, avec (BC) // (MN) (quelle configuration ? quels triangles ?).
  - Configurations des triangles emboîtés et du papillon seulement. — _BO c4 p.15_ (BO)
  - ⚠ Contradiction : Attendus 4e 2019 (p.9) et Repères 2019 (p.11) placent Thalès (triangles emboîtés) en 4e ; le BO en vigueur le place en 3e.
- **3-023** — Connaître les lignes trigonométriques dans le triangle rectangle : écrire cosinus, sinus et tangente d'un angle (cos(B) = … / …).
  - Angle aigu d'un triangle rectangle ; cosinus, sinus, tangente. — _BO c4 p.15 ; Exemples 2026 p.30_ (BO)
  - ⚠ Contradiction : les Attendus 4e 2019 placent le cosinus en 4e ; le BO en vigueur met les trois lignes trigonométriques en 3e.
- **3-055** — Connaitre et appliquer la réciproque et la contraposée du théorème de Thalès (configurations des triangles emboités et configuration dite du papillon).
  - Configurations des triangles emboîtés et du papillon seulement. — _BO c4 p.15_ (BO)
- **3-059** — Écrire l'égalité des rapports du théorème de Thalès dans une configuration donnée (AM/AB = … = …).
  - Configurations des triangles emboîtés et du papillon seulement. — _BO c4 p.15_ (BO)
- **3-060** — Appliquer le théorème de Thalès pour calculer une longueur (AM = 3, AB = 5, BC = 7 : calcule MN).
  - Configurations des triangles emboîtés et du papillon seulement. — _BO c4 p.15_ (BO)
- **3-061** — Utiliser les lignes trigonométriques pour calculer une longueur ou un angle dans un triangle rectangle (BC = 6, angle B = 40° : calcule AB).
  - Angle aigu d'un triangle rectangle ; cosinus, sinus, tangente. — _BO c4 p.15 ; Exemples 2026 p.30_ (BO)
  - Angles en degrés ; calculatrice pour les valeurs. — _Exemples 2026 p.30_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Angles en degrés ; calculatrice pour les valeurs.

### La pensée informatique

- **3-047** — Approfondir la notion de variables.
  - Plusieurs variables dans un même programme. — _Exemples 2026 p.49_ (acc.)
- **3-048** — Utiliser des conditions composées.
  - Un opérateur logique combinant deux conditions simples. — _Exemples 2026 p.49_ (acc.)
- **3-049** — Utiliser une boucle conditionnelle. — _hérite des bornes générales_
- **3-050** — Structurer des programmes. — _hérite des bornes générales_
- **3-051** — Écrire un programme donné pour réaliser un objectif ou résoudre un problème. — _hérite des bornes générales_

### Nombres et calculs > Calcul littéral et algébrique

- **3-012** — Simplifier des expressions produits ou des rapports comportant des facteurs communs.
  - Produits et rapports à facteurs communs : (a²b) × (bc) ; ab²/(a²b) ; πR²/(2πR). — _Exemples 2026 p.21_ (acc.)
- **3-013** — Utiliser la double distributivité pour développer des expressions.
  - (a + b)(c + d), lien avec la distributivité simple ; ex. (2x − 3)(5x + 7). — _Exemples 2026 p.21 ; Attendus 3e 2019 p.3_ (acc.)
- **3-014** — Résoudre par le calcul une inéquation du premier degré du type ax ⩾ b (3x ⩾ 12).
  - Type ax ⩾ b (a non nul), pas ax + b ⩾ cx + d. — _BO c4 p.11 ; Exemples 2026 p.21_ (BO)
  - Les quatre sens d'inégalité (⩾, >, ⩽, <), a ≠ 0 éventuellement négatif (−2x < 6 dans le point). — _Décision de David, 2026-10-18 (question c4-5) ; d'après BO c4 p.11 ; Exemples 2026 p.21_ (**décision**)
  - Solutions représentées sur la droite graduée avec un crochet ; notation des intervalles « pas un enjeu ». — _Exemples 2026 p.21_ (acc.)
  - ⚠ Le BO écrit ax ⩾ b, l'accompagnement 2026 écrit aussi ax > b ; ax ⩽ b s'écrit (−a)x ⩾ −b.
- **3-015** — Résoudre une équation produit nul.
  - (ax + b)(cx + d) = 0, coefficients décimaux possibles ((2,5x − 7)(8x − 9,6) = 0). — _Exemples 2026 p.21 ; Attendus 3e 2019 p.3_ (acc.)
- **3-016** — Développer avec les identités remarquables ((x + 3)² = ?).
  - Les trois identités : (a + b)², (a − b)², (a − b)(a + b). — _BO c4 p.11-12_ (BO)
  - Exemples : (x + 6)(x − 6) ; (2x − 5)(2x + 5). — _Attendus 3e 2019 p.3_ (acc.)
- **3-017** — Pratiquer un raisonnement par analyse-synthèse dans le cadre d'une résolution d'équation.
  - Usage du symbole ⇔ limité et justifié. — _Exemples 2026 p.21_ (acc.)
- **3-054** — Utiliser la double distributivité pour factoriser des expressions dont le facteur est apparent.
  - Facteur commun apparent, notamment pour se ramener à une équation produit nul. — _BO c4 p.11 ; Exemples 2026 p.21_ (BO)
- **3-057** — Résoudre graphiquement une inéquation du premier degré du type ax ⩾ b.
  - Type ax ⩾ b seulement (a non nul, éventuellement négatif), pas ax + b ⩾ cx + d. — _BO c4 p.11 ; Exemples 2026 p.21_ (BO)
  - Solutions représentées sur la droite graduée avec un crochet ; notation des intervalles « pas un enjeu ». — _Exemples 2026 p.21_ (acc.)
- **3-058** — Factoriser avec les identités remarquables (x² − 9 = ?).
  - Les trois identités : (a + b)², (a − b)², (a − b)(a + b). — _BO c4 p.11-12_ (BO)
  - Exemples : x² − 64 ; 4x² − 49 ; 16x² − 144. — _Attendus 3e 2019 p.3_ (acc.)

### Nombres et calculs > Calcul littéral et algébrique > Automatismes

- **3-011** — Prendre l'opposé d'une expression : savoir que −(5 − 4x) = −5 + 4x.
  - −(5 − 4x) = −5 + 4x. — _BO c4 p.11_ (BO)

### Nombres et calculs > Multiples et diviseurs > Automatismes

- **3-010** — Factoriser un nombre entier positif : 60 = 2² × 3 × 5.
  - Entier naturel (60 = 2² × 3 × 5 ; exemples 2019 : 306 ; 124 ; 2 220) ; au-delà, tableur ou programme. — _BO c4 p.11 ; Attendus 3e 2019 p.3_ (BO)

### Nombres et calculs > Nombres rationnels

- **3-001** — Mettre une fraction sous forme irréductible.
  - Forme irréductible par simplifications successives. — _Exemples 2026 p.18_ (acc.)
  - Automatismes : numérateur et dénominateur dans une même table (15/35 ; 63/14) ; exemples 2019 : 66/30, 12/51, 140/340. — _BO c4 p.11 ; Attendus 3e 2019 p.3_ (BO)
- **3-003** — Résoudre des problèmes faisant appel à des fractions.
  - Les quatre opérations sur les fractions. — _BO c4 p.10_ (BO)

### Nombres et calculs > Puissances

- **3-004** — Définir les puissances d'exposant négatif d'un nombre.
  - a⁻ⁿ = 1/aⁿ (a ≠ 0) ; a⁰ = 1. — _Exemples 2026 p.19_ (acc.)
- **3-005** — Multiplier des puissances.
  - aᵐ × aⁿ = aᵐ⁺ⁿ et aᵐ / aⁿ = aᵐ⁻ⁿ, m et n entiers relatifs, a non nul. — _Exemples 2026 p.19_ (acc.)
  - La puissance d'une puissance (aᵐ)ⁿ n'est pas citée. — _BO c4 p.10-11_ (déduite)
  - ⚠ Contradiction : Repères 2019 (p.4) — « la connaissance des formules générales sur les produits ou quotients de puissances n'est pas un attendu » ; l'accompagnement 2026 donne les formules. Lecture déduite (texte implicite) : La puissance d'une puissance (aᵐ)ⁿ n'est pas citée.
- **3-006** — Déterminer la notation scientifique d'un nombre.
  - A × 10ⁿ avec 1 ≤ A < 10 et n entier relatif, pour un nombre décimal. — _Exemples 2026 p.19 ; ressource 2016 Puissances p.2_ (acc.)
- **3-007** — Résoudre des problèmes notamment en utilisant la notation scientifique.
  - Préfixes des puissances de dix de nano à giga, « en fonction des besoins ». — _BO c4 p.6_ (BO)
- **3-052** — Diviser des puissances.
  - aᵐ × aⁿ = aᵐ⁺ⁿ et aᵐ / aⁿ = aᵐ⁻ⁿ, m et n entiers relatifs, a non nul. — _Exemples 2026 p.19_ (acc.)
  - La puissance d'une puissance (aᵐ)ⁿ n'est pas citée. — _BO c4 p.10-11_ (déduite)
  - ⚠ Contradiction : Repères 2019 (p.4) — « la connaissance des formules générales sur les produits ou quotients de puissances n'est pas un attendu » ; l'accompagnement 2026 donne les formules. Lecture déduite (texte implicite) : La puissance d'une puissance (aᵐ)ⁿ n'est pas citée.

### Nombres et calculs > Racine carrée

- **3-008** — Résoudre analytiquement des équations de la forme x² = a.
  - a > 0 : deux solutions −√a et √a ; a = 0 : une solution ; a < 0 : aucune ; ensemble des solutions explicité. — _Exemples 2026 p.20_ (acc.)
  - Solutions exactes en √a, sans simplification exigée. — _Repères c4 2019 p.4_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : Solutions exactes en √a, sans simplification exigée.
- **3-009** — Résoudre des problèmes utilisant la racine carrée. — _hérite des bornes générales_
- **3-053** — Résoudre graphiquement des équations de la forme x² = a.
  - Résolution graphique par la fonction carré. — _Exemples 2026 p.20 ; BO c4 p.20_ (acc.)

### Organisation et gestion de données et probabilités > Probabilités

- **3-033** — Connaitre et savoir appliquer la relation P(A ∪ B) + P(A ∩ B) = P(A) + P(B).
  - Équiprobabilité (cas favorables / cas possibles) ; évènements « ou », « et », « ou exclusif ». — _Exemples 2026 p.38_ (acc.)
- **3-034** — Simuler des expériences aléatoires indépendantes.
  - Expériences à deux épreuves indépendantes, représentées par arbre ou tableau. — _Exemples 2026 p.38_ (acc.)
  - ⚠ Contradiction : Repères 2019 (p.7) excluent l'arbre ; l'accompagnement 2026 l'admet.
- **3-035** — Observer la stabilisation des fréquences lorsqu'on augmente le nombre de répétitions de l'expérience aléatoire, faire le lien entre fréquence et probabilité selon le nombre de répétitions. — _hérite des bornes générales_

### Organisation et gestion de données et probabilités > Statistiques

- **3-028** — Calculer des effectifs cumulés croissants.
  - À partir d'un tableau d'effectifs. — _Exemples 2026 p.37_ (acc.)
- **3-029** — Donner les quartiles d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.
  - Série donnée par un tableau d'effectifs ou un diagramme en barres ; médiane, Q1, Q3 via les effectifs cumulés croissants. — _BO c4 p.17 ; Exemples 2026 p.37_ (BO)
  - Convention : Q1 (Q3) = plus petite valeur de la série dont l'effectif cumulé atteint 25 % (75 %) de l'effectif total (série 1 à 8 : Q1 = 2). — _Décision de David, 2026-10-18 (question c4-2) ; d'après BO c4 p.17 ; Exemples 2026 p.37_ (**décision**)
  - ⚠ Un modèle qui calcule Q1 par interpolation ou par médiane de la demi-série, sans accepter cette valeur, est à corriger.
- **3-030** — Construire la boîte à moustaches d'une série statistique.
  - Minimum, Q1, médiane, Q3, maximum, avec échelle. — _Exemples 2026 p.37_ (acc.)
- **3-032** — Utiliser le tableur pour calculer une moyenne, une médiane et l'étendue d'une série statistique. — _hérite des bornes générales_
- **3-056** — Donner la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.
  - Série donnée par un tableau d'effectifs ou un diagramme en barres ; médiane, Q1, Q3 via les effectifs cumulés croissants. — _BO c4 p.17 ; Exemples 2026 p.37_ (BO)
- **3-062** — Lire une boîte à moustaches (médiane, quartiles, étendue).
  - Minimum, Q1, médiane, Q3, maximum, avec échelle. — _Exemples 2026 p.37_ (acc.)

### Proportionnalité, fonctions > Fonctions

- **3-039** — Utiliser les différentes représentations d'une fonction : formule, graphique, tableau de valeurs.
  - Exemples de fonctions sans étude générale de la notion. — _BO c4 p.18_ (BO)
- **3-040** — Définir et connaitre le vocabulaire : image, antécédents.
  - Images et antécédents à partir d'un graphique ou d'un tableau ; image par une expression littérale simple. — _Exemples 2026 p.45_ (acc.)
- **3-041** — Reconnaître une fonction linéaire (expression ou droite passant par l'origine).
  - f(x) = ax, f : x ↦ ax ; droite passant par l'origine. — _Exemples 2026 p.45_ (acc.)
- **3-042** — Résoudre graphiquement une équation linéaire (f(x) = 6).
  - Équation f(x) = k avec f linéaire, lecture graphique. — _BO c4 p.20_ (BO)
- **3-043** — Relier fonctions linéaires et proportionnalité.
  - f(x) = ax, f : x ↦ ax ; droite passant par l'origine. — _Exemples 2026 p.45_ (acc.)
- **3-044** — Reconnaître une fonction affine (expression ou droite).
  - f(x) = ax + b, f : x ↦ ax + b. — _Exemples 2026 p.45_ (acc.)
- **3-045** — Lire graphiquement l'ordonnée à l'origine d'une fonction affine.
  - Lecture graphique. — _BO c4 p.20_ (BO)
- **3-046** — Représenter la fonction carré.
  - Fonction carré seulement (aucune autre fonction de référence). — _BO c4 p.20_ (BO)
- **3-064** — Utiliser une fonction linéaire donnée par son expression (calculer une image : f(3) = ?).
  - Image par une fonction linéaire d'expression littérale simple. — _Exemples 2026 p.45_ (acc.)
- **3-065** — Résoudre graphiquement une inéquation linéaire (f(x) ⩽ 6).
  - Inéquation linéaire ax > b (a ≠ 0, b quelconque), graphiquement. — _Exemples 2026 p.45_ (acc.)
- **3-066** — Utiliser une fonction affine donnée par son expression (calculer une image : f(3) = ?).
  - Image par une fonction affine d'expression littérale simple. — _Exemples 2026 p.45_ (acc.)
- **3-067** — Lire graphiquement le coefficient directeur d'une fonction affine.
  - Lecture graphique. — _BO c4 p.20_ (BO)

### Proportionnalité, fonctions > Proportionnalité

- **3-036** — Traduire une augmentation en pourcentage.
  - Coefficient multiplicateur (1 + t/100) ou (1 − t/100). — _Exemples 2026 p.44_ (acc.)
- **3-037** — Relier la représentation graphique d'une situation de proportionnalité avec le théorème de Thalès. — _hérite des bornes générales_
- **3-063** — Traduire une diminution en pourcentage.
  - Coefficient multiplicateur (1 + t/100) ou (1 − t/100). — _Exemples 2026 p.44_ (acc.)

### Proportionnalité, fonctions > Proportionnalité > Automatismes

- **3-068** — Appliquer, dans des cas simples, une augmentation exprimée en pourcentage sans utiliser le coefficient multiplicateur (120 € augmenté de 20 % : 120 + 24 = 144 €).
  - Cas simples, sans coefficient multiplicateur (120 € + 20 % = 120 + 24). — _BO c4 p.19_ (BO)
- **3-069** — Appliquer, dans des cas simples, une diminution exprimée en pourcentage sans utiliser le coefficient multiplicateur (120 € diminué de 20 % : 120 − 24 = 96 €).
  - Cas simples, sans coefficient multiplicateur (120 € + 20 % = 120 + 24). — _BO c4 p.19_ (BO)
