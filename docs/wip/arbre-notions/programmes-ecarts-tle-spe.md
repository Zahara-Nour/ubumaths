# Arbre des notions et programme de Tle spé : écarts (reprise au modèle ADR 0020)

> Reprise du 2026-10-07 : la section « Tle spé » de `programmes-ecarts.md` (ancien modèle,
> niveaux sur les nœuds) est réécrite ici au gabarit validé — chaque ligne du programme devient
> un **point rattaché à un nœud**, grain au **filtre**. Comparé à `arbre-notions.json`
> version 2026-10-07.6 (136 notions, 507 sous-notions ; cycles 2-4, 2de et 1re spé appliqués).
> Ce document **remplace** la section Tle spé de l'ancien ; `programmes-ecarts.md` reste la
> référence pour Tle comp. et Expertes en attendant leur reprise.
> **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme de l'enseignement de spécialité de mathématiques de la classe terminale
de la voie générale » (14 p.), **refourni par David le 2026-10-07** : même mouture que la 2de
et la 1re refournies (vague des nouveaux programmes, mention de l'usage des outils d'IA).
Contenu **vérifié identique**, section par section, au texte déjà sauvegardé
(`progs-lycee/terminale-spe.txt`) qui servait de base à l'ancienne analyse : la présente
analyse vaut pour les deux. Structure : Vocabulaire ensembliste et logique · Algorithmique et
programmation (Notion de liste) · Algèbre et géométrie (Combinatoire et dénombrement ·
Vecteurs, droites et plans de l'espace · Orthogonalité et distances · Représentations
paramétriques et équations cartésiennes) · Analyse (Suites · Limites des fonctions ·
Compléments sur la dérivation · Continuité · Logarithme · Fonctions sinus et cosinus ·
Primitives, équations différentielles · Calcul intégral) · Probabilités (Succession
d'épreuves, schéma de Bernoulli · Sommes de variables aléatoires · Concentration, loi des
grands nombres).

Points saillants : **pas de partie Automatismes en Tle** (deux transversales seulement — les
listes de 2de et de 1re s'entretiennent, le texte de 1re parlait d'un « entrainement régulier
sur l'ensemble du cycle terminal ») ; **les fonctions sinus et cosinus sont bien là** (parité,
périodicité, courbes, dérivées, variations, cos(x) = a) — les quatre sous-notions laissées
sans pointeur par la 1re retrouvent leur niveau d'introduction ; l'épreuve orale terminale
justifie les approfondissements (viviers de sujets, non obligatoires).

## Ce que l'ADR 0020 change pour la Tle spé

1. **Pas de rubrique Automatismes** → aucune référence `curriculum_point_automatismes` propre
   à la Tle dans ce texte. Les références de 2de et de 1re restent actives (même question
   d'héritage qu'au doc 1re spé, à trancher à la spécification du schéma cible).
2. **Le seed Tle spé en prod est DÉJÀ sur ce texte.** Vérifié le 2026-10-07 (prod, lecture
   seule) : 262 points, les 18 objectifs du nouveau programme (dont « Fonctions sinus et
   cosinus » et « Concentration, loi des grands nombres »). Comme pour la 1re : pas de
   péremption, matière première du futur reseed points → nœuds.
3. **Trois manques de l'ancienne analyse sont déjà comblés par le lot 1re spé** : « condition
   nécessaire, condition suffisante » (Implication et équivalence), « probabilités totales »
   et « épreuves indépendantes successives » (Probabilités conditionnelles) — ils passent
   en [C]. Les ex-[N] « ajouter Tle » deviennent tous de simples pointeurs (niveaux
   indicatifs).

## Légende

**[C]** nœud existant (la ligne devient un ou des points de Tle spé dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**0 notion** à créer, **~10 sous-notions** (dont 6 en Analyse), 2 requalifications en simples
points, le reste en points — l'arbre avait déjà presque tout le lycée terminal (Dénombrement,
Espace, Convexité, Logarithme, Intégration, Équations différentielles, Loi binomiale, Sommes
et concentration sont nés classés Tle).

---

## Vocabulaire ensembliste et logique

- « élément, sous-ensemble, ensemble vide, appartenance, inclusion, réunion, intersection,
  complémentaire ; notations ; couple, triplet, n-uplet, produit cartésien ; Card(A) » —
  **[C]** `Ensembles > Ensembles de nombres, Opérations sur les ensembles, Cardinal et produit
cartésien` (pointeurs de Tle là où la Tle dépasse — n-uplets —, entretien sinon).
- « reconnaitre une proposition mathématique, utiliser des variables pour écrire des
  propositions ; connecteurs et/ou ; contre-exemple » — **[C]** `Logique > Connecteurs et
contre-exemples`.
- « négation de propositions simples, pouvant contenir un ou deux quantificateurs ;
  quantification universelle ou existentielle (∀ et ∃ non exigibles) » — **[C]**
  `Quantificateurs et négation > pour tout, il existe, négation d'une proposition` (deux
  quantificateurs = approfondissement du même contenu, affaire de pointage).
- « implication, équivalence logique, mobilisation ; réciproque, contraposée » — **[C]**
  `Implication et équivalence`.
- « distinguer condition nécessaire et condition suffisante » — **[C]** `Implication et
équivalence > condition nécessaire, condition suffisante` (créée au lot 1re spé).
- « raisonner par disjonction des cas, par l'absurde, par contraposée » — **[C]**
  `Logique > Raisonnements`.
- « raisonner par équivalence, utiliser une propriété caractéristique » — **[P]**
  `Raisonnements` > **« par équivalence »** (filtre : les résolutions par équivalences
  successives et l'usage d'une caractérisation sont une famille de rédaction à part — le
  piège classique de l'implication qui ne remonte pas). Niveau indicatif de la notion
  → **« 2de à Tle »**.
- « démontrer une propriété par récurrence » — **[C]** `Suites > Raisonnement par récurrence >
structure d'une récurrence`.
- « notion de bijection rencontrée en situation » ; « symbole de somme ∑ introduit, sa
  manipulation n'est pas un objectif » — **[T]**.
- « composition de deux fonctions » — **[C]** `Fonctions > Dérivation > fonctions composées`
  (le contenu est traité en Analyse).

## Algorithmique et programmation

- « reprend les programmes de seconde et de première sans introduire de notion nouvelle » —
  **[T]** entretien (`Variables et instructions, Boucles, Fonctions Python`).
- Capacités listes (générer ; manipuler éléments et indices ; parcourir ; itérer) — **[C]**
  `Algorithmique > Listes` (les quatre sous-notions, « éléments et indices » créée au lot
  1re spé) : pointeurs de Tle, contenu identique à la 1re.

## Algèbre et géométrie

- Combinatoire : principes additif et multiplicatif, k-uplets (lien {0,1}ⁿ, mots, chemins,
  épreuves de Bernoulli), parties d'un ensemble — **[C]** `Dénombrement > Principes de
dénombrement` (les trois sous-notions) ; k-uplets d'éléments distincts, n!, permutations —
  **[C]** `Arrangements et permutations` ; combinaisons, formules de (n k), k = 0, 1, 2,
  symétrie, relation et triangle de Pascal — **[C]** `Combinaisons` (les trois sous-notions,
  démonstrations ∑ = 2ⁿ → `Principes de dénombrement > parties d'un ensemble`, relation de
  Pascal → `triangle de Pascal`) ; représentation adaptée, reconnaître les objets,
  dénombrements dans divers domaines — **[C]** `Problèmes de dénombrement` (+ les trois
  algorithmes → `algorithmique`).
- Vecteurs, droites et plans de l'espace : vecteurs et translations, combinaisons linéaires,
  droites et vecteurs directeurs, plans et directions, caractérisations, positions relatives,
  lire une base et une décomposition sur une figure, configurations (alignement, colinéarité,
  parallélisme, coplanarité) — **[C]** `Géométrie > Espace : sans coordonnées` (les quatre
  sous-notions) ; bases et repères de l'espace, décomposition — **[C]** `Espace : avec
coordonnées > coordonnées dans l'espace`.
- Orthogonalité et distances : produit scalaire de l'espace, bilinéarité, symétrie,
  caractérisation de l'orthogonalité, ‖u + v‖², polarisation — **[C]** `Orthogonalité : sans
coordonnées > produit scalaire dans l'espace` ; orthogonalité de droites et de plans, plans
  perpendiculaires et vecteurs normaux — **[C]** `> orthogonalité de droites et plans` ;
  base/repère orthonormé, expressions du produit scalaire, de la norme, de la distance —
  **[C]** `Orthogonalité : avec coordonnées > norme et distance` (+ `Espace : avec coordonnées
  > coordonnées dans l'espace`) ; vecteur normal à un plan, plan par A normal à n̄ (+ sa
démonstration d'équation cartésienne), plan médiateur, lieux simples — **[C]** `> vecteur
  > normal à un plan`; projeté orthogonal sur une droite, sur un plan (+ démonstration « point
le plus proche »), distance d'un point à une droite, à un plan — **[C]**`Orthogonalité :
  > sans coordonnées > projeté orthogonal`; angles et longueurs dans l'espace — **[C]**`> angles`; « problèmes impliquant des grandeurs et mesures : longueur, angle, aire,
volume » — **[C]** points sous les mêmes nœuds (le réinvestissement métrique est un
exercice d'espace ; les formules de volumes restent au collège,`Grandeurs et mesures >
  > Volumes`, référencées au besoin — l'ancienne analyse proposait d'y ajouter la Tle, requalifié).
- Représentations paramétriques et équations cartésiennes : représentation paramétrique d'une
  droite — **[C]** `Espace : avec coordonnées > représentation paramétrique d'une droite` ;
  équation cartésienne d'un plan (+ démonstration) — **[C]** `Orthogonalité : avec coordonnées
  > équation cartésienne d'un plan`; traduire par un système linéaire (base, coordonnées,
configurations, intersections), résoudre et interpréter — **[C]**`Espace : avec coordonnées
  > intersections, positions relatives par le calcul`.
- « coordonnées du projeté orthogonal d'un point sur un plan donné par une équation
  cartésienne, ou sur une droite donnée par un point et un vecteur directeur » — **[P]**
  `Orthogonalité : avec coordonnées` > **« coordonnées du projeté orthogonal »** (filtre : LA
  famille calculatoire du chapitre — le versant repéré, distinct du `projeté orthogonal`
  géométrique de `Orthogonalité : sans coordonnées`).

## Analyse

- Suites : définitions des limites (+∞, −∞, convergence), croissantes non majorées — **[C]**
  `Limites de suites > définition` ; comparaison, gendarmes (+ démonstrations divergence par
  minoration) — **[C]** `> comparaison et encadrement` ; opérations — **[C]** `> opérations,
formes indéterminées` ; comportement de (qⁿ) (+ démonstration via inégalité de Bernoulli) —
  **[C]** `> suites géométriques` ; croissante majorée converge (+ démonstration croissante
  non majorée) — **[C]** `> convergence monotone, suites majorées, minorées` ; raisonner par
  récurrence pour une suite — **[C]** `Raisonnement par récurrence` ; phénomènes d'évolution,
  recherche de seuils et de valeurs approchées (π, e, √2, φ, ln 2) — **[C]** `Suites et
modélisation > seuil, algorithmes` ; démonstration « limite en ±∞ de l'exponentielle » —
  **[C]** point sous `Fonctions > Limites de fonctions > croissances comparées` (pointage, pas
  de structure).
- Limites des fonctions : limite finie ou infinie en ±∞, en un point ; asymptotes parallèles
  aux axes, lien asymptote-limite — **[C]** `Limites de fonctions > limite en un point,
asymptotes` ; limites des fonctions de référence, opérations — **[C]** `> opérations` ;
  croissances comparées (+ démonstration xⁿ/exp), factorisation du terme prépondérant —
  **[C]** `> croissances comparées, formes indéterminées`.
- « limites et comparaison ; majorations, minorations, encadrements » — **[P]** `Limites de
fonctions` > **« comparaison et encadrement »** (filtre : les théorèmes de comparaison
  versant fonctions — même découpage que `Limites de suites`, qui a déjà la sienne).
- Compléments sur la dérivation : composée v ∘ u et sa dérivée, calculs mêlant opérations et
  composition — **[C]** `Dérivation > fonctions composées` (+ `opérations sur les dérivées`,
  créée au lot 1re) ; dérivée seconde — **[C]** `Convexité > dérivée seconde` ; fonction
  convexe (sécantes, tangentes, croissance de f′, positivité de f″) — **[C]**
  `> caractérisations` ; point d'inflexion — **[C]** `> point d'inflexion` ; inégalités par
  convexité (+ démonstration « au-dessus de ses tangentes ») — **[C]** `> inégalités de
convexité` ; allure depuis les tableaux de f, f′, f″, lecture de la convexité — **[C]**
  `> lecture graphique`.
- Continuité : TVI, cas strictement monotone, solutions de f(x) = k (existence, unicité) —
  **[C]** `Continuité > valeurs intermédiaires` ; image d'une suite convergente, suites
  uₙ₊₁ = f(uₙ) — **[C]** `Suites > Suites récurrentes > point fixe, escalier`.
- « fonction continue en un point (définition par les limites), sur un intervalle ; toute
  fonction dérivable est continue » — **[P]** `Continuité` > **« continuité en un point »**
  (filtre : le versant théorique — définition, lien dérivabilité-continuité — qui n'est ni la
  lecture graphique ni le TVI).
- « encadrement des solutions de f(x) = k » + algorithmes dichotomie, Newton, sécante —
  **[P]** `Continuité` > **« encadrement d'une solution »** (filtre : la famille numérique —
  dichotomie, balayage, précision 10⁻ⁿ — très présente dans les fiches et au bac).
- Logarithme : ln réciproque de l'exponentielle (+ images mentales des courbes) — **[C]**
  `Logarithme népérien > réciproque de l'exponentielle` ; propriétés algébriques, équation
  fonctionnelle pour transformer, résoudre équations et inéquations — **[C]** `> propriétés
algébriques, équations et inéquations` ; dérivée (+ démonstration), variations — **[C]**
  `> dérivée` ; limites en 0 et +∞, courbe, lien avec la courbe de exp — **[C]** `> courbe`,
  les limites = **simples points** dessous (l'ancienne analyse proposait une sous-notion
  « limites » ; requalifié : la famille « limites avec ln » se filtre déjà par `Limites de
fonctions > croissances comparées`, où pointent la croissance comparée ln/xⁿ et la
  démonstration de la limite de x ln x) ; équations/inéquations avec exp — **[C]** `Fonction
exponentielle > équations et inéquations` (premier pointeur : introduit ici, via ln —
  niveau indicatif de la notion → **« 1re, Tle »**).
- Fonctions sinus et cosinus : parité, périodicité, courbes, traduction graphique — **[C]**
  `Fonctions trigonométriques > parité et périodicité` ; dérivées, variations, étude d'une
  fonction trigonométrique simple (variations, optimum) — **[C]** `> dérivées et variations` ;
  lien courbes-cercle — **[C]** `> cosinus et sinus d'un réel` ; cos(x) = a, cos(x) ⩽ a sur
  [−π, π] — **[C]** `> équations, inéquations`. **Les quatre sous-notions laissées sans
  pointeur par la 1re 2026 retrouvent ici leur introduction** — le point de vigilance du doc
  1re spé est levé.
- Primitives, équations différentielles : y′ = f, notion de primitive, deux primitives
  diffèrent d'une constante (+ démonstration), toute fonction continue admet des primitives —
  **[C]** `Équations différentielles > y′ = f > primitives : notion` ; primitives de
  référence (xⁿ pour n ∈ ℤ, 1/√x, exp, sin, cos) — **[C]** `> primitives des fonctions de
référence, sinus et cosinus` ; formes (v′ ∘ u) × u′ — **[C]** `> forme (v′∘u)×u′` (les
  nœuds `formes u′eᵘ, 2uu′, u′/u` : cas particuliers conservés, pointage libre) ; y′ = ay,
  allure des courbes (+ démonstration de la résolution) — **[C]** `y′ = ay > solution
générale` et `Généralités > allure des courbes` ; y′ = ay + b (solution constante puis
  toutes) — **[C]** `y′ = ay + b` ; y′ = ay + f (depuis une solution particulière) — **[C]**
  `y′ = ay + f` ; exemples non exigibles y′ = y², y″ + ω²y = 0 — **[T]**.
- Algorithme « méthode d'Euler pour y′ = f, y′ = ay + b » — **[P]** `Équations
différentielles > Généralités` > **« méthode d'Euler »** (filtre : LA méthode numérique des
  équations différentielles, déjà rencontrée en 1re pour construire l'exponentielle — famille
  algorithmique typée).
- Calcul intégral : intégrale d'une fonction continue positive comme aire sous la courbe,
  signe quelconque — **[C]** `Intégration > Intégrale et aire > aire algébrique` ; Fₐ(x)
  primitive s'annulant en a (+ démonstration) — **[C]** `Fonction intégrale > dérivée d'une
fonction intégrale` ; ∫ = F(b) − F(a), notation [F(x)] — **[C]** `Calcul d'intégrales > par
une primitive` ; linéarité, relation de Chasles — **[C]** `> linéarité, relation de
Chasles` ; intégration par parties (+ démonstration) — **[C]** `> intégration par parties` ;
  valeur moyenne (estimer, encadrer, interpréter) — **[C]** `Valeur moyenne` (les trois
  sous-notions) ; estimer graphiquement, aire entre deux courbes — **[C]** `Intégrale et aire
  > lecture graphique, aire entre deux courbes`; méthodes des rectangles, des milieux, des
trapèzes — **[C]**`Calcul d'intégrales > méthode des rectangles`.
- « positivité et intégration des inégalités ; majorer (minorer) une intégrale » — **[P]**
  `Calcul d'intégrales` > **« positivité et inégalités »** (filtre : les encadrements
  d'intégrales — famille technique propre, souvent préalable aux suites d'intégrales).
- « étudier une suite d'intégrales, vérifiant éventuellement une relation de récurrence » —
  **[P]** `Calcul d'intégrales` > **« suites d'intégrales »** (filtre : LA famille
  d'exercices de bac mêlant IPP, récurrence et limites — à cheval sur deux branches, le
  filtre est précieux).

## Probabilités

- Succession d'épreuves indépendantes (probabilité d'une issue = produit, arbre, produit
  cartésien, deux ou trois épreuves quelconques, probabilités conditionnelles et totales) —
  **[C]** `Probabilités conditionnelles > épreuves indépendantes successives, probabilités
totales` (créées au lot 1re spé — la Tle étend à n quelconque) ; épreuve et loi de
  Bernoulli — **[C]** `Loi binomiale > schéma de Bernoulli`, la loi de Bernoulli = **simple
  point** dessous (l'ancienne analyse proposait une sous-notion ; requalifié : elle se
  travaille comme brique du schéma, pas en famille à part) ; schéma de Bernoulli — **[C]**
  `> schéma de Bernoulli` ; loi binomiale, expression par les coefficients binomiaux
  (+ démonstration des k succès) — **[C]** `> coefficients binomiaux, calcul de
probabilités` ; modéliser — **[C]** `> reconnaître une loi` ; problèmes de seuil, de
  comparaison, d'optimisation ; P(X = k), P(X ⩽ k), P(k ⩽ X ⩽ k′) — **[C]** `> calcul de
probabilités`.
- « chercher un intervalle I pour lequel P(X ∈ I) ⩽ α ou ⩾ 1 − α » + algorithme de la
  surréservation — **[P]** `Loi binomiale` > **« intervalle de fluctuation »** (filtre :
  recherche d'intervalles et de seuils au risque α, prise de décision — famille très typée
  du bac).
- Sommes de variables aléatoires : E(X + Y), E(aX), additivité de la variance pour des
  indépendantes, V(aX), représenter une variable comme somme — **[C]** `Sommes et
concentration > espérance et variance d'une somme` ; espérance, variance, écart type de la
  loi binomiale (+ démonstration) — **[C]** `Loi binomiale > espérance et variance` ;
  échantillon de taille n, Sₙ et Mₙ — **[C]** `Sommes et concentration > échantillons`
  (+ algorithme de simulation d'un échantillon).
- Concentration : inégalité de Bienaymé-Tchebychev — **[C]** `> Bienaymé-Tchebychev` ;
  inégalité de concentration, taille d'échantillon selon précision et risque — **[C]**
  `> inégalité de concentration`.
- « loi des grands nombres » — **[P]** `Sommes et concentration` > **« loi des grands
  nombres »** (filtre : le couronnement du programme — énoncé, interprétation
  fréquences-probabilité, simulations N échantillons — famille d'exercices d'interprétation
  distincte des deux inégalités).

## [T] et Histoire des mathématiques

Rubriques « Histoire des mathématiques » (Peano et la récurrence, Pascal, Grassmann, Cauchy,
l'Ars Conjectandi…) : ni nœuds ni points. Approfondissements et exemples sans pointeur :
combinaisons avec répétitions, barycentres, fonctions vectorielle et scalaire de Leibniz,
intersection sphère-plan et sphère circonscrite (le nœud `sphère` existe, pointage libre),
vecteur orthogonal à deux vecteurs, suites adjacentes, récurrence linéaire d'ordre 2, méthode
de Héron, asymptotes obliques, courbe de Lorenz, dérivée n-ième, inégalité
arithmético-géométrique, démonstration du TVI par dichotomie, f(x + y) = f(x) + f(y),
prolongement par continuité, x ↦ xᵃ, (1 + x/n)ⁿ, algorithmes de Briggs et de Brouncker,
fonction tangente, équation logistique, encadrement de Hₙ, Monte-Carlo, planche de Galton,
loi de Poisson, loi géométrique (nœud en Tle comp., pas d'ajout), E(XY) = E(X)E(Y),
estimation, marches aléatoires.

## Sens inverse : nœuds marqués Tle sans pointeur de Tle spé

- `Suites > Suites arithmético-géométriques` et `Probabilités > Autres lois`, `Statistiques >
Statistique à deux variables` : contenus de **Tle comp.** — pointage à sa reprise.
- `Orthogonalité : avec coordonnées > sphère` : seulement en approfondissement possible (pas
  un attendu) — nœud conservé sans pointeur obligatoire.
- `Équations différentielles > y′ = f > formes u′eᵘ, 2uu′, u′/u` : le texte 2026 ne nomme que
  la forme générique (v′ ∘ u) × u′ — nœuds conservés (cas particuliers, pointage libre).
- `Arithmétique > Divisibilité` : rien en Tle spé (comme en 1re) — l'arbre déborde, c'est
  voulu.
- `Dérivation > taux de variation, approximation affine…` (1re) : entretien, pas de pointeur
  Tle.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide tout » (V1-V5, limites du logarithme et
> loi de Bernoulli = simples points). Appliqué à l'arbre : version 2026-10-07.7 —
> 136 notions, 517 sous-notions.

1. **V1 — Logique** : « par équivalence » (Raisonnements, niveau → « 2de à Tle »).
   (reco : oui.)
2. **V2 — Espace** : « coordonnées du projeté orthogonal » (Orthogonalité : avec coordonnées).
   (reco : oui.)
3. **V3 — Analyse** : « comparaison et encadrement » (Limites de fonctions) ; « continuité en
   un point » et « encadrement d'une solution » (Continuité) ; « méthode d'Euler » (Équations
   différentielles > Généralités) ; « positivité et inégalités » et « suites d'intégrales »
   (Calcul d'intégrales) ; les limites du logarithme = simples points sous « courbe ».
   (reco : oui ×6, points.)
4. **V4 — Probabilités** : « intervalle de fluctuation » (Loi binomiale) ; « loi des grands
   nombres » (Sommes et concentration) ; la loi de Bernoulli = simple point sous « schéma de
   Bernoulli ». (reco : oui, oui, point.)
5. **V5 — Validation d'ensemble** : niveaux indicatifs — `Raisonnements` → « 2de à Tle »,
   `Fonction exponentielle` → « 1re, Tle » ; puis application au JSON + diagramme
   (136 notions, 517 sous-notions si tout est validé).
