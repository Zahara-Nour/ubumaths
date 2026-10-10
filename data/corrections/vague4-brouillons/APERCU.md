# Aperçu des corrections — lot « vague4-brouillons »

> Vague 4, modèles en brouillon verts au vérificateur (19). Généré par `pnpm corrections:preview vague4-brouillons` : ne pas éditer à la main (éditer la proposition `<id>.json` ou le lot, puis régénérer). Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion (cf. docs/ref/corrections-redaction.md).

- N-PARENTH — Enlever les parenthèses `c32ebff9`
- N-IDREM — Développer $(a+b)(a-b)$ `a6a6c491`
- N-IDREM — Factoriser $a^2-b^2$ `ff8082bd`
- N-PUISS-DEF — Simplifier à l'aide d'un carré ou d'un cube `7410800b`
- N-PUISS-DEF — Traduire un produit en puissance `d9f2003b`
- N-PUISS-DEF — Traduire une puissance en produit `3fe98dd9`
- N-ECRIT-PRODUIT — Simplifier le symbole de multiplication `077c01e0`
- N-ECRIT-PRODUIT — Simplifier le symbole de multiplication `33b1b496`
- N-NEUTRE-ABS — Simplifier un produit par $0$ ou $1$ `6fbf1ab2`
- N-ABS — Calculer la valeur d'une valeur absolue `226e5b3b`
- N-ABS — Calculer la valeur d'une valeur absolue `d540f96e`
- N-PUISS-NEG — Calculer l'inverse d'un nombre `65110463`
- N-PUISS-NEG — Définition d'une puissance à exposant négatif `15368b02`
- N-PUISS10 — Écrire un nombre entier à l'aide d'une puissance de $10$ `ac0e5b62`
- N-PUISS10 — Écrire un nombre entier à l'aide d'une puissance de $10$ `ae8ad17a`
- N-NOTSCI — Écrire un nombre décimal à l'aide de la notation scientifique `953574d4`
- N-SIGNE-AFF — Reconnaître le tableau de signe d'une fonction affine `bba95c2d`
- N-VOCAB-AFF — Vocabulaire des fonctions affines `2d29792b`
- N-LIM-OPS — Déterminer la limite d'une suite `07bce646`

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

#### Tirage 2 (variation 0)

**Énoncé**

Réécris l'expression en enlevant les parenthèses.

$$9 a + \left( -6 c + 4 \right)$$

**Réponse attendue** : $9 a - 6 c + 4$

**Correction**

_Étape 1_

**Suppression des parenthèses.** Des parenthèses précédées du signe $+$ s’enlèvent sans rien changer ; précédées du signe $-$, on les enlève en changeant le signe de chaque terme.

_Étape 2_

Les parenthèses sont précédées du signe $\textcolor{#2196F3}{+}$ : on les enlève sans changer les termes.

_Étape 3_

$$
\begin{align} 9a \textcolor{#2196F3}{+} \left( \textcolor{#FF5722}{-6c}\textcolor{#FF5722}{+4} \right) &= 9a-6c+4 \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Réécris l'expression en enlevant les parenthèses.

$$-6 a - \left( b - 3 \right)$$

**Réponse attendue** : $-6 a - b + 3$

**Correction**

_Étape 1_

**Suppression des parenthèses.** Des parenthèses précédées du signe $+$ s’enlèvent sans rien changer ; précédées du signe $-$, on les enlève en changeant le signe de chaque terme.

_Étape 2_

Les parenthèses sont précédées du signe $\textcolor{#2196F3}{-}$ : $\textcolor{#FF5722}{b}$ devient $\textcolor{#4CAF50}{-b}$ et $\textcolor{#FF5722}{-3}$ devient $\textcolor{#4CAF50}{+3}$.

_Étape 3_

$$
\begin{align} -6a \textcolor{#2196F3}{-} \left( \textcolor{#FF5722}{b}\textcolor{#FF5722}{-3} \right) &= -6a-b+3 \end{align}
$$

---

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

#### Tirage 2 (variation 2)

**Énoncé**

Développe et réduis :

$$\left( t + 9 \right) \left( t - 9 \right)$$

**Réponse attendue** : $t^2 - 81$

**Correction**

_Étape 1_

**Identité remarquable.** $\left( a + b \right) \left( a - b \right) = a^2 - b^2$ : le produit de la somme par la différence de deux termes est la différence de leurs carrés.

_Étape 2_

Ici, le premier terme est $\textcolor{#FF5722}{t}$ et le second $\textcolor{#2196F3}{9}$.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{t} + \textcolor{#2196F3}{9} \right)\left( \textcolor{#FF5722}{t} - \textcolor{#2196F3}{9} \right) &= \textcolor{#FF5722}{t}^2 - \textcolor{#2196F3}{9}^2 \\ &= t^2-81 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Développe et réduis :

$$\left( t - 2 \right) \left( t + 2 \right)$$

**Réponse attendue** : $t^2 - 4$

**Correction**

_Étape 1_

**Identité remarquable.** $\left( a + b \right) \left( a - b \right) = a^2 - b^2$ : le produit de la somme par la différence de deux termes est la différence de leurs carrés.

_Étape 2_

Ici, le premier terme est $\textcolor{#FF5722}{t}$ et le second $\textcolor{#2196F3}{2}$.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{t} - \textcolor{#2196F3}{2} \right)\left( \textcolor{#FF5722}{t} + \textcolor{#2196F3}{2} \right) &= \textcolor{#FF5722}{t}^2 - \textcolor{#2196F3}{2}^2 \\ &= t^2-4 \end{align}
$$

---

## N-IDREM — Factoriser $a^2-b^2$

`ff8082bd-fe4d-4747-bddc-19eced72839f` · 3 · niveau 3 · 2 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).
- ⚑ Modèle : la variable `b` est déclarée mais jamais utilisée.

#### Tirage 1 (variation 1)

**Énoncé**

Factorise.

$$z^2 - 49$$

**Réponse attendue** : $\left( z + 7 \right) \left( z - 7 \right)$

**Correction**

_Étape 1_

**Identité remarquable.** $\left( a + b \right) \left( a - b \right) = a^2 - b^2$ : le produit de la somme par la différence de deux termes est la différence de leurs carrés.

_Étape 2_

On lit l’égalité de droite à gauche : $49$ est le carré de $\textcolor{#2196F3}{7}$ ; c’est une différence de deux carrés.

_Étape 3_

$$
\begin{align} z^2 - 49 &= \textcolor{#FF5722}{z}^2 - \textcolor{#2196F3}{7}^2 \\ &= (z+7)(z-7) \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Factorise.

$$81 - x^2$$

**Réponse attendue** : $\left( 9 + x \right) \left( 9 - x \right)$

**Correction**

_Étape 1_

**Identité remarquable.** $\left( a + b \right) \left( a - b \right) = a^2 - b^2$ : le produit de la somme par la différence de deux termes est la différence de leurs carrés.

_Étape 2_

On lit l’égalité de droite à gauche : $81$ est le carré de $\textcolor{#FF5722}{9}$ ; c’est une différence de deux carrés.

_Étape 3_

$$
\begin{align} 81 - x^2 &= \textcolor{#FF5722}{9}^2 - \textcolor{#2196F3}{x}^2 \\ &= (9+x)(9-x) \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Factorise.

$$y^2 - 4$$

**Réponse attendue** : $\left( y + 2 \right) \left( y - 2 \right)$

**Correction**

_Étape 1_

**Identité remarquable.** $\left( a + b \right) \left( a - b \right) = a^2 - b^2$ : le produit de la somme par la différence de deux termes est la différence de leurs carrés.

_Étape 2_

On lit l’égalité de droite à gauche : $4$ est le carré de $\textcolor{#2196F3}{2}$ ; c’est une différence de deux carrés.

_Étape 3_

$$
\begin{align} y^2 - 4 &= \textcolor{#FF5722}{y}^2 - \textcolor{#2196F3}{2}^2 \\ &= (y+2)(y-2) \end{align}
$$

---

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

#### Tirage 2 (variation 0)

**Énoncé**

Simplifie l'écriture de cette expression littérale :

$$y \times y$$

**Réponse attendue** : $y^2$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

Le facteur $\textcolor{#FF5722}{y}$ est écrit $\textcolor{#2196F3}{2}$ fois : c’est $y^{\textcolor{#2196F3}{2}}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{y} \times \textcolor{#FF5722}{y} &= y^2 \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Simplifie l'écriture de cette expression littérale :

$$b \times b \times b$$

**Réponse attendue** : $b^3$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

Le facteur $\textcolor{#FF5722}{b}$ est écrit $\textcolor{#2196F3}{3}$ fois : c’est $b^{\textcolor{#2196F3}{3}}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{b} \times \textcolor{#FF5722}{b} \times \textcolor{#FF5722}{b} &= b^3 \end{align}
$$

---

## N-PUISS-DEF — Traduire un produit en puissance

`d9f2003b-d028-4bcb-b5ab-2fe93933c5b4` · 4 · niveau 1 · 6 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Réécris cette expression à l'aide d'une puissance

$$6 \times 6 \times 6$$

**Réponse attendue** : $6^3$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

Le facteur $\textcolor{#FF5722}{6}$ est écrit $\textcolor{#2196F3}{3}$ fois : c’est $6^{\textcolor{#2196F3}{3}}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{6} \times \textcolor{#FF5722}{6} \times \textcolor{#FF5722}{6} &= 6^3 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Réécris cette expression à l'aide d'une puissance

$$10 \times 10 \times 10 \times 10$$

**Réponse attendue** : $10^4$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

Le facteur $\textcolor{#FF5722}{10}$ est écrit $\textcolor{#2196F3}{4}$ fois : c’est $10^{\textcolor{#2196F3}{4}}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{10} \times \textcolor{#FF5722}{10} \times \textcolor{#FF5722}{10} \times \textcolor{#FF5722}{10} &= 10^4 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Réécris cette expression à l'aide d'une puissance

$$c \times c \times c \times c \times c$$

**Réponse attendue** : $c^5$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

Le facteur $\textcolor{#FF5722}{c}$ est écrit $\textcolor{#2196F3}{5}$ fois : c’est $c^{\textcolor{#2196F3}{5}}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{c} \times \textcolor{#FF5722}{c} \times \textcolor{#FF5722}{c} \times \textcolor{#FF5722}{c} \times \textcolor{#FF5722}{c} &= c^5 \end{align}
$$

---

## N-PUISS-DEF — Traduire une puissance en produit

`3fe98dd9-7545-4287-8301-7d87e8c1976f` · 4 · niveau 2 · 6 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 1)

**Énoncé**

Réécris cette expression à l'aide de la définition d'une puissance.

$$6^3$$

**Réponse attendue** : $6 \times 6 \times 6$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

L’exposant $\textcolor{#2196F3}{3}$ indique 3 facteurs égaux à $\textcolor{#FF5722}{6}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{6}^{\textcolor{#2196F3}{3}} &= 6 \times 6 \times 6 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Réécris cette expression à l'aide de la définition d'une puissance.

$$10^4$$

**Réponse attendue** : $10 \times 10 \times 10 \times 10$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

L’exposant $\textcolor{#2196F3}{4}$ indique 4 facteurs égaux à $\textcolor{#FF5722}{10}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{10}^{\textcolor{#2196F3}{4}} &= 10 \times 10 \times 10 \times 10 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Réécris cette expression à l'aide de la définition d'une puissance.

$$c^5$$

**Réponse attendue** : $c \times c \times c \times c \times c$

**Correction**

_Étape 1_

**Définition d'une puissance.** Pour un entier $n \geq 2$, $a^n = a \times a \times \cdots \times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).

_Étape 2_

L’exposant $\textcolor{#2196F3}{5}$ indique 5 facteurs égaux à $\textcolor{#FF5722}{c}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{c}^{\textcolor{#2196F3}{5}} &= c \times c \times c \times c \times c \end{align}
$$

---

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

#### Tirage 2 (variation 0)

**Énoncé**

Réécris l'expression en la simplifiant.

$$3 \times y$$

**Réponse attendue** : $3 y$

**Correction**

_Étape 1_

**Convention d'écriture.** On peut supprimer le signe $\times$ devant une lettre ou une parenthèse ; le nombre s’écrit alors en premier.

_Étape 2_

Le signe $\textcolor{#FF5722}{\times}$ est devant la lettre $y$ : on le supprime.

_Étape 3_

$$
\begin{align} 3 \textcolor{#FF5722}{\times} y &= 3y \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Réécris l'expression en la simplifiant.

$$b \times 2$$

**Réponse attendue** : $2 b$

**Correction**

_Étape 1_

**Convention d'écriture.** On peut supprimer le signe $\times$ devant une lettre ou une parenthèse ; le nombre s’écrit alors en premier.

_Étape 2_

On échange les facteurs pour écrire le nombre $\textcolor{#2196F3}{2}$ en premier, puis on supprime le signe $\textcolor{#FF5722}{\times}$.

_Étape 3_

$$
\begin{align} b \times \textcolor{#2196F3}{2} &= \textcolor{#2196F3}{2} \textcolor{#FF5722}{\times} b \\ &= 2b \end{align}
$$

---

## N-ECRIT-PRODUIT — Simplifier le symbole de multiplication

`33b1b496-0de3-47bb-b19a-ff016fd08ef5` · 5 · niveau 2 · 6 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).
- ⚑ Modèle : variations 0-1, le facteur `r` est une LETTRE (a|b|c|x|y) — `r` peut valoir `p`.

#### Tirage 1 (variation 1)

**Énoncé**

Simplifie l'écriture de cette expression.

$$y \times \left( x + 7 \right)$$

**Réponse attendue** : $y \left( x + 7 \right)$

**Correction**

_Étape 1_

**Convention d'écriture.** On peut supprimer le signe $\times$ devant une lettre ou une parenthèse ; le nombre s’écrit alors en premier.

_Étape 2_

Le signe $\textcolor{#FF5722}{\times}$ est devant une parenthèse : on le supprime.

_Étape 3_

$$
\begin{align} y \textcolor{#FF5722}{\times} \left( x + 7 \right) &= y(x+7) \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Simplifie l'écriture de cette expression.

$$7 \times \left( y + a \right)$$

**Réponse attendue** : $7 \left( y + a \right)$

**Correction**

_Étape 1_

**Convention d'écriture.** On peut supprimer le signe $\times$ devant une lettre ou une parenthèse ; le nombre s’écrit alors en premier.

_Étape 2_

Le signe $\textcolor{#FF5722}{\times}$ est devant une parenthèse : on le supprime.

_Étape 3_

$$
\begin{align} 7 \textcolor{#FF5722}{\times} \left( y + a \right) &= 7(y+a) \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Simplifie l'écriture de cette expression.

$$4 \times \left( b + 5 \right)$$

**Réponse attendue** : $4 \left( b + 5 \right)$

**Correction**

_Étape 1_

**Convention d'écriture.** On peut supprimer le signe $\times$ devant une lettre ou une parenthèse ; le nombre s’écrit alors en premier.

_Étape 2_

Le signe $\textcolor{#FF5722}{\times}$ est devant une parenthèse : on le supprime.

_Étape 3_

$$
\begin{align} 4 \textcolor{#FF5722}{\times} \left( b + 5 \right) &= 4(b+5) \end{align}
$$

---

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

#### Tirage 2 (variation 0)

**Énoncé**

Écris plus simplement cette expression littérale :

$$1 y$$

**Réponse attendue** : $y$

**Correction**

_Étape 1_

**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; multiplier par $0$ donne toujours $0$ ($0$ est absorbant).

_Étape 2_

$1 y$ signifie $\textcolor{#FF5722}{1} \times y$ : multiplier par $\textcolor{#FF5722}{1}$ ne change rien.

_Étape 3_

$$
\begin{align} 1y &= \textcolor{#FF5722}{1} \times y \\ &= y \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Écris plus simplement cette expression littérale :

$$0 b$$

**Réponse attendue** : $0$

**Correction**

_Étape 1_

**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; multiplier par $0$ donne toujours $0$ ($0$ est absorbant).

_Étape 2_

$0 b$ signifie $\textcolor{#FF5722}{0} \times b$ : multiplier par $\textcolor{#FF5722}{0}$ donne $0$, quelle que soit la valeur de $b$.

_Étape 3_

$$
\begin{align} 0b &= \textcolor{#FF5722}{0} \times b \\ &= 0 \end{align}
$$

---

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

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$\left| 9 \right|$$

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $\left| a \right| = a$ si $a \geq 0$, et $\left| a \right| = -a$ (son opposé) si $a < 0$.

_Étape 2_

$\textcolor{#FF5722}{9}$ est positif ou nul : sa valeur absolue est lui-même.

_Étape 3_

$$
\begin{align} {\left| \textcolor{#FF5722}{9} \right|} &= 9 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$\left| -6 \right|$$

**Réponse attendue** : $6$

**Correction**

_Étape 1_

**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $\left| a \right| = a$ si $a \geq 0$, et $\left| a \right| = -a$ (son opposé) si $a < 0$.

_Étape 2_

$\textcolor{#FF5722}{-6}$ est négatif : sa valeur absolue est son opposé, $-\left( \textcolor{#FF5722}{-6} \right) = 6$.

_Étape 3_

$$
\begin{align} {\left| \textcolor{#FF5722}{-6} \right|} &= 6 \end{align}
$$

---

## N-ABS — Calculer la valeur d'une valeur absolue

`d540f96e-6656-434f-bdbd-72347a2232a9` · 2 · niveau 5 · 6 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$\left| -\dfrac{7}{9} \right|$$

**Réponse attendue** : $\dfrac{7}{9}$

**Correction**

_Étape 1_

**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $\left| a \right| = a$ si $a \geq 0$, et $\left| a \right| = -a$ (son opposé) si $a < 0$.

_Étape 2_

$\textcolor{#FF5722}{-\dfrac{7}{9}}$ est négatif : sa valeur absolue est son opposé, $\dfrac{7}{9}$.

_Étape 3_

$$
\begin{align} {\left| \textcolor{#FF5722}{-\dfrac{7}{9}} \right|} &= \dfrac{7}{9} \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule.

$$\left| \sqrt{2} \right|$$

**Réponse attendue** : $\sqrt{2}$

**Correction**

_Étape 1_

**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $\left| a \right| = a$ si $a \geq 0$, et $\left| a \right| = -a$ (son opposé) si $a < 0$.

_Étape 2_

$\textcolor{#FF5722}{\sqrt{2}}$ est positif : sa valeur absolue est lui-même.

_Étape 3_

$$
\begin{align} {\left| \textcolor{#FF5722}{\sqrt{2}} \right|} &= \sqrt{2} \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Calcule.

$$\left| -\sqrt{5} \right|$$

**Réponse attendue** : $\sqrt{5}$

**Correction**

_Étape 1_

**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $\left| a \right| = a$ si $a \geq 0$, et $\left| a \right| = -a$ (son opposé) si $a < 0$.

_Étape 2_

$\textcolor{#FF5722}{-\sqrt{5}}$ est négatif : sa valeur absolue est son opposé, $\sqrt{5}$.

_Étape 3_

$$
\begin{align} {\left| \textcolor{#FF5722}{-\sqrt{5}} \right|} &= \sqrt{5} \end{align}
$$

---

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

#### Tirage 2 (variation 2)

**Énoncé**

Calcule.

$$\left( \dfrac{19}{4} \right)^{-1}$$

**Réponse attendue** : $\frac{4}{19}$

**Correction**

_Étape 1_

**Exposant négatif.** Pour $a \neq 0$ : $a^{-n} = \dfrac{1}{a^n}$. En particulier, $a^{-1} = \dfrac{1}{a}$ est l’inverse de $a$.

_Étape 2_

$\left( \dfrac{19}{4} \right)^{-1}$ est l’inverse de $\dfrac{19}{4}$ : on échange le numérateur et le dénominateur.

_Étape 3_

$$
\begin{align} \left( \dfrac{\textcolor{#FF5722}{19}}{\textcolor{#2196F3}{4}} \right)^{-1} &= \dfrac{1}{\dfrac{\textcolor{#FF5722}{19}}{\textcolor{#2196F3}{4}}} \\ &= \frac{4}{19} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$5^{-1}$$

**Réponse attendue** : $\frac{1}{5}$

**Correction**

_Étape 1_

**Exposant négatif.** Pour $a \neq 0$ : $a^{-n} = \dfrac{1}{a^n}$. En particulier, $a^{-1} = \dfrac{1}{a}$ est l’inverse de $a$.

_Étape 2_

$\textcolor{#FF5722}{5}^{-1}$ est l’inverse de $\textcolor{#FF5722}{5}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{5}^{-1} &= \frac{1}{5} \end{align}
$$

---

## N-PUISS-NEG — Définition d'une puissance à exposant négatif

`15368b02-73cc-4f0d-b978-fa0d0848eb03` · 4 · niveau 3 · 1 variation(s) · correction rédigée

- Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).

#### Tirage 1 (variation 0)

**Énoncé**

Écris la définition de cette puissance.

$$6^{-9}$$

**Réponse attendue** : $\dfrac{1}{6^{9}}$

**Correction**

_Étape 1_

**Exposant négatif.** Pour $a \neq 0$ : $a^{-n} = \dfrac{1}{a^n}$. En particulier, $a^{-1} = \dfrac{1}{a}$ est l’inverse de $a$.

_Étape 2_

L’exposant $\textcolor{#FF5722}{-9}$ est négatif : $6^{\textcolor{#FF5722}{-9}}$ est l’inverse de $6^{\textcolor{#2196F3}{9}}$.

_Étape 3_

$$
\begin{align} 6^{\textcolor{#FF5722}{-9}} &= \dfrac{1}{6^{9}} \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Écris la définition de cette puissance.

$$10^{-3}$$

**Réponse attendue** : $\dfrac{1}{10^{3}}$

**Correction**

_Étape 1_

**Exposant négatif.** Pour $a \neq 0$ : $a^{-n} = \dfrac{1}{a^n}$. En particulier, $a^{-1} = \dfrac{1}{a}$ est l’inverse de $a$.

_Étape 2_

L’exposant $\textcolor{#FF5722}{-3}$ est négatif : $10^{\textcolor{#FF5722}{-3}}$ est l’inverse de $10^{\textcolor{#2196F3}{3}}$.

_Étape 3_

$$
\begin{align} 10^{\textcolor{#FF5722}{-3}} &= \dfrac{1}{10^{3}} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris la définition de cette puissance.

$$c^{-2}$$

**Réponse attendue** : $\dfrac{1}{c^{2}}$

**Correction**

_Étape 1_

**Exposant négatif.** Pour $a \neq 0$ : $a^{-n} = \dfrac{1}{a^n}$. En particulier, $a^{-1} = \dfrac{1}{a}$ est l’inverse de $a$.

_Étape 2_

L’exposant $\textcolor{#FF5722}{-2}$ est négatif : $c^{\textcolor{#FF5722}{-2}}$ est l’inverse de $c^{\textcolor{#2196F3}{2}}$.

_Étape 3_

$$
\begin{align} c^{\textcolor{#FF5722}{-2}} &= \dfrac{1}{c^{2}} \end{align}
$$

---

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

#### Tirage 2 (variation 0)

**Énoncé**

Écris ce nombre sous la forme d'un seul nombre entier.

$$3 \times 10^5$$

**Réponse attendue** : $300000$

**Correction**

_Étape 1_

**Puissances de $10$.** Pour $n \geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.

_Étape 2_

$10^{\textcolor{#FF5722}{5}}$ s’écrit $\textcolor{#2196F3}{100000}$ ($1$ suivi de $\textcolor{#FF5722}{5}$ zéros) ; on multiplie ensuite par $3$.

_Étape 3_

$$
\begin{align} 3 \times 10^{\textcolor{#FF5722}{5}} &= 3 \times \textcolor{#2196F3}{100000} \\ &= 300000 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris ce nombre sous la forme d'un seul nombre entier.

$$2 \times 10^1$$

**Réponse attendue** : $20$

**Correction**

_Étape 1_

**Puissances de $10$.** Pour $n \geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.

_Étape 2_

$10^{\textcolor{#FF5722}{1}}$ s’écrit $\textcolor{#2196F3}{10}$ ($1$ suivi de $\textcolor{#FF5722}{1}$ zéro) ; on multiplie ensuite par $2$.

_Étape 3_

$$
\begin{align} 2 \times 10^{\textcolor{#FF5722}{1}} &= 2 \times \textcolor{#2196F3}{10} \\ &= 20 \end{align}
$$

---

## N-PUISS10 — Écrire un nombre entier à l'aide d'une puissance de $10$

`ae8ad17a-39ad-486b-aea5-6d1a61f2a885` · 4 · niveau 3 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris ce nombre à l'aide d'une puissance de $10$.

Exemple : $400 = 4 \times 10^2$

$$90000$$

**Réponse attendue** : $9 \times 10^4$

**Correction**

_Étape 1_

**Puissances de $10$.** Pour $n \geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.

_Étape 2_

$90000$ s’écrit $9$ suivi de $\textcolor{#FF5722}{4}$ zéros : c’est $9$ fois $\textcolor{#2196F3}{10000}$, et $\textcolor{#2196F3}{10000} = 10^{\textcolor{#FF5722}{4}}$.

_Étape 3_

$$
\begin{align} 90000 &= 9 \times \textcolor{#2196F3}{10000} \\ &= 9*10^{4} \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Écris ce nombre à l'aide d'une puissance de $10$.

Exemple : $400 = 4 \times 10^2$

$$300000$$

**Réponse attendue** : $3 \times 10^5$

**Correction**

_Étape 1_

**Puissances de $10$.** Pour $n \geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.

_Étape 2_

$300000$ s’écrit $3$ suivi de $\textcolor{#FF5722}{5}$ zéros : c’est $3$ fois $\textcolor{#2196F3}{100000}$, et $\textcolor{#2196F3}{100000} = 10^{\textcolor{#FF5722}{5}}$.

_Étape 3_

$$
\begin{align} 300000 &= 3 \times \textcolor{#2196F3}{100000} \\ &= 3*10^{5} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris ce nombre à l'aide d'une puissance de $10$.

Exemple : $400 = 4 \times 10^2$

$$200$$

**Réponse attendue** : $2 \times 10^2$

**Correction**

_Étape 1_

**Puissances de $10$.** Pour $n \geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.

_Étape 2_

$200$ s’écrit $2$ suivi de $\textcolor{#FF5722}{2}$ zéros : c’est $2$ fois $\textcolor{#2196F3}{100}$, et $\textcolor{#2196F3}{100} = 10^{\textcolor{#FF5722}{2}}$.

_Étape 3_

$$
\begin{align} 200 &= 2 \times \textcolor{#2196F3}{100} \\ &= 2*10^{2} \end{align}
$$

---

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

#### Tirage 2 (variation 0)

**Énoncé**

Écris ce nombre en notation scientifique.

$$920$$

**Réponse attendue** : $9.2$ ; $2$

**Correction**

_Étape 1_

**Notation scientifique.** Un nombre s’écrit $a \times 10^n$ avec $1 \leq a < 10$ et $n$ entier relatif. Quand la virgule se déplace de $k$ rangs vers la droite, $n = -k$ ; vers la gauche, $n = k$.

_Étape 2_

Le premier chiffre non nul est $\textcolor{#FF5722}{9}$ : la virgule se place juste après lui, ce qui donne la mantisse $m = \textcolor{#FF5722}{9{,}2}$, comprise entre $1$ et $10$. La virgule s’est déplacée de $\textcolor{#2196F3}{2}$ rangs vers la gauche : l’exposant est $n = \textcolor{#4CAF50}{2}$.

_Étape 3_

$$
\begin{align} 920 &= \textcolor{#FF5722}{9{,}2} \times \textcolor{#2196F3}{100} \\ &= \textcolor{#FF5722}{9{,}2} \times 10^{\textcolor{#4CAF50}{2}} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris ce nombre en notation scientifique.

$$0.025$$

**Réponse attendue** : $2.5$ ; $-2$

**Correction**

_Étape 1_

**Notation scientifique.** Un nombre s’écrit $a \times 10^n$ avec $1 \leq a < 10$ et $n$ entier relatif. Quand la virgule se déplace de $k$ rangs vers la droite, $n = -k$ ; vers la gauche, $n = k$.

_Étape 2_

Le premier chiffre non nul est $\textcolor{#FF5722}{2}$ : la virgule se place juste après lui, ce qui donne la mantisse $m = \textcolor{#FF5722}{2{,}5}$, comprise entre $1$ et $10$. La virgule s’est déplacée de $\textcolor{#2196F3}{2}$ rangs vers la droite : l’exposant est $n = \textcolor{#4CAF50}{-2}$.

_Étape 3_

$$
\begin{align} 0.025 &= \textcolor{#FF5722}{2{,}5} \times \textcolor{#2196F3}{\dfrac{1}{100}} \\ &= \textcolor{#FF5722}{2{,}5} \times 10^{\textcolor{#4CAF50}{-2}} \end{align}
$$

---

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

#### Tirage 2 (variation 2)

**Énoncé**

Quel est le tableau de signe correspondant à la fonction affine :

$$f\left( x \right) = -5 x + 9$$

**Réponse attendue** : ![Choice 1](fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-2-600.png)

**Correction**

_Étape 1_

**Signe de $a x + b$.** La fonction s’annule en $x_0 = -\dfrac{b}{a}$. À droite de $x_0$, $a x + b$ a le signe de $a$ ; à gauche, le signe contraire.

_Étape 2_

Ici $a = \textcolor{#FF5722}{-5}$ est négatif et $f$ s’annule en $x_0 = \textcolor{#2196F3}{\dfrac{9}{5}}$. À droite de $\textcolor{#2196F3}{\dfrac{9}{5}}$, $f\left( x \right)$ est $\textcolor{#4CAF50}{\text{négative}}$ ; à gauche, $\textcolor{#4CAF50}{\text{positive}}$.

_Étape 3_

Le bon tableau est donc :

![Choice 1](fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-2-600.png)

#### Tirage 3 (variation 3)

**Énoncé**

Quel est le tableau de signe correspondant à la fonction affine :

$$f\left( x \right) = 3 x + 3$$

**Réponse attendue** : ![Choice 1](fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-3-600.png)

**Correction**

_Étape 1_

**Signe de $a x + b$.** La fonction s’annule en $x_0 = -\dfrac{b}{a}$. À droite de $x_0$, $a x + b$ a le signe de $a$ ; à gauche, le signe contraire.

_Étape 2_

Ici $a = \textcolor{#FF5722}{3}$ est positif et $f$ s’annule en $x_0 = \textcolor{#2196F3}{-1}$. À droite de $\textcolor{#2196F3}{-1}$, $f\left( x \right)$ est $\textcolor{#4CAF50}{\text{positive}}$ ; à gauche, $\textcolor{#4CAF50}{\text{négative}}$.

_Étape 3_

Le bon tableau est donc :

![Choice 1](fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-3-600.png)

---

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

#### Tirage 2 (variation 2)

**Énoncé**

Dans la fonction affine $f\left( x \right) = 2 + 9 x$, comment s'appelle le nombre $9$ ?

**Réponse attendue** : le coefficient directeur

**Correction**

_Étape 1_

**Vocabulaire.** Dans $f\left( x \right) = a x + b$, le nombre $a$ qui multiplie $x$ est le coefficient directeur ; le nombre $b$ seul est l’ordonnée à l’origine (la valeur de $f\left( 0 \right)$).

_Étape 2_

Le nombre $\textcolor{#FF5722}{9}$ multiplie $x$ (même écrit en second) : c’est $\textcolor{#4CAF50}{\text{le coefficient directeur}}$.

#### Tirage 3 (variation 3)

**Énoncé**

Dans la fonction affine $f\left( x \right) = 1 - 6 x$, comment s'appelle le nombre $1$ ?

**Réponse attendue** : l'ordonnée à l'origine

**Correction**

_Étape 1_

**Vocabulaire.** Dans $f\left( x \right) = a x + b$, le nombre $a$ qui multiplie $x$ est le coefficient directeur ; le nombre $b$ seul est l’ordonnée à l’origine (la valeur de $f\left( 0 \right)$).

_Étape 2_

Le nombre $\textcolor{#FF5722}{1}$ est seul (même écrit en premier), il ne multiplie pas $x$ : c’est $\textcolor{#4CAF50}{\text{l'ordonnée à l'origine}}$.

---

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

#### Tirage 2 (variation 2)

**Énoncé**

Détermine le résultat de cette opération sur les limites.

$$\dfrac{-\infty}{-\infty}$$

**Réponse attendue** : Forme indéterminée

**Correction**

_Étape 1_

**Quotient de deux limites infinies.** $\dfrac{\infty}{\infty}$ est une forme indéterminée : on ne peut pas conclure sans transformer l’expression.

_Étape 2_

C’est une $\textcolor{#4CAF50}{\text{forme indéterminée}}$.

_Étape 3_

Réponse : Forme indéterminée

#### Tirage 3 (variation 3)

**Énoncé**

Détermine le résultat de cette opération sur les limites.

$$\dfrac{-\infty}{+\infty}$$

**Réponse attendue** : Forme indéterminée

**Correction**

_Étape 1_

**Quotient de deux limites infinies.** $\dfrac{\infty}{\infty}$ est une forme indéterminée : on ne peut pas conclure sans transformer l’expression.

_Étape 2_

C’est une $\textcolor{#4CAF50}{\text{forme indéterminée}}$.

_Étape 3_

Réponse : Forme indéterminée

---
