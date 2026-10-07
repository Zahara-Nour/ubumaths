# Arbre des notions et programme de Tle technologique : écarts (modèle ADR 0020)

> Analyse du 2026-10-07 — **programme nouveau dans le chantier** : l'enseignement commun de
> mathématiques de la terminale de la voie technologique (grade **`T_TECHNO`**, renommé
> depuis `T_STMG` le 2026-10-07 avec la PR #922) n'avait ni section v1, ni texte sauvegardé,
> ni seed en prod. Comparé à `arbre-notions.json` version 2026-10-07.9 (136 notions,
> 523 sous-notions ; 1re techno appliquée). **Rien n'est modifié** : ce document propose,
> David tranche.

## Texte comparé

« Annexe — Programme d'enseignement de mathématiques de la classe terminale de la voie
technologique » (11 p.), **fourni par David le 2026-10-07**, même vague d'annexes 2026
(mention IA ; sauvegardé : `progs-lycee/terminale-techno.pdf`). Structure identique à la 1re
techno — trois transversales (Vocabulaire ensembliste et logique · Algorithmique et
programmation sauf STD2A · **Automatismes**) et deux thématiques (Analyse : Suites
numériques, Fonctions exponentielles, Fonction logarithme décimal, Fonction inverse ·
Statistique et probabilités : Séries à deux variables, Probabilités conditionnelles,
Variables aléatoires discrètes finies), avec les rubriques Contenus / Capacités /
Commentaires / Situations algorithmiques (sauf STD2A), la variante **STD2A** (Activités
géométriques : coniques, perspective centrale) — et en plus une liste indicative de
**Thèmes d'étude** (optimisation linéaire et régionnement, Monte-Carlo, marches aléatoires,
initiation aux graphes et ordonnancement), supports possibles de l'épreuve orale, non
obligatoires.

Deux particularités notables : **la Tle techno a une rubrique Automatismes** (contrairement
à la Tle générale), où « les automatismes propres à la classe terminale figurent dans les
tirets en italique » ; et la partie Analyse est taillée pour l'information chiffrée
(exponentielles de base a, log décimal, taux moyen) — aucune trace de LA fonction exp ni de
ln.

## Ce que l'ADR 0020 change pour la Tle techno

1. **Automatismes à deux étages** : les puces non italiques renvoient aux années précédentes
   du parcours (cycle 4, 2de, 1re techno) → **références** ; les italiques automatisent des
   contenus de 1re/Tle techno (dérivée d'un polynôme ⩽ 3, coefficient directeur d'une
   tangente, signe du second degré par image mentale, situation géométrique) → références
   **internes au parcours**. Et **un contenu orphelin** : l'« indice de base 100 »
   (interpréter, calculer, taux entre deux valeurs), qu'aucun programme antérieur
   n'introduit → il devient, conformément à la règle posée au doc 2de, **un point de Tle
   techno en régime automatisme** (question Y2 : avec ou sans sous-notion).
2. **Les lots ens. sci. et 1re techno paient à nouveau** : « fonctions x ↦ aˣ » et « taux
   d'évolution moyen » (créés pour le module de 1re) reçoivent ici leurs pointeurs techno,
   comme anticipé ; « changement de variable » (Statistique à deux variables) existait
   depuis l'origine pour la Tle comp. ; les sommes de suites, la loi binomiale, les
   coefficients binomiaux, le triangle de Pascal, les probabilités totales ont leurs nœuds.
3. **Pas de seed prod `T_TECHNO`** : seed direct dans l'architecture cible, comme les autres
   programmes techno.

## Légende

**[C]** nœud existant (la ligne devient un ou des points de Tle techno dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**0 notion** à créer, **~4 sous-notions** (logarithme décimal — avec un renommage de notion
proposé —, indices, et côté STD2A coniques et perspective centrale), le reste en points et
références.

---

## Vocabulaire ensembliste et logique

Identique à la 1re techno (ensembles, Card, produit cartésien ; connecteurs, statut d'une
égalité et des lettres, contre-exemple, réciproque/contraposée, condition nécessaire /
condition suffisante / équivalence logique) — **[C]** `Ensembles` et `Logique`, pointeurs de
Tle techno, entretien pour l'essentiel. Commentaires (raisonnements explicités, filtres de
données pour travailler ET/OU/NON) : **[T]** cadrage.

## Algorithmique et programmation (sauf STD2A)

Identique à la 1re techno : Variables (générateur aléatoire pour Bernoulli, compteur,
accumulateur), Fonctions (entrées/sorties, structurer), Listes (générer, éléments et
indices, itérer), Sélection de données (fichier réel, tableau croisé sur deux critères) —
**[C]** `Algorithmique > Variables et instructions, Boucles, Fonctions Python, Listes` +
points sous `Statistiques > Tableaux croisés` pour la sélection de données (traitement X2
reconduit).

## Activités géométriques (uniquement série STD2A) — question Y4

- « Coniques : sections planes d'un cône de révolution ; cercle, ellipse, parabole,
  hyperbole ; notion de tangente à une conique en un point ; raccordement d'arcs de
  cercles, d'ellipses ou de courbes de fonctions » — **[P]** `Figures planes` >
  **« coniques »** (filtre : reconnaître et tracer les quatre coniques, tangentes,
  raccordements — famille design et enrichissement classique) ; le geste de section du cône
  pointe aussi `Solides > sections planes` (créée au lot 1re techno pour le cube et le
  cylindre — le cône s'y ajoute en points).
- « Perspective centrale : projection centrale, propriétés conservées ou non, plans
  frontaux ; point de fuite d'une droite, point de fuite principal, ligne de fuite d'un plan
  non frontal, ligne d'horizon ; image d'un quadrillage, de solides simples » — **[P]**
  `Solides` > **« perspective centrale »** (filtre : famille art/photographie — points de
  fuite, horizon — bien distincte de la « perspective cavalière » de 1re, projection
  parallèle).

## Automatismes (références + un point neuf — règle ci-dessus)

- **Proportions et pourcentages** (formes d'une proportion, proportion de proportion) →
  `Pourcentages` (cycle 4, 2de).
- **Évolutions et variations** (additif ↔ multiplicatif, taux, successives, réciproque) →
  `Évolutions > variations en pourcentage, évolutions successives et réciproque` ; en
  italique : « situation se modélisant par une suite géométrique » → référence interne
  (1re techno, suites géométriques). **« Interpréter un indice de base 100, calculer un
  indice, calculer le taux d'évolution entre deux valeurs »** : contenu neuf → **point de
  Tle techno en régime automatisme** rattaché à `Évolutions` (question Y2 : sous-notion
  **« indices »** ou simples points).
- **Calcul numérique et algébrique** (fractions, puissances, écritures, ordre de grandeur,
  conversions, premier degré, x² = a, signes, isoler une variable, application numérique
  d'une formule, développer/factoriser/réduire) → références cycle 4 / 2de (`Fractions`,
  `Puissances : calculs`, `Décimaux : numération > arrondir`, `Unités et conversions`,
  `Équations/Inéquations : premier degré`, `Équations : produit et quotient > x² = a`,
  `Calcul littéral > isoler une variable`…) ; en italique : dérivée d'un polynôme ⩽ 3,
  coefficient directeur de la tangente par la dérivée → références internes (1re techno,
  Dérivation).
- **Fonctions et représentations** (images/antécédents, résolutions graphiques, signe et
  tableau, appartenance à une courbe, droites) → `Généralités sur les fonctions`,
  `Fonctions affines`, `Géométrie repérée > équations de droites` ; en italique : signe du
  second degré factorisé par image mentale de la parabole, coefficient directeur d'une
  tangente lu graphiquement → références internes (1re techno).
- **Représentations graphiques de données chiffrées** → `Représenter des données`.

## Analyse

- **Suites numériques** — suites arithmétiques : moyenne arithmétique de deux nombres,
  terme de rang n en fonction de n, **somme des n premiers termes, notation Σ** ; suites
  géométriques à termes positifs : moyenne géométrique, terme en fonction de n, somme ;
  prouver que trois nombres sont des termes consécutifs, déterminer la raison, calculer et
  reconnaître une somme — **[C]** `Suites arithmétiques` et `Suites géométriques >
terme général, somme des termes, reconnaître, raison` (les sommes arrivent en Tle pour ce
  parcours — nœuds existants, introduits par la 1re spé : pointage pur ; moyennes
  arithmétique et géométrique, notation Σ = points) ; situations algorithmiques (sommes de
  carrés, de cubes, d'inverses en Python, lien Σ-accumulateur) — **[C]** `Suites et
modélisation > algorithmes`.
- **Fonctions exponentielles** — x ↦ aˣ (a > 0) prolongement de (aⁿ), **extension à ℝ par
  a⁻ˣ = 1/aˣ** (le module de 1re restait sur x ⩾ 0), sens de variation et allure selon a,
  variations de k·aˣ selon k et a, propriétés algébriques, exposant 1/n — **[C]**
  `Fonction exponentielle > fonctions x ↦ aˣ` (créée au lot ens. sci., la Tle techno
  l'étend) ; « calculer le taux d'évolution moyen équivalent à n évolutions successives »
  — **[C]** `Évolutions > taux d'évolution moyen` (créée au lot ens. sci.) ; situation
  algorithmique (intercaler un point par moyennes arithmétique/géométrique) — points.
- **Fonction logarithme décimal** — définition (unique solution de 10ˣ = b), notation log,
  sens de variation, propriétés algébriques (log(ab), log(aⁿ), log(a/b)) ; résoudre
  aˣ = b, xᵃ = b, inéquations aˣ < b, aⁿ < b ; transformer des expressions ; ordre de
  grandeur et nombre de chiffres ; repères semi-logarithmiques (commentaire STI2D/STL) —
  **[P]** sous-notion **« logarithme décimal »**, avec un **renommage proposé** de la notion
  `Logarithme népérien` → **`Logarithmes`** (question Y3) : l'arbre central gagne le cousin
  décimal de ln sans dupliquer une notion ; filtre : résolution de aˣ = b (annuités, taux
  moyen, seuils), familles purement techno. ⚠️ Le renommage touche la table de
  correspondance (`correspondance/modeles.csv`, `exercices.csv`, `tags.csv` utilisent
  « Logarithme népérien ») — soit on les retouche au passage, soit on l'accepte jusqu'à la
  relance de la correspondance, déjà prévue sur l'arbre élargi.
- **Fonction inverse** — comportement aux bornes (approche intuitive des asymptotes),
  dérivée et sens de variation, courbe ; étudier des combinaisons linéaires de 1/x et de
  polynômes ⩽ 3 — **[C]** `Fonction inverse > définition et courbe, variations` (points de
  Tle techno ; la dérivée de 1/x réinvestit `Dérivation > fonctions dérivées`).

## Statistique et probabilités

- **Séries à deux variables : changement de variable** — changement de variable dans
  l'étude graphique (u², 1/t, 1/√n, log y), ajustement se ramenant à un ajustement affine ;
  moindres carrés présentés sans théorie ; situations algorithmiques (automatiser
  Σ(yᵢ − (axᵢ + b))², minimiser par balayage) — **[C]** `Statistique à deux variables >
changement de variable, ajustement affine` (la sous-notion existait depuis l'origine pour
  la Tle comp. — introducteurs parallèles).
- **Probabilités conditionnelles** — formule des probabilités totales pour une partition ;
  arbres (construire, interpréter les pondérations, multiplier les branches, calculer) —
  **[C]** `Probabilités conditionnelles > probabilités totales, arbres pondérés`.
- **Variables aléatoires discrètes finies** — espérance d'une variable aléatoire discrète
  (calculer, interpréter) — **[C]** `Variables aléatoires > espérance` ; **loi binomiale
  B(n, p)**, espérance admise, reconnaître et identifier les paramètres, {X = k} sur un
  arbre, P(X = 0), P(X = 1), P(X = n)…, P(X = k) par les coefficients — **[C]**
  `Loi binomiale > reconnaître une loi, calcul de probabilités, espérance et variance` ;
  coefficients binomiaux et triangle de Pascal (n ⩽ 10, formule de Pascal par les chemins,
  génération algorithmique du triangle) — **[C]** `Loi binomiale > coefficients binomiaux`
  et `Dénombrement > Combinaisons > triangle de Pascal` (pointage sans toucher au niveau de
  Dénombrement : la techno prend les coefficients « par les chemins », sans la combinatoire
  des ensembles).

## Thèmes d'étude et [T]

La liste indicative (optimisation linéaire et régionnement du plan, méthode de Monte-Carlo,
simulation de marches aléatoires, initiation aux graphes et ordonnancement) : **non
obligatoire**, supports de l'épreuve orale — ni nœuds ni points ; le jour où David voudra
des fiches « graphes en techno », la branche `Graphes` (Expertes) est là. Commentaires de
cadrage, contextes (annuités, taux mensuel équivalent, étalonnage, génie civil), histoire et
actualité : **[T]**.

## Sens inverse : ce que la Tle techno ne pointe pas

- `Fonction exponentielle > propriétés algébriques, dérivée, variations, courbe, équations
et inéquations` : LA fonction exp (base e) n'existe pas en techno — tout vit dans
  « fonctions x ↦ aˣ ».
- `Logarithme népérien > réciproque de l'exponentielle, dérivée…` : ln n'existe pas en
  techno — d'où la sous-notion « logarithme décimal » (Y3).
- `Dérivation` : pas de nouveau contenu (les dérivées restent celles de 1re techno,
  polynômes ⩽ 3 et désormais 1/x) — pointage d'entretien.
- `Variables aléatoires > variance et écart-type, compléter une loi, jeux et gains` ;
  `Sommes et concentration` ; `Échantillonnage` : la Tle techno s'arrête à l'espérance et à
  la binomiale — pas de variance, pas de concentration.
- La spécialité « Physique-chimie et mathématiques » (STI2D/STL), à nouveau mentionnée
  (dérivée de 1/x « déjà calculée » par ces élèves en 1re) : programme distinct, toujours
  hors périmètre.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide tout » (Y1-Y5 — libellé « Tle techno »,
> indice de base 100 = point en régime automatisme + sous-notion « indices », renommage
> `Logarithme népérien` → `Logarithmes` appliqué, CSV de correspondance retouchés, STD2A
> couverte). Appliqué à l'arbre : version 2026-10-07.10 — 136 notions, 527 sous-notions.

1. **Y1 — Libellé « Tle techno »** et traitement des Automatismes : références vers le
   parcours (cycle 4, 2de, 1re techno) + références internes pour les italiques, et
   l'indice de base 100 = point de Tle techno en régime automatisme (seul contenu neuf de
   la rubrique — le cas prévu par la règle de la 2de). (reco : oui.)
2. **Y2 — « indices »** : sous-notion d'`Évolutions` (filtre : les fiches « indice base
   100 », classique tertiaire STMG, distinctes des taux) — ou simples points en régime
   automatisme ? (reco : sous-notion ; niveau → « 4e à 2de, 1re ens. sci., Tle techno ».)
3. **Y3 — « logarithme décimal »** + renommage `Logarithme népérien` → **`Logarithmes`**
   (niveau → « Tle, Tle comp., Tle techno ») — ou sous-notion sans renommage (une notion
   nommée « népérien » contenant le décimal) ? Le renommage retouche les 3 CSV de
   correspondance. (reco : oui, renommer.)
4. **Y4 — STD2A Tle** : « coniques » (Figures planes) et « perspective centrale »
   (Solides) ; sections du cône = points sous `Solides > sections planes`. Niveaux des
   notions-mères : « CP à 4e, 1re techno » → « CP à 4e, 1re et Tle techno » (Figures
   planes), « CP à 3e, 1re techno » → « CP à 3e, 1re et Tle techno » (Solides).
   (reco : oui.)
5. **Y5 — Validation d'ensemble** : niveaux — `Fonction exponentielle` → « 1re, 1re ens.
   sci., Tle, Tle techno », `Évolutions` → « 4e à 2de, 1re ens. sci., Tle techno »,
   `Statistique à deux variables` → « 1re ens. sci., 1re techno, Tle comp., Tle techno »
   (4 libellés : dire si tu préfères abréger), `Loi binomiale` → « Tle, Tle comp.,
   Tle techno » ; puis application au JSON + diagramme — 136 notions, **527 sous-notions**
   si tout est validé.
