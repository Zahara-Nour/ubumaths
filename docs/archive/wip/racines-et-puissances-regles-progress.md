# Les règles de racines et de puissances

**Branche** `fix/racines-et-puissances-regles` · 2026-09-21

Quatre défauts, trouvés en répondant à la question « le mode `auto` donne-t-il
le même résultat que `simplify` ? ».

⚠️ **Sur les trois que j'avais annoncés, un n'était pas un bug.**
`sin²x + cos²x` rend bien `1`, à condition que les identités trigonométriques
soient activées — ce qui dépend du **niveau scolaire**. Ma mesure ne passait pas
de niveau, donc la trigo était coupée. C'est un garde-fou pédagogique délibéré.
En mesurant, j'en ai trouvé deux autres.

## Les quatre défauts

| entrée        | rendait      | attendu                              |
| ------------- | ------------ | ------------------------------------ |
| `√x · √x`     | `\|x\|`      | `x`                                  |
| `∛x · ∛x`     | `\|x\|`      | pas `\|x\|`, la valeur est `x^{2/3}` |
| `eˣ · e^{2x}` | `e^{x + 2x}` | `e^{3x}`                             |
| `(eˣ)³`       | `e^x^3`      | `e^{3x}`                             |

`∛x · ∛x ≡ |x|` est un **faux positif** : `|x|` n'est pas la valeur.

## Les racines : le quatrième module où l'indice est ignoré

`sqrt-product` fusionnait deux racines sans regarder leur **indice**.
`parseLatex('\sqrt[3]{x}')` rend une fonction nommée `sqrt` à un seul argument,
l'indice vivant dans `base` : un motif qui ne teste que le nom confond `∛x` et
`√x`. C'est le **quatrième module** où cet angle mort mord, après
`normal/rules/radicals.ts` et deux endroits de `normal/normalize.ts`.

Et comme dans `radicals.ts`, la fusion rend désormais le **radicande** quand les
deux radicandes sont identiques, au lieu d'un carré dont la provenance sera
oubliée par `√(a²) = |a|`.

Effet de bord mesuré : `∛x · ∛y` ne devient plus `√(xy)` — un faux positif de
plus, supprimé.

## Les puissances : un exposant construit, jamais réduit

`same-base-mul` et `pow-of-pow` assemblaient la somme ou le produit des
exposants et s'arrêtaient là. Personne ne les réduisait ensuite : l'exposant vit
à l'intérieur d'une base que la forme normale traite comme **opaque**, donc il
n'est jamais visité. `tidy` le met au propre sans rien développer.

⚠️ **`pow-of-pow` ne se déclenchait jamais sur l'écriture de l'élève.**
`parseLatex('(e^x)^3')` rend `pow(paren(pow(e, x)), 3)`, et le délimiteur
bloquait le motif. `(x²)³` passait quand même, mais par la forme normale, qui
sait réduire un exposant **rationnel** — pas un exposant symbolique. La règle
traverse désormais les délimiteurs.

Piège payé au passage : une seconde règle portant le même nom est **supprimée**
par `dedupeByName` dans `selectRulesForIntent`. Les deux variantes sont donc
fusionnées en une.

## Cinq tests actualisés, tous enregistrant la limitation

Deux tests d'intégration l'annonçaient dans leur titre : « simplifies (x^2)^3 to
**x^(2\*3)** ». Trois snapshots de démonstration montraient l'étape morte :

```
- x^2 · x^3 = x^{2 + 3}          (et la démonstration s'arrêtait là)
+ x^2 · x^3 = x^5

- 2^3 · 2^5 = 2^{3 + 5}
+ 2^3 · 2^5 = 2^8 = 256
```

## Vert

- `racines-et-puissances.test.ts` : 16/16 (11 étaient rouges)
- serveur **complet** : 966 fichiers, 34 482 tests
- client : 96 fichiers, 1 422 tests
- `lint:fast` propre · `check:incremental` 0 erreur sur 1615 fichiers
