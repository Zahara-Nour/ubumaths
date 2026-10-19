# 0026 — Les grandeurs : un seul circuit, et « un nombre, une espace, une unité »

- **Statut** : acceptée — mise en œuvre close le 2026-10-13 (lots A #1099, B #1101, C #1106, D ;
  analyse et phases 0 : `docs/archive/wip/grandeurs-analyse.md`, `grandeurs-phase0.md`,
  `grandeurs-lot-c-phase0.md`)
- **Date** : 2026-10-11 · **Décidée par** : David (« je suis tes recos », puis phase 0 du lot C)

## Contexte

Trois lecteurs, trois calculateurs et quatre écritures des grandeurs coexistaient ; chaque
correction n'en réparait qu'un (117 commits « unités / grandeurs » de mai à octobre 2026). Calcul et
`/cas` affichaient des étiquettes fausses (`10[km]/1[h]` → « 10 m/s ») pendant que `{{eval}}`, bâti
sur `tidy`, était juste. Et `5 km` tapé dans l'atelier se lisait 5·k·m, alors que 18 unités tiennent
en une lettre (m, g, t, q, L, l, s, h, j, a, K, N, J, W, V, A, C, F) que l'algèbre emploie aussi.

## Décision

| Sujet                   | Décision                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Circuit                 | **Lire en arbre (nœud `unit`) → calculer par `tidy` → écrire depuis l'arbre** ; aucun calculateur à côté  |
| Unité du résultat       | **L'unité écrite d'abord** (`unitChoice: 'written'`), comme `{{eval}}` ; changer d'unité = `.convertir`   |
| Écriture dans l'atelier | **« Un nombre, une espace, une unité »** = grandeur ; collé ou `*` = produit ; crochets toujours acceptés |
| Où elle s'applique      | Calculs et valeurs de l'atelier ; **jamais** définitions de fonctions ni commandes                        |
| Nom du panneau espacé   | La règle est la même partout (`5 m` = 5 mètres), avec une aide « pour 5 × m, écris 5m »                   |
| `5km` collé             | Produit, avec une aide « écris 5 km (avec une espace) »                                                   |
| Mode décimal            | La règle du bouton ≈ (4 décimales, « = » quand c'est exact), comme les nombres ; `.mode-unités` retirée   |
| Énoncés, cases à unité  | Inchangés : énoncés stricts (`5[km]`, `5~\unit{km}`) ; case à unité : tout ce qui suit le nombre          |

Le contrat détaillé, avec les fonctions à appeler : [docs/systeme/grandeurs.md](../systeme/grandeurs.md).

## Écarté

- **La lecture qui a un sens l'emporte** (`5km` et `5 km` grandeurs, retour à l'algèbre si
  incohérent) : plusieurs règles cachées et des lectures silencieuses (`2a + 3a` → 5 ares).
- **Crochets seulement, plus un clavier « Unités »** : sans ambiguïté, mais pas naturel.
- **L'unité scolaire adaptée** pour le résultat (`1500 m` → `1,5 km`) : l'élève ne retrouve pas
  l'unité qu'il a tapée.
- **Garder `evaluateWithUnits`** pour Calcul et le corriger : un second calculateur du même calcul,
  la cause même du problème.

## Conséquences

- Toute nouvelle lecture, tout nouveau calcul ou toute nouvelle écriture de grandeur passe par les
  pièces de `docs/systeme/grandeurs.md` ; un besoin qu'elles ne couvrent pas s'y ajoute.
- `format(unit, 'dot' | 'fraction')` n'est pas une écriture de grandeur : il perd le coefficient.
- `3 t + 2` tapé avec des espaces devient 3 tonnes + 2 : le refus de dimension l'explique
  (`singleLetterHint`).
- La correction des cases à unité (`questions/units/validator.ts`, `quantity-comparison.ts` :
  valeur lue en arbre par mathAST, comparaison en flottants — pas de
  ComputeEngine, contrairement à ce que disait cette ligne) reste un calculateur à part : la
  rapprocher de `tidy` est le chantier `correction-cases-unite`, avec un oracle sur les vraies
  questions (la production ne garde pas les réponses d'élèves).
