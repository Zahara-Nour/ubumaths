# DSL Structured Runtime Errors — Progression

> Session : 2026-05-18
> Statut : livre, ~50 builtins migres sur ~60

## Contexte

Avant cette session, les `DslRuntimeError` etaient des strings plats injectes dans `Error.message`. Le panneau d'erreur de `/construction-demo` les affichait dans un `<pre>` brut, peu lisible. Pire : quand `executor.load()` faisait sa passe de simulation pre-calcul (`calculateStepDurations`), une exception runtime cassait tout le chargement et la figure precedente restait gelee à l'ecran (le user ne voyait rien changer).

## Objectifs

1. Surfacer les erreurs runtime de maniere lisible (titres, listes de formes acceptees, hints contextuels)
2. Preserver la figure partielle quand l'execution s'arrete a mi-parcours
3. Garder la retro-compatibilite avec les ~150 sites de throws plats existants

## Architecture livree

### Couche moteur (`geometry-core/dsl/errors.ts`)

```ts
export interface DslRuntimeErrorDetails {
	summary: string;
	hint?: string;
	forms?: { syntax: string; description: string }[];
}

export class DslRuntimeError extends Error {
	readonly details: DslRuntimeErrorDetails | null;

	constructor(messageOrDetails: string | DslRuntimeErrorDetails, line: number) {
		const details = typeof messageOrDetails === 'string' ? null : messageOrDetails;
		const summary =
			typeof messageOrDetails === 'string' ? messageOrDetails : messageOrDetails.summary;
		const flat = details
			? [
					summary,
					details.hint ? `\n${details.hint}` : '',
					details.forms?.length
						? '\nFormes acceptees :\n' +
							details.forms.map((f) => `  • ${f.syntax}   ${f.description}`).join('\n')
						: ''
				].join('')
			: summary;
		super(`Ligne ${line} : ${flat}`);
		this.details = details;
	}
}
```

Le `super(...)` continue de produire un `Error.message` plat avec `summary + hint + forms` joints — assure que les tests `toThrow(/regex/)` continuent de fonctionner. Le champ `details` est lu separement par l'UI pour le rendu structure.

### Couche executor (`constructions-v2/core/executor.ts`)

`calculateStepDurations()` wrap le corps de boucle dans try/catch :

```ts
for (let i = 0; i < steps.length; i++) {
	const durationsLenBefore = durations.length;
	const phasesLenBefore = this._stepPhases.length;
	try {
		// ... existing iteration body ...
	} catch (e) {
		durations.length = durationsLenBefore;
		this._stepPhases.length = phasesLenBefore;
		const message = e instanceof Error ? e.message : String(e);
		const m = message.match(/Ligne\s+(\d+)/i);
		const details = e instanceof DslRuntimeError ? e.details : null;
		this._loadError = { message, line: m ? parseInt(m[1], 10) : null, stepIndex: i, details };
		break;
	}
}
```

Resultat : la timeline contient les durations des steps valides 0..N-1 ; l'erreur est stockee pour consommation par le caller via `executor.loadError`.

### Couche UI

**`ConstructionPlayer.svelte`** :

- Nouveau prop `onRuntimeError?: (err: RuntimeErrorInfo | null) => void`
- State `runtimeError: RuntimeErrorInfo | null` qui contient `{ message, line, stepIndex, details }`
- `loadScript` lit `executor.loadError` apres `load()` et appelle `setRuntimeError`
- `handleStepChange` catche aussi en cas d'echec ulterieur (drag manuel pendant edition)
- Sur erreur : canvas + controles restent visibles, badge `⚠ Execution interrompue` en superposition top-right (backdrop-blur-sm), figure partielle preservee via `syncState()` dans le catch

**`ScriptEditor.svelte`** :

- Prop `onRuntimeError` cable au player
- Affichage unifie dans le panneau qui existait deja sous l'editeur pour les parse errors
- Si `details` present : rendu structure (header avec ligne+etape, source line excerpt, summary + hint via `InlineFormatted`, liste de forms avec `<code>` styling)
- Si `details` absent : fallback `<pre>` brut (legacy)
- Surlignage gutter conserve sur la ligne fautive (parse + runtime cohabitent dans `parseErrorLines + runtimeError.line`)

**`InlineFormatted.svelte`** (nouveau, 50 LOC) :

- Mini-parseur regex pour backticks (`code`) et `**bold**`
- Evite de pull-in le full MarkdownRenderer (qui charge MathBlock, ImageDisplay, VariationTable, etc.)
- Reutilisable dans tout panneau qui affiche du markdown inline pour des messages courts

## Builtins migres (50/60)

### Lot 1 — Primitives de base + vecteurs (commit `8bcff578b`)

point, milieu, segment, droite, demidroite, polygone, vecteur, norme, produit_scalaire, angle_vecteurs

### Lot 2 — Operateurs de construction (commit `8bcff578b`)

intersection, point_sur, tangente, lieu, courbe, zeros, extrema, inflections, image

### Lot 3 — Annotations + transformations (commit `8bcff578b`)

texte, rtexte, mtexte, marque_angle, angle_droit, marque_segment, mesure, aire, perimetre, pente, rayon, arc, secteur, couronne, puissance, style, translation, symetrie, projection, affinite, transforme, compose, longueur, courbure

### Lot 4 — Calculus + coniques (commit `e0e4db674`)

cercle_osculateur, derivee, integrale, aire_entre, asymptotes, axes, directrice, foyers, excentricite, polaire

### Lot 5 — Misc residuel (commit `0ca030d10`)

trace, courbe (chemins internes : implicite, parametrique sans x/y, param= keyword)

## Pattern a suivre pour les futurs builtins

```ts
const NOM_FORMS = [
	{ syntax: 'nom(A, B)', description: 'description avec `inline code`' },
	{ syntax: 'nom(A, B, opt=val)', description: 'variante avec option nommee' }
];

function handleNom(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`nom()\` attend 2 arguments, ${pos.length} reçu(s).`,
				hint: "Suggestion concrete quand l'erreur est ambigue.",
				forms: NOM_FORMS
			},
			line
		);
	}
	// ... reste de la logique
}
```

Regle : `summary` est obligatoire et doit etre auto-suffisant (lu seul, ca explique le probleme). `hint` est optionnel mais devient indispensable pour les cas non-evidents. `forms` est optionnel mais fortement recommande pour les builtins a signatures multiples.

## Tests : impact

| Avant            | Apres                           |
| ---------------- | ------------------------------- |
| Tests DSL : 1617 | Tests DSL : 1617 (0 regression) |
| Tests v2 : 120   | Tests v2 : 120 (0 regression)   |

5 patterns de test relaxes pour accepter les accents francais et les backticks introduits par l'inline-code styling :

- `intersection-parametric.test.ts` G1-G3 (regex `etre|être`, `>=|≥`)
- `parametric-calculus.test.ts` E1-E2 (regex pour `t1 et t2`, `t2 doit etre superieur`)
- `transformation-objects.test.ts` (regex `necessite|centre|axe`)
- `transforme-points.test.ts` (regex `(e|é)l(e|é)ment`)
- `courbe-parametric.test.ts` D3-D4 (regex pour `équation en \`?x\`? ... \`?y\`?`)

## Commits

| Hash        | Sujet                                                              |
| ----------- | ------------------------------------------------------------------ |
| `b157885f2` | feat(constructions-v2) : UX + executor resilient + types `details` |
| `8bcff578b` | feat(geometry-core/dsl) : 30 builtins de base                      |
| `e0e4db674` | feat(geometry-core/dsl) : calculus + coniques                      |
| `0ca030d10` | feat(geometry-core/dsl) : trace + courbe + texte                   |

## Reste a faire (non urgent)

~150 throws plats restent dans `builtins.ts`. Categorie :

- **Helpers internes** (`axe: impossible de resoudre`, `axe attend un tuple de 2 points`) : utilises par plusieurs builtins, migration centrale possible
- **Compile failures profondes** (`courbe(): impossible de compiler`) : majoritairement deja faites pour les cas user-visibles
- **Edge cases parser** (`courbe(): la variable y est absente`) : rares en pratique

Pas de raison de tout migrer en un coup — le faire au cas par cas quand l'erreur est reellement vue par un utilisateur, ou lors de la prochaine session focalisee sur la qualite des messages.

## Fichiers touches

- `src/lib/geometry-core/dsl/errors.ts` (+34 lignes)
- `src/lib/geometry-core/dsl/builtins.ts` (+1300 lignes refactoring)
- `src/lib/constructions-v2/core/executor.ts` (+50 lignes)
- `src/lib/constructions-v2/components/ConstructionPlayer.svelte` (refactor UX)
- `src/lib/constructions-v2/components/ScriptEditor.svelte` (refactor UX)
- `src/lib/constructions-v2/components/InlineFormatted.svelte` (nouveau, 50 LOC)
- `src/lib/geometry-core/CLAUDE.md` (doc pattern + gotchas)
- `docs/wip/constructions-v2/progress.md` (phase 9)
