---
title: 'mathAST — Decisions d'architecture (ADR)'
date: 2026-06-18
audience: 'mainteneurs, nouveaux contributeurs au CAS'
---

# Decisions d'architecture — mathAST

> Style ADR allegé. Chaque decision comporte : contexte, decision, justification,
> consequences et etat. Le rationale complet pour les decisions comparatives
> (mathAST vs Poincare / mathjs) vit dans
> [`mathAST-vs-poincare.md`](./mathAST-vs-poincare.md).

---

## Table des matieres

1. [AST custom TypeScript vs bibliotheque tierce](#1-ast-custom-typescript-vs-bibliotheque-tierce)
2. [Modele de nœud : union discriminee binaire immutable](#2-modele-de-nœud--union-discriminee-binaire-immutable)
3. [Forme normale separee (NormalForm)](#3-forme-normale-separee-normalform)
4. [Sign-guard sur `factory.number()`](#4-sign-guard-sur-factorynumber)
5. [Delimiter comme frontiere intangible de flatten](#5-delimiter-comme-frontiere-intangible-de-flatten)
6. [Securite parser : caps post-parse](#6-securite-parser--caps-post-parse)
7. [Paliers pedagogiques comme pipeline parallele](#7-paliers-pedagogiques-comme-pipeline-parallele)
8. [Convention des nombres signes : Opposite(positif)](#8-convention-des-nombres-signes--oppositekpositif)
9. [Virgule decimale francaise dans le parser LaTeX](#9-virgule-decimale-francaise-dans-le-parser-latex)
10. [Pas de nœud `Undefined`](#10-pas-de-nœud-undefined)
11. [Immutabilite par convention, pas par enforcement runtime](#11-immutabilite-par-convention-pas-par-enforcement-runtime)

---

## 1. AST custom TypeScript vs bibliotheque tierce

**Contexte** : au demarrage du projet, les alternatives etaient mathjs (JS, mutables,
pas de NormalForm), Poincare/Upsilon (C++, cible embarquee, non portable Web) et d'autres
moteurs Python/Haskell inutilisables dans un navigateur.

**Decision** : ecrire un AST custom en TypeScript strict.

**Justification** :

- mathjs manipule des expressions mutables, sans forme normale claire, sans invariants
  structurels — insuffisant pour la correction pedagogique (les etapes doivent etre deterministes).
- Poincare est C++ embarque (TreePool, 256 Ko RAM NumWorks) — non portable sans transpilation.
- Un AST TypeScript permet d'integrer directement dans le build Vite/Svelte, d'avoir des
  types stricts sur chaque type de nœud, et de garantir les invariants via `readonly`.
- Les 14 900+ tests (etat 2026-05-03) demontrent que la base est mature.

**Consequences** :

- Maintenance entiere en interne (pas de mise a jour tierce automatique).
- Richesse inegalee pour les besoins UbuMaths : differentiation symbolique, integration,
  taylor, paliers pedagogiques — aucune bibliotheque JS ne couvrait ce perimetre.

**Etat** : decision definitive. Voir `mathAST-vs-poincare.md §1` pour la comparaison
detaillee des perimetres.

---

## 2. Modele de nœud : union discriminee binaire immutable

**Contexte** : Poincare utilise des nœuds N-aires pour `+` et `×` ; d'autres moteurs
utilisent des classes OOP avec heritage.

**Decision** : nœuds **binaires** (`left`/`right` pour les operateurs binaires), modeles
par **union discriminee TypeScript** (`BaseNode` + `readonly type: string`, 28 variantes,
champs `readonly`). Voir `types.ts:147-757`.

**Justification** :

- La binaire force une structure reguliere : tout traitement d'arbre est un simple
  parcours recursif, pas une boucle sur N enfants.
- L'union discriminee (pas de classes) permet l'exhaustivite statique :
  `const _exhaustive: never = node` dans les switch detects les cas non couverts
  (ex. `guards.ts:672`). Zero `any` sur les 430 fichiers src.
- Binaire necessite `flatten.ts` pour les operations associatives, mais `flatten` est une
  primitive explicite avec des post-conditions clairement documentees.

**Consequences** :

- Aplatir une somme `a+b+c+d` necessite `flattenSumShallow` (voir §5).
- Poincare groupe par base lors du tri ; mathAST trie par degre decroissant — divergence
  mineure, documentee dans `mathAST-vs-poincare.md §4.3`.

**Etat** : decision definitive.

---

## 3. Forme normale separee (NormalForm)

**Contexte** : Poincare modifie l'AST in-place dans `shallowReduce`. mathjs n'a pas de
NormalForm.

**Decision** : la simplification passe par une **NormalForm separee** —
`numerator: Polynomial / denominator: Polynomial` avec `Polynomial` = tableau trie de
`NormalTerm`, chaque terme portant un `AlgebraicCoefficient` (rationnels + radicaux) et un
`Monomial` (produit de `SymbolicFactor`). Voir `normal/types.ts:42-200`.

**Justification** :

- La NormalForm est **structurale**, pas par regles : addition et multiplication s'expriment
  comme agregation de `NormalTerm`, sans pattern matching.
- La convergence est garantie (un seul representant canonique par classe d'equivalence).
- La comparaison d'equivalence se ramene a l'egalite des hashes (`normalize(a).hash === normalize(b).hash`).

**Consequences** :

- Chaque `simplify()` fait 2 conversions AST ↔ NormalForm — cout mesure ~64 µs/appel
  pour `1+x` (parse 3 µs, normalize seul 9 µs). Acceptable pour l'interactif.
- `normal/normalize.ts` = 4 210 LOC / 137 Ko (candidat a decoupe future).

**Etat** : decision definitive. Voir `mathAST-vs-poincare.md §4` pour la comparaison
architecturale avec la double-passe reduce/beautify de Poincare.

---

## 4. Sign-guard sur `factory.number()`

**Contexte** : avant la migration "nombres negatifs" (10 commits, mai 2026,
`docs/wip/migrate-negative-numbers-progress.md`), des litteraux signes comme
`number('-3')` pouvaient se retrouver dans l'AST, cassant les analyses structurelles.

**Decision** : `factory.number()` **rejette tout litteral signe** a l'execution
(`factory.ts:255-269`). Les negatifs sont obligatoirement representes par
`opposite(number('3'))` ou par `numericNode(...)`. `isMinusOne` ne reconnait que
`opposite(number('1'))` (`guards.ts:768`).

**Justification** :

- Invariant unique : un `NumberNode` a toujours une valeur positive dans l'AST de surface.
  Ca simplifie tous les analyseurs (sign, variations, pedagogical-solve) qui n'ont pas a
  verifier deux representations concurrentes.
- Aligne sur Poincare apres beautify : `Rational::shallowBeautify` remplace les Rational
  negatifs par `Opposite(setSign(Positive))` avant serialisation. Meme resultat final,
  chemin different.

**Consequences** :

- **Drift factory** : ~91 litteraux `{ type: '...' }` bruts construits hors factory
  dans `solve/`, `analysis/`, `limits/` — contournent le guard. Dette a corriger
  progressivement. Voir `code-quality.md §3`.
- Le known issue parser (moins unaire) depose `opposite(3)` comme facteur gauche dans
  `-3y` (voir §8 et `code-quality.md §known-issues`).

**Etat** : decision definitive.

---

## 5. Delimiter comme frontiere intangible de flatten

**Contexte** : `flattenSumShallow` et `flattenProductShallow` traversent l'arbre pour
collecter les termes/facteurs, mais elles doivent s'arreter aux sous-expressions
parenthesees.

**Decision** : les nœuds `delimiter` sont des **frontieres intangibles** : ni
`flattenSumShallow` ni `flattenProductShallow` ne les traversent
(`flatten.ts:7-8,123-130`).

**Justification** :

- Invariant porteur de toute l'analyse structurelle en aval : les termes collectes par
  `flatten` sont exactement les termes du niveau courant, pas les sous-termes profonds.
- `addition/subtraction/opposite/positive` ne survivent jamais a `flattenSumShallow` ;
  `multiplication` jamais a `flattenProductShallow` (post-condition garantie par
  construction).

**Consequences** :

- Tout code qui manipule des arbres apres flatten peut supposer que les nœuds de type
  `delimiter` encapsulent des sous-expressions atomiques.
- Contrat round-trip garanti par `unflattenSum` / `unflattenProductShallow`
  (`flatten.ts:534-616`) : `unflattenSum` reconstruit `((a-b)+c)`, `StyledFactor.style`
  porte le `×` de l'operateur precedent.

**Etat** : decision definitive.

---

## 6. Securite parser : caps post-parse

**Contexte** : les parsers acceptent des entrees utilisateur (LaTeX d'eleve, parser
custom, CLI). Un input pathologique peut provoquer un stack overflow ou consommer
de la memoire de maniere excessive.

**Decision** : module `parser/security.ts` avec `SecurityError` et caps configures :

| Cap              | Defaut | Verifie    |
| ---------------- | ------ | ---------- |
| `maxInputLength` | 10 000 | Pre-parse  |
| `maxASTDepth`    | 100    | Post-parse |
| `maxNodeCount`   | 10 000 | Post-parse |

Cable dans les 4 parsers. `eval/evaluate.ts:431` : `MAX_EVAL_DEPTH=100` verifie
pendant la recursion.

**Justification** : contexte web — un eleve peut soumettre une entree malformee ou
deliberement complexe. Modele de menace different de Poincare (calculatrice isolee).

**Consequences — finding [MED]** : `maxASTDepth:100` et `maxNodeCount:10000` sont
verifies POST-parse via `checkASTSecurity` (`parser-pratt.ts:2259/2320`). Une imbrication
~5000 delimiteurs profonds (sous `maxInputLength=10000 chars`) peut provoquer un
`RangeError` (stack overflow) avant meme que le check soit atteint. Impact reel : crash
synchrone d'un parse, pas de RCE. Fix recommande : compteur de profondeur in-parse.
Voir `security.md` pour le detail.

**Etat** : infrastructure en place, finding MED ouvert.

---

## 7. Paliers pedagogiques comme pipeline parallele

**Contexte** : UbuMaths doit afficher les etapes de resolution pas-a-pas a l'eleve
(palier 1 = resultat direct, palier 2 = etapes intermediaires, palier 3 = demonstration
complete). La simplification CAS seule ne suffit pas — elle n'expose pas les etapes.

**Decision** : les modules `pedagogical-*/` implantent un **pipeline parallele** qui,
pour chaque domaine (arithmetic, differentiation, integration, limits, simplify, solve,
domain), produit une sequence typee d'etapes (`PedagogicalStep[]`) independamment du
pipeline de simplification CAS.

**Justification** :

- Separation nette entre "calculer le bon resultat" (normal, simplify, solve) et
  "montrer comment on y arrive" (pedagogical-\*). Les deux peuvent evoluer independamment.
- Les etapes pedagogiques doivent etre deterministes et en francais — elles ne peuvent
  pas etre derivees de la simplification CAS qui peut emprunter des chemins differents
  selon les heuristiques de cout.

**Consequences** :

- `step-generator/` orchestre la selection du bon pipeline pedagogique selon le type
  d'expression et le palier demande.
- `pedagogical-solve/` (28 fichiers) et `pedagogical-simplify/` (18 fichiers) sont les
  plus grands et les moins couverts par les tests — risque eleve (voir `tests.md §2.5`).

**Etat** : decision definitive. Architecture livree progressivement (commits
`138f6d99b` pedagogical-simplify, `4a3bf5e57`→`d5445601e` pedagogical-integration,
`2d26b104e`→`c287e1691` pedagogical-limits).

---

## 8. Convention des nombres signes : Opposite(positif)

**Contexte** : alignement progressif avec Poincare sur la representation des negatifs
(voir §4 et `mathAST-vs-poincare.md §3`).

**Decision** : les entiers negatifs dans l'AST de surface sont toujours representes comme
`opposite(number('3'))`, jamais `number('-3')`. Dans la `NormalForm`, `Rational.n` peut
etre negatif (`normal/types.ts:42-45` : "Sign stored in numerator only").

**Conséquence notable — known issue** : `parseLatex('-3y')` produit
`multiplication(opposite(3), y)` (le parser cree `opposite(3)` puis le traite comme
facteur gauche de la multiplication) plutôt que `opposite(multiplication(3, y))`.
Numeriquement identique, structure differente → les analyses structurelles doivent
gerer `opposite` enfoui. **Pas de fix parser prevu** (risque d'effets de bord trop larges).

**Etat** : decision definitive pour la representation. Known issue parser documente,
tests de non-regression a ajouter (voir `tests.md §3.2`).

---

## 9. Virgule decimale francaise dans le parser LaTeX

**Contexte** : les eleves francophones ecrivent `3{,}14` en LaTeX (virgule decimale).
Le parser LaTeX standard attend `.`.

**Decision** : support de `{,}` comme separateur decimal dans `parser/latex/`
(commit `7b3ef0d43`, `docs/wip/parser-french-comma-progress.md`).

**Justification** : cible exclusive UbuMaths — eleves francophones. Poincare n'a pas de
variante locale (`.` uniquement, `tokenizer.cpp:99`).

**Etat** : livre, en production.

---

## 10. Pas de nœud `Undefined`

**Contexte** : Poincare a un nœud `Undefined` produit par `0/0`, `0×∞`, `∞−∞`, `0^0`.
mathAST n'a pas d'equivalent.

**Decision** : ne pas ajouter de nœud `Undefined` pour l'instant. La division par zero
reste dans l'arbre (`1/0` renvoie l'expression telle quelle apres `simplify()`) ;
`normalizeExtended` directement sur `1/0` leve `Error('normalize: division by zero')`.
`0^0` est simplifie a `1` (convention combinatoire).

**Justification** :

- Le module `domain/` couvre la responsabilite "l'expression est-elle definie sur ce
  domaine ?" a un niveau superieur, sans modifier l'AST.
- Ajouter `Undefined` est un changement structurant (adapter `types.ts`, `parser`,
  `normal/`, `simplify/` — estimation 2-3 jours d'implementation et impact test non negligeable).

**Consequences** : comportement divergent de Poincare sur `0^0` (mathAST → `1`,
Poincare → `Undefined`). Pas un bug — convention differente, documentee.

**Etat** : decision maintenue. A re-evaluer si les exercices necessitent des messages
d'erreur precisement localises sur les indeterminations.

---

## 11. Immutabilite par convention, pas par enforcement runtime

**Contexte** : les nœuds sont declares `readonly` au niveau TypeScript mais
`Object.freeze` n'est pas appele.

**Decision** : garantir l'immutabilite par **convention** (readonly TypeScript + règle
de code "ne pas muter un nœud") plutot que par `Object.freeze` au runtime.

**Justification** :

- `Object.freeze` deep sur des arbres de taille variable (normal forms, AST intermediaires)
  aurait un cout runtime non negligeable dans les boucles de simplification.
- TypeScript `readonly` capture la grande majorite des mutations accidentelles a la compilation.

**Consequences** : les ~91 litteraux `{ type: '...' }` bruts construits hors factory
(drift factory, §4) cassent potentiellement cette convention en creant des nœuds non
passes par `factory.*` — et donc non guarded. Risque isole a ces sites.

**Etat** : decision maintenue. Drift factory a corriger progressivement.
