# Vague 3 — résumé : un exemple rendu par code

> Lot `vague3-publies` : **vide**. Lecture seule en prod le 2026-09-29 : les 36 modèles de la vague sont `draft` ; aucun n'est `published`. Les propositions vivent dans `docs/corrections/vague3-brouillons/` (26 modèles, vérificateur 26/26) et `docs/corrections/vague3-unites/` (3 modèles, ROUGES : le vérificateur ne lit pas une égalité posée avec unités). Ce résumé montre un tirage rendu par code, copié des aperçus (`APERCU.md`, générés par `pnpm corrections:preview`).

Couleurs : orange = ce que l'on transforme (signes « − » regardés, chiffre converti), bleu = étape intermédiaire (signes contraires / même signe, zéros ajoutés, facteur), vert = conclusion (signe du résultat). Réponse finale en noir.

## N-REL-ADD

Modèle `fd2c3e4b` — Ajouter $1$ ou $2$ à un nombre négatif (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 1)

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

## N-REL-SUB

Modèle `1d41e370` — Soustraire (cas général) (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 1)

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

## N-COMPARER-REL

Modèle `e0b6d00a` — Comparer deux nombres relatifs. (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 1)

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

## N-REL-DEF

Modèle `756bdbb7` — Nombre négatif défini par une soustraction (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 0)

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

## N-OPPOSES

Modèle `b896b6ce` — Ajouter $2$ nombres opposés (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 1)

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

## N-REL-ALG

Modèle `abc5d417` — Calculer une somme algébrique (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 0)

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

## N-FRAC-MULT

Modèle `e8de8b81` — Compléter une multiplication à trou (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 1)

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

## N-FRAC-ADD

_Aucun exemple : modèle(s) écarté(s), voir `SKIPPED` dans `scripts/corrections/lots/vague3.ts`._

## N-INVERSE

_Aucun exemple : modèle(s) écarté(s), voir `SKIPPED` dans `scripts/corrections/lots/vague3.ts`._

## N-UNITES

Modèle `7a90fc45` — Convertir dans une autre unité (lot `vague3-unites` — ROUGE au vérificateur)

#### Exemple (tirage 1 (variation 1)

**Énoncé**

Convertis dans l'unité demandée.

$$7~\unit{hm} = \square~\unit{m}$$

**Réponse attendue** : $700$

**Correction**

_Étape 1_

**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité demandée. Passer à l’unité voisine plus petite multiplie par $10$.

_Étape 2_

De $\text{hm}$ à $\text{m}$, on passe 2 unités vers la droite du tableau : on multiplie par $\textcolor{#2196F3}{100}$.

_Étape 3_

$$
\begin{array}{|c|c|c|} \text{hm} & \text{dam} & \text{m} \\ \textcolor{#FF5722}{7} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 7 \times \textcolor{#2196F3}{100} \\ &= 700 \end{align}
$$

## N-UNITES-VOL

Modèle `b79d4cb7` — Convertir dans une autre unité (lot `vague3-unites` — ROUGE au vérificateur)

#### Exemple (tirage 1 (variation 1)

**Énoncé**

Convertis dans l'unité demandée.

$$7~\unit{dam^3} = \square~\unit{m^3}$$

**Réponse attendue** : $7000$

**Correction**

_Étape 1_

**Tableau de conversion des volumes.** Trois colonnes par unité ($1~\text{m}^3 = 1000~\text{dm}^3$) : passer à l’unité voisine plus petite multiplie par $1000$.

_Étape 2_

De $\text{dam}^3$ à $\text{m}^3$, on passe 1 unité vers la droite du tableau ($\textcolor{#2196F3}{3}$ colonnes) : on multiplie par $\textcolor{#2196F3}{1000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|c|c|}  &  & \text{dam}^3 &  &  & \text{m}^3 \\  &  & \textcolor{#FF5722}{7} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 7 \times \textcolor{#2196F3}{1000} \\ &= 7000 \end{align}
$$

## N-UNITES-AIRE

Modèle `82748db8` — Convertir dans une autre unité (lot `vague3-unites` — ROUGE au vérificateur)

#### Exemple (tirage 1 (variation 1)

**Énoncé**

Convertis dans l'unité demandée.

$$7~\unit{hm^2} = \square~\unit{m^2}$$

**Réponse attendue** : $70000$

**Correction**

_Étape 1_

**Tableau de conversion des aires.** Deux colonnes par unité ($1~\text{m}^2 = 100~\text{dm}^2$) : passer à l’unité voisine plus petite multiplie par $100$.

_Étape 2_

De $\text{hm}^2$ à $\text{m}^2$, on passe 2 unités vers la droite du tableau ($\textcolor{#2196F3}{4}$ colonnes) : on multiplie par $\textcolor{#2196F3}{10000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|c|c|}  & \text{hm}^2 &  & \text{dam}^2 &  & \text{m}^2 \\  & \textcolor{#FF5722}{7} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 7 \times \textcolor{#2196F3}{10000} \\ &= 70000 \end{align}
$$

## N-POURCENT

Modèle `62590cd3` — Définition d'un pourcentage (lot `vague3-brouillons`)

#### Exemple (tirage 1 (variation 0)

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
