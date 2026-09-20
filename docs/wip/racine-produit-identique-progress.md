# `√a · √a` vaut `a`, et ce que `≡` veut dire

**Branche** `fix/racine-produit-identique` · 2026-09-20

Deux livrables : un correctif, et la convention écrite une bonne fois.

## Le correctif

`simplify(√x·√x)` rendait `x` et `areEquivalent` déclarait l'entrée **non
équivalente** à cette sortie. Le moteur refusait sa propre sortie, pour la
troisième fois de la journée.

**La chaîne, et l'étape qui perd l'information.** `rules/radicals.ts` fusionne
`√a · √b` en `√(a·b)`, ce qui n'est licite **que parce que** les deux radicaux
sont écrits, donc `a ≥ 0`. `normalize` applique ensuite `√(a²) = |a|`, correcte
en soi. La perte est entre les deux : l'étape 2 reçoit `√(a²)`, défini sur tout
ℝ, et ne sait plus d'où il vient.

**Le correctif** tient en une condition : quand les deux radicandes sont
identiques, la fusion rend le radicande, pas un carré dont la provenance sera
oubliée. La règle `√(a²) = |a|` n'est pas touchée, et reste juste pour un carré
que l'élève a écrit.

**Le gain, mesuré.** Sur `(√b)^n ≡ b^{n/2}` pour quatre radicandes et n de 2 à 5,
soit seize cas : `main` en réussit 6, la branche 11. Aucun recul.

| radicande | `main` | branche |
| --------- | ------ | ------- |
| `x`       | 3/4    | **4/4** |
| `x+1`     | 0/4    | **2/4** |
| `xy`      | 1/4    | **2/4** |
| `2x`      | 1/4    | **2/4** |

**Aucun déplacement d'affichage** sur 39 témoins, dont quatorze produits de
racines — la classe visée est bien dans le corpus, cette fois. `simplify`
rendait déjà la bonne valeur ; seul le décideur se trompait.

**Sept tests actualisés, chacun avec sa raison.** Ils assertaient `√a·√a = |a|`.
Le même fichier assertait déjà `(√x)² = x` quelques lignes plus bas, pour la
même expression : les deux étaient contradictoires.

**Une faiblesse préexistante rencontrée en chemin, non traitée.** Un facteur
dont la base est un polynôme et l'exposant 1 ne se remet pas à plat :
`(x+1)·√(x+1)·√(x+1) ≢ (x+1)²`, avec le même hachage faux sur `main` et sur la
branche. Elle ne vient pas d'ici et n'est pas aggravée.

## La convention

`docs/ref/convention-equivalence.md`, référencée depuis `CLAUDE.md`.

La même question s'est reposée quatre fois aujourd'hui sous quatre déguisements
— quotients multivariés, division exacte, pgcd, racines — et a été retranchée à
chaque fois. Elle est maintenant écrite :

> Deux expressions sont équivalentes quand elles prennent la même valeur en tout
> point où elles sont **toutes deux** définies.

Le document en tire les six cas types, dit pourquoi cette convention plutôt que
l'autre, et donne les trois questions à se poser avant d'ajouter une règle. Il
dit aussi pourquoi brancher les contraintes de domaine sur le décideur tirerait
en sens **inverse** de cette convention, et ne devrait pas s'ouvrir sans besoin
pédagogique concret.

## Vert

- `racine-produit-identique.test.ts` : 17/17 (7 étaient rouges)
- mathAST : 323 fichiers, 14 620 tests
- questions, utils, grapheur, transpilers, exercices : 89 fichiers, 4 185 tests
- `lint:fast` propre · `check:incremental` 0 erreur sur 1615 fichiers
