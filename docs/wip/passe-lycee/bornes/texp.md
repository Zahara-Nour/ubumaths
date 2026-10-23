# Bornes des points de terminale maths expertes

Objectif : pour chaque point de programme actif de maths expertes (`T_EXP`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »), pour juger ensuite qu'un modèle de question reste entièrement dans le point. 176 points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22). Maths expertes s'ajoute à la Tle spé : ce que la Tle spé (et avant elle la 1re spé, la 2de) apporte n'est pas recopié ici.

## Sources et façon de citer

| Abréviation     | Document                                                                                                                                             | Page citée  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO Tle exp.** | Programme de l'enseignement optionnel de mathématiques expertes de terminale générale (2019, seul texte existant, reconduit) ; extrait `bo/texp.txt` | page du PDF |

Aucun document d'accompagnement n'a servi.

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point).

Les points issus des « Problèmes possibles » du BO (exigence `approfondissement`) ne sont bornés qu'à leur objet nommé ; le BO les dit « en aucun cas obligatoires » (p.5).

## Ce qui est le plus utile pour la vérification « seulement »

- **Polynômes** : fonctions polynômes à coefficients **réels** ; degré 2 (discriminant négatif → solutions conjuguées), degré 3 **avec une racine connue** ; coefficients complexes, racines carrées d'un complexe, Viète, Cardan : problèmes possibles seulement.
- **Équations dans ℂ** : az = b ; équation « simple » en z et z̄ (lte-1).
- **Arguments** : à 2π près ; valeurs exactes non remarquables en suspens (lte-2).
- **Racines de l'unité** : 𝕌n décrit, cas n = 2, 3, 4 ; racines n-ièmes d'un complexe quelconque : problème possible.
- **Arithmétique** : dans ℤ ; division euclidienne par un élément de ℕ* ; PGCD de deux entiers, **pas de PPCM** ; une congruence ax ≡ b [n] (systèmes, lemme chinois : problème possible) ; diophantiennes « simples » (lte-4).
- **Matrices** : à coefficients **réels** ; somme, produit par un réel, produit, inverse, puissances ; ni transposée ni déterminant (lte-7) ; récurrence du seul type U_{n+1} = AU_n + C ; ordre des matrices en suspens (lte-6).
- **Graphes** : vocabulaire limité à sommets, arêtes, graphe complet, adjacents, degré, ordre, chaîne, longueur, connexe ; pas de cycle ni de graphe eulérien (problème possible) ; graphes orientés hors Markov en suspens (lte-5).
- **Chaînes de Markov** : deux ou trois états, convention ligne π0Pⁿ, distributions invariantes ; pas d'étude asymptotique (problème possible).

## Contradictions et décalages relevés

1. **Chaîne / chemin** (p.10-11) : les contenus parlent d'arêtes et de chaînes (non orienté), la capacité et la démonstration de « chemins » ; l'orientation n'est écrite que pour les chaînes de Markov (lte-5).
2. **Texte de 2019 sur des prérequis de 2026** : « transformations géométriques du plan » (p.10) supposait l'ancien collège, où figuraient rotation et homothétie ; elles sont absentes du cycle 4 en vigueur et des programmes de lycée (lte-8). Même décalage pour les « similitudes directes », citées seulement dans l'histoire (lte-9).
3. **Ordre des matrices** : 2 ou 3 écrit pour les exemples de puissances et pour Markov, rien pour l'inverse, les systèmes, la matrice d'adjacence (lte-6).

## Questions (tranchées par David) (`questions-spe.json`)

- **lte-1** — équations « simples » en z et z̄ (TEXP-208). → **premier-degre** (2026-10-23)
- **lte-2** — arguments exacts : valeurs remarquables seulement ? (TEXP-218, -221, -237, -238, -263). → **remarquables** (2026-10-23)
- **lte-3** — racine « connue » : donnée ou à trouver ? (TEXP-248, -249). → **donnee** (2026-10-23)
- **lte-4** — équations diophantiennes « simples » (TEXP-292). → **lineaires** (2026-10-23)
- **lte-5** — graphes orientés hors chaînes de Markov (TEXP-312, -315, -322, -342, -345). → **oriente-chemins** (2026-10-23)
- **lte-6** — ordre des matrices et taille des systèmes (TEXP-320, -321, -322, -324, -338, -339, -340, -342). → **exact-3-adjacence-libre** (2026-10-23)
- **lte-7** — déterminant d'une matrice 2 × 2 (TEXP-319, -320, -338). → **enonce** (2026-10-23)
- **lte-8** — quelles transformations du plan en matrices (TEXP-323). → **connues** (2026-10-23)
- **lte-9** — transformations z ↦ az + b (TEXP-227, -260, -261, -263, -264). → **via-module-argument** (2026-10-23)

Libellés signalés : aucun ; les 176 libellés recopient le BO.

## Terminale maths expertes (176 points, 170 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Ensemble ℂ des nombres complexes introduit dans ce programme (formes algébrique, trigonométrique, exponentielle). Les matrices sont des tableaux de nombres réels : aucune matrice à coefficients complexes. — _BO Tle exp. p.6, 10_ (BO)
- Aucune structure algébrique nommée ni exigée (corps, groupe, anneau) : ℂ, 𝕌, 𝕌n et ℤ sont étudiés comme exemples ; pas de polynôme formel. — _BO Tle exp. p.4-5_ (BO)
- « Polynôme » = fonction polynôme à coefficients réels ; on admet qu'un polynôme nul a tous ses coefficients nuls. Équation à coefficients complexes : seulement en problème possible (TEXP-364). — _BO Tle exp. p.7_ (BO)
- Arithmétique : entiers relatifs (ℤ) ; division euclidienne d'un élément de ℤ par un élément de ℕ*. — _BO Tle exp. p.9_ (BO)
- Chaînes de Markov à deux ou trois états seulement (marche aléatoire, Ehrenfest, PageRank : problèmes possibles). — _BO Tle exp. p.10-11_ (BO)
- Les « Problèmes possibles » (points d'approfondissement de ce programme) ne sont pas obligatoires et ne figurent pas dans les capacités attendues. — _BO Tle exp. p.5_ (BO)
- Équations « simples » en z et z̄ : Équations du premier degré en z et z̄ (az + b z̄ = c), résolues en posant z = x + iy : système linéaire en x, y. — _Décision de David, 2026-10-23 (question lte-1) ; d'après BO Tle exp. p.6_ (décision)
- Arguments exacts : valeurs remarquables seulement ? : Argument exact attendu seulement quand cos θ et sin θ sont des valeurs remarquables (multiples de π/6 et π/4). — _Décision de David, 2026-10-23 (question lte-2) ; d'après BO Tle exp. p.6, BO Tle exp. p.7_ (décision)
- Racine « connue » : donnée ou à trouver ? : La racine est donnée par l'énoncé (ou l'énoncé demande de vérifier qu'un nombre donné est racine). — _Décision de David, 2026-10-23 (question lte-3) ; d'après BO Tle exp. p.7_ (décision)
- Équations diophantiennes « simples » : Équations ax + by = c seulement (Bézout, Gauss). — _Décision de David, 2026-10-23 (question lte-4) ; d'après BO Tle exp. p.8, BO Tle exp. p.9_ (décision)
- Chaînes ou chemins : graphes orientés hors Markov ? : Graphes orientés admis pour la matrice d'adjacence et le nombre de chemins ; vocabulaire de base (degré, connexe) en non orienté. — _Décision de David, 2026-10-23 (question lte-5) ; d'après BO Tle exp. p.10, BO Tle exp. p.11_ (décision)
- Ordre des matrices et taille des systèmes : Ordre au plus 3 pour les calculs exacts (inverse, puissance générale, systèmes) ; matrice d'adjacence de taille libre, puissance numérique à la calculatrice. — _Décision de David, 2026-10-23 (question lte-6) ; d'après BO Tle exp. p.10, BO Tle exp. p.11_ (décision)
- Déterminant d'une matrice 2 × 2 : Formule ad − bc admise seulement si l'énoncé la donne ; sinon inverse par vérification AB = I ou par un système. — _Décision de David, 2026-10-23 (question lte-7) ; d'après BO Tle exp. p.10-11_ (décision)
- Quelles transformations du plan en matrices ? : Seulement les transformations connues des programmes en vigueur (symétries axiales par une droite passant par O, symétrie centrale de centre O), plus celles définies dans l'énoncé. — _Décision de David, 2026-10-23 (question lte-8) ; d'après BO Tle exp. p.10_ (décision)
- Transformations z ↦ az + b : Admis si la question se ramène à des longueurs et des angles (|z' − ω| = |z − ω|, arg …) sans nommer la transformation. — _Décision de David, 2026-10-23 (question lte-9) ; d'après BO Tle exp. p.6, BO Tle exp. p.8_ (décision)

### Arithmétique

- **TEXP-271** — Divisibilité dans $\mathbb{Z}$
  - Divisibilité dans ℤ (entiers relatifs). — _BO Tle exp. p.9_ (BO)
- **TEXP-272** — Division euclidienne d'un élément de $\mathbb{Z}$ par un élément de $\mathbb{N}^*$
  - Dividende dans ℤ (négatif possible), diviseur dans ℕ* ; a = bq + r avec 0 ≤ r < b. — _BO Tle exp. p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO fixe les ensembles (ℤ, ℕ*) mais n'écrit pas la condition 0 ≤ r < b, qui définit la division euclidienne.
- **TEXP-273** — Congruences dans $\mathbb{Z}$
  - Congruences dans ℤ, notation a ≡ b [n]. — _BO Tle exp. p.9_ (BO)
- **TEXP-274** — Compatibilité des congruences avec les opérations
  - Compatibilité avec l'addition et la multiplication (donc les puissances) ; pas de division. — _BO Tle exp. p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « avec les opérations » ; seules somme et produit sont compatibles, l'inverse modulo n étant une capacité à part (TEXP-287).
- **TEXP-275** — PGCD de deux entiers
  - PGCD de deux entiers. — _BO Tle exp. p.9_ (BO)
  - Pas de PPCM. — _BO Tle exp. p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le PPCM n'apparaît nulle part dans le BO de maths expertes ni dans ceux de 2de, 1re et Tle spé.
- **TEXP-276** — Algorithme d'Euclide
  - Algorithme d'Euclide (calcul du PGCD de deux entiers). — _BO Tle exp. p.9_ (BO)
- **TEXP-277** — Couples d'entiers premiers entre eux
  - Couples (deux entiers) premiers entre eux. — _BO Tle exp. p.9_ (BO)
- **TEXP-278** — Théorème de Bézout
  - Théorème de Bézout (deux entiers). — _BO Tle exp. p.9_ (BO)
- **TEXP-279** — Théorème de Gauss
  - Théorème de Gauss. — _BO Tle exp. p.9_ (BO)
- **TEXP-280** — Nombres premiers — _hérite des bornes générales_
  - ⚠ Aucune borne propre : le libellé du BO suffit (hérite des bornes générales).
- **TEXP-281** — L'ensemble des nombres premiers est infini
  - L'ensemble des nombres premiers est infini. — _BO Tle exp. p.9_ (BO)
- **TEXP-282** — Existence et unicité de la décomposition d'un entier en produit de facteurs premiers
  - Existence et unicité de la décomposition en produit de facteurs premiers. — _BO Tle exp. p.9_ (BO)
- **TEXP-283** — Petit théorème de Fermat — _hérite des bornes générales_
  - ⚠ Aucune borne propre : le libellé du BO suffit (hérite des bornes générales).
- **TEXP-284** — Déterminer les diviseurs d'un entier
  - Diviseurs d'un entier (divisibilité dans ℤ). — _BO Tle exp. p.9_ (BO)
- **TEXP-285** — Déterminer le PGCD de deux entiers
  - PGCD de deux entiers. — _BO Tle exp. p.9_ (BO)
  - Pas de PPCM. — _BO Tle exp. p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le PPCM n'apparaît nulle part dans le BO de maths expertes ni dans ceux de 2de, 1re et Tle spé.
- **TEXP-286** — Résoudre une congruence $ax \equiv b \,[n]$
  - Une congruence du seul type ax ≡ b [n] ; systèmes de congruences (lemme chinois) : problème possible TEXP-301. — _BO Tle exp. p.9_ (BO)
- **TEXP-287** — Déterminer un inverse de $a$ modulo $n$ lorsque $a$ et $n$ sont premiers entre eux
  - Inverse de a modulo n, seulement lorsque a et n sont premiers entre eux. — _BO Tle exp. p.9_ (BO)
- **TEXP-288** — Établir des tests de divisibilité
  - Tests de divisibilité établis par les congruences (le BO ne les liste pas). — _BO Tle exp. p.8-9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO présente les tests de divisibilité comme une application de l'étude des congruences (p.8).
- **TEXP-289** — Utiliser des tests de divisibilité
  - Le BO ne liste pas les tests de divisibilité. — _BO Tle exp. p.9_ (BO)
- **TEXP-290** — Étudier la primalité de certains nombres
  - « Certains nombres » : aucune liste au BO (Mersenne, Fermat, Carmichael : problèmes possibles). — _BO Tle exp. p.9_ (BO)
- **TEXP-291** — Étudier des problèmes de chiffrement
  - Aucun chiffrement imposé pour l'attendu ; affine, Vigenère, Hill, RSA sont des problèmes possibles (TEXP-305, TEXP-370, TEXP-371, TEXP-308). — _BO Tle exp. p.9_ (BO)
- **TEXP-292** — Résoudre des équations diophantiennes simples
  - Équations diophantiennes « simples » ; le BO ne dit pas lesquelles. — _BO Tle exp. p.8-9_ (BO)
  - ⚠ Incertitude lte-4 : quelles équations diophantiennes sont « simples ». → décision lte-4 : lineaires.
- **TEXP-293** — Écriture du PGCD de $a$ et $b$ sous la forme $ax + by$, $(x, y) \in \mathbb{Z}^2$
  - Démontrer que le PGCD de a et b s'écrit ax + by, (x, y) ∈ ℤ². — _BO Tle exp. p.9_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (écriture ax + by du PGCD), rien de plus.
- **TEXP-294** — Théorème de Gauss (démonstration)
  - Démontrer le théorème de Gauss. — _BO Tle exp. p.9_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (théorème de Gauss), rien de plus.
- **TEXP-295** — L'ensemble des nombres premiers est infini (démonstration)
  - Démontrer que l'ensemble des nombres premiers est infini. — _BO Tle exp. p.9_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (infinité des nombres premiers), rien de plus.
- **TEXP-296** — Algorithme d'Euclide de calcul du PGCD de deux nombres
  - Algorithme d'Euclide pour le PGCD de deux nombres. — _BO Tle exp. p.9_ (BO)
- **TEXP-297** — Calcul d'un couple de Bézout par l'algorithme d'Euclide
  - Calcul d'un couple de Bézout par l'algorithme d'Euclide. — _BO Tle exp. p.9_ (BO)
- **TEXP-298** — Crible d'Ératosthène
  - Crible d'Ératosthène. — _BO Tle exp. p.9_ (BO)
- **TEXP-299** — Décomposition en facteurs premiers
  - Décomposition d'un entier en facteurs premiers. — _BO Tle exp. p.9_ (BO)
- **TEXP-300** — Détermination des racines rationnelles d'un polynôme à coefficients entiers
  - Racines rationnelles d'un polynôme à coefficients entiers. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-301** — Lemme chinois et applications à des situations concrètes
  - Lemme chinois et applications à des situations concrètes. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-302** — Démonstrations du petit théorème de Fermat
  - Démonstrations du petit théorème de Fermat. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-303** — Problèmes de codage : codes barres
  - Codes barres. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-304** — Étude de tests de primalité : notion de témoin, nombres de Carmichaël
  - Tests de primalité : notion de témoin, nombres de Carmichael. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-305** — Problèmes de chiffrement affine
  - Chiffrement affine. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-306** — Recherche de nombres premiers particuliers : Mersenne
  - Nombres premiers de Mersenne. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-307** — Exemples simples de codes correcteurs
  - Exemples simples de codes correcteurs. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-308** — Étude du système cryptographique RSA
  - Système cryptographique RSA. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-309** — Détermination des triplets pythagoriciens
  - Triplets pythagoriciens. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-310** — Étude des sommes de deux carrés par les entiers de Gauss
  - Sommes de deux carrés, étudiées par les entiers de Gauss. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-311** — Étude de l'équation de Pell-Fermat
  - Équation de Pell-Fermat. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-367** — Problèmes de codage : code ISBN
  - Code ISBN. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-368** — Problèmes de codage : clé du Rib
  - Clé du RIB. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-369** — Problèmes de codage : code Insee
  - Code Insee. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-370** — Problèmes de chiffrement de Vigenère
  - Chiffrement de Vigenère. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-371** — Problèmes de chiffrement de Hill
  - Chiffrement de Hill. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-372** — Recherche de nombres premiers particuliers : Fermat
  - Nombres premiers de Fermat. — _BO Tle exp. p.9_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).

### Graphes et matrices

- **TEXP-312** — Graphe, sommets, arêtes
  - Graphe, sommets, arêtes (vocabulaire du BO, graphe non orienté). — _BO Tle exp. p.10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « arêtes » et « chaîne » sont le vocabulaire des graphes non orientés ; l'orientation n'apparaît au BO que pour les chaînes de Markov. Voir lte-5. → décision lte-5 : oriente-chemins.
- **TEXP-313** — Exemple du graphe complet
  - Graphe complet, comme exemple. — _BO Tle exp. p.10_ (BO)
- **TEXP-314** — Degré
  - Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe. — _BO Tle exp. p.10_ (BO)
- **TEXP-315** — Chaîne, longueur d'une chaîne
  - Chaîne et longueur d'une chaîne ; ni cycle ni chaîne eulérienne (graphes eulériens : problème possible TEXP-348). — _BO Tle exp. p.10-11_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le mot « cycle » n'est pas au BO ; les graphes eulériens sont un problème possible.
- **TEXP-316** — Graphe connexe
  - Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe. — _BO Tle exp. p.10_ (BO)
- **TEXP-317** — Notion de matrice (tableau de nombres réels)
  - Matrice = tableau de nombres réels. — _BO Tle exp. p.10_ (BO)
- **TEXP-318** — Matrice carrée
  - Matrice carrée, colonne, ligne (vocabulaire du BO). — _BO Tle exp. p.10_ (BO)
- **TEXP-319** — Opérations sur les matrices
  - Opérations : somme, produit par un réel, produit de matrices ; ni transposée ni déterminant. — _BO Tle exp. p.10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO écrit « Opérations » sans liste ; la transposée et le déterminant n'apparaissent nulle part au BO. Voir lte-7 pour le déterminant d'ordre 2. → décision lte-7 : enonce.
- **TEXP-320** — Inverse d'une matrice carrée
  - Inverse d'une matrice carrée. — _BO Tle exp. p.10_ (BO)
  - ⚠ Incertitudes lte-6 (ordre des matrices) et lte-7 (formule du déterminant d'ordre 2). → décisions lte-6 : exact-3-adjacence-libre ; lte-7 : enonce.
- **TEXP-321** — Puissances d'une matrice carrée
  - Puissances d'une matrice carrée ; calculs donnés en exemple pour les ordres 2 et 3. — _BO Tle exp. p.10_ (BO)
  - ⚠ Incertitude lte-6 : ordre des matrices. → décision lte-6 : exact-3-adjacence-libre.
- **TEXP-322** — Représentation matricielle : matrice d'adjacence d'un graphe
  - Matrice d'adjacence d'un graphe. — _BO Tle exp. p.10_ (BO)
  - ⚠ Incertitudes lte-5 (graphes orientés) et lte-6 (ordre des matrices). → décisions lte-5 : oriente-chemins ; lte-6 : exact-3-adjacence-libre.
- **TEXP-323** — Représentation matricielle des transformations géométriques du plan
  - Transformations géométriques du plan représentées par une matrice ; le BO ne les liste pas. — _BO Tle exp. p.10_ (BO)
  - ⚠ Incertitude lte-8 : quelles transformations. → décision lte-8 : connues.
- **TEXP-324** — Représentation matricielle des systèmes linéaires
  - Écriture matricielle d'un système linéaire. — _BO Tle exp. p.10_ (BO)
  - ⚠ Incertitude lte-6 : taille des systèmes. → décision lte-6 : exact-3-adjacence-libre.
- **TEXP-325** — Représentation matricielle des suites récurrentes
  - Écriture matricielle d'une suite récurrente. — _BO Tle exp. p.10_ (BO)
- **TEXP-326** — Exemples de calcul de puissances de matrices carrées d'ordre $2$ ou $3$
  - Matrices carrées d'ordre 2 ou 3 seulement. — _BO Tle exp. p.10_ (BO)
- **TEXP-327** — Suite de matrices colonnes $(U_n)$ vérifiant une relation de récurrence du type $U_{n+1} = AU_n + C$
  - Récurrence du seul type U_{n+1} = AU_n + C. — _BO Tle exp. p.10_ (BO)
- **TEXP-328** — Graphe orienté pondéré associé à une chaîne de Markov à deux ou trois états
  - Chaîne de Markov à deux ou trois états ; graphe orienté pondéré associé. — _BO Tle exp. p.10_ (BO)
- **TEXP-329** — Chaîne de Markov à deux ou trois états
  - Deux ou trois états. — _BO Tle exp. p.10_ (BO)
- **TEXP-330** — Distribution initiale d'une chaîne de Markov, représentée par une matrice ligne $\pi_0$
  - Distribution initiale = matrice ligne π0. — _BO Tle exp. p.10_ (BO)
- **TEXP-331** — Matrice de transition d'une chaîne de Markov
  - Matrice de transition d'une chaîne à deux ou trois états, graphe pondéré associé. — _BO Tle exp. p.10_ (BO)
- **TEXP-332** — Pour une chaîne de Markov à deux ou trois états de matrice $P$, interprétation du coefficient $(i, j)$ de $P^n$
  - Interprétation du coefficient (i, j) de Pⁿ, chaîne à deux ou trois états. — _BO Tle exp. p.10_ (BO)
- **TEXP-333** — Distribution d'une chaîne de Markov après $n$ transitions, représentée comme la matrice ligne $\pi_0 P^n$
  - Distribution après n transitions = matrice ligne π0Pⁿ (convention ligne). — _BO Tle exp. p.10_ (BO)
- **TEXP-334** — Distributions invariantes d'une chaîne de Markov à deux ou trois états
  - Distributions invariantes d'une chaîne à deux ou trois états ; l'étude asymptotique est un problème possible (TEXP-350). — _BO Tle exp. p.10-11_ (BO)
- **TEXP-335** — Modéliser une situation par un graphe — _hérite des bornes générales_
  - ⚠ Point-compétence (modéliser) : pas de grain questionnable propre, il se travaille dans les autres points ; aucune borne.
- **TEXP-336** — Modéliser une situation par une matrice — _hérite des bornes générales_
  - ⚠ Point-compétence (modéliser) : pas de grain questionnable propre, il se travaille dans les autres points ; aucune borne.
- **TEXP-337** — Associer un graphe orienté pondéré à une chaîne de Markov à deux ou trois états
  - Chaîne de Markov à deux ou trois états. — _BO Tle exp. p.11_ (BO)
- **TEXP-338** — Calculer l'inverse d'une matrice carrée
  - Inverse d'une matrice carrée. — _BO Tle exp. p.11_ (BO)
  - ⚠ Incertitudes lte-6 (ordre des matrices) et lte-7 (formule du déterminant d'ordre 2). → décisions lte-6 : exact-3-adjacence-libre ; lte-7 : enonce.
- **TEXP-339** — Calculer les puissances d'une matrice carrée
  - Puissances d'une matrice carrée. — _BO Tle exp. p.11_ (BO)
  - ⚠ Incertitude lte-6 : ordre des matrices. → décision lte-6 : exact-3-adjacence-libre.
- **TEXP-340** — Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour résoudre un système linéaire
  - Système linéaire résolu par le calcul matriciel, notamment l'inverse. — _BO Tle exp. p.11_ (BO)
  - ⚠ Incertitude lte-6 : taille des systèmes. → décision lte-6 : exact-3-adjacence-libre.
- **TEXP-341** — Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une suite récurrente linéaire
  - Suite récurrente linéaire, étudiée par le calcul matriciel (type U_{n+1} = AU_n + C des contenus). — _BO Tle exp. p.10-11_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la capacité ne nomme pas le type de suite ; le seul type des contenus (p.10) est U_{n+1} = AU_n + C.
- **TEXP-342** — Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour calculer le nombre de chemins de longueur donnée entre deux sommets d'un graphe
  - Nombre de chemins de longueur donnée entre deux sommets, par les puissances de la matrice d'adjacence. — _BO Tle exp. p.11_ (BO)
  - ⚠ Incertitudes lte-5 (graphes orientés) et lte-6 (ordre des matrices). → décisions lte-5 : oriente-chemins ; lte-6 : exact-3-adjacence-libre.
- **TEXP-343** — Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : calculer des probabilités
  - Chaîne de Markov à deux ou trois états : calcul de probabilités. — _BO Tle exp. p.11_ (BO)
- **TEXP-344** — Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : déterminer une probabilité invariante
  - Chaîne de Markov à deux ou trois états : probabilité invariante. — _BO Tle exp. p.11_ (BO)
- **TEXP-345** — Expression du nombre de chemins de longueur $n$ reliant deux sommets d'un graphe à l'aide de la puissance $n$-ième de la matrice d'adjacence
  - Démontrer que le nombre de chemins de longueur n se lit sur la puissance n-ième de la matrice d'adjacence. — _BO Tle exp. p.11_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (nombre de chemins et matrice d'adjacence), rien de plus.
- **TEXP-346** — Pour une chaîne de Markov, expression de la probabilité de passer de l'état $i$ à l'état $j$ en $n$ transitions
  - Démontrer l'expression de la probabilité de passer de l'état i à l'état j en n transitions. — _BO Tle exp. p.11_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (probabilité de transition en n étapes), rien de plus.
- **TEXP-347** — Pour une chaîne de Markov, expression de la matrice ligne représentant la distribution après $n$ transitions
  - Démontrer l'expression de la matrice ligne de la distribution après n transitions. — _BO Tle exp. p.11_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (distribution π0Pⁿ), rien de plus.
- **TEXP-348** — Étude de graphes eulériens
  - Graphes eulériens. — _BO Tle exp. p.11_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-349** — Interpolation polynomiale
  - Interpolation polynomiale. — _BO Tle exp. p.11_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-350** — Marche aléatoire sur un graphe. Étude asymptotique
  - Marche aléatoire sur un graphe, étude asymptotique. — _BO Tle exp. p.11_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-351** — Modèle de diffusion d'Ehrenfest
  - Modèle de diffusion d'Ehrenfest. — _BO Tle exp. p.11_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-352** — Modèle « proie-prédateur » discrétisé : évolution couplée de deux suites récurrentes
  - Modèle « proie-prédateur » discrétisé : deux suites récurrentes couplées. — _BO Tle exp. p.11_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-353** — Algorithme PageRank
  - Algorithme PageRank. — _BO Tle exp. p.11_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-373** — Sommets adjacents
  - Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe. — _BO Tle exp. p.10_ (BO)
- **TEXP-374** — Ordre d'un graphe
  - Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe. — _BO Tle exp. p.10_ (BO)
- **TEXP-375** — Matrice colonne
  - Matrice carrée, colonne, ligne (vocabulaire du BO). — _BO Tle exp. p.10_ (BO)
- **TEXP-376** — Matrice ligne
  - Matrice carrée, colonne, ligne (vocabulaire du BO). — _BO Tle exp. p.10_ (BO)

### Nombres complexes > Nombres complexes : point de vue algébrique

- **TEXP-201** — Ensemble $\mathbb{C}$ des nombres complexes
  - Ensemble ℂ, forme algébrique a + ib (a, b réels, i² = −1) ; aucune structure de corps à nommer. — _BO Tle exp. p.4, 6_ (BO)
- **TEXP-202** — Opérations sur les nombres complexes
  - Opérations dans ℂ : somme, produit, inverse d'un complexe non nul (donc quotient). — _BO Tle exp. p.6_ (BO)
- **TEXP-203** — Conjugaison. Propriétés algébriques de la conjugaison
  - Conjugué ; propriétés algébriques démontrées au BO : conjugué d'un produit, d'un inverse, d'une puissance entière. — _BO Tle exp. p.6_ (BO)
- **TEXP-204** — Inverse d'un nombre complexe non nul
  - Inverse d'un complexe non nul seulement. — _BO Tle exp. p.6_ (BO)
- **TEXP-205** — Formule du binôme dans $\mathbb{C}$
  - Formule du binôme pour deux complexes et un exposant entier naturel, avec les coefficients binomiaux de Tle spé. — _BO Tle exp. p.6_ (BO)
- **TEXP-206** — Effectuer des calculs algébriques avec des nombres complexes
  - Calculs algébriques : opérations, conjugaison, inverse, formule du binôme (contenus de la même section). — _BO Tle exp. p.6_ (BO)
- **TEXP-207** — Résoudre une équation linéaire $az = b$
  - Équation du seul type az = b (inconnue complexe z). — _BO Tle exp. p.6_ (BO)
- **TEXP-208** — Résoudre une équation simple faisant intervenir $z$ et $\bar{z}$
  - Équation « simple » faisant intervenir z et z̄ ; le BO ne dit pas ce qu'est « simple ». — _BO Tle exp. p.6_ (BO)
  - ⚠ Incertitude lte-1 : quelles équations en z et z̄ sont « simples ». → décision lte-1 : premier-degre.
- **TEXP-209** — Conjugué d'un produit
  - Démontrer que le conjugué d'un produit est le produit des conjugués. — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (conjugué d'un produit), rien de plus.
- **TEXP-210** — Formule du binôme
  - Démontrer la formule du binôme (dans ℂ). — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (formule du binôme), rien de plus.
- **TEXP-354** — Partie réelle et partie imaginaire
  - Partie réelle et partie imaginaire d'un complexe écrit sous forme algébrique. — _BO Tle exp. p.6_ (BO)
- **TEXP-355** — Conjugué d'un inverse
  - Démontrer que le conjugué de l'inverse d'un complexe non nul est l'inverse du conjugué. — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (conjugué d'un inverse), rien de plus.
- **TEXP-356** — Conjugué d'une puissance entière
  - Démontrer la formule du conjugué d'une puissance entière. — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (conjugué d'une puissance entière), rien de plus.

### Nombres complexes > Nombres complexes : point de vue géométrique

- **TEXP-211** — Image d'un nombre complexe
  - Plan euclidien identifié à ℂ : image de a + ib = point de coordonnées (a ; b). — _BO Tle exp. p.5-6_ (BO)
- **TEXP-212** — Affixe d'un point — _hérite des bornes générales_
  - ⚠ Aucune borne propre : le libellé du BO suffit (hérite des bornes générales).
- **TEXP-213** — Module d'un nombre complexe
  - Module d'un nombre complexe (forme algébrique : |a + ib| = √(a² + b²)). — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO nomme le module sans en donner l'expression ; √(a² + b²) découle de |z|² = z z̄ (même section).
- **TEXP-214** — Relation $|z|^2 = z\bar{z}$
  - Relation |z|² = z z̄. — _BO Tle exp. p.6_ (BO)
- **TEXP-215** — Module d'un produit
  - |zz'| = |z| |z'| (le module d'une puissance est une démonstration, TEXP-226). — _BO Tle exp. p.6_ (BO)
- **TEXP-216** — Ensemble $\mathbb{U}$ des nombres complexes de module $1$
  - 𝕌 = complexes de module 1 ; aucune structure de groupe à nommer. — _BO Tle exp. p.4, 6_ (BO)
- **TEXP-217** — Stabilité de $\mathbb{U}$ par produit et passage à l'inverse
  - Stabilité de 𝕌 par produit et passage à l'inverse seulement. — _BO Tle exp. p.6_ (BO)
- **TEXP-218** — Arguments d'un nombre complexe non nul
  - Arguments d'un complexe non nul (pluriel : définis à 2π près). — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « à 2π près » vient du pluriel « arguments » du BO. Valeurs exactes attendues : incertitude lte-2. → décision lte-2 : remarquables.
- **TEXP-219** — Forme trigonométrique d'un nombre complexe
  - Forme trigonométrique r(cos θ + i sin θ), r = |z| > 0, θ un argument. — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO nomme la forme trigonométrique sans l'écrire ; la formule de Moivre (p.7) fixe l'écriture cos θ + i sin θ.
- **TEXP-220** — Déterminer le module d'un nombre complexe
  - Complexe donné sous forme algébrique, ou produit, inverse, puissance de tels complexes (propriétés du module de la section). — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « déterminer le module » ; les seules propriétés au programme sont module d'un produit, d'un inverse, d'une puissance.
- **TEXP-221** — Déterminer les arguments d'un nombre complexe
  - Complexe non nul. — _BO Tle exp. p.6_ (BO)
  - ⚠ Incertitude lte-2 : arguments exacts limités aux valeurs remarquables ou non. → décision lte-2 : remarquables.
- **TEXP-222** — Représenter un nombre complexe par un point
  - Placer l'image d'un complexe dans le plan complexe. — _BO Tle exp. p.6_ (BO)
- **TEXP-223** — Déterminer l'affixe d'un point
  - Lire l'affixe d'un point du plan complexe. — _BO Tle exp. p.6_ (BO)
- **TEXP-224** — Formule $|z|^2 = z\bar{z}$
  - Démontrer |z|² = z z̄. — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (|z|² = z z̄), rien de plus.
- **TEXP-225** — Module d'un produit
  - Démontrer |zz'| = |z| |z'|. — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (module d'un produit), rien de plus.
- **TEXP-226** — Module d'une puissance
  - Démontrer la formule du module d'une puissance. — _BO Tle exp. p.6_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (module d'une puissance), rien de plus.
- **TEXP-227** — Suite de nombres complexes définie par $z_{n+1} = az_n + b$
  - Suites complexes du seul type z_{n+1} = a z_n + b. — _BO Tle exp. p.6_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5). Incertitude lte-9 : transformations z ↦ az + b. → décision lte-9 : via-module-argument.
- **TEXP-228** — Inégalité triangulaire pour deux nombres complexes ; cas d'égalité
  - Inégalité triangulaire pour deux complexes et son cas d'égalité. — _BO Tle exp. p.6_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-229** — Étude expérimentale de l'ensemble de Mandelbrot, d'ensembles de Julia
  - Étude expérimentale (logiciel) de l'ensemble de Mandelbrot et d'ensembles de Julia. — _BO Tle exp. p.6_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-357** — Image du conjugué
  - Image du conjugué (symétrique de l'image de z par rapport à l'axe des réels). — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit seulement « Image du conjugué » ; la symétrie par rapport à l'axe des abscisses en est la seule lecture géométrique.
- **TEXP-358** — Affixe d'un vecteur — _hérite des bornes générales_
  - ⚠ Aucune borne propre : le libellé du BO suffit (hérite des bornes générales).
- **TEXP-359** — Module d'un nombre complexe : interprétation géométrique
  - Interprétation géométrique : |z| = OM, |z_B − z_A| = AB. — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO écrit « Interprétation géométrique » sans détail ; la distance est la seule interprétation du module dans la section (« calculer des longueurs », p.8).
- **TEXP-360** — Module d'un inverse
  - Module de l'inverse d'un complexe non nul. — _BO Tle exp. p.6_ (BO)
- **TEXP-361** — Arguments d'un nombre complexe non nul : interprétation géométrique
  - Interprétation géométrique : un argument de z est une mesure de l'angle orienté (u⃗, OM⃗). — _BO Tle exp. p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO écrit « Interprétation géométrique » sans détail.

### Nombres complexes > Nombres complexes et trigonométrie

- **TEXP-230** — Formules d'addition à partir du produit scalaire
  - Formules d'addition : cos(a ± b), sin(a ± b), établies à partir du produit scalaire. — _BO Tle exp. p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO écrit « formules d'addition » sans les lister ; ce sont les quatre formules de cos et sin d'une somme et d'une différence.
- **TEXP-231** — Formules de duplication à partir du produit scalaire
  - Formules de duplication : cos 2a, sin 2a, établies à partir du produit scalaire. — _BO Tle exp. p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO écrit « formules de duplication » sans les lister.
- **TEXP-232** — Exponentielle imaginaire, notation $e^{i\theta}$
  - Notation e^{iθ} (θ réel). — _BO Tle exp. p.7_ (BO)
- **TEXP-233** — Relation fonctionnelle de l'exponentielle imaginaire
  - Relation fonctionnelle e^{iθ} e^{iθ'} = e^{i(θ + θ')}. — _BO Tle exp. p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « relation fonctionnelle » sans l'écrire ; c'est l'analogue de exp(x + y) = exp(x) exp(y) (1re spé).
- **TEXP-234** — Forme exponentielle d'un nombre complexe
  - Forme exponentielle r e^{iθ}, r = |z| > 0. — _BO Tle exp. p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO nomme la forme exponentielle sans l'écrire.
- **TEXP-235** — Formule d'Euler : $\cos(\theta) = \frac{1}{2}(e^{i\theta} + e^{-i\theta})$
  - cos θ = (e^{iθ} + e^{−iθ})/2. — _BO Tle exp. p.7_ (BO)
- **TEXP-236** — Formule de Moivre : $\cos(n\theta) + i\sin(n\theta) = (\cos(\theta) + i\sin(\theta))^n$
  - cos(nθ) + i sin(nθ) = (cos θ + i sin θ)ⁿ. — _BO Tle exp. p.7_ (BO)
- **TEXP-237** — Passer de la forme algébrique d'un nombre complexe à sa forme trigonométrique ou exponentielle
  - Passage de la forme algébrique à la forme trigonométrique ou exponentielle. — _BO Tle exp. p.7_ (BO)
  - ⚠ Incertitude lte-2 : arguments exacts limités aux valeurs remarquables ou non. → décision lte-2 : remarquables.
- **TEXP-238** — Passer de la forme trigonométrique ou exponentielle d'un nombre complexe à sa forme algébrique
  - Passage de la forme trigonométrique ou exponentielle à la forme algébrique. — _BO Tle exp. p.7_ (BO)
  - ⚠ Incertitude lte-2 : arguments exacts limités aux valeurs remarquables ou non. → décision lte-2 : remarquables.
- **TEXP-239** — Effectuer des calculs sur des nombres complexes en choisissant une forme adaptée, en particulier dans le cadre de la résolution de problèmes
  - Choix entre forme algébrique, trigonométrique, exponentielle. — _BO Tle exp. p.7_ (BO)
- **TEXP-240** — Utiliser les formules d'Euler pour transformer des expressions trigonométriques, dans des contextes divers (intégration, suites, etc.)
  - Transformer des expressions trigonométriques par les formules d'Euler, contextes divers (intégration, suites…). — _BO Tle exp. p.7_ (BO)
- **TEXP-241** — Utiliser les formules d'Euler et de Moivre pour calculer des puissances de nombres complexes
  - Puissances de nombres complexes calculées par les formules d'Euler et de Moivre. — _BO Tle exp. p.7_ (BO)
- **TEXP-242** — Démonstration d'une des formules d'addition
  - Démontrer une seule des formules d'addition, à partir du produit scalaire. — _BO Tle exp. p.7_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (une des formules d'addition), rien de plus.
- **TEXP-362** — Formule d'Euler : $\sin(\theta) = \frac{1}{2i}(e^{i\theta} - e^{-i\theta})$
  - sin θ = (e^{iθ} − e^{−iθ})/(2i). — _BO Tle exp. p.7_ (BO)
- **TEXP-363** — Utiliser la formule de Moivre pour transformer des expressions trigonométriques, dans des contextes divers (intégration, suites, etc.)
  - Transformer des expressions trigonométriques par la formule de Moivre, contextes divers (intégration, suites…). — _BO Tle exp. p.7_ (BO)

### Nombres complexes > Utilisation des nombres complexes en géométrie

- **TEXP-256** — Interprétation géométrique du module de $\frac{c-a}{b-a}$
  - |(c − a)/(b − a)| = AC/AB, A, B, C points d'affixes a, b, c, A ≠ B. — _BO Tle exp. p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « interprétation géométrique du module » sans l'écrire.
- **TEXP-257** — Racines $n$-ièmes de l'unité. Description de l'ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l'unité
  - 𝕌n = { e^{2ikπ/n}, k = 0, …, n − 1 }. — _BO Tle exp. p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « description de l'ensemble 𝕌n » ; la description est celle qu'établit la démonstration TEXP-266.
- **TEXP-258** — Représentation géométrique de l'ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l'unité
  - Images des racines n-ièmes de l'unité : sommets d'un polygone régulier à n côtés inscrit dans le cercle unité. — _BO Tle exp. p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « représentation géométrique » ; le lien aux polygones réguliers est la capacité TEXP-265.
- **TEXP-259** — Racines $n$-ièmes de l'unité, cas particuliers : $n = 2, 3, 4$
  - Cas n = 2, 3, 4 seulement. — _BO Tle exp. p.8_ (BO)
- **TEXP-260** — Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer un alignement
  - Démontrer un alignement dans une configuration du plan, par les complexes. — _BO Tle exp. p.8_ (BO)
  - ⚠ Incertitude lte-9 : transformations z ↦ az + b. → décision lte-9 : via-module-argument.
- **TEXP-261** — Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer une orthogonalité
  - Démontrer une orthogonalité dans une configuration du plan, par les complexes. — _BO Tle exp. p.8_ (BO)
  - ⚠ Incertitude lte-9 : transformations z ↦ az + b. → décision lte-9 : via-module-argument.
- **TEXP-262** — Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des longueurs
  - Calculer des longueurs dans une configuration du plan, par les complexes. — _BO Tle exp. p.8_ (BO)
- **TEXP-263** — Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des angles
  - Calculer des angles dans une configuration du plan, par les complexes. — _BO Tle exp. p.8_ (BO)
  - ⚠ Incertitudes lte-2 (arguments exacts limités aux valeurs remarquables ou non) et lte-9 (transformations z ↦ az + b). → décisions lte-2 : remarquables ; lte-9 : via-module-argument.
- **TEXP-264** — Dans le cadre de la résolution de problème, utiliser les nombres complexes pour déterminer des ensembles de points
  - Déterminer des ensembles de points du plan par les complexes (le BO ne liste pas les ensembles). — _BO Tle exp. p.8_ (BO)
  - ⚠ Incertitude lte-9 : transformations z ↦ az + b. → décision lte-9 : via-module-argument.
- **TEXP-265** — Utiliser les racines de l'unité dans l'étude de configurations liées aux polygones réguliers
  - Configurations liées aux polygones réguliers. — _BO Tle exp. p.8_ (BO)
- **TEXP-266** — Détermination de l'ensemble $\mathbb{U}_n$
  - Démontrer la description de 𝕌n. — _BO Tle exp. p.8_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (détermination de 𝕌n), rien de plus.
- **TEXP-267** — Lignes trigonométriques de $\frac{2\pi}{5}$
  - Lignes trigonométriques de 2π/5. — _BO Tle exp. p.8_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-268** — Somme des racines $n$-ièmes de l'unité
  - Somme des racines n-ièmes de l'unité. — _BO Tle exp. p.8_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-269** — Racines $n$-ièmes d'un nombre complexe
  - Racines n-ièmes d'un nombre complexe. — _BO Tle exp. p.8_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-270** — Transformation de Fourier discrète
  - Transformation de Fourier discrète. — _BO Tle exp. p.8_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-365** — Interprétation géométrique d'un argument de $\frac{c-a}{b-a}$
  - arg((c − a)/(b − a)) = (AB⃗, AC⃗) à 2π près, A ≠ B, A ≠ C. — _BO Tle exp. p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « interprétation géométrique d'un argument » sans l'écrire.
- **TEXP-366** — Construction du pentagone régulier à la règle et au compas
  - Construction du pentagone régulier à la règle et au compas. — _BO Tle exp. p.8_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).

### Nombres complexes > Équations polynomiales

- **TEXP-243** — Solutions complexes d'une équation du second degré à coefficients réels
  - Équation du second degré à coefficients réels de discriminant négatif : solutions complexes conjuguées. — _BO Tle exp. p.5, 7_ (BO)
- **TEXP-244** — Factorisation de $z^n - a^n$ par $z - a$
  - Factorisation de zⁿ − aⁿ par z − a. — _BO Tle exp. p.7_ (BO)
- **TEXP-245** — Si $P$ est un polynôme et $P(a) = 0$, factorisation de $P$ par $z - a$
  - P polynôme (coefficients réels) et P(a) = 0 : P se factorise par z − a. — _BO Tle exp. p.7_ (BO)
- **TEXP-246** — Un polynôme de degré $n$ admet au plus $n$ racines
  - Un polynôme de degré n a au plus n racines. — _BO Tle exp. p.7_ (BO)
- **TEXP-247** — Résoudre une équation polynomiale de degré $2$ à coefficients réels
  - Degré 2 à coefficients réels seulement (coefficients complexes : TEXP-364). — _BO Tle exp. p.7_ (BO)
- **TEXP-248** — Résoudre une équation de degré $3$ à coefficients réels dont une racine est connue
  - Degré 3 à coefficients réels, une racine connue. — _BO Tle exp. p.7_ (BO)
  - ⚠ Incertitude lte-3 : racine « connue » = donnée par l'énoncé, ou à trouver. → décision lte-3 : donnee.
- **TEXP-249** — Factoriser un polynôme dont une racine est connue
  - Polynôme (coefficients réels) dont une racine est connue ; factorisation par z − a. — _BO Tle exp. p.7_ (BO)
  - ⚠ Incertitude lte-3 : racine « connue » = donnée par l'énoncé, ou à trouver. → décision lte-3 : donnee.
- **TEXP-250** — Factorisation de $z^n - a^n$ par $z - a$ (démonstration)
  - Démontrer la factorisation de zⁿ − aⁿ par z − a. — _BO Tle exp. p.7_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (factorisation de zⁿ − aⁿ), rien de plus.
- **TEXP-251** — Factorisation de $P(z)$ par $z - a$ si $P(a) = 0$
  - Démontrer la factorisation de P(z) par z − a si P(a) = 0. — _BO Tle exp. p.7_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (factorisation par z − a), rien de plus.
- **TEXP-252** — Le nombre de solutions d'une équation polynomiale est inférieur ou égal à son degré
  - Démontrer qu'une équation polynomiale a au plus autant de solutions que son degré. — _BO Tle exp. p.7_ (BO)
  - ⚠ Point « démonstration » : la borne est ce qui est démontré (nombre de solutions ≤ degré), rien de plus.
- **TEXP-253** — Racines carrées d'un nombre complexe
  - Racines carrées d'un nombre complexe. — _BO Tle exp. p.7_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-254** — Formules de Viète
  - Formules de Viète (somme et produit des racines lus sur le polynôme). — _BO Tle exp. p.5, 7_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-255** — Résolution par radicaux de l'équation de degré $3$
  - Résolution par radicaux de l'équation de degré 3 seulement. — _BO Tle exp. p.7_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
- **TEXP-364** — Équation du second degré à coefficients complexes
  - Équation du second degré à coefficients complexes. — _BO Tle exp. p.7_ (BO)
  - ⚠ Problème possible du BO (« en aucun cas obligatoires », p.5).
