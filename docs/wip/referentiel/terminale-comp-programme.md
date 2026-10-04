# Programme de suivi terminale mathématiques complémentaires — Thème → Objectif → Point (à relire)

> **But** : **amorçage** du référentiel de programme (tables `curriculum_*`), grade `'T_COMP'`.
> ⚠️ **Ce fichier ne fait plus foi une fois le niveau amorcé** : la page **Programme** (`/dashboard/teacher/programme`) prend le relais. Le corriger ici ne produit plus rien — cf. le référentiel de 1ʳᵉ, même règle.
> **Source** : « Programme d'enseignement optionnel de mathématiques complémentaires de terminale générale » — PDF fourni par David le 2026-10-03.
>
> **Statut** : brouillon, **à relire par David**. Rien n'est amorcé.
>
> L'ordre suit celui du sommaire du BO. Le référentiel est bâti sur la seule partie **« Contenus »** du BO (décision Q149). Les **neuf « thèmes d'étude »** (premier volet du programme, qui mettent en situation les contenus du second volet), ainsi que les rubriques **« Objectifs »** et **« Histoire des mathématiques »**, sont des textes destinés au professeur : ils ne donnent **aucun point**. Le programme ne comporte pas de partie « Automatismes ».
>
> La partie **« Algorithmique et programmation »** du BO ne donne **aucun point** : elle reprend les programmes de seconde et de première « sans introduire de notion nouvelle », en prose et sans rubrique. Les algorithmes du programme sont portés par les rubriques « Exemples d'algorithme » de chaque objectif.

---

## Convention de tags

Identique à celle de 1ʳᵉ spé — les tags encodent les rubriques du BO, on ne les invente pas.

| Tag     | `kind`          | `exigence`          | Rubrique du BO                                         |
| ------- | --------------- | ------------------- | ------------------------------------------------------ |
| `[C]`   | `connaissance`  | `attendu`           | **Contenus**                                           |
| `[SF]`  | `savoir_faire`  | `attendu`           | **Capacités attendues** (« Capacités » en statistique) |
| `[D]`   | `demonstration` | `attendu`           | **Démonstrations possibles**                           |
| `[SF+]` | `savoir_faire`  | `approfondissement` | **Exemples d'algorithme**                              |

> Le BO de mathématiques complémentaires n'a pas de rubrique « Approfondissements possibles », et ses démonstrations sont toutes intitulées « Démonstration(s) possible(s) » : elles reçoivent malgré tout le tag `[D]`, comme les « Démonstrations » de la spécialité.

### Écriture des mathématiques

LaTeX entre `$…$`, rendu par MathLive. Trois règles :

- **Seules les commandes connues de MathLive.** Le générateur refuse le fichier sinon, en nommant les points fautifs — une commande inconnue s'afficherait en clair à l'élève. Notamment `\ldots` ou `\cdots`, jamais `\dots` ; `\vec{AB}` et non `\overrightarrow{AB}`.
- **Jamais deux formules collées** : `$x$$y$` est ambigu pour le parser ubumark.
- **Pas de maths d'affichage** (`$$…$$`) : un point est une ligne, pas un paragraphe.

Les backticks sont réservés au **code** du point.

### Grain de suivi

Quand une puce du BO enchaîne deux gestes qu'un élève peut réussir séparément, elle est **coupée** — convention établie par la relecture de 1ʳᵉ spé du 2026-08-30. « Calculer une intégrale, une valeur moyenne. » en fait deux.

Quand une même phrase du BO donnerait un contenu et une démonstration de libellé identique, la démonstration est suffixée « (démonstration) » : deux points d'un même objectif ne peuvent pas porter le même libellé.

---

## 1. Analyse

### 1.1 Suites numériques, modèles discrets

- [C] `TCOMP-001` Approche intuitive de la notion de limite, finie ou infinie, d'une suite
- [C] `TCOMP-002` Approche intuitive des opérations sur les limites
- [C] `TCOMP-003` Approche intuitive du passage à la limite dans les inégalités et du théorème des gendarmes
- [C] `TCOMP-004` Limite d'une suite géométrique de raison positive
- [C] `TCOMP-005` Limite de la somme des termes d'une suite géométrique de raison positive strictement inférieure à $1$
- [C] `TCOMP-006` Suites arithmético-géométriques

- [SF] `TCOMP-007` Modéliser un problème par une suite donnée par une formule explicite ou une relation de récurrence
- [SF] `TCOMP-008` Calculer une limite de suite géométrique
- [SF] `TCOMP-009` Calculer la limite de la somme des termes d'une suite géométrique de raison positive et strictement inférieure à $1$
- [SF] `TCOMP-010` Représenter graphiquement une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$ où $f$ est une fonction continue d'un intervalle $I$ dans lui-même
- [SF] `TCOMP-011` Conjecturer le comportement global ou asymptotique d'une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$
- [SF] `TCOMP-012` Pour une récurrence arithmético-géométrique : rechercher une suite constante solution particulière ; utiliser cette suite pour déterminer toutes les solutions

- [D] `TCOMP-013` Limite des sommes des termes d'une suite géométrique de raison positive strictement inférieure à $1$ (démonstration)

- [SF+] `TCOMP-014` Recherche de seuils
- [SF+] `TCOMP-015` Pour une suite récurrente $u_{n+1} = f(u_n)$, calcul des termes successifs
- [SF+] `TCOMP-016` Recherche de valeurs approchées de constantes mathématiques, par exemple $\pi$, $\ln 2$, $\sqrt{2}$

### 1.2 Fonctions : continuité, dérivabilité, limites, représentation graphique

> On se limite à une approche intuitive de la continuité et on admet qu'une fonction dérivable sur un intervalle est continue. La formalisation de la notion de limite n'est pas un attendu du programme. Les opérations sur les limites sont admises. La notion de fonction réciproque ne donne pas lieu à des développements théoriques, mais est illustrée par les fonctions carré, racine carrée, exponentielle, logarithme.

- [C] `TCOMP-017` Notion de limite d'une fonction. Lien avec la continuité et les asymptotes horizontales ou verticales
- [C] `TCOMP-018` Limites des fonctions de référence (carré, cube, racine carrée, inverse, exponentielle, logarithme)
- [C] `TCOMP-019` Théorème des valeurs intermédiaires (admis). Cas des fonctions strictement monotones
- [C] `TCOMP-020` Réciproque d'une fonction continue strictement monotone sur un intervalle, représentation graphique
- [C] `TCOMP-021` Fonction logarithme népérien : réciproque de la fonction exponentielle
- [C] `TCOMP-022` Limites et représentation graphique de la fonction logarithme népérien
- [C] `TCOMP-023` Équation fonctionnelle du logarithme népérien
- [C] `TCOMP-024` Fonction dérivée du logarithme népérien
- [C] `TCOMP-025` Fonction dérivée de $x \mapsto f(ax + b)$, $x \mapsto e^{u(x)}$, $x \mapsto \ln u(x)$, $x \mapsto u(x)^2$

- [SF] `TCOMP-026` Calculer une fonction dérivée
- [SF] `TCOMP-027` Calculer des limites
- [SF] `TCOMP-028` Dresser un tableau de variation
- [SF] `TCOMP-029` Dans le cadre de la résolution de problème, utiliser le calcul des limites
- [SF] `TCOMP-030` Dans le cadre de la résolution de problème, utiliser l'allure des courbes représentatives des fonctions inverse, carré, cube, racine carrée, exponentielle et logarithme
- [SF] `TCOMP-031` Exploiter le tableau de variation pour déterminer le nombre de solutions d'une équation du type $f(x) = k$
- [SF] `TCOMP-032` Exploiter le tableau de variation pour résoudre une inéquation du type $f(x) \leqslant k$
- [SF] `TCOMP-033` Déterminer des valeurs approchées, un encadrement d'une solution d'une équation du type $f(x) = k$
- [SF] `TCOMP-034` Utiliser l'équation fonctionnelle de l'exponentielle ou du logarithme pour transformer une écriture
- [SF] `TCOMP-035` Utiliser l'équation fonctionnelle de l'exponentielle ou du logarithme pour résoudre une équation, une inéquation
- [SF] `TCOMP-036` Utiliser la relation $\ln q^n = n \ln q$ pour déterminer un seuil

- [D] `TCOMP-037` Relation $\ln(ab) = \ln a + \ln b$
- [D] `TCOMP-038` Relation $\ln\left(\frac{1}{a}\right) = -\ln a$
- [D] `TCOMP-039` Calcul de la fonction dérivée du logarithme, en admettant sa dérivabilité
- [D] `TCOMP-040` Calcul de la fonction dérivée de $\ln u$
- [D] `TCOMP-041` Calcul de la fonction dérivée de $\exp u$

- [SF+] `TCOMP-042` Recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ par balayage
- [SF+] `TCOMP-043` Recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ par dichotomie
- [SF+] `TCOMP-044` Recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ par la méthode de Newton
- [SF+] `TCOMP-045` Algorithme de Briggs pour le calcul de logarithmes

### 1.3 Primitives et équations différentielles

> Le programme se limite à la résolution des équations différentielles linéaires du premier ordre à coefficients constants. Sur les exemples, on met en évidence l'existence et l'unicité de la solution vérifiant une condition initiale donnée. Des équations différentielles non linéaires peuvent apparaître (équation logistique), mais aucune connaissance spécifique à ce sujet n'est exigible.

- [C] `TCOMP-046` Sur des exemples, notion d'une solution d'équation différentielle
- [C] `TCOMP-047` Notion de primitive, en liaison avec l'équation différentielle $y' = f$
- [C] `TCOMP-048` Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante
- [C] `TCOMP-049` Équation différentielle $y' = ay + b$, où $a$ et $b$ sont des réels ; allure des courbes

- [SF] `TCOMP-050` Vérifier qu'une fonction donnée est solution d'une équation différentielle
- [SF] `TCOMP-051` Déterminer les primitives d'une fonction, en reconnaissant la dérivée d'une fonction de référence
- [SF] `TCOMP-052` Déterminer les primitives d'une fonction de la forme $2uu'$, $e^{u}u'$ ou $\frac{u'}{u}$
- [SF] `TCOMP-053` Résoudre une équation différentielle $y' = ay$
- [SF] `TCOMP-054` Pour une équation différentielle $y' = ay + b$ : déterminer une solution particulière constante ; utiliser cette solution pour déterminer la solution générale

- [D] `TCOMP-055` Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante (démonstration)
- [D] `TCOMP-056` Résolution de l'équation différentielle $y' = ay$

- [SF+] `TCOMP-057` Sur des exemples, résolution approchée d'une équation différentielle par la méthode d'Euler

### 1.4 Fonctions convexes

- [C] `TCOMP-058` Dérivée seconde d'une fonction
- [C] `TCOMP-059` Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes
- [C] `TCOMP-060` Lorsque $f$ est dérivable, équivalence admise avec la position de la courbe par rapport aux tangentes
- [C] `TCOMP-061` Caractérisation admise de la convexité par la croissance de $f'$, la positivité de $f''$
- [C] `TCOMP-062` Point d'inflexion

- [SF] `TCOMP-063` Reconnaître sur une représentation graphique une fonction convexe, concave, un point d'inflexion
- [SF] `TCOMP-064` Étudier la convexité, la concavité, d'une fonction deux fois dérivable sur un intervalle

### 1.5 Intégration

> On s'appuie sur la notion intuitive d'aire rencontrée au collège et sur les propriétés d'additivité et d'invariance par translation et symétrie. On met en relation les écritures $\int_a^b f(x)\,\mathrm{d}x$ et $\sum_{i=1}^{n} f(x_i)\Delta x_i$.

- [C] `TCOMP-065` Définition de l'intégrale d'une fonction continue et positive sur $[a, b]$ comme aire sous la courbe. Notation $\int_a^b f(x)\,\mathrm{d}x$
- [C] `TCOMP-066` Relation de Chasles
- [C] `TCOMP-067` Valeur moyenne d'une fonction continue sur $[a, b]$. Approche graphique et numérique
- [C] `TCOMP-068` La valeur moyenne est comprise entre les bornes de la fonction
- [C] `TCOMP-069` Approximation d'une intégrale par la méthode des rectangles
- [C] `TCOMP-070` Présentation de l'intégrale des fonctions continues de signe quelconque
- [C] `TCOMP-071` Théorème : si $f$ est continue sur $[a, b]$, la fonction $F$ définie sur $[a, b]$ par $F(x) = \int_a^x f(t)\,\mathrm{d}t$ est dérivable sur $[a, b]$ et a pour dérivée $f$
- [C] `TCOMP-072` Calcul d'intégrales à l'aide de primitives : si $F$ est une primitive de $f$, alors $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$

- [SF] `TCOMP-073` Estimer graphiquement ou encadrer une intégrale, une valeur moyenne
- [SF] `TCOMP-074` Calculer une intégrale
- [SF] `TCOMP-075` Calculer une valeur moyenne
- [SF] `TCOMP-076` Calculer l'aire sous une courbe
- [SF] `TCOMP-077` Calculer l'aire entre deux courbes
- [SF] `TCOMP-078` Interpréter une intégrale, une valeur moyenne dans un contexte issu d'une autre discipline

- [D] `TCOMP-079` Dérivée de $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ lorsque $f$ est une fonction continue positive croissante

- [SF+] `TCOMP-080` Méthode des rectangles, des trapèzes
- [SF+] `TCOMP-081` Méthode de Monte-Carlo pour un calcul d'aire

---

## 2. Probabilités et statistique

### 2.1 Lois discrètes

- [C] `TCOMP-082` Loi uniforme sur $\{1, 2, \ldots, n\}$. Espérance
- [C] `TCOMP-083` Épreuve de Bernoulli. Loi de Bernoulli : définition, espérance et écart type
- [C] `TCOMP-084` Schéma de Bernoulli. Représentation par un arbre
- [C] `TCOMP-085` Coefficients binomiaux : définition (nombre de façons d'obtenir $k$ succès dans un schéma de Bernoulli de taille $n$), triangle de Pascal, symétrie
- [C] `TCOMP-086` Variable aléatoire suivant une loi binomiale $\mathcal{B}(n, p)$. Interprétation : nombre de succès dans le schéma de Bernoulli
- [C] `TCOMP-087` Loi binomiale : expression, espérance et écart type (admis)
- [C] `TCOMP-088` Loi binomiale : représentation graphique
- [C] `TCOMP-089` Loi géométrique : définition, expression, espérance (admise), représentation graphique
- [C] `TCOMP-090` Loi géométrique : propriété caractéristique (loi sans mémoire)

- [SF] `TCOMP-091` Identifier des situations où une variable aléatoire suit une loi de Bernoulli, une loi binomiale ou une loi géométrique
- [SF] `TCOMP-092` Déterminer des coefficients binomiaux à l'aide du triangle de Pascal
- [SF] `TCOMP-093` Dans le cas où $X$ suit une loi binomiale, calculer à l'aide d'une calculatrice ou d'un logiciel les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$, etc.
- [SF] `TCOMP-094` Calculer explicitement les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$ pour une variable aléatoire $X$ suivant une loi géométrique
- [SF] `TCOMP-095` Dans le cas où $X$ suit une loi binomiale, déterminer un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$
- [SF] `TCOMP-096` Dans le cadre de la résolution de problème, utiliser l'espérance des lois précédentes (uniforme, de Bernoulli, binomiale, géométrique)
- [SF] `TCOMP-097` Utiliser en situation la caractérisation d'une loi géométrique par l'absence de mémoire
- [SF] `TCOMP-098` Calculer des probabilités dans des situations faisant intervenir des probabilités conditionnelles
- [SF] `TCOMP-099` Calculer des probabilités dans des situations faisant intervenir des répétitions d'expériences aléatoires

- [D] `TCOMP-100` Espérance et écart type d'une variable aléatoire suivant une loi de Bernoulli
- [D] `TCOMP-101` Espérance d'une variable aléatoire uniforme sur $\{1, 2, \ldots, n\}$
- [D] `TCOMP-102` Espérance d'une variable aléatoire suivant une loi binomiale ($n \leqslant 3$)
- [D] `TCOMP-103` Caractérisation d'une loi géométrique par l'absence de mémoire

### 2.2 Lois à densité

- [C] `TCOMP-104` Notion de loi à densité à partir d'exemples. Représentation d'une probabilité comme une aire
- [C] `TCOMP-105` Fonction de répartition $x \mapsto P(X \leqslant x)$
- [C] `TCOMP-106` Espérance et variance d'une loi à densité, expressions sous forme d'intégrales
- [C] `TCOMP-107` Loi uniforme sur $[0, 1]$ puis sur $[a, b]$. Fonction de densité, fonction de répartition. Espérance et variance
- [C] `TCOMP-108` Loi exponentielle. Fonction densité, fonction de répartition. Espérance, propriété d'absence de mémoire

- [SF] `TCOMP-109` Déterminer si une fonction est une densité de probabilité
- [SF] `TCOMP-110` Calculer des probabilités pour une variable aléatoire à densité
- [SF] `TCOMP-111` Calculer l'espérance d'une variable aléatoire à densité

- [SF+] `TCOMP-112` Simulation d'une variable de Bernoulli ou d'un lancer de dé (ou d'une variable uniforme sur un ensemble fini) à partir d'une variable aléatoire de loi uniforme sur $[0, 1]$
- [SF+] `TCOMP-113` Simulation du comportement de la somme de $n$ variables aléatoires indépendantes et de même loi

### 2.3 Statistique à deux variables quantitatives

> L'étude de séries statistiques à deux variables permet de conjecturer des relations, affines ou exponentielles par exemple, entre deux quantités physiques, biologiques ou autres. Le BO intitule ici « Capacités » la rubrique des capacités attendues.

- [C] `TCOMP-114` Nuage de points. Point moyen
- [C] `TCOMP-115` Ajustement affine. Droite des moindres carrés
- [C] `TCOMP-116` Coefficient de corrélation
- [C] `TCOMP-117` Ajustement se ramenant par changement de variable à un ajustement affine
- [C] `TCOMP-118` Application des ajustements à des interpolations ou extrapolations

- [SF] `TCOMP-119` Représenter un nuage de points
- [SF] `TCOMP-120` Calculer les coordonnées d'un point moyen
- [SF] `TCOMP-121` Déterminer une droite de régression, à l'aide de la calculatrice, d'un logiciel ou par calcul
- [SF] `TCOMP-122` Dans le cadre d'une résolution de problème, utiliser un ajustement pour interpoler, extrapoler

- [D] `TCOMP-123` Droite des moindres carrés (démonstration)

---

## 3. Vocabulaire ensembliste et logique

> Le BO rédige cette partie en prose continue, sans rubriques. Le découpage en points est donc **interprétatif** — écart assumé, identique à celui de 2de, de 1ʳᵉ spé et de terminale spé.

### 3.1 Ensembles

- [C] `TCOMP-124` Notions d'élément d'un ensemble, de sous-ensemble, d'appartenance et d'inclusion, de réunion, d'intersection et de complémentaire
- [C] `TCOMP-125` Symboles de base correspondants : $\in$, $\subset$, $\cap$, $\cup$
- [C] `TCOMP-126` Notation des ensembles de nombres et des intervalles
- [C] `TCOMP-127` Notion de couple
- [C] `TCOMP-128` Notation du complémentaire d'un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$
- [C] `TCOMP-129` Symbole de somme $\sum$ pour écrire concisément certaines expressions (son emploi comme outil de calcul n'est pas un objectif du programme)

### 3.2 Logique et raisonnement

- [SF] `TCOMP-130` Reconnaître ce qu'est une proposition mathématique
- [SF] `TCOMP-131` Utiliser des variables pour écrire des propositions mathématiques
- [SF] `TCOMP-132` Lire et écrire des propositions contenant les connecteurs « et », « ou »
- [SF] `TCOMP-133` Formuler la négation de propositions simples (sans implication ni quantificateurs)
- [SF] `TCOMP-134` Mobiliser un contre-exemple pour montrer qu'une proposition est fausse
- [SF] `TCOMP-135` Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple
- [SF] `TCOMP-136` Formuler la réciproque d'une implication
- [SF] `TCOMP-137` Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ ne sont pas exigibles)

---

## Récapitulatif

| #   | Thème                              | Objectifs | `[C]`  | `[SF]` | `[D]`  | `[SF+]` | Total   |
| --- | ---------------------------------- | --------- | ------ | ------ | ------ | ------- | ------- |
| 1   | Analyse                            | 5         | 32     | 30     | 9      | 10      | 81      |
| 2   | Probabilités et statistique        | 3         | 19     | 16     | 5      | 2       | 42      |
| 3   | Vocabulaire ensembliste et logique | 2         | 6      | 8      | 0      | 0       | 14      |
|     | **Total**                          | **10**    | **57** | **54** | **14** | **12**  | **137** |

> Chiffres **comptés dans le fichier** et confirmés par le générateur
> (`3 thèmes · 10 objectifs · 137 points`), pas estimés.
>
> Les **12 `[SF+]`** portent `exigence = approfondissement` ; les **125 autres** `attendu`. `regime_acquisition = diversite` partout au seed.
