# Tâches calculatrice — tous les niveaux (complément à guides-calculatrices-progress.md)

Statuts : **P** = le programme le demande (outil cité ou calcul numérique attendu) · **V** = méthode
algébrique/graphique/tableur attendue, la calculatrice VÉRIFIE · **E** = pratique / examen / usage
laissé au professeur.

Sources lues : seeds `docs/archive/wip/arbre-notions/seed-*.md` (codes ci-dessous) + textes bruts des BO,
introductions comprises, retrouvés dans un ancien scratchpad
(`/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/e05b1216-…/scratchpad/bo/*.txt` : c2, c3,
c4, 1ensci, 1techno, ttechno, tcomp, texp, 1spe, tspe). Ce scratchpad est hors dépôt et temporaire.
Filiation = table `grade_predecessors` (migration `20261007230000_schema_cible_points.sql`, l. 175-190).

---

## Niveaux SANS calculatrice

- **CP, CE1, CE2 : aucun guide.** BO cycle 2 (arrêté du 22-10-2024) : « les élèves ne seront pas
  amenés à utiliser de calculatrice au cycle 2 » (c2.txt l. 128-129) ; « La calculatrice n'est pas
  utilisée au cycle 2 en dehors d'un usage prescrit pour des élèves à besoins particuliers »
  (l. 295, 841, 1373 : une fois par année). Repris dans seed-cycle2.md l. 37 et
  programmes-ecarts-cycle2.md l. 21 et 222. Aucun point du seed ne cite d'outil.
- **T_GEN : aucune source.** Pas de seed, pas de programme de maths (`grades.ts` l. 22 : « pas de
  maths dans le tronc commun » ; schema-cible-spec.md C21 ; T_GEN est absent de `grade_predecessors`).
  Le texte de l'enseignement scientifique de terminale ne figure pas dans le dépôt : invérifiable.
  Si un guide est voulu : reprendre celui de 1_GEN.

## CM1 / CM2 : calculatrice d'appoint, distribuée par le maître

Cadre (c3.txt) : « les élèves du cycle 3 n'utilisent pas de calculatrice au quotidien. Au cours moyen,
ils ne disposent pas de calculatrice personnelle » ; le professeur peut en distribuer « pour aborder
une tâche spécifique » ou pour certains élèves, par exemple « pour résoudre des problèmes dont les
données numériques dépassent le cadre des calculs mentaux ou posés » (l. 139-143, répété au CM1
l. 457 et au CM2 l. 703). Aucun point ne cite la calculatrice → tout est E ou V. Guide très court.

**Filiation** : CM1 ← CE2 (rien à hériter : pas de calculatrice au cycle 2) ; CM2 ← CM1 ; 6 ← CM2.

### CM1 (nouveau : tout)

- [E] allumer, effacer, corriger une saisie (règle générale de la classe)
- [E] taper une addition, soustraction, multiplication, division et lire le résultat, pour un problème à grands nombres (CM1-055, CM1-058 ; c3 l. 142)
- [V] vérifier une opération posée : addition/soustraction de décimaux, multiplication, division euclidienne (CM1-050…053)
- [V] estimer un ordre de grandeur AVANT, pour contrôler l'affichage (CM1-048)
- [E] calcul avec parenthèses (CM1-049) — piège : la machine applique les priorités (3 + 4 × 2 = 11), non enseignées au CM
- [E] lire un affichage décimal : point = virgule, 12.5 = 12,50 € (CM1-031)
- [E] division euclidienne : la machine donne un décimal, pas « quotient et reste » (CM1-053) — piège
- [E] durées : 1,5 h ≠ 1 h 50 min (CM1-095) — piège
- [E] partie entière et arrondi à l'unité d'un affichage (CM1-033)
- [E] douteux — suite évolutive, termes éloignés par répétition de `Ans` (CM1-065) : le BO cite blocs ou tableur, pas la calculatrice (c3 l. 1822)

### CM2 (nouveau)

- [V] multiplication d'un décimal par un entier, division décimale (dividende entier ou décimal, diviseur à un chiffre) (CM2-055, CM2-056, CM2-057)
- [E] calcul avec deux paires de parenthèses (CM2-054)
- [E] aire du rectangle, du carré avec des mesures décimales (CM2-075, CM2-120)
- [E] douteux — suite évolutive par `Ans` (CM2-068, CM2-070) : même remarque qu'au CM1

⚠️ Conséquence pour la 6e : la liste existante (4 opérations, priorités) recouvre en partie le CM.
Rien à changer si les guides CM ne sont pas faits ; sinon la 6e garde division euclidienne
(6-123), fraction → décimal (6-125), pourcentages (6-140, 6-141), arrondi (6-111), `Ans`.

---

## Cycle 4 éclaté (BO 2026 : « usage raisonné », cadre fixé par le professeur, c4.txt l. 181-206)

**Filiation** : 5 ← 6 ; 4 ← 5 ; 3 ← 4.

### 5e

- [P] opposé (touche `(-)`) vs soustraction ; sommes et différences de relatifs (5-013, 5-018, 5-020, 5-023)
- [P] enchaîner des opérations, priorités, parenthèses indispensables (5-004, 5-005, 5-007, 5-021)
- [V] diviser par un décimal (5-003)
- [V] additionner, soustraire, comparer des fractions, touche fraction (5-025, 5-026)
- [P] carré et cube, touche `x²` / `^` (5-028, 5-032, 5-033)
- [P] π : aire du disque, volume du cylindre (5-052, 5-053)
- [P] tableau de valeurs d'une formule (5-093, 5-097)
- [E] variable mémoire pour substituer, tester une égalité (5-035, 5-036)
- [V] moyenne simple, fréquences en pourcentage (5-076, 5-080)
- [P] calculer, appliquer un pourcentage (5-086) — absent de la liste « Cycle 4 » existante
- [E] blocs (fx-92+ Spéciale Collège), facultatif (5-102, 5-103, 5-106)

### 4e

- [P] multiplier, diviser des relatifs ; signe dans un enchaînement (4-001, 4-002, 4-003)
- [V] simplifier une fraction, opérations sur les fractions, inverse (4-005, 4-008, 4-012, 4-013)
- [P] puissances d'exposant positif (4-015, 4-018)
- [P] racine carrée (4-019) et longueur par Pythagore (4-034) ; [V] encadrer √n (4-020)
- [P] π : volume du cône, de la pyramide (4-029)
- [V] équation : conjecturer une solution exacte ou approchée au tableau de valeurs (4-026 cite algorithme ou tableur)
- [P] coefficient multiplicateur, augmentation ou diminution en pourcentage (4-056, 4-057) — absent de la liste existante
- [P] grandeurs quotients, quatrième proportionnelle (4-052, 4-055)
- [V] moyenne pondérée, médiane, étendue (4-039, 4-040, 4-041 ; le BO dit tableur : 4-045)
- [P] simulation, nombre aléatoire (4-050, 4-051)

### 3e

- [V] forme irréductible (3-001, 3-002)
- [P] puissances d'exposant négatif, quotient de puissances (3-004, 3-052)
- [P] notation scientifique : saisie `×10^`, affichage `1ᴇ-3` (3-006, 3-007)
- [P] résoudre x² = a, problèmes avec racine carrée (3-008, 3-009)
- [V] décomposition en facteurs premiers (3-010 ; touche FACT de la fx-92+)
- [P] π : volume de la boule (3-021)
- [P] trigonométrie en DEGRÉS : cos, sin, tan d'un angle ET angle à partir d'un rapport (cos⁻¹…) (3-023)
- [P] image d'une fonction linéaire ou affine au tableau de valeurs (3-039, 3-040, 3-044)
- [V] effectifs cumulés, médiane et quartiles d'un tableau d'effectifs (3-028, 3-029, 3-056) — les quartiles de la machine peuvent différer du programme (docs/systeme/statistiques.md)
- [P] simulation d'expériences indépendantes, stabilisation des fréquences (3-034, 3-035)
- [P] évolution en pourcentage (3-036)

---

## 1_GEN (enseignement scientifique, partie maths) — hérite de 2

Le BO cite la calculatrice dans son introduction, comme outil de manipulation (1ensci l. 73-74), et
dans un commentaire : « se limiter au recours à la calculatrice pour obtenir la valeur de aˣ pour
tout réel positif x » (l. 379). Les seuils peuvent se résoudre « en utilisant un outil numérique »
(1GEN-044).

- [P] termes d'une suite arithmétique ou géométrique, par la formule ou par récurrence (`Ans`, mode suite) (1GEN-018, 1GEN-039)
- [P] problème de seuil, croissance linéaire ou exponentielle : tableau de valeurs (1GEN-021, 1GEN-044)
- [P] aˣ pour x réel positif, x^(1/n) (racine n-ième) (1GEN-032, 1GEN-036 ; 1ensci l. 379)
- [P] taux d'évolution moyen : (1 + t)^(1/n) − 1 (1GEN-037, 1GEN-040)
- [P] ordre de grandeur d'une quantité exponentielle (1GEN-043)
- [P] coordonnées du point moyen (stats à deux variables) (1GEN-008)
- [E] ajustement affine par les moindres carrés (régression linéaire) pour interpoler, extrapoler (1GEN-007 ; « au jugé, Mayer, moindres carrés », aucune théorie attendue)
- [V] sommet, axe de symétrie d'une parabole (graphique ou résolution de f(x) = c) (1GEN-025)
- [E] probabilité p^k(1−p)^(n−k) sur un arbre, n ≤ 4 (1GEN-011)

## 1_SPE — compléments à la liste existante

- [P] conjecturer la limite éventuelle d'une suite au tableau de valeurs (1SPE-231 « Conjecturer, dans des cas simples » ; 1SPE-220) → **justifie la tâche « conjecturer une limite »**
- [E] annuités d'emprunt, intérêts composés (1SPE-242, exemple d'algorithme)

## T_SPE — compléments à la liste existante

- [V] conjecturer la limite d'une suite au tableau de valeurs : aucun point « conjecturer » en Tle spé ; appuis : TSPE-393 (valeurs approchées de π, e, √2, ln 2), TSPE-452 (limite de (1 + x/n)ⁿ), intro « présentée de manière intuitive […] sur l'écriture décimale » (tspe.txt l. 483)
- [V] limite d'une fonction en un point ou en ±∞ au tableau de valeurs : aucun point ne la demande (TSPE-397, TSPE-403 = méthodes algébriques)

## T_COMP — hérite de 1_SPE (PAS de T_SPE)

Intro : « L'utilisation de logiciels, de la calculatrice ou de l'ordinateur… » (tcomp l. 82). Deux points
citent la calculatrice (TCOMP-297, TCOMP-327).

- [P] conjecturer le comportement asymptotique de u(n+1) = f(u(n)) : termes successifs, tableau (TCOMP-211, TCOMP-212, TCOMP-217) → **justifie « conjecturer une limite »** (+ TCOMP-203 approche intuitive, TCOMP-218 valeurs approchées de π, ln 2, √2)
- [V] limite de suite géométrique, somme des termes (TCOMP-209, TCOMP-210)
- [P] seuil (TCOMP-216) ; [V] seuil par ln qⁿ = n ln q (TCOMP-239)
- [P] ln et exp (TCOMP-224, TCOMP-236…238)
- [P] valeur approchée, encadrement de la solution de f(x) = k : tableau à pas affiné, `solve` (TCOMP-235, TCOMP-243)
- [V] intégrale, valeur moyenne (TCOMP-276, TCOMP-277) ; [E] rectangles, trapèzes (TCOMP-270, TCOMP-283)
- [E] méthode d'Euler, suite récurrente (TCOMP-258)
- [V] coefficient binomial nCr (TCOMP-296 : triangle de Pascal demandé)
- [P] binomiale P(X = k), P(X ≤ k), intervalles — « à l'aide d'une calculatrice ou d'un logiciel » (TCOMP-297, TCOMP-299)
- [P] loi géométrique P(X = k), P(X ≤ k) : (1 − p)^(k−1)p (TCOMP-298)
- [P] loi exponentielle, probabilités e^(−λx) (TCOMP-312, TCOMP-315)
- [P] point moyen (TCOMP-326) ; droite de régression « à l'aide de la calculatrice » (TCOMP-327) ; coefficient de corrélation r (TCOMP-322)
- [P] ajustement par changement de variable (ln y, puis régression) (TCOMP-323, TCOMP-328)
- [E] simulation avec nombre aléatoire (TCOMP-317, TCOMP-318 ; le BO cite Python)
- [V] douteux — déciles (TCOMP-202) : les calculatrices ne les donnent pas, tri à la main

## T_EXP — s'ajoute à T_SPE (`grade_predecessors` : T_EXP ← 1_SPE ; élève en Tle spé en parallèle)

Aucun point ne cite la calculatrice ; intro : « logiciels (calculatrice ou ordinateur) » (texp l. 82), et
« devoirs surveillés avec ou sans calculatrice » (l. 95). Tout est V ou E.

- [V] mode complexe : forme algébrique, conjugué, inverse (TEXP-206, TEXP-204)
- [V] module, argument, passage algébrique ↔ trigonométrique/exponentielle (TEXP-220, TEXP-221, TEXP-237, TEXP-238) — piège : argument en radians
- [V] racines complexes d'un trinôme (TEXP-247)
- [E] suite complexe z(n+1) = a z(n) + b (TEXP-227)
- [V] quotient et reste d'une division euclidienne (TEXP-272) ; PGCD (TEXP-285) ; décomposition en facteurs premiers (TEXP-299)
- [E] calculs modulo n, aᵏ mod n (chiffrement affine, RSA) (TEXP-286, TEXP-287, TEXP-305)
- [P] saisir une matrice, produit, inverse, puissance Aⁿ (TEXP-319, TEXP-338, TEXP-339)
- [P] système linéaire par A⁻¹B (TEXP-340)
- [P] nombre de chemins de longueur n (TEXP-342) ; chaîne de Markov π₀Pⁿ (TEXP-333, TEXP-343)
- [V] distribution invariante (TEXP-344)
- [E] suite U(n+1) = A U(n) + C (TEXP-327, TEXP-341)

## 1_TECHNO — hérite de 2

Intro : outils numériques « calculatrices, logiciels de géométrie » (1techno l. 128) ; Python ou tableur
pour les capacités « algo. ».

- [P] termes d'une suite, par la formule ou par récurrence ; somme finie (1TECHNO-043, 1TECHNO-050)
- [P] liste des termes et nuage de points (n, u(n)) (1TECHNO-044, 1TECHNO-051)
- [P] seuil, ou comparaison avec une autre suite (1TECHNO-052)
- [P] valeur approchée d'une solution par balayage (tableau à pas) (1TECHNO-067)
- [V] vérifier qu'une valeur conjecturée annule un trinôme (1TECHNO-063)
- [V] taux de variation, nombre dérivé, tangente (1TECHNO-055, 1TECHNO-070, 1TECHNO-079)
- [V] variations et extrémums d'un polynôme de degré ≤ 3 (1TECHNO-081)
- [V] résolution graphique de f(x) = k, f(x) < k (1TECHNO-059)
- [P] point moyen ; ajustement affine (régression) ; interpoler, extrapoler (1TECHNO-086, 1TECHNO-087, 1TECHNO-088)
- [P] espérance d'une variable aléatoire discrète (listes) (1TECHNO-099)
- [E] simuler une loi de Bernoulli avec un nombre aléatoire entre 0 et 1 (1TECHNO-003, 1TECHNO-103 ; le BO cite Python/tableur)

## T_TECHNO — hérite de 1_TECHNO

- [P] indice base 100, taux d'évolution entre deux valeurs (TTECHNO-015)
- [V] somme des n premiers termes d'une suite arithmétique ou géométrique (TTECHNO-026, TTECHNO-027)
- [P] aˣ pour x réel ; exposant 1/n ; taux d'évolution moyen (TTECHNO-031, TTECHNO-035, TTECHNO-038)
- [P] logarithme décimal `log` ; résoudre aˣ = b, xᵃ = b (TTECHNO-040, TTECHNO-043) — piège : `log` ≠ `ln`
- [V] étude et courbe de fonctions avec l'inverse, asymptotes (TTECHNO-048, TTECHNO-049)
- [P] changement de variable (log y, 1/t…) sur les listes puis nuage ou régression (TTECHNO-052)
- [E] somme des carrés des écarts Σ(yᵢ − (axᵢ + b))² (TTECHNO-053 ; le BO cite Python/tableur)
- [V] coefficient binomial nCr (TTECHNO-061 : triangle de Pascal, n ≤ 10)
- [V] binomiale P(X = k) (TTECHNO-064, TTECHNO-065 : calcul par coefficients binomiaux ; la commande binomFdp vérifie)
- [P] espérance Σ xᵢpᵢ ; n·p pour la binomiale (TTECHNO-068)

---

## Manques repérés dans les listes existantes (à trancher)

- **2de** : pourcentages de pourcentages, taux d'évolution, évolutions successives et réciproque (2-375…2-379) : calcul numérique, P. Absents de la liste « 2de ».
- **Cycle 4** : pourcentages (5-086, 4-056, 4-057, 3-036) absents de la liste « Cycle 4 ».
- **1re spé** : 1SPE-231 justifie de remettre « conjecturer une limite » ; annuités (1SPE-242), en E.
