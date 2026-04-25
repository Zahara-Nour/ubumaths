# Parser — Known Issues

## Unary minus inconsistency (parseLatex)

**Date** : 2026-04-25

Le moins unaire en début d'expression s'accroche au premier nombre au lieu d'englober le produit entier.

### Exemple

| Expression | AST produit                              | AST attendu                      |
| ---------- | ---------------------------------------- | -------------------------------- |
| `5-3y`     | `subtraction(5, multiplication(3, y))` ✓ | —                                |
| `-3y`      | `multiplication(opposite(3), y)` ✗       | `opposite(multiplication(3, y))` |
| `0-3y`     | `subtraction(0, multiplication(3, y))` ✓ | —                                |

### Impact

- `flattenSumShallow` ne voit pas le signe négatif dans `-3y` (il retourne `[{+, opposite(3)*y}]` au lieu de `[{-, 3*y}]`)
- Les fonctions d'analyse structurelle (extractAffineCombination, extractQuadraticCombination, etc.) doivent gérer le cas où `opposite` est enfoui dans un facteur du produit
- Le résultat **numérique** est identique, seule la **structure** de l'AST diffère

### Workaround actuel

Les fonctions d'analyse gèrent les deux cas. Aucune correction du parser pour l'instant (risque d'effets de bord sur tout le projet).

---

## Slash après exposant non reconnu (parseCustom Pratt)

**Date** : 2026-04-26

Dans le parser Pratt (`parseCustomPratt`), `/` n'est pas reconnu après un exposant `^`. L'opérateur `^` est traité comme postfix dans `parseAtom`, mais le contrôle ne revient pas à `parseAtomWithFraction` pour consommer le `/` qui suit.

### Exemple

| Expression | Résultat                | Attendu            |
| ---------- | ----------------------- | ------------------ |
| `2/4`      | `division(2, 4)` ✓      | —                  |
| `x/4`      | `division(x, 4)` ✓      | —                  |
| `x^2/4`    | **Erreur de parsing** ✗ | `division(x^2, 4)` |
| `(x^2)/4`  | `division(x^2, 4)` ✓    | —                  |
| `{x^2}/4`  | `division(x^2, 4)` ✓    | —                  |

### Cause

`parseAtomWithFraction` appelle `parseAtom` qui consomme `x^2` (le `^` est un postfix dans `parseAtom`). Mais `parseAtom` est appelé dans un contexte où le `^` est traité dans une boucle postfix (`while (CARET || UNDERSCORE || LBRACKET)`) qui se trouve **après** l'appel initial à `parseAtomWithFraction`. Le `/` est donc vu par le parser de niveau supérieur qui ne le reconnaît pas comme opérateur.

### Workaround actuel

Utiliser des accolades `{x^2}/4` ou des parenthèses `(x^2)/4` pour grouper explicitement avant la division.
