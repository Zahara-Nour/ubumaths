---
title: Suites numériques dans le grapheur — spécification & progression
date: 2026-09-04
status: Phase 1 — implémentée, en attente de revue et de PR
scope: src/lib/grapheur/, src/lib/components/grapheur/, src/lib/stores/grapheur.svelte.ts
niveau visé: 1ère spé & Terminale spé
---

# Suites numériques — greffe sur le grapheur

## 1. Contexte et décision

Objectif : un **outil d'exploration** des suites numériques pour la 1ère et la
Terminale spécialité maths. Pas (pour l'instant) une figure d'exercice ni un
export PDF.

**Hôte retenu : le grapheur** (`/grapheur`, également embarqué dans
`/calculatrice`). Les deux autres candidats évalués :

| Candidat        | Pour                                                                                                                                                                                  | Contre                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `grapheur`      | `Plottable` est une union discriminée prête à s'étendre ; viewport, evaluator, palette, persistance Zod déjà là ; la courbe de `f` est déjà traçable → l'escalier est presque gratuit | Pas d'export TikZ/Typst, pas d'usage dans les exercices                                |
| `geometry-core` | Export 4 surfaces (dont Typst/TikZ), animation `constructions-v2`, boucles `pour` et tableaux déjà dans le DSL                                                                        | Nouveau type `GeoSequence` ⇒ toucher `compute-position.ts` + 4 exporters + hit-testing |
| `spreadsheet`   | Table de valeurs, recherche de seuil                                                                                                                                                  | Aucun socle graphique                                                                  |

`geometry-core` reste le bon hôte **plus tard**, si l'objectif devient « des
suites dans les énoncés et les PDF ».

### Décisions validées (2026-09-04)

1. **Store** : étendre l'union `Plottable`, un seul tableau `functions`.
2. **Périmètre v1** : nuage de points + diagramme en escalier + tableau de valeurs.
3. **Modes** : explicite `u_n = f(n)` et récurrence d'ordre 1 `u_{n+1} = f(u_n)`.
   (Ordre 2 et somme Σ : hors v1.)

---

## 2. Benchmark

**NumWorks — application « Suites »** ([manuel](https://www.numworks.com/manual/sequences/)).
Référence principale, d'autant que le site embarque déjà le simulateur **Upsilon**
(fork NumWorks) sur `/upsilon` : l'ergonomie est potentiellement déjà familière
aux élèves. 3 suites (u, v, w) ; 3 modes (explicite, récurrence ordre 1, ordre 2) ;
indice du premier terme paramétrable ; onglets Suites / Graphique / Tableau ;
somme des termes de p à q ; **diagramme en toile d'araignée** intégré.

**GeoGebra.** Pas d'application dédiée : on compose `Séquence()`,
`ListeItération()`, nuage de points, vue tableur. L'escalier est une
_construction_ refaite à la main — d'où les nombreuses applets communautaires
([toile d'araignée](https://www.geogebra.org/m/XGKkBzKU),
[convergence](https://www.geogebra.org/m/PypthDAk),
[escalier](https://www.geogebra.org/m/rUwEW9mG)).

**Desmos.** Listes + récursion avec indexation `a_n`, avec des réserves
documentées sur la profondeur de récursion et les indices flottants
([Recursion](https://help.desmos.com/hc/en-us/articles/25917735966989-Recursion)).
Escalier à bricoler en listes de segments.

**TI-Nspire / Casio.** Mode Suite avec `n_min`, mode de tracé « WEB » sur TI-84.

**Conclusion du benchmark** : ce qui distingue un vrai outil de suites d'un
simple nuage de points, c'est **l'escalier/toile d'araignée** et **le tableau de
valeurs**. Les calculatrices les ont nativement, GeoGebra et Desmos les font
construire. C'est précisément l'argument qui justifie la greffe sur le grapheur.

---

## 3. Contraintes techniques découvertes (vérifiées en exécutant le code)

### 3.1 `compile()` refuse les indices — bloquant, parade identifiée

- `u_n`, `u_{n+1}`, `0.5u_n+3` **se parsent sans erreur** via `parseLatexSafe`.
- L'AST produit est `subscript { base: variable "u", subscript: variable "n" }`.
- Mais `compile()` lève **`Unsupported node type: subscript`**.
- `getVariables()` en revanche voit bien `u` **et** `n` (il aplatit base et
  indice) : il ne permet donc pas à lui seul de distinguer `u_n` d'une variable
  `u` isolée — d'où une inspection dédiée des nœuds `subscript` à la réécriture.
- `3n+2` en revanche compile et s'évalue : `fn({ n: 2 })` → `8`.

**Parade retenue** : réécrire le nœud `subscript` en variable simple _avant_
`compile()` via `transformAST({ enterSubscript })`, dans le nouveau module
`grapheur/sequence.ts`. Vérifié : `0.5u_n+3` réécrit puis compilé avec le terme
précédent à 4 rend bien `5`, et `u_n+n` réécrit s'évalue à 3 pour
`{ prev: 1, n: 2 }` — l'indice `n` reste donc utilisable dans le second membre.
**Ne pas toucher à mathAST ni à `compile()`** — leur refus est légitime.

### 3.2 `createEvaluator` code la variable en dur

`src/lib/grapheur/evaluator.ts:203-213` appelle `fn({ x })` en dur et **ignore le
champ `variable`** pourtant présent sur `ExplicitFunction`. Ne pas patcher ici :
écrire un évaluateur dédié dans `grapheur/sequence.ts`.

### 3.3 Les couches d'analyse supposent une fonction continue

`analysis.ts`, `intersections.ts`, `SpecialPoints`, `AsymptoteLines`,
`IntersectionPoints`, `CurveHover` doivent **ignorer** les suites.

### 3.4 Persistance : rétrocompatibilité gratuite

`graphStateSchema.functions` devient un tableau d'union discriminée ; un état v1
(que des `type: 'explicit'`) valide toujours. `version` est borné par
`.min(1).max(GRAPH_STATE_VERSION)` : passer la constante à `2` laisse passer les
états v1 existants. `serialize()` (`stores/grapheur.svelte.ts:369`) devra
brancher sur `type`.

---

## 4. Spécification Phase 0 — comportements

### Cas nominaux

| #   | Comportement                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| N1  | Suite explicite `u_n = 3n+2` → nuage de points $(n, u_n)$ pour `n` de `n0` jusqu'à la borne droite du viewport          |
| N2  | Récurrence d'ordre 1 `u_{n+1} = 0.5u_n+3` avec `u_0 = 8` → points calculés par **itération** (boucle, jamais récursion) |
| N3  | Indice de départ `n0` réglable (0 ou 1 en pratique) ; les points avant `n0` n'existent pas                              |
| N4  | **Escalier** : courbe de `f`, droite `y = x`, ligne brisée $u_0 \to f(u_0) \to u_1 \to \dots$ ; activable par suite     |
| N5  | Nombre de termes de l'escalier réglable par un curseur                                                                  |
| N6  | **Tableau de valeurs** `n \| u_n` synchronisé avec la suite sélectionnée                                                |
| N7  | Couleur, visibilité, suppression : mêmes contrôles que les fonctions (`ColorPicker`, toggle œil, `getNextColor`)        |
| N8  | Une suite et une fonction coexistent dans la même vue et le même panneau, sans interférence                             |
| N9  | L'état (suites comprises) survit à un rechargement de page via localStorage                                             |

### Cas limites

| #   | Comportement                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------- |
| L1  | Suite divergente (`u_n = 2^n`) : les points hors viewport sont omis, aucune erreur                            |
| L2  | Terme non défini à un rang (division par zéro) : l'itération s'arrête là, les rangs précédents restent tracés |
| L3  | Escalier proposé **uniquement** pour une récurrence d'ordre 1 (sans objet pour une suite explicite)           |
| L4  | Un état localStorage v1 (fonctions seules) se recharge sans casse après passage du schéma en v2               |
| L5  | Suite constante / point fixe (`u_{n+1} = u_n`) : l'escalier dégénère en un point, pas de boucle infinie       |
| L6  | Viewport très large (n de 0 à 10 000) : le nombre de points tracés est plafonné, le pan/zoom reste fluide     |

### Cas d'erreur

| #   | Comportement                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| E1  | `u_{n+1} = …` sans premier terme → message explicite en français, aucun tracé                                         |
| E2  | Variable libre inconnue (`u_{n+1} = a·u_n`) → erreur nommant `a`                                                      |
| E3  | Nombre d'itérations plafonné (1000) : au-delà, on s'arrête proprement, jamais de gel de l'UI                          |
| E4  | Expression non parsable → `parseError` affiché sous le champ, comme pour une fonction                                 |
| E5  | Expression explicite référençant `u_n` (confusion des deux modes) → erreur explicite invitant à choisir la récurrence |

---

## 5. Architecture cible

### Fichiers à créer

```
src/lib/grapheur/sequence.ts                    # réécriture subscript, évaluateur n,
                                                # itération mémoïsée, calcul de l'escalier
src/lib/grapheur/__tests__/sequence.test.ts     # tests unitaires (serveur)
src/lib/components/grapheur/SequencePlot.svelte # nuage de points + escalier (SVG)
src/lib/components/grapheur/SequenceInput.svelte# saisie (mode, expression, u0, n0)
src/lib/components/grapheur/SequenceTable.svelte# tableau de valeurs (ui/table)
```

### Fichiers à modifier

| Fichier                                                                  | Modification                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `grapheur/types.ts`                                                      | `SequencePlottable`, `Plottable` en union, `isSequence`, schéma Zod, version → 2   |
| `stores/grapheur.svelte.ts`                                              | `addSequence` / `updateSequence`, `serialize()` branché sur `type`, load v1→v2     |
| `components/grapheur/GraphSVG.svelte`                                    | branche `{#if p.type === 'explicit'}` dans la boucle de rendu (ligne 383)          |
| `FunctionPanel.svelte`                                                   | bouton « Ajouter une suite », rendu conditionnel `FunctionInput` / `SequenceInput` |
| `FunctionCurve.svelte`                                                   | prop typée `ExplicitFunction` au lieu de `Plottable`                               |
| `SpecialPoints` / `AsymptoteLines` / `IntersectionPoints` / `CurveHover` | `.filter(isExplicitFunction)` (une ligne chacun)                                   |
| `routes/(protected)/grapheur/+page.svelte`                               | inchangé fonctionnellement                                                         |

**Blast radius mesuré** : 6 composants + 1 route touchent `grapheurStore.functions` /
`visibleFunctions` / `validFunctions`. Tous font déjà un `.filter()` → l'ajout du
garde de type est une ligne dans chacun.

---

## 6. Plan de tests (TDD — écrits avant l'implémentation)

**Unitaires serveur** (`pnpm test:server src/lib/grapheur/__tests__/sequence.test.ts`)

- réécriture `subscript` → variable simple (N1, N2)
- évaluation explicite en `n` (N1)
- itération ordre 1, mémoïsation par indice (N2)
- `n0` ≠ 0 (N3)
- points de l'escalier : suite de segments verticaux/horizontaux (N4, L3, L5)
- divergence, terme indéfini, plafond d'itérations (L1, L2, E3)
- erreurs E1, E2, E4, E5

**Client** (`pnpm test:client`)

- `SequenceInput.svelte.test.ts` : mode, saisie de `u_0`, affichage des erreurs
- `SequenceTable.svelte.test.ts` : lignes cohérentes avec la suite

**Persistance**

- round-trip serialize/load d'une suite (N9)
- chargement d'un état v1 sans clé de suite (L4)

---

## 7. Definition of Done

- [ ] Tests écrits d'abord, échouant, puis verts
- [ ] `svelte-autofixer` (MCP) sur chaque `.svelte` créé ou modifié
- [ ] `pnpm check:incremental` = 0 erreur
- [ ] Zod sur l'état persisté ; pas de `any` ; runes uniquement ; `MySelect` pour le choix du mode
- [ ] `code-reviewer` en fin de phase (pas de `security-auditor` : ni auth, ni RLS, ni API)
- [ ] Branche → PR → CI verte → merge (jamais de code direct sur `main`)

---

## 8. Écarts entre la spec et l'implémentation

Trois points affinés pendant l'implémentation, tous vérifiés par des tests :

- **L2 est double.** Une suite **explicite** _saute_ un rang non défini et
  continue (`u_n = 1/(n-2)` garde n = 0, 1, 3, 4) ; une **récurrence** s'arrête
  au premier terme non défini, puisque les suivants sont inatteignables. La spec
  d'origine ne décrivait que le second cas.
- **L3 est plus restrictif que prévu.** L'escalier exige non seulement une
  récurrence d'ordre 1, mais aussi que le second membre **ne dépende pas de
  `n`** : `u_{n+1} = u_n + n` ne définit pas une courbe `y = f(x)` unique sur
  laquelle rebondir. Le champ `usesIndex` porte cette information et l'UI
  explique pourquoi l'escalier est indisponible.
- **E1 est un cas de champ vidé.** Une nouvelle récurrence naît avec
  `firstTerm = 0` : l'erreur « premier terme » n'apparaît que si l'élève efface
  le champ, pas à la création.

## 9. Revue de code — corrections appliquées

`code-reviewer` (Opus) n'a rien trouvé de bloquant : le cloisonnement
fonction/suite est étanche (aucune suite n'atteint `createEvaluator` ni
`analyzeAllFunctions`), l'export SVG inclut les suites gratuitement, runes
uniquement, aucun `any`, `MySelect`/`MyCheckbox` respectés.

**Corrigé** (les deux premiers sont de vrais bugs de la fonctionnalité phare) :

1. **Escalier tronqué par la fenêtre.** Les termes s'arrêtaient à
   `ceil(viewport.xMax)`, alors que l'escalier vit dans le plan
   `(u_n, u_{n+1})` : un zoom sur `x ∈ [-2 ; 3]` réduisait silencieusement
   l'escalier à 3 marches au lieu des 20 demandées, et le curseur gradué
   jusqu'à 100 était sans effet au-delà de 10. → `lastIndex` prend désormais le
   max du bord droit et de `firstIndex + cobwebSteps`. **Test de non-régression
   ajouté** (`SequencePlot.svelte.test.ts`).
2. **Droite `y = x` invisible.** Écrite `hsl(var(--muted-foreground))`, or ce
   token n'existe pas : le projet est en Tailwind 4 et ne définit que
   `--color-muted-foreground` (couleur complète via `light-dark()`). La
   déclaration était invalide, donc `stroke` retombait sur `none`. → passage à
   `var(--color-*)`, y compris dans les styles du `math-field` de
   `SequenceInput`. ⚠️ Le même idiome fautif existe dans `ColorPicker.svelte`
   et `FunctionInput.svelte` (préexistant, hors périmètre, moins visible car
   `border-color` retombe sur `currentColor`).
3. `lastIndex` extrait en `$derived` entier : un pan ne recalcule les termes
   qu'au franchissement d'un rang. (Mesuré avant correction : 0,12 ms/frame
   pour 1000 termes, `compile()` inclus — donc confort, pas urgence.)
4. `__prev` n'est plus une variable acceptée en mode explicite (elle y aurait
   valu 0 silencieusement).
5. Passer une suite en mode récurrence active l'escalier — sans quoi la
   fonctionnalité restait invisible, une suite étant toujours créée explicite.
6. `firstTerm` borné à ±1e9 dans Zod (règle #1 : bornes numériques).
7. Droite `y = x` passée par le même clamp que l'escalier.
8. `toComputeSpec()` partagé entre le tracé et le tableau (retour nullable,
   sans cast).
9. `MODE_ITEMS` typé + résolution par `find` au lieu d'un cast de chaîne.
10. a11y : le `<label>` enveloppant le `Slider` bits-ui remplacé par un `<div>`.

**Écarté sciemment** :

- `updateFunction` ignore silencieusement l'id d'une suite : aucun appelant
  concerné, un `console.warn` ajouterait du bruit pour un risque théorique.
- `CurveHover` ne s'accroche pas aux points d'une suite : hors périmètre v1,
  à trancher comme choix produit.
- La troncature à `MAX_SEQUENCE_TERMS` (rang > n0 + 1000) reste silencieuse :
  hors d'atteinte des usages 1ère/Terminale, un avertissement encombrerait
  l'UI.

## 10. Correction de conception — les deux représentations s'excluent

**Trouvé à l'essai manuel (David, 2026-09-04).** Superposer le nuage
`(n, u_n)` et l'escalier sur les mêmes axes est mathématiquement incohérent :
l'abscisse porte le **rang** dans le premier et la **valeur** `u_n` dans le
second. Sur la capture d'origine, le point d'abscisse 8 signifiait « u_8 = 6 »
pendant que le trait vertical d'abscisse 8 signifiait « on part de u_0 = 8 ».
Chaque tracé était juste isolément ; c'est leur superposition qui ne voulait
rien dire.

Le benchmark le disait pourtant : chez NumWorks l'escalier est un **type de
représentation** qu'on choisit, pas un calque qu'on ajoute. Conséquence non
tirée à la première rédaction.

**Correctif retenu (décision PO)** : `showCobweb: boolean` devient
`representation: 'ranks' | 'cobweb'`. En représentation « escalier », la suite
n'affiche plus ses points ; le panneau propose un sélecteur « Représentation »
dès que l'escalier est possible. Chaque suite choisit la sienne, donc une suite
en rangs et une suite en escalier peuvent coexister.

Effets de bord :

- `lastIndex` dépend maintenant de la représentation (bornes du viewport en
  rangs, `firstIndex + cobwebSteps` en escalier) au lieu d'un `max()` des deux.
- Une suite en `cobweb` dont l'expression devient dépendante de `n` retombe
  automatiquement sur les rangs (`supportsCobweb` reste faux).
- Un état localStorage écrit avant ce changement porte encore `showCobweb` :
  Zod ignore la clé inconnue et applique `representation: 'ranks'` par défaut.
  Aucune casse, mais une suite testée en escalier revient en rangs.

## 10. État de la livraison

| Élément                  | État                                                           |
| ------------------------ | -------------------------------------------------------------- |
| Branche                  | `feat/grapheur-suites` (partie de `main` à jour, PR #121/#122) |
| Moteur                   | `src/lib/grapheur/sequence.ts`                                 |
| Composants               | `SequencePlot` · `SequenceInput` · `SequenceTable`             |
| Tests serveur            | 51 (40 moteur + 11 schéma de persistance)                      |
| Tests client             | 12 (8 escalier/points dont 2 non-régression, 4 tableau)        |
| Suite grapheur entière   | 282 tests verts                                                |
| `pnpm check:incremental` | ✅ 0 erreur (1731 fichiers)                                    |
| `svelte-autofixer`       | ✅ passé sur les 3 nouveaux `.svelte`                          |
| Prettier                 | ✅                                                             |
| Revue                    | ✅ `code-reviewer`, 10 correctifs appliqués, rien de bloquant  |
| Reste à faire            | re-essai manuel, commit + PR (accord attendu)                  |

## 11. Journal

- **2026-09-04** — Exploration des outils graphiques existants ; benchmark
  NumWorks / GeoGebra / Desmos / TI ; hôte et périmètre validés ; contrainte
  `compile()` / `subscript` découverte et parade vérifiée. Spec Phase 0 rédigée,
  **en attente de validation avant tout code**.
- **2026-09-04 (suite)** — Phase 1 implémentée sur `feat/grapheur-suites` :
  moteur `sequence.ts` (réécriture du `subscript`, itération plafonnée, escalier),
  union `Plottable` étendue, store (`addSequence`/`updateSequence`, sérialisation
  branchée), 3 composants, 4 couches d'analyse filtrées sur les fonctions
  explicites. 61 tests neufs, 282 verts au total, typecheck à 0 erreur.
  **Pas encore commité — en attente d'accord.**
- **2026-09-04 (revue)** — `code-reviewer` passé : rien de bloquant, 10
  correctifs appliqués dont 2 vrais bugs de l'escalier (tronqué par la fenêtre,
  droite `y = x` invisible faute de token CSS valide). 293 tests verts
  (282 serveur + 11 client), typecheck à 0 erreur. **Toujours pas commité.**
- **2026-09-04 (essai manuel)** — Superposition nuage/escalier identifiée comme
  incohérente (deux axes des abscisses). `showCobweb` remplacé par
  `representation: 'ranks' | 'cobweb'`, exclusives. 294 tests verts
  (282 serveur + 12 client), typecheck à 0 erreur. **Toujours pas commité.**
