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
		ASTValidationConfig
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
				ignore_whitespace: false
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
		// Normalise optional flags so bind:checked never targets undefined
		// (Svelte 5 refuses bind:value={undefined} when the prop has a fallback).
		if (config.type === 'output' && config.ignore_whitespace === undefined) {
			config.ignore_whitespace = false;
		}
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
		<div class="space-y-2">
			<MyCheckbox
				bind:checked={outputConfig.ignore_whitespace}
				label="Ignorer les espaces en début/fin"
			/>
			<div class="space-y-2">
				{#each outputConfig.test_cases as testCase, i (i)}
					<div class="rounded-md border border-border p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Cas de test {i + 1}</span>
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
				{#each unitConfig.test_cases as _testCase, i (i)}
					<div class="rounded-md border border-border p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Cas de test {i + 1}</span>
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
