# Seed cycle 2 (CP, CE1, CE2) — points du programme (architecture points → nœuds)

> **Statut : EN ATTENTE DE VALIDATION (une seule question : V1, validation d'ensemble).
> Aucune migration avant.**
> Source : « Annexe 4 — Programme de mathématiques du cycle 2 » (arrêté du 22-10-2024,
> BOENJS n° 41 du 31 octobre 2024), colonne « Objectifs d'apprentissage », extraite
> **ligne à ligne** (38 p. lues ; la colonne « Exemples de réussite » n'est pas exigible
> et ne devient pas des points). Mapping :
> [programmes-ecarts-cycle2.md](programmes-ecarts-cycle2.md) (questions Q1-Q7 tranchées
> le 2026-10-07 et déjà appliquées à l'arbre). Conventions **reconduites du seed CM**
> (validées le 2026-10-07) : une puce = un point ; puce couvrant plusieurs sous-notions
> d'une même notion → point sur la **notion** ; on classe ce que le contenu **EST** ;
> `fluence` = toute la section « Le calcul mental ». **Aucune scission nécessaire** : au
> cycle 2, les tables d'addition et de multiplication sont déjà des puces séparées.
> ✍️ L'orthographe rectifiée du BO (« Connaitre », « maitriser ») est conservée au mot près.

## Attributs communs

| Attribut               | Valeur                                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `CP` / `CE1` / `CE2`                                                                                                                                                                                                                                                 |
| `code`                 | `CP-001`… / `CE1-001`… / `CE2-001`… — explicites dans la migration (même raison qu'au seed CM : le trigger d'auto-code exige un objectif)                                                                                                                            |
| `objective_id`, `rang` | `NULL`                                                                                                                                                                                                                                                               |
| `node_id`              | nœud de l'arbre 2026-10-07.13, résolu par chemin — colonne « nœud »                                                                                                                                                                                                  |
| `rubrique`             | rubrique du BO à deux niveaux (C11), ex. `Grandeurs et mesures > La monnaie` — titre de section des tableaux. Au CP-CE1, le BO intercale un étage « Les longueurs et les masses » : artefact de mise en page, la rubrique retient `> Les longueurs` / `> Les masses` |
| `kind`                 | conn. / s-f, mêmes règles qu'au seed CM (« Connaitre et utiliser » = s-f)                                                                                                                                                                                            |
| `exigence`             | `attendu` partout                                                                                                                                                                                                                                                    |
| `regime_acquisition`   | `diversite` (div.) par défaut ; `fluence` (flu.) = sections « Le calcul mental » (11 CP + 10 CE1 + 9 CE2 = 30 points)                                                                                                                                                |
| `display_order`        | ordre d'apparition dans le BO (numéro du code)                                                                                                                                                                                                                       |

Dans les tableaux, le nœud est écrit `Notion > sous-notion` (branche en titre de bloc) ;
`(notion)` = rattachement direct à la notion. Rien pour les principes transversaux
(calculatrice interdite, deux tiers du temps, fluences chiffrées : métadonnées, pas des
points).

---

## CP — 69 points

### Nombres, calcul et résolution de problèmes > Les nombres entiers · branche `Nombres et calculs` (sauf mention)

| Code   | Énoncé (verbatim BO)                                                                                               | kind  | rég. | nœud                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ---------------------------------------- |
| CP-001 | Comparer et dénombrer des collections en les organisant.                                                           | s-f   | div. | Entiers : numération > dénombrer         |
| CP-002 | Construire des collections de cardinal donné.                                                                      | s-f   | div. | Entiers : numération > dénombrer         |
| CP-003 | Connaitre la suite écrite et la suite orale des nombres jusqu'à cent.                                              | conn. | div. | Entiers : numération > écrire            |
| CP-004 | Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à l'autre.                           | s-f   | div. | Entiers : numération > écrire            |
| CP-005 | Connaitre la valeur des chiffres en fonction de leur position (unités, dizaines).                                  | conn. | div. | Entiers : numération > décomposer        |
| CP-006 | Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >.                            | s-f   | div. | Entiers : numération > comparer          |
| CP-007 | Ordonner des nombres dans l'ordre croissant ou décroissant.                                                        | s-f   | div. | Entiers : numération > comparer          |
| CP-008 | Savoir placer des nombres sur une demi-droite graduée de un en un.                                                 | s-f   | div. | Entiers : numération > repérer           |
| CP-009 | Connaitre les nombres ordinaux jusqu'à « vingtième ».                                                              | conn. | div. | Entiers : numération > ordinaux et rangs |
| CP-010 | Comprendre et utiliser les nombres ordinaux.                                                                       | s-f   | div. | Entiers : numération > ordinaux et rangs |
| CP-011 | Repérer un rang ou une position dans une file orientée ou dans une liste d'objets ou de personnes.                 | s-f   | div. | Entiers : numération > ordinaux et rangs |
| CP-012 | Faire le lien entre le rang d'un objet dans une liste et le nombre d'éléments qui le précèdent.                    | s-f   | div. | Entiers : numération > ordinaux et rangs |
| CP-013 | Utiliser les nombres ordinaux dans le cadre de l'étude de suites de symboles, de formes, de lettres ou de nombres. | s-f   | div. | Entiers : numération > ordinaux et rangs |

### … > Les quatre opérations

| Code   | Énoncé (verbatim BO)                                       | kind  | rég. | nœud                                             |
| ------ | ---------------------------------------------------------- | ----- | ---- | ------------------------------------------------ |
| CP-014 | Comprendre le sens de l'addition et de la soustraction.    | conn. | div. | Entiers : addition et soustraction (notion)      |
| CP-015 | Comprendre et utiliser les symboles « + », « - » et « = ». | s-f   | div. | Entiers : addition et soustraction (notion)      |
| CP-016 | Poser et effectuer des additions en colonnes.              | s-f   | div. | Entiers : addition et soustraction > calcul posé |
| CP-017 | Comprendre le sens de la multiplication.                   | conn. | div. | Entiers : multiplication > produit               |

### … > Le calcul mental — tout en `fluence`

| Code   | Énoncé (verbatim BO)                                                | kind  | rég. | nœud                                                  |
| ------ | ------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------- |
| CP-018 | Connaitre dans les deux sens les tables d'addition.                 | conn. | flu. | Entiers : addition et soustraction > tables           |
| CP-019 | Connaitre les doubles et les moitiés de nombres usuels.             | conn. | flu. | Entiers : addition et soustraction > double et moitié |
| CP-020 | Ajouter ou soustraire 1 ou 2 à un nombre.                           | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CP-021 | Ajouter ou soustraire 10 à un nombre.                               | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CP-022 | Ajouter ou soustraire 20, 30, 40, 50, 60, 70, 80 ou 90 à un nombre. | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CP-023 | Trouver le complément d'un nombre à la dizaine supérieure.          | s-f   | flu. | Entiers : addition et soustraction > complément       |
| CP-024 | Ajouter un nombre inférieur à 9 à un nombre.                        | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CP-025 | Ajouter 9 à un nombre.                                              | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CP-026 | Ajouter deux nombres inférieurs à 100.                              | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CP-027 | Déterminer la moitié d'un nombre pair.                              | s-f   | flu. | Entiers : addition et soustraction > double et moitié |
| CP-028 | Soustraire un nombre inférieur à 10 à un nombre entier de dizaines. | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |

### … > La résolution de problèmes

| Code   | Énoncé (verbatim BO)                                                                         | kind | rég. | nœud                                             |
| ------ | -------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------ |
| CP-029 | Résoudre des problèmes additifs en une étape du type parties-tout.                           | s-f  | div. | Problèmes arithmétiques > parties-tout           |
| CP-030 | Résoudre des problèmes additifs en deux étapes (champ numérique inférieur ou égal à 30).     | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |
| CP-031 | Résoudre des problèmes multiplicatifs en une étape (champ numérique inférieur ou égal à 30). | s-f  | div. | Problèmes arithmétiques > multiplicatifs         |

### Grandeurs et mesures (branche `Grandeurs et mesures`)

| Code   | Énoncé (verbatim BO)                                                                                                                     | kind  | rég. | nœud                              | Rubrique BO               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------- | ------------------------- |
| CP-032 | Utiliser le lexique spécifique associé aux longueurs.                                                                                    | s-f   | div. | Longueurs (notion)                | Les longueurs             |
| CP-033 | Comparer des objets selon leur longueur.                                                                                                 | s-f   | div. | Longueurs > comparer et mesurer   | Les longueurs             |
| CP-034 | Comparer des segments selon leur longueur.                                                                                               | s-f   | div. | Longueurs > comparer et mesurer   | Les longueurs             |
| CP-035 | Savoir mesurer la longueur d'un segment en utilisant une règle graduée.                                                                  | s-f   | div. | Longueurs > comparer et mesurer   | Les longueurs             |
| CP-036 | Connaitre et utiliser les unités mètre et centimètre et les symboles associés (m et cm).                                                 | s-f   | div. | Longueurs > unités et conversions | Les longueurs             |
| CP-037 | Connaitre quelques longueurs de référence.                                                                                               | conn. | div. | Longueurs > comparer et mesurer   | Les longueurs             |
| CP-038 | Savoir qu'un mètre est égal à cent centimètres.                                                                                          | conn. | div. | Longueurs > unités et conversions | Les longueurs             |
| CP-039 | Utiliser le lexique associé aux masses.                                                                                                  | s-f   | div. | Masses (notion)                   | Les masses                |
| CP-040 | Comparer des objets selon leur masse.                                                                                                    | s-f   | div. | Masses > comparer et mesurer      | Les masses                |
| CP-041 | Utiliser le lexique spécifique lié à la monnaie.                                                                                         | s-f   | div. | Monnaie (notion)                  | La monnaie                |
| CP-042 | Comparer les valeurs de deux ensembles constitués de pièces de monnaie ou de deux ensembles constitués de pièces et de billets.          | s-f   | div. | Monnaie > pièces et billets       | La monnaie                |
| CP-043 | Déterminer la valeur en euro d'un ensemble constitué de pièces et de billets.                                                            | s-f   | div. | Monnaie > pièces et billets       | La monnaie                |
| CP-044 | Constituer une somme d'argent donnée avec des pièces et des billets.                                                                     | s-f   | div. | Monnaie > pièces et billets       | La monnaie                |
| CP-045 | Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.                                                   | s-f   | div. | Monnaie > rendre la monnaie       | La monnaie                |
| CP-046 | Lire sur une horloge à aiguilles une heure donnée en heures entières.                                                                    | s-f   | div. | Durées > lire l'heure             | Le repérage dans le temps |
| CP-047 | Positionner les aiguilles d'une horloge correspondant à une heure donnée (uniquement des heures entières inférieures ou égales à douze). | s-f   | div. | Durées > lire l'heure             | idem                      |
| CP-048 | Associer une heure à un moment de la journée.                                                                                            | s-f   | div. | Durées > lire l'heure             | idem                      |

### Espace et géométrie (branche `Géométrie`)

| Code   | Énoncé (verbatim BO)                                                                                                       | kind  | rég. | nœud                                            | Rubrique BO               |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------- | ------------------------- |
| CP-049 | Reconnaitre les solides usuels suivants : cube, boule, cône, cylindre, pavé.                                               | s-f   | div. | Solides > reconnaître et décrire                | Les solides               |
| CP-050 | Nommer un cube, un pavé et une boule.                                                                                      | s-f   | div. | Solides > reconnaître et décrire                | Les solides               |
| CP-051 | Décrire un cube ou un pavé en utilisant le terme « face ».                                                                 | s-f   | div. | Solides > reconnaître et décrire                | Les solides               |
| CP-052 | Connaitre le nombre et la nature des faces d'un cube et d'un pavé.                                                         | conn. | div. | Solides > reconnaître et décrire                | Les solides               |
| CP-053 | Construire des cubes et des pavés.                                                                                         | s-f   | div. | Solides > construire                            | Les solides               |
| CP-054 | Reconnaitre des formes planes (disque, carré, rectangle et triangle) dans un assemblage et dans son environnement proche.  | s-f   | div. | Figures planes > reconnaître et décrire         | La géométrie plane        |
| CP-055 | Nommer le disque, le carré, le rectangle et le triangle.                                                                   | s-f   | div. | Figures planes > reconnaître et décrire         | idem                      |
| CP-056 | Donner une première description du carré, du rectangle, du triangle en utilisant les termes « sommet » et « côté ».        | s-f   | div. | Figures planes > reconnaître et décrire         | idem                      |
| CP-057 | Repérer visuellement des alignements.                                                                                      | s-f   | div. | Figures planes > reconnaître et décrire         | idem                      |
| CP-058 | Utiliser la règle pour repérer ou vérifier des alignements.                                                                | s-f   | div. | Figures planes > reconnaître et décrire         | idem                      |
| CP-059 | Utiliser la règle comme instrument de tracé.                                                                               | s-f   | div. | Figures planes > reproduire et construire       | idem                      |
| CP-060 | Construire un carré, un rectangle, un triangle ou un assemblage de ces figures sur du papier quadrillé ou pointé.          | s-f   | div. | Figures planes > reproduire et construire       | idem                      |
| CP-061 | Connaitre et utiliser le vocabulaire lié aux positions relatives.                                                          | s-f   | div. | Repérage et déplacements > positions et plans   | Le repérage dans l'espace |
| CP-062 | Situer des personnes ou des objets les uns par rapport aux autres ou par rapport à d'autres repères dans la classe.        | s-f   | div. | Repérage et déplacements > positions et plans   | idem                      |
| CP-063 | Construire et utiliser des représentations de la classe pour localiser, mémoriser ou communiquer un emplacement.           | s-f   | div. | Repérage et déplacements > positions et plans   | idem                      |
| CP-064 | Construire et reproduire des assemblages de solides à partir d'un modèle en trois dimensions ou de représentations planes. | s-f   | div. | Solides > construire _(discutable 3)_           | idem                      |
| CP-065 | Se déplacer et décrire des déplacements dans la classe en s'orientant et en utilisant des repères.                         | s-f   | div. | Repérage et déplacements > coder un déplacement | idem                      |
| CP-066 | Construire et utiliser un plan de la classe pour communiquer un déplacement.                                               | s-f   | div. | Repérage et déplacements > coder un déplacement | idem                      |
| CP-067 | Utiliser et produire une suite d'instructions qui codent un déplacement en utilisant un vocabulaire spatial précis.        | s-f   | div. | Repérage et déplacements > coder un déplacement | idem                      |

### Organisation et gestion de données (branche `Statistiques`)

| Code   | Énoncé (verbatim BO)                                                                                | kind | rég. | nœud                                              | Rubrique BO                        |
| ------ | --------------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------- | ---------------------------------- |
| CP-068 | Collecter des données et présenter ces données sous forme d'un tableau ou d'un diagramme en barres. | s-f  | div. | Représenter des données (notion)                  | Organisation et gestion de données |
| CP-069 | Construire et compléter un tableau à double entrée.                                                 | s-f  | div. | Représenter des données > tableau à double entrée | idem                               |

---

## CE1 — 82 points

### Nombres, calcul et résolution de problèmes > Les nombres entiers

| Code    | Énoncé (verbatim BO)                                                                                                  | kind  | rég. | nœud                                     |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ---------------------------------------- |
| CE1-001 | Dénombrer des collections en les organisant.                                                                          | s-f   | div. | Entiers : numération > dénombrer         |
| CE1-002 | Construire des collections de cardinal donné.                                                                         | s-f   | div. | Entiers : numération > dénombrer         |
| CE1-003 | Connaitre et utiliser la relation entre unités et dizaines, entre dizaines et centaines, entre unités et centaines.   | s-f   | div. | Entiers : numération > décomposer        |
| CE1-004 | Connaitre la suite écrite et la suite orale des nombres jusqu'à mille.                                                | conn. | div. | Entiers : numération > écrire            |
| CE1-005 | Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à l'autre.                              | s-f   | div. | Entiers : numération > écrire            |
| CE1-006 | Connaitre la valeur des chiffres en fonction de leur position dans un nombre.                                         | conn. | div. | Entiers : numération > décomposer        |
| CE1-007 | Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).                               | s-f   | div. | Entiers : numération > comparer          |
| CE1-008 | Ordonner des nombres dans l'ordre croissant ou décroissant.                                                           | s-f   | div. | Entiers : numération > comparer          |
| CE1-009 | Comprendre et savoir utiliser les expressions « égal à », « supérieur à », « inférieur à », « compris entre … et … ». | s-f   | div. | Entiers : numération > comparer          |
| CE1-010 | Savoir placer des nombres sur une demi-droite graduée.                                                                | s-f   | div. | Entiers : numération > repérer           |
| CE1-011 | Connaitre les nombres ordinaux jusqu'à cent.                                                                          | conn. | div. | Entiers : numération > ordinaux et rangs |
| CE1-012 | Comprendre et utiliser les nombres ordinaux.                                                                          | s-f   | div. | Entiers : numération > ordinaux et rangs |
| CE1-013 | Repérer un rang ou une position dans une file orientée ou dans une liste d'objets ou de personnes.                    | s-f   | div. | Entiers : numération > ordinaux et rangs |
| CE1-014 | Faire le lien entre le rang d'un objet dans une liste et le nombre d'éléments qui le précèdent.                       | s-f   | div. | Entiers : numération > ordinaux et rangs |
| CE1-015 | Utiliser les nombres ordinaux dans le cadre de l'étude de suites de symboles, de formes, de lettres ou de nombres.    | s-f   | div. | Entiers : numération > ordinaux et rangs |

### … > Les fractions (nouveauté du programme 2024)

| Code    | Énoncé (verbatim BO)                                                                     | kind | rég. | nœud                                            |
| ------- | ---------------------------------------------------------------------------------------- | ---- | ---- | ----------------------------------------------- |
| CE1-016 | Savoir interpréter, représenter, écrire et lire les fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ et 1/10.  | s-f  | div. | Fractions : sens et écritures > définition      |
| CE1-017 | Savoir interpréter, représenter, écrire et lire des fractions inférieures ou égales à 1. | s-f  | div. | Fractions : sens et écritures > définition      |
| CE1-018 | Connaitre et utiliser les mots « dénominateur » et « numérateur ».                       | s-f  | div. | Fractions : sens et écritures > définition      |
| CE1-019 | Comparer des fractions ayant le même dénominateur.                                       | s-f  | div. | Fractions : sens et écritures > comparer        |
| CE1-020 | Comparer des fractions dont le numérateur est 1.                                         | s-f  | div. | Fractions : sens et écritures > comparer        |
| CE1-021 | Additionner et soustraire des fractions de même dénominateur.                            | s-f  | div. | Fractions : calculs > additionner et soustraire |

### … > Les quatre opérations

| Code    | Énoncé (verbatim BO)                                               | kind  | rég. | nœud                                             |
| ------- | ------------------------------------------------------------------ | ----- | ---- | ------------------------------------------------ |
| CE1-022 | Poser et effectuer des additions et des soustractions en colonnes. | s-f   | div. | Entiers : addition et soustraction > calcul posé |
| CE1-023 | Comprendre et utiliser le symbole « × ».                           | s-f   | div. | Entiers : multiplication > produit               |
| CE1-024 | Comprendre et savoir que la multiplication est commutative.        | conn. | div. | Entiers : multiplication > produit               |
| CE1-025 | Connaitre la notion de parité d'un nombre.                         | conn. | div. | `Arithmétique` Divisibilité > pair ou impair     |

### … > Le calcul mental — tout en `fluence`

| Code    | Énoncé (verbatim BO)                                                                                                                                                                                                                        | kind  | rég. | nœud                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------------------- |
| CE1-026 | Connaitre dans les deux sens les tables d'addition.                                                                                                                                                                                         | conn. | flu. | Entiers : addition et soustraction > tables                       |
| CE1-027 | Connaitre dans les deux sens les tables de multiplication.                                                                                                                                                                                  | conn. | flu. | Entiers : multiplication > tables                                 |
| CE1-028 | Connaitre des faits multiplicatifs usuels.                                                                                                                                                                                                  | conn. | flu. | Entiers : multiplication > produits particuliers _(discutable 1)_ |
| CE1-029 | Ajouter ou soustraire un nombre entier de dizaines à un nombre. Ajouter ou soustraire un nombre entier de centaines à un nombre.                                                                                                            | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux             |
| CE1-030 | Multiplier par 10 un nombre inférieur à 100.                                                                                                                                                                                                | s-f   | flu. | Entiers : multiplication > puissances de 10                       |
| CE1-031 | Ajouter 9, 19 ou 29 à un nombre.                                                                                                                                                                                                            | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux             |
| CE1-032 | Soustraire 9 à un nombre.                                                                                                                                                                                                                   | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux             |
| CE1-033 | Soustraire un nombre inférieur à 9 à un nombre.                                                                                                                                                                                             | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux             |
| CE1-034 | Déterminer la moitié d'un nombre pair.                                                                                                                                                                                                      | s-f   | flu. | Entiers : addition et soustraction > double et moitié             |
| CE1-035 | Calculer le produit d'un nombre compris entre 11 et 19 par un nombre inférieur à 10 en décomposant le plus grand des deux facteurs en la somme de deux nombres (propriété de distributivité de la multiplication par rapport à l'addition). | s-f   | flu. | Entiers : multiplication > distributivité                         |

### … > La résolution de problèmes

| Code    | Énoncé (verbatim BO)                                                                           | kind | rég. | nœud                                             |
| ------- | ---------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------ |
| CE1-036 | Résoudre des problèmes additifs en une étape de type parties-tout.                             | s-f  | div. | Problèmes arithmétiques > parties-tout           |
| CE1-037 | Résoudre des problèmes additifs de comparaison en une étape.                                   | s-f  | div. | Problèmes arithmétiques > comparaison            |
| CE1-038 | Résoudre des problèmes additifs en deux étapes.                                                | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |
| CE1-039 | Résoudre des problèmes multiplicatifs en une étape.                                            | s-f  | div. | Problèmes arithmétiques > multiplicatifs         |
| CE1-040 | Résoudre des problèmes mixtes en deux étapes (une étape additive et une étape multiplicative). | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |

### Grandeurs et mesures

| Code    | Énoncé (verbatim BO)                                                                                                                                                                                                                                   | kind  | rég. | nœud                                | Rubrique BO                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ----------------------------------- | --------------------------------------- |
| CE1-041 | Connaitre et utiliser les unités mètre, centimètre, kilomètre et les symboles associés (m, cm et km).                                                                                                                                                  | s-f   | div. | Longueurs > unités et conversions   | Les longueurs                           |
| CE1-042 | Choisir l'unité la mieux adaptée pour exprimer une longueur.                                                                                                                                                                                           | s-f   | div. | Longueurs > unités et conversions   | Les longueurs                           |
| CE1-043 | Connaitre les relations entre les unités de longueur usuelles.                                                                                                                                                                                         | conn. | div. | Longueurs > unités et conversions   | Les longueurs                           |
| CE1-044 | Savoir mesurer la longueur d'un segment en utilisant une règle graduée.                                                                                                                                                                                | s-f   | div. | Longueurs > comparer et mesurer     | Les longueurs                           |
| CE1-045 | Comparer des longueurs.                                                                                                                                                                                                                                | s-f   | div. | Longueurs > comparer et mesurer     | Les longueurs                           |
| CE1-046 | Connaitre quelques longueurs de référence.                                                                                                                                                                                                             | conn. | div. | Longueurs > comparer et mesurer     | Les longueurs                           |
| CE1-047 | Estimer la longueur d'un objet du quotidien.                                                                                                                                                                                                           | s-f   | div. | Longueurs > comparer et mesurer     | Les longueurs                           |
| CE1-048 | Savoir identifier l'objet le plus léger (ou le plus lourd) parmi deux ou trois objets de volumes proches en les soupesant ou en utilisant une balance pour les peser.                                                                                  | s-f   | div. | Masses > comparer et mesurer        | Les masses                              |
| CE1-049 | Connaitre et utiliser les unités gramme et kilogramme et les symboles associés (g, kg).                                                                                                                                                                | s-f   | div. | Masses > unités et conversions      | Les masses                              |
| CE1-050 | Savoir que 1 kg est égal à 1 000 g.                                                                                                                                                                                                                    | conn. | div. | Masses > unités et conversions      | Les masses                              |
| CE1-051 | Comparer des masses.                                                                                                                                                                                                                                   | s-f   | div. | Masses > comparer et mesurer        | Les masses                              |
| CE1-052 | Disposer de quelques masses de référence. Estimer la masse d'objets du quotidien en gramme ou en kilogramme.                                                                                                                                           | s-f   | div. | Masses > comparer et mesurer        | Les masses                              |
| CE1-053 | Connaitre le lien entre les euros et les centimes.                                                                                                                                                                                                     | conn. | div. | Monnaie > euros et centimes         | La monnaie                              |
| CE1-054 | Comparer les valeurs en euro de deux ensembles constitués de pièces et de billets.                                                                                                                                                                     | s-f   | div. | Monnaie > pièces et billets         | La monnaie                              |
| CE1-055 | Déterminer la valeur en euro et centime d'euro d'un ensemble constitué de pièces et de billets.                                                                                                                                                        | s-f   | div. | Monnaie > pièces et billets         | La monnaie                              |
| CE1-056 | Constituer avec des euros et des centimes d'euro une somme d'argent d'une valeur donnée.                                                                                                                                                               | s-f   | div. | Monnaie > pièces et billets         | La monnaie                              |
| CE1-057 | Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.                                                                                                                                                                 | s-f   | div. | Monnaie > rendre la monnaie         | La monnaie                              |
| CE1-058 | Connaitre le sens de l'écriture à virgule d'une somme d'argent.                                                                                                                                                                                        | conn. | div. | Monnaie > euros et centimes         | La monnaie                              |
| CE1-059 | Lire l'heure sur une horloge à aiguilles (lorsque l'heure est donnée en heures entières, en heures et demi-heure ou en heures et quarts d'heure).                                                                                                      | s-f   | div. | Durées > lire l'heure               | Le repérage dans le temps et les durées |
| CE1-060 | Positionner les aiguilles d'une horloge correspondant à une heure donnée en heures entières, en heures et demi-heure ou en heures et quart d'heure.                                                                                                    | s-f   | div. | Durées > lire l'heure               | idem                                    |
| CE1-061 | Connaitre, utiliser et distinguer les heures du matin et celles de l'après-midi.                                                                                                                                                                       | s-f   | div. | Durées > lire l'heure               | idem                                    |
| CE1-062 | Connaitre les unités de mesure de durée, heure et minute, et les symboles associés (h et min).                                                                                                                                                         | conn. | div. | Durées > convertir _(discutable 6)_ | idem                                    |
| CE1-063 | Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée, avec des heures données en heures entières, en heures et demi-heure ou en heures et quarts d'heure). | s-f   | div. | Durées > calculer                   | idem                                    |

### Espace et géométrie

| Code    | Énoncé (verbatim BO)                                                                                                                        | kind  | rég. | nœud                                                | Rubrique BO               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------------------------- | ------------------------- |
| CE1-064 | Reconnaitre les solides usuels suivants : cube, boule, cône, pyramide, cylindre, pavé.                                                      | s-f   | div. | Solides > reconnaître et décrire                    | Les solides               |
| CE1-065 | Nommer un cube, une boule, un pavé, un cône ou une pyramide.                                                                                | s-f   | div. | Solides > reconnaître et décrire                    | Les solides               |
| CE1-066 | Décrire un cube, un pavé ou une pyramide en utilisant les termes « face », « sommet » et « arête ».                                         | s-f   | div. | Solides > reconnaître et décrire                    | Les solides               |
| CE1-067 | Connaitre le nombre et la nature des faces d'un cube ou d'un pavé.                                                                          | conn. | div. | Solides > reconnaître et décrire                    | Les solides               |
| CE1-068 | Construire un cube, un pavé droit ou une pyramide.                                                                                          | s-f   | div. | Solides > construire                                | Les solides               |
| CE1-069 | Utiliser le vocabulaire géométrique approprié.                                                                                              | s-f   | div. | Figures planes > reconnaître et décrire             | La géométrie plane        |
| CE1-070 | Reconnaitre, nommer et décrire un cercle, un carré, un rectangle, un triangle, un triangle rectangle en utilisant le vocabulaire approprié. | s-f   | div. | Figures planes > reconnaître et décrire             | idem                      |
| CE1-071 | Connaitre les propriétés des angles et des égalités de longueur pour les carrés et les rectangles.                                          | conn. | div. | Figures planes > reconnaître et décrire             | idem                      |
| CE1-072 | Reproduire ou construire un carré, un rectangle, un triangle, un triangle rectangle et un cercle ou un assemblage de ces figures.           | s-f   | div. | Figures planes > reproduire et construire           | idem                      |
| CE1-073 | Utiliser la règle pour vérifier des alignements et l'équerre pour vérifier qu'un angle est droit.                                           | s-f   | div. | Figures planes (notion — alignements + angle droit) | idem                      |
| CE1-074 | Utiliser la règle graduée, l'équerre et le compas comme instruments de tracé.                                                               | s-f   | div. | Figures planes > reproduire et construire           | idem                      |
| CE1-075 | Connaitre et utiliser le code pour les angles droits.                                                                                       | s-f   | div. | Figures planes > angles droits                      | idem                      |
| CE1-076 | Connaitre et utiliser le vocabulaire lié aux positions relatives.                                                                           | s-f   | div. | Repérage et déplacements > positions et plans       | Le repérage dans l'espace |
| CE1-077 | Situer des personnes ou des objets les uns par rapport aux autres ou par rapport à d'autres repères dans un espace familier.                | s-f   | div. | Repérage et déplacements > positions et plans       | idem                      |
| CE1-078 | Construire et utiliser des représentations d'un espace familier pour localiser, mémoriser ou communiquer un emplacement.                    | s-f   | div. | Repérage et déplacements > positions et plans       | idem                      |
| CE1-079 | Construire des assemblages de cubes et de pavés.                                                                                            | s-f   | div. | Solides > construire _(discutable 3)_               | idem                      |
| CE1-080 | Comprendre, utiliser et produire une suite d'instructions qui codent un déplacement en utilisant un vocabulaire spatial précis.             | s-f   | div. | Repérage et déplacements > coder un déplacement     | idem                      |

### Organisation et gestion de données

| Code    | Énoncé (verbatim BO)                                                                                                    | kind | rég. | nœud                             | Rubrique BO                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ---- | ---- | -------------------------------- | ---------------------------------- |
| CE1-081 | Produire un tableau ou un diagramme en barres pour présenter des données recueillies.                                   | s-f  | div. | Représenter des données (notion) | Organisation et gestion de données |
| CE1-082 | Lire et interpréter les données d'un diagramme en barres. Lire et interpréter les données d'un tableau à double entrée. | s-f  | div. | Représenter des données (notion) | idem                               |

---

## CE2 — 76 points

### Nombres, calcul et résolution de problèmes > Les nombres entiers

| Code    | Énoncé (verbatim BO)                                                                                                  | kind  | rég. | nœud                              |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ----- | ---- | --------------------------------- |
| CE2-001 | Dénombrer des collections.                                                                                            | s-f   | div. | Entiers : numération > dénombrer  |
| CE2-002 | Construire des collections de cardinal donné.                                                                         | s-f   | div. | Entiers : numération > dénombrer  |
| CE2-003 | Connaitre et utiliser les relations entre les unités de numération.                                                   | s-f   | div. | Entiers : numération > décomposer |
| CE2-004 | Connaitre la suite écrite et la suite orale des nombres jusqu'à dix-mille.                                            | conn. | div. | Entiers : numération > écrire     |
| CE2-005 | Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à l'autre.                              | s-f   | div. | Entiers : numération > écrire     |
| CE2-006 | Connaitre la valeur des chiffres en fonction de leur position dans un nombre.                                         | conn. | div. | Entiers : numération > décomposer |
| CE2-007 | Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).                               | s-f   | div. | Entiers : numération > comparer   |
| CE2-008 | Ordonner des nombres dans l'ordre croissant ou décroissant.                                                           | s-f   | div. | Entiers : numération > comparer   |
| CE2-009 | Comprendre et savoir utiliser les expressions « égal à », « supérieur à », « inférieur à », « compris entre … et … ». | s-f   | div. | Entiers : numération > comparer   |
| CE2-010 | Savoir placer des nombres sur une demi-droite graduée.                                                                | s-f   | div. | Entiers : numération > repérer    |

### … > Les fractions

| Code    | Énoncé (verbatim BO)                                                                                                 | kind | rég. | nœud                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------------- |
| CE2-011 | Savoir établir des égalités de fractions inférieures ou égales à 1.                                                  | s-f  | div. | Fractions : sens et écritures > égalité de fractions |
| CE2-012 | Partager une unité de longueur en fractions d'unité et mesurer des longueurs non entières par rapport à cette unité. | s-f  | div. | Fractions : sens et écritures > droite graduée       |
| CE2-013 | Comparer des fractions inférieures à 1.                                                                              | s-f  | div. | Fractions : sens et écritures > comparer             |
| CE2-014 | Additionner et soustraire des fractions.                                                                             | s-f  | div. | Fractions : calculs > additionner et soustraire      |

### … > Les quatre opérations

| Code    | Énoncé (verbatim BO)                                                                                             | kind | rég. | nœud                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ---- | ---- | --------------------------------------------------- |
| CE2-015 | Comprendre et utiliser les mots « terme », « somme » et « différence ».                                          | s-f  | div. | Entiers : addition et soustraction (notion)         |
| CE2-016 | Poser et effectuer des additions et des soustractions en colonnes.                                               | s-f  | div. | Entiers : addition et soustraction > calcul posé    |
| CE2-017 | Comprendre et utiliser les mots « facteur », « produit » et « multiple ».                                        | s-f  | div. | Entiers : multiplication > produit _(discutable 4)_ |
| CE2-018 | Comprendre le sens de la division et utiliser le symbole « ÷ ».                                                  | s-f  | div. | Entiers : division > quotient                       |
| CE2-019 | Poser et effectuer des multiplications d'un nombre à deux ou trois chiffres par un nombre à un ou deux chiffres. | s-f  | div. | Entiers : multiplication > calcul posé              |

### … > Le calcul mental — tout en `fluence`

| Code    | Énoncé (verbatim BO)                                                                                                                                                                                                                        | kind  | rég. | nœud                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------------------- |
| CE2-020 | Connaitre dans les deux sens les tables d'addition.                                                                                                                                                                                         | conn. | flu. | Entiers : addition et soustraction > tables                       |
| CE2-021 | Connaitre dans les deux sens les tables de multiplication.                                                                                                                                                                                  | conn. | flu. | Entiers : multiplication > tables                                 |
| CE2-022 | Connaitre des faits multiplicatifs usuels.                                                                                                                                                                                                  | conn. | flu. | Entiers : multiplication > produits particuliers _(discutable 1)_ |
| CE2-023 | Multiplier un nombre entier par 10 ou 100.                                                                                                                                                                                                  | s-f   | flu. | Entiers : multiplication > puissances de 10                       |
| CE2-024 | Ajouter 8, 9, 18, 19, 28, 29, 38 ou 39 à un nombre.                                                                                                                                                                                         | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux             |
| CE2-025 | Soustraire 9, 19, 29 ou 39 à un nombre.                                                                                                                                                                                                     | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux             |
| CE2-026 | Multiplier un nombre entier par 4 ou par 8.                                                                                                                                                                                                 | s-f   | flu. | Entiers : multiplication > calcul astucieux                       |
| CE2-027 | Multiplier un nombre inférieur à 10 par un nombre entier de dizaines.                                                                                                                                                                       | s-f   | flu. | Entiers : multiplication > calcul astucieux                       |
| CE2-028 | Calculer le produit d'un nombre compris entre 11 et 99 par un nombre inférieur à 10 en décomposant le plus grand des deux facteurs en la somme de deux nombres (propriété de distributivité de la multiplication par rapport à l'addition). | s-f   | flu. | Entiers : multiplication > distributivité                         |

### … > La résolution de problèmes

| Code    | Énoncé (verbatim BO)                                                               | kind | rég. | nœud                                             |
| ------- | ---------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------ |
| CE2-029 | Résoudre des problèmes additifs en une étape de types parties-tout et comparaison. | s-f  | div. | Problèmes arithmétiques (notion)                 |
| CE2-030 | Résoudre des problèmes additifs en deux étapes.                                    | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |
| CE2-031 | Résoudre des problèmes multiplicatifs en une étape.                                | s-f  | div. | Problèmes arithmétiques > multiplicatifs         |
| CE2-032 | Résoudre des problèmes mixtes en deux ou trois étapes.                             | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |
| CE2-033 | Résoudre des problèmes de comparaison multiplicative en une étape.                 | s-f  | div. | Problèmes arithmétiques > comparaison            |
| CE2-034 | Résoudre des problèmes mettant en jeu des produits cartésiens.                     | s-f  | div. | Problèmes arithmétiques > produits cartésiens    |

### Grandeurs et mesures

| Code    | Énoncé (verbatim BO)                                                                                                                               | kind  | rég. | nœud                                         | Rubrique BO                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------------- | --------------------------------------- |
| CE2-035 | Connaitre et utiliser les unités mètre, décimètre, centimètre, millimètre, kilomètre et les symboles associés (m, dm, cm, mm, km).                 | s-f   | div. | Longueurs > unités et conversions            | Les longueurs                           |
| CE2-036 | Connaitre les relations entre les unités de longueur.                                                                                              | conn. | div. | Longueurs > unités et conversions            | Les longueurs                           |
| CE2-037 | Choisir l'unité la mieux adaptée pour exprimer une longueur.                                                                                       | s-f   | div. | Longueurs > unités et conversions            | Les longueurs                           |
| CE2-038 | Comparer des longueurs.                                                                                                                            | s-f   | div. | Longueurs > comparer et mesurer              | Les longueurs                           |
| CE2-039 | Tracer un segment de longueur donnée.                                                                                                              | s-f   | div. | Longueurs > comparer et mesurer              | Les longueurs                           |
| CE2-040 | Disposer de quelques longueurs de référence.                                                                                                       | conn. | div. | Longueurs > comparer et mesurer              | Les longueurs                           |
| CE2-041 | Estimer la longueur d'un objet ou une distance.                                                                                                    | s-f   | div. | Longueurs > comparer et mesurer              | Les longueurs                           |
| CE2-042 | Savoir ce qu'est le périmètre d'une figure plane.                                                                                                  | conn. | div. | Périmètres (notion)                          | Les longueurs                           |
| CE2-043 | Comparer le périmètre de plusieurs polygones sans règle graduée, en utilisant un compas.                                                           | s-f   | div. | Périmètres (notion)                          | Les longueurs                           |
| CE2-044 | Déterminer le périmètre d'un polygone en utilisant une règle graduée.                                                                              | s-f   | div. | Périmètres (notion)                          | Les longueurs                           |
| CE2-045 | Connaitre et utiliser les unités gramme, kilogramme et tonne et les symboles associés (g, kg, t).                                                  | s-f   | div. | Masses > unités et conversions               | Les masses                              |
| CE2-046 | Choisir l'unité la mieux adaptée pour exprimer une masse.                                                                                          | s-f   | div. | Masses > unités et conversions               | Les masses                              |
| CE2-047 | Connaitre les relations entre les unités de masse usuelles.                                                                                        | conn. | div. | Masses > unités et conversions               | Les masses                              |
| CE2-048 | Comparer des masses.                                                                                                                               | s-f   | div. | Masses > comparer et mesurer                 | Les masses                              |
| CE2-049 | Disposer de quelques masses de référence.                                                                                                          | conn. | div. | Masses > comparer et mesurer                 | Les masses                              |
| CE2-050 | Estimer la masse d'un objet.                                                                                                                       | s-f   | div. | Masses > comparer et mesurer                 | Les masses                              |
| CE2-051 | Comparer les contenances de différents objets.                                                                                                     | s-f   | div. | Contenances > comparer et mesurer            | Les contenances                         |
| CE2-052 | Connaitre et utiliser les unités litre, décilitre et centilitre et les symboles associés (L, dL et cL).                                            | s-f   | div. | Contenances > unités et conversions          | Les contenances                         |
| CE2-053 | Savoir que 1 L est égal à 10 dL et également à 100 cL.                                                                                             | conn. | div. | Contenances > unités et conversions          | Les contenances                         |
| CE2-054 | Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.                                                             | s-f   | div. | Monnaie > rendre la monnaie                  | La monnaie                              |
| CE2-055 | Poser et effectuer des additions de montants en euro.                                                                                              | s-f   | div. | Monnaie > euros et centimes _(discutable 5)_ | La monnaie                              |
| CE2-056 | Poser et effectuer des soustractions de montants en euro.                                                                                          | s-f   | div. | Monnaie > euros et centimes _(discutable 5)_ | La monnaie                              |
| CE2-057 | Lire l'heure sur une horloge à aiguilles.                                                                                                          | s-f   | div. | Durées > lire l'heure                        | Le repérage dans le temps et les durées |
| CE2-058 | Positionner les aiguilles d'une horloge correspondant à une heure donnée en heures entières ou en heures et minutes.                               | s-f   | div. | Durées > lire l'heure                        | idem                                    |
| CE2-059 | Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée). | s-f   | div. | Durées > calculer                            | idem                                    |
| CE2-060 | Résoudre des problèmes à une ou deux étapes impliquant des durées.                                                                                 | s-f   | div. | Durées > calculer                            | idem                                    |

### Espace et géométrie

| Code    | Énoncé (verbatim BO)                                                                                                                                                                                                                              | kind  | rég. | nœud                                                     | Rubrique BO        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | -------------------------------------------------------- | ------------------ |
| CE2-061 | Nommer un cube, une boule, un pavé, un cône, une pyramide ou un cylindre.                                                                                                                                                                         | s-f   | div. | Solides > reconnaître et décrire                         | Les solides        |
| CE2-062 | Décrire un cube, un pavé ou une pyramide en utilisant les termes « face », « sommet » et « arête ».                                                                                                                                               | s-f   | div. | Solides > reconnaître et décrire                         | Les solides        |
| CE2-063 | Connaitre le nombre et la nature des faces d'un cube ou d'un pavé.                                                                                                                                                                                | conn. | div. | Solides > reconnaître et décrire                         | Les solides        |
| CE2-064 | Connaitre la nature des faces d'une pyramide.                                                                                                                                                                                                     | conn. | div. | Solides > reconnaître et décrire                         | Les solides        |
| CE2-065 | Construire un cube, un pavé ou une pyramide.                                                                                                                                                                                                      | s-f   | div. | Solides > construire                                     | Les solides        |
| CE2-066 | Construire un cube à partir d'un patron.                                                                                                                                                                                                          | s-f   | div. | Solides > patrons                                        | Les solides        |
| CE2-067 | Utiliser le vocabulaire géométrique approprié.                                                                                                                                                                                                    | s-f   | div. | Figures planes > reconnaître et décrire                  | La géométrie plane |
| CE2-068 | Reconnaitre, nommer et décrire le carré, le rectangle, le triangle, le triangle rectangle et le losange.                                                                                                                                          | s-f   | div. | Figures planes > reconnaître et décrire                  | idem               |
| CE2-069 | Connaitre les propriétés des angles et les égalités de longueur pour les carrés, les rectangles et les losanges.                                                                                                                                  | conn. | div. | Figures planes > reconnaître et décrire                  | idem               |
| CE2-070 | Reproduire ou construire un carré, un rectangle, un triangle, un triangle rectangle et un cercle ou des assemblages de ces figures sur tout support (papier quadrillé ou pointé ou papier uni), avec une règle graduée, une équerre ou un compas. | s-f   | div. | Figures planes > reproduire et construire                | idem               |
| CE2-071 | Connaitre et utiliser le codage d'un angle droit et celui qui indique que des segments ont la même longueur.                                                                                                                                      | s-f   | div. | Figures planes (notion — angle droit + longueurs égales) | idem               |
| CE2-072 | Reconnaitre si une figure possède un ou plusieurs axes de symétrie en utilisant des pliages ou du papier calque.                                                                                                                                  | s-f   | div. | Symétrie axiale (notion)                                 | idem               |
| CE2-073 | Compléter, sur une feuille quadrillée ou pointée, une figure simple pour la rendre symétrique par rapport à un axe donné.                                                                                                                         | s-f   | div. | Symétrie axiale (notion)                                 | idem               |

### Organisation et gestion de données

| Code    | Énoncé (verbatim BO)                                                                                     | kind | rég. | nœud                             | Rubrique BO                        |
| ------- | -------------------------------------------------------------------------------------------------------- | ---- | ---- | -------------------------------- | ---------------------------------- |
| CE2-074 | Produire un tableau ou un diagramme en barres pour présenter des données recueillies.                    | s-f  | div. | Représenter des données (notion) | Organisation et gestion de données |
| CE2-075 | Lire et interpréter les données d'un tableau à double entrée ou d'un diagramme en barres.                | s-f  | div. | Représenter des données (notion) | idem                               |
| CE2-076 | Résoudre des problèmes en utilisant les données d'un tableau à double entrée ou d'un diagramme en barre. | s-f  | div. | Représenter des données (notion) | idem                               |

---

## Rattachements discutables (validés en bloc par V1, sauf veto point par point)

1. **« Connaitre des faits multiplicatifs usuels »** (CE1-028, CE2-022) → `Entiers :
multiplication > produits particuliers` : la puce couvre doubles, moitiés, multiples
   de 25, décompositions de 60 — le répertoire multiplicatif usuel, exactement ce que
   « produits particuliers » désigne. Alternative : la notion (la puce effleure aussi
   « double et moitié »).
2. **Lexiques des grandeurs** (CP-032, CP-039, CP-041) → la **notion** directement
   (Longueurs, Masses, Monnaie) : cohérent avec le seed CM (lexique des angles → notion
   `Angles`).
3. **Assemblages de solides / de cubes et de pavés** (CP-064, CE1-079, section BO
   « repérage dans l'espace ») → `Solides > construire` : application de ta décision
   d'hier (« mets tout dans Solides ») — ici le geste est CONSTRUIRE, d'où la
   sous-notion plutôt que la notion. La rubrique BO reste « Le repérage dans l'espace ».
4. **« facteur », « produit » et « multiple »** (CE2-017) → `Entiers : multiplication >
produit` : vocabulaire du produit ; « multiple » affleure la Divisibilité mais ne
   justifie pas une scission (un seul geste : comprendre et utiliser le vocabulaire
   multiplicatif).
5. **Additions et soustractions posées de montants en euro** (CE2-055/056) → `Monnaie >
euros et centimes` : le doc d'écarts l'acte (« l'écriture à virgule en contexte
   monétaire vit ICI, pas dans Décimaux — choix du programme lui-même ») ; c'est aussi
   du calcul posé, mais ce que le contenu EST d'abord, c'est la manipulation des
   montants en euros et centimes.
6. **« Connaitre les unités de mesure de durée, heure et minute, et les symboles
   associés »** (CE1-062) → `Durées > convertir` : la connaissance des unités et de
   leurs relations (1 h = 60 min) est le socle des conversions. Alternative : la notion.
7. **Procédures mentales fondées sur la numération** (CP-020/021/022, CE1-029) →
   `Entiers : addition et soustraction > calcul astucieux` : même famille que les
   procédures explicites (+9, −9…), le BO ne les distingue que par le moyen.
8. **Vérifier alignements + angle droit / double codage** (CE1-073, CE2-071) → la
   **notion** `Figures planes` (convention « plusieurs sous-notions d'une même
   notion ») : chaque puce attelle deux objets (alignements → reconnaître et décrire,
   angle droit → angles droits ; codage de l'angle droit + codage des longueurs égales).

## Question (V1)

- **V1 — validation d'ensemble** du document : les 227 points (69 + 82 + 76), leurs
  nœuds (dont les 8 rattachements discutables ci-dessus), kinds et régimes
  (`fluence` = les 30 points de calcul mental). Aucune nouvelle sous-notion, aucun
  renommage, aucune scission : l'arbre 2026-10-07.13 absorbe tout le cycle 2 tel quel.

## Après validation (plan de livraison)

1. Worktree frère + migration **additive** `seed_curriculum_points_cycle2.sql` générée
   depuis ce document (même générateur que le seed CM : codes explicites, nœuds résolus
   par chemin complet branche > notion > sous-notion, bloc DO de vérification des
   comptes). Rollback scopé en commentaire. ⚠️ Leçon du seed CM appliquée d'emblée :
   toutes les sous-requêtes et le rollback scopés par parent ET branche.
2. Test d'intégration : comparaison **intégrale** des 227 lignes (tous attributs +
   chemin du nœud) en lecture anonyme, vérifié **rouge sans la migration**.
3. `security-auditor` (données seulement, aucun changement d'accès), PR, CI verte,
   merge, `db:migrate` (4 conditions), vérification prod.
4. Suite de l'ordre validé : la **6e** — 95 points + rubriques Automatismes en
   **références** vers les points CM1/CM2 (désormais en base) et, pour les lignes
   d'automatismes qui remontent au cycle 2, vers ces points-ci.
