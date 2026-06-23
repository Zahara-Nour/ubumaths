<script lang="ts" module>
	import { lore } from '$lib/config/lore';
	// Re-export the form-state helpers so existing consumers
	// (`import { emptyExerciseForm } from '.../ExerciseForm.svelte'`) still
	// resolve. The actual definitions live in `form-mapping.ts` to keep them
	// importable from non-Svelte contexts (e.g. the round-trip test script).
	export {
		emptyExerciseForm,
		buildInitialForm,
		buildSubmitBody,
		type ExerciseFormState,
		type ExerciseSource,
		type Level
	} from './form-mapping';
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
	import type { SupabaseClient } from '@supabase/supabase-js';
	// Aliased to avoid a name clash with the `<script module>` re-exports above
	// (which expose these types to external consumers).
	import type { ExerciseFormState as FormState, Level as FormLevel } from './form-mapping';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import LockedPythonEditor from '$lib/components/python/LockedPythonEditor.svelte';
	import ExerciseRichTextEditor from '$lib/components/exercises/ExerciseRichTextEditor.svelte';
	import { parseTemplate } from '$lib/utils/locked-zones';
	import ExerciseValidationResult from './ExerciseValidationResult.svelte';
	import ExerciseStrategyEditor from './ExerciseStrategyEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { PlaygroundExecutor, type ExerciseValidationResult as Result } from '$lib/shared/python';
	import { CheckCircle2, AlertTriangle, Loader2 } from '@lucide/svelte';

	type Props = {
		initialForm: FormState;
		mode: 'create' | 'edit';
		/** Where the Cancel button leads. Defaults sensible by mode if omitted. */
		cancelHref?: string;
		onSubmit: (form: FormState) => Promise<void>;
		/**
		 * Optional Supabase client + user id forwarded to the rich-text
		 * editor for image uploads. When omitted the editor still works but
		 * the image upload button surfaces an error toast.
		 */
		supabase?: SupabaseClient;
		userId?: string;
	};

	let { initialForm, mode, cancelHref, onSubmit, supabase, userId }: Props = $props();

	// Clone the prop so subsequent mutations don't accidentally alias the
	// parent's object. The form is consumed once at mount time; the parent
	// is not expected to swap `initialForm` later.
	// svelte-ignore state_referenced_locally
	let form = $state<FormState>(structuredClone(initialForm));

	let executor = $state<PlaygroundExecutor | null>(null);
	let verifyResult = $state<Result | null>(null);
	let isVerifying = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	const pyodideReady = $derived(executor?.state === 'ready');

	// Live parse of the starter_code template to drive the locked-zones
	// preview / error panel just below the textarea. The teacher sees the
	// markers as they type them; malformed ones surface a red banner so
	// they can be fixed before the exercise is published.
	//
	// `debouncedStarterCode` lags `form.starter_code` by ~500ms so the
	// LockedPythonEditor preview doesn't get remounted on every keystroke
	// (each remount destroys + recreates an EditorView, flashing a
	// spinner). The error banner uses the debounced value too — without
	// it, every intermediate keystroke inside a marker would flash a red
	// "malformed" message before the teacher finishes the syntax.
	// svelte-ignore state_referenced_locally
	let debouncedStarterCode = $state(initialForm.starter_code ?? '');
	$effect(() => {
		const code = form.starter_code;
		const timer = setTimeout(() => {
			debouncedStarterCode = code;
		}, 500);
		return () => clearTimeout(timer);
	});

	const starterParse = $derived(parseTemplate(debouncedStarterCode));
	const hasStarterMarkers = $derived(starterParse.markers.length > 0);
	const hasStarterErrors = $derived(starterParse.errors.length > 0);
	// Preview-only sink — `bind:value` on the LockedPythonEditor below
	// requires a writable target; we ignore the reconstructed code here.
	let _starterPreviewSink = $state('');
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
			// Snapshot the $state proxy: postMessage to the Pyodide worker fails
			// with "could not be cloned" on Svelte 5 reactive proxies.
			verifyResult = await executor.validateExercise(
				form.solution_code,
				$state.snapshot(form.validation_config)
			);
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
			<span class="mb-1 block text-sm font-medium">Instructions</span>
			<ExerciseRichTextEditor bind:value={form.instructions} {supabase} {userId} />
		</div>

		<div>
			<label for="ex-level" class="mb-1 block text-sm font-medium">
				Niveau <span class="text-destructive">*</span>
			</label>
			<MySelect
				id="ex-level"
				items={levelItems}
				value={form.level}
				onchange={(v: string) => (form.level = v as FormLevel)}
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
			<details class="mt-2 text-xs text-muted-foreground">
				<summary class="cursor-pointer hover:text-foreground">
					Zones modifiables uniquement (optionnel) — syntaxe
				</summary>
				<div class="mt-2 space-y-1 rounded-md border border-border bg-muted/30 p-3">
					<p>
						Insère des marqueurs <code>{'{{nom | "valeur"}}'}</code> dans le code initial pour délimiter
						les seules zones que l'élève pourra modifier (le reste est verrouillé). Les marqueurs tiennent
						sur une seule ligne, le nom doit être un identifiant Python.
					</p>
					<p>Exemple&nbsp;:</p>
					<pre class="rounded bg-background p-2 font-mono text-[11px]">{`while {{cond | "False"}}:
    A = {{update | "..."}}    # à compléter
    n = n + 1`}</pre>
					<p>
						À la soumission, le code envoyé à Pyodide est reconstruit en remplaçant chaque marqueur
						par la valeur saisie par l'élève (ou par la valeur par défaut s'il l'a laissée telle
						quelle).
					</p>
				</div>
			</details>

			{#if hasStarterErrors}
				<div
					role="alert"
					class="mt-2 rounded-md border border-red-500 bg-red-50 p-3 text-xs dark:bg-red-950/40"
				>
					<div class="mb-1 font-medium text-red-900 dark:text-red-100">Marqueurs mal formés</div>
					<ul class="list-disc pl-5 text-red-800 dark:text-red-200">
						{#each starterParse.errors as err, i (i)}
							<li>{err.message}</li>
						{/each}
					</ul>
					<p class="mt-1 text-red-700 dark:text-red-300">
						Tant que les marqueurs sont en erreur, l'exercice s'ouvrira en édition libre côté élève
						(mode dégradé).
					</p>
				</div>
			{:else if hasStarterMarkers}
				<div class="mt-2">
					<p class="mb-1 text-xs text-muted-foreground">
						Aperçu côté élève ({starterParse.markers.length}
						{starterParse.markers.length > 1 ? 'zones modifiables' : 'zone modifiable'})
					</p>
					{#key debouncedStarterCode}
						<div class="h-40 overflow-hidden rounded-md border border-border bg-muted/10">
							<LockedPythonEditor
								template={debouncedStarterCode}
								bind:value={_starterPreviewSink}
							/>
						</div>
					{/key}
				</div>
			{/if}
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
		<Button type="button" variant="outline" href={cancelTo}>{lore.actions.cancel}</Button>
		<Button type="submit" disabled={!canSubmit}>
			{#if isSubmitting}
				<Loader2 class="mr-1 h-4 w-4 animate-spin" />
			{/if}
			{submitLabel}
		</Button>
	</div>
</form>
