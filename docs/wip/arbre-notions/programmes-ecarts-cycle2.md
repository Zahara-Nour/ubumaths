# Arbre des notions et programme du cycle 2 : écarts

> Comparaison faite le 2026-10-07 entre `arbre-notions.json` (version du 2026-10-07 : 19 branches,
> 115 notions, 418 sous-notions, **avant** application des ajouts lycée de `programmes-ecarts.md`) et
> le programme de mathématiques du cycle 2 fourni par David.
> **Rien n'est modifié** : ce document propose, David tranche.
> Le présent document traite aussi du **référentiel** (`curriculum_*`) pour le cycle 2 (§ Référentiel).

## Textes comparés

| Document                                                     | Référence / date                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Annexe 4 — Programme de mathématiques du cycle 2 » (38 p.) | **Arrêté du 22-10-2024, BOENJS n° 41 du 31 octobre 2024** (référence donnée par les livrets). C'est le programme **2025**, annualisé CP / CE1 / CE2, en 4 domaines : Nombres calcul et résolution de problèmes · Grandeurs et mesures · Espace et géométrie · Organisation et gestion de données. Présentation en 2 colonnes : « Objectifs d'apprentissage » / « Exemples de réussite ». |
| Livret d'accompagnement CP (2025, 39 p.)                     | ⚠️ **Pas un inventaire** : 3 séquences modèles (numération ≤ 59 · calcul mental de l'addition < 100 · problèmes parties-tout ≤ 100). Utile pour les repères de période et les fluences.                                                                                                                                                                                                  |
| Livret d'accompagnement CE1 (2025, 54 p.)                    | ⚠️ Idem : 4 séquences (fractions · ajouter 9/19/29 · table de 7 · problèmes parties-tout, schéma en barres). Donne la progression des tables : ×1-6 et ×10 en P1-P2, ×7 en P3, ×8 en P4, toutes en P5.                                                                                                                                                                                   |
| Livret d'accompagnement CE2 (2025, 41 p.)                    | ⚠️ Idem : 3 séquences (fractions et longueurs · multiplier par 4 · problèmes additifs en 2 étapes).                                                                                                                                                                                                                                                                                      |

⚠️ **C'est le programme 2025, pas celui de 2020.** Changement majeur pour l'arbre : **les fractions
commencent au CE1** (fractions d'un tout, dénominateurs 2, 3, 4, 5, 6, 8, 10 ; comparaison ;
addition/soustraction de même dénominateur), et au CE2 (égalités, dénominateurs ≤ 12, fractions
d'une unité de longueur sur règle graduée). L'écriture à virgule apparaît dès le CE1, mais
**uniquement en contexte monétaire** ; les nombres décimaux restent une affaire de cycle 3.
Autres garde-fous du texte : pas de calculatrice au cycle 2, pas de tableaux de conversion,
pas de formules de périmètre, et au moins deux tiers du temps sur « Nombres, calcul et
résolution de problèmes ».

## Légende

Même convention que `programmes-ecarts.md` : **[C] couvert** · **[P] partiel** (sous-notion
manquante) · **[A] absent** (notion à créer) · **[N] niveau manquant** · **[H] hors programme** ·
**[T] transversal, légitime**. Les chemins sont `Branche > Notion > sous-notion`, propositions en
**gras**.

## Vue d'ensemble

Le bilan est structurellement différent du lycée : l'arbre couvre déjà bien la **numération et le
calcul** du primaire (les notions « Entiers : … », « Décimaux : … », « Fractions : … » portent des
niveaux CP-CM2), mais **trois pans entiers du programme n'ont aucune notion** : la résolution de
problèmes arithmétiques, les grandeurs du primaire (longueurs, masses, contenances, monnaie), et
toute la géométrie du primaire (solides, figures planes, symétrie, repérage) — ce dernier point
recoupe la question **D2** déjà ouverte (géométrie du collège absente).

Total proposé : **9 notions**, **~17 sous-notions**, **niveaux à ajouter sur 7 notions existantes**.

---

## Nombres, calcul et résolution de problèmes

### Les nombres entiers

- CP « comparer et dénombrer des collections en les organisant ; construire des collections de
  cardinal donné » — **[P]** `Nombres et calculs > Entiers : numération` : proposer la sous-notion
  **« dénombrer »** (spécifique au primaire, ne se confond ni avec « comparer » ni avec « écrire »).
- CP « suite écrite et orale jusqu'à cent ; représentations diverses ; valeur des chiffres selon la
  position (unités, dizaines) » · CE1 « jusqu'à mille, centaines, écriture en lettres » · CE2
  « jusqu'à dix-mille, milliers, écritures en unités de numération, décomposition du type
  (4 × 1000) + (6 × 100) + … » — **[C]** `Entiers : numération > écrire, décomposer`.
- CP-CE2 « comparer, encadrer, intercaler (=, <, >) ; ordonner ; placer sur une demi-droite
  graduée » — **[C]** `Entiers : numération > comparer, repérer`.
- CP « nombres ordinaux jusqu'à "vingtième" ; repérer un rang dans une file ; suites répétitives »
  · CE1 « ordinaux jusqu'à cent ; suites répétitives et évolutives » — **[A]** aucune sous-notion :
  proposer **« ordinaux et rangs »** sous `Entiers : numération`. Les suites de motifs
  (« ABABAB…, quel est le 17ᵉ symbole ? ») se rangent dans cette même sous-notion (c'est un travail
  du rang, pas la branche Suites, qui reste lycée).
- CE1 « connaitre la notion de parité d'un nombre » (pair/impair, nombres pairs entre 767 et 778) —
  **[A]** : deux emplacements possibles, voir **question P2**.

### Les fractions (CE1 et CE2 — nouveauté 2025)

- CE1 « fractions d'un tout, inférieures ou égales à 1 ; interpréter, représenter, lire, écrire
  (dénominateurs 2, 3, 4, 5, 6, 8, 10) ; mots numérateur/dénominateur » — **[N]**
  `Fractions : sens et écritures` est marquée « CM1 à 4e » → **« CE1 à 4e »**. Sous-notions
  `définition`, `comparer` : [C].
- CE1 « comparer des fractions unitaires ou de même dénominateur » · CE2 « comparer (même
  dénominateur, même numérateur, dénominateur multiple de l'autre) » — **[C]** `> comparer`.
- CE2 « établir des égalités de fractions ≤ 1 (6/8 = 3/4, dénominateur ≤ 12) » — **[C]**
  `> égalité de fractions`, une fois le niveau ajouté.
- CE2 « partager une unité de longueur en fractions d'unité ; graduer une règle ; mesurer et tracer
  des longueurs non entières (2 unités + 3/5 d'unité) ; positionner des fractions sur la règle
  graduée » — **[P]** proposer la sous-notion **« droite graduée »** sous
  `Fractions : sens et écritures` (sert aussi au collège pour les abscisses fractionnaires ;
  l'aspect mesurage vit dans Grandeurs > Longueurs).
- CE1 « additionner et soustraire des fractions de même dénominateur ; complément à 1 » · CE2
  « … ou dont l'un des dénominateurs est multiple de l'autre » — **[N]** `Fractions : calculs`
  « CM1 à 4e » → **« CE1 à 4e »**. Sous-notion `additionner et soustraire` : [C].

### Les quatre opérations

- CP « sens de l'addition et de la soustraction, symboles +, −, = » — **[C]**
  `Entiers : addition et soustraction > somme, différence`.
- CP « poser et effectuer des additions en colonnes » · CE1 « additions et soustractions posées
  (algorithme par cassage ou par compensation, P3 au plus tard) » · CE2 « posées jusqu'à 10 000 ;
  multiplication posée (2-3 chiffres × 1-2 chiffres, P4 au plus tard) ; posées de montants en
  euros » — **[A]** l'arbre n'a aucune sous-notion pour le calcul posé → **question P1**
  (sous-notion « calcul posé » par opération, ou modalité hors arbre ?).
- CP « comprendre le sens de la multiplication ("fois", additions itérées) » · CE1 « symbole × ;
  commutativité » — **[C]** `Entiers : multiplication > produit` (le sens de l'opération est le
  niveau bas de la sous-notion).
- CE2 « vocabulaire : terme, somme, différence, facteur, produit, multiple » — **[T]** vocabulaire
  porté par les notions existantes.
- CE2 « comprendre le sens de la division, symbole ÷, division réciproque de la multiplication
  (7 × 13 = 91 donc 91 ÷ 7 = 13) » — **[C]** `Entiers : division > quotient` (niveau CE2 déjà
  présent : « CE2 à CM2 » ✓).

### Le calcul mental

Le programme détaille trois types d'apprentissages (faits numériques · numération · procédures) et
des objectifs de fluence chiffrés (CP : 9 calculs en 3 min ; CE1 : 12 ; CE2 : 15 ; plus des
fluences sur les tables en 1 min). Ce grain (« ajouter 9, 19 ou 29 », « multiplier par 4 ou par
8 », « trouver le complément à la dizaine supérieure », « moitié d'un nombre pair », « multiples de
25 », « décompositions de 60 »…) relève du **référentiel par année**, pas de sous-notions d'arbre —
les sous-notions existantes `tables`, `complément`, `double et moitié`, `décomposition`,
`distributivité`, `puissances de 10` (× 10, × 100), `produits particuliers`, `calcul astucieux`
suffisent à ranger ces contenus. **[C]** avec cette réserve ; voir **question P3** si David préfère
une sous-notion « procédures de calcul mental » dédiée.

### La résolution de problèmes

C'est le cœur du programme (≥ 10 problèmes par semaine, typologie explicite) et **l'arbre n'a
aucun emplacement** pour ranger un énoncé par sa structure :

- CP « problèmes additifs en une étape de type parties-tout (transformations comprises) » · CE1
  « + problèmes de comparaison en une étape » · CE2 « parties-tout et comparaison, entiers
  > 1000, prix à virgule, fractions de même dénominateur » — **[A]**.
- CP « additifs en deux étapes (champ ≤ 30) » · CE1-CE2 « deux étapes, puis deux ou trois étapes
  mixtes » — **[A]**.
- CP « multiplicatifs en une étape : valeur du tout, nombre de parts, valeur d'une part
  (champ ≤ 30) » · CE1-CE2 idem avec champ étendu — **[A]**.
- CE2 « comparaison multiplicative ("fois plus", "fois moins") » — **[A]**.
- CE2 « problèmes mettant en jeu des produits cartésiens (tableaux, arbres) » — **[A]** ; la
  branche Dénombrement est marquée Tle → voir **question P4**.

→ **Proposition** : notion **« Problèmes arithmétiques »** dans `Nombres et calculs` (CP à 6e, à
confirmer quand les programmes des cycles 3 et 4 arriveront), sous-notions proposées :
**« parties-tout »**, **« comparaison »**, **« en deux étapes ou plus »**, **« multiplicatifs »**,
**« produits cartésiens »**. Le schéma en barres, l'arbre à calcul, etc. sont des outils de
résolution, pas des sous-notions.

---

## Grandeurs et mesures

La branche existe (5 notions, toutes marquées 6e sauf Aires 6e-5e) mais **aucune notion ne couvre
les grandeurs elles-mêmes** travaillées du CP au CE2.

- CP « lexique des longueurs ; comparer des objets et des segments ; mesurer à la règle graduée ;
  m, cm, 1 m = 100 cm ; longueurs de référence ; estimer » · CE1 « + km, relations, choisir
  l'unité, encadrer par deux entiers de cm » · CE2 « + dm, mm ; conversions sans tableau ; mesurer
  et tracer des segments de longueur donnée en unités mixtes (6 cm et 3 mm) » — **[A]** proposer la
  notion **« Longueurs »** (CP à 6e) : sous-notions **« comparer et mesurer »**, **« unités et
  conversions »**, **« estimer »**.
- CP « lexique des masses, comparer (soupeser, balance de Roberval) » · CE1 « g, kg, 1 kg =
  1 000 g, peser, références, estimer » · CE2 « + tonne, conversions, ordonner » — **[A]** proposer
  la notion **« Masses »** (CP à 6e), mêmes sous-notions types.
- CE2 « comparer des contenances ; L, dL, cL ; 1 L = 10 dL = 100 cL ; conversions ; estimer » —
  **[A]** proposer la notion **« Contenances »** (CE2 à 6e) — ou une notion commune
  « Masses et contenances », voir **question P5**.
- CP « monnaie : lexique, euros entiers ≤ 100, comparer la valeur d'ensembles de pièces et billets,
  constituer une somme, rendre la monnaie, simuler des achats » · CE1 « centimes, 100 centimes =
  1 €, écriture à virgule d'une somme (2,17 €), ordonner des prix » · CE2 « additions puis
  soustractions posées de montants en euros, rendre la monnaie par ajouts successifs » — **[A]**
  proposer la notion **« Monnaie »** (CP à CM2 ; le programme du cycle 3 dira si elle s'éteint
  après) : sous-notions **« pièces et billets »**, **« euros et centimes »**, **« rendre la
  monnaie »**. L'écriture à virgule en contexte monétaire vit ici, PAS dans `Décimaux :
numération` (qui reste CM1+) — c'est le choix du programme lui-même.
- CP « lire les heures entières sur une horloge à aiguilles » · CE1 « heures et minutes,
  demi-heure et quart d'heure, 1 h = 60 min, durée entre deux instants, ajouter/soustraire des
  durées, comparer 2 h et 130 min » · CE2 « horloge à aiguilles et affichage digital, axe
  chronologique, problèmes en une ou deux étapes avec durées » — **[N]** `Durées` est marquée 6e →
  **« CP à 6e »** ; **[P]** proposer la sous-notion **« lire l'heure »** (les sous-notions
  `calculer` et `convertir` couvrent le reste).
- CE2 « savoir ce qu'est le périmètre d'une figure plane ; comparer des périmètres au compas (report
  des côtés) ; déterminer le périmètre d'un polygone à la règle graduée — aucune formule enseignée,
  y compris pour le carré et le rectangle » — **[N]** `Périmètres` 6e → **« CE2, 6e »** ; **[P]**
  proposer la sous-notion **« polygone quelconque »** (les sous-notions `carré` et `rectangle`
  — les formules — restent 6e).
- CE1-CE2 relations entre unités et conversions — la notion `Unités et conversions` (6e) peut
  descendre à **CE1** si on y range les conversions de toutes les grandeurs, ou rester 6e si chaque
  grandeur porte sa sous-notion « unités et conversions » (proposition ci-dessus). Voir
  **question P5**.

---

## Espace et géométrie

**Rien dans l'arbre avant la 2de** (la branche Géométrie commence aux vecteurs). C'est le
prolongement direct de la question **D2** (géométrie du collège). Le cycle 2 prescrit :

- CP « reconnaitre, nommer, décrire (faces) : cube, boule, cône, cylindre, pavé ; construire des
  cubes et des pavés » · CE1 « + pyramide ; faces, sommets, arêtes ; premières représentations en
  perspective cavalière (en réception) » · CE2 « + pyramide à base polygonale ; identifier un
  solide depuis une perspective (arêtes cachées en pointillés) ; patron du cube (reconnaître si un
  assemblage de polygones est un patron) ; construire avec tiges ou faces » — **[A]** proposer la
  notion **« Solides »** (CP à 6e) : sous-notions **« reconnaître et décrire »**,
  **« construire »**, **« patrons »**.
- CP « reconnaitre, nommer disque, carré, rectangle, triangle ; sommet, côté ; alignements à la
  règle ; tracer sur quadrillage ou papier pointé (gabarits, pochoirs) » · CE1 « + triangle
  rectangle ; angle droit, aigu, obtus ; milieu d'un segment (pliage) ; cercle et centre ;
  propriétés des carrés et rectangles (angles, égalités de longueurs) ; règle graduée, équerre,
  compas ; reproduire et construire ; codes des angles droits » · CE2 « + losange, quadrilatère,
  polygone, pentagone, hexagone, diagonale ; rayon et diamètre ; justifier la nature d'une figure
  par ses propriétés ; construire sur papier uni ; codage des longueurs égales » — **[A]** proposer
  la notion **« Figures planes »** (CP à 6e) : sous-notions **« reconnaître et décrire »**,
  **« angles droits »**, **« reproduire et construire »**, **« cercle »**.
- CE2 « reconnaitre les axes de symétrie d'une figure (pliage, papier calque) ; compléter une
  figure pour la rendre symétrique sur quadrillage (axe vertical ou horizontal) » — **[A]**
  proposer la notion **« Symétrie axiale »** (CE2 à 6e au moins ; les programmes des cycles 3-4
  diront la suite — symétrie centrale en 5e, etc.).
- CP « positions relatives (gauche/droite, sur/sous…) ; plan de la classe ; assemblages de cubes et
  pavés d'après modèle ; coder un déplacement (avancer d'une case, pivoter d'un quart de tour),
  robot ≤ 10 instructions » · CE1 « plans d'espaces familiers, itinéraires, robot ≤ 15
  instructions dont 4 virages » · (rien au CE2) — **[A]** proposer la notion **« Repérage et
  déplacements »** (CP, CE1 ; le cycle 3 dira si elle continue — repérage sur quadrillage,
  programmation de déplacements Scratch en cycle 4…) : sous-notions **« positions et plans »**,
  **« coder un déplacement »**. Le codage de déplacements reste ici, PAS dans la branche
  Algorithmique (qui est Python-lycée) → **question P6**.

---

## Organisation et gestion de données

- CP « mener une enquête (caractère qualitatif, 2 à 5 valeurs, < 40 individus) ; présenter en
  tableau ou diagramme en barres ; construire et compléter un tableau à double entrée » · CE1
  « produire (< 100 individus, axe gradué de 1 en 1) ; lire et interpréter tableaux à double
  entrée et diagrammes en barres » · CE2 « caractères quantitatifs discrets ; échelle adaptée ;
  résoudre des problèmes à partir de tableaux et diagrammes » — **[N]**
  `Statistiques > Représenter des données` est marquée « 5e à 2de » → **« CP à 2de »** (les
  programmes des cycles 3 et 4 confirmeront la continuité CM1-6e) ; **[P]** proposer les
  sous-notions **« tableau à double entrée »** et **« enquête et collecte »** (les sous-notions
  `tableaux`, `diagrammes en barres`, `effectifs et fréquences` couvrent le reste).

## Sens inverse ([H])

Aucun : rien de ce que l'arbre marque CP-CE2 n'est étranger au programme 2025. Les niveaux des
notions « Entiers : … » collent bien au texte (numération CP ✓, division dès CE2 ✓, multiplication
dès le CP au sens « additions itérées » ✓).

---

## Référentiel (`curriculum_*`) : état et travail à prévoir

Constat (prod, 2026-10-07) : le référentiel contient 6 niveaux (6e : 95 points · 2de : 185 ·
1re spé : 173 · Tle spé : 262 · Tle comp. : 139 · Tle expertes : 153) — **rien pour CP, CE1, CE2**
(ni 5e, 4e, 3e, ni STMG, ni 1re générale hors spé). La contrainte `curriculum_themes_valid_grade`
accepte déjà les 18 codes de grade : il n'y a **que des données à créer**, pas de schéma.

L'Annexe 4 se prête très bien au modèle existant (thème → objectif → point) :

- **Thèmes** (par année) = les 4 domaines du programme ;
- **Objectifs** = les sous-parties (CP : Les nombres entiers · Les quatre opérations · Le calcul
  mental · La résolution de problèmes · Les longueurs et les masses · La monnaie · Le repérage dans
  le temps · Les solides · La géométrie plane · Le repérage dans l'espace · OGD — structure
  analogue en CE1/CE2, avec fractions et contenances en plus) ;
- **Points** = la colonne « Objectifs d'apprentissage » (libellés quasi prêts à l'emploi) ;
- Les trois sous-rubriques du calcul mental (faits numériques · numération · procédures) et les
  fluences chiffrées alimentent naturellement `curriculum_point_automatismes` et
  `regime_acquisition`.

Pipeline éprouvé : markdown source + script générateur → migration de seed (comme
`generate-curriculum-1re-spe-seed.ts`). **Rien n'est fait ici** : création des seeds = migration de
données en prod → décision de David, hors du chantier arbre. Fait mesuré (prod, 2026-10-07) : les
classes existantes sont 6e (2), 2de (2), 1re spé (3), 1re générale (1), Tle spé (1), Tle
expertes (1) — aucune classe de primaire aujourd'hui ; à David de dire si le seed cycle 2 est
prioritaire et dans quel ordre.

### Lien arbre ↔ référentiel (question rouverte le 2026-10-07)

La progression de phase 0 porte la ligne « pas de lien arbre ↔ programme officiel (A7 retiré) » :
la question avait été **retirée de la liste sans être posée**, ce n'est pas une décision de David.
David, ce jour : « il me semble qu'il y a un lien évident ». Le lien conceptuel est réel : chaque
**point** du programme parle d'une **notion/sous-notion** de l'arbre (« Additionner et soustraire
des fractions de même dénominateur », CE1 ↔ `Fractions : calculs > additionner et soustraire`),
et une notion marquée « CE1 à 4e » devrait couvrir des points dans chacun de ces programmes.
Le grain diffère (un nœud transversal ↔ N points par année), mais c'est une correspondance N-N
tout à fait matérialisable. Ce qu'un lien apporterait :

1. **Un seul rangement au lieu de deux** : les 1 005 modèles sont déjà tagués vers des points
   (1 026 lignes `question_template_points`) et la PR 1 ajoute `classification_node_id` — sans
   lien, chaque nouveau contenu devra être tagué deux fois, avec divergence garantie.
2. **Couverture du programme dérivable** : un exercice rangé dans un nœud, utilisé dans une classe
   d'un niveau donné → suggestion automatique des points couverts (cahier de texte → heatmap).
3. **Navigation croisée** : depuis un point du programme, retrouver les contenus de la banque ;
   depuis un nœud, voir les points couverts par niveau.
4. **Écarts requêtables** : la comparaison manuelle faite dans ce document (et dans
   `programmes-ecarts.md`) deviendrait une simple requête de contrôle.

Options (David tranche) :

- **Option 1 — table de correspondance** `nœud ↔ point` (N-N, additive, réversible) ; les deux
  taxonomies gardent leur vie propre, le lien est une donnée. **Reco.**
- **Option 2 — option 1 + dérivation** : le rangement dans l'arbre devient la saisie de référence,
  les points de programme d'un contenu sont dérivés via la correspondance (ajustables à la main) ;
  `question_template_points` devient une vue/suggestion.
- **Option 3 — statu quo** : deux taggings indépendants (c'est ce que « A7 retiré » impliquait) ;
  coût : double saisie et divergence.

---

## Questions pour David (dans l'ordre)

1. **P1 — Calcul posé** : « poser une addition/soustraction/multiplication » est un savoir-faire
   central du primaire. Sous-notion **« calcul posé »** dans chaque notion d'opération concernée,
   ou modalité hors arbre (comme « à trou ») ? Reco : sous-notion, car une fiche de primaire
   « poser des soustractions » doit pouvoir se ranger.
2. **P2 — Parité (CE1)** : sous-notion « pair ou impair » dans `Entiers : numération`, ou dans
   `Arithmétique > Divisibilité` (dont le niveau descendrait alors à CE1, cohérent avec D3) ?
   Reco : Divisibilité, pour ne pas créer deux maisons pour la même idée.
3. **P3 — Procédures de calcul mental** : le grain « ajouter 9, 19, 29 » reste-t-il au référentiel
   (reco), ou veut-on une sous-notion « procédures de calcul mental » par opération ?
4. **P4 — Produits cartésiens (CE2)** : sous-notion de « Problèmes arithmétiques » (reco), ou
   descendre la branche Dénombrement au CE2 ?
5. **P5 — Découpage des grandeurs** : quatre notions (Longueurs, Masses, Contenances, Monnaie) ou
   trois (Masses et contenances fusionnées) ? Et `Unités et conversions` : garder une notion
   transversale (descendue à CE1) ou tout ranger dans chaque grandeur ? Reco : 4 notions + une
   sous-notion « unités et conversions » par grandeur ; la notion transversale reste pour les
   unités composées (6e+).
6. **P6 — Coder un déplacement (CP-CE1)** : dans la nouvelle notion « Repérage et déplacements »
   (reco) ou dans la branche Algorithmique ?
7. **Confirmation** : appliquer les [N] sans ambiguïté (Fractions CE1-CE2, Durées CP+, Périmètres
   CE2, Statistiques CP+) en même temps que le lot lycée de `programmes-ecarts.md` ?
8. **P7 — Lien arbre ↔ référentiel** : option 1 (table de correspondance), option 2 (+ dérivation)
   ou statu quo ? (§ Lien arbre ↔ référentiel ci-dessus ; la question A7 avait été retirée sans
   être posée, David a signalé le 2026-10-07 qu'un lien lui semble évident.)

## Programmes reçus / manquants (état au 2026-10-07)

Reçus : 2de, 1re spé, Tle spé, Tle comp., Tle expertes (session précédente) · cycle 2 (programme
2025 + 3 livrets, cette session). Manquants pour couvrir tous les grades de Chiphre : **cycle 3**
(CM1, CM2, 6e), **cycle 4** (5e, 4e, 3e), **1re générale hors spécialité** (maths spécifiques de
l'enseignement scientifique), **1re et Tle technologiques** (au moins STMG, présentes dans les
grades de Chiphre). À vérifier à réception : millésimes (nouveaux programmes 2025-2026 du primaire,
programmes réviés du lycée).
