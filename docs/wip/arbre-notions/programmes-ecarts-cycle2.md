# Arbre des notions et programme du cycle 2 : écarts

> Comparaison entre `arbre-notions.json` (2026-10-07) et le programme de mathématiques du
> cycle 2, sous le modèle de l'ADR 0020 : l'arbre est central et SANS niveaux, chaque ligne de
> programme devient un **point rattaché à un nœud** (notion ou sous-notion), le grain de
> l'arbre est celui du **filtre**.
> **Rien n'est modifié** : ce document propose, David tranche.

## Textes comparés

| Document                                                            | Référence / date                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Annexe 4 — Programme de mathématiques du cycle 2 » (38 p.)        | **Arrêté du 22-10-2024, BOENJS n° 41 du 31 octobre 2024** — programme **2025**, annualisé CP / CE1 / CE2, 4 domaines : Nombres calcul et résolution de problèmes · Grandeurs et mesures · Espace et géométrie · Organisation et gestion de données. 2 colonnes : « Objectifs d'apprentissage » / « Exemples de réussite ». |
| Livrets d'accompagnement CP (39 p.), CE1 (54 p.), CE2 (41 p.), 2025 | ⚠️ **Pas des inventaires** : des séquences modèles. Utiles pour les repères de période, les fluences et la progression des tables (CE1 : ×1-6 et ×10 en P1-P2, ×7 en P3, ×8 en P4, toutes en P5).                                                                                                                          |

⚠️ **C'est le programme 2025, pas celui de 2020.** Fait majeur : **les fractions commencent au
CE1** (fractions d'un tout, dénominateurs 2, 3, 4, 5, 6, 8, 10 ; comparaison ; addition et
soustraction de même dénominateur), prolongées au CE2 (égalités, dénominateur ≤ 12, fractions
d'une unité de longueur sur règle graduée). L'écriture à virgule apparaît dès le CE1 mais
**uniquement en contexte monétaire** (les décimaux restent au cycle 3). Garde-fous du texte :
pas de calculatrice, pas de tableaux de conversion, pas de formules de périmètre, deux tiers du
temps au moins sur « Nombres, calcul et résolution de problèmes ».

## Légende (v2)

Chaque ligne part d'un extrait du programme ; le code dit quel nœud de l'arbre accueillera le
**point** correspondant :

- **[C] couvert** : un nœud existant convient — la ligne deviendra un point sous ce nœud, pour
  le niveau indiqué — il n'y a jamais rien à changer sur le nœud lui-même.
- **[P] sous-notion à créer** : la notion existe, et la ligne justifie une sous-notion parce
  qu'elle **passe le critère du filtre** (« voudra-t-on filtrer la banque là-dessus ? ») —
  justification donnée à chaque fois.
- **[A] notion à créer** : aucun nœud ne convient ; emplacement proposé.
- **[T] pas un point** : modalité, principe pédagogique ou objectif de fluence — vit dans les
  métadonnées (automatismes, régime d'acquisition) ou nulle part, pas dans l'arbre ni comme
  point de contenu.

Rappel ADR 0020 : le grain fin (« dénominateur ≤ 12 », « nombres ≤ 10 000 », posé en période 4…)
appartient au **libellé du point**, jamais à une sous-notion.

## Vue d'ensemble

L'arbre couvre déjà bien la **numération et le calcul** du primaire. Trois pans entiers n'ont
aucune notion : la **résolution de problèmes arithmétiques**, les **grandeurs du primaire**
(longueurs, masses, contenances, monnaie), la **géométrie du primaire** (solides, figures planes,
symétrie, repérage) — ce dernier point recoupe la question **D2** (géométrie du collège).

Bilan : **9 notions** à créer, **~20 sous-notions** (dont celles des notions neuves),
le reste des lignes = **points** sous des nœuds existants.

---

## Nombres, calcul et résolution de problèmes

### Les nombres entiers

- CP « comparer et dénombrer des collections en les organisant ; construire des collections de
  cardinal donné » — **[P]** `Entiers : numération` > **« dénombrer »**. Filtre : oui, une fiche
  de CP « dénombrer des collections » est un classique qui ne se confond ni avec « comparer » ni
  avec « écrire ».
- CP « suite écrite et orale jusqu'à cent ; représentations ; valeur positionnelle (unités,
  dizaines) » · CE1 « jusqu'à mille, centaines, écriture en lettres » · CE2 « jusqu'à dix-mille,
  milliers, écritures en unités de numération, décomposition (4 × 1000) + (6 × 100) + … » —
  **[C]** `Entiers : numération > écrire, décomposer` (un point par année, les bornes dans le
  libellé).
- CP-CE2 « comparer, encadrer, intercaler (=, <, >) ; ordonner ; placer sur une demi-droite
  graduée » — **[C]** `Entiers : numération > comparer, repérer`.
- CP « nombres ordinaux jusqu'à "vingtième" ; rang dans une file ; suites répétitives » · CE1
  « ordinaux jusqu'à cent ; suites répétitives et évolutives » — **[P]** `Entiers : numération` >
  **« ordinaux et rangs »**. Filtre : oui (exercices d'ordinaux et de rangs typiques du CP-CE1,
  introuvables autrement). Les suites de motifs y logent (travail du rang, pas la branche
  Suites, qui reste une affaire de lycée).
- CE1 « connaitre la notion de parité » (pair/impair, nombres pairs entre 767 et 778) — **[A ou
  P]** → **question Q2** : sous-notion « pair ou impair » dans `Arithmétique > Divisibilité`
  (reco, cohérent avec l'idée de divisibilité) ou dans `Entiers : numération` ? Filtre : oui dans
  les deux cas.

### Les fractions (CE1 et CE2 — nouveauté 2025)

- CE1 « fractions d'un tout ≤ 1 ; interpréter, représenter, lire, écrire (dén. 2, 3, 4, 5, 6, 8, 10) ; mots numérateur/dénominateur » — **[C]** `Fractions : sens et écritures > définition`
  (points CE1).
- CE1 « comparer unitaires / même dénominateur » · CE2 « comparer (même dén., même num., dén.
  multiple) » — **[C]** `> comparer`.
- CE2 « établir des égalités de fractions ≤ 1 (6/8 = 3/4) » — **[C]** `> égalité de fractions`.
- CE2 « partager une unité de longueur en fractions d'unité ; graduer une règle ; mesurer et
  tracer des longueurs non entières ; positionner des fractions » — **[P]**
  `Fractions : sens et écritures` > **« droite graduée »**. Filtre : oui — les exercices de
  placement/lecture sur droite graduée forment une famille qu'on veut retrouver telle quelle
  (et elle resservira au collège pour les abscisses fractionnaires).
- CE1 « additionner et soustraire même dénominateur ; complément à 1 » · CE2 « … ou dénominateur
  multiple de l'autre » — **[C]** `Fractions : calculs > additionner et soustraire`.

### Les quatre opérations

- CP « sens de l'addition et de la soustraction, symboles +, −, = » — **[C]**
  `Entiers : addition et soustraction > somme, différence`.
- CP « poser des additions en colonnes » · CE1 « soustraction posée (cassage ou compensation) » ·
  CE2 « posées ≤ 10 000 ; multiplication posée (2-3 chiffres × 1-2 chiffres) ; posées de montants
  en euros » — **question Q1** : sous-notion **« calcul posé »** dans chaque notion d'opération
  concernée ? Filtre : oui à mon sens (une fiche « poser des soustractions » est un classique
  absolu du primaire) → reco : sous-notion.
- CP « sens de la multiplication ("fois", additions itérées) » · CE1 « symbole × ;
  commutativité » — **[C]** `Entiers : multiplication > produit`.
- CE2 « vocabulaire : terme, somme, différence, facteur, produit, multiple » — **[C]** points
  (connaissances) sous les notions d'opérations ; aucune sous-notion.
- CE2 « sens de la division, symbole ÷, réciproque de la multiplication » — **[C]**
  `Entiers : division > quotient`.

### Le calcul mental

Trois types d'apprentissages (faits numériques · numération · procédures) et un grain fin
(« ajouter 9, 19 ou 29 », « multiplier par 4 ou par 8 », « complément à la dizaine supérieure »,
« moitié d'un nombre pair », « multiples de 25 », « décompositions de 60 »…) — **[C]** : tout
cela devient des **points** (beaucoup en régime « automatisme ») sous les sous-notions
existantes `tables`, `complément`, `double et moitié`, `décomposition`, `distributivité`,
`puissances de 10`, `produits particuliers`, `calcul astucieux`. C'est le cas d'école de
l'ADR 0020 : le grain vit dans les points, pas dans l'arbre.

Objectifs de fluence (CP : 9 calculs en 3 min ; CE1 : 12 ; CE2 : 15 ; fluences sur les tables en
1 min) — **[T]** : métadonnées d'automatisme (régime d'acquisition), pas des points de contenu.

### La résolution de problèmes

Le cœur du programme (≥ 10 problèmes par semaine, typologie explicite), **aucun emplacement dans
l'arbre** :

- CP « parties-tout en une étape (transformations comprises) » · CE1 « + comparaison en une
  étape » · CE2 « entiers > 1000, prix à virgule, fractions de même dénominateur » — **[A]**.
- CP « en deux étapes (champ ≤ 30) » · CE1-CE2 « deux puis deux-trois étapes, mixtes » — **[A]**.
- CP-CE2 « multiplicatifs en une étape : valeur du tout, nombre de parts, valeur d'une part » —
  **[A]**.
- CE2 « comparaison multiplicative ("fois plus", "fois moins") » — **[A]**.
- CE2 « produits cartésiens (tableaux, arbres) » — **[A]**, voir **question Q3**.

→ **Proposition** : notion **« Problèmes arithmétiques »** dans `Nombres et calculs`,
sous-notions **« parties-tout »**, **« comparaison »**, **« en deux étapes ou plus »**,
**« multiplicatifs »**, **« produits cartésiens »**. Filtre : oui — c'est précisément par
**structure** qu'un prof de primaire compose une fiche de problèmes ; le schéma en barres,
l'arbre à calcul, etc. sont des outils, pas des sous-notions. (**Question Q6** : valider ce
découpage.)

---

## Grandeurs et mesures

La branche existe mais aucune notion ne couvre les grandeurs elles-mêmes.

- Longueurs : CP « lexique, comparer, mesurer à la règle, m/cm, 1 m = 100 cm, références,
  estimer » · CE1 « + km, relations, encadrer » · CE2 « + dm, mm, conversions sans tableau,
  tracer en unités mixtes (6 cm et 3 mm) » — **[A]** notion **« Longueurs »**, sous-notions
  **« comparer et mesurer »** (filtre : fiches de mesurage) et **« unités et conversions »**
  (filtre : fiches de conversions, le classique du genre). « Estimer » = points, pas de
  sous-notion (pas un filtre de fiche en soi).
- Masses : CP « lexique, comparer, soupeser, Roberval » · CE1 « g, kg, 1 kg = 1 000 g, peser » ·
  CE2 « + tonne, conversions » — **[A]** notion **« Masses »**, mêmes deux sous-notions types.
- Contenances : CE2 « comparer ; L, dL, cL ; 1 L = 10 dL = 100 cL ; conversions ; estimer » —
  **[A]** notion **« Contenances »** — ou fusion avec Masses, **question Q4**.
- Monnaie : CP « euros entiers ≤ 100, comparer, constituer une somme, rendre la monnaie,
  achats » · CE1 « centimes, 100 c = 1 €, écriture à virgule (2,17 €) » · CE2 « additions puis
  soustractions posées de montants, rendre par ajouts successifs » — **[A]** notion
  **« Monnaie »**, sous-notions **« pièces et billets »**, **« euros et centimes »**,
  **« rendre la monnaie »** (filtre : oui pour les trois, familles d'exercices très typées).
  L'écriture à virgule en contexte monétaire vit ICI, pas dans `Décimaux : numération` — choix
  du programme lui-même.
- Temps et durées : CP « heures entières, horloge à aiguilles » · CE1 « heures/minutes,
  demi-heure et quart d'heure, 1 h = 60 min, durées entre deux instants, ajouter/soustraire » ·
  CE2 « aiguilles + digital, axe chronologique, problèmes à 1-2 étapes » — **[C]** `Durées`
  (points CP-CE2) + **[P]** **« lire l'heure »** (filtre : oui, les fiches d'horloges sont une
  famille à part entière ; `calculer` et `convertir` couvrent le reste).
- Périmètre : CE2 « notion de périmètre, comparer au compas par report, mesurer côté à côté,
  **aucune formule** (carré et rectangle compris) » — **[C]** `Périmètres` : un point CE2
  « périmètre d'un polygone par mesurage » suffit — « polygone quelconque » n'est pas un
  filtre, c'est une exigence annuelle ; les sous-notions `carré` et `rectangle` (les formules)
  restent des affaires de 6e.

---

## Espace et géométrie

Rien dans l'arbre avant les vecteurs de 2de. Prolongement direct de **D2** (géométrie du
collège) :

- Solides : CP « cube, boule, cône, cylindre, pavé ; reconnaitre, nommer, décrire (faces) ;
  construire cubes et pavés » · CE1 « + pyramide ; faces/sommets/arêtes ; perspective cavalière
  en réception » · CE2 « + pyramide à base polygonale ; identifier depuis une perspective ;
  patron du cube ; construire (tiges, faces) » — **[A]** notion **« Solides »**, sous-notions
  **« reconnaître et décrire »**, **« construire »**, **« patrons »** (filtre : oui — les
  patrons notamment sont une famille d'exercices à part, jusqu'en 6e-5e).
- Figures planes : CP « disque, carré, rectangle, triangle ; sommet/côté ; alignements ; tracer
  sur quadrillage » · CE1 « + triangle rectangle ; angle droit/aigu/obtus ; milieu (pliage) ;
  cercle et centre ; propriétés des carrés et rectangles ; règle graduée, équerre, compas ;
  codes des angles droits » · CE2 « + losange, quadrilatère, polygone/pentagone/hexagone,
  diagonale ; rayon et diamètre ; justifier la nature d'une figure ; construire sur papier uni ;
  codage des longueurs égales » — **[A]** notion **« Figures planes »**, sous-notions
  **« reconnaître et décrire »**, **« angles droits »**, **« reproduire et construire »**,
  **« cercle »** (filtre : oui pour les quatre).
- Symétrie : CE2 « axes de symétrie (pliage, calque) ; compléter une figure symétrique sur
  quadrillage » — **[A]** notion **« Symétrie axiale »** (les programmes des cycles 3-4 la
  prolongeront ; la symétrie centrale de 5e sera une autre notion, à voir avec le cycle 4).
- Repérage et déplacements : CP « positions relatives ; plan de la classe ; assemblages de cubes
  d'après modèle ; coder un déplacement (robot ≤ 10 instructions) » · CE1 « plans d'espaces
  familiers, itinéraires, robot ≤ 15 instructions » · (rien au CE2) — **[A]** notion
  **« Repérage et déplacements »**, sous-notions **« positions et plans »**, **« coder un
  déplacement »**. **Question Q5** : le codage de déplacements reste ici (reco) ou dans la
  branche Algorithmique (qui est Python-lycée) ?

---

## Organisation et gestion de données

- CP « enquête (caractère qualitatif, 2-5 valeurs, < 40 individus) ; tableau ; diagramme en
  barres ; tableau à double entrée » · CE1 « produire (< 100, axe gradué de 1 en 1) ; lire et
  interpréter » · CE2 « caractères quantitatifs discrets ; échelle adaptée ; résoudre des
  problèmes à partir de tableaux et diagrammes » — **[C]** `Statistiques > Représenter des
données` (points CP-CE2) + **[P]** **« tableau à double entrée »** (filtre : oui, famille
  d'exercices très identifiée du primaire). « Enquête et collecte » : point, pas de sous-notion
  — on ne filtrera pas la banque là-dessus, c'est une modalité d'activité en classe.

## Transversal — [T]

Calculatrice interdite au cycle 2 · au moins deux tiers du temps sur « Nombres, calcul et
résolution de problèmes » · évaluations courtes et fréquentes · fluences chiffrées (ci-dessus) :
principes et modalités, ni nœuds ni points de contenu.

## Sens inverse

Rien de ce que l'arbre contient pour le primaire n'est étranger au programme 2025. Et depuis
l'ADR 0020, un nœud que le cycle 2 ne pointe pas n'est **pas un problème** : il est simplement
hors programme à ce niveau (c'est même un usage voulu — enrichissement).

## Pointage à venir (quand le schéma ADR 0020 existera)

Ce document est le brouillon du **pointage du cycle 2** : chaque ligne [C]/[P]/[A] ci-dessus
donne le nœud cible d'un ou plusieurs points (kind connaissance / savoir-faire d'après la
colonne « Objectifs d'apprentissage » de l'Annexe 4, bornes dans le libellé, automatismes du
calcul mental en régime dédié). L'extraction fine des libellés se fera au moment du seed,
depuis l'Annexe 4. Rien ne part en base sans le feu vert de David. Fait mesuré (prod,
2026-10-07) : aucune classe de primaire aujourd'hui (6e ×2, 2de ×2, 1re spé ×3, 1re gén. ×1,
Tle spé ×1, Tle exp. ×1) — à David de dire la priorité du pointage cycle 2.

## Questions pour David (v2 — réduites)

1. **Q1 — Calcul posé** : sous-notion « calcul posé » dans chaque notion d'opération concernée
   (reco : oui, le filtre est évident) ?
2. **Q2 — Parité (CE1)** : sous-notion « pair ou impair » dans `Arithmétique > Divisibilité`
   (reco) ou dans `Entiers : numération` ?
3. **Q3 — Produits cartésiens (CE2)** : sous-notion de « Problèmes arithmétiques » (reco) ou
   la branche Dénombrement (aujourd'hui pensée Tle) ?
4. **Q4 — Grandeurs** : quatre notions (Longueurs, Masses, Contenances, Monnaie — reco) ou
   « Masses et contenances » fusionnées ?
5. **Q5 — Coder un déplacement (CP-CE1)** : dans « Repérage et déplacements » (reco) ou dans la
   branche Algorithmique ?
6. **Q6 — Problèmes arithmétiques** : valider la notion et ses 5 sous-notions (parties-tout,
   comparaison, en deux étapes ou plus, multiplicatifs, produits cartésiens).
7. **Q7 — Validation d'ensemble** : les 9 notions et les sous-notions marquées [P].

Tranchées le 2026-10-07, pour mémoire : lien arbre ↔ programme (ADR 0020) · renommage des
grades techno (PR #922).

## Programmes reçus / manquants (état au 2026-10-07)

Reçus : 2de, 1re spé, Tle spé, Tle comp., Tle expertes (session précédente) · cycle 2 (programme
2025 + 3 livrets). Manquants : **cycle 3** (CM1, CM2, 6e), **cycle 4** (5e, 4e, 3e),
**mathématiques spécifiques** (enseignement scientifique de 1re générale, 1 h 30, élèves sans la
spécialité), **enseignement commun de mathématiques de la voie technologique** (1re et Tle —
commun à ST2S, STL, STD2A, STI2D, STMG, STHR, BO spécial n° 1 du 22-01-2019 ; modules
différenciés mineurs : algorithmique sauf STD2A, activités géométriques en STD2A). Si David a un
jour des élèves de STI2D/STL en spécialité « physique-chimie et mathématiques », c'est un
programme de maths distinct à fournir en plus. À vérifier à réception : millésimes (programmes
2025-2026 du primaire, programmes révisés du lycée).

> Note : le document lycée `programmes-ecarts.md` est encore dans l'ancien modèle (niveaux sur
> les nœuds) ; il sera réécrit au présent gabarit une fois celui-ci validé par David.
