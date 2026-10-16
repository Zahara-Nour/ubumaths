# Plan — « Applications de la loi binomiale » (T_COMP)

Dossier de sortie : `.../scratchpad/binom/applications/`. Catégorie `application`.
Clés en MAJUSCULES. 4 sections, 8 exercices. Valeurs « ≈ » : calculer exactement, arrondir à 10⁻⁴, asserter.
Chaque exercice commence par une phrase de mise en situation ; la version guidée fait justifier
explicitement la loi binomiale (épreuve, succès, p, répétition identique et indépendante, n, X nombre de succès).
Illustrations : 2 ou 3 au total, là où elles aident (proposées : GRAINES, AVION, DE) — SVG simple, sans réponse.

## s1 « Modéliser par une loi binomiale » (en « Modelling with a binomial distribution »)

**GRAINES — « Le sachet de graines »** (en « The seed packet ») — guided + autonomous
Un sachet contient 40 graines ; chaque graine germe avec probabilité 0.85, indépendamment des autres. G = nombre de graines qui germent.

1. Justifier G ~ B(40 ; 0.85).
2. P(G = 40) = 0.85⁴⁰ ≈ (asserter).
3. P(G ⩾ 35) (calculatrice) ≈.
4. E(G) = 34 ; interpréter.
5. Le fabricant affiche « au moins 30 graines germent dans 95 % des sachets ». Calculer P(G ⩾ 30) ≈ et conclure (à asserter ; la conclusion dépend du résultat — vérifie-la).
   Autonome : mêmes données ; « Le fabricant affiche … Cette affirmation est-elle justifiée ? Combien de graines germent en moyenne ? »

**TIRS — « Les tirs au but »** (en « Penalty shots »)
Une joueuse réussit chaque tir au but avec probabilité 0.8, indépendamment. Elle tire 5 fois ; R = nombre de réussites.

1. Arbre des 2 premiers tirs (probtree), P(réussir les deux) = 0.64.
2. R ~ B(5 ; 0.8). P(R = 5) = 0.32768 ; P(R = 4) = 5×0.8⁴×0.2 = 0.4096 ; P(R ⩾ 4) = 0.73728.
3. P(R ⩽ 2) = 1 − P(R ⩾ 3) ; P(R ⩾ 3) = 0.94208 → P(R ⩽ 2) = 0.05792.
4. E(R) = 4.

## s2 « Répétitions et seuils » (en « Repetitions and thresholds »)

**DEFAUTS — « Au moins un composant défectueux »** (en « At least one faulty component ») — guided + autonomous
Un composant est défectueux avec probabilité 0.02, indépendamment des autres. On prélève n composants (production assez grande pour assimiler à un tirage avec remise). D = nombre de défectueux.

1. Pour n = 10 : P(D = 0) = 0.98¹⁰ ≈ 0.8171 ; P(D ⩾ 1) ≈ 0.1829.
2. Cas général : P(D ⩾ 1) = 1 − 0.98ⁿ.
3. Plus petit n tel que P(D ⩾ 1) ⩾ 0.5 : 0.98ⁿ ⩽ 0.5 ⇔ n ln 0.98 ⩽ ln 0.5 ⇔ n ⩾ ln 0.5 / ln 0.98 (≈ 34.31 ; ATTENTION au changement de sens, ln 0.98 < 0) → n = 35.
4. Même question avec 0.9 : n ⩾ ln 0.1/ln 0.98 ≈ 113.97 → n = 114.
   Autonome : « À partir de combien de composants prélevés la probabilité d'en trouver au moins un défectueux dépasse-t-elle 90 % ? »

## s3 « Espérance et décision » (en « Expectation and decisions »)

**QCM — « Répondre au hasard à un QCM »** (en « Guessing on a multiple-choice test »)
QCM de 10 questions, 4 réponses dont une seule juste ; un élève répond entièrement au hasard. N = nombre de bonnes réponses.

1. N ~ B(10 ; 1/4). E(N) = 2.5.
2. P(N = 10) = (1/4)¹⁰ = 1/1048576 ≈ 9.5×10⁻⁷ (écrire « environ une chance sur un million ») ; P(N ⩾ 5) ≈ (calculatrice).
3. Barème : +1 par bonne réponse, −0.5 par mauvaise (pas d'abstention). Note T = N − 0.5(10 − N) = 1.5N − 5. E(T) = 1.5×2.5 − 5 = −1.25 (linéarité, vue en 1re).
4. Quelle pénalité x par mauvaise réponse rend l'espérance de la note nulle quand on répond au hasard ? E = 2.5 − x×7.5 = 0 → x = 1/3.

**KERMESSE — « Le stand de la kermesse »** (en « The fête stall ») — guided + autonomous
Partie à 2 € : on lance 4 fois une fléchette ; chaque lancer touche la cible avec probabilité 1/3, indépendamment. Le stand rend 3 € par cible touchée. X = nombre de cibles touchées, G = gain net = 3X − 2.

1. X ~ B(4 ; 1/3) ; loi complète : 16/81, 32/81, 24/81 = 8/27, 8/81, 1/81.
2. E(X) = 4/3 ; E(G) = 3×4/3 − 2 = 2 → le jeu est favorable au joueur : le stand perd 2 € par partie en moyenne.
3. Le stand veut un gain moyen pour lui de 0.50 € par partie en gardant la mise de 2 €. Quelle somme s par cible touchée ? E(G) = s×4/3 − 2 = −0.5 → s = 1.125 € (1,125 €… peu pratique ; vérifier et, si tu préfères des valeurs rondes, choisir un objectif qui donne une somme ronde : gain du stand 0.40 € → s = 1.20 €. Choisis la variante qui donne une somme ronde et décris ton choix).
4. Avec cette somme, P(G > 0) : le joueur gagne de l'argent ⇔ s×X > 2 (à calculer et asserter).
   Autonome : « Le stand est-il rentable ? Proposer une somme par cible touchée pour que le stand gagne en moyenne … par partie. »

## s4 « Prendre une décision » (en « Making a decision »)

**DE — « Le dé est-il truqué ? »** (en « Is the die loaded? »)
On lance 60 fois un dé ; on obtient 18 fois le 6. Si le dé est équilibré, X = nombre de 6 suit B(60 ; 1/6).

1. E(X) = 10.
2. Table verticale de P(X ⩽ k) fournie (k = 3 à 19, arrondis 10⁻⁴).
3. a plus petit entier tel que P(X ⩽ a) > 0.025 ; b plus petit entier tel que P(X ⩽ b) ⩾ 0.975 ; P(a ⩽ X ⩽ b) ⩾ 0.95 (calculer, asserter).
4. Règle : si le nombre de 6 observé est hors de [a ; b], on considère le dé comme truqué (risque d'erreur d'environ 5 %). 18 est-il dans l'intervalle ? Conclure (à vérifier : la table doit faire apparaître si 18 > b).
   Si 18 tombe DANS l'intervalle, choisis un nombre observé qui tombe dehors et décris ton choix.

**CONTROLE — « Le contrôle qualité »** (en « Quality control »)
Une machine produit 5 % de pièces défectueuses quand elle est bien réglée. On prélève 100 pièces (tirage assimilé avec remise) ; D = nombre de défectueuses.

1. D ~ B(100 ; 0.05), E(D) = 5, σ ≈ 2.18.
2. Intervalle [a ; b] comme ci-dessus (table verticale k = 0 à 12 fournie).
3. Un prélèvement donne 11 pièces défectueuses ; faut-il régler la machine ? (vérifier 11 > b).
4. Un autre en donne 2 : conclusion (dans l'intervalle → pas de raison d'intervenir).

**AVION — « La surréservation »** (en « Overbooking ») — guided + autonomous
Un avion a 150 places. La compagnie vend 160 billets ; chaque passager se présente à l'embarquement avec probabilité 0.92, indépendamment. X = nombre de passagers qui se présentent.

1. X ~ B(160 ; 0.92) ; E(X) = 147.2.
2. Probabilité que des passagers soient refusés : P(X > 150) = 1 − P(X ⩽ 150) ≈ (asserter).
3. La compagnie veut que ce risque reste inférieur à 5 %. Avec 160 billets vendus, est-ce le cas ? Combien de billets peut-elle vendre au maximum (n tel que P(X_n > 150) < 0.05, X_n ~ B(n ; 0.92)) ? — à calculer par balayage, asserter n et les deux probabilités qui l'encadrent ; corrigé : tableau de la probabilité pour quelques n autour de la réponse.
   Autonome : même situation, question 3 seule (« Combien de billets la compagnie peut-elle vendre … ? Justifier »).
