# Étude — Factorisation des cases DSL `integrale` / `aire` / `aire_entre`

> **Statut** : Phase 0 — étude, pas de code de production.
> **Décision attendue** : GO/NO-GO sur le refactor V4 + arbitrage des questions ouvertes.
> **Prompt source** : `docs/wip/geometry/prompt-refactor-area-builtins.md`

---

## 1. Résumé exécutif

Les 3 cases DSL partagent ~80 % de leur code (résolution des bornes,
analyse de continuité, appel `createIntegralArea`, warn singularité).
L'extraction d'un helper `interpretAreaBuiltin(opts)` est **recommandée** :

- **Gain mesuré** : ~280 lignes → ~120 lignes (3 cases ~10-15 lignes
  chacun + helper ~80 lignes).
- **Risque** : faible. La factory `figure.createIntegralArea` est stable
  et déjà multimode (V1/V2/V3). Le refactor concerne **uniquement
  l'orchestration au niveau DSL**.
- **Filet de sécurité** : 96 + 19 + 21 = 136 tests d'intégration verts.
- **Effort estimé** : 2-4 h pour les 4 phases.

**Verdict de l'étude** : GO recommandé, sous réserve de l'arbitrage des
questions ouvertes (§7).

---

## 2. Inventaire confirmé — différences ligne-à-ligne

Lecture directe de `src/lib/geometry-core/dsl/builtins.ts` :

- `case 'aire'` : lignes 1119-1216 (95 lignes, dont branche courbe lignes
  1127-1207 et fallback polygone lignes 1210-1215).
- `case 'integrale'` : lignes 1719-1801 (82 lignes).
- `case 'aire_entre'` : lignes 1803-1911 (108 lignes).

### 2.1 Bloc identique : `resolveBoundParam`

Les 3 cases définissent **localement** une fonction `resolveBoundParam`
qui est **mot-pour-mot identique** sauf le préfixe d'erreur :

```ts
const resolveBoundParam = (arg, name) => {
	if (arg.type === 'nombre') return { param: numeric(arg.value), numericValue: arg.value };
	if (arg.type === 'element') {
		const el = figure.getElementById(arg.figureId);
		if (!el || (el.type !== 'scalar' && el.type !== 'slider'))
			throw new DslRuntimeError(
				`<NAME>(): la borne ${name} doit etre un nombre ou un curseur/scalaire`,
				line
			);
		const v = figure.getScalarValue(arg.figureId);
		return { param: { scalarRef: arg.figureId }, numericValue: v ?? NaN };
	}
	throw new DslRuntimeError(
		`<NAME>(): la borne ${name} doit etre un nombre ou un curseur/scalaire`,
		line
	);
};
```

→ ~26 lignes × 3 = 78 lignes de duplication brute. **Cible n°1 du
refactor**.

### 2.2 Bloc identique : `getAllDiscontinuities`

```ts
const discontinuities: readonly Discontinuity[] | undefined =
  getAllDiscontinuities(<INTEGRAND>, 'x') ?? undefined;
```

Seul l'`integrand` change : `fnEl.expression` (V1, V2) vs
`subtract(fnEl.expression, gnEl.expression)` (V3).

### 2.3 Bloc identique : try/catch `createIntegralArea`

```ts
let result: { areaId: string; scalarId: string };
try {
	result = figure.createIntegralArea(fnId, lower.param, upper.param, {
		label
		/* options spécifiques au builtin */
	});
} catch (e) {
	throw new DslRuntimeError(`<NAME>(): ${e instanceof Error ? e.message : String(e)}`, line);
}
```

### 2.4 Bloc paramétré : `warnIfSingularitySuspected`

- `integrale` : 1 appel sur `fnEl.expression`, **builtin param non passé**
  (utilise le défaut `'integrale'` de la fonction — voir
  `singularity-warn.ts:327`).
- `aire` : 1 appel, builtin = `'aire'`.
- `aire_entre` : **2 appels** successifs (sur `f` puis `g`), builtin =
  `'aire_entre'` les deux fois.

### 2.5 Retour identique

```ts
return { figureId: result.scalarId, symbolType: 'scalar', styleTargetId: result.areaId };
```

### 2.6 Différences à paramétrer (tableau confirmé)

| Aspect                        | `integrale`                   | `aire` (courbe)                   | `aire_entre`                           |
| ----------------------------- | ----------------------------- | --------------------------------- | -------------------------------------- |
| Nb args                       | 3                             | 3 (overload polygone hors helper) | 4                                      |
| Validation `f`                | `requireElement` + check type | détection silencieuse             | `requireElement` + check type          |
| Validation `g`                | ❌                            | ❌                                | ✅ (idem `f`)                          |
| Préfixe erreur factory        | `'integrale():'`              | `'aire():'`                       | `'aire_entre():'`                      |
| Préfixe erreur bornes         | `'integrale():'`              | `'aire():'`                       | `'aire_entre():'`                      |
| Intégrand pour discontinuités | `f.expression`                | `f.expression`                    | `subtract(f, g)`                       |
| `signed` (factory)            | `true` (défaut)               | `false` (explicite)               | `false` (forcé par `secondFunctionId`) |
| `secondFunctionId` (factory)  | ❌                            | ❌                                | ✅ (`gnId`)                            |
| `color` (factory)             | non passé → bleu défaut       | `'#22c55e'` (vert)                | `'#fb923c'` (orange)                   |
| Nb warn singularité           | 1 sur `f`                     | 1 sur `f`                         | 2 (sur `f` puis `g`)                   |
| Nom du builtin pour le warn   | `'integrale'` (défaut)        | `'aire'`                          | `'aire_entre'`                         |

### 2.7 Singularités à préserver

- **`case 'aire'`** : la détection courbe-vs-polygone est **silencieuse** :
  si `pos.length === 3` et `pos[0]` est un élément qui n'est pas une
  function, on tombe dans la branche polygone (qui produira alors un
  message d'erreur `point1`). C'est documenté comme acceptable
  (lignes 1123-1126). **Le helper ne doit pas changer ce comportement.**
- **`integrale` n'émet pas son nom** au warn : la fonction
  `warnIfSingularitySuspected` a `'integrale'` comme défaut, donc
  l'omission est équivalente à passer `'integrale'`. Le refactor peut
  rendre le passage explicite sans changer la sortie observable.
- **Inconsistance mineure des messages** : `integrale` dit `'le premier
argument'`, `aire_entre` dit `'le 1er argument'` / `'le 2e argument'`.
  Le helper standardisera (cf Q1 §7).

---

## 3. Décisions argumentées

### 3.1 Décision 1 — Signature : Option A (objet d'options)

**Recommandation : Option A**.

```ts
interface InterpretAreaBuiltinOpts {
	name: 'integrale' | 'aire' | 'aire_entre';
	/** Fonction principale, déjà validée par l'appelant (le case sait quel
	 *  message d'erreur dialectal émettre — voir §3.2). */
	f: { id: string; element: GeoFunctionElement };
	/** Seconde fonction pour `aire_entre` ; si présente, force la mode V3
	 *  (intégrand = f − g, signed = false, secondFunctionId = g.id). */
	g?: { id: string; element: GeoFunctionElement };
	/** Bornes brutes ; le helper résout via son propre `resolveBoundParam`. */
	lowerArg: ResolvedValue;
	upperArg: ResolvedValue;
	/** Forcé à `false` quand `g` est passé (validation interne). */
	signed: boolean;
	/** `undefined` ⇒ factory défaut (bleu). */
	defaultColor?: string;
	line: number;
	label?: string;
	figure: Figure;
}

interface InterpretAreaBuiltinResult {
	figureId: string;
	symbolType: 'scalar';
	styleTargetId: string;
}

function interpretAreaBuiltin(opts: InterpretAreaBuiltinOpts): InterpretAreaBuiltinResult;
```

**Pourquoi A vs B (config table) :**

- Lisibilité au call-site : `interpretAreaBuiltin({ name: 'integrale', ... })`
  est explicite. La table B introduit une indirection mémoire mentale
  (« va chercher dans `AREA_BUILTIN_CONFIGS.integrale` ») pour un gain
  nul à 3 entrées.
- Évolutivité : un futur `aire_intersection` ajoute juste un appel à
  `interpretAreaBuiltin`, là où la table B obligerait à étendre un type
  union et compléter la table.
- TypeScript : l'union `name: 'integrale' | 'aire' | 'aire_entre'` reste
  centrale dans les deux options, mais avec A le type vit au point
  d'usage.
- Option C (classe + héritage) écartée comme prévu : pattern lourd pour
  3 différences orthogonales.

**Pourquoi des paramètres orthogonaux (`signed`, `g`) plutôt qu'un mode
discriminé** : les axes V1/V2/V3 sont effectivement orthogonaux côté
factory (`createIntegralArea` accepte `signed?` ET `secondFunctionId?`
indépendamment). Un discriminé `mode: 'signed' | 'unsigned' | 'between'`
serait redondant avec la sémantique déjà encodée par la factory.

### 3.2 Décision 2 — Validation des fonctions hors helper

**Recommandation : le helper reçoit `f` et `g` déjà validés.**

Raisons :

1. `case 'aire'` fait une **détection** silencieuse (fallthrough vers
   polygone si `pos[0]` n'est pas une function), pas une validation.
   Impossible à exprimer côté helper sans casser le contrat
   « le helper crée une aire courbe ou throw ».
2. Les messages d'erreur diffèrent entre cases (`'le premier argument
doit etre une courbe y = f(x)'` vs `'le 1er argument doit etre une
courbe y = f(x)'`). Aligner ces messages est un sujet à part (Q1).
3. Garde la responsabilité du helper sur **l'orchestration** : bornes,
   discontinuités, factory, warn, retour.

Conséquence : chaque case extérieur reste responsable de :

- Vérifier `pos.length`.
- `requireElement` + check type pour `f` (et `g` pour V3).
- Passer `{ id, element }` typé au helper.

### 3.3 Décision 3 — Mode V1/V2/V3 : paramètres orthogonaux

**Recommandation : `signed: boolean` + `g?` indépendants, mais le helper
ajoute une assertion `if (g && signed) throw`** (impossible côté DSL,
mais protège contre un futur usage interne incorrect).

Mapping aux 3 builtins :

| Builtin      | `signed` | `g`               |
| ------------ | -------- | ----------------- |
| `integrale`  | `true`   | `undefined`       |
| `aire`       | `false`  | `undefined`       |
| `aire_entre` | `false`  | `{ id, element }` |

Le helper construit l'options de `createIntegralArea` :

```ts
const options: CreateIntegralAreaOptions = {
	label: opts.label,
	signed: opts.signed,
	...(opts.g ? { secondFunctionId: opts.g.id } : {}),
	...(opts.defaultColor ? { color: opts.defaultColor } : {}),
	discontinuities
};
```

### 3.4 Décision 4 — Couleur en paramètre, pas table par nom

**Recommandation : `defaultColor?: string` passé en paramètre.**

Raisons :

- Couple le helper à la sémantique des noms si on adopte une table —
  fragile si on renomme un builtin.
- Permet à un futur `aire_intersection` de réutiliser `'#fb923c'` sans
  toucher au helper.
- Le call-site `case 'aire'` documente sa décision couleur (`'#22c55e'`
  vert avec commentaire pointant `aire-study.md §0 décision 3`), ce qui
  est plus lisible que de la chercher dans une table externe.

### 3.5 Décision 5 — Cas de bord à préserver (non négociables)

Tests de non-régression à exécuter à chaque phase :

- Erreurs DSL avec préfixe correct (`integrale():`, `aire():`,
  `aire_entre():`) — passe le `name` au helper qui le formatte.
- `aire_entre(f, f, ...)` reste valide (factory dedupe les fnIds — Q-C
  validée dans aire-entre-study).
- Args nommés (`couleur`, `opacite_fond`, `etiquette`, `remplissage`,
  `trait`, `epaisseur`) doivent traverser inchangés (ils sont gérés en
  amont par `applyInlineStyle`, hors scope helper).
- Comportement silencieux de `case 'aire'` polygone vs courbe inchangé.
- Nombre d'appels `warnIfSingularitySuspected` :
  - `integrale` : 1 (sur `f`).
  - `aire` : 1 (sur `f`).
  - `aire_entre` : 2 (sur `f` puis `g`, dans cet ordre).

---

## 4. Signature finale du helper

```ts
// src/lib/geometry-core/dsl/area-builtin-helper.ts (nouveau fichier)

import type { ResolvedValue } from './resolution';
import type { Figure } from '../graph/figure';
import type { ScalarParam } from '../types/elements';
import type { MathNode } from '$lib/mathAST/types';
// + autres imports : DslRuntimeError, numeric, getAllDiscontinuities,
//   warnIfSingularitySuspected, subtract.

export type AreaBuiltinName = 'integrale' | 'aire' | 'aire_entre';

export interface AreaBuiltinFunctionRef {
	readonly id: string;
	readonly expression: MathNode;
}

export interface InterpretAreaBuiltinOpts {
	readonly name: AreaBuiltinName;
	readonly f: AreaBuiltinFunctionRef;
	readonly g?: AreaBuiltinFunctionRef;
	readonly lowerArg: ResolvedValue;
	readonly upperArg: ResolvedValue;
	readonly signed: boolean;
	readonly defaultColor?: string;
	readonly line: number;
	readonly label?: string;
	readonly figure: Figure;
}

export interface InterpretAreaBuiltinResult {
	readonly figureId: string;
	readonly symbolType: 'scalar';
	readonly styleTargetId: string;
}

export function interpretAreaBuiltin(opts: InterpretAreaBuiltinOpts): InterpretAreaBuiltinResult;
```

**Note** : on type `f` et `g` par `{ id, expression }` plutôt que par
l'élément complet pour minimiser le couplage (le helper n'a besoin que
de `expression` pour les discontinuités et le warn ; `id` pour la
factory).

**Esquisse du corps** (pseudo-code, ~50 lignes) :

```ts
export function interpretAreaBuiltin(opts) {
	const { name, f, g, lowerArg, upperArg, signed, defaultColor, line, label, figure } = opts;

	// Garde-fou interne (ne devrait jamais arriver depuis le DSL).
	if (g && signed) throw new Error(`interpretAreaBuiltin: g + signed=true non supporté`);

	const lower = resolveBoundParam(figure, lowerArg, 'inferieure', name, line);
	const upper = resolveBoundParam(figure, upperArg, 'superieure', name, line);

	const integrand: MathNode = g ? subtract(f.expression, g.expression) : f.expression;
	const discontinuities = getAllDiscontinuities(integrand, 'x') ?? undefined;

	let result: { areaId: string; scalarId: string };
	try {
		result = figure.createIntegralArea(f.id, lower.param, upper.param, {
			label,
			signed,
			...(g ? { secondFunctionId: g.id } : {}),
			...(defaultColor ? { color: defaultColor } : {}),
			discontinuities
		});
	} catch (e) {
		throw new DslRuntimeError(`${name}(): ${e instanceof Error ? e.message : String(e)}`, line);
	}

	warnIfSingularitySuspected(f.expression, 'x', lower.numericValue, upper.numericValue, line, name);
	if (g)
		warnIfSingularitySuspected(
			g.expression,
			'x',
			lower.numericValue,
			upper.numericValue,
			line,
			name
		);

	return {
		figureId: result.scalarId,
		symbolType: 'scalar',
		styleTargetId: result.areaId
	};
}

// resolveBoundParam factorisé en module-level helper (paramètre `name`).
function resolveBoundParam(
	figure: Figure,
	arg: ResolvedValue,
	boundName: 'inferieure' | 'superieure',
	builtinName: AreaBuiltinName,
	line: number
): { param: ScalarParam; numericValue: number } {
	/* ... */
}
```

---

## 5. Plan TDD détaillé (exécutable)

### Phase 0 — Étude (ce document)

Livrable : ce fichier. **Décision attendue** : GO/NO-GO + arbitrage Q1-Q4.

### Phase 1 — Extraction du helper (ajout pur, non utilisé)

- Agent : `backend-developer` (TS/orchestration). Modèle : Sonnet (suffit).
- Fichiers créés :
  - `src/lib/geometry-core/dsl/area-builtin-helper.ts` (~80-100 lignes).
  - `src/lib/geometry-core/dsl/__tests__/area-builtin-helper.test.ts` (~10-15 tests d'isolation).
- Tests à écrire (rouge → vert) :
  1. `integrale` mode (signed=true, no g) sur courbe simple → `figureId` retourné.
  2. `aire` mode (signed=false, no g) sur courbe simple.
  3. `aire_entre` mode (signed=false, with g) sur courbes f, g.
  4. Borne nombre vs borne scalaire/slider (mix).
  5. Erreur si borne invalide → `DslRuntimeError` avec préfixe `name`.
  6. Discontinuité détectée (e.g. `1/x`) → cache passé à factory.
  7. Couleur : passée → factory reçoit ; non passée → factory défaut.
  8. `g + signed=true` → throw garde-fou.
  9. Warn `aire_entre` : 2 appels (peut être vérifié via spy si dispo).
- Validation : helper isolé, **aucun** des 3 cases DSL n'a changé.
  Tests existants (96 + 19 + 21) restent verts mécaniquement.
- Code review : `code-reviewer` (proactif, fin de phase).
- Doc de progression : `docs/wip/geometry/refactor-area-builtins-progress.md` créé/mis à jour.

### Phase 2 — Migration `case 'integrale'`

- Agent : `backend-developer`. Modèle : Sonnet.
- Fichier modifié : `builtins.ts` lignes 1719-1801.
- Avant : 82 lignes. Après : ~12 lignes (validation + appel helper).
- Tests cible : **96 tests V1 verts** (`interpreter-integrale.test.ts`).
- Vérifier en particulier :
  - Préfixe erreur `integrale():` inchangé.
  - Bornes nombre/slider inchangées.
  - Cas avec `applyInlineStyle` couleur/opacité inchangés.
- Code review + commit.

### Phase 3 — Migration `case 'aire'` (gestion overload polygone)

- Agent : `backend-developer`. Modèle : Sonnet.
- Fichier modifié : `builtins.ts` lignes 1119-1216.
- Avant : 95 lignes. Après : ~25 lignes (détection courbe-vs-polygone +
  fallback polygone inchangés ; branche courbe = appel helper).
- **Subtilité** : la détection silencieuse `pos[0].type === 'element' &&
el.type === 'function'` reste dans le case. Si match → appel helper
  avec `signed: false, defaultColor: '#22c55e'`. Sinon → fallthrough vers
  branche polygone existante.
- Tests cible : **19 tests V2** (`interpreter-aire-undercurve.test.ts`)
  - tous tests polygone existants verts.
- Code review + commit.

### Phase 4 — Migration `case 'aire_entre'`

- Agent : `backend-developer`. Modèle : Sonnet.
- Fichier modifié : `builtins.ts` lignes 1803-1911.
- Avant : 108 lignes. Après : ~18 lignes (validation `f` et `g` +
  appel helper avec `g`).
- Tests cible : **21 tests V3** (`interpreter-aire-entre.test.ts`).
- Vérifier :
  - 2 warns dans l'ordre `f` puis `g`.
  - `aire_entre(f, f, ...)` valide (factory dedupe).
  - Couleur orange par défaut, surchargeable.
- Code review + commit.

### Phase 5 — Quality checks finaux + documentation

- Agent : workflow direct (pas d'agent dédié).
- Actions :
  - `mcp__svelte__svelte-autofixer` — N/A (pas de `.svelte` modifié).
  - `pnpm check:incremental` (TS + Svelte, ~30s).
  - `npx eslint <fichiers modifiés>`.
  - `pnpm test:server src/lib/geometry-core/dsl/` (les 3 suites + helper).
  - Doc de progression finale : récapitule les 4 commits, métriques
    avant/après (lignes, tests).
- Pas de commit de doc utilisateur (refactor invisible côté DSL — le
  prompt confirme « pas de Phase démo ni doc utilisateur »).

### Récapitulatif des phases

| Phase | Effort    | Risque                  | Tests cible                  |
| ----- | --------- | ----------------------- | ---------------------------- |
| 1     | 60-90 min | Faible (ajout pur)      | helper isolé + 136 existants |
| 2     | 30 min    | Très faible             | 96 V1                        |
| 3     | 30-45 min | Moyen (overload poly)   | 19 V2 + tests polygone       |
| 4     | 30 min    | Faible (le plus récent) | 21 V3                        |
| 5     | 15-30 min | Très faible             | tous                         |

**Total estimé** : 2h45-4h.

---

## 6. Critères de succès du refactor V4

- **Zéro régression** sur les 136 tests d'intégration existants.
- **Réduction lignes** :
  - `case 'integrale'` : 82 → ~12 (gain 70).
  - `case 'aire'` (branche courbe) : 80 → ~12 (gain 68).
  - `case 'aire_entre'` : 108 → ~18 (gain 90).
  - Helper créé : ~100 lignes (incluant types + JSDoc).
  - **Net** : ~280 → ~140 lignes builtin + 100 lignes helper = 240 vs 280
    initial (gain absolu ~40 lignes), **mais bénéfice structurel** :
    - Ajout d'un futur `aire_intersection` : ~15 lignes au lieu de 95.
    - Modification du contrat factory (e.g. nouveau cache) : 1 endroit
      vs 3.
- **Lisibilité accrue** : le `case` extérieur ne fait plus que valider
  ses arguments et déléguer.

---

## 7. Questions ouvertes (à arbitrer avant Phase 1)

### Q1 — Aligner les messages d'erreur de validation `f` et `g` ?

`integrale` dit `'le premier argument doit etre une courbe y = f(x)'`,
`aire_entre` dit `'le 1er argument...'` / `'le 2e argument...'`.
**Proposition** : aligner sur `'le 1er argument'` / `'le 2e argument'`
(plus court, déjà utilisé par le builtin le plus récent). Impact : 1 test
V1 à mettre à jour si l'assertion porte sur le message exact.

**À trancher** : on aligne (et on accepte 1-2 mises à jour de tests) ou on
laisse l'inconsistance ?

### Q2 — Le helper expose-t-il `resolveBoundParam` publiquement ?

Argument pour : un futur builtin de bornes-points (`aire_entre_courbes(f,
g, P1, P2)`) pourrait réutiliser. Argument contre : YAGNI, fonction
interne pour l'instant.

**Proposition** : interne au module pour Phase 1-4. Promotion publique
quand un 4e builtin la demandera.

### Q3 — Garde-fou `g + signed=true` : throw ou ignore ?

Le helper peut soit throw (rapide mais expose une erreur non-DSL si jamais
appelé incorrectement), soit forcer silencieusement `signed = false`
quand `g` est passé.

**Proposition** : throw avec un message clair `interpretAreaBuiltin:
g + signed=true non supporté` (assertion interne, pas un `DslRuntimeError`
— c'est un bug d'appelant, pas une erreur utilisateur).

### Q4 — Faut-il typer `f.element` ou juste exposer `expression` ?

**Proposition (déjà arbitrée §4)** : exposer `{ id, expression }`,
minimiser le couplage. Si un futur besoin d'`element` complet émerge
(e.g. lire `el.parameterRange`), on étend l'interface à ce moment.

**Confirmer** ou demander une signature plus large d'emblée ?

---

## 8. Cas non couverts par cette étude (hors scope V4)

- **`aire_intersection`** (intersection de deux régions sous-courbe) —
  futur, le helper devra peut-être accepter un paramètre `mode` ou un
  callback de pré-traitement de l'intégrand. À voir si nécessaire.
- **Bornes-points** (passer un `Point` au lieu d'un nombre/scalaire) —
  futur, modifierait `resolveBoundParam`.
- **Refactor de la factory `createIntegralArea`** — explicitement hors
  scope (la factory est stable et déjà multimode).
- **Refactor des `applyInlineStyle` / args nommés** — orthogonal, géré
  en amont des cases.

---

## 9. Références code (consultées pour l'étude)

```
src/lib/geometry-core/dsl/builtins.ts            (lignes 1119-1216, 1719-1801, 1803-1911)
src/lib/geometry-core/dsl/singularity-warn.ts    (warnIfSingularitySuspected, getAllDiscontinuities, signature builtin param)
```

Non consultés (hors scope explicite) :

```
src/lib/geometry-core/graph/figure.ts            (createIntegralArea — stable, multimode)
src/lib/mathAST/                                 (subtract, types — utilisé tel quel)
src/lib/geometry-core/types/elements.ts          (ScalarParam, GeoFunction — types stables)
```

---

## 10. Décision attendue de l'utilisateur

**GO** pour Phase 1 si :

- [ ] Q1 tranchée (aligner les messages ? oui/non).
- [ ] Q3 confirmée (throw assertion interne ? oui/non).
- [ ] Q4 confirmée (signature `{ id, expression }` minimaliste ? oui/non).
- [ ] Q2 acceptée par défaut (helper interne au module).

**NO-GO** si :

- L'utilisateur préfère reporter (e.g. attendre un 4e builtin pour mieux
  cerner l'abstraction).
- L'utilisateur préfère une signature différente (à proposer en
  contre-recommandation).
