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
	import {
		Play,
		CheckCircle2,
		RotateCcw,
		Send,
		History,
		XCircle,
		BarChart3,
		LineChart,
		FunctionSquare,
		Link2
	} from 'lucide-svelte';

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

	// "Tester ma fonction" panel (only for unit_test exercises)
	type CallEntry = { input: string; ok: boolean; output: string };
	let callInput = $state('');
	let callResult = $state<string | null>(null);
	let callError = $state<string | null>(null);
	let isCalling = $state(false);
	let callHistory = $state<CallEntry[]>([]);
	const isUnitTest = $derived(exercise.validation_config.type === 'unit_test');
	const callFunctionName = $derived(
		isUnitTest && 'function_name' in exercise.validation_config
			? exercise.validation_config.function_name
			: ''
	);

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

	/**
	 * Parse user-typed args expression into a JSON array.
	 * Wraps the input as `[<input>]` so a single value or comma-separated values
	 * both work. Accepts JSON syntax (true/false/null, not True/False/None).
	 */
	function parseCallArgs(input: string): unknown[] {
		const trimmed = input.trim();
		if (trimmed === '') return [];
		const wrapped = `[${trimmed}]`;
		const parsed = JSON.parse(wrapped);
		if (!Array.isArray(parsed)) {
			throw new Error("Le résultat n'est pas une liste d'arguments");
		}
		return parsed;
	}

	async function handleCallFunction() {
		if (!executor || !pyodideReady || !callFunctionName) return;
		callResult = null;
		callError = null;
		isCalling = true;
		try {
			let args: unknown[];
			try {
				args = parseCallArgs(callInput);
			} catch (e) {
				callError = `Arguments invalides : ${e instanceof Error ? e.message : String(e)}`;
				return;
			}

			// Synthesize a unit_test config with a single test case where `expected`
			// is unset on purpose: we don't care if it passes — we only read `actual`
			// from the test result, which is the JSON-stringified return value.
			const result = await executor.validateExercise(code, {
				type: 'unit_test',
				function_name: callFunctionName,
				test_cases: [{ args, expected: null, hidden: false }],
				timeout_ms: 5000
			});

			const tc = result.test_results[0];
			if (!tc) {
				callError = result.error ?? 'Aucun résultat';
				return;
			}

			if (tc.error) {
				callError = tc.error;
				callHistory = [{ input: callInput, ok: false, output: tc.error }, ...callHistory].slice(
					0,
					5
				);
			} else if (typeof tc.actual === 'string') {
				callResult = tc.actual;
				callHistory = [{ input: callInput, ok: true, output: tc.actual }, ...callHistory].slice(
					0,
					5
				);
			} else {
				callError = 'Résultat indisponible';
			}
		} finally {
			isCalling = false;
		}
	}

	async function handleCopyLink() {
		if (!browser) return;
		const url = `${window.location.protocol}//${window.location.host}/python-exercises/${exercise.id}`;
		try {
			await navigator.clipboard.writeText(url);
			toaster.success('Lien copié');
		} catch {
			toaster.error('Impossible de copier le lien');
		}
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
		<div class="flex items-start justify-between gap-4">
			<h1 class="mb-2 text-2xl font-bold">{exercise.title}</h1>
			<div class="flex items-center gap-2">
				{#if isTeacher}
					<Button variant="outline" size="sm" onclick={handleCopyLink}>
						<Link2 class="mr-1 h-4 w-4" />
						Copier le lien
					</Button>
				{/if}
				{#if canSubmit}
					<Button variant="outline" size="sm" href="/python-exercises/my-progress">
						<LineChart class="mr-1 h-4 w-4" />
						Ma progression
					</Button>
				{/if}
				{#if data.canViewResults}
					<Button variant="outline" size="sm" href="/python-exercises/{exercise.id}/results">
						<BarChart3 class="mr-1 h-4 w-4" />
						Voir les résultats
					</Button>
				{/if}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Badge>{levelLabel}</Badge>
			{#each exercise.tags as tag (tag)}
				<Badge variant="outline">{tag}</Badge>
			{/each}
			{#if data.masteryStatus === 'mastered'}
				<Badge class="bg-green-500 text-white hover:bg-green-600">Maîtrisé</Badge>
			{:else if data.masteryStatus === 'needs_review'}
				<Badge class="bg-amber-500 text-white hover:bg-amber-600">À retravailler</Badge>
			{/if}
		</div>
		{#if exercise.description}
			<p class="mt-2 text-sm text-muted-foreground">{exercise.description}</p>
		{/if}
		{#if exercise.source}
			<p class="mt-1 text-xs text-muted-foreground">
				<span class="font-medium">Source :</span>
				{exercise.source}
			</p>
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
				{#if !isUnitTest}
					<Button onclick={handleRun} disabled={!pyodideReady || isValidating || isSubmitting}>
						<Play class="mr-1 h-4 w-4" /> Run
					</Button>
				{/if}
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

			{#if !isUnitTest}
				<PythonOutput
					stdout={executor?.stdout ?? ''}
					stderr={executor?.stderr ?? ''}
					plotData={executor?.plotData ?? null}
					latexOutput={executor?.latexOutput ?? null}
					plotlyData={executor?.plotlyData ?? null}
					errorLine={executor?.errorLine ?? null}
					executionTime={executor?.executionTime ?? 0}
				/>
			{/if}

			{#if isUnitTest}
				<div class="rounded-md border border-border bg-card p-3">
					<div class="mb-2 flex items-center gap-2 text-sm font-medium">
						<FunctionSquare class="h-4 w-4 text-primary" />
						Tester ma fonction
					</div>
					<form
						class="flex flex-wrap items-center gap-2"
						onsubmit={(e) => {
							e.preventDefault();
							handleCallFunction();
						}}
					>
						<span class="font-mono text-sm">{callFunctionName}(</span>
						<input
							type="text"
							bind:value={callInput}
							placeholder="ex: 4   ou   1, 2   ou   [1,2,3]"
							class="flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm focus:border-primary focus:outline-none"
							disabled={!pyodideReady || isCalling}
						/>
						<span class="font-mono text-sm">)</span>
						<Button
							type="submit"
							size="sm"
							disabled={!pyodideReady || isCalling || isValidating || isSubmitting}
						>
							<Play class="mr-1 h-4 w-4" />
							{isCalling ? 'Appel…' : 'Appeler'}
						</Button>
					</form>

					{#if callResult !== null}
						<div
							class="mt-3 rounded-md border border-green-500/30 bg-green-500/10 p-2 font-mono text-sm"
						>
							<span class="text-muted-foreground">→</span>
							<span class="ml-1 text-green-700 dark:text-green-300">{callResult}</span>
						</div>
					{/if}
					{#if callError !== null}
						<div
							class="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 font-mono text-sm text-red-700 dark:text-red-300"
						>
							<span class="mr-1">✕</span>{callError}
						</div>
					{/if}

					{#if callHistory.length > 0}
						<details class="mt-3 text-sm">
							<summary class="cursor-pointer text-muted-foreground hover:text-foreground">
								Historique ({callHistory.length})
							</summary>
							<ul class="mt-2 space-y-1 font-mono text-xs">
								{#each callHistory as entry, i (i)}
									<li class="flex items-baseline gap-2">
										<span class="text-muted-foreground">{callFunctionName}({entry.input})</span>
										<span
											class={entry.ok
												? 'text-green-600 dark:text-green-400'
												: 'text-red-600 dark:text-red-400'}
										>
											{entry.ok ? '→' : '✕'}
										</span>
										<span class="break-all">{entry.output}</span>
									</li>
								{/each}
							</ul>
						</details>
					{/if}
				</div>
			{/if}

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
