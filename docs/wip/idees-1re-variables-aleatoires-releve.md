# Relevé « variables aléatoires réelles » de Première spécialité (2026-11-26)

Chantier [`idees-1re-variables-aleatoires`](idees-1re-variables-aleatoires-progress.md). La rubrique
1P2 de l'autre plateforme n'a qu'un exercice, 1P20-1 (« déterminer la loi de probabilité d'une variable
aléatoire discrète », aussi rangé en 1re techno). Il a été lu dans son code source (copie locale), puis
comparé à nos modèles en prod (MCP en lecture seule : énoncés et cases des variations, points, tous
niveaux).

**Leur forme** : un tableau de la loi dont la ligne des valeurs $x_i$ est **donnée** ; l'élève tape les
probabilités dans la ligne du dessous (3 ou 4 cases, fractions). Trois situations :

1. **Pari aux cartes** : jeu de 32 cartes, mise $a$ ; un as rapporte $b$, une figure rapporte $c$, le
   reste rien. $X$ = gain net. Les probabilités sont **toujours les mêmes** (4/32, 12/32, 16/32) : seuls
   les montants changent.
2. **Loterie** : $N$ tickets, 1 gros lot, $n_2$ lots moyens, $n_3$ petits lots ; $X$ = valeur du ticket
   (le prix du ticket n'est pas déduit).
3. **Deux tirs au but** : $X$ = nombre de buts en deux tirs indépendants, probabilité $a/b$ de marquer ;
   pas d'arbre dans l'énoncé (il est dans le corrigé).

**Bornes** ([1re spé](../systeme/programmes/bornes/lycee/1spe.md)) : univers finis, variables
aléatoires réelles ; deux épreuves indépendantes, sur un arbre ; ni loi binomiale ni coefficient
binomial. [1re techno](../systeme/programmes/bornes/lycee/1techno.md) 1TECHNO-095 : loi d'une
variable aléatoire « sans formalisme : issues numériques, en contexte ».

## Nos modèles (prod, tous publiés)

| Id court | Titre                                                   | Var. | Point(s)                      |
| -------- | ------------------------------------------------------- | ---- | ----------------------------- |
| 477016d2 | Image d'une issue par une variable aléatoire            | 4    | 1SPE-347                      |
| b83f1392 | Compléter une loi : une probabilité manquante           | 3    | 1SPE-348                      |
| f3addbe3 | Compléter une loi : deux probabilités manquantes liées  | 3    | 1SPE-348                      |
| 7e9b9b32 | Compléter une loi : trouver le paramètre p              | 3    | 1SPE-348                      |
| 448894f3 | Lire une probabilité dans le tableau de la loi          | 3    | 1SPE-353                      |
| 570f91d5 | Probabilité d'un événement du type X ≥ a, X < a…        | 4    | 1SPE-353                      |
| 97b3a376 | Probabilité d'une valeur de X à partir d'un énoncé      | 4    | 1SPE-353                      |
| 97a4df30 | Valeurs possibles d'une variable aléatoire              | 3    | 1SPE-354                      |
| d683e906 | Probabilités de la loi de X à partir d'un arbre pondéré | 4    | 1SPE-355 (+ 1TECHNO-095)      |
| a3f92832 | Interpréter une espérance                               | 3    | 1SPE-349 (+ 1TECHNO)          |
| 8354a0e7 | Espérance à partir de la loi                            | 3    | 1SPE-356 (+ 1TECHNO, TTECHNO) |
| eafd17a1 | Gain algébrique moyen                                   | 3    | 1SPE-356 (+ 1TECHNO, TTECHNO) |
| 6fbc355c | Espérance à partir d'un énoncé                          | 3    | 1SPE-356 (+ 1TECHNO, TTECHNO) |
| fba01378 | Variance et écart type                                  | 2    | 1SPE-350                      |
| 2af6296f | Variance à partir de la loi                             | 3    | 1SPE-357                      |
| bad86bec | Écart-type : valeur exacte                              | 3    | 1SPE-357                      |
| 35ad8891 | Écart-type : valeur arrondie                            | 3    | 1SPE-357                      |
| 58c55bba | Variance par la formule de König-Huygens                | 2    | 1SPE-352                      |
| 0417223e | Linéarité de l'espérance                                | 3    | 1SPE-351                      |
| ad555cb1 | Mise rendant un jeu équitable                           | 3    | 1SPE-358 (+ 1TECHNO, TTECHNO) |
| 0718f490 | Jeu favorable, équitable ou défavorable                 | 3    | 1SPE-358 (+ 1TECHNO, TTECHNO) |

Aucun brouillon sur ces points. Sous-notion de 1SPE-355 : « loi d'une variable aléatoire » (nœud
`4e871e12`, notion « Variables aléatoires »). **Aucun modèle, à aucun niveau, ne fait remplir la loi
entière** dans un tableau (recherche des énoncés à tableau `P(X=x…)` et cases `$?$`, 2026-11-26) :
nos modèles demandent les valeurs seules (97a4df30), une ou deux probabilités (97b3a376, d683e906), ou
une probabilité manquante dans une loi donnée (b83f1392).

## Relevé

| Id     | Ce qu'on demande                                                | Forme chez eux                    | Nos modèles                                     | Verdict                                                                                    |
| ------ | --------------------------------------------------------------- | --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1P20-1 | Pari aux cartes (mise déduite) : la loi du gain net, en tableau | tableau, valeurs données, 3 cases | 97a4df30 (valeurs), 97b3a376 (une probabilité)  | ❌ la loi **entière**, valeurs et probabilités, manque : modèle neuf (F1, v1)              |
| 1P20-1 | Loterie à tickets : la loi de la valeur du ticket, en tableau   | tableau, valeurs données, 4 cases | b83f1392 v3 (une probabilité effacée), 97b3a376 | ❌ idem (F1, v2) ; chez nous le prix du ticket est déduit, comme dans 97a4df30 et b83f1392 |
| 1P20-1 | Deux tirs indépendants : la loi du nombre de buts, en tableau   | tableau, valeurs données, 3 cases | d683e906 v1 (arbre donné, deux probabilités)    | 🟡 les trois probabilités **sans arbre donné** manquent (F1, v3)                           |

## Ce que leur format fait et pas le nôtre

Rien : un tableau markdown à cases `$?$` fait le même travail (déjà utilisé dans des modèles de 3e et
de 6e), et notre forme fait mieux en faisant aussi remplir la ligne des valeurs (v1, v2). Aucun outil
ne manque.
