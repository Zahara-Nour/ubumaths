<script lang="ts">
	import {
		transpileLatexToMarkdown,
		splitStatementAndSolution,
		type TranspileResult,
		type SplitResult
	} from '$lib/ubumark/importers/latex';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import LaTeXEditor from '$lib/components/LaTeXEditor.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import type { Exercise } from '$lib/exercises/types';

	// ============================================================================
	// STATE
	// ============================================================================

	const sampleLatex = `\\section{Exercice}

Soit $f(x) = x^2 - 4x + 3$ et $g(x) = \\frac{1}{x-1}$.

\\begin{enumerate}
\\item Étudier la fonction $f$ :
  \\begin{enumerate}
  \\item Calculer $f(0)$ et $f(1)$.
  \\item Déterminer les racines de $f$.
  \\item Étudier les variations :
    \\begin{itemize}
    \\item Calculer $f'(x)$
    \\item Dresser le tableau de signes de $f'(x)$
    \\item En déduire le tableau de variations
    \\end{itemize}
  \\end{enumerate}
\\item Étudier la fonction $g$ :
  \\begin{itemize}
  \\item Domaine de définition
  \\item Limites aux bornes
  \\item Asymptotes
  \\end{itemize}
\\item Résoudre $f(x) = g(x)$.
\\end{enumerate}

\\begin{solution}
\\begin{enumerate}
\\item Étude de $f$ :
  \\begin{enumerate}
  \\item $f(0) = 3$ et $f(1) = 0$
  \\item $f(x) = (x-1)(x-3)$, donc racines : $x = 1$ et $x = 3$
  \\item Variations :
    \\begin{itemize}
    \\item $f'(x) = 2x - 4$
    \\item $f'(x) = 0 \\Leftrightarrow x = 2$
    \\item $f$ décroissante sur $]-\\infty; 2]$, croissante sur $[2; +\\infty[$
    \\end{itemize}
  \\end{enumerate}
\\item $D_g = \\mathbb{R} \\setminus \\{1\\}$, asymptote verticale $x = 1$
\\item $f(x) = g(x) \\Leftrightarrow x = \\frac{1 + \\sqrt{13}}{2}$
\\end{enumerate}
\\end{solution}`;

	let latexInput = $state(sampleLatex);
	let transpileResult = $state<TranspileResult | null>(null);
	let splitResult = $state<SplitResult | null>(null);
	let statementMarkdown = $state<string>('');
	let solutionMarkdown = $state<string>('');
	let activeTab = $state('input');
	let error = $state<string | null>(null);

	// Additional function names for derivative notation (e.g., C', P')
	let functionNamesInput = $state('');

	// Editable markdown (separate from transpiled result)
	let editableMarkdown = $state<string>('');

	// ============================================================================
	// DERIVED VALUES
	// ============================================================================

	let mockExercise = $derived.by<Exercise | null>(() => {
		if (!statementMarkdown && !solutionMarkdown) return null;

		return {
			id: 'debug-exercise',
			title: 'Debug Exercise',
			statement_md: statementMarkdown,
			solution_md: solutionMarkdown,
			difficulty: 1 as const,
			tags: ['debug'],
			distribution_mode: 'on_demand',
			is_public: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'debug'
		};
	});

	let warningsCount = $derived(transpileResult?.warnings.length || 0);

	// Parse function names from input (comma or space separated)
	let additionalFunctionNames = $derived(
		functionNamesInput
			.split(/[,\s]+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0)
	);

	// For capturing raw HTML from rendered markdown
	let htmlContainer = $state<HTMLElement | null>(null);
	let rawHtml = $state('');

	/**
	 * Clean and format HTML for display:
	 * - Remove Svelte hydration markers (<!---->, <!>)
	 * - Add newlines and indentation for readability
	 */
	function formatHtml(html: string): string {
		// Remove Svelte markers
		let cleaned = html
			.replace(/<!--[\s\S]*?-->/g, '') // Remove all HTML comments
			.replace(/<!>/g, ''); // Remove Svelte markers

		// Simple formatting: add newlines after closing tags
		cleaned = cleaned
			.replace(/>\s*</g, '>\n<') // Newline between tags
			.replace(
				/(<\/?(div|p|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|blockquote|pre|figure|figcaption|hr)[^>]*>)/gi,
				'\n$1\n'
			) // Newlines around block elements
			.replace(/\n\s*\n/g, '\n') // Remove multiple blank lines
			.trim();

		// Indent nested elements
		const lines = cleaned.split('\n');
		let indent = 0;
		const formatted = lines
			.map((line) => {
				const trimmed = line.trim();
				if (!trimmed) return '';

				// Decrease indent for closing tags
				if (trimmed.match(/^<\/(div|ul|ol|li|table|thead|tbody|tr|blockquote|figure)/i)) {
					indent = Math.max(0, indent - 1);
				}

				const result = '  '.repeat(indent) + trimmed;

				// Increase indent for opening tags (not self-closing)
				if (
					trimmed.match(/^<(div|ul|ol|li|table|thead|tbody|tr|blockquote|figure)(?![^>]*\/>)/i) &&
					!trimmed.match(/<\/[^>]+>$/)
				) {
					indent++;
				}

				return result;
			})
			.filter(Boolean);

		return formatted.join('\n');
	}

	// Capture HTML after render
	$effect(() => {
		if (htmlContainer && statementMarkdown) {
			// Wait for render to complete
			requestAnimationFrame(() => {
				const html = htmlContainer?.innerHTML ?? '';
				rawHtml = formatHtml(html);
			});
		} else {
			rawHtml = '';
		}
	});

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	function handleTranspile() {
		error = null;
		const allWarnings: TranspileResult['warnings'] = [];

		// Build options with additional function names if provided
		const baseOptions =
			additionalFunctionNames.length > 0 ? { additionalFunctionNames } : undefined;

		try {
			// Step 1: Split LaTeX into statement and solution FIRST
			splitResult = splitStatementAndSolution(latexInput);

			// Step 2: Transpile each part separately (like LaTeXImportDialog does)
			if (splitResult.statement.trim()) {
				const statementResult = transpileLatexToMarkdown(splitResult.statement, {
					...baseOptions,
					lineOffset: splitResult.statementLineOffset
				});
				statementMarkdown = statementResult.markdown;
				allWarnings.push(...statementResult.warnings);
			} else {
				statementMarkdown = '';
			}

			if (splitResult.solution?.trim()) {
				const solutionResult = transpileLatexToMarkdown(splitResult.solution, {
					...baseOptions,
					lineOffset: splitResult.solutionLineOffset ?? 0
				});
				solutionMarkdown = solutionResult.markdown;
				allWarnings.push(...solutionResult.warnings);
			} else {
				solutionMarkdown = '';
			}

			// Step 3: Also transpile full input for the "Markdown" tab (to show raw output)
			transpileResult = transpileLatexToMarkdown(latexInput, baseOptions);
			// Merge warnings from all transpilations
			transpileResult = {
				...transpileResult,
				warnings: allWarnings
			};

			// Initialize editable markdown with transpiled result
			editableMarkdown = transpileResult.markdown;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur inconnue lors de la transpilation';
			transpileResult = null;
			splitResult = null;
			statementMarkdown = '';
			solutionMarkdown = '';
			editableMarkdown = '';
		}
	}

	/**
	 * Render the edited markdown in the other tabs
	 */
	function handleRenderMarkdown() {
		// Use the edited markdown directly for rendering
		statementMarkdown = editableMarkdown;
		solutionMarkdown = ''; // No solution when rendering edited markdown directly
	}

	/**
	 * Export warnings to clipboard as JSON
	 */
	async function exportWarnings() {
		if (!transpileResult?.warnings.length) return;

		const data = {
			exportedAt: new Date().toISOString(),
			warningsCount: transpileResult.warnings.length,
			warnings: transpileResult.warnings
		};

		await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	let copied = $state(false);
	let markdownCopied = $state(false);

	/**
	 * Copy markdown to clipboard
	 */
	async function copyMarkdown() {
		if (!editableMarkdown) return;
		await navigator.clipboard.writeText(editableMarkdown);
		markdownCopied = true;
		setTimeout(() => (markdownCopied = false), 2000);
	}
</script>

<svelte:head>
	<title>Debug LaTeX Transpiler - UbuMaths</title>
</svelte:head>

<div class="container mx-auto p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Debug LaTeX Transpiler</h1>
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<label for="function-names" class="text-sm whitespace-nowrap text-muted-foreground"
					>Fonctions :</label
				>
				<input
					id="function-names"
					type="text"
					bind:value={functionNamesInput}
					placeholder="C, P, N..."
					class="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
				/>
			</div>
			<Button onclick={handleTranspile}>Transpiler</Button>
		</div>
	</div>

	{#if error}
		<div class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
			<p class="text-sm font-medium text-destructive">Erreur</p>
			<p class="mt-1 text-sm text-destructive/80">{error}</p>
		</div>
	{/if}

	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-6">
			<Tabs.Trigger value="input">Input</Tabs.Trigger>
			<Tabs.Trigger value="markdown">Markdown</Tabs.Trigger>
			<Tabs.Trigger value="html">HTML</Tabs.Trigger>
			<Tabs.Trigger value="render">Rendu</Tabs.Trigger>
			<Tabs.Trigger value="splitter">Splitter</Tabs.Trigger>
			<Tabs.Trigger value="stats" class="flex items-center gap-2">
				Stats
				{#if warningsCount > 0}
					<Badge variant="destructive" class="ml-1 text-xs">{warningsCount}</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Input Tab -->
		<Tabs.Content value="input" class="mt-4">
			<LaTeXEditor
				bind:value={latexInput}
				height="600px"
				placeholder="Entrez votre code LaTeX ici..."
				lineWrapping={true}
			/>
		</Tabs.Content>

		<!-- Markdown Tab -->
		<Tabs.Content value="markdown" class="mt-4">
			<div class="mb-2 flex justify-end gap-2">
				<Button onclick={copyMarkdown} variant="outline" disabled={!editableMarkdown}>
					{markdownCopied ? 'Copié !' : 'Copier'}
				</Button>
				<Button onclick={handleRenderMarkdown} variant="secondary" disabled={!editableMarkdown}>
					Render
				</Button>
			</div>
			{#if editableMarkdown || transpileResult}
				<LaTeXEditor
					bind:value={editableMarkdown}
					height="600px"
					placeholder="Markdown genere (editable)..."
					lineWrapping={true}
				/>
			{:else}
				<p class="text-muted-foreground">Cliquez sur "Transpiler" pour voir le resultat</p>
			{/if}
		</Tabs.Content>

		<!-- HTML Tab (raw HTML output) -->
		<Tabs.Content value="html" class="mt-4">
			{#if rawHtml}
				<div class="rounded-lg border border-border bg-muted p-4">
					<pre class="overflow-x-auto font-mono text-sm whitespace-pre-wrap">{rawHtml}</pre>
				</div>
			{:else}
				<p class="text-muted-foreground">Cliquez sur "Transpiler" pour voir le resultat</p>
			{/if}
		</Tabs.Content>

		<!-- Render Tab -->
		<Tabs.Content value="render" class="mt-4">
			{#if mockExercise}
				<div class="rounded-lg border border-border p-4">
					<ExerciseDisplay exercise={mockExercise} mode="instance" showSolution={true} />
				</div>
			{:else}
				<p class="text-muted-foreground">Cliquez sur "Transpiler" pour voir le rendu</p>
			{/if}
		</Tabs.Content>

		<!-- Splitter Tab -->
		<Tabs.Content value="splitter" class="mt-4">
			{#if splitResult}
				<div class="space-y-4">
					<div class="rounded-lg border border-border p-4">
						<div class="mb-2 flex items-center gap-2">
							<h3 class="font-semibold">Methode de detection</h3>
							<Badge variant="secondary">{splitResult.splitMethod}</Badge>
						</div>
					</div>

					<div class="rounded-lg border border-border p-4">
						<h3 class="mb-2 font-semibold">Enonce</h3>
						<pre
							class="overflow-x-auto rounded bg-muted p-3 font-mono text-sm whitespace-pre-wrap">{splitResult.statement}</pre>
					</div>

					{#if splitResult.solution}
						<div class="rounded-lg border border-border p-4">
							<h3 class="mb-2 font-semibold">Solution</h3>
							<pre
								class="overflow-x-auto rounded bg-muted p-3 font-mono text-sm whitespace-pre-wrap">{splitResult.solution}</pre>
						</div>
					{:else}
						<div class="rounded-lg border border-border bg-muted/50 p-4">
							<p class="text-muted-foreground">Aucune solution detectee</p>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-muted-foreground">
					Cliquez sur "Transpiler" pour voir le resultat du splitter
				</p>
			{/if}
		</Tabs.Content>

		<!-- Stats Tab -->
		<Tabs.Content value="stats" class="mt-4">
			{#if transpileResult}
				<div class="space-y-4">
					<!-- Stats -->
					{#if transpileResult.stats}
						<div class="rounded-lg border border-border p-4">
							<h3 class="mb-3 font-semibold">Statistiques</h3>
							<pre
								class="overflow-x-auto rounded bg-muted p-3 font-mono text-sm whitespace-pre-wrap">{JSON.stringify(
									transpileResult.stats,
									null,
									2
								)}</pre>
						</div>
					{/if}

					<!-- Warnings -->
					<div class="rounded-lg border border-border p-4">
						<div class="mb-3 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<h3 class="font-semibold">Warnings</h3>
								{#if warningsCount > 0}
									<Badge variant="destructive">{warningsCount}</Badge>
								{:else}
									<Badge variant="secondary">0</Badge>
								{/if}
							</div>
							{#if warningsCount > 0}
								<Button variant="outline" size="sm" onclick={exportWarnings}>
									{copied ? 'Copié !' : 'Copier JSON'}
								</Button>
							{/if}
						</div>

						{#if transpileResult.warnings.length > 0}
							<div class="space-y-2">
								{#each transpileResult.warnings as warning, index (index)}
									<div class="rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
										<div class="flex items-start gap-2">
											<Badge variant="outline" class="shrink-0">{warning.type}</Badge>
											<div class="flex-1">
												<p class="text-sm">{warning.message}</p>
												{#if warning.line}
													<p class="mt-1 text-xs text-muted-foreground">
														Ligne {warning.line}{#if warning.column}, colonne {warning.column}{/if}
													</p>
												{/if}
												{#if warning.command}
													<p class="mt-1 font-mono text-xs text-muted-foreground">
														Commande: {warning.command}
													</p>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">Aucun warning</p>
						{/if}
					</div>
				</div>
			{:else}
				<p class="text-muted-foreground">Cliquez sur "Transpiler" pour voir les statistiques</p>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Hidden container for HTML capture -->
{#if statementMarkdown}
	<div bind:this={htmlContainer} class="sr-only" aria-hidden="true">
		<MarkdownRenderer content={statementMarkdown} />
	</div>
{/if}
