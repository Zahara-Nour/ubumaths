# Atelier — solde des dettes

Cinq dettes notées aux lots 3 et 4, tranchées par David le 2026-09-16.

## 1. `syncEngine` efface les liaisons du moteur — **sans objet**

Le déclencheur était « quand la vue câblera `.let` ». Or les **sept** commandes
qui écrivent dans l'`EvalState` (`let`, `def`, `clear`, `unset`, `undef`, `inv`,
`def'`) sont désactivées depuis la revue #339 : aucun chemin ne permet à l'élève
d'écrire dans le moteur, donc rien ne peut diverger.

Ce n'est pas une dette soldée, c'est une dette **sans objet aujourd'hui**. Elle
redeviendra vraie le jour où `.let` sera câblé — la note reste.

## 2. L'écart-type : `.stats` aligné sur ÷ n

**Décidé par David : aligner le moteur.** `.stats` divisait par `n − 1`
(estimateur d'échantillon), le panneau par `n` (variance descriptive du
programme français). La même série lisait 9 ici et 6 là.

Aucun test existant ne fixait la **valeur** — seulement la présence des mots
« Variance » et « Ecart-type ». C'est pour ça que la divergence est passée
inaperçue. Le test qui manquait est écrit.

Les 897 tests de `mathAST/cli` restent verts : le changement ne casse rien.

## 3. Choisir la liste des ordonnées — **une action par partenaire**

Ni sélecteur, ni glisser-déposer (qui a déjà coûté trois bugs en production) :
le **catalogue d'actions** du §3 porte le choix, puisqu'il sert exactement à ça.

- deux listes → « Nuage avec M », comme avant, rien ne change pour l'élève ;
- trois listes → « Nuage avec M » **et** « Nuage avec N ».

L'identifiant porte le partenaire (`scatter:M`), et c'est lui que l'exécution
relit : rien n'est redeviné au clic.

⚠️ Le choix vit **sur l'objet** (`plottedWith`), comme `plotted` : sans ça,
`syncPlots` recalculait « la suivante » et ignorait ce que l'élève venait de
choisir. Mesuré — le premier essai traçait la mauvaise liste.

## 4. D10, la provenance — **et le piège qu'elle cachait**

⚠️ **Solder cette dette telle qu'elle était écrite aurait introduit le défaut
qu'elle prétend éviter.**

`'keyboard'` ne veut pas dire « tapé dans un champ texte » : il désigne la frappe
**dans un champ MathLive**, dont les raccourcis convertissent « sin » en `\sin`.
Il est donc lu en LaTeX. La vue Calcul, elle, a un `<input type="text">` et
passait `'keyboard'`.

Mesuré : `sin(x)` créé avec `'keyboard'` donne **`pending`** — `s·i·n·(x)`, trois
noms inconnus. Sur le chemin réel il donnait `ok`, **parce que `create` ignorait
la provenance** et retombait sur la détection. Faire descendre `'keyboard'`
aurait cassé ce qui marchait.

D'où une provenance `'text'` pour un champ ordinaire, et un commentaire qui dit
ce que `'keyboard'` désigne vraiment.

⚠️ La provenance vit **sur l'objet** : `recomputeAll` repart toujours de
`parseDefinition`, donc sans mémoire une définition LaTeX serait relue en texte
dès qu'un **autre** objet change.

## 5. Garder la dérivée — par voie symbolique

Décision D7 : **les deux gestes, distincts**. « Dériver » affiche et ne crée
rien ; « Garder la dérivée » crée un objet, donc quelque chose de **traçable et
citable**.

La dérivée est calculée sur l'**arbre** de l'expression substituée
(`differentiate` de `mathAST`), jamais en relisant du texte — le lot 3 a montré
où mène l'autre chemin.

### ⚠️ L'objet ne s'appelle pas `f’`

C'était l'intention, et elle ne tient pas : **l'apostrophe n'est pas un
caractère d'identifiant pour le parseur**. Un objet nommé `f’` n'aurait jamais
pu être cité dans une autre définition — `f’(x) + 1` ne l'aurait pas vu.

Élargir la forme des noms toucherait `referencesOf`, `hasObjectNameShape` et la
lecture des dépendances : bien au-delà de cette dette. L'objet prend donc le
prochain nom libre, et le message dit ce qu'il est : « g(x) = 2x−3 — la dérivée
de f ». Un test vérifie qu'il est **citable** : `g(2)` rend `1`.

C'est un écart assumé avec la lettre de D7, qui en garde l'esprit — le geste
existe, et son résultat est utilisable.
