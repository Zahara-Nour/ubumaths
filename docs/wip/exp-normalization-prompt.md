# Prompt de Reprise: Reflexion sur la Normalisation exp

Copie ce prompt pour reprendre la reflexion dans un nouveau contexte:

---

## Prompt

```
@docs/wip/exp-normalization-refactoring.md @docs/ref/mathAST/normalization.md

Je reflechis a la normalisation des exponentielles dans mon systeme mathAST.

**Probleme identifie**: `exp(2)*exp(3)` n'est pas equivalent a `exp(5)` avec l'approche actuelle (expansion).

**Contexte**:
- L'approche EXPANSION (`exp(a+b) → exp(a)*exp(b)`) echoue pour les constantes
- L'approche COMBINAISON (`exp(a)*exp(b) → exp(a+b)`) resoudrait le probleme
- `ln` utilise l'expansion et ca marche car `ln(6)` est decompose via factorisation premiere

**Questions ouvertes**:
1. La combinaison est-elle vraiment la bonne direction ? Y a-t-il d'autres approches ?
2. Comment gerer les cas mixtes (ex: `exp(x)*exp(2)*exp(y)`) ?
3. Quels sont les edge cases a considerer ?
4. Impact sur la denormalization et l'affichage ?
5. Y a-t-il des cas ou l'expansion serait preferable ?

Continue l'analyse et aide-moi a affiner la reflexion avant de decider de l'implementation.
```

---

## Points a explorer

- Coherence avec le reste du systeme (puissances, radicaux, ln)
- Forme canonique optimale pour le calcul de valeurs exactes
- Forme canonique optimale pour l'affichage pedagogique
- Cas limites: `exp(0)`, `exp(1)`, `exp(-x)`, `exp(x/2)`
- Interaction avec les regles `exp(ln(x)) = x`
