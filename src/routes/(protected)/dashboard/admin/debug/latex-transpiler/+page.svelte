<script lang="ts">
	import {
		transpileLatexToMarkdown,
		splitStatementAndSolution,
		type TranspileResult,
		type SplitResult
	} from '$lib/exercises/transpilers/latex-to-markdown';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import { parseMarkdown } from '$lib/custom-markdown';
	import type {
		DocumentNode,
		BlockNode,
		InlineNode,
		ListNode,
		TableNode
	} from '$lib/custom-markdown';
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
	let activeTab = $state('markdown');
	let error = $state<string | null>(null);

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

	let statementHtml = $derived.by<string>(() => {
		if (!statementMarkdown) return '';
		try {
			const ast = parseMarkdown(statementMarkdown);
			return renderAstToHtml(ast);
		} catch (e) {
			return `<p class="text-destructive">Erreur de parsing: ${e instanceof Error ? e.message : 'Unknown error'}</p>`;
		}
	});

	let warningsCount = $derived(transpileResult?.warnings.length || 0);

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	function handleTranspile() {
		error = null;
		const allWarnings: TranspileResult['warnings'] = [];

		try {
			// Step 1: Split LaTeX into statement and solution FIRST
			splitResult = splitStatementAndSolution(latexInput);

			// Step 2: Transpile each part separately (like LaTeXImportDialog does)
			if (splitResult.statement.trim()) {
				const statementResult = transpileLatexToMarkdown(splitResult.statement);
				statementMarkdown = statementResult.markdown;
				allWarnings.push(...statementResult.warnings);
			} else {
				statementMarkdown = '';
			}

			if (splitResult.solution?.trim()) {
				const solutionResult = transpileLatexToMarkdown(splitResult.solution);
				solutionMarkdown = solutionResult.markdown;
				allWarnings.push(...solutionResult.warnings);
			} else {
				solutionMarkdown = '';
			}

			// Step 3: Also transpile full input for the "Markdown" tab (to show raw output)
			transpileResult = transpileLatexToMarkdown(latexInput);
			// Merge warnings from all transpilations
			transpileResult = {
				...transpileResult,
				warnings: allWarnings
			};
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur inconnue lors de la transpilation';
			transpileResult = null;
			splitResult = null;
			statementMarkdown = '';
			solutionMarkdown = '';
		}
	}

	// ============================================================================
	// AST TO HTML RENDERING (same logic as ExerciseDisplay)
	// ============================================================================

	function renderAstToHtml(ast: DocumentNode): string {
		if (!ast.children.length) {
			return '<p class="text-muted-foreground">Aucun contenu</p>';
		}
		return ast.children.map((child) => renderBlock(child)).join('');
	}

	function renderBlock(node: BlockNode): string {
		switch (node.type) {
			case 'paragraph':
				return `<p class="mb-4 text-foreground">${renderInlineChildren(node.children)}</p>`;

			case 'heading': {
				const level = node.level || 1;
				const headingClass = `text-${4 - Math.min(level, 3)}xl font-bold mb-4 mt-6 text-foreground`;
				return `<h${level} class="${headingClass}">${renderInlineChildren(node.children)}</h${level}>`;
			}

			case 'list':
				return renderList(node as ListNode);

			case 'table':
				return renderTable(node as unknown as TableNode);

			case 'math-block':
				return `<div class="my-6 flex justify-center">
					<math-field read-only class="text-2xl">${node.latex}</math-field>
				</div>`;

			case 'image':
				return `<figure class="my-6">
					<img src="${node.src}" alt="${node.alt || ''}" class="mx-auto max-w-full rounded-lg shadow-md" />
					${node.alt ? `<figcaption class="mt-2 text-center text-sm text-muted-foreground">${node.alt}</figcaption>` : ''}
				</figure>`;

			case 'horizontal-rule':
				return '<hr class="my-6 border-t border-border" />';

			case 'blockquote':
				return `<blockquote class="border-l-4 border-muted pl-4 my-4 italic">${node.children.map((c) => renderBlock(c)).join('')}</blockquote>`;

			case 'code-block':
				return `<pre class="bg-muted p-4 rounded-lg my-4 overflow-x-auto"><code>${escapeHtml(node.code)}</code></pre>`;

			default:
				return '';
		}
	}

	function renderInlineChildren(children: InlineNode[]): string {
		return children.map((child) => renderInline(child)).join('');
	}

	function renderInline(node: InlineNode): string {
		switch (node.type) {
			case 'text': {
				let text = escapeHtml(node.content);
				if (node.bold) text = `<strong>${text}</strong>`;
				if (node.italic) text = `<em>${text}</em>`;
				if (node.code)
					text = `<code class="rounded bg-muted px-1 py-0.5 text-sm text-foreground">${text}</code>`;
				return text;
			}

			case 'math-inline':
				return `<math-field read-only class="inline-math">${node.latex}</math-field>`;

			case 'line-break':
				return node.hard ? '<br />' : ' ';

			default:
				return '';
		}
	}

	function renderList(node: ListNode): string {
		const tag = node.ordered ? 'ol' : 'ul';
		const listClass = node.ordered ? 'list-decimal' : 'list-disc';
		const startAttr = node.ordered && node.start && node.start > 1 ? ` start="${node.start}"` : '';

		const items = node.items
			.map((item) => {
				const content = item.children
					.map((child) => {
						if (child.type === 'list') {
							return renderList(child as ListNode);
						}
						if (
							child.type === 'paragraph' ||
							child.type === 'heading' ||
							child.type === 'table' ||
							child.type === 'math-block' ||
							child.type === 'image' ||
							child.type === 'horizontal-rule'
						) {
							return renderBlock(child as BlockNode);
						}
						return '';
					})
					.join('');
				return `<li class="ml-6 mb-2 text-foreground">${content}</li>`;
			})
			.join('');

		return `<${tag} class="${listClass} my-4 text-foreground"${startAttr}>${items}</${tag}>`;
	}

	function renderTable(node: TableNode): string {
		const header = node.header
			.map(
				(cell) =>
					`<th class="px-4 py-2 font-semibold text-foreground border border-border">${escapeHtml(cell.content)}</th>`
			)
			.join('');

		const body = node.rows
			.map(
				(row) => `<tr class="border-b border-border">
			${row.map((cell) => `<td class="px-4 py-2 text-foreground border border-border">${escapeHtml(cell.content)}</td>`).join('')}
		</tr>`
			)
			.join('');

		return `<div class="my-6 overflow-x-auto">
			<table class="min-w-full border-collapse border border-border">
				<thead class="bg-muted"><tr>${header}</tr></thead>
				<tbody>${body}</tbody>
			</table>
		</div>`;
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
</script>

<svelte:head>
	<title>Debug LaTeX Transpiler - UbuMaths</title>
</svelte:head>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-2xl font-bold">Debug LaTeX Transpiler</h1>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Left: Input -->
		<div class="flex flex-col gap-4">
			<label for="latex-input" class="text-sm font-medium">LaTeX Input</label>
			<textarea
				id="latex-input"
				bind:value={latexInput}
				rows={20}
				class="w-full rounded-lg border border-border bg-background p-4 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
				placeholder="Entrez votre code LaTeX ici..."
			></textarea>
			<Button onclick={handleTranspile} class="w-full">Transpiler</Button>

			{#if error}
				<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
					<p class="text-sm font-medium text-destructive">Erreur</p>
					<p class="mt-1 text-sm text-destructive/80">{error}</p>
				</div>
			{/if}
		</div>

		<!-- Right: Output tabs -->
		<div class="flex flex-col">
			<Tabs.Root bind:value={activeTab} class="w-full">
				<Tabs.List class="grid w-full grid-cols-5">
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

				<!-- Markdown Tab -->
				<Tabs.Content value="markdown" class="mt-4">
					{#if transpileResult}
						<div class="rounded-lg border border-border bg-muted p-4">
							<pre
								class="overflow-x-auto font-mono text-sm whitespace-pre-wrap">{transpileResult.markdown}</pre>
						</div>
					{:else}
						<p class="text-muted-foreground">Cliquez sur "Transpiler" pour voir le resultat</p>
					{/if}
				</Tabs.Content>

				<!-- HTML Tab -->
				<Tabs.Content value="html" class="mt-4">
					{#if transpileResult}
						<div class="rounded-lg border border-border bg-muted p-4">
							<pre
								class="overflow-x-auto font-mono text-sm whitespace-pre-wrap">{statementHtml}</pre>
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
								<div class="mb-3 flex items-center gap-2">
									<h3 class="font-semibold">Warnings</h3>
									{#if warningsCount > 0}
										<Badge variant="destructive">{warningsCount}</Badge>
									{:else}
										<Badge variant="secondary">0</Badge>
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
	</div>
</div>

<style>
	/* Math inline styling */
	:global(.inline-math) {
		display: inline-block;
		vertical-align: baseline;
		margin: 0 -2px; /* Compensate for MathLive's internal 2px padding */
		font-size: inherit;
		line-height: 1;
	}

	/* Math field read-only styling - minimize internal padding */
	:global(math-field[read-only]) {
		border: none;
		background: transparent;
		cursor: default;
		padding: 0;
		--_padding-vertical: 0;
		--_padding-horizontal: 0;
	}

	/* Target MathLive internal elements */
	:global(math-field[read-only]::part(container)) {
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(math-field[read-only] .ML__container) {
		padding: 0 !important;
	}

	:global(math-field[read-only] .ML__base) {
		padding: 0 !important;
	}
</style>
