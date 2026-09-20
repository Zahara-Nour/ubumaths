# `timeoutMs` atteint enfin l'arithmétique polynomiale

**Branche** `fix/abort-arithmetique-polynomiale` · ouvert le 2026-09-20

## Le problème, mesuré

`makeAbortChecker` existe depuis longtemps, `simplify` l'installe via
`rewriting-engine`, et `pattern/match.ts` le consulte. Mais **`polynomial.ts`
ne le lisait nulle part, et `areEquivalent` ne l'installait pas**. Un
`timeoutMs` ne bornait donc rien sur le chemin le plus coûteux : le
développement d'une puissance de somme large.

Mesuré, tas plafonné à 700 Mo, `timeoutMs: 500` — avant correctif les trois
tuent le processus, exactement comme sans budget :

| expression                                  | avant | après  |
| ------------------------------------------- | ----- | ------ |
| `(x+y+z+w+a+b+c+d)^8`                       | tué   | 417 ms |
| `(sin x + cos y + sin z + cos w + x+y+z)^8` | tué   | 503 ms |
| `(x+y+z+w+a+b+c+d+e+f+g)^9`                 | tué   | 527 ms |

Le troisième ne contient aucune trigonométrie : le mur est dans l'arithmétique
elle-même, pas dans une règle.

## Pourquoi ça comptait pour les élèves

`validateAlgebraic` borne à 500 ms depuis toujours, en écrivant en commentaire
que c'est « so a pathological learner input cannot freeze the UI ». Cette
promesse **n'était pas tenue** : le signal n'atteignait pas les boucles qui
consomment le tas. Et les deux appels de `validation-rule-evaluator.ts` ne
bornaient rien du tout.

La correction tourne **dans le navigateur de l'élève**. Mesuré : une réponse
`(x+y+z+w+a+b+c+d+e+f+g)^11` comparée à `(x+y+z+w+a+b+c+d+e+f)^10` tuait le
processus. En navigateur, c'est l'onglet qui meurt.

## Ce qui a été fait

1. **`normalize` installe le signal ambiant** (`withActiveAbortChecker`) quand
   son contexte en porte un. Le canal existait déjà dans `common/abort.ts`,
   documenté pour exactement ce cas : `mulPolynomials` et ses voisins sont
   appelés depuis une centaine d'endroits qui n'ont pas de contexte, et leur
   passer un paramètre supplémentaire n'était pas praticable.
2. **`mulPolynomials` consulte le signal** à chaque tour de boucle externe, et
   **`powPolynomial`** à chaque étape d'exponentiation rapide.
3. **`validation-rule-evaluator.ts`** borne ses deux appels à 500 ms, la même
   valeur que `validateAlgebraic` — c'est le même geste.

**Au passage** : `powPolynomial` élevait le polynôme au carré une fois de trop.
Au dernier tour, `exp` vaut 1, la boucle s'arrête juste après, et ce carré
final — le plus gros de tout le calcul — n'était jamais lu.

## Preuves rouges

Les deux fichiers de test tuent le runner sans le correctif :

- `mathAST/normal/__tests__/abort-arithmetique-polynomiale.test.ts` (9 cas)
- `questions/__tests__/validation-rule-evaluator.test.ts`, cas ajouté — rouge
  prouvé en neutralisant le budget depuis une copie, puis restauré depuis
  cette copie.

## Vert

317 fichiers / 14 446 tests mathAST, 89 fichiers / 4 185 tests
questions-utils-grapheur-transpilers-exercices, `lint:fast` propre,
`check:incremental` 0 erreur sur 1615 fichiers.

## Trouvé en chemin, NON traité ici

**Le décideur est faux sur les quotients à plusieurs variables.** Mesuré sur
`main` :

| paire                    | verdict     |
| ------------------------ | ----------- |
| `(x+1)²/(x+1) ≡ x+1`     | `true`      |
| `(x²−1)/(x+1) ≡ x−1`     | `true`      |
| `(x+1)(x+2)/(x+1) ≡ x+2` | `true`      |
| `(x+y)²/(x+y) ≡ x+y`     | **`false`** |
| `(x²−y²)/(x−y) ≡ x+y`    | **`false`** |

La réduction d'un quotient par un facteur commun **polynomial** ne marche qu'à
**une seule variable** — `univariate-gcd.ts` porte son nom. C'est un bug de
correction des copies de la même famille que le §6.1 du relevé `simplify` :
un élève qui simplifie `(x²−y²)/(x−y)` en `x+y`, ce qu'on lui enseigne, est
compté faux. À traiter à part, et à mesurer sur les appelants avant de toucher
à `normalize`.
