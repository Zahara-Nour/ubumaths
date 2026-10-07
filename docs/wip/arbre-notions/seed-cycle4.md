# Seed cycle 4 (5e, 4e, 3e) — points du programme ET références d'automatismes

> **Statut : EN ATTENTE DE VALIDATION (questions C1-C3). Aucune migration avant.**
> Source : « Annexe 2 — Programme de mathématiques pour le cycle 4 » (arrêté du 18
> février 2026, BO n° 10 du 5 mars 2026), extraite **ligne à ligne** (20 p.) : blocs
> « Objectifs d'apprentissage » (→ points) et rubriques « Automatismes » (→ références ;
> le texte : « les automatismes à maitriser s'appuient sur des contenus qui ont été
> étudiés sans être automatisés au niveau précédent » — seule une ligne au contenu NEUF
> devient un point). Les « Prolongements possibles » ne sont pas exigibles : aucun point.
> Mapping : [programmes-ecarts-cycle4.md](programmes-ecarts-cycle4.md) (S1-S7 tranchées
> le 2026-10-07, S6 inversée, D2 refermée). Rappel de ta décision : **le site s'aligne
> sur le nouveau programme** (5e rentrée 2026, 4e 2027, 3e 2028), même si 4e-3e suivent
> l'ancien pendant la transition. Conventions reconduites des seeds précédents ;
> **l'ordre des années** (ta consigne) permet toutes les références : 5e → 6e/CM/cycle 2,
> 4e → 5e/6e…, 3e → 4e/5e… — y compris en cibles INTRA-migration (les points 5e sont
> insérés avant les références de 4e).

## Attributs communs

| Attribut               | Valeur                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `5` / `4` / `3`                                                                                                                                                      |
| `code`                 | `5-001`… / `4-001`… / `3-001`… — aucun préfixe existant en base, codes explicites dans la migration                                                                  |
| `objective_id`, `rang` | `NULL`                                                                                                                                                               |
| `rubrique`             | « domaine > section » (C11), ex. `Nombres et calculs > Puissances` ; suffixe `> Automatismes` pour les 3 points issus d'une ligne d'Automatismes                     |
| `kind`                 | conn. / s-f ; **dém.** (`demonstration`) quand le geste central est démontrer (4 points) ; **algo.** (`algorithme`) pour tout « La pensée informatique » (17 points) |
| `exigence`             | `attendu` partout (les Prolongements ne deviennent pas des points)                                                                                                   |
| `regime_acquisition`   | `diversite` partout, sauf les **3 points issus des Automatismes → `fluence`**                                                                                        |
| `display_order`        | ordre de lecture du BO (les points d'automatismes à leur place, avant les objectifs de leur section)                                                                 |

**226 points** (106 en 5e, 69 en 4e, 51 en 3e — dont 3 lignes d'Automatismes au contenu
neuf : les angles de l'équerre en 5e, la décomposition en facteurs premiers et l'opposé
d'une expression en 3e) et **~60 lignes d'Automatismes → références** (cibles : cycle 2,
CM, 6e, et les grades précédents du cycle 4 — règle de ciblage reconduite : le point le
plus récent du parcours qui couvre le contenu). **Une seule scission** : « Calculer
l'aire du disque, le volume du cylindre de révolution » (5e) traverse deux notions
(Aires / Volumes) → deux points.

---

## 5e — 106 points

### Nombres et calculs > Opérations

| Code  | Énoncé (verbatim BO)                                                                                                                                  | kind  | rég. | nœud                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------------------------------- |
| 5-001 | Additionner, soustraire, multiplier et diviser pour résoudre des problèmes et contrôler la vraisemblance de son résultat.                             | s-f   | div. | Décimaux : calculs (notion)                                         |
| 5-002 | Connaitre le sens et les situations d'emploi de ces opérations.                                                                                       | conn. | div. | Décimaux : calculs (notion)                                         |
| 5-003 | Diviser par un nombre décimal.                                                                                                                        | s-f   | div. | Décimaux : calculs > diviser                                        |
| 5-004 | Enchainer des opérations.                                                                                                                             | s-f   | div. | Entiers : priorités opératoires (notion)                            |
| 5-005 | Traduire un problème, une succession donnée d'opérations, un programme de calcul, en une seule expression, en faisant appel ou non à des parenthèses. | s-f   | div. | Entiers : priorités opératoires > traduire une phrase               |
| 5-006 | Nommer un calcul, distinguer sommes et produits, termes et facteurs.                                                                                  | s-f   | div. | Entiers : priorités opératoires > traduire une phrase               |
| 5-007 | Connaitre et utiliser les priorités opératoires.                                                                                                      | s-f   | div. | Entiers : priorités opératoires (notion)                            |
| 5-008 | Connaitre et utiliser la distributivité simple sur des exemples numériques.                                                                           | s-f   | div. | Entiers : multiplication > distributivité                           |
| 5-009 | Utiliser les notions de multiples et diviseurs.                                                                                                       | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs                |
| 5-010 | Connaitre les critères de divisibilité par 3 et par 9.                                                                                                | conn. | div. | `Arithmétique` Divisibilité > critères de divisibilité              |
| 5-011 | Mobiliser un algorithme dans le cadre du calcul numérique.                                                                                            | s-f   | div. | `Algorithmique` Variables et instructions (notion) _(discutable 1)_ |

### … > Nombres relatifs

| Code  | Énoncé (verbatim BO)                                                                                                                                                                                                          | kind  | rég. | nœud                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------------------- |
| 5-012 | Définir les nombres relatifs.                                                                                                                                                                                                 | conn. | div. | Relatifs : sens et écritures > définition     |
| 5-013 | Définir l'opposé et la valeur absolue d'un nombre.                                                                                                                                                                            | conn. | div. | Relatifs : sens et écritures > définition     |
| 5-014 | Définir la notion de nombre positif, strictement positif, négatif, strictement négatif.                                                                                                                                       | conn. | div. | Relatifs : sens et écritures > définition     |
| 5-015 | Utiliser les nombres relatifs pour représenter des grandeurs observables qui peuvent prendre des valeurs inférieures à zéro (température, temps, altitude, etc.), en particulier dans le cadre de la résolution de problèmes. | s-f   | div. | Relatifs : sens et écritures (notion)         |
| 5-016 | Lire l'abscisse d'un nombre relatif sur une droite graduée et placer un nombre relatif d'abscisse donnée.                                                                                                                     | s-f   | div. | Relatifs : sens et écritures > droite graduée |
| 5-017 | Comparer et ranger dans l'ordre croissant et décroissant des nombres décimaux relatifs.                                                                                                                                       | s-f   | div. | Relatifs : sens et écritures > comparer       |
| 5-018 | Additionner deux nombres décimaux relatifs.                                                                                                                                                                                   | s-f   | div. | Relatifs : calculs > sommes                   |
| 5-019 | Additionner plusieurs nombres décimaux relatifs.                                                                                                                                                                              | s-f   | div. | Relatifs : calculs > sommes                   |
| 5-020 | Soustraire deux nombres décimaux relatifs.                                                                                                                                                                                    | s-f   | div. | Relatifs : calculs > différences              |
| 5-021 | Connaitre et justifier les situations dans lesquelles des parenthèses sont indispensables au sens des écritures.                                                                                                              | s-f   | div. | Relatifs : calculs > sommes algébriques       |
| 5-022 | Simplifier l'écriture de sommes comportant des parenthèses.                                                                                                                                                                   | s-f   | div. | Relatifs : calculs > sommes algébriques       |
| 5-023 | Enchainer additions et soustractions de décimaux relatifs.                                                                                                                                                                    | s-f   | div. | Relatifs : calculs > sommes algébriques       |
| 5-024 | Résoudre des problèmes mobilisant addition et soustraction de nombres décimaux relatifs.                                                                                                                                      | s-f   | div. | Relatifs : calculs (notion)                   |

### … > Nombres rationnels

| Code  | Énoncé (verbatim BO)                                                     | kind | rég. | nœud                                            |
| ----- | ------------------------------------------------------------------------ | ---- | ---- | ----------------------------------------------- |
| 5-025 | Comparer des fractions.                                                  | s-f  | div. | Fractions : sens et écritures > comparer        |
| 5-026 | Additionner et soustraire des fractions de dénominateurs quelconques.    | s-f  | div. | Fractions : calculs > additionner et soustraire |
| 5-027 | Résoudre des problèmes avec des additions et soustractions de fractions. | s-f  | div. | Fractions : calculs > additionner et soustraire |

### … > Puissances

| Code  | Énoncé (verbatim BO)                                                                                               | kind  | rég. | nœud                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ----- | ---- | -------------------------------------------------- |
| 5-028 | Découvrir la notion de puissance d'un nombre et sa notation dans le cas du carré et du cube.                       | conn. | div. | Puissances : sens et écritures > définition        |
| 5-029 | Connaitre les carrés des entiers de 0 à 12.                                                                        | conn. | div. | Entiers : multiplication > carrés _(discutable 2)_ |
| 5-030 | Connaitre le cube de 10.                                                                                           | conn. | div. | Puissances : sens et écritures > puissances de 10  |
| 5-031 | Savoir écrire un nombre sous la forme d'une puissance 2 ou 3.                                                      | s-f   | div. | Puissances : sens et écritures > définition        |
| 5-032 | Calculer la valeur numérique d'expressions contenant des puissances simples, additions, soustractions et produits. | s-f   | div. | Puissances : calculs > mélange                     |
| 5-033 | Calculer la valeur d'une expression littérale contenant une puissance simple.                                      | s-f   | div. | `Algèbre` Calcul littéral > substitution           |

### … > Calcul littéral et algébrique · branche `Algèbre`

| Code  | Énoncé (verbatim BO)                                                                                                      | kind  | rég. | nœud                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------------------- |
| 5-034 | Produire des formules (double, triple, carré, successeur, prédécesseur, aire, périmètre, etc.).                           | s-f   | div. | Calcul littéral (notion)                           |
| 5-035 | Calculer la valeur d'une expression littérale par substitution.                                                           | s-f   | div. | Calcul littéral > substitution                     |
| 5-036 | Tester si une égalité entre expressions algébriques comportant une variable est vraie ou fausse.                          | s-f   | div. | Calcul littéral > substitution                     |
| 5-037 | Déterminer si une expression littérale est une somme ou un produit.                                                       | s-f   | div. | Calcul littéral (notion)                           |
| 5-038 | Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser, ou développer une expression littérale. | s-f   | div. | Calcul littéral (notion — développer + factoriser) |
| 5-039 | Réduire une expression littérale de la forme ax + b, où a et b sont des nombres décimaux.                                 | s-f   | div. | Calcul littéral > réduire                          |
| 5-040 | Démontrer une propriété générale par le calcul littéral.                                                                  | dém.  | div. | Calcul littéral (notion)                           |
| 5-041 | Utiliser un contre-exemple pour démontrer qu'une assertion est fausse.                                                    | s-f   | div. | Calcul littéral (notion) _(discutable 3)_          |
| 5-042 | Formuler des conjectures en s'appuyant sur un langage algorithmique ou un tableur.                                        | s-f   | div. | Calcul littéral (notion) _(discutable 3)_          |
| 5-043 | Donner à la lettre le statut d'inconnue.                                                                                  | conn. | div. | Équations : premier degré (notion)                 |
| 5-044 | Modéliser des problèmes relevant des opérations à trous par des équations du type ax = c ou x + b = c.                    | s-f   | div. | Équations : premier degré > mettre en équation     |
| 5-045 | Résoudre des équations du type ax = c ou x + b = c par des méthodes arithmétiques s'appuyant sur les opérations inverses. | s-f   | div. | Équations : premier degré (notion — deux formes)   |

### Espace et géométrie · branche `Géométrie` (sauf mention)

| Code  | Énoncé (verbatim BO ; ⚙ = ligne d'Automatismes au contenu neuf ; ✂ = scission)                                                                                       | kind  | rég. | nœud                                                            | Rubrique BO                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------------------------------------- | --------------------------------------- |
| 5-046 | Sur une droite graduée : lire l'abscisse d'un point donné ; placer un point d'abscisse donnée.                                                                         | s-f   | div. | Repérage et déplacements > coordonnées dans le plan             | Repérage sur une droite et dans le plan |
| 5-047 | Dans le plan muni d'un repère orthogonal : lire les coordonnées d'un point donné ; placer un point de coordonnées données.                                             | s-f   | div. | Repérage et déplacements > coordonnées dans le plan             | idem                                    |
| 5-048 | Construire et mettre en relation différentes représentations en perspectives cavalières des solides suivants : pavé droit, cube, cylindre de révolution, prisme droit. | s-f   | div. | Solides > perspective cavalière                                 | Représentation de l'espace              |
| 5-049 | Savoir mettre en relation une représentation en perspective cavalière et un patron d'un pavé, d'un prisme droit ou d'un cylindre de révolution.                        | s-f   | div. | Solides > patrons                                               | idem                                    |
| 5-050 | Calculer le volume du cube, du pavé droit, du prisme droit.                                                                                                            | s-f   | div. | `Grandeurs et mesures` Volumes (notion — cube et pavé + prisme) | idem                                    |
| 5-051 | Connaitre et convertir des unités usuelles (volume et capacité).                                                                                                       | s-f   | div. | `Grandeurs et mesures` Volumes > conversions                    | idem                                    |
| 5-052 | ✂ Calculer l'aire du disque.                                                                                                                                          | s-f   | div. | `Grandeurs et mesures` Aires > disque                           | idem                                    |
| 5-053 | ✂ Calculer le volume du cylindre de révolution.                                                                                                                       | s-f   | div. | `Grandeurs et mesures` Volumes > prisme et cylindre             | idem                                    |
| 5-054 | Définir le demi-tour, ou symétrie centrale.                                                                                                                            | conn. | div. | Symétrie centrale (notion)                                      | Transformations                         |
| 5-055 | Connaitre les propriétés du demi-tour.                                                                                                                                 | conn. | div. | Symétrie centrale (notion)                                      | Transformations                         |
| 5-056 | ⚙ Connaitre les mesures des angles de l'équerre dont dispose l'élève (30° 60° 90° ou 45° 45° 90°).                                                                    | conn. | flu. | `Grandeurs et mesures` Angles (notion)                          | Angles > Automatismes                   |
| 5-057 | Caractériser le parallélisme par les angles : angles alternes internes, angles correspondants.                                                                         | s-f   | div. | Figures planes > perpendiculaires et parallèles                 | Angles                                  |
| 5-058 | Connaitre la somme des angles d'un triangle et savoir la démontrer.                                                                                                    | dém.  | div. | Figures planes > triangles                                      | Triangles                               |
| 5-059 | Construire des triangles à partir de données partielles.                                                                                                               | s-f   | div. | Figures planes > triangles                                      | Triangles                               |
| 5-060 | Connaitre les propriétés des médiatrices et du cercle circonscrit dans le cas de triangles particuliers.                                                               | conn. | div. | Figures planes > triangles                                      | Triangles                               |
| 5-061 | Calculer l'aire d'un triangle.                                                                                                                                         | s-f   | div. | `Grandeurs et mesures` Aires > triangle quelconque              | Triangles                               |
| 5-062 | Définir et tracer les hauteurs dans un triangle.                                                                                                                       | s-f   | div. | Figures planes > triangles                                      | Triangles                               |
| 5-063 | Savoir que les hauteurs d'un triangle sont concourantes.                                                                                                               | conn. | div. | Figures planes > triangles                                      | Triangles                               |
| 5-064 | Définir et tracer les médianes dans un triangle.                                                                                                                       | s-f   | div. | Figures planes > triangles                                      | Triangles                               |
| 5-065 | Démontrer qu'une médiane partage un triangle en deux triangles d'aires égales.                                                                                         | dém.  | div. | Figures planes > triangles                                      | Triangles                               |
| 5-066 | Utiliser ces propriétés dans le cas de triangles particuliers.                                                                                                         | s-f   | div. | Figures planes > triangles                                      | Triangles                               |
| 5-067 | Définir le parallélogramme.                                                                                                                                            | conn. | div. | Figures planes > parallélogrammes                               | Parallélogrammes                        |
| 5-068 | Construire des parallélogrammes.                                                                                                                                       | s-f   | div. | Figures planes > parallélogrammes                               | idem                                    |
| 5-069 | Connaitre les propriétés caractéristiques des côtés opposés et des diagonales.                                                                                         | conn. | div. | Figures planes > parallélogrammes                               | idem                                    |
| 5-070 | Utiliser une propriété caractéristique sur les diagonales ou les côtés pour les construire ou donner la nature du quadrilatère.                                        | s-f   | div. | Figures planes > parallélogrammes                               | idem                                    |
| 5-071 | Définir les parallélogrammes particuliers (rectangle, losange, carré).                                                                                                 | conn. | div. | Figures planes > parallélogrammes                               | idem                                    |
| 5-072 | Connaitre les propriétés caractéristiques.                                                                                                                             | conn. | div. | Figures planes > parallélogrammes                               | idem                                    |
| 5-073 | Savoir calculer l'aire d'un parallélogramme et de figures complexes.                                                                                                   | s-f   | div. | `Grandeurs et mesures` Aires > parallélogramme                  | idem                                    |
| 5-074 | Résoudre des problèmes faisant appel à des conversions d'unités de longueur et d'unités d'aires.                                                                       | s-f   | div. | `Grandeurs et mesures` Aires > unités et conversions            | idem                                    |

### OGD et probabilités · Proportionnalité, fonctions · La pensée informatique

| Code  | Énoncé (verbatim BO)                                                                                                                                                                       | kind  | rég. | nœud                                                                           | Rubrique BO            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ------------------------------------------------------------------------------ | ---------------------- |
| 5-075 | Recueillir et organiser des données.                                                                                                                                                       | s-f   | div. | `Statistiques` Représenter des données (notion)                                | Statistiques           |
| 5-076 | Calculer des effectifs et des fréquences (exprimées sous forme décimale, fractionnaire ou de pourcentage).                                                                                 | s-f   | div. | `Statistiques` Représenter des données > effectifs et fréquences               | idem                   |
| 5-077 | Lire et interpréter des informations présentées sous forme de tableaux, de diagrammes et de graphiques.                                                                                    | s-f   | div. | `Statistiques` Représenter des données (notion)                                | idem                   |
| 5-078 | Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau, d'un diagramme (diagramme en barres, diagramme circulaire) ou d'un graphique cartésien. | s-f   | div. | `Statistiques` Représenter des données (notion)                                | idem                   |
| 5-079 | Choisir une représentation adaptée à ce qu'il convient de mettre en avant.                                                                                                                 | s-f   | div. | `Statistiques` Représenter des données (notion)                                | idem                   |
| 5-080 | Calculer et interpréter la moyenne simple d'une série de données.                                                                                                                          | s-f   | div. | `Statistiques` Indicateurs > moyenne                                           | idem                   |
| 5-081 | Aborder les questions relatives au hasard à partir de problèmes simples.                                                                                                                   | s-f   | div. | `Probabilités` Expériences aléatoires (notion)                                 | Probabilités           |
| 5-082 | Utiliser le vocabulaire des probabilités dans des contextes concrets : expérience aléatoire, issue, évènement.                                                                             | s-f   | div. | `Probabilités` Expériences aléatoires > événements                             | idem                   |
| 5-083 | Attribuer des probabilités dans des cas simples (équiprobabilité).                                                                                                                         | s-f   | div. | `Probabilités` Expériences aléatoires > équiprobabilité                        | idem                   |
| 5-084 | Répéter matériellement une expérience aléatoire simple. Enregistrer les résultats observés dans un tableau d'effectifs et de fréquences.                                                   | s-f   | div. | `Probabilités` Expériences aléatoires > fréquences                             | idem                   |
| 5-085 | Utiliser des proportions, des pourcentages.                                                                                                                                                | s-f   | div. | `Proportionnalité` Pourcentages > calculer                                     | Proportionnalité       |
| 5-086 | Calculer, appliquer des proportions, des pourcentages.                                                                                                                                     | s-f   | div. | `Proportionnalité` Pourcentages > calculer                                     | idem                   |
| 5-087 | Identifier des situations de proportionnalité dans des contextes concrets (prix, recettes, distances, échelles).                                                                           | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître                | idem                   |
| 5-088 | Utiliser un coefficient de proportionnalité dans des contextes concrets (prix unitaire, vitesse moyenne, échelle, etc.).                                                                   | s-f   | div. | `Proportionnalité` Situations de proportionnalité > appliquer _(discutable 4)_ | idem                   |
| 5-089 | Représenter une situation de proportionnalité par un tableau ou un graphique.                                                                                                              | s-f   | div. | `Proportionnalité` Situations de proportionnalité (notion)                     | idem                   |
| 5-090 | Reconnaitre une situation de proportionnalité à partir d'un tableau ou d'un graphique.                                                                                                     | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître                | idem                   |
| 5-091 | Reconnaitre graphiquement qu'un nuage de points est ou n'est pas associé à une situation de proportionnalité entre données discrètes.                                                      | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître                | idem                   |
| 5-092 | Introduire l'expression : « en fonction de » dans des contextes concrets ou mathématiques.                                                                                                 | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | Fonctions              |
| 5-093 | Produire un tableau de valeurs.                                                                                                                                                            | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | idem                   |
| 5-094 | Lire et interpréter un tableau de valeurs.                                                                                                                                                 | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | idem                   |
| 5-095 | Placer dans un repère orthogonal donné des points correspondant à un tableau de valeurs.                                                                                                   | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | idem                   |
| 5-096 | Lire et interpréter un graphique cartésien donné par une courbe ou un nuage de points.                                                                                                     | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | idem                   |
| 5-097 | Traduire la relation de dépendance entre deux grandeurs par un tableau de valeurs à partir d'une formule.                                                                                  | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | idem                   |
| 5-098 | Produire une formule simple représentant la dépendance de deux grandeurs.                                                                                                                  | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                             | idem                   |
| 5-099 | Caractériser graphiquement la proportionnalité.                                                                                                                                            | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître                | idem                   |
| 5-100 | Manipuler des instructions simples et les séquencer.                                                                                                                                       | algo. | div. | `Algorithmique` Variables et instructions (notion)                             | La pensée informatique |
| 5-101 | Identifier les entrées et sorties d'un programme.                                                                                                                                          | algo. | div. | `Algorithmique` Variables et instructions (notion)                             | idem                   |
| 5-102 | Représenter des formules sous la forme d'une expression informatique dans un langage de programmation par blocs.                                                                           | algo. | div. | `Algorithmique` Variables et instructions (notion)                             | idem                   |
| 5-103 | Calculer la valeur de formules à l'aide d'une suite d'instruction dans un langage de programmation par blocs.                                                                              | algo. | div. | `Algorithmique` Variables et instructions (notion)                             | idem                   |
| 5-104 | Prévoir la valeur d'une expression informatique avant son exécution.                                                                                                                       | algo. | div. | `Algorithmique` Variables et instructions (notion)                             | idem                   |
| 5-105 | Analyser un programme simple donné et modifier ses paramètres.                                                                                                                             | algo. | div. | `Algorithmique` Variables et instructions (notion)                             | idem                   |
| 5-106 | Effectuer une boucle inconditionnelle simple permettant de répéter une séquence linéaire d'instructions un nombre précis de fois.                                                          | algo. | div. | `Algorithmique` Boucles > boucle bornée                                        | idem                   |

---

## 4e — 69 points

### Nombres et calculs > Opérations sur les nombres relatifs

| Code  | Énoncé (verbatim BO)                                                                                                                                                     | kind | rég. | nœud                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---- | ----------------------------- |
| 4-001 | Multiplier deux nombres relatifs : d'abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où deux facteurs sont négatifs. | s-f  | div. | Relatifs : calculs > produit  |
| 4-002 | Diviser deux nombres relatifs.                                                                                                                                           | s-f  | div. | Relatifs : calculs > quotient |
| 4-003 | Savoir calculer un enchainement d'opérations avec les nombres relatifs.                                                                                                  | s-f  | div. | Relatifs : calculs (notion)   |
| 4-004 | Utiliser le vocabulaire (somme, quotient, etc.) à partir d'un enchainement d'opérations dans un programme de calcul et inversement.                                      | s-f  | div. | Relatifs : calculs (notion)   |

### … > Nombres rationnels

| Code  | Énoncé (verbatim BO)                                                                                                            | kind  | rég. | nœud                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------------- |
| 4-005 | Simplifier une fraction.                                                                                                        | s-f   | div. | Fractions : sens et écritures > simplifier                  |
| 4-006 | Définir la notion de nombre rationnel : le quotient de deux nombres entiers relatifs.                                           | conn. | div. | Fractions : sens et écritures > définition                  |
| 4-007 | Exprimer l'opposé d'un nombre rationnel.                                                                                        | s-f   | div. | Fractions : sens et écritures > définition _(discutable 5)_ |
| 4-008 | Calculer le produit de nombres rationnels.                                                                                      | s-f   | div. | Fractions : calculs > multiplier                            |
| 4-009 | Calculer et représenter la fraction d'une fraction, d'un nombre, d'une quantité.                                                | s-f   | div. | Fractions : calculs > fraction d'une quantité               |
| 4-010 | Définir l'inverse d'un nombre et connaitre sa notation.                                                                         | conn. | div. | Fractions : calculs > inverse                               |
| 4-011 | Déterminer l'inverse d'une fraction.                                                                                            | s-f   | div. | Fractions : calculs > inverse                               |
| 4-012 | Diviser des fractions.                                                                                                          | s-f   | div. | Fractions : calculs > diviser                               |
| 4-013 | Calculer la valeur d'expressions comportant plusieurs opérations avec les fractions.                                            | s-f   | div. | Fractions : calculs (notion)                                |
| 4-014 | Résoudre des problèmes mobilisant les opérations sur les fractions : addition, soustraction, multiplication, division, inverse. | s-f   | div. | Fractions : calculs (notion)                                |

### … > Puissances · Racine carrée

| Code  | Énoncé (verbatim BO)                                                                     | kind  | rég. | nœud                                             | Rubrique BO   |
| ----- | ---------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------------ | ------------- |
| 4-015 | Définir les puissances d'exposant positif d'un nombre a.                                 | conn. | div. | Puissances : sens et écritures > définition      | Puissances    |
| 4-016 | Multiplier des puissances d'exposant entier naturel d'un même nombre entre elles.        | s-f   | div. | Puissances : calculs > multiplier                | Puissances    |
| 4-017 | Multiplier des puissances d'un même exposant entier naturel de deux nombres entre elles. | s-f   | div. | Puissances : calculs > multiplier                | Puissances    |
| 4-018 | Résoudre des problèmes faisant intervenir des puissances.                                | s-f   | div. | Puissances : calculs > mélange                   | Puissances    |
| 4-019 | Comprendre et connaitre la définition de la racine carrée d'un nombre positif.           | conn. | div. | Racines carrées : sens et écritures > définition | Racine carrée |
| 4-020 | Encadrer la racine carrée d'un entier par deux entiers consécutifs.                      | s-f   | div. | Racines carrées : sens et écritures > définition | Racine carrée |

### … > Calcul littéral et algébrique · branche `Algèbre`

| Code  | Énoncé (verbatim BO)                                                                                                         | kind | rég. | nœud                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------------------------------- |
| 4-021 | Produire des formules et tester leur vraisemblance : aires de formes géométriques simples, nombres pairs/impairs, etc.       | s-f  | div. | Calcul littéral (notion)                                                  |
| 4-022 | Connaitre et utiliser la distributivité simple pour développer et factoriser une expression algébrique.                      | s-f  | div. | Calcul littéral (notion — développer + factoriser)                        |
| 4-023 | Utiliser le calcul algébrique pour produire des démonstrations.                                                              | dém. | div. | Calcul littéral (notion)                                                  |
| 4-024 | Résoudre une équation du premier degré du type ax + b = c.                                                                   | s-f  | div. | Équations : premier degré > ax + b = c                                    |
| 4-025 | Mettre en équation un problème et le résoudre à l'aide d'une équation du premier degré du type ax + b = cx + d.              | s-f  | div. | Équations : premier degré (notion — mettre en équation + ax + b = cx + d) |
| 4-026 | Formuler des conjectures à l'aide d'un algorithme ou d'un tableur pour résoudre de manière exacte ou approchée une équation. | s-f  | div. | Équations : premier degré (notion)                                        |

### Espace et géométrie · branche `Géométrie` (sauf mention)

| Code  | Énoncé (verbatim BO)                                                                                                                                                 | kind  | rég. | nœud                                               | Rubrique BO                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------------------- | -------------------------------- |
| 4-027 | Reconnaitre des solides (pyramide, cône de révolution).                                                                                                              | s-f   | div. | Solides > reconnaître et décrire                   | Représentation de l'espace       |
| 4-028 | Construire et mettre en relation différentes représentations des solides (pavé droit, cube, cylindre de révolution, prisme droit, pyramides et cônes de révolution). | s-f   | div. | Solides > perspective cavalière                    | idem                             |
| 4-029 | Connaitre le volume de la pyramide et du cône de révolution.                                                                                                         | conn. | div. | `Grandeurs et mesures` Volumes > pyramide et cône  | idem                             |
| 4-030 | Comprendre l'effet d'une translation.                                                                                                                                | conn. | div. | Translations (notion)                              | Parallélogrammes et translations |
| 4-031 | Faire le lien avec les parallélogrammes, les angles.                                                                                                                 | s-f   | div. | Translations (notion)                              | idem                             |
| 4-032 | Connaitre et utiliser les propriétés de conservations des translations.                                                                                              | s-f   | div. | Translations (notion)                              | idem                             |
| 4-033 | Connaitre les trois théorèmes relatifs à la droite des milieux dans un triangle.                                                                                     | conn. | div. | Théorème de Thalès > droite des milieux            | Triangles                        |
| 4-034 | Connaitre le théorème de Pythagore, sa réciproque, sa contraposée.                                                                                                   | conn. | div. | Théorème de Pythagore (notion)                     | Triangles                        |
| 4-035 | Mener un travail de logique sur la réciproque et la contraposée.                                                                                                     | s-f   | div. | Théorème de Pythagore > réciproque                 | Triangles                        |
| 4-036 | Caractériser un triangle rectangle à l'aide de son cercle circonscrit, par son inscription dans un demi-cercle dont le diamètre est un côté du triangle.             | s-f   | div. | Figures planes > triangles _(discutable 6)_        | Triangles                        |
| 4-037 | Déterminer le centre du cercle circonscrit d'un triangle rectangle.                                                                                                  | s-f   | div. | Figures planes > triangles                         | Triangles                        |
| 4-038 | Construire des rectangles sans équerre.                                                                                                                              | s-f   | div. | Figures planes > parallélogrammes _(discutable 6)_ | Triangles                        |

### OGD et probabilités · Proportionnalité, fonctions · La pensée informatique

| Code  | Énoncé (verbatim BO)                                                                                                                                                 | kind  | rég. | nœud                                                                          | Rubrique BO            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------------------------------- | ---------------------- |
| 4-039 | Calculer une moyenne pondérée dans le cas d'une série discrète de petits effectifs présentée sous forme de données brutes, d'un tableau ou d'un diagramme en barres. | s-f   | div. | `Statistiques` Indicateurs > moyenne                                          | Statistiques           |
| 4-040 | Déterminer une médiane et l'interpréter dans le cas d'une série de petit effectif présentée sous forme de données brutes.                                            | s-f   | div. | `Statistiques` Indicateurs > médiane                                          | idem                   |
| 4-041 | Calculer et interpréter l'étendue d'une série présentée sous forme de données brutes, d'un tableau, d'un diagramme en barres, d'un diagramme circulaire.             | s-f   | div. | `Statistiques` Indicateurs > étendue                                          | idem                   |
| 4-042 | Comprendre l'évolution de la médiane et de la moyenne quand on ajoute une valeur extrême.                                                                            | conn. | div. | `Statistiques` Indicateurs (notion)                                           | idem                   |
| 4-043 | Résoudre des problèmes faisant intervenir les différents indicateurs.                                                                                                | s-f   | div. | `Statistiques` Indicateurs (notion)                                           | idem                   |
| 4-044 | Résoudre des problèmes de comparaison de séries statistiques.                                                                                                        | s-f   | div. | `Statistiques` Indicateurs (notion)                                           | idem                   |
| 4-045 | Utiliser le tableur pour calculer une moyenne, une médiane et l'étendue d'une série statistique.                                                                     | s-f   | div. | `Statistiques` Indicateurs (notion)                                           | idem                   |
| 4-046 | Utiliser le vocabulaire et les notations ensemblistes pour décrire une expérience aléatoire dans des cas simples et définir la notion d'évènement.                   | s-f   | div. | `Probabilités` Expériences aléatoires > événements                            | Probabilités           |
| 4-047 | Définir : complémentaire, réunion, intersection, ensemble vide (évènement impossible).                                                                               | conn. | div. | `Probabilités` Expériences aléatoires > événements                            | idem                   |
| 4-048 | Calculer la probabilité d'un évènement et de l'évènement contraire.                                                                                                  | s-f   | div. | `Probabilités` Expériences aléatoires > probabilité simple                    | idem                   |
| 4-049 | Exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.).                           | s-f   | div. | `Probabilités` Expériences aléatoires (notion)                                | idem                   |
| 4-050 | À partir de la répétition d'une expérience aléatoire, réalisée matériellement ou simulée, comparer des graphiques de distributions (fréquentielle et probabiliste).  | s-f   | div. | `Probabilités` Expériences aléatoires > fréquences                            | idem                   |
| 4-051 | Observer la fluctuation des fréquences pour un nombre de répétitions fixé de l'expérience aléatoire.                                                                 | s-f   | div. | `Probabilités` Expériences aléatoires > fréquences                            | idem                   |
| 4-052 | Utiliser des grandeurs quotients, avec ou sans unités.                                                                                                               | s-f   | div. | `Proportionnalité` Vitesse (notion) _(discutable 7)_                          | Proportionnalité       |
| 4-053 | Comparer deux nombres ou deux grandeurs à l'aide de leur rapport ou ratio.                                                                                           | s-f   | div. | `Proportionnalité` Situations de proportionnalité (notion) _(discutable 7)_   | idem                   |
| 4-054 | Exprimer la proportionnalité entre deux suites de nombres par des égalités de rapports ou sous forme de ratio.                                                       | s-f   | div. | `Proportionnalité` Situations de proportionnalité (notion)                    | idem                   |
| 4-055 | Déterminer une quatrième proportionnelle.                                                                                                                            | s-f   | div. | `Proportionnalité` Situations de proportionnalité > quatrième proportionnelle | idem                   |
| 4-056 | Calculer avec des pourcentages.                                                                                                                                      | s-f   | div. | `Proportionnalité` Pourcentages > calculer                                    | idem                   |
| 4-057 | Rendre compte d'une augmentation ou une diminution exprimée en pourcentages au moyen d'un coefficient multiplicateur                                                 | s-f   | div. | `Proportionnalité` Évolutions > variations en pourcentage                     | idem                   |
| 4-058 | Définir le coefficient multiplicateur.                                                                                                                               | conn. | div. | `Proportionnalité` Évolutions > variations en pourcentage                     | idem                   |
| 4-059 | Résoudre des problèmes de partage proportionnel.                                                                                                                     | s-f   | div. | `Proportionnalité` Situations de proportionnalité > appliquer                 | idem                   |
| 4-060 | Savoir appliquer un programme de calcul à deux (plusieurs) étapes à un nombre simple puis à une variable.                                                            | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                            | Fonctions              |
| 4-061 | Savoir retrouver le nombre de départ après avoir remonté un programme de calcul simple.                                                                              | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                            | idem                   |
| 4-062 | Produire une formule littérale représentant la dépendance d'une grandeur en fonction d'une autre.                                                                    | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                            | idem                   |
| 4-063 | Représenter l'expression d'une grandeur en fonction d'une autre par un graphique.                                                                                    | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                            | idem                   |
| 4-064 | Comprendre la dépendance d'une grandeur en fonction d'une autre.                                                                                                     | conn. | div. | `Fonctions` Généralités sur les fonctions (notion)                            | idem                   |
| 4-065 | Représenter des conditions simples.                                                                                                                                  | algo. | div. | `Algorithmique` Variables et instructions > instructions conditionnelles      | La pensée informatique |
| 4-066 | Écrire des instructions conditionnelles.                                                                                                                             | algo. | div. | `Algorithmique` Variables et instructions > instructions conditionnelles      | idem                   |
| 4-067 | Manipuler une variable.                                                                                                                                              | algo. | div. | `Algorithmique` Variables et instructions > variables et affectation          | idem                   |
| 4-068 | Écrire un programme simple donné pour réaliser un objectif ou résoudre un problème.                                                                                  | algo. | div. | `Algorithmique` Variables et instructions (notion)                            | idem                   |
| 4-069 | Modifier un programme donné pour changer son comportement.                                                                                                           | algo. | div. | `Algorithmique` Variables et instructions (notion)                            | idem                   |

---

## 3e — 51 points

### Nombres et calculs (branche `Nombres et calculs`, sauf mention)

| Code  | Énoncé (verbatim BO ; ⚙ = ligne d'Automatismes au contenu neuf)                                                                                           | kind  | rég. | nœud                                                                 | Rubrique BO                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------------------------------------- | -------------------------------------------- |
| 3-001 | Mettre une fraction sous forme irréductible.                                                                                                               | s-f   | div. | Fractions : sens et écritures > simplifier                           | Nombres rationnels                           |
| 3-002 | Rendre irréductible une fraction.                                                                                                                          | s-f   | div. | Fractions : sens et écritures > simplifier                           | idem                                         |
| 3-003 | Résoudre des problèmes faisant appel à des fractions.                                                                                                      | s-f   | div. | Fractions : calculs (notion)                                         | idem                                         |
| 3-004 | Définir les puissances d'exposant négatif d'un nombre.                                                                                                     | conn. | div. | Puissances : sens et écritures > définition                          | Puissances                                   |
| 3-005 | Multiplier et diviser des puissances.                                                                                                                      | s-f   | div. | Puissances : calculs (notion — multiplier + diviser)                 | Puissances                                   |
| 3-006 | Déterminer la notation scientifique d'un nombre.                                                                                                           | s-f   | div. | Puissances : sens et écritures > notation scientifique               | Puissances                                   |
| 3-007 | Résoudre des problèmes notamment en utilisant la notation scientifique.                                                                                    | s-f   | div. | Puissances : sens et écritures > notation scientifique               | Puissances                                   |
| 3-008 | Résoudre analytiquement et graphiquement des équations de la forme x² = a.                                                                                 | s-f   | div. | `Algèbre` Équations : produit et quotient > x² = a                   | Racine carrée                                |
| 3-009 | Résoudre des problèmes utilisant la racine carrée.                                                                                                         | s-f   | div. | Racines carrées : calculs > calculer                                 | Racine carrée                                |
| 3-010 | ⚙ Factoriser un nombre entier positif : 60 = 2² × 3 × 5.                                                                                                  | s-f   | flu. | `Arithmétique` Nombres premiers > décomposition en facteurs premiers | Multiples et diviseurs > Automatismes        |
| 3-011 | ⚙ Prendre l'opposé d'une expression : savoir que −(5 − 4x) = −5 + 4x.                                                                                     | s-f   | flu. | `Algèbre` Calcul littéral > opposé d'une expression                  | Calcul littéral et algébrique > Automatismes |
| 3-012 | Simplifier des expressions produits ou des rapports comportant des facteurs communs.                                                                       | s-f   | div. | `Algèbre` Calcul littéral > simplifier l'écriture _(discutable 8)_   | Calcul littéral et algébrique                |
| 3-013 | Utiliser la double distributivité pour développer et factoriser des expressions dont le facteur est apparent.                                              | s-f   | div. | `Algèbre` Calcul littéral (notion — développer + factoriser)         | idem                                         |
| 3-014 | Résoudre analytiquement et graphiquement une inéquation du premier degré du type ax ⩾ b.                                                                   | s-f   | div. | `Algèbre` Inéquations : premier degré > ax + b < c                   | idem                                         |
| 3-015 | Résoudre une équation produit nul.                                                                                                                         | s-f   | div. | `Algèbre` Équations : produit et quotient > produit nul              | idem                                         |
| 3-016 | Manipuler les trois identités remarquables pour développer et factoriser : a² + 2ab + b² = (a + b)² ; a² − 2ab + b² = (a − b)² ; a² − b² = (a − b)(a + b). | s-f   | div. | `Algèbre` Calcul littéral > identités remarquables                   | idem                                         |
| 3-017 | Pratiquer un raisonnement par analyse-synthèse dans le cadre d'une résolution d'équation.                                                                  | s-f   | div. | `Algèbre` Équations : premier degré (notion) _(discutable 8)_        | idem                                         |

### Espace et géométrie · branche `Géométrie` (sauf mention)

| Code  | Énoncé (verbatim BO)                                                                                                                                   | kind  | rég. | nœud                                                       | Rubrique BO                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ---------------------------------------------------------- | -------------------------- |
| 3-018 | Définir la boule et la sphère.                                                                                                                         | conn. | div. | Solides > reconnaître et décrire                           | Représentation de l'espace |
| 3-019 | Définir les grands cercles, le diamètre.                                                                                                               | conn. | div. | Solides > reconnaître et décrire                           | idem                       |
| 3-020 | Visualiser et réaliser des sections de pavé parallèlement à une face, de cylindre parallèlement ou perpendiculairement à son axe, d'une boule.         | s-f   | div. | Solides > sections planes                                  | idem                       |
| 3-021 | Connaitre et utiliser la formule du volume d'une boule de rayon donné.                                                                                 | s-f   | div. | `Grandeurs et mesures` Volumes > boule                     | idem                       |
| 3-022 | Connaitre et appliquer le théorème de Thalès, sa réciproque, sa contraposée (configurations des triangles emboités et configuration dite du papillon). | s-f   | div. | Théorème de Thalès (notion)                                | Triangles                  |
| 3-023 | Connaitre et utiliser les lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente.                                               | s-f   | div. | Trigonométrie du triangle rectangle (notion)               | Triangles                  |
| 3-024 | Définir et utiliser la translation : définition ponctuelle avec parallélogramme.                                                                       | s-f   | div. | Translations (notion)                                      | Translations et vecteurs   |
| 3-025 | Définir et utiliser les notions de vecteur, de vecteurs égaux, de vecteur nul, d'opposé d'un vecteur.                                                  | s-f   | div. | Vecteurs : sans coordonnées (notion)                       | idem                       |
| 3-026 | Définir et utiliser la somme de deux vecteurs par enchainement de deux translations.                                                                   | s-f   | div. | Vecteurs : sans coordonnées > somme et relation de Chasles | idem                       |
| 3-027 | Découvrir et utiliser la relation de Chasles.                                                                                                          | s-f   | div. | Vecteurs : sans coordonnées > somme et relation de Chasles | idem                       |

### OGD et probabilités · Proportionnalité, fonctions · La pensée informatique

| Code  | Énoncé (verbatim BO)                                                                                                                                                                         | kind  | rég. | nœud                                                                             | Rubrique BO            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------------------------------------------------- | ---------------------- |
| 3-028 | Calculer des effectifs cumulés croissants.                                                                                                                                                   | s-f   | div. | `Statistiques` Représenter des données > fréquences cumulées                     | Statistiques           |
| 3-029 | Donner les quartiles et la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.                                                                           | s-f   | div. | `Statistiques` Indicateurs > quartiles                                           | idem                   |
| 3-030 | Construire et utiliser des boites à moustache pour représenter les valeurs de position d'une série statistique.                                                                              | s-f   | div. | `Statistiques` Indicateurs > boîte à moustaches                                  | idem                   |
| 3-031 | Comprendre et interpréter des données statistiques.                                                                                                                                          | s-f   | div. | `Statistiques` Indicateurs (notion)                                              | idem                   |
| 3-032 | Utiliser le tableur pour calculer une moyenne, une médiane et l'étendue d'une série statistique.                                                                                             | s-f   | div. | `Statistiques` Indicateurs (notion)                                              | idem                   |
| 3-033 | Connaitre et savoir appliquer la relation P(A ∪ B) + P(A ∩ B) = P(A) + P(B).                                                                                                                 | s-f   | div. | `Probabilités` Expériences aléatoires > événements                               | Probabilités           |
| 3-034 | Simuler des expériences aléatoires indépendantes.                                                                                                                                            | s-f   | div. | `Probabilités` Expériences aléatoires > fréquences                               | idem                   |
| 3-035 | Observer la stabilisation des fréquences lorsqu'on augmente le nombre de répétitions de l'expérience aléatoire, faire le lien entre fréquence et probabilité selon le nombre de répétitions. | s-f   | div. | `Probabilités` Expériences aléatoires > fréquences                               | idem                   |
| 3-036 | Traduire une augmentation ou une diminution en pourcentages.                                                                                                                                 | s-f   | div. | `Proportionnalité` Évolutions > variations en pourcentage                        | Proportionnalité       |
| 3-037 | Relier la représentation graphique d'une situation de proportionnalité avec le théorème de Thalès.                                                                                           | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître _(discutable 9)_ | idem                   |
| 3-038 | Connaitre et utiliser les fonctions linéaires.                                                                                                                                               | s-f   | div. | `Fonctions` Fonctions affines > fonction linéaire                                | idem                   |
| 3-039 | Utiliser les différentes représentations d'une fonction.                                                                                                                                     | s-f   | div. | `Fonctions` Généralités sur les fonctions (notion)                               | Fonctions              |
| 3-040 | Définir et connaitre le vocabulaire : image, antécédents.                                                                                                                                    | conn. | div. | `Fonctions` Généralités sur les fonctions > images et antécédents                | idem                   |
| 3-041 | Définir et utiliser les fonctions linéaires.                                                                                                                                                 | s-f   | div. | `Fonctions` Fonctions affines > fonction linéaire                                | idem                   |
| 3-042 | Résoudre graphiquement des équations et des inéquations linéaires.                                                                                                                           | s-f   | div. | `Fonctions` Fonctions affines > fonction linéaire                                | idem                   |
| 3-043 | Relier fonctions linéaires et proportionnalité.                                                                                                                                              | s-f   | div. | `Fonctions` Fonctions affines > fonction linéaire                                | idem                   |
| 3-044 | Définir et utiliser les fonctions affines.                                                                                                                                                   | s-f   | div. | `Fonctions` Fonctions affines (notion)                                           | idem                   |
| 3-045 | Déterminer graphiquement les coefficients d'une fonction affine.                                                                                                                             | s-f   | div. | `Fonctions` Fonctions affines > coefficient directeur et ordonnée à l'origine    | idem                   |
| 3-046 | Représenter la fonction carré.                                                                                                                                                               | s-f   | div. | `Fonctions` Fonction carré > définition et courbe                                | idem                   |
| 3-047 | Approfondir la notion de variables.                                                                                                                                                          | algo. | div. | `Algorithmique` Variables et instructions > variables et affectation             | La pensée informatique |
| 3-048 | Utiliser des conditions composées.                                                                                                                                                           | algo. | div. | `Algorithmique` Variables et instructions > instructions conditionnelles         | idem                   |
| 3-049 | Utiliser une boucle conditionnelle.                                                                                                                                                          | algo. | div. | `Algorithmique` Boucles > boucle non bornée                                      | idem                   |
| 3-050 | Structurer des programmes.                                                                                                                                                                   | algo. | div. | `Algorithmique` Variables et instructions (notion)                               | idem                   |
| 3-051 | Écrire un programme donné pour réaliser un objectif ou résoudre un problème.                                                                                                                 | algo. | div. | `Algorithmique` Variables et instructions (notion)                               | idem                   |

---

## Les références d'automatismes (`curriculum_point_automatismes`)

Règle de ciblage reconduite : **le point le plus récent du parcours qui couvre le
contenu**. Les cibles `5-xxx`/`4-xxx` sont les points définis ci-dessus (insérés avant
les références dans la même migration). Lignes au contenu neuf → points ⚙ (5-056,
3-010, 3-011), déjà dans les tableaux.

### Grade 5 (références)

| Ligne d'Automatismes de la 5e (résumé fidèle)                                      | Cible(s)          |
| ---------------------------------------------------------------------------------- | ----------------- |
| Critères de divisibilité par 2, 5 et 10 vus en CM1 et CM2                          | CM1-011           |
| Quotient et reste d'une division euclidienne (17 = 3 × 5 + 2)                      | 6-123             |
| Tables pour factoriser un entier en produit de deux nombres (21 = 3 × 7)           | CM2-036           |
| Produits en lien avec les tables : 0,6 × 7 ; 40 × 0,03                             | 6-118             |
| Multiplier et diviser par 10, 100, 1 000                                           | CM2-042 · CM2-043 |
| Additionner et soustraire des décimaux (2,7 + 1,4)                                 | 6-114             |
| Additionner, soustraire, multiplier des décimaux à une ou deux décimales           | 6-114 · 6-118     |
| Compléter une addition à trou par une soustraction (2 + … = 7)                     | CE2-020           |
| Écriture décimale des fractions simples (1/2, 1/4, 3/4…)                           | CM2-039           |
| Nombre quotient : compléter 3 × … = 7 par 7/3                                      | 6-127             |
| Abscisse d'un point en tiers, quarts, moitiés, dixièmes                            | 6-128             |
| Reconnaitre des fractions égales (2/3 = …/15)                                      | 6-132             |
| Comparer deux fractions                                                            | 6-133             |
| Fraction = entier + fraction < 1 (17/5 = 3 + 2/5)                                  | CM2-014           |
| Addition et soustraction de fractions simples                                      | 6-135             |
| Prendre une fraction simple d'un nombre (1/3 de 18)                                | 6-131             |
| Prendre 1 %, 10 % ou 50 % d'un nombre                                              | 6-141             |
| Un même nombre sous de multiples formes (1,2 = 12/10 = 6/5 = 120 %)                | 6-106             |
| Unités d'aires et de volume                                                        | 6-150 · 6-153     |
| Poursuivre une suite de motifs évolutive                                           | CM2-069           |
| Nombre d'éléments à une étape donnée                                               | CM2-070           |
| Structure d'un motif évolutif                                                      | 6-143             |
| Nombre quotient                                                                    | 6-126             |
| Placer / repérer un décimal sur une demi-droite graduée                            | 6-107 · 6-108     |
| Vues et dénombrement d'empilements de cubes ; cube et pavé en perspective          | 6-181             |
| Reconnaitre un patron d'un cube                                                    | CM2-100           |
| Symétrique d'une figure sur quadrillage (axe vertical, horizontal, diagonale)      | CM2-097           |
| Symétrique par rapport à un axe, d'un point, d'une figure, sur feuille blanche     | 6-180             |
| Lexique des angles (plein, plat, nul, droit, opposés, adjacents, supplémentaires…) | 6-168             |
| Angle droit = 90°, angle plat = 180°                                               | CM2-081 · 6-168   |
| Reconnaitre une bissectrice                                                        | 6-171             |
| Reconnaitre un triangle isocèle, équilatéral, rectangle sur schéma codé            | CM2-092           |
| Somme des angles d'un triangle, calculer le 3e angle                               | 6-176             |
| Médiatrice, cercle circonscrit (notions)                                           | 6-165 · 6-178     |
| Reconnaitre quadrilatère, parallélogramme, rectangle, losange, carré, trapèze…     | CM2-092           |
| Exploiter le codage d'une figure                                                   | CM2-088           |
| Échelle de probabilité, évènements types (pile, dé, urne, loto…)                   | 6-186 · 6-187     |
| Probabilité sous diverses formes (fraction, décimale, pourcentage)                 | 6-186             |
| « Une chance sur quatre » ↔ probabilité 1/4                                       | CM2-111           |
| Reconnaitre une situation de proportionnalité                                      | 6-190             |
| Procédure adaptée (linéarité, retour à l'unité) ; pourcentage de voix              | 6-191 · 6-140     |

### Grade 4 (références)

| Ligne d'Automatismes de la 4e (résumé fidèle)                                       | Cible(s)                      |
| ----------------------------------------------------------------------------------- | ----------------------------- |
| Manipulation de sommes et différences de relatifs                                   | 5-018 · 5-020                 |
| Opposé d'un nombre, somme des opposés                                               | 5-013                         |
| Entretien des tables de multiplication                                              | CM2-036                       |
| Multiplier et diviser par 10, 100, 1 000                                            | CM2-042 · CM2-043             |
| Multiplications à trou (5 × … = 3), lien multiplication-division                    | 6-127                         |
| Multiplication comme addition itérée (3 + 3 + 3 + 3 = 4 × 3)                        | CP-017                        |
| Addition et soustraction de fractions de dénominateurs quelconques mais simples     | 5-026                         |
| Comparaison de fractions                                                            | 5-025                         |
| Une fraction est un quotient (7 × 3/7 = 3)                                          | 6-126                         |
| Prendre la fraction d'un nombre = multiplier la fraction par ce nombre              | 6-131                         |
| Carrés parfaits des entiers de 0 à 12                                               | 5-029                         |
| Multiplier/diviser par 10, 100, 1 000 ; compléter 1 200 = 1,2 × …                   | CM2-042 · CM2-043             |
| Puissances simples : 2² = 4 ; 2³ = 8 ; 3³ = 27                                      | 5-028                         |
| 10² = 100 ; 10³ = 1 000                                                             | 5-030                         |
| Carrés des entiers de 0 à 12 (racine carrée)                                        | 5-029                         |
| Valeur d'expressions numériques simples                                             | 5-007                         |
| Équations ax = c et x + b = c                                                       | 5-045                         |
| Écrire 3 × x sous la forme 3x ; conventions (1x = x, x + x = 2x, x × x = x²…)       | 5-039                         |
| Double, triple, moitié, prédécesseur, successeur, carré d'un nombre                 | CE2-022 · 5-029               |
| Tester si un nombre vérifie une égalité                                             | 5-036                         |
| Symétrique d'un point par demi-tour                                                 | 5-054                         |
| Placer / repérer un relatif sur une droite graduée ; coordonnées dans le plan       | 5-016 · 5-047                 |
| Reconnaitre les solides : cube, pavé, cylindre, prisme droit                        | CM2-098                       |
| Formules du volume du cube, pavé, prisme, cylindre                                  | 5-050 · 5-053                 |
| Base d'un prisme donné en perspective cavalière                                     | 5-048                         |
| Aires des figures planes usuelles : triangle, rectangle, disque                     | 5-061 · 6-152 · 5-052         |
| Images de figures par symétrie axiale ou demi-tour (dont identification axe/centre) | 6-180 · 5-054                 |
| Reconnaitre un parallélogramme (définition, propriété, codages)                     | 5-070                         |
| Parallélogramme particulier par ses propriétés (diagonales)                         | 5-072                         |
| Droites remarquables du triangle (médiatrices, médianes, hauteurs, bissectrices)    | 5-062 · 5-064 · 6-165 · 6-171 |
| Moyenne d'un très petit nombre de valeurs                                           | 5-080                         |
| Effectif manquant dans un tableau ; fréquence simple                                | 5-076                         |
| a % de c quand a vaut 100, 50, 25, 10, 1 ; compléter 20 % de 120 = …                | 6-141                         |

### Grade 3 (références)

| Ligne d'Automatismes de la 3e (résumé fidèle)                                    | Cible(s)              |
| -------------------------------------------------------------------------------- | --------------------- |
| Additionner, soustraire, multiplier et diviser des fractions                     | 4-013                 |
| Puissance comme multiplication itérée (3 × 3 × 3 × 3 = 3⁴)                       | 4-015                 |
| Multiplication de puissances d'exposant positif d'un nombre                      | 4-016                 |
| Multiplication de puissances de même exposant positif de deux nombres            | 4-017                 |
| Carrés des entiers de 0 à 12 (racine carrée)                                     | 5-029                 |
| Simplifier une fraction (numérateur et dénominateur dans une même table)         | 4-005                 |
| Dénominateur commun pour additionner, soustraire, comparer                       | 5-026                 |
| Critères de divisibilité par 2, 3, 5, 9                                          | 5-010 · CM1-011       |
| Équations ax = c, x + b = c, ax + b = c                                          | 4-024 · 5-045         |
| Simplifier des expressions littérales                                            | 5-039                 |
| Valeur d'une expression algébrique, avec des puissances ou non                   | 5-033                 |
| Nature d'une expression (3x + 2 somme, 5(x + 4) produit)                         | 5-037                 |
| Développer et factoriser une expression simple                                   | 4-022                 |
| Expression générique d'un nombre pair, d'un nombre impair                        | 4-021                 |
| Placer / repérer un relatif ; coordonnées dans le plan                           | 5-016 · 5-047         |
| Reconnaitre les solides (pavé, cube, prisme, cylindre, pyramide, cône)           | CM2-098               |
| Formules du volume d'une pyramide, d'un cône                                     | 4-029                 |
| Nature d'une face de pyramide en perspective ; patrons de pyramides              | 4-028                 |
| Propriété du triangle rectangle et de son cercle circonscrit                     | 4-036                 |
| Égalité de Pythagore dans un triangle rectangle                                  | 4-034                 |
| Droite des milieux (prouver des parallèles, calculer, prouver un milieu)         | 4-033                 |
| Symétrie axiale, demi-tour, translation (mobiliser)                              | 6-180 · 5-054 · 4-030 |
| Moyenne ; médiane d'une petite série ; étendue                                   | 5-080 · 4-040 · 4-041 |
| Partager une somme / une masse / selon les âges, selon un ratio                  | 4-059                 |
| Pourcentage d'une quantité                                                       | 6-141                 |
| Distance réelle entre deux villes via l'échelle d'une carte                      | 6-193                 |
| Augmentation/diminution en pourcentages, avec ou sans coefficient multiplicateur | 4-057                 |

---

## Scission et rattachements discutables (validés en bloc par C3, sauf veto)

**Scission (la seule)** : « Calculer l'aire du disque, le volume du cylindre de
révolution. » (5e) traverse `Aires` et `Volumes` → 5-052 et 5-053.

1. **« Mobiliser un algorithme dans le cadre du calcul numérique »** (5-011) →
   `Variables et instructions` (notion) : c'est la porte algorithmique du calcul
   numérique de 5e ; Préalgorithmique reste la maison du CM2-6e. Alternative :
   Préalgorithmique.
2. **« Connaitre les carrés des entiers de 0 à 12 »** (5-029) → `Entiers :
multiplication > carrés` : c'est un répertoire de faits numériques, la sous-notion
   existe pour ça. Alternative : `Puissances > définition`.
3. **Contre-exemple et conjectures** (5-041, 5-042) → `Calcul littéral` (notion) : le
   BO les place dans le calcul littéral de 5e ; la branche `Logique` reste lycée.
4. **« Coefficient de proportionnalité »** (5-088) → `Situations de proportionnalité >
appliquer` (le geste : s'en servir). Alternative : la notion.
5. **« Exprimer l'opposé d'un nombre rationnel »** (4-007) → `Fractions : sens et
écritures > définition` (signe d'une écriture fractionnaire relative). Alternative :
   `Relatifs : sens et écritures > définition`.
6. **Cercle circonscrit du triangle rectangle** (4-036, 4-037) → `Figures planes >
triangles` (configuration, pas le théorème de Pythagore) ; **« Construire des
   rectangles sans équerre »** (4-038) → `Figures planes > parallélogrammes` (le
   rectangle y vit). Le BO les classe dans « Triangles », la rubrique le garde.
7. **Grandeurs quotients / rapports et ratios** (4-052, 4-053, 4-054) : grandeurs
   quotients → `Vitesse` (notion, le doc d'écarts l'acte) ; rapports/ratios → la notion
   `Situations de proportionnalité` (pas de sous-notion dédiée ; le filtre n'a pas été
   jugé suffisant au tour des programmes).
8. **« Simplifier des expressions produits ou des rapports »** (3-012) → `Calcul
littéral > simplifier l'écriture` (les rapports effleurent « expressions
   fractionnaires », mais le geste est la simplification) ; **analyse-synthèse**
   (3-017) → `Équations : premier degré` (notion) — le raisonnement vit dans la
   résolution d'équations au collège.
9. **« Relier le graphique de proportionnalité et Thalès »** (3-037) → `Situations de
proportionnalité > reconnaître`. Alternative : `Théorème de Thalès` (notion).
10. **Pensée informatique → `Variables et instructions` / `Boucles`** (S5 = option A,
    déjà tranchée) : la programmation par blocs est une modalité ; les 17 points portent
    kind `algorithme`.

## Questions (C1-C3)

- **C1 — kind `demonstration`** pour les 4 points dont le geste central est démontrer
  (5-040, 5-058, 5-065, 4-023) — le reste des « démontrer/justifier » reste s-f.
  Reco : oui.
- **C2 — régime** : `fluence` pour les seuls 3 points issus des Automatismes (5-056,
  3-010, 3-011), `diversite` partout ailleurs — le cycle 4 n'a pas de section « calcul
  mental », ses automatismes sont des références. Reco : oui.
- **C3 — validation d'ensemble** : les 226 points, la scission unique, les ~100 lignes
  de références (41 en 5e, 33 en 4e, 27 en 3e → cibles dédupliquées par grade), les 10
  rattachements discutables.

## Après validation (plan de livraison)

1. Worktree + migration **additive** `seed_curriculum_points_cycle4.sql` générée depuis
   ce document : les 226 points (5e puis 4e puis 3e), PUIS les références par grade
   (cibles résolues par code — y compris les cibles intra-migration 5-xxx/4-xxx, déjà
   insérées). Bloc DO : comptes par grade, 0 sans nœud, comptes de références par
   grade, fluence = 3, algorithme = 17, demonstration = 4. Rollback scopé en
   commentaire avec la mise en garde RGPD habituelle.
2. Test d'intégration : comparaison intégrale des points ET des références des trois
   grades en lecture anonyme, preuve rouge avant.
3. `security-auditor`, PR, CI verte, merge, `db:migrate`, vérification prod.
4. Ensuite, dans l'ordre des années : **2de** (programme déjà extrait — 13 p. lues),
   puis 1re spé, Tle spé, Tle comp., Expertes ; puis remplissage des rangements et
   séquence C5.
