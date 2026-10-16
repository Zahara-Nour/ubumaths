# Plan — « Entraînement technique — Loi binomiale » (T_COMP)

Dossier de sortie : `.../scratchpad/binom/technique/`. Catégorie `automatisme`. Variation `guided` seule.
Clés `T01`…`T14`. 7 sections. Valeurs « ≈ » : à calculer et asserter (arrondi 10⁻⁴).

## s1 « Épreuve et loi de Bernoulli » (en : « Bernoulli trials and the Bernoulli distribution »)

**T01 — « Reconnaître une épreuve de Bernoulli »** (en « Recognising a Bernoulli trial »)
Pour chaque expérience, dire s'il s'agit d'une épreuve de Bernoulli ; si oui préciser le succès et p.
a) Lancer un dé équilibré à 6 faces, succès « obtenir 6 » → oui, p = 1/6.
b) Tirer une carte d'un jeu de 32 cartes, on note sa couleur parmi ♠ ♥ ♦ ♣ (4 issues) → non (4 issues), mais devient une épreuve de Bernoulli si l'on s'intéresse à « obtenir un cœur », p = 1/4.
c) Répondre au hasard à une question de QCM à 3 réponses dont une seule juste, succès « bonne réponse » → oui, p = 1/3.
d) Interroger au hasard un élève d'un lycée où 42 % des élèves sont internes, succès « interne » → oui, p = 0.42.
Puis : X variable de Bernoulli associée à d) (X = 1 si succès, 0 sinon) : tableau de loi, E(X) = 0.42.

**T02 — « Espérance et écart type d'une loi de Bernoulli »**

1. X de Bernoulli de paramètre 0.3 : loi (tableau), E = 0.3, V = 0.21 (par la définition Σ pₖ(xₖ−E)² ou König-Huygens), σ = √0.21 ≈ 0.4583.
2. Y de Bernoulli de paramètre 2/5 : E = 2/5, V = 6/25, σ = √6/5 (valeur exacte) ≈ 0.4899.
3. Pour quelle valeur de p la variance p(1−p) est-elle maximale ? (lecture : p = 1/2, V = 1/4 ; justification par le second degré, sommet de la parabole).

## s2 « Schéma de Bernoulli et arbre » (en « Bernoulli processes and tree diagrams »)

**T03 — « Arbre d'un schéma de Bernoulli »**
On répète 3 fois, de façon indépendante, une épreuve de Bernoulli de paramètre p = 0.4 ; S succès.

1. Construire l'arbre (probtree, 3 niveaux, au corrigé ; l'énoncé peut donner l'arbre à compléter ou demander de le tracer).
2. P(SSS) = 0.064 ; P(S̄S̄S̄) = 0.216.
3. Chemins à exactement un succès : 3 chemins, chacun 0.4×0.6² = 0.144 → P = 0.432.
4. X nombre de succès : loi complète 0 : 0.216 ; 1 : 0.432 ; 2 : 0.288 ; 3 : 0.064 (somme 1).
5. P(au moins un succès) = 1 − 0.216 = 0.784.

**T04 — « Compter les chemins »**
Un dé équilibré lancé 3 fois, succès « obtenir 6 ». Sans tracer tout l'arbre :

1. Lister les chemins à exactement 2 succès (SSS̄, SS̄S, S̄SS) → 3 chemins.
2. Probabilité d'un tel chemin : (1/6)²×(5/6) = 5/216.
3. P(exactement deux 6) = 15/216 = 5/72.
4. P(au moins un 6) = 1 − (5/6)³ = 91/216.

## s3 « Coefficients binomiaux » (en « Binomial coefficients »)

**T05 — « Le triangle de Pascal »**

1. Compléter le triangle de Pascal jusqu'à la ligne n = 7 (tableau markdown, lignes n = 0…7, colonnes k = 0…7 → 9 colonnes, TROP : présenter en deux tableaux ou au corrigé sous forme de lignes de texte « n = 7 : 1, 7, 21, 35, 35, 21, 7, 1 ». À toi de choisir une présentation qui passe le contrôle des 6 colonnes et reste lisible ; décrire ton choix).
   Énoncé : donner les lignes n = 0 à 4 complètes et demander les lignes 5, 6, 7 en rappelant la règle « chaque coefficient est la somme des deux coefficients situés au-dessus ».
2. Lire : $\binom{5}{2}=10$, $\binom{6}{3}=20$, $\binom{7}{4}=35$, $\binom{7}{0}=1$.
3. Interpréter $\binom{5}{2}=10$ : nombre de chemins à 2 succès dans un schéma de Bernoulli de 5 épreuves.

**T06 — « Propriétés des coefficients binomiaux »**

1. Sans calculatrice : $\binom{n}{0}=1$, $\binom{n}{n}=1$, $\binom{n}{1}=n$ (justifier par les chemins : un seul chemin sans succès ; n chemins à un succès, selon la place du succès). Applications : $\binom{12}{0}$, $\binom{12}{1}$, $\binom{12}{12}$.
2. Symétrie $\binom{n}{n-k}=\binom{n}{k}$ (échanger succès et échecs) : $\binom{20}{19}=20$, $\binom{10}{8}=\binom{10}{2}=45$ (45 à justifier par le triangle prolongé ou la calculatrice).
3. Relation de Pascal : $\binom{7}{2}+\binom{7}{3}=\binom{8}{3}=56$.
4. À la calculatrice : $\binom{20}{5}=15504$, $\binom{30}{15}=155117520$.

## s4 « Reconnaître une loi binomiale » (en « Recognising a binomial distribution »)

**T07 — « Loi binomiale ou pas ? »**
Pour chaque variable, dire si elle suit une loi binomiale ; si oui donner n et p ; sinon dire quelle condition manque.
a) On lance 10 fois un dé équilibré ; X = nombre de 6 → B(10 ; 1/6).
b) Une urne contient 5 boules rouges et 3 noires ; on tire successivement 3 boules SANS remise ; X = nombre de rouges → non (les tirages ne sont pas indépendants : la composition change).
c) Même urne, 5 tirages AVEC remise ; X = nombre de rouges → B(5 ; 5/8).
d) On lance un dé jusqu'à obtenir un 6 ; X = nombre de lancers → non (le nombre d'épreuves n'est pas fixé à l'avance).
e) On interroge 20 personnes au hasard dans une grande ville où 30 % des habitants utilisent les transports en commun ; la population est assez grande pour assimiler le choix à un tirage avec remise ; X = nombre d'utilisateurs → B(20 ; 0.3).
f) On lance 8 fois une pièce ; X = nombre de « pile » moins nombre de « face » → non (X n'est pas un nombre de succès ; X = 2P − 8 où P ~ B(8 ; 1/2) — à dire simplement).

## s5 « Calculer avec la formule » (en « Using the formula »)

**T08 — « Probabilités avec la formule »**
X ~ B(4 ; 0.3). Rappel de la formule dans le corrigé d'introduction.

1. P(X = 0) = 0.7⁴ = 0.2401.
2. P(X = 2) = $\binom{4}{2}$×0.3²×0.7² = 6×0.09×0.49 = 0.2646.
3. P(X = 4) = 0.0081.
4. P(X ⩾ 1) = 1 − 0.2401 = 0.7599.
5. P(X = 1) = 4×0.3×0.343 = 0.4116 ; P(X = 3) = 4×0.027×0.7 = 0.0756 ; vérifier que la somme des 5 probabilités vaut 1.

**T09 — « Loi complète et diagramme en barres »**
X ~ B(5 ; 1/2).

1. Coefficients $\binom{5}{k}$ : 1, 5, 10, 10, 5, 1.
2. Loi : P(X=k) = $\binom{5}{k}/32$ : 1/32, 5/32, 5/16, 5/16, 5/32, 1/32 (tableau 6 colonnes de valeurs : OK).
3. Diagramme en barres (bloc ` ```barres ` au corrigé ; l'énoncé demande de le tracer) ; remarque sur la symétrie (p = 1/2).
4. P(X ⩽ 2) = 1/2 ; P(X ⩾ 4) = 3/16.

## s6 « Calculer à la calculatrice » (en « Using a calculator »)

**T10 — « Traduire un événement »**
X ~ B(15 ; 0.4). Exprimer à l'aide de probabilités du type P(X ⩽ k) (sans calculer) :
a) P(X < 6) = P(X ⩽ 5) ; b) P(X > 3) = 1 − P(X ⩽ 3) ; c) P(X ⩾ 4) = 1 − P(X ⩽ 3) ;
d) P(3 < X ⩽ 7) = P(X ⩽ 7) − P(X ⩽ 3) ; e) P(5 ⩽ X ⩽ 9) = P(X ⩽ 9) − P(X ⩽ 4).
Puis calculer c) et e) à la calculatrice (à asserter, arrondi 10⁻⁴).

**T11 — « Probabilités à la calculatrice »**
X ~ B(20 ; 0.35). À la calculatrice, arrondir à 10⁻⁴ :

1. P(X = 7) ; 2. P(X ⩽ 5) ; 3. P(X ⩾ 10) = 1 − P(X ⩽ 9) ; 4. P(4 ⩽ X ⩽ 8) = P(X ⩽ 8) − P(X ⩽ 3) ; 5. P(X > 20) = 0 et P(X ⩽ 20) = 1 (sans calcul).
   Toutes les valeurs à calculer exactement puis arrondir, assertées.

## s7 « Espérance, écart type, intervalle » (en « Expectation, standard deviation, interval »)

**T12 — « Espérance et écart type »**

1. X ~ B(50 ; 0.2) : E = 10, V = 8, σ = 2√2 ≈ 2.83 (centième).
2. Y ~ B(100 ; 0.05) : E = 5, V = 4.75, σ ≈ 2.18.
3. Z ~ B(12 ; 1/3) : E = 4, V = 8/3, σ = √(8/3) = 2√6/3 ≈ 1.63.
4. Interpréter E(X) = 10 : « sur un grand nombre de répétitions du schéma, on obtient en moyenne 10 succès ».

**T13 — « Retrouver les paramètres »**

1. X ~ B(n ; p) avec E(X) = 6 et V(X) = 4.2 : 1 − p = 4.2/6 = 0.7 → p = 0.3, n = 20.
2. X ~ B(n ; 0.25) avec E(X) = 15 → n = 60, σ = √11.25 = 3√5/2 ≈ 3.35.

**T14 — « Intervalle de probabilité au moins 0.95 »**
X ~ B(50 ; 0.4). L'énoncé donne une table VERTICALE de P(X ⩽ k) (arrondie à 10⁻⁴) pour k = 11 à 29.

1. Lire le plus petit entier a tel que P(X ⩽ a) > 0.025.
2. Lire le plus petit entier b tel que P(X ⩽ b) ⩾ 0.975.
3. En déduire P(a ⩽ X ⩽ b) = P(X ⩽ b) − P(X ⩽ a−1) ⩾ 0.95 (valeur à calculer et asserter).
4. Comparer l'amplitude de [a ; b] à 4σ (σ = √12 ≈ 3.46) — remarque seulement.
   a et b à calculer exactement (math.comb, Fraction) et asserter ; la table et les lectures doivent être cohérentes avec les arrondis affichés (vérifier qu'aucun arrondi ne fait basculer une lecture).
