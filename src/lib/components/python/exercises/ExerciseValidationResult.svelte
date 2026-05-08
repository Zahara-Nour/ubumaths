<script lang="ts">
	/**
	 * Display the result of an exercise validation run.
	 *
	 * Three layers, in order:
	 *   1. Header banner — green (valid), red (invalid), amber (error)
	 *   2. AST issues — list of `ast_issues` messages (only for ast strategy)
	 *   3. Test cases — collapsible <details>, compact when closed, full
	 *      input/expected/actual/error when open
	 *
	 * Result shape comes from the worker via BasePythonExecutor.validateExercise.
	 */

	import type { ExerciseValidationResult } from '$lib/shared/python';
	import { CheckCircle2, XCircle, AlertTriangle, Loader2, Lock } from 'lucide-svelte';

	type Props = {
		/** Validation result, or null when no validation has run yet */
		result: ExerciseValidationResult | null;
		/** Whether a validation is currently in flight (shows a spinner) */
		loading?: boolean;
	};

	let { result, loading = false }: Props = $props();

	const passedCount = $derived(result ? result.test_results.filter((r) => r.passed).length : 0);
	const totalCount = $derived(result ? result.test_results.length : 0);

	const hasGlobalError = $derived(Boolean(result?.error));
	const hasAstIssues = $derived(result?.ast_issues !== undefined && result.ast_issues.length > 0);
</script>

{#if loading}
	<div
		class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
		role="status"
		aria-live="polite"
	>
		<Loader2 class="h-4 w-4 animate-spin" />
		<span>Validation en cours…</span>
	</div>
{:else if result}
	<div class="space-y-3">
		{#if hasGlobalError}
			<div
				class="flex items-start gap-2 rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-950/40"
				role="alert"
			>
				<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
				<div>
					<div class="font-medium text-amber-900 dark:text-amber-100">Erreur</div>
					<div class="text-amber-800 dark:text-amber-200">{result.error}</div>
				</div>
			</div>
		{:else if result.valid}
			<div
				class="flex items-start gap-2 rounded-lg border border-green-500 bg-green-50 p-3 dark:bg-green-950/40"
				role="status"
			>
				<CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
				<div>
					<div class="font-medium text-green-900 dark:text-green-100">Validation réussie</div>
					{#if totalCount > 0}
						<div class="text-sm text-green-800 dark:text-green-200">
							{passedCount}/{totalCount} tests passent
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div
				class="flex items-start gap-2 rounded-lg border border-red-500 bg-red-50 p-3 dark:bg-red-950/40"
				role="alert"
			>
				<XCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
				<div>
					<div class="font-medium text-red-900 dark:text-red-100">Validation échouée</div>
					{#if totalCount > 0}
						<div class="text-sm text-red-800 dark:text-red-200">
							{passedCount}/{totalCount} tests passent
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if hasAstIssues}
			<ul class="space-y-1">
				{#each result.ast_issues ?? [] as issue (issue)}
					<li
						class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50/60 p-2 text-sm dark:border-amber-800 dark:bg-amber-950/20"
					>
						<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
						<span class="text-amber-900 dark:text-amber-100">{issue}</span>
					</li>
				{/each}
			</ul>
		{/if}

		{#if totalCount > 0}
			<ul class="space-y-1">
				{#each result.test_results as testCase, i (i)}
					<li>
						{#if testCase.hidden}
							<!-- Hidden tests show only verdict + lock icon. No <details>, no I/O. -->
							<div
								class="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2 text-sm"
							>
								<Lock class="h-4 w-4 shrink-0 text-muted-foreground" />
								{#if testCase.passed}
									<CheckCircle2 class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
								{:else}
									<XCircle class="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
								{/if}
								<span class="truncate text-muted-foreground">Test {i + 1} (caché)</span>
								{#if testCase.error}
									<span class="ml-2 truncate text-xs text-red-700 dark:text-red-400">
										{testCase.error}
									</span>
								{/if}
							</div>
						{:else}
							<details class="rounded-md border border-border bg-card">
								<summary
									class="flex cursor-pointer items-center gap-2 p-2 text-sm hover:bg-muted/50"
								>
									{#if testCase.passed}
										<CheckCircle2 class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
									{:else}
										<XCircle class="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
									{/if}
									<span class="truncate">
										Test {i + 1}{#if testCase.input}
											&nbsp;·&nbsp;<code class="text-xs">{testCase.input.trim() || '∅'}</code>
										{/if}
									</span>
								</summary>
								<dl class="space-y-1 border-t border-border p-3 text-xs">
									{#if testCase.input !== undefined}
										<div class="grid grid-cols-[6rem_1fr] gap-2">
											<dt class="font-medium text-muted-foreground">Entrée</dt>
											<dd>
												<code class="break-all">{testCase.input || '(vide)'}</code>
											</dd>
										</div>
									{/if}
									{#if testCase.expected !== undefined}
										<div class="grid grid-cols-[6rem_1fr] gap-2">
											<dt class="font-medium text-muted-foreground">Attendu</dt>
											<dd>
												<code class="break-all">{testCase.expected}</code>
											</dd>
										</div>
									{/if}
									{#if testCase.actual !== undefined}
										<div class="grid grid-cols-[6rem_1fr] gap-2">
											<dt class="font-medium text-muted-foreground">Obtenu</dt>
											<dd>
												<code class="break-all">{testCase.actual}</code>
											</dd>
										</div>
									{/if}
									{#if testCase.diff}
										<div class="grid grid-cols-[6rem_1fr] gap-2 text-amber-700 dark:text-amber-400">
											<dt class="font-medium">Indice</dt>
											<dd>{testCase.diff}</dd>
										</div>
									{/if}
									{#if testCase.error}
										<div class="grid grid-cols-[6rem_1fr] gap-2 text-red-700 dark:text-red-400">
											<dt class="font-medium">Erreur</dt>
											<dd>{testCase.error}</dd>
										</div>
									{/if}
								</dl>
							</details>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
