<script lang="ts">
	/**
	 * Editor for the new ValidationConfigV2 shape (`{ ast_requirements?,
	 * behavior?, timeout_ms? }`). Two independent panels — "Forme du code"
	 * (AST checks) and "Comportement attendu" (output / unit_test) — each can
	 * be enabled or disabled separately, and at least one is required (server
	 * Zod refine catches the empty case; we surface inline guidance here).
	 */

	import type { ASTRequirement, BehaviorCheck, OutputComparison } from '$lib/shared/python';
	import type { ValidationConfigV2 } from '$lib/types/python-exercises';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ASTRequirementsPanel from './ASTRequirementsPanel.svelte';

	type Props = {
		config: ValidationConfigV2;
	};

	let { config = $bindable() }: Props = $props();

	// ===========================================================================
	// AST toggle
	// ===========================================================================

	const astEnabled = $derived(Boolean(config.ast_requirements?.length));

	function toggleAst(checked: boolean) {
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

	type BehaviorChoice = 'none' | 'output' | 'unit_test';

	const behaviorChoiceItems: { value: BehaviorChoice; label: string }[] = [
		{ value: 'none', label: 'Aucun' },
		{ value: 'output', label: 'Sortie stdout' },
		{ value: 'unit_test', label: 'Test de fonction' }
	];

	const behaviorChoice = $derived<BehaviorChoice>(config.behavior?.kind ?? 'none');

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
		// unit_test
		config = {
			...config,
			behavior: {
				kind: 'unit_test',
				function_name: '',
				test_cases: [{ args: [], expected: null }]
			}
		};
		unitDrafts = [{ args: '[]', expected: 'null' }];
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

	let unitDrafts: { args: string; expected: string; argsErr?: string; expectedErr?: string }[] =
		$state([]);

	onMount(() => {
		if (isUnitTestBehavior(config.behavior)) {
			unitDrafts = config.behavior.test_cases.map((tc) => ({
				args: JSON.stringify(tc.args),
				expected: JSON.stringify(tc.expected)
			}));
		}
	});

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
			onchange={toggleAst}
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
								onchange={(v) => setKind(v as 'exact' | 'text' | 'numeric')}
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
									onchange={(v) =>
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
								onchange={(v) =>
									updateOutputBehavior((b) =>
										b.comparison.kind === 'text'
											? { ...b, comparison: { ...b.comparison, case_insensitive: v } }
											: b
									)}
								label="Ignorer la casse"
							/>
							<MyCheckbox
								checked={textCmp.trim_trailing_newline ?? false}
								onchange={(v) =>
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
									onchange={(v) =>
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
									onchange={(v) =>
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
								onchange={(v) =>
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
										onchange={(v) =>
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
										onchange={(v) =>
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
	</fieldset>

	{#if !hasAtLeastOneLayer}
		<p class="text-sm text-amber-700 dark:text-amber-400" role="alert">
			Active au moins une vérification de forme ou un comportement attendu.
		</p>
	{/if}
</div>
