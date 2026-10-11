# Aperçu des corrections — lot « cloture-brouillons »

> Clôture : derniers modèles R / N sans correction, en brouillon. Généré par `pnpm corrections:preview cloture-brouillons` : ne pas éditer à la main (éditer la proposition `<id>.json` ou le lot, puis régénérer). Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion (cf. docs/ref/corrections-redaction.md).

- N-POSITION — Connaître la position décimale `f96588e4`
- N-POSITION — Connaître la position décimale `ce00dd64`
- N-POSITION — Connaître la position décimale `1b94c415`
- N-POSITION — Connaître la position décimale `5cc22ecd`
- N-ENCADR — Encadrer un nombre décimal au centième près `6379fa20`
- N-ENCADR — Encadrer un nombre décimal au dixième près `32724446`
- N-ENCADR — Encadrer un nombre décimal par deux entiers consécutifs `fac5225d`
- N-ENCADR — Trouver l'entier supérieur ou inférieur le plus proche `b26e8a84`
- N-OPPOSE-EXPR — Déterminer l'opposé d'une expression `aeb86af9`
- N-OPPOSE-EXPR — Déterminer l'opposé d'une expression `843c3186`
- N-OPPOSE-EXPR — Opposé d'une expression `34e569e7`
- N-FACT-COMMUN — Trouver un facteur commun `294c4316`
- N-FACT-COMMUN — Trouver un facteur commun `e66089e0`
- N-RACINE-AFF — Racine d'une fonction affine `2bdb3db6`
- N-FRAC-ADD — Compléter une addition ou soustraction à trou `7d12a172`
- N-FRAC-ADD — Compléter une addition ou soustraction à trou `86b80159`
- N-INVERSE — Calculer l'inverse d'un nombre `4115768c`
- N-UNITES — Convertir dans une autre unité `7a90fc45`
- N-UNITES-AIRE — Convertir dans une autre unité `82748db8`
- N-UNITES-VOL — Convertir dans une autre unité `b79d4cb7`
- N-UNITES — Convertir dans une autre unité `c31c9d95`
- N-UNITES-VOL — Convertir dans une autre unité `355bd41a`
- N-UNITES — Calculer avec des unités `b6269f1e`

## N-POSITION — Connaître la position décimale

`f96588e4-50ee-4505-9015-54f965f8ab43` · CM1 · niveau 1 · 3 variation(s) · correction rédigée

- Contrôle déclaré `digit` : le tableau relit le nombre, la colonne du rang porte la réponse.

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le chiffre des **dixièmes** dans le nombre $1.97$ ?

Le chiffre des dixièmes est $\square$.

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|} \text{unités} &  & \text{dixièmes} & \text{centièmes} \\ 1 & , & \textcolor{#FF5722}{9} & 7 \end{array}
$$

_Étape 3_

Le chiffre des dixièmes est $\textcolor{#4CAF50}{9}$.

#### Tirage 2 (variation 2)

**Énoncé**

Quel est le chiffre des **unités** dans le nombre $5.19$ ?

Le chiffre des unités est $\square$.

**Réponse attendue** : $5$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|} \text{unités} &  & \text{dixièmes} & \text{centièmes} \\ \textcolor{#FF5722}{5} & , & 1 & 9 \end{array}
$$

_Étape 3_

Le chiffre des unités est $\textcolor{#4CAF50}{5}$.

#### Tirage 3 (variation 0)

**Énoncé**

Quel est le chiffre des **centièmes** dans le nombre $5.02$ ?

Le chiffre des centièmes est $\square$.

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|} \text{unités} &  & \text{dixièmes} & \text{centièmes} \\ 5 & , & 0 & \textcolor{#FF5722}{2} \end{array}
$$

_Étape 3_

Le chiffre des centièmes est $\textcolor{#4CAF50}{2}$.

---

## N-POSITION — Connaître la position décimale

`ce00dd64-d584-4bfc-b23c-75d895f82a37` · CM1 · niveau 2 · 5 variation(s) · correction rédigée

- Contrôle déclaré `digit` : le tableau relit le nombre, la colonne du rang porte la réponse.

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le chiffre des **dixièmes** dans le nombre $261.97$ ?

Le chiffre des dixièmes est $\square$.

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|c|} \text{centaines} & \text{dizaines} & \text{unités} &  & \text{dixièmes} & \text{centièmes} \\ 2 & 6 & 1 & , & \textcolor{#FF5722}{9} & 7 \end{array}
$$

_Étape 3_

Le chiffre des dixièmes est $\textcolor{#4CAF50}{9}$.

#### Tirage 2 (variation 2)

**Énoncé**

Quel est le chiffre des **unités** dans le nombre $645.19$ ?

Le chiffre des unités est $\square$.

**Réponse attendue** : $5$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|c|} \text{centaines} & \text{dizaines} & \text{unités} &  & \text{dixièmes} & \text{centièmes} \\ 6 & 4 & \textcolor{#FF5722}{5} & , & 1 & 9 \end{array}
$$

_Étape 3_

Le chiffre des unités est $\textcolor{#4CAF50}{5}$.

#### Tirage 3 (variation 3)

**Énoncé**

Quel est le chiffre des **dizaines** dans le nombre $345.02$ ?

Le chiffre des dizaines est $\square$.

**Réponse attendue** : $4$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|c|} \text{centaines} & \text{dizaines} & \text{unités} &  & \text{dixièmes} & \text{centièmes} \\ 3 & \textcolor{#FF5722}{4} & 5 & , & 0 & 2 \end{array}
$$

_Étape 3_

Le chiffre des dizaines est $\textcolor{#4CAF50}{4}$.

---

## N-POSITION — Connaître la position décimale

`1b94c415-df9a-43ad-b48e-0cbf894c342e` · CM2 · niveau 6 · 4 variation(s) · correction rédigée

- Contrôle déclaré `digit` : le tableau relit le nombre, la colonne du rang porte la réponse.

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le chiffre des **centièmes** dans le nombre $6.197$ ?

Le chiffre des centièmes est $\square$.

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|} \text{unités} &  & \text{dixièmes} & \text{centièmes} & \text{millièmes} \\ 6 & , & 1 & \textcolor{#FF5722}{9} & 7 \end{array}
$$

_Étape 3_

Le chiffre des centièmes est $\textcolor{#4CAF50}{9}$.

#### Tirage 2 (variation 2)

**Énoncé**

Quel est le chiffre des **dixièmes** dans le nombre $4.519$ ?

Le chiffre des dixièmes est $\square$.

**Réponse attendue** : $5$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|} \text{unités} &  & \text{dixièmes} & \text{centièmes} & \text{millièmes} \\ 4 & , & \textcolor{#FF5722}{5} & 1 & 9 \end{array}
$$

_Étape 3_

Le chiffre des dixièmes est $\textcolor{#4CAF50}{5}$.

#### Tirage 3 (variation 3)

**Énoncé**

Quel est le chiffre des **unités** dans le nombre $4.502$ ?

Le chiffre des unités est $\square$.

**Réponse attendue** : $4$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|} \text{unités} &  & \text{dixièmes} & \text{centièmes} & \text{millièmes} \\ \textcolor{#FF5722}{4} & , & 5 & 0 & 2 \end{array}
$$

_Étape 3_

Le chiffre des unités est $\textcolor{#4CAF50}{4}$.

---

## N-POSITION — Connaître la position décimale

`5cc22ecd-351e-4959-ab27-79883cb9c9d3` · CM2 · niveau 7 · 7 variation(s) · correction rédigée

- Contrôle déclaré `digit` : le tableau relit le nombre, la colonne du rang porte la réponse.

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le chiffre des **centièmes** dans le nombre $3826.197$ ?

Le chiffre des centièmes est $\square$.

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|c|c|c|} \text{milliers} & \text{centaines} & \text{dizaines} & \text{unités} &  & \text{dixièmes} & \text{centièmes} & \text{millièmes} \\ 3 & 8 & 2 & 6 & , & 1 & \textcolor{#FF5722}{9} & 7 \end{array}
$$

_Étape 3_

Le chiffre des centièmes est $\textcolor{#4CAF50}{9}$.

#### Tirage 2 (variation 2)

**Énoncé**

Quel est le chiffre des **dixièmes** dans le nombre $3064.519$ ?

Le chiffre des dixièmes est $\square$.

**Réponse attendue** : $5$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|c|c|c|} \text{milliers} & \text{centaines} & \text{dizaines} & \text{unités} &  & \text{dixièmes} & \text{centièmes} & \text{millièmes} \\ 3 & 0 & 6 & 4 & , & \textcolor{#FF5722}{5} & 1 & 9 \end{array}
$$

_Étape 3_

Le chiffre des dixièmes est $\textcolor{#4CAF50}{5}$.

#### Tirage 3 (variation 3)

**Énoncé**

Quel est le chiffre des **unités** dans le nombre $6834.502$ ?

Le chiffre des unités est $\square$.

**Réponse attendue** : $4$

**Correction**

_Étape 1_

**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre dans le tableau, puis on lit la colonne demandée.

_Étape 2_

$$
\begin{array}{|c|c|c|c|c|c|c|c|} \text{milliers} & \text{centaines} & \text{dizaines} & \text{unités} &  & \text{dixièmes} & \text{centièmes} & \text{millièmes} \\ 6 & 8 & 3 & \textcolor{#FF5722}{4} & , & 5 & 0 & 2 \end{array}
$$

_Étape 3_

Le chiffre des unités est $\textcolor{#4CAF50}{4}$.

---

## N-ENCADR — Encadrer un nombre décimal au centième près

`6379fa20-672c-4771-9d48-6d167a7a922e` · CM1 · niveau 3 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Encadre ce nombre décimal au centième près.

$$\square < 7.996 < \square$$

**Réponse attendue** : $7.99$ ; $8$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{7.996}$ jusqu’aux centièmes, puis on ajoute $\textcolor{#2196F3}{0.01}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{7.996} - 0.006 &= 7.99 \end{align}
$$

_Étape 4_

$$
\begin{align} 7.99 + \textcolor{#2196F3}{0.01} &= 8 \end{align}
$$

_Étape 5_

Donc $7.99 < 7.996 < 8$.

#### Tirage 2 (variation 0)

**Énoncé**

Encadre ce nombre décimal au centième près.

$$\square < 9.115 < \square$$

**Réponse attendue** : $9.11$ ; $9.12$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{9.115}$ jusqu’aux centièmes, puis on ajoute $\textcolor{#2196F3}{0.01}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{9.115} - 0.005 &= 9.11 \end{align}
$$

_Étape 4_

$$
\begin{align} 9.11 + \textcolor{#2196F3}{0.01} &= 9.12 \end{align}
$$

_Étape 5_

Donc $9.11 < 9.115 < 9.12$.

#### Tirage 3 (variation 0)

**Énoncé**

Encadre ce nombre décimal au centième près.

$$\square < 2.055 < \square$$

**Réponse attendue** : $2.05$ ; $2.06$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{2.055}$ jusqu’aux centièmes, puis on ajoute $\textcolor{#2196F3}{0.01}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{2.055} - 0.005 &= 2.05 \end{align}
$$

_Étape 4_

$$
\begin{align} 2.05 + \textcolor{#2196F3}{0.01} &= 2.06 \end{align}
$$

_Étape 5_

Donc $2.05 < 2.055 < 2.06$.

---

## N-ENCADR — Encadrer un nombre décimal au dixième près

`32724446-558b-4eea-ad4a-13d7c6afe435` · CM1 · niveau 2 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Encadre ce nombre décimal au dixième près.

$$\square < 7.99 < \square$$

**Réponse attendue** : $7.9$ ; $8$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{7.99}$ jusqu’aux dixièmes, puis on ajoute $\textcolor{#2196F3}{0.1}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{7.99} - 0.09 &= 7.9 \end{align}
$$

_Étape 4_

$$
\begin{align} 7.9 + \textcolor{#2196F3}{0.1} &= 8 \end{align}
$$

_Étape 5_

Donc $7.9 < 7.99 < 8$.

#### Tirage 2 (variation 0)

**Énoncé**

Encadre ce nombre décimal au dixième près.

$$\square < 9.12 < \square$$

**Réponse attendue** : $9.1$ ; $9.2$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{9.12}$ jusqu’aux dixièmes, puis on ajoute $\textcolor{#2196F3}{0.1}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{9.12} - 0.02 &= 9.1 \end{align}
$$

_Étape 4_

$$
\begin{align} 9.1 + \textcolor{#2196F3}{0.1} &= 9.2 \end{align}
$$

_Étape 5_

Donc $9.1 < 9.12 < 9.2$.

#### Tirage 3 (variation 0)

**Énoncé**

Encadre ce nombre décimal au dixième près.

$$\square < 2.05 < \square$$

**Réponse attendue** : $2$ ; $2.1$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{2.05}$ jusqu’aux dixièmes, puis on ajoute $\textcolor{#2196F3}{0.1}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{2.05} - 0.05 &= 2 \end{align}
$$

_Étape 4_

$$
\begin{align} 2 + \textcolor{#2196F3}{0.1} &= 2.1 \end{align}
$$

_Étape 5_

Donc $2 < 2.05 < 2.1$.

---

## N-ENCADR — Encadrer un nombre décimal par deux entiers consécutifs

`fac5225d-2dae-49ec-b449-8900e7385fe6` · CM1 · niveau 1 · 1 variation(s) · correction rédigée

#### Tirage 1 (variation 0)

**Énoncé**

Encadre ce nombre décimal par deux entiers consécutifs.

$$\square < 7.9 < \square$$

**Réponse attendue** : $7$ ; $8$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{7.9}$ jusqu’aux unités, puis on ajoute $\textcolor{#2196F3}{1}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{7.9} - 0.9 &= 7 \end{align}
$$

_Étape 4_

$$
\begin{align} 7 + \textcolor{#2196F3}{1} &= 8 \end{align}
$$

_Étape 5_

Donc $7 < 7.9 < 8$.

#### Tirage 2 (variation 0)

**Énoncé**

Encadre ce nombre décimal par deux entiers consécutifs.

$$\square < 9.2 < \square$$

**Réponse attendue** : $9$ ; $10$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{9.2}$ jusqu’aux unités, puis on ajoute $\textcolor{#2196F3}{1}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{9.2} - 0.2 &= 9 \end{align}
$$

_Étape 4_

$$
\begin{align} 9 + \textcolor{#2196F3}{1} &= 10 \end{align}
$$

_Étape 5_

Donc $9 < 9.2 < 10$.

#### Tirage 3 (variation 0)

**Énoncé**

Encadre ce nombre décimal par deux entiers consécutifs.

$$\square < 2.1 < \square$$

**Réponse attendue** : $2$ ; $3$

**Correction**

_Étape 1_

**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.

_Étape 2_

On garde les chiffres de $\textcolor{#FF5722}{2.1}$ jusqu’aux unités, puis on ajoute $\textcolor{#2196F3}{1}$.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{2.1} - 0.1 &= 2 \end{align}
$$

_Étape 4_

$$
\begin{align} 2 + \textcolor{#2196F3}{1} &= 3 \end{align}
$$

_Étape 5_

Donc $2 < 2.1 < 3$.

---

## N-ENCADR — Trouver l'entier supérieur ou inférieur le plus proche

`b26e8a84-3788-40f8-baf0-23f0f96fe1f0` · CM1 · niveau 1 · 2 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Quel est le plus grand entier inférieur à $7.9$ ?

Le plus grand entier inférieur est $\square$.

**Réponse attendue** : $7$

**Correction**

_Étape 1_

**Entier le plus proche.** On supprime la partie décimale : c’est l’entier inférieur ; on lui ajoute $1$ : c’est l’entier supérieur.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{7.9} - 0.9 &= 7 \end{align}
$$

_Étape 3_

Donc $7 < 7.9 < 8$.

#### Tirage 2 (variation 0)

**Énoncé**

Quel est le plus petit entier supérieur à $9.2$ ?

Le plus petit entier supérieur est $\square$.

**Réponse attendue** : $10$

**Correction**

_Étape 1_

**Entier le plus proche.** On supprime la partie décimale : c’est l’entier inférieur ; on lui ajoute $1$ : c’est l’entier supérieur.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{9.2} - 0.2 &= \textcolor{#2196F3}{9} \end{align}
$$

_Étape 3_

$$
\begin{align} \textcolor{#2196F3}{9} + 1 &= 10 \end{align}
$$

_Étape 4_

Donc $9 < 9.2 < 10$.

#### Tirage 3 (variation 1)

**Énoncé**

Quel est le plus grand entier inférieur à $2.1$ ?

Le plus grand entier inférieur est $\square$.

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Entier le plus proche.** On supprime la partie décimale : c’est l’entier inférieur ; on lui ajoute $1$ : c’est l’entier supérieur.

_Étape 2_

$$
\begin{align} \textcolor{#FF5722}{2.1} - 0.1 &= 2 \end{align}
$$

_Étape 3_

Donc $2 < 2.1 < 3$.

---

## N-OPPOSE-EXPR — Déterminer l'opposé d'une expression

`aeb86af9-7bf1-440a-be17-735a41b5ce46` · 3 · niveau 1 · 1 variation(s) · correction rédigée

- Contrôle déclaré `transform: opposite` : le calcul part de −(A), A = expression posée.

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

#### Tirage 2 (variation 0)

**Énoncé**

Quel est l'opposé de cette expression ?

$$9 a$$

L'opposé est $\square$.

**Réponse attendue** : $-9 a$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe du terme $\textcolor{#FF5722}{9a}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{9a} \right) &= -9a \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Quel est l'opposé de cette expression ?

$$-6 a$$

L'opposé est $\square$.

**Réponse attendue** : $6 a$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe du terme $\textcolor{#FF5722}{-6a}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{-6a} \right) &= 6a \end{align}
$$

---

## N-OPPOSE-EXPR — Déterminer l'opposé d'une expression

`843c3186-afc6-4ccd-83f7-beab64d3e420` · 3 · niveau 2 · 1 variation(s) · correction rédigée

- Contrôle déclaré `transform: opposite` : le calcul part de −(A), A = expression posée.

#### Tirage 1 (variation 0)

**Énoncé**

Quel est l'opposé de cette expression ?

$$4 y + 9$$

L'opposé est $\square$.

**Réponse attendue** : $-4 y - 9$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe de chaque terme : $\textcolor{#FF5722}{4y}$ devient $\textcolor{#2196F3}{-4y}$ et $\textcolor{#FF5722}{+9}$ devient $\textcolor{#2196F3}{-9}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{4y}\textcolor{#FF5722}{+9} \right) &= -4y-9 \end{align}
$$

#### Tirage 2 (variation 0)

**Énoncé**

Quel est l'opposé de cette expression ?

$$9 a - 7$$

L'opposé est $\square$.

**Réponse attendue** : $-9 a + 7$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe de chaque terme : $\textcolor{#FF5722}{9a}$ devient $\textcolor{#2196F3}{-9a}$ et $\textcolor{#FF5722}{-7}$ devient $\textcolor{#2196F3}{+7}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{9a}\textcolor{#FF5722}{-7} \right) &= -9a+7 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Quel est l'opposé de cette expression ?

$$-6 x - 8$$

L'opposé est $\square$.

**Réponse attendue** : $6 x + 8$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe de chaque terme : $\textcolor{#FF5722}{-6x}$ devient $\textcolor{#2196F3}{6x}$ et $\textcolor{#FF5722}{-8}$ devient $\textcolor{#2196F3}{+8}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{-6x}\textcolor{#FF5722}{-8} \right) &= 6x+8 \end{align}
$$

---

## N-OPPOSE-EXPR — Opposé d'une expression

`34e569e7-7834-456f-8e48-65b2a1183030` · 2 · niveau 1 · 3 variation(s) · correction rédigée

- Contrôle déclaré `transform: opposite` : le calcul part de −(A), A = expression posée.

#### Tirage 1 (variation 1)

**Énoncé**

Quel est l'opposé de l'expression :

$$x + 9$$

L'opposé est $\square$.

**Réponse attendue** : $-x - 9$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe de chaque terme : $\textcolor{#FF5722}{x}$ devient $\textcolor{#2196F3}{-x}$ et $\textcolor{#FF5722}{+9}$ devient $\textcolor{#2196F3}{-9}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{x}\textcolor{#FF5722}{+9} \right) &= -x-9 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Quel est l'opposé de l'expression :

$$-7 - x$$

L'opposé est $\square$.

**Réponse attendue** : $7 + x$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe de chaque terme : $\textcolor{#FF5722}{-7}$ devient $\textcolor{#2196F3}{7}$ et $\textcolor{#FF5722}{-x}$ devient $\textcolor{#2196F3}{+x}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{-7} \textcolor{#FF5722}{- x} \right) &= 7+x \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Quel est l'opposé de l'expression :

$$-2 x$$

L'opposé est $\square$.

**Réponse attendue** : $2 x$

**Correction**

_Étape 1_

**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de chacun de ses termes : $-\left( a + b \right) = -a - b$.

_Étape 2_

On change le signe du terme $\textcolor{#FF5722}{-2x}$.

_Étape 3_

$$
\begin{align} -\left( \textcolor{#FF5722}{-2x} \right) &= 2x \end{align}
$$

---

## N-FACT-COMMUN — Trouver un facteur commun

`294c4316-d2c9-4894-9c3c-c2b24fdffc99` · 4 · niveau 1 · 8 variation(s) · correction rédigée

- Contrôle déclaré `end: factor` : le calcul part de la somme posée et finit sur un produit dont un facteur est la réponse.

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

#### Tirage 2 (variation 2)

**Énoncé**

Trouve un facteur commun (autre que 1).

$$9 \times 3 + 4 \times 9$$

Un facteur commun est $\square$.

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).

_Étape 2_

Dans $\textcolor{#FF5722}{9} \times 3$ et dans $4 \times \textcolor{#FF5722}{9}$, le facteur $\textcolor{#FF5722}{9}$ apparaît dans chaque terme.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{9} \times 3 + 4 \times \textcolor{#FF5722}{9} &= \textcolor{#FF5722}{9} \times \left( 3 + 4 \right) \end{align}
$$

_Étape 4_

Un facteur commun est donc $9$ (tout diviseur de $9$ autre que $1$ convient aussi).

#### Tirage 3 (variation 3)

**Énoncé**

Trouve un facteur commun (autre que 1).

$$2 \times 3 + 9 \times 3$$

Un facteur commun est $\square$.

**Réponse attendue** : $3$

**Correction**

_Étape 1_

**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).

_Étape 2_

Dans $2 \times \textcolor{#FF5722}{3}$ et dans $9 \times \textcolor{#FF5722}{3}$, le facteur $\textcolor{#FF5722}{3}$ apparaît dans chaque terme.

_Étape 3_

$$
\begin{align} 2 \times \textcolor{#FF5722}{3} + 9 \times \textcolor{#FF5722}{3} &= \textcolor{#FF5722}{3} \times \left( 2 + 9 \right) \end{align}
$$

_Étape 4_

Un facteur commun est donc $3$ (tout diviseur de $3$ autre que $1$ convient aussi).

---

## N-FACT-COMMUN — Trouver un facteur commun

`e66089e0-b7bd-49fe-a968-9a8df3d325fd` · 4 · niveau 3 · 12 variation(s) · correction rédigée

- Contrôle déclaré `end: factor` (facteur numérique ou lettre commune).

#### Tirage 1 (variation 1)

**Énoncé**

Trouve un facteur commun (autre que $1$).

$$5 z + 5 \times 9$$

Un facteur commun est $\square$.

**Réponse attendue** : $5$

**Correction**

_Étape 1_

**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).

_Étape 2_

Dans $\textcolor{#FF5722}{5}z$ et dans $\textcolor{#FF5722}{5} \times 9$, le facteur $\textcolor{#FF5722}{5}$ apparaît dans chaque terme.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{5}z + \textcolor{#FF5722}{5} \times 9 &= \textcolor{#FF5722}{5} \times \left( z + 9 \right) \end{align}
$$

_Étape 4_

Un facteur commun est donc $\textcolor{#4CAF50}{5}$.

#### Tirage 2 (variation 2)

**Énoncé**

Trouve un facteur commun (autre que $1$).

$$7 x + 7 z$$

Un facteur commun est $\square$.

**Réponse attendue** : $7$

**Correction**

_Étape 1_

**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).

_Étape 2_

Dans $\textcolor{#FF5722}{7}x$ et dans $\textcolor{#FF5722}{7}z$, le facteur $\textcolor{#FF5722}{7}$ apparaît dans chaque terme.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{7}x + \textcolor{#FF5722}{7}z &= \textcolor{#FF5722}{7} \times \left( x + z \right) \end{align}
$$

_Étape 4_

Un facteur commun est donc $\textcolor{#4CAF50}{7}$.

#### Tirage 3 (variation 3)

**Énoncé**

Trouve un facteur commun (autre que $1$).

$$2 y - 2 x$$

Un facteur commun est $\square$.

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).

_Étape 2_

Dans $\textcolor{#FF5722}{2}y$ et dans $\textcolor{#FF5722}{2}x$, le facteur $\textcolor{#FF5722}{2}$ apparaît dans chaque terme.

_Étape 3_

$$
\begin{align} \textcolor{#FF5722}{2}y - \textcolor{#FF5722}{2}x &= \textcolor{#FF5722}{2} \times \left( y - x \right) \end{align}
$$

_Étape 4_

Un facteur commun est donc $\textcolor{#4CAF50}{2}$.

---

## N-RACINE-AFF — Racine d'une fonction affine

`2bdb3db6-8ef7-43af-aa7a-2332e34d2a01` · 3 · niveau 1 · 2 variation(s) · correction rédigée

- Contrôle déclaré `equations: affine-root` : chaque ligne est une équation affine vérifiée par la réponse.

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

#### Tirage 2 (variation 0)

**Énoncé**

Pour quelle valeur de $x$ la fonction $f$ s'annule-t-elle ?

$$f\left( x \right) = 9 x - 7$$

$f\left(\square\right)=0$

**Réponse attendue** : $\dfrac{7}{9}$

**Correction**

_Étape 1_

**Racine d’une fonction affine.** $f\left( x \right) = a x + b$ (avec $a \neq 0$) s’annule pour la solution de l’équation $a x + b = 0$, c’est-à-dire $x = -\dfrac{b}{a}$.

_Étape 2_

On résout $9 x - 7 = 0$ : on isole $\textcolor{#FF5722}{x}$.

_Étape 3_

$$
\begin{align} 9x-7 &= 0 \\ 9\textcolor{#FF5722}{x} &= 7 \\ \textcolor{#FF5722}{x} &= \dfrac{7}{9} \\ \textcolor{#FF5722}{x} &= \dfrac{7}{9} \end{align}
$$

_Étape 4_

La fonction $f$ s’annule pour $\textcolor{#4CAF50}{x = \dfrac{7}{9}}$.

#### Tirage 3 (variation 1)

**Énoncé**

Pour quelle valeur de $x$ la fonction $f$ s'annule-t-elle ?

$$f\left( x \right) = -8 - 6 x$$

$f\left(\square\right)=0$

**Réponse attendue** : $-\dfrac{4}{3}$

**Correction**

_Étape 1_

**Racine d’une fonction affine.** $f\left( x \right) = a x + b$ (avec $a \neq 0$) s’annule pour la solution de l’équation $a x + b = 0$, c’est-à-dire $x = -\dfrac{b}{a}$.

_Étape 2_

On résout $-8 - 6 x = 0$ : on isole $\textcolor{#FF5722}{x}$.

_Étape 3_

$$
\begin{align} -8-6x &= 0 \\ -6\textcolor{#FF5722}{x} &= 8 \\ \textcolor{#FF5722}{x} &= \dfrac{8}{-6} \\ \textcolor{#FF5722}{x} &= -\dfrac{4}{3} \end{align}
$$

_Étape 4_

La fonction $f$ s’annule pour $\textcolor{#4CAF50}{x = -\dfrac{4}{3}}$.

---

## N-FRAC-ADD — Compléter une addition ou soustraction à trou

`7d12a172-405d-4281-af44-f02c265ad174` · 5 · niveau 1 · 6 variation(s) · correction rédigée

- Trou au dénominateur : contrôle déclaré `hole: denominator` (les autres dénominateurs donnent la réponse).

#### Tirage 1 (variation 1)

**Énoncé**

Complète.

$$\dfrac{7}{\square} + \dfrac{9}{19} = \dfrac{16}{19}$$

**Réponse attendue** : $19$

**Correction**

_Étape 1_

**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on soustrait) les numérateurs : $\dfrac{a}{d} + \dfrac{b}{d} = \dfrac{a + b}{d}$.

_Étape 2_

Toutes les autres fractions ont pour dénominateur $\textcolor{#2196F3}{19}$ : le dénominateur manquant est le même.

_Étape 3_

$$
\begin{align} ? &= 19 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète.

$$\dfrac{9}{5} + \dfrac{\square}{5} = \dfrac{12}{5}$$

**Réponse attendue** : $3$

**Correction**

_Étape 1_

**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on soustrait) les numérateurs : $\dfrac{a}{d} + \dfrac{b}{d} = \dfrac{a + b}{d}$.

_Étape 2_

Les dénominateurs sont égaux : on cherche le numérateur manquant dans l’égalité des numérateurs.

_Étape 3_

$$
\begin{align} ? &= 12 - 9 \\ &= 3 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Complète.

$$\dfrac{4}{11} - \dfrac{2}{\square} = \dfrac{2}{11}$$

**Réponse attendue** : $11$

**Correction**

_Étape 1_

**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on soustrait) les numérateurs : $\dfrac{a}{d} + \dfrac{b}{d} = \dfrac{a + b}{d}$.

_Étape 2_

Toutes les autres fractions ont pour dénominateur $\textcolor{#2196F3}{11}$ : le dénominateur manquant est le même.

_Étape 3_

$$
\begin{align} ? &= 11 \end{align}
$$

---

## N-FRAC-ADD — Compléter une addition ou soustraction à trou

`86b80159-8395-4546-8d0e-2828693b6d97` · 4 · niveau 2 · 6 variation(s) · correction rédigée

- Trou au dénominateur : contrôle déclaré `hole: denominator` (les autres dénominateurs donnent la réponse).

#### Tirage 1 (variation 1)

**Énoncé**

Complète cette égalité avec le nombre manquant.

$$\dfrac{5}{\square} + \dfrac{9}{19} = \dfrac{14}{19}$$

**Réponse attendue** : $19$

**Correction**

_Étape 1_

**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on soustrait) les numérateurs : $\dfrac{a}{d} + \dfrac{b}{d} = \dfrac{a + b}{d}$.

_Étape 2_

Toutes les autres fractions ont pour dénominateur $\textcolor{#2196F3}{19}$ : le dénominateur manquant est le même.

_Étape 3_

$$
\begin{align} ? &= 19 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète cette égalité avec le nombre manquant.

$$\dfrac{9}{5} + \dfrac{\square}{5} = \dfrac{2}{5}$$

**Réponse attendue** : $-7$

**Correction**

_Étape 1_

**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on soustrait) les numérateurs : $\dfrac{a}{d} + \dfrac{b}{d} = \dfrac{a + b}{d}$.

_Étape 2_

Les dénominateurs sont égaux : on cherche le numérateur manquant dans l’égalité des numérateurs.

_Étape 3_

$$
\begin{align} ? &= 2 - 9 \\ &= -7 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Complète cette égalité avec le nombre manquant.

$$\dfrac{-6}{11} - \dfrac{-8}{\square} = \dfrac{2}{11}$$

**Réponse attendue** : $11$

**Correction**

_Étape 1_

**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on soustrait) les numérateurs : $\dfrac{a}{d} + \dfrac{b}{d} = \dfrac{a + b}{d}$.

_Étape 2_

Toutes les autres fractions ont pour dénominateur $\textcolor{#2196F3}{11}$ : le dénominateur manquant est le même.

_Étape 3_

$$
\begin{align} ? &= 11 \end{align}
$$

---

## N-INVERSE — Calculer l'inverse d'un nombre

`4115768c-ddd5-4ecd-9436-ae3228dd9eed` · 4 · niveau 1 · 3 variation(s) · correction rédigée

#### Tirage 1 (variation 1)

**Énoncé**

Quel est l'inverse de ce nombre :

$$\dfrac{1}{14}$$

L'inverse de ce nombre est $\square$.

**Réponse attendue** : $14$

**Correction**

_Étape 1_

**Inverse.** L’inverse d’un nombre $a$ non nul est $\dfrac{1}{a}$ ; l’inverse de $\dfrac{a}{b}$ est $\dfrac{b}{a}$.

_Étape 2_

$$
\begin{align} \dfrac{1}{\textcolor{#FF5722}{\dfrac{1}{14}}} &= 1 \times \dfrac{14}{1} \\ &= 14 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Quel est l'inverse de ce nombre :

$$\dfrac{19}{4}$$

L'inverse de ce nombre est $\square$.

**Réponse attendue** : $\frac{4}{19}$

**Correction**

_Étape 1_

**Inverse.** L’inverse d’un nombre $a$ non nul est $\dfrac{1}{a}$ ; l’inverse de $\dfrac{a}{b}$ est $\dfrac{b}{a}$.

_Étape 2_

$$
\begin{align} \dfrac{1}{\textcolor{#FF5722}{\dfrac{19}{4}}} &= 1 \times \dfrac{4}{19} \\ &= \frac{4}{19} \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Quel est l'inverse de ce nombre :

$$5$$

L'inverse de ce nombre est $\square$.

**Réponse attendue** : $\frac{1}{5}$

**Correction**

_Étape 1_

**Inverse.** L’inverse d’un nombre $a$ non nul est $\dfrac{1}{a}$ ; l’inverse de $\dfrac{a}{b}$ est $\dfrac{b}{a}$.

_Étape 2_

$$
\begin{align} \dfrac{1}{\textcolor{#FF5722}{5}} &= \frac{1}{5} \end{align}
$$

---

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

## N-UNITES — Convertir dans une autre unité

`c31c9d95-aaab-4086-a1bd-ef94dd8d4c3d` · 6 · niveau 2 · 126 variation(s) · correction rédigée

- Généré variation par variation depuis la variable d’expression `a[U1] = ?[U2]`.
- Tableau : une colonne par unité (× 2 pour les aires, × 3 pour les volumes), le chiffre de `a` en orange, les zéros ajoutés en bleu.

#### Tirage 1 (variation 1)

**Énoncé**

Convertis dans l'unité demandée.

$$7~\unit{km} = \square~\unit{cm}$$

**Réponse attendue** : $700000$

**Correction**

_Étape 1_

**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité demandée. Passer à l’unité voisine plus petite multiplie par $10$.

_Étape 2_

De $\text{km}$ à $\text{cm}$, on passe 5 unités vers la droite du tableau : on multiplie par $\textcolor{#2196F3}{100000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|c|c|} \text{km} & \text{hm} & \text{dam} & \text{m} & \text{dm} & \text{cm} \\ \textcolor{#FF5722}{7} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 7 \times \textcolor{#2196F3}{100000} \\ &= 700000 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Convertis dans l'unité demandée.

$$9~\unit{km} = \square~\unit{dm}$$

**Réponse attendue** : $90000$

**Correction**

_Étape 1_

**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité demandée. Passer à l’unité voisine plus petite multiplie par $10$.

_Étape 2_

De $\text{km}$ à $\text{dm}$, on passe 4 unités vers la droite du tableau : on multiplie par $\textcolor{#2196F3}{10000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|c|} \text{km} & \text{hm} & \text{dam} & \text{m} & \text{dm} \\ \textcolor{#FF5722}{9} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 9 \times \textcolor{#2196F3}{10000} \\ &= 90000 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Convertis dans l'unité demandée.

$$2~\unit{km} = \square~\unit{m}$$

**Réponse attendue** : $2000$

**Correction**

_Étape 1_

**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité demandée. Passer à l’unité voisine plus petite multiplie par $10$.

_Étape 2_

De $\text{km}$ à $\text{m}$, on passe 3 unités vers la droite du tableau : on multiplie par $\textcolor{#2196F3}{1000}$.

_Étape 3_

$$
\begin{array}{|c|c|c|c|} \text{km} & \text{hm} & \text{dam} & \text{m} \\ \textcolor{#FF5722}{2} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} & \textcolor{#2196F3}{0} \end{array}
$$

_Étape 4_

$$
\begin{align} ? &= 2 \times \textcolor{#2196F3}{1000} \\ &= 2000 \end{align}
$$

---

## N-UNITES-VOL — Convertir dans une autre unité

`355bd41a-1589-4c25-be09-5f062bada81a` · 6 · niveau 1 · 8 variation(s) · correction rédigée

- Égalité posée lue dans l’énoncé (`a~\unit{U1} = ?~\unit{U2}`), vérifiée par le convertisseur d’unités.

#### Tirage 1 (variation 1)

**Énoncé**

Convertis dans l'unité demandée.

$7~\unit{L} = \square~\unit{m^3}$

**Réponse attendue** : $0.007$

**Correction**

_Étape 1_

**Litres et volumes.** $1~\text{L} = 1~\text{dm}^3$ et $1~\text{mL} = 1~\text{cm}^3$ ; $1~\text{m}^3 = 1000~\text{dm}^3$ et $1~\text{dm}^3 = 1000~\text{cm}^3$.

_Étape 2_

$1~\text{L}$ vaut $\textcolor{#2196F3}{0{,}001}~\text{m}^3$.

_Étape 3_

$$
\begin{align} ? &= 7 : \textcolor{#2196F3}{1000} \\ &= 0.007 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Convertis dans l'unité demandée.

$9~\unit{dm^3} = \square~\unit{L}$

**Réponse attendue** : $9$

**Correction**

_Étape 1_

**Litres et volumes.** $1~\text{L} = 1~\text{dm}^3$ et $1~\text{mL} = 1~\text{cm}^3$ ; $1~\text{m}^3 = 1000~\text{dm}^3$ et $1~\text{dm}^3 = 1000~\text{cm}^3$.

_Étape 2_

$1~\text{dm}^3$ vaut $\textcolor{#2196F3}{1}~\text{L}$.

_Étape 3_

$$
\begin{align} ? &= 9 \times 1 \\ &= 9 \end{align}
$$

#### Tirage 3 (variation 3)

**Énoncé**

Convertis dans l'unité demandée.

$2~\unit{L} = \square~\unit{dm^3}$

**Réponse attendue** : $2$

**Correction**

_Étape 1_

**Litres et volumes.** $1~\text{L} = 1~\text{dm}^3$ et $1~\text{mL} = 1~\text{cm}^3$ ; $1~\text{m}^3 = 1000~\text{dm}^3$ et $1~\text{dm}^3 = 1000~\text{cm}^3$.

_Étape 2_

$1~\text{L}$ vaut $\textcolor{#2196F3}{1}~\text{dm}^3$.

_Étape 3_

$$
\begin{align} ? &= 2 \times 1 \\ &= 2 \end{align}
$$

---

## N-UNITES — Calculer avec des unités

`b6269f1e-8323-4cd4-a578-b669df1c31bb` · 6 · niveau 3 · 3 variation(s) · correction rédigée

- Égalité posée avec unités (`c + d = ?[m]`), vérifiée par le convertisseur d’unités.

#### Tirage 1 (variation 1)

**Énoncé**

Complète.

$$7~\unit{mg} + 9~\unit{g} = \square~\unit{g}$$

**Réponse attendue** : $9.007$

**Correction**

_Étape 1_

**Calculer avec des unités.** On convertit dans la même unité avant d’additionner.

_Étape 2_

On convertit d’abord le premier nombre en $\text{g}$, puis on additionne.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#FF5722}{0.007} + 9 \\ &= 9.007 \end{align}
$$

#### Tirage 2 (variation 2)

**Énoncé**

Complète.

$$9~\unit{hL} + 2~\unit{L} = \square~\unit{L}$$

**Réponse attendue** : $902$

**Correction**

_Étape 1_

**Calculer avec des unités.** On convertit dans la même unité avant d’additionner.

_Étape 2_

On convertit d’abord le premier nombre en $\text{L}$, puis on additionne.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#FF5722}{900} + 2 \\ &= 902 \end{align}
$$

#### Tirage 3 (variation 0)

**Énoncé**

Complète.

$$2~\unit{dm} + 1~\unit{m} = \square~\unit{m}$$

**Réponse attendue** : $1.2$

**Correction**

_Étape 1_

**Calculer avec des unités.** On convertit dans la même unité avant d’additionner.

_Étape 2_

On convertit d’abord le premier nombre en $\text{m}$, puis on additionne.

_Étape 3_

$$
\begin{align} ? &= \textcolor{#FF5722}{0.2} + 1 \\ &= 1.2 \end{align}
$$

---
