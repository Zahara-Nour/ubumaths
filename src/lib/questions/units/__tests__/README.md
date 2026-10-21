# Tests de `questions/units` — la correction des cases à unité

`questions/units` sert **une seule chose** : lire et corriger la réponse d'un élève dans une
case à unité d'une question (`blank.unit.expected`). Le calcul et l'écriture des grandeurs
partout ailleurs (énoncés, `{{eval}}`, Calcul) passent par `mathAST` : le contrat est
dans [docs/systeme/grandeurs.md](../../../../../docs/systeme/grandeurs.md).

Le catalogue des unités et les opérations de base vivent dans `mathAST/units` (`resolveUnit`,
`parse`, conversions) : leurs tests sont dans `src/lib/mathAST/units/__tests__/`.

## Les fichiers

| Test                                   | Module                   | Ce qui est vérifié                                                                                                             |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `student-quantity-input.test.ts`       | `student-input.ts`       | saisie MathLive ramenée à `valeur\unit{écriture}` (`5\operatorname{…}`, `5km`)                                                 |
| `composite-duration.test.ts`           | `composite-duration.ts`  | durées composées : « 2 h 15 min », « 1 h 5 min 30 s »                                                                          |
| `parser.test.ts`                       | `parser.ts`              | lecture d'une unité (`km/h`, `m²`) et d'une grandeur LaTeX (`5\unit{km}`), valeur exacte lue en arbre                          |
| `parser-single-rule.test.ts`           | `parser.ts`              | la correction lit les unités comme `mathAST/units` (`kg/m.s` refusé partout)                                                   |
| `operations.test.ts`                   | `operations.ts`          | création, produit, quotient, puissance, compatibilité, écriture d'une unité                                                    |
| `quantity-comparison.test.ts`          | `quantity-comparison.ts` | valeur lue en arbre (mathAST) et comparaison de grandeurs                                                                      |
| `validator.test.ts`                    | `validator.ts`           | verdict d'une réponse : conversions, tolérance, unité attendue                                                                 |
| `validator-rounding-precision.test.ts` | `validator.ts`           | précision demandée appliquée aux grandeurs (trop de décimales → message)                                                       |
| `unit-feedback.test.ts`                | `feedback.ts`            | messages montrés à l'élève quand c'est l'unité qui est fausse                                                                  |
| `keyboard-units.test.ts`               | `keyboard-units.ts`      | touches de l'onglet « Unités » du clavier virtuel                                                                              |
| `oracle-cases-unite.test.ts`           | tout le parcours         | verdicts figés sur les 25 modèles publiés (`tests/fixtures/correction-cases-unite/`) ; `ORACLE_MAJ=1` pour un changement voulu |

## Lancer

```bash
pnpm test:server src/lib/questions/units
```

## Historique

Le 2026-10-13 (lot D des grandeurs), cinq modules morts ont été supprimés avec leurs tests :
`index.ts`, `dimensional.ts`, `hms.ts`, `definitions.ts`, `tokenizer.ts` (~2 000 lignes,
importés seulement entre eux et par leurs tests ; personne n'importait `index.ts`). Les cas de `resolveUnit` qui
n'étaient testés qu'ici sont passés dans `mathAST/units/__tests__/resolve-unit.test.ts`.
