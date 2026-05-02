# Phase A — Migration `,` → `;` dans les formatters d'intervalle

**Date** : 2026-05-02
**Statut** : ✅ Terminé
**Plan** : `docs/wip/geometry/piecewise-functions-plan.md`

---

## Objectif

Aligner mathAST sur la convention scolaire française stricte : séparateur d'intervalle = `;` (la virgule est réservée à la décimale). Étape préliminaire avant les phases B/C/D (piecewise functions).

## Décision tranchée

> Utiliser `;` partout en sortie. Accepter `,` ET `;` à l'entrée (rétrocompatibilité avec les habitudes des élèves) avec **stratégie « préférer `;` si présent »** pour gérer correctement les décimales françaises (`]0,5 ; 1,5[` doit être parsé comme intervalle ouvert de 0,5 à 1,5).

## Modifications

### Formatters (sortie)

| Fichier                                                        | Modification                                 |
| -------------------------------------------------------------- | -------------------------------------------- |
| `src/lib/math/intervals/format.ts:121`                         | `formatSingleInterval` — `, ` → `;`          |
| `src/lib/mathAST/variations/format.ts:308`                     | duplicate formatter — `, ` → `;`             |
| `src/lib/mathAST/variations/compute.ts:480`                    | duplicate formatter — `, ` → `;`             |
| `src/lib/mathAST/cli/commands/variations.command.ts:379`       | duplicate formatter — `, ` → `;`             |
| `src/lib/mathAST/domain/step-descriptions.ts:26,28`            | texte arc-sin/arc-cos `[-1, 1]` → `[-1 ; 1]` |
| `src/routes/(public)/geometry-demo/point-sur/+page.svelte:154` | titre user-facing `]-∞, +∞[` → `]-∞ ; +∞[`   |

### Parser élève (entrée — rétrocompat avec stratégie ambiguïté)

| Fichier                                                          | Modification                                                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/domain/validation/parse-student-domain.ts:313+` | `parseSingleInterval` — détection séparateur : `;` prioritaire si présent, fallback `,` ; bornes peuvent contenir des virgules quand `;` est utilisé (décimales FR) |
| `src/lib/mathAST/domain/validation/parse-student-domain.ts:235+` | `parseExcludedPoints` — même stratégie pour `{0,5 ; 1,5}`                                                                                                           |
| `src/lib/mathAST/domain/validation/parse-student-domain.ts:89`   | message d'erreur user-facing : exemple migré vers `;`                                                                                                               |

### JSDoc / commentaires (cohérence)

Migration appliquée via `perl -pi` avec restriction aux lignes de commentaire (`*` ou `// `) — pattern strict pour éviter de toucher aux destructurations TS comme `[name, entry]` ou `[...a, ...b]`.

Fichiers concernés (21) :

```
src/lib/math/intervals/{factory,index,types}.ts
src/lib/mathAST/{index}.ts
src/lib/mathAST/analysis/symmetry.ts
src/lib/mathAST/cli/commands/variations.command.ts
src/lib/mathAST/domain/{algebra,builtins,compute,factory,format,index,types}.ts
src/lib/mathAST/domain/validation/{compare-domains,mistake-types,types,parse-student-domain,validate-student-domain}.ts
src/lib/mathAST/variations/{boundary-limits,compute,extrema,format,monotonicity,types}.ts
```

### Tests migrés (assertions de sortie)

| Fichier                                               | Tests migrés                                       |
| ----------------------------------------------------- | -------------------------------------------------- |
| `src/lib/math/intervals/__tests__/format.test.ts`     | ~25 assertions + 7 nouveaux tests « ;-convention » |
| `src/lib/mathAST/domain/__tests__/format.test.ts`     | ~15 assertions                                     |
| `src/lib/mathAST/domain/__tests__/edge-cases.test.ts` | ~10 assertions                                     |

### Tests ajoutés (nouveaux comportements)

`src/lib/mathAST/domain/__tests__/validation.student.test.ts` :

- 9 tests sur la nouvelle notation `;` (ouvert/fermé/mixte/infini, sans espaces, union, points exclus)
- 4 tests sur l'ambiguïté **décimale française** : `]0,5 ; 1,5[`, `]0,5;1,5[`, `[-1,5 ; 2,5]`, `]0 ; +∞[ \ {0,5 ; 1,5}`
- 1 test d'équivalence des deux séparateurs

## Erreur rencontrée et corrigée

**Premier passage perl trop large** : le pattern initial `([\[\]])([^,;\[\]\n]+), ([^,;\[\]\n]+)([\[\]])` avait matché `closedInterval(number(0), number(1))` dans les tests (la virgule y est un séparateur d'arguments). Corrigé en ajoutant `()`, `'`, `"` à la liste d'exclusion. **Deuxième problème** identifié par le code-reviewer : le pattern restait trop large pour les destructurations `[name, entry]` et `[...a, ...b]` dans le code source. Solution : restreindre le perl aux lignes de commentaire uniquement (`*` / `// `).

## Bug critique trouvé par le code-reviewer

**Ambiguïté décimale française** : la première version de la regex parser élève `[^,;]+\s*[,;]\s*[^[\]]+` aurait mal parsé `]0,5 ; 1,5[` (élève français qui écrit décimale + séparateur). **Fix** : détection préalable `inner.includes(';')` pour adapter la regex dynamiquement (séparateur exclusif `;` si présent, autorisant les `,` dans les bornes).

## Tests verts

| Suite                          | Tests |
| ------------------------------ | ----- |
| `intervals/__tests__`          | 161   |
| `mathAST/domain/__tests__`     | 850   |
| `mathAST/variations/__tests__` | 80    |
| `mathAST/solve/__tests__`      | ~280  |
| `mathAST/numtype/__tests__`    | ~430  |
| `mathAST/limits/__tests__`     | ~220  |
| `mathAST/analysis/__tests__`   | ~770  |

**Total** : ≥ 2700 tests verts. 0 régression.

## Limitations non couvertes (à valider)

1. Tests `pnpm test:client` non lancés (UI snapshots) — peu probable d'être impacté car `formatInterval` n'est pas utilisé dans `src/lib/components` ni dans les pages publiques (sauf `point-sur/+page.svelte` corrigé).
2. Page admin debug `latex-transpiler/+page.svelte:55` utilise `]-\\infty; 2]` et `[2; +\\infty[` (LaTeX, sans espaces) — laissé tel quel car c'est du LaTeX brut, format toléré.
3. Description tests `it()` dans `solve/__tests__/domain-filtering.test.ts` mentionnent `]a, b[` — purement cosmétique, non bloquant.

## Briques posées pour Phase B/C/D

- Convention `;` désormais utilisée uniformément en sortie → `serialize` côté geometry-core peut directement adopter le format mathAST.
- Parser élève accepte les deux séparateurs → robuste face aux saisies hétérogènes.
- Tests d'ambiguïté décimale française en place → garantie de non-régression quand on étendra le parser DSL pour `courbe(... sur ]a;b[)`.

## Prochaine phase

**Phase B** : Restriction de domaine sur `GeoFunction` (ajout du champ `domain?` + parsing DSL `... sur ]a;b]` / `... avec a<x<=b`).
