<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import ExerciseValidationResult from '$lib/components/python/exercises/ExerciseValidationResult.svelte';
	import ExerciseStrategyEditor from '$lib/components/python/exercises/ExerciseStrategyEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import {
		PlaygroundExecutor,
		type ExerciseValidationConfig,
		type ExerciseValidationResult as Result
	} from '$lib/shared/python';
	import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-svelte';

	const difficultyItems = [
		{ value: 'easy', label: 'Facile' },
		{ value: 'medium', label: 'Moyen' },
		{ value: 'hard', label: 'Difficile' }
	];

	type FormState = {
		title: string;
		description: string;
		instructions: string;
		starter_code: string;
		solution_code: string;
		validation_config: ExerciseValidationConfig;
		tags: string; // comma-separated, transformed on submit
		difficulty: 'easy' | 'medium' | 'hard';
		is_public: boolean;
	};

	let form = $state<FormState>({
		title: '',
		description: '',
		instructions: '',
		starter_code: '',
		solution_code: '',
		validation_config: { type: 'output', test_cases: [{ input: '', expected_output: '' }] },
		tags: '',
		difficulty: 'easy',
		is_public: true
	});

	let executor = $state<PlaygroundExecutor | null>(null);
	let verifyResult = $state<Result | null>(null);
	let isVerifying = $state(false);
	let isCreating = $state(false);
	let createError = $state<string | null>(null);

	const pyodideReady = $derived(executor?.state === 'ready');
	const verifyOk = $derived(verifyResult?.valid === true);
	const canCreate = $derived(
		verifyOk && form.title.trim().length > 0 && form.solution_code.trim().length > 0 && !isCreating
	);

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
			createError = 'Saisis une solution avant de vérifier.';
			return;
		}
		isVerifying = true;
		createError = null;
		try {
			verifyResult = await executor.validateExercise(form.solution_code, form.validation_config);
		} catch (e) {
			verifyResult = {
				valid: false,
				strategy: form.validation_config.type,
				test_results: [],
				error: e instanceof Error ? e.message : String(e),
				execution_time_ms: 0
			};
		} finally {
			isVerifying = false;
		}
	}

	async function handleCreate() {
		if (!canCreate) return;
		isCreating = true;
		createError = null;
		try {
			const tagsArray = form.tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);

			const res = await fetch('/api/python-exercises', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: form.title.trim(),
					description: form.description.trim() || null,
					instructions: form.instructions.trim() || null,
					starter_code: form.starter_code.trim() || null,
					solution_code: form.solution_code,
					validation_config: form.validation_config,
					tags: tagsArray,
					difficulty: form.difficulty,
					is_public: form.is_public
				})
			});

			if (!res.ok) {
				const message = await res.text();
				throw new Error(`HTTP ${res.status} : ${message || res.statusText}`);
			}

			const { exercise } = (await res.json()) as { exercise: { id: string } };
			await goto(`/python-exercises/${exercise.id}`);
		} catch (e) {
			createError = e instanceof Error ? e.message : String(e);
		} finally {
			isCreating = false;
		}
	}

	// Reset verify result whenever solution_code or validation_config changes —
	// the user's last verification is no longer trustworthy after edits.
	$effect(() => {
		void form.solution_code;
		void form.validation_config;
		verifyResult = null;
	});
</script>

<svelte:head>
	<title>Créer un exercice Python – UbuMaths</title>
</svelte:head>

<main class="container mx-auto p-4">
	<header class="mb-4">
		<h1 class="text-2xl font-bold">Créer un exercice Python</h1>
		<p class="text-sm text-muted-foreground">
			Renseigne les champs ci-dessous, vérifie que ta solution passe la validation, puis crée
			l'exercice. Tu obtiens un lien partageable.
		</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Left column: metadata + instructions -->
		<section class="space-y-4">
			<div>
				<label class="mb-1 block text-sm font-medium" for="ex-title"
					>Titre <span class="text-red-500">*</span></label
				>
				<Input
					id="ex-title"
					bind:value={form.title}
					placeholder="ex: Somme de deux nombres"
					required
				/>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium" for="ex-desc">Description courte</label>
				<Input
					id="ex-desc"
					bind:value={form.description}
					placeholder="Phrase de présentation (optionnel)"
				/>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium" for="ex-instr">
					Instructions (markdown supporté)
				</label>
				<textarea
					id="ex-instr"
					class="block w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
					rows="6"
					bind:value={form.instructions}
					placeholder="# Énoncé&#10;&#10;Écris une fonction `add(a, b)` qui retourne a + b."
				></textarea>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label class="mb-1 block text-sm font-medium" for="ex-difficulty">Difficulté</label>
					<MySelect
						id="ex-difficulty"
						items={difficultyItems}
						value={form.difficulty}
						onchange={(v) => (form.difficulty = v as FormState['difficulty'])}
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="ex-tags"
						>Tags (séparés par des virgules)</label
					>
					<Input id="ex-tags" bind:value={form.tags} placeholder="ex: arithmétique, débutant" />
				</div>
			</div>

			<MyCheckbox
				bind:checked={form.is_public}
				label="Exercice public (accessible à tous via le lien)"
			/>
		</section>

		<!-- Right column: code + validation_config + verify + submit -->
		<section class="space-y-4">
			<div>
				<label class="mb-1 block text-sm font-medium" for="ex-starter">
					Code initial (vu par l'élève)
				</label>
				<div class="rounded-md border border-border">
					<PythonEditor bind:value={form.starter_code} {executor} />
				</div>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium" for="ex-solution">
					Solution de référence <span class="text-red-500">*</span>
				</label>
				<p class="mb-1 text-xs text-muted-foreground">
					Sert à vérifier que la validation passe avec une solution correcte. Jamais montrée à
					l'élève.
				</p>
				<div class="rounded-md border border-border">
					<PythonEditor bind:value={form.solution_code} {executor} />
				</div>
			</div>

			<div class="rounded-md border border-border bg-muted/20 p-3">
				<h2 class="mb-2 font-medium">Stratégie de validation</h2>
				<ExerciseStrategyEditor bind:config={form.validation_config} />
			</div>

			<div class="space-y-2 rounded-md border border-border p-3">
				<div class="flex flex-wrap items-center gap-2">
					<Button onclick={handleVerify} disabled={!pyodideReady || isVerifying}>
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
						La solution doit passer la validation avant que tu puisses créer l'exercice.
					</p>
				{/if}
			</div>

			{#if createError}
				<div
					class="flex items-start gap-2 rounded-md border border-red-500 bg-red-50 p-3 text-sm dark:bg-red-950/40"
					role="alert"
				>
					<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
					<span>{createError}</span>
				</div>
			{/if}

			<Button class="w-full" onclick={handleCreate} disabled={!canCreate}>
				{#if isCreating}
					<Loader2 class="mr-1 h-4 w-4 animate-spin" />
				{/if}
				Créer l'exercice
			</Button>
		</section>
	</div>
</main>
