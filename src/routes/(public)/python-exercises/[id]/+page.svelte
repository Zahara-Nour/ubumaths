<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import PythonOutput from '$lib/components/python/PythonOutput.svelte';
	import ExerciseValidationResult from '$lib/components/python/exercises/ExerciseValidationResult.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { PlaygroundExecutor, type ExerciseValidationResult as Result } from '$lib/shared/python';
	import { Play, CheckCircle2, RotateCcw } from 'lucide-svelte';

	let { data } = $props();
	const exercise = $derived(data.exercise);
	const localStorageKey = $derived(`ubumaths-exercise-${exercise.id}`);

	let executor = $state<PlaygroundExecutor | null>(null);
	let code = $state('');
	let validationResult = $state<Result | null>(null);
	let isValidating = $state(false);

	const pyodideReady = $derived(executor?.state === 'ready');
	const isLoadingPyodide = $derived(
		executor?.state === 'loading-pyodide' || executor?.state === 'loading-packages'
	);

	const difficultyLabel = $derived(
		exercise.difficulty === 'easy'
			? 'Facile'
			: exercise.difficulty === 'medium'
				? 'Moyen'
				: 'Difficile'
	);

	onMount(() => {
		if (!browser) return;

		// Restore code from localStorage if present, else use starter_code.
		const saved = localStorage.getItem(localStorageKey);
		code = saved ?? exercise.starter_code ?? '';

		// Pre-load Pyodide so the first Run/Valider click is snappy.
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
		validationResult = null; // clear previous validation when running
		executor.execute(code);
	}

	async function handleValidate() {
		if (!executor || !pyodideReady) return;
		isValidating = true;
		try {
			validationResult = await executor.validateExercise(code, exercise.validation_config);
		} catch (e) {
			validationResult = {
				valid: false,
				strategy: exercise.validation_config.type,
				test_results: [],
				error: e instanceof Error ? e.message : String(e),
				execution_time_ms: 0
			};
		} finally {
			isValidating = false;
		}
	}

	function handleResetToStarter() {
		code = exercise.starter_code ?? '';
		validationResult = null;
	}
</script>

<svelte:head>
	<title>{exercise.title} – UbuMaths</title>
	{#if exercise.description}
		<meta name="description" content={exercise.description} />
	{/if}
</svelte:head>

<main class="container mx-auto p-4">
	<header class="mb-4">
		<h1 class="mb-2 text-2xl font-bold">{exercise.title}</h1>
		<div class="flex flex-wrap items-center gap-2">
			<Badge
				variant={exercise.difficulty === 'easy'
					? 'secondary'
					: exercise.difficulty === 'medium'
						? 'default'
						: 'destructive'}
			>
				{difficultyLabel}
			</Badge>
			{#each exercise.tags as tag (tag)}
				<Badge variant="outline">{tag}</Badge>
			{/each}
		</div>
		{#if exercise.description}
			<p class="mt-2 text-sm text-muted-foreground">{exercise.description}</p>
		{/if}
	</header>

	<div class="grid gap-4 lg:grid-cols-2">
		<!-- Left: instructions -->
		<section class="space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
			{#if exercise.instructions}
				<div class="prose prose-sm max-w-none dark:prose-invert">
					<MarkdownRenderer content={exercise.instructions} />
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">Pas d'instructions fournies.</p>
			{/if}
		</section>

		<!-- Right: editor + output -->
		<section class="space-y-3">
			<div class="rounded-md border border-border">
				<PythonEditor bind:value={code} {executor} onExecute={handleRun} />
			</div>

			<div class="flex flex-wrap gap-2">
				<Button onclick={handleRun} disabled={!pyodideReady || isValidating}>
					<Play class="mr-1 h-4 w-4" /> Run
				</Button>
				<Button onclick={handleValidate} disabled={!pyodideReady || isValidating}>
					<CheckCircle2 class="mr-1 h-4 w-4" /> Valider
				</Button>
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

			<ExerciseValidationResult result={validationResult} loading={isValidating} />
		</section>
	</div>
</main>
