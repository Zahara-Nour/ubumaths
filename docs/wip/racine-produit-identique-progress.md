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

**Le gain et le recul, mesurés.** Sur `(√b)^n ≡ b^{n/2}`, dix radicandes et n
de 2 à 5, soit quarante cas :

|           | `main` | branche   |
| --------- | ------ | --------- |
| réussites | 15/40  | **26/40** |

Quinze gains, tous à n = 2 et n = 3. Et **quatre reculs**, tous à n = 4 sur un
radicande composé (`xy`, `2x`, `x/2`, `x²`). J'avais d'abord écrit « aucun
recul » : c'était faux, et mon tableau par radicande masquait l'échange, un
succès perdu à n=4 étant compensé par deux gains à n=2 et n=3.

**Pourquoi ce recul.** Le produit plat est associé à gauche,
`((√b·√b)·√b)·√b`, et la règle exige que ses deux enfants soient des racines.
En rendant le radicande, qui n'en est plus une, elle casse la chaîne. Ce qui
reste bute alors sur une faiblesse **préexistante** : un facteur à base composée
et exposant 1 ne se remet pas à plat. Un élève écrit `√x·√x`, pas quatre racines
de `xy` à la suite ; le compromis est assumé et pinné par un test.

**Aucun déplacement d'affichage** sur 49 témoins, vérifié indépendamment par la
revue — racines, valeurs absolues, complexes, trigo, puissances fractionnaires,
racines n-ièmes. Réserve honnête : les unités n'ont pas pu être mesurées par ce
chemin d'entrée, ni par moi ni par la revue.

**Un faux positif introduit, puis corrigé.** La première version s'appliquait
aux racines n-ièmes : `parseLatex('\sqrt[3]{x}')` rend une fonction `sqrt` à un
seul argument, l'indice étant rangé dans `base`. `∛x·∛x ≡ x` passait de `false`
à `true`, alors que la valeur est `x^{2/3}` — campagne de 400 tirages, aucun
point du domaine commun ne la valide. La garde d'indice ferme le trou.

**Deux effets de cette garde, mesurés.** Elle supprime un faux positif de
`main` : `∛x·∛y ≡ √(xy)` y rendait `true`, ce qui est faux. Et elle introduit un
faux négatif : `∛x·∛y ≡ ∛(xy)`, vrai, n'est plus prouvé, la fusion ne sachant
pas transporter l'indice. Direction sûre.

**Gains collatéraux mesurés**, tous `false` sur `main` : le piège classique des
complexes (`√(−1)·√(−1)` vaut `−1` et non `1`), `√(1/x)·√(1/x) ≡ 1/x`,
`√(sin x)·√(sin x) ≡ sin x`, `√(−x)·√(−x) ≡ −x`.

**Sept tests actualisés, chacun avec sa raison.** Ils assertaient `√a·√a = |a|`,
et n'actaient aucune décision : les sept ont été posés par un seul commit,
`a38c17eea` du 2026-01-10, dont le message dit lui-même « √(x³) = x√x (not
|x|√x) **because √x already requires x ≥ 0** ». Il a donc adopté le raisonnement
de domaine pour l'extraction et ne l'a pas appliqué à la fusion. Avant lui, ces
mêmes tests asseraient `x`.

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
