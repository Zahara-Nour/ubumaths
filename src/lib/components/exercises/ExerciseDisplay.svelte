<!--
	ExerciseDisplay Component
	==========================

	Displays exercises with support for both template mode (teacher preview)
	and instance mode (student view) with parameterized content.

	FEATURES:
	- Template mode: Show sample instances with regeneration button
	- Instance mode: Show resolved exercise instances
	- Supports static and parameterized exercises
	- On-demand mode: "Try New Problem" button for practice
	- Renders markdown with MathLive math rendering
	- Show/hide solution toggle
	- Responsive design with loading states
	- Accessible keyboard navigation

	DISTRIBUTION MODES:
	- on_demand: Generate new values on each click (infinite practice)
	- per_student: Consistent values per student (personalized homework)
	- per_group: Same values for all students in group (class work)

	@see src/lib/exercises/generator/instance-generator.ts
	@see src/lib/exercises/parser/markdown-parser.ts
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { parseMarkdown } from '$lib/exercises/parser/markdown-parser';
	import {
		generateExerciseInstance,
		generateStudentSeed,
		generateGroupSeed
	} from '$lib/exercises/generator/instance-generator';
	import type {
		Exercise,
		ExerciseInstance,
		DocumentNode,
		BlockNode,
		InlineNode,
		ListNode,
		TableNode
	} from '$lib/exercises/types';
	import { Button } from '$lib/components/ui/button';
	import 'mathlive';

	interface Props {
		exercise: Exercise;
		mode?: 'template' | 'instance';
		userId?: string;
		groupId?: string;
		showSolution?: boolean;
		parseAST?: boolean;
	}

	let {
		exercise = $bindable(),
		mode = 'instance',
		userId = undefined,
		groupId = undefined,
		showSolution = $bindable(false),
		parseAST = false
	}: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	// Current instance (resolved with specific variable values)
	let currentInstance = $state<ExerciseInstance | null>(null);

	// Error state for generation failures
	let generationError = $state<string | null>(null);

	// Loading state for async generation (future: if needed)
	let isGenerating = $state(false);

	// ============================================================================
	// INSTANCE GENERATION
	// ============================================================================

	/**
	 * Generate a new exercise instance with resolved variables
	 *
	 * Determines appropriate seed based on mode and distribution:
	 * - Template mode: Random seed for preview
	 * - Instance mode + per_student: Deterministic seed from userId
	 * - Instance mode + per_group: Deterministic seed from groupId
	 * - Instance mode + on_demand: Random seed (unless userId/groupId provided)
	 */
	function generateInstance() {
		// Check if exercise is parameterized
		if (!exercise.variables || exercise.variables.length === 0) {
			// Non-parameterized exercise - no need to generate instance
			currentInstance = null;
			generationError = null;
			return;
		}

		// Determine seed based on distribution mode
		let seed: number | undefined;

		if (mode === 'template') {
			// Teacher preview - use random seed for demonstration
			seed = Math.floor(Math.random() * 1000000);
		} else {
			// Student view - use appropriate seeding strategy
			if (exercise.distribution_mode === 'per_student' && userId) {
				// Each student gets consistent values
				seed = generateStudentSeed(exercise.id, userId);
			} else if (exercise.distribution_mode === 'per_group' && groupId) {
				// All students in group see same values
				seed = generateGroupSeed(exercise.id, groupId);
			} else if (exercise.distribution_mode === 'on_demand') {
				// Random each time (undefined seed)
				seed = undefined;
			} else {
				// Fallback: warn if missing required IDs
				if (exercise.distribution_mode === 'per_student' && !userId) {
					generationError = 'Mode per_student nécessite userId';
					currentInstance = null;
					return;
				}
				if (exercise.distribution_mode === 'per_group' && !groupId) {
					generationError = 'Mode per_group nécessite groupId';
					currentInstance = null;
					return;
				}
				seed = undefined;
			}
		}

		// Generate instance
		const result = generateExerciseInstance(exercise, { seed, parseAST });

		if (result.success && result.instance) {
			currentInstance = result.instance;
			generationError = null;
		} else {
			generationError = result.errors?.join(', ') || 'Échec de la génération';
			currentInstance = null;
		}
	}

	// Auto-generate instance when exercise changes or on mount
	$effect(() => {
		if (mode === 'instance') {
			generateInstance();
		}
	});

	// ============================================================================
	// DERIVED VALUES
	// ============================================================================

	// Determine which content to display (instance or template)
	let displayStatementMd = $derived(
		currentInstance ? currentInstance.statement_md : exercise.statement_md
	);

	let displaySolutionMd = $derived(
		currentInstance ? currentInstance.solution_md : exercise.solution_md
	);

	// Parse markdown to AST for rendering
	let statementAst = $derived<DocumentNode | null>(
		(() => {
			try {
				// Use pre-parsed AST if available
				if (currentInstance && currentInstance.statement_ast) {
					return currentInstance.statement_ast;
				}
				return parseMarkdown(displayStatementMd);
			} catch (error) {
				console.error('Error parsing statement markdown:', error);
				return null;
			}
		})()
	);

	let solutionAst = $derived<DocumentNode | null>(
		(() => {
			if (!showSolution) return null;
			try {
				// Use pre-parsed AST if available
				if (currentInstance && currentInstance.solution_ast) {
					return currentInstance.solution_ast;
				}
				return parseMarkdown(displaySolutionMd);
			} catch (error) {
				console.error('Error parsing solution markdown:', error);
				return null;
			}
		})()
	);

	// ============================================================================
	// RENDERING FUNCTIONS
	// ============================================================================

	/**
	 * Render a block node
	 */
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
				return renderList(node as unknown as ListNode);

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

			default:
				return '';
		}
	}

	/**
	 * Render inline nodes
	 */
	function renderInlineChildren(children: InlineNode[]): string {
		return children.map((child) => renderInline(child)).join('');
	}

	/**
	 * Render an inline node
	 */
	function renderInline(node: InlineNode): string {
		switch (node.type) {
			case 'text': {
				let text = escapeHtml(node.content);

				// Apply formatting
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

	/**
	 * Render a list
	 */
	function renderList(node: ListNode): string {
		const tag = node.ordered ? 'ol' : 'ul';
		const listClass = node.ordered ? 'list-decimal' : 'list-disc';
		const startAttr = node.ordered && node.start && node.start > 1 ? ` start="${node.start}"` : '';

		const items = node.items
			.map((item) => {
				const content = item.children
					.map((child) => {
						// ListItemNode children are ASTNode (InlineNode | BlockNode | ListItemNode)
						if (child.type === 'list') {
							return renderList(child as ListNode);
						}
						// Check if it's a BlockNode
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
						// For other types (shouldn't happen in list items)
						return '';
					})
					.join('');
				return `<li class="ml-6 mb-2 text-foreground">${content}</li>`;
			})
			.join('');

		return `<${tag} class="${listClass} my-4 text-foreground"${startAttr}>${items}</${tag}>`;
	}

	/**
	 * Render a table
	 */
	function renderTable(node: TableNode): string {
		const colgroup = node.alignments
			.map((align) => {
				const style =
					align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
				return `<col class="${style}" />`;
			})
			.join('');

		const header = `<thead class="border-b-2 border-border">
			<tr>
				${node.header.map((cell) => `<th class="px-4 py-2 font-semibold text-foreground">${escapeHtml(cell.content)}</th>`).join('')}
			</tr>
		</thead>`;

		const body = `<tbody>
			${node.rows
				.map(
					(row) => `<tr class="border-b border-border">
				${row.map((cell) => `<td class="px-4 py-2 text-foreground">${escapeHtml(cell.content)}</td>`).join('')}
			</tr>`
				)
				.join('')}
		</tbody>`;

		return `<div class="my-6 overflow-x-auto">
			<table class="min-w-full border-collapse border border-border">
				${colgroup}
				${header}
				${body}
			</table>
		</div>`;
	}

	/**
	 * Escape HTML special characters
	 */
	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Render the statement AST to HTML
	 */
	let statementHtml = $derived(
		(() => {
			if (!statementAst)
				return '<p class="text-muted-foreground">Erreur de parsing de l\'énoncé</p>';
			if (statementAst.children.length === 0)
				return '<p class="text-muted-foreground">Aucun contenu</p>';

			return statementAst.children.map((child) => renderBlock(child)).join('');
		})()
	);

	/**
	 * Render the solution AST to HTML
	 */
	let solutionHtml = $derived(
		(() => {
			if (!showSolution) return '';
			if (!solutionAst)
				return '<p class="text-muted-foreground">Erreur de parsing de la solution</p>';
			if (solutionAst.children.length === 0)
				return '<p class="text-muted-foreground">Aucune solution</p>';

			return solutionAst.children.map((child) => renderBlock(child)).join('');
		})()
	);

	// Mount MathLive styles
	onMount(() => {
		// MathLive CSS is loaded via 'mathlive' import
	});
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE MODE BANNER (Teacher Preview) -->
<!-- ============================================================================ -->
{#if mode === 'template'}
	<div
		class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h4 class="font-semibold text-blue-900 dark:text-blue-100">Aperçu du template</h4>
				<p class="text-sm text-blue-700 dark:text-blue-300">
					{#if exercise.variables && exercise.variables.length > 0}
						Les élèves verront des valeurs différentes à chaque instance.
					{:else}
						Exercice statique (sans paramètres).
					{/if}
				</p>
			</div>
			{#if exercise.variables && exercise.variables.length > 0}
				<Button
					onclick={generateInstance}
					variant="outline"
					size="sm"
					class="text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
				>
					🎲 Autres valeurs
				</Button>
			{/if}
		</div>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- ON-DEMAND REGENERATION BUTTON (Student Practice) -->
<!-- ============================================================================ -->
{#if exercise.distribution_mode === 'on_demand' && mode === 'instance' && exercise.variables && exercise.variables.length > 0}
	<div class="mb-4 flex justify-end">
		<Button onclick={generateInstance} variant="outline" size="sm">🎲 Nouveau problème</Button>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- ERROR STATE -->
<!-- ============================================================================ -->
{#if generationError}
	<div class="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
		<p class="text-sm font-medium text-destructive">Erreur de génération</p>
		<p class="mt-1 text-sm text-destructive/80">{generationError}</p>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- LOADING STATE -->
<!-- ============================================================================ -->
{#if isGenerating}
	<div class="flex justify-center p-8">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
	</div>
{:else}
	<!-- ============================================================================ -->
	<!-- STATEMENT -->
	<!-- ============================================================================ -->
	<div class="exercise-statement prose prose-sm max-w-none">
		{@html statementHtml}
	</div>

	<!-- ============================================================================ -->
	<!-- SOLUTION TOGGLE -->
	<!-- ============================================================================ -->
	<div class="mt-6 flex items-center justify-between border-t border-border pt-4">
		<Button onclick={() => (showSolution = !showSolution)} variant="secondary" size="sm">
			{showSolution ? 'Masquer' : 'Afficher'} la solution
		</Button>

		{#if mode === 'template' && currentInstance && exercise.variables && exercise.variables.length > 0}
			<details class="text-sm">
				<summary class="cursor-pointer text-muted-foreground hover:text-foreground">
					Valeurs des variables
				</summary>
				<div class="mt-2 rounded-lg bg-muted p-3">
					<table class="w-full text-sm">
						<tbody>
							{#each currentInstance.resolvedVariables as variable (variable.name)}
								<tr class="border-b border-border last:border-0">
									<td class="py-1 pr-4 font-mono font-medium">{variable.name}</td>
									<td class="py-1 font-mono">{variable.value}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>
		{/if}
	</div>

	<!-- ============================================================================ -->
	<!-- SOLUTION -->
	<!-- ============================================================================ -->
	{#if showSolution}
		<div class="solution mt-6 rounded-lg border border-border bg-muted/30 p-4">
			<h3 class="mb-3 text-lg font-semibold text-foreground">Solution</h3>
			<div class="prose prose-sm max-w-none">
				{@html solutionHtml}
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Math inline styling */
	:global(.inline-math) {
		display: inline-block;
		vertical-align: middle;
		margin: 0 2px;
		font-size: inherit;
	}

	/* Math field read-only styling */
	:global(math-field[read-only]) {
		border: none;
		background: transparent;
		cursor: default;
	}

	/* Prose styling adjustments */
	:global(.prose) {
		color: hsl(var(--foreground));
	}

	:global(.prose strong) {
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	:global(.prose em) {
		font-style: italic;
	}

	:global(.prose code) {
		background: hsl(var(--muted));
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		color: hsl(var(--foreground));
	}

	:global(.prose h1),
	:global(.prose h2),
	:global(.prose h3),
	:global(.prose h4),
	:global(.prose h5),
	:global(.prose h6) {
		color: hsl(var(--foreground));
	}

	:global(.prose th) {
		color: hsl(var(--foreground));
	}

	:global(.prose td) {
		color: hsl(var(--foreground));
	}

	:global(.prose p) {
		color: hsl(var(--foreground));
	}

	:global(.prose ol),
	:global(.prose ul) {
		color: hsl(var(--foreground));
	}

	:global(.prose li) {
		color: hsl(var(--foreground));
	}

	/* Style for list markers (numbers and bullets) */
	:global(.prose ol li::marker),
	:global(.prose ul li::marker) {
		color: hsl(var(--foreground));
	}

	:global(.prose a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	:global(.prose a:hover) {
		opacity: 0.8;
	}
</style>
