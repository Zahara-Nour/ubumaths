# Plan — « Entraînement technique — Loi géométrique » (T_COMP)

Dossier de sortie : `.../scratchpad/geom/technique/`. Catégorie `automatisme`. Variation `guided` seule.
Clés `T01`…`T10`. 6 sections. Valeurs « ≈ » : à calculer exactement et asserter (arrondi 10⁻⁴).

## s1 « Reconnaître une loi géométrique » (en « Recognising a geometric distribution »)

**T01 — « Loi géométrique ou pas ? »** (en « Geometric or not? »)
Pour chaque variable, dire si elle suit une loi géométrique, une loi binomiale ou aucune des deux ; donner
le ou les paramètres ; sinon dire quelle condition manque.
a) On lance un dé équilibré jusqu'à obtenir un 6 ; N = rang du premier 6 → $\mathcal{G}(1/6)$.
b) On lance 10 fois un dé équilibré ; S = nombre de 6 → $\mathcal{B}(10\,;1/6)$ (nombre d'épreuves fixé, on compte des succès).
c) Une urne contient 3 boules rouges et 7 noires ; on tire AVEC remise jusqu'à obtenir une rouge ; R = nombre de tirages → $\mathcal{G}(0.3)$.
d) Même urne, tirages SANS remise jusqu'à obtenir une rouge → non (les tirages ne sont pas indépendants ; d'ailleurs R ⩽ 8).
e) On lance une pièce équilibrée jusqu'à obtenir pile ; Y = nombre de « face » obtenus avant le premier pile → non au sens du cours : Y prend la valeur 0 ; Y = X − 1 où X suit $\mathcal{G}(1/2)$.
f) On lance une pièce jusqu'à obtenir deux « pile » de suite ; Z = nombre de lancers → non (le « succès » ne se lit pas sur une seule épreuve).

**T02 — « L'arbre du premier succès »** (en « The first-success tree »)
On répète une épreuve de Bernoulli de paramètre 0.3, de façon indépendante, jusqu'au premier succès ; X = rang du premier succès.

1. Construire l'arbre des trois premières épreuves (arbre en peigne : seule la branche $\overline{S}$ se prolonge ; probtree au corrigé).
2. P(X = 1) = 0.3 ; P(X = 2) = 0.7 × 0.3 = 0.21 ; P(X = 3) = 0.7² × 0.3 = 0.147.
3. P(X > 3) = 0.7³ = 0.343 (les trois premières épreuves sont des échecs) ; vérifier 0.3 + 0.21 + 0.147 + 0.343 = 1.
4. Conjecturer puis justifier P(X = k) = 0.7^{k−1} × 0.3 (k − 1 échecs puis un succès, épreuves indépendantes) ; en déduire que X suit $\mathcal{G}(0.3)$.

## s2 « Calculer des probabilités » (en « Calculating probabilities »)

**T03 — « Calculer P(X = k) »** (en « Calculating P(X = k) »)
X suit $\mathcal{G}(0.2)$. Rappel de la formule au début du corrigé.

1. P(X = 1) = 0.2. 2. P(X = 3) = 0.8² × 0.2 = 0.128. 3. P(X = 5) = 0.8⁴ × 0.2 = 0.08192.
2. P(X = 10) = 0.8⁹ × 0.2 ≈ 0.0268.
3. Comparer P(X = 1), P(X = 2), P(X = 3) : chaque probabilité s'obtient en multipliant la précédente par 0.8 ; la valeur la plus probable de X est 1 (quel que soit p, remarque).

**T04 — « Probabilités cumulées »** (en « Cumulative probabilities »)
X suit $\mathcal{G}(1/4)$. Valeurs exactes en fractions, puis arrondies à 10⁻⁴ quand elles ne sont pas simples.

1. Justifier P(X > k) = (3/4)^k (les k premières épreuves sont des échecs), puis P(X ⩽ k) = 1 − (3/4)^k.
2. P(X > 2) = 9/16 ; P(X ⩽ 2) = 7/16 (vérifier avec P(X = 1) + P(X = 2) = 1/4 + 3/16).
3. P(X ⩽ 5) = 1 − (3/4)⁵ = 781/1024 ≈ 0.7627.
4. P(X ⩾ 4) = P(X > 3) = 27/64.
5. P(3 ⩽ X ⩽ 6) = P(X > 2) − P(X > 6) = 9/16 − 729/4096 = 1575/4096 ≈ 0.3845.

**T05 — « Retrouver le paramètre »** (en « Finding the parameter »)
X suit une loi géométrique de paramètre p inconnu.

1. P(X = 1) = 0.15 → p = 0.15.
2. E(X) = 8 → p = 1/8 = 0.125 (espérance admise E = 1/p, rappelée au corrigé).
3. P(X > 2) = 0.49 → (1 − p)² = 0.49, 1 − p = 0.7 (positif) → p = 0.3.
4. P(X = 2) = 0.24 et p > 0.5 : p(1 − p) = 0.24 → p = 0.4 ou p = 0.6 → p = 0.6 (second degré, discriminant au corrigé).

## s3 « Représenter la loi » (en « Representing the distribution »)

**T06 — « Diagramme en barres »** (en « Bar chart »)
X suit $\mathcal{G}(1/2)$.

1. Tableau de P(X = k) pour k = 1 à 6 : 1/2, 1/4, 1/8, 1/16, 1/32, 1/64 (6 colonnes de valeurs).
2. Tracer le diagramme en barres (bloc ` ```barres ` au corrigé ; l'énoncé demande de le tracer).
3. Les hauteurs forment une suite géométrique de raison 1 − p = 1/2 : c'est l'origine du nom de la loi.
4. Somme des 6 premières probabilités : 63/64 = 1 − (1/2)⁶ ; plus généralement P(X = 1) + … + P(X = n) = 1 − (1/2)^n, qui tend vers 1 quand n tend vers +∞ (lien avec la somme d'une suite géométrique ; pas de série infinie écrite).

## s4 « Espérance » (en « Expectation »)

**T07 — « Espérance d'une loi géométrique »** (en « Expectation of a geometric distribution »)

1. E(X) pour X suivant $\mathcal{G}(0.2)$ : 5 ; $\mathcal{G}(1/6)$ : 6 ; $\mathcal{G}(0.04)$ : 25 ; $\mathcal{G}(0.3)$ : 10/3 ≈ 3.33.
2. Interpréter E = 6 pour le premier 6 d'un dé : sur un grand nombre de répétitions, il faut en moyenne 6 lancers pour obtenir le premier 6.
3. Comment évolue E(X) quand p augmente ? (diminue : plus le succès est probable, moins on l'attend.)
4. Un candidat au permis réussit l'examen à chaque passage avec probabilité 0.6, indépendamment ; N = nombre de passages jusqu'à la réussite ; E(N) = 5/3 ≈ 1.67.

## s5 « Absence de mémoire » (en « The memoryless property »)

**T08 — « Démontrer l'absence de mémoire »** (en « Proving the memoryless property »)

1. X suit $\mathcal{G}(0.4)$. Calculer P(X > 3), P(X > 5) puis $P_{X>3}(X>5)$ = 0.6⁵/0.6³ = 0.36 (expliquer que {X > 5} ∩ {X > 3} = {X > 5}). Comparer avec P(X > 2) = 0.36.
2. Cas général (démonstration TCOMP-307, très guidée) : X suit $\mathcal{G}(p)$, m et n entiers ⩾ 1. Montrer $P_{X>m}(X>m+n)=(1-p)^n=P(X>n)$.
3. Interpréter en une phrase : savoir qu'on a déjà subi m échecs ne change pas la probabilité d'attendre encore plus de n épreuves.

**T09 — « Utiliser l'absence de mémoire »** (en « Using the memoryless property »)
X suit $\mathcal{G}(0.25)$. On sait que X > 4.

1. $P_{X>4}(X>6)$ = P(X > 2) = 0.75² = 0.5625.
2. $P_{X>4}(X=6)$ = P(X = 2) = 0.75 × 0.25 = 0.1875 (justifier par l'absence de mémoire, OU par le calcul P(X = 6)/P(X > 4) ; le corrigé fait les deux pour la première, la propriété seule ensuite).
3. $P_{X>4}(X\leqslant 7)$ = P(X ⩽ 3) = 1 − 0.75³ = 0.578125 ≈ 0.5781.

## s6 « Déterminer un seuil » (en « Finding a threshold »)

**T10 — « Seuil avec le logarithme »** (en « Threshold with logarithms »)

1. X suit $\mathcal{G}(0.1)$. Plus petit entier n tel que P(X ⩽ n) ⩾ 0.9 : 1 − 0.9ⁿ ⩾ 0.9 ⇔ 0.9ⁿ ⩽ 0.1 ⇔ n ln 0.9 ⩽ ln 0.1 ⇔ n ⩾ ln 0.1 / ln 0.9 ≈ 21.85 (changement de sens : ln 0.9 < 0) → n = 22. Vérifier : 0.9²¹ ≈ 0.1094 > 0.1 et 0.9²² ≈ 0.0985 ⩽ 0.1.
2. Y suit $\mathcal{G}(0.05)$. Plus petit n tel que P(Y ⩽ n) ⩾ 0.5 : n ⩾ ln 0.5 / ln 0.95 ≈ 13.51 → n = 14 (vérification des deux puissances, assertées).
3. Interpréter le 2 : à partir de 14 épreuves, on a plus d'une chance sur deux d'avoir déjà obtenu le premier succès — alors que E(Y) = 20 (remarque : médiane et espérance ne coïncident pas ; dire « en moyenne 20 » sans parler de médiane).
