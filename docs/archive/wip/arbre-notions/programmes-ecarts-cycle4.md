# Arbre des notions et programme du cycle 4 : écarts

> Comparaison du 2026-10-07 entre `arbre-notions.json` (version 2026-10-07.3 : 126 notions) et le
> **nouveau** programme de mathématiques du cycle 4, sous le modèle de l'ADR 0020. Décision de
> David : **le site s'aligne sur les nouveaux programmes** (cohérence pédagogique d'ensemble),
> même si 4e et 3e suivent l'ancien jusqu'en 2027/2028 — il n'a pas ces niveaux.
> **Rien n'est modifié** : ce document propose, David tranche.

## Textes comparés

| Document                                                           | Référence / date                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Annexe 2 — Programme de mathématiques pour le cycle 4 » (20 p.)  | **Arrêté du 18 février 2026, BO n° 10 du 5 mars 2026** (référence établie par recherche ; le PDF ne se date pas). Annualisé 5e / 4e / 3e. Domaines : Nombres et calculs · Espace et géométrie · OGD et probabilités · **Proportionnalité, fonctions** · La pensée informatique. Rubriques : Automatismes · Objectifs d'apprentissage · Prolongements possibles. Application : 5e rentrée 2026, 4e 2027, 3e 2028. |
| « Attendus de fin d'année » 5e, 4e, 3e (eduscol, annexes 14/16/18) | **ANCIEN programme** (2018-2020). Servent ici à la section Transition et au sens inverse.                                                                                                                                                                                                                                                                                                                        |
| « Repères annuels de progression » cycle 4 (eduscol, annexe 26)    | **ANCIEN programme**. Même usage.                                                                                                                                                                                                                                                                                                                                                                                |

⚠️ **Le nouveau programme remodèle le cycle 4** :

- **La géométrie est resserrée et re-séquencée** : symétrie centrale en 5e, translations en 4e,
  **vecteurs dès la 3e** (définition ponctuelle de la translation, vecteurs égaux, nul, opposé,
  somme, **relation de Chasles**) ; Pythagore (+ réciproque ET contraposée) en 4e ; Thalès
  (+ réciproque et contraposée, triangles emboîtés et papillon) en 3e ; **cosinus, sinus et
  tangente ensemble en 3e** ; hauteurs et médianes dès la 5e ; **rotations, homothéties,
  triangles semblables et cas d'égalité disparaissent**.
- **Nombres** : puissances dès la 5e (carré, cube) ; **valeur absolue définie en 5e** ( !) ;
  racine carrée en 4e ; **les trois identités remarquables en 3e** (l'ancien n'avait que
  a² − b²) ; inéquation ax ≥ b en 3e ; notation scientifique repoussée en 3e ; « nombre
  premier » n'est plus qu'un prolongement de 5e, mais la décomposition en facteurs (60 = 2²×3×5)
  est un automatisme de 3e.
- **Fonctions dès la 5e** (« en fonction de », tableaux de valeurs, graphiques cartésiens,
  formules), formalisation en 3e (image, antécédents, linéaires, affines, **fonction carré
  représentée en 3e**).
- **Stats-probas renforcées** : moyenne 5e, moyenne pondérée + médiane + étendue 4e,
  **quartiles, effectifs cumulés et boîtes à moustaches en 3e** ; probabilités avec **langage
  ensembliste en 4e** (réunion, intersection, complémentaire, événement contraire) et
  **P(A∪B) + P(A∩B) = P(A) + P(B) en 3e**.
- **Proportionnalité** : coefficient de proportionnalité en 5e ; rapports et ratios, quatrième
  proportionnelle, **coefficient multiplicateur défini en 4e** ; partages selon un ratio et
  évolutions en 3e.
- **Pensée informatique** : programmation **par blocs** structurée — 5e séquences/boucle
  inconditionnelle, 4e conditions/variables, 3e conditions composées/boucle
  conditionnelle/structuration.

## Légende

Identique aux documents précédents : **[C]** nœud existant (la ligne devient un ou des points) ·
**[P]** sous-notion à créer (critère du filtre justifié) · **[A]** notion à créer · **[T]** ni
nœud ni point.

### ⚠️ Rubriques « Automatismes » (règle de David du 2026-10-07, rétroactive)

À chaque niveau du cycle 4, les automatismes « s'appuient sur des contenus qui ont été étudiés
sans être automatisés au niveau précédent » (texte du programme). Au pointage, ces lignes ne
deviennent donc **pas des points de l'année** mais des **références** « travaillé en
automatisme en 5e/4e/3e » vers les points des programmes antérieurs
(`curriculum_point_automatismes`). Seule une ligne qui introduit du contenu neuf devient un
point. Les correspondances ligne → nœud de ce document restent valables : elles disent où
pointe la référence.

## Vue d'ensemble

C'est le lot qui **réalise la question D2** (géométrie du collège, ouverte depuis le début du
chantier) : **7 notions** de géométrie à créer — 5 exigées par le programme et **2 hors
programme à la demande de David** (Rotations, Homothéties) —, **~10 sous-notions**, le reste en
points sous l'existant. Aucun autre domaine ne manque de maison : numération, calcul, calcul littéral,
équations, proportionnalité, statistiques, probabilités et fonctions du cycle 4 tombent dans des
notions déjà en place.

---

## Nombres et calculs

- 5e Opérations : « sens et emploi des quatre opérations ; diviser par un décimal ; enchaîner ;
  traduire un programme de calcul en une seule expression ; sommes/produits, termes/facteurs ;
  priorités opératoires ; distributivité simple numérique ; multiples et diviseurs ; critères
  par 3 et 9 ; mobiliser un algorithme » — **[C]** `Entiers : priorités opératoires` (CM1 à 5e ✓),
  `Décimaux : calculs > diviser`, `Arithmétique > Divisibilité > critères de divisibilité`.
- 5e Relatifs : « définir ; opposé et **valeur absolue** ; positif/strictement négatif… ; droite
  graduée ; comparer ; additionner (deux puis plusieurs) ; soustraire ; parenthèses
  indispensables ; simplifier les écritures ; enchaîner ; problèmes » · 4e : « multiplier
  (règle des signes construite), diviser, enchaînements, vocabulaire des programmes de calcul » —
  **[C]** `Relatifs : sens et écritures` et `Relatifs : calculs` (5e, 4e ✓). La valeur absolue
  de 5e = **point** sous `sens et écritures` (la notion « Fonction valeur absolue » reste 2de).
- 5e-4e-3e Rationnels : « comparer ; additionner/soustraire dénominateurs quelconques (5e) ;
  définir le rationnel, inverse, produit, fraction de fraction, diviser (4e) ; fraction
  irréductible (3e) ; problèmes » — **[C]** `Fractions : sens et écritures > simplifier` +
  `Fractions : calculs` (⚠️ niveau indicatif : « CE1 à 4e » → **« CE1 à 3e »** pour couvrir
  l'irréductibilité de 3e).
- 5e-4e-3e Puissances : « carré et cube, carrés de 0 à 12, cube de 10 (5e) ; exposants positifs,
  produits de puissances, même exposant (4e) ; exposants négatifs, multiplier/diviser, notation
  scientifique (3e) » — **[C]** `Puissances : sens et écritures` et `: calculs` — ⚠️ niveaux
  « 4e, 3e » → **« 5e à 3e »**.
- 4e-3e Racine carrée : « définition, encadrer entre deux entiers (4e) ; résoudre x² = a
  analytiquement et graphiquement, problèmes (3e) » — **[C]** `Racines carrées` (5e à 2de ✓) +
  `Équations : produit et quotient > x² = a` (3e ✓).
- 3e Multiples et diviseurs : « factoriser 60 = 2² × 3 × 5 ; simplifier une fraction ;
  dénominateur commun ; critères 2, 3, 5, 9 (automatismes) » — **[C]** `Divisibilité` +
  `Nombres premiers > décomposition en facteurs premiers` (3e ✓ ; noter : « nombre premier »
  n'est plus exigible qu'en creux — prolongement de 5e — mais la décomposition reste un
  automatisme de 3e, le pointage le dira finement).
- 5e-4e-3e Calcul littéral : « produire des formules, substitution, tester une égalité,
  somme/produit, k(a+b), réduire ax + b, démontrer, contre-exemple, conjectures
  (algorithme/tableur), lettre inconnue (5e) ; développer/factoriser (distributivité simple),
  démonstrations, conjectures (4e) ; simplifier produits et rapports, **double distributivité**,
  **les trois identités remarquables**, raisonnement par analyse-synthèse (3e) » — **[C]**
  `Calcul littéral` (5e à 2de ✓, toutes les sous-notions y sont).
- Équations et inéquations : « modéliser ax = c, x + b = c, résolution arithmétique (5e) ;
  résoudre ax + b = c, mettre en équation ax + b = cx + d (4e) ; **équation produit nul** (3e) ;
  **inéquation ax ≥ b analytique et graphique** (3e) » — **[C]** `Équations : premier degré`
  (5e à 2de ✓), `Équations : produit et quotient` (3e, 2de ✓), `Inéquations : premier degré` —
  ⚠️ niveau « 4e à 2de » → **« 3e à 2de »** (ni l'ancien ni le nouveau programme n'ont
  d'inéquations avant la 3e).

## Espace et géométrie

- 5e-4e-3e Repérage : « abscisses décimales (5e) puis relatives (4e, 3e) ; lire/placer des
  coordonnées dans un repère orthogonal du plan » — **[P]** `Repérage et déplacements` >
  **« coordonnées dans le plan »** (5e à 3e ; niveaux de la notion → **CP à 3e**). Filtre : oui —
  les fiches de repérage/coordonnées sont une famille d'exercices à part, et c'est le chaînon
  avant la « Géométrie repérée » de 2de. (L'ancien repérage 3D — pavé, sphère
  latitude/longitude — disparaît.)
- 5e-4e-3e Représentation de l'espace : « vues et empilements, perspective cavalière
  (pavé, cube, cylindre, prisme), patrons ↔ perspective (5e) ; pyramide et cône (4e) ; boule et
  sphère définies, grands cercles, **sections** (pavé ∥ face, cylindre ∥/⊥ axe, boule) (3e) » —
  **[C]** `Solides > reconnaître et décrire, patrons` (+ points sections 3e) — niveaux
  → **« CP à 3e »**.
- Volumes : « cube, pavé, prisme, **cylindre**, conversions volume-capacité, **aire du disque**
  (5e) ; volumes pyramide et cône (4e) ; **volume de la boule** (3e) » — **[C]** `Volumes`
  (niveaux « 6e » → **« 6e à 3e »**) + **[P]** quatre sous-notions de formules, sur le modèle
  d'Aires : **« cube et pavé »**, **« prisme et cylindre »**, **« pyramide et cône »**,
  **« boule »** (filtre : les fiches de volumes se composent par famille de solides) ; et
  **[P]** `Aires` > **« disque »** (5e — cohérent avec `Périmètres > disque` validé au cycle 3).
- 5e Transformations : « symétrie axiale sur feuille blanche (automatismes) ; **définir le
  demi-tour (symétrie centrale), ses propriétés** » · 4e : « symétrique d'un point par demi-tour
  (automatisme) ; images de figures par symétries et demi-tour » — **[A]** notion **« Symétrie
  centrale »** (5e, 4e), parallèle de « Symétrie axiale ». Pas de sous-notions (comme Symétrie
  axiale).
- **[A hors programme]** notions **« Rotations »** et **« Homothéties »** — demandées par David
  le 2026-10-07 : disparues du nouveau programme (elles étaient en 3e dans l'ancien), elles
  entrent dans l'arbre **sans pointeur de programme** (ADR 0020 : enrichissement, anciens
  contenus, évolutions futures). Sans sous-notions, comme les symétries. Elles pourront être
  pointées par d'éventuels référentiels 4e/3e « ancien programme » pendant la transition.
- 4e « Parallélogrammes et translations » : « comprendre l'effet d'une translation, lien avec
  les parallélogrammes et les angles, propriétés de conservation » · 3e « Translations et
  vecteurs » : « définition ponctuelle avec parallélogramme ; **vecteurs, vecteurs égaux, vecteur
  nul, opposé ; somme par enchaînement de translations ; relation de Chasles** » — **[A]** notion
  **« Translations »** (4e, 3e) ; et les vecteurs de 3e pointent la notion existante
  `Vecteurs : sans coordonnées` — ⚠️ niveau « 2de » → **« 3e, 2de »** (raccord parfait : ses
  sous-notions « translation et vecteur », « égalité de vecteurs », « somme et relation de
  Chasles » sont mot pour mot le programme de 3e).
- 5e Angles : « lexique (automatismes, déjà 6e), 90°/180°, reconnaître une bissectrice, angles
  de l'équerre ; **caractériser le parallélisme : alternes internes, correspondants** » — **[C]**
  `Grandeurs et mesures > Angles` + `Figures planes > perpendiculaires et parallèles` (point
  « angles alternes-internes » 5e) et `> médiatrice et bissectrice`.
- 5e-4e-3e Triangles : « somme des angles démontrée, construire avec données partielles,
  médiatrices/cercle circonscrit cas particuliers, **aire d'un triangle, hauteurs (définir,
  concourantes), médianes (partage en deux aires égales)** (5e) ; **théorèmes de la droite des
  milieux ; théorème de Pythagore, réciproque, contraposée ; triangle rectangle et cercle
  circonscrit (demi-cercle)** (4e) ; **théorème de Thalès, réciproque, contraposée (emboîtés et
  papillon) ; cosinus, sinus, tangente** (3e) » :
  - hauteurs, médianes, somme des angles, constructions → **[C]** `Figures planes > triangles`
    (points 5e ; niveaux de Figures planes → **CP à 4e**) ;
  - **[A]** notion **« Théorème de Pythagore »** (4e, 3e) — sous-notions **« calculer une
    longueur »**, **« réciproque »** (filtre : les deux familles canoniques de fiches) ;
  - **[A]** notion **« Théorème de Thalès »** (3e) — sous-notions **« calculer une longueur »**,
    **« réciproque »**, et **« droite des milieux »** (4e — voir question S2) ;
  - **[A]** notion **« Trigonométrie du triangle rectangle »** (3e) — sous-notions **« calculer
    une longueur »**, **« calculer un angle »**.
- 5e Parallélogrammes : « définir, construire, propriétés caractéristiques (côtés opposés,
  diagonales), parallélogrammes particuliers (rectangle, losange, carré), aire, conversions » —
  **[P]** `Figures planes` > **« parallélogrammes »** (5e, 4e — gros bloc du programme, famille
  de fiches évidente) ; aire → `Aires > parallélogramme` ✓.

## OGD et probabilités

- Statistiques : « recueillir, effectifs et fréquences, lire/représenter (barres, circulaires,
  cartésien, tableur-grapheur), **moyenne simple** (5e) ; **moyenne pondérée, médiane, étendue**,
  valeur extrême, comparaison de séries (4e) ; **effectifs cumulés croissants, quartiles,
  boîtes à moustaches** (3e) » — **[C]** `Statistiques > Représenter des données` et
  `> Indicateurs` + **[P]** `Indicateurs` > **« boîte à moustaches »** (3e — et le lot lycée en
  avait déjà besoin pour la Tle comp. : convergence).
- Probabilités : « échelle de probabilité, formes diverses (fraction/décimal/%), vocabulaire,
  équiprobabilité, répéter et enregistrer (5e) ; **langage ensembliste** (réunion, intersection,
  complémentaire, vide), événement contraire, expériences à deux épreuves, distributions
  fréquentielle vs probabiliste, fluctuation (4e) ; **P(A∪B) + P(A∩B) = P(A) + P(B)**, simuler,
  stabilisation des fréquences (3e) » — **[C]** `Probabilités > Expériences aléatoires >
événements, équiprobabilité, fréquences, probabilité simple` (points 5e-3e ; le langage
  ensembliste de 4e croise la branche `Ensembles`, qui reste lycée — les points vivent ici).

## Proportionnalité, fonctions

- Proportionnalité : « reconnaître, procédures (automatismes) ; proportions et pourcentages ;
  **coefficient de proportionnalité** ; tableau/graphique ; reconnaissance graphique (5e) ;
  **grandeurs quotients ; rapports et ratios ; quatrième proportionnelle ; calculer avec des
  pourcentages ; augmentation/diminution, coefficient multiplicateur défini ; partage
  proportionnel** (4e) ; partages selon un ratio, pourcentages, échelle d'une carte
  (automatismes), **évolutions en pourcentages, lien graphique-Thalès, fonctions linéaires**
  (3e) » — **[C]** `Situations de proportionnalité` (CM1 à 3e ✓), `Pourcentages` (6e à 2de ✓),
  `Vitesse` (4e ✓ grandeurs quotients), `Échelle d'une carte` — ⚠️ niveau « 6e » →
  **« 6e, 3e »** ; `Évolutions` — ⚠️ niveau « 2de, 1re » → **« 4e à 1re »** (le coefficient
  multiplicateur que sa note réclamait arrive en 4e : la note « à étoffer » se résout par le
  pointage).
- Fonctions : « "en fonction de", tableaux de valeurs, lire/placer des points, graphiques
  cartésiens, formules (5e) ; programme de calcul → variable, formule littérale, représenter
  graphiquement, dépendance (4e) ; représentations d'une fonction, image/antécédents,
  **fonctions linéaires** (équations/inéquations graphiques, lien proportionnalité), fonctions
  affines, coefficients graphiquement, **fonction carré représentée** (3e) » — **[C]**
  `Généralités sur les fonctions` — ⚠️ niveau « 3e, 2de » → **« 5e à 2de »** ; `Fonctions
affines` (3e, 2de ✓) + **[P]** `Fonctions affines` > **« fonction linéaire »** (3e — famille de
  fiches à part entière, et le mot du programme) ; `Fonction carré` — ⚠️ niveau « 2de » →
  **« 3e, 2de »**.

## La pensée informatique

« Programmation par blocs : séquences, entrées/sorties, expressions, boucle inconditionnelle
(5e) ; conditions, instructions conditionnelles, variable, écrire/modifier un programme (4e) ;
variables approfondies, conditions composées, boucle conditionnelle, structurer, écrire (3e) » —
→ **question S5** : ces contenus sont exactement ceux des notions `Algorithmique > Variables et
instructions` et `> Boucles` (aujourd'hui 2de) : étendre leurs niveaux au collège (le langage —
blocs ou Python — est une modalité, pas un contenu), ou créer une notion « Programmation par
blocs » ? Reco : **étendre** (« Variables et instructions » 5e à 2de, « Boucles » 5e à 2de) ;
« Fonctions Python » et « Listes » restent lycée.

## Transition (4e et 3e sous l'ancien programme jusqu'en 2027/2028) et sens inverse

Disparus du nouveau programme (présents dans l'ancien) : **rotations, homothéties, triangles
semblables, cas d'égalité des triangles, repérage 3D (pavé, sphère latitude/longitude)**.
Décision de David (2026-10-07) : **Rotations et Homothéties entrent dans l'arbre comme notions
hors programme** (voir § Espace et géométrie). Pour les autres (triangles semblables, cas
d'égalité, repérage 3D) : voir question S6 — un nœud se crée en une minute le jour où un contenu
en a besoin. Décalages à
connaître pour d'éventuels contenus 4e/3e d'ici 2028 : dans l'ancien, Thalès et le cosinus sont
en 4e (3e dans le nouveau), la notation scientifique en 4e (3e), médiane en 4e/étendue en 3e
(regroupées en 4e dans le nouveau), quartiles et boîtes à moustaches absents (lycée). Les nœuds
proposés couvrent les deux programmes — seul le **pointage** par année différera.

Sens inverse : `Inéquations : premier degré` était marquée « 4e à 2de » — aucun des deux
programmes n'a d'inéquations avant la 3e → **« 3e à 2de »**.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide tout sauf S6 : on fait le même traitement
> hors programme ». S1-S5 et S7 validées telles quelles (S2 = option A, S5 = option A) ;
> **S6 inversée par David** : Triangles semblables (avec « cas d'égalité des triangles » en
> sous-notion), et Repérage dans l'espace entrent aussi en hors programme, comme Rotations et
> Homothéties. Appliqué à l'arbre : version 2026-10-07.4 — 135 notions, 483 sous-notions.

1. **S1 — Les 5 notions de géométrie** (c'est la question D2 qui se referme) : **Symétrie
   centrale** (5e, 4e) · **Translations** (4e, 3e) · **Théorème de Pythagore** (4e, 3e ;
   sous-notions « calculer une longueur », « réciproque ») · **Théorème de Thalès** (3e ;
   « calculer une longueur », « réciproque ») · **Trigonométrie du triangle rectangle** (3e ;
   « calculer une longueur », « calculer un angle »). (reco : oui.)
2. **S2 — Droite des milieux** (4e) : sous-notion de « Théorème de Thalès » (reco — c'est son
   prélude pédagogique, la notion passerait « 4e, 3e »), ou simple point sous
   `Figures planes > triangles` (fidèle à la lettre du BO, qui la classe dans Triangles) ?
3. **S3 — Bloc géométrie/grandeurs** : « parallélogrammes » (Figures planes) · les 4 sous-notions
   de formules de Volumes (cube et pavé, prisme et cylindre, pyramide et cône, boule) ·
   « disque » (Aires). (reco : oui.)
4. **S4 — Petit bloc** : « boîte à moustaches » (Indicateurs) · « fonction linéaire » (Fonctions
   affines) · « coordonnées dans le plan » (Repérage et déplacements). (reco : oui.)
5. **S5 — Programmation par blocs** : étendre « Variables et instructions » et « Boucles » à
   « 5e à 2de » (reco), ou notion dédiée au collège ?
6. **S6 — Autres disparus de l'ancien programme** : « Triangles semblables », « cas d'égalité
   des triangles », repérage 3D — même traitement hors programme que Rotations/Homothéties, ou
   on attend qu'un contenu réel en ait besoin ? (reco : attendre — contrairement aux rotations
   et homothéties, qui restent des classiques de l'enrichissement, ces trois-là ont peu de
   chances de servir hors programme.)
7. **S7 — Validation d'ensemble** : les niveaux rafraîchis (Puissances 5e à 3e, Inéquations 3e à
   2de, Vecteurs sans coordonnées 3e-2de, Généralités fonctions 5e à 2de, Fonction carré 3e-2de,
   Évolutions 4e à 1re, Échelle 6e-3e, Fractions CE1 à 3e, Solides/Figures planes/Repérage
   CP à 3e-4e, Volumes 6e à 3e, Symétrie axiale CE2 à 3e) et l'application au JSON + diagramme.

## Programmes reçus / manquants (état au 2026-10-07, soir)

Reçus : lycée général (2de, 1re spé, Tle spé/comp./expertes) · cycle 2 (2024) · cycle 3
(avril 2025) · **cycle 4 (mars 2026) + attendus/repères de l'ancien**. Manquants :
**mathématiques spécifiques** (enseignement scientifique de 1re générale) et **enseignement
commun de mathématiques de la voie technologique** (1re et Tle). À noter : le lycée fourni à la
session précédente est la version révisée — si une nouvelle vague « lycée 2026+ » paraît dans la
foulée des cycles 3-4, il faudra y revenir.
