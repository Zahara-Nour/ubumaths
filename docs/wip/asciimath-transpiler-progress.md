# ASCIIMath Transpiler - Document de Progression

## Statut Global

| Phase | Description               | Statut    |
| ----- | ------------------------- | --------- |
| 1     | Infrastructure Adaptation | COMPLETED |
| 2     | Tokenizer + tests         | COMPLETED |
| 3     | Parser + tests            | PENDING   |
| 4     | Emitter + tests           | PENDING   |
| 5     | Integration + tests       | PENDING   |
| 6     | Migration API existante   | PENDING   |
| 7     | Validation finale         | PENDING   |

---

## Phase 1: Foundation - Infrastructure Adaptation

**Statut**: COMPLETED

### Modifications effectuées

#### 1. types.ts - Ajouts pour valeur absolue

- Ajout du token `PIPE` (|) dans `TokenType` pour délimiter les valeurs absolues
- Ajout du token `:` dans les commentaires de `OPERATOR`
- Création de l'interface `AbsNode` pour représenter les valeurs absolues dans l'AST
- Ajout de `AbsNode` à l'union `ASTNode`

#### 2. symbols.ts - Nettoyage et nouveaux mappings

- Changement du mapping de `*` : `\cdot` → `\times`
- Ajout des symboles de comparaison manquants:
  - `~~` → `\approx`
  - `-=` → `\equiv`
  - `~` → `\sim`
  - Conservation de `prop` → `\propto`
- Suppression des symboles ensemblistes inutilisés (notin, subset, supset, cap, cup, in)
- Suppression des symboles logiques inutilisés (therefore, because, forall, exists, and, or, not)
- Conservation de : oo, +-, -+, times, cdot, div, flèches, <<, >>, <=, >=, !=

#### 3. tokenizer.ts - Support pour | et :

- Ajout du case `|` dans le switch → token `PIPE`
- Ajout du case `:` dans le switch → token `OPERATOR`

### Tests mis à jour

- `__tests__/tokenizer.test.ts` (82 tests, tous passants)
  - Ajout de tests pour le token `PIPE` (2 tests)
  - Ajout de tests pour l'opérateur `:` (2 tests)
  - Vérification que `*` est toujours tokenizé comme `SYMBOL` (2 tests)
  - Mise à jour des tests pour les nouveaux symboles de comparaison (3 tests)
  - Suppression des tests pour symboles retirés

### Décisions techniques

- `*` mappé sur `\times` au lieu de `\cdot` (alignement avec conventions mathématiques standard)
- Symboles ordonnés par longueur décroissante pour éviter conflits (`~~` avant `~`, `-=` avant `-`)
- Token `PIPE` distinct de `OPERATOR` pour faciliter le parsing des valeurs absolues
- Opérateur `:` nécessaire pour futurs usages (ex: intervalles, ensembles, etc.)

---

## Phase 2: Tokenizer

**Statut**: COMPLETED

### Fichiers créés/modifiés

- `src/lib/transpilers/asciimath-to-latex/tokenizer.ts` (332 lignes)
  - Classe Tokenizer avec toutes les méthodes
  - Support pour PIPE et : operator

- `src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts` (524 lignes)
  - 82 tests, tous passants
  - Couverture complète des cas d'usage

### Prochaines étapes

1. Parser implementation (phase 3)
2. Emitter implementation (phase 4)

---

## Fichiers modifiés dans cette session

1. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/types.ts`
2. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/symbols.ts`
3. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/tokenizer.ts`
4. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts`

## Tests

- Tokenizer: 82/82 tests passants
- Type checking: OK pour les fichiers modifiés (erreurs existantes non liées dans le projet)

## Reprise après crash

En cas de crash, vérifier:

1. Ce document pour connaître la phase en cours (Phase 2 COMPLETED)
2. Les fichiers listés ci-dessus pour les modifications effectuées
3. Lancer `pnpm test:unit src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts -- --run`
