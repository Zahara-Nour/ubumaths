---
title: mathAST — Analyse de performance
date: 2026-06-18
audience: maintainers, question-gen, pedagogy
---

# mathAST — Analyse de performance (lecture statique)

## 1. Profil de charge par contexte d'utilisation

### Question generation (batch)

La generation de questions appelle `parseLatex`/`parseCustom`, puis la chaine CAS (`normalize`, `simplify`, `solve`, `evaluate`) sur des expressions de taille moderee (< 20 noeuds). Le cout dominant est la **boucle de reecriture** (voir section 2.2), pas le parsing. Ce chemin est synchrone et sans cache actif entre appels.

### Correction interactive (par frappe)

`parseLatex` est appele a chaque changement de valeur MathLive. Sur un clavier rapide (~5 frappes/s), cela represente ~5 parses/s. Le `ParseCache` LRU de `cache/parse-cache.ts` est un cache opt-in (voir section 4) — non cable par defaut dans les parsers. Ce chemin beneficierait le plus d'un cache actif.

### Paliers pedagogiques

`pedagogical-solve/`, `pedagogical-simplify/`, etc. appellent les couches CAS a chaque etape de la progression. Plusieurs appels `normalize`/`simplify` successifs sur des sous-expressions. La profondeur de pile peut atteindre 50-100 niveaux sur des sorties de Taylor ou d'integration symbolique.

---

## 2. Hotspots identifies

### 2.1 Pattern matching combinatoire — [HIGH]

**Fichier** : `pattern/match.ts:666-811`

`matchSumPattern` et `matchProductPattern` operent en trois phases couteuses :

1. Re-flatten de l'expression a chaque appel (pas de cache de FlatSum).
2. Enumeration de toutes les combinaisons C(n,k) × k! (permutations d'ordre k parmi n termes). Pour n=6, k=3 : **120 essais**, chacun recursif.
3. A chaque sous-match reussi, `mergeBindings` (`match.ts:100-116`) **copie la `Map` entiere** des bindings courants.

Le seul garde existant est le `checkAbort` du contexte — pas de memoisation des sous-matchs.

**Impact** : toute application de pattern sur une somme ou un produit de taille moderee (>4 termes) est polynomiale en n. Le rule engine appelle `tryMatch` sur chaque noeud × chaque regle, soit jusqu'a 171 regles × n nœuds × k! combinaisons par iteration.

### 2.2 Reconstruction systematique dans `mapNode` — [HIGH]

**Fichier** : `transforms.ts:278-487`

`mapNode` reconstruit chaque noeud interne meme si aucun enfant n'a change : pas de court-circuit sur l'egalite de reference. Le rule engine appelle `mapNode` a chaque noeud × chaque iteration (jusqu'a 10 iterations × 171 regles dans `rewriting-engine.ts`).

En parallele, `visitor.ts:817` alloue un nouveau tableau `childPath = [...context.path, ...pathSegments]` a chaque noeud visite.

Il existe deux implementations paralleles de reconstruction : `reconstructNode` (`visitor.ts:512`) et `mapNode` (`transforms.ts:278`). Unifier et ajouter un court-circuit ref-equality (`if (child === transformed) return original`) reduirait les allocations sans changer la semantique.

### 2.3 `nodesEqual` = deux hash complets — [MED]

**Fichier** : `normal/hash.ts:165`

```typescript
export function nodesEqual(a: MathNode, b: MathNode): boolean {
	return hashMathNode(a) === hashMathNode(b);
}
```

Chaque appel a `nodesEqual` produit deux chaines de hash completes (traversee recursive de l'AST en entier). Cette fonction est appelee 3 fois par iteration dans `rewriting-engine.ts` (test de convergence du fixpoint) et par les wildcards de pattern dans `pattern/match.ts`.

Aucun hash n'est cache sur les noeuds. Internaliser les hashs (calculer une fois a la construction et stocker sur le noeud) transformerait chaque comparaison en comparaison de chaines de 1 niveau — O(1) si les chaines sont internees.

### 2.4 Tri des regles par invocation — [MED]

**Fichier** : `pattern/rule.ts:488`

`sortByPriority(rules)` est appele a chaque invocation du rule engine (`pattern/rule.ts:515,538,574`). Pour 171 regles, un tri O(n log n) est execute a chaque appel a `applyRules`/`applyRulesUntilFixpoint`. La liste de regles est stable entre appels — memoiser le resultat du tri par identite de tableau supprimerait ce cout.

### 2.5 Reconstruction du tableau de regles dans `simplify()` — [MED]

**Fichier** : `simplify/simplify.ts:51,158`

`buildSimplifyRules(options)` est appelee a l'interieur de `simplify()` a chaque appel, concatenant plusieurs tableaux de regles selon les options. Si `simplify` est appele a chaque frappe clavier (correction interactive), ce cout de concatenation est systematiquement repaye. Memoiser par signature d'options (`enableAbs` + `enableTrig` + ...) est trivial et elimine les allocations.

### 2.6 Deep flatten — O(n²) pire cas — [LOW]

**Fichier** : `flatten.ts` (`flattenSumDeep`, `flattenProductDeep`)

Le deep flatten re-flatten chaque sous-terme recursivement sans DAG ni memoisation. Sur des compositions profondes (sorties d'integration symbolique, Taylor), la complexite est O(n²) en taille de l'AST. En pratique les ASTs produits par l'utilisateur restent < 20 nœuds. Les sorties machine (integration, Taylor) atteignent 50-100 nœuds — surveiller si la longueur des derivations pedagogiques augmente.

### 2.7 Profondeur de pile — recursif pur — [LOW]

Tout le module est recursif (pas de fallback iteratif). La profondeur typique d'une entree utilisateur est < 20. Les sorties machine (integration, Taylor, paliers pedagogiques) atteignent 50-100. Pas de garde de stack-overflow explicite cote performance (cf. [security.md](./security.md#31-garde-de-profondeur-post-parse) pour le gap securite associe). Acceptable sur desktop, a surveiller sur mobile bas de gamme.

---

## 3. Cache et memoisation

### 3.1 `cache/parse-cache.ts` — LRU bien fait mais non cable

`ParseCache` est un LRU generique avec eviction delete+set (chaque lecture = ecriture pour la mise a jour de l'ordre LRU). L'implementation est correcte et exportee depuis `index.ts:776`. **Elle n'est pas cable dans les parsers mathAST** : aucun appel a `ParseCache` n'existe en dehors du module `cache/` lui-meme (verifie par grep).

```typescript
// cache/parse-cache.ts — API disponible, non utilisee par les parsers
export class ParseCache {
	get(key: string): MathNode | undefined;
	set(key: string, node: MathNode): void;
}
```

Opportunite directe : la correction interactive appelle `parseLatex` avec les memes expressions a chaque frappe partielle (`2x`, `2x+`, `2x+3`…). Un cache LRU de 200 entrees eliminerait la majorite des parses redondants dans une session.

### 3.2 Ce qui est deja cache (positif)

- **Regles de reecriture** : listes de regles definies comme constantes de module (pas reallouees entre appels). Seule `buildSimplifyRules()` fait exception (section 2.5).
- **Fonctions compilees** dans `eval/` : les `CompiledFn` sont des closures JS natives allouees une fois.

---

## 4. Allocations par operation

| Operation                    | Source                    | Cout dominant                              |
| ---------------------------- | ------------------------- | ------------------------------------------ |
| `matchSumPattern(n=6,k=3)`   | `pattern/match.ts:666`    | 120 essais recursifs + copies `Map`        |
| `nodesEqual(a, b)`           | `normal/hash.ts:165`      | 2 traversees AST → 2 chaines               |
| `mapNode(node, fn)`          | `transforms.ts:278`       | Reconstruction de tous les noeuds internes |
| `childPath` dans visitor     | `visitor.ts:817`          | 1 tableau neuf par noeud visite            |
| `mergeBindings`              | `pattern/match.ts:100`    | 1 copie `Map` par sous-match reussi        |
| `buildSimplifyRules()`       | `simplify/simplify.ts:51` | Concatenation de tableaux par appel        |
| `sortByPriority(171 regles)` | `pattern/rule.ts:488`     | Tri par invocation                         |

---

## 5. Recommandations par priorite

### Priorite 1 — Cache opt-in a activer (faible effort, gain direct)

Brancher `ParseCache` sur `parseLatex` / `parseCustom` dans les callers question-gen / correction. La primitive est prete — il suffit de l'instancier et de l'injecter. Gain : suppression de la majorite des parses redondants en session interactive.

### Priorite 2 — Memoiser `sortByPriority` et `buildSimplifyRules` (< 30 min)

```typescript
// pattern/rule.ts — avant sortByPriority
const sortCache = new WeakMap<readonly Rule[], Rule[]>();
function sortByPriority(rules: readonly Rule[]): Rule[] {
    const cached = sortCache.get(rules);
    if (cached) return cached;
    const sorted = [...rules].sort(...);
    sortCache.set(rules, sorted);
    return sorted;
}
```

Meme pattern applicable a `buildSimplifyRules` : memoiser par cle de signature d'options.

### Priorite 3 — Court-circuit ref-equality dans `mapNode` (moyen terme)

Ajouter `if (transformedChild === originalChild) continue` avant de reconstruire un noeud parent. Reduces les allocations sans changer la semantique sur les nœuds inchanges. A faire en parallele avec l'unification de `reconstructNode` / `mapNode`.

### Priorite 4 — Hash interne sur les noeuds (long terme)

Stocker `_hash?: string` sur `BaseNode`, calcule lazily a la premiere comparaison. Transforme `nodesEqual` de O(n) en O(1) pour les comparaisons repetees (fixpoint du rule engine). Impacte la factory et tous les constructeurs — chantier important.

### Profiler avant d'optimiser davantage

Les sections 2.3 a 2.7 ont un impact potentiel mais non mesure. Avant tout chantier au-dela de la priorite 2, profiler avec Node.js `--prof` ou Chrome DevTools sur un scenario reel (generation d'une serie de 50 questions, session de correction 30 expressions). Le bottleneck reel peut etre ailleurs (serialisation JSON, reactivity Svelte, rendu LaTeX MathLive).
