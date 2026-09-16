# Atelier — vue Calcul (lot 3), progression

> Spécification : [`atelier-vue-calcul-phase0.md`](atelier-vue-calcul-phase0.md),
> validée le 2026-09-16. Q1 = B, Q2 = pages gardées + `/atelier` en navigation,
> Q3 = alias français côté atelier.

## Étape 1 — le moteur reflète les objets (fait)

`src/lib/atelier/engine.ts` : `syncEngine()` et `expressionOf()`.

**Q1 option B, mesurée avant d'être écrite.** Pousser dans l'`EvalState` suffit,
le moteur n'a aucune modification à subir : après `createFunctionBinding`,
`f(2)` rend `-1` ; après `setBinding`, `a + 1` rend `4`.

### Ce que la substitution répare

C'est le §6 bis, et il vient d'une mesure. Avec `f` défini comme `x^2-3x+1` :

| Appel                  | Résultat                                                  |
| ---------------------- | --------------------------------------------------------- |
| `.variations f(x)`     | « Derivee : f'(x) = f'(x) », « Points critiques : aucun » |
| `.variations x^2-3x+1` | « Points critiques : x = 3/2 », signe, sens de variation  |

Le premier n'émet **aucune erreur**. Un élève y lit un tableau de variations
d'apparence normale qui ne dit rien de sa fonction. D'où la règle : la vue
substitue la définition avant d'appeler une commande, **récursivement**.

La substitution s'appuie sur `substituteAll` + `substituteFunction` de
`mathAST/eval` — pas de parcours d'AST écrit à la main.

### Trois pièges évités, chacun mesuré

**`clearAllState` remet le mode à `exact`.** L'utiliser aurait ramené l'élève en
mode exact à chaque frappe, sans qu'il ait rien demandé. `clearBindings` +
`clearFunctions` séparément.

**Mes deux premiers tests de garde passaient pour la mauvaise raison.** Je
vérifiais que `f(2)` échoue ; or un objet en attente poussé **de force** échoue
aussi — sur « Evaluation error: Cannot evaluate: free variables: a », un message
technique en anglais. Neutralisation faite : les tests ne mordaient pas. Ce qui
distingue vraiment les deux cas, c'est que le moteur **ne connaisse pas le nom**,
d'où l'assertion sur `getFunctions()` et `getState().bindings`.

**`zzz(x)` ne nomme pas une fonction `zzz`.** En syntaxe custom il se lit
`z·z·z(x)` : l'atelier attend `z`, avec une offre de curseur. Le comportement est
le bon (attente, pas erreur), mais **l'exemple `zzz` du §2.5 N1 de la Phase 0
générale ne tient pas dans cette syntaxe** — `g(x) + 1` est le bon exemple, et
rend bien `{g, function}`, sans offre de curseur, conformément à L4.

> ⚠️ **Dette notée.** `syncEngine` efface les liaisons du moteur avant de les
> reposer : un `.let b = 5` tapé au clavier hors atelier ne survivrait pas à la
> frappe suivante. **Déclencheur : quand la vue Calcul câblera `.let`** — il
> devra créer un objet d'atelier, pas une liaison de moteur.

## Étape 2 — les commandes découvrables et françaises (fait)

`src/lib/atelier/commands.ts` : `commandCatalog()`, `resolveCommand()`,
`suggestFor()`.

### ⚠️ Le chiffre exact : 34 commandes, pas 36 ni 22

Mesuré en comptant : registre 26 + hors registre 10, **mais `latex` et `custom`
sont dans les deux** → **34 uniques**. `/calc` en propose 8, donc **26
invisibles**. Le cadrage disait 22 (il ne comptait que 4 des 10 hors registre),
et ma propre Phase 0 disait 28 (elle ne voyait pas le recouvrement).

Les 34 sont désormais traduites, décrites en français et, pour les plus
courantes, accompagnées d'un exemple. Un test verrouille l'invariant : **aucune
commande du registre ne peut rester sans traduction** — sinon une commande
ajoutée au moteur reviendrait en anglais sans que personne le voie.

### Le conflit d'alias, réparé

`.help` et `.hash` déclarent tous deux `h`. L'ordre de la table tranche : `aide`
sert à un élève, `empreinte` non. Un alias n'est donné qu'une fois, et un test
le vérifie sur tout le catalogue.

### Ce que la neutralisation a corrigé

Mon premier test de relégation comparait `variations` et `hash` — deux
commandes **déjà** dans le bon ordre dans la table : il passait sans rien
prouver. Le cas qui mord est `convert`, branché en dur donc ajouté **après**
tout le registre : sans la relégation finale, « convertir », qui sert au
collège, s'afficherait après « empreinte ».

## Étape 3 — la saisie, et garder un résultat (fait)

`src/lib/atelier/calcul.ts` : `runInput()` et `promote()`.

Un seul champ. Ce que l'élève tape est une **définition** (elle crée ou met à
jour un objet), un **calcul** (il produit une ligne d'historique), ou une
**commande** (elle commence par un point). Le moteur est remis en accord avec
l'atelier **avant** toute évaluation : c'est ce qui fait que `f(2)` répond sans
que l'élève redéclare `f`.

### `x = 3` n'est pas un test d'égalité

Mon premier jet écartait `x` de la détection de définition, via
`hasObjectNameShape` — qui exclut les noms réservés. Conséquence : `x = 3`
tombait en **calcul** et le moteur répondait sans broncher, alors que le §2 L2
demande un refus qui explique. La forme du membre gauche est déjà garantie par
l'expression régulière (`3 = 3` n'y entre pas) ; c'est `validateName` qui doit
trancher sur le nom.

### Garder un résultat : le type suit le contenu

`promote()` sans nom en propose un. Un résultat qui contient `x` devient une
**fonction**, donc traçable — c'est ce qui permet d'enchaîner « je dérive »
puis « je trace la dérivée » (§4 N2, D7).

Les commandes répondant en plusieurs lignes (`d/dx(x^2) = 2x`, puis
`LaTeX: 2 x`), c'est ce qui suit le dernier `=` de la première ligne qui est
gardé.

### Une commande inconnue est vérifiée AVANT d'être exécutée

Laissée au moteur, elle produit « Unknown command » en anglais, sans rien
proposer. L'atelier nomme les deux plus proches : `.dériiver` → « Peut-être :
« .dériver » ? ».

## Étape 4 — les quatre actions du panneau (fait)

`runAction()` dans `calcul.ts` câble **dériver**, **résoudre `f(x) = 0`**,
**variations** et **image d'un nombre**. Elles ne disent plus « prochain lot ».

Toutes passent par `expressionOf` : c'est la règle du §6 bis. Seule « image »
cite le nom — et c'est sûr, parce que c'est le chemin d'évaluation (`f(2)` rend
`-1`, mesuré), pas une commande symbolique.

### ⚠️ Un bug du moteur, trouvé en vérifiant les exemples

**Le dispatch web parse TOUT l'argument comme une expression avant d'appeler la
commande.** Conséquence : toute commande prenant un argument numérique ou en
tiret après l'expression meurt sans être appelée.

| Appel                      | Web                                   | CLI |
| -------------------------- | ------------------------------------- | --- |
| `.taylor sin(x) 5 0`       | « Unexpected token: 5 »               | ✅  |
| `.integrate x^2 x 0 1`     | « Unexpected token in expression: 0 » | ✅  |
| `.solve x^2-1=0 --verbose` | « Consecutive signs not allowed: -- » | ✅  |

Seul `equiv` bénéficie d'une exception dans ce dispatch. `.taylor` est donc
**entièrement inutilisable** dans l'atelier — même `.taylor sin(x)` seul échoue.

Je ne le corrige pas ici : c'est du code partagé avec `/cas` et `/calc`, et ça
mérite sa PR et ses tests. `.taylor` est marquée `unavailable` avec sa raison en
français — **visible et désactivée**, comme les actions du §3, jamais cachée.

### Le test qui a attrapé quatre exemples faux

Un exemple qui ne marche pas est pire que pas d'exemple : l'élève conclut que
c'est lui qui se trompe. Un test exécute donc chaque exemple du catalogue. Il en
a attrapé **quatre que j'avais inventés** :

| Exemple                      | Ce qui n'allait pas                                  |
| ---------------------------- | ---------------------------------------------------- |
| `.évaluer x^2 x=3`           | Rend « Result: false » — un succès apparent, absurde |
| `.taylor sin(x) 3`           | Commande cassée en web (ci-dessus)                   |
| `.convertir km`              | Agit sur le dernier résultat : il en faut un         |
| `.ajustement 1 2 3 \| 2 4 6` | Le séparateur est `:`, pas `\|`                      |

Et une cinquième fois, c'était **mon décor** qui était faux : il exécutait
`.poser` sans le résoudre, donc l'exemple de `.oublier` était accusé à tort.

## Étape 5 — le rendu mathématique (fait)

`src/lib/atelier/render.ts` : `renderResult()`.

Le champ `latex` de `ReplExecutionResult` n'étant **jamais rempli**, le LaTeX est
produit ici. Trois sources, dans cet ordre :

1. **le texte, s'il contient déjà du LaTeX** — c'est le cas des grandeurs :
   le moteur rend « \dfrac{123}{10} km », et c'est le **seul** endroit où
   l'unité survit, l'arbre l'ayant perdue ;
2. **`result.ast`** pour une expression : il porte le RÉSULTAT (`1/3 + 1/6`
   donne l'arbre de `1/2`, mesuré) ;
3. **rien** — et le texte s'affiche tel quel (§3 L1 : mieux vaut du texte propre
   qu'un rendu mathématique faux).

### Deux pièges, tous deux mesurés

**Ne jamais reparser la sortie texte.** `(x^2-1)/(x+1)` rend
« (x^2-1):/(x+1) (variables: x) » ; reparser cette chaîne donne
« v a r \imaginaryI a b l \exponentialE s » — le mot « variables » lu comme un
produit de lettres.

**Pour une commande, `result.ast` porte l'ENTRÉE, pas le résultat.** Le rendre
afficherait « x² » là où `.dériver x^2` répond « 2x » : un résultat faux,
joliment composé — le pire des deux mondes. D'où l'option `fromCommand`.

Au passage, deux annotations de terminal disparaissent de ce que lit l'élève :
la ligne « LaTeX: 2 x » et le suffixe « (variables: x) ».

## Étapes 6 et 7 — l'écran, et la porte d'entrée (fait)

`src/lib/components/atelier/CalculView.svelte`, branchée dans le conteneur, plus
une entrée **Atelier** dans la barre latérale (Q2).

Un seul champ ; l'historique rend chaque résultat en mathématiques via
`convertLatexToMarkup`, avec le texte comme repli ; chaque ligne porte
« Garder… » ; taper un point ouvre la liste des commandes réelles, décrites en
français, `.taylor` **visible et désactivée** avec sa raison.

### Deux défauts que les tests d'écran ont attrapés

**Collision de classe `.avis`.** `AtelierContainer` a déjà une région
`aria-live` de ce nom. Mon test interrogeait `.avis` et lisait **celle du
conteneur** — vide — en croyant lire celle de la vue : le clic sur « Garder »
fonctionnait pourtant, l'objet était bien créé. Renommée `.retour`.

**Le signe moins de MathLive n'est pas un tiret.** Le résultat rendu est
« −1 » (U+2212), pas « -1 ». Chercher le tiret ASCII faisait échouer un rendu
parfaitement correct.

> ⚠️ **`pnpm exec eslint <fichier>` a fait un SIGABRT** sur trois `.svelte`,
> alors que la mémoire le disait sûr parce que ciblé. Avec la RAM déjà sous
> pression, il ne l'est pas : `projectService` charge tout le projet. La CI s'en
> charge.

## Étapes suivantes
