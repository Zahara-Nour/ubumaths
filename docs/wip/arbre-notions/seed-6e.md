# Seed 6e — points du programme ET références d'automatismes (architecture points → nœuds)

> **Passe « puces et points » (validée le 2026-10-09, [passe-cycle3.md](passe-cycle3.md))** :
> 4 puces scindées (+4 points, 6-198…201), 7 points spécifiés, 4 références ajoutées
> ailleurs vers les parties neuves (et 3 de la 6e vers CM2-123…125) → **101 points**.

> **Statut : VALIDÉ INTÉGRALEMENT le 2026-10-08 (« je valide tout » : A1-A4 = recos).**
> Livraison en cours : migration + tests (branche `feat/seed-points-6e`).
> Source : « Programme de mathématiques pour le cycle 3 » (BOENJS du 17 avril 2025),
> partie Sixième, extraite **ligne à ligne** : blocs « Connaissances et capacités
> attendues » (→ points) et rubriques « Automatismes » (→ références, règle de David du
> 2026-10-07 : elles portent « uniquement sur des connaissances, des procédures et des
> stratégies déjà étudiées au cours moyen » — seule une ligne au contenu NEUF devient un
> point). Les « Mises en perspective historiques et culturelles » ne sont pas exigibles :
> aucun point. Mapping : [programmes-ecarts-cycle3.md](programmes-ecarts-cycle3.md) +
> décisions des seeds CM et cycle 2 (fractions décimales = fractions, assemblages de
> cubes → Solides, notion Préalgorithmique, « arrondis et ordres de grandeur »,
> « droite graduée » des décimaux — l'arbre 2026-10-07.13 absorbe tout, AUCUN changement).
> C'est le **premier grade à références** : ses cibles (CM1, CM2, CE1, CE2) sont en base
> depuis les PR #944 et #945 — la question C22 des références différées est dissoute.

## Attributs communs

| Attribut               | Valeur                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `6`                                                                                                                                                                                    |
| `code`                 | **`6-101` à `6-197`** (code = 100 + display_order). ⚠️ L'ancien seed 2020 occupe `6-001`…`6-095` (index unique GLOBAL sur `code`) jusqu'à sa suppression (étape 4 de C5) — question A3 |
| `objective_id`, `rang` | `NULL`                                                                                                                                                                                 |
| `rubrique`             | deux niveaux « domaine > section » (C11), + suffixe `> Automatismes` pour les 2 points issus d'une rubrique Automatismes (fidélité à l'ordre du texte)                                 |
| `kind`                 | conn. / s-f, mêmes règles ; **`algorithme` (algo.) proposé pour les 4 points de pensée informatique** — question A2                                                                    |
| `exigence`             | `attendu` partout                                                                                                                                                                      |
| `regime_acquisition`   | `diversite` partout, **sauf les 2 points issus des Automatismes → `fluence`** (c'est leur nature)                                                                                      |
| `display_order`        | ordre de lecture du BO (les 2 points d'automatismes à leur place, avant les connaissances de leur section)                                                                             |

**97 points** (95 puces de Connaissances + 2 lignes d'Automatismes au contenu neuf) et
**35 lignes d'Automatismes → 28 points cibles distincts** dans
`curriculum_point_automatismes` (paires point × grade `6`, dédupliquées). Règle de
ciblage : **le point le plus récent du parcours qui couvre le contenu** (CM2 avant CM1,
CM avant cycle 2) — le trigger C14 garantit que chaque cible est dans le parcours de la 6e.

---

## Les 97 points

### Nombres, calcul et résolution de problèmes > Les nombres entiers et décimaux

| Code  | Énoncé (verbatim BO)                                                                                                                                     | kind  | rég. | nœud                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ---------------------------------------------------------- |
| 6-101 | Connaître et utiliser la valeur des chiffres selon leur rang dans l'écriture d'un nombre                                                                 | s-f   | div. | Entiers : numération > décomposer _(discutable 1)_         |
| 6-102 | Connaître les liens entre les unités de numération unité, dizaine, centaine, millier, dixième, centième, millième                                        | conn. | div. | Décimaux : numération > décomposer _(discutable 1)_        |
| 6-103 | Connaître des grands nombres entiers, jusqu'au milliard                                                                                                  | conn. | div. | Entiers : numération > écrire                              |
| 6-104 | Reconnaître un nombre décimal                                                                                                                            | s-f   | div. | Décimaux : numération (notion, _discutable 2_)             |
| 6-105 | Connaître la définition d'un pourcentage                                                                                                                 | conn. | div. | `Proportionnalité` Pourcentages > définition               |
| 6-106 | Associer et utiliser différentes écritures d'un nombre décimal : écriture à virgule, fraction, nombre mixte, pourcentage                                 | s-f   | div. | Décimaux : numération (notion, _discutable 2_)             |
| 6-107 | Placer sur une demi-droite graduée un point dont l'abscisse est un nombre décimal                                                                        | s-f   | div. | Décimaux : numération > droite graduée                     |
| 6-108 | Repérer un nombre décimal sur une demi-droite graduée                                                                                                    | s-f   | div. | Décimaux : numération > droite graduée                     |
| 6-109 | Comparer deux nombres décimaux                                                                                                                           | s-f   | div. | Décimaux : numération > comparer                           |
| 6-110 | Ordonner une liste de nombres décimaux                                                                                                                   | s-f   | div. | Décimaux : numération > comparer                           |
| 6-111 | Donner la valeur arrondie à l'unité, au dixième ou au centième, d'un nombre décimal                                                                      | s-f   | div. | Décimaux : numération > arrondis et ordres de grandeur     |
| 6-112 | Déterminer ou connaître la valeur arrondie de certains nombres non décimaux                                                                              | s-f   | div. | Décimaux : numération > arrondis et ordres de grandeur     |
| 6-113 | Encadrer un nombre décimal par deux nombres décimaux, intercaler un nombre décimal entre deux nombres décimaux                                           | s-f   | div. | Décimaux : numération > encadrer                           |
| 6-114 | Additionner des nombres décimaux                                                                                                                         | s-f   | div. | Décimaux : calculs > additionner                           |
| 6-198 | Soustraire des nombres décimaux                                                                                                                          | s-f   | div. | Décimaux : calculs > soustraire                            |
| 6-115 | Multiplier un nombre entier ou un nombre décimal par 0,1, par 0,01, et par 0,001                                                                         | s-f   | div. | Décimaux : calculs > puissances de 10                      |
| 6-116 | Connaître le lien entre la multiplication par 0,1, par 0,01 et par 0,001 et la division par 10, 100 et par 1 000                                         | conn. | div. | Décimaux : calculs > puissances de 10                      |
| 6-117 | Comprendre le sens de la multiplication de deux nombres décimaux en prenant appui sur le calcul de l'aire d'un rectangle et sur des conversions d'unités | conn. | div. | Décimaux : calculs > multiplier                            |
| 6-118 | Calculer le produit de deux nombres décimaux                                                                                                             | s-f   | div. | Décimaux : calculs > multiplier                            |
| 6-119 | Contrôler les résultats à l'aide d'ordres de grandeur                                                                                                    | s-f   | div. | Décimaux : numération > arrondis et ordres de grandeur     |
| 6-120 | Résoudre des problèmes mettant en jeu des multiplications entre des nombres décimaux                                                                     | s-f   | div. | Décimaux : calculs > multiplier _(discutable 5)_           |
| 6-121 | Diviser un nombre décimal par un nombre entier non nul inférieur à 10                                                                                    | s-f   | div. | Décimaux : calculs > diviser                               |
| 6-122 | Résoudre des problèmes mettant en jeu des divisions décimales                                                                                            | s-f   | div. | Décimaux : calculs > diviser _(discutable 5)_              |
| 6-123 | Effectuer la division euclidienne d'un nombre entier par un nombre entier inférieur à 100                                                                | s-f   | div. | Entiers : division > division euclidienne                  |
| 6-124 | Résoudre des problèmes mettant en jeu des divisions euclidiennes                                                                                         | s-f   | div. | Entiers : division > division euclidienne _(discutable 5)_ |

### … > Les fractions

| Code  | Énoncé (verbatim BO)                                                                                                       | kind  | rég. | nœud                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------------------------------------- |
| 6-125 | Relier une fraction au résultat exact de la division de son numérateur par son dénominateur                                | s-f   | div. | Fractions : sens et écritures > définition                      |
| 6-126 | Comprendre et connaître la définition du quotient d'un entier a par un entier b non nul                                    | conn. | div. | Fractions : sens et écritures > définition                      |
| 6-127 | Compléter des égalités à trous multiplicatives                                                                             | s-f   | div. | Fractions : sens et écritures > définition _(discutable 3)_     |
| 6-128 | Placer une fraction sur une demi-droite graduée dans des cas simples                                                       | s-f   | div. | Fractions : sens et écritures > droite graduée                  |
| 6-129 | Graduer un segment de longueur donnée                                                                                      | s-f   | div. | Fractions : sens et écritures > droite graduée                  |
| 6-130 | Savoir que la fraction a/b peut représenter un nombre entier, un nombre décimal non entier ou un nombre non décimal        | conn. | div. | Fractions : sens et écritures > forme décimale _(discutable 4)_ |
| 6-131 | Utiliser une multiplication pour appliquer une fraction à un nombre entier                                                 | s-f   | div. | Fractions : calculs > fraction d'une quantité                   |
| 6-132 | Établir des égalités de fractions                                                                                          | s-f   | div. | Fractions : sens et écritures > égalité de fractions            |
| 6-133 | Comparer et encadrer des fractions                                                                                         | s-f   | div. | Fractions : sens et écritures > comparer                        |
| 6-134 | Ordonner une liste de nombres écrits sous forme de fractions ou de nombres mixtes                                          | s-f   | div. | Fractions : sens et écritures > comparer                        |
| 6-135 | Additionner et soustraire des fractions                                                                                    | s-f   | div. | Fractions : calculs > additionner et soustraire                 |
| 6-136 | Multiplier une fraction par un nombre entier                                                                               | s-f   | div. | Fractions : calculs > multiplier                                |
| 6-137 | Résoudre des problèmes mettant en jeu des fractions                                                                        | s-f   | div. | Fractions : calculs (notion)                                    |
| 6-138 | Inventer des problèmes mettant en jeu des fractions                                                                        | s-f   | div. | Fractions : calculs (notion)                                    |
| 6-139 | Comprendre le sens d'un pourcentage                                                                                        | conn. | div. | `Proportionnalité` Pourcentages > définition                    |
| 6-140 | Calculer une proportion (rapport entre une partie et le tout) et l'exprimer sous forme de pourcentage dans des cas simples | s-f   | div. | `Proportionnalité` Pourcentages > calculer                      |
| 6-141 | Appliquer un pourcentage à une grandeur ou à un nombre                                                                     | s-f   | div. | `Proportionnalité` Pourcentages > calculer                      |

### … > Algèbre · branche `Algèbre`

| Code  | Énoncé (verbatim BO)                                                                                   | kind | rég. | nœud                                        |
| ----- | ------------------------------------------------------------------------------------------------------ | ---- | ---- | ------------------------------------------- |
| 6-142 | Utiliser des modèles pré-algébriques (schémas en barre) pour résoudre des problèmes algébriques        | s-f  | div. | Premiers pas algébriques > nombre inconnu   |
| 6-143 | Identifier la structure d'un motif évolutif en repérant une régularité et en identifiant une structure | s-f  | div. | Premiers pas algébriques > suites de motifs |

### Grandeurs et mesures (branche `Grandeurs et mesures`)

| Code  | Énoncé (BO ; ⚙ = ligne d'Automatismes au contenu neuf, verbatim adapté en objectif)                                                | kind  | rég. | nœud                                   | Rubrique BO                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------- | ------------------------------------------------------ |
| 6-144 | ⚙ Calculer le périmètre d'un carré                                                                                                 | s-f   | flu. | Périmètres > carré                     | Les longueurs > Automatismes                           |
| 6-199 | ⚙ Calculer le périmètre d'un rectangle                                                                                             | s-f   | flu. | Périmètres > rectangle                 | Les longueurs > Automatismes                           |
| 6-145 | Savoir que le périmètre du disque est proportionnel à son diamètre                                                                  | conn. | div. | Périmètres > disque                    | Les longueurs                                          |
| 6-146 | Connaître la formule du périmètre d'un disque                                                                                       | conn. | div. | Périmètres > disque                    | Les longueurs                                          |
| 6-147 | Calculer le périmètre d'un disque                                                                                                   | s-f   | div. | Périmètres > disque                    | Les longueurs                                          |
| 6-148 | Calculer des périmètres de figures composées                                                                                        | s-f   | div. | Périmètres (notion)                    | Les longueurs                                          |
| 6-149 | Résoudre des problèmes impliquant des longueurs                                                                                     | s-f   | div. | Longueurs (notion)                     | Les longueurs                                          |
| 6-150 | Effectuer des conversions d'aire                                                                                                    | s-f   | div. | Aires > unités et conversions          | Les aires                                              |
| 6-151 | Connaître la formule de l'aire d'un carré                                                                                           | conn. | div. | Aires > carré                          | Les aires                                              |
| 6-200 | Connaître la formule de l'aire d'un rectangle                                                                                       | conn. | div. | Aires > rectangle                      | Les aires                                              |
| 6-152 | Calculer l'aire d'un carré                                                                                                          | s-f   | div. | Aires > carré                          | Les aires                                              |
| 6-201 | Calculer l'aire d'un rectangle                                                                                                      | s-f   | div. | Aires > rectangle                      | Les aires                                              |
| 6-153 | Connaître l'unité centimètre cube                                                                                                   | conn. | div. | Volumes > conversions _(discutable 8)_ | Les volumes                                            |
| 6-154 | Comparer des volumes                                                                                                                | s-f   | div. | Volumes (notion)                       | Les volumes                                            |
| 6-155 | Déterminer un volume en lien avec le dénombrement d'assemblages de cubes                                                            | s-f   | div. | Volumes (notion)                       | Les volumes                                            |
| 6-156 | ⚙ Savoir combien de jours il y a dans une année (bissextile ou non), combien d'années il y a dans un siècle, et dans un millénaire | conn. | flu. | Durées > convertir                     | Le repérage dans le temps et les durées > Automatismes |
| 6-157 | Effectuer des calculs sur des horaires et des durées                                                                                | s-f   | div. | Durées > calculer                      | Le repérage dans le temps et les durées                |
| 6-158 | Résoudre des problèmes impliquant des horaires et des durées                                                                        | s-f   | div. | Durées > calculer                      | idem                                                   |
| 6-159 | Convertir des durées                                                                                                                | s-f   | div. | Durées > convertir                     | idem                                                   |

### Espace et géométrie > Étude de configurations planes (branche `Géométrie`, sauf Angles → `Grandeurs et mesures`)

| Code  | Énoncé (verbatim BO)                                                                                                                                                                                                                         | kind  | rég. | nœud                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------------------ |
| 6-160 | Connaître et utiliser la définition de la distance entre deux points                                                                                                                                                                         | s-f   | div. | Figures planes > cercle _(discutable 6)_               |
| 6-161 | Connaître et utiliser la définition du milieu d'un segment                                                                                                                                                                                   | s-f   | div. | Figures planes > cercle _(discutable 6)_               |
| 6-162 | Connaître les définitions d'un cercle, d'un disque, d'un rayon, d'un diamètre, d'une corde                                                                                                                                                   | conn. | div. | Figures planes > cercle                                |
| 6-163 | Comprendre la définition d'un cercle et celle d'un disque sous la forme d'ensembles de points                                                                                                                                                | conn. | div. | Figures planes > cercle                                |
| 6-164 | Résoudre des problèmes mettant en jeu des distances à un point                                                                                                                                                                               | s-f   | div. | Figures planes > cercle                                |
| 6-165 | Connaître la définition de la médiatrice d'un segment                                                                                                                                                                                        | conn. | div. | Figures planes > médiatrice et bissectrice             |
| 6-166 | Comprendre et utiliser la propriété caractéristique de la médiatrice d'un segment                                                                                                                                                            | s-f   | div. | Figures planes > médiatrice et bissectrice             |
| 6-167 | Résoudre des problèmes en s'appuyant sur la propriété caractéristique de la médiatrice                                                                                                                                                       | s-f   | div. | Figures planes > médiatrice et bissectrice             |
| 6-168 | Connaître et utiliser les angles ainsi que le lexique et les notations qui s'y rapportent : angle droit, angle plat, angle plein, angle nul, angle aigu, angle obtus, angles opposés par le sommet, angles adjacents, angles supplémentaires | s-f   | div. | `Grandeurs et mesures` Angles (notion, _discutable 7_) |
| 6-169 | Mesurer un angle                                                                                                                                                                                                                             | s-f   | div. | `Grandeurs et mesures` Angles > mesurer en degrés      |
| 6-170 | Construire un angle de mesure donnée                                                                                                                                                                                                         | s-f   | div. | `Grandeurs et mesures` Angles > construire             |
| 6-171 | Connaître la définition de la bissectrice d'un angle saillant                                                                                                                                                                                | conn. | div. | Figures planes > médiatrice et bissectrice             |
| 6-172 | Utiliser la définition de la bissectrice d'un angle pour effectuer des constructions et résoudre des problèmes                                                                                                                               | s-f   | div. | Figures planes > médiatrice et bissectrice             |
| 6-173 | Construire des triangles                                                                                                                                                                                                                     | s-f   | div. | Figures planes > triangles                             |
| 6-174 | Connaître et utiliser les propriétés angulaires des triangles particuliers : triangle rectangle, triangle isocèle, triangle équilatéral                                                                                                      | s-f   | div. | Figures planes > triangles                             |
| 6-175 | Connaître la valeur de la somme des mesures des angles d'un triangle                                                                                                                                                                         | conn. | div. | Figures planes > triangles                             |
| 6-176 | Utiliser la valeur de la somme des mesures des angles d'un triangle pour calculer des angles, effectuer des constructions et résoudre des problèmes                                                                                          | s-f   | div. | Figures planes > triangles                             |
| 6-177 | Savoir que les médiatrices d'un triangle sont concourantes                                                                                                                                                                                   | conn. | div. | Figures planes > triangles                             |
| 6-178 | Connaître et construire le cercle circonscrit à un triangle                                                                                                                                                                                  | s-f   | div. | Figures planes > triangles                             |
| 6-179 | Connaître la définition du symétrique d'un point par rapport à une droite                                                                                                                                                                    | conn. | div. | Symétrie axiale (notion)                               |
| 6-180 | Connaître et utiliser les propriétés de la symétrie axiale pour effectuer des constructions                                                                                                                                                  | s-f   | div. | Symétrie axiale (notion)                               |

### … > La vision dans l'espace · OGD et probabilités · La proportionnalité · Pensée informatique

| Code  | Énoncé (verbatim BO)                                                                                                                                                          | kind  | rég. | nœud                                                            | Rubrique BO                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 6-181 | Voir dans l'espace des assemblages de cubes : passage, dans les deux sens, entre l'objet à trois dimensions et ses diverses représentations à deux dimensions ; dénombrements | s-f   | div. | Solides (notion)                                                | Espace et géométrie > La vision dans l'espace                                           |
| 6-182 | Planifier une enquête et recueillir des données                                                                                                                               | s-f   | div. | `Statistiques` Représenter des données (notion)                 | Organisation et gestion de données et probabilités > Organisation et gestion de données |
| 6-183 | Réaliser des mesures et les consigner dans un tableau                                                                                                                         | s-f   | div. | `Statistiques` Représenter des données > tableaux               | idem                                                                                    |
| 6-184 | Construire un tableau simple pour présenter des données (observations, caractères)                                                                                            | s-f   | div. | `Statistiques` Représenter des données > tableaux               | idem                                                                                    |
| 6-185 | Faire un choix en filtrant les données d'un tableau selon un critère                                                                                                          | s-f   | div. | `Statistiques` Représenter des données > tableaux               | idem                                                                                    |
| 6-186 | Savoir que la probabilité d'un évènement est un nombre compris entre 0 et 1                                                                                                   | conn. | div. | `Probabilités` Expériences aléatoires > probabilité simple      | … > Les probabilités                                                                    |
| 6-187 | Calculer des probabilités dans des situations simples d'équiprobabilité                                                                                                       | s-f   | div. | `Probabilités` Expériences aléatoires > équiprobabilité         | idem                                                                                    |
| 6-188 | Comparer des résultats d'une expérience aléatoire répétée à une probabilité calculée                                                                                          | s-f   | div. | `Probabilités` Expériences aléatoires > fréquences              | idem                                                                                    |
| 6-189 | Connaître la définition de la proportionnalité entre deux grandeurs et la mettre en lien avec des expressions de la vie courante                                              | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître | La proportionnalité                                                                     |
| 6-190 | Identifier si une situation relève du « modèle » de la proportionnalité                                                                                                       | s-f   | div. | `Proportionnalité` Situations de proportionnalité > reconnaître | idem                                                                                    |
| 6-191 | Résoudre un problème de proportionnalité en choisissant une procédure adaptée : propriété de linéarité pour la multiplication ou l'addition, retour à l'unité                 | s-f   | div. | `Proportionnalité` Situations de proportionnalité > appliquer   | idem                                                                                    |
| 6-192 | Représenter une situation de proportionnalité à l'aide d'un tableau ou de notations symboliques                                                                               | s-f   | div. | `Proportionnalité` Situations de proportionnalité (notion)      | idem                                                                                    |
| 6-193 | S'initier à la résolution de problèmes d'échelles                                                                                                                             | s-f   | div. | `Proportionnalité` Échelle d'une carte (notion)                 | idem                                                                                    |
| 6-194 | Identifier une instruction ou une séquence d'instructions                                                                                                                     | algo. | div. | `Algorithmique` Préalgorithmique                                | Initiation à la pensée informatique                                                     |
| 6-195 | Produire et exécuter une séquence d'instructions                                                                                                                              | algo. | div. | `Algorithmique` Préalgorithmique                                | idem                                                                                    |
| 6-196 | Répéter à la main une séquence d'instructions pour accomplir une tâche imposée                                                                                                | algo. | div. | `Algorithmique` Préalgorithmique                                | idem                                                                                    |
| 6-197 | Programmer la construction d'un chemin simple                                                                                                                                 | algo. | div. | `Algorithmique` Préalgorithmique                                | idem                                                                                    |

---

## Les références d'automatismes (`curriculum_point_automatismes`, grade `6`)

Chaque ligne des rubriques « Automatismes » de la 6e → le(s) point(s) du parcours qui
porte(nt) ce contenu. **35 lignes → 28 points cibles distincts** (doublons dédupliqués).

| Ligne d'Automatismes de la 6e (résumé fidèle)                                                      | Point(s) cible(s)                                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Relations entre 1/1000, 1/100, 1/10 et 1 (restitution automatique)                                 | CM2-024                                                                        |
| Équivalences d'écriture 1/10 = 0,1 ; 1/100 = 0,01 ; 1/1000 = 0,001                                 | CM2-030                                                                        |
| Passage fraction décimale / somme de fractions décimales ↔ écriture décimale (4,107…)             | CM2-030                                                                        |
| Multiplication d'un décimal par 1, 10, 100 ou 1 000                                                | CM2-042                                                                        |
| Division d'un décimal par 1, 10, 100 ou 1 000                                                      | CM2-043                                                                        |
| Reconnaître une fraction sur des représentations variées                                           | CM2-013                                                                        |
| Relations entre ¼, ½, ¾ et 1 ; « égalités à trous » automatiques                                   | CM2-038                                                                        |
| Passage automatique écriture fractionnaire ↔ décimale (¼ = 0,25 ; ½ = 0,5…)                       | CM2-039                                                                        |
| Diviseurs, multiples et tables de multiplication réactivés (calcul sur les fractions)              | CM2-021 · CM2-008                                                              |
| Calculer 2/3 de 12 œufs, ¾ de 10 m                                                                 | CM2-022                                                                        |
| Préfixes kilo → milli ; relations entre le mètre, ses multiples et sous-multiples                  | CM1-067 · CM1-068                                                              |
| Relations entre deux unités successives (1 dm = 10 cm, 1 cm = 0,1 dm)                              | CM1-068                                                                        |
| Convertir en mètre une longueur donnée dans une autre unité, et inversement                        | CM1-068                                                                        |
| Utiliser le compas comme outil de report de longueurs                                              | CE2-043                                                                        |
| Le périmètre d'une figure plane est la longueur de son contour                                     | CE2-042                                                                        |
| Calculer le périmètre d'un carré et d'un rectangle                                                 | → **point neuf 6-144 · 6-199** (aucun point du parcours ne porte ces formules) |
| Comparer des aires sans mesure (superposition, découpage et recollement)                           | CM2-071                                                                        |
| 1 cm² / 1 dm² / 1 m² = aires des carrés de 1 cm / 1 dm / 1 m de côté                               | CM2-073                                                                        |
| Déterminer l'aire d'une surface sur quadrillage de carreaux de 1 cm                                | CM2-072                                                                        |
| 1 m² = 100 dm², 1 dm² = 100 cm² ; 1 cm² = 0,01 dm² ; 1 dm² = 0,01 m²                               | CM2-074                                                                        |
| Lire l'heure (cadran à aiguilles ou affichage digital)                                             | CM2-082                                                                        |
| Placer les aiguilles pour une heure donnée                                                         | CM2-083                                                                        |
| Unités jour, heure, minute, seconde et leurs relations                                             | CE1-062 _(discutable 10)_                                                      |
| Demi-heure = 30 min, quart d'heure = 15 min, trois quarts d'heure = 45 min                         | CE1-062                                                                        |
| Jours dans l'année (bissextile ou non), années dans un siècle, dans un millénaire                  | → **point neuf 6-156** (aucun point du parcours)                               |
| Lexique et codage : angle droit, égalité de longueurs, égalité d'angles                            | CM2-088                                                                        |
| Reconnaître un carré, un rectangle, un triangle                                                    | CM2-092                                                                        |
| Reconnaître les axes de symétrie d'une figure                                                      | CM1-106                                                                        |
| Coder des angles droits et des longueurs égales                                                    | CM2-088                                                                        |
| Identifier pyramides, boules, cubes, cylindres, pavés, cônes, prismes droits                       | CM2-098                                                                        |
| Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate) | CM2-107 · CM2-123 · CM2-124 · CM2-125                                          |
| Relations multiplicatives simples (double, quadruple, moitié, tiers, quart)                        | CE2-022                                                                        |
| Associer « 4 fois plus grand, 4 fois plus petit, 5 fois plus, 5 fois moins » à une × ou une ÷      | CM2-061                                                                        |

---

## Rattachements discutables (validés en bloc par A4, sauf veto)

1. **Valeur des chiffres / unités de numération** (6-101, 6-102) : la puce 101 ne cite
   pas les décimaux → `Entiers : numération > décomposer` ; la 102 va jusqu'au millième
   → `Décimaux : numération > décomposer`.
2. **« Reconnaître un nombre décimal » et « différentes écritures d'un décimal »**
   (6-104, 6-106) → la **notion** `Décimaux : numération` (définition du décimal ;
   écritures à cheval sur `écrire` et `forme fractionnaire`).
3. **« Compléter des égalités à trous multiplicatives »** (6-127) → `Fractions >
définition` : le BO le place au cœur du sens quotient (b × ? = a), pas dans
   l'algèbre. Alternative : `Premiers pas algébriques > égalités à trous`.
4. **« a/b peut représenter un entier, un décimal, un non-décimal »** (6-130) →
   `Fractions > forme décimale` (nature du nombre représenté).
5. **Les « résoudre des problèmes mettant en jeu des ×/÷ »** (6-120/122/124) → la
   sous-notion d'**opération**, pas `Problèmes arithmétiques` : ce sont des problèmes
   d'application d'une opération précise (cohérent avec « problèmes impliquant des
   longueurs » → Longueurs au CM).
6. **Distance entre deux points et milieu d'un segment** (6-160/161) → `Figures
planes > cercle` : choix du doc d'écarts (« distances = points sous cercle » — le
   cercle est défini comme ensemble de points équidistants, le milieu prépare la
   médiatrice).
7. **Le lexique complet des angles** (6-168, y compris opposés par le sommet, adjacents,
   supplémentaires) → `Angles` (notion), sans scission : un seul geste de vocabulaire,
   comme au CM. Alternative : scinder le versant « configurations » vers Figures planes.
8. **« Connaître l'unité centimètre cube »** (6-153) → `Volumes > conversions` (la
   sous-notion des unités).
9. **Règle de ciblage des références** : le point le plus récent du parcours qui couvre
   le contenu (CM2 avant CM1, CM avant cycle 2) — le CM2 réactive déjà le CM1.
10. **« Unités jour/heure/minute/seconde et relations »** → référence CE1-062 (qui porte
    h/min et leurs relations), pas un point neuf : seule la composante « jour », triviale,
    n'est portée nulle part — elle vit dans le point neuf 6-156 (année/siècle/millénaire).

## Questions (A1-A4)

- **A1 — Pensée informatique (6-194 à 6-197)** : `Algorithmique > Préalgorithmique`
  (reco — la notion que tu as créée pour ça ; la branche s'ouvre ainsi CM2 → 6e) ou
  `Repérage et déplacements > coder un déplacement` (choix du doc d'écarts, antérieur à
  la création de Préalgorithmique) ?
- **A2 — kind `algorithme`** pour ces 4 points (reco : oui — B3 l'a créé pour les
  contenus algorithmiques des BO).
- **A3 — codes `6-101` à `6-197`** : l'ancien seed 2020 occupe `6-001`…`6-095` jusqu'à
  l'étape destructive de C5 (l'index d'unicité des codes est global) ; la nouvelle série
  continue à 101. Reco : oui.
- **A4 — validation d'ensemble** : les 97 points (dont les 2 ⚙ en fluence), les 35
  lignes de références → 28 cibles, les 10 rattachements discutables.

## Après validation (plan de livraison)

1. Worktree + migration **additive** `seed_curriculum_points_6e.sql` : les 97 points
   (codes explicites, nœuds par chemin complet) PUIS les références
   (`curriculum_point_automatismes` : point ciblé par code, grade '6') — le trigger C14
   valide chaque cible contre le parcours, le verrou C13 s'applique. Bloc DO : comptes
   (97 ; 28 références) + 0 sans nœud. Rollback scopé en commentaire (⚠️ même mise en
   garde RGPD que le cycle 2).
2. Test d'intégration : comparaison intégrale des 97 points ET des 28 références en
   lecture anonyme, vérifié rouge sans la migration.
3. `security-auditor`, PR, CI verte, merge, `db:migrate`, vérification prod.
4. L'ancien seed 6e (2020, `6-001`…`6-095`) reste en place SANS SERVIR (R5 = B) et part
   à l'étape 4 de C5. Ensuite : remplissage des rangements (correspondance validée),
   puis séquence C5.
