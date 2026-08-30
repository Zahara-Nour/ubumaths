# Programme de suivi 1ʳᵉ spécialité maths — Thème → Objectif → Point (à relire)

> **But** : **amorçage** du référentiel de programme (tables `curriculum_*`), grade `'1_SPE'`.
> ⚠️ **Ce fichier ne fait plus foi** depuis le 2026-08-31 : il a rempli la base une fois, et c'est désormais la page **Programme** (`/dashboard/teacher/programme`) qui fait autorité. Le corriger ici ne produit plus rien — cf. la section ci-dessous.
> **Source** : « Programme de spécialité de mathématiques de la classe de première de la voie générale » — PDF fourni par David le 2026-08-29 (`Annexe – Programme d'enseignement de spécialité… -515408 (1).pdf`).
> ⚠️ **Ce n'est PAS le programme de l'arrêté du 17 janvier 2019** que la spec Phase 0 mentionnait : c'est le programme en vigueur, qui introduit notamment une partie transversale **« Automatismes »**.
>
> **Statut** : rédaction complète, seed écrit et appliqué en local. Relecture David toujours utile — mais une correction se fait maintenant dans l'app, pas ici.
> **6 thèmes · 14 objectifs · 153 points.**
>
> L'ordre suit celui du sommaire du BO (3 parties transversales, puis les 4 thématiques) et donne le `display_order`.

---

## Ce fichier amorce, l'application fait foi

Ce markdown a rempli la base **une fois**. Depuis, le référentiel se modifie
dans la page **Programme** : ajouter, renommer, retyper, déplacer, archiver,
poser un `rang` ou passer un point en `fluence` s'y font tous, sans toucher à un
fichier ni lancer de commande.

Le seed généré depuis ce fichier est un **amorçage gardé** : son corps entier est
dans un `DO … IF EXISTS (SELECT 1 FROM curriculum_themes WHERE grade = '1_SPE')
THEN RETURN`. Le rejouer sur une base déjà remplie ne fait **rien** — c'est ce
qui protège le travail fait dans l'app.

> Jusqu'au 2026-08-31 le seed re-synchronisait depuis ce markdown et archivait ce
> qui en avait disparu. Sur une base où le prof avait travaillé, le rejeu défaisait
> son travail : un libellé corrigé dans l'app était réécrit par le texte du BO.

### À quoi sert encore ce fichier

À **amorcer un niveau qui n'existe pas encore**. Saisir 153 points à la main dans
un formulaire serait une punition : pour la 2de ou la terminale, écrire un
markdown sur ce modèle et générer le seed reste la bonne façon de faire.

### Les codes

Chaque point porte un **code** (`1SPE-001` … `1SPE-153`) entre backticks juste
après son tag. Il identifie le point en base — pas le libellé, qui peut changer.

Sa raison d'être a évolué avec l'amorçage : il ne sert plus à re-synchroniser,
mais reste **le seul identifiant d'un point à la fois lisible et stable d'un
environnement à l'autre**. Les UUID diffèrent entre le local et la prod,
`1SPE-047` non — c'est donc lui qu'on écrit dans une fiche d'exercices, dans une
URL, ou qu'on donne à un élève.

Il est désormais attribué **par la base**, via le trigger
`curriculum_points_assign_code` : un point créé dans l'app prend la suite de la
même série (`1SPE-154`…). Ne jamais modifier un code à la main.

Pour un **nouveau** niveau, le générateur attribue les codes manquants et
réécrit le markdown :

```bash
pnpm tsx scripts/generate-curriculum-<niveau>-seed.ts && pnpm db:reset
```

## Convention de tags

Les tags encodent directement les rubriques du BO — c'est le texte qui donne la
typologie, on ne l'invente pas.

### Écriture des mathématiques

Les formules s'écrivent en **LaTeX entre `$…$`** — la syntaxe ubumark, celle des
questions. Elles sont rendues par MathLive partout où le référentiel s'affiche :
page Programme, Avancement, cahier de texte, « Mes objectifs ».

```
- [C] `1SPE-024` Notations : $u(n)$, $u_n$, $(u(n))$, $(u_n)$
```

Trois règles :

- **Jamais deux formules collées.** `$x$$y$` est ambigu pour le parser ubumark,
  qui ne peut pas savoir où finit la première. Toujours un mot ou une ponctuation
  entre deux formules. (Ce n'est plus un problème côté SQL : le générateur écrit
  désormais en quoting standard, insensible aux `$`.)
- **Convention française pour les vecteurs** : `\vec{u}` pour un vecteur d'une
  lettre, `\overrightarrow{MA}` pour un vecteur défini par deux points.
- **Pas de maths d'affichage** (`$$…$$`) dans un libellé : un point de programme
  est une ligne, pas un paragraphe.

Les backticks restent réservés au **code** du point. Ils ne servent plus aux
mathématiques — les 41 libellés concernés ont été convertis le 2026-08-29.

| Tag     | `kind`          | `exigence`          | Rubrique du BO                                                 |
| ------- | --------------- | ------------------- | -------------------------------------------------------------- |
| `[C]`   | `connaissance`  | `attendu`           | **Contenus**                                                   |
| `[SF]`  | `savoir_faire`  | `attendu`           | **Capacités attendues**                                        |
| `[D]`   | `demonstration` | `attendu`           | **Démonstrations**                                             |
| `[SF+]` | `savoir_faire`  | `approfondissement` | **Approfondissements possibles** et **Exemples d'algorithmes** |

**Deux axes distincts, à ne pas confondre** (c'est la confusion que portait
l'ancien champ `knowledge_type`) :

- `regime_acquisition` — **ce qui prouve la maîtrise**. `fluence` (≥ 5 réussites
  dont ≥ 3 sur les 5 dernières : le geste doit être rapide, fiable, et le rester)
  ou `diversite` (≥ 2 templates distincts, aucun échec récent : la maîtrise se
  prouve sur des cas variés). C'est une décision de mesure, éditable point par
  point.
- `curriculum_point_automatismes` (table de liaison) — **de quel programme ce
  point est un automatisme attendu**. « Automatisme » n'est pas une propriété du
  point : c'est une liste publiée par un programme donné, et un même point peut
  figurer dans plusieurs listes (1ʳᵉ et terminale, par exemple). D'où une
  liaison `(point, niveau)` plutôt qu'un drapeau.

**La partie « Automatismes » du BO ne figure pas dans cet arbre.** Ses points
ne sont pas des contenus de 1ʳᵉ : ce sont des acquis des années antérieures
(seconde pour l'essentiel) que le programme demande d'entretenir. Les créer ici
en dupliquerait la définition — l'erreur même que la refonte du référentiel a
corrigée. Ils vivront dans l'arbre du niveau où ils sont introduits, marqués
une ligne dans `curriculum_point_automatismes` pour le niveau dont ils sont
un attendu d'examen — ce qui permet de les retrouver à travers les programmes
des différentes années.

Au seed, donc : aucune liste d'automatismes, et `regime_acquisition = diversite`
partout. Tu bascules en `fluence` les points que tu décides de travailler par
répétition — « déterminer l'équation de la tangente en un point », par exemple.

> ⏳ **Suite à prévoir** : la couverture du cahier de texte est filtrée sur le
> niveau de la classe (`getCurriculumTree(grade)`). Une fois l'arbre de seconde
> créé, cocher un automatisme de seconde depuis une classe de 1ʳᵉ demandera
> d'étendre cette vue aux points tagués des niveaux antérieurs.

`rang` reste **vide partout** : le programme ne propose aucune échelle de
difficulté. Les objectifs s'afficheront donc en liste avec un compteur `n/m`.
Une échelle 1-4 pourra être ajoutée plus tard, objectif par objectif, depuis la
page Programme.

> ✅ **Acté (David, 2026-08-29)** — les « **Exemples d'algorithmes** » du BO sont
> des illustrations proposées à l'enseignant, pas des attendus. Ils sont
> **conservés**, en `[SF+]` : ce sont concrètement des choses que l'élève fait, et
> le prof veut pouvoir cocher qu'il les a traitées. **11 points** dans tout le
> programme, sans quoi il n'en resterait que 142.
>
> Ils partagent donc la valeur `approfondissement` avec les 17
> « Approfondissements possibles », et c'est correct : `exigence` ne répond qu'à
> une question — _ce point est-il exigible ?_ — et les deux rubriques y répondent
> non. Ce qui les distingue est leur nature, pas leur niveau d'exigence ; un axe
> séparé serait nécessaire pour ça, pas une troisième valeur ici.

> ⚠️ **Découpage des puces** — le point est le **grain de suivi** : plus il est
> fin, mieux on repère les trous. Quand une puce du BO enchaîne deux gestes
> qu'un élève peut réussir séparément, je la coupe. Écart assumé avec le texte,
> listé ici pour que tu le voies en relisant. **4 occurrences** :
>
> - §3.1 « Proposer, modéliser une situation… **Déterminer** une relation explicite ou de récurrence… » → 2 points
> - §4.1 « Déterminer graphiquement un nombre dérivé… **Construire** la tangente… » → 2 points
> - §6.2 « Interpréter en situation et utiliser les notations… **Passer** du registre de la langue naturelle au registre symbolique… » → 2 points
> - §5.1 les 4 méthodes de calcul du produit scalaire restent **un seul** point (c'est le choix de méthode qui est l'attendu, pas chaque méthode)

> ⚠️ **Thème 1 : typage interprétatif.** « Vocabulaire ensembliste et logique »
> est rédigé en prose continue dans le BO, **sans** les rubriques
> Contenus/Capacités attendues. Le partage `[C]` / `[SF]` y est donc mon
> interprétation, pas une lecture directe du texte. C'est le seul thème dans ce cas.

---

## 1. Vocabulaire ensembliste et logique

### 1.1 Ensembles

- [C] `1SPE-001` Notions d'élément d'un ensemble, de sous-ensemble, d'ensemble vide, d'appartenance et d'inclusion, de réunion, d'intersection et de complémentaire
- [C] `1SPE-002` Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\dots\,\}$. Notation du complémentaire d'un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$
- [C] `1SPE-003` Notation des ensembles de nombres et des intervalles
- [C] `1SPE-004` Notion de couple et de produit cartésien de deux ensembles
- [C] `1SPE-005` Notation $\operatorname{Card}(A)$ pour le cardinal d'un ensemble fini

### 1.2 Logique et raisonnement

- [SF] `1SPE-006` Lire et écrire des propositions contenant les connecteurs logiques « et », « ou »
- [SF] `1SPE-007` Mobiliser un contre-exemple pour montrer qu'une proposition est fausse
- [SF] `1SPE-008` Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple
- [SF] `1SPE-009` Formuler la réciproque d'une implication, la contraposée
- [SF] `1SPE-010` Employer les expressions « condition nécessaire », « condition suffisante »
- [SF] `1SPE-011` Identifier le statut des égalités (identité, équation) et celui des lettres utilisées (variable, inconnue, paramètre)
- [SF] `1SPE-012` Utiliser les quantificateurs (les symboles $\forall$ et $\exists$ ne sont pas exigibles) et repérer les quantifications implicites, particulièrement dans les propositions conditionnelles
- [SF] `1SPE-013` Formuler la négation de propositions quantifiées
- [SF] `1SPE-014` Produire un raisonnement par disjonction des cas
- [SF] `1SPE-015` Produire un raisonnement par l'absurde
- [SF] `1SPE-016` Produire un raisonnement par contraposée

---

## 2. Algorithmique et programmation

### 2.1 Notion de liste

- [C] `1SPE-017` Génération des listes en extension et en compréhension, en lien avec la notion d'ensemble
- [SF] `1SPE-018` Générer une liste (en extension, par ajouts successifs ou en compréhension)
- [SF] `1SPE-019` Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices
- [SF] `1SPE-020` Parcourir une liste
- [SF] `1SPE-021` Itérer sur les éléments d'une liste

---

## 3. Algèbre

### 3.1 Suites numériques, modèles discrets

**Contenus**

- [C] `1SPE-022` Exemples de modes de génération d'une suite : explicite $u_n = f(n)$, par une relation de récurrence $u_{n+1} = f(u_n)$, par un algorithme, par des motifs géométriques
- [C] `1SPE-023` Notations : $u(n)$, $u_n$, $(u(n))$, $(u_n)$
- [C] `1SPE-024` Suites arithmétiques : exemples, définition, calcul du terme général
- [C] `1SPE-025` Suites arithmétiques : lien avec l'étude d'évolutions successives à accroissements constants ; lien avec les fonctions affines
- [C] `1SPE-026` Suites arithmétiques : calcul de $1 + 2 + \dots + n$
- [C] `1SPE-027` Suites géométriques : exemples, définition, calcul du terme général
- [C] `1SPE-028` Suites géométriques : lien avec l'étude d'évolutions successives à taux constant ; lien avec la fonction exponentielle
- [C] `1SPE-029` Suites géométriques : calcul de $1 + q + \dots + q^n$
- [C] `1SPE-030` Sens de variation d'une suite
- [C] `1SPE-031` Introduction intuitive, sur des exemples, de la notion de limite finie ou infinie, ou de l'absence de limite d'une suite

**Capacités attendues**

- [SF] `1SPE-032` Dans le cadre de l'étude d'une suite, utiliser le registre de la langue naturelle, le registre algébrique, le registre graphique, et passer de l'un à l'autre
- [SF] `1SPE-033` Proposer, modéliser une situation permettant de générer une suite de nombres
- [SF] `1SPE-034` Déterminer une relation explicite ou une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement
- [SF] `1SPE-035` Calculer des termes d'une suite définie explicitement, par récurrence ou par un algorithme
- [SF] `1SPE-036` Pour une suite arithmétique ou géométrique, calculer le terme général
- [SF] `1SPE-037` Pour une suite arithmétique ou géométrique, calculer la somme de termes consécutifs
- [SF] `1SPE-038` Pour une suite arithmétique ou géométrique, déterminer le sens de variation
- [SF] `1SPE-039` Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, un phénomène discret à croissance exponentielle par une suite géométrique
- [SF] `1SPE-040` Conjecturer, dans des cas simples, la limite éventuelle d'une suite

**Démonstrations**

- [D] `1SPE-041` Calcul du terme général d'une suite arithmétique, d'une suite géométrique
- [D] `1SPE-042` Calcul de $1 + 2 + \dots + n$
- [D] `1SPE-043` Calcul de $1 + q + \dots + q^n$

**Exemples d'algorithmes**

- [SF+] `1SPE-044` Calcul de termes d'une suite, de sommes de termes, de seuil
- [SF+] `1SPE-045` Calcul de factorielle
- [SF+] `1SPE-046` Liste des premiers termes d'une suite : suites de Syracuse, suite de Fibonacci

**Approfondissements possibles**

- [SF+] `1SPE-047` Tour de Hanoï
- [SF+] `1SPE-048` Somme des n premiers carrés, des n premiers cubes
- [SF+] `1SPE-049` Remboursement d'un emprunt par annuités constantes

### 3.2 Équations, fonctions polynômes du second degré

**Contenus**

- [C] `1SPE-050` Forme développée d'une fonction polynôme du second degré. Coefficients
- [C] `1SPE-051` Forme factorisée d'une fonction polynôme du second, racines
- [C] `1SPE-052` Forme canonique d'une fonction polynôme du second degré ; factorisation éventuelle ; recherche d'extremum
- [C] `1SPE-053` Discriminant d'une fonction polynôme du second degré. Calcul des racines
- [C] `1SPE-054` Calcul des coordonnées du sommet d'une parabole. Axe de symétrie
- [C] `1SPE-055` Résolution d'une équation du second degré
- [C] `1SPE-056` Résolution d'une inéquation du second degré
- [C] `1SPE-057` Expression de la somme et du produit des racines

**Capacités attendues**

- [SF] `1SPE-058` Étudier le signe d'une fonction polynôme du second degré donnée sous forme factorisée
- [SF] `1SPE-059` Déterminer les fonctions polynômes du second degré s'annulant en deux nombres réels distincts
- [SF] `1SPE-060` Factoriser une fonction polynôme du second degré en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales
- [SF] `1SPE-061` Choisir une forme adaptée (développée réduite, canonique, factorisée) d'une fonction polynôme du second degré dans le cadre de la résolution d'un problème (équation, inéquation, optimisation, variations)
- [SF] `1SPE-062` Résoudre ces problèmes à l'aide du discriminant et des coefficients de la fonction polynôme du second degré

**Démonstrations**

- [D] `1SPE-063` Résolution de l'équation du second degré

**Approfondissements possibles**

- [SF+] `1SPE-064` Factorisation d'un polynôme du troisième degré admettant une racine, et résolution de l'équation associée
- [SF+] `1SPE-065` Factorisation de $x^n - 1$ par $x - 1$, de $x^n - a^n$ par $x - a$
- [SF+] `1SPE-066` Déterminer deux nombres réels connaissant leur somme $s$ et leur produit $p$ comme racines de la fonction polynôme $x \mapsto x^2 - sx + p$

---

## 4. Analyse

### 4.1 Dérivation

**Contenus — point de vue local**

- [C] `1SPE-067` Taux de variation ; sécantes à la courbe représentative d'une fonction en un point donné
- [C] `1SPE-068` Nombre dérivé d'une fonction en un point, comme limite du taux de variation ; notation $f'(a)$
- [C] `1SPE-069` Tangente à la courbe représentative d'une fonction en un point, comme « limite des sécantes » ; pente ; équation $y = f(a) + f'(a)(x - a)$
- [C] `1SPE-070` Approximation linéaire : fonction affine tangente $x \mapsto f(a) + f'(a)(x - a)$ et approximation de $f(a + h)$ par $f(a) + f'(a)h$

**Contenus — point de vue global**

- [C] `1SPE-071` Fonction dérivable sur un intervalle ; fonction dérivée
- [C] `1SPE-072` Fonction dérivée des fonctions carré, cube, inverse, racine carrée
- [C] `1SPE-073` Opérations sur les fonctions dérivables : somme, produit, inverse, quotient
- [C] `1SPE-074` Pour $n$ dans $\mathbb{Z}$, fonction dérivée de la fonction $x \mapsto x^n$
- [C] `1SPE-075` Fonction valeur absolue : étude de la dérivabilité en 0

**Capacités attendues**

- [SF] `1SPE-076` Calculer un taux de variation, la pente d'une sécante
- [SF] `1SPE-077` Interpréter le nombre dérivé en contexte : pente d'une tangente, vitesse instantanée, cout marginal, etc.
- [SF] `1SPE-078` Déterminer graphiquement un nombre dérivé par la pente de la tangente
- [SF] `1SPE-079` Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé
- [SF] `1SPE-080` Déterminer l'équation de la tangente en un point à la courbe représentative d'une fonction
- [SF] `1SPE-081` Calculer une valeur approchée de $f(a + h)$
- [SF] `1SPE-082` Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables

**Démonstrations**

- [D] `1SPE-083` Équation de la tangente en un point à une courbe représentative
- [D] `1SPE-084` La fonction racine carrée n'est pas dérivable en 0
- [D] `1SPE-085` Fonction dérivée de la fonction carrée, de la fonction inverse
- [D] `1SPE-086` Fonction dérivée d'un produit

**Exemple d'algorithme**

- [SF+] `1SPE-087` Écrire la liste des coefficients directeurs des sécantes pour un pas donné

### 4.2 Variations et courbes représentatives des fonctions

**Contenus**

- [C] `1SPE-088` Représentation algébrique et graphique de fonctions paires, impaires ; traduction géométrique
- [C] `1SPE-089` Lien entre le sens de variation d'une fonction dérivable sur un intervalle et le signe de sa fonction dérivée ; caractérisation des fonctions constantes
- [C] `1SPE-090` Nombre dérivé en un extrémum

**Capacités attendues**

- [SF] `1SPE-091` Étudier les variations d'une fonction ; déterminer les extrémums
- [SF] `1SPE-092` Résoudre un problème d'optimisation
- [SF] `1SPE-093` Exploiter les variations d'une fonction pour établir une inégalité ; étudier la position relative de deux courbes représentatives
- [SF] `1SPE-094` Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations, extrémum, allure selon le signe du coefficient de $x^2$

**Exemple d'algorithme**

- [SF+] `1SPE-095` Méthode de Newton, en se limitant à des cas favorables

### 4.3 Fonction exponentielle

**Contenus**

- [C] `1SPE-096` Définition de la fonction exponentielle comme unique fonction dérivable sur $\mathbb{R}$ vérifiant $f' = f$ et $f(0) = 1$ (existence et unicité admises) ; notation $\exp(x)$
- [C] `1SPE-097` Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$ et $\exp(x)\exp(-x) = 1$
- [C] `1SPE-098` Nombre $e$ ; notation $e^x$
- [C] `1SPE-099` Signe, sens de variation et courbe représentative de la fonction exponentielle
- [C] `1SPE-100` Lien avec les suites géométriques

**Capacités attendues**

- [SF] `1SPE-101` Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle
- [SF] `1SPE-102` Pour $a$ réel, dérivée de la fonction $t \mapsto e^{at}$
- [SF] `1SPE-103` Pour une valeur numérique strictement positive de $k$, représenter graphiquement les fonctions $t \mapsto e^{-kt}$ et $t \mapsto e^{kt}$
- [SF] `1SPE-104` Modéliser une situation par une croissance, une décroissance exponentielle (évolution d'un capital à taux fixe, décroissance radioactive)

**Exemples d'algorithmes**

- [SF+] `1SPE-105` Construction de l'exponentielle par la méthode d'Euler
- [SF+] `1SPE-106` Détermination d'une valeur approchée de $e$ à l'aide de la suite $\left(\left(1 + \tfrac{1}{n}\right)^n\right)$

**Approfondissements possibles**

- [SF+] `1SPE-107` Unicité d'une fonction $f$ dérivable sur $\mathbb{R}$ vérifiant $f' = f$ et $f(0) = 1$
- [SF+] `1SPE-108` Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$
- [SF+] `1SPE-109` La fonction exponentielle est strictement positive et croissante

### 4.4 Trigonométrie

**Contenus**

- [C] `1SPE-110` Cercle trigonométrique ; longueur d'arc ; radian
- [C] `1SPE-111` Enroulement de la droite sur le cercle trigonométrique ; image d'un nombre réel
- [C] `1SPE-112` Cosinus et sinus d'un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle ; valeurs remarquables

**Capacités attendues**

- [SF] `1SPE-113` Placer un point sur le cercle trigonométrique
- [SF] `1SPE-114` Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de $x$, les cosinus et sinus d'angles associés à $x$

**Démonstration**

- [D] `1SPE-115` Calcul de $\cos\left(\tfrac{\pi}{4}\right)$, $\sin\left(\tfrac{\pi}{4}\right)$, $\cos\left(\tfrac{\pi}{3}\right)$, $\sin\left(\tfrac{\pi}{3}\right)$

**Exemple d'algorithme**

- [SF+] `1SPE-116` Approximation de $\pi$ par la méthode d'Archimède

---

## 5. Géométrie

### 5.1 Calcul vectoriel et produit scalaire

**Contenus**

- [C] `1SPE-117` Produit scalaire à partir de la projection orthogonale et de la formule avec le cosinus
- [C] `1SPE-118` Caractérisation de l'orthogonalité
- [C] `1SPE-119` Bilinéarité, symétrie
- [C] `1SPE-120` En base orthonormée, expression du produit scalaire et de la norme
- [C] `1SPE-121` Expression des coordonnées dans une base orthonormée en termes de produits scalaires avec les vecteurs de la base
- [C] `1SPE-122` Développement de $\|\vec{u} + \vec{v}\|^2$ et $\|\vec{u} - \vec{v}\|^2$
- [C] `1SPE-123` Formule d'Al-Kashi
- [C] `1SPE-124` Transformation de l'expression $\overrightarrow{MA} \cdot \overrightarrow{MB}$

**Capacités attendues**

- [SF] `1SPE-125` Utiliser le produit scalaire pour démontrer une orthogonalité
- [SF] `1SPE-126` Utiliser le produit scalaire pour calculer un angle
- [SF] `1SPE-127` Utiliser le produit scalaire pour calculer une longueur dans le plan
- [SF] `1SPE-128` En vue de la résolution d'un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (projection orthogonale, coordonnées, normes et angle, normes)
- [SF] `1SPE-129` Utiliser le produit scalaire pour résoudre un problème géométrique

**Démonstrations**

- [D] `1SPE-130` Formule d'Al-Kashi (démonstration avec le produit scalaire)
- [D] `1SPE-131` Ensemble des points $M$ tels que $\overrightarrow{MA} \cdot \overrightarrow{MB} = 0$ (démonstration avec le produit scalaire)

**Approfondissements possibles**

- [SF+] `1SPE-132` Loi des sinus
- [SF+] `1SPE-133` Concourance des hauteurs d'un triangle
- [SF+] `1SPE-134` Les médianes d'un triangle concourent au centre de gravité

### 5.2 Géométrie repérée

> Dans cette section, le plan est rapporté à un repère orthonormé.

**Contenus**

- [C] `1SPE-135` Vecteur normal à une droite ; le vecteur de coordonnées $(a\,;\,b)$ est normal à la droite d'équation $ax + by + c = 0$
- [C] `1SPE-136` Projection orthogonale d'un point sur une droite
- [C] `1SPE-137` Équation de cercle

**Capacités attendues**

- [SF] `1SPE-138` Déterminer une équation cartésienne d'une droite connaissant un point et un vecteur normal
- [SF] `1SPE-139` Déterminer les coordonnées du projeté orthogonal d'un point sur une droite
- [SF] `1SPE-140` Déterminer et utiliser l'équation d'un cercle donné par son centre et son rayon
- [SF] `1SPE-141` Reconnaitre une équation de cercle, déterminer centre et rayon
- [SF] `1SPE-142` Utiliser un repère pour étudier une configuration

**Approfondissements possibles**

- [SF+] `1SPE-143` Recherche de l'ensemble des points équidistants de l'axe des abscisses et d'un point donné
- [SF+] `1SPE-144` Déterminer l'intersection d'un cercle ou d'une parabole d'équation $y = ax^2 + bx + c$ avec une droite parallèle à un axe

---

## 6. Probabilités et statistiques

### 6.1 Probabilités conditionnelles et indépendance

**Contenus**

- [C] `1SPE-145` Indépendance de deux évènements.
- [C] `1SPE-146` Partition de l'univers (systèmes complets d'évènements) ; formule des probabilités totales
- [C] `1SPE-147` Succession de deux épreuves indépendantes ; représentation par un arbre ou un tableau
- [C] `1SPE-148` Pour $n \leqslant 4$, répétition de $n$ épreuves de Bernoulli indépendantes et identiques

**Capacités attendues**

- [SF] `1SPE-149` Dans des cas simples, calculer une probabilité à l'aide de la formule des probabilités totales
- [SF] `1SPE-150` Savoir utiliser ou justifier l'indépendance de deux évènements
- [SF] `1SPE-151` Représenter la succession de deux épreuves indépendantes par un arbre ou un tableau
- [SF] `1SPE-152` Pour $n \leqslant 4$, représenter l'arbre associé à la répétition de $n$ épreuves de Bernoulli indépendantes et identiques afin de calculer des probabilités

**Exemple d'algorithme**

- [SF+] `1SPE-153` Méthode de Monte-Carlo : estimation de l'aire sous la parabole, estimation du nombre $\pi$

**Approfondissements possibles**

- [SF+] `1SPE-154` Exemples de succession de plusieurs épreuves indépendantes
- [SF+] `1SPE-155` Exemples de marches aléatoires

### 6.2 Variables aléatoires réelles

> Le programme ne considère que des univers finis et des variables aléatoires réelles.

**Contenus**

- [C] `1SPE-156` Variable aléatoire réelle : modélisation du résultat numérique d'une expérience aléatoire ; formalisation comme fonction définie sur l'univers et à valeurs réelles
- [C] `1SPE-157` Loi d'une variable aléatoire
- [C] `1SPE-158` Espérance, variance, écart type d'une variable aléatoire
- [C] `1SPE-159` Linéarité de l'espérance
- [C] `1SPE-160` Formule de König-Huygens

**Capacités attendues**

- [SF] `1SPE-161` Interpréter en situation et utiliser les notations $\{X = a\}$, $\{X \leqslant a\}$, $P(X = a)$, $P(X \leqslant a)$
- [SF] `1SPE-162` Passer du registre de la langue naturelle au registre symbolique et inversement
- [SF] `1SPE-163` Modéliser une situation à l'aide d'une variable aléatoire
- [SF] `1SPE-164` Déterminer la loi de probabilité d'une variable aléatoire
- [SF] `1SPE-165` Calculer une espérance, une variance, un écart type
- [SF] `1SPE-166` Utiliser la notion d'espérance dans une résolution de problème (mise pour un jeu équitable, etc.)

**Exemples d'algorithmes**

- [SF+] `1SPE-167` Algorithme renvoyant l'espérance, la variance ou l'écart type d'une variable aléatoire
- [SF+] `1SPE-168` Fréquence d'apparition des lettres d'un texte donné, en français, en anglais

**Approfondissements possibles**

- [SF+] `1SPE-169` Pour $X$ variable aléatoire, étude de la fonction du second degré $x \mapsto E\big((X - x)^2\big)$

### 6.3 Expérimentations

- [SF] `1SPE-170` Simuler une variable aléatoire avec Python ou un tableur
- [SF] `1SPE-171` Lire, comprendre et écrire une fonction Python renvoyant la moyenne d'un échantillon de taille $n$ d'une variable aléatoire
- [SF] `1SPE-172` Étudier sur des exemples la distance entre la moyenne d'un échantillon simulé de taille $n$ d'une variable aléatoire et l'espérance de cette variable aléatoire
- [SF] `1SPE-173` Simuler, avec Python ou un tableur, $N$ échantillons de taille $n$ d'une variable aléatoire d'espérance $\mu$ et d'écart type $\sigma$ ; si $m$ désigne la moyenne d'un échantillon, calculer la proportion des cas où l'écart entre $m$ et $\mu$ est inférieur ou égal à $\frac{2\sigma}{\sqrt{n}}$

---

## Récapitulatif

| #   | Thème                              | Objectifs | `[C]`  | `[SF]` | `[D]`  | `[SF+]` | Total   |
| --- | ---------------------------------- | --------- | ------ | ------ | ------ | ------- | ------- |
| 1   | Vocabulaire ensembliste et logique | 2         | 6      | 11     | 0      | 0       | 17      |
| 2   | Algorithmique et programmation     | 1         | 1      | 4      | 0      | 0       | 5       |
| 3   | Automatismes                       | 5         | 0      | 17     | 0      | 0       | 17      |
| 4   | Algèbre                            | 2         | 8      | 11     | 4      | 9       | 32      |
| 5   | Analyse                            | 4         | 18     | 17     | 5      | 8       | 48      |
| 6   | Géométrie                          | 2         | 7      | 8      | 2      | 5       | 22      |
| 7   | Probabilités et statistiques       | 3         | 9      | 14     | 0      | 6       | 29      |
|     | **Total**                          | **19**    | **49** | **82** | **11** | **28**  | **170** |

> Chiffres **comptés dans le fichier**, pas estimés.
>
> Les 2 sous-parties de la logique comptent chacune comme un objectif — d'où 14
> et non 6.
>
> Les **28 `[SF+]`** portent `exigence = approfondissement` ; les **125 autres** > `attendu`. `regime_acquisition = diversite` partout au seed, et aucune liste
> d'automatismes (cf. convention ci-dessus).
