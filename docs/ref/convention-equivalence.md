# Ce que `areEquivalent` veut dire

> Écrit le 2026-09-20, après une journée où la même question s'est reposée
> quatre fois de suite sous quatre déguisements différents.

## La règle, en une phrase

**Deux expressions sont équivalentes quand elles prennent la même valeur en
tout point où elles sont TOUTES DEUX définies.**

Le domaine n'entre pas dans la comparaison. Ce qui se passe là où l'une des deux
n'existe pas ne compte pas.

## Ce que ça tranche, sans avoir à en rediscuter

| paire                 | verdict  | pourquoi                                                  |
| --------------------- | -------- | --------------------------------------------------------- |
| `(x²−y²)/(x−y) ≡ x+y` | **vrai** | égales partout sauf en `x = y`, où la gauche n'existe pas |
| `(x+y)²/(x+y) ≡ x+y`  | **vrai** | idem en `x = −y`                                          |
| `√x·√x ≡ x`           | **vrai** | écrire `√x` impose `x ≥ 0` ; égales sur ce domaine        |
| `√(x²) ≡ x`           | **faux** | `√(x²)` existe pour `x < 0` et y vaut `−x`                |
| `√(x²) ≡ \|x\|`       | **vrai** | mêmes valeurs partout                                     |
| `x/x ≡ 1`             | **vrai** | égales sauf en 0, où la gauche n'existe pas               |

La ligne 4 est la seule qui rende `faux`, et c'est la seule où les deux membres
**existent** au même endroit en y prenant des valeurs différentes.

## Pourquoi cette convention et pas l'autre

C'est celle de l'algèbre des fractions rationnelles, et c'est celle qu'attend un
élève de lycée. Quand on lui demande de simplifier `(x²−y²)/(x−y)` et qu'il
écrit `x+y`, il a fait ce qu'on lui a enseigné. Le compter faux au motif que les
domaines diffèrent serait défendable mathématiquement et absurde
pédagogiquement.

Décision de David, prise le 2026-09-20 sur les quotients multivariés, et
étendue aux racines le même jour.

## Ce que la convention NE dit pas

Elle ne dit pas que le moteur sait toujours conclure. Il a des **faux
négatifs** : des égalités vraies qu'il ne prouve pas, faute d'une règle ou d'un
budget. Un faux négatif est un refus, jamais une erreur de correction dans le
sens dangereux.

Elle ne dit pas non plus que le moteur peut se permettre un **faux positif**.
Déclarer équivalentes deux expressions qui ne le sont pas compte JUSTE une
réponse FAUSSE d'élève. C'est la seule faute qui ne se rattrape pas.

⚠️ **Toutes les réductions du moteur ne vérifient PAS leur résultat.** Celles qui
calculent un facteur, comme la division exacte et le pgcd multivarié, le font :
elles recalculent le produit avant d'accepter. Celles qui appliquent une
identité, comme `√a·√a → a`, reposent sur la justesse de leur condition — et
cette condition-là a déjà été trop large une fois, en s'appliquant aux racines
n-ièmes. **Ne pas lire cette section comme une garantie.**

## Conséquence pratique quand on ajoute une règle

Avant d'écrire une réduction, se poser la question dans cet ordre :

1. **La règle peut-elle produire un faux positif ?** Si elle calcule un facteur,
   elle doit vérifier son résultat en recalculant le produit. Si elle applique
   une identité, il faut prouver que sa condition d'application est exactement
   celle de l'identité — pas « à peu près ». `√a·√a → a` a été livrée avec une
   condition qui attrapait aussi `∛a·∛a`, où l'identité est fausse.
2. **Élargit-elle le domaine ?** Si oui, c'est permis par la convention, et ça
   n'a pas à être rediscuté.
3. **Le restreint-elle ?** Alors la règle est probablement fausse : la
   convention compare sur l'intersection, pas sur le plus petit domaine.

## Ce que le moteur ne sait pas faire, et qui n'est pas un bug

Le décideur ne porte **aucune information de domaine**. Il ne sait pas que
`x ≥ 0` dans `√x·√x`, il le sait seulement parce que la règle qui fusionne les
radicaux en tient compte au moment où elle s'applique. Un mécanisme général de
contraintes sur les variables existe (`numtype/VariableAssumption`,
`domain/computeDomain`), mais il n'est branché ni sur `normalize` ni sur
`areEquivalent`.

Le brancher rendrait le décideur **plus strict**, alors que cette convention le
veut **large**. Les deux tirent en sens inverse. Ce n'est pas un chantier à
ouvrir sans avoir d'abord un besoin pédagogique concret, par exemple un exercice
qui porte explicitement sur les domaines — auquel cas le bon outil serait une
option par question, pas un changement du décideur.

## Conséquence connue et assumée

`√x·√x ≡ |x|` rend **faux**, alors que les deux sont égaux sur `[0, +∞)`, le
seul domaine où le membre de gauche existe. Le décideur compare `x` à `|x|` et
les sépare, faute de porter le domaine. Faux négatif, assumé : `√x·√x ≡ x` est
ce qu'un élève écrit, `√x·√x ≡ |x|` est exotique.
