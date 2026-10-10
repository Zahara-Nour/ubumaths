# Vague 2 — un exemple rendu par code

> Premier tirage de `APERCU.md` (lots `vague2-brouillons` et `vague2-publies`), un modèle par code. Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion ; réponse finale en noir.

Codes sans correction dans cette vague (le vérificateur ne peut pas les valider) : N-POSITION (8), N-ENCADR (4), N-DIVISEUR (1), N-GRADUATION (1), et le trou double de N-DIVEUCL `14a51794`. Détail : rapport de la vague.

## R-X10 — Calculer un produit d'entiers

`8390762c-b72d-4449-a8cc-5322e5bd77a4` · lot `vague2-publies` · CM1 · niveau 3 · 1 variation(s) · correction rédigée

**Énoncé**

Calcule.

$$71 \times 1000$$

**Réponse attendue** : $71000$

**Correction**

_Étape 1_

**Multiplier par $10$, $100$, $1000$.** Multiplier par $10$ rend chaque chiffre $10$ fois plus grand : dans le tableau de numération, chaque chiffre glisse d'un rang vers la gauche. Par $100$, il glisse de deux rangs ; par $1000$, de trois rangs. Les rangs restés vides jusqu'aux unités reçoivent un $0$.

_Étape 2_

Le premier chiffre de $71$, $\textcolor{#FF5722}{7}$, est au rang des dizaines. Il glisse de trois rangs vers la gauche : il arrive au rang des $\textcolor{#2196F3}{\text{dizaines de milliers}}$.

_Étape 3_

$$
\begin{align} 71 \times 1000 &= 71000 \end{align}
$$

---

## N-COMPARER-ENT — Comparer deux nombres entiers

`943151d0-0af5-46f0-bce8-e4acbd5f1029` · lot `vague2-publies` · CP · niveau 1 · 1 variation(s) · correction rédigée

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$79$$

**Correction**

_Étape 1_

**Comparer deux entiers.** Le nombre qui a le moins de chiffres est le plus petit. S'ils ont autant de chiffres, on les compare chiffre par chiffre depuis la gauche : le premier chiffre différent décide.

_Étape 2_

Les deux nombres ont le même nombre de chiffres. Au rang des $\textcolor{#2196F3}{\text{dizaines}}$, $79$ a $\textcolor{#FF5722}{7}$ et $96$ a $\textcolor{#FF5722}{9}$ : $\textcolor{#4CAF50}{79} < 96$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
79
$$

---

## N-ESPACES — Ecrire un grand nombre entier avec des espaces

`906252f8-0104-4c9f-9eb9-3f70d80d7045` · lot `vague2-publies` · CE2 · niveau 5 · 1 variation(s) · correction rédigée

**Énoncé**

Réécris en espaçant correctement les chiffres.

$$\square$$

**Réponse attendue** : $7388$

**Correction**

_Étape 1_

**Écrire un grand nombre.** On sépare les chiffres par groupes de trois **en partant de la droite** (des unités) : classe des unités, classe des milliers, classe des millions, classe des milliards. Le groupe de gauche peut avoir un, deux ou trois chiffres.

_Étape 2_

On part du chiffre des unités de $7388$ et on compte les chiffres trois par trois vers la gauche ; on laisse un espace entre deux groupes.

_Étape 3_

$$
\begin{align} 7388 &= 7\,\textcolor{#FF5722}{388} \end{align}
$$

---

## N-ZEROS — Ecrire un grand nombre entier sans les zéros inutiles

`cda36cc2-7d9c-4340-99f0-143467c83786` · lot `vague2-publies` · CM1 · niveau 7 · 3 variation(s) · correction rédigée

**Énoncé**

Réécris ce nombre entier en enlevant les zéros inutiles.

$$\square$$

**Réponse attendue** : $79960$

**Correction**

_Étape 1_

**Zéros inutiles.** Dans un nombre entier, les zéros écrits **à gauche** du premier chiffre non nul ne servent à rien : on les enlève. Les autres zéros (au milieu ou à droite) donnent le rang des chiffres : on les garde.

_Étape 2_

Les deux zéros $\textcolor{#2196F3}{00}$ écrits devant $\textcolor{#FF5722}{7}$ sont inutiles : on les enlève. Le zéro de droite reste : il donne le rang des autres chiffres.

_Étape 3_

$$
\begin{align} \textcolor{#2196F3}{00}\textcolor{#FF5722}{7}9960 &= 79960 \end{align}
$$

---

## N-DIVEUCL — Effectuer une division euclidienne

`15ed5af4-6f6b-4795-baf9-5037e801a532` · lot `vague2-publies` · CE2 · niveau 4 · 1 variation(s) · correction rédigée

**Énoncé**

Écris l'égalité correspondant à la division euclidienne de $79$ par $10$.

$$79 = \square$$

**Réponse attendue** : $\left( 7 \times 10 \right) + 9$

**Correction**

_Étape 1_

**Division euclidienne.** Diviser $N$ par $b$, c’est trouver le quotient $q$ et le reste $r$ tels que $N = \left( q \times b \right) + r$, avec un reste plus petit que $b$. Le quotient est le plus grand nombre de fois que $b$ « tient » dans $N$.

_Étape 2_

On cherche $79$ dans la table de $10$ : $\textcolor{#FF5722}{7} \times 10 = 70$ ne dépasse pas $79$, mais $8 \times 10 = 80$ le dépasse. Le quotient est $\textcolor{#FF5722}{7}$. Le reste est $79 - 70 = \textcolor{#2196F3}{9}$, plus petit que $10$.

_Étape 3_

$$
\begin{align} ? &= 79 \\ &= \left( \textcolor{#FF5722}{7} \times 10 \right) + \textcolor{#2196F3}{9} \end{align}
$$

---

## R-DEC-RANG — Calculer une somme

`3bbe92f2-84f0-487f-9ca1-2077248a313b` · lot `vague2-brouillons` · CM1 · niveau 1 · 1 variation(s) · correction rédigée

**Énoncé**

Calcule.

$$6.8 + 2.1$$

**Réponse attendue** : $8.9$

**Correction**

_Étape 1_

**Additionner des décimaux.** On additionne rang par rang : les unités avec les unités, les dixièmes avec les dixièmes, les centièmes avec les centièmes. $10$ dixièmes font $1$ unité.

_Étape 2_

Unités : $\textcolor{#FF5722}{6} + \textcolor{#FF5722}{2} = 8$. Dixièmes : $\textcolor{#FF5722}{8} + \textcolor{#FF5722}{1} = 9$ dixièmes.

_Étape 3_

$$
\begin{align} 6.8 + 2.1 &= \left( \textcolor{#FF5722}{6} + \textcolor{#FF5722}{2} \right) + \left( \textcolor{#FF5722}{0.8} + \textcolor{#FF5722}{0.1} \right) \\ &= 8 + \textcolor{#2196F3}{0.9} \\ &= 8.9 \end{align}
$$

---

## N-COMPARER-DEC — Comparer deux nombres décimaux

`9c0c47ef-72b0-4333-870d-06cdf0f4a2de` · lot `vague2-brouillons` · CM1 · niveau 2 · 2 variation(s) · correction rédigée

**Énoncé**

Quel est le plus petit de ces deux nombres ?

**Réponse attendue** : $$82.1$$

**Correction**

_Étape 1_

**Comparer deux décimaux.** On compare d’abord les parties entières. Si elles sont égales, on compare les dixièmes, puis les centièmes… Un rang sans chiffre compte pour $0$ (on peut compléter par des zéros : $2.3 = 2.30$).

_Étape 2_

Les parties entières sont égales ($82$). On compare les $\textcolor{#2196F3}{\text{dixièmes}}$ : $82.1$ en a $\textcolor{#FF5722}{1}$, $82.67$ en a $\textcolor{#FF5722}{6}$ : $\textcolor{#4CAF50}{82.1} < 82.67$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
82.1
$$

---
