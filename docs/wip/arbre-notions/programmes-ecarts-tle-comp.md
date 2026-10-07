# Arbre des notions et programme de Maths complémentaires : écarts (reprise ADR 0020)

> Reprise du 2026-10-07 : la section « Tle comp. » de `programmes-ecarts.md` (ancien modèle)
> est réécrite ici au gabarit validé — chaque ligne du programme devient un **point rattaché
> à un nœud**, grain au **filtre**. Comparé à `arbre-notions.json` version 2026-10-07.10
> (136 notions, 527 sous-notions ; spé, ens. sci. et voie techno appliqués). Ce document
> **remplace** la section Tle comp. de l'ancien ; il ne restera plus que la section Expertes
> à reprendre. **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme de l'enseignement optionnel de mathématiques complémentaires de la
classe terminale de la voie générale » (12 p.), **refourni par David le 2026-10-07**, même
vague d'annexes 2026. Contenu **vérifié identique** au texte déjà sauvegardé
(`progs-lycee/complementaires.txt`), base de l'ancienne analyse : la présente analyse vaut
pour les deux. Structure singulière : un préambule (avec le Vocabulaire ensembliste et
logique), **neuf Thèmes d'étude** (Modèles définis par une fonction d'une variable · Modèles
d'évolution · Approche historique du logarithme · Calculs d'aires · Répartition des
richesses, inégalités · Inférence bayésienne · Répétition d'expériences indépendantes,
échantillonnage · Temps d'attente · Corrélation et causalité) et des **Contenus** (Analyse :
Suites · Fonctions : continuité, dérivabilité, limites · Primitives et équations
différentielles · Fonctions convexes · Intégration ; Probabilités et statistique : Lois
discrètes · Lois à densité · Statistique à deux variables ; Algorithmique sans notion
nouvelle). Les professeurs abordent **au moins six thèmes** en couvrant tous les contenus.
Pas de rubrique Automatismes (mention en préambule seulement).

Règle d'extraction : les **Contenus et capacités attendues = points** ; les Thèmes d'étude =
contextes de mise en œuvre (leurs « contenus associés » renvoient aux Contenus) — un seul
élément n'existe QUE dans un thème : les **déciles et le rapport interdécile** (Répartition
des richesses), traités ci-dessous.

## Ce que l'ADR 0020 change pour la Tle comp.

1. **La moisson des lots précédents est maximale** : « encadrement d'une solution » et
   « méthode d'Euler » (Tle spé), « intervalle de fluctuation » (Tle spé), « probabilités
   totales », « épreuves indépendantes successives », « inversion du conditionnement »
   (1re spé/2de), le renommage `Logarithmes` (Tle techno), et les nœuds `formes u′eᵘ, 2uu′,
u′/u` conservés hier servent exactement ici (la Tle comp. se limite à ces trois formes de
   primitives). Les ex-[P] « même ajout, avec Tle comp. » de l'ancienne analyse passent
   tous en [C].
2. **Le seed prod `T_COMP` est DÉJÀ sur ce texte** (vérifié le 2026-10-07, lecture seule) :
   139 points, les dix objectifs du nouveau programme (Lois discrètes, Lois à densité,
   Statistique à deux variables…). Pas de péremption ; les Thèmes d'étude n'y sont pas des
   thèmes propres, conformément à leur statut.
3. **Les requalifications déjà actées se reconduisent** : limites du logarithme = points
   sous `courbe` (V3), loi de Bernoulli = points sous `schéma de Bernoulli` (V4),
   interpolation/extrapolation = points sous `ajustement affine` (W4).

## Légende

**[C]** nœud existant (la ligne devient un ou des points de Tle comp. dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**0 notion** à créer, **~5 sous-notions** (fonction réciproque, absence de mémoire, fonction
de répartition, coefficient de corrélation, déciles et rapport interdécile), 1 renommage de
sous-notion (`Autres lois > espérance` → « espérance et variance »), le reste en points.

---

## Vocabulaire ensembliste et logique

Ensembles, notations, n-uplets, produit cartésien, Card(A) — **[C]** `Ensembles` ;
propositions, connecteurs, négation de propositions simples (sans implication ni
quantificateurs), contre-exemple, implication/équivalence mobilisées, réciproque (pas de
contraposée ici), quantifications (∀ et ∃ non exigibles) — **[C]** `Logique` (pointage
d'entretien). Σ « pour écrire, pas comme outil de calcul » — **[T]**.

## Thèmes d'étude

Neuf thèmes, contextes de mise en œuvre — pas de points propres, leurs contenus associés
renvoient aux Contenus. À noter pour le pointage : l'**Inférence bayésienne** (formule de
Bayes, vrais/faux positifs, sensibilité, spécificité, valeurs prédictives) vit sur
`Probabilités conditionnelles > inversion du conditionnement, probabilités totales` — la 2de
y avait déjà mis les tests diagnostiques, la formule de Bayes devient des points de Tle
comp. ; le **Temps d'attente** motive « absence de mémoire » (ci-dessous) ; **Répartition
des richesses** introduit le seul contenu orphelin des thèmes :

- « statistique descriptive : caractéristiques de dispersion (médiane, quartiles, déciles,
  rapport interdécile) » ; courbe de Lorenz et indice de Gini en problèmes possibles —
  **[P]** `Statistiques > Indicateurs` > **« déciles et rapport interdécile »** (filtre : la
  famille « inégalités et répartition » — déciles, rapport interdécile, Lorenz/Gini en
  contexte — propre à la Tle comp. et aux SES ; niveau de la notion → « 5e à 2de,
  Tle comp. »).

## Analyse

- **Suites numériques, modèles discrets** — approche intuitive de la limite, opérations,
  passage à la limite dans les inégalités, gendarmes — **[C]** `Limites de suites >
définition, opérations, comparaison et encadrement` ; limite de (qⁿ) pour q > 0 — **[C]**
  `> suites géométriques` ; **limite de la somme des termes d'une suite géométrique
  (0 < q < 1)** (+ démonstration possible) — **[C]** points sous `> suites géométriques`
  (l'ancienne analyse proposait une sous-notion ; requalifié : la sous-notion couvre le
  comportement de qⁿ et de ses sommes — la série géométrique n'est pas une famille à part à
  ce niveau) ; suites arithmético-géométriques (solution constante, toutes les solutions,
  comportement) — **[C]** `Suites arithmético-géométriques > solution constante, suite
auxiliaire, limite` ; modéliser, représenter uₙ₊₁ = f(uₙ), conjecturer — **[C]** `Suites
récurrentes > escalier, point fixe` ; algorithmes (seuils, termes successifs, valeurs
  approchées de π, ln 2, √2) — **[C]** `Suites et modélisation > seuil, algorithmes`.
- **Fonctions : continuité, dérivabilité, limites** — limite et continuité intuitives,
  dérivable ⇒ continue (admis) — **[C]** `Continuité > continuité en un point` (créée au
  lot Tle spé) ; asymptotes horizontales et verticales, limites des fonctions de référence,
  opérations admises, comparaison en contexte — **[C]** `Limites de fonctions > limite en
un point, asymptotes, opérations, comparaison et encadrement` ; TVI admis, fonctions
  strictement monotones, nombre de solutions de f(x) = k par le tableau — **[C]**
  `Continuité > valeurs intermédiaires` ; valeurs approchées et encadrement d'une solution,
  algorithmes balayage/dichotomie/Newton — **[C]** `> encadrement d'une solution` (créée au
  lot Tle spé).
- « Réciproque d'une fonction continue strictement monotone sur un intervalle,
  représentation graphique » (illustrée par carré/racine, exp/ln, sans théorie) — **[P]**
  `Continuité` > **« fonction réciproque »** (filtre : lecture graphique de la réciproque,
  symétrie par rapport à y = x — famille propre à la Tle comp., la Tle spé l'exclut hors
  exponentielle).
- Logarithme : ln réciproque de exp, équation fonctionnelle, dérivée, limites,
  représentation graphique (+ démonstrations ln(ab), ln(1/a), dérivée de ln) ; résoudre
  équations et inéquations via exp/ln ; ln qⁿ = n ln q pour un seuil — **[C]**
  `Logarithmes > réciproque de l'exponentielle, propriétés algébriques, dérivée, courbe,
équations et inéquations` (les limites = points sous `courbe`, requalification V3
  reconduite) + `Suites et modélisation > seuil`.
- Dérivées de f(ax + b), eᵘ, ln u, u² (+ démonstrations dérivées de ln u, exp u) ; calculer
  dérivée et limites, tableau de variation, allure des courbes de référence — **[C]**
  `Dérivation > fonctions composées, étude de fonction`.
- **Primitives et équations différentielles** — notion de solution, vérifier qu'une
  fonction est solution — **[C]** `Équations différentielles > Généralités > notion de
solution` ; primitives, y′ = f, deux primitives diffèrent d'une constante — **[C]**
  `y′ = f > primitives : notion` ; primitives par lecture inverse (fonctions de référence,
  formes 2uu′, eᵘu′, u′/u — et pas la forme générale) — **[C]** `> primitives des fonctions
de référence, formes u′eᵘ, 2uu′, u′/u` (les nœuds « cas particuliers » conservés au lot
  Tle spé servent exactement ici) ; y′ = ay, y′ = ay + b (solution constante, solution
  générale, allure) — **[C]** `y′ = ay, y′ = ay + b, Généralités > allure des courbes` ;
  méthode d'Euler (résolution approchée) — **[C]** `Généralités > méthode d'Euler` (créée
  au lot Tle spé).
- **Fonctions convexes** — dérivée seconde, convexité par sécantes/tangentes (équivalences
  admises), croissance de f′, positivité de f″, point d'inflexion, lecture graphique,
  étudier la convexité — **[C]** `Convexité > dérivée seconde, caractérisations, point
d'inflexion, lecture graphique` (pas d'inégalités de convexité : sens inverse).
- **Intégration** — intégrale d'une fonction continue positive comme aire, notation,
  relation de Chasles, signe quelconque — **[C]** `Intégrale et aire > aire algébrique` et
  `Calcul d'intégrales > relation de Chasles` ; valeur moyenne (comprise entre les bornes,
  approche graphique et numérique, estimer, interpréter) — **[C]** `Valeur moyenne` (les
  trois sous-notions) ; méthode des rectangles (+ trapèzes, Monte-Carlo en algorithmes) —
  **[C]** `Calcul d'intégrales > méthode des rectangles` ; fonction intégrale
  (+ démonstration de sa dérivée) — **[C]** `Fonction intégrale > dérivée d'une fonction
intégrale` ; ∫ = F(b) − F(a) — **[C]** `Calcul d'intégrales > par une primitive` ; aire
  sous une courbe, entre deux courbes — **[C]** `Intégrale et aire > aire entre deux
courbes, lecture graphique` (pas d'intégration par parties : sens inverse).

## Probabilités et statistique

- **Lois discrètes** — loi uniforme sur {1, …, n}, espérance (+ démonstration) — **[C]**
  `Autres lois > loi uniforme discrète` ; épreuve et loi de Bernoulli (définition,
  espérance, écart type, + démonstration) — **[C]** points sous `Loi binomiale > schéma de
Bernoulli` (requalification V4 reconduite) ; schéma de Bernoulli, arbre — **[C]**
  `> schéma de Bernoulli` ; coefficients binomiaux, triangle de Pascal, symétrie —
  **[C]** `> coefficients binomiaux` ; loi binomiale (expression, espérance et écart type
  admis, représentation graphique, P(X = k), P(X ⩽ k), + démonstration de l'espérance pour
  n ⩽ 3) — **[C]** `> calcul de probabilités, espérance et variance` ; identifier
  Bernoulli, binomiale, géométrique — **[C]** `> reconnaître une loi` ; intervalle I tel
  que P(X ∈ I) ⩽ α ou ⩾ 1 − α — **[C]** `> intervalle de fluctuation` (créée au lot
  Tle spé) ; loi géométrique (définition, expression, espérance admise, représentation
  graphique) — **[C]** `Autres lois > loi géométrique` ; probabilités conditionnelles et
  répétitions d'expériences — **[C]** `Probabilités conditionnelles` (pointage, formule de
  Bayes comprise via `inversion du conditionnement`).
- « propriété caractéristique de la loi géométrique (absence de mémoire, + démonstration) »
  et « propriété d'absence de mémoire de la loi exponentielle » (thème Temps d'attente) —
  **[P]** `Autres lois` > **« absence de mémoire »** (filtre : la famille temps d'attente —
  caractérisation discrète et continue, paradoxe de l'inspection — traverse deux lois, un
  nœud la tient).
- **Lois à densité** — notion de densité par l'exemple, probabilité comme aire, « est-ce
  une densité ? », calculer des probabilités — **[C]** `Autres lois > densité et aire` ;
  loi uniforme sur [0, 1] puis [a, b] (densité, répartition, espérance, variance) — **[C]**
  `> loi uniforme continue` ; loi exponentielle (densité, répartition, espérance) —
  **[C]** `> loi exponentielle` ; simulations (Bernoulli ou dé depuis la loi uniforme,
  somme de n variables) — points d'algorithmes.
- « fonction de répartition x ↦ P(X ⩽ x) » — **[P]** `Autres lois` > **« fonction de
  répartition »** (filtre : lire et exploiter F, lien densité-répartition — le geste
  graphique propre aux lois continues).
- « espérance et variance d'une loi à densité, expressions sous forme d'intégrales » —
  **[C]** avec un **renommage** : `Autres lois > espérance` → **« espérance et variance »**
  (aligné sur `Loi binomiale > espérance et variance` ; la variance arrive ici, pas besoin
  d'une sous-notion à part).
- **Statistique à deux variables quantitatives** — nuage, point moyen — **[C]**
  `Statistique à deux variables > nuage de points, point moyen` ; ajustement affine,
  **droite des moindres carrés** (déterminée par calculatrice, logiciel ou calcul,
  - démonstration possible), interpoler/extrapoler — **[C]** `> ajustement affine` (droite
    des moindres carrés et interpolation/extrapolation = points, requalifications
    reconduites) ; ajustement par changement de variable — **[C]** `> changement de
variable`.
- « coefficient de corrélation » — **[P]** `Statistique à deux variables` >
  **« coefficient de corrélation »** (filtre : quantifier la force du lien — le cœur du
  thème Corrélation et causalité, famille d'interprétation propre).

## Algorithmique et programmation

« Reprend les programmes de seconde et de première sans introduire de notion nouvelle » —
**[T]** entretien (`Variables et instructions, Boucles, Fonctions Python, Listes`).

## [T] et Histoire des mathématiques

Rubriques d'histoire (Neper, Briggs, quadrature de l'hyperbole, Ars Conjectandi, Quételet,
Student et Fisher, l'IA et l'apprentissage machine…), problèmes possibles des thèmes
(Lorenz et Gini, Monty Hall-like « de quelle urne vient la boule ? », tests d'hypothèse,
fourchettes de sondage, paradoxe de l'inspection, Verhulst, proie-prédateur…) :
enrichissements de contexte — ni nœuds ni points. Algorithmes Briggs et Brouncker : idem.

## Sens inverse : nœuds marqués Tle comp. sans pointeur de Tle comp.

- `Convexité > inégalités de convexité` : le programme s'arrête à reconnaître et étudier.
- `Calcul d'intégrales > intégration par parties, linéarité, positivité et inégalités,
suites d'intégrales` : hors programme de l'option (seuls Chasles, primitive et rectangles
  sont nommés).
- `Équations différentielles > y′ = f > forme (v′∘u)×u′` et `sinus et cosinus` : Tle spé
  seulement (la Tle comp. se limite à 2uu′, eᵘu′, u′/u).
- `Limites de fonctions > croissances comparées, formes indéterminées` : non nommées.
- `Fonctions trigonométriques`, `Sommes et concentration`, `Échantillonnage` : rien en
  Tle comp.
- `Dérivation > taux de variation, approximation affine, dérivabilité en un point,
opérations sur les dérivées, position relative` : rappels de 1re, pointage d'entretien
  au plus.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide » (Z1-Z4 selon les recos — 5 sous-notions,
> renommage « espérance et variance », requalifications reconduites). Appliqué à l'arbre :
> version 2026-10-07.11 — 136 notions, 532 sous-notions.

1. **Z1 — Analyse** : « fonction réciproque » (Continuité) ; la limite de la somme des
   termes d'une suite géométrique = simples points sous `Limites de suites > suites
géométriques`. (reco : oui, points.)
2. **Z2 — Lois** : « absence de mémoire » et « fonction de répartition » (Autres lois) ;
   renommage `Autres lois > espérance` → « espérance et variance » ; la loi de Bernoulli
   reste des points sous `schéma de Bernoulli` (reconduction Tle spé). (reco : oui, oui,
   renommer, points.)
3. **Z3 — Statistiques** : « coefficient de corrélation » (Statistique à deux variables) ;
   « déciles et rapport interdécile » (Indicateurs, niveau → « 5e à 2de, Tle comp. ») ; la
   droite des moindres carrés et l'interpolation/extrapolation restent des points sous
   `ajustement affine`. (reco : oui, oui, points.)
4. **Z4 — Validation d'ensemble** : application au JSON + diagramme — 136 notions,
   **532 sous-notions** si tout est validé. Après quoi il ne restera que la section
   **Expertes** de l'ancienne analyse à reprendre.
