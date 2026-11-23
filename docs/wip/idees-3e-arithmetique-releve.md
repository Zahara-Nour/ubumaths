# Relevé « arithmétique » de Troisième (2026-11-23)

Chantier [`idees-3e-arithmetique`](idees-3e-arithmetique-progress.md). 25 exercices d'arithmétique de
Troisième d'une autre plateforme (codes 3A10 à 3A14, anciennes versions exclues), lus dans leur code
source par deux agents, points clés relus dans le code (titres, plages de 3A10-3, cas de 3A10-6,
engrenages). Comparés à nos modèles de tous les niveaux, relevés en prod (lecture seule).

## Ce que dit le programme

Le BO du cycle 4 en vigueur ne garde en 3e, pour « multiples et diviseurs », que des automatismes
(`src/lib/server/programmes/transcriptions/cycle-4/3-nombres.md`, l. 61-68) : factoriser un entier
(60 = 2² × 3 × 5), simplifier une fraction, dénominateur commun, critères de divisibilité par 2, 3,
5, 9. Les nombres premiers ne sont qu'un prolongement culturel de 5e ; le PGCD, les engrenages et
la conjonction de phénomènes venaient de l'ancien programme et n'y figurent plus (ils tombent
encore au brevet : sujets 2022 et 2024 repris par leurs exercices).

Points de 3e en base : **3-010** (factoriser un entier, 1 modèle) et **3-001** (fraction
irréductible, 3 modèles). Aucun point de 3e pour les critères de divisibilité (points 5-010 et
5-119 en 5e), alors que le BO les cite en automatisme de 3e.

## Relevé

| Id       | Ce qu'on demande                                                                                                                                               | Forme de réponse                            | Modèle(s) Chiphre                                                                                         | Verdict                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 3A10     | Vocabulaire : plus grand reste possible ; quotient et reste lus sur une égalité ; « est un diviseur / un multiple / ni l'un ni l'autre » ; liste des diviseurs | listes déroulantes, cases, liste « a ; b »  | c04b78f8 (6e, égalité, vocabulaire), faf57d3b (5e, multiple ou diviseur), 9adccef3 (CM2), 5e6ce5a3 (2de)  | ✅ sauf « plus grand reste possible » (petit manque, niveau 6e) |
| 3A10-0   | Premier ou non, nombres < 100 (pair, multiple de 3, de 5, premier de 17 à 97)                                                                                  | QCM 2 choix                                 | 73bceb97 v1 (2de, 97 à 199, sans point)                                                                   | ❌ en 3e                                                        |
| 3A10-1   | Premier ou non, 100 à 1 000 ; avec calculatrice : produit p × q affiché, premier de 101 à 523                                                                  | QCM 2 choix                                 | 73bceb97 v1                                                                                               | ❌ en 3e                                                        |
| 3A10-2   | Idem avec multiples de 7 et de 11 (critères par 7 et 11 au corrigé)                                                                                            | QCM 2 choix                                 | 73bceb97 v1                                                                                               | ❌ ; critères par 7 et 11 hors de tout programme du collège     |
| 3A10-3   | Décomposer N : 3 à 5 petits facteurs (2 à 11, exposants 1 ou 2) ; produit de deux premiers de 30 à 100 ; un premier de 1 000 à 2 000                           | saisie libre, jugée « produit de premiers » | 77ab770d (3e : exposants à compléter dans 2^? × 3^? × 5^?, QCM)                                           | 🟡 notre saisie donne les facteurs : manque la saisie libre     |
| 3A10-4   | Depuis la décomposition (3 premiers), tableau des diviseurs, leur nombre, leur liste                                                                           | aucune saisie                               | 392551f9, e12e4d95 (brouillons maths expertes)                                                            | ❌ hors programme du collège                                    |
| 3A10-5   | Décomposer N = pᵃ qᵇ rᶜ (exposants distincts 0 à 3 ; ou un premier de 11 à 19)                                                                                 | saisie libre                                | 77ab770d v1, v2                                                                                           | 🟡 comme 3A10-3                                                 |
| 3A10-6   | Chiffre manquant pour que le nombre soit divisible par 2, 3, 5, 9, 2 et 3, 2 et 5, 6, 10 (2 à 6 chiffres)                                                      | liste de chiffres « a ; b », ou ∅           | 411abdf2 (brouillon maths expertes : par 9, 11, 3) ; 5e : Oui / Non par 3, par 9 ; 943033bf (2de, cocher) | ❌ en 3e                                                        |
| 3A10-7   | Labyrinthe : ne passer que par des cases « nombre premier »                                                                                                    | numéro de sortie, nombre de cases           | aucun                                                                                                     | ❌ format absent chez nous (grille à parcourir)                 |
| 3A10-8   | Répartition (9 contextes) : diviseurs de chaque effectif, PGCD, nombre de groupes, composition (effectifs ≤ 400)                                               | listes, cases numériques                    | 0bd51758 v1, v2 (2de, une seule case : le PGCD, nombres ≤ 200)                                            | 🟡 manque en 3e, et la composition du groupe                    |
| 3A10DNB0 | Brevet 2024 : total, probabilité, « peut-on faire N ballotins ? », décompositions, nombre maximal, composition                                                 | aucune saisie                               | 0bd51758                                                                                                  | 🟡 la chaîne « décomposer → nombre maximal → composition »      |
| 3A10DNB1 | Brevet 2024 : même partie A ; partie B volume d'une piscine et prix                                                                                            | aucune saisie                               | 0bd51758                                                                                                  | 🟡 partie A ; partie B = autre rubrique                         |
| 3A11     | Décomposer A et B puis rendre A/B et B/A irréductibles                                                                                                         | 4 saisies                                   | b0c57a57 (2de : 60/84, 154/231) ; 3e : c9d6c5db, 90dca27a (tables), acbd2280                              | 🟡 en 3e, pas de fraction qui demande une décomposition         |
| 3A11-0   | Simplifier une fraction à 3 facteurs premiers communs (2 à 23)                                                                                                 | saisie, irréductible exigée                 | idem                                                                                                      | 🟡 idem                                                         |
| 3A11-1   | Conjonction de phénomènes (guirlandes, voiture, fusée, restaurant et cinéma, engrenages) : au bout de combien, combien de fois chacun                          | une case (non interactif par défaut)        | 0bd51758 v3 (2de, phares), 84749b7b (CM2, multiples communs)                                              | 🟡 manque en 3e, et « combien de fois chacun »                  |
| 3A12     | Engrenages : dents × tours égal pour les deux roues (trouver des dents ou des tours)                                                                           | une case                                    | aucun                                                                                                     | ❌                                                              |
| 3A12-1   | Deux roues (8 à 25 dents) : tours de chacune pour revenir à la position de départ                                                                              | 2 cases, figure animée                      | aucun                                                                                                     | ❌                                                              |
| 3A12-2   | Trois roues : mêmes questions deux à deux, puis les trois                                                                                                      | 3 cases, figure animée                      | aucun                                                                                                     | ❌ rare                                                         |
| 3A12-3   | Diviseurs communs (fleuriste, professeur, boulanger) : nombre maximal de groupes et composition (PGCD de 30 à 39)                                              | 3 cases                                     | 0bd51758 v1                                                                                               | 🟡 comme 3A10-8                                                 |
| 3A13-1   | Poser une division euclidienne (diviseur à 1 chiffre), écrire l'égalité                                                                                        | saisie de l'égalité                         | 3c9284c5, c04b78f8 (6e)                                                                                   | ✅ (reprise d'un exercice de 6e)                                |
| 3A13-2   | Quotient et reste lus sur une égalité                                                                                                                          | 2 cases                                     | c04b78f8 (6e), 2be2c495 (2de)                                                                             | ✅                                                              |
| 3A13-3   | Nommer dividende, diviseur, quotient, reste dans une égalité                                                                                                   | mot à écrire                                | c04b78f8 v3 (6e)                                                                                          | ✅                                                              |
| 3A13-4   | Écrire l'égalité depuis une division posée (diviseur à 2 chiffres)                                                                                             | saisie de l'égalité                         | c04b78f8, 3c9284c5 (6e)                                                                                   | ✅                                                              |
| 3A13-5   | Plus petit entier à ajouter (ou à soustraire) pour obtenir un multiple du diviseur (diviseur 141 à 179)                                                        | une case                                    | 2806f748 (2de, en Python : plus grand multiple de a ⩽ b)                                                  | ❌                                                              |
| 3A14-0   | Brevet 2022 : truffes (décompositions, diviseurs communs, nombre de boîtes, composition) puis volumes                                                          | aucune saisie                               | 0bd51758                                                                                                  | 🟡 partie 1 ; partie 2 = autre rubrique                         |

## Décompte

25 relevés : ✅ 5 · 🟡 9 · ❌ 11.

## Ce que leur format fait et pas le nôtre

- **Figure d'engrenages animée** (3A12, 3A12-1, 3A12-2) : deux ou trois roues dentées qui tournent
  au corrigé. Chez nous : énoncé en texte. → `outils-manquants.md`.
- **Labyrinthe de nombres** (3A10-7) : une grille à parcourir. Même famille que la « grille ou
  figure jugée par ses contraintes » déjà dans `outils-manquants.md`.
- **Saisie sur plusieurs lignes** d'une décomposition pas à pas (3A10-3, 3A10-5, 3A11), avec un
  barème par ligne. Chez nous : une case, jugée sur le résultat et sa forme.

## Ce que notre format fait mieux

- « Premier ou non » : au lieu d'un Oui / Non, cocher les nombres premiers d'une liste, ou donner un
  diviseur qui prouve que le nombre n'est pas premier (règle `divisor`, déjà employée en brouillon
  de maths expertes).
- Chiffre manquant : cocher tous les chiffres qui conviennent (`plusieurs: oui`) plutôt qu'une liste
  tapée avec des points-virgules.
