# Aperçu des corrections — lot « vague3-unites »

> Vague 3 (modèles draft) : conversions d’unités — ROUGES au vérificateur (égalité posée avec unités). Généré par `pnpm corrections:preview vague3-unites` : ne pas éditer à la main (éditer la proposition `<id>.json` ou le lot, puis régénérer). Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion (cf. docs/ref/corrections-redaction.md).

- N-UNITES — Convertir dans une autre unité `7a90fc45`
- N-UNITES-AIRE — Convertir dans une autre unité `82748db8`
- N-UNITES-VOL — Convertir dans une autre unité `b79d4cb7`

## N-UNITES — Convertir dans une autre unité

`7a90fc45-a7e2-493b-96d5-d0963e51e136` · 6 · niveau 1 · 18 variation(s) · correction rédigée

- Généré variation par variation depuis la variable d’expression `a[U1] = ?[U2]`.
- Tableau : une colonne par unité (× 2 pour les aires, × 3 pour les volumes), le chiffre de `a` en orange, les zéros ajoutés en bleu.

#### Tirage 1 (variation 1)

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

#### Tirage 2 (variation 2)

**Énoncé**

Convertis dans l'unité demandée.

$$9~\unit{dam} = \square~\unit{m}$$

**Réponse attendue** : $90$

**Correction**

_Étape 1_

**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité demandée. Passer à l’unité voisine plus petite multiplie par $10$.

_Étape 2_

De $\text{dam}$ à $\text{m}$, on passe 1 unité vers la droite du tableau : on multiplie par $\textcolor{#2196F3}{10}$.

_Étape 3_

$$
\begin{array}{|c|c|} \text{dam} & \text{m} \\ \textcolor{#FF5722}{9} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 9 \times \textcolor{#2196F3}{10} \\ &= 90 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Convertis dans l'unité demandée.

$$2~\unit{dm} = \square~\unit{m}$$

**Réponse attendue** : $0.2$

**Correction**

_Étape 1_

**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité demandée. Passer à l’unité voisine plus petite multiplie par $10$.

_Étape 2_

De $\text{dm}$ à $\text{m}$, on passe 1 unité vers la gauche du tableau : on divise par $\textcolor{#2196F3}{10}$.

_Étape 3_

$$
\begin{array}{|c|c|} \text{m} & \text{dm} \\ \textcolor{#2196F3}{0,} & \textcolor{#FF5722}{2} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 2 : \textcolor{#2196F3}{10} \\ &= 0.2 \end{align}
$$

---

## N-UNITES-AIRE — Convertir dans une autre unité

`82748db8-01fe-4c2e-86b6-4ef8c1dde805` · 6 · niveau 1 · 17 variation(s) · correction rédigée

- Généré variation par variation depuis la variable d’expression `a[U1] = ?[U2]`.
- Tableau : une colonne par unité (× 2 pour les aires, × 3 pour les volumes), le chiffre de `a` en orange, les zéros ajoutés en bleu.

#### Tirage 1 (variation 1)

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

#### Tirage 2 (variation 2)

**Énoncé**

Convertis dans l'unité demandée.

$$9~\unit{dam^2} = \square~\unit{m^2}$$

**Réponse attendue** : $900$

**Correction**

_Étape 1_

**Tableau de conversion des aires.** Deux colonnes par unité ($1~\text{m}^2 = 100~\text{dm}^2$) : passer à l’unité voisine plus petite multiplie par $100$.

_Étape 2_

De $\text{dam}^2$ à $\text{m}^2$, on passe 1 unité vers la droite du tableau ($\textcolor{#2196F3}{2}$ colonnes) : on multiplie par $\textcolor{#2196F3}{100}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|}  & \text{dam}^2 &  & \text{m}^2 \\  & \textcolor{#FF5722}{9} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 9 \times \textcolor{#2196F3}{100} \\ &= 900 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Convertis dans l'unité demandée.

$$2~\unit{dm^2} = \square~\unit{m^2}$$

**Réponse attendue** : $0.02$

**Correction**

_Étape 1_

**Tableau de conversion des aires.** Deux colonnes par unité ($1~\text{m}^2 = 100~\text{dm}^2$) : passer à l’unité voisine plus petite multiplie par $100$.

_Étape 2_

De $\text{dm}^2$ à $\text{m}^2$, on passe 1 unité vers la gauche du tableau ($\textcolor{#2196F3}{2}$ colonnes) : on divise par $\textcolor{#2196F3}{100}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|}  & \text{m}^2 &  & \text{dm}^2 \\ \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0,} & \textcolor{#2196F3}{0} & \textcolor{#FF5722}{2} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 2 : \textcolor{#2196F3}{100} \\ &= 0.02 \end{align}
$$

---

## N-UNITES-VOL — Convertir dans une autre unité

`b79d4cb7-d138-4be0-86e5-57131c8e265d` · 6 · niveau 2 · 15 variation(s) · correction rédigée

- Généré variation par variation depuis la variable d’expression `a[U1] = ?[U2]`.
- Tableau : une colonne par unité (× 2 pour les aires, × 3 pour les volumes), le chiffre de `a` en orange, les zéros ajoutés en bleu.

#### Tirage 1 (variation 1)

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

#### Tirage 2 (variation 2)

**Énoncé**

Convertis dans l'unité demandée.

$$9~\unit{dm^3} = \square~\unit{m^3}$$

**Réponse attendue** : $0.009$

**Correction**

_Étape 1_

**Tableau de conversion des volumes.** Trois colonnes par unité ($1~\text{m}^3 = 1000~\text{dm}^3$) : passer à l’unité voisine plus petite multiplie par $1000$.

_Étape 2_

De $\text{dm}^3$ à $\text{m}^3$, on passe 1 unité vers la gauche du tableau ($\textcolor{#2196F3}{3}$ colonnes) : on divise par $\textcolor{#2196F3}{1000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|c|c|}  &  & \text{m}^3 &  &  & \text{dm}^3 \\ \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0,} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#FF5722}{9} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 9 : \textcolor{#2196F3}{1000} \\ &= 0.009 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Convertis dans l'unité demandée.

$$2~\unit{cm^3} = \square~\unit{m^3}$$

**Réponse attendue** : $0.000002$

**Correction**

_Étape 1_

**Tableau de conversion des volumes.** Trois colonnes par unité ($1~\text{m}^3 = 1000~\text{dm}^3$) : passer à l’unité voisine plus petite multiplie par $1000$.

_Étape 2_

De $\text{cm}^3$ à $\text{m}^3$, on passe 2 unités vers la gauche du tableau ($\textcolor{#2196F3}{6}$ colonnes) : on divise par $\textcolor{#2196F3}{1000000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|c|c|c|c|c|}  &  & \text{m}^3 &  &  & \text{dm}^3 &  &  & \text{cm}^3 \\ \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0,} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#FF5722}{2} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 2 : \textcolor{#2196F3}{1000000} \\ &= 0.000002 \end{align}
$$

---
