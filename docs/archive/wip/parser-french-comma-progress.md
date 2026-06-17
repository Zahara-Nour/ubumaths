# Parser LaTeX — support de la virgule décimale française `{,}`

> **Objet** : faire que `1{,}5` se tokenise comme `NUMBER 1.5` dans le parser LaTeX. Aujourd'hui le format français produit par `toFrenchDecimal` (généré dans 4+ composants Svelte/utils du projet) n'est pas reconnu par le parser → round-trip cassé à 100 %.

**Démarrage** : 2026-05-02
**Branche** : `main`

## Bug

```
toFrenchDecimal('3.14')      = '3{,}14'        →  parse: ❌ UNEXPECTED_TOKEN
toFrenchDecimal('1.5')       = '1{,}5'         →  parse: ❌
toFrenchDecimal('1234.5678') = '1\,234{,}567\,8' → parse: ❌
```

Asymétrie : le projet **génère** ce format dans :

- `lib/utils/french-math.ts:99` (la source — `toFrenchDecimal`)
- `lib/slides/core/QuestionSlide.svelte:72` (prefilled blanks)
- `lib/components/question-inputs/FillBlanksInput.svelte:218`
- `lib/components/question-inputs/fill-blanks-utils.ts:114`
- `lib/components/markdown/nodes/ProbabilityTree.svelte:221`
- `lib/components/markdown/utils/math-utils.ts:53`
- `lib/data/math-dictionary-fr.ts` (5+ exemples avec `{,}`)

Mais aucun chemin du parser ne le reconnaît.

## Risque de régression : aucun

Les seuls autres usages possibles de `{,}` en LaTeX mathématique sont déjà rejetés par le parser actuel :

- `\frac{,}{2}` → ❌ déjà invalide
- `\binom{n}{,}` → ❌ déjà invalide
- `{a {,} b}` → ❌ déjà invalide

Donc le fix ne peut rien casser : il ne change que des cas qui sont déjà des erreurs de parse.

## Fix

Dans `src/lib/mathAST/parser/latex/tokenizer.ts`, étendre `scanNumber` :

```ts
} else if (
  char === '{' &&
  !hasDecimal &&
  value.length > 0 &&
  this.position + 2 < this.length &&
  this.input[this.position + 1] === ',' &&
  this.input[this.position + 2] === '}'
) {
  // French decimal comma {,} — treat as decimal separator.
  // Only triggered when we already have at least one digit (avoids
  // touching {,}-as-empty-argument cases like \frac{,}{2}).
  value += '.';
  hasDecimal = true;
  this.position += 3; // skip {,}
}
```

**Garde-fou** : `value.length > 0` (au moins un digit consommé) et `!hasDecimal` (pas déjà un `.`). Cela exclut tout déclenchement parasite.

## Plan

1. Tests rouges (~10 cas) dans `tokenizer.test.ts` et/ou `parser-pratt.test.ts`.
2. Patch `scanNumber` dans `tokenizer.ts`.
3. Vérification : tests rouges → verts ; suite globale `mathAST + intervals + geometry-core` à 14916+ verts.
4. Vérifier que les 4-6 cas non-décimaux qui échouent aujourd'hui continuent d'échouer (ou ne sont pas pire).
5. Review + commit.

## Fichiers modifiés

- `src/lib/mathAST/parser/latex/tokenizer.ts` :
  - `scanNumber` : nouvelle branche qui consomme `{,}` comme séparateur décimal sous trois gardes (au moins un digit déjà consommé, pas déjà de `.`, lookahead `{`,`,`,`}`).
  - `makeToken` : signature étendue avec un paramètre optionnel `sourceLength` (utile pour les tokens dont la valeur canonique diffère de la longueur source). Fallback inchangé pour tous les call sites existants.
  - L'appel `makeToken('NUMBER', ...)` passe maintenant `this.position - startPos` comme sourceLength, garantissant les positions correctes des tokens suivants pour les nombres avec `{,}`.
- `src/lib/mathAST/parser/latex/__tests__/tokenizer.test.ts` — 10 nouveaux tests dans `describe('Number tokenization > French decimal comma')` :
  - 5 cas positifs : `1{,}5`, `123{,}456`, `0{,}5`, `1{,}5 + 2{,}3`, scientific `1{,}5e2`.
  - 3 cas négatifs : ne consomme pas `{,}` au début, ne consomme pas `{,}` après un `.`, ne confond pas avec `{}`.
  - 2 cas pathologiques (suggérés par le code review) : `1{,}` en fin de buffer (produit `1.`), `1{,}{,}5` (un seul séparateur consommé).

## Tests

- 193/193 `tokenizer.test.ts` verts (+10 nouveaux).
- 1456/1456 tests `parser/` (parser-pratt, parser-rd, etc.) — aucune régression.
- 14924/14924 suite globale `mathAST + math/intervals + geometry-core` (gain de +8 ; 2 tests sont sur des helpers bas-niveau et n'ajoutent qu'à `tokenizer.test.ts`).
- `pnpm check:incremental` ✓.

## Validation empirique end-to-end

```
=== Round-trip toFrenchDecimal → parseLatex ===
"3.14" → "3{,}14" → number('3.14')   ✓
"1.5"  → "1{,}5"  → number('1.5')    ✓
"0.5"  → "0{,}5"  → number('0.5')    ✓

=== checkForm avec virgule française ===
"1{,}5"           vs "1.5"            →  correct
"3{,}14"          vs "3.14"           →  correct
"\frac{1{,}5}{2}" vs "\frac{1.5}{2}"  →  unoptimal_form
"1\,234{,}567\,8" vs "1234.5678"      →  correct  (via removeSpaces avant parse)
```

## Cas connu non-couvert

`parseLatexSafe('1\,234{,}567\,8')` direct (sans `removeSpaces`) échoue toujours car `\,` (espaces fins de groupement par milliers) n'est pas géré dans `scanNumber`. C'est un sujet séparé (espaces fins, scope français étendu). En pratique, les call sites utilisent `cosmetic-transforms` qui passe par `removeSpaces` avant le parse, donc le cas est couvert. Documenté comme follow-up éventuel.

## Code review (Opus)

Verdict : **prêt à commit**, aucun blocker. Les 3 modifications sont chirurgicales :

- Modif A (`scanNumber` branche `{,}`) : 3 gardes (digits préfixe, pas de `.` déjà, lookahead) — robustesse maximum.
- Modif B (`makeToken` sourceLength optionnel) : non-breaking — les 7 autres call sites existants utilisent le fallback `value.length` inchangé.
- Modif C (appel `makeToken('NUMBER', ...)` avec sourceLength) : seul site où la valeur canonique peut différer de la longueur source.

Cas pathologiques `1{,}` (fin de buffer) et `1{,}{,}5` (double virgule) couverts par tests dédiés. Aucun call site impacté hors `scanNumber`.

## Statut

- [x] Spec
- [x] Phase 1 — tests rouges (8 → 10 après suggestion review)
- [x] Phase 2 — fix `scanNumber` + makeToken sourceLength
- [x] Phase 3 — vérification globale (14924 verts)
- [x] Phase 4 — review + commit
