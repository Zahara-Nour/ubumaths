# Lot 0c — définitions à reprendre

**Validé par David le 2026-10-09** sur la page à cocher : 115 « OK », « inconnue » corrigée par lui (sa version ci-dessous).

Relecture : [relecture-bo.md](relecture-bo.md). Chaque entrée remplace **toutes** les définitions du terme. Validation par David sur la page à cocher (lien dans [lexique-progress.md](../lexique-progress.md)). Données machine-lisibles : [lot0c-decisions.json](lot0c-decisions.json). Les homonymes qui demandent une entrée séparée (cube solide, série statistique, degré d'angle…) relèvent du lot 0d.

## Définitions fausses (16)

### nombre relatif — 5e

Réduisait les relatifs à ℤ, alors que la 5e travaille les décimaux relatifs ; « muni d'un signe » oubliait 0. Le synonyme « entier relatif » est retiré.

- Synonyme retiré : entier relatif
- **Avant** : 5e : Nombre muni d'un signe ($+$ ou $-$). L'ensemble des relatifs est $\mathbb{Z} = \{\ldots, -2, -1, 0, 1, 2, \ldots\}$.
- **Proposé** : 5e : Nombre positif (comme $3$ ou $+2{,}5$), négatif (comme $-4$ ou $-0{,}7$) ou nul ($0$). Avec eux, toutes les soustractions sont possibles : $3 - 5 = -2$.

### inconnue — CM1

L'exemple disait « l'inconnue est x = 2 », confondant l'inconnue (x) et la solution (2).

- **Avant** : CM1 : Nombre qu'on ne connaît pas encore et qu'on cherche. On peut le représenter par un symbole ($\square$, $?$) ou par une lettre. · 5e : Valeur à trouver dans une équation. Souvent notée $x$. Ex : dans $2x + 3 = 7$, l'inconnue est $x = 2$.
- **Proposé** : CM1 : Nombre qu'on ne connaît pas encore et qu'on cherche. On peut le représenter par un symbole ($\square$, $?$) ou par une lettre. · 5e : Nombre que l'on cherche dans une équation, désigné par une lettre : dans $5x + 3 = 13$, l'inconnue est $x$ ; $2$ est la solution car $5 \times 2 + 3 = 13$. _(Version de David.)_

### surface — CM1

« Synonyme d'aire » contredit le BO, qui distingue la surface (l'objet) de son aire (sa mesure).

- **Avant** : CM1 : Étendue d'une figure plane. Synonyme d'aire.
- **Proposé** : CM1 : Partie du plan délimitée par une figure, ou bord extérieur d'un solide. Son aire est la mesure de son étendue : on compare des surfaces selon leur aire.

### proportion — 6e

« Égalité de deux rapports » est un sens ancien ; le BO dit « rapport entre une partie et le tout ».

- **Avant** : 6e : Égalité de deux rapports. Ex : $\frac{a}{b} = \frac{c}{d}$.
- **Proposé** : 6e : Part que représente une partie dans le tout : $3$ élèves sur $12$, c'est une proportion de $\frac{3}{12} = \frac{1}{4}$, soit $25\,\%$.

### exposant — 4e

« Combien de fois la base est multipliée par elle-même » est faux d'une unité : $2^3 = 2 \times 2 \times 2$ compte trois facteurs mais deux multiplications.

- **Avant** : 4e : Nombre indiquant combien de fois la base est multipliée par elle-même. Dans $a^n$, $n$ est l'exposant.
- **Proposé** : 4e : Dans $a^n$, l'exposant $n$ est le nombre de facteurs égaux à $a$ : $2^3 = 2 \times 2 \times 2$ a trois facteurs.

### ordonnée à l'origine — 2de

Confondait le nombre $b$ et le point $(0 ; b)$.

- **Avant** : 2de : Valeur $f(0)$, le point où la courbe coupe l'axe des ordonnées. Pour $f(x) = ax + b$, c'est $b$.
- **Proposé** : 2de : Pour une fonction affine $x \mapsto ax + b$, c'est le nombre $b = f(0)$ : la droite qui la représente coupe l'axe des ordonnées au point d'ordonnée $b$.

### extremum — 2de

« En un extremum, f′(a) = 0 » est faux à une borne de l'intervalle ou là où la fonction n'est pas dérivable ; « local » ne correspond pas au BO de 2de.

- **Avant** : 2de : Maximum ou minimum local d'une fonction. En un extremum, $f'(a) = 0$.
- **Proposé** : 2de : Le plus grand (maximum) ou le plus petit (minimum) des nombres $f(x)$ quand $x$ parcourt un intervalle.

### exponentielle — 1re spé

« Seule fonction égale à sa propre dérivée » est faux sans $f(0) = 1$ ; l'entrée doublait « fonction exponentielle ». Elle devient un renvoi vers celle-ci.

- Renvoi : aucun → fonction exponentielle
- **Avant** : 1re spé : Fonction $f(x) = e^x$. Seule fonction égale à sa propre dérivée.
- **Proposé** : — (renvoi)

### combinaison — Tle spé

Confondait la combinaison (une partie à k éléments) et leur nombre $\binom{n}{k}$.

- **Avant** : Tle spé : Nombre de façons de choisir $k$ éléments parmi $n$ : $\binom{n}{k}$.
- **Proposé** : Tle spé : Une combinaison de $k$ éléments d'un ensemble $E$ à $n$ éléments est une partie de $E$ à $k$ éléments (l'ordre ne compte pas). Il y en a $\binom{n}{k}$.

### norme — 2de

La formule $\sqrt{x^2 + y^2}$ n'est vraie qu'en base orthonormée, condition que pose le BO.

- **Avant** : 2de : Longueur d'un vecteur. $\|\vec{u}\| = \sqrt{x^2 + y^2}$.
- **Proposé** : 2de : Longueur d'un vecteur : la norme de $\overrightarrow{AB}$ est la distance $AB$. Dans une base orthonormée, si $\vec{u}$ a pour coordonnées $(x ; y)$, sa norme est $\sqrt{x^2 + y^2}$.

### concave — Tle spé

« Courbe qui présente un creux » dit l'inverse pour une fonction : la courbe de $x \mapsto -x^2$, concave, a la forme d'un dôme.

- **Avant** : Tle spé : Se dit d'une figure ou d'une courbe qui présente un creux.
- **Proposé** : Tle spé : Une fonction $f$ est concave sur un intervalle $I$ si sa courbe y est située au-dessus de chacune de ses sécantes, entre les deux points d'intersection : c'est le cas de $x \mapsto -x^2$, dont la courbe a la forme d'un dôme.

### convexe — Tle spé

« Ne présente pas de creux » dit l'inverse pour une fonction : la courbe de $x \mapsto x^2$, convexe, a la forme d'un creux.

- **Avant** : Tle spé : Se dit d'une figure ou d'une courbe qui ne présente pas de creux. Un segment joignant deux points de la figure reste à l'intérieur.
- **Proposé** : Tle spé : Une fonction $f$ est convexe sur un intervalle $I$ si sa courbe y est située en dessous de chacune de ses sécantes, entre les deux points d'intersection : c'est le cas de $x \mapsto x^2$, dont la courbe a la forme d'un creux.

### propriété — CE1

« Qui a été démontrée » contredit le BO : une propriété peut être admise ou démontrée.

- **Avant** : CE1 : Ce qui est toujours vrai pour une figure ou un nombre. Ex : un carré a toujours ses $4$ côtés de même longueur. · 6e : Caractéristique d'un objet mathématique qui a été démontrée. Ex : la somme des angles d'un triangle vaut $180°$.
- **Proposé** : CE1 : Ce qui est toujours vrai pour une figure ou un nombre. Ex : un carré a toujours ses $4$ côtés de même longueur. · 6e : Énoncé vrai pour tous les objets d'une même sorte, démontré ou admis : « la somme des angles d'un triangle vaut $180°$ » est une propriété des triangles.

### compter — CP

Renvoyait à « calcul » : au CP, compter, c'est réciter la suite des nombres ou dénombrer une collection. L'entrée reçoit sa propre définition.

- Renvoi : calcul → aucun (définition propre)
- **Avant** : —
- **Proposé** : CP : Dire les nombres dans l'ordre : un, deux, trois… Compter des objets, c'est trouver combien il y en a.

### rationnel — 4e

Renvoyait à « nombre relatif ». Le BO de 4e : « Définir la notion de nombre rationnel : le quotient de deux nombres entiers relatifs. » L'entrée reçoit sa propre définition.

- Renvoi : nombre relatif → aucun (définition propre)
- **Avant** : —
- **Proposé** : 4e : Nombre égal au quotient de deux nombres entiers relatifs : $\frac{-3}{4}$, $0{,}5 = \frac{1}{2}$ ou $7 = \frac{7}{1}$.

### irrationnel — 2de

Renvoyait à « nombre relatif ». Le BO de 2de : « Nombres irrationnels ; exemples fournis par la géométrie, par exemple √2 et π ». L'entrée reçoit sa propre définition et passe en 2de.

- Niveau du terme : 3e → 2de
- Renvoi : nombre relatif → aucun (définition propre)
- **Avant** : —
- **Proposé** : 2de : Nombre réel qui ne peut pas s'écrire comme quotient de deux entiers : $\sqrt{2}$ et $\pi$ sont irrationnels.

## Définitions circulaires (11)

### soustraction — CP

Renvoyait à « différence », définie en retour par la soustraction (et « différence » n'arrive qu'au CE2). Le BO : « l'opération inverse de l'addition ».

- **Avant** : CP : Opération qui associe à deux nombres leur différence.
- **Proposé** : CP : Opération qui sert à enlever, à retirer ou à trouver ce qui manque : $56 - 14 = 42$. C'est l'opération inverse de l'addition.

### multiplication — CP

La définition de CE1 renvoyait à « produit », défini en retour par la multiplication.

- **Avant** : CP : Calcul qui permet de compter vite des paquets identiques. Ex : $3$ paquets de $4$ billes, c'est $3$ fois $4$ billes : $4 + 4 + 4 = 12$. · CE1 : Opération qui associe à deux nombres leur produit.
- **Proposé** : CP : Calcul qui permet de compter vite des paquets identiques. Ex : $3$ paquets de $4$ billes, c'est $3$ fois $4$ billes : $4 + 4 + 4 = 12$. · CE1 : Opération qui remplace une addition répétée : $3 \times 20$, c'est $20 + 20 + 20$. Son résultat s'appelle le produit.

### division — CE2

Renvoyait à « quotient », mot absent du cycle 2. Le BO : « l'opération inverse de la multiplication ».

- **Avant** : CE2 : Opération qui associe à deux nombres leur quotient.
- **Proposé** : CE2 : Opération qui sert à partager en parts égales, ou à chercher combien de fois un nombre est contenu dans un autre. C'est l'opération inverse de la multiplication : $7 \times 13 = 91$, donc $91 \div 7 = 13$.

### simplification — 6e

« Action de simplifier » ne disait pas ce qu'on fait.

- **Avant** : 6e : Action de simplifier une fraction ou une expression.
- **Proposé** : 6e : Simplifier une fraction, c'est diviser son numérateur et son dénominateur par un même nombre entier pour obtenir une fraction égale plus simple : $\frac{6}{8} = \frac{3}{4}$. · 5e : Plus généralement, simplifier une écriture, c'est la remplacer par une écriture égale plus simple : $3x + 2x$ devient $5x$.

### distance à zéro — 5e

Renvoyait à « valeur absolue », définie en retour comme la distance à zéro.

- **Avant** : 5e : La distance à zéro d'un nombre est sa valeur absolue.
- **Proposé** : 5e : Écart entre un nombre et $0$ sur une droite graduée, sans tenir compte du signe : la distance à zéro de $-3$ est $3$, comme celle de $3$. On l'appelle aussi valeur absolue.

### coefficient directeur — 2de

Renvoyait à « pente », non définie.

- **Avant** : 2de : Pente d'une droite. Pour $f(x) = ax + b$, le coefficient directeur est $a$.
- **Proposé** : 2de : Pour une fonction affine $x \mapsto ax + b$, c'est le nombre $a$ : quand $x$ augmente de $1$, $f(x)$ augmente de $a$. On l'appelle aussi la pente de la droite.

### tangente — 1re spé

« La même pente que la courbe » suppose le nombre dérivé ; avec « dérivée » et « nombre dérivé », les trois définitions tournaient en rond. Le BO : position limite des sécantes.

- **Avant** : 1re spé : Droite qui touche la courbe en un point et à la même pente que la courbe en ce point.
- **Proposé** : 1re spé : Tangente à la courbe de $f$ au point d'abscisse $a$ : la droite qui passe par ce point et dont le coefficient directeur est le nombre dérivé $f'(a)$. C'est la position limite des sécantes qui passent par ce point.

### nombre dérivé — 1re spé

« Valeur de la dérivée en un point » renverse l'ordre du BO, qui part du taux de variation.

- **Avant** : 1re spé : Valeur de la dérivée en un point : $f'(a)$.
- **Proposé** : 1re spé : Nombre $f'(a)$ dont se rapproche le taux de variation $\frac{f(a+h) - f(a)}{h}$ quand $h$ se rapproche de $0$. C'est le coefficient directeur de la tangente à la courbe au point d'abscisse $a$.

### dérivée — 1re spé

« Taux de variation instantané… pente de la tangente » fermait la boucle avec « tangente » et « nombre dérivé ».

- **Avant** : 1re spé : Fonction $f'$ qui donne le taux de variation instantané de $f$. $f'(a)$ est la pente de la tangente en $a$.
- **Proposé** : 1re spé : Fonction dérivée de $f$ : la fonction $f'$ qui, à chaque nombre $x$ où $f$ est dérivable, associe le nombre dérivé $f'(x)$.

### symétrie axiale — 6e

Définissait la symétrie par « son symétrique », lui-même renvoyé à la symétrie axiale. Le BO de 6e : la médiatrice.

- **Avant** : 6e : Transformation qui associe à un point son symétrique par rapport à un axe.
- **Proposé** : 6e : Le symétrique d'un point $A$ par rapport à une droite $(d)$ est le point $A'$ tel que $(d)$ soit la médiatrice du segment $[AA']$ (ou $A$ lui-même si $A$ est sur $(d)$). La symétrie axiale transforme une figure comme un pliage le long de $(d)$.

### symétrie centrale — 5e

Définissait la symétrie par « son symétrique ». Le BO de 5e : « le demi-tour, ou symétrie centrale ».

- **Avant** : 5e : Transformation qui associe à un point son symétrique par rapport à un centre.
- **Proposé** : 5e : Demi-tour autour d'un point $O$ : l'image d'un point $M$ est le point $M'$ tel que $O$ soit le milieu du segment $[MM']$.

## Sens manquants, trop étroits ou trop larges (54)

### somme — CP

Au CP, l'élève rencontre « somme d'argent » ; le sens « résultat d'une addition » est donné à apprendre au CE2.

- **Avant** : CP : Résultat d'une addition. Ex : la somme de $3$ et $5$ est $8$.
- **Proposé** : CP : Une somme d'argent, c'est ce que valent ensemble des pièces et des billets : un billet de $10$ € et une pièce de $2$ € font une somme de $12$ €. · CE2 : Résultat d'une addition. Ex : la somme de $3$ et $5$ est $8$.

### quotient — 6e

Seul le quotient euclidien était défini, avec une écriture fausse (« 15 ÷ 4 = 3 reste 3 ») ; la 6e exige le quotient exact a/b.

- **Avant** : 6e : Résultat d'une division. Dans $15 \div 4 = 3$ reste $3$, le quotient est $3$.
- **Proposé** : 6e : Résultat exact d'une division : le quotient de $3$ par $4$ est $\frac{3}{4} = 0{,}75$. Dans une division euclidienne, le quotient est le nombre entier trouvé : $15 = 4 \times 3 + 3$ (quotient $3$, reste $3$). · 5e : Le quotient de $a$ par $b$ ($b \neq 0$) est le nombre qui, multiplié par $b$, donne $a$ ; on l'écrit $a \div b$ ou $\frac{a}{b}$ : $3 \times \frac{7}{3} = 7$.

### opérateur — 5e

Le BO emploie le mot pour la fraction qui agit sur une quantité, pas pour les signes + − × ÷.

- **Avant** : 5e : Symbole indiquant une opération ($+$, $-$, $\times$, $\div$).
- **Proposé** : 5e : Ce qui agit sur un nombre pour le transformer : « prendre les $\frac{3}{4}$ de » est un opérateur ; les $\frac{3}{4}$ de $20$, c'est $15$.

### terme — CE2

Le BO de CE2 parle aussi des termes d'une soustraction ; « ou d'une suite » mélangeait l'entrée « terme (suite) ».

- **Avant** : CE2 : Chaque élément d'une somme ou d'une suite. Ex : dans $3 + 5$, les termes sont $3$ et $5$.
- **Proposé** : CE2 : Chacun des nombres d'une addition ou d'une soustraction : $12$ et $25$ sont les termes de l'addition $12 + 25$.

### égalité — CP

« Relation entre deux expressions » n'est pas du CP, et une égalité peut être fausse (BO de 5e : tester si une égalité est vraie ou fausse).

- **Avant** : CP : Relation entre deux expressions ayant la même valeur. Symbole : $=$.
- **Proposé** : CP : Écriture avec le signe $=$ qui dit que deux calculs ou deux nombres valent la même chose : $3 + 2 = 5$. · 5e : Écriture $A = B$ qui affirme que deux expressions ont la même valeur ; elle peut être vraie ou fausse : $2x + 1 = 7$ est vraie pour $x = 3$, fausse pour $x = 4$.

### fraction — CE1

Il manquait le sens que la 6e met au premier plan : la fraction comme quotient. La définition « écriture a/b » est remplacée par celle du BO.

- **Avant** : CE1 : Nombre qui sert à parler de parts égales d'un tout. Ex : $\frac{1}{2}$ (un demi) : on partage en $2$ parts égales et on en prend $1$ ; $\frac{3}{4}$ : on partage en $4$ et on en prend $3$. · 5e : Écriture de la forme $\frac{a}{b}$ où $a$ est le numérateur et $b$ le dénominateur ($b \neq 0$).
- **Proposé** : CE1 : Nombre qui sert à parler de parts égales d'un tout. Ex : $\frac{1}{2}$ (un demi) : on partage en $2$ parts égales et on en prend $1$ ; $\frac{3}{4}$ : on partage en $4$ et on en prend $3$. · 6e : Quotient de deux nombres entiers : $\frac{3}{7}$ est le nombre qui, multiplié par $7$, donne $3$. Une fraction est à la fois ce nombre et son écriture ($3$ est le numérateur, $7$ le dénominateur).

### simplifier une fraction — 4e

« Diviser par un même nombre » admettait 0 ou 0,5.

- **Avant** : 4e : Diviser le numérateur et le dénominateur par un même nombre. Ex : $\frac{6}{8} = \frac{3}{4}$.
- **Proposé** : 4e : Diviser le numérateur et le dénominateur par un même nombre entier, diviseur des deux : $\frac{6}{8} = \frac{3}{4}$.

### expression — 5e

Laissait croire qu'une expression contient des lettres ; la 5e commence par des expressions numériques.

- **Avant** : 5e : Suite de nombres et de lettres reliés par des opérations. Ex : $3x + 2$.
- **Proposé** : 5e : Écriture qui combine des nombres, parfois des lettres, avec des signes d'opérations et des parenthèses : $3 \times (5 + 2)$ ou $3x + 2$.

### variable — 5e

Confondait variable et inconnue, que le BO de 5e distingue ; le sens informatique (4e) manquait.

- **Avant** : 5e : Lettre représentant un nombre inconnu ou pouvant varier. Ex : $x$ dans $2x + 3$.
- **Proposé** : 5e : Lettre qui peut prendre différentes valeurs : dans $2x + 3$, on peut remplacer $x$ par n'importe quel nombre. · 4e : En informatique, une variable est une case de la mémoire qui porte un nom et contient une valeur, qui peut changer pendant le programme.

### factoriser — 5e

Ne couvrait pas la factorisation des entiers (5e : 21 = 3 × 7).

- **Avant** : 5e : Transformer une somme en produit. Ex : $3x + 6 = 3(x + 2)$.
- **Proposé** : 5e : Écrire sous forme d'un produit : une somme, $3x + 6 = 3(x + 2)$, ou un nombre entier, $21 = 3 \times 7$.

### factorisation — 5e

Même limite que « factoriser ».

- **Avant** : 5e : Action de transformer une somme en produit.
- **Proposé** : 5e : Écriture sous forme d'un produit : $3x + 6 = 3(x + 2)$ ou $21 = 3 \times 7$.

### identité remarquable — 3e

« Formule algébrique classique » vaut pour n'importe quelle formule.

- **Avant** : 3e : Formule algébrique classique. Ex : $(a + b)^2 = a^2 + 2ab + b^2$.
- **Proposé** : 3e : Chacune des trois égalités vraies pour tous nombres $a$ et $b$ : $(a+b)^2 = a^2 + 2ab + b^2$, $(a-b)^2 = a^2 - 2ab + b^2$ et $(a-b)(a+b) = a^2 - b^2$.

### coefficient — 5e

« Nombre qui multiplie une variable » ne couvre pas les coefficients d'une fonction affine (3e), où b ne multiplie rien.

- **Avant** : 5e : Nombre qui multiplie une variable. Ex : dans $5x$, le coefficient de $x$ est $5$.
- **Proposé** : 5e : Nombre qui multiplie : dans $5x$, le coefficient de $x$ est $5$. · 3e : Les coefficients de la fonction affine $x \mapsto ax + b$ sont les nombres $a$ et $b$.

### monôme — 1re spé

« Constitué d'un coefficient et de variables » décrit aussi x + 3 : il faut dire « produit ».

- **Avant** : 1re spé : Expression constituée d'un coefficient et de variables. Ex : $3x^2$.
- **Proposé** : 1re spé : Produit d'un nombre par une puissance d'une lettre, comme $3x^2$ ou $-5x$.

### polynôme — 1re spé

« Somme de monômes » renvoyait à un mot que le BO n'emploie pas.

- **Avant** : 1re spé : Somme de monômes. Ex : $2x^2 + 3x - 1$.
- **Proposé** : 1re spé : Expression comme $ax^2 + bx + c$ ou $ax^3 + bx^2 + cx + d$ : une somme de termes « nombre × puissance de $x$ ». Le plus grand exposant de coefficient non nul est son degré : $2x^2 + 3x - 1$ est de degré $2$.

### degré — 4e

Il manquait « de coefficient non nul » dans la définition de 1re. (Le degré d'angle est un autre mot, ajouté au lot 0d.)

- **Avant** : 4e : Une équation du premier degré est une équation où l'inconnue n'est jamais élevée au carré ni à une autre puissance. Ex : $3x + 2 = 8$. · 1re spé : Plus grand exposant de la variable dans un polynôme. Ex : le degré de $2x^3 + x$ est $3$.
- **Proposé** : 4e : Une équation du premier degré est une équation où l'inconnue n'est jamais élevée au carré ni à une autre puissance. Ex : $3x + 2 = 8$. · 1re spé : Plus grand exposant de $x$ dont le coefficient n'est pas nul : $2x^3 + x$ est de degré $3$.

### ratio — 4e

« Synonyme de rapport » ne rend pas l'usage du BO : un ratio peut comparer plus de deux quantités (2 : 3 : 5).

- **Avant** : 4e : Rapport entre deux quantités. Synonyme de rapport.
- **Proposé** : 4e : Façon de comparer des quantités par leurs parts : un ratio de $2 : 3$ veut dire $2$ parts pour $3$ parts. On peut comparer plus de deux quantités, comme $2 : 3 : 5$.

### puissance — 5e

La définition de 4e oubliait $a^0 = 1$ (« exposant entier naturel ») et contenait une faute (« égaux a $a$ »).

- **Avant** : 5e : Le carré d'un nombre est ce nombre multiplié par lui-même : $5^2 = 5 \times 5 = 25$ ; son cube : $2^3 = 2 \times 2 \times 2 = 8$. Ce sont des puissances. · 4e : $a^n$ est le produit de $n$ facteurs égaux a $a$. Ex : $2^3 = 2 \times 2 \times 2 = 8$.
- **Proposé** : 5e : Le carré d'un nombre est ce nombre multiplié par lui-même : $5^2 = 5 \times 5 = 25$ ; son cube : $2^3 = 2 \times 2 \times 2 = 8$. Ce sont des puissances. · 4e : Pour un entier $n \geq 1$, $a^n$ est le produit de $n$ facteurs égaux à $a$ : $2^3 = 2 \times 2 \times 2 = 8$. Par convention, $a^0 = 1$ pour $a \neq 0$.

### exposant négatif — 3e

Il manquait $a \neq 0$ : $0^{-n}$ n'existe pas.

- **Avant** : 3e : $a^{-n} = \frac{1}{a^n}$. Ex : $2^{-3} = \frac{1}{8}$.
- **Proposé** : 3e : Pour $a \neq 0$ et $n$ entier positif, $a^{-n} = \frac{1}{a^n}$, l'inverse de $a^n$ : $2^{-3} = \frac{1}{8}$.

### carré parfait — 4e

« Le carré d'un autre entier » excluait 0 et 1, que l'exemple citait.

- **Avant** : 4e : Entier qui est le carré d'un autre entier. Ex : $1, 4, 9, 16, 25, 36, \ldots$
- **Proposé** : 4e : Entier qui est le carré d'un entier : $0$, $1$, $4$, $9$, $16$, $25$…

### croissante — 2de

« Quand x augmente, f(x) augmente » reste vague ; les démonstrations de 2de demandent la forme comparative.

- **Avant** : 2de : Une fonction est croissante sur un intervalle si, quand $x$ augmente, $f(x)$ augmente.
- **Proposé** : 2de : $f$ est croissante sur un intervalle $I$ si, pour tous réels $a$ et $b$ de $I$ tels que $a \leq b$, on a $f(a) \leq f(b)$ : quand $x$ augmente, $f(x)$ augmente ou reste égal.

### décroissante — 2de

Même défaut que « croissante ».

- **Avant** : 2de : Une fonction est décroissante sur un intervalle si, quand $x$ augmente, $f(x)$ diminue.
- **Proposé** : 2de : $f$ est décroissante sur un intervalle $I$ si, pour tous réels $a$ et $b$ de $I$ tels que $a \leq b$, on a $f(a) \geq f(b)$ : quand $x$ augmente, $f(x)$ diminue ou reste égal.

### croissant — CP

Renvoie maintenant à « ordre » (ordre croissant, CP) : il suit son niveau.

- Niveau du terme : 3e → CP
- **Avant** : —
- **Proposé** : — (renvoi)

### décroissant — CP

Renvoie maintenant à « ordre » (ordre décroissant, CP) : il suit son niveau.

- Niveau du terme : 3e → CP
- **Avant** : —
- **Proposé** : — (renvoi)

### représenter — CE1

Renvoyait à « courbe représentative » ; le BO emploie le verbe dès le CE1 (représenter des fractions, des données…). L'entrée reçoit sa propre définition.

- Niveau du terme : 2de → CE1
- Renvoi : courbe représentative → aucun (définition propre)
- **Avant** : —
- **Proposé** : CE1 : Montrer une situation, des données ou un nombre par un dessin, un schéma, un tableau ou un graphique : représenter une fraction, représenter des données par un diagramme.

### intervalle — 2de

« Compris entre deux bornes » ne couvre pas les intervalles non bornés, que l'exemple citait.

- **Avant** : 2de : Ensemble de nombres réels compris entre deux bornes. Ex : $[2; 5]$, $]-\infty; 3[$.
- **Proposé** : 2de : Ensemble des réels $x$ qui vérifient une ou deux inégalités : $[2 ; 5]$ contient les $x$ tels que $2 \leq x \leq 5$ ; $]-\infty ; 3[$ contient les $x$ tels que $x < 3$.

### continu — Tle spé

« Sans saut ni trou » ne suffit pas en Tle spé, qui définit la continuité par les limites.

- **Avant** : Tle spé : Se dit d'une fonction sans saut ni trou sur un intervalle.
- **Proposé** : Tle spé : Une fonction $f$ est continue en $a$ si $f(x)$ se rapproche de $f(a)$ quand $x$ se rapproche de $a$ : $\lim_{x \to a} f(x) = f(a)$. Continue sur un intervalle, sa courbe s'y trace sans lever le crayon.

### continuité — Tle spé

Redite de « continu » : l'entrée devient un renvoi vers celle-ci.

- Renvoi : aucun → continu
- **Avant** : Tle spé : Propriété d'une fonction continue : pas de rupture dans la courbe.
- **Proposé** : — (renvoi)

### intégrale — Tle spé

« Mesure l'aire sous la courbe » n'est vrai que pour une fonction positive.

- **Avant** : Tle spé : Outil du calcul intégral. $\int_a^b f(x)\,dx$ mesure l'aire sous la courbe.
- **Proposé** : Tle spé : Pour $f$ continue et positive sur $[a ; b]$, $\int_a^b f(x)\,\mathrm{d}x$ est l'aire du domaine compris entre la courbe de $f$, l'axe des abscisses et les droites d'équations $x = a$ et $x = b$. Pour $f$ continue de signe quelconque, c'est $F(b) - F(a)$, où $F$ est une primitive de $f$.

### limite — 1re spé

« Valeur vers laquelle tend » excluait les limites infinies, que le BO introduit dès la 1re.

- **Avant** : 1re spé : Valeur vers laquelle tend une suite ou une fonction.
- **Proposé** : 1re spé : Une suite a pour limite le réel $\ell$ si ses termes deviennent aussi proches de $\ell$ que l'on veut quand $n$ est assez grand ; elle a pour limite $+\infty$ si ses termes deviennent aussi grands que l'on veut. · Tle spé : Le réel $\ell$ est la limite de $(u_n)$ si tout intervalle ouvert contenant $\ell$ contient tous les termes $u_n$ à partir d'un certain rang ; même idée pour $f(x)$ quand $x$ tend vers $a$ ou vers $+\infty$.

### rang — CP

Il manquait le rang d'un chiffre dans l'écriture d'un nombre (6e).

- **Avant** : CP : Place occupée dans une file ou une liste : premier, deuxième, troisième… Ex : Léa est au troisième rang de la file. · 1re spé : Indice d'un terme dans une suite. Dans $u_5$, le rang est $5$.
- **Proposé** : CP : Place occupée dans une file ou une liste : premier, deuxième, troisième… Ex : Léa est au troisième rang de la file. · 6e : Le rang d'un chiffre est sa place dans l'écriture d'un nombre : dans $3{,}52$, le chiffre $5$ est au rang des dixièmes. · 1re spé : Indice d'un terme dans une suite. Dans $u_5$, le rang est $5$.

### variance — 1re spé

Ne couvrait que la série statistique, alors que le mot n'apparaît qu'en 1re, pour une variable aléatoire.

- **Avant** : 1re spé : Carré de l'écart type. $V = \frac{\sum (x_i - \bar{x})^2}{n}$.
- **Proposé** : 1re spé : Moyenne des carrés des écarts à la moyenne ; pour une variable aléatoire $X$ : $V(X) = E\big((X - E(X))^2\big)$. L'écart type est $\sqrt{V}$.

### quartile — 3e

« Partagent la série en quatre parties de même effectif » est rarement réalisable ; au collège, Q1 et Q3 se définissent par « au moins un quart / trois quarts des valeurs ».

- **Avant** : 3e : Valeurs qui partagent une série ordonnée en quatre parties de même effectif ($Q_1$, $Q_2$, $Q_3$).
- **Proposé** : 3e : Le premier quartile $Q_1$ est la plus petite valeur de la série telle qu'au moins un quart des valeurs lui sont inférieures ou égales ; le troisième quartile $Q_3$, la plus petite telle qu'au moins trois quarts le sont.

### moyenne — 5e

La notation $\bar{x} = \sum x_i / n$ est hors de portée en 5e, et la moyenne pondérée (4e) manquait.

- **Avant** : 5e : Somme des valeurs divisée par le nombre de valeurs. $\bar{x} = \frac{\sum x_i}{n}$.
- **Proposé** : 5e : Nombre obtenu en additionnant toutes les valeurs puis en divisant par le nombre de valeurs : la moyenne de $8$, $12$ et $13$ est $(8 + 12 + 13) \div 3 = 11$. · 4e : Moyenne pondérée : chaque valeur compte autant de fois que son effectif (ou son coefficient).

### probabilité — CM1

Le BO rend exigible en 6e que la probabilité soit un nombre entre 0 et 1 : la deuxième définition passe de la 5e à la 6e.

- **Avant** : CM1 : La probabilité d'un évènement dit s'il a beaucoup ou peu de chances de se produire. Ex : avec une pièce, on a une chance sur deux d'obtenir pile. · 5e : Nombre entre $0$ et $1$ mesurant la chance qu'un événement se produise.
- **Proposé** : CM1 : La probabilité d'un évènement dit s'il a beaucoup ou peu de chances de se produire. Ex : avec une pièce, on a une chance sur deux d'obtenir pile. · 6e : Nombre compris entre $0$ et $1$ qui mesure la chance qu'un évènement se produise : $0$ s'il est impossible, $1$ s'il est certain.

### ensemble — CM1

En 4e, les ensembles servent à décrire des issues ; ℕ et ℝ restent pour la 2de.

- **Avant** : CM1 : Groupe d'objets ou de points réunis parce qu'ils ont quelque chose en commun. Ex : le cercle est l'ensemble des points situés à la même distance du centre. · 2de : Collection d'éléments. Ex : $\mathbb{N}$ (entiers naturels), $\mathbb{R}$ (réels).
- **Proposé** : CM1 : Groupe d'objets ou de points réunis parce qu'ils ont quelque chose en commun. Ex : le cercle est l'ensemble des points situés à la même distance du centre. · 4e : Collection d'objets bien déterminés, ses éléments : l'ensemble des issues d'un lancer de dé est $\{1, 2, 3, 4, 5, 6\}$. · 2de : Collection d'éléments. Ex : $\mathbb{N}$ (entiers naturels), $\mathbb{R}$ (réels).

### rayon — CE2

Le BO de CE2 emploie aussi le rayon comme longueur (« un cercle de rayon 4 cm »).

- **Avant** : CE2 : Segment joignant le centre d'un cercle à un point du cercle.
- **Proposé** : CE2 : Segment qui va du centre d'un cercle à un point du cercle ; c'est aussi sa longueur : un cercle de rayon $4$ cm.

### diamètre — CE2

La formule $d = 2r$ est hors cycle 2 ; le diamètre d'une sphère (3e) manquait.

- **Avant** : CE2 : Segment passant par le centre d'un cercle et joignant deux points du cercle. $d = 2r$.
- **Proposé** : CE2 : Segment qui joint deux points du cercle en passant par son centre ; il est deux fois plus long que le rayon. · 3e : Segment qui joint deux points d'un cercle ou d'une sphère en passant par le centre ; sa longueur est le double du rayon : $d = 2r$.

### translation — 4e

La définition ponctuelle avec parallélogramme, demandée en 3e, manquait.

- **Avant** : 4e : Transformation qui déplace chaque point de la même direction, du même sens et de la même distance.
- **Proposé** : 4e : Transformation qui déplace chaque point dans la même direction, dans le même sens et de la même distance. · 3e : La translation qui transforme $A$ en $B$ associe à tout point $M$ le point $M'$ tel que $ABM'M$ soit un parallélogramme (éventuellement aplati).

### théorème de Thalès — 3e

« Des segments proportionnels » restait vague et omettait le rapport des côtés parallèles.

- **Avant** : 3e : Si deux droites parallèles coupent deux sécantes, alors elles déterminent des segments proportionnels.
- **Proposé** : 3e : Si deux droites sécantes en $A$ sont coupées par deux droites parallèles $(BC)$ et $(MN)$, avec $B$ et $M$ sur l'une, $C$ et $N$ sur l'autre, alors $\frac{AM}{AB} = \frac{AN}{AC} = \frac{MN}{BC}$.

### parallélogramme — 5e

« Parallèles et égaux » mêlait la définition et une propriété, que le BO distingue.

- **Avant** : 5e : Quadrilatère dont les côtés opposés sont parallèles et égaux.
- **Proposé** : 5e : Quadrilatère dont les côtés opposés sont parallèles deux à deux.

### trapèze — CM2

« Exactement deux côtés parallèles » excluait les parallélogrammes, alors que le dictionnaire suit ailleurs des définitions inclusives (le carré est un rectangle).

- **Avant** : CM2 : Quadrilatère ayant exactement deux côtés parallèles.
- **Proposé** : CM2 : Quadrilatère qui a deux côtés opposés parallèles.

### pyramide — CE1

Il manquait que les faces triangulaires ont un sommet commun.

- **Avant** : CE1 : Solide qui a une base et des faces en forme de triangles qui se rejoignent en un sommet. Ex : les pyramides d'Égypte. · CM1 : Solide dont la base est un polygone et les faces latérales sont des triangles.
- **Proposé** : CE1 : Solide qui a une base et des faces en forme de triangles qui se rejoignent en un sommet. Ex : les pyramides d'Égypte. · CM1 : Solide dont la base est un polygone et dont les autres faces sont des triangles qui ont un sommet commun, le sommet de la pyramide.

### prisme — CM1

« Deux bases égales et parallèles » ne suffit pas ; le cycle 3 n'étudie que le prisme droit.

- **Avant** : CM1 : Solide dont les deux bases sont des polygones égaux et parallèles.
- **Proposé** : CM1 : Un prisme droit est un solide qui a deux faces superposables et parallèles, ses bases (des polygones) ; toutes ses autres faces sont des rectangles.

### vecteur — 3e

« Norme » est un mot de 2de ; le BO de 3e construit le vecteur à partir de la translation.

- **Avant** : 3e : Objet mathématique défini par une direction, un sens et une norme (longueur). Noté $\vec{AB}$.
- **Proposé** : 3e : Le vecteur $\overrightarrow{AB}$ décrit la translation qui transforme $A$ en $B$ : une direction (celle de la droite $(AB)$), un sens (de $A$ vers $B$) et une longueur ($AB$).

### scalaire — 1re spé

Ne précisait ni l'angle des vecteurs ni le cas du vecteur nul.

- **Avant** : 1re spé : Produit scalaire de deux vecteurs : $\vec{u} \cdot \vec{v} = \|u\|\|v\|\cos(\theta)$.
- **Proposé** : 1re spé : Produit scalaire de deux vecteurs non nuls $\vec{u}$ et $\vec{v}$ : le nombre $\vec{u} \cdot \vec{v} = \|\vec{u}\| \times \|\vec{v}\| \times \cos(\vec{u}, \vec{v})$ ; il vaut $0$ si l'un des vecteurs est nul. En base orthonormée, c'est $xx' + yy'$.

### adjacent — 6e

« Un côté commun » ne suffit pas : même sommet, et de part et d'autre du côté commun.

- **Avant** : 6e : Se dit de deux angles ayant un côté commun.
- **Proposé** : 6e : Deux angles adjacents ont le même sommet, un côté commun, et sont situés de part et d'autre de ce côté.

### angle aigu — CE1

« Moins de 90° » incluait l'angle nul, que le BO de 6e nomme à part.

- **Avant** : CE1 : Angle plus petit qu'un angle droit. · 6e : Angle mesurant moins de $90°$.
- **Proposé** : CE1 : Angle plus petit qu'un angle droit. · 6e : Angle dont la mesure est comprise entre $0°$ et $90°$ (ni nul, ni droit).

### aigu — CE1

Même défaut que « angle aigu ».

- **Avant** : CE1 : Se dit d'un angle plus petit qu'un angle droit. · 6e : Se dit d'un angle mesurant moins de $90°$.
- **Proposé** : CE1 : Se dit d'un angle plus petit qu'un angle droit. · 6e : Se dit d'un angle dont la mesure est comprise entre $0°$ et $90°$ (ni nul, ni droit).

### barycentre — 2de

Image physique (« point d'équilibre ») sans définition mathématique.

- **Avant** : 2de : Point d'équilibre d'un système de points pondérés.
- **Proposé** : 2de : Barycentre de $A$ et $B$ affectés des coefficients $a$ et $b$ ($a + b \neq 0$) : le point $G$ tel que $a\overrightarrow{GA} + b\overrightarrow{GB} = \vec{0}$. Si $a = b$, c'est le milieu de $[AB]$.

### hyperbole — 2de

« Ou une conique » : mot absent des programmes, et la phrase était vague.

- **Avant** : 2de : Courbe formée de deux branches, représentant la fonction inverse ou une conique.
- **Proposé** : 2de : Courbe représentative de la fonction inverse $x \mapsto \frac{1}{x}$ : deux branches, l'une pour $x < 0$, l'autre pour $x > 0$.

### parabole — 3e

« Fonction du second degré » n'est pas une notion du collège ; en 1re, la parabole peut être tournée vers le bas.

- **Avant** : 3e : Courbe en U représentant une fonction du second degré.
- **Proposé** : 3e : Courbe en forme de U, comme celle de la fonction carré $x \mapsto x^2$. · 1re spé : Courbe représentative d'une fonction polynôme du second degré $x \mapsto ax^2 + bx + c$ ($a \neq 0$) : tournée vers le haut si $a > 0$, vers le bas si $a < 0$.

### synthèse — 3e

« Raisonnement partant des hypothèses » décrit toute déduction ; dans l'analyse-synthèse du BO, la synthèse est l'étape de vérification.

- **Avant** : 3e : Raisonnement partant des hypothèses pour arriver à la conclusion.
- **Proposé** : 3e : Dans un raisonnement par analyse-synthèse, étape où l'on vérifie que les valeurs trouvées pendant l'analyse sont vraiment des solutions.

### symétrie — CE2

La définition de 6e (« transformation, axiale ou centrale ») annonçait la symétrie centrale, vue en 5e ; « symétrie axiale » et « symétrie centrale » ont chacune leur entrée.

- **Avant** : CE2 : Une figure présente une symétrie quand elle a un axe de symétrie : en la pliant le long de cette droite, les deux moitiés se superposent exactement. · 6e : Transformation géométrique (axiale ou centrale).
- **Proposé** : CE2 : Une figure présente une symétrie quand elle a un axe de symétrie : en la pliant le long de cette droite, les deux moitiés se superposent exactement.

## Définitions inadaptées au niveau (35)

### nombre — CP

« Concept mathématique » n'est pas un mot de CP ; au CP le nombre sert aussi à repérer une position et à mesurer.

- **Avant** : CP : Concept mathématique représentant une quantité.
- **Proposé** : CP : Ce qui sert à dire combien il y a d'objets (trente-quatre cubes), à quelle place on est (le quatrième) ou combien mesure une longueur.

### inférieur — CE1

Le signe ≤ n'est pas au cycle 2 (seuls =, < et >).

- **Avant** : CE1 : Plus petit que. Symbole : $<$ ou $\leq$.
- **Proposé** : CE1 : « Inférieur à » veut dire « plus petit que » ; on écrit le signe $<$ : $49 < 53$. · 3e : « Inférieur ou égal à » s'écrit $\leq$ : $x \leq 3$ veut dire que $x$ est plus petit que $3$ ou égal à $3$.

### supérieur — CE1

Même défaut que « inférieur » (signe ≥ au CE1), non relevé par la relecture.

- **Avant** : CE1 : Plus grand que. Symbole : $>$ ou $\geq$.
- **Proposé** : CE1 : « Supérieur à » veut dire « plus grand que » ; on écrit le signe $>$ : $53 > 49$. · 3e : « Supérieur ou égal à » s'écrit $\geq$ : $x \geq 3$ veut dire que $x$ est plus grand que $3$ ou égal à $3$.

### moins — CP

« Signe négatif » relève du cycle 4 ; « moins que » (comparaison) manquait.

- **Avant** : CP : Symbole $-$ de la soustraction ou du signe négatif.
- **Proposé** : CP : Mot qu'on lit pour le signe $-$ : $56 - 14$ se lit « 56 moins 14 ». « Moins que » sert aussi à comparer : $3$, c'est moins que $5$. · 5e : Le signe $-$ indique aussi un nombre négatif : $-4$ se lit « moins 4 ».

### opération — CP

« Processus de calcul » est abstrait pour le CP.

- **Avant** : CP : Processus de calcul : addition, soustraction, multiplication, division.
- **Proposé** : CP : Calcul comme l'addition ($+$) ou la soustraction ($-$) ; plus tard viennent la multiplication ($\times$) et la division ($\div$).

### ordre — CP

La seconde définition (« relation de comparaison <, >, = ») était abstraite, et « = » n'est pas un ordre : on garde la définition du CP.

- **Avant** : CP : Façon de ranger des nombres : dans l'ordre croissant, du plus petit au plus grand ; dans l'ordre décroissant, du plus grand au plus petit. · CE1 : Relation de comparaison entre nombres ($<$, $>$, $=$).
- **Proposé** : CP : Façon de ranger des nombres : dans l'ordre croissant, du plus petit au plus grand ; dans l'ordre décroissant, du plus grand au plus petit.

### problème — CP

« Situation nécessitant un raisonnement mathématique » n'est pas lisible au CP ; le BO parle de l'histoire du problème et de la question posée.

- **Avant** : CP : Situation nécessitant un raisonnement mathématique pour être résolue.
- **Proposé** : CP : Petite histoire avec des nombres et une question : pour répondre, on cherche quel calcul faire. · 6e : Situation qui demande de chercher et de raisonner pour répondre à une question.

### pair — CP

« Divisible » n'est pas au CP ; le BO de CE2 : « les nombres pairs sont des multiples de 2 ».

- **Avant** : CP : Nombre entier divisible par $2$. Ex : $0, 2, 4, 6, 8, \ldots$
- **Proposé** : CP : Un nombre pair est le double d'un nombre : $0$, $2$, $4$, $6$, $8$, $10$… Son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$. · CM1 : Nombre entier divisible par $2$.

### impair — CE1

« Divisible par 2 » : ni la division ni la divisibilité ne sont au cycle 2.

- **Avant** : CE1 : Nombre entier qui n'est pas divisible par $2$. Ex : $1, 3, 5, 7, 9, \ldots$
- **Proposé** : CE1 : Nombre qui n'est pas pair : $1$, $3$, $5$, $7$, $9$, $11$… Son chiffre des unités est $1$, $3$, $5$, $7$ ou $9$. · CM1 : Nombre entier qui n'est pas divisible par $2$.

### diviseur (arithmétique) — CM1

Formulation avec des lettres au CM1 ; « Ce n'est qu'au cycle 4 que les lettres seront introduites de manière formelle. »

- **Avant** : CM1 : $b$ est un diviseur de $a$ si $a \div b$ est un entier (reste $0$). Ex : $3$ est un diviseur de $12$.
- **Proposé** : CM1 : $3$ est un diviseur de $12$ car la division de $12$ par $3$ tombe juste : $12 = 3 \times 4$. · 5e : $b$ est un diviseur de $a$ si $a$ est un multiple de $b$ : $a = b \times k$ avec $k$ entier.

### critère de divisibilité — CM1

L'exemple (divisibilité par 3) est hors programme au CM1 : « Seuls les critères de divisibilité par 2, par 5 et par 10 figurent au programme ».

- **Avant** : CM1 : Règle permettant de savoir si un nombre est divisible par un autre sans faire la division. Ex : un nombre est divisible par $3$ si la somme de ses chiffres est divisible par $3$.
- **Proposé** : CM1 : Règle qui permet de savoir, sans poser la division, si un nombre est divisible par un autre : un nombre est divisible par $2$ si son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$. · 5e : Un nombre est divisible par $3$ (ou par $9$) si la somme de ses chiffres est divisible par $3$ (ou par $9$).

### moitié — CP

« Divisé par 2 » : la division n'arrive qu'au CE2 ; au CP, la moitié se travaille avec le double.

- **Avant** : CP : La moitié d'un nombre est ce nombre divisé par $2$. Ex : la moitié de $14$ est $7$.
- **Proposé** : CP : La moitié d'un nombre, c'est le nombre dont il est le double : la moitié de $14$ est $7$, car $7 + 7 = 14$.

### quart — CE1

« Divisé par 4 » : la division n'arrive qu'au CE2 ; au CE1, un quart est une des quatre parts égales d'un tout.

- **Avant** : CE1 : Le quart d'un nombre est ce nombre divisé par $4$.
- **Proposé** : CE1 : Un quart, c'est une des $4$ parts égales d'un tout partagé en $4$. Un quart d'heure, c'est $15$ minutes.

### tiers — CE1

« Divisé par 3 » : la division n'arrive qu'au CE2.

- **Avant** : CE1 : Le tiers d'un nombre est ce nombre divisé par $3$.
- **Proposé** : CE1 : Le tiers d'un tout, c'est une part quand ce tout est partagé en $3$ parts égales.

### partie décimale — CM1

« À droite de la virgule » fait lire 14 dans 3,14, alors que l'exemple donne 0,14.

- **Avant** : CM1 : Partie d'un nombre décimal située à droite de la virgule. Ex : dans $3{,}14$, la partie décimale est $0{,}14$.
- **Proposé** : CM1 : Ce qui reste d'un nombre décimal quand on enlève sa partie entière : la partie décimale de $3{,}14$ est $0{,}14$.

### dixième — CE1

La définition de CM1 ne donnait que le rang ; le dixième est d'abord une unité partagée en 10, avant l'écriture à virgule.

- **Avant** : CE1 : Une part d'un tout partagé en dix parts égales. · CM1 : Premier rang après la virgule. $0{,}1 = \frac{1}{10}$.
- **Proposé** : CE1 : Une part d'un tout partagé en dix parts égales. · CM1 : Un dixième, c'est une unité partagée en $10$ parts égales : $\frac{1}{10} = 0{,}1$. Dix dixièmes font une unité ; le chiffre des dixièmes est le premier après la virgule.

### centième — CM1

Même défaut que « dixième ».

- **Avant** : CM1 : Deuxième rang après la virgule. $0{,}01 = \frac{1}{100}$.
- **Proposé** : CM1 : Un centième, c'est une unité partagée en $100$ parts égales : $\frac{1}{100} = 0{,}01$. Dix centièmes font un dixième ; le chiffre des centièmes est le deuxième après la virgule.

### millième — CM2

Même défaut que « dixième ».

- **Avant** : CM2 : Troisième rang après la virgule. $0{,}001 = \frac{1}{1000}$.
- **Proposé** : CM2 : Un millième, c'est une unité partagée en $1\,000$ parts égales : $\frac{1}{1\,000} = 0{,}001$. Dix millièmes font un centième.

### fraction décimale — CM1

« Puissance de 10 » est du vocabulaire du cycle 4.

- **Avant** : CM1 : Fraction dont le dénominateur est une puissance de $10$. Ex : $\frac{7}{10}$, $\frac{314}{100}$.
- **Proposé** : CM1 : Fraction dont le dénominateur est $10$, $100$ ou $1\,000$ : $\frac{7}{10}$, $\frac{35}{100}$.

### arrondi — CM1

« Tronquant puis ajustant » est opaque ; au cours moyen, seul l'arrondi à l'entier est demandé (au dixième : 6e).

- **Avant** : CM1 : Valeur approchée d'un nombre obtenue en tronquant puis ajustant le dernier chiffre conservé. Ex : $3{,}14$ arrondi au dixième est $3{,}1$.
- **Proposé** : CM1 : L'arrondi à l'unité d'un nombre est l'entier le plus proche de ce nombre : l'arrondi de $7{,}8$ est $8$, celui de $7{,}3$ est $7$. · 6e : On arrondit aussi au dixième ou au centième : $3{,}14$ arrondi au dixième est $3{,}1$.

### intercaler — CP

« Sur la droite graduée » restreignait la notion : on intercale aussi par le calcul.

- **Avant** : CP : Placer un nombre entre deux autres sur la droite graduée.
- **Proposé** : CP : Intercaler un nombre entre deux nombres, c'est trouver un nombre plus grand que le premier et plus petit que le second : $25$ est entre $20$ et $30$.

### périmètre — CE2

L'exemple donnait la formule $2(L + l)$, alors que le BO dit « aucune formule n'est enseignée » au cycle 2 et que les lettres arrivent au cycle 4.

- **Avant** : CE2 : Longueur du contour d'une figure. Ex : le périmètre d'un rectangle est $2(L + l)$.
- **Proposé** : CE2 : Longueur du contour d'une figure : on l'obtient en ajoutant les longueurs de tous ses côtés. · 5e : Le périmètre d'un rectangle de longueur $L$ et de largeur $l$ est $2 \times (L + l)$.

### aire — CM1

La formule $L \times l$ (6e) et les lettres étaient prématurées au CM1, où l'on compte des carrés-unités.

- **Avant** : CM1 : Mesure de la surface d'une figure. Ex : l'aire d'un rectangle est $L \times l$.
- **Proposé** : CM1 : L'aire d'une figure mesure l'étendue de sa surface ; on peut la trouver en comptant des carrés-unités, par exemple des carrés de $1$ cm de côté ($\text{cm}^2$). · 6e : L'aire d'un rectangle est le produit de sa longueur par sa largeur : $4\,\text{cm} \times 3\,\text{cm} = 12\,\text{cm}^2$.

### volume — CM2

La formule du volume du pavé n'est pas au cycle 3, où l'on compte des cubes-unités.

- **Avant** : CM2 : Mesure de l'espace occupé par un solide. Ex : le volume d'un pavé droit est $L \times l \times h$.
- **Proposé** : CM2 : Le volume d'un solide mesure la place qu'il occupe ; on peut le trouver en comptant des cubes-unités, par exemple des cubes de $1$ cm de côté ($\text{cm}^3$). · 5e : Le volume d'un pavé droit est le produit de sa longueur, de sa largeur et de sa hauteur.

### masse — CP

La définition de CE1 (« grandeur mesurant la quantité de matière ») était abstraite ; la tonne n'arrive qu'au CE2.

- **Avant** : CP : Ce qui permet de dire si un objet est lourd ou léger. On compare des masses avec une balance. · CE1 : Grandeur mesurant la quantité de matière. Unités : $\text{g}$, $\text{kg}$, $\text{t}$.
- **Proposé** : CP : Ce qui permet de dire si un objet est lourd ou léger. On compare des masses avec une balance. · CE1 : On mesure une masse en grammes ($\text{g}$) et en kilogrammes ($\text{kg}$) : $1\,\text{kg} = 1\,000\,\text{g}$.

### durée — CE1

« Grandeur », « intervalle » sont abstraits ; les secondes sont hors cycle 2.

- **Avant** : CE1 : Grandeur mesurant un intervalle de temps. Unités : secondes, minutes, heures.
- **Proposé** : CE1 : Temps qui passe entre deux instants, par exemple entre le début et la fin de la récréation ; on la mesure en heures et en minutes.

### mesure — CE1

« Évaluation d'une grandeur » n'est pas lisible au CE1.

- **Avant** : CE1 : Évaluation d'une grandeur à l'aide d'une unité.
- **Proposé** : CE1 : Nombre trouvé en mesurant, avec son unité : la table mesure $120$ cm.

### proportionnalité — CM1

« Rapport constant » ne correspond pas à la définition de 6e du livret, qui passe par la multiplication par un même nombre.

- **Avant** : CM1 : Deux grandeurs sont proportionnelles quand, si l'une est multipliée par $2$, $3$, $10$…, l'autre l'est aussi. Ex : $1$ cahier coûte $2$ €, $3$ cahiers coûtent $6$ €. · 6e : Relation entre deux grandeurs dont le rapport est constant.
- **Proposé** : CM1 : Deux grandeurs sont proportionnelles quand, si l'une est multipliée par $2$, $3$, $10$…, l'autre l'est aussi. Ex : $1$ cahier coûte $2$ €, $3$ cahiers coûtent $6$ €. · 6e : Deux grandeurs sont proportionnelles si l'on obtient les valeurs de l'une en multipliant celles de l'autre par un même nombre non nul.

### rapport — 6e

« Quotient de deux grandeurs » est flou et l'exemple « rapport a/b » était circulaire.

- **Avant** : 6e : Quotient de deux grandeurs. Ex : rapport $\frac{a}{b}$.
- **Proposé** : 6e : Le rapport d'une partie au tout est la fraction qui indique quelle part elle représente : $3$ filles sur $12$ élèves, c'est un rapport de $\frac{3}{12}$, soit $\frac{1}{4}$.

### puissance de dix — 4e

L'exemple $10^{-2}$ suppose les exposants négatifs, définis en 3e seulement.

- **Avant** : 4e : Nombre de la forme $10^n$. Ex : $10^3 = 1000$, $10^{-2} = 0{,}01$.
- **Proposé** : 4e : Nombre de la forme $10^n$, comme $10^3 = 1\,000$. · 3e : Avec les exposants négatifs : $10^{-2} = \frac{1}{100} = 0{,}01$.

### fonction — 3e

« Ensemble de départ, ensemble d'arrivée » : vocabulaire hors collège ; le BO de 3e précise « sans étude générale de la notion de fonction ».

- **Avant** : 3e : Relation qui associe à chaque élément d'un ensemble de départ un unique élément d'un ensemble d'arrivée.
- **Proposé** : 3e : Procédé qui, à chaque nombre $x$, associe un seul nombre, noté $f(x)$ : la fonction $f : x \mapsto 2x + 1$ associe $7$ à $3$. · 2de : Une fonction $f$ définie sur un ensemble $D$ associe à chaque réel $x$ de $D$ un unique réel $f(x)$, son image.

### fréquence — 6e

« Occurrences », « effectif » sont du vocabulaire du cycle 4.

- **Avant** : 6e : Rapport du nombre d'occurrences d'un événement au nombre total d'expériences. $f = \frac{\text{effectif}}{\text{total}}$.
- **Proposé** : 6e : La fréquence d'un résultat est le nombre de fois où il est obtenu divisé par le nombre total d'essais : $5$ « pile » sur $20$ lancers donne $\frac{5}{20} = 0{,}25$.

### droite — CP

Notation $(AB)$ hors cycle 2 et définition formelle, contraire au BO (« sans faire l'objet de définitions formelles »).

- **Avant** : CP : Ligne infinie, sans courbure. Notée $(AB)$.
- **Proposé** : CP : Ligne bien droite, tracée à la règle, qui ne s'arrête pas : on n'en dessine qu'un morceau. · 6e : Ligne droite illimitée des deux côtés ; la droite qui passe par $A$ et $B$ se note $(AB)$.

### rectangle — CP

« Quadrilatère » (CE2) et « angle droit » (CE1) sont inconnus au CP, où la figure se décrit par ses côtés et ses sommets.

- **Avant** : CP : Quadrilatère ayant quatre angles droits.
- **Proposé** : CP : Figure qui a $4$ côtés et $4$ coins comme ceux d'une feuille ; ses côtés opposés ont la même longueur. · CE2 : Quadrilatère qui a quatre angles droits.

### carré (géométrie) — CP

Défini par le rectangle, lui-même défini par des mots inconnus au CP.

- **Avant** : CP : Rectangle ayant quatre côtés égaux.
- **Proposé** : CP : Figure qui a $4$ côtés de même longueur et $4$ coins comme ceux d'une feuille. · CE2 : Quadrilatère qui a quatre angles droits et quatre côtés de même longueur.
