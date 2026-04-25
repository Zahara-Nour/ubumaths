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
