# Programme de suivi seconde générale et technologique — Thème → Objectif → Point (à relire)

> **But** : **amorçage** du référentiel de programme (tables `curriculum_*`), grade `'2'`.
> ⚠️ **Ce fichier ne fait plus foi une fois le niveau amorcé** : la page **Programme** (`/dashboard/teacher/programme`) prend le relais. Le corriger ici ne produit plus rien — cf. le référentiel de 1ʳᵉ, même règle.
> **Source** : « Programme de mathématiques de la classe de seconde générale et technologique » — PDF fourni par David le 2026-08-31.
>
> **Statut** : rédaction complète, **en attente de relecture David**.
>
> L'ordre suit celui du sommaire du BO. La partie **« Automatismes »** n'y figure pas, comme en 1ʳᵉ : ses points sont des acquis du collège que le programme demande d'entretenir, ils vivront dans l'arbre du niveau où ils sont introduits (décision 12).

---

## Convention de tags

Identique à celle de 1ʳᵉ spé — les tags encodent les rubriques du BO, on ne les invente pas.

| Tag     | `kind`          | `exigence`          | Rubrique du BO                                                |
| ------- | --------------- | ------------------- | ------------------------------------------------------------- |
| `[C]`   | `connaissance`  | `attendu`           | **Contenus**                                                  |
| `[SF]`  | `savoir_faire`  | `attendu`           | **Capacités attendues**                                       |
| `[D]`   | `demonstration` | `attendu`           | **Démonstrations**                                            |
| `[SF+]` | `savoir_faire`  | `approfondissement` | **Approfondissements possibles** et **Exemples d'algorithme** |

### Écriture des mathématiques

LaTeX entre `$…$`, rendu par MathLive. Trois règles :

- **Seules les commandes connues de MathLive.** Le générateur refuse le fichier sinon, en nommant les points fautifs — une commande inconnue s'afficherait en clair à l'élève. Notamment `\ldots` ou `\cdots`, jamais `\dots` ; `\vec{AB}` et non `\overrightarrow{AB}`.
- **Jamais deux formules collées** : `$x$$y$` est ambigu pour le parser ubumark.
- **Pas de maths d'affichage** (`$$…$$`) : un point est une ligne, pas un paragraphe.

Les backticks sont réservés au **code** du point.

### Grain de suivi

Quand une puce du BO enchaîne deux gestes qu'un élève peut réussir séparément, elle est **coupée** — convention établie par la relecture de 1ʳᵉ spé du 2026-08-30. « Calculer la distance entre deux points. Calculer les coordonnées du milieu d'un segment. » en fait deux.

---

## 1. Vocabulaire ensembliste et logique

> Le BO rédige cette partie en prose continue, sans rubriques. Le découpage en points est donc **interprétatif** — écart assumé, identique à celui de 1ʳᵉ spé.

### 1.1 Ensembles

- [C] `2-001` Notions d'élément d'un ensemble, de sous-ensemble, d'ensemble vide, d'appartenance et d'inclusion, de réunion, d'intersection et de complémentaire
- [C] `2-002` Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\ldots\,\}$
- [C] `2-003` Notation des ensembles de nombres et des intervalles
- [C] `2-004` Notion de couple et de produit cartésien de deux ensembles
- [C] `2-005` Notation du complémentaire d'un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$
- [C] `2-006` Notation $\operatorname{Card}(A)$ pour le cardinal d'un ensemble fini

### 1.2 Logique et raisonnement

- [SF] `2-007` Reconnaitre ce qu'est une proposition mathématique
- [SF] `2-008` Utiliser des variables pour écrire des propositions mathématiques
- [SF] `2-009` Lire et écrire des propositions contenant les connecteurs « et », « ou »
- [SF] `2-010` Formuler la négation de propositions simples (sans implication ni quantificateurs)
- [SF] `2-011` Mobiliser un contre-exemple pour montrer qu'une proposition est fausse
- [SF] `2-012` Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple
- [SF] `2-013` Formuler la réciproque d'une implication, la contraposée
- [SF] `2-014` Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ sont hors programme)
- [SF] `2-015` Produire un raisonnement par disjonction des cas
- [SF] `2-016` Produire un raisonnement par l'absurde

---

## 2. Algorithmique et programmation

### 2.1 Variables et instructions élémentaires

- [C] `2-017` Variables informatiques de type entier, booléen, flottant, chaine de caractères
- [C] `2-018` Affectation (notée $\leftarrow$ en langage naturel)
- [C] `2-019` Séquence d'instructions
- [C] `2-020` Instruction conditionnelle
- [C] `2-021` Boucle bornée (`for`), boucle non bornée (`while`)

- [SF] `2-022` Choisir ou déterminer le type d'une variable (entier, flottant ou chaine de caractères)
- [SF] `2-023` Concevoir et écrire une instruction d'affectation, une séquence d'instructions, une instruction conditionnelle
- [SF] `2-024` Écrire une formule permettant un calcul combinant des variables
- [SF] `2-025` Programmer, dans des cas simples, une boucle bornée, une boucle non bornée
- [SF] `2-026` Dans des cas plus complexes : lire, comprendre, modifier ou compléter un algorithme ou un programme

### 2.2 Notion de fonction

- [C] `2-027` Fonctions à un ou plusieurs arguments
- [C] `2-028` Fonction renvoyant un nombre aléatoire ; série statistique obtenue par la répétition de l'appel d'une telle fonction

- [SF] `2-029` Écrire des fonctions simples ; appeler une fonction
- [SF] `2-030` Lire, comprendre, modifier, compléter des fonctions plus complexes
- [SF] `2-031` Lire et comprendre une fonction renvoyant une moyenne, un écart type (aucune connaissance sur les listes n'est exigée)
- [SF] `2-032` Écrire des fonctions renvoyant le résultat numérique d'une expérience aléatoire, d'une répétition d'expériences aléatoires indépendantes

---

## 3. Nombres et calculs, algèbre

### 3.1 Arithmétique

- [C] `2-033` Notations $\mathbb{N}$ et $\mathbb{Z}$
- [C] `2-034` Définition des notions de multiple, de diviseur, de nombre pair, de nombre impair : $a$ est multiple de $b$ s'il existe un entier $k$ tel que $a = kb$

- [SF] `2-035` Modéliser et résoudre des problèmes mobilisant les notions de multiple, de diviseur, de nombre pair, de nombre impair
- [SF] `2-036` Présenter les fractions sous forme irréductible

- [D] `2-037` Pour une valeur numérique de $a$, la somme de deux multiples de $a$ est multiple de $a$
- [D] `2-038` Le carré d'un nombre impair est impair

- [SF+] `2-039` Déterminer si un entier naturel $a$ est multiple d'un entier naturel $b$
- [SF+] `2-040` Pour des entiers $a$ et $b$ donnés, déterminer le plus grand multiple de $a$ inférieur ou égal à $b$

### 3.2 Nombres réels

- [C] `2-041` Ensemble $\mathbb{R}$ des nombres réels, droite numérique
- [C] `2-042` Intervalles de $\mathbb{R}$ ; représentation graphique, notations du type $[a\,;\,+\infty[$, $]-\infty\,;\,a]$, $[a\,;\,b]$
- [C] `2-043` Notation en valeur absolue $|a|$ pour la distance de $a$ à $0$ ; distance entre deux nombres réels
- [C] `2-044` Inéquation du type $|x - a| \leqslant r$ ; représentation graphique des solutions, intervalle $[a - r\,;\,a + r]$
- [C] `2-045` Ensemble $\mathbb{D}$ des nombres décimaux ; encadrement décimal d'un nombre réel à $10^{-n}$ près
- [C] `2-046` Ensemble $\mathbb{Q}$ des nombres rationnels ; nombres irrationnels, exemples fournis par la géométrie comme $\sqrt{2}$ et $\pi$

- [SF] `2-047` Lire l'abscisse d'un nombre réel sur une droite graduée
- [SF] `2-048` Placer un nombre réel d'abscisse donnée sur une droite graduée
- [SF] `2-049` Représenter un intervalle de la droite numérique
- [SF] `2-050` Déterminer si un nombre réel appartient à un intervalle donné
- [SF] `2-051` Donner un encadrement, d'amplitude donnée, d'un nombre réel par des décimaux
- [SF] `2-052` Dans le cadre de la résolution de problèmes, arrondir en donnant le nombre de chiffres significatifs adapté à la situation étudiée

- [D] `2-053` Le nombre rationnel $\tfrac{1}{3}$ n'est pas décimal
- [D] `2-054` Le nombre réel $\sqrt{2}$ est irrationnel
- [D] `2-055` Déterminer par balayage un encadrement de $\sqrt{2}$ d'amplitude inférieure ou égale à $10^{-n}$

- [SF+] `2-056` Développement décimal illimité d'un nombre réel
- [SF+] `2-057` Observation, sur des exemples, de la périodicité du développement décimal de nombres rationnels

### 3.3 Algèbre

- [C] `2-058` Règles de calcul sur les puissances entières relatives
- [C] `2-059` Règles de calcul sur les racines carrées ; relation $\sqrt{a^2} = |a|$
- [C] `2-060` Exemples simples de calcul sur des expressions algébriques, en particulier sur des expressions fractionnaires
- [C] `2-061` Somme d'inégalités ; produit d'une inégalité par un réel positif, négatif, en liaison avec le sens de variation d'une fonction affine
- [C] `2-062` Comparaison additive (par différence), comparaison multiplicative (par rapport, pour deux nombres strictement positifs)
- [C] `2-063` Ensemble des solutions des équations du type $ax + b = 0$ et des inéquations de la forme $ax + b > 0$
- [C] `2-064` Équation de la forme $A(x)B(x) = 0$ (équation produit nul)
- [C] `2-065` En liaison avec la section « Fonctions », étude du signe des expressions de la forme $A(x)B(x)$ et $\tfrac{A(x)}{B(x)}$
- [C] `2-066` Équation $\tfrac{A(x)}{B(x)} = k$ (équation quotient), en lien avec l'ensemble de définition d'une expression

- [SF] `2-067` Effectuer des calculs numériques ou littéraux mettant en jeu des puissances, des racines carrées, des écritures fractionnaires
- [SF] `2-068` Sur des cas simples de relations entre variables ($U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres
- [SF] `2-069` Exprimer une variable en fonction de l'autre dans une relation du premier degré $ax + by = c$
- [SF] `2-070` Choisir la forme la plus adaptée (factorisée, développée réduite) d'une expression en vue de la résolution d'un problème
- [SF] `2-071` Comparer deux quantités en utilisant leur différence, ou leur rapport (ratio) dans le cas de quantités positives
- [SF] `2-072` Interpréter, selon le contexte, cette comparaison en termes de variation additive ou multiplicative
- [SF] `2-073` Modéliser un problème par une inéquation
- [SF] `2-074` Donner l'ensemble des solutions d'une équation du premier degré du type $ax = b$, $a + x = b$, $ax + b = cx + d$
- [SF] `2-075` Donner l'ensemble des solutions d'une inéquation du premier degré du type $ax \geqslant b$, $a + x \geqslant b$, $ax + b \geqslant cx + d$
- [SF] `2-076` Donner l'ensemble des solutions d'une équation du type $x^2 = a$

- [D] `2-077` Quels que soient les réels positifs $a$ et $b$, on a $\sqrt{ab} = \sqrt{a}\,\sqrt{b}$
- [D] `2-078` Déterminer la première puissance d'un nombre positif donné supérieure ou inférieure à une valeur donnée

- [SF+] `2-079` Développement de $(a + b + c)^2$
- [SF+] `2-080` Développement de $(a + b)^3$
- [SF+] `2-081` Inégalité entre moyennes géométrique et arithmétique de deux réels strictement positifs

---

## 4. Géométrie

### 4.1 Vecteurs et problèmes de géométrie

- [C] `2-082` Égalité de deux vecteurs ; notation $\vec{u}$ ; vecteur nul
- [C] `2-083` Représentants d'un vecteur
- [C] `2-084` Produit d'un vecteur par un nombre réel
- [C] `2-085` Colinéarité de deux vecteurs
- [C] `2-086` Représentation d'un vecteur comme combinaison de deux vecteurs non colinéaires
- [C] `2-087` Base orthonormée ; coordonnées d'un vecteur
- [C] `2-088` Expression de la norme d'un vecteur
- [C] `2-089` Expression des coordonnées de $\vec{AB}$ en fonction de celles de $A$ et de $B$
- [C] `2-090` Déterminant de deux vecteurs dans une base orthonormée, critère de colinéarité ; application à l'alignement, au parallélisme
- [C] `2-091` Caractérisation vectorielle du milieu d'un segment

- [SF] `2-092` Représenter la somme de deux vecteurs à partir de représentants de même origine
- [SF] `2-093` Représenter un vecteur dont on connait les coordonnées
- [SF] `2-094` Lire les coordonnées d'un vecteur
- [SF] `2-095` Calculer les coordonnées d'une somme de vecteurs, d'un produit d'un vecteur par un nombre réel
- [SF] `2-096` Calculer la distance entre deux points
- [SF] `2-097` Calculer les coordonnées du milieu d'un segment
- [SF] `2-098` Caractériser alignement et parallélisme par la colinéarité de vecteurs
- [SF] `2-099` Résoudre des problèmes en utilisant la représentation la plus adaptée des vecteurs
- [SF] `2-100` Résoudre des problèmes avec des méthodes diverses (méthodes vectorielles, repérées ou non, méthodes géométriques)

- [D] `2-101` Caractérisations de la colinéarité de deux vecteurs non nuls : nullité du déterminant ; proportionnalité des coordonnées

- [SF+] `2-102` Barycentre de deux ou trois points
- [SF+] `2-103` Formule permettant le calcul des coordonnées du milieu d'un segment
- [SF+] `2-104` Démontrer que les hauteurs d'un triangle sont concourantes
- [SF+] `2-105` Expression de l'aire d'un triangle : $\tfrac{1}{2}ab\sin C$
- [SF+] `2-106` Démontrer que l'isobarycentre de trois points non alignés est l'intersection des médianes
- [SF+] `2-107` Démontrer que le point de concours des médiatrices est le centre du cercle circonscrit

### 4.2 Droites du plan

- [C] `2-108` Vecteur directeur d'une droite
- [C] `2-109` Équation de droite : équation cartésienne, équation réduite
- [C] `2-110` Pente (ou coefficient directeur) d'une droite non parallèle à l'axe des ordonnées

- [SF] `2-111` Déterminer une équation de droite à partir de deux points, d'un point et un vecteur directeur, ou d'un point et la pente
- [SF] `2-112` Déterminer la pente ou un vecteur directeur d'une droite donnée par une équation ou une représentation graphique
- [SF] `2-113` Tracer une droite connaissant son équation cartésienne ou réduite
- [SF] `2-114` Établir que trois points sont alignés ou non
- [SF] `2-115` Déterminer si deux droites sont parallèles ou sécantes
- [SF] `2-116` Déterminer le point d'intersection de deux droites sécantes données par leur équation réduite

- [D] `2-117` En utilisant le déterminant, établir la forme générale d'une équation de droite

- [SF+] `2-118` Étudier l'alignement de trois points dans le plan
- [SF+] `2-119` Déterminer une équation de droite passant par deux points donnés
- [SF+] `2-120` Ensemble des points équidistants d'un point et de l'axe des abscisses
- [SF+] `2-121` Représentation, sur des exemples, de parties du plan décrites par des inégalités sur les coordonnées

---

## 5. Fonctions

### 5.1 Représentation algébrique et graphique des fonctions

- [C] `2-122` Fonction à valeurs réelles définie sur un intervalle ou une réunion finie d'intervalles de $\mathbb{R}$
- [C] `2-123` Recherche de domaine d'étude (ensemble de définition)
- [C] `2-124` Courbe représentative : la courbe d'équation $y = f(x)$ est l'ensemble des points du plan dont les coordonnées $(x\,;\,y)$ vérifient $y = f(x)$
- [C] `2-125` Signe d'une fonction affine et des fonctions de référence
- [C] `2-126` Tableau de signes pour une fonction produit ou quotient

- [SF] `2-127` Exploiter l'équation $y = f(x)$ d'une courbe : appartenance, calcul de coordonnées
- [SF] `2-128` Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne
- [SF] `2-129` Fonctions valeur absolue, carré, inverse : définitions et courbes représentatives
- [SF] `2-130` Résoudre une équation ou une inéquation du type $f(x) = k$, $f(x) < k$, en choisissant une méthode adaptée : graphique, algébrique, logicielle
- [SF] `2-131` Résoudre une équation ou une inéquation de la forme $f(x) = 0$, $f(x) > 0$ à l'aide d'un tableau de signes, lorsque $f$ est un produit ou un quotient
- [SF] `2-132` Résoudre, graphiquement ou à l'aide d'un outil numérique, une équation ou inéquation du type $f(x) = g(x)$, $f(x) < g(x)$
- [SF] `2-133` Pour les fonctions affines, valeur absolue, carré, inverse, racine carrée et cube, résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$

### 5.2 Variations et extrémums d'une fonction

- [C] `2-134` Croissance, décroissance, monotonie d'une fonction définie sur un intervalle ; tableau de variations
- [C] `2-135` Maximum, minimum d'une fonction sur un intervalle
- [C] `2-136` Pour une fonction affine donnée par $f(x) = mx + p$, interprétation de $m$ comme taux d'accroissement et de $p$ comme ordonnée à l'origine
- [C] `2-137` Variations d'une fonction affine selon le signe du coefficient directeur

- [SF] `2-138` Relier représentation graphique et tableau de variations
- [SF] `2-139` Déterminer graphiquement les extrémums d'une fonction sur un intervalle
- [SF] `2-140` Exploiter un logiciel de géométrie dynamique ou de calcul formel, la calculatrice ou Python pour décrire les variations d'une fonction donnée par une formule
- [SF] `2-141` Pour une fonction affine, relier sens de variation, signe de la fonction et droite représentative
- [SF] `2-142` Traiter des problèmes d'optimisation
- [SF] `2-143` Fonctions valeur absolue, carré : signe et variations
- [SF] `2-144` Pour deux nombres $a$ et $b$ donnés et une fonction de référence $f$, comparer $f(a)$ et $f(b)$ numériquement ou graphiquement

- [D] `2-145` Variations des fonctions affines
- [D] `2-146` Position relative des courbes d'équation $y = x$ et $y = x^2$, pour $x \geqslant 0$
- [D] `2-147` Variations des fonctions carré, inverse

- [SF+] `2-148` Pour une fonction dont le tableau de variations est donné, algorithmes d'approximation numérique d'un extrémum (balayage, dichotomie)
- [SF+] `2-149` Algorithme de calcul approché de longueur d'une portion de courbe représentative de fonction
- [SF+] `2-150` Relier les courbes représentatives de la fonction racine carrée et de la fonction carré sur $\mathbb{R}^+$

---

## 6. Statistiques et probabilités

### 6.1 Information chiffrée et statistique descriptive

- [C] `2-151` Ensembles de référence inclus les uns dans les autres : pourcentage de pourcentage
- [C] `2-152` Évolution : variation absolue (variation additive) $V_2 - V_1$
- [C] `2-153` Évolution : coefficient multiplicateur (variation multiplicative) $\tfrac{V_2}{V_1}$
- [C] `2-154` Évolution : variation relative (taux d'évolution) $\tfrac{V_2 - V_1}{V_1}$
- [C] `2-155` Évolutions successives, évolution réciproque : relation sur les coefficients multiplicateurs (produit, inverse)
- [C] `2-156` Linéarité de la moyenne
- [C] `2-157` Indicateurs de dispersion : écart type
- [C] `2-158` Influence sur la moyenne, la médiane, de l'ajout ou de la suppression d'une valeur dans la série
- [C] `2-159` Représentation graphique : histogramme, polygone des fréquences cumulées
- [C] `2-160` Calcul de la moyenne à partir de la moyenne et des effectifs de chaque classe (moyenne pondérée) ; cas particulier où la répartition est uniforme dans chaque classe
- [C] `2-161` Détermination de la classe médiane à partir des effectifs des classes ; estimation de la médiane dans le cas de répartition uniforme dans la classe médiane

- [SF] `2-162` Exploiter la relation entre effectifs, proportions et pourcentages
- [SF] `2-163` Traiter des situations simples mettant en jeu des pourcentages de pourcentages
- [SF] `2-164` Exploiter la relation entre deux valeurs successives et leur taux d'évolution
- [SF] `2-165` Calculer le taux d'évolution global à partir des taux d'évolution successifs
- [SF] `2-166` Calculer un taux d'évolution réciproque
- [SF] `2-167` Pour une série regroupée en classes, calculer la moyenne à partir de la moyenne et des effectifs de chaque classe
- [SF] `2-168` Pour une série regroupée en classes, déterminer la classe médiane et estimer la médiane dans le cas d'une répartition uniforme
- [SF] `2-169` Décrire les différences entre deux séries statistiques, en s'appuyant sur des indicateurs ou couples d'indicateurs (moyenne–écart type, médiane–écart interquartile) ou sur des représentations graphiques données

### 6.2 Croisement de deux variables qualitatives

- [C] `2-170` Tableau croisé d'effectifs
- [C] `2-171` Fréquence conditionnelle, fréquence marginale

- [SF] `2-172` Calculer des fréquences conditionnelles et des fréquences marginales
- [SF] `2-173` Compléter un tableau croisé par des raisonnements sur les effectifs ou en utilisant des fréquences conditionnelles

- [SF+] `2-174` À partir de deux listes représentant deux caractères d'individus, déterminer un sous-ensemble d'individus répondant à un critère (filtre, utilisation de ET, OU, NON)
- [SF+] `2-175` Dresser le tableau croisé de deux variables qualitatives à partir du fichier des individus et calculer des fréquences conditionnelles ou marginales

### 6.3 Probabilités

- [C] `2-176` Version vulgarisée de la loi des grands nombres : lorsque $n$ est grand, sauf exception, la fréquence observée est proche de la probabilité
- [C] `2-177` Probabilité conditionnelle d'un évènement $B$ sachant un évènement $A$ de probabilité non nulle ; notation $P_A(B)$
- [C] `2-178` Arbres de probabilité, application au calcul de probabilités

- [SF] `2-179` Observer la loi des grands nombres à l'aide d'une simulation sur Python ou tableur
- [SF] `2-180` Construire un arbre pondéré ou un tableau en lien avec une situation donnée
- [SF] `2-181` Passer du registre de la langue naturelle au registre symbolique et inversement
- [SF] `2-182` Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme de tableau croisé d'effectifs ou d'arbre de probabilité
- [SF] `2-183` Interpréter les pondérations de chaque branche d'un arbre en termes de probabilités, et notamment de probabilités conditionnelles
- [SF] `2-184` Faire le lien entre la définition des probabilités conditionnelles et la multiplication des probabilités des branches du chemin correspondant
- [SF] `2-185` Distinguer en situation $P_A(B)$ et $P_B(A)$, par exemple dans des situations de type « faux positifs »

---

## Récapitulatif

| Thème                                 | Objectifs | Points |
| ------------------------------------- | --------- | ------ |
| 1. Vocabulaire ensembliste et logique | 2         |        |
| 2. Algorithmique et programmation     | 2         |        |
| 3. Nombres et calculs, algèbre        | 3         |        |
| 4. Géométrie                          | 2         |        |
| 5. Fonctions                          | 2         |        |
| 6. Statistiques et probabilités       | 3         |        |

Les comptes sont vérifiés par le test d'intégration `curriculum-seed.test.ts`, pas recopiés à la main.
