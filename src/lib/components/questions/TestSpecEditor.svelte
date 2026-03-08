<!--
	TestSpec Editor Component
	=========================

	Dialog for editing test specifications (deterministic regression tests)
	for a question template.

	PROPS:
	- open: boolean (bindable)
	- testSpecs: TestSpec[] (bindable)
	- template: partial template data for extracting variables/blanks info
-->

<script lang="ts">
	import type {
		QuestionTemplate,
		QuestionVariation,
		TestSpec,
		ValidationStatus,
		ConstraintId,
		SharedVariationDefaults,
		QuestionVariable
	} from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { TestSpecResult } from '$lib/questions/test-spec-runner';
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Plus, Trash2, Play, Check, X } from 'lucide-svelte';

	interface Props {
		open: boolean;
		testSpecs: TestSpec[];
		variations: QuestionVariation[];
		shared?: SharedVariationDefaults;
	}

	let { open = $bindable(), testSpecs = $bindable(), variations, shared }: Props = $props();

	// Editor state
	let editingIndex = $state<number | null>(null);
	let editSpec = $state<TestSpec>(makeEmptySpec());
	let results = new SvelteMap<number, TestSpecResult>();
	let isRunning = $state(false);

	const STATUS_OPTIONS = [
		{ value: 'correct', label: 'correct' },
		{ value: 'unoptimal_form', label: 'unoptimal_form' },
		{ value: 'bad_form', label: 'bad_form' },
		{ value: 'incorrect', label: 'incorrect' }
	];

	const CONSTRAINT_OPTIONS: { value: ConstraintId; label: string }[] = [
		{ value: 'spaces', label: 'spaces' },
		{ value: 'zeros', label: 'zeros' },
		{ value: 'products', label: 'products' },
		{ value: 'brackets', label: 'brackets' },
		{ value: 'signs', label: 'signs' },
		{ value: 'nullTerms', label: 'nullTerms' },
		{ value: 'factorOne', label: 'factorOne' },
		{ value: 'reducedFractions', label: 'reducedFractions' }
	];

	function makeEmptySpec(): TestSpec {
		return {
			description: '',
			variationIndex: 0,
			variables: {},
			answers: [],
			expected: { status: 'correct' }
		};
	}

	// Merge shared + variation variables
	function getVariationVars(variationIndex: number): QuestionVariable[] {
		const variation = variations[variationIndex];
		if (!variation) return [];
		const sharedVars = shared?.variables ?? [];
		const varVars = variation.variables ?? [];
		const overriddenNames = new Set(varVars.map((v) => v.name));
		const effectiveShared = sharedVars.filter((v) => !overriddenNames.has(v.name));
		return [...effectiveShared, ...varVars];
	}

	let currentVars = $derived(getVariationVars(editSpec.variationIndex ?? 0));

	// Determine question type from variation
	let questionType = $derived(
		getQuestionType({
			choices: variations[editSpec.variationIndex ?? 0]?.choices,
			shared
		})
	);

	// Count blanks from variation
	let blankCount = $derived.by(() => {
		const variation = variations[editSpec.variationIndex ?? 0];
		return variation?.blanks?.length ?? 0;
	});

	function startAdd() {
		editingIndex = null;
		const spec = makeEmptySpec();
		// Pre-populate variable keys from variation
		const vars = getVariationVars(0);
		for (const v of vars) {
			spec.variables[v.name] = '';
		}
		if (blankCount > 0) {
			spec.answers = Array(blankCount).fill('');
		}
		editSpec = spec;
	}

	function startEdit(index: number) {
		editingIndex = index;
		editSpec = structuredClone(testSpecs[index]);
	}

	function saveSpec() {
		if (!editSpec.description.trim()) return;
		const spec = structuredClone(editSpec);
		// Clean up: remove empty answers/selectedChoices
		if (questionType === 'fill_in_blanks') {
			delete spec.selectedChoices;
		} else {
			delete spec.answers;
		}
		if (editingIndex !== null) {
			testSpecs[editingIndex] = spec;
		} else {
			testSpecs = [...testSpecs, spec];
		}
		editingIndex = null;
	}

	function deleteSpec(index: number) {
		testSpecs = testSpecs.filter((_, i) => i !== index);
		results.delete(index);
	}

	function handleVariationChange(value: string) {
		const idx = parseInt(value, 10);
		editSpec.variationIndex = idx;
		// Re-populate variable keys
		const vars = getVariationVars(idx);
		const newVars: Record<string, string> = {};
		for (const v of vars) {
			newVars[v.name] = editSpec.variables[v.name] ?? '';
		}
		editSpec.variables = newVars;
	}

	async function runSpec(index: number) {
		isRunning = true;
		try {
			// Dynamic import to avoid loading heavy validation code upfront
			const { runTestSpec } = await import('$lib/questions/test-spec-runner');
			// Build a minimal template from current form state
			const templateForTest: QuestionTemplate = {
				id: 'test-preview',
				title: 'Preview',
				status: 'draft',
				shared: shared ?? undefined,
				variations,
				grades: ['6'],
				theme: 'Test',
				domain: 'Test',
				level: 1
			};
			const result = runTestSpec(templateForTest, testSpecs[index]);
			results.set(index, result);
		} finally {
			isRunning = false;
		}
	}

	async function runAll() {
		isRunning = true;
		try {
			const { runTestSpec } = await import('$lib/questions/test-spec-runner');
			const templateForTest: QuestionTemplate = {
				id: 'test-preview',
				title: 'Preview',
				status: 'draft',
				shared: shared ?? undefined,
				variations,
				grades: ['6'],
				theme: 'Test',
				domain: 'Test',
				level: 1
			};
			results.clear();
			for (let i = 0; i < testSpecs.length; i++) {
				results.set(i, runTestSpec(templateForTest, testSpecs[i]));
			}
		} finally {
			isRunning = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Test Specs</Dialog.Title>
			<Dialog.Description>
				Tests de regression deterministes pour cette question.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Spec list -->
		<div class="space-y-2">
			{#if testSpecs.length > 0}
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-muted-foreground">{testSpecs.length} test(s)</span>
					<Button variant="outline" size="sm" onclick={runAll} disabled={isRunning}>
						<Play class="mr-1 h-3 w-3" />
						Tout lancer
					</Button>
				</div>

				<div class="divide-y rounded-lg border">
					{#each testSpecs as spec, i (spec.description + i)}
						<div class="flex items-center justify-between p-2 text-sm">
							<div class="flex min-w-0 flex-1 items-center gap-2">
								{#if results.has(i)}
									{@const r = results.get(i)!}
									{#if r.passed}
										<Check class="h-4 w-4 shrink-0 text-green-600" />
									{:else}
										<X class="h-4 w-4 shrink-0 text-red-600" />
									{/if}
								{:else}
									<div class="h-4 w-4 shrink-0"></div>
								{/if}
								<span class="truncate">{spec.description}</span>
								{#if spec.variationIndex !== undefined && spec.variationIndex > 0}
									<Badge variant="outline" class="shrink-0">v{spec.variationIndex}</Badge>
								{/if}
								<Badge variant="secondary" class="shrink-0">{spec.expected.status}</Badge>
							</div>
							<div class="flex shrink-0 items-center gap-1">
								<Button variant="ghost" size="sm" onclick={() => runSpec(i)} disabled={isRunning}>
									<Play class="h-3 w-3" />
								</Button>
								<Button variant="ghost" size="sm" onclick={() => startEdit(i)}>Editer</Button>
								<Button variant="ghost" size="sm" onclick={() => deleteSpec(i)}>
									<Trash2 class="h-3 w-3" />
								</Button>
							</div>
						</div>
						{#if results.has(i) && !results.get(i)!.passed}
							{@const r = results.get(i)!}
							<div class="bg-red-50 px-4 py-2 text-xs dark:bg-red-950">
								{#if r.error}
									<p class="text-red-600">{r.error}</p>
								{:else}
									<p>
										Attendu: <strong>{r.spec.expected.status}</strong> — Obtenu:
										<strong>{r.actual.status}</strong>
									</p>
									{#if r.spec.expected.constraintViolations?.length || r.actual.constraintViolations.length}
										<p>
											Violations attendues: [{r.spec.expected.constraintViolations?.join(', ') ??
												''}] — Obtenues: [{r.actual.constraintViolations.join(', ')}]
										</p>
									{/if}
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="py-4 text-center text-sm text-muted-foreground">Aucun test defini.</p>
			{/if}
		</div>

		<!-- Edit form -->
		{#if editingIndex !== null || editSpec.description !== undefined}
			<div class="mt-4 space-y-3 rounded-lg border bg-muted/50 p-4">
				<h4 class="text-sm font-medium">{editingIndex !== null ? 'Modifier' : 'Nouveau'} test</h4>

				<div class="grid gap-3">
					<!-- Description -->
					<div>
						<Label>Description</Label>
						<Input bind:value={editSpec.description} placeholder="Ex: 3+7 = 10" />
					</div>

					<!-- Variation index -->
					{#if variations.length > 1}
						<div>
							<Label>Variation</Label>
							<MySelect
								type="single"
								value={String(editSpec.variationIndex ?? 0)}
								onchange={handleVariationChange}
								items={variations.map((_, i) => ({ value: String(i), label: `Variation ${i}` }))}
							/>
						</div>
					{/if}

					<!-- Variables -->
					{#if currentVars.length > 0}
						<div>
							<Label>Variables</Label>
							<div class="grid grid-cols-2 gap-2">
								{#each currentVars as v (v.name)}
									<div class="flex items-center gap-2">
										<span class="w-16 shrink-0 font-mono text-sm">{v.name}</span>
										<Input
											value={editSpec.variables[v.name] ?? ''}
											oninput={(e: Event) => {
												editSpec.variables[v.name] = (e.target as HTMLInputElement).value;
											}}
											placeholder="valeur"
											class="h-8"
										/>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Answers (fill-in-blanks) -->
					{#if questionType === 'fill_in_blanks' && blankCount > 0}
						<div>
							<Label>Reponses (LaTeX)</Label>
							<div class="space-y-1">
								{#each Array(blankCount) as _, i (i)}
									<Input
										value={editSpec.answers?.[i] ?? ''}
										oninput={(e: Event) => {
											if (!editSpec.answers) editSpec.answers = [];
											editSpec.answers[i] = (e.target as HTMLInputElement).value;
										}}
										placeholder="Reponse blank {i}"
										class="h-8 font-mono"
									/>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Selected choices (QCM) -->
					{#if questionType === 'multiple_choice'}
						<div>
							<Label>Choix selectionnes (indices, ex: 0, 1)</Label>
							<Input
								value={editSpec.selectedChoices?.join(', ') ?? ''}
								oninput={(e: Event) => {
									const val = (e.target as HTMLInputElement).value;
									editSpec.selectedChoices = val
										.split(',')
										.map((s) => parseInt(s.trim(), 10))
										.filter((n) => !isNaN(n));
								}}
								placeholder="0"
								class="h-8 font-mono"
							/>
						</div>
					{/if}

					<!-- Expected status -->
					<div>
						<Label>Status attendu</Label>
						<MySelect
							type="single"
							value={editSpec.expected.status}
							onchange={(v: string) => {
								editSpec.expected = { ...editSpec.expected, status: v as ValidationStatus };
							}}
							items={STATUS_OPTIONS}
						/>
					</div>

					<!-- Expected constraint violations -->
					<div>
						<Label>Violations attendues</Label>
						<MySelect
							type="multiple"
							value={editSpec.expected.constraintViolations ?? []}
							onchange={(v: string[]) => {
								editSpec.expected = {
									...editSpec.expected,
									constraintViolations: v.length > 0 ? (v as ConstraintId[]) : undefined
								};
							}}
							items={CONSTRAINT_OPTIONS}
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							editingIndex = null;
							editSpec = makeEmptySpec();
						}}
					>
						Annuler
					</Button>
					<Button size="sm" onclick={saveSpec} disabled={!editSpec.description.trim()}>
						{editingIndex !== null ? 'Mettre a jour' : 'Ajouter'}
					</Button>
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" size="sm" onclick={startAdd}>
				<Plus class="mr-1 h-3 w-3" />
				Ajouter un test
			</Button>
			<Button onclick={() => (open = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
