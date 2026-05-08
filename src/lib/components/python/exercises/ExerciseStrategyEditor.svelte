<script lang="ts">
	/**
	 * Editor for ExerciseValidationConfig (the discriminated union of the three
	 * validation strategies: output, unit_test, ast).
	 *
	 * Two-way binds `config`. Switching strategy resets the config to a sensible
	 * default for that type. For unit_test, args/expected are edited as JSON
	 * strings in textareas with inline parse errors — they commit to the config
	 * on blur to avoid clobbering mid-typing.
	 */

	import type {
		ASTRequirement,
		ASTRequirementType,
		ExerciseValidationConfig,
		OutputValidationConfig,
		UnitTestValidationConfig,
		ASTValidationConfig,
		OutputComparison
	} from '$lib/shared/python';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { onMount } from 'svelte';

	type Props = {
		config: ExerciseValidationConfig;
	};

	let { config = $bindable() }: Props = $props();

	// ===========================================================================
	// Strategy switcher
	// ===========================================================================

	const strategyItems = [
		{ value: 'output', label: 'Comparaison de sortie (stdout)' },
		{ value: 'unit_test', label: 'Test de fonction' },
		{ value: 'ast', label: 'Analyse syntaxique (AST)' }
	];

	function setStrategy(type: string) {
		if (type === config.type) return;
		if (type === 'output') {
			config = {
				type: 'output',
				test_cases: [{ input: '', expected_output: '' }],
				comparison: { kind: 'exact' }
			};
		} else if (type === 'unit_test') {
			config = {
				type: 'unit_test',
				function_name: '',
				test_cases: [{ args: [], expected: null }]
			};
			unitDrafts = [{ args: '[]', expected: 'null' }];
		} else if (type === 'ast') {
			config = {
				type: 'ast',
				requirements: [{ type: 'uses_loop', message: 'Tu dois utiliser une boucle' }]
			};
		}
	}

	// ===========================================================================
	// output strategy helpers
	// ===========================================================================

	function addOutputCase() {
		if (config.type !== 'output') return;
		config.test_cases = [...config.test_cases, { input: '', expected_output: '' }];
	}

	function removeOutputCase(i: number) {
		if (config.type !== 'output' || config.test_cases.length <= 1) return;
		config.test_cases = config.test_cases.filter((_, idx) => idx !== i);
	}

	// ===========================================================================
	// output comparison preset logic
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

	/** Map a preset key to its canonical comparison object. */
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

	/**
	 * Return the preset key that exactly matches `cmp`, or 'custom' if none match.
	 * Comparison is done by structural equality on the known fields of each preset.
	 */
	function detectPreset(cmp: OutputComparison): PresetKey {
		if (cmp.kind === 'custom') return 'custom-python';

		if (cmp.kind === 'exact') return 'exact';

		if (cmp.kind === 'text') {
			const { whitespace, case_insensitive, trim_trailing_newline } = cmp;
			// text-ci: collapsed + case_insensitive + trim_trailing_newline
			if (
				whitespace === 'collapsed' &&
				case_insensitive === true &&
				trim_trailing_newline === true
			) {
				return 'text-ci';
			}
			// text-collapsed: collapsed + no case_insensitive + trim_trailing_newline
			if (whitespace === 'collapsed' && !case_insensitive && trim_trailing_newline === true) {
				return 'text-collapsed';
			}
			return 'custom';
		}

		if (cmp.kind === 'numeric') {
			const { shape, eps_abs, eps_rel, non_numeric, accept_comma_decimal } = cmp;
			// Only match presets that have no extra options set
			if (non_numeric !== undefined || accept_comma_decimal !== undefined) return 'custom';
			if (shape === 'flat' && eps_abs === 1e-9 && eps_rel === 1e-9) return 'numeric-tight';
			if (shape === 'flat' && eps_abs === 1e-6 && eps_rel === 1e-6) return 'numeric-medium';
			if (shape === 'flat' && eps_abs === 1e-3 && eps_rel === 1e-3) return 'numeric-loose';
			if (shape === 'lines' && eps_abs === 1e-6 && eps_rel === 1e-6) return 'numeric-lines';
			return 'custom';
		}

		return 'custom';
	}

	/**
	 * Handle preset selector changes.
	 * When 'custom' is selected we keep the current comparison unchanged and just
	 * reveal the custom panel — so the user can fine-tune from wherever they are.
	 */
	function handlePresetChange(value: string) {
		if (config.type !== 'output') return;
		if (value === 'custom') return; // keep current comparison, open panel
		const preset = value as Exclude<PresetKey, 'custom'>;
		config.comparison = { ...presetToComparison[preset] };
	}

	/**
	 * Switch the comparison kind inside the custom panel, resetting to sensible
	 * defaults for the new kind so no vestigial fields remain.
	 */
	function setKind(kind: 'exact' | 'text' | 'numeric') {
		if (config.type !== 'output') return;
		if (kind === 'exact') {
			config.comparison = { kind: 'exact' };
		} else if (kind === 'text') {
			config.comparison = { kind: 'text', whitespace: 'collapsed', trim_trailing_newline: true };
		} else {
			config.comparison = { kind: 'numeric', shape: 'flat', eps_abs: 1e-6, eps_rel: 1e-6 };
		}
	}

	/**
	 * Bidirectional access to the custom comparator code/timeout_ms.
	 * Reads narrow when the comparison is actually `custom`; writes spread the
	 * mutated value back into a fresh CustomComparison object.
	 */
	function setCustomCode(code: string) {
		if (config.type !== 'output' || config.comparison.kind !== 'custom') return;
		config.comparison = { ...config.comparison, code };
	}

	function setCustomTimeout(timeoutMs: number) {
		if (config.type !== 'output' || config.comparison.kind !== 'custom') return;
		config.comparison = { ...config.comparison, timeout_ms: timeoutMs };
	}

	// ===========================================================================
	// unit_test strategy helpers
	// JSON is edited via local string drafts; the config only sees parsed values
	// on blur (or on Add). Invalid JSON shows an inline error.
	// ===========================================================================

	let unitDrafts: { args: string; expected: string; argsErr?: string; expectedErr?: string }[] =
		$state([]);

	// Seed drafts when the component first mounts with an existing unit_test config
	// (e.g. editing an exercise loaded from the API). Subsequent transitions are
	// handled in setStrategy / addUnitCase / removeUnitCase.
	onMount(() => {
		if (config.type === 'unit_test') {
			unitDrafts = config.test_cases.map((tc) => ({
				args: JSON.stringify(tc.args),
				expected: JSON.stringify(tc.expected)
			}));
		}
	});

	function commitUnitDraft(i: number) {
		if (config.type !== 'unit_test') return;
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
			const updated = [...config.test_cases];
			updated[i] = { args: parsedArgs, expected: parsedExpected };
			config.test_cases = updated;
		}
	}

	function addUnitCase() {
		if (config.type !== 'unit_test') return;
		config.test_cases = [...config.test_cases, { args: [], expected: null }];
		unitDrafts = [...unitDrafts, { args: '[]', expected: 'null' }];
	}

	function removeUnitCase(i: number) {
		if (config.type !== 'unit_test' || config.test_cases.length <= 1) return;
		config.test_cases = config.test_cases.filter((_, idx) => idx !== i);
		unitDrafts = unitDrafts.filter((_, idx) => idx !== i);
	}

	// ===========================================================================
	// ast strategy helpers
	// ===========================================================================

	const astTypeItems: { value: ASTRequirementType; label: string }[] = [
		{ value: 'uses_loop', label: 'Utilise une boucle (for/while)' },
		{ value: 'defines_function', label: 'Définit une fonction' },
		{ value: 'no_print', label: 'Pas de print()' },
		{ value: 'uses_recursion', label: 'Utilise la récursion' },
		{ value: 'defines_class', label: 'Définit une classe' },
		{ value: 'uses_list_comprehension', label: 'Utilise une compréhension de liste' },
		{ value: 'no_global_variables', label: 'Pas de variables globales' },
		{ value: 'uses_import', label: 'Importe un module' }
	];

	function defaultMessageFor(type: ASTRequirementType, name?: string): string {
		switch (type) {
			case 'uses_loop':
				return 'Tu dois utiliser une boucle';
			case 'defines_function':
				return name ? `Définis la fonction \`${name}\`` : 'Tu dois définir une fonction';
			case 'no_print':
				return "N'utilise pas print()";
			case 'uses_recursion':
				return 'Ta fonction doit être récursive';
			case 'defines_class':
				return name ? `Définis la classe \`${name}\`` : 'Tu dois définir une classe';
			case 'uses_list_comprehension':
				return 'Utilise une compréhension de liste';
			case 'no_global_variables':
				return "N'utilise pas de variables globales";
			case 'uses_import':
				return name ? `Importe le module \`${name}\`` : 'Tu dois importer un module';
		}
	}

	function astSupportsName(type: ASTRequirementType): boolean {
		return type === 'defines_function' || type === 'defines_class' || type === 'uses_import';
	}

	function addAstRequirement() {
		if (config.type !== 'ast') return;
		const next: ASTRequirement = { type: 'uses_loop', message: defaultMessageFor('uses_loop') };
		config.requirements = [...config.requirements, next];
	}

	function removeAstRequirement(i: number) {
		if (config.type !== 'ast' || config.requirements.length <= 1) return;
		config.requirements = config.requirements.filter((_, idx) => idx !== i);
	}

	function setAstType(i: number, type: ASTRequirementType) {
		if (config.type !== 'ast') return;
		const updated = [...config.requirements];
		const current = updated[i];
		updated[i] = {
			type,
			name: astSupportsName(type) ? current.name : undefined,
			message: defaultMessageFor(type, current.name)
		};
		config.requirements = updated;
	}

	// Local cast-down for clearer per-strategy template branching
	const outputConfig = $derived(
		config.type === 'output' ? (config as OutputValidationConfig) : null
	);
	const unitConfig = $derived(
		config.type === 'unit_test' ? (config as UnitTestValidationConfig) : null
	);
	const astConfig = $derived(config.type === 'ast' ? (config as ASTValidationConfig) : null);

	// Detect which preset key matches the current comparison object (or 'custom')
	const selectedPreset = $derived(
		outputConfig ? detectPreset(outputConfig.comparison) : ('exact' as PresetKey)
	);
</script>

<div class="space-y-4">
	<div>
		<label class="mb-1 block text-sm font-medium" for="strategy-select"
			>Stratégie de validation</label
		>
		<MySelect
			id="strategy-select"
			items={strategyItems}
			value={config.type}
			onchange={setStrategy}
		/>
	</div>

	<!-- ============================================================== output -->
	{#if outputConfig}
		<div class="space-y-4">
			<!-- Comparison preset selector -->
			<div>
				<label class="mb-1 block text-sm font-medium" for="comparison-preset">Comparaison</label>
				<MySelect
					id="comparison-preset"
					items={comparisonPresetItems}
					value={selectedPreset}
					onchange={handlePresetChange}
				/>
			</div>

			<!-- Custom Python comparator panel — special-judge style -->
			{#if selectedPreset === 'custom-python' && outputConfig.comparison.kind === 'custom'}
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
							value={outputConfig.comparison.code}
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
							value={outputConfig.comparison.timeout_ms ?? 2000}
							oninput={(e) => {
								const v = parseInt((e.target as HTMLInputElement).value, 10);
								if (!isNaN(v) && v >= 100 && v <= 10000) setCustomTimeout(v);
							}}
						/>
					</div>
					<p class="text-xs text-muted-foreground">
						Pour vérifier que le comparateur tourne, clique sur <strong>Vérifier</strong> au-dessus du
						formulaire — ta solution sera évaluée par ton comparateur sur tous les cas de test.
					</p>
				</div>
			{/if}

			<!-- Custom panel — shown when no preset matches -->
			{#if selectedPreset === 'custom'}
				<div class="space-y-4 rounded-md border border-border bg-muted/30 p-4">
					<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Configuration personnalisée
					</p>

					<!-- Kind selector -->
					<div>
						<label class="mb-1 block text-sm font-medium" for="cmp-kind">Type</label>
						<MySelect
							id="cmp-kind"
							items={kindItems}
							value={outputConfig.comparison.kind}
							onchange={(v) => setKind(v as 'exact' | 'text' | 'numeric')}
						/>
					</div>

					<!-- text options -->
					{#if outputConfig.comparison.kind === 'text'}
						<div>
							<label class="mb-1 block text-sm font-medium" for="cmp-whitespace">Whitespace</label>
							<MySelect
								id="cmp-whitespace"
								items={whitespaceItems}
								value={outputConfig.comparison.whitespace}
								onchange={(v) => {
									if (config.type !== 'output' || config.comparison.kind !== 'text') return;
									config.comparison = {
										...config.comparison,
										whitespace: v as 'strict' | 'collapsed' | 'lines'
									};
								}}
							/>
						</div>
						<MyCheckbox
							checked={outputConfig.comparison.kind === 'text'
								? (outputConfig.comparison.case_insensitive ?? false)
								: false}
							onchange={(v) => {
								if (config.type !== 'output' || config.comparison.kind !== 'text') return;
								config.comparison = { ...config.comparison, case_insensitive: v };
							}}
							label="Ignorer la casse"
						/>
						<MyCheckbox
							checked={outputConfig.comparison.kind === 'text'
								? (outputConfig.comparison.trim_trailing_newline ?? false)
								: false}
							onchange={(v) => {
								if (config.type !== 'output' || config.comparison.kind !== 'text') return;
								config.comparison = { ...config.comparison, trim_trailing_newline: v };
							}}
							label="Tolérer le saut de ligne final"
						/>
					{/if}

					<!-- numeric options -->
					{#if outputConfig.comparison.kind === 'numeric'}
						<div>
							<label class="mb-1 block text-sm font-medium" for="cmp-shape">Forme</label>
							<MySelect
								id="cmp-shape"
								items={shapeItems}
								value={outputConfig.comparison.shape}
								onchange={(v) => {
									if (config.type !== 'output' || config.comparison.kind !== 'numeric') return;
									config.comparison = {
										...config.comparison,
										shape: v as 'flat' | 'lines' | 'grid'
									};
								}}
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
									value={outputConfig.comparison.eps_abs}
									oninput={(e) => {
										if (config.type !== 'output' || config.comparison.kind !== 'numeric') return;
										const v = parseFloat((e.target as HTMLInputElement).value);
										if (!isNaN(v)) config.comparison = { ...config.comparison, eps_abs: v };
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
									value={outputConfig.comparison.eps_rel}
									oninput={(e) => {
										if (config.type !== 'output' || config.comparison.kind !== 'numeric') return;
										const v = parseFloat((e.target as HTMLInputElement).value);
										if (!isNaN(v)) config.comparison = { ...config.comparison, eps_rel: v };
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
								value={outputConfig.comparison.non_numeric ?? 'match'}
								onchange={(v) => {
									if (config.type !== 'output' || config.comparison.kind !== 'numeric') return;
									config.comparison = {
										...config.comparison,
										non_numeric: v as 'match' | 'ignore'
									};
								}}
							/>
						</div>
						<MyCheckbox
							checked={outputConfig.comparison.kind === 'numeric'
								? (outputConfig.comparison.accept_comma_decimal ?? false)
								: false}
							onchange={(v) => {
								if (config.type !== 'output' || config.comparison.kind !== 'numeric') return;
								config.comparison = { ...config.comparison, accept_comma_decimal: v };
							}}
							label="Accepter la virgule comme séparateur décimal"
						/>
					{/if}

					<!-- exact: nothing to configure -->
					{#if outputConfig.comparison.kind === 'exact'}
						<p class="text-sm text-muted-foreground">Aucune option à configurer.</p>
					{/if}
				</div>
			{/if}

			<!-- Test cases -->
			<div class="space-y-2">
				{#each outputConfig.test_cases as testCase, i (i)}
					<div class="rounded-md border border-border p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Cas de test {i + 1}</span>
							<div class="flex items-center gap-3">
								<MyCheckbox
									checked={testCase.hidden ?? false}
									onchange={(v) => {
										if (config.type !== 'output') return;
										const updated = [...config.test_cases];
										updated[i] = { ...updated[i], hidden: v };
										config.test_cases = updated;
									}}
									label="Caché"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => removeOutputCase(i)}
									disabled={outputConfig.test_cases.length <= 1}
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
									bind:value={testCase.input}
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
									bind:value={testCase.expected_output}
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

	<!-- =========================================================== unit_test -->
	{#if unitConfig}
		<div class="space-y-3">
			<div>
				<label class="mb-1 block text-sm font-medium" for="function-name">
					Nom de la fonction
				</label>
				<Input
					id="function-name"
					bind:value={unitConfig.function_name}
					placeholder="ex: add"
					autocomplete="off"
				/>
			</div>
			<div class="space-y-2">
				{#each unitConfig.test_cases as testCase, i (i)}
					<div class="rounded-md border border-border p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Cas de test {i + 1}</span>
							<div class="flex items-center gap-3">
								<MyCheckbox
									checked={testCase.hidden ?? false}
									onchange={(v) => {
										if (config.type !== 'unit_test') return;
										const updated = [...config.test_cases];
										updated[i] = { ...updated[i], hidden: v };
										config.test_cases = updated;
									}}
									label="Caché"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => removeUnitCase(i)}
									disabled={unitConfig.test_cases.length <= 1}
									aria-label="Supprimer le cas {i + 1}"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</div>
						<div class="grid gap-2 sm:grid-cols-2">
							<div>
								<label class="mb-1 block text-xs text-muted-foreground" for="unit-args-{i}">
									Arguments (JSON, ex: <code>[1, 2]</code>)
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
									Résultat attendu (JSON, ex: <code>3</code>)
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

	<!-- ================================================================ ast -->
	{#if astConfig}
		<div class="space-y-2">
			{#each astConfig.requirements as req, i (i)}
				<div class="rounded-md border border-border p-3">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium">Exigence {i + 1}</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => removeAstRequirement(i)}
							disabled={astConfig.requirements.length <= 1}
							aria-label="Supprimer l'exigence {i + 1}"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
					<div class="space-y-2">
						<div>
							<label class="mb-1 block text-xs text-muted-foreground" for="ast-type-{i}">Type</label
							>
							<MySelect
								id="ast-type-{i}"
								items={astTypeItems}
								value={req.type}
								onchange={(v) => setAstType(i, v as ASTRequirementType)}
							/>
						</div>
						{#if astSupportsName(req.type)}
							<div>
								<label class="mb-1 block text-xs text-muted-foreground" for="ast-name-{i}">
									Nom (optionnel) — ex: <code>factorielle</code>
								</label>
								<Input
									id="ast-name-{i}"
									bind:value={req.name}
									placeholder="laisser vide pour accepter n'importe quel nom"
									autocomplete="off"
								/>
							</div>
						{/if}
						<div>
							<label class="mb-1 block text-xs text-muted-foreground" for="ast-msg-{i}">
								Message d'erreur affiché à l'élève
							</label>
							<Input id="ast-msg-{i}" bind:value={req.message} autocomplete="off" />
						</div>
					</div>
				</div>
			{/each}
			<Button type="button" variant="outline" size="sm" onclick={addAstRequirement}>
				<Plus class="mr-1 h-4 w-4" /> Ajouter une exigence
			</Button>
		</div>
	{/if}
</div>
