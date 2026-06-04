<script lang="ts">
	/**
	 * CheckpointEditor — Teacher-facing editor for a checkpoint cell.
	 *
	 * Renders 4 controls:
	 *  - title text input (optional human-readable name shown in the dashboard)
	 *  - mode selector (assert / unit_test / variable_check)
	 *  - mode-specific config form
	 *  - live preview rendered via the same CheckpointCell component the
	 *    student will see — keeps WYSIWYG accuracy without extra work
	 *
	 * The teacher's notebook page mounts this component instead of
	 * CheckpointCell when the user role is teacher. Switching mode reset
	 * the config to the default of the new mode (intentional — mixing
	 * modes' fields would clutter the UI and pollute the JSONB).
	 */

	import type { CheckpointCell, CheckpointMode } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import CheckpointCellPreview from './CheckpointCell.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Trash2, AlertCircle } from 'lucide-svelte';

	// Props
	let {
		cell = $bindable() as CheckpointCell,
		notebook = null as NotebookStore | null
	}: {
		cell: CheckpointCell;
		notebook?: NotebookStore | null;
	} = $props();

	// Mode selector items
	const modeItems = [
		{ value: 'assert', label: 'Assertions libres (Python)' },
		{ value: 'unit_test', label: 'Test de fonction' },
		{ value: 'variable_check', label: 'Vérification de variables' }
	];

	// Functions
	function handleModeChange(value: string): void {
		const newMode = value as CheckpointMode;
		if (newMode === cell.checkpoint.mode) return;
		// Reset to the default config for the new mode. Mixing fields between
		// modes would silently keep stale data inside the JSONB.
		if (newMode === 'assert') {
			cell.checkpoint = { mode: 'assert', code: '' };
		} else if (newMode === 'unit_test') {
			cell.checkpoint = {
				mode: 'unit_test',
				function_name: '',
				test_cases: [{ args: [], expected: null }]
			};
		} else {
			cell.checkpoint = { mode: 'variable_check', expected_vars: {} };
		}
		// Clear the local `varRows` UI state so that switching back to
		// variable_check later doesn't replay the previous rows. The init
		// $effect will re-seed from the (now empty) `expected_vars`.
		varRows = [];
		// Also clear any draft parse-error markers across all modes so the
		// teacher doesn't see red borders inherited from the previous mode.
		parseErrors = {};
		markModified();
	}

	function markModified(): void {
		if (notebook) notebook.markModified();
	}

	function updateTitle(value: string): void {
		cell.title = value.trim() === '' ? undefined : value;
		markModified();
	}

	function updateHint(value: string): void {
		cell.hint = value.trim() === '' ? undefined : value;
		markModified();
	}

	// ----- assert mode -----

	function updateAssertCode(value: string): void {
		if (cell.checkpoint.mode !== 'assert') return;
		cell.checkpoint = { ...cell.checkpoint, code: value };
		markModified();
	}

	// ----- unit_test mode -----

	function updateFunctionName(value: string): void {
		if (cell.checkpoint.mode !== 'unit_test') return;
		cell.checkpoint = { ...cell.checkpoint, function_name: value };
		markModified();
	}

	function addUnitTestCase(): void {
		if (cell.checkpoint.mode !== 'unit_test') return;
		cell.checkpoint = {
			...cell.checkpoint,
			test_cases: [...cell.checkpoint.test_cases, { args: [], expected: null }]
		};
		markModified();
	}

	function removeUnitTestCase(index: number): void {
		if (cell.checkpoint.mode !== 'unit_test') return;
		if (cell.checkpoint.test_cases.length <= 1) return; // Keep at least 1
		cell.checkpoint = {
			...cell.checkpoint,
			test_cases: cell.checkpoint.test_cases.filter((_, i) => i !== index)
		};
		markModified();
	}

	// JSON draft pattern (commit on blur) — mirrors ExerciseStrategyEditor's
	// approach for unit_test args/expected. Keeps the input forgiving while
	// the teacher types.
	//
	// `parseErrors` keys are stable strings (`args:<idx>`, `expected:<idx>`,
	// `var-name:<idx>`, `var-value:<idx>`) so the UI can flag the exact
	// input that failed to parse without losing the draft text.
	let parseErrors = $state<Record<string, true>>({});

	function setParseError(key: string, hasError: boolean): void {
		if (hasError) {
			parseErrors[key] = true;
		} else {
			delete parseErrors[key];
		}
	}

	function updateTestCaseArgs(index: number, jsonText: string): void {
		if (cell.checkpoint.mode !== 'unit_test') return;
		try {
			// Wrap with brackets so a single arg can be entered without []
			const parsed = JSON.parse(`[${jsonText}]`);
			const newCases = [...cell.checkpoint.test_cases];
			newCases[index] = { ...newCases[index], args: parsed };
			cell.checkpoint = { ...cell.checkpoint, test_cases: newCases };
			setParseError(`args:${index}`, false);
			markModified();
		} catch {
			setParseError(`args:${index}`, true);
		}
	}

	function updateTestCaseExpected(index: number, jsonText: string): void {
		if (cell.checkpoint.mode !== 'unit_test') return;
		try {
			const parsed = JSON.parse(jsonText);
			const newCases = [...cell.checkpoint.test_cases];
			newCases[index] = { ...newCases[index], expected: parsed };
			cell.checkpoint = { ...cell.checkpoint, test_cases: newCases };
			setParseError(`expected:${index}`, false);
			markModified();
		} catch {
			setParseError(`expected:${index}`, true);
		}
	}

	// ----- variable_check mode -----

	// We model `expected_vars` as an array of `{ name, valueDraft }` for
	// stable iteration order even when the teacher swaps names mid-edit.
	let varRows = $state<Array<{ name: string; valueDraft: string }>>([]);

	// Initialize the rows from the cell's expected_vars on first render and
	// whenever the cell's mode is variable_check.
	$effect(() => {
		if (cell.checkpoint.mode === 'variable_check') {
			const current = cell.checkpoint.expected_vars;
			const keys = Object.keys(current);
			if (varRows.length === 0 && keys.length > 0) {
				varRows = keys.map((k) => ({ name: k, valueDraft: JSON.stringify(current[k]) }));
			} else if (varRows.length === 0 && keys.length === 0) {
				varRows = [{ name: '', valueDraft: '' }];
			}
		}
	});

	function commitVariableRows(): void {
		if (cell.checkpoint.mode !== 'variable_check') return;
		const expected: Record<string, unknown> = {};
		varRows.forEach((row, idx) => {
			if (row.name.trim() === '') {
				setParseError(`var-value:${idx}`, false);
				return;
			}
			try {
				expected[row.name] = JSON.parse(row.valueDraft);
				setParseError(`var-value:${idx}`, false);
			} catch {
				// Don't commit this row but flag it so the teacher sees
				// which value can't be parsed (likely a forgotten quote).
				setParseError(`var-value:${idx}`, true);
			}
		});
		cell.checkpoint = { ...cell.checkpoint, expected_vars: expected };
		markModified();
	}

	function addVarRow(): void {
		varRows = [...varRows, { name: '', valueDraft: '' }];
	}

	function removeVarRow(index: number): void {
		if (varRows.length <= 1) return;
		varRows = varRows.filter((_, i) => i !== index);
		commitVariableRows();
	}
</script>

<div
	class="overflow-hidden rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
>
	<!-- Header : éditeur -->
	<div
		class="space-y-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 dark:bg-amber-500/10"
	>
		<div class="flex items-center gap-2">
			<AlertCircle class="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
			<span class="text-xs font-semibold tracking-wide text-amber-900 uppercase dark:text-amber-200"
				>Édition du checkpoint</span
			>
		</div>

		<!-- Title -->
		<div class="space-y-1">
			<Label for="checkpoint-title-{cell.id}">Titre (optionnel)</Label>
			<Input
				id="checkpoint-title-{cell.id}"
				type="text"
				placeholder="ex : Étape 1 : moyenne"
				value={cell.title ?? ''}
				oninput={(e) => updateTitle((e.target as HTMLInputElement).value)}
			/>
		</div>

		<!-- Hint — surfaced to the student after 2 failed Vérifier clicks. -->
		<div class="space-y-1">
			<Label for="checkpoint-hint-{cell.id}">Indice (optionnel)</Label>
			<Textarea
				id="checkpoint-hint-{cell.id}"
				rows={2}
				placeholder="ex : pense à la formule moyenne = somme / nombre. Affiché à l'élève après 2 échecs."
				value={cell.hint ?? ''}
				oninput={(e) => updateHint((e.target as HTMLTextAreaElement).value)}
			/>
			<p class="text-xs text-muted-foreground">
				L'élève peut afficher cet indice après 2 tentatives infructueuses.
			</p>
		</div>

		<!-- Mode selector -->
		<div class="space-y-1">
			<Label>Type de vérification</Label>
			<MySelect
				type="single"
				value={cell.checkpoint.mode}
				items={modeItems}
				onValueChange={handleModeChange}
			/>
		</div>

		<!-- Mode-specific config -->
		{#if cell.checkpoint.mode === 'assert'}
			<div class="space-y-1">
				<Label for="checkpoint-assert-{cell.id}">Code des assertions</Label>
				<Textarea
					id="checkpoint-assert-{cell.id}"
					rows={4}
					placeholder="assert moyenne([1, 2, 3]) == 2"
					value={cell.checkpoint.code}
					oninput={(e) => updateAssertCode((e.target as HTMLTextAreaElement).value)}
					class="font-mono text-xs"
				/>
				<p class="text-xs text-muted-foreground">
					Une ou plusieurs lignes Python. Le test passe si aucune exception n'est levée.
				</p>
			</div>
		{:else if cell.checkpoint.mode === 'unit_test'}
			<div class="space-y-2">
				<div class="space-y-1">
					<Label for="checkpoint-fn-{cell.id}">Nom de la fonction à tester</Label>
					<Input
						id="checkpoint-fn-{cell.id}"
						type="text"
						placeholder="moyenne"
						value={cell.checkpoint.function_name}
						oninput={(e) => updateFunctionName((e.target as HTMLInputElement).value)}
						class="font-mono"
					/>
				</div>

				<Label>Cas de test</Label>
				<div class="space-y-2">
					{#each cell.checkpoint.test_cases as tc, idx (idx)}
						<div class="flex items-start gap-2 rounded border bg-background px-2 py-2">
							<div class="grid flex-1 grid-cols-2 gap-2">
								<div class="space-y-1">
									<Label class="text-xs">Arguments (JSON séparés par virgule)</Label>
									<Input
										type="text"
										placeholder="[1, 2, 3]"
										value={JSON.stringify(tc.args).slice(1, -1)}
										onblur={(e) => updateTestCaseArgs(idx, (e.target as HTMLInputElement).value)}
										class="font-mono text-xs {parseErrors[`args:${idx}`]
											? 'border-destructive focus-visible:ring-destructive'
											: ''}"
									/>
									{#if parseErrors[`args:${idx}`]}
										<p class="text-xs text-destructive">JSON invalide</p>
									{/if}
								</div>
								<div class="space-y-1">
									<Label class="text-xs">Valeur attendue (JSON)</Label>
									<Input
										type="text"
										placeholder="2"
										value={JSON.stringify(tc.expected)}
										onblur={(e) =>
											updateTestCaseExpected(idx, (e.target as HTMLInputElement).value)}
										class="font-mono text-xs {parseErrors[`expected:${idx}`]
											? 'border-destructive focus-visible:ring-destructive'
											: ''}"
									/>
									{#if parseErrors[`expected:${idx}`]}
										<p class="text-xs text-destructive">JSON invalide</p>
									{/if}
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => removeUnitTestCase(idx)}
								disabled={cell.checkpoint.mode === 'unit_test' &&
									cell.checkpoint.test_cases.length <= 1}
								class="h-8 w-8 p-0 text-destructive"
								aria-label="Supprimer ce cas"
							>
								<Trash2 class="size-4" />
							</Button>
						</div>
					{/each}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={addUnitTestCase}
					class="gap-1.5"
					aria-label="Ajouter un cas de test"
				>
					<Plus class="size-4" />
					<span>Ajouter un cas</span>
				</Button>
			</div>
		{:else if cell.checkpoint.mode === 'variable_check'}
			<div class="space-y-2">
				<Label>Variables attendues</Label>
				<div class="space-y-2">
					{#each varRows as row, idx (idx)}
						<div class="flex items-center gap-2 rounded border bg-background px-2 py-2">
							<div class="grid flex-1 grid-cols-2 gap-2">
								<Input
									type="text"
									placeholder="x"
									value={row.name}
									oninput={(e) => {
										varRows[idx].name = (e.target as HTMLInputElement).value;
									}}
									onblur={commitVariableRows}
									class="font-mono text-xs"
								/>
								<div class="space-y-1">
									<Input
										type="text"
										placeholder="6"
										value={row.valueDraft}
										oninput={(e) => {
											varRows[idx].valueDraft = (e.target as HTMLInputElement).value;
										}}
										onblur={commitVariableRows}
										class="font-mono text-xs {parseErrors[`var-value:${idx}`]
											? 'border-destructive focus-visible:ring-destructive'
											: ''}"
									/>
									{#if parseErrors[`var-value:${idx}`]}
										<p class="text-xs text-destructive">JSON invalide</p>
									{/if}
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => removeVarRow(idx)}
								disabled={varRows.length <= 1}
								class="h-8 w-8 p-0 text-destructive"
								aria-label="Supprimer cette variable"
							>
								<Trash2 class="size-4" />
							</Button>
						</div>
					{/each}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={addVarRow}
					class="gap-1.5"
					aria-label="Ajouter une variable"
				>
					<Plus class="size-4" />
					<span>Ajouter une variable</span>
				</Button>
			</div>
		{/if}
	</div>

	<!-- Live preview = exactly what the student will see -->
	<div class="space-y-1 px-4 py-3">
		<Label class="text-xs text-muted-foreground">Aperçu (vue élève)</Label>
		<CheckpointCellPreview {cell} {notebook} isReadonly={true} />
	</div>
</div>
