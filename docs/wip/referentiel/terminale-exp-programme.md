# Programme de suivi terminale mathématiques expertes — Thème → Objectif → Point (à relire)

> **But** : **amorçage** du référentiel de programme (tables `curriculum_*`), grade `'T_EXP'`.
> ⚠️ **Ce fichier ne fait plus foi une fois le niveau amorcé** : la page **Programme** (`/dashboard/teacher/programme`) prend le relais. Le corriger ici ne produit plus rien — cf. le référentiel de 1ʳᵉ, même règle.
> **Source** : « Programme d'enseignement optionnel de mathématiques expertes de terminale générale » — PDF fourni par David le 2026-10-03.
>
> **Statut** : **brouillon, à relire par David**. Formules reconstruites depuis une extraction texte du PDF (fractions, exposants, indices et conjugués cassés par l'extraction).
>
> L'ordre suit celui du sommaire du BO. Les rubriques **« Préambule »**, **« Intentions majeures »**, **« Quelques lignes directrices pour l'enseignement »**, **« Organisation du programme »**, les textes d'introduction de chaque partie et les encarts **« Histoire des mathématiques »** sont des textes destinés au professeur : ils ne donnent **aucun point**. Le programme ne comporte pas de partie « Automatismes » ni « Algorithmique et programmation ».
>
> Les parties **Arithmétique** et **Graphes et matrices** du BO n'ont pas de sous-parties : chacune donne un **objectif unique**, qui porte le titre de la partie.

---

## Convention de tags

Celle de terminale spé — les tags encodent les rubriques du BO, on ne les invente pas —, avec une rubrique propre aux mathématiques expertes, « Problèmes possibles ».

| Tag     | `kind`          | `exigence`          | Rubrique du BO                                        |
| ------- | --------------- | ------------------- | ----------------------------------------------------- |
| `[C]`   | `connaissance`  | `attendu`           | **Contenus**                                          |
| `[SF]`  | `savoir_faire`  | `attendu`           | **Capacités attendues**                               |
| `[D]`   | `demonstration` | `attendu`           | **Démonstration(s)**                                  |
| `[SF+]` | `savoir_faire`  | `approfondissement` | **Exemples d'algorithmes** et **Problèmes possibles** |

> Le BO de mathématiques expertes n'a pas de rubrique « Approfondissements possibles ». Il propose en revanche des **« Problèmes possibles, mais en aucun cas obligatoires »** (« Organisation du programme ») : ils reçoivent le tag `[SF+]` (approfondissement), par analogie avec les « Approfondissements possibles » de la spécialité. ⚠️ **Hésitation à trancher** : l'alternative est de ne pas en faire des points (texte de pistes pour le professeur et l'épreuve orale, comme les « thèmes d'étude » des mathématiques complémentaires).
>
> Les démonstrations sont intitulées « Démonstration(s) », sans « possible(s) » : elles reçoivent le tag `[D]` (attendu), comme en spécialité, et non le `[D+]` des mathématiques complémentaires.

### Écriture des mathématiques

LaTeX entre `$…$`, rendu par MathLive. Trois règles :

- **Seules les commandes connues de MathLive.** Le générateur refuse le fichier sinon, en nommant les points fautifs — une commande inconnue s'afficherait en clair à l'élève. Notamment `\ldots` ou `\cdots`, jamais `\dots` ; `\vec{AB}` et non `\overrightarrow{AB}`.
- **Jamais deux formules collées** : `$x$$y$` est ambigu pour le parser ubumark.
- **Pas de maths d'affichage** (`$$…$$`) : un point est une ligne, pas un paragraphe.

Les backticks sont réservés au **code** du point.

### Grain de suivi

Quand une puce du BO enchaîne deux gestes qu'un élève peut réussir séparément, elle est **coupée** — convention établie par la relecture de 1ʳᵉ spé du 2026-08-30. « Déterminer le module et les arguments d'un nombre complexe. » en fait deux.

Quand une même phrase du BO donnerait un contenu et une démonstration de libellé identique, la démonstration est suffixée « (démonstration) » : deux points d'un même objectif ne peuvent pas porter le même libellé.

---

## 1. Nombres complexes

### 1.1 Nombres complexes : point de vue algébrique

- [C] `TEXP-001` Ensemble $\mathbb{C}$ des nombres complexes. Partie réelle et partie imaginaire
- [C] `TEXP-002` Opérations sur les nombres complexes
- [C] `TEXP-003` Conjugaison. Propriétés algébriques de la conjugaison
- [C] `TEXP-004` Inverse d'un nombre complexe non nul
- [C] `TEXP-005` Formule du binôme dans $\mathbb{C}$

- [SF] `TEXP-006` Effectuer des calculs algébriques avec des nombres complexes
- [SF] `TEXP-007` Résoudre une équation linéaire $az = b$
- [SF] `TEXP-008` Résoudre une équation simple faisant intervenir $z$ et $\bar{z}$

- [D] `TEXP-009` Conjugué d'un produit, d'un inverse, d'une puissance entière
- [D] `TEXP-010` Formule du binôme

### 1.2 Nombres complexes : point de vue géométrique

- [C] `TEXP-011` Image d'un nombre complexe. Image du conjugué
- [C] `TEXP-012` Affixe d'un point, d'un vecteur
- [C] `TEXP-013` Module d'un nombre complexe. Interprétation géométrique
- [C] `TEXP-014` Relation $|z|^2 = z\bar{z}$
- [C] `TEXP-015` Module d'un produit, d'un inverse
- [C] `TEXP-016` Ensemble $\mathbb{U}$ des nombres complexes de module $1$
- [C] `TEXP-017` Stabilité de $\mathbb{U}$ par produit et passage à l'inverse
- [C] `TEXP-018` Arguments d'un nombre complexe non nul. Interprétation géométrique
- [C] `TEXP-019` Forme trigonométrique d'un nombre complexe

- [SF] `TEXP-020` Déterminer le module d'un nombre complexe
- [SF] `TEXP-021` Déterminer les arguments d'un nombre complexe
- [SF] `TEXP-022` Représenter un nombre complexe par un point
- [SF] `TEXP-023` Déterminer l'affixe d'un point

- [D] `TEXP-024` Formule $|z|^2 = z\bar{z}$
- [D] `TEXP-025` Module d'un produit
- [D] `TEXP-026` Module d'une puissance

- [SF+] `TEXP-027` Suite de nombres complexes définie par $z_{n+1} = az_n + b$
- [SF+] `TEXP-028` Inégalité triangulaire pour deux nombres complexes ; cas d'égalité
- [SF+] `TEXP-029` Étude expérimentale de l'ensemble de Mandelbrot, d'ensembles de Julia

### 1.3 Nombres complexes et trigonométrie

- [C] `TEXP-030` Formules d'addition à partir du produit scalaire
- [C] `TEXP-031` Formules de duplication à partir du produit scalaire
- [C] `TEXP-032` Exponentielle imaginaire, notation $e^{i\theta}$
- [C] `TEXP-033` Relation fonctionnelle de l'exponentielle imaginaire
- [C] `TEXP-034` Forme exponentielle d'un nombre complexe
- [C] `TEXP-035` Formules d'Euler : $\cos(\theta) = \frac{1}{2}(e^{i\theta} + e^{-i\theta})$, $\sin(\theta) = \frac{1}{2i}(e^{i\theta} - e^{-i\theta})$
- [C] `TEXP-036` Formule de Moivre : $\cos(n\theta) + i\sin(n\theta) = (\cos(\theta) + i\sin(\theta))^n$

- [SF] `TEXP-037` Passer de la forme algébrique d'un nombre complexe à sa forme trigonométrique ou exponentielle
- [SF] `TEXP-038` Passer de la forme trigonométrique ou exponentielle d'un nombre complexe à sa forme algébrique
- [SF] `TEXP-039` Effectuer des calculs sur des nombres complexes en choisissant une forme adaptée, en particulier dans le cadre de la résolution de problèmes
- [SF] `TEXP-040` Utiliser les formules d'Euler et de Moivre pour transformer des expressions trigonométriques, dans des contextes divers (intégration, suites, etc.)
- [SF] `TEXP-041` Utiliser les formules d'Euler et de Moivre pour calculer des puissances de nombres complexes

- [D] `TEXP-042` Démonstration d'une des formules d'addition

### 1.4 Équations polynomiales

> On utilise librement la notion de fonction polynôme à coefficients réels, plus simplement appelée polynôme. On admet que si une fonction polynôme est nulle, tous ses coefficients sont nuls.

- [C] `TEXP-043` Solutions complexes d'une équation du second degré à coefficients réels
- [C] `TEXP-044` Factorisation de $z^n - a^n$ par $z - a$
- [C] `TEXP-045` Si $P$ est un polynôme et $P(a) = 0$, factorisation de $P$ par $z - a$
- [C] `TEXP-046` Un polynôme de degré $n$ admet au plus $n$ racines

- [SF] `TEXP-047` Résoudre une équation polynomiale de degré $2$ à coefficients réels
- [SF] `TEXP-048` Résoudre une équation de degré $3$ à coefficients réels dont une racine est connue
- [SF] `TEXP-049` Factoriser un polynôme dont une racine est connue

- [D] `TEXP-050` Factorisation de $z^n - a^n$ par $z - a$ (démonstration)
- [D] `TEXP-051` Factorisation de $P(z)$ par $z - a$ si $P(a) = 0$
- [D] `TEXP-052` Le nombre de solutions d'une équation polynomiale est inférieur ou égal à son degré

- [SF+] `TEXP-053` Racines carrées d'un nombre complexe, équation du second degré à coefficients complexes
- [SF+] `TEXP-054` Formules de Viète
- [SF+] `TEXP-055` Résolution par radicaux de l'équation de degré $3$

### 1.5 Utilisation des nombres complexes en géométrie

- [C] `TEXP-056` Interprétation géométrique du module et d'un argument de $\frac{c-a}{b-a}$
- [C] `TEXP-057` Racines $n$-ièmes de l'unité. Description de l'ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l'unité
- [C] `TEXP-058` Représentation géométrique de l'ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l'unité
- [C] `TEXP-059` Racines $n$-ièmes de l'unité, cas particuliers : $n = 2, 3, 4$

- [SF] `TEXP-060` Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer un alignement
- [SF] `TEXP-061` Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer une orthogonalité
- [SF] `TEXP-062` Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des longueurs
- [SF] `TEXP-063` Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des angles
- [SF] `TEXP-064` Dans le cadre de la résolution de problème, utiliser les nombres complexes pour déterminer des ensembles de points
- [SF] `TEXP-065` Utiliser les racines de l'unité dans l'étude de configurations liées aux polygones réguliers

- [D] `TEXP-066` Détermination de l'ensemble $\mathbb{U}_n$

- [SF+] `TEXP-067` Lignes trigonométriques de $\frac{2\pi}{5}$, construction du pentagone régulier à la règle et au compas
- [SF+] `TEXP-068` Somme des racines $n$-ièmes de l'unité
- [SF+] `TEXP-069` Racines $n$-ièmes d'un nombre complexe
- [SF+] `TEXP-070` Transformation de Fourier discrète

---

## 2. Arithmétique

### 2.1 Arithmétique

- [C] `TEXP-071` Divisibilité dans $\mathbb{Z}$
- [C] `TEXP-072` Division euclidienne d'un élément de $\mathbb{Z}$ par un élément de $\mathbb{N}^*$
- [C] `TEXP-073` Congruences dans $\mathbb{Z}$
- [C] `TEXP-074` Compatibilité des congruences avec les opérations
- [C] `TEXP-075` PGCD de deux entiers
- [C] `TEXP-076` Algorithme d'Euclide
- [C] `TEXP-077` Couples d'entiers premiers entre eux
- [C] `TEXP-078` Théorème de Bézout
- [C] `TEXP-079` Théorème de Gauss
- [C] `TEXP-080` Nombres premiers
- [C] `TEXP-081` L'ensemble des nombres premiers est infini
- [C] `TEXP-082` Existence et unicité de la décomposition d'un entier en produit de facteurs premiers
- [C] `TEXP-083` Petit théorème de Fermat

- [SF] `TEXP-084` Déterminer les diviseurs d'un entier
- [SF] `TEXP-085` Déterminer le PGCD de deux entiers
- [SF] `TEXP-086` Résoudre une congruence $ax \equiv b \,[n]$
- [SF] `TEXP-087` Déterminer un inverse de $a$ modulo $n$ lorsque $a$ et $n$ sont premiers entre eux
- [SF] `TEXP-088` Établir des tests de divisibilité
- [SF] `TEXP-089` Utiliser des tests de divisibilité
- [SF] `TEXP-090` Étudier la primalité de certains nombres
- [SF] `TEXP-091` Étudier des problèmes de chiffrement
- [SF] `TEXP-092` Résoudre des équations diophantiennes simples

- [D] `TEXP-093` Écriture du PGCD de $a$ et $b$ sous la forme $ax + by$, $(x, y) \in \mathbb{Z}^2$
- [D] `TEXP-094` Théorème de Gauss (démonstration)
- [D] `TEXP-095` L'ensemble des nombres premiers est infini (démonstration)

- [SF+] `TEXP-096` Algorithme d'Euclide de calcul du PGCD de deux nombres
- [SF+] `TEXP-097` Calcul d'un couple de Bézout par l'algorithme d'Euclide
- [SF+] `TEXP-098` Crible d'Ératosthène
- [SF+] `TEXP-099` Décomposition en facteurs premiers
- [SF+] `TEXP-100` Détermination des racines rationnelles d'un polynôme à coefficients entiers
- [SF+] `TEXP-101` Lemme chinois et applications à des situations concrètes
- [SF+] `TEXP-102` Démonstrations du petit théorème de Fermat
- [SF+] `TEXP-103` Problèmes de codage (codes barres, code ISBN, clé du Rib, code Insee)
- [SF+] `TEXP-104` Étude de tests de primalité : notion de témoin, nombres de Carmichaël
- [SF+] `TEXP-105` Problèmes de chiffrement (affine, Vigenère, Hill, RSA)
- [SF+] `TEXP-106` Recherche de nombres premiers particuliers (Mersenne, Fermat)
- [SF+] `TEXP-107` Exemples simples de codes correcteurs
- [SF+] `TEXP-108` Étude du système cryptographique RSA
- [SF+] `TEXP-109` Détermination des triplets pythagoriciens
- [SF+] `TEXP-110` Étude des sommes de deux carrés par les entiers de Gauss
- [SF+] `TEXP-111` Étude de l'équation de Pell-Fermat

---

## 3. Graphes et matrices

### 3.1 Graphes et matrices

- [C] `TEXP-112` Graphe, sommets, arêtes
- [C] `TEXP-113` Exemple du graphe complet
- [C] `TEXP-114` Sommets adjacents, degré, ordre d'un graphe
- [C] `TEXP-115` Chaîne, longueur d'une chaîne
- [C] `TEXP-116` Graphe connexe
- [C] `TEXP-117` Notion de matrice (tableau de nombres réels)
- [C] `TEXP-118` Matrice carrée, matrice colonne, matrice ligne
- [C] `TEXP-119` Opérations sur les matrices
- [C] `TEXP-120` Inverse d'une matrice carrée
- [C] `TEXP-121` Puissances d'une matrice carrée
- [C] `TEXP-122` Représentation matricielle : matrice d'adjacence d'un graphe
- [C] `TEXP-123` Représentation matricielle des transformations géométriques du plan
- [C] `TEXP-124` Représentation matricielle des systèmes linéaires
- [C] `TEXP-125` Représentation matricielle des suites récurrentes
- [C] `TEXP-126` Exemples de calcul de puissances de matrices carrées d'ordre $2$ ou $3$
- [C] `TEXP-127` Suite de matrices colonnes $(U_n)$ vérifiant une relation de récurrence du type $U_{n+1} = AU_n + C$
- [C] `TEXP-128` Graphe orienté pondéré associé à une chaîne de Markov à deux ou trois états
- [C] `TEXP-129` Chaîne de Markov à deux ou trois états
- [C] `TEXP-130` Distribution initiale d'une chaîne de Markov, représentée par une matrice ligne $\pi_0$
- [C] `TEXP-131` Matrice de transition d'une chaîne de Markov, graphe pondéré associé
- [C] `TEXP-132` Pour une chaîne de Markov à deux ou trois états de matrice $P$, interprétation du coefficient $(i, j)$ de $P^n$
- [C] `TEXP-133` Distribution d'une chaîne de Markov après $n$ transitions, représentée comme la matrice ligne $\pi_0 P^n$
- [C] `TEXP-134` Distributions invariantes d'une chaîne de Markov à deux ou trois états

- [SF] `TEXP-135` Modéliser une situation par un graphe
- [SF] `TEXP-136` Modéliser une situation par une matrice
- [SF] `TEXP-137` Associer un graphe orienté pondéré à une chaîne de Markov à deux ou trois états
- [SF] `TEXP-138` Calculer l'inverse d'une matrice carrée
- [SF] `TEXP-139` Calculer les puissances d'une matrice carrée
- [SF] `TEXP-140` Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour résoudre un système linéaire
- [SF] `TEXP-141` Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une suite récurrente linéaire
- [SF] `TEXP-142` Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour calculer le nombre de chemins de longueur donnée entre deux sommets d'un graphe
- [SF] `TEXP-143` Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : calculer des probabilités
- [SF] `TEXP-144` Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : déterminer une probabilité invariante

- [D] `TEXP-145` Expression du nombre de chemins de longueur $n$ reliant deux sommets d'un graphe à l'aide de la puissance $n$-ième de la matrice d'adjacence
- [D] `TEXP-146` Pour une chaîne de Markov, expression de la probabilité de passer de l'état $i$ à l'état $j$ en $n$ transitions
- [D] `TEXP-147` Pour une chaîne de Markov, expression de la matrice ligne représentant la distribution après $n$ transitions

- [SF+] `TEXP-148` Étude de graphes eulériens
- [SF+] `TEXP-149` Interpolation polynomiale
- [SF+] `TEXP-150` Marche aléatoire sur un graphe. Étude asymptotique
- [SF+] `TEXP-151` Modèle de diffusion d'Ehrenfest
- [SF+] `TEXP-152` Modèle « proie-prédateur » discrétisé : évolution couplée de deux suites récurrentes
- [SF+] `TEXP-153` Algorithme PageRank

---

## Récapitulatif

| #   | Thème               | Objectifs | `[C]`  | `[SF]` | `[D]`  | `[SF+]` | Total   |
| --- | ------------------- | --------- | ------ | ------ | ------ | ------- | ------- |
| 1   | Nombres complexes   | 5         | 29     | 21     | 10     | 10      | 70      |
| 2   | Arithmétique        | 1         | 13     | 9      | 3      | 16      | 41      |
| 3   | Graphes et matrices | 1         | 23     | 10     | 3      | 6       | 42      |
|     | **Total**           | **7**     | **65** | **40** | **16** | **32**  | **153** |

> Chiffres **comptés dans le fichier** et confirmés par le générateur
> (`3 thèmes · 7 objectifs · 153 points`, `C=65 SF=72 D=16`, `approfondissement=32`), pas estimés.
>
> Les **32 `[SF+]`** (4 exemples d'algorithmes, 28 problèmes possibles) portent `exigence = approfondissement` ; les **121 autres** `attendu`. `regime_acquisition = diversite` partout au seed.
