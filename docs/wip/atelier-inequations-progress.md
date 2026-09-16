# Progression — les inéquations dans l'atelier

Branche `feat/atelier-inequations`. Suite de
[`atelier-resolution-etapes-phase0.md`](atelier-resolution-etapes-phase0.md),
dont le §5 laissait les inéquations hors périmètre.

## Le trou comblé était TOTAL

Mesuré avant le lot : une inéquation ne rendait pas une erreur, pas un message —
**une ligne entièrement vide.**

```
.résoudre 2x+1<7     ->  (rien)
.résoudre x^2-4>=0   ->  (rien)
```

Le moteur n'a rien pour les inéquations. Les étapes ne remplacent donc rien ici :
elles sont la seule chose que l'élève reçoit. D'où le changement dans
`calcul.ts` — on ne conditionne plus la production des étapes au succès du
moteur.

## Ce qui marche maintenant

| entrée          | réponse affichée                                         |
| --------------- | -------------------------------------------------------- |
| `2x+1<7`        | `x < 3`                                                  |
| `-2x>=6`        | `x ⩽ -3`, avec « changement de sens car -2 est négatif » |
| `x^2-4>=0`      | `S = ]-∞ ; -2] ∪ [2 ; +∞[`                               |
| `x^2-3x+2>0`    | `S = ]-∞ ; 1[ ∪ ]2 ; +∞[`                                |
| `x^2+1<0`       | `S = ∅`                                                  |
| `(x-1)/(x+2)>0` | `S = ]-∞ ; -2[ ∪ ]1 ; +∞[`                               |

## Deux découvertes qui ont façonné le lot

### 1. La réponse ne se lit pas au même endroit selon le cas

Une inéquation **du premier degré ne conclut pas** : sa dernière étape est la
division, dont le rendu est un `\begin{aligned}` de deux lignes. L'afficher
comme « la réponse » mettrait un bloc de calcul là où l'élève attend `x < 3`.

La réponse se lit donc :

- sur le **rendu** quand la dernière étape est une conclusion (équations,
  inéquations du second degré et rationnelles) ;
- sur l'**arbre `after`** sinon, qui porte la forme résolue.

D'où `solveSteps` qui rend désormais `{ steps, answer }` plutôt que les seules
étapes : les deux sont produits ensemble, une `answer` calculée ailleurs
pourrait décrire autre chose que ce que les étapes démontrent.

### 2. Le tableau de signes ne s'affiche NULLE PART dans l'application

Les renderers le composent en `\begin{array}{|c|ccc|}` avec des `\hline`.
**MathLive ne connaît pas cet environnement** — mesuré, il rend une boîte
d'erreur — et aucun composant du dépôt ne sait l'afficher autrement
(`grep "begin{array}"` hors `mathAST/` : zéro).

⚠️ **Le défaut dépasse l'atelier** : `correction-generator.ts` emploie les mêmes
étapes pour les corrections de questions, en production. Le tableau de signes
d'une inéquation du second degré y est donc probablement cassé aussi — à
vérifier à l'écran.

Trois issues étaient possibles :

1. se replier → l'élève n'a **rien**, le moteur ne rendant rien non plus ;
2. afficher la boîte cassée ;
3. garder l'étape en retirant son LaTeX.

**C'est la 3.** Le titre (« On dresse le tableau de signes ») et l'explication
(« le polynôme est du signe de a à l'extérieur des racines et du signe opposé
entre les racines ») se suffisent : le raisonnement reste continu, et la réponse
arrive. Un vrai composant de tableau de signes serait mieux — c'est un chantier
à part, à trancher par David.

## Les gardes, prouvées par neutralisation

| neutralisation                                         | tests devenus rouges                     |
| ------------------------------------------------------ | ---------------------------------------- |
| `withoutUndisplayableLatex` rend l'étape inchangée     | 3 tests du tableau de signes             |
| `inequality-conclude-truth` inscrit dans `CONCLUSIONS` | les 2 tests « le module se trompe »      |
| `toggleSteps` ne fait plus rien                        | « cliquer déplie », « recliquer replie » |

⚠️ **Un garde retiré comme code mort.** Une garde explicite
`if (rule === UNRELIABLE_CONCLUSION) return null` avait été écrite — la
neutraliser ne faisait rougir **aucun** test : `isSolvedForm` rejette déjà ces
cas. Elle a été supprimée plutôt que laissée à passer pour un garde-fou. La
règle reste hors de `CONCLUSIONS`, avec le pourquoi en commentaire, et les tests
mordent bien si quelqu'un l'y inscrit.

## Un défaut de mathAST, mesuré

`inequality-conclude-truth` **annonce une contradiction dès qu'il n'arrive pas à
évaluer la comparaison** :

```
0x<5   ->  « L'inéquation est une contradiction : S = ∅ »   FAUX : 0 < 5, donc S = ℝ
b*x<6  ->  « L'inéquation est une contradiction : S = ∅ »   FAUX : on ne peut pas conclure
```

À verser au lot de correction de mathAST, avec le tableau de signes.

## Reste à faire

- **Le bouton « Résoudre » du panneau** passe toujours par l'ancien chemin
  (hérité du lot précédent).
- **Le tableau de signes affichable** — un composant, pas du LaTeX.
- **`2 1` au dénominateur** quand `a = 1`, toujours visible
  (`\dfrac{3 - \sqrt{1}}{2 1}`).
