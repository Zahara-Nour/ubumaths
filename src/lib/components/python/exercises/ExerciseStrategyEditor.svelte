<script lang="ts">
	/**
	 * Editor for the new ValidationConfig shape (`{ ast_requirements?,
	 * behavior?, timeout_ms? }`). Two independent panels — "Forme du code"
	 * (AST checks) and "Comportement attendu" (output / unit_test) — each can
	 * be enabled or disabled separately, and at least one is required (server
	 * Zod refine catches the empty case; we surface inline guidance here).
	 */

	import type { ASTRequirement, BehaviorCheck, OutputComparison } from '$lib/shared/python';
	import type { ValidationConfig } from '$lib/types/python-exercises';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from '@lucide/svelte';
	import ASTRequirementsPanel from './ASTRequirementsPanel.svelte';

	type Props = {
		config: ValidationConfig;
	};

	let { config = $bindable() }: Props = $props();

	// ===========================================================================
	// AST toggle
	// ===========================================================================

	const astEnabled = $derived(Boolean(config.ast_requirements?.length));

	function toggleAst(checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') return;
		if (checked) {
			config = {
				...config,
				ast_requirements: [{ type: 'uses_loop', message: 'Tu dois utiliser une boucle' }]
			};
		} else {
			const { ast_requirements: _drop, ...rest } = config;
			void _drop;
			config = rest;
		}
	}

	// ===========================================================================
	// Behavior selector
	// ===========================================================================

	type BehaviorChoice = 'none' | 'output' | 'unit_test' | 'variable_check' | 'reference_solution';

	const behaviorChoiceItems: { value: BehaviorChoice; label: string }[] = [
		{ value: 'none', label: 'Aucun' },
		{ value: 'output', label: 'Sortie stdout' },
		{ value: 'unit_test', label: 'Test de fonction' },
		{ value: 'variable_check', label: 'Valeurs de variables' },
		{ value: 'reference_solution', label: 'Solution de référence' }
	];

	const behaviorChoice = $derived<BehaviorChoice>(config.behavior?.kind ?? 'none');

	const PY_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

	function setBehaviorChoice(choice: string) {
		const next = choice as BehaviorChoice;
		if (next === behaviorChoice) return;
		if (next === 'none') {
			const { behavior: _drop, ...rest } = config;
			void _drop;
			config = rest;
			return;
		}
		if (next === 'output') {
			config = {
				...config,
				behavior: {
					kind: 'output',
					test_cases: [{ input: '', expected_output: '' }],
					comparison: { kind: 'exact' }
				}
			};
			return;
		}
		if (next === 'unit_test') {
			config = {
				...config,
				behavior: {
					kind: 'unit_test',
					function_name: '',
					test_cases: [{ args: [], expected: null }]
				}
			};
			unitDrafts = [{ args: '[]', expected: 'null' }];
			return;
		}
		if (next === 'variable_check') {
			config = {
				...config,
				behavior: {
					kind: 'variable_check',
					expected_vars: { x: 0 }
				}
			};
			varDrafts = [{ name: 'x', valueDraft: '0' }];
			return;
		}
		// reference_solution — start with one fixed case so the form is
		// immediately submittable; the teacher can toggle the generator
		// section on once they've written their reference_code.
		config = {
			...config,
			behavior: {
				kind: 'reference_solution',
				function_name: '',
				reference_code: '',
				fixed: {
					cases: [{ args: [], expected: null }]
				}
			}
		};
		refFixedDrafts = [{ args: '[]', expected: 'null' }];
	}

	// ===========================================================================
	// Output comparison preset logic (unchanged from previous editor)
	// ===========================================================================

	type PresetKey =
		| 'exact'
		| 'text-collapsed'
		| 'text-ci'
		| 'numeric-tight'
		| 'numeric-medium'
		| 'numeric-loose'
		| 'numeric-lines'
		| 'custom-python'
		| 'custom';

	const comparisonPresetItems: { value: PresetKey; label: string }[] = [
		{ value: 'exact', label: 'Exact (octet par octet)' },
		{ value: 'text-collapsed', label: 'Texte (espaces souples)' },
		{ value: 'text-ci', label: 'Texte (ignorant la casse)' },
		{ value: 'numeric-tight', label: 'Nombres (précis, 1e-9)' },
		{ value: 'numeric-medium', label: 'Nombres (1e-6)' },
		{ value: 'numeric-loose', label: 'Nombres (large, 1e-3)' },
		{ value: 'numeric-lines', label: 'Tableau de nombres (ligne par ligne)' },
		{ value: 'custom-python', label: 'Comparateur Python (avancé)' },
		{ value: 'custom', label: 'Personnaliser…' }
	];

	const DEFAULT_CUSTOM_COMPARATOR_CODE = `def compare(expected, actual, stdin):
    """Retourne True si la sortie de l'élève est valide, False sinon.

    Optionnel : retourne un dict {'passed': bool, 'diff': str} pour un
    retour détaillé qui sera affiché à l'élève (sauf si le test est caché).

    - expected : la sortie attendue (str)
    - actual   : la sortie produite par l'élève (str)
    - stdin    : l'entrée du test case (str)
    """
    return actual.strip() == expected.strip()
`;

	const kindItems: { value: 'exact' | 'text' | 'numeric'; label: string }[] = [
		{ value: 'exact', label: 'Exact' },
		{ value: 'text', label: 'Texte' },
		{ value: 'numeric', label: 'Numérique' }
	];

	const whitespaceItems: { value: 'strict' | 'collapsed' | 'lines'; label: string }[] = [
		{ value: 'strict', label: 'Strict' },
		{ value: 'collapsed', label: 'Espaces écrasés' },
		{ value: 'lines', label: 'Ligne par ligne, trim' }
	];

	const shapeItems: { value: 'flat' | 'lines' | 'grid'; label: string }[] = [
		{ value: 'flat', label: 'À plat' },
		{ value: 'lines', label: 'Une valeur par ligne' },
		{ value: 'grid', label: 'Grille rectangulaire' }
	];

	const nonNumericItems: { value: 'match' | 'ignore'; label: string }[] = [
		{ value: 'match', label: 'Doivent correspondre' },
		{ value: 'ignore', label: 'Ignorés' }
	];

	const presetToComparison: Record<Exclude<PresetKey, 'custom'>, OutputComparison> = {
		exact: { kind: 'exact' },
		'text-collapsed': { kind: 'text', whitespace: 'collapsed', trim_trailing_newline: true },
		'text-ci': {
			kind: 'text',
			whitespace: 'collapsed',
			case_insensitive: true,
			trim_trailing_newline: true
		},
		'numeric-tight': { kind: 'numeric', shape: 'flat', eps_abs: 1e-9, eps_rel: 1e-9 },
		'numeric-medium': { kind: 'numeric', shape: 'flat', eps_abs: 1e-6, eps_rel: 1e-6 },
		'numeric-loose': { kind: 'numeric', shape: 'flat', eps_abs: 1e-3, eps_rel: 1e-3 },
		'numeric-lines': { kind: 'numeric', shape: 'lines', eps_abs: 1e-6, eps_rel: 1e-6 },
		'custom-python': { kind: 'custom', code: DEFAULT_CUSTOM_COMPARATOR_CODE, timeout_ms: 2000 }
	};

	function detectPreset(cmp: OutputComparison): PresetKey {
		if (cmp.kind === 'custom') return 'custom-python';
		if (cmp.kind === 'exact') return 'exact';

		if (cmp.kind === 'text') {
			const { whitespace, case_insensitive, trim_trailing_newline } = cmp;
			if (
				whitespace === 'collapsed' &&
				case_insensitive === true &&
				trim_trailing_newline === true
			) {
				return 'text-ci';
			}
			if (whitespace === 'collapsed' && !case_insensitive && trim_trailing_newline === true) {
				return 'text-collapsed';
			}
			return 'custom';
		}

		if (cmp.kind === 'numeric') {
			const { shape, eps_abs, eps_rel, non_numeric, accept_comma_decimal } = cmp;
			if (non_numeric !== undefined || accept_comma_decimal !== undefined) return 'custom';
			if (shape === 'flat' && eps_abs === 1e-9 && eps_rel === 1e-9) return 'numeric-tight';
			if (shape === 'flat' && eps_abs === 1e-6 && eps_rel === 1e-6) return 'numeric-medium';
			if (shape === 'flat' && eps_abs === 1e-3 && eps_rel === 1e-3) return 'numeric-loose';
			if (shape === 'lines' && eps_abs === 1e-6 && eps_rel === 1e-6) return 'numeric-lines';
			return 'custom';
		}

		return 'custom';
	}

	function isOutputBehavior(
		b: BehaviorCheck | undefined
	): b is Extract<BehaviorCheck, { kind: 'output' }> {
		return b?.kind === 'output';
	}

	function isUnitTestBehavior(
		b: BehaviorCheck | undefined
	): b is Extract<BehaviorCheck, { kind: 'unit_test' }> {
		return b?.kind === 'unit_test';
	}

	function isVariableCheckBehavior(
		b: BehaviorCheck | undefined
	): b is Extract<BehaviorCheck, { kind: 'variable_check' }> {
		return b?.kind === 'variable_check';
	}

	function isReferenceSolutionBehavior(
		b: BehaviorCheck | undefined
	): b is Extract<BehaviorCheck, { kind: 'reference_solution' }> {
		return b?.kind === 'reference_solution';
	}

	function updateOutputBehavior(
		mutator: (
			b: Extract<BehaviorCheck, { kind: 'output' }>
		) => Extract<BehaviorCheck, { kind: 'output' }>
	) {
		if (!isOutputBehavior(config.behavior)) return;
		config = { ...config, behavior: mutator(config.behavior) };
	}

	function updateUnitTestBehavior(
		mutator: (
			b: Extract<BehaviorCheck, { kind: 'unit_test' }>
		) => Extract<BehaviorCheck, { kind: 'unit_test' }>
	) {
		if (!isUnitTestBehavior(config.behavior)) return;
		config = { ...config, behavior: mutator(config.behavior) };
	}

	function updateVariableCheckBehavior(
		mutator: (
			b: Extract<BehaviorCheck, { kind: 'variable_check' }>
		) => Extract<BehaviorCheck, { kind: 'variable_check' }>
	) {
		if (!isVariableCheckBehavior(config.behavior)) return;
		config = { ...config, behavior: mutator(config.behavior) };
	}

	function updateReferenceSolutionBehavior(
		mutator: (
			b: Extract<BehaviorCheck, { kind: 'reference_solution' }>
		) => Extract<BehaviorCheck, { kind: 'reference_solution' }>
	) {
		if (!isReferenceSolutionBehavior(config.behavior)) return;
		config = { ...config, behavior: mutator(config.behavior) };
	}

	// Placeholders extracted to constants so the textarea placeholder
	// attribute can preserve real newlines and escaped quotes without
	// tripping svelte/no-useless-mustaches on a literal-string interpolation.
	const REF_CODE_PLACEHOLDER =
		'def mediane(L):\n    L = sorted(L)\n    n = len(L)\n    if n % 2:\n        return L[n // 2]\n    return (L[n // 2 - 1] + L[n // 2]) / 2';
	const REF_GEN_CODE_PLACEHOLDER = '(__import__("random").randint(0, 100),)';

	function handlePresetChange(value: string) {
		if (value === 'custom') return; // keep current comparison, open panel
		const preset = value as Exclude<PresetKey, 'custom'>;
		updateOutputBehavior((b) => ({ ...b, comparison: { ...presetToComparison[preset] } }));
	}

	function setKind(kind: 'exact' | 'text' | 'numeric') {
		updateOutputBehavior((b) => {
			let comparison: OutputComparison;
			if (kind === 'exact') comparison = { kind: 'exact' };
			else if (kind === 'text')
				comparison = { kind: 'text', whitespace: 'collapsed', trim_trailing_newline: true };
			else comparison = { kind: 'numeric', shape: 'flat', eps_abs: 1e-6, eps_rel: 1e-6 };
			return { ...b, comparison };
		});
	}

	function setCustomCode(code: string) {
		updateOutputBehavior((b) => {
			if (b.comparison.kind !== 'custom') return b;
			return { ...b, comparison: { ...b.comparison, code } };
		});
	}

	function setCustomTimeout(timeoutMs: number) {
		updateOutputBehavior((b) => {
			if (b.comparison.kind !== 'custom') return b;
			return { ...b, comparison: { ...b.comparison, timeout_ms: timeoutMs } };
		});
	}

	function addOutputCase() {
		updateOutputBehavior((b) => ({
			...b,
			test_cases: [...b.test_cases, { input: '', expected_output: '' }]
		}));
	}

	function removeOutputCase(i: number) {
		updateOutputBehavior((b) => {
			if (b.test_cases.length <= 1) return b;
			return { ...b, test_cases: b.test_cases.filter((_, idx) => idx !== i) };
		});
	}

	// ===========================================================================
	// unit_test JSON drafts (parse on blur, surface inline error)
	// ===========================================================================

	// Initialize synchronously from the initial config so that the first render
	// already has matching draft entries for each test_case (otherwise the
	// {#each utBehavior.test_cases} loop binds against unitDrafts[i].args before
	// onMount populates the array — TypeError on edit page).
	let unitDrafts: { args: string; expected: string; argsErr?: string; expectedErr?: string }[] =
		$state(
			isUnitTestBehavior(config.behavior)
				? config.behavior.test_cases.map((tc) => ({
						args: JSON.stringify(tc.args),
						expected: JSON.stringify(tc.expected)
					}))
				: []
		);

	function commitUnitDraft(i: number) {
		if (!isUnitTestBehavior(config.behavior)) return;
		const d = unitDrafts[i];
		let argsErr: string | undefined;
		let expectedErr: string | undefined;

		let parsedArgs: unknown[] | null = null;
		try {
			const v = JSON.parse(d.args);
			if (!Array.isArray(v)) throw new Error('args doit être un tableau JSON, ex: [1, 2]');
			parsedArgs = v;
		} catch (e) {
			argsErr = e instanceof Error ? e.message : String(e);
		}

		let parsedExpected: unknown = undefined;
		let expectedOk = false;
		try {
			parsedExpected = JSON.parse(d.expected);
			expectedOk = true;
		} catch (e) {
			expectedErr = e instanceof Error ? e.message : String(e);
		}

		unitDrafts[i] = { ...d, argsErr, expectedErr };

		if (parsedArgs !== null && expectedOk) {
			updateUnitTestBehavior((b) => {
				const updated = [...b.test_cases];
				updated[i] = { ...updated[i], args: parsedArgs as unknown[], expected: parsedExpected };
				return { ...b, test_cases: updated };
			});
		}
	}

	function addUnitCase() {
		updateUnitTestBehavior((b) => ({
			...b,
			test_cases: [...b.test_cases, { args: [], expected: null }]
		}));
		unitDrafts = [...unitDrafts, { args: '[]', expected: 'null' }];
	}

	function removeUnitCase(i: number) {
		updateUnitTestBehavior((b) => {
			if (b.test_cases.length <= 1) return b;
			return { ...b, test_cases: b.test_cases.filter((_, idx) => idx !== i) };
		});
		unitDrafts = unitDrafts.filter((_, idx) => idx !== i);
	}

	// ===========================================================================
	// variable_check drafts — one row per `(name, value-as-JSON)`. The committed
	// `expected_vars` Record is rebuilt from the drafts on every commit (so a
	// rename or value edit replaces the previous entry). Rows whose name fails
	// the Python-identifier check, whose value fails JSON parsing, or that
	// collide with another row are silently excluded from the rebuilt Record
	// — the inline error tells the teacher why.
	// ===========================================================================

	let varDrafts: {
		name: string;
		valueDraft: string;
		nameErr?: string;
		valueErr?: string;
	}[] = $state(
		isVariableCheckBehavior(config.behavior)
			? Object.entries(config.behavior.expected_vars).map(([name, value]) => ({
					name,
					valueDraft: JSON.stringify(value)
				}))
			: []
	);

	function rebuildExpectedVars(): Record<string, unknown> | null {
		const out: Record<string, unknown> = {};
		for (const d of varDrafts) {
			if (!PY_IDENTIFIER_RE.test(d.name)) continue;
			if (Object.prototype.hasOwnProperty.call(out, d.name)) continue;
			try {
				out[d.name] = JSON.parse(d.valueDraft);
			} catch {
				continue;
			}
		}
		// Schema requires at least one valid entry; surface the empty case to
		// callers by returning null rather than committing an invalid config.
		return Object.keys(out).length > 0 ? out : null;
	}

	function commitVarDraft(i: number) {
		if (!isVariableCheckBehavior(config.behavior)) return;
		const d = varDrafts[i];
		let nameErr: string | undefined;
		let valueErr: string | undefined;

		if (d.name.length === 0) {
			nameErr = 'Nom requis';
		} else if (!PY_IDENTIFIER_RE.test(d.name)) {
			nameErr = 'Nom de variable Python invalide';
		} else if (varDrafts.some((dd, idx) => idx !== i && dd.name === d.name)) {
			nameErr = 'Nom déjà utilisé';
		}

		try {
			JSON.parse(d.valueDraft);
		} catch (e) {
			valueErr = e instanceof Error ? e.message : String(e);
		}

		varDrafts[i] = { ...d, nameErr, valueErr };

		const newVars = rebuildExpectedVars();
		if (newVars !== null) {
			updateVariableCheckBehavior((b) => ({ ...b, expected_vars: newVars }));
		}
	}

	function addVarEntry() {
		// Start with `valueDraft: 'null'` so JSON.parse succeeds out of the box
		// — the teacher only has to fill in the name, value can stay `null`
		// if that genuinely is what they expect (e.g. `x = None`).
		varDrafts = [...varDrafts, { name: '', valueDraft: 'null' }];
	}

	function removeVarEntry(i: number) {
		if (varDrafts.length <= 1) return;
		varDrafts = varDrafts.filter((_, idx) => idx !== i);
		const newVars = rebuildExpectedVars();
		if (newVars !== null) {
			updateVariableCheckBehavior((b) => ({ ...b, expected_vars: newVars }));
		}
	}

	// ===========================================================================
	// reference_solution drafts. Same JSON-on-blur pattern as unit_test for
	// the `fixed.cases` rows. The generator block uses raw inputs (no JSON
	// drafts): code is Python source, count and seed are numeric inputs.
	// ===========================================================================

	let refFixedDrafts: {
		args: string;
		expected: string;
		argsErr?: string;
		expectedErr?: string;
	}[] = $state(
		isReferenceSolutionBehavior(config.behavior) && config.behavior.fixed
			? config.behavior.fixed.cases.map((tc) => ({
					args: JSON.stringify(tc.args),
					expected: JSON.stringify(tc.expected)
				}))
			: []
	);

	function commitRefFixedDraft(i: number) {
		if (!isReferenceSolutionBehavior(config.behavior)) return;
		const d = refFixedDrafts[i];
		let argsErr: string | undefined;
		let expectedErr: string | undefined;

		let parsedArgs: unknown[] | null = null;
		try {
			const v = JSON.parse(d.args);
			if (!Array.isArray(v)) throw new Error('args doit être un tableau JSON, ex: [1, 2]');
			parsedArgs = v;
		} catch (e) {
			argsErr = e instanceof Error ? e.message : String(e);
		}

		let parsedExpected: unknown = undefined;
		let expectedOk = false;
		try {
			parsedExpected = JSON.parse(d.expected);
			expectedOk = true;
		} catch (e) {
			expectedErr = e instanceof Error ? e.message : String(e);
		}

		refFixedDrafts[i] = { ...d, argsErr, expectedErr };

		if (parsedArgs !== null && expectedOk) {
			updateReferenceSolutionBehavior((b) => {
				const updated = [...(b.fixed?.cases ?? [])];
				updated[i] = {
					...updated[i],
					args: parsedArgs as unknown[],
					expected: parsedExpected
				};
				return { ...b, fixed: { cases: updated } };
			});
		}
	}

	function addRefFixedCase() {
		updateReferenceSolutionBehavior((b) => ({
			...b,
			fixed: {
				cases: [...(b.fixed?.cases ?? []), { args: [], expected: null }]
			}
		}));
		refFixedDrafts = [...refFixedDrafts, { args: '[]', expected: 'null' }];
	}

	function removeRefFixedCase(i: number) {
		updateReferenceSolutionBehavior((b) => {
			const cases = b.fixed?.cases ?? [];
			if (cases.length <= 1) return b;
			return { ...b, fixed: { cases: cases.filter((_, idx) => idx !== i) } };
		});
		refFixedDrafts = refFixedDrafts.filter((_, idx) => idx !== i);
	}

	// "Activer les cas fixes" toggle — preserves whatever drafts existed
	// before turning off (so toggling back on doesn't wipe the teacher's
	// work). When turning off, removes `fixed` from the config; when on,
	// re-adds `fixed.cases` with a fresh empty case if none was kept.
	const refFixedEnabled = $derived(
		isReferenceSolutionBehavior(config.behavior) && config.behavior.fixed !== undefined
	);

	function toggleRefFixed(checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') return;
		if (!isReferenceSolutionBehavior(config.behavior)) return;
		if (checked) {
			updateReferenceSolutionBehavior((b) => ({
				...b,
				fixed: b.fixed ?? { cases: [{ args: [], expected: null }] }
			}));
			if (refFixedDrafts.length === 0) {
				refFixedDrafts = [{ args: '[]', expected: 'null' }];
			}
		} else {
			updateReferenceSolutionBehavior((b) => {
				const { fixed: _drop, ...rest } = b;
				void _drop;
				return rest as Extract<BehaviorCheck, { kind: 'reference_solution' }>;
			});
		}
	}

	const refGeneratorEnabled = $derived(
		isReferenceSolutionBehavior(config.behavior) && config.behavior.generator !== undefined
	);

	function toggleRefGenerator(checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') return;
		if (!isReferenceSolutionBehavior(config.behavior)) return;
		if (checked) {
			updateReferenceSolutionBehavior((b) => ({
				...b,
				generator: b.generator ?? {
					code: '(__import__("random").randint(0, 100),)',
					count: 20,
					seed: 42
				}
			}));
		} else {
			updateReferenceSolutionBehavior((b) => {
				const { generator: _drop, ...rest } = b;
				void _drop;
				return rest as Extract<BehaviorCheck, { kind: 'reference_solution' }>;
			});
		}
	}

	// At least one of the two subsections must be active. Surfaced as an
	// inline warning (the server Zod refine catches the empty case too).
	const refSubsectionsOk = $derived(
		!isReferenceSolutionBehavior(config.behavior) || refFixedEnabled || refGeneratorEnabled
	);

	// ===========================================================================
	// Bindable wrapper for AST requirements (so the panel can $bindable)
	// ===========================================================================

	function setAstRequirements(next: ASTRequirement[]) {
		config = { ...config, ast_requirements: next };
	}

	const selectedPreset = $derived(
		isOutputBehavior(config.behavior)
			? detectPreset(config.behavior.comparison)
			: ('exact' as PresetKey)
	);

	// Validation hint for the parent: at least one of the two layers must be active.
	const hasAtLeastOneLayer = $derived(astEnabled || behaviorChoice !== 'none');
</script>

<div class="space-y-6">
	<!-- ============================================================== AST -->
	<fieldset class="space-y-3 rounded-md border border-border p-4">
		<legend class="px-2 text-base font-semibold">Forme du code</legend>
		<MyCheckbox
			checked={astEnabled}
			onCheckedChange={toggleAst}
			label="Activer les vérifications de forme (AST)"
		/>
		{#if astEnabled && config.ast_requirements}
			<p class="text-xs text-muted-foreground">
				Le code de l'élève est analysé sans être exécuté. Si une exigence n'est pas remplie, le
				comportement attendu n'est pas testé.
			</p>
			<ASTRequirementsPanel requirements={config.ast_requirements} onchange={setAstRequirements} />
		{/if}
	</fieldset>

	<!-- ============================================================== Behavior -->
	<fieldset class="space-y-3 rounded-md border border-border p-4">
		<legend class="px-2 text-base font-semibold">Comportement attendu</legend>
		<div>
			<label class="mb-1 block text-sm font-medium" for="behavior-kind">Type</label>
			<MySelect
				id="behavior-kind"
				items={behaviorChoiceItems}
				value={behaviorChoice}
				onchange={setBehaviorChoice}
			/>
		</div>

		<!-- ............................................................. output -->
		{#if isOutputBehavior(config.behavior)}
			{@const outputBehavior = config.behavior}
			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium" for="comparison-preset">Comparaison</label>
					<MySelect
						id="comparison-preset"
						items={comparisonPresetItems}
						value={selectedPreset}
						onchange={handlePresetChange}
					/>
				</div>

				{#if selectedPreset === 'custom-python' && outputBehavior.comparison.kind === 'custom'}
					{@const customCmp = outputBehavior.comparison}
					<div class="space-y-3 rounded-md border border-border bg-muted/30 p-4">
						<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							Comparateur Python (avancé)
						</p>
						<p class="text-xs text-muted-foreground">
							Définis une fonction <code>compare(expected, actual, stdin)</code> qui retourne
							<code>True</code>/<code>False</code> ou un dict
							<code>&lbrace;'passed': bool, 'diff'?: str&rbrace;</code>. Elle s'exécute dans Pyodide
							pour chaque cas de test, dans un namespace isolé.
						</p>
						<div>
							<label class="mb-1 block text-sm font-medium" for="cmp-custom-code">
								Code Python du comparateur
							</label>
							<textarea
								id="cmp-custom-code"
								class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
								rows="14"
								value={customCmp.code}
								oninput={(e) => setCustomCode((e.target as HTMLTextAreaElement).value)}
							></textarea>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium" for="cmp-custom-timeout">
								Délai d'exécution maximum par cas (ms)
							</label>
							<Input
								id="cmp-custom-timeout"
								type="number"
								min="100"
								max="10000"
								step="100"
								value={customCmp.timeout_ms ?? 2000}
								oninput={(e) => {
									const v = parseInt((e.target as HTMLInputElement).value, 10);
									if (!isNaN(v) && v >= 100 && v <= 10000) setCustomTimeout(v);
								}}
							/>
						</div>
					</div>
				{/if}

				{#if selectedPreset === 'custom'}
					<div class="space-y-4 rounded-md border border-border bg-muted/30 p-4">
						<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							Configuration personnalisée
						</p>

						<div>
							<label class="mb-1 block text-sm font-medium" for="cmp-kind">Type</label>
							<MySelect
								id="cmp-kind"
								items={kindItems}
								value={outputBehavior.comparison.kind}
								onchange={(v: string) => setKind(v as 'exact' | 'text' | 'numeric')}
							/>
						</div>

						{#if outputBehavior.comparison.kind === 'text'}
							{@const textCmp = outputBehavior.comparison}
							<div>
								<label class="mb-1 block text-sm font-medium" for="cmp-whitespace">Whitespace</label
								>
								<MySelect
									id="cmp-whitespace"
									items={whitespaceItems}
									value={textCmp.whitespace}
									onchange={(v: string) =>
										updateOutputBehavior((b) =>
											b.comparison.kind === 'text'
												? {
														...b,
														comparison: {
															...b.comparison,
															whitespace: v as 'strict' | 'collapsed' | 'lines'
														}
													}
												: b
										)}
								/>
							</div>
							<MyCheckbox
								checked={textCmp.case_insensitive ?? false}
								onCheckedChange={(v) =>
									v !== 'indeterminate' &&
									updateOutputBehavior((b) =>
										b.comparison.kind === 'text'
											? { ...b, comparison: { ...b.comparison, case_insensitive: v } }
											: b
									)}
								label="Ignorer la casse"
							/>
							<MyCheckbox
								checked={textCmp.trim_trailing_newline ?? false}
								onCheckedChange={(v) =>
									v !== 'indeterminate' &&
									updateOutputBehavior((b) =>
										b.comparison.kind === 'text'
											? { ...b, comparison: { ...b.comparison, trim_trailing_newline: v } }
											: b
									)}
								label="Tolérer le saut de ligne final"
							/>
						{/if}

						{#if outputBehavior.comparison.kind === 'numeric'}
							{@const numCmp = outputBehavior.comparison}
							<div>
								<label class="mb-1 block text-sm font-medium" for="cmp-shape">Forme</label>
								<MySelect
									id="cmp-shape"
									items={shapeItems}
									value={numCmp.shape}
									onchange={(v: string) =>
										updateOutputBehavior((b) =>
											b.comparison.kind === 'numeric'
												? {
														...b,
														comparison: {
															...b.comparison,
															shape: v as 'flat' | 'lines' | 'grid'
														}
													}
												: b
										)}
								/>
							</div>
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label class="mb-1 block text-sm font-medium" for="cmp-eps-abs">
										Tolérance absolue (eps_abs)
									</label>
									<Input
										id="cmp-eps-abs"
										type="number"
										step="any"
										value={numCmp.eps_abs}
										oninput={(e) => {
											const v = parseFloat((e.target as HTMLInputElement).value);
											if (!isNaN(v))
												updateOutputBehavior((b) =>
													b.comparison.kind === 'numeric'
														? { ...b, comparison: { ...b.comparison, eps_abs: v } }
														: b
												);
										}}
									/>
								</div>
								<div>
									<label class="mb-1 block text-sm font-medium" for="cmp-eps-rel">
										Tolérance relative (eps_rel)
									</label>
									<Input
										id="cmp-eps-rel"
										type="number"
										step="any"
										value={numCmp.eps_rel}
										oninput={(e) => {
											const v = parseFloat((e.target as HTMLInputElement).value);
											if (!isNaN(v))
												updateOutputBehavior((b) =>
													b.comparison.kind === 'numeric'
														? { ...b, comparison: { ...b.comparison, eps_rel: v } }
														: b
												);
										}}
									/>
								</div>
							</div>
							<div>
								<label class="mb-1 block text-sm font-medium" for="cmp-non-numeric">
									Tokens non numériques
								</label>
								<MySelect
									id="cmp-non-numeric"
									items={nonNumericItems}
									value={numCmp.non_numeric ?? 'match'}
									onchange={(v: string) =>
										updateOutputBehavior((b) =>
											b.comparison.kind === 'numeric'
												? {
														...b,
														comparison: {
															...b.comparison,
															non_numeric: v as 'match' | 'ignore'
														}
													}
												: b
										)}
								/>
							</div>
							<MyCheckbox
								checked={numCmp.accept_comma_decimal ?? false}
								onCheckedChange={(v) =>
									v !== 'indeterminate' &&
									updateOutputBehavior((b) =>
										b.comparison.kind === 'numeric'
											? { ...b, comparison: { ...b.comparison, accept_comma_decimal: v } }
											: b
									)}
								label="Accepter la virgule comme séparateur décimal"
							/>
						{/if}

						{#if outputBehavior.comparison.kind === 'exact'}
							<p class="text-sm text-muted-foreground">Aucune option à configurer.</p>
						{/if}
					</div>
				{/if}

				<div class="space-y-2">
					{#each outputBehavior.test_cases as testCase, i (i)}
						<div class="rounded-md border border-border p-3">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Cas de test {i + 1}</span>
								<div class="flex items-center gap-3">
									<MyCheckbox
										checked={testCase.hidden ?? false}
										onCheckedChange={(v) =>
											v !== 'indeterminate' &&
											updateOutputBehavior((b) => {
												const updated = [...b.test_cases];
												updated[i] = { ...updated[i], hidden: v };
												return { ...b, test_cases: updated };
											})}
										label="Caché"
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => removeOutputCase(i)}
										disabled={outputBehavior.test_cases.length <= 1}
										aria-label="Supprimer le cas {i + 1}"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div class="grid gap-2 sm:grid-cols-2">
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="case-input-{i}">
										Entrée stdin (optionnel)
									</label>
									<textarea
										id="case-input-{i}"
										class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
										rows="2"
										value={testCase.input}
										oninput={(e) =>
											updateOutputBehavior((b) => {
												const updated = [...b.test_cases];
												updated[i] = {
													...updated[i],
													input: (e.target as HTMLTextAreaElement).value
												};
												return { ...b, test_cases: updated };
											})}
									></textarea>
								</div>
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="case-expected-{i}">
										Sortie attendue
									</label>
									<textarea
										id="case-expected-{i}"
										class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
										rows="2"
										value={testCase.expected_output}
										oninput={(e) =>
											updateOutputBehavior((b) => {
												const updated = [...b.test_cases];
												updated[i] = {
													...updated[i],
													expected_output: (e.target as HTMLTextAreaElement).value
												};
												return { ...b, test_cases: updated };
											})}
									></textarea>
								</div>
							</div>
						</div>
					{/each}
				</div>
				<Button type="button" variant="outline" size="sm" onclick={addOutputCase}>
					<Plus class="mr-1 h-4 w-4" /> Ajouter un cas
				</Button>
			</div>
		{/if}

		<!-- .......................................................... unit_test -->
		{#if isUnitTestBehavior(config.behavior)}
			{@const utBehavior = config.behavior}
			<div class="space-y-3">
				<div>
					<label class="mb-1 block text-sm font-medium" for="function-name">
						Nom de la fonction
					</label>
					<Input
						id="function-name"
						value={utBehavior.function_name}
						oninput={(e) =>
							updateUnitTestBehavior((b) => ({
								...b,
								function_name: (e.target as HTMLInputElement).value
							}))}
						placeholder="ex: add"
						autocomplete="off"
					/>
				</div>
				<div class="space-y-2">
					{#each utBehavior.test_cases as testCase, i (i)}
						<div class="rounded-md border border-border p-3">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Cas de test {i + 1}</span>
								<div class="flex items-center gap-3">
									<MyCheckbox
										checked={testCase.hidden ?? false}
										onCheckedChange={(v) =>
											v !== 'indeterminate' &&
											updateUnitTestBehavior((b) => {
												const updated = [...b.test_cases];
												updated[i] = { ...updated[i], hidden: v };
												return { ...b, test_cases: updated };
											})}
										label="Caché"
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => removeUnitCase(i)}
										disabled={utBehavior.test_cases.length <= 1}
										aria-label="Supprimer le cas {i + 1}"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div class="grid gap-2 sm:grid-cols-2">
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="unit-args-{i}">
										Arguments (JSON, ex&nbsp;: <code>[1, 2]</code>)
									</label>
									<textarea
										id="unit-args-{i}"
										class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
										class:border-red-500={unitDrafts[i]?.argsErr}
										rows="2"
										bind:value={unitDrafts[i].args}
										onblur={() => commitUnitDraft(i)}
									></textarea>
									{#if unitDrafts[i]?.argsErr}
										<p class="mt-1 text-xs text-red-600">{unitDrafts[i].argsErr}</p>
									{/if}
								</div>
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="unit-expected-{i}">
										Résultat attendu (JSON, ex&nbsp;: <code>3</code>)
									</label>
									<textarea
										id="unit-expected-{i}"
										class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
										class:border-red-500={unitDrafts[i]?.expectedErr}
										rows="2"
										bind:value={unitDrafts[i].expected}
										onblur={() => commitUnitDraft(i)}
									></textarea>
									{#if unitDrafts[i]?.expectedErr}
										<p class="mt-1 text-xs text-red-600">{unitDrafts[i].expectedErr}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
				<Button type="button" variant="outline" size="sm" onclick={addUnitCase}>
					<Plus class="mr-1 h-4 w-4" /> Ajouter un cas
				</Button>
			</div>
		{/if}

		<!-- ..................................................... variable_check -->
		{#if isVariableCheckBehavior(config.behavior)}
			<div class="space-y-3">
				<p class="text-xs text-muted-foreground">
					Après exécution du code de l'élève, chaque variable listée ci-dessous doit exister dans le
					namespace avec la valeur attendue. La valeur est saisie en JSON (ex&nbsp;:
					<code>6</code>, <code>"hello"</code>, <code>[1, 2]</code>, <code>null</code> pour
					<code>None</code>).
				</p>
				<div class="space-y-2">
					{#each varDrafts as draft, i (i)}
						<div class="rounded-md border border-border p-3">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Variable {i + 1}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => removeVarEntry(i)}
									disabled={varDrafts.length <= 1}
									aria-label="Supprimer la variable {i + 1}"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
							<div class="grid gap-2 sm:grid-cols-[12rem_1fr]">
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="var-name-{i}">
										Nom
									</label>
									<Input
										id="var-name-{i}"
										class={draft.nameErr ? 'border-red-500' : ''}
										bind:value={varDrafts[i].name}
										onblur={() => commitVarDraft(i)}
										placeholder="ex: x"
										autocomplete="off"
									/>
									{#if draft.nameErr}
										<p class="mt-1 text-xs text-red-600">{draft.nameErr}</p>
									{/if}
								</div>
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="var-value-{i}">
										Valeur attendue (JSON)
									</label>
									<textarea
										id="var-value-{i}"
										class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
										class:border-red-500={draft.valueErr}
										rows="2"
										bind:value={varDrafts[i].valueDraft}
										onblur={() => commitVarDraft(i)}
									></textarea>
									{#if draft.valueErr}
										<p class="mt-1 text-xs text-red-600">{draft.valueErr}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
				<Button type="button" variant="outline" size="sm" onclick={addVarEntry}>
					<Plus class="mr-1 h-4 w-4" /> Ajouter une variable
				</Button>
			</div>
		{/if}

		<!-- .................................................. reference_solution -->
		{#if isReferenceSolutionBehavior(config.behavior)}
			{@const refBehavior = config.behavior}
			<div class="space-y-4">
				<p class="text-xs text-muted-foreground">
					Test différentiel : fournis ta solution (cachée à l'élève) et le worker compare la
					fonction de l'élève à la tienne sur des cas fixes (sentinelles que tu choisis) et/ou des
					cas générés aléatoirement (couverture large, reproductible via le seed).
				</p>

				<div>
					<label class="mb-1 block text-sm font-medium" for="ref-function-name">
						Nom de la fonction
					</label>
					<Input
						id="ref-function-name"
						value={refBehavior.function_name}
						oninput={(e) =>
							updateReferenceSolutionBehavior((b) => ({
								...b,
								function_name: (e.target as HTMLInputElement).value
							}))}
						placeholder="ex: mediane"
						autocomplete="off"
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="ref-code">
						Solution de référence (Python)
					</label>
					<textarea
						id="ref-code"
						class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
						rows="8"
						value={refBehavior.reference_code}
						placeholder={REF_CODE_PLACEHOLDER}
						oninput={(e) =>
							updateReferenceSolutionBehavior((b) => ({
								...b,
								reference_code: (e.target as HTMLTextAreaElement).value
							}))}
					></textarea>
					<p class="mt-1 text-xs text-muted-foreground">
						Cachée à l'élève. C'est ta solution officielle ; elle sera comparée à celle de l'élève
						sur chaque cas.
					</p>
				</div>

				<!-- Toggle: cas fixes -->
				<div class="rounded-md border border-border p-3">
					<MyCheckbox
						checked={refFixedEnabled}
						onCheckedChange={toggleRefFixed}
						label="Cas fixes (sentinelles que tu écris à la main)"
					/>
					{#if refFixedEnabled && refBehavior.fixed}
						{@const fixedBehavior = refBehavior.fixed}
						<div class="mt-3 space-y-2">
							{#each fixedBehavior.cases as testCase, i (i)}
								<div class="rounded-md border border-border p-3">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium">Cas fixe {i + 1}</span>
										<div class="flex items-center gap-3">
											<MyCheckbox
												checked={testCase.hidden ?? false}
												onCheckedChange={(v) =>
													v !== 'indeterminate' &&
													updateReferenceSolutionBehavior((b) => {
														const cases = [...(b.fixed?.cases ?? [])];
														cases[i] = { ...cases[i], hidden: v };
														return { ...b, fixed: { cases } };
													})}
												label="Caché"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onclick={() => removeRefFixedCase(i)}
												disabled={fixedBehavior.cases.length <= 1}
												aria-label="Supprimer le cas {i + 1}"
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										</div>
									</div>
									<div class="grid gap-2 sm:grid-cols-2">
										<div>
											<label class="mb-1 block text-xs text-muted-foreground" for="ref-args-{i}">
												Arguments (JSON, ex&nbsp;: <code>[[1, 2, 3]]</code>)
											</label>
											<textarea
												id="ref-args-{i}"
												class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
												class:border-red-500={refFixedDrafts[i]?.argsErr}
												rows="2"
												bind:value={refFixedDrafts[i].args}
												onblur={() => commitRefFixedDraft(i)}
											></textarea>
											{#if refFixedDrafts[i]?.argsErr}
												<p class="mt-1 text-xs text-red-600">{refFixedDrafts[i].argsErr}</p>
											{/if}
										</div>
										<div>
											<label
												class="mb-1 block text-xs text-muted-foreground"
												for="ref-expected-{i}"
											>
												Résultat attendu (JSON)
											</label>
											<textarea
												id="ref-expected-{i}"
												class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
												class:border-red-500={refFixedDrafts[i]?.expectedErr}
												rows="2"
												bind:value={refFixedDrafts[i].expected}
												onblur={() => commitRefFixedDraft(i)}
											></textarea>
											{#if refFixedDrafts[i]?.expectedErr}
												<p class="mt-1 text-xs text-red-600">
													{refFixedDrafts[i].expectedErr}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
							<Button type="button" variant="outline" size="sm" onclick={addRefFixedCase}>
								<Plus class="mr-1 h-4 w-4" /> Ajouter un cas
							</Button>
						</div>
					{/if}
				</div>

				<!-- Toggle: générateur -->
				<div class="rounded-md border border-border p-3">
					<MyCheckbox
						checked={refGeneratorEnabled}
						onCheckedChange={toggleRefGenerator}
						label="Générateur (cas aléatoires reproductibles)"
					/>
					{#if refGeneratorEnabled && refBehavior.generator}
						{@const gen = refBehavior.generator}
						<div class="mt-3 space-y-3">
							<div>
								<label class="mb-1 block text-xs text-muted-foreground" for="ref-gen-code">
									Code Python (expression qui retourne un tuple d'arguments)
								</label>
								<textarea
									id="ref-gen-code"
									class="block w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
									rows="3"
									value={gen.code}
									placeholder={REF_GEN_CODE_PLACEHOLDER}
									oninput={(e) =>
										updateReferenceSolutionBehavior((b) => ({
											...b,
											generator: b.generator
												? { ...b.generator, code: (e.target as HTMLTextAreaElement).value }
												: b.generator
										}))}
								></textarea>
								<p class="mt-1 text-xs text-muted-foreground">
									Doit retourner un tuple : <code>(a,)</code> pour 1 argument,
									<code>(a, b)</code> pour 2.
								</p>
							</div>
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="ref-gen-count">
										Nombre de cas (1-200)
									</label>
									<Input
										id="ref-gen-count"
										type="number"
										min="1"
										max="200"
										value={gen.count}
										oninput={(e) => {
											const v = parseInt((e.target as HTMLInputElement).value, 10);
											if (!isNaN(v) && v >= 1 && v <= 200)
												updateReferenceSolutionBehavior((b) => ({
													...b,
													generator: b.generator ? { ...b.generator, count: v } : b.generator
												}));
										}}
									/>
								</div>
								<div>
									<label class="mb-1 block text-xs text-muted-foreground" for="ref-gen-seed">
										Seed (reproductibilité)
									</label>
									<Input
										id="ref-gen-seed"
										type="number"
										value={gen.seed}
										oninput={(e) => {
											const v = parseInt((e.target as HTMLInputElement).value, 10);
											if (!isNaN(v))
												updateReferenceSolutionBehavior((b) => ({
													...b,
													generator: b.generator ? { ...b.generator, seed: v } : b.generator
												}));
										}}
									/>
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if !refSubsectionsOk}
					<p class="text-sm text-amber-700 dark:text-amber-400" role="alert">
						Active au moins une stratégie (cas fixes ou générateur).
					</p>
				{/if}
			</div>
		{/if}
	</fieldset>

	{#if !hasAtLeastOneLayer}
		<p class="text-sm text-amber-700 dark:text-amber-400" role="alert">
			Active au moins une vérification de forme ou un comportement attendu.
		</p>
	{/if}
</div>
