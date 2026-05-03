# `stripUnnecessaryBrackets` — règle Poincaré pour `opposite` parent (proposition #7)

> **Objet** : strip les parenthèses superflues dans `opposite(delimiter(X))` quand `X` ne nécessite pas de parenthèses sémantiquement (multiplication, division, superscript, function, atom). Aligne le comportement sur Poincaré `OppositeNode::childAtIndexNeedsUserParentheses` (`opposite.cpp:34`).

**Démarrage** : 2026-05-02
**Branche** : `main`

## Bugs corrigés (5 cas réels confirmés)

| Élève                | Attendu      | Avant       | Après            |
| -------------------- | ------------ | ----------- | ---------------- |
| `-(3x)`              | `-3x`        | bad_form ❌ | unoptimal_form ✓ |
| `-(2 \cdot x)`       | `-2 \cdot x` | bad_form ❌ | unoptimal_form ✓ |
| `-(a \cdot b)`       | `-a \cdot b` | bad_form ❌ | unoptimal_form ✓ |
| `-(x^2)`             | `-x^2`       | bad_form ❌ | unoptimal_form ✓ |
| `-(2x \cdot y)`      | `-2xy`       | bad_form ❌ | unoptimal_form ✓ |
| `-(\cos(x) \cdot 3)` | `-3\cos(x)`  | bad_form ❌ | unoptimal_form ✓ |

## Cas qui doivent rester `bad_form` (préservation de la sémantique)

| Cas                                         | Raison                                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `-(a+b)` vs `-a-b`                          | Distribution algébrique requise (hors scope cosmetic)              |
| `(-x)^2` vs `x^2`                           | Distribution puissance requise                                     |
| `-(-x)` reste avec parenthèses dans son AST | Sémantique de double-négation (gérée par `removeSigns` séparément) |

## Cause racine

`stripBracketsInternal` cas 5 (operator precedence) ne traite pas `parent = opposite` car `getOperatorPrecedence('opposite')` retourne `null`. Fall-through au `default keep brackets`.

## Fix

Ajouter dans `stripBracketsInternal` (`transforms.ts`, dans `case 'delimiter'`, juste avant `default keep`) une règle inspirée de Poincaré `OppositeNode::childAtIndexNeedsUserParentheses` :

```ts
if (parentType === 'opposite') {
	// Keep brackets only if content is addition/subtraction/opposite.
	// Strip otherwise (multiplication, division, superscript, function, atom, ...).
	if (
		strippedContent.type !== 'addition' &&
		strippedContent.type !== 'subtraction' &&
		strippedContent.type !== 'opposite'
	) {
		return strippedContent;
	}
}
```

## Plan

1. **Phase 1** — Tests rouges (5-7 cas dans `cosmetic-transforms.test.ts`).
2. **Phase 2** — Patch `stripBracketsInternal` dans `transforms.ts`.
3. **Phase 3** — Vérif tests + suite globale.
4. **Phase 4** — Review + commit.

## Fichiers modifiés

- `src/lib/mathAST/transforms.ts` :
  - Nouveau **case 4 (Poincaré-aligned)** ajouté avant l'ancien cas négative-content. Mirror de `OppositeNode::childAtIndexNeedsUserParentheses` (`poincare/src/opposite.cpp:34`) : keep si content = `addition`/`subtraction`/`opposite`, strip sinon.
  - Renumérotation : ancien case 4 → case 5 ; ancien case 5 → case 6.
  - **`case 'opposite'` et `case 'positive'`** propagent maintenant `parentType: 'opposite'` / `parentType: 'positive'` quand ils descendent dans leur operand. **Sans cette modif B, la nouvelle règle case 4 ne s'activerait jamais** (le bug initial bloquant).
- `src/lib/mathAST/__tests__/cosmetic-transforms.test.ts` — 8 nouveaux tests dans `describe('stripUnnecessaryBracketsAST')` : 5 strip (mul, mul a\*b, superscript, division, multi-factor mul) + 3 keep (addition, subtraction, opposite).

## Tests

- 99/99 `cosmetic-transforms.test.ts` verts (+8 nouveaux après le fix).
- 14916/14916 suite globale `mathAST + math/intervals + geometry-core` (gain de +8).
- 0 régression. `pnpm check:incremental` ✓.

## Validation empirique end-to-end

```
"-(3x)"              vs "-3x"           →  unoptimal_form  (avant : bad_form)
"-(2 ⋅ x)"           vs "-2 ⋅ x"       →  unoptimal_form
"-(a ⋅ b)"           vs "-a ⋅ b"       →  unoptimal_form
"-(x^2)"             vs "-x^2"          →  unoptimal_form
"-(2x ⋅ y)"          vs "-2xy"          →  unoptimal_form
"-(\\cos(x) ⋅ 3)"    vs "-3\\cos(x)"    →  unoptimal_form
"-(a+b)"             vs "-a-b"          →  bad_form (correct — distribution hors scope)
"(-x)^2"             vs "x^2"           →  bad_form (correct — distribution hors scope)
```

## Code review (Opus)

Verdict : **prêt à commit, aucun blocker**. Points vérifiés :

- Ordre case 4 avant case 5 correct (le pattern `opposite(delimiter(opposite))` est désormais préservé `-(-x)` au lieu de strippé en `--x` ambigu).
- Modif B (propagation `parentType`) chirurgicale, aucun autre case ne teste `parentType === 'opposite'`.
- Cas régression analysés (`-(a/b)`, `-(\\sin(x))`, `-(5)`) — tous attrapés par case 1 avant d'atteindre case 4 → convergence.
- `Conjugate` n'existe pas dans mathAST → règle Poincaré simplifiée.

Mineure adressée : commentaire ajouté pour expliquer que `positive` parent ne déclenche pas de règle Poincaré (symétrie pour cohérence du contrat, mais pas de Poincaré rule équivalente pour PositiveNode).

Mineure non adressée (dette stylistique) : duplication du `return delimiter(...)` dans 4 branches du `case 'delimiter'`. Une fonction locale `rebuildDelimiter(content)` éliminerait la répétition. Hors scope.

## Statut

- [x] Spec
- [x] Phase 1 — tests rouges (8)
- [x] Phase 2 — fix `stripBracketsInternal` (case 4 Poincaré + propagation parentType)
- [x] Phase 3 — vérification globale (14916 verts)
- [x] Phase 4 — review + commit
