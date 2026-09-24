# L'étape « on distribue » montre quatre termes séparés

**Branche** `feat/distribution-quatre-termes` · 2026-09-21

## La décision

L'étape s'appelle « On distribue chaque terme ». Elle doit en montrer quatre,
sans parenthèses. Décision de David, le 2026-09-21.

## Ce qu'elle montrait

La règle construisait une forme **groupée**, `(ac − ad) − (bc − bd)`, alors que
son propre docstring annonçait « the canonical four-term pre-collected
expansion ». Mathématiquement juste, mais l'élève y lisait une parenthèse au
moment précis où on lui demande de développer :

```
(2x−3)(x+4)   ->   2 x x + 2 x 4 - \left( 3 x + 3 4 \right)
```

Tant que le générateur LaTeX ne parenthésait pas une somme sous une
soustraction, la différence ne se voyait pas. C'est en réparant ce rendu
(PR #390) qu'elle est apparue — et le même rendu masquait au passage une erreur
de **signe** dans cette règle, corrigée dans la même PR.

## Ce qu'elle montre maintenant

```
(2x−3)(x+4)   ->   2 x x + 2 x 4 - 3 x - 3 4
(x−1)(x−5)    ->   x x - x 5 - 1 x + 1 5
(x+2)(x−3)    ->   x x - x 3 + 2 x - 2 3
```

## Comment

Le signe de chaque terme se lit directement, sans cas particulier : `ac` est
toujours positif, `ad` prend celui du binôme droit, `bc` celui du gauche, et
`bd` le produit des deux. Les quatre produits s'enchaînent alors à plat, associés
à gauche.

C'est cette lecture terme à terme qui rend la fonction sûre : l'ancienne
raisonnait par paires et inversait un signe dans deux des quatre combinaisons.

## Ce qui verrouille les signes

Les quatre cas **numériques** posés en PR #390, qui comparent la valeur de
l'entrée et de la sortie en quatre points. Ils ne dépendent d'aucun rendu, donc
changer la forme d'écriture ne peut pas les rendre verts par accident. Les
quatre attentes de chaîne, elles, décrivent la forme voulue.

## Vert

- `distribute-binomial-product.test.ts` : 19/19 (4 étaient rouges)
- mathAST : 325 fichiers, 14 722 tests
