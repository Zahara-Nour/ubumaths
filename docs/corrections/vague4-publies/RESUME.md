# Vague 4 — un exemple rendu par code

Premier tirage de l'aperçu (`APERCU.md` de `vague4-brouillons` et `vague4-publies`), un modèle par code.
Vérificateur (chemin littéral par équivalence compris) : brouillons 19/25, publiés 1/3. Encore rouges (notes ⚑) : N-OPPOSE-EXPR, N-FACT-COMMUN, N-VOCAB-OP, N-RACINE-AFF.

## N-OPPOSE-EXPR — Déterminer l'opposé d'une expression

`aeb86af9-7bf1-440a-be17-735a41b5ce46` · 3 · niveau 1 · 1 variation(s) · correction rédigée

- ⚑ Vérificateur : l’opération (« l’opposé de ») est dans la phrase, pas dans l’expression posée A ; le calcul part de −(A), non équivalent à A → rouge.

#### Tirage 1 (variation 0)

**Énoncé**

Quel est l'opposé de cette expression ?

$$4 y$$

L'opposé est $\square$.

**Réponse attendue** : $-4 y$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe du terme $\textcolor{#FF5722}{4y}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{4y} \right) &= -4y \end{align}
$$

_(lot `vague4-brouillons`)_

## N-PUISS-DEF — Simplifier à l'aide d'un carré ou d'un cube

`7410800b-83d3-40a3-8a2d-dc4b16a4679d` · 5 · niveau 4 · 2 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Simplifie l'écriture de cette expression littérale :

$$x \times x \times x$$

**Réponse attendue** : $x^3$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

Le facteur $\textcolor{#FF5722}{x}$ est écrit $\textcolor{#2196F3}{3}$ fois : c’est $x^{\textcolor{#2196F3}{3}}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{x} \times \textcolor{#FF5722}{x} \times \textcolor{#FF5722}{x} &= x^3 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-IDREM — Développer $(a+b)(a-b)$

`a6a6c491-be89-4a81-8a9d-6412c2396f2d` · 3 · niveau 1 · 4 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Développe et réduis :

$$\left( 7 - z \right) \left( 7 + z \right)$$

**Réponse attendue** : $49 - z^2$

**Correction**

_Étape 1_

**Identité remarquable.** $\left( a + b \right) \left( a - b \right) = a^2 - b^2$ : le produit de la somme par la différence de deux termes est la différence de leurs carrés.

_Étape 2_

Ici, le premier terme est $\textcolor{#FF5722}{7}$ et le second $\textcolor{#2196F3}{z}$.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{7} - \textcolor{#2196F3}{z} \right)\left( \textcolor{#FF5722}{7} + \textcolor{#2196F3}{z} \right) &= \textcolor{#FF5722}{7}^2 - \textcolor{#2196F3}{z}^2 \\ &= 49-z^2 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-ECRIT-PRODUIT — Simplifier le symbole de multiplication

`077c01e0-0c8a-4ff9-a57e-279ec35659ec` · 5 · niveau 1 · 2 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Réécris l'expression en la simplifiant.

$$x \times 9$$

**Réponse attendue** : $9 x$

**Correction**

_Étape 1_

**Convention d'écriture.** On peut supprimer le signe $\times$ devant une lettre ou une parenthèse ; le nombre s’écrit alors en premier.

_Étape 2_

On échange les facteurs pour écrire le nombre $\textcolor{#2196F3}{9}$ en premier, puis on supprime le signe $\textcolor{#FF5722}{\times}$.

_Étape 3_

$$
\begin{align} x \times \textcolor{#2196F3}{9} &= \textcolor{#2196F3}{9} \textcolor{#FF5722}{\times} x \\ &= 9x \end{align}
$$

_(lot `vague4-brouillons`)_

## N-NEUTRE-ABS — Simplifier un produit par $0$ ou $1$

`6fbf1ab2-c476-4a6c-bd98-ce2c58d8c459` · 5 · niveau 3 · 2 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Écris plus simplement cette expression littérale :

$$0 x$$

**Réponse attendue** : $0$

**Correction**

_Étape 1_

**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; multiplier par $0$ donne toujours $0$ ($0$ est absorbant).

_Étape 2_

$0 x$ signifie $\textcolor{#FF5722}{0} \times x$ : multiplier par $\textcolor{#FF5722}{0}$ donne $0$, quelle que soit la valeur de $x$.

_Étape 3_

$$
\begin{align} 0x &= \textcolor{#FF5722}{0} \times x \\ &= 0 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-FACT-COMMUN — Trouver un facteur commun

`294c4316-d2c9-4894-9c3c-c2b24fdffc99` · 4 · niveau 1 · 8 variation(s) · correction rédigée

- ⚑ Vérificateur : la réponse est UN FACTEUR, pas la fin d’un calcul (la factorisation finit sur le produit) → rouge.

#### Tirage 1 (variation 1)

**Énoncé**

Trouve un facteur commun (autre que 1).

$$9 \times 7 + 7 \times 4$$

Un facteur commun est $\square$.

**Réponse attendue** : $7$

**Correction**

_Étape 1_

**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).

_Étape 2_

Dans $9 \times \textcolor{#FF5722}{7}$ et dans $\textcolor{#FF5722}{7} \times 4$, le facteur $\textcolor{#FF5722}{7}$ apparaît dans chaque terme.

_Étape 3_

$$
\begin{align} 9 \times \textcolor{#FF5722}{7} + \textcolor{#FF5722}{7} \times 4 &= \textcolor{#FF5722}{7} \times \left( 9 + 4 \right) \end{align}
$$

_Étape 4_

Un facteur commun est donc $7$ (tout diviseur de $7$ autre que $1$ convient aussi).

_(lot `vague4-brouillons`)_

## N-VOCAB-OP — Traduire une phrase en expression mathématique

`5d515eb1-c8f8-4678-b4bd-f9ab3f34713f` · 6 · niveau 1 · 4 variation(s) · correction rédigée

- ⚑ Vérificateur : ni variable d’expression ni bloc `$$…$$` dans l’énoncé (phrase à traduire) : point de départ invérifiable → rouge.

#### Tirage 1 (variation 1)

**Énoncé**

Traduis cette phrase par une expression mathématique : le produit de $7$ par $6$

L'expression est $\square$.

**Réponse attendue** : $7 \times 6$

**Correction**

_Étape 1_

**Vocabulaire.** Une somme est le résultat d’une addition, une différence celui d’une soustraction, un produit celui d’une multiplication, un quotient celui d’une division.

_Étape 2_

Un produit est le résultat d’une multiplication : on écrit les deux nombres dans l’ordre de la phrase.

_Étape 3_

L’expression est $7 \times 6$.

_(lot `vague4-publies`)_

## N-ABS — Calculer la valeur d'une valeur absolue

`226e5b3b-fad4-4c99-92cb-42e123014055` · 2 · niveau 4 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Calcule.

$$\left| 4 \right|$$

**Réponse attendue** : $4$

**Correction**

_Étape 1_

**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $\left| a \right| = a$ si $a \geq 0$, et $\left| a \right| = -a$ (son opposé) si $a < 0$.

_Étape 2_

$\textcolor{#FF5722}{4}$ est positif ou nul : sa valeur absolue est lui-même.

_Étape 3_

$$
\begin{align} {\left| \textcolor{#FF5722}{4} \right|} &= 4 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-PUISS-NEG — Calculer l'inverse d'un nombre

`65110463-afc0-4dfd-91b3-977fd7402de7` · 4 · niveau 2 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$\left( \dfrac{1}{14} \right)^{-1}$$

**Réponse attendue** : $14$

**Correction**

_Étape 1_

**Exposant négatif.** Pour $a \neq 0$ : $a^{-n} = \dfrac{1}{a^n}$. En particulier, $a^{-1} = \dfrac{1}{a}$ est l’inverse de $a$.

_Étape 2_

$\left( \dfrac{1}{\textcolor{#FF5722}{14}} \right)^{-1}$ est l’inverse de $\dfrac{1}{\textcolor{#FF5722}{14}}$ : diviser $1$ par une fraction, c’est multiplier par son inverse.

_Étape 3_

$$
\begin{align} \left( \dfrac{1}{\textcolor{#FF5722}{14}} \right)^{-1} &= \dfrac{1}{\dfrac{1}{\textcolor{#FF5722}{14}}} \\ &= 14 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-PUISS10 — Écrire un nombre entier à l'aide d'une puissance de $10$

`ac0e5b62-b6bc-4a82-85c4-d1b25a9d4d69` · 4 · niveau 2 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris ce nombre sous la forme d'un seul nombre entier.

$$9 \times 10^4$$

**Réponse attendue** : $90000$

**Correction**

_Étape 1_

**Puissances de $10$.** Pour $n \geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.

_Étape 2_

$10^{\textcolor{#FF5722}{4}}$ s’écrit $\textcolor{#2196F3}{10000}$ ($1$ suivi de $\textcolor{#FF5722}{4}$ zéros) ; on multiplie ensuite par $9$.

_Étape 3_

$$
\begin{align} 9 \times 10^{\textcolor{#FF5722}{4}} &= 9 \times \textcolor{#2196F3}{10000} \\ &= 90000 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-PARENTH — Enlever les parenthèses

`c32ebff9-7e10-400e-bc06-c376f6991ea8` · 3 · niveau 3 · 2 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Réécris l'expression en enlevant les parenthèses.

$$4 c - \left( 9 b - 5 \right)$$

**Réponse attendue** : $-9 b + 4 c + 5$

**Correction**

_Étape 1_

**Suppression des parenthèses.** Des parenthèses précédées du signe $+$ s’enlèvent sans rien changer ; précédées du signe $-$, on les enlève en changeant le signe de chaque terme.

_Étape 2_

Les parenthèses sont précédées du signe $\textcolor{#2196F3}{-}$ : $\textcolor{#FF5722}{9b}$ devient $\textcolor{#4CAF50}{-9b}$ et $\textcolor{#FF5722}{-5}$ devient $\textcolor{#4CAF50}{+5}$.

_Étape 3_

$$
\begin{align} 4c \textcolor{#2196F3}{-} \left( \textcolor{#FF5722}{9b}\textcolor{#FF5722}{-5} \right) &= -9b+4c+5 \end{align}
$$

_(lot `vague4-brouillons`)_

## N-RACINE-AFF — Racine d'une fonction affine

`2bdb3db6-8ef7-43af-aa7a-2332e34d2a01` · 3 · niveau 1 · 2 variation(s) · correction rédigée

- ⚑ Vérificateur : le seul bloc de l’énoncé est une égalité `f(x) = …` et la résolution enchaîne des ÉQUATIONS, pas des égalités de valeurs → rouge.
- Rédigée à la main : le pipeline pedagogical-solve/linear (mode B) produit des étapes, pas le style maison `align`.

#### Tirage 1 (variation 1)

**Énoncé**

Pour quelle valeur de $x$ la fonction $f$ s'annule-t-elle ?

$$f\left( x \right) = 9 + 5 x$$

$f\left(\square\right)=0$

**Réponse attendue** : $-\dfrac{9}{5}$

**Correction**

_Étape 1_

**Racine d’une fonction affine.** $f\left( x \right) = a x + b$ (avec $a \neq 0$) s’annule pour la solution de l’équation $a x + b = 0$, c’est-à-dire $x = -\dfrac{b}{a}$.

_Étape 2_

On résout $9 + 5 x = 0$ : on isole $\textcolor{#FF5722}{x}$.

_Étape 3_

$$
\begin{align} 9+5x &= 0 \\ 5\textcolor{#FF5722}{x} &= -9 \\ \textcolor{#FF5722}{x} &= \dfrac{-9}{5} \\ \textcolor{#FF5722}{x} &= -\dfrac{9}{5} \end{align}
$$

_Étape 4_

La fonction $f$ s’annule pour $\textcolor{#4CAF50}{x = -\dfrac{9}{5}}$.

_(lot `vague4-brouillons`)_

## N-SIGNE-AFF — Reconnaître le tableau de signe d'une fonction affine

`bba95c2d-033b-4648-944d-102a3c2c386d` · 3 · niveau 3 · 20 variation(s) · correction rédigée

- Coefficients relus dans la variable d’expression de chaque variation (fonctions fixes).

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le tableau de signe correspondant à la fonction affine :

$$f\left( x \right) = -9 x - 1$$

**Réponse attendue** : ![Choice 1](fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-1-600.png)

**Correction**

_Étape 1_

**Signe de $a x + b$.** La fonction s’annule en $x_0 = -\dfrac{b}{a}$. À droite de $x_0$, $a x + b$ a le signe de $a$ ; à gauche, le signe contraire.

_Étape 2_

Ici $a = \textcolor{#FF5722}{-9}$ est négatif et $f$ s’annule en $x_0 = \textcolor{#2196F3}{-\dfrac{1}{9}}$. À droite de $\textcolor{#2196F3}{-\dfrac{1}{9}}$, $f\left( x \right)$ est $\textcolor{#4CAF50}{\text{négative}}$ ; à gauche, $\textcolor{#4CAF50}{\text{positive}}$.

_Étape 3_

Le bon tableau est donc :

![Choice 1](fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-1-600.png)

_(lot `vague4-brouillons`)_

## N-VOCAB-AFF — Vocabulaire des fonctions affines

`2d29792b-f7d7-4950-90db-9530ca3b02c4` · 3 · niveau 3 · 4 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Dans la fonction affine $f\left( x \right) = 5 x + 9$, comment s'appelle le nombre $9$ ?

**Réponse attendue** : l'ordonnée à l'origine

**Correction**

_Étape 1_

**Vocabulaire.** Dans $f\left( x \right) = a x + b$, le nombre $a$ qui multiplie $x$ est le coefficient directeur ; le nombre $b$ seul est l’ordonnée à l’origine (la valeur de $f\left( 0 \right)$).

_Étape 2_

Le nombre $\textcolor{#FF5722}{9}$ est seul, il ne multiplie pas $x$ : c’est $\textcolor{#4CAF50}{\text{l'ordonnée à l'origine}}$.

_(lot `vague4-brouillons`)_

## N-NOTSCI — Écrire un nombre décimal à l'aide de la notation scientifique

`953574d4-e345-4a5d-9435-7faecc3ff7ac` · 4 · niveau 1 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris ce nombre en notation scientifique.

$$798.5$$

**Réponse attendue** : $7.985$ ; $2$

**Correction**

_Étape 1_

**Notation scientifique.** Un nombre s’écrit $a \times 10^n$ avec $1 \leq a < 10$ et $n$ entier relatif. Quand la virgule se déplace de $k$ rangs vers la droite, $n = -k$ ; vers la gauche, $n = k$.

_Étape 2_

Le premier chiffre non nul est $\textcolor{#FF5722}{7}$ : la virgule se place juste après lui, ce qui donne la mantisse $m = \textcolor{#FF5722}{7{,}985}$, comprise entre $1$ et $10$. La virgule s’est déplacée de $\textcolor{#2196F3}{2}$ rangs vers la gauche : l’exposant est $n = \textcolor{#4CAF50}{2}$.

_Étape 3_

$$
\begin{align} 798.5 &= \textcolor{#FF5722}{7{,}985} \times \textcolor{#2196F3}{100} \\ &= \textcolor{#FF5722}{7{,}985} \times 10^{\textcolor{#4CAF50}{2}} \end{align}
$$

_(lot `vague4-brouillons`)_

## N-LIM-OPS — Déterminer la limite d'une suite

`07bce646-6a88-4b7c-aaf6-fe07ffa63ed6` · T_SPE · niveau 2 · 42 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Détermine le résultat de cette opération sur les limites.

$$\dfrac{+\infty}{-\infty}$$

**Réponse attendue** : Forme indéterminée

**Correction**

_Étape 1_

**Quotient de deux limites infinies.** $\dfrac{\infty}{\infty}$ est une forme indéterminée : on ne peut pas conclure sans transformer l’expression.

_Étape 2_

C’est une $\textcolor{#4CAF50}{\text{forme indéterminée}}$.

_Étape 3_

Réponse : Forme indéterminée

_(lot `vague4-brouillons`)_
