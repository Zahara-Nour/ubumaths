# Seed CM1-CM2 — points du programme (architecture points → nœuds)

> 2026-10-10 : nœuds mis à jour pour l'arbre .16 (nettoyage des facettes, #1002).

> **Passe « puces et points » (validée le 2026-10-09, [passe-cycle3.md](passe-cycle3.md))** :
> 12 puces scindées (+18 points), CM1-087/CM2-072 spécifiés, CM1-096 et CM2-086 retirés →
> **262 points** (138 CM1, 124 CM2), 33 en `fluence`.

> **Statut : VALIDÉ INTÉGRALEMENT le 2026-10-07 (« je valide tout » : S3-S6 = recos).**
> Livraison en cours : migration + tests (branche `feat/seed-points-cm`).
> ✅ Déjà tranché par David le 2026-10-07 : **les fractions décimales sont des fractions**
> (→ `Fractions : sens et écritures` ; côté Décimaux ne restent que les unités de
> numération, l'écriture à virgule et son pont) · renommage **« arrondis et ordres de
> grandeur »** · nouvelle sous-notion **`Entiers : division > calcul réfléchi`** ·
> assemblages de cubes → **`Solides`** · nouvelle notion **`Algorithmique >
Préalgorithmique`** (problèmes pré-algorithmes) · rattachements 5 et 6 validés.
> Source : « Programme de mathématiques pour le cycle 3 » (BOENJS du 17 avril 2025), blocs
> « Objectifs d'apprentissage » du CM1 et du CM2, extraits **ligne à ligne** (28 p. lues).
> Mapping : [programmes-ecarts-cycle3.md](programmes-ecarts-cycle3.md) (décisions R1-R6
> tranchées le 2026-10-07). Cadre : ADR 0020 + `schema-cible-spec.md` (reconstruction à 0,
> C4/C5). **Ordre de seed validé le 2026-10-07 : CM1-CM2 → cycle 2 (CP-CE1-CE2) → 6e** —
> le cours moyen d'abord, pour que les références d'automatismes de la 6e trouvent leurs
> cibles dès son seed.

## Attributs communs

| Attribut             | Valeur                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `grade`              | `CM1` / `CM2`                                                                                                                                                                  |
| `code`               | `CM1-001`… / `CM2-001`… **explicites dans la migration** (le trigger d'auto-code passe par `objective_id`, NULL ici → il lèverait une exception ; un code fourni est respecté) |
| `objective_id`       | `NULL` (architecture cible : le point se rattache à un nœud, pas à un objectif)                                                                                                |
| `node_id`            | nœud de l'arbre (notion ou sous-notion), résolu par chemin — colonne « nœud » ci-dessous                                                                                       |
| `rubrique`           | rubrique du BO à deux niveaux (C11), ex. `Nombres, calcul et résolution de problèmes > Le calcul mental` — c'est le titre de section de chaque tableau ci-dessous              |
| `kind`               | `connaissance` (conn.) ou `savoir_faire` (s-f) ; « Connaître **et utiliser** » = s-f (l'usage emporte la connaissance) ; aucun `demonstration`/`algorithme` au cours moyen     |
| `exigence`           | `attendu` partout (tout le programme est exigible ; pas de rubrique d'approfondissement au CM)                                                                                 |
| `regime_acquisition` | `diversite` (div.) par défaut ; `fluence` (flu.) proposé pour **toute la section « Le calcul mental »** — question S5                                                          |
| `display_order`      | ordre d'apparition dans le BO (numéro du code)                                                                                                                                 |
| `rang`               | `NULL` (abandonné, B1)                                                                                                                                                         |

Dans les tableaux, le nœud est écrit `Notion > sous-notion` (la branche est donnée par le
titre de bloc) ; `(notion)` = point rattaché directement à la notion. Rien au cours moyen
pour « Initiation à la pensée informatique » (prose sans objectifs propres : le contenu
vit dans Algèbre et Repérage) ni pour les « Mises en perspective » (il n'y en a pas au CM).

## Conventions appliquées (règle des puces multi-gestes du 2026-10-07)

La règle est déjà tranchée (doc d'écarts : une puce = un point, scission si gestes
réellement distincts, chaque scission documentée ici). Son application au cours moyen :

- **Rattachement à la notion** : quand une puce décrit UN geste décliné sur plusieurs
  sous-notions sœurs (« Comparer, encadrer, intercaler… » quand `comparer` ET `encadrer`
  existent ; « lire un tableau, un diagramme, une courbe »), le point va à la **notion**
  — c'est le seul nœud unique qui respecte « une puce = un point ». 13 points concernés,
  marqués `(notion)`.
- **L'unique scission** : « Connaître des faits numériques usuels » (CM1-035/036,
  CM2-035/036) attelle deux gestes distincts sur deux notions différentes (tables
  d'addition / tables de multiplication) → deux points, suffixés « répertoire additif » /
  « répertoire multiplicatif ». **Aucune autre scission** : les puces du cours moyen sont
  déjà au bon grain.

---

## CM1 — 130 points

### Nombres, calcul et résolution de problèmes > Les nombres entiers · branche `Nombres et calculs` (sauf mention)

| Code    | Énoncé (verbatim BO)                                                                                                 | kind  | rég. | nœud                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------------------ |
| CM1-001 | Dénombrer des collections en les organisant                                                                          | s-f   | div. | Entiers : numération > dénombrement                    |
| CM1-131 | Comparer des collections en les organisant                                                                           | s-f   | div. | Entiers : numération > ordre                           |
| CM1-002 | Construire des collections de cardinal donné                                                                         | s-f   | div. | Entiers : numération > dénombrement                    |
| CM1-003 | Connaître et utiliser les relations entre les unités de numération                                                   | s-f   | div. | Entiers : numération > décomposition                   |
| CM1-004 | Connaître la suite écrite et la suite orale des nombres jusqu'à 999 999                                              | conn. | div. | Entiers : numération > écritures                       |
| CM1-005 | Connaître la valeur des chiffres en fonction de leur position dans un nombre                                         | conn. | div. | Entiers : numération > décomposition                   |
| CM1-006 | Connaître et utiliser diverses représentations d'un nombre et passer de l'une à l'autre                              | s-f   | div. | Entiers : numération > écritures                       |
| CM1-007 | Comprendre et savoir utiliser les expressions « égal à », « supérieur à », « inférieur à », « compris entre … et … » | s-f   | div. | Entiers : numération > ordre                           |
| CM1-008 | Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >                               | s-f   | div. | Entiers : numération > ordre                           |
| CM1-009 | Ordonner des nombres dans l'ordre croissant ou décroissant                                                           | s-f   | div. | Entiers : numération > ordre                           |
| CM1-010 | Savoir placer des nombres et repérer des points sur une demi-droite graduée                                          | s-f   | div. | Entiers : numération > droite graduée                  |
| CM1-011 | Savoir reconnaître les multiples de 2, de 5 et de 10 à partir de leur écriture chiffrée                              | s-f   | div. | `Arithmétique` Divisibilité > critères de divisibilité |
| CM1-012 | Savoir déterminer si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10                | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs   |
| CM1-013 | Savoir déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné                | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs   |

### … > Les fractions

| Code    | Énoncé (verbatim BO)                                                                                                    | kind | rég. | nœud                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------- |
| CM1-014 | Savoir interpréter, représenter, écrire et lire des fractions                                                           | s-f  | div. | Fractions : sens et écritures > définition     |
| CM1-015 | Savoir écrire une fraction supérieure à 1 comme la somme d'un entier et d'une fraction inférieure à 1                   | s-f  | div. | Fractions : sens et écritures > décomposition  |
| CM1-016 | Savoir écrire la somme d'un entier et d'une fraction inférieure à 1 comme une unique fraction                           | s-f  | div. | Fractions : sens et écritures > décomposition  |
| CM1-017 | Savoir encadrer une fraction par deux nombres entiers consécutifs                                                       | s-f  | div. | Fractions : sens et écritures > ordre          |
| CM1-018 | Savoir placer une fraction ou la somme d'un nombre entier et d'une fraction inférieure à un sur une demi-droite graduée | s-f  | div. | Fractions : sens et écritures > droite graduée |
| CM1-019 | Savoir repérer un point d'une demi-droite graduée par une fraction ou par la somme d'un nombre entier et d'une fraction | s-f  | div. | Fractions : sens et écritures > droite graduée |
| CM1-020 | Comparer des fractions                                                                                                  | s-f  | div. | Fractions : sens et écritures > ordre          |
| CM1-021 | Additionner et soustraire des fractions                                                                                 | s-f  | div. | Fractions : calculs > addition et soustraction |
| CM1-022 | Déterminer une fraction d'une quantité ou d'une grandeur                                                                | s-f  | div. | Fractions : calculs > fraction d'une quantité  |

### … > Les nombres décimaux

| Code    | Énoncé (verbatim BO)                                                                                                                                | kind | rég. | nœud                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------------ |
| CM1-023 | Interpréter, représenter, écrire et lire des fractions décimales                                                                                    | s-f  | div. | Fractions : sens et écritures > définition             |
| CM1-024 | Connaître et utiliser les relations entre unités simples, dixièmes et centièmes                                                                     | s-f  | div. | Décimaux : numération > décomposition                  |
| CM1-025 | Placer une fraction décimale sur une demi-droite graduée et repérer un point d'une demi-droite graduée par une fraction décimale                    | s-f  | div. | Fractions : sens et écritures > droite graduée         |
| CM1-026 | Écrire une fraction décimale supérieure à 1 comme la somme d'un nombre entier et d'une fraction décimale inférieure à 1                             | s-f  | div. | Fractions : sens et écritures > décomposition          |
| CM1-027 | Écrire une fraction décimale supérieure à 1 comme la somme d'un nombre entier et de fractions décimales ayant un numérateur inférieur à 10          | s-f  | div. | Fractions : sens et écritures > décomposition          |
| CM1-028 | Comparer, encadrer, intercaler des fractions décimales en utilisant les symboles =, < et >                                                          | s-f  | div. | Fractions : sens et écritures > ordre                  |
| CM1-029 | Ordonner des fractions décimales dans l'ordre croissant ou décroissant                                                                              | s-f  | div. | Fractions : sens et écritures > ordre                  |
| CM1-030 | Passer d'une écriture sous forme d'une fraction décimale ou d'une somme de fractions décimales à une écriture à virgule et réciproquement           | s-f  | div. | Décimaux : numération > forme fractionnaire            |
| CM1-031 | Interpréter, représenter, écrire et lire des nombres décimaux (écriture à virgule)                                                                  | s-f  | div. | Décimaux : numération > écritures                      |
| CM1-032 | Placer un nombre décimal en écriture à virgule sur une demi-droite graduée et repérer un point d'une demi-droite graduée par un nombre décimal      | s-f  | div. | Décimaux : numération > droite graduée                 |
| CM1-033 | Savoir donner la partie entière et l'arrondi à l'entier d'un nombre décimal                                                                         | s-f  | div. | Décimaux : numération > arrondis et ordres de grandeur |
| CM1-034 | Comparer, ordonner, par ordre croissant ou décroissant, des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et > | s-f  | div. | Décimaux : numération > ordre                          |
| CM1-132 | Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >                                    | s-f  | div. | Décimaux : numération > encadrement                    |

### … > Le calcul mental — tout en `fluence` (S5)

| Code    | Énoncé (verbatim BO ; ✂ = scission S2)                                                                                                                          | kind  | rég. | nœud                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------- |
| CM1-035 | Connaître des faits numériques usuels relatifs aux nombres entiers — répertoire additif ✂                                                                       | conn. | flu. | Entiers : addition et soustraction > tables           |
| CM1-036 | Connaître des faits numériques usuels relatifs aux nombres entiers — répertoire multiplicatif ✂                                                                 | conn. | flu. | Entiers : multiplication > tables                     |
| CM1-037 | Connaître quelques relations entre des fractions usuelles                                                                                                        | conn. | flu. | Fractions : sens et écritures > égalité de fractions  |
| CM1-038 | Connaître l'écriture décimale de fractions usuelles                                                                                                              | conn. | flu. | Fractions : sens et écritures > forme décimale        |
| CM1-039 | Ajouter un nombre entier inférieur à 10, d'unités, de dizaines, de centaines, de dixièmes ou de centièmes à un nombre décimal, lorsqu'il n'y a pas de retenue    | s-f   | flu. | Décimaux : calculs > addition                         |
| CM1-133 | Soustraire un nombre entier inférieur à 10, d'unités, de dizaines, de centaines, de dixièmes ou de centièmes à un nombre décimal, lorsqu'il n'y a pas de retenue | s-f   | flu. | Décimaux : calculs > soustraction                     |
| CM1-040 | Multiplier un nombre entier par 10, 100 ou 1 000                                                                                                                 | s-f   | flu. | Entiers : multiplication > puissances de 10           |
| CM1-041 | Multiplier un nombre décimal par 10                                                                                                                              | s-f   | flu. | Décimaux : calculs > multiplication                   |
| CM1-042 | Diviser un nombre décimal par 10                                                                                                                                 | s-f   | flu. | Décimaux : calculs > division                         |
| CM1-043 | Ajouter ou soustraire 8, 9, 18, 19, 28, 29, 38 ou 39, à un nombre                                                                                                | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CM1-044 | Multiplier un nombre entier inférieur à 10 par un nombre entier de dizaines ou de centaines                                                                      | s-f   | flu. | Entiers : multiplication > calcul astucieux           |
| CM1-045 | Multiplier un nombre entier par 4 ou par 8                                                                                                                       | s-f   | flu. | Entiers : multiplication > calcul astucieux           |
| CM1-046 | Multiplier un nombre entier par 5                                                                                                                                | s-f   | flu. | Entiers : multiplication > calcul astucieux           |
| CM1-047 | Utiliser la distributivité de la multiplication par rapport à l'addition dans des cas simples                                                                    | s-f   | flu. | Entiers : multiplication > distributivité             |

### … > Les quatre opérations

| Code    | Énoncé (verbatim BO)                                                                           | kind | rég. | nœud                                                   |
| ------- | ---------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------------ |
| CM1-048 | Estimer le résultat d'une opération                                                            | s-f  | div. | Décimaux : numération > arrondis et ordres de grandeur |
| CM1-049 | Savoir effectuer un calcul contenant des parenthèses                                           | s-f  | div. | Entiers : priorités opératoires > avec parenthèses     |
| CM1-050 | Poser en colonnes et effectuer des additions et des soustractions de nombres décimaux          | s-f  | div. | Décimaux : calculs (notion)                            |
| CM1-051 | Poser et effectuer des multiplications de deux nombres entiers                                 | s-f  | div. | Entiers : multiplication > calcul posé                 |
| CM1-052 | Poser et effectuer des multiplications d'un nombre décimal par un nombre entier inférieur à 10 | s-f  | div. | Décimaux : calculs > multiplication                    |
| CM1-053 | Poser et effectuer des divisions euclidiennes avec un diviseur à un chiffre                    | s-f  | div. | Entiers : division > calcul posé                       |

### … > La résolution de problèmes

| Code    | Énoncé (verbatim BO)                                                        | kind | rég. | nœud                                             |
| ------- | --------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------ |
| CM1-054 | Résoudre des problèmes additifs en une étape du type « parties-tout »       | s-f  | div. | Problèmes arithmétiques > parties-tout           |
| CM1-134 | Résoudre des problèmes additifs en une étape du type « comparaison »        | s-f  | div. | Problèmes arithmétiques > comparaison            |
| CM1-055 | Résoudre des problèmes additifs en deux ou trois étapes                     | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |
| CM1-056 | Résoudre des problèmes multiplicatifs de type « parties-tout » en une étape | s-f  | div. | Problèmes arithmétiques > multiplicatifs         |
| CM1-057 | Résoudre des problèmes de comparaison multiplicative                        | s-f  | div. | Problèmes arithmétiques > comparaison            |
| CM1-058 | Résoudre des problèmes mixtes en deux ou trois étapes                       | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus |
| CM1-059 | Résoudre des problèmes de dénombrement                                      | s-f  | div. | Problèmes arithmétiques > produits cartésiens    |
| CM1-060 | Résoudre des problèmes d'optimisation                                       | s-f  | div. | Problèmes arithmétiques > optimisation           |

### … > Algèbre · branche `Algèbre`

| Code    | Énoncé (verbatim BO)                                                                               | kind | rég. | nœud                                            |
| ------- | -------------------------------------------------------------------------------------------------- | ---- | ---- | ----------------------------------------------- |
| CM1-061 | Trouver le nombre manquant dans une égalité à trous                                                | s-f  | div. | Premiers pas algébriques > égalités à trous     |
| CM1-062 | Déterminer la valeur d'un nombre inconnu en utilisant un symbole ou une lettre pour le représenter | s-f  | div. | Premiers pas algébriques > nombre inconnu       |
| CM1-063 | Résoudre des problèmes algébriques                                                                 | s-f  | div. | Premiers pas algébriques > nombre inconnu       |
| CM1-064 | Exécuter un programme de calcul                                                                    | s-f  | div. | Premiers pas algébriques > programmes de calcul |
| CM1-065 | Identifier et formuler une règle de calcul pour poursuivre une suite de nombres                    | s-f  | div. | Premiers pas algébriques > suites de motifs     |
| CM1-066 | Identifier des régularités et poursuivre une suite de motifs évolutive                             | s-f  | div. | Premiers pas algébriques > suites de motifs     |

### Grandeurs et mesures (branche `Grandeurs et mesures`)

| Code    | Énoncé (verbatim BO)                                                                                                                       | kind  | rég. | nœud                                | Rubrique BO                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ----------------------------------- | --------------------------------------- |
| CM1-067 | Connaître et utiliser les unités de longueur du millimètre au kilomètre et les symboles associés                                           | s-f   | div. | Longueurs > unités et conversions   | Les longueurs                           |
| CM1-068 | Connaître les relations entre les unités de longueur                                                                                       | conn. | div. | Longueurs > unités et conversions   | Les longueurs                           |
| CM1-069 | Choisir une unité adaptée pour exprimer une longueur                                                                                       | s-f   | div. | Longueurs > unités et conversions   | Les longueurs                           |
| CM1-070 | Comparer des longueurs                                                                                                                     | s-f   | div. | Longueurs > comparaison et mesure   | Les longueurs                           |
| CM1-071 | Disposer de quelques longueurs de référence                                                                                                | conn. | div. | Longueurs > comparaison et mesure   | Les longueurs                           |
| CM1-072 | Estimer la longueur d'un objet ou d'une distance                                                                                           | s-f   | div. | Longueurs > comparaison et mesure   | Les longueurs                           |
| CM1-073 | Savoir ce qu'est le périmètre d'une figure plane                                                                                           | conn. | div. | Périmètres (notion)                 | Les longueurs                           |
| CM1-074 | Déterminer le périmètre d'un polygone en utilisant une règle graduée                                                                       | s-f   | div. | Périmètres (notion)                 | Les longueurs                           |
| CM1-075 | Résoudre des problèmes mettant en jeu les longueurs des côtés d'un polygone et son périmètre                                               | s-f   | div. | Périmètres (notion)                 | Les longueurs                           |
| CM1-076 | Connaître et utiliser les unités de masse du milligramme au kilogramme et la tonne, et les symboles associés                               | s-f   | div. | Masses > unités et conversions      | Les masses                              |
| CM1-077 | Connaître les relations entre les unités de masse                                                                                          | conn. | div. | Masses > unités et conversions      | Les masses                              |
| CM1-078 | Choisir une unité adaptée pour exprimer une masse                                                                                          | s-f   | div. | Masses > unités et conversions      | Les masses                              |
| CM1-079 | Comparer des masses                                                                                                                        | s-f   | div. | Masses > comparaison et mesure      | Les masses                              |
| CM1-080 | Disposer de quelques masses de référence                                                                                                   | conn. | div. | Masses > comparaison et mesure      | Les masses                              |
| CM1-081 | Estimer la masse d'un objet                                                                                                                | s-f   | div. | Masses > comparaison et mesure      | Les masses                              |
| CM1-082 | Connaître et utiliser les unités de contenance du millilitre à l'hectolitre et les symboles associés                                       | s-f   | div. | Contenances > unités et conversions | Les contenances                         |
| CM1-083 | Connaître les relations entre les unités de contenance                                                                                     | conn. | div. | Contenances > unités et conversions | Les contenances                         |
| CM1-084 | Choisir une unité adaptée pour exprimer une contenance                                                                                     | s-f   | div. | Contenances > unités et conversions | Les contenances                         |
| CM1-085 | Comparer des contenances                                                                                                                   | s-f   | div. | Contenances > comparaison et mesure | Les contenances                         |
| CM1-086 | Comparer les aires de différentes figures planes                                                                                           | s-f   | div. | Aires (notion)                      | Les aires                               |
| CM1-087 | Déterminer des aires en utilisant une unité et un quadrillage                                                                              | s-f   | div. | Aires (notion)                      | Les aires                               |
| CM1-088 | Connaître et utiliser les centimètres carrés pour exprimer des aires                                                                       | s-f   | div. | Aires > unités et conversions       | Les aires                               |
| CM1-089 | Utiliser le lexique spécifique associé aux angles                                                                                          | s-f   | div. | Angles (notion)                     | Les angles                              |
| CM1-090 | Comprendre et utiliser les notations des angles                                                                                            | s-f   | div. | Angles (notion)                     | Les angles                              |
| CM1-091 | Comparer des angles                                                                                                                        | s-f   | div. | Angles > comparaison                | Les angles                              |
| CM1-092 | Lire l'heure sur une horloge à aiguilles                                                                                                   | s-f   | div. | Durées > lecture de l'heure         | Le repérage dans le temps et les durées |
| CM1-093 | Positionner les aiguilles d'une horloge correspondant à une heure donnée en heure et minute                                                | s-f   | div. | Durées > lecture de l'heure         | idem                                    |
| CM1-094 | Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (instants et durées sont exprimés en heure et minute) | s-f   | div. | Durées > calcul de durées           | idem                                    |
| CM1-095 | Résoudre des problèmes à une ou deux étapes impliquant des durées                                                                          | s-f   | div. | Durées > calcul de durées           | idem                                    |

### Espace et géométrie (branche `Géométrie`)

| Code    | Énoncé (verbatim BO)                                                                                                                                                                                                                    | kind  | rég. | nœud                                            | Rubrique BO               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------- | ------------------------- |
| CM1-097 | Utiliser les outils géométriques usuels : règle, règle graduée, équerre et compas                                                                                                                                                       | s-f   | div. | Figures planes > constructions                  | idem                      |
| CM1-098 | Connaître les codes usuels utilisés en géométrie                                                                                                                                                                                        | conn. | div. | Figures planes > propriétés                     | idem                      |
| CM1-099 | Décrire et reconnaître un cercle et un disque comme un ensemble de points caractérisés par leur distance à un point donné                                                                                                               | s-f   | div. | Figures planes > cercle                         | idem                      |
| CM1-100 | Reconnaître et utiliser la notion de perpendicularité                                                                                                                                                                                   | s-f   | div. | Figures planes > perpendiculaires et parallèles | idem                      |
| CM1-101 | Reconnaître et utiliser la notion de parallélisme                                                                                                                                                                                       | s-f   | div. | Figures planes > perpendiculaires et parallèles | idem                      |
| CM1-102 | Reconnaître et nommer les figures suivantes en faisant référence à leur définition : triangle, triangle rectangle, triangle isocèle, triangle équilatéral, quadrilatère, carré, rectangle et losange                                    | s-f   | div. | Figures planes > propriétés                     | idem                      |
| CM1-103 | Connaître les propriétés de parallélisme des côtés opposés, des égalités de longueurs et d'angles pour les figures usuelles : triangle rectangle, triangle isocèle, triangle équilatéral, carré, rectangle et losange                   | conn. | div. | Figures planes > propriétés                     | idem                      |
| CM1-104 | Reproduire ou construire un carré, un rectangle, un triangle, un triangle rectangle ou un cercle ou des assemblages de ces figures sur tout support (papier quadrillé, pointé ou uni), avec une règle graduée, une équerre ou un compas | s-f   | div. | Figures planes > constructions                  | idem                      |
| CM1-105 | Construire une figure géométrique composée de segments, de droites, de polygones usuels et de cercles                                                                                                                                   | s-f   | div. | Figures planes > constructions                  | idem                      |
| CM1-106 | Reconnaître si une figure possède un ou plusieurs axes de symétrie                                                                                                                                                                      | s-f   | div. | Symétrie axiale (notion)                        | idem                      |
| CM1-107 | Compléter une figure pour la rendre symétrique par rapport à une droite donnée, horizontale ou verticale                                                                                                                                | s-f   | div. | Symétrie axiale (notion)                        | idem                      |
| CM1-108 | Construire, sur papier quadrillé, la figure symétrique d'une figure donnée par rapport à une droite horizontale ou verticale                                                                                                            | s-f   | div. | Symétrie axiale (notion)                        | idem                      |
| CM1-109 | Nommer un cube, une boule, un pavé, un cône, une pyramide, un cylindre et un prisme droit                                                                                                                                               | s-f   | div. | Solides > propriétés                            | Les solides               |
| CM1-110 | Décrire un cube, un pavé, une pyramide et un prisme droit en faisant référence à des propriétés et en utilisant le vocabulaire approprié                                                                                                | s-f   | div. | Solides > propriétés                            | idem                      |
| CM1-111 | Connaître le nombre et la nature des faces d'un cube ou d'un pavé                                                                                                                                                                       | conn. | div. | Solides > propriétés                            | idem                      |
| CM1-112 | Connaître la nature des faces d'une pyramide                                                                                                                                                                                            | conn. | div. | Solides > propriétés                            | idem                      |
| CM1-113 | Connaître la nature des faces d'un prisme droit                                                                                                                                                                                         | conn. | div. | Solides > propriétés                            | idem                      |
| CM1-114 | Construire un cube, un pavé, une pyramide ou un prisme droit                                                                                                                                                                            | s-f   | div. | Solides > constructions                         | idem                      |
| CM1-115 | Reconnaître un patron d'un cube                                                                                                                                                                                                         | s-f   | div. | Solides > patrons                               | idem                      |
| CM1-116 | Construire un patron d'un cube                                                                                                                                                                                                          | s-f   | div. | Solides > patrons                               | idem                      |
| CM1-117 | Connaître et utiliser le vocabulaire lié aux déplacements                                                                                                                                                                               | s-f   | div. | Repérage et déplacements > coder un déplacement | Le repérage dans l'espace |
| CM1-118 | Comprendre, utiliser et produire une suite d'instructions qui décrivent un déplacement en utilisant un vocabulaire spatial précis                                                                                                       | s-f   | div. | Repérage et déplacements > coder un déplacement | idem                      |
| CM1-119 | Résoudre des problèmes portant sur des assemblages de cubes                                                                                                                                                                             | s-f   | div. | Solides (notion)                                | idem                      |

### OGD et probabilités (branches `Statistiques` / `Probabilités`) et La proportionnalité (branche `Proportionnalité`)

| Code    | Énoncé (verbatim BO)                                                                                                                                        | kind  | rég. | nœud                                              | Rubrique BO                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------------- | ---------------------------------- |
| CM1-120 | Recueillir des données et produire un tableau pour les présenter                                                                                            | s-f   | div. | Représenter des données > tableaux                | Organisation et gestion de données |
| CM1-135 | Recueillir des données et produire un diagramme en barres pour les présenter                                                                                | s-f   | div. | Représenter des données > diagrammes en barres    | Organisation et gestion de données |
| CM1-136 | Recueillir des données et produire un ensemble de points dans un repère pour les présenter                                                                  | s-f   | div. | Représenter des données > courbes et repères      | Organisation et gestion de données |
| CM1-121 | Lire et interpréter les données d'un tableau à simple entrée                                                                                                | s-f   | div. | Représenter des données > tableaux                | idem                               |
| CM1-137 | Lire et interpréter les données d'un tableau à double entrée                                                                                                | s-f   | div. | Représenter des données > tableau à double entrée | idem                               |
| CM1-138 | Lire et interpréter les données d'un diagramme en barres                                                                                                    | s-f   | div. | Représenter des données > diagrammes en barres    | idem                               |
| CM1-139 | Lire et interpréter les données d'une courbe                                                                                                                | s-f   | div. | Représenter des données > courbes et repères      | idem                               |
| CM1-122 | Résoudre des problèmes en une ou plusieurs étapes en utilisant les données d'un tableau à simple ou double entrée, d'un diagramme en barres ou d'une courbe | s-f   | div. | Représenter des données (notion)                  | idem                               |
| CM1-123 | Identifier des expériences aléatoires                                                                                                                       | s-f   | div. | Expériences aléatoires (notion)                   | Les probabilités                   |
| CM1-124 | Identifier toutes les issues possibles lors d'une expérience aléatoire simple                                                                               | s-f   | div. | Expériences aléatoires > événements               | idem                               |
| CM1-125 | Comprendre et utiliser le vocabulaire approprié : « impossible », « possible », « certain », « probable », « peu probable », « une chance sur deux »        | s-f   | div. | Expériences aléatoires > probabilité simple       | idem                               |
| CM1-126 | Comparer des issues d'expériences aléatoires ou des évènements selon leur probabilité de réalisation                                                        | s-f   | div. | Expériences aléatoires > probabilité simple       | idem                               |
| CM1-127 | Comprendre que ce n'est pas parce qu'il y a deux issues possibles que chacune a une chance sur deux de se réaliser                                          | conn. | div. | Expériences aléatoires > équiprobabilité          | idem                               |
| CM1-128 | Reconnaître des situations d'équiprobabilité                                                                                                                | s-f   | div. | Expériences aléatoires > équiprobabilité          | idem                               |
| CM1-129 | Identifier une situation de proportionnalité                                                                                                                | s-f   | div. | Situations de proportionnalité > caractérisation  | La proportionnalité                |
| CM1-130 | Savoir résoudre un problème de proportionnalité                                                                                                             | s-f   | div. | Situations de proportionnalité (notion)           | La proportionnalité                |

---

## CM2 — 116 points

### Nombres, calcul et résolution de problèmes > Les nombres entiers

| Code    | Énoncé (verbatim BO)                                                                                                                                                                  | kind  | rég. | nœud                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ---------------------------------------------------- |
| CM2-001 | Connaître et utiliser les relations entre les unités de numération                                                                                                                    | s-f   | div. | Entiers : numération > décomposition                 |
| CM2-002 | Connaître la suite écrite et la suite orale des nombres jusqu'à 999 999 999                                                                                                           | conn. | div. | Entiers : numération > écritures                     |
| CM2-003 | Connaître et utiliser diverses représentations d'un nombre et passer de l'une à l'autre                                                                                               | s-f   | div. | Entiers : numération > écritures                     |
| CM2-004 | Connaître la valeur des chiffres en fonction de leur position dans un nombre                                                                                                          | conn. | div. | Entiers : numération > décomposition                 |
| CM2-005 | Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >                                                                                                | s-f   | div. | Entiers : numération > ordre                         |
| CM2-006 | Ordonner des nombres dans l'ordre croissant ou décroissant                                                                                                                            | s-f   | div. | Entiers : numération > ordre                         |
| CM2-007 | Placer des nombres et repérer des points sur une demi-droite graduée                                                                                                                  | s-f   | div. | Entiers : numération > droite graduée                |
| CM2-008 | Déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné ou si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10 | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs |
| CM2-009 | Déterminer des diviseurs d'un nombre entier inférieur ou égal à 100                                                                                                                   | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs |
| CM2-010 | Déterminer tous les diviseurs d'un nombre entier inférieur ou égal à 30                                                                                                               | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs |
| CM2-011 | Déterminer les diviseurs communs à deux nombres entiers inférieurs ou égaux à 30                                                                                                      | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs |
| CM2-012 | Déterminer des multiples communs à deux nombres entiers inférieurs à 15                                                                                                               | s-f   | div. | `Arithmétique` Divisibilité > multiples et diviseurs |

### … > Les fractions

| Code    | Énoncé (verbatim BO)                                                                                             | kind | rég. | nœud                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------- |
| CM2-013 | Interpréter, représenter, écrire et lire des fractions                                                           | s-f  | div. | Fractions : sens et écritures > définition     |
| CM2-014 | Écrire une fraction supérieure à 1 comme la somme d'un entier et d'une fraction inférieure à 1                   | s-f  | div. | Fractions : sens et écritures > décomposition  |
| CM2-015 | Écrire la somme d'un entier et d'une fraction inférieure à 1 comme une unique fraction                           | s-f  | div. | Fractions : sens et écritures > décomposition  |
| CM2-016 | Encadrer une fraction entre deux nombres entiers consécutifs                                                     | s-f  | div. | Fractions : sens et écritures > ordre          |
| CM2-017 | Placer une fraction ou la somme d'un nombre entier et d'une fraction inférieure à un sur une demi-droite graduée | s-f  | div. | Fractions : sens et écritures > droite graduée |
| CM2-018 | Repérer un point d'une demi-droite graduée par une fraction ou par la somme d'un nombre entier et d'une fraction | s-f  | div. | Fractions : sens et écritures > droite graduée |
| CM2-019 | Comparer des fractions                                                                                           | s-f  | div. | Fractions : sens et écritures > ordre          |
| CM2-020 | Additionner et soustraire des fractions                                                                          | s-f  | div. | Fractions : calculs > addition et soustraction |
| CM2-021 | Calculer le produit d'un entier et d'une fraction                                                                | s-f  | div. | Fractions : calculs > multiplication           |
| CM2-022 | Déterminer une fraction d'une quantité ou d'une grandeur                                                         | s-f  | div. | Fractions : calculs > fraction d'une quantité  |

### … > Les nombres décimaux

| Code    | Énoncé (verbatim BO)                                                                                                                                         | kind | rég. | nœud                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---- | ------------------------------------------------------ |
| CM2-023 | Interpréter, représenter, écrire et lire des fractions décimales                                                                                             | s-f  | div. | Fractions : sens et écritures > définition             |
| CM2-024 | Connaître et utiliser les relations entre unités simples, dixièmes, centièmes et millièmes                                                                   | s-f  | div. | Décimaux : numération > décomposition                  |
| CM2-025 | Placer une fraction décimale sur une demi-droite graduée et repérer un point d'une demi-droite graduée par une fraction décimale                             | s-f  | div. | Fractions : sens et écritures > droite graduée         |
| CM2-026 | Écrire une fraction décimale supérieure à 1 comme la somme d'un nombre entier et d'une fraction décimale inférieure à 1                                      | s-f  | div. | Fractions : sens et écritures > décomposition          |
| CM2-027 | Écrire une fraction décimale supérieure à 1 comme la somme d'un nombre entier et de fractions décimales ayant un numérateur inférieur à 10                   | s-f  | div. | Fractions : sens et écritures > décomposition          |
| CM2-028 | Comparer, encadrer, intercaler des fractions décimales en utilisant les symboles =, < et >                                                                   | s-f  | div. | Fractions : sens et écritures > ordre                  |
| CM2-029 | Ordonner des fractions décimales dans l'ordre croissant ou décroissant                                                                                       | s-f  | div. | Fractions : sens et écritures > ordre                  |
| CM2-030 | Passer d'une écriture sous forme d'une fraction décimale ou de la somme de fractions décimales à une écriture à virgule et réciproquement                    | s-f  | div. | Décimaux : numération > forme fractionnaire            |
| CM2-031 | Interpréter, représenter, écrire et lire des nombres décimaux (écriture à virgule)                                                                           | s-f  | div. | Décimaux : numération > écritures                      |
| CM2-032 | Placer un nombre décimal en écriture à virgule sur une demi-droite graduée et repérer un point d'une demi-droite graduée par un nombre en écriture à virgule | s-f  | div. | Décimaux : numération > droite graduée                 |
| CM2-033 | Savoir donner la partie entière et l'arrondi à l'entier d'un nombre décimal                                                                                  | s-f  | div. | Décimaux : numération > arrondis et ordres de grandeur |
| CM2-034 | Comparer, ordonner par ordre croissant ou décroissant des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >            | s-f  | div. | Décimaux : numération > ordre                          |
| CM2-117 | Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >                                             | s-f  | div. | Décimaux : numération > encadrement                    |

### … > Le calcul mental — tout en `fluence` (S5)

| Code    | Énoncé (verbatim BO ; ✂ = scission S2)                                                                                                                              | kind  | rég. | nœud                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------- |
| CM2-035 | Connaître des faits numériques usuels avec des entiers — répertoire additif ✂                                                                                       | conn. | flu. | Entiers : addition et soustraction > tables           |
| CM2-036 | Connaître des faits numériques usuels avec des entiers — répertoire multiplicatif ✂                                                                                 | conn. | flu. | Entiers : multiplication > tables                     |
| CM2-037 | Connaître la moitié des nombres impairs jusqu'à 15                                                                                                                   | conn. | flu. | Décimaux : calculs > division                         |
| CM2-038 | Connaître quelques relations entre des fractions usuelles                                                                                                            | conn. | flu. | Fractions : sens et écritures > égalité de fractions  |
| CM2-039 | Connaître l'écriture décimale de fractions usuelles                                                                                                                  | conn. | flu. | Fractions : sens et écritures > forme décimale        |
| CM2-040 | Ajouter un nombre entier à un nombre décimal lorsqu'il n'y a pas de retenue                                                                                          | s-f   | flu. | Décimaux : calculs > addition                         |
| CM2-118 | Soustraire un nombre entier à un nombre décimal lorsqu'il n'y a pas de retenue                                                                                       | s-f   | flu. | Décimaux : calculs > soustraction                     |
| CM2-041 | Ajouter un nombre entier à un nombre décimal lorsqu'il y a une retenue                                                                                               | s-f   | flu. | Décimaux : calculs > addition                         |
| CM2-042 | Multiplier un nombre décimal par 10, 100 ou 1 000                                                                                                                    | s-f   | flu. | Décimaux : calculs > multiplication                   |
| CM2-043 | Diviser un nombre décimal par 10, 100 ou 1 000                                                                                                                       | s-f   | flu. | Décimaux : calculs > division                         |
| CM2-044 | Ajouter deux nombres décimaux inférieurs à 10, s'écrivant avec au plus un chiffre après la virgule                                                                   | s-f   | flu. | Décimaux : calculs > addition                         |
| CM2-045 | Ajouter ou soustraire 8, 9, 18, 19, 28, 29, …, 98 ou 99 à un nombre                                                                                                  | s-f   | flu. | Entiers : addition et soustraction > calcul astucieux |
| CM2-046 | Multiplier un nombre entier, inférieur à 10, de dizaines, de centaines ou de milliers par un nombre entier, inférieur à 10, de dizaines, de centaines ou de milliers | s-f   | flu. | Entiers : multiplication > calcul astucieux           |
| CM2-047 | Utiliser la distributivité de la multiplication par rapport à l'addition dans des cas simples                                                                        | s-f   | flu. | Entiers : multiplication > distributivité             |
| CM2-048 | Calculer le double d'un nombre décimal dans des cas simples                                                                                                          | s-f   | flu. | Décimaux : calculs > multiplication                   |
| CM2-049 | Calculer la moitié d'un nombre décimal dans des cas simples                                                                                                          | s-f   | flu. | Décimaux : calculs > division                         |
| CM2-050 | Diviser un nombre entier par 4 ou par 8                                                                                                                              | s-f   | flu. | Entiers : division > calcul réfléchi                  |
| CM2-051 | Multiplier un nombre décimal par 5                                                                                                                                   | s-f   | flu. | Décimaux : calculs > multiplication                   |
| CM2-052 | Multiplier un nombre décimal par 50                                                                                                                                  | s-f   | flu. | Décimaux : calculs > multiplication                   |

### … > Les quatre opérations

| Code    | Énoncé (verbatim BO)                                                                             | kind | rég. | nœud                                                   |
| ------- | ------------------------------------------------------------------------------------------------ | ---- | ---- | ------------------------------------------------------ |
| CM2-053 | Estimer le résultat d'une opération                                                              | s-f  | div. | Décimaux : numération > arrondis et ordres de grandeur |
| CM2-054 | Savoir réaliser un calcul contenant une ou deux paires de parenthèses                            | s-f  | div. | Entiers : priorités opératoires > avec parenthèses     |
| CM2-055 | Poser et effectuer la multiplication d'un nombre décimal par un nombre entier                    | s-f  | div. | Décimaux : calculs > multiplication                    |
| CM2-056 | Poser et effectuer des divisions décimales avec un dividende entier et un diviseur à un chiffre  | s-f  | div. | Décimaux : calculs > division                          |
| CM2-057 | Poser et effectuer des divisions décimales avec un dividende décimal et un diviseur à un chiffre | s-f  | div. | Décimaux : calculs > division                          |

### … > La résolution de problèmes

| Code    | Énoncé (verbatim BO)                                                        | kind | rég. | nœud                                               |
| ------- | --------------------------------------------------------------------------- | ---- | ---- | -------------------------------------------------- |
| CM2-058 | Résoudre des problèmes additifs en une étape                                | s-f  | div. | Problèmes arithmétiques (notion)                   |
| CM2-119 | Résoudre des problèmes additifs en plusieurs étapes                         | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus   |
| CM2-059 | Résoudre des problèmes multiplicatifs de type « parties-tout » en une étape | s-f  | div. | Problèmes arithmétiques > multiplicatifs           |
| CM2-060 | Résoudre des problèmes mixtes en plusieurs étapes                           | s-f  | div. | Problèmes arithmétiques > en deux étapes ou plus   |
| CM2-061 | Résoudre des problèmes de comparaison multiplicative                        | s-f  | div. | Problèmes arithmétiques > comparaison              |
| CM2-062 | Résoudre des problèmes de dénombrement                                      | s-f  | div. | Problèmes arithmétiques > produits cartésiens      |
| CM2-063 | Résoudre des problèmes d'optimisation                                       | s-f  | div. | Problèmes arithmétiques > optimisation             |
| CM2-064 | Résoudre des problèmes préparant à l'utilisation d'algorithmes              | s-f  | div. | `Algorithmique` Préalgorithmique (nouvelle notion) |

### … > Algèbre · branche `Algèbre`

| Code    | Énoncé (verbatim BO)                                                                  | kind | rég. | nœud                                            |
| ------- | ------------------------------------------------------------------------------------- | ---- | ---- | ----------------------------------------------- |
| CM2-065 | Trouver le nombre manquant dans une égalité à trous                                   | s-f  | div. | Premiers pas algébriques > égalités à trous     |
| CM2-066 | Résoudre des problèmes algébriques                                                    | s-f  | div. | Premiers pas algébriques > nombre inconnu       |
| CM2-067 | Exécuter ou produire un programme de calcul                                           | s-f  | div. | Premiers pas algébriques > programmes de calcul |
| CM2-068 | Identifier et formuler une règle de calcul pour poursuivre une suite de nombres       | s-f  | div. | Premiers pas algébriques > suites de motifs     |
| CM2-069 | Identifier des régularités et poursuivre une suite de motifs évolutive                | s-f  | div. | Premiers pas algébriques > suites de motifs     |
| CM2-070 | Trouver le nombre d'éléments pour une étape donnée dans une suite de motifs évolutive | s-f  | div. | Premiers pas algébriques > suites de motifs     |

### Grandeurs et mesures

| Code    | Énoncé (verbatim BO)                                                                                                                                | kind  | rég. | nœud                          | Rubrique BO                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------- | --------------------------------------- |
| CM2-071 | Comparer les aires de différentes figures planes                                                                                                    | s-f   | div. | Aires (notion)                | Les aires                               |
| CM2-072 | Déterminer des aires en utilisant une unité et un quadrillage                                                                                       | s-f   | div. | Aires (notion)                | Les aires                               |
| CM2-073 | Connaître et utiliser les unités centimètre carré, décimètre carré et mètre carré pour exprimer des aires                                           | s-f   | div. | Aires > unités et conversions | Les aires                               |
| CM2-074 | Convertir des aires entre différentes unités                                                                                                        | s-f   | div. | Aires > unités et conversions | Les aires                               |
| CM2-075 | Déterminer l'aire d'un carré                                                                                                                        | s-f   | div. | Aires > carré                 | Les aires                               |
| CM2-120 | Déterminer l'aire d'un rectangle                                                                                                                    | s-f   | div. | Aires > rectangle             | Les aires                               |
| CM2-076 | Utiliser le lexique spécifique associé aux angles                                                                                                   | s-f   | div. | Angles (notion)               | Les angles                              |
| CM2-077 | Comprendre et utiliser les notations des angles                                                                                                     | s-f   | div. | Angles (notion)               | Les angles                              |
| CM2-078 | Comparer des angles                                                                                                                                 | s-f   | div. | Angles > comparaison          | Les angles                              |
| CM2-079 | Construire un angle égal à la somme de deux angles donnés ou un angle multiple d'un angle donné                                                     | s-f   | div. | Angles > construction         | Les angles                              |
| CM2-080 | Construire par pliage la moitié d'un angle donné                                                                                                    | s-f   | div. | Angles > construction         | Les angles                              |
| CM2-081 | Savoir qu'un angle droit mesure 90°                                                                                                                 | conn. | div. | Angles > mesure en degrés     | Les angles                              |
| CM2-082 | Lire l'heure sur une horloge à aiguilles                                                                                                            | s-f   | div. | Durées > lecture de l'heure   | Le repérage dans le temps et les durées |
| CM2-083 | Positionner les aiguilles d'une horloge correspondant à une heure donnée en heure, minute et seconde                                                | s-f   | div. | Durées > lecture de l'heure   | idem                                    |
| CM2-084 | Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (instants et durées sont exprimés en heure, minute et seconde) | s-f   | div. | Durées > calcul de durées     | idem                                    |
| CM2-085 | Résoudre des problèmes à une ou plusieurs étapes impliquant des durées                                                                              | s-f   | div. | Durées > calcul de durées     | idem                                    |

### Espace et géométrie

| Code    | Énoncé (verbatim BO)                                                                                                                                                                                                                              | kind  | rég. | nœud                                            | Rubrique BO                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------- | -------------------------- |
| CM2-087 | Utiliser les outils géométriques usuels : règle, règle graduée, équerre et compas                                                                                                                                                                 | s-f   | div. | Figures planes > constructions                  | idem                       |
| CM2-088 | Connaître les notations et les codes usuels utilisés en géométrie                                                                                                                                                                                 | conn. | div. | Figures planes > propriétés                     | idem                       |
| CM2-089 | Reconnaître et utiliser la notion de perpendicularité                                                                                                                                                                                             | s-f   | div. | Figures planes > perpendiculaires et parallèles | idem                       |
| CM2-090 | Reconnaître et utiliser la notion de parallélisme                                                                                                                                                                                                 | s-f   | div. | Figures planes > perpendiculaires et parallèles | idem                       |
| CM2-091 | Décrire et reconnaître un cercle et un disque comme un ensemble de points caractérisés par leur distance à un point donné                                                                                                                         | s-f   | div. | Figures planes > cercle                         | idem                       |
| CM2-092 | Reconnaître et nommer les figures suivantes en s'appuyant sur leur définition : triangle, triangle rectangle, triangle isocèle, triangle équilatéral, quadrilatère, carré, rectangle, losange, trapèze, trapèze rectangle, pentagone et hexagone  | s-f   | div. | Figures planes > propriétés                     | idem                       |
| CM2-093 | Connaître les propriétés de parallélisme des côtés opposés, des égalités de longueurs et d'angles pour les figures usuelles : triangle rectangle, triangle isocèle, triangle équilatéral, carré, rectangle, losange, trapèze et trapèze rectangle | conn. | div. | Figures planes > propriétés                     | idem                       |
| CM2-094 | Reproduire ou construire un carré, un rectangle, un triangle, un triangle rectangle ou un cercle ou des assemblages de ces figures sur tout support (papier quadrillé, pointé ou uni), avec une règle graduée, une équerre ou un compas           | s-f   | div. | Figures planes > constructions                  | idem                       |
| CM2-095 | Construire une figure géométrique composée de segments, de droites, de polygones usuels et de cercles                                                                                                                                             | s-f   | div. | Figures planes > constructions                  | idem                       |
| CM2-096 | Élaborer un programme de construction                                                                                                                                                                                                             | s-f   | div. | Figures planes > constructions                  | idem                       |
| CM2-097 | Construire, sur papier quadrillé, la figure symétrique d'une figure donnée par rapport à une droite verticale, horizontale ou une diagonale du quadrillage                                                                                        | s-f   | div. | Symétrie axiale (notion)                        | idem                       |
| CM2-098 | Nommer un cube, une boule, un pavé, un cône, une pyramide, un cylindre ou un prisme droit                                                                                                                                                         | s-f   | div. | Solides > propriétés                            | Les solides                |
| CM2-099 | Décrire un cube, un pavé, une pyramide ou un prisme droit en faisant référence à des propriétés et en utilisant le vocabulaire approprié                                                                                                          | s-f   | div. | Solides > propriétés                            | idem                       |
| CM2-100 | Reconnaître un patron d'un cube                                                                                                                                                                                                                   | s-f   | div. | Solides > patrons                               | idem                       |
| CM2-101 | Construire un patron d'un cube                                                                                                                                                                                                                    | s-f   | div. | Solides > patrons                               | idem                       |
| CM2-102 | Reconnaître un patron d'un pavé                                                                                                                                                                                                                   | s-f   | div. | Solides > patrons                               | idem                       |
| CM2-103 | Connaître et utiliser le vocabulaire lié aux déplacements                                                                                                                                                                                         | s-f   | div. | Repérage et déplacements > coder un déplacement | Déplacements dans l'espace |
| CM2-104 | Comprendre, utiliser et produire une suite d'instructions qui décrivent un déplacement en utilisant un vocabulaire spatial précis                                                                                                                 | s-f   | div. | Repérage et déplacements > coder un déplacement | idem                       |
| CM2-105 | Résoudre des problèmes portant sur des assemblages de cubes                                                                                                                                                                                       | s-f   | div. | Solides (notion)                                | idem                       |

### OGD et probabilités · La proportionnalité

| Code    | Énoncé (verbatim BO)                                                                                                                                                                       | kind  | rég. | nœud                                             | Rubrique BO                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ------------------------------------------------ | ---------------------------------- |
| CM2-106 | Recueillir des données et produire un tableau pour présenter des données recueillies                                                                                                       | s-f   | div. | Représenter des données > tableaux               | Organisation et gestion de données |
| CM2-121 | Recueillir des données et produire un diagramme en barres pour présenter des données recueillies                                                                                           | s-f   | div. | Représenter des données > diagrammes en barres   | Organisation et gestion de données |
| CM2-122 | Recueillir des données et produire un ensemble de points dans un repère pour présenter des données recueillies                                                                             | s-f   | div. | Représenter des données > courbes et repères     | Organisation et gestion de données |
| CM2-107 | Lire et interpréter les données d'un tableau                                                                                                                                               | s-f   | div. | Représenter des données > tableaux               | idem                               |
| CM2-123 | Lire et interpréter les données d'un diagramme en barres                                                                                                                                   | s-f   | div. | Représenter des données > diagrammes en barres   | idem                               |
| CM2-124 | Lire et interpréter les données d'un diagramme circulaire                                                                                                                                  | s-f   | div. | Représenter des données > diagrammes circulaires | idem                               |
| CM2-125 | Lire et interpréter les données d'une courbe                                                                                                                                               | s-f   | div. | Représenter des données > courbes et repères     | idem                               |
| CM2-108 | Résoudre des problèmes en une ou deux étapes en utilisant les données d'un tableau, d'un diagramme en barres, d'un diagramme circulaire ou d'une courbe                                    | s-f   | div. | Représenter des données (notion)                 | idem                               |
| CM2-109 | Identifier toutes les issues possibles lors d'une expérience aléatoire simple                                                                                                              | s-f   | div. | Expériences aléatoires > événements              | Les probabilités                   |
| CM2-110 | Identifier toutes les issues réalisant un évènement dans une expérience aléatoire simple                                                                                                   | s-f   | div. | Expériences aléatoires > événements              | idem                               |
| CM2-111 | Dans une situation d'équiprobabilité, lors d'une expérience aléatoire simple, exprimer la probabilité d'un évènement sous la forme « a chances sur b »                                     | s-f   | div. | Expériences aléatoires > probabilité simple      | idem                               |
| CM2-112 | Comparer des probabilités dans des cas simples                                                                                                                                             | s-f   | div. | Expériences aléatoires > probabilité simple      | idem                               |
| CM2-113 | Comprendre la notion d'indépendance lors de la répétition de la même expérience aléatoire                                                                                                  | conn. | div. | Expériences aléatoires (notion)                  | idem                               |
| CM2-114 | Dans des situations d'équiprobabilité, recenser toutes les issues possibles d'une expérience aléatoire en deux étapes dans un tableau ou dans un arbre afin de déterminer des probabilités | s-f   | div. | Expériences aléatoires > événements              | idem                               |
| CM2-115 | Identifier une situation de proportionnalité                                                                                                                                               | s-f   | div. | Situations de proportionnalité > caractérisation | La proportionnalité                |
| CM2-116 | Savoir résoudre un problème de proportionnalité                                                                                                                                            | s-f   | div. | Situations de proportionnalité (notion)          | La proportionnalité                |

---

## Rattachements discutables — TRANCHÉS par David le 2026-10-07 (sauf le 4)

1. **« Estimer le résultat d'une opération »** (CM1-048, CM2-053) — ✅ tranché : la
   sous-notion est **renommée « arrondis et ordres de grandeur »** (`Décimaux :
numération`), et les deux points y vont. Renommage sans impact sur la
   correspondance (0 occurrence de l'ancien chemin dans les CSV, mesuré).
2. **« Diviser un nombre entier par 4 ou par 8 »** (CM2-050) — ✅ tranché : **nouvelle
   sous-notion « calcul réfléchi » sous `Entiers : division`**, le point y va.
3. **« Problèmes portant sur des assemblages de cubes »** (CM1-119, CM2-105) — ✅
   tranché : **tout va sous `Solides`** (notion), y compris la vision dans l'espace de
   la 6e à son seed. La rubrique BO reste « Le repérage dans l'espace » (fidèle au
   texte) — le nœud dit ce que le contenu EST.
4. **« Problèmes préparant à l'utilisation d'algorithmes »** (CM2-064) — ✅ tranché :
   **nouvelle notion « Préalgorithmique » dans la branche `Algorithmique`**, qui
   s'ouvre ainsi avant la 5e (ses notions actuelles commencent en 5e). Le point y va ;
   les 4 points « Initiation à la pensée informatique » de la **6e** sont candidats au
   même nœud (à confirmer au seed 6e — le doc d'écarts les visait vers `Repérage et
déplacements > coder un déplacement`).
5. **Périmètres CM1** (CM1-073/074/075) sur la **notion** `Périmètres` — ✅ validé.
   Les niveaux affichés du JSON (`[CE2, 6e]`) sont indicatifs et seront rafraîchis.
6. **« Passer d'une écriture sous forme d'une fraction décimale … à une écriture à
   virgule et réciproquement »** (CM1-030, CM2-030) → `Décimaux : numération > forme
fractionnaire` — ✅ validé (le miroir `Fractions > forme décimale` reste pour
   l'écriture décimale des fractions usuelles).

## Questions S3-S6 — TRANCHÉES le 2026-10-07 (« je valide tout » = recos)

> (S1 et S2 : règle des puces multi-gestes du 2026-10-07, appliquée et documentée
> ci-dessus.)

- **S3 — nouvelle sous-notion `Décimaux : numération > droite graduée`** : après la
  correction « fractions décimales = fractions », il ne reste que 2 points concernés
  (CM1-032, CM2-032 : placer/repérer un nombre décimal **en écriture à virgule**).
  Symétrie : `Fractions` et `Relatifs : sens et écritures` ont chacune leur « droite
  graduée ». Reco : oui — ajout à l'arbre (migration + JSON + diagramme). Sinon :
  rattachement à la notion.
- **S4 — renommer `Décimaux : calculs > moitié` en « double et moitié »** (le CM2 calcule
  double ET moitié ; symétrie avec `Entiers : addition et soustraction > double et
moitié`). Reco : oui (migration + JSON + diagramme + grep `correspondance/`).
- **S5 — régime** : `fluence` pour toute la section « Le calcul mental » (13 points CM1,
  18 points CM2), `diversite` partout ailleurs. Reco : oui.
- **S6 — validation d'ensemble** du document (les rattachements 1-3, 5-6 sont déjà
  tranchés ; reste le 4 et l'ensemble).

## Après validation (plan de livraison)

1. Worktree frère + migration **additive** `seed_curriculum_points_cm.sql` : d'abord
   les ajustements d'arbre tranchés — renommer « arrondir » → « arrondis et ordres de
   grandeur », créer `Entiers : division > calcul réfléchi` et la notion
   `Algorithmique > Préalgorithmique` — plus S3/S4 si validées
   (S4 ⇒ répercuter les 3 lignes `Décimaux : calculs > moitié` de
   `correspondance/modeles.csv`, et le JSON + diagramme dans tous les cas) ; puis les
   246 points (codes explicites, `node_id` résolu par chemin nom + parent, comme le
   seed des nœuds). Rollback en commentaire.
2. Test d'intégration : **comparaison intégrale** des 246 lignes (code, énoncé, kind,
   exigence, régime, rubrique, grade, chemin du nœud) en lecture **anonyme** (modèle du
   test du seed des nœuds), vérifié **rouge sans la migration**.
3. `security-auditor` (B6 déjà ouvert : aucune nouvelle question d'accès — les points
   CM s'ajoutent à une table déjà lisible par anon, écriture admin/prof inchangée).
4. PR → CI verte → merge → `db:migrate` (4 conditions) → vérification prod (comptes +
   échantillon) → `db:types` si le schéma a bougé (S3/S4 ne touchent pas les types).
5. Suite de l'ordre validé : **cycle 2 (CP-CE1-CE2)** — extraction du programme 2024 —
   puis **6e** (95 points + références d'automatismes vers ces points CM).
