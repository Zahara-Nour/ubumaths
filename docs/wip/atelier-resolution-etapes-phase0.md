# Phase 0 — La résolution pas à pas dans l'atelier

> Branche `feat/atelier-resolution-etapes`. Spécification à valider **avant**
> toute ligne de code (CLAUDE.md §Planning). Toutes les sorties citées ont été
> exécutées le 2026-09-16, pas supposées.

---

## 1. Correction de la prémisse

J'avais annoncé à David : « l'élève tape `.résoudre 3x+5=14` et reçoit **la
réponse** ; avec `pedagogical-solve` il recevrait **le raisonnement** ».

**C'est faux.** Il reçoit déjà le raisonnement. Voici la sortie réelle de
`.résoudre x^2-3x+1=0` dans l'atelier aujourd'hui, telle que l'élève la voit :

```
Equation quadratique:          x^2-3x+1 = 0
→ On identifie les coefficients:      a = 1, b = -3, c = 1
→ On calcule le discriminant:     Delta = 9 - 4 = 5
→ On interprete le discriminant:  Delta = 5 > 0, deux solutions reelles
→ On applique la formule quadratique: x = (3 ± sqrt(5)) / (2×1)
→ On simplifie les solutions:         x = 3/2+{1/2}sqrt(5) ou x = 3/2-{1/2}sqrt(5)

x = 3/2+{1/2}sqrt(5) ou x = 3/2-{1/2}sqrt(5)
```

Le chantier n'ajoute donc pas le raisonnement : **il le rend lisible.** Ce qui
ne va pas dans le bloc ci-dessus, point par point :

- **aucun accent** : « Equation », « interprete », « reelles », « Delta » ;
- **pas de mathématiques** : `sqrt(5)` au lieu de √5, `x^2` au lieu de x², et un
  fragment cassé — `3/2+{1/2}sqrt(5)`, avec des accolades orphelines qui sont un
  reste de LaTeX ;
- **alignement par espaces** dans une police à chasse fixe, qui se disloque dès
  que la colonne est étroite ;
- le résultat final est répété, sans être distingué du reste.

C'est la sortie d'un terminal, affichée telle quelle dans une page web.

### Il y a deux implémentations, et l'atelier est branché sur la mauvaise

Ce bloc ne vient **pas** de `pedagogical-solve`. Il vient de
`src/lib/mathAST/cli/commands/solve.command.ts`, qui ne cite jamais le module
pédagogique (zéro référence) et refabrique ses propres étapes avec son propre
formatage à la main.

`pedagogical-solve`, lui, est employé par les corrections de questions, en
production. Le lot ne consiste donc pas à « ajouter les étapes » : il consiste à
**brancher l'atelier sur le module pédagogique** au lieu du formateur de
terminal.

---

## 2. Ce que ça devient

Les mêmes étapes, rendues par le module qui existe déjà pour ça. Mesuré :

```
• Équation du second degré
    Une équation du second degré s'écrit ax² + bx + c = 0 avec a ≠ 0. On va
    calculer le discriminant pour déterminer le nombre de solutions.
• On identifie les coefficients a, b et c
    a = 1, \quad b = -3, \quad c = 1
• On calcule le discriminant Δ = b² − 4ac
    \Delta = b^2 - 4ac = (-3)^2 - 4 · 1 · 1 = 5
• Δ > 0 : deux solutions distinctes
• On applique la formule : x = (−b ± √Δ) / (2a)
• On simplifie les solutions
• Solutions
    S = { 3/2 − ½√5 ; 3/2 + ½√5 }
```

Titres accentués, explications en français, expressions en LaTeX rendu.

### Rien à écrire pour l'afficher

`src/lib/components/questions/GeneratedStepsCorrection.svelte` **existe et tourne
en production** : il affiche exactement un `RenderedStep[]`, gère les titres, le
LaTeX (`$$…$$` via `MarkdownRenderer`), les explications selon la verbosité et
les sous-étapes. Il est branché sur `CorrectionCard.svelte` pour les corrections
de questions. Il ne prend que deux props (`steps`, `verbosity`) : rien ne
l'attache au contexte « question ».

**On le réutilise. On n'écrit pas de composant d'affichage.**

### Le choix du renderer se lit dans les étapes

Le mauvais renderer **ne lève pas d'erreur : il ment**. Mesuré — une équation du
premier degré passée au `QuadraticEquationRenderer` s'annonce « Équation du
second degré », et l'étape 2 affiche l'équation de départ au lieu de la
soustraction.

Inutile pour autant de recalculer le degré : le générateur **dit déjà** ce qu'il
a décidé, dans la première étape.

```
3x+5=14       -> etape0.operation.equationType = linear
2x-7=3x+1     -> linear
x^2-3x+1=0    -> quadratic
x^2=4         -> quadratic
```

Le renderer se choisit là-dessus, jamais sur un degré re-dérivé de notre côté :
deux calculs séparés peuvent diverger, celui-ci ne le peut pas.

---

## 3. Comportements à valider

### Cas nominaux

- **N1** — `.résoudre 3x+5=14` affiche 4 étapes, titrées en français accentué,
  la dernière annonçant `x = 3`.
- **N2** — `.résoudre x^2-3x+1=0` affiche 7 étapes, dont le discriminant `Δ = 5`
  et l'ensemble `S = { 3/2 − ½√5 ; 3/2 + ½√5 }` en notation mathématique.
  Aucun `sqrt(`, aucune accolade orpheline, aucun mot sans accent.
- **N3** — `.résoudre x^2+1=0` conclut « L'équation n'a pas de solution réelle »
  (mesuré : 4 étapes, la conclusion est correcte).
- **N4** — L'équation peut citer un objet de l'atelier : `f(x) = x^2-3x+1`, puis
  `.résoudre f(x)=0` doit résoudre en `x`. ⚠️ **Sans substitution préalable,
  mathAST prend `f` pour l'inconnue** — c'est le défaut §6 bis, déjà payé deux
  fois sur ce chantier. `substituteNames` existe déjà dans `calcul.ts` et
  s'applique à toutes les commandes : à vérifier par un test, pas à supposer.

### Cas limites — repli sur le comportement actuel

Dans tous les cas ci-dessous, `generateEquationSteps` ne rend rien d'utilisable.
**L'élève doit garder la réponse qu'il a aujourd'hui**, pas un message d'échec.

- **L1** — `.résoudre x^3-x=0` → `UnsupportedEquationDegree` (« degree 3 is
  unsupported »). Repli.
- **L2** — `.résoudre sin(x)=0` → `UnsupportedEquationDegree` (« not a
  polynomial »). Repli.
- **L3** — `.résoudre b*x+5=14` → `Error: cannot detect a single variable`.
  C'est **le cas des paramètres**, celui que l'atelier rencontre tout le temps
  (`k(x) = bx`). Repli. ⚠️ C'est une `Error` nue, pas une classe dédiée : on ne
  peut pas la distinguer par son type. À traiter par `try/catch` large autour de
  la génération, jamais en filtrant sur le message (il est en anglais et peut
  changer).
- **L4** — Coefficients paramétriques au second degré →
  `PedagogicalQuadraticNotImplemented`. Repli.
- **L5** — `.résoudre 0x=5` rend **1 seule étape** (« Équation du premier
  degré ») et ne conclut pas. `.résoudre x=x` rend 2 étapes et s'arrête sur
  « On soustrait x aux deux membres ». Ces listes tronquées ne disent pas à
  l'élève ce qu'il faut en penser. **Proposition : replier aussi** quand la
  dernière étape n'est pas une étape de conclusion (`read-solution`,
  `read-solutions`, ou la conclusion « pas de solution réelle »).

### Cas d'erreur

- **E1** — Une équation illisible refuse comme aujourd'hui, en français.
- **E2** — Si le rendu des étapes échoue pour une raison imprévue, la ligne
  affiche le résultat actuel plutôt que rien. **Aucun chemin ne doit pouvoir
  faire disparaître la réponse.**

---

## 4. Trois décisions qui t'appartiennent

### Q1 — Les étapes remplacent-elles la ligne, ou se déplient-elles ?

`.résoudre` produit aujourd'hui **une ligne** d'historique. Les étapes font 4 à
7 blocs avec titre, explication et formule. Sept `.résoudre` de suite noieraient
l'historique.

- **(a)** Les étapes remplacent le bloc monospace actuel — l'élève les voit
  toujours. Simple, mais l'historique devient long.
- **(b) (recommandé)** La ligne garde la réponse (`x = 3`), et porte un contrôle
  « Comment ? » qui déplie les étapes. L'historique reste dense, le raisonnement
  est disponible quand il est demandé.
- **(c)** Les étapes vont ailleurs qu'en historique (un panneau latéral).

### Q2 — Quel niveau scolaire ?

Les titres et explications changent selon le niveau (`college`, `lycee`, …), et
l'atelier ne connaît pas le niveau de l'élève — il est **sans compte**.

Mesuré : `generateEquationSteps` **remonte le niveau tout seul** quand il ne
colle pas. En passant `college`, une équation du premier degré reste au collège
et une équation du second degré est automatiquement traitée en `lycee`.

**Recommandation : passer `college` et laisser mathAST remonter.** Zéro réglage,
zéro écran, et le vocabulaire suit le degré de l'équation — qui est justement ce
qui détermine la classe où on la rencontre.

### Q3 — Les explications, affichées ou non ?

`verbosity: 'detailed'` ajoute une phrase sous chaque titre (« On soustrait 5
aux deux membres : l'égalité est préservée »). `'summarized'` ne garde que les
titres. Le composant gère déjà les deux.

Recommandation : `detailed` — c'est ce que l'élève seul devant son écran n'a
personne pour lui dire. Mais c'est un choix pédagogique, il est à toi.

---

## 5. Ce que ce lot ne fait pas

- **Les inéquations.** `generateInequalitySteps` existe et marche, mais
  `.résoudre` ne traite que les équations aujourd'hui : l'ouvrir aux inéquations
  est un autre lot, avec ses propres cas.
- **Le bouton « Résoudre » du panneau.** Il appelle `runAction`, un chemin
  distinct de `runCommand`. À traiter ensuite, une fois la commande éprouvée.
- **Garder les étapes.** `promote` refuse déjà le résultat d'une commande, et
  c'est correct : une liste d'étapes n'est pas un objet de l'atelier.

---

## 6. Un défaut de mathAST vu en chemin

Le rendu du second degré écrit le dénominateur `2a` comme **`2 1`** quand
`a = 1` :

```
x_1 = \dfrac{3 - \sqrt{5}}{2 1}
```

« 2 1 » au dénominateur, au lieu de `2`. C'est dans
`pedagogical-solve/quadratic-renderer.ts`, pas dans l'atelier, et c'est visible
par l'élève. À verser au lot de correction de mathAST
(`docs/wip/mathast-5-defauts-prompt.md`) plutôt qu'à corriger ici.
