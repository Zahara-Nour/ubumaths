# Arbre des notions et programmes officiels du lycée : écarts

> Comparaison faite le 2026-10-07 entre `arbre-notions.json` (version du 2026-10-07 : 19 branches, 115 notions, 418 sous-notions) et les textes des cinq programmes fournis par David.
> **Rien n'est modifié** : ce document propose, David tranche.

## Programmes comparés

Aucun des cinq textes ne donne sa référence (BO, arrêté) ni sa date. Ce qu'on peut en dire :

| Niveau    | Texte                                                                                                 | Référence / date                                                                                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2de       | « Programme de mathématiques de la classe de seconde générale et technologique »                      | non indiquée. Il comprend une partie « Automatismes », une section « Croisement de deux variables qualitatives » et les probabilités conditionnelles en 2de : c'est donc une version **révisée**, postérieure au programme de 2019. Date à confirmer. |
| 1re spé   | « Programme de spécialité de mathématiques de la classe de première de la voie générale »             | non indiquée. Il comprend aussi une partie « Automatismes » (version révisée). La trigonométrie s'y limite au cercle et à cos et sin d'un réel.                                                                                                       |
| Tle spé   | « Programme de spécialité de mathématiques de la classe terminale de la voie générale »               | non indiquée. Pas de partie « Automatismes ».                                                                                                                                                                                                         |
| Expertes  | « Programme d'enseignement optionnel de mathématiques expertes de terminale générale »                | non indiquée. En-tête : « Ministère de l'Éducation nationale et de la Jeunesse ».                                                                                                                                                                     |
| Tle comp. | « Programme de l'option de mathématiques complémentaires de la classe terminale de la voie générale » | non indiquée.                                                                                                                                                                                                                                         |

## Légende

Une ligne par élément du programme. Les libellés du programme sont entre « ». Les chemins sont donnés sous la forme `Branche > Notion > sous-notion`, avec les noms exacts du JSON. Les propositions sont en **gras**.

- **[C] couvert** : une sous-notion de l'arbre le couvre.
- **[P] partiel** : la notion existe, mais il manque une sous-notion.
- **[A] absent** : aucune notion ne convient ; un emplacement est proposé.
- **[N] niveau manquant** : la notion existe, mais elle n'est pas marquée pour ce niveau.
- **[H] hors programme** : une notion ou une sous-notion de l'arbre est marquée pour ce niveau, mais le programme ne la contient pas.
- **[T] transversal, légitime** : il s'agit d'un entretien, d'un rappel ou d'une capacité générale. Aucun changement n'est proposé.
- **[O] approfondissement non couvert** : « Approfondissements possibles », « Problèmes possibles » ou exemples d'algorithme non exigibles. Ils ne sont pas couverts et aucun ajout n'est proposé.

Les éléments regroupés sur une même ligne partagent la même correspondance. Un élément qui renvoie à un ajout déjà proposé porte la mention « même ajout ».

## Synthèse chiffrée

| Niveau    | Couverts [C] | Partiels [P] | Absents [A] | Niveaux manquants [N] | Hors programme [H] | Transversal [T] | Approfondissements [O] |
| --------- | -----------: | -----------: | ----------: | --------------------: | -----------------: | --------------: | ---------------------: |
| 2de       |          108 |           32 |          12 |                     8 |                  2 |              10 |                      6 |
| 1re spé   |           69 |           19 |           3 |                     6 |                  2 |               8 |                      9 |
| Tle spé   |           96 |           14 |           1 |                     8 |                  2 |               7 |                     16 |
| Expertes  |           47 |            4 |           3 |                     0 |                  1 |               2 |                      5 |
| Tle comp. |           50 |           16 |           1 |                     5 |                  3 |               7 |                      5 |
| **Total** |      **370** |       **85** |      **20** |                **27** |             **10** |          **34** |                 **41** |

Les comptes portent sur des lignes du document, et une ligne peut regrouper plusieurs libellés proches. Les colonnes [H] et [T] comptent aussi les lignes des sections « Sens inverse ». Après dédoublonnage, les écarts se ramènent à **73 nouvelles sous-notions**, **4 nouvelles notions** (dont 3 suspendues à D2) et **10 ajouts de niveau** fermes, plus ceux qui dépendent de D1. Ils sont listés ci-dessous.

**Lecture rapide.** Le cœur des programmes de spécialité (analyse, espace, dénombrement, probabilités de Tle) et les programmes d'Expertes et de Tle comp. sont bien couverts. Les manques se concentrent à trois endroits :

1. **La 2de**, à cause de sa partie « Automatismes ». Elle appelle des notions du collège : la géométrie du collège (Pythagore, Thalès, trigonométrie du triangle rectangle, repérage) est **absente de l'arbre**, et Grandeurs et mesures est très mince.
2. **L'information chiffrée** : Évolutions, notion à étoffer (la note du JSON le dit déjà). Dans les **statistiques**, il manque les tableaux croisés, la boîte à moustaches et l'écart interquartile.
3. **Les niveaux de la Logique et des Ensembles** : ils figurent aussi en toutes lettres dans les programmes de Tle, et le produit cartésien et Card(A) dès la 2de.

## Décisions à prendre (avant les ajouts)

- **D1 — Automatismes.** Les programmes de 2de et de 1re listent des « automatismes » qui reprennent des notions du collège : fractions, puissances, conversions, droite graduée, produit nul, calcul littéral, lecture de graphiques, indicateurs. Deux options :

  - (a) ajouter le niveau 2de ou 1re aux notions concernées, ce qui gonfle les niveaux ;
  - (b) ne pas toucher aux niveaux et traiter les automatismes comme de l'entretien transversal.

  Ce document classe ces lignes en [N] avec la mention « (D1) ». Seules **Puissances : calculs** (règles explicitement au contenu « Algèbre » de 2de) et **Fractions : sens et écritures** (« forme irréductible », capacité d'Arithmétique en 2de) sont des contenus de 2de à part entière, indépendamment de D1.

- **D2 — Géométrie du collège.** La branche Géométrie commence en 2de, avec les vecteurs. Pythagore, Thalès, la trigonométrie du triangle rectangle et le repérage n'existent nulle part. Le programme de 2de les cite comme automatismes. Faut-il les créer (niveaux collège + 2de) ou considérer que la géométrie du collège sort du périmètre de l'arbre ?
- **D3 — Libellé « cycle 3 à Expertes » de Divisibilité.** Pris à la lettre, il inclut la 1re, la Tle spé et la Tle comp., qui n'en parlent pas. Proposition : « cycle 3 à 2de, Expertes ».

## Ajouts proposés (dédoublonnés)

Format : `Branche > Notion > **sous-notion**` (niveaux de la sous-notion). La mention « ★ » signale les priorités, c'est-à-dire les contenus ou capacités explicites, hors approfondissements.

### Nouvelles notions

- ★ Statistiques > **Tableaux croisés** (2de) : tableau croisé d'effectifs, fréquences marginales, fréquences conditionnelles
- Géométrie > **Théorème de Pythagore** (4e, 2de automatisme) — selon D2
- Géométrie > **Théorème de Thalès** (3e, 2de automatisme) — selon D2
- Géométrie > **Trigonométrie du triangle rectangle** (3e, 2de automatisme) — selon D2

### Nouvelles sous-notions dans des notions existantes

**Nombres et calculs**

- Nombres et calculs > Décimaux : numération > **arrondi et chiffres significatifs** (2de ; notion à étendre à 2de)
- Nombres et calculs > Décimaux : calculs > **ordre de grandeur** (2de automatisme ; notion à étendre, D1)

**Arithmétique**

- Arithmétique > Divisibilité > **pair et impair** (2de)
- ★ Arithmétique > Congruences > **petit théorème de Fermat** (Expertes)
- ★ Arithmétique > Congruences > **équation ax ≡ b [n], inverse modulo n** (Expertes)
- Arithmétique > PGCD, Bézout et Gauss > **nombres premiers entre eux** (Expertes)
- Arithmétique > Nombres premiers > **infinité des nombres premiers** (Expertes)

**Nombres complexes**

- ★ Nombres complexes > Formes trigo. et exponentielle > **formules d'addition et de duplication** (Expertes)
- Nombres complexes > Forme algébrique > **formule du binôme** (Expertes)

**Proportionnalité**

- ★ Proportionnalité > Évolutions > **coefficient multiplicateur** (2de, 1re)
- ★ Proportionnalité > Évolutions > **évolutions successives** (2de, 1re)
- ★ Proportionnalité > Évolutions > **évolution réciproque** (2de, 1re)
- Proportionnalité > Évolutions > **variation absolue** (2de)
- ★ Proportionnalité > Pourcentages > **pourcentage de pourcentage** (2de)

**Algèbre**

- ★ Algèbre > Calcul littéral > **isoler une variable** (2de)
- Algèbre > Calcul littéral > **expressions fractionnaires** (2de)

**Fonctions**

- ★ Fonctions > Généralités sur les fonctions > **parité** (1re ; notion à étendre à 1re)
- Fonctions > Fonction racine carrée > **√x = k, √x < k** (2de)
- Fonctions > Fonction cube > **x³ < k** (2de)
- Fonctions > Fonction valeur absolue > **inéquation |x − a| ⩽ r** (2de)
- Fonctions > Fonction valeur absolue > **variations** (2de)
- ★ Fonctions > Dérivation > **taux de variation** (1re)
- ★ Fonctions > Dérivation > **opérations sur les dérivées** (1re)
- Fonctions > Dérivation > **approximation affine** (1re)
- Fonctions > Dérivation > **position relative de deux courbes** (1re)
- Fonctions > Dérivation > **dérivabilité en un point** (1re)
- Fonctions > Fonctions trigonométriques > **angles associés** (1re)
- ★ Fonctions > Limites de fonctions > **comparaison et encadrement** (Tle)
- ★ Fonctions > Continuité > **encadrement d'une solution** (Tle, Tle comp.) : balayage, dichotomie
- Fonctions > Continuité > **continuité en un point** (Tle)
- Fonctions > Continuité > **fonction réciproque** (Tle comp.)
- ★ Fonctions > Logarithme népérien > **limites** (Tle, Tle comp.)

**Intégration et équations différentielles**

- ★ Intégration > Calcul d'intégrales > **suites d'intégrales** (Tle)
- ★ Intégration > Calcul d'intégrales > **positivité et inégalités** (Tle)
- Équations différentielles > Généralités > **méthode d'Euler** (Tle, Tle comp.)

**Suites**

- Suites > Limites de suites > **somme des termes d'une suite géométrique** (Tle comp.)

**Géométrie**

- Géométrie > Géométrie repérée > **lire et placer un point** (2de automatisme ; D2)
- ★ Géométrie > Géométrie repérée > **vecteur directeur** (2de)
- ★ Géométrie > Géométrie repérée > **intersection de deux droites** (2de)
- Géométrie > Vecteurs : sans coordonnées > **combinaison linéaire** (2de)
- Géométrie > Orthogonalité : avec coordonnées > **coordonnées du projeté orthogonal** (Tle)

**Grandeurs et mesures** (selon D1)

- Grandeurs et mesures > Périmètres > **polygone**, **cercle** (collège, 2de automatisme)
- Grandeurs et mesures > Aires > **disque** (collège, 2de automatisme)
- Grandeurs et mesures > Volumes > **volumes des solides usuels** (collège, 2de automatisme, Tle)

**Probabilités**

- ★ Probabilités > Probabilités conditionnelles > **inversion du conditionnement** (2de, 1re, Tle comp.) : faux positifs, formule de Bayes
- ★ Probabilités > Probabilités conditionnelles > **probabilités totales** (1re, Tle)
- ★ Probabilités > Probabilités conditionnelles > **épreuves indépendantes successives** (1re, Tle)
- ★ Probabilités > Variables aléatoires > **linéarité de l'espérance** (1re)
- Probabilités > Variables aléatoires > **formule de König-Huygens** (1re)
- ★ Probabilités > Loi binomiale > **intervalle de fluctuation** (Tle, Tle comp.) : P(X ∈ I) ⩾ 1 − α
- Probabilités > Loi binomiale > **loi de Bernoulli** (Tle, Tle comp.)
- Probabilités > Autres lois > **absence de mémoire** (Tle comp.)
- Probabilités > Autres lois > **fonction de répartition** (Tle comp.)
- Probabilités > Autres lois > **variance** (Tle comp.)
- Probabilités > Sommes et concentration > **loi des grands nombres** (Tle)

**Statistiques**

- ★ Statistiques > Représenter des données > **boîte à moustaches** (2de, 1re automatisme)
- Statistiques > Représenter des données > **lire une courbe, un nuage de points** (2de automatisme)
- ★ Statistiques > Indicateurs > **séries regroupées en classes** (2de) : moyenne pondérée, classe médiane
- ★ Statistiques > Indicateurs > **écart interquartile** (2de)
- Statistiques > Indicateurs > **linéarité de la moyenne** (2de)
- Statistiques > Indicateurs > **déciles et rapport interdécile** (Tle comp.)
- Statistiques > Statistique à deux variables > **coefficient de corrélation** (Tle comp.)
- Statistiques > Statistique à deux variables > **interpoler, extrapoler** (Tle comp.)

**Logique, ensembles, algorithmique**

- ★ Logique > Implication et équivalence > **condition nécessaire, condition suffisante** (1re, Tle)
- Logique > Raisonnements > **par équivalence** (Tle)
- Logique > Quantificateurs et négation > **quantifications implicites** (1re)
- Logique > Quantificateurs et négation > **statut des lettres et des égalités** (1re)
- Ensembles > Ensembles de nombres > **droite numérique** (2de)
- Ensembles > Ensembles de nombres > **encadrement décimal** (2de)
- Ensembles > Ensembles de nombres > **nombres irrationnels** (2de)
- Algorithmique > Listes > **éléments et indices** (1re)
- Graphes > Chaînes de Markov > **distribution après n transitions** (Expertes)

### Niveaux à ajouter à des notions existantes

- ★ Nombres et calculs > Puissances : calculs → **+ 2de** (« règles de calcul sur les puissances entières relatives »)
- ★ Nombres et calculs > Fractions : sens et écritures → **+ 2de** (« présenter les fractions sous forme irréductible »)
- ★ Ensembles > Cardinal et produit cartésien → **+ 2de** (« couple, produit cartésien », « Card(A) »)
- ★ Fonctions > Fonction exponentielle → **+ Tle, Tle comp.** (limites en ±∞, équations et inéquations, dérivée de e^u)
- ★ Probabilités > Probabilités conditionnelles → **+ Tle, Tle comp.** (probabilités totales en Tle, Bayes en Tle comp.)
- ★ Statistiques > Échantillonnage → **+ 1re, Tle comp.** (expérimentations de 1re, thème « Répétition d'expériences indépendantes, échantillonnage »)
- Logique > Connecteurs et contre-exemples, Implication et équivalence, Quantificateurs et négation, Raisonnements → **+ Tle** (le programme de Tle les énumère)
- Ensembles > Opérations sur les ensembles → **+ Tle**
- Algorithmique > Listes → **+ Tle** (capacités attendues reprises en Tle)
- Suites > Suites géométriques, Suites arithmétiques → **+ Tle comp.** (contenus associés, limite de la somme des termes)
- Selon D1 (automatismes) : Fractions : calculs, Relatifs : sens et écritures, Unités et conversions, Durées, Vitesse → + 2de ; Équations : produit et quotient, Calcul littéral, Généralités sur les fonctions, Représenter des données, Indicateurs → + 1re

### Corrections de niveau ou retraits suggérés

- Arithmétique > Divisibilité : « cycle 3 à Expertes » → « cycle 3 à 2de, Expertes » (D3)
- Statistiques > Échantillonnage > estimation d'une proportion : absente du programme de 2de (vraisemblablement un reste du programme de 2019) ; à retirer en 2de ou à rattacher à Tle (approfondissement « Estimation »)
- Graphes > Chaînes et connexité > chaînes et cycles : « cycle » hors programme d'Expertes (problème possible seulement)
- Hors programme Tle comp., à garder en Tle spé seulement : Convexité > inégalités de convexité ; Calcul d'intégrales > intégration par parties ; y′ = f > forme (v′∘u)×u′ et sinus et cosinus. L'arbre ne porte pas de niveau par sous-notion ; à noter dans `note` si utile.
- Fonctions > Fonctions trigonométriques : les sous-notions équations, inéquations, parité et périodicité, dérivées et variations sont de Tle seulement (même remarque sur les niveaux par sous-notion)

---

## 2de — programme de seconde générale et technologique

### Vocabulaire ensembliste et logique

- [C] « élément d'un ensemble, sous-ensemble, appartenance et inclusion » → Ensembles > Ensembles de nombres > appartenance et inclusion
- [C] « réunion, intersection » → Ensembles > Opérations sur les ensembles > union et intersection
- [C] « complémentaire » (A̅, E \ A) → Ensembles > Opérations sur les ensembles > complémentaire
- [C] « notation des ensembles de nombres et des intervalles » → Ensembles > Ensembles de nombres > intervalles
- [N] « notion de couple et produit cartésien de deux ensembles » → Ensembles > Cardinal et produit cartésien > produit cartésien : ajouter **2de**
- [N] « notation Card(A) » → Ensembles > Cardinal et produit cartésien > cardinal : ajouter **2de** (même ajout)
- [C] « connecteurs « et », « ou » » → Logique > Connecteurs et contre-exemples > et, ou, non
- [C] « négation de propositions simples » → Logique > Connecteurs et contre-exemples > et, ou, non
- [C] « contre-exemple » → Logique > Connecteurs et contre-exemples > contre-exemple
- [C] « implication, équivalence logique » → Logique > Implication et équivalence > implication / équivalence
- [C] « réciproque d'une implication, la contraposée » → Logique > Implication et équivalence > réciproque / contraposée
- [C] « quantification universelle ou existentielle » → Logique > Quantificateurs et négation > pour tout, il existe
- [C] « raisonnements par disjonction des cas et par l'absurde » → Logique > Raisonnements > disjonction de cas / par l'absurde

### Algorithmique et programmation

- [C] « variables de type entier, booléen, flottant, chaîne » → Algorithmique > Variables et instructions > types
- [C] « affectation », « séquence d'instructions », « écrire une formule combinant des variables » → Algorithmique > Variables et instructions > variables et affectation
- [C] « instruction conditionnelle » → Algorithmique > Variables et instructions > instructions conditionnelles
- [C] « boucle bornée (for), boucle non bornée (while) » → Algorithmique > Boucles > boucle bornée / boucle non bornée
- [C] « fonctions à un ou plusieurs arguments », « appeler une fonction » → Algorithmique > Fonctions Python > définir une fonction / appeler une fonction
- [C] « fonction renvoyant un nombre aléatoire ; série obtenue par répétition » → Statistiques > Échantillonnage > simulation
- [C] « lire une fonction renvoyant une moyenne, un écart type » → Statistiques > Indicateurs > moyenne / écart-type

### Automatismes

- [C] « comparer deux nombres par leur différence, par leur quotient » → Algèbre > Inégalités > comparer et encadrer
- [N] « opérations et comparaisons entre des fractions simples » → Nombres et calculs > Fractions : calculs (CM1 à 4e) : 2de en automatisme (cf. décision D1)
- [N] « opérations sur les puissances » → Nombres et calculs > Puissances : calculs (4e, 3e) : ajouter **2de** (aussi au contenu « Algèbre », voir plus bas)
- [C] « écriture décimale, fractionnaire, pourcentage » → Nombres et calculs > Fractions : sens et écritures > forme décimale ; Proportionnalité > Pourcentages > définition
- [A] « estimer un ordre de grandeur » → proposer Nombres et calculs > Décimaux : calculs > **ordre de grandeur**
- [T] « s'assurer de la vraisemblance d'un résultat » : attitude transversale, pas de notion
- [N] « conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses » → Grandeurs et mesures > Unités et conversions (6e), Durées > convertir, Proportionnalité > Vitesse > convertir : 2de en automatisme (D1)
- [C] « – (a + b) = –a – b … règles sur les écritures multiplicatives » → Algèbre > Calcul littéral > opposé d'une expression / simplifier l'écriture
- [C] « identités (a + b)², (a – b)², (a + b)(a – b) » → Algèbre > Calcul littéral > identités remarquables
- [C] « factorisation de ax² + bx, ax + bx » → Algèbre > Calcul littéral > factoriser
- [C] « x² = a » → Algèbre > Équations : produit et quotient > x² = a
- [C] « ax + b = cx + d » → Algèbre > Équations : premier degré > ax + b = cx + d
- [C] « a/x = b » → Fonctions > Fonction inverse > 1/x = k, 1/x < k
- [C] « inéquation du premier degré » → Algèbre > Inéquations : premier degré > ax + b < cx + d
- [A] « isoler une variable dans une égalité qui en comporte plusieurs » → proposer Algèbre > Calcul littéral > **isoler une variable**
- [C] « application numérique d'une formule » → Algèbre > Calcul littéral > substitution
- [C] « calculer, appliquer, exprimer une proportion » ; « partie connaissant le tout, ou le tout connaissant une partie » → Proportionnalité > Pourcentages > calculer
- [P] « « augmenter de 5 % » ↔ « multiplier par 1,05 » » → Proportionnalité > Évolutions : manque **coefficient multiplicateur**
- [C] « images et antécédents graphiquement » → Fonctions > Généralités sur les fonctions > images et antécédents
- [C] « exploiter une équation de courbe (appartenance d'un point) » → Fonctions > Généralités sur les fonctions > appartenance à une courbe
- [C] « fonction linéaire, affine ; représentation graphique est une droite » → Fonctions > Fonctions affines > expression et droite
- [N] « sur une droite graduée, repérer ou placer un point d'abscisse relative » → Nombres et calculs > Relatifs : sens et écritures > droite graduée (5e, 4e) : 2de en automatisme (D1)
- [A] « lire les coordonnées d'un point, placer un point de coordonnées données » → aucune notion de repérage ; proposer Géométrie > Géométrie repérée > **lire et placer un point**
- [P] « périmètres (polygone et cercle) » → Grandeurs et mesures > Périmètres (carré, rectangle) : manquent **polygone**, **cercle**
- [P] « aires (rectangle, triangle et disque) » → Grandeurs et mesures > Aires : manque **disque**
- [P] « volumes (pavé droit, prisme, cylindre, pyramide, cône et boule) » → Grandeurs et mesures > Volumes (conversions seulement) : manque **volumes des solides usuels**
- [A] « application simple du théorème de Pythagore » → aucune notion ; proposer nouvelle notion Géométrie > **Théorème de Pythagore** (D2)
- [A] « application simple du théorème de Thalès » → proposer nouvelle notion Géométrie > **Théorème de Thalès** (D2)
- [A] « lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente » → proposer nouvelle notion Géométrie > **Trigonométrie du triangle rectangle** (D2)
- [C] « diagramme en barres ; diagramme circulaire, semi-circulaire » → Statistiques > Représenter des données > diagrammes en barres / diagrammes circulaires
- [P] « courbe, nuage de points (diagramme cartésien) » → Statistiques > Représenter des données : manque **lire une courbe, un nuage de points**
- [C] « moyenne, médiane, quartiles (données brutes, regroupées par classes) » → Statistiques > Indicateurs > moyenne / médiane / quartiles
- [A] « comparer des distributions à l'aide de boîtes à moustaches » → proposer Statistiques > Représenter des données > **boîte à moustaches**
- [C] « probabilité entre 0 et 1 », « évènement contraire », « somme des probabilités des issues » → Probabilités > Expériences aléatoires > probabilité simple / événements
- [C] « P(A) = Card(A)/Card(Ω) en équiprobabilité » → Probabilités > Expériences aléatoires > équiprobabilité

### Nombres et calculs, algèbre — Arithmétique

- [C] « notations ℕ et ℤ » → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ
- [C] « multiple, diviseur » → Arithmétique > Divisibilité > multiples et diviseurs
- [P] « nombre pair, nombre impair » → Arithmétique > Divisibilité : manque **pair et impair**
- [C] « modéliser et résoudre des problèmes mobilisant multiple, diviseur » → Arithmétique > Divisibilité > multiples et diviseurs
- [N] « présenter les fractions sous forme irréductible » → Nombres et calculs > Fractions : sens et écritures > simplifier (CM1 à 4e) : ajouter **2de**
- [C] Démonstration « la somme de deux multiples de a est multiple de a » → Arithmétique > Divisibilité > multiples et diviseurs
- [P] Démonstration « le carré d'un nombre impair est impair » → Arithmétique > Divisibilité : **pair et impair** (même ajout)
- [C] Algorithme « déterminer si a est multiple de b » → Arithmétique > Divisibilité > multiples et diviseurs
- [C] Algorithme « plus grand multiple de a inférieur ou égal à b » → Arithmétique > Divisibilité > division euclidienne

### Nombres réels

- [P] « ensemble ℝ, droite numérique » → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ : manque **droite numérique**
- [C] « intervalles de ℝ, notations [a, +∞[ … » → Ensembles > Ensembles de nombres > intervalles
- [C] « valeur absolue |a|, distance entre deux réels » → Fonctions > Fonction valeur absolue > définition et distance
- [P] « inéquation |x – a| ⩽ r, intervalle [a – r, a + r] » → Fonctions > Fonction valeur absolue (équations seulement) : manque **inéquation |x − a| ⩽ r**
- [P] « ensemble 𝔻 ; encadrement décimal à 10⁻ⁿ près » → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ : manque **encadrement décimal**
- [P] « ℚ ; nombres irrationnels, √2 et π » → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ : manque **nombres irrationnels**
- [P] « lire l'abscisse d'un réel sur une droite graduée, placer un réel » → Ensembles > Ensembles de nombres : **droite numérique** (même ajout)
- [C] « représenter un intervalle ; appartenance à un intervalle » → Ensembles > Ensembles de nombres > intervalles / appartenance et inclusion
- [P] « encadrement d'amplitude donnée par des décimaux » → **encadrement décimal** (même ajout)
- [A] « arrondir en donnant le nombre de chiffres significatifs adapté » → proposer Nombres et calculs > Décimaux : numération > **arrondi et chiffres significatifs** (étendre la notion à 2de)
- [P] Démonstrations « 1/3 n'est pas décimal », « √2 est irrationnel » → **nombres irrationnels** (même ajout)
- [C] Algorithme « encadrement de √2 par balayage » → Algorithmique > Boucles > boucle non bornée
- [O] Approfondissements « développement décimal illimité », « périodicité du développement des rationnels »

### Algèbre

- [N] « règles de calcul sur les puissances entières relatives » → Nombres et calculs > Puissances : calculs : ajouter **2de**
- [C] « règles sur les racines carrées ; √(a²) = |a| » → Nombres et calculs > Racines carrées : calculs > propriétés
- [P] « calcul sur des expressions algébriques… expressions fractionnaires » → Algèbre > Calcul littéral : manque **expressions fractionnaires**
- [C] « somme d'inégalités ; produit par un réel positif, négatif » → Algèbre > Inégalités > règles de calcul
- [C] « comparaison additive, multiplicative » → Algèbre > Inégalités > comparer et encadrer
- [C] « ax + b = 0 et ax + b > 0 » → Algèbre > Équations : premier degré > ax = b ; Inéquations : premier degré > ax + b < c
- [C] « A(x)B(x) = 0 (équation produit nul) » → Algèbre > Équations : produit et quotient > produit nul
- [C] « signe de A(x)B(x) et A(x)/B(x) » → Algèbre > Inéquations : produit et quotient > tableau de signes
- [C] « A(x)/B(x) = k en lien avec l'ensemble de définition » → Algèbre > Équations : produit et quotient > équation quotient
- [C] « calculs mettant en jeu puissances, racines, écritures fractionnaires » → Puissances : calculs (après ajout 2de) ; Racines carrées : calculs > calculer
- [A] « exprimer une variable en fonction des autres (U = RI, d = vt…) ; ax + by = c » → **isoler une variable** (même ajout)
- [C] « choisir la forme la plus adaptée (factorisée, développée) » → Algèbre > Calcul littéral > développer / factoriser
- [C] « comparer par différence ou rapport ; variation additive ou multiplicative » → Algèbre > Inégalités > comparer et encadrer
- [C] « modéliser un problème par une inéquation » → Algèbre > Inéquations : premier degré > mettre en inéquation
- [C] « ax = b, a + x = b, ax + b = cx + d ; inéquations ; x² = a » → Algèbre > Équations : premier degré ; Inéquations : premier degré ; Équations : produit et quotient > x² = a
- [C] Démonstration « √(ab) = √a √b » → Nombres et calculs > Racines carrées : calculs > propriétés
- [C] Algorithme « première puissance supérieure à une valeur donnée » → Algorithmique > Boucles > boucle non bornée
- [O] Approfondissements « (a + b + c)² », « (a + b)³ » (relèveraient de Calcul littéral > identités remarquables)
- [O] Approfondissement « inégalité entre moyennes géométrique et arithmétique »

### Géométrie — Vecteurs

- [C] « égalité de deux vecteurs, notation, vecteur nul » → Géométrie > Vecteurs : sans coordonnées > égalité de vecteurs
- [C] « représentants d'un vecteur » → Géométrie > Vecteurs : sans coordonnées > translation et vecteur
- [C] « produit d'un vecteur par un réel ; colinéarité » → Géométrie > Vecteurs : sans coordonnées > produit par un réel / colinéarité
- [P] « représentation d'un vecteur comme combinaison de deux vecteurs non colinéaires » → Géométrie > Vecteurs : sans coordonnées : manque **combinaison linéaire**
- [C] « base orthonormée, coordonnées d'un vecteur, norme » → Géométrie > Vecteurs : avec coordonnées > coordonnées d'un vecteur / norme
- [C] « coordonnées de AB en fonction de A et B » → Géométrie > Vecteurs : avec coordonnées > coordonnées d'un vecteur
- [C] « déterminant, critère de colinéarité ; alignement, parallélisme » → Géométrie > Vecteurs : avec coordonnées > colinéarité et déterminant
- [C] « caractérisation vectorielle du milieu » → Géométrie > Géométrie repérée > milieu et distance
- [C] « somme de deux vecteurs à partir de représentants » → Géométrie > Vecteurs : sans coordonnées > somme et relation de Chasles
- [C] « représenter, lire les coordonnées d'un vecteur ; coordonnées d'une somme, d'un produit » → Géométrie > Vecteurs : avec coordonnées > coordonnées d'un vecteur / somme et produit par un réel
- [C] « distance entre deux points ; coordonnées du milieu » → Géométrie > Géométrie repérée > milieu et distance
- [C] Démonstration « colinéarité : nullité du déterminant ; proportionnalité des coordonnées » → Géométrie > Vecteurs : avec coordonnées > colinéarité et déterminant
- [O] Approfondissements « barycentre », « hauteurs concourantes », « aire ½ ab sin C », « médianes », « médiatrices »

### Géométrie — Droites du plan

- [P] « vecteur directeur d'une droite » → Géométrie > Géométrie repérée : manque **vecteur directeur**
- [C] « équation cartésienne, équation réduite » → Géométrie > Géométrie repérée > équations de droites
- [C] « pente (coefficient directeur) » → Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine
- [C] « équation de droite à partir de deux points, d'un point et d'un vecteur directeur, d'un point et la pente » → Géométrie > Géométrie repérée > équations de droites
- [C] « tracer une droite connaissant son équation » → Géométrie > Géométrie repérée > équations de droites
- [C] « trois points alignés ou non » → Géométrie > Vecteurs : avec coordonnées > colinéarité et déterminant
- [P] « deux droites parallèles ou sécantes ; point d'intersection » → Géométrie > Géométrie repérée : manque **intersection de deux droites**
- [C] Démonstration « forme générale d'une équation de droite par le déterminant » → Géométrie > Géométrie repérée > équations de droites
- [C] Algorithmes « alignement de trois points », « équation de droite passant par deux points » → mêmes sous-notions
- [O] Approfondissements « points équidistants d'un point et de l'axe des abscisses », « parties du plan décrites par des inégalités »

### Fonctions

- [C] « fonction définie sur un intervalle ou une réunion d'intervalles » ; « ensemble de définition » → Fonctions > Généralités sur les fonctions > ensemble de définition
- [C] « courbe représentative ; exploiter y = f(x) » → Fonctions > Généralités sur les fonctions > appartenance à une courbe
- [C] « signe d'une fonction affine et des fonctions de référence » → Fonctions > Fonctions affines > variations et signe ; Généralités sur les fonctions > signe
- [C] « tableau de signes pour un produit ou un quotient » → Algèbre > Inéquations : produit et quotient > tableau de signes
- [T] « modéliser par des fonctions des situations » : capacité transversale
- [C] « fonctions valeur absolue, carré, inverse : définitions et courbes » → Fonctions > Fonction valeur absolue > courbe ; Fonction carré > définition et courbe ; Fonctions > Fonction inverse > définition et courbe
- [C] « f(x) = k, f(x) < k (graphique, algébrique, logicielle) » → Fonctions > Généralités sur les fonctions > résolution graphique
- [C] « f(x) = 0, f(x) > 0 par tableau de signes » → Algèbre > Inéquations : produit et quotient > inéquation produit / inéquation quotient
- [C] « f(x) = g(x), f(x) < g(x) graphiquement » → Fonctions > Généralités sur les fonctions > résolution graphique
- [C] « affines, carré, inverse : f(x) = k, f(x) < k » → Fonctions > Fonction carré > x² = k, x² < k ; Fonctions > Fonction inverse > 1/x = k, 1/x < k
- [P] « … racine carrée : f(x) = k, f(x) < k » → Fonctions > Fonction racine carrée : manque **√x = k, √x < k**
- [P] « … cube : f(x) = k, f(x) < k » → Fonctions > Fonction cube (x³ = k) : manque **x³ < k**
- [P] « … valeur absolue : f(x) = k, f(x) < k » → Fonctions > Fonction valeur absolue (équations) : **inéquations** (même ajout que |x − a| ⩽ r)
- [C] « croissance, décroissance, tableau de variations » → Fonctions > Généralités sur les fonctions > variations
- [C] « maximum, minimum sur un intervalle » ; « extrémums graphiquement » → Fonctions > Généralités sur les fonctions > extremums
- [C] « m taux d'accroissement, p ordonnée à l'origine » → Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine
- [C] « variations d'une fonction affine selon le signe du coefficient » ; « relier sens de variation, signe, droite » → Fonctions > Fonctions affines > variations et signe
- [C] « relier représentation graphique et tableau de variations » → Fonctions > Généralités sur les fonctions > variations
- [T] « exploiter un logiciel, la calculatrice ou Python pour décrire les variations » : transversal
- [C] « traiter de problèmes d'optimisation » → Fonctions > Généralités sur les fonctions > extremums
- [P] « valeur absolue, carré : signe et variations » → Fonctions > Fonction carré > variations ; Fonction valeur absolue : manque **variations**
- [C] « comparer f(a) et f(b) pour une fonction de référence » → Fonctions > Fonction carré, Fonction inverse, Fonction racine carrée > comparer des images
- [C] Démonstrations « variations des fonctions affines », « variations des fonctions carré, inverse » → sous-notions variations correspondantes
- [C] Démonstration « position relative de y = x et y = x² pour x ⩾ 0 » → Fonctions > Généralités sur les fonctions > résolution graphique
- [C] Algorithmes « approximation d'un extrémum (balayage, dichotomie) » → Algorithmique > Boucles > boucle non bornée
- [O] Algorithme « longueur approchée d'une portion de courbe »
- [C] Approfondissement « courbes de la racine carrée et du carré sur ℝ+ » → Fonctions > Fonction racine carrée > définition et courbe

### Statistiques et probabilités — Information chiffrée, statistique descriptive

- [P] « pourcentage de pourcentage » → Proportionnalité > Pourcentages : manque **pourcentage de pourcentage**
- [P] « variation absolue V2 – V1 » → Proportionnalité > Évolutions : manque **variation absolue**
- [P] « coefficient multiplicateur V2/V1 » → Proportionnalité > Évolutions : **coefficient multiplicateur** (même ajout)
- [C] « variation relative (taux d'évolution) » → Proportionnalité > Évolutions > variations en pourcentage
- [P] « évolutions successives » → Proportionnalité > Évolutions : manque **évolutions successives**
- [P] « évolution réciproque » → Proportionnalité > Évolutions : manque **évolution réciproque**
- [P] « linéarité de la moyenne » → Statistiques > Indicateurs > moyenne : manque **linéarité de la moyenne**
- [C] « indicateurs de dispersion : écart type » → Statistiques > Indicateurs > écart-type
- [C] « influence sur la moyenne, la médiane de l'ajout d'une valeur » → Statistiques > Indicateurs > moyenne / médiane
- [C] « histogramme, polygone des fréquences cumulées » → Statistiques > Représenter des données > histogrammes / fréquences cumulées
- [P] « moyenne pondérée par classes ; classe médiane, estimation de la médiane » → Statistiques > Indicateurs : manque **séries regroupées en classes**
- [C] « relation entre effectifs, proportions et pourcentages » → Statistiques > Représenter des données > effectifs et fréquences
- [P] « taux d'évolution global, taux réciproque » → **évolutions successives**, **évolution réciproque** (mêmes ajouts)
- [P] « comparer deux séries : moyenne-écart type / médiane-écart interquartile » → Statistiques > Indicateurs : manque **écart interquartile**

### Croisement de deux variables qualitatives

- [A] « tableau croisé d'effectifs » → seule la sous-notion probabiliste existe (Probabilités > Probabilités conditionnelles > tableaux croisés) ; proposer nouvelle notion Statistiques > **Tableaux croisés** > tableau croisé d'effectifs
- [A] « fréquence conditionnelle, fréquence marginale » → Statistiques > Tableaux croisés > **fréquences marginales**, **fréquences conditionnelles**
- [A] « compléter un tableau croisé » → Statistiques > Tableaux croisés (même ajout)
- [T] Algorithmes « filtrer des individus (ET, OU, NON) », « dresser le tableau croisé » : Algorithmique (listes, non exigibles en 2de) + Logique > Connecteurs

### Probabilités

- [C] « version vulgarisée de la loi des grands nombres » ; « observer la loi des grands nombres par simulation » → Statistiques > Échantillonnage > fluctuation / simulation
- [C] « probabilité conditionnelle P_A(B) » → Probabilités > Probabilités conditionnelles (2de)
- [C] « arbres de probabilité » ; « construire un arbre pondéré ou un tableau » → Probabilités > Probabilités conditionnelles > arbres pondérés / tableaux croisés
- [C] « probabilités conditionnelles depuis un tableau croisé ou un arbre » → Probabilités > Probabilités conditionnelles > tableaux croisés / arbres pondérés
- [C] « interpréter les pondérations ; multiplication des branches » → Probabilités > Probabilités conditionnelles > arbres pondérés
- [P] « distinguer P_A(B) et P_B(A), faux positifs » → Probabilités > Probabilités conditionnelles : manque **inversion du conditionnement**

### Sens inverse : notions marquées 2de absentes du programme de 2de

- [H] Statistiques > Échantillonnage > estimation d'une proportion : le programme ne parle que de loi des grands nombres et de fluctuation, pas d'estimation (vraisemblablement un reste de l'ancien programme)
- [H] Ensembles > Opérations sur les ensembles > différence : seule la différence E \ A (complémentaire) figure au programme
- [T] Logique > Raisonnements > par contraposée : en 2de, on sait seulement « formuler la contraposée » ; le raisonnement par contraposée figure en 1re
- [T] Logique > Quantificateurs et négation > négation d'une proposition : en 2de, négation « sans implication ni quantificateurs » seulement
- [T] Probabilités > Probabilités conditionnelles > indépendance : figure en 1re seulement (la notion porte « 2de, 1re », donc c'est cohérent)
- [T] Géométrie > Géométrie repérée > vecteur normal et équation de droite / équation de cercle / projeté orthogonal : figurent en 1re seulement (la notion porte « 2de, 1re »)
- [T] Statistiques > Indicateurs > étendue ; Arithmétique > Divisibilité > critères de divisibilité : acquis du collège, entretien
- [T] Proportionnalité > Pourcentages (6e à 2de) ; Nombres et calculs > Racines carrées : sens et écritures (5e à 2de) : au programme (automatismes, algèbre)

## 1re spé — programme de spécialité de première

### Vocabulaire ensembliste et logique

- [C] « élément, sous-ensemble, appartenance, inclusion, réunion, intersection, complémentaire » → Ensembles > Ensembles de nombres > appartenance et inclusion ; Opérations sur les ensembles
- [C] « couple, produit cartésien ; Card(A) » → Ensembles > Cardinal et produit cartésien > produit cartésien / cardinal
- [C] « connecteurs « et », « ou » » ; « contre-exemple » → Logique > Connecteurs et contre-exemples
- [C] « implication, équivalence, réciproque, contraposée » → Logique > Implication et équivalence
- [P] « condition nécessaire, condition suffisante » → Logique > Implication et équivalence : manque **condition nécessaire, condition suffisante**
- [A] « statut des égalités (identité, équation) et des lettres (variable, inconnue, paramètre) » → proposer Logique > Quantificateurs et négation > **statut des lettres et des égalités**
- [C] « utiliser les quantificateurs » → Logique > Quantificateurs et négation > pour tout, il existe
- [P] « repérer les quantifications implicites » → Logique > Quantificateurs et négation : manque **quantifications implicites**
- [C] « négation de propositions quantifiées » → Logique > Quantificateurs et négation > négation d'une proposition
- [C] « raisonnements par disjonction des cas, par l'absurde, par contraposée » → Logique > Raisonnements

### Algorithmique et programmation

- [C] « générer une liste (en extension, par ajouts, en compréhension) » → Algorithmique > Listes > créer une liste / liste en compréhension
- [P] « manipuler des éléments d'une liste et leurs indices » → Algorithmique > Listes : manque **éléments et indices**
- [C] « parcourir une liste », « itérer sur les éléments » → Algorithmique > Listes > parcourir une liste
- [T] « consolidation des notions de variable, d'instruction conditionnelle, de boucle, de fonction » → Algorithmique > Variables et instructions, Boucles, Fonctions Python (2de) : entretien

### Automatismes

- [P] « appliquer un taux d'évolution (valeur finale ou initiale) » ; « calculer un taux d'évolution » → Proportionnalité > Évolutions > variations en pourcentage ; manque **coefficient multiplicateur** (même ajout)
- [P] « taux équivalent à plusieurs évolutions successives » ; « taux réciproque » → **évolutions successives**, **évolution réciproque** (mêmes ajouts)
- [N] « solutions d'une équation produit nul » → Algèbre > Équations : produit et quotient > produit nul (3e, 2de) : 1re en automatisme (D1)
- [C] « signe d'une expression du premier degré, d'une expression factorisée du second degré » → Fonctions > Second degré > signe
- [N] « développer, factoriser, réduire une expression simple » → Algèbre > Calcul littéral (5e à 2de) : 1re en automatisme (D1)
- [N] « résoudre graphiquement f(x) = k, f(x) < k » ; « signe ou tableau de variations graphiquement » → Fonctions > Généralités sur les fonctions (3e, 2de) : 1re en automatisme (D1)
- [C] « tracer une droite (équation réduite, point et coefficient directeur) » ; « lire l'équation réduite » ; « coefficient directeur depuis deux points » → Géométrie > Géométrie repérée > équations de droites
- [N] « lire un graphique, un histogramme, un diagramme en barres ou circulaire » ; « passer du graphique aux données » → Statistiques > Représenter des données (5e à 2de) : 1re en automatisme (D1)
- [A] « … un diagramme en boîte » → **boîte à moustaches** (même ajout qu'en 2de)
- [N] « calculer et interpréter des indicateurs statistiques » → Statistiques > Indicateurs (5e à 2de) : 1re en automatisme (D1)
- [C] « probabilités conditionnelles depuis un tableau croisé ou un arbre » → Probabilités > Probabilités conditionnelles > tableaux croisés / arbres pondérés
- [P] « distinguer P(A ∩ B), P_A(B), P_B(A) » → **inversion du conditionnement** (même ajout)

### Suites numériques, modèles discrets

- [C] « modes de génération : explicite, récurrence, algorithme, motifs géométriques » → Suites > Généralités sur les suites > explicite ou par récurrence / deviner le terme général
- [C] « notations u(n), uₙ » → Suites > Généralités sur les suites > calculer un terme
- [C] « suites arithmétiques : définition, terme général ; 1 + 2 + … + n » → Suites > Suites arithmétiques > raison / terme général / somme des termes
- [C] « suites géométriques : définition, terme général ; 1 + q + … + qⁿ » → Suites > Suites géométriques > raison / terme général / somme des termes
- [C] « sens de variation d'une suite » → Suites > Généralités sur les suites > sens de variation
- [C] « introduction intuitive de la limite » ; « conjecturer la limite » → Suites > Limites de suites > définition
- [C] « registres langue naturelle, algébrique, graphique » → Suites > Généralités sur les suites > représentation graphique
- [C] « relation pour une suite définie par un motif, par un dénombrement » → Suites > Généralités sur les suites > deviner le terme général
- [C] « calculer des termes (explicite, récurrence, algorithme) » → Suites > Généralités sur les suites > calculer un terme
- [C] « modéliser une croissance linéaire, exponentielle » → Suites > Suites et modélisation > placements / pourcentages
- [C] Démonstrations « terme général », « 1 + 2 + … + n », « 1 + q + … + qⁿ » → sous-notions terme général / somme des termes
- [C] Algorithmes « termes, sommes, seuil » → Suites > Suites et modélisation > seuil / algorithmes
- [T] Algorithme « calcul de factorielle » → Dénombrement > Arrangements et permutations > factorielle (Tle) : simple exemple, pas d'ajout de niveau
- [C] Algorithme « Syracuse, Fibonacci » → Suites > Généralités sur les suites > calculer un terme
- [C] Approfondissement « remboursement d'un emprunt » → Suites > Suites et modélisation > placements
- [O] Approfondissements « tour de Hanoï », « somme des n premiers carrés, cubes »

### Équations, fonctions polynômes du second degré

- [C] « forme factorisée ; racines, signe ; somme et produit des racines » → Fonctions > Second degré > racines / signe / somme et produit des racines
- [C] « forme canonique ; discriminant ; factorisation ; résolution ; signe » → Fonctions > Second degré > formes ; Algèbre > Équations : second degré > discriminant
- [C] « fonctions du second degré s'annulant en deux réels donnés » → Fonctions > Second degré > racines
- [C] « factoriser (racine évidente, somme et produit, identité, formules) » → Fonctions > Second degré > formes / somme et produit des racines
- [C] « choisir une forme adaptée (équation, inéquation, optimisation, variations) » → Fonctions > Second degré > formes ; Algèbre > Inéquations : second degré
- [C] Démonstration « résolution de l'équation du second degré » → Algèbre > Équations : second degré > discriminant
- [T] Approfondissement « polynôme du troisième degré admettant une racine » → Nombres complexes > Équations polynomiales > degré 3 et factorisation (Expertes)
- [O] Approfondissement « factorisation de xⁿ – 1, xⁿ – aⁿ »
- [C] Approfondissement « deux réels connaissant leur somme et leur produit » → Fonctions > Second degré > somme et produit des racines

### Dérivation

- [P] « taux de variation ; sécantes » → Fonctions > Dérivation : manque **taux de variation**
- [C] « nombre dérivé, limite du taux de variation » → Fonctions > Dérivation > nombre dérivé
- [C] « tangente ; équation y = f(a) + f′(a)(x – a) » → Fonctions > Dérivation > tangente
- [P] « approximation linéaire, f(a + h) ≈ f(a) + f′(a)h » → Fonctions > Dérivation : manque **approximation affine**
- [C] « fonction dérivable, fonction dérivée » ; « dérivées de carré, cube, inverse, racine » ; « xⁿ, n ∈ ℤ » → Fonctions > Dérivation > fonctions dérivées
- [P] « opérations : somme, produit, inverse, quotient » → Fonctions > Dérivation : manque **opérations sur les dérivées**
- [P] « valeur absolue : dérivabilité en 0 » → Fonctions > Dérivation : manque **dérivabilité en un point**
- [C] « interpréter le nombre dérivé (pente, vitesse, coût marginal) » → Fonctions > Dérivation > nombre dérivé
- [C] « nombre dérivé graphiquement ; construire la tangente » → Fonctions > Dérivation > tangente
- [P] « valeur approchée de f(a + h) » → **approximation affine** (même ajout)
- [P] Démonstration « la racine carrée n'est pas dérivable en 0 » → **dérivabilité en un point** (même ajout)
- [C] Démonstrations « équation de la tangente », « dérivées de carré, inverse », « dérivée d'un produit » → Fonctions > Dérivation > tangente / fonctions dérivées
- [P] Algorithme « coefficients directeurs des sécantes » → **taux de variation** (même ajout)

### Variations et courbes représentatives

- [A] « fonctions paires, impaires ; traduction géométrique » → seule Fonctions > Fonctions trigonométriques > parité et périodicité existe ; proposer Fonctions > Généralités sur les fonctions > **parité** (étendre la notion à 1re)
- [C] « sens de variation et signe de la dérivée ; fonctions constantes » → Fonctions > Dérivation > variations
- [C] « nombre dérivé en un extrémum » ; « variations, extrémums » → Fonctions > Dérivation > étude de fonction
- [C] « problème d'optimisation » → Fonctions > Dérivation > optimisation
- [P] « établir une inégalité ; position relative de deux courbes » → Fonctions > Dérivation : manque **position relative de deux courbes**
- [C] « second degré avec la dérivation : variations, extrémum, allure » → Fonctions > Second degré > variations / parabole
- [O] Algorithme « méthode de Newton »

### Fonction exponentielle

- [C] « unique fonction dérivable telle que f′ = f, f(0) = 1 » → Fonctions > Fonction exponentielle > dérivée
- [C] « exp(x + y) = exp(x)exp(y) ; nombre e ; notation eˣ » → Fonctions > Fonction exponentielle > propriétés algébriques
- [C] « signe, sens de variation, courbe ; lien avec les suites géométriques » → Fonctions > Fonction exponentielle > variations / courbe / suites et modélisation
- [C] « transformer une expression » → Fonctions > Fonction exponentielle > propriétés algébriques
- [C] « dérivée de t ↦ e^(at) » → Fonctions > Fonction exponentielle > dérivée
- [C] « représenter t ↦ e^(–kt), e^(kt) » → Fonctions > Fonction exponentielle > courbe
- [C] « modéliser une croissance, une décroissance exponentielle » → Fonctions > Fonction exponentielle > suites et modélisation
- [O] Algorithmes « méthode d'Euler », « valeur approchée de e par (1 + 1/n)ⁿ »
- [C] Approfondissements « unicité », « exp(x + y) », « positivité et croissance » → sous-notions dérivée / propriétés algébriques / variations

### Trigonométrie

- [C] « cercle trigonométrique, longueur d'arc, radian » ; « enroulement de la droite » → Fonctions > Fonctions trigonométriques > cercle et radians
- [C] « cosinus et sinus d'un réel ; lien avec le triangle rectangle ; valeurs remarquables » → Fonctions > Fonctions trigonométriques > cosinus et sinus d'un réel
- [C] « placer un point sur le cercle trigonométrique » → Fonctions > Fonctions trigonométriques > cercle et radians
- [P] « cosinus et sinus d'angles associés à x » → Fonctions > Fonctions trigonométriques : manque **angles associés**
- [C] Démonstration « cos π/4, sin π/4, cos π/3, sin π/3 » → Fonctions > Fonctions trigonométriques > cosinus et sinus d'un réel
- [O] Algorithme « approximation de π par la méthode d'Archimède »

### Calcul vectoriel et produit scalaire

- [C] « produit scalaire par projection et par le cosinus ; orthogonalité » → Géométrie > Produit scalaire > calculer un produit scalaire
- [C] « bilinéarité, symétrie ; en base orthonormée ; norme ; critère d'orthogonalité » → Géométrie > Produit scalaire > propriétés / calculer un produit scalaire
- [C] « ‖u + v‖², ‖u – v‖² ; formule d'Al-Kashi » → Géométrie > Produit scalaire > angles et longueurs
- [C] « transformation de MA·MB » ; démonstration « points M tels que MA·MB = 0 » → Géométrie > Produit scalaire > lieux de points
- [C] « démontrer une orthogonalité, calculer un angle, une longueur » ; démonstration « Al-Kashi » → Géométrie > Produit scalaire > angles et longueurs
- [O] Approfondissements « loi des sinus », « concours des hauteurs », « centre de gravité »

### Géométrie repérée

- [C] « vecteur normal ; équation ax + by + c = 0 » → Géométrie > Géométrie repérée > vecteur normal et équation de droite
- [C] « projeté orthogonal d'un point sur une droite » → Géométrie > Géométrie repérée > projeté orthogonal
- [C] « équation de cercle ; centre et rayon » → Géométrie > Géométrie repérée > équation de cercle
- [T] « utiliser un repère pour étudier une configuration » : transversal
- [O] Approfondissements « points équidistants d'un point et de l'axe », « intersection d'un cercle ou d'une parabole avec une droite »

### Probabilités conditionnelles et indépendance

- [C] « indépendance de deux évènements » → Probabilités > Probabilités conditionnelles > indépendance
- [P] « partition de l'univers ; formule des probabilités totales » → Probabilités > Probabilités conditionnelles : manque **probabilités totales**
- [P] « succession de deux épreuves indépendantes (arbre, tableau) » ; « n ⩽ 4 épreuves de Bernoulli » → Probabilités > Probabilités conditionnelles : manque **épreuves indépendantes successives**
- [O] Algorithme « méthode de Monte-Carlo » ; approfondissements « marches aléatoires »

### Variables aléatoires réelles

- [C] « variable aléatoire ; loi » ; « notations {X = a}, P(X ⩽ a) » → Probabilités > Variables aléatoires > loi d'une variable aléatoire
- [C] « espérance, variance, écart type » → Probabilités > Variables aléatoires > espérance / variance et écart-type
- [P] « linéarité de l'espérance » → Probabilités > Variables aléatoires : manque **linéarité de l'espérance**
- [P] « formule de König-Huygens » → Probabilités > Variables aléatoires : manque **formule de König-Huygens**
- [C] « modéliser par une variable aléatoire ; déterminer la loi » → Probabilités > Variables aléatoires > loi d'une variable aléatoire / compléter une loi
- [C] « espérance dans une résolution de problème (jeu équitable) » → Probabilités > Variables aléatoires > jeux et gains
- [C] Algorithme « espérance, variance, écart type » → Probabilités > Variables aléatoires > espérance
- [O] Algorithme « fréquence des lettres d'un texte » ; approfondissement « x ↦ E((X – x)²) »
- [N] Expérimentations « simuler une variable aléatoire ; moyenne d'un échantillon de taille n ; écart à μ inférieur à 2σ/√n » → Statistiques > Échantillonnage > simulation / fluctuation : ajouter **1re**

### Sens inverse : notions marquées 1re absentes du programme de 1re

- [H] Arithmétique > Divisibilité : le libellé « cycle 3 à Expertes » couvre 1re et Tle, or aucun des programmes de 1re, Tle spé ou Tle comp. n'en parle → écrire « cycle 3 à 2de, Expertes »
- [H] Fonctions > Fonctions trigonométriques > équations / inéquations / parité et périodicité / dérivées et variations : programme de Tle seulement (la 1re s'arrête au cercle, à cos et sin d'un réel)
- [T] Fonctions > Fonction exponentielle > équations et inéquations : non nommé en 1re (nommé en Tle), légitime par stricte monotonie
- [T] Suites > Limites de suites > opérations / formes indéterminées / comparaison et encadrement / convergence monotone : Tle ; la 1re n'a qu'une approche intuitive (la notion porte « 1re, Tle », cohérent)
- [T] Algèbre > Inégalités (2de à Tle) : en 1re, via les variations (« exploiter les variations pour établir une inégalité »)
- [T] Ensembles > Opérations sur les ensembles > différence : même remarque qu'en 2de

## Tle spé — programme de spécialité de terminale

### Vocabulaire ensembliste et logique

- [C] « couple, triplet, n-uplet, produit cartésien ; Card(A) » → Ensembles > Cardinal et produit cartésien ; Dénombrement > Principes de dénombrement > k-uplets
- [N] « élément, sous-ensemble, réunion, intersection, complémentaire » → Ensembles > Opérations sur les ensembles (2de, 1re) : ajouter **Tle**
- [O] « notion de bijection » (rencontrée en situation, pas de notion proposée)
- [C] « composition de deux fonctions » → Fonctions > Dérivation > fonctions composées
- [T] « symbole de somme ∑ » : notation, manipulation non exigée
- [N] « connecteurs, négation avec un ou deux quantificateurs, contre-exemple » → Logique > Connecteurs et contre-exemples ; Quantificateurs et négation (2de, 1re) : ajouter **Tle**
- [N] « implication, équivalence, réciproque, contraposée » → Logique > Implication et équivalence (2de, 1re) : ajouter **Tle**
- [N] « raisonner par disjonction des cas, par l'absurde, par contraposée » → Logique > Raisonnements (2de, 1re) : ajouter **Tle**
- [P] « raisonner par équivalence, utiliser une propriété caractéristique » → Logique > Raisonnements : manque **par équivalence**
- [P] « distinguer condition nécessaire et condition suffisante » → **condition nécessaire, condition suffisante** (même ajout qu'en 1re, avec Tle)
- [C] « démontrer une propriété par récurrence » → Suites > Raisonnement par récurrence > structure d'une récurrence

### Algorithmique et programmation

- [N] « générer une liste ; manipuler éléments et indices ; parcourir ; itérer » (capacités attendues) → Algorithmique > Listes (1re) : ajouter **Tle**

### Combinatoire et dénombrement

- [C] « principe additif » ; « principe multiplicatif ; nombre de k-uplets » → Dénombrement > Principes de dénombrement > principes additif et multiplicatif / k-uplets
- [C] « nombre des parties ; mots, chemins, épreuves de Bernoulli » → Dénombrement > Principes de dénombrement > parties d'un ensemble
- [C] « k-uplets d'éléments distincts ; n! ; permutations » → Dénombrement > Arrangements et permutations > arrangements / factorielle / permutations
- [C] « combinaisons ; mots ou chemins » → Dénombrement > Combinaisons > combinaisons
- [C] « formules de (n k) » → Dénombrement > Combinaisons > coefficients binomiaux
- [C] « k = 0, 1, 2 ; symétrie ; relation et triangle de Pascal » → Dénombrement > Combinaisons > triangle de Pascal
- [C] « représentation adaptée, reconnaître les objets » ; « dénombrements dans divers domaines » → Dénombrement > Problèmes de dénombrement > reconnaître le modèle / dénombrer avec contraintes
- [C] Démonstrations « ∑ (n k) = 2ⁿ », « relation de Pascal » → Dénombrement > Combinaisons > triangle de Pascal ; Principes de dénombrement > parties d'un ensemble
- [C] Algorithmes « coefficients par Pascal », « permutations », « parties à 2, 3 éléments » → Dénombrement > Problèmes de dénombrement > algorithmique
- [O] Approfondissement « combinaisons avec répétitions »

### Vecteurs, droites et plans de l'espace

- [C] « vecteurs de l'espace, translations » → Géométrie > Espace : sans coordonnées > vecteurs de l'espace
- [C] « combinaisons linéaires » ; « décomposition sur une base » → Géométrie > Espace : sans coordonnées > coplanarité et décomposition
- [C] « droites, vecteurs directeurs, colinéaires ; droite par un point et un vecteur » → Géométrie > Espace : sans coordonnées > colinéarité et alignement
- [C] « plans, direction ; plan par un point et deux vecteurs » → Géométrie > Espace : sans coordonnées > coplanarité et décomposition
- [C] « bases et repères » → Géométrie > Espace : avec coordonnées > coordonnées dans l'espace
- [C] « position relative de deux droites, droite et plan, deux plans » → Géométrie > Espace : sans coordonnées > positions relatives de droites et plans
- [C] « lire si des vecteurs forment une base ; décomposition » ; « alignement, colinéarité, parallélisme, coplanarité » → Géométrie > Espace : sans coordonnées > coplanarité et décomposition / colinéarité et alignement
- [O] Approfondissements « barycentre », « fonction vectorielle de Leibniz »

### Orthogonalité et distances dans l'espace

- [C] « produit scalaire dans l'espace ; bilinéarité, symétrie ; orthogonalité de deux vecteurs » → Géométrie > Orthogonalité : sans coordonnées > produit scalaire dans l'espace
- [C] « base orthonormée, repère orthonormé ; coordonnées » → Géométrie > Espace : avec coordonnées > coordonnées dans l'espace
- [C] « expressions du produit scalaire et de la norme ; distance entre deux points » → Géométrie > Orthogonalité : avec coordonnées > norme et distance
- [C] « ‖u + v‖², formules de polarisation » → Géométrie > Orthogonalité : sans coordonnées > produit scalaire dans l'espace
- [C] « orthogonalité de deux droites, d'un plan et d'une droite » ; « plans perpendiculaires » → Géométrie > Orthogonalité : sans coordonnées > orthogonalité de droites et plans
- [C] « vecteur normal à un plan ; plan passant par A normal à n » → Géométrie > Orthogonalité : avec coordonnées > vecteur normal à un plan
- [C] « projeté orthogonal sur une droite, sur un plan » ; « distance d'un point à une droite, un plan » → Géométrie > Orthogonalité : sans coordonnées > projeté orthogonal
- [C] « calculer un angle, une longueur dans l'espace » → Géométrie > Orthogonalité : sans coordonnées > angles
- [P] « problèmes impliquant longueur, angle, aire, volume » → Grandeurs et mesures > Volumes : **volumes des solides usuels** (même ajout qu'en 2de, avec Tle)
- [T] « lieux géométriques simples, plan médiateur » : application du vecteur normal
- [C] Démonstration « le projeté orthogonal est le point du plan le plus proche » → Géométrie > Orthogonalité : sans coordonnées > projeté orthogonal
- [C] Approfondissements « sphère » → Géométrie > Orthogonalité : avec coordonnées > sphère
- [O] Approfondissement « fonction scalaire de Leibniz »

### Représentations paramétriques et équations cartésiennes

- [C] « représentation paramétrique d'une droite » → Géométrie > Espace : avec coordonnées > représentation paramétrique d'une droite
- [C] « équation cartésienne d'un plan ; vecteur normal » ; démonstration associée → Géométrie > Orthogonalité : avec coordonnées > équation cartésienne d'un plan
- [P] « coordonnées du projeté orthogonal d'un point sur un plan, sur une droite » → Géométrie > Orthogonalité : avec coordonnées : manque **coordonnées du projeté orthogonal**
- [C] « traduire par un système linéaire ; base, coordonnées, intersections, orthogonalité » → Géométrie > Espace : avec coordonnées > intersections / positions relatives par le calcul
- [C] Approfondissements « intersection de deux plans », « sphère et droite » → Géométrie > Espace : avec coordonnées > intersections ; Orthogonalité : avec coordonnées > sphère
- [O] Approfondissement « vecteur orthogonal à deux vecteurs non colinéaires »

### Suites

- [C] « uₙ tend vers +∞ (définition) ; croissantes non majorées ; vers –∞ » ; « converge vers ℓ » → Suites > Limites de suites > définition
- [C] « limites et comparaison ; théorème des gendarmes » → Suites > Limites de suites > comparaison et encadrement
- [C] « opérations sur les limites » → Suites > Limites de suites > opérations / formes indéterminées
- [C] « comportement de (qⁿ) » → Suites > Limites de suites > suites géométriques
- [C] « croissante majorée converge » → Suites > Limites de suites > convergence monotone / suites majorées, minorées
- [C] « raisonner par récurrence » ; démonstration « inégalité de Bernoulli » → Suites > Raisonnement par récurrence > structure d'une récurrence
- [C] « phénomènes d'évolution modélisables par une suite » → Suites > Suites et modélisation
- [C] Démonstrations « croissante non majorée », « minorée par une suite divergente » → Suites > Limites de suites > convergence monotone / comparaison et encadrement
- [N] Démonstration « limite en ±∞ de la fonction exponentielle » → Fonctions > Fonction exponentielle (1re) : ajouter **Tle**
- [C] Algorithmes « recherche de seuils ; valeurs approchées de π, e, √2… » → Suites > Suites et modélisation > seuil / algorithmes
- [O] Approfondissements « suites adjacentes », « récurrence linéaire d'ordre 2 », « Newton, Héron »

### Limites des fonctions

- [C] « limite finie ou infinie en ±∞, en un point ; asymptote parallèle à un axe » → Fonctions > Limites de fonctions > limite en un point / asymptotes
- [C] « limites des fonctions de référence » → Fonctions > Limites de fonctions > opérations
- [P] « limites et comparaison » ; « majorations, minorations, encadrements » → Fonctions > Limites de fonctions : manque **comparaison et encadrement**
- [C] « opérations sur les limites » → Fonctions > Limites de fonctions > opérations
- [C] « croissances comparées ; factorisation du terme prépondérant » → Fonctions > Limites de fonctions > croissances comparées / formes indéterminées
- [C] « lien asymptote / limite » → Fonctions > Limites de fonctions > asymptotes
- [C] Démonstration « croissance comparée de xⁿ et exp » → Fonctions > Limites de fonctions > croissances comparées
- [O] Approfondissement « asymptotes obliques, branches infinies »

### Compléments sur la dérivation, convexité

- [C] « composée v ∘ u ; (v ∘ u)′ = (v′ ∘ u) × u′ » → Fonctions > Dérivation > fonctions composées
- [C] « dérivée seconde » → Fonctions > Convexité > dérivée seconde
- [C] « fonction convexe ; position / tangentes, croissance de f′, positivité de f″ » → Fonctions > Convexité > caractérisations
- [C] « point d'inflexion » → Fonctions > Convexité > point d'inflexion
- [C] « dérivée avec composition » ; « dérivée, limites, variations d'une fonction » → Fonctions > Dérivation > fonctions composées / étude de fonction
- [C] « inégalités par convexité » ; démonstration « f″ ⩾ 0 ⇒ courbe au-dessus des tangentes » → Fonctions > Convexité > inégalités de convexité
- [C] « allure de la courbe depuis les tableaux de f, f′, f″ » ; « lire convexité et inflexion » → Fonctions > Convexité > lecture graphique
- [O] Approfondissements « courbe de Lorenz », « dérivée n-ième », « inégalité arithmético-géométrique »

### Continuité

- [P] « fonction continue en un point, sur un intervalle ; dérivable ⇒ continue » → Fonctions > Continuité : manque **continuité en un point** (seule la lecture graphique existe)
- [C] « image d'une suite convergente par une fonction continue » ; « suite uₙ₊₁ = f(uₙ) » → Suites > Suites récurrentes > point fixe
- [C] « théorème des valeurs intermédiaires ; strictement monotone » → Fonctions > Continuité > valeurs intermédiaires
- [C] « solutions de f(x) = k : existence, unicité » → Fonctions > Continuité > valeurs intermédiaires
- [P] « … encadrement » ; algorithmes « dichotomie », « Newton, sécante » → Fonctions > Continuité : manque **encadrement d'une solution**
- [O] Approfondissements « démonstration du TVI par dichotomie », « f(x + y) = f(x) + f(y) », « prolongement par continuité »

### Fonction logarithme

- [C] « ln, réciproque de l'exponentielle » → Fonctions > Logarithme népérien > réciproque de l'exponentielle
- [C] « propriétés algébriques » ; « équation fonctionnelle pour transformer, résoudre une équation, une inéquation » → Fonctions > Logarithme népérien > propriétés algébriques / équations et inéquations
- [C] « dérivée, variations » ; démonstration « dérivée de ln » → Fonctions > Logarithme népérien > dérivée
- [P] « limites en 0 et en +∞ ; courbe ; lien avec la courbe de exp » → Fonctions > Logarithme népérien > courbe : manque **limites**
- [C] « croissance comparée de ln et xⁿ » ; démonstration « limite en 0 de x ln x » → Fonctions > Limites de fonctions > croissances comparées
- [N] « utiliser l'équation fonctionnelle de l'exponentielle … résoudre une équation, une inéquation » → Fonctions > Fonction exponentielle > équations et inéquations : ajouter **Tle** (même ajout)
- [O] Algorithme « Briggs » ; approfondissements « x ↦ xᵃ », « limite de (1 + x/n)ⁿ »

### Fonctions sinus et cosinus

- [C] « sinus et cosinus ; parité, périodicité ; courbes » → Fonctions > Fonctions trigonométriques > parité et périodicité
- [C] « dérivées, variations » ; « étudier une fonction trigonométrique (variations, optimum) » → Fonctions > Fonctions trigonométriques > dérivées et variations
- [C] « lier courbes et cercle trigonométrique » → Fonctions > Fonctions trigonométriques > cosinus et sinus d'un réel
- [C] « cos(x) = a, cos(x) ⩽ a sur [–π, π] » → Fonctions > Fonctions trigonométriques > équations / inéquations
- [O] Approfondissement « fonction tangente »

### Primitives, équations différentielles

- [C] « y′ = f ; primitive ; deux primitives diffèrent d'une constante » ; démonstration associée → Équations différentielles > y′ = f > primitives : notion
- [C] « primitives des fonctions de référence (xⁿ, 1/√x, exp, sin, cos) » → Équations différentielles > y′ = f > primitives des fonctions de référence / sinus et cosinus
- [C] « primitives des formes (v′ ∘ u) × u′ » → Équations différentielles > y′ = f > forme (v′∘u)×u′
- [C] « y′ = ay ; allure des courbes » ; démonstration « résolution de y′ = ay » → Équations différentielles > y′ = ay > solution générale ; Généralités > allure des courbes
- [C] « y′ = ay + b : solution constante, puis toutes les solutions » → Équations différentielles > y′ = ay + b > solution générale
- [C] « y′ = ay + f : depuis une solution particulière » → Équations différentielles > y′ = ay + f > solution particulière donnée / solution générale
- [P] Algorithme « méthode d'Euler pour y′ = f, y′ = ay + b » → Équations différentielles > Généralités : manque **méthode d'Euler**
- [O] Approfondissement « équation logistique » ; exemples « y′ = y², y″ + ω²y = 0 » (non exigibles)

### Calcul intégral

- [C] « intégrale d'une fonction continue positive, aire sous la courbe » → Intégration > Intégrale et aire > aire algébrique
- [C] « F_a(x) = ∫ₐˣ f(t) dt primitive qui s'annule en a » ; démonstration associée → Intégration > Fonction intégrale > dérivée d'une fonction intégrale
- [C] « ∫ = F(b) – F(a) ; notation [F(x)] » → Intégration > Calcul d'intégrales > par une primitive
- [C] « toute fonction continue admet des primitives » → Équations différentielles > y′ = f > primitives : notion
- [C] « intégrale d'une fonction de signe quelconque » → Intégration > Intégrale et aire > aire algébrique
- [C] « linéarité ; relation de Chasles » → Intégration > Calcul d'intégrales > linéarité / relation de Chasles
- [P] « positivité et intégration des inégalités » ; « majorer une intégrale » → Intégration > Calcul d'intégrales : manque **positivité et inégalités**
- [C] « valeur moyenne » ; « estimer, encadrer une valeur moyenne » ; « interpréter » → Intégration > Valeur moyenne > calcul / encadrement / interprétation
- [C] « intégration par parties » ; démonstration associée → Intégration > Calcul d'intégrales > intégration par parties
- [C] « estimer graphiquement ou encadrer une intégrale » → Intégration > Intégrale et aire > lecture graphique
- [C] « aire entre deux courbes » → Intégration > Intégrale et aire > aire entre deux courbes
- [A] « étudier une suite d'intégrales » → proposer Intégration > Calcul d'intégrales > **suites d'intégrales**
- [C] Algorithmes « méthodes des rectangles, des milieux, des trapèzes » → Intégration > Calcul d'intégrales > méthode des rectangles
- [O] Algorithmes « Monte-Carlo », « Brouncker » ; approfondissements « suites adjacentes », « encadrement de Hₙ »

### Succession d'épreuves indépendantes, schéma de Bernoulli

- [P] « succession d'épreuves indépendantes ; produit des probabilités ; arbre » → **épreuves indépendantes successives** (même ajout qu'en 1re, avec Tle)
- [P] « épreuve de Bernoulli, loi de Bernoulli » → Probabilités > Loi binomiale > schéma de Bernoulli : manque **loi de Bernoulli**
- [C] « schéma de Bernoulli » → Probabilités > Loi binomiale > schéma de Bernoulli
- [C] « loi binomiale ; coefficients binomiaux » → Probabilités > Loi binomiale > coefficients binomiaux / calcul de probabilités
- [N] « calculer une probabilité avec indépendance, probabilités conditionnelles, probabilités totales » → Probabilités > Probabilités conditionnelles (2de, 1re) : ajouter **Tle**
- [C] « modéliser par un schéma de Bernoulli, une loi binomiale » → Probabilités > Loi binomiale > reconnaître une loi
- [C] « problème de seuil, de comparaison, d'optimisation » ; « P(X = k), P(X ⩽ k), P(k ⩽ X ⩽ k′) » → Probabilités > Loi binomiale > calcul de probabilités
- [P] « intervalle I tel que P(X ∈ I) ⩽ α ou ⩾ 1 – α » ; algorithme « surréservation » → Probabilités > Loi binomiale : manque **intervalle de fluctuation**
- [C] Démonstration « probabilité de k succès » → Probabilités > Loi binomiale > calcul de probabilités
- [C] Algorithme « simulation d'un échantillon » → Probabilités > Sommes et concentration > échantillons
- [T] Approfondissement « loi géométrique » → Probabilités > Autres lois > loi géométrique (Tle comp.) : pas d'ajout de niveau
- [O] Algorithme « planche de Galton » ; approfondissement « loi de Poisson »

### Sommes de variables aléatoires

- [C] « somme de deux variables ; E(X + Y), E(aX) » → Probabilités > Sommes et concentration > espérance et variance d'une somme
- [C] « V(X + Y) = V(X) + V(Y) pour indépendantes ; V(aX) » → Probabilités > Sommes et concentration > espérance et variance d'une somme
- [C] « espérance, variance de la loi binomiale » ; démonstration associée → Probabilités > Loi binomiale > espérance et variance
- [C] « échantillon de taille n ; Sₙ et Mₙ » → Probabilités > Sommes et concentration > échantillons
- [C] « représenter une variable comme somme ; calculer espérance et variance » → Probabilités > Sommes et concentration > espérance et variance d'une somme
- [O] Approfondissement « E(XY) = E(X)E(Y) »

### Concentration, loi des grands nombres

- [C] « inégalité de Bienaymé-Tchebychev » → Probabilités > Sommes et concentration > Bienaymé-Tchebychev
- [C] « inégalité de concentration » ; « taille d'échantillon selon précision et risque » → Probabilités > Sommes et concentration > inégalité de concentration
- [P] « loi des grands nombres » → Probabilités > Sommes et concentration : manque **loi des grands nombres**
- [O] Algorithmes « comparer avec Bienaymé-Tchebychev », « marche aléatoire », « N échantillons » ; approfondissements « estimation », « marche aléatoire »

### Sens inverse : notions marquées Tle absentes du programme de Tle spé

- [H] Arithmétique > Divisibilité (« cycle 3 à Expertes ») : absente de la Tle spé (voir 1re)
- [H] Géométrie > Orthogonalité : avec coordonnées > sphère : seulement en approfondissement possible, pas attendu
- [T] Suites > Suites arithmético-géométriques : non nommées en Tle spé (contenu de Tle comp.) ; application classique de la récurrence et des limites
- [T] Algèbre > Inégalités (2de à Tle) : via convexité, intégration des inégalités, encadrements
- [T] Fonctions > Dérivation > nombre dérivé / tangente ; Fonctions trigonométriques > cercle et radians : rappels de 1re
- [T] Ensembles > Cardinal et produit cartésien : au programme (vocabulaire ensembliste et dénombrement)

## Expertes — option mathématiques expertes

### Nombres complexes : point de vue algébrique

- [C] « ensemble ℂ ; partie réelle, partie imaginaire ; opérations » → Nombres complexes > Forme algébrique > calculs
- [C] « conjugaison ; propriétés algébriques » ; démonstration « conjugué d'un produit, d'un inverse, d'une puissance » → Nombres complexes > Forme algébrique > conjugaison
- [C] « inverse d'un complexe non nul » → Nombres complexes > Forme algébrique > inverse et quotient
- [A] « formule du binôme dans ℂ » ; démonstration associée → proposer Nombres complexes > Forme algébrique > **formule du binôme**
- [C] « calculs algébriques » → Nombres complexes > Forme algébrique > calculs
- [C] « az = b » ; « équation faisant intervenir z et z̄ » → Nombres complexes > Forme algébrique > équations

### Nombres complexes : point de vue géométrique

- [C] « image d'un complexe, du conjugué ; affixe d'un point, d'un vecteur » ; « représenter, déterminer l'affixe » → Nombres complexes > Interprétation géométrique > affixes et distances
- [C] « module ; interprétation » ; « |z|² = z z̄ ; module d'un produit, d'un inverse » ; démonstrations associées → Nombres complexes > Module et argument > module
- [C] « ensemble 𝕌 des complexes de module 1 » → Nombres complexes > Interprétation géométrique > racines de l'unité
- [C] « arguments ; interprétation » → Nombres complexes > Module et argument > argument
- [C] « forme trigonométrique » ; « déterminer module et arguments » → Nombres complexes > Formes trigo. et exponentielle > forme trigonométrique
- [O] Problèmes « zₙ₊₁ = azₙ + b », « inégalité triangulaire », « Mandelbrot, Julia »

### Nombres complexes et trigonométrie

- [A] « formules d'addition et de duplication à partir du produit scalaire » ; démonstration « une des formules d'addition » → proposer Nombres complexes > Formes trigo. et exponentielle > **formules d'addition et de duplication**
- [C] « exponentielle imaginaire ; forme exponentielle » ; « passer d'une forme à l'autre » → Nombres complexes > Formes trigo. et exponentielle > forme exponentielle
- [C] « formules d'Euler » → Nombres complexes > Formes trigo. et exponentielle > formules d'Euler
- [C] « formule de Moivre » ; « calculer des puissances » → Nombres complexes > Formes trigo. et exponentielle > formule de Moivre
- [C] « transformer des expressions trigonométriques (Euler, Moivre) » → Nombres complexes > Formes trigo. et exponentielle > formules d'Euler / formule de Moivre

### Équations polynomiales

- [C] « solutions complexes d'une équation du second degré à coefficients réels » → Nombres complexes > Équations polynomiales > second degré
- [C] « factorisation de zⁿ – aⁿ par z – a » ; « P(a) = 0 ⇒ factorisation par z – a » ; démonstrations → Nombres complexes > Équations polynomiales > degré 3 et factorisation
- [C] « au plus n racines » ; démonstration associée → Nombres complexes > Équations polynomiales > racines d'un polynôme
- [C] « équation de degré 3 dont une racine est connue » ; « factoriser » → Nombres complexes > Équations polynomiales > degré 3 et factorisation
- [O] Problèmes « racines carrées d'un complexe », « formules de Viète », « résolution par radicaux du degré 3 »

### Utilisation des nombres complexes en géométrie

- [C] « module et argument de (c – a)/(b – a) » → Nombres complexes > Interprétation géométrique > angles et quotient
- [C] « racines n-ièmes de l'unité ; 𝕌ₙ ; n = 2, 3, 4 » ; démonstration associée → Nombres complexes > Interprétation géométrique > racines de l'unité
- [C] « alignement, orthogonalité, longueurs, angles, ensembles de points » → Nombres complexes > Interprétation géométrique > alignement et orthogonalité / ensembles de points
- [C] « racines de l'unité et polygones réguliers » → Nombres complexes > Interprétation géométrique > racines de l'unité
- [O] Problèmes « cos(2π/5), pentagone », « somme des racines n-ièmes », « racines n-ièmes d'un complexe », « Fourier discrète »

### Arithmétique

- [C] « divisibilité dans ℤ » ; « diviseurs d'un entier » → Arithmétique > Divisibilité > multiples et diviseurs
- [C] « division euclidienne dans ℤ » → Arithmétique > Divisibilité > division euclidienne
- [C] « congruences ; compatibilité avec les opérations » → Arithmétique > Congruences > congruences
- [C] « PGCD ; algorithme d'Euclide » ; algorithme associé → Arithmétique > PGCD, Bézout et Gauss > PGCD
- [P] « couples d'entiers premiers entre eux » → Arithmétique > PGCD, Bézout et Gauss : manque **nombres premiers entre eux**
- [C] « théorème de Bézout » ; « théorème de Gauss » ; démonstrations (PGCD = ax + by, Gauss) → Arithmétique > PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss
- [C] « nombres premiers » ; « étudier la primalité » ; algorithme « crible d'Ératosthène » → Arithmétique > Nombres premiers > reconnaître un nombre premier
- [P] « leur ensemble est infini » ; démonstration associée → Arithmétique > Nombres premiers : manque **infinité des nombres premiers**
- [C] « décomposition en facteurs premiers » ; algorithme associé → Arithmétique > Nombres premiers > décomposition en facteurs premiers
- [A] « petit théorème de Fermat » → proposer Arithmétique > Congruences > **petit théorème de Fermat**
- [P] « résoudre ax ≡ b [n] ; inverse de a modulo n » → Arithmétique > Congruences : manque **équation ax ≡ b [n], inverse modulo n**
- [C] « tests de divisibilité » → Arithmétique > Divisibilité > critères de divisibilité
- [C] « problèmes de chiffrement » → Arithmétique > Congruences > chiffrement
- [C] « équations diophantiennes simples » → Arithmétique > PGCD, Bézout et Gauss > équations diophantiennes
- [O] Problèmes « lemme chinois », « codes (ISBN, RIB, Insee) », « Carmichael », « Mersenne, Fermat », « codes correcteurs », « triplets pythagoriciens », « sommes de deux carrés », « Pell-Fermat », « racines rationnelles d'un polynôme »
- [C] Problèmes « chiffrement affine, Vigenère, Hill, RSA » → Arithmétique > Congruences > chiffrement

### Graphes et matrices

- [C] « graphe, sommets, arêtes ; graphe complet » → Graphes > Vocabulaire des graphes > sommets, arêtes, degré
- [C] « sommets adjacents, degré, ordre » → Graphes > Vocabulaire des graphes > sommets, arêtes, degré
- [C] « chaîne, longueur d'une chaîne, graphe connexe » → Graphes > Chaînes et connexité > chaînes et cycles / connexité
- [C] « matrice ; carrée, colonne, ligne ; opérations ; inverse, puissances » → Matrices > Calcul matriciel > opérations / produit / inverse / puissances de matrices
- [C] « matrice d'adjacence d'un graphe » → Graphes > Matrice d'adjacence > matrice d'adjacence
- [C] « transformations géométriques du plan » → Matrices > Transformations du plan > matrice d'une transformation
- [C] « systèmes linéaires » ; « résoudre un système linéaire » → Matrices > Systèmes linéaires > écriture matricielle / résolution
- [C] « suites récurrentes ; Uₙ₊₁ = AUₙ + C » ; « étudier une suite récurrente linéaire » → Matrices > Suites et matrices > suites couplées
- [C] « puissances de matrices d'ordre 2 ou 3 » → Matrices > Calcul matriciel > puissances de matrices
- [C] « graphe orienté pondéré associé à une chaîne de Markov » → Graphes > Chaînes de Markov > graphe probabiliste
- [C] « chaîne de Markov à 2 ou 3 états ; distribution initiale π₀ ; matrice de transition » → Graphes > Chaînes de Markov > matrice de transition
- [P] « coefficient (i, j) de Pⁿ ; distribution π₀Pⁿ après n transitions » ; démonstration associée → Graphes > Chaînes de Markov : manque **distribution après n transitions**
- [C] « distributions invariantes » → Graphes > Chaînes de Markov > état stable
- [C] « modéliser par un graphe » ; « par une matrice » → Graphes > Vocabulaire des graphes > modélisation par un graphe ; Matrices > Suites et matrices > modélisation
- [C] « nombre de chemins de longueur donnée » ; démonstration associée → Graphes > Matrice d'adjacence > nombre de chaînes de longueur n
- [O] Problèmes « graphes eulériens », « interpolation polynomiale », « marche aléatoire sur un graphe », « Ehrenfest », « proie-prédateur », « PageRank »

### Sens inverse : notions marquées Expertes absentes du programme d'Expertes

- [H] Graphes > Chaînes et connexité > chaînes et cycles : « cycle » n'est pas au programme (seulement via le problème possible des graphes eulériens)
- [T] Arithmétique > Nombres premiers (« 3e, Expertes ») et Divisibilité > critères de divisibilité : au programme (« tests de divisibilité »)
- [T] Graphes > Vocabulaire des graphes > graphe orienté : au programme via les chaînes de Markov

## Tle comp. — option mathématiques complémentaires

### Vocabulaire ensembliste et logique

- [T] « ensembles, intervalles ; n-uplet, produit cartésien ; Card(A) » → Ensembles (2de, 1re, Tle) : transversal (ajout « Tle comp. » facultatif, D1)
- [T] « connecteurs, contre-exemple, implication, réciproque, quantification » → Logique (2de, 1re) : transversal (ajout « Tle comp. » facultatif, D1)
- [T] « symbole de somme ∑ » : notation

### Thèmes d'étude (contenus associés et exemples d'algorithme)

- [C] « continuité, théorème des valeurs intermédiaires » ; « fonction dérivée, sens de variation, extrémums » ; « convexité » → Fonctions > Continuité ; Dérivation ; Convexité (Tle comp.)
- [P] Algorithmes « résolution d'équations par balayage, par dichotomie » → Fonctions > Continuité : **encadrement d'une solution** (même ajout, avec Tle comp.)
- [C] « suites récurrentes » ; « suites arithmético-géométriques ; y′ = ay + b » ; « limites » → Suites > Suites récurrentes ; Suites arithmético-géométriques ; Équations différentielles > y′ = ay + b
- [N] « suites géométriques. Fonction exponentielle » → Suites > Suites géométriques (1re) et Fonctions > Fonction exponentielle (1re) : ajouter **Tle comp.**
- [N] « suites arithmétiques, suites géométriques » (approche historique du logarithme) → Suites > Suites arithmétiques (1re) : ajouter **Tle comp.**
- [P] Algorithme « méthode d'Euler » → Équations différentielles > Généralités : **méthode d'Euler** (même ajout, avec Tle comp.)
- [C] Algorithmes « calcul des termes », « recherche de seuils » → Suites > Suites et modélisation > seuil / algorithmes
- [O] Algorithmes « Briggs », « Brouncker »
- [P] « statistique descriptive : médiane, quartiles, déciles, rapport interdécile » → Statistiques > Indicateurs (5e à 2de) : manque **déciles et rapport interdécile**, niveau **Tle comp.** à ajouter
- [N] « probabilités conditionnelles, inversion du conditionnement, formule de Bayes » → Probabilités > Probabilités conditionnelles : ajouter **Tle comp.** ; sous-notion **inversion du conditionnement** (même ajout)
- [C] « épreuve et loi de Bernoulli ; schéma de Bernoulli et loi binomiale ; lois uniformes » → Probabilités > Loi binomiale ; Autres lois
- [C] « lois à densité ; loi géométrique, loi exponentielle » → Probabilités > Autres lois
- [P] « absence de mémoire, discrète ou continue » → Probabilités > Autres lois : manque **absence de mémoire**
- [T] « minimum d'une fonction trinôme » → Fonctions > Second degré (1re) : réinvestissement
- [O] Problèmes « courbe de Lorenz, indice de Gini », « tests de dépistage », « sondages, tests d'hypothèse » (pas de notion proposée)

### Suites numériques, modèles discrets

- [C] « approche intuitive de la limite, opérations, passage à la limite dans les inégalités, gendarmes » → Suites > Limites de suites > définition / opérations / comparaison et encadrement
- [C] « limite d'une suite géométrique de raison positive » → Suites > Limites de suites > suites géométriques
- [P] « limite de la somme des termes d'une suite géométrique (0 < q < 1) » ; démonstration associée → Suites > Limites de suites : manque **somme des termes d'une suite géométrique**
- [C] « suites arithmético-géométriques » ; « solution constante, puis toutes les solutions » → Suites > Suites arithmético-géométriques > solution constante / suite auxiliaire
- [C] « modéliser par une suite explicite ou récurrente » → Suites > Suites et modélisation
- [C] « représenter uₙ₊₁ = f(uₙ) ; conjecturer le comportement » → Suites > Suites récurrentes > escalier / point fixe
- [C] Algorithmes « seuils », « termes successifs » → Suites > Suites et modélisation > seuil / algorithmes
- [O] Algorithme « valeurs approchées de π, ln 2, √2 »

### Fonctions : continuité, dérivabilité, limites

- [C] « notion de limite ; continuité ; asymptotes horizontales ou verticales » → Fonctions > Limites de fonctions > limite en un point / asymptotes
- [C] « limites des fonctions de référence » → Fonctions > Limites de fonctions > opérations
- [C] « théorème des valeurs intermédiaires ; strictement monotones » → Fonctions > Continuité > valeurs intermédiaires
- [A] « réciproque d'une fonction continue strictement monotone, représentation graphique » → proposer Fonctions > Continuité > **fonction réciproque** (Tle comp. ; la Tle spé l'exclut hors exponentielle)
- [C] « ln réciproque de exp ; équation fonctionnelle ; dérivée » → Fonctions > Logarithme népérien > réciproque de l'exponentielle / propriétés algébriques / dérivée
- [P] « ln : limites, représentation graphique » → Fonctions > Logarithme népérien : **limites** (même ajout)
- [C] « dérivée de f(ax + b), e^u, ln u, u² » ; démonstration « dérivée de ln u, exp u » → Fonctions > Dérivation > fonctions composées
- [C] « dérivée, limites, tableau de variation » → Fonctions > Dérivation > étude de fonction
- [N] « allure des courbes inverse, carré, cube, racine carrée, exponentielle, logarithme » → Fonctions > Fonction exponentielle : **Tle comp.** (même ajout) ; fonctions de 2de : réinvestissement
- [C] « nombre de solutions de f(x) = k par le tableau de variation ; inéquation f(x) ⩽ k » → Fonctions > Continuité > valeurs intermédiaires
- [P] « valeurs approchées, encadrement d'une solution » ; algorithmes « balayage, dichotomie, Newton » → **encadrement d'une solution** (même ajout)
- [C] « équation fonctionnelle de exp ou ln pour résoudre » → Fonctions > Logarithme népérien > équations et inéquations
- [C] « ln qⁿ = n ln q pour un seuil » → Suites > Suites et modélisation > seuil
- [C] Démonstrations « ln(ab), ln(1/a) », « dérivée de ln » → Fonctions > Logarithme népérien > propriétés algébriques / dérivée

### Primitives et équations différentielles

- [C] « notion de solution » ; « vérifier qu'une fonction est solution » → Équations différentielles > Généralités > notion de solution
- [C] « primitive ; y′ = f ; deux primitives diffèrent d'une constante » → Équations différentielles > y′ = f > primitives : notion
- [C] « primitives : dérivée d'une fonction de référence, 2uu′, e^u u′, u′/u » → Équations différentielles > y′ = f > primitives des fonctions de référence / formes u′eᵘ, 2uu′, u′/u
- [C] « y′ = ay » ; « y′ = ay + b : solution constante, solution générale ; allure » → Équations différentielles > y′ = ay ; y′ = ay + b ; Généralités > allure des courbes
- [P] Algorithme « résolution approchée par la méthode d'Euler » → **méthode d'Euler** (même ajout)

### Fonctions convexes

- [C] « dérivée seconde » → Fonctions > Convexité > dérivée seconde
- [C] « convexe : sécantes, tangentes ; croissance de f′, positivité de f″ » ; « étudier la convexité » → Fonctions > Convexité > caractérisations
- [C] « point d'inflexion » ; « reconnaître graphiquement convexe, concave, inflexion » → Fonctions > Convexité > point d'inflexion / lecture graphique

### Intégration

- [C] « intégrale d'une fonction continue positive, aire » → Intégration > Intégrale et aire > aire algébrique
- [C] « relation de Chasles » → Intégration > Calcul d'intégrales > relation de Chasles
- [C] « valeur moyenne ; comprise entre les bornes » ; « estimer, calculer, interpréter » → Intégration > Valeur moyenne > calcul / encadrement / interprétation
- [C] « méthode des rectangles » ; algorithmes « rectangles, trapèzes » → Intégration > Calcul d'intégrales > méthode des rectangles
- [C] « intégrale de signe quelconque » → Intégration > Intégrale et aire > aire algébrique
- [C] « F(x) = ∫ₐˣ f(t) dt dérivable de dérivée f » ; démonstration associée → Intégration > Fonction intégrale > dérivée d'une fonction intégrale
- [C] « ∫ = F(b) – F(a) » → Intégration > Calcul d'intégrales > par une primitive
- [C] « aire sous une courbe ou entre deux courbes » → Intégration > Intégrale et aire > aire entre deux courbes
- [O] Algorithme « Monte-Carlo pour un calcul d'aire »

### Lois discrètes

- [C] « loi uniforme sur {1, …, n} ; espérance » → Probabilités > Autres lois > loi uniforme discrète / espérance
- [P] « épreuve de Bernoulli ; loi de Bernoulli : définition, espérance, écart type » → **loi de Bernoulli** (même ajout, avec Tle comp.)
- [C] « schéma de Bernoulli ; arbre » → Probabilités > Loi binomiale > schéma de Bernoulli
- [C] « coefficients binomiaux ; triangle de Pascal ; symétrie » → Probabilités > Loi binomiale > coefficients binomiaux
- [C] « loi binomiale : expression, espérance, écart type ; représentation » → Probabilités > Loi binomiale > calcul de probabilités / espérance et variance
- [C] « loi géométrique : définition, expression, espérance » → Probabilités > Autres lois > loi géométrique
- [P] « propriété caractéristique (loi sans mémoire) » ; démonstration associée → **absence de mémoire** (même ajout)
- [C] « identifier Bernoulli, binomiale, géométrique » → Probabilités > Loi binomiale > reconnaître une loi
- [C] « P(X = k), P(X ⩽ k) » → Probabilités > Loi binomiale > calcul de probabilités
- [P] « intervalle I tel que P(X ∈ I) ⩽ α ou ⩾ 1 – α » → **intervalle de fluctuation** (même ajout, avec Tle comp.)
- [C] « utiliser l'espérance des lois précédentes » → Probabilités > Autres lois > espérance ; Loi binomiale > espérance et variance
- [N] « probabilités conditionnelles, répétitions d'expériences » → Probabilités > Probabilités conditionnelles : **Tle comp.** (même ajout)

### Lois à densité

- [C] « loi à densité ; probabilité comme une aire » ; « est-ce une densité ? calculer des probabilités » → Probabilités > Autres lois > densité et aire
- [P] « fonction de répartition x ↦ P(X ⩽ x) » → Probabilités > Autres lois : manque **fonction de répartition**
- [P] « espérance et variance d'une loi à densité (intégrales) » → Probabilités > Autres lois > espérance : manque **variance**
- [C] « loi uniforme sur [0, 1] puis [a, b] » → Probabilités > Autres lois > loi uniforme continue
- [C] « loi exponentielle : densité, répartition, espérance » → Probabilités > Autres lois > loi exponentielle
- [P] « … propriété d'absence de mémoire » → **absence de mémoire** (même ajout)
- [O] Algorithmes « simulation à partir d'une loi uniforme », « somme de n variables indépendantes »

### Statistique à deux variables quantitatives

- [C] « nuage de points ; point moyen » ; « représenter, calculer le point moyen » → Statistiques > Statistique à deux variables > nuage de points / point moyen
- [C] « ajustement affine ; droite des moindres carrés » ; démonstration associée → Statistiques > Statistique à deux variables > ajustement affine
- [P] « coefficient de corrélation » → Statistiques > Statistique à deux variables : manque **coefficient de corrélation**
- [C] « ajustement par changement de variable » → Statistiques > Statistique à deux variables > changement de variable
- [P] « interpolations ou extrapolations » → Statistiques > Statistique à deux variables : manque **interpoler, extrapoler**

### Algorithmique et programmation

- [T] « reprend les programmes de seconde et de première sans notion nouvelle » → Algorithmique (2de, 1re) : entretien

### Sens inverse : notions marquées Tle comp. absentes du programme de Tle comp.

- [H] Fonctions > Convexité > inégalités de convexité : le programme ne demande que reconnaître et étudier la convexité
- [H] Intégration > Calcul d'intégrales > intégration par parties : absente du programme de Tle comp.
- [H] Équations différentielles > y′ = f > forme (v′∘u)×u′ (cas général) et sinus et cosinus : Tle comp. se limite à 2uu′, e^u u′, u′/u
- [T] Fonctions > Limites de fonctions > croissances comparées / formes indéterminées : non nommées ; « calculer des limites » avec les opérations, usage légitime en contexte
- [T] Fonctions > Dérivation > nombre dérivé / tangente : rappels de 1re
