# Audit & fix : `toCustom` — multiplication implicite mal sérialisée

## Contexte

`toCustom(node)` (`src/lib/mathAST/custom-generator.ts`, 1299 lignes) sérialise
un `MathNode` en chaîne DSL custom. Cette chaîne doit être round-trippable :
`parseCustom(toCustom(node))` doit produire un AST sémantiquement équivalent à
`node`.

**Bug observé** : sur certaines multiplications marquées `displayStyle:
'implicit'`, `toCustom` n'émet pas de séparateur entre opérandes adjacents,
produisant une chaîne ambiguë que `parseCustom` ne peut pas relire.

## Cas test minimal (reproductible)

```ts
import { parseCustom, toCustom } from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';

const f = parseCustom('x^x');
const fPrime = differentiate(f, { variable: 'x', simplify: true });
const out = toCustom(fPrime);
// out === "x^x(ln(x)+x1/x)"
//                       ^^ "x" et "1" collés sans operateur

parseCustom(out);
// → throws: "courbe(): erreur de syntaxe dans..."
```

L'AST produit par `differentiate(x^x)` contient une multiplication implicite
entre `x` (variable) et `1/x` (division). `toCustom` les juxtapose sans
opérateur, ce qui en DSL donne `x1/x` — interprété comme variable `x1`
divisée par `x`, ou erreur de tokenisation.

## Cas qui fonctionnent (référence)

Tous les cas standard round-trippent correctement :

```ts
toCustom(differentiate(parseCustom('sin(x) * cos(x)'))); // OK reparse
toCustom(differentiate(parseCustom('tan(x)'))); // "1/{cos(x)^2}" OK
toCustom(differentiate(parseCustom('1/x'))); // OK reparse
toCustom(differentiate(parseCustom('ln(x^2+1)'))); // OK reparse
```

Le bug est **isolé aux multiplications implicites entre opérandes dont les
caractères de bord forment un identifiant ambigu** : variable suivie d'un
nombre/variable, ou nombre suivi de variable, etc.

## Périmètre

### Fichiers à examiner

- `src/lib/mathAST/custom-generator.ts` :
  - Ligne 305-319 : commentaires sur `shouldWrapForImplicitMul`
  - Ligne 423-424 : logique de wrapping pour multiplication implicite
  - Ligne 591-607 : fonction `emitMultiplicationOperator`
  - Ligne 1062-1075 : autre branche multiplication implicite
- `src/lib/mathAST/__tests__/custom-generator.test.ts` : tests existants à
  conserver et compléter

### Hors périmètre

- Ne pas toucher au parser (`src/lib/mathAST/parser/custom/`).
- Ne pas changer `displayStyle` dans les producteurs d'AST (différentiation,
  simplification) — la sortie textuelle est responsable de désambiguïser.

## Spec proposée (à valider AVANT implémentation)

**Règle générale** : une multiplication `'implicit'` doit émettre `*` (ou un
espace équivalent) **lorsque l'absence de séparateur produirait une chaîne
ambiguë au reparse**.

**Cas concrets à clarifier avec l'utilisateur** :

1. Variable × variable : `x*y` → `xy` reste OK (`xy` lu comme produit en DSL ?
   ou comme variable `xy` ?). **Vérifier le tokenizer**.
2. Variable × fraction `1/x` : `x*(1/x)` doit-il devenir `x(1/x)`, `x*1/x`, ou
   reste implicite avec parenthèses ?
3. Nombre × variable : `2*x` → `2x` (cas le plus courant, doit rester OK).
4. Variable × nombre : `x*2` — anormal mais possible. Que produire ?
5. Fonction × fonction : `sin(x)*cos(x)` → vérifier que le cas marche déjà.

**Stratégie suggérée** : implémenter une vérification au moment de l'émission
qui inspecte le **dernier caractère du fragment gauche** et le **premier
caractère du fragment droit**. Si la concaténation crée un identifiant valide
(lettre+lettre, lettre+chiffre, chiffre+lettre, chiffre+chiffre), insérer `*`
explicite, sinon laisser implicite.

Cette stratégie est plus robuste que de raisonner sur la structure de l'AST
(qui peut imbriquer arbitrairement).

## Plan TDD

### Phase 0 — Spécification (BLOQUANT, attendre l'utilisateur)

Présenter les 5 cas concrets ci-dessus + le cas du bug, demander la sortie
souhaitée pour chacun. Chercher les conventions DSL existantes ailleurs dans
le code (chercher `displayStyle: 'implicit'` dans le codebase pour voir ce
que produit le parser quand il accepte `2x` ou `xy` en entrée).

### Phase 1 — Tests (rouges)

Créer `src/lib/mathAST/__tests__/custom-generator-implicit-mul.test.ts` avec :

- **Round-trip property test** : pour un panel de ~15 entrées (les exemples
  ci-dessus + cas de différentiation typiques), vérifier
  `parseCustom(toCustom(node))` ne throw pas et évalue identiquement.
- **Cas explicite du bug** : `differentiate(parseCustom('x^x'))` round-trip.
- Cas `x*x*x`, `2*x*y`, `x^2*y^3`, `a*b*c` (multi-opérandes implicites).

### Phase 2 — Implémentation

Approche minimale recommandée : ajouter dans `emitMultiplicationOperator` un
check sur les caractères de bord. Si ambiguïté, fallback `*`. Sinon, comporte-
ment actuel inchangé.

Garder le code en moins de ~30 lignes ajoutées si possible. Si la solution
demande de restructurer le générateur, **stopper et consulter l'utilisateur**.

### Phase 3 — Code review

Agent `code-reviewer`. Points d'attention :

- Pas de régression sur les cas qui marchent déjà (`2x`, `sin(x)cos(x)`, etc.)
- Le test `eval/__tests__/compare-numeric-custom.test.ts` (qui compare
  l'évaluation numérique avant/après round-trip) doit toujours passer.

### Phase 4 — Quality checks

- `pnpm test:server src/lib/mathAST/__tests__/`
- `pnpm test:server src/lib/geometry-core/dsl/__tests__/` (vérifier que le
  test `derivee — round-trip serialization > round-trip preserves
trigonometric derivative` passe toujours, et idéalement ajouter un test
  pour `derivee` sur `x^x` qui round-trippe maintenant)
- `pnpm check:incremental`
- `npx eslint <fichiers modifiés>`

### Phase 5 — Documentation et commit

- `docs/wip/mathAST/tocustom-implicit-mul-progress.md` : décisions, cas testés,
  limitations résiduelles.
- Commit direct (1-2 fichiers) : `fix(mathAST): toCustom emits * when implicit
mul would create ambiguous token`

## Risques connus

- **Performance** : un check de caractères de bord à chaque émission de mul
  implicite ajoute ~O(1) par nœud. Pas de risque.
- **Sortie LaTeX** : `toLatex` est un module séparé, ne pas le toucher.
- **Acceptabilité visuelle** : passer de `2xy` à `2*x*y` dans certains cas
  rendrait la sortie moins compacte. À balancer avec la robustesse.
  **Question pour l'utilisateur en Phase 0** : préférence
  lisibilité-compacité vs robustesse round-trip ?

## Cas test à valider après fix

```ts
// Doit round-tripper sans throw
const exprs = ['x^x', 'x^x * (ln(x) + x * 1/x)', 'sin(x)^2 * cos(x)^3', 'exp(x) * x', 'ln(x) / x'];
for (const src of exprs) {
	const ast = parseCustom(src);
	const d = differentiate(ast, { variable: 'x', simplify: true });
	const out = toCustom(d);
	parseCustom(out); // must not throw
}
```

## Pourquoi c'est important

Le DSL geometry-core sérialise et désérialise les figures pour persistance.
Tout cas où `serializeDsl(figure)` produit une chaîne non-reparseable est une
perte de données silencieuse. Le bug actuel touche `derivee()` mais
existerait pour tout consommateur futur de `differentiate()` qui sérialiserait
le résultat.

## Origine du diagnostic

- Code review de la feature `derivee(f)` (commit `8ef0b4e4`)
- Analyse approfondie session 2026-05-01 : seul vrai bug parmi 5 risques
  potentiels relevés. Confirmé empiriquement par sondes de round-trip.
- Voir `docs/wip/geometry/derivee-progress.md` pour le contexte derivee.
