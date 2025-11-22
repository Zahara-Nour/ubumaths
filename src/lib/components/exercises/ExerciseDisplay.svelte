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
		TableNode,
		ImageNode
	} from '$lib/exercises/types';
	import {
		getDimensionsForFormat,
		shouldUseFigureEnvironment
	} from '$lib/exercises/services/image-dimensions';
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
				return renderImage(node as ImageNode);

			case 'horizontal-rule':
				return '<hr class="my-6 border-t border-border" />';

			default:
				return '';
		}
	}

	/**
	 * Render inline nodes with intelligent whitespace preservation.
	 *
	 * Problem: `display: inline-block` on math-field elements causes adjacent
	 * whitespace to collapse. Solution: Convert spaces adjacent to math-inline
	 * elements to non-breaking spaces (&nbsp;) to preserve them.
	 *
	 * We use &nbsp; rather than word-joiner (U+2060) because:
	 * - &nbsp; is universally supported and well-understood
	 * - Line breaks right before/after math expressions are rarely desirable
	 * - It reliably prevents whitespace collapse in all browsers
	 */
	function renderInlineChildren(children: InlineNode[]): string {
		return children
			.map((child, index) => {
				// For non-text nodes, render normally
				if (child.type !== 'text') {
					return renderInline(child);
				}

				const prevNode = children[index - 1];
				const nextNode = children[index + 1];
				const prevIsMath = prevNode?.type === 'math-inline';
				const nextIsMath = nextNode?.type === 'math-inline';

				// Get the raw content before escaping to check for spaces
				const rawContent = child.content;
				let html = escapeHtml(rawContent);

				// Preserve leading space after math-inline (use en-space for better visibility)
				if (prevIsMath && rawContent.startsWith(' ')) {
					html = '&ensp;' + html.slice(1);
				}

				// Preserve trailing space before math-inline (use en-space for better visibility)
				if (nextIsMath && rawContent.endsWith(' ')) {
					html = html.slice(0, -1) + '&ensp;';
				}

				// Apply formatting after space preservation
				if (child.bold) html = `<strong>${html}</strong>`;
				if (child.italic) html = `<em>${html}</em>`;
				if (child.code)
					html = `<code class="rounded bg-muted px-1 py-0.5 text-sm text-foreground">${html}</code>`;

				return html;
			})
			.join('');
	}

	/**
	 * Render a non-text inline node.
	 * Note: Text nodes are handled directly in renderInlineChildren for whitespace preservation.
	 */
	function renderInline(node: InlineNode): string {
		switch (node.type) {
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
	 * Render an image node with full format support
	 *
	 * Features:
	 * - Size classes (inline, small, medium, large, full)
	 * - Width percentage override
	 * - Alignment (left, center, right)
	 * - Optional caption with figure/figcaption
	 * - Extreme aspect ratio handling
	 * - XSS protection via escapeHtml
	 * - Accessibility (alt, lazy loading, async decoding, aria-describedby)
	 * - CLS prevention with aspect-ratio CSS
	 */
	function renderImage(node: ImageNode): string {
		// Escape all user-provided values for XSS protection
		const escapedSrc = escapeHtml(node.src);
		const escapedAlt = escapeHtml(node.alt || '');
		const escapedTitle = node.title ? escapeHtml(node.title) : undefined;
		const escapedCaption = node.caption ? escapeHtml(node.caption) : undefined;

		// Generate unique ID for aria-describedby (when caption exists)
		const figcaptionId = escapedCaption
			? `fig-caption-${Math.random().toString(36).substring(2, 9)}`
			: undefined;

		// Get dimensions from service
		const dimensions = getDimensionsForFormat(node, 'html');
		const alignment = node.alignment || 'center';

		// Build inline styles for the image
		const styleProperties: string[] = [];

		// Apply width
		if (dimensions.width) {
			styleProperties.push(`width: ${dimensions.width}`);
		}

		// Apply max-width
		if (dimensions.maxWidth) {
			styleProperties.push(`max-width: ${dimensions.maxWidth}`);
		}

		// Handle extreme aspect ratios and add aspect-ratio CSS for CLS prevention
		if (node.originalWidth && node.originalHeight) {
			const aspectRatio = node.originalWidth / node.originalHeight;

			// Very wide images (ratio > 3:1): Apply max-height constraint
			if (aspectRatio > 3) {
				styleProperties.push('max-height: 300px');
				styleProperties.push('width: auto');
			}
			// Very tall images (ratio < 1:3): Apply max-width constraint
			else if (aspectRatio < 1 / 3) {
				styleProperties.push('max-width: 200px');
				styleProperties.push('height: auto');
			}

			// Add aspect-ratio CSS to prevent CLS (Cumulative Layout Shift)
			styleProperties.push(`aspect-ratio: ${node.originalWidth} / ${node.originalHeight}`);
		}

		// Apply max-height from dimensions if present
		if (dimensions.maxHeight) {
			styleProperties.push(`max-height: ${dimensions.maxHeight}`);
		}

		// Build CSS classes for the image
		const imgClasses = ['exercise-image'];
		if (node.sizeClass === 'inline') {
			imgClasses.push('exercise-image-inline');
		}

		// Build the img element with accessibility attributes
		const styleAttr = styleProperties.length > 0 ? ` style="${styleProperties.join('; ')}"` : '';
		const titleAttr = escapedTitle ? ` title="${escapedTitle}"` : '';
		const ariaDescribedBy = figcaptionId ? ` aria-describedby="${figcaptionId}"` : '';

		const imgElement = `<img src="${escapedSrc}" alt="${escapedAlt}"${titleAttr}${ariaDescribedBy} class="${imgClasses.join(' ')}"${styleAttr} loading="lazy" decoding="async" />`;

		// Determine container class based on alignment
		const alignmentClass = `exercise-image-${alignment}`;

		// Check if we should use figure environment
		if (shouldUseFigureEnvironment(node)) {
			const captionHtml = figcaptionId
				? `<figcaption id="${figcaptionId}" class="exercise-figcaption">${escapedCaption}</figcaption>`
				: '';

			return `<figure class="exercise-figure ${alignmentClass}">
				${imgElement}
				${captionHtml}
			</figure>`;
		}

		// Inline images: render directly without container
		if (node.sizeClass === 'inline') {
			return imgElement;
		}

		// Block images without caption: use a simple div container for alignment
		return `<div class="${alignmentClass}">
			${imgElement}
		</div>`;
	}

	/**
	 * Escape HTML special characters to prevent XSS attacks
	 *
	 * Uses string replacement for SSR compatibility (no DOM dependency).
	 * Escapes: & < > " '
	 */
	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
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
		vertical-align: baseline; /* Better text alignment than middle */
		margin: 0; /*  margin: 0 -2px; Compensate for MathLive's internal 2px padding */
		font-size: inherit;
		line-height: 1; /* Reduce vertical spacing */
	}

	/* Math field read-only styling - minimize internal padding */
	:global(math-field[read-only]) {
		border: none;
		background: transparent;
		cursor: default;
		padding: 0;
		/* MathLive CSS custom properties to reduce internal spacing */
		--_padding-vertical: 0;
		--_padding-horizontal: 0;
	}

	/* Target MathLive's internal container via ::part() if exposed */
	:global(math-field[read-only]::part(container)) {
		padding: 0 !important;
		margin: 0 !important;
	}

	/* Target internal MathLive elements */
	:global(math-field[read-only] .ML__container) {
		padding: 0 !important;
	}

	:global(math-field[read-only] .ML__content) {
		padding: 0 !important;
	}

	:global(math-field[read-only] .ML__base) {
		padding: 0 !important;
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

	/* ============================================================================ */
	/* Exercise Image Styles */
	/* ============================================================================ */

	/* Base image styling - ensures responsive behavior */
	:global(.exercise-image) {
		max-width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
	}

	/* Inline images - embedded within text flow */
	:global(.exercise-image-inline) {
		display: inline;
		vertical-align: middle;
		max-height: 1.5em;
		width: auto;
		border-radius: 0;
		box-shadow: none;
	}

	/* Figure container styling */
	:global(.exercise-figure) {
		margin: 1em 0;
	}

	/* Figure caption styling */
	:global(.exercise-figcaption) {
		font-size: 0.9em;
		color: hsl(var(--muted-foreground));
		margin-top: 0.5em;
		text-align: center;
		font-style: italic;
	}

	/* Alignment classes for image containers */
	:global(.exercise-image-left) {
		text-align: left;
	}

	:global(.exercise-image-left .exercise-image) {
		margin-right: auto;
	}

	:global(.exercise-image-center) {
		text-align: center;
	}

	:global(.exercise-image-center .exercise-image) {
		margin-left: auto;
		margin-right: auto;
	}

	:global(.exercise-image-right) {
		text-align: right;
	}

	:global(.exercise-image-right .exercise-image) {
		margin-left: auto;
	}

	/* Dark mode adjustments for images */
	:global(.dark .exercise-image) {
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.3),
			0 1px 2px -1px rgb(0 0 0 / 0.3);
	}

	/* Responsive adjustments for small screens */
	@media (max-width: 640px) {
		:global(.exercise-image) {
			width: 100% !important;
			max-width: 100% !important;
		}

		:global(.exercise-figure) {
			margin: 0.75em 0;
		}

		:global(.exercise-figcaption) {
			font-size: 0.85em;
		}
	}
</style>
