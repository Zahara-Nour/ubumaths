# Arbre des notions et programme de 2de : écarts (reprise au modèle ADR 0020)

> Reprise du 2026-10-07 : la section « 2de » de `programmes-ecarts.md` (ancien modèle, niveaux
> sur les nœuds) est réécrite ici au gabarit validé — chaque ligne du programme devient un
> **point rattaché à un nœud**, grain au **filtre**. Comparé à `arbre-notions.json`
> version 2026-10-07.4 (135 notions, cycles 2-3-4 appliqués). Ce document **remplace** la
> section 2de de l'ancien ; `programmes-ecarts.md` reste la référence pour 1re et Tle en
> attendant leur reprise.
> **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme d'enseignement de mathématiques de la classe de seconde générale et
technologique » (13 p.), **refourni par David le 2026-10-07** : c'est la mouture de la vague
des nouveaux programmes (même format d'annexe que les cycles 2-4 ; elle cite les acquis du
NOUVEAU cycle 4 — relation de Chasles en 3e, boîtes à moustaches et f(x) au collège — donc
vraisemblablement l'arrêté lycée 2026, référence exacte à confirmer). Contenu **vérifié quasi
identique** à la « version révisée » sans date analysée par la session précédente (la base de
`programmes-ecarts.md`) : la présente analyse vaut pour les deux. Structure : Vocabulaire
ensembliste et logique · Algorithmique et programmation (Variables, Notion de fonction) ·
Automatismes · Nombres et calculs, algèbre (Arithmétique, Nombres réels, Algèbre) · Géométrie
(Vecteurs, Droites du plan) · Fonctions · Statistiques et probabilités (Information chiffrée,
Croisement de deux variables, Probabilités), avec rubriques Contenus / Capacités attendues /
Démonstrations / Exemples d'algorithme / Approfondissements / Histoire des mathématiques.
Menues additions de cette mouture : « ensemble vide » (point sous `Ensembles`), ∀ et ∃
explicitement hors programme [T], le vocabulaire des tests diagnostiques (faux positifs, faux
négatifs, sensibilité, spécificité — points sous « inversion du conditionnement »), et la
précision que les probabilités totales ne sont PAS un attendu de 2de [T].

## Ce que l'ADR 0020 change pour la 2de

1. **La décision D1 (automatismes) est dissoute** — et précisée par David le 2026-10-07 :
   les Automatismes sont **un mode de travail, pas des points nouveaux**. Les textes le
   confirment (cycle 4 : « des contenus étudiés sans être automatisés au niveau précédent » ;
   6e : « déjà étudiées au cours moyen » ; 2de : « travaillées dans les classes antérieures »).
   Règle de pointage : **un contenu = un seul point, dans le programme qui l'introduit** ;
   une ligne d'Automatismes qui renvoie à un contenu antérieur devient une **référence**
   « travaillé en automatisme en 2de » vers ce point (la table `curriculum_point_automatismes
(point_id, grade)`, déjà en place et vide, porte exactement cela) ; seule une ligne
   d'Automatismes qui introduit du contenu **neuf** (la 2de le permet explicitement) devient un
   point de 2de, en régime automatisme. Une fiche d'automatismes de 2de trouve ses nœuds par
   les points de 2de ∪ les références de 2de. Même sort pour **D3** (Divisibilité et la 2de) :
   une référence.
2. **Règle des niveaux indicatifs du JSON** : ils tracent les programmes qui **introduisent**
   un contenu, pas ceux qui l'entretiennent. Les automatismes de 2de pointeront sans gonfler
   les niveaux affichés. Deux exceptions ici, car la 2de apporte du contenu neuf :
   `Puissances : calculs` → **« 5e à 2de »** (règles sur exposants entiers relatifs, partie
   Algèbre) et `Fractions : sens et écritures` → **« CE1 à 2de »** (forme irréductible, partie
   Arithmétique).
3. **Le gros des manques de l'ancienne analyse est déjà comblé** par les lots cycles 2-4 :
   Pythagore, Thalès, trigonométrie, volumes des solides, aire et périmètre du disque, pair ou
   impair, boîte à moustaches, courbes et repères, coordonnées dans le plan — tout cela existe
   désormais et passe en [C].

## Légende

**[C]** nœud existant (la ligne devient un ou des points de 2de dessous) · **[P]** sous-notion à
créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**1 notion** à créer (Tableaux croisés), **~12 sous-notions**, 2 renommages de sous-notions, le
reste en points — dont tous les automatismes.

---

## Vocabulaire ensembliste et logique

- « élément, sous-ensemble, appartenance, inclusion ; réunion, intersection ; complémentaire
  (A̅, E \ A) ; notations des ensembles de nombres et des intervalles ; couple et **produit
  cartésien** ; **Card(A)** » — **[C]** `Ensembles > Ensembles de nombres, Opérations sur les
ensembles, Cardinal et produit cartésien` (les ex-[N] « ajouter 2de » deviennent des
  pointeurs).
- « connecteurs et/ou, négation de propositions simples, contre-exemple, implication,
  équivalence, réciproque, contraposée (formulation seulement), quantificateurs, raisonnements
  par disjonction de cas et par l'absurde » — **[C]** `Logique` (les quatre notions).

## Algorithmique et programmation

- « variables (entier, booléen, flottant, chaîne), affectation, séquences, instructions
  conditionnelles ; boucles bornées et non bornées ; fonctions à arguments » — **[C]**
  `Algorithmique > Variables et instructions, Boucles, Fonctions Python`.
- « aléatoire, séries simulées, moyenne/écart type d'une série » — **[C]**
  `Statistiques > Échantillonnage > simulation` et `> Indicateurs`.

## Automatismes (tous : RÉFÉRENCES de 2de vers des points antérieurs — règle ci-dessus)

Fractions (calculs et écritures), puissances, pourcentages et proportions, ordres de grandeur
(→ `Décimaux : numération > arrondir`), conversions d'unités (`Unités et conversions`, `Durées >
convertir`, `Vitesse > convertir`), calcul littéral (opposé, identités remarquables,
factorisations), équations et inéquations simples (`x² = a`, `ax + b = cx + d`, `a/x = b`,
premier degré), droite graduée et coordonnées (→ `Repérage et déplacements > coordonnées dans
le plan`), périmètres/aires/volumes (y compris `disque` et les sous-notions de `Volumes`),
**Pythagore, Thalès, trigonométrie du triangle rectangle** (notions créées au cycle 4),
diagrammes, courbes et nuages (→ `courbes et repères`), moyenne/médiane/quartiles,
**comparaison de distributions par boîtes à moustaches** (→ `Indicateurs > boîte à moustaches`,
créée au cycle 4 — l'ancienne analyse la proposait sous Représenter des données, la maison a
changé), probabilité entre 0 et 1, événement contraire, équiprobabilité — **[C]** partout.
Seuls restes : « vraisemblance d'un résultat » **[T]** ; « isoler une variable » → voir T3.

## Nombres et calculs, algèbre

- Arithmétique : « ℕ, ℤ ; multiples et diviseurs ; **pair, impair** (+ démonstration carré d'un
  impair) ; fractions irréductibles ; somme de deux multiples ; algorithmes (multiple de b,
  plus grand multiple ≤ b) » — **[C]** `Divisibilité > multiples et diviseurs, pair ou impair
(créée au cycle 2), division euclidienne` + `Fractions : sens et écritures > simplifier`.
- Nombres réels : « ℝ et droite numérique ; intervalles ; valeur absolue et distance ;
  |x − a| ⩽ r ; 𝔻, encadrements décimaux à 10⁻ⁿ ; ℚ ; **nombres irrationnels** (√2, π, avec les
  démonstrations « 1/3 non décimal », « √2 irrationnel ») ; arrondir, chiffres significatifs ;
  balayage » — **[C]** `Ensembles de nombres` (droite numérique = point sous « ℕ, ℤ, 𝔻, ℚ, ℝ »,
  requalifié : pas un filtre), `Décimaux : numération > encadrer, arrondir` (chiffres
  significatifs = point de 2de), `Fonction valeur absolue > définition et distance`,
  `Algorithmique > Boucles` + **[P]** `Ensembles de nombres` > **« nombres irrationnels »**
  (filtre : la famille « rationnel ou pas, démonstrations classiques » se retrouve de la 2de
  aux Expertes).
- Algèbre : « règles sur les puissances entières relatives ; règles sur les racines carrées,
  √(a²) = |a|, démonstration √(ab) = √a√b ; **expressions fractionnaires** ; inégalités (somme,
  produit par un réel, comparaison additive/multiplicative) ; ax + b = 0 / > 0 ; équation
  produit nul ; signe de A(x)B(x) et A(x)/B(x) ; équation quotient ; **isoler une variable**
  (U = RI, d = vt, ax + by = c) ; choisir la forme adaptée » — **[C]** `Puissances : calculs`
  (→ 5e à 2de), `Racines carrées : calculs > propriétés`, `Inégalités`, `Équations : premier
degré`, `Équations : produit et quotient`, `Inéquations : produit et quotient > tableau de
signes`, `Calcul littéral > développer, factoriser` + **[P]** `Calcul littéral` >
  **« isoler une variable »** (filtre : les fiches « formules » — physique comprise — sont une
  famille à part) et **« expressions fractionnaires »** (filtre : le calcul sur quotients
  algébriques, famille classique 2de-1re).

## Géométrie

- Vecteurs : « égalité, notation, vecteur nul, représentants ; somme ; produit par un réel ;
  colinéarité ; **décomposition selon deux vecteurs non colinéaires** ; base orthonormée,
  coordonnées, norme, coordonnées de AB ; déterminant et colinéarité ; alignement,
  parallélisme ; milieu vectoriel » — **[C]** `Vecteurs : sans coordonnées` (3e, 2de — raccord
  cycle 4) et `Vecteurs : avec coordonnées` + **[P]** `Vecteurs : sans coordonnées` >
  **« combinaison linéaire »** (filtre : la décomposition dans une base est une famille
  d'exercices à part, qui continue en 1re).
- Droites : « **vecteur directeur** ; équation cartésienne, équation réduite ; pente ; droite
  par deux points / point et vecteur / point et pente ; tracer ; alignement ; **parallèles ou
  sécantes, point d'intersection** ; démonstration par le déterminant ; algorithmes » — **[C]**
  `Géométrie repérée > équations de droites, milieu et distance` et `Fonctions affines >
coefficient directeur` + **[P]** `Géométrie repérée` > **« vecteur directeur »** et
  **« intersection de deux droites »** (filtres : deux familles de fiches très identifiées de
  2de).

## Fonctions

- Généralités : « intervalle de définition, courbe, y = f(x), signe, tableaux de signes,
  résolutions graphiques f(x) = k / f(x) < k / f(x) = g(x), variations, tableau de variations,
  extremums, optimisation, balayage et dichotomie » — **[C]** `Généralités sur les fonctions`
  (toutes les sous-notions) et `Inéquations : produit et quotient`.
- Fonctions de référence : « valeur absolue, carré, inverse, racine carrée, cube : définitions,
  courbes, variations, signe, comparaison d'images, équations ET inéquations f(x) = k,
  f(x) < k ; démonstrations des variations ; position relative de y = x et y = x² » — **[C]**
  pour carré et inverse (sous-notions complètes) ; **[P]** pour compléter les trois autres,
  par cohérence de la famille « fonctions de référence » (question T2) :
  - `Fonction valeur absolue` : ajouter **« variations »** et renommer « équations » →
    **« équations et inéquations »** (couvre |x − a| ⩽ r) ;
  - `Fonction racine carrée` : ajouter **« √x = k, √x < k »** ;
  - `Fonction cube` : renommer « x³ = k » → **« x³ = k, x³ < k »**.
- Affines : « m taux d'accroissement, p ordonnée à l'origine ; variations selon le signe de m ;
  droite ; signe » — **[C]** `Fonctions affines`.

## Statistiques et probabilités

- Information chiffrée : « proportions, pourcentage de pourcentage ; variation absolue,
  **taux d'évolution** ; coefficient multiplicateur ; **évolutions successives, évolution
  réciproque** » — **[C]** `Pourcentages > calculer` (pourcentage de pourcentage = point),
  `Évolutions > variations en pourcentage` (variation absolue et coefficient multiplicateur =
  points — le coefficient est introduit en 4e depuis le cycle 4) + **[P]** `Évolutions` >
  **« évolutions successives et réciproque »** (filtre : LA famille de fiches de 2de-1re sur le
  sujet ; sa note « à étoffer » se referme ici).
- Statistique descriptive : « moyenne pondérée, **linéarité de la moyenne** ; écart type,
  écart interquartile ; influence d'une valeur ; histogrammes, polygones de fréquences
  cumulées ; moyenne par classes, classe médiane » — **[C]** `Indicateurs` (linéarité et écart
  interquartile = points sous moyenne/quartiles) et `Représenter des données > histogrammes,
fréquences cumulées` ; les **séries regroupées en classes** : sous-notion ou simples points ?
  → question T5 (filtre discutable).
- Croisement de deux variables qualitatives : « tableau croisé d'effectifs ; fréquences
  marginales, fréquences conditionnelles ; compléter un tableau ; algorithmes de filtrage » —
  **[A]** notion **« Tableaux croisés »** dans `Statistiques` (2de), sous-notions **« tableau
  croisé d'effectifs »** et **« fréquences marginales et conditionnelles »** (filtre : partie
  entière du programme, famille de fiches évidente ; la sous-notion « tableaux croisés » de
  `Probabilités conditionnelles` garde le versant probabiliste).
- Probabilités : « loi des grands nombres vulgarisée, simulation ; P_A(B), arbres pondérés,
  tableaux ; multiplication des branches ; **distinguer P_A(B) et P_B(A), faux positifs** » —
  **[C]** `Échantillonnage > fluctuation, simulation` et `Probabilités conditionnelles > arbres
pondérés, tableaux croisés` + **[P]** `Probabilités conditionnelles` > **« inversion du
  conditionnement »** (filtre : les faux positifs/Bayes vulgarisé, famille d'exercices typée de
  la 2de à la Tle).

## [T] et Histoire des mathématiques

Les rubriques « Histoire des mathématiques » (numération, irrationnels, Descartes, statistique
graphique…) : enrichissements non exigibles — ni nœuds ni points. « Vraisemblance d'un
résultat », « modéliser », usage des outils : transversal.

## Sens inverse

- `Échantillonnage > estimation d'une proportion` : absente du programme révisé de 2de
  (vraisemblablement un reste de l'ancien). **Plus un problème depuis l'ADR 0020** : le nœud
  reste, simplement aucun pointeur de 2de — l'arbre a le droit de déborder.
- `Ensembles > Opérations sur les ensembles > différence` : seule la différence E \ A
  (complémentaire) figure en 2de — le nœud reste pour les niveaux qui l'utiliseront.
- Contraposée (formuler en 2de, raisonner en 1re), négation (sans quantificateurs en 2de),
  indépendance (1re) : affaires de **pointage**, pas de structure.

## Questions pour David

1. **T1 — Notion « Tableaux croisés »** (Statistiques, 2de) : « tableau croisé d'effectifs »,
   « fréquences marginales et conditionnelles ». (reco : oui.)
2. **T2 — Fonctions de référence, mise en cohérence** : Fonction valeur absolue (+ « variations »,
   « équations » → « équations et inéquations »), Fonction racine carrée (+ « √x = k,
   √x < k »), Fonction cube (« x³ = k » → « x³ = k, x³ < k »). (reco : oui.)
3. **T3 — Calcul littéral et nombres** : « isoler une variable », « expressions
   fractionnaires » (Calcul littéral) ; « nombres irrationnels » (Ensembles de nombres).
   (reco : oui.)
4. **T4 — Géométrie** : « vecteur directeur », « intersection de deux droites » (Géométrie
   repérée) ; « combinaison linéaire » (Vecteurs : sans coordonnées). (reco : oui.)
5. **T5 — Stats/évolutions** : « évolutions successives et réciproque » (Évolutions) ;
   « inversion du conditionnement » (Probabilités conditionnelles) ; et les « séries regroupées
   en classes » (Indicateurs) — sous-notion ou simples points sous moyenne/médiane ? (reco :
   oui, oui, et plutôt **points** pour les classes — le filtre est faible.)
6. **T6 — Validation d'ensemble** : niveaux indicatifs `Puissances : calculs` « 5e à 2de » et
   `Fractions : sens et écritures` « CE1 à 2de », et application au JSON + diagramme. Pour
   mémoire : D1 et D3 sont **dissoutes** par l'ADR 0020, D2 est réglée depuis le cycle 4 —
   aucune décision de la vieille liste ne reste ouverte pour la 2de.
