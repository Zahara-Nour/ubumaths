# Arbre des notions et maths de l'enseignement scientifique de 1re : écarts (modèle ADR 0020)

> Analyse du 2026-10-07 — **programme nouveau dans le chantier** : le « module spécifique »
> de mathématiques intégré à l'enseignement scientifique de 1re générale (les élèves qui n'ont
> pas pris la spécialité) n'avait **ni section dans `programmes-ecarts.md`, ni texte
> sauvegardé, ni seed en prod**. C'est l'ex-« maths spécifiques » de la liste des programmes
> manquants ; côté site, le grade `1_GEN` (« 1ère générale (maths spécifiques) ») lui
> correspond — le texte officiel parle bien de « module spécifique », le nom du grade colle.
> Comparé à `arbre-notions.json` version 2026-10-07.7 (136 notions, 517 sous-notions).
> **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme de mathématiques intégré à l'enseignement scientifique en classe de
première générale » (7 p.), **fourni par David le 2026-10-07**, même vague d'annexes 2026
(sauvegardé : `progs-lycee/premiere-ens-sci.pdf`). Structure inédite : un préambule, une
partie transversale **Automatismes**, puis trois parties thématiques en **deux colonnes** —
« Situations et problèmes » / « Contenus mathématiques », avec la règle d'or : **« seuls sont
exigibles des élèves les contenus mathématiques de la colonne de droite, mobilisés dans les
capacités attendues »**. Les parties : Analyse de l'information chiffrée (statistiques) ·
Phénomènes aléatoires (conditionnelles, indépendance) · Phénomènes d'évolution, modélisation
par des fonctions (Variation linéaire · Modélisation quadratique · Variation exponentielle).
Pas de géométrie, pas de logique formalisée, pas de section Python (l'algorithmique et le
tableur sont transversaux).

Règle d'extraction des points : colonne de droite + capacités attendues = points ; colonne de
gauche (mouvement parabolique, Monty Hall, Malthus, carbone 14…) = contextes, **[T]**.

## Ce que l'ADR 0020 change pour ce module

1. **Les Automatismes sont identiques, mot pour mot, à ceux de la 1re spé** (cinq rubriques,
   mêmes puces, même phrase sur la liste de 2de à entretenir) → des **références**
   `curriculum_point_automatismes` portées par le grade `1_GEN`. ⚠️ **Précision de David
   (2026-10-07)** : une référence vise un point des années **précédentes du parcours de
   l'élève** (cycle 4, 2de) ou un point du **même programme** (contenu neuf de l'année) —
   **jamais un point de `1_SPE`**, programme parallèle que ces élèves ne suivent pas. Si les
   cibles coïncident avec celles du doc 1re spé, c'est uniquement parce que ce sont des
   points de cycle 4 et de 2de, communs aux deux parcours ; la seule puce dont la cible
   diffère est « signe d'une expression factorisée du second degré », référence **interne**
   au point du module (Modélisation quadratique) — comme en spé elle vise le point de la
   spé, chacun chez soi. Aucun point nouveau. Cette contrainte (le point référencé appartient
   au parcours du grade) est à inscrire dans la spécification du schéma cible.
2. **Un programme parallèle, pas antérieur** : il introduit, pour sa population, des contenus
   que la 1re spé introduit par ailleurs (suites arithmétiques et géométriques, parabole,
   conditionnelles). Affaire de **pointage** : les deux programmes pointent les mêmes nœuds,
   chacun avec ses points. Les niveaux indicatifs ne bougent que là où le module introduit un
   contenu que PERSONNE d'autre n'introduit (taux d'évolution moyen, fonctions x ↦ aˣ,
   statistique bivariée avant la Tle comp.) — d'où la question du **libellé** de ce niveau
   dans le JSON (W1).
3. **Il n'existe pas de seed prod `1_GEN`** (vérifié : les grades seedés sont 2, 1_SPE,
   T_SPE, T_COMP, T_EXP, 6). Ce module sera seedé directement dans l'architecture cible.

## Légende

**[C]** nœud existant (la ligne devient un ou des points du module dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**0 notion** à créer, **2 sous-notions** (taux d'évolution moyen, fonctions x ↦ aˣ), tous les
automatismes en références, le reste en points — l'arbre couvre déjà ce programme modeste,
taillé pour la culture mathématique du citoyen.

---

## Automatismes (tous : RÉFÉRENCES du module vers cycle 4 / 2de / lui-même — règle ci-dessus)

Les cibles ci-dessous sont toutes des points de **cycle 4 ou de 2de** (années du parcours de
ces élèves), sauf la référence interne signalée : **Évolutions et variations** → `Évolutions >
variations en pourcentage, évolutions successives et réciproque` ; **Calcul numérique et
algébrique** → `Équations : produit et quotient > produit nul`, `Fonctions affines >
variations et signe`, `Inégalités > signe d'une expression`, `Calcul littéral`, et le signe
d'une expression factorisée du second degré en **référence interne** au point du module ;
**Fonctions et représentations** → `Généralités sur les fonctions > résolution graphique,
signe, variations`, `Fonctions affines`, `Géométrie repérée > équations de droites` ;
**Statistiques** → `Représenter des données`, `Indicateurs` (dont boîte à moustaches) ;
**Probabilités** → `Probabilités conditionnelles > tableaux croisés, arbres pondérés,
inversion du conditionnement`. **[C]**/références partout.

## Analyse de l'information chiffrée

- « analyse statistique de deux caractères qualitatifs ; tableau croisé d'effectifs ;
  croisement par représentation graphique (barres, circulaires) » — **[C]** `Statistiques >
Tableaux croisés > tableau croisé d'effectifs` (+ `Représenter des données > diagrammes en
barres, diagrammes circulaires` pour la lecture croisée).
- « analyse statistique de deux caractères quantitatifs ; nuage de points ; ajustement
  affine, point moyen ; interpolation, extrapolation » + capacités (tableur, ajustement pour
  interpoler/extrapoler, coordonnées du point moyen) — **[C]** `Statistiques > Statistique à
deux variables > nuage de points, point moyen, ajustement affine` (interpolation et
  extrapolation = points sous « ajustement affine »). **Le module introduit la statistique
  bivariée un an avant la Tle comp.** → niveau indicatif de la notion à étendre (W4).
  « Plusieurs ajustements (au jugé, droite de Mayer, moindres carrés), aucune connaissance
  théorique attendue » : des points, pas de structure.
- « première sensibilisation aux bases de données ; fichiers de données, tableur ; Insee,
  Ined, data.gouv, Giec » — **[T]** outils et contextes.

## Phénomènes aléatoires

- « probabilité conditionnelle » (tableau croisé, arbre pondéré) — **[C]** `Probabilités
conditionnelles > tableaux croisés, arbres pondérés`.
- « indépendance de deux évènements ; savoir utiliser ou justifier » — **[C]**
  `> indépendance`.
- « probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de
  Bernoulli ; arbre pour n ⩽ 4 » — **[C]** `> épreuves indépendantes successives` (créée au
  lot 1re spé — le module demande exactement la même chose que la spé).
- Situations (tests médicaux à faux positifs, pile ou face, Monty Hall, Fermat-Pascal) —
  **[T]** contextes ; les faux positifs retrouveraient `> inversion du conditionnement` au
  pointage si besoin.

## Phénomènes d'évolution, modélisation par des fonctions

- **Variation linéaire** — suites arithmétiques (définition par récurrence, explicitation du
  terme de rang n, sens de variation, représentation graphique) — **[C]** `Suites > Suites
arithmétiques > reconnaître, raison, terme général, calculer un terme` et `Généralités sur
les suites > représentation graphique, sens de variation` (pas de somme de termes : les
  nœuds restent, le module ne les pointe pas) ; fonctions affines (remobilisation de la 2de,
  taux d'accroissement ↔ coefficient directeur) — **[C]** `Fonctions affines` ; reconnaître
  et modéliser une croissance linéaire, problème de seuil — **[C]** `Suites et modélisation >
placements, seuil`. La notation u(n) avant uₙ : choix pédagogique, **[T]**.
- **Modélisation quadratique** — fonctions polynômes de degré 2 : allure, axe de symétrie,
  sommet (par symétrie, par résolution de f(x) = c), tableau de variation — **[C]**
  `Second degré > parabole, variations` ; racines et signe sous forme factorisée ; formes
  x ↦ ax², ax² + c, a(x − x₁)(x − x₂) — **[C]** `> racines, signe, formes`. **Le discriminant
  est explicitement exclu** (« le calcul des racines à l'aide du discriminant ne figure pas au
  programme ») : le module ne pointe ni `Équations : second degré`, ni la forme canonique —
  voir Sens inverse.
- **Variation exponentielle** — suites géométriques à termes strictement positifs
  (récurrence, terme de rang n, sens de variation, représentation graphique) — **[C]**
  `Suites géométriques > reconnaître, raison, terme général, calculer un terme` ; reconnaître
  et modéliser une croissance ou décroissance exponentielle, ordres de grandeur, seuil —
  **[C]** `Fonction exponentielle > suites et modélisation` et `Suites et modélisation >
pourcentages, seuil`.
- « introduction de la fonction x ↦ aˣ (a > 0, x ⩾ 0) ; propriétés algébriques admises ;
  variations ; représentation graphique ; cas particulier de l'exposant 1/n » (racine n-ième,
  puissances à exposant rationnel positif en option pédagogique) — **[P]** `Fonction
exponentielle` > **« fonctions x ↦ aˣ »** (filtre : l'exponentielle de base a, sans
  dérivation — croissance selon a, demi-vie, carbone 14 — est une famille d'exercices
  distincte de exp(x) définie par f′ = f ; elle resservira telle quelle en voie
  technologique). La racine n-ième et l'exposant 1/n : points dessous (autre maison possible,
  `Puissances : calculs`, si David préfère le versant calcul numérique).
- « taux d'évolution moyen correspondant à n évolutions successives » + capacité « calculer
  un taux d'évolution moyen » — **[P]** `Proportionnalité > Évolutions` > **« taux
  d'évolution moyen »** (filtre : LA famille historique de la voie technologique — coefficient
  global, racine n-ième, taux moyen — qui arrive ici en voie générale ; distincte des
  « évolutions successives et réciproque » qui n'élèvent rien à la puissance 1/n).

## [T] et contextes

Toute la colonne « Situations et problèmes » : mouvement parabolique, pont suspendu, offre et
demande, impôt par morceaux, niveau des océans, Celsius-Fahrenheit, Sierpinski, Malthus,
cascades verticales, carbone 14, R0 d'un virus, jeux du XVIIIe siècle, Monty Hall… —
contextes non exigibles, ni nœuds ni points. Les éléments d'histoire des mathématiques et des
sciences, les métiers, les faits d'actualité : idem.

## Sens inverse : ce que le module ne pointe pas (à savoir)

- `Équations : second degré` (discriminant) et la forme canonique : **exclusion explicite**
  du texte — aucun pointeur du module sur `Second degré > formes` côté canonique ni sur le
  discriminant.
- `Suites arithmétiques / géométriques > somme des termes` : pas au programme du module.
- `Fonction exponentielle > dérivée, équations et inéquations, propriétés algébriques,
courbe` : la base e et la dérivation n'existent pas ici — le module vit dans « fonctions
  x ↦ aˣ » et « suites et modélisation ».
- `Probabilités conditionnelles > probabilités totales` et `Variables aléatoires` : absents
  (contrairement à la 1re spé).
- Aucune géométrie, aucun vocabulaire ensembliste, pas de Python exigible : l'arbre déborde,
  c'est voulu.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide tout » (W1-W4, libellé « 1re ens. sci. »,
> racine n-ième et exposant 1/n = points sous « fonctions x ↦ aˣ »). Appliqué à l'arbre :
> version 2026-10-07.8 — 136 notions, 519 sous-notions.

1. **W1 — Libellé du niveau indicatif** pour ce programme dans le JSON et le diagramme :
   jusqu'ici « 1re » = 1re spé. Proposition : **« 1re ens. sci. »** (reco), alternatives
   « 1re module », « 1re TC ». Pour mémoire : le grade prod `1_GEN` (« 1ère générale (maths
   spécifiques) ») correspond bien à ce module — le texte officiel dit « module spécifique »,
   pas de renommage nécessaire.
2. **W2 — « taux d'évolution moyen »** (Évolutions ; niveau → « 4e à 2de, 1re ens. sci. »).
   (reco : oui.)
3. **W3 — « fonctions x ↦ aˣ »** (Fonction exponentielle ; racine n-ième et exposant 1/n =
   points dessous — alternative : les loger sous `Puissances : calculs` ; niveau de la notion
   → « 1re, 1re ens. sci., Tle »). (reco : oui, points sous aˣ.)
4. **W4 — Validation d'ensemble** : niveau `Statistique à deux variables` → « 1re ens. sci.,
   Tle comp. » ; puis application au JSON + diagramme (136 notions, 519 sous-notions si tout
   est validé).
