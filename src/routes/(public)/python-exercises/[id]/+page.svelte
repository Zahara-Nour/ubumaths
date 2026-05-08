<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import PythonOutput from '$lib/components/python/PythonOutput.svelte';
	import ExerciseValidationResult from '$lib/components/python/exercises/ExerciseValidationResult.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { PlaygroundExecutor, type ExerciseValidationResult as Result } from '$lib/shared/python';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Play, CheckCircle2, RotateCcw, Send, History, XCircle } from 'lucide-svelte';

	let { data } = $props();
	const exercise = $derived(data.exercise);
	const submissions = $derived(data.submissions);
	const canSubmit = $derived(data.canSubmit);
	const isAuthenticated = $derived(data.isAuthenticated);
	const localStorageKey = $derived(`ubumaths-exercise-${exercise.id}`);

	let executor = $state<PlaygroundExecutor | null>(null);
	let code = $state('');
	let validationResult = $state<Result | null>(null);
	let isValidating = $state(false);
	let isSubmitting = $state(false);

	const pyodideReady = $derived(executor?.state === 'ready');
	const isLoadingPyodide = $derived(
		executor?.state === 'loading-pyodide' || executor?.state === 'loading-packages'
	);

	const levelLabel = $derived(
		exercise.level === 'college'
			? 'Collège'
			: exercise.level === 'lycee'
				? 'Lycée'
				: exercise.level === 'nsi'
					? 'NSI'
					: 'Étudiant'
	);

	// True when the visitor is authenticated but not a student (= a teacher).
	// In that case we hide the Submit button entirely.
	const isTeacher = $derived(isAuthenticated && !canSubmit);

	onMount(() => {
		if (!browser) return;

		// Initialise editor: last submitted code > localStorage > starter_code
		const saved = localStorage.getItem(localStorageKey);
		const lastSubmittedCode = submissions.length > 0 ? submissions[0].code : null;
		code = lastSubmittedCode ?? saved ?? exercise.starter_code ?? '';

		// Pre-load Pyodide so the first Run/Vérifier click is snappy.
		executor = new PlaygroundExecutor();
		executor.initPyodide();
	});

	onDestroy(() => {
		executor?.destroy();
	});

	// Auto-persist code to localStorage on every change.
	$effect(() => {
		if (!browser) return;
		if (code) {
			localStorage.setItem(localStorageKey, code);
		}
	});

	function handleRun() {
		if (!executor || !pyodideReady) return;
		validationResult = null;
		executor.execute(code);
	}

	async function runValidation(): Promise<Result | null> {
		if (!executor || !pyodideReady) return null;
		try {
			return await executor.validateExercise(code, exercise.validation_config);
		} catch (e) {
			return {
				valid: false,
				strategy: exercise.validation_config.type,
				test_results: [],
				error: e instanceof Error ? e.message : String(e),
				execution_time_ms: 0
			};
		}
	}

	async function handleValidate() {
		if (!executor || !pyodideReady) return;
		isValidating = true;
		try {
			validationResult = await runValidation();
		} finally {
			isValidating = false;
		}
	}

	async function handleSubmit() {
		if (!executor || !pyodideReady || !canSubmit) return;
		isSubmitting = true;
		try {
			const result = await runValidation();
			if (!result) return;
			validationResult = result;

			const response = await fetch(`/api/python-exercises/${exercise.id}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exercise_id: exercise.id,
					code,
					validation_result: result
				})
			});

			if (!response.ok) {
				const errBody = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				toaster.error(errBody.message ?? 'Échec de la soumission');
				return;
			}

			const payload = (await response.json()) as { message: string };
			if (result.valid) {
				toaster.success(payload.message);
			} else {
				toaster.info(payload.message);
			}

			// Refresh submissions list from the server.
			await invalidateAll();
		} finally {
			isSubmitting = false;
		}
	}

	function handleResetToStarter() {
		code = exercise.starter_code ?? '';
		validationResult = null;
	}

	function handleLoadSubmission(submissionCode: string) {
		code = submissionCode;
		validationResult = null;
	}

	function formatRelativeDate(iso: string): string {
		const date = new Date(iso);
		const diffMs = Date.now() - date.getTime();
		const diffMin = Math.floor(diffMs / 60_000);
		if (diffMin < 1) return "à l'instant";
		if (diffMin < 60) return `il y a ${diffMin} min`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `il y a ${diffHr} h`;
		const diffDays = Math.floor(diffHr / 24);
		if (diffDays < 30) return `il y a ${diffDays} j`;
		return date.toLocaleDateString('fr-FR');
	}
</script>

<svelte:head>
	<title>{exercise.title} – UbuMaths</title>
	{#if exercise.description}
		<meta name="description" content={exercise.description} />
	{/if}
</svelte:head>

<div class="container mx-auto p-4">
	<header class="mb-4">
		<h1 class="mb-2 text-2xl font-bold">{exercise.title}</h1>
		<div class="flex flex-wrap items-center gap-2">
			<Badge>{levelLabel}</Badge>
			{#each exercise.tags as tag (tag)}
				<Badge variant="outline">{tag}</Badge>
			{/each}
		</div>
		{#if exercise.description}
			<p class="mt-2 text-sm text-muted-foreground">{exercise.description}</p>
		{/if}
	</header>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
			{#if exercise.instructions}
				<MarkdownRenderer content={exercise.instructions} />
			{:else}
				<p class="text-sm text-muted-foreground">Pas d'instructions fournies.</p>
			{/if}
		</section>

		<section class="space-y-3">
			<div class="rounded-md border border-border">
				<PythonEditor bind:value={code} {executor} onExecute={handleRun} />
			</div>

			<div class="flex flex-wrap gap-2">
				<Button onclick={handleRun} disabled={!pyodideReady || isValidating || isSubmitting}>
					<Play class="mr-1 h-4 w-4" /> Run
				</Button>
				<Button onclick={handleValidate} disabled={!pyodideReady || isValidating || isSubmitting}>
					<CheckCircle2 class="mr-1 h-4 w-4" /> Vérifier
				</Button>

				{#if !isTeacher}
					<Button
						onclick={handleSubmit}
						disabled={!pyodideReady || isValidating || isSubmitting || !canSubmit}
						title={isAuthenticated ? undefined : 'Connecte-toi pour suivre tes progrès'}
					>
						<Send class="mr-1 h-4 w-4" />
						{isSubmitting ? 'Envoi…' : 'Soumettre'}
					</Button>
				{/if}

				<Button variant="outline" onclick={handleResetToStarter}>
					<RotateCcw class="mr-1 h-4 w-4" /> Réinitialiser
				</Button>

				{#if isLoadingPyodide}
					<span class="self-center text-xs text-muted-foreground">
						Chargement de Python… {executor?.loadingProgress ?? 0}%
					</span>
				{/if}
			</div>

			<PythonOutput
				stdout={executor?.stdout ?? ''}
				stderr={executor?.stderr ?? ''}
				plotData={executor?.plotData ?? null}
				latexOutput={executor?.latexOutput ?? null}
				plotlyData={executor?.plotlyData ?? null}
				errorLine={executor?.errorLine ?? null}
				executionTime={executor?.executionTime ?? 0}
			/>

			<ExerciseValidationResult result={validationResult} loading={isValidating || isSubmitting} />

			{#if submissions.length > 0}
				<details class="rounded-md border border-border bg-card" open>
					<summary class="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium">
						<History class="h-4 w-4" />
						Mes tentatives précédentes ({submissions.length})
					</summary>
					<ul class="space-y-1 border-t border-border p-2">
						{#each submissions as sub (sub.id)}
							<li class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
								{#if sub.is_correct}
									<CheckCircle2 class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
								{:else}
									<XCircle class="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
								{/if}
								<span class="text-muted-foreground">Tentative #{sub.attempt_number}</span>
								<span class="text-xs text-muted-foreground">·</span>
								<span class="text-xs text-muted-foreground"
									>{formatRelativeDate(sub.created_at)}</span
								>
								{#if sub.assignment_id === null}
									<Badge variant="outline" class="text-xs">Libre</Badge>
								{/if}
								<button
									type="button"
									class="ml-auto text-xs text-primary hover:underline"
									onclick={() => handleLoadSubmission(sub.code)}
								>
									Charger ce code
								</button>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		</section>
	</div>
</div>
