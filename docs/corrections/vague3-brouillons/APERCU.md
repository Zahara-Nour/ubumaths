# Aperçu des corrections — lot « vague3-brouillons »

> Vague 3 (modèles draft) : relatifs + / − (dont trous), comparaison, définition, fractions, unités, pourcentages. Généré par `pnpm corrections:preview vague3-brouillons` : ne pas éditer à la main (éditer la proposition `<id>.json` ou le lot, puis régénérer). Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion (cf. docs/ref/corrections-redaction.md).

- N-REL-ADD — Ajouter $1$ ou $2$ à un nombre négatif `fd2c3e4b`
- N-REL-ADD — Ajouter deux nombres négatifs `31144f5f`
- N-REL-ADD — Calculer `0a34e472`
- N-REL-ADD — Calculer une somme `32469cec`
- N-REL-ADD — Calculer une somme ou une différence `db4f1dde`
- N-REL-ADD — Calculer une somme ou une différence `347eb0d0`
- N-REL-ADD — Calculer une somme ou une différence `5b53b1be`
- N-REL-ADD — Enlever $1$ ou $2$ à un nombre négatif `a7ba721b`
- N-REL-ADD — Compléter une addition à trou `24331791`
- N-REL-ADD — Compléter une addition à trou `84755a7b`
- N-REL-ADD — Compléter une égalité `b1550840`
- N-REL-ADD — Compléter une somme `372d4f79`
- N-OPPOSES — Ajouter $2$ nombres opposés `b896b6ce`
- N-REL-ALG — Calculer une somme algébrique `abc5d417`
- N-REL-SUB — Soustraire (cas général) `1d41e370`
- N-REL-SUB — Simplifier l'écriture `8c7942e4`
- N-REL-SUB — Transformer une soustraction en addition `1b866448`
- N-COMPARER-REL — Comparer deux nombres relatifs. `e0b6d00a`
- N-COMPARER-REL — Comparer deux nombres relatifs. `12e27dba`
- N-REL-DEF — Nombre négatif défini par une soustraction `756bdbb7`
- N-REL-DEF — Une soustraction enfin possible `f7f22023`
- N-FRAC-MULT — Compléter une multiplication à trou `e8de8b81`
- N-FRAC-MULT — Compléter une multiplication à trou `23b29a15`
- N-FRAC-MULT — Calculer un produit `25b78a6f`
- N-POURCENT — Définition d'un pourcentage `62590cd3`
- N-POURCENT — Définition d'un pourcentage `8fd459da`

## N-REL-ADD — Ajouter $1$ ou $2$ à un nombre négatif

`fd2c3e4b-832a-4eda-87d8-cc61ab1c9c71` · 5 · niveau 1 · 2 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$\left( -7 \right) + 2$$

**Réponse attendue** : $-5$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}7$ et $2$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}7$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}7 \right) + 2 &= \textcolor{#4CAF50}{-}\left( 7 - 2 \right) \\ &= -5 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$\left( -9 \right) + 1$$

**Réponse attendue** : $-8$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}9$ et $1$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}9$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}9 \right) + 1 &= \textcolor{#4CAF50}{-}\left( 9 - 1 \right) \\ &= -8 \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Calcule.

$$\left( -4 \right) + 2$$

**Réponse attendue** : $-2$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}4$ et $2$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}4$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}4 \right) + 2 &= \textcolor{#4CAF50}{-}\left( 4 - 2 \right) \\ &= -2 \end{align}
$$

---

## N-REL-ADD — Ajouter deux nombres négatifs

`31144f5f-04e1-40d3-8972-871527d5669c` · 5 · niveau 4 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Calcule.

$$\left( -7 \right) + \left( -9 \right)$$

**Réponse attendue** : $-16$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}7$ et $\textcolor{#FF5722}{-}9$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}7 \right) + \left( \textcolor{#FF5722}{-}9 \right) &= \textcolor{#4CAF50}{-}\left( 7 + 9 \right) \\ &= -16 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$\left( -9 \right) + \left( -2 \right)$$

**Réponse attendue** : $-11$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}9$ et $\textcolor{#FF5722}{-}2$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}9 \right) + \left( \textcolor{#FF5722}{-}2 \right) &= \textcolor{#4CAF50}{-}\left( 9 + 2 \right) \\ &= -11 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$\left( -2 \right) + \left( -1 \right)$$

**Réponse attendue** : $-3$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}2$ et $\textcolor{#FF5722}{-}1$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}2 \right) + \left( \textcolor{#FF5722}{-}1 \right) &= \textcolor{#4CAF50}{-}\left( 2 + 1 \right) \\ &= -3 \end{align}
$$

---

## N-REL-ADD — Calculer

`0a34e472-b985-4faa-b4d6-c804e96aff29` · 5 · niveau 2 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$-7 - 9$$

**Réponse attendue** : $-16$

**Correction**

_Étape 1_

Soustraire $9$, c’est ajouter son opposé $\textcolor{#FF5722}{-}9$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$\textcolor{#FF5722}{-}7$ et $\textcolor{#FF5722}{-}9$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 4_

$$
\begin{align} \textcolor{#FF5722}{-}7 - 9 &= \textcolor{#FF5722}{-}7 + \left( \textcolor{#FF5722}{-}9 \right) \\ &= \textcolor{#4CAF50}{-}\left( 7 + 9 \right) \\ &= -16 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule.

$$2 - 9$$

**Réponse attendue** : $-7$

**Correction**

_Étape 1_

Soustraire $9$, c’est ajouter son opposé $\textcolor{#FF5722}{-}9$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$2$ et $\textcolor{#FF5722}{-}9$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}9$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 4_

$$
\begin{align} 2 - 9 &= 2 + \left( \textcolor{#FF5722}{-}9 \right) \\ &= \textcolor{#4CAF50}{-}\left( 9 - 2 \right) \\ &= -7 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$-3 + 2$$

**Réponse attendue** : $-1$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}3$ et $2$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}3$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{-}3 + 2 &= \textcolor{#4CAF50}{-}\left( 3 - 2 \right) \\ &= -1 \end{align}
$$

---

## N-REL-ADD — Calculer une somme

`32469cec-a95f-4a47-9672-870707027eba` · 5 · niveau 6 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$\left( -7 \right) + \left( -9 \right)$$

**Réponse attendue** : $-16$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}7$ et $\textcolor{#FF5722}{-}9$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}7 \right) + \left( \textcolor{#FF5722}{-}9 \right) &= \textcolor{#4CAF50}{-}\left( 7 + 9 \right) \\ &= -16 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule.

$$9 + \left( -3 \right)$$

**Réponse attendue** : $6$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$9$ et $\textcolor{#FF5722}{-}3$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $9$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{positif}}$. On soustrait les distances à zéro.

_Étape 3_

$$
\begin{align} 9 + \left( \textcolor{#FF5722}{-}3 \right) &= \textcolor{#4CAF50}{+}\left( 9 - 3 \right) \\ &= 6 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$\left( -3 \right) + 2$$

**Réponse attendue** : $-1$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

$\textcolor{#FF5722}{-}3$ et $2$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}3$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}3 \right) + 2 &= \textcolor{#4CAF50}{-}\left( 3 - 2 \right) \\ &= -1 \end{align}
$$

---

## N-REL-ADD — Calculer une somme ou une différence

`db4f1dde-503b-4fad-8b02-96a5124221d5` · 5 · niveau 1 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$\left( -3 \right) - 1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $-4$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $\textcolor{#FF5722}{-}3$ et on recule de $1$ graduation vers la gauche. On s’éloigne encore de zéro, du côté des négatifs : le résultat est $\textcolor{#4CAF50}{\text{négatif}}$, et sa distance à zéro est la somme des distances.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}3 \right) - 1 &= \textcolor{#4CAF50}{-}\left( 3 + 1 \right) \\ &= -4 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$3 - 4$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $-1$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $3$ et on recule de $4$ graduations vers la gauche. On recule de plus que $3$ : on dépasse zéro, le résultat est $\textcolor{#4CAF50}{\text{négatif}}$. Sa distance à zéro est l’écart $4 - 3$.

_Étape 3_

$$
\begin{align} 3 - 4 &= \textcolor{#4CAF50}{-}\left( 4 - 3 \right) \\ &= -1 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$\left( -1 \right) + 1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $0$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $\textcolor{#FF5722}{-}1$ et on avance de $1$ graduation vers la droite.

_Étape 3_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 4_

$\textcolor{#FF5722}{-}1$ et $1$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. Ils ont la même distance à zéro : ils sont opposés, leur somme est nulle.

_Étape 5_

$$
\begin{align} \left( \textcolor{#FF5722}{-}1 \right) + 1 &= 0 \end{align}
$$

---

## N-REL-ADD — Calculer une somme ou une différence

`347eb0d0-4607-4fdb-8f0f-2ecc42ff40b8` · 5 · niveau 2 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$\left( -5 \right) - 2$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--7-7-600.png)

**Réponse attendue** : $-7$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $\textcolor{#FF5722}{-}5$ et on recule de $2$ graduations vers la gauche. On s’éloigne encore de zéro, du côté des négatifs : le résultat est $\textcolor{#4CAF50}{\text{négatif}}$, et sa distance à zéro est la somme des distances.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}5 \right) - 2 &= \textcolor{#4CAF50}{-}\left( 5 + 2 \right) \\ &= -7 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$7 - 8$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--7-7-600.png)

**Réponse attendue** : $-1$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $7$ et on recule de $8$ graduations vers la gauche. On recule de plus que $7$ : on dépasse zéro, le résultat est $\textcolor{#4CAF50}{\text{négatif}}$. Sa distance à zéro est l’écart $8 - 7$.

_Étape 3_

$$
\begin{align} 7 - 8 &= \textcolor{#4CAF50}{-}\left( 8 - 7 \right) \\ &= -1 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$\left( -2 \right) + 1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--7-7-600.png)

**Réponse attendue** : $-1$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $\textcolor{#FF5722}{-}2$ et on avance de $1$ graduation vers la droite.

_Étape 3_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 4_

$\textcolor{#FF5722}{-}2$ et $1$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}2$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 5_

$$
\begin{align} \left( \textcolor{#FF5722}{-}2 \right) + 1 &= \textcolor{#4CAF50}{-}\left( 2 - 1 \right) \\ &= -1 \end{align}
$$

---

## N-REL-ADD — Calculer une somme ou une différence

`5b53b1be-f9e7-4fc1-bbeb-be84e180a4fd` · 5 · niveau 5 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$\left( -2.5 \right) - 1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $-3.5$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $\textcolor{#FF5722}{-}2.5$ et on recule de $1$ graduation vers la gauche. On s’éloigne encore de zéro, du côté des négatifs : le résultat est $\textcolor{#4CAF50}{\text{négatif}}$, et sa distance à zéro est la somme des distances.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}2.5 \right) - 1 &= \textcolor{#4CAF50}{-}\left( 2.5 + 1 \right) \\ &= -3.5 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$2.5 - 3$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $-0.5$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $2.5$ et on recule de $3$ graduations vers la gauche. On recule de plus que $2.5$ : on dépasse zéro, le résultat est $\textcolor{#4CAF50}{\text{négatif}}$. Sa distance à zéro est l’écart $3 - 2.5$.

_Étape 3_

$$
\begin{align} 2.5 - 3 &= \textcolor{#4CAF50}{-}\left( 3 - 2.5 \right) \\ &= -0.5 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule en t'aidant de la droite graduée.

$$\left( -1.5 \right) + 1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $-0.5$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, on part de $\textcolor{#FF5722}{-}1.5$ et on avance de $1$ graduation vers la droite.

_Étape 3_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 4_

$\textcolor{#FF5722}{-}1.5$ et $1$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $\textcolor{#FF5722}{-}1.5$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{négatif}}$. On soustrait les distances à zéro.

_Étape 5_

$$
\begin{align} \left( \textcolor{#FF5722}{-}1.5 \right) + 1 &= \textcolor{#4CAF50}{-}\left( 1.5 - 1 \right) \\ &= -0.5 \end{align}
$$

---

## N-REL-ADD — Enlever $1$ ou $2$ à un nombre négatif

`a7ba721b-0d9d-41e9-bff7-6a2369432e08` · 5 · niveau 1 · 2 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$\left( -5 \right) - 2$$

**Réponse attendue** : $-7$

**Correction**

_Étape 1_

Soustraire $2$, c’est ajouter son opposé $\textcolor{#FF5722}{-}2$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$\textcolor{#FF5722}{-}5$ et $\textcolor{#FF5722}{-}2$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 4_

$$
\begin{align} \left( \textcolor{#FF5722}{-}5 \right) - 2 &= \left( \textcolor{#FF5722}{-}5 \right) + \left( \textcolor{#FF5722}{-}2 \right) \\ &= \textcolor{#4CAF50}{-}\left( 5 + 2 \right) \\ &= -7 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$\left( -7 \right) - 1$$

**Réponse attendue** : $-8$

**Correction**

_Étape 1_

Soustraire $1$, c’est ajouter son opposé $\textcolor{#FF5722}{-}1$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$\textcolor{#FF5722}{-}7$ et $\textcolor{#FF5722}{-}1$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 4_

$$
\begin{align} \left( \textcolor{#FF5722}{-}7 \right) - 1 &= \left( \textcolor{#FF5722}{-}7 \right) + \left( \textcolor{#FF5722}{-}1 \right) \\ &= \textcolor{#4CAF50}{-}\left( 7 + 1 \right) \\ &= -8 \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Calcule.

$$\left( -2 \right) - 2$$

**Réponse attendue** : $-4$

**Correction**

_Étape 1_

Soustraire $2$, c’est ajouter son opposé $\textcolor{#FF5722}{-}2$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$\textcolor{#FF5722}{-}2$ et $\textcolor{#FF5722}{-}2$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 4_

$$
\begin{align} \left( \textcolor{#FF5722}{-}2 \right) - 2 &= \left( \textcolor{#FF5722}{-}2 \right) + \left( \textcolor{#FF5722}{-}2 \right) \\ &= \textcolor{#4CAF50}{-}\left( 2 + 2 \right) \\ &= -4 \end{align}
$$

---

## N-REL-ADD — Compléter une addition à trou

`24331791-3177-437f-bfc9-8e727e270293` · 5 · niveau 3 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète en t'aidant de la droite graduée.

$$\left( -3 \right) - \square = -4$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $1$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, pour aller de $\textcolor{#FF5722}{-}3$ à $\textcolor{#FF5722}{-}4$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est soustraire un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}3$ et $\textcolor{#FF5722}{-}4$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 4 - 3 \right) \\ &= 1 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète en t'aidant de la droite graduée.

$$3 - \square = -1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $4$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, pour aller de $3$ à $\textcolor{#FF5722}{-}1$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est soustraire un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $3$ et $\textcolor{#FF5722}{-}1$ : ils sont de part et d’autre de zéro, on additionne leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 3 + 1 \right) \\ &= 4 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Complète en t'aidant de la droite graduée.

$$\left( -1 \right) + \square = 0$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--4-4-600.png)

**Réponse attendue** : $1$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, pour aller de $\textcolor{#FF5722}{-}1$ à $0$, on $\textcolor{#2196F3}{\text{avance}}$ vers la droite : c’est ajouter un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}1$ et $0$ : l’un des deux est $0$, l’écart est la distance à zéro de l’autre.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 1 \right) \\ &= 1 \end{align}
$$

---

## N-REL-ADD — Compléter une addition à trou

`84755a7b-fe7d-4be7-b306-40d38dd07aef` · 5 · niveau 4 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète en t'aidant de la droite graduée.

$$\left( -5 \right) - \square = -7$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--7-7-600.png)

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, pour aller de $\textcolor{#FF5722}{-}5$ à $\textcolor{#FF5722}{-}7$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est soustraire un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}5$ et $\textcolor{#FF5722}{-}7$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 7 - 5 \right) \\ &= 2 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète en t'aidant de la droite graduée.

$$7 - \square = -1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--7-7-600.png)

**Réponse attendue** : $8$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, pour aller de $7$ à $\textcolor{#FF5722}{-}1$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est soustraire un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $7$ et $\textcolor{#FF5722}{-}1$ : ils sont de part et d’autre de zéro, on additionne leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 7 + 1 \right) \\ &= 8 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Complète en t'aidant de la droite graduée.

$$\left( -2 \right) + \square = -1$$

![Question image 1](relatifs/droite-graduee-operations/droite-graduee--7-7-600.png)

**Réponse attendue** : $1$

**Correction**

_Étape 1_

**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; soustraire un nombre positif, c’est reculer vers la gauche.

_Étape 2_

Sur la droite graduée, pour aller de $\textcolor{#FF5722}{-}2$ à $\textcolor{#FF5722}{-}1$, on $\textcolor{#2196F3}{\text{avance}}$ vers la droite : c’est ajouter un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}2$ et $\textcolor{#FF5722}{-}1$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 2 - 1 \right) \\ &= 1 \end{align}
$$

---

## N-REL-ADD — Compléter une égalité

`b1550840-5b8f-4a36-8581-5a8aa1267778` · 5 · niveau 3 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète.

$$-7 - \square = -16$$

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

Pour aller de $\textcolor{#FF5722}{-}7$ à $\textcolor{#FF5722}{-}16$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est soustraire un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}7$ et $\textcolor{#FF5722}{-}16$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 16 - 7 \right) \\ &= 9 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète.

$$2 - \square = -7$$

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

Pour aller de $2$ à $\textcolor{#FF5722}{-}7$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est soustraire un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $2$ et $\textcolor{#FF5722}{-}7$ : ils sont de part et d’autre de zéro, on additionne leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 2 + 7 \right) \\ &= 9 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Complète.

$$-3 + \square = -1$$

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

Pour aller de $\textcolor{#FF5722}{-}3$ à $\textcolor{#FF5722}{-}1$, on $\textcolor{#2196F3}{\text{avance}}$ vers la droite : c’est ajouter un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}3$ et $\textcolor{#FF5722}{-}1$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 3 - 1 \right) \\ &= 2 \end{align}
$$

---

## N-REL-ADD — Compléter une somme

`372d4f79-d0d9-4016-bd07-56fd782b5b95` · 5 · niveau 7 · 6 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète l'égalité avec le nombre manquant.

$$\left( -7 \right) + \square = -16$$

**Réponse attendue** : $-9$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

Pour aller de $\textcolor{#FF5722}{-}7$ à $\textcolor{#FF5722}{-}16$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est ajouter un nombre $\textcolor{#4CAF50}{\text{négatif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}7$ et $\textcolor{#FF5722}{-}16$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{-}\left( 16 - 7 \right) \\ &= -9 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète l'égalité avec le nombre manquant.

$$9 + \square = 6$$

**Réponse attendue** : $-3$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

Pour aller de $9$ à $6$, on $\textcolor{#2196F3}{\text{recule}}$ vers la gauche : c’est ajouter un nombre $\textcolor{#4CAF50}{\text{négatif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $9$ et $6$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{-}\left( 9 - 6 \right) \\ &= -3 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Complète l'égalité avec le nombre manquant.

$$\square + \left( -3 \right) = -1$$

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 2_

Pour aller de $\textcolor{#FF5722}{-}3$ à $\textcolor{#FF5722}{-}1$, on $\textcolor{#2196F3}{\text{avance}}$ vers la droite : c’est ajouter un nombre $\textcolor{#4CAF50}{\text{positif}}$.

_Étape 3_

Sa distance à zéro est l’écart entre $\textcolor{#FF5722}{-}3$ et $\textcolor{#FF5722}{-}1$ : ils sont du même côté de zéro, on soustrait leurs distances à zéro.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#4CAF50}{+}\left( 3 - 1 \right) \\ &= 2 \end{align}
$$

---

## N-OPPOSES — Ajouter $2$ nombres opposés

`b896b6ce-9cf0-430a-87ef-b242204cbc3b` · 5 · niveau 2 · 2 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$11 + \left( -11 \right)$$

**Réponse attendue** : $0$

**Correction**

_Étape 1_

**Deux nombres opposés** ont la même distance à zéro et des signes contraires ; leur somme est égale à $0$.

_Étape 2_

$11$ et $\textcolor{#FF5722}{-}11$ sont opposés.

_Étape 3_

$$
\begin{align} 11 + \left( \textcolor{#FF5722}{-}11 \right) &= \textcolor{#4CAF50}{0} \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$\left( -15 \right) + 15$$

**Réponse attendue** : $0$

**Correction**

_Étape 1_

**Deux nombres opposés** ont la même distance à zéro et des signes contraires ; leur somme est égale à $0$.

_Étape 2_

$\textcolor{#FF5722}{-}15$ et $15$ sont opposés.

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}15 \right) + 15 &= \textcolor{#4CAF50}{0} \end{align}
$$

#### Tirage 3 (variation 1)

**Énoncé**

Calcule.

$$4 + \left( -4 \right)$$

**Réponse attendue** : $0$

**Correction**

_Étape 1_

**Deux nombres opposés** ont la même distance à zéro et des signes contraires ; leur somme est égale à $0$.

_Étape 2_

$4$ et $\textcolor{#FF5722}{-}4$ sont opposés.

_Étape 3_

$$
\begin{align} 4 + \left( \textcolor{#FF5722}{-}4 \right) &= \textcolor{#4CAF50}{0} \end{align}
$$

---

## N-REL-ALG — Calculer une somme algébrique

`abc5d417-7638-4048-b710-0394c4ccc42c` · 5 · niveau 4 · 1 variation(s) · correction rédigée

- Les conditions du modèle garantissent au moins un terme positif et un terme négatif.

#### Tirage 1 (variation 0)

**Énoncé**

Calcule.

$$9 + 9 + 4 - 6$$

**Réponse attendue** : $16$

**Correction**

_Étape 1_

**Somme algébrique.** On regroupe les termes positifs d’un côté, les termes négatifs de l’autre : on additionne les uns, on additionne les distances à zéro des autres, puis on conclut avec la règle des signes contraires.

_Étape 2_

Termes positifs : leur somme vaut $\textcolor{#2196F3}{22}$. Termes négatifs : leurs distances à zéro ont pour somme $\textcolor{#FF5722}{6}$.

_Étape 3_

$$
\begin{align} 9+9+4-6 &= \textcolor{#2196F3}{22} - \textcolor{#FF5722}{6} \\ &= 16 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$9 - 7 - 6 + 2$$

**Réponse attendue** : $-2$

**Correction**

_Étape 1_

**Somme algébrique.** On regroupe les termes positifs d’un côté, les termes négatifs de l’autre : on additionne les uns, on additionne les distances à zéro des autres, puis on conclut avec la règle des signes contraires.

_Étape 2_

Termes positifs : leur somme vaut $\textcolor{#2196F3}{11}$. Termes négatifs : leurs distances à zéro ont pour somme $\textcolor{#FF5722}{13}$.

_Étape 3_

$$
\begin{align} 9-7-6+2 &= \textcolor{#2196F3}{11} - \textcolor{#FF5722}{13} \\ &= \textcolor{#4CAF50}{-}\left( \textcolor{#FF5722}{13} - \textcolor{#2196F3}{11} \right) \\ &= -2 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$-6 - 8 + 2 - 2$$

**Réponse attendue** : $-14$

**Correction**

_Étape 1_

**Somme algébrique.** On regroupe les termes positifs d’un côté, les termes négatifs de l’autre : on additionne les uns, on additionne les distances à zéro des autres, puis on conclut avec la règle des signes contraires.

_Étape 2_

Termes positifs : leur somme vaut $\textcolor{#2196F3}{2}$. Termes négatifs : leurs distances à zéro ont pour somme $\textcolor{#FF5722}{16}$.

_Étape 3_

$$
\begin{align} -6-8+2-2 &= \textcolor{#2196F3}{2} - \textcolor{#FF5722}{16} \\ &= \textcolor{#4CAF50}{-}\left( \textcolor{#FF5722}{16} - \textcolor{#2196F3}{2} \right) \\ &= -14 \end{align}
$$

---

## N-REL-SUB — Soustraire (cas général)

`1d41e370-b662-4c43-89c5-519495d8fd2b` · 5 · niveau 4 · 4 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Calcule.

$$7 - \left( -9 \right)$$

**Réponse attendue** : $16$

**Correction**

_Étape 1_

**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \left( -b \right)$ et $a - \left( -b \right) = a + b$.

_Étape 2_

Soustraire $\textcolor{#FF5722}{-}9$, c’est ajouter son opposé $9$.

_Étape 3_

$$
\begin{align} 7 - \left( \textcolor{#FF5722}{-}9 \right) &= 7 + 9 \\ &= 16 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Calcule.

$$9 - 3$$

**Réponse attendue** : $6$

**Correction**

_Étape 1_

**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \left( -b \right)$ et $a - \left( -b \right) = a + b$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$9$ et $\textcolor{#FF5722}{-}3$ sont de $\textcolor{#2196F3}{\text{signes contraires}}$. $9$ est le plus éloigné de zéro : la somme est $\textcolor{#4CAF50}{\text{positif}}$. On soustrait les distances à zéro.

_Étape 4_

$$
\begin{align} 9 - 3 &= 9 + \left( \textcolor{#FF5722}{-}3 \right) \\ &= \textcolor{#4CAF50}{+}\left( 9 - 3 \right) \\ &= 6 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Calcule.

$$\left( -3 \right) - 2$$

**Réponse attendue** : $-5$

**Correction**

_Étape 1_

**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \left( -b \right)$ et $a - \left( -b \right) = a + b$.

_Étape 2_

**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.

_Étape 3_

$\textcolor{#FF5722}{-}3$ et $\textcolor{#FF5722}{-}2$ sont de $\textcolor{#2196F3}{\text{même signe}}$ : la somme est $\textcolor{#4CAF50}{\text{négatif}}$, et on additionne les distances à zéro.

_Étape 4_

$$
\begin{align} \left( \textcolor{#FF5722}{-}3 \right) - 2 &= \left( \textcolor{#FF5722}{-}3 \right) + \left( \textcolor{#FF5722}{-}2 \right) \\ &= \textcolor{#4CAF50}{-}\left( 3 + 2 \right) \\ &= -5 \end{align}
$$

---

## N-REL-SUB — Simplifier l'écriture

`8c7942e4-b81a-4049-9e78-7e2f14d5b055` · 5 · niveau 1 · 4 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Simplifie les doubles signes de cette expression.

$$7 + \left( -9 \right)$$

**Réponse attendue** : $7 - 9$

**Correction**

_Étape 1_

**Doubles signes.** $+\left( -b \right)$ s’écrit $-b$ ; $-\left( -b \right)$ s’écrit $+b$ (soustraire un nombre, c’est ajouter son opposé).

_Étape 2_

Ajouter $\textcolor{#FF5722}{-}9$, c’est soustraire $9$.

_Étape 3_

$$
\begin{align} 7 + \left( \textcolor{#FF5722}{-}9 \right) &= 7 \textcolor{#4CAF50}{-} 9 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Simplifie les doubles signes de cette expression.

$$-9 - \left( -3 \right)$$

**Réponse attendue** : $-9 + 3$

**Correction**

_Étape 1_

**Doubles signes.** $+\left( -b \right)$ s’écrit $-b$ ; $-\left( -b \right)$ s’écrit $+b$ (soustraire un nombre, c’est ajouter son opposé).

_Étape 2_

Soustraire $\textcolor{#FF5722}{-}3$, c’est ajouter $3$.

_Étape 3_

$$
\begin{align} -9 - \left( \textcolor{#FF5722}{-}3 \right) &= -9 \textcolor{#4CAF50}{+} 3 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Simplifie les doubles signes de cette expression.

$$3 - \left( -2 \right)$$

**Réponse attendue** : $3 + 2$

**Correction**

_Étape 1_

**Doubles signes.** $+\left( -b \right)$ s’écrit $-b$ ; $-\left( -b \right)$ s’écrit $+b$ (soustraire un nombre, c’est ajouter son opposé).

_Étape 2_

Soustraire $\textcolor{#FF5722}{-}2$, c’est ajouter $2$.

_Étape 3_

$$
\begin{align} 3 - \left( \textcolor{#FF5722}{-}2 \right) &= 3 \textcolor{#4CAF50}{+} 2 \end{align}
$$

---

## N-REL-SUB — Transformer une soustraction en addition

`1b866448-717d-44a8-8a6e-648c4ec55a48` · 5 · niveau 3 · 4 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Réécris cette soustraction en une addition équivalente.

$$7 - \left( -9 \right)$$

**Réponse attendue** : $7 + 9$

**Correction**

_Étape 1_

**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \left( -b \right)$ et $a - \left( -b \right) = a + b$.

_Étape 2_

L’opposé de $\textcolor{#FF5722}{-}9$ est $\textcolor{#4CAF50}{9}$ : on remplace « $-$ $\textcolor{#FF5722}{-}9$ » par « $+$ $\textcolor{#4CAF50}{9}$ ».

_Étape 3_

$$
\begin{align} 7 - \left( \textcolor{#FF5722}{-}9 \right) &= 7 + \textcolor{#4CAF50}{9} \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Réécris cette soustraction en une addition équivalente.

$$9 - 3$$

**Réponse attendue** : $9 + \left( -3 \right)$

**Correction**

_Étape 1_

**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \left( -b \right)$ et $a - \left( -b \right) = a + b$.

_Étape 2_

L’opposé de $3$ est $\left( \textcolor{#4CAF50}{-}3 \right)$ : on remplace « $-$ $3$ » par « $+$ $\left( \textcolor{#4CAF50}{-}3 \right)$ ».

_Étape 3_

$$
\begin{align} 9 - 3 &= 9 + \left( \textcolor{#4CAF50}{-}3 \right) \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Réécris cette soustraction en une addition équivalente.

$$\left( -3 \right) - 2$$

**Réponse attendue** : $-3 + \left( -2 \right)$

**Correction**

_Étape 1_

**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \left( -b \right)$ et $a - \left( -b \right) = a + b$.

_Étape 2_

L’opposé de $2$ est $\left( \textcolor{#4CAF50}{-}2 \right)$ : on remplace « $-$ $2$ » par « $+$ $\left( \textcolor{#4CAF50}{-}2 \right)$ ».

_Étape 3_

$$
\begin{align} \left( \textcolor{#FF5722}{-}3 \right) - 2 &= -3 + \left( \textcolor{#4CAF50}{-}2 \right) \end{align}
$$

---

## N-COMPARER-REL — Comparer deux nombres relatifs.

`e0b6d00a-cc63-43bb-b2a0-c13d0e0fa00e` · 5 · niveau 1 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$-20$$

**Correction**

_Étape 1_

**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.

_Étape 2_

Les deux nombres sont négatifs : $\textcolor{#FF5722}{-}20$ est plus éloigné de zéro que $\textcolor{#FF5722}{-}14$ ($20 > 14$), donc $\textcolor{#2196F3}{-20 < -14}$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
-20
$$

#### Tirage 2 (variation 2)

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$-20$$

**Correction**

_Étape 1_

**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.

_Étape 2_

Les deux nombres sont négatifs : $\textcolor{#FF5722}{-}20$ est plus éloigné de zéro que $\textcolor{#FF5722}{-}19$ ($20 > 19$), donc $\textcolor{#2196F3}{-20 < -19}$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
-20
$$

#### Tirage 3 (variation 0)

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$-6$$

**Correction**

_Étape 1_

**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.

_Étape 2_

$\textcolor{#FF5722}{-}6$ est négatif et $4$ est positif, donc $\textcolor{#2196F3}{-6 < 4}$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
-6
$$

---

## N-COMPARER-REL — Comparer deux nombres relatifs.

`12e27dba-8939-4f84-94e9-87c88458b7c3` · 5 · niveau 2 · 2 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$6.4$$

**Correction**

_Étape 1_

**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.

_Étape 2_

Les deux nombres sont positifs : $\textcolor{#2196F3}{6.4 < 9.8}$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
6.4
$$

#### Tirage 2 (variation 0)

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$-9.5$$

**Correction**

_Étape 1_

**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.

_Étape 2_

Les deux nombres sont négatifs : $\textcolor{#FF5722}{-}9.5$ est plus éloigné de zéro que $\textcolor{#FF5722}{-}9.2$ ($9.5 > 9.2$), donc $\textcolor{#2196F3}{-9.5 < -9.2}$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
-9.5
$$

#### Tirage 3 (variation 1)

**Énoncé**

Quel est le plus petit de ces 2 nombres ?

**Réponse attendue** : $$-5.7$$

**Correction**

_Étape 1_

**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.

_Étape 2_

Les deux nombres sont négatifs : $\textcolor{#FF5722}{-}5.7$ est plus éloigné de zéro que $\textcolor{#FF5722}{-}5.4$ ($5.7 > 5.4$), donc $\textcolor{#2196F3}{-5.7 < -5.4}$.

_Étape 3_

Le plus petit des deux nombres est donc :

$$
-5.7
$$

---

## N-REL-DEF — Nombre négatif défini par une soustraction

`756bdbb7-edaa-4263-bd19-493620183371` · 5 · niveau 2 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris la soustraction définissant le nombre :

$$-15$$

**Réponse attendue** : $0 - 15$

**Correction**

_Étape 1_

**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{-}15 &= 0 - \textcolor{#FF5722}{15} \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Écris la soustraction définissant le nombre :

$$-20$$

**Réponse attendue** : $0 - 20$

**Correction**

_Étape 1_

**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{-}20 &= 0 - \textcolor{#FF5722}{20} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris la soustraction définissant le nombre :

$$-5$$

**Réponse attendue** : $0 - 5$

**Correction**

_Étape 1_

**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{-}5 &= 0 - \textcolor{#FF5722}{5} \end{align}
$$

---

## N-REL-DEF — Une soustraction enfin possible

`f7f22023-19cd-4745-aa96-8a3c930cde0f` · 5 · niveau 1 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris le résultat de :

$$0 - 15$$

**Réponse attendue** : $-15$

**Correction**

_Étape 1_

**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.

_Étape 2_

$$
\begin{align} 0 - \textcolor{#FF5722}{15} &= -15 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Écris le résultat de :

$$0 - 20$$

**Réponse attendue** : $-20$

**Correction**

_Étape 1_

**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.

_Étape 2_

$$
\begin{align} 0 - \textcolor{#FF5722}{20} &= -20 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris le résultat de :

$$0 - 5$$

**Réponse attendue** : $-5$

**Correction**

_Étape 1_

**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.

_Étape 2_

$$
\begin{align} 0 - \textcolor{#FF5722}{5} &= -5 \end{align}
$$

---

## N-FRAC-MULT — Compléter une multiplication à trou

`e8de8b81-3466-4b47-820d-50bc8b5f484f` · 4 · niveau 1 · 4 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète.

$$\left( \dfrac{7}{\square} \right) \times \left( \dfrac{9}{6} \right) = \dfrac{63}{18}$$

**Réponse attendue** : $3$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

Les dénominateurs : $? \times \textcolor{#FF5722}{6} = \textcolor{#2196F3}{18}$. Le nombre manquant s’obtient par une division.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#2196F3}{18} : \textcolor{#FF5722}{6} \\ &= 3 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète.

$$\left( \dfrac{9}{6} \right) \times \left( \dfrac{\square}{6} \right) = \dfrac{27}{36}$$

**Réponse attendue** : $3$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

Les numérateurs : $? \times \textcolor{#FF5722}{9} = \textcolor{#2196F3}{27}$. Le nombre manquant s’obtient par une division.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#2196F3}{27} : \textcolor{#FF5722}{9} \\ &= 3 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Complète.

$$\left( \dfrac{3}{6} \right) \times \left( \dfrac{2}{\square} \right) = \dfrac{6}{30}$$

**Réponse attendue** : $5$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

Les dénominateurs : $? \times \textcolor{#FF5722}{6} = \textcolor{#2196F3}{30}$. Le nombre manquant s’obtient par une division.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#2196F3}{30} : \textcolor{#FF5722}{6} \\ &= 5 \end{align}
$$

---

## N-FRAC-MULT — Compléter une multiplication à trou

`23b29a15-e08d-4c9c-bccf-97e589587578` · 4 · niveau 2 · 4 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Complète.

$$\left( \dfrac{5}{\square} \right) \times \left( \dfrac{9}{4} \right) = \dfrac{45}{8}$$

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

Le produit des numérateurs $5 \times 9 = 45$ est bien le numérateur du résultat : le produit des dénominateurs vaut $8$.

_Étape 3_

Les dénominateurs : $? \times \textcolor{#FF5722}{4} = \textcolor{#2196F3}{8}$.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#2196F3}{8} : \textcolor{#FF5722}{4} \\ &= 2 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète.

$$\left( \dfrac{9}{2} \right) \times \left( \dfrac{\square}{2} \right) = -\dfrac{63}{4}$$

**Réponse attendue** : $-7$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

Le produit des dénominateurs $2 \times 2 = 4$ est positif : le numérateur $-63$ du résultat est le produit des numérateurs.

_Étape 3_

Les numérateurs : $? \times \textcolor{#FF5722}{9} = \textcolor{#2196F3}{\left( -63 \right)}$.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#2196F3}{\left( -63 \right)} : \textcolor{#FF5722}{9} \\ &= -7 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Complète.

$$\left( \dfrac{-6}{-5} \right) \times \left( \dfrac{-8}{\square} \right) = \dfrac{48}{25}$$

**Réponse attendue** : $-5$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

Le produit des numérateurs $\left( -6 \right) \times \left( -8 \right) = 48$ est bien le numérateur du résultat : le produit des dénominateurs vaut $25$.

_Étape 3_

Les dénominateurs : $? \times \textcolor{#FF5722}{\left( -5 \right)} = \textcolor{#2196F3}{25}$.

_Étape 4_

$$
\begin{align} ? &= \textcolor{#2196F3}{25} : \textcolor{#FF5722}{\left( -5 \right)} \\ &= -5 \end{align}
$$

---

## N-FRAC-MULT — Calculer un produit

`25b78a6f-7a6e-4067-a729-761351333b27` · 4 · niveau 5 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Calcule.

$$\dfrac{9}{7} \times \dfrac{9}{3}$$

**Réponse attendue** : $\frac{27}{7}$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

On simplifie ensuite la fraction obtenue par $\textcolor{#2196F3}{3}$.

_Étape 3_

$$
\begin{align} \dfrac{9}{7} \times \dfrac{9}{3} &= \dfrac{9 \times 9}{7 \times 3} \\ &= \dfrac{81}{21} \\ &= \dfrac{27 \times \textcolor{#2196F3}{3}}{7 \times \textcolor{#2196F3}{3}} \\ &= \frac{27}{7} \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Calcule.

$$\dfrac{9}{3} \times \dfrac{3}{6}$$

**Réponse attendue** : $\frac{3}{2}$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

On simplifie ensuite la fraction obtenue par $\textcolor{#2196F3}{9}$.

_Étape 3_

$$
\begin{align} \dfrac{9}{3} \times \dfrac{3}{6} &= \dfrac{9 \times 3}{3 \times 6} \\ &= \dfrac{27}{18} \\ &= \dfrac{3 \times \textcolor{#2196F3}{9}}{2 \times \textcolor{#2196F3}{9}} \\ &= \frac{3}{2} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Calcule.

$$\dfrac{3}{6} \times \dfrac{2}{5}$$

**Réponse attendue** : $\frac{1}{5}$

**Correction**

_Étape 1_

**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{a \times c}{b \times d}$.

_Étape 2_

On simplifie ensuite la fraction obtenue par $\textcolor{#2196F3}{6}$.

_Étape 3_

$$
\begin{align} \dfrac{3}{6} \times \dfrac{2}{5} &= \dfrac{3 \times 2}{6 \times 5} \\ &= \dfrac{6}{30} \\ &= \dfrac{1 \times \textcolor{#2196F3}{6}}{5 \times \textcolor{#2196F3}{6}} \\ &= \frac{1}{5} \end{align}
$$

---

## N-POURCENT — Définition d'un pourcentage

`62590cd3-c811-4acc-9b0d-0ff9e19c4c55` · 6 · niveau 1 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris sous la forme d'une fraction de dénominateur $100$ :

$$71\,\%$$

**Réponse attendue** : $\dfrac{71}{100}$

**Correction**

_Étape 1_

**Pourcentage.** $p\,\%$ signifie « $p$ pour cent » : $p\,\% = \dfrac{p}{100}$.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{71}\,\% &= \dfrac{\textcolor{#FF5722}{71}}{100} \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Écris sous la forme d'une fraction de dénominateur $100$ :

$$98\,\%$$

**Réponse attendue** : $\dfrac{98}{100}$

**Correction**

_Étape 1_

**Pourcentage.** $p\,\%$ signifie « $p$ pour cent » : $p\,\% = \dfrac{p}{100}$.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{98}\,\% &= \dfrac{\textcolor{#FF5722}{98}}{100} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris sous la forme d'une fraction de dénominateur $100$ :

$$21\,\%$$

**Réponse attendue** : $\dfrac{21}{100}$

**Correction**

_Étape 1_

**Pourcentage.** $p\,\%$ signifie « $p$ pour cent » : $p\,\% = \dfrac{p}{100}$.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{21}\,\% &= \dfrac{\textcolor{#FF5722}{21}}{100} \end{align}
$$

---

## N-POURCENT — Définition d'un pourcentage

`8fd459da-05ef-4053-a52e-5bd2f2ac1a44` · 6 · niveau 2 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Écris cette fraction sous forme de pourcentage.

$$\dfrac{71}{100}$$

**Réponse attendue** : $71\,\%$

**Correction**

_Étape 1_

**Pourcentage.** Une fraction de dénominateur $100$ s’écrit en pourcentage : $\dfrac{p}{100} = p\,\%$.

_Étape 2_

$$
\begin{align} \dfrac{\textcolor{#FF5722}{71}}{100} &= \textcolor{#FF5722}{71}\,\% \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Écris cette fraction sous forme de pourcentage.

$$\dfrac{98}{100}$$

**Réponse attendue** : $98\,\%$

**Correction**

_Étape 1_

**Pourcentage.** Une fraction de dénominateur $100$ s’écrit en pourcentage : $\dfrac{p}{100} = p\,\%$.

_Étape 2_

$$
\begin{align} \dfrac{\textcolor{#FF5722}{98}}{100} &= \textcolor{#FF5722}{98}\,\% \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Écris cette fraction sous forme de pourcentage.

$$\dfrac{21}{100}$$

**Réponse attendue** : $21\,\%$

**Correction**

_Étape 1_

**Pourcentage.** Une fraction de dénominateur $100$ s’écrit en pourcentage : $\dfrac{p}{100} = p\,\%$.

_Étape 2_

$$
\begin{align} \dfrac{\textcolor{#FF5722}{21}}{100} &= \textcolor{#FF5722}{21}\,\% \end{align}
$$

---
