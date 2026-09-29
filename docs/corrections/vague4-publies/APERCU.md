# Aperçu des corrections — lot « vague4-publies »

> Vague 4, modèles publiés (N-NEUTRE-ABS, N-VOCAB-OP). Généré par `pnpm corrections:preview vague4-publies` : ne pas éditer à la main (éditer la proposition `<id>.json` ou le lot, puis régénérer). Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion (cf. docs/ref/corrections-redaction.md).

- N-NEUTRE-ABS — Compléter une multiplication à trou `1af7263e`
- N-VOCAB-OP — Traduire une phrase en expression mathématique `5d515eb1`
- N-VOCAB-OP — Traduire une phrase en expression mathématique `78feafed`

## N-NEUTRE-ABS — Compléter une multiplication à trou

`1af7263e-bb3a-4e81-8503-a08b7c31db25` · CM1 · niveau 16 · 2 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète.

$$\square \times 25 = 75$$

**Réponse attendue** : $3$

**Correction**

_Étape 1_

**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; multiplier par $0$ donne toujours $0$ ($0$ est absorbant).

_Étape 2_

Le produit $\textcolor{#2196F3}{75}$ n’est égal ni à $0$ ni à $25$ : on cherche combien de fois $25$ il contient, par une division.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#2196F3}{75} : 25 \\ &= 3 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Complète.

$$\square \times 50 = 200$$

**Réponse attendue** : $4$

**Correction**

_Étape 1_

**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; multiplier par $0$ donne toujours $0$ ($0$ est absorbant).

_Étape 2_

Le produit $\textcolor{#2196F3}{200}$ n’est égal ni à $0$ ni à $50$ : on cherche combien de fois $50$ il contient, par une division.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#2196F3}{200} : 50 \\ &= 4 \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Complète.

$$\square \times 25 = 25$$

**Réponse attendue** : $1$

**Correction**

_Étape 1_

**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; multiplier par $0$ donne toujours $0$ ($0$ est absorbant).

_Étape 2_

Le produit $\textcolor{#2196F3}{25}$ est égal à $25$ : on a multiplié par $\textcolor{#4CAF50}{1}$, l’élément neutre.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#2196F3}{25} : 25 \\ &= 1 \end{align}
$$

---

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

#### Tirage 2 (variation 2)

**Énoncé**

Traduis cette phrase par une expression mathématique : la différence entre $9$ et $3$

L'expression est $\square$.

**Réponse attendue** : $9 - 3$

**Correction**

_Étape 1_

**Vocabulaire.** Une somme est le résultat d’une addition, une différence celui d’une soustraction, un produit celui d’une multiplication, un quotient celui d’une division.

_Étape 2_

Une différence est le résultat d’une soustraction : on écrit les deux nombres dans l’ordre de la phrase.

_Étape 3_

L’expression est $9 - 3$.

#### Tirage 3 (variation 3)

**Énoncé**

Traduis cette phrase par une expression mathématique : le quotient de $4$ par $2$

L'expression est $\square$.

**Réponse attendue** : $4 : 2$

**Correction**

_Étape 1_

**Vocabulaire.** Une somme est le résultat d’une addition, une différence celui d’une soustraction, un produit celui d’une multiplication, un quotient celui d’une division.

_Étape 2_

Un quotient est le résultat d’une division : on écrit les deux nombres dans l’ordre de la phrase.

_Étape 3_

L’expression est $4 : 2$.

---

## N-VOCAB-OP — Traduire une phrase en expression mathématique

`78feafed-650f-44e0-a2c3-1e677809722b` · 5 · niveau 2 · 4 variation(s) · correction rédigée

- ⚑ Vérificateur : ni variable d’expression ni bloc `$$…$$` dans l’énoncé (phrase à traduire) : point de départ invérifiable → rouge.

#### Tirage 1 (variation 1)

**Énoncé**

Traduis cette phrase par une expression mathématique : le produit de $7$ par la différence entre $9$ et $8$

L'expression est $\square$.

**Réponse attendue** : $7 \times \left( 9 - 8 \right)$

**Correction**

_Étape 1_

**Vocabulaire.** Somme ($+$), différence ($-$), produit ($\times$), quotient ($:$). L’opération nommée EN PREMIER dans la phrase est la DERNIÈRE effectuée.

_Étape 2_

La phrase commence par \textcolor{#2196F3}{« le produit »} : la dernière opération est une multiplication. Son second facteur est la différence $\textcolor{#FF5722}{9 - 8}$, à calculer AVANT : on la met entre parenthèses.

_Étape 3_

L’expression est $7 \times \left( 9 - 8 \right)$.

#### Tirage 2 (variation 2)

**Énoncé**

Traduis cette phrase par une expression mathématique : la différence entre $9$ et le quotient de $4$ par $2$

L'expression est $\square$.

**Réponse attendue** : $9 - 4 : 2$

**Correction**

_Étape 1_

**Vocabulaire.** Somme ($+$), différence ($-$), produit ($\times$), quotient ($:$). L’opération nommée EN PREMIER dans la phrase est la DERNIÈRE effectuée.

_Étape 2_

La phrase commence par \textcolor{#2196F3}{« la différence »} : la dernière opération est une soustraction. Son second terme est le quotient $\textcolor{#FF5722}{4 : 2}$ ; la division est prioritaire : pas de parenthèses.

_Étape 3_

L’expression est $9 - 4 : 2$.

#### Tirage 3 (variation 3)

**Énoncé**

Traduis cette phrase par une expression mathématique : le quotient de la somme de $3$ et de $2$ par $4$

L'expression est $\square$.

**Réponse attendue** : $\left( 3 + 2 \right) : 4$

**Correction**

_Étape 1_

**Vocabulaire.** Somme ($+$), différence ($-$), produit ($\times$), quotient ($:$). L’opération nommée EN PREMIER dans la phrase est la DERNIÈRE effectuée.

_Étape 2_

La phrase commence par \textcolor{#2196F3}{« le quotient »} : la dernière opération est une division. Son dividende est la somme $\textcolor{#FF5722}{3 + 2}$, à calculer AVANT : on la met entre parenthèses.

_Étape 3_

L’expression est $\left( 3 + 2 \right) : 4$.

---
