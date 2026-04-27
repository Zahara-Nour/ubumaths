# Intersection droite-fonction (LF) et fonction-fonction (FF) — Progress

## Statut : COMPLET

## Fichiers modifies/crees

### Nouveaux

| Fichier                                                                   | Description                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------- |
| `src/lib/mathAST/analysis/roots.ts`                                       | Helper `findRoots()` — hybride symbolique+numerique |
| `src/lib/mathAST/analysis/__tests__/roots.test.ts`                        | 8 tests pour findRoots                              |
| `src/lib/geometry-core/geometry/__tests__/intersections-function.test.ts` | 11 tests pour intersectLF/intersectFF               |
| `src/lib/geometry-core/dsl/__tests__/intersection-lf-ff.test.ts`          | 11 tests DSL integration                            |

### Modifies

| Fichier                                                          | Changement                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/mathAST/analysis/index.ts`                              | Re-export findRoots/RootResult                                      |
| `src/lib/geometry-core/geometry/intersections.ts`                | +intersectLF(), +intersectFF()                                      |
| `src/lib/geometry-core/types/elements.ts`                        | +GeoIntersectionLF, +GeoIntersectionFF, type guards, unions         |
| `src/lib/geometry-core/types/schemas.ts`                         | +2 Zod schemas                                                      |
| `src/lib/geometry-core/graph/figure.ts`                          | +createIntersectionLF/FF factory methods                            |
| `src/lib/geometry-core/graph/compute-position.ts`                | +2 compute handlers                                                 |
| `src/lib/geometry-core/dsl/builtins.ts`                          | Dispatch intersection() etendu pour LF/FF + constantes centralisees |
| `src/lib/geometry-core/dsl/serializer.ts`                        | +2 cases serialization                                              |
| `src/lib/geometry-core/dsl/__tests__/intersection-lq-qq.test.ts` | Test mis a jour (plus d'erreur pour fonctions)                      |
| `src/routes/(public)/geometry-demo/+page.svelte`                 | +2 sections demo (LF, FF)                                           |

## Decisions techniques

1. **findRoots()** extrait de findCriticalZeros — meme logique hybride (solve + bisection + dedup)
2. **Index non borne** — contrairement a LC (0|1), LF/FF utilisent `number` car le nombre d'intersections est variable
3. **Fenetre [-10, 10]** — hardcodee, comme zeros(), avec constantes centralisees FUNCTION_SEARCH_XMIN/XMAX
4. **Vertical lines** — cas special dans intersectLF (evaluation directe f(k))
5. **Points non finis filtres** — si f(x0) n'est pas fini, le point est exclu (pas de fallback y=0)
6. **Auto-swap** — intersection(courbe_f, droite) fonctionne via swap automatique
7. **Erreurs explicites** — courbes implicites, combos fonction/cercle et fonction/conique non supportees

## Tests : 1676 passes (1668 geometry-core + 8 roots)

## Code review : Corrections appliquees

- Issue 1 : Imports deplaces en haut du fichier
- Issue 2 : Points non finis filtres au lieu de fallback y=0
- Issue 3 : Constantes centralisees pour la fenetre de recherche
- Issue 4 : Parametre inutilise \_fn2Compiled retire
- Issue 5 : Commentaires sur l'absence de max dans les schemas Zod
