# Clôture (modèles publiés) — un exemple rendu par code

Premier tirage de l'aperçu (`APERCU.md` de `cloture-publies`), un modèle par code. Ces 15 modèles sont
`published` : un import toucherait des modèles visibles des élèves (feu vert de David requis).
Contrôles structurels déclarés par modèle : `scripts/corrections/lots/cloture.ts` (`checks`),
définis dans `scripts/corrections/lib/verify.ts` (`StructuralChecks`).

## R-QUAD — Trouver le quadruple

`56b2737d-f208-4b46-a4af-80ba3a4d8c03` · CE2 · niveau 2 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Quel est le quadruple de $40$ ?

Le quadruple de $40$ est $\square$.

**Réponse attendue** : $160$

**Correction**

_Étape 1_

**Quadruple.** Le quadruple, c’est $4$ fois le nombre : le double du double.

_Étape 2_

Le double de $\textcolor{#FF5722}{40}$ est $\textcolor{#2196F3}{80}$, puis on double encore.

_Étape 3_

$$
\begin{align} 4 \times \textcolor{#FF5722}{40} &= 2 \times \left( 2 \times \textcolor{#FF5722}{40} \right) \\ &= 2 \times \textcolor{#2196F3}{80} \\ &= 160 \end{align}
$$

## R-DOUBLE — Trouver le double

`022130ca-f6c1-4c78-a147-6519a15f62cd` · CE1 · niveau 4 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Quel est le double de $40$ ?

Le double de $40$ est $\square$.

**Réponse attendue** : $80$

**Correction**

_Étape 1_

**Double.** Pour doubler un nombre, on double ses dizaines, puis ses unités, et on ajoute.

_Étape 2_

$$
\begin{align} 2 \times \textcolor{#FF5722}{40} &= 2 \times 4 \times 10 \\ &= \textcolor{#2196F3}{8} \times 10 \\ &= 80 \end{align}
$$

## R-DIV-DIZ — Combien de fois ... dans ....

`4ee04b22-c7c3-42a7-8cbf-26022ffbbc28` · CM1 · niveau 14 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Dans $630$, combien de fois $9$ ?

On peut mettre $\square$ fois $9$.

**Réponse attendue** : $70$

**Correction**

_Étape 1_

**Diviser des dizaines.** On compte en dizaines, on divise avec la table, puis on revient aux unités.

_Étape 2_

$\textcolor{#FF5722}{630}$, c’est $\textcolor{#FF5722}{63}$ dizaines ; $\textcolor{#FF5722}{63} : 9 = \textcolor{#2196F3}{7}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{630} : 9 &= \left( \textcolor{#FF5722}{63} : 9 \right) \times 10 \\ &= \textcolor{#2196F3}{7} \times 10 \\ &= 70 \end{align}
$$

## R-COMPL — Trouver le complément

`17a3c039-744d-4108-9b47-49f0183990b7` · CM1 · niveau 10 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Combien faut-il ajouter à $2100$ pour obtenir $10\,000$ ?

Il faut ajouter $\square$.

**Réponse attendue** : $7900$

**Correction**

_Étape 1_

**Compléter.** On avance par bonds : jusqu’au millier suivant, puis jusqu’à $10\,000$.

_Étape 2_

De $\textcolor{#FF5722}{2100}$ à $\textcolor{#2196F3}{3000}$, il faut $\textcolor{#2196F3}{900}$ ; de $\textcolor{#2196F3}{3000}$ à $10\,000$, il faut $\textcolor{#2196F3}{7000}$.

_Étape 3_

$$
\begin{align} 10\,000 - \textcolor{#FF5722}{2100} &= \textcolor{#2196F3}{900} + \textcolor{#2196F3}{7000} \\ &= 7900 \end{align}
$$

## N-POSITION — Connaître la position décimale

`5bd4b19a-0416-4fcf-b55a-59f4ceb733e3` · CP · niveau 1 · 2 variation(s) · correction rédigée

- Contrôle déclaré `digit` : le tableau relit le nombre, la colonne du rang porte la réponse.

#### Tirage 1 (variation 1)

**Énoncé**

Dans le nombre $79$, le chiffre des **unités** est $\square$.

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|} \text{dizaines} & \text{unités} \\ 7 & \textcolor{#FF5722}{9} \end{array}
$$

_Étape 3_

Le chiffre des unités est $\textcolor{#4CAF50}{9}$.

## N-DIVEUCL — Compléter l'égalité d'une division euclidienne

`14a51794-8825-4297-9858-083fad48ab8c` · CE2 · niveau 3 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Complète l'égalité de la division euclidienne de $76$ par $7$ :

$$76 = \left( 7 \times \square \right) + \square$$

**Réponse attendue** : $10$ ; $6$

**Correction**

_Étape 1_

**Division euclidienne.** $a = b \times q + r$ avec $0 \leq r < b$ : $q$ est le quotient, $r$ le reste.

_Étape 2_

Dans la table de $\textcolor{#FF5722}{7}$, le plus grand multiple qui ne dépasse pas $\;76$ est $\textcolor{#FF5722}{7} \times \textcolor{#2196F3}{10}$ : le quotient est $q = \textcolor{#2196F3}{10}$.

_Étape 3_

$$
\begin{align} 76 - \textcolor{#FF5722}{7} \times \textcolor{#2196F3}{10} &= 76 - 70 \\ &= 6 \end{align}
$$

_Étape 4_

Le reste est $\textcolor{#4CAF50}{6}$ (il est bien plus petit que $\;7$) :

$$
\;76 = \left( 7 \times 10 \right) + 6
$$

## N-DIVISEUR — Trouver un diviseur

`bd21a9d7-142a-47a0-be18-7719b58934ea` · CE2 · niveau 1 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Trouve un diviseur de $63$ (autre que $1$ et $63$), sachant que :

$$63 = 7 \times 9$$

Un diviseur est $\square$.

**Réponse attendue** : $7$

**Correction**

_Étape 1_

**Diviseur.** Si $n = a \times b$, alors $a$ et $b$ sont des diviseurs de $n$.

_Étape 2_

$$
\begin{align} 63 &= \textcolor{#FF5722}{7} \times 9 \end{align}
$$

_Étape 3_

Donc $\textcolor{#FF5722}{7}$ est un diviseur de $\;63$ (et $\;9$ aussi) : un diviseur est $\textcolor{#4CAF50}{7}$.

## N-VOCAB-OP — Traduire une phrase en expression mathématique

`5d515eb1-c8f8-4678-b4bd-f9ab3f34713f` · 6 · niveau 1 · 4 variation(s) · correction rédigée

- Contrôle déclaré `written` : la conclusion écrit la réponse telle quelle.

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
