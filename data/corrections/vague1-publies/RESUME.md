# Vague 1 — lot « vague1-publies » : un exemple par stratégie

> À relire AVANT tout `--publier` : ces 33 modèles sont **publiés** (visibles des élèves). Un exemple rendu par code ; tous les tirages : [APERCU.md](APERCU.md). Couleurs : orange = ce que l'on transforme (morceaux, bonds), bleu = nombres ronds et résultats partiels, réponse en noir (docs/ref/corrections-redaction.md).

- **33 modèles**, corrections **générées** (`scripts/corrections/lib/r-mental.ts`), vérificateur **33/33** (113 032 tirages), import en simulation **33/33 prêts**.
- **Écartés (7)** — aucune variable d'expression, le vérificateur ne peut pas contrôler le départ du calcul : R-QUAD 56b2737d, b7cd1846, 3c79eb9c ; R-DOUBLE 022130ca, 47f97c9f ; R-DIV-DIZ 4ee04b22 ; R-COMPL 17a3c039.
- Brouillons de la même vague (2) : [../vague1-brouillons/APERCU.md](../vague1-brouillons/APERCU.md).

## R-COMPL — compléter par bonds jusqu'aux nombres ronds

**Trouver le complément** · `115745fe-b2ac-49fb-b6b3-447503077924`

**Énoncé**

Complète.

$$6052 + \square = 7000$$

**Réponse attendue** : $948$

**Correction**

_Étape 1_

**Compléter par bonds.** On avance de $6052$ jusqu'à $7000$ en passant par les nombres ronds : $6052 \to \textcolor{#2196F3}{6060} \to \textcolor{#2196F3}{6100} \to 7000$. Le nombre cherché est la somme des bonds.

_Étape 2_

$$
\begin{align} ? &= \textcolor{#FF5722}{8} + \textcolor{#FF5722}{40} + \textcolor{#FF5722}{900} \\ &= 948 \end{align}
$$

## R-RANGPARRANG — décomposer le 2ᵉ terme selon ses rangs

**Calculer une somme** · `fe9df9ba-2017-4027-b678-bae8196c3651`

**Énoncé**

Calcule.

$$573 + 319$$

**Réponse attendue** : $892$

**Correction**

_Étape 1_

**Calculer rang par rang.** On décompose $319$ selon ses rangs : $319 = \textcolor{#FF5722}{300} + \textcolor{#FF5722}{10} + \textcolor{#FF5722}{9}$. On ajoute les morceaux un par un : centaines, puis dizaines, puis unités.

_Étape 2_

$$
\begin{align} 573 + 319 &= 573 + \textcolor{#FF5722}{300} + \textcolor{#FF5722}{10} + \textcolor{#FF5722}{9} \\ &= \textcolor{#2196F3}{873} + \textcolor{#FF5722}{10} + \textcolor{#FF5722}{9} \\ &= \textcolor{#2196F3}{883} + \textcolor{#FF5722}{9} \\ &= 892 \end{align}
$$

## R-RANG — ajouter / retrancher des dizaines (centaines…) entières

**Calculer une somme** · `ed5f5f52-ba4f-4c51-a843-2be19156b4b7`

**Énoncé**

Calcule.

$$7996 + 8$$

**Réponse attendue** : $8004$

**Correction**

_Étape 1_

**Ajouter des unités.** On décompose $7996$ en $\textcolor{#FF5722}{7990} + \textcolor{#FF5722}{6}$ et on calcule les unités : $6 + 8 = \textcolor{#2196F3}{14}$.

_Étape 2_

$$
\begin{align} 7996 + 8 &= \textcolor{#FF5722}{7990} + \textcolor{#FF5722}{6} + 8 \\ &= 7990 + \textcolor{#2196F3}{14} \\ &= 8004 \end{align}
$$

## R-DISTRIB — décomposer un facteur (distributivité)

**Calculer un produit d'entiers** · `d793de49-b065-46ea-aa8b-d09adcbb7617`

**Énoncé**

Calcule.

$$953 \times 7$$

**Réponse attendue** : $6671$

**Correction**

_Étape 1_

**Décomposer un facteur.** On décompose $953$ selon ses rangs, $953 = \textcolor{#FF5722}{900} + \textcolor{#FF5722}{50} + \textcolor{#FF5722}{3}$, puis on multiplie chaque morceau par $7$ et on ajoute les résultats.

_Étape 2_

$$
\begin{align} 953 \times 7 &= \textcolor{#FF5722}{900} \times 7 + \textcolor{#FF5722}{50} \times 7 + \textcolor{#FF5722}{3} \times 7 \\ &= \textcolor{#2196F3}{6300} + \textcolor{#2196F3}{350} + \textcolor{#2196F3}{21} \\ &= 6671 \end{align}
$$

## R-DIV-DIZ — diviser des dizaines

**Calculer un quotient entier** · `09f22a2f-9a2d-404a-b0b4-be00046b3d49`

**Énoncé**

Calcule.

$$630 : 9$$

**Réponse attendue** : $70$

**Correction**

_Étape 1_

**Diviser des dizaines.** $630$, c'est $\textcolor{#FF5722}{63}$ dizaines. Avec la table de $9$ : $\textcolor{#FF5722}{63} : 9 = \textcolor{#2196F3}{7}$, donc $630 : 9$ fait $\textcolor{#2196F3}{7}$ dizaines.

_Étape 2_

$$
\begin{align} 630 : 9 &= \left( \textcolor{#FF5722}{63} : 9 \right) \times 10 \\ &= \textcolor{#2196F3}{7} \times 10 \\ &= 70 \end{align}
$$

## R-XDIZ — × 20, × 30… = × 2, × 3… puis × 10

**Multiplier par $30$, $40$, $50$, $60$, $70$, $80$, $90$** · `68bb6eda-b853-4a98-aad6-4fea055a7482`

**Énoncé**

Calcule.

$$9 \times 70$$

**Réponse attendue** : $630$

**Correction**

_Étape 1_

**Multiplier par un nombre de dizaines.** Multiplier par $70$, c'est multiplier par $\textcolor{#FF5722}{7}$, puis par $\textcolor{#FF5722}{10}$.

_Étape 2_

$$
\begin{align} 9 \times 70 &= 9 \times \textcolor{#FF5722}{7} \times \textcolor{#FF5722}{10} \\ &= \textcolor{#2196F3}{63} \times 10 \\ &= 630 \end{align}
$$

## R-PETIT-DIV — chercher un petit diviseur

**Décomposer un entier en produit** · `7caa084f-655c-49ce-8658-1e253efbbeda`

**Énoncé**

Décompose ce nombre en un produit de $2$ facteurs ($1$ n'est pas un facteur autorisé).

$$20$$

**Réponse attendue** : $2 \times 10$

**Correction**

_Étape 1_

**Chercher un petit diviseur.** On essaie les petits diviseurs $2$, $3$, $5$… avec les tables et les critères de divisibilité (un nombre pair est divisible par $2$ ; si la somme de ses chiffres est dans la table de $3$, il est divisible par $3$). $20$ est dans la table de $\textcolor{#FF5722}{2}$ : $\textcolor{#FF5722}{2} \times \textcolor{#2196F3}{10} = 20$.

_Étape 2_

$$
\begin{align} 20 &= \textcolor{#FF5722}{2} \times \textcolor{#2196F3}{10} \end{align}
$$

## R-ECART — une différence est un écart, par bonds

**Calculer une différence (résultat positif)** · `5f78bd0e-9913-483f-808b-73d4b7d7a0a4`

**Énoncé**

$$76 - 69$$

**Réponse attendue** : $7$

**Correction**

_Étape 1_

**Calculer un écart.** $76 - 69$, c'est l'écart entre $69$ et $76$ : on avance de $69$ jusqu'à $76$ par bonds, en passant par les nombres ronds : $69 \to \textcolor{#2196F3}{70} \to 76$. L'écart est la somme des bonds.

_Étape 2_

$$
\begin{align} 76 - 69 &= \textcolor{#FF5722}{1} + \textcolor{#FF5722}{6} \\ &= 7 \end{align}
$$

## R-POSE — différence à retenues : écart par bonds (au lieu du calcul posé) ⚑

**Calculer une différence (résultat positif)** · `08fbcd26-6068-47cc-8384-8aeed96c6a78`

**Énoncé**

$$727 - 499$$

**Réponse attendue** : $228$

**Correction**

_Étape 1_

**Calculer un écart.** $727 - 499$, c'est l'écart entre $499$ et $727$ : on avance de $499$ jusqu'à $727$ par bonds, en passant par les nombres ronds : $499 \to \textcolor{#2196F3}{500} \to \textcolor{#2196F3}{700} \to 727$. L'écart est la somme des bonds.

_Étape 2_

$$
\begin{align} 727 - 499 &= \textcolor{#FF5722}{1} + \textcolor{#FF5722}{200} + \textcolor{#FF5722}{27} \\ &= 228 \end{align}
$$
