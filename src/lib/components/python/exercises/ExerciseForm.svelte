<script lang="ts" module>
	import type { ValidationConfig } from '$lib/types/python-exercises';

	export type Level = 'college' | 'lycee' | 'nsi' | 'etudiant';

	export type ExerciseFormState = {
		title: string;
		description: string;
		instructions: string;
		starter_code: string;
		solution_code: string;
		validation_config: ValidationConfig;
		level: Level;
		tags: string[];
		source: string;
		is_public: boolean;
	};

	/** Empty form, ready to bind on /new. */
	export function emptyExerciseForm(): ExerciseFormState {
		return {
			title: '',
			description: '',
			instructions: '',
			starter_code: '',
			solution_code: '',
			validation_config: {
				behavior: {
					kind: 'output',
					test_cases: [{ input: '', expected_output: '' }],
					comparison: { kind: 'exact' }
				}
			},
			level: 'lycee',
			tags: [],
			source: '',
			is_public: true
		};
	}
</script>

<script lang="ts">
	/**
	 * Reusable exercise form for both creation (/new) and edition (/edit/[id]).
	 *
	 * The parent owns:
	 *   - the initial form state
	 *   - the submit logic (POST vs PUT, redirect target, etc.) via `onSubmit`
	 *
	 * The form owns:
	 *   - all the input rendering
	 *   - "Vérifier" with Pyodide (executor lifecycle) + verification gating
	 *   - submit-in-flight state and inline error
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import ExerciseValidationResult from './ExerciseValidationResult.svelte';
	import ExerciseStrategyEditor from './ExerciseStrategyEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { PlaygroundExecutor, type ExerciseValidationResult as Result } from '$lib/shared/python';
	import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-svelte';

	type Props = {
		initialForm: ExerciseFormState;
		mode: 'create' | 'edit';
		/** Where the Cancel button leads. Defaults sensible by mode if omitted. */
		cancelHref?: string;
		onSubmit: (form: ExerciseFormState) => Promise<void>;
	};

	let { initialForm, mode, cancelHref, onSubmit }: Props = $props();

	// Clone the prop so subsequent mutations don't accidentally alias the
	// parent's object. The form is consumed once at mount time; the parent
	// is not expected to swap `initialForm` later.
	// svelte-ignore state_referenced_locally
	let form = $state<ExerciseFormState>(structuredClone(initialForm));

	let executor = $state<PlaygroundExecutor | null>(null);
	let verifyResult = $state<Result | null>(null);
	let isVerifying = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	const pyodideReady = $derived(executor?.state === 'ready');
	const verifyOk = $derived(verifyResult?.valid === true);
	const canSubmit = $derived(
		verifyOk &&
			form.title.trim().length > 0 &&
			form.solution_code.trim().length > 0 &&
			!isSubmitting
	);

	const submitLabel = $derived(mode === 'create' ? "Créer l'exercice" : 'Enregistrer');
	const fallbackCancel = $derived(mode === 'create' ? '/python-exercises' : '/python-exercises');
	const cancelTo = $derived(cancelHref ?? fallbackCancel);

	const levelItems = [
		{ value: 'college', label: 'Collège' },
		{ value: 'lycee', label: 'Lycée' },
		{ value: 'nsi', label: 'NSI' },
		{ value: 'etudiant', label: 'Étudiant' }
	];

	const instructionsPlaceholder =
		'# Énoncé\n\nÉcris une fonction `add(a, b)` qui retourne a + b.\n\n## Exemples\n\n- `add(1, 2)` doit retourner `3`';

	onMount(() => {
		if (!browser) return;
		executor = new PlaygroundExecutor();
		executor.initPyodide();
	});

	onDestroy(() => {
		executor?.destroy();
	});

	async function handleVerify() {
		if (!executor || !pyodideReady) return;
		if (form.solution_code.trim().length === 0) {
			submitError = 'Saisis une solution avant de vérifier.';
			return;
		}
		isVerifying = true;
		submitError = null;
		try {
			verifyResult = await executor.validateExercise(form.solution_code, form.validation_config);
		} catch (e) {
			verifyResult = {
				valid: false,
				failed_layer: null,
				behavior_kind: form.validation_config.behavior?.kind,
				test_results: [],
				error: e instanceof Error ? e.message : String(e),
				execution_time_ms: 0
			};
		} finally {
			isVerifying = false;
		}
	}

	async function handleFormSubmit() {
		if (!canSubmit) return;
		isSubmitting = true;
		submitError = null;
		try {
			await onSubmit(form);
		} catch (e) {
			submitError = e instanceof Error ? e.message : String(e);
		} finally {
			isSubmitting = false;
		}
	}

	// Invalidate the verification verdict whenever the solution or the
	// validation config changes — the previous verdict may no longer apply.
	$effect(() => {
		void form.solution_code;
		void form.validation_config;
		verifyResult = null;
	});
</script>

<form
	class="space-y-6"
	onsubmit={(e) => {
		e.preventDefault();
		handleFormSubmit();
	}}
>
	<!-- Métadonnées -->
	<fieldset class="space-y-3">
		<legend class="text-base font-semibold">Présentation</legend>

		<div>
			<label for="ex-title" class="mb-1 block text-sm font-medium">
				Titre <span class="text-destructive">*</span>
			</label>
			<Input
				id="ex-title"
				bind:value={form.title}
				placeholder="ex: Somme de deux nombres"
				required
			/>
		</div>

		<div>
			<label for="ex-desc" class="mb-1 block text-sm font-medium">Description courte</label>
			<Input
				id="ex-desc"
				bind:value={form.description}
				placeholder="Optionnel — phrase de présentation affichée sous le titre"
			/>
		</div>

		<div>
			<label for="ex-source" class="mb-1 block text-sm font-medium">Source</label>
			<Input
				id="ex-source"
				bind:value={form.source}
				placeholder="Optionnel — ex : Bac Polynésie 09/2024 Q2.b"
				maxlength={200}
			/>
		</div>

		<div>
			<label for="ex-instr" class="mb-1 block text-sm font-medium">
				Instructions <span class="text-xs font-normal text-muted-foreground">(markdown)</span>
			</label>
			<textarea
				id="ex-instr"
				class="block min-h-32 w-full rounded-md border border-border bg-background p-2 font-mono text-sm shadow-sm focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
				rows="8"
				bind:value={form.instructions}
				placeholder={instructionsPlaceholder}
			></textarea>
		</div>

		<div>
			<label for="ex-level" class="mb-1 block text-sm font-medium">
				Niveau <span class="text-destructive">*</span>
			</label>
			<MySelect
				id="ex-level"
				items={levelItems}
				value={form.level}
				onchange={(v) => (form.level = v as Level)}
			/>
		</div>

		<div>
			<label for="ex-tags" class="mb-1 block text-sm font-medium">Tags</label>
			<TagBadgeSelector
				bind:value={form.tags}
				placeholder="Ajouter des tags"
				apiPath="/api/python-tags"
			/>
		</div>

		<MyCheckbox
			bind:checked={form.is_public}
			label="Public — accessible à tous via le lien (sinon : seulement toi)"
		/>
	</fieldset>

	<!-- Code -->
	<fieldset class="space-y-3">
		<legend class="text-base font-semibold">Code</legend>

		<div>
			<label class="mb-1 block text-sm font-medium" for="ex-starter">
				Code initial <span class="text-xs font-normal text-muted-foreground"
					>(vu par l'élève au démarrage)</span
				>
			</label>
			<div class="h-40 overflow-hidden rounded-md border border-border">
				<PythonEditor bind:value={form.starter_code} {executor} />
			</div>
		</div>

		<div>
			<label class="mb-1 block text-sm font-medium" for="ex-solution">
				Solution de référence <span class="text-destructive">*</span>
			</label>
			<p class="mb-1 text-xs text-muted-foreground">
				Sert à vérifier que la validation passe avec une solution correcte. Jamais montrée à
				l'élève.
			</p>
			<div class="h-40 overflow-hidden rounded-md border border-border">
				<PythonEditor bind:value={form.solution_code} {executor} />
			</div>
		</div>
	</fieldset>

	<!-- Validation -->
	<fieldset class="space-y-3">
		<legend class="text-base font-semibold">Validation</legend>
		<ExerciseStrategyEditor bind:config={form.validation_config} />
	</fieldset>

	<!-- Vérif + soumission -->
	<fieldset class="space-y-3 rounded-md border border-border bg-muted/20 p-4">
		<legend class="px-2 text-base font-semibold">Vérification</legend>

		<div class="flex flex-wrap items-center gap-2">
			<Button
				type="button"
				onclick={handleVerify}
				disabled={!pyodideReady || isVerifying}
				variant="outline"
			>
				{#if isVerifying}
					<Loader2 class="mr-1 h-4 w-4 animate-spin" />
				{:else}
					<CheckCircle2 class="mr-1 h-4 w-4" />
				{/if}
				Vérifier ma solution
			</Button>
			{#if !pyodideReady}
				<span class="text-xs text-muted-foreground">
					Chargement de Python… {executor?.loadingProgress ?? 0}%
				</span>
			{/if}
		</div>

		<ExerciseValidationResult result={verifyResult} loading={isVerifying} />

		{#if verifyResult && !verifyResult.valid}
			<p class="text-xs text-amber-700 dark:text-amber-400">
				La solution doit passer la validation avant que tu puisses {mode === 'create'
					? "créer l'exercice"
					: 'enregistrer'}.
			</p>
		{/if}
	</fieldset>

	{#if submitError}
		<div
			class="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm"
			role="alert"
		>
			<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
			<span>{submitError}</span>
		</div>
	{/if}

	<div class="flex items-center justify-end gap-2">
		<Button type="button" variant="outline" href={cancelTo}>Annuler</Button>
		<Button type="submit" disabled={!canSubmit}>
			{#if isSubmitting}
				<Loader2 class="mr-1 h-4 w-4 animate-spin" />
			{/if}
			{submitLabel}
		</Button>
	</div>
</form>
