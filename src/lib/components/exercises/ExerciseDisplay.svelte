<!--
	ExerciseDisplay Component
	==========================

	Displays parsed markdown exercises with MathLive rendering.
	Converts markdown AST to HTML with proper math rendering.

	FEATURES:
	- Parses markdown using custom parser
	- Renders math with MathLive
	- Supports all AST node types (paragraphs, lists, tables, images, etc.)
	- Read-only display mode

	@see src/lib/exercises/parser/markdown-parser.ts
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { parseMarkdown } from '$lib/exercises/parser/markdown-parser';
	import type {
		DocumentNode,
		BlockNode,
		InlineNode,
		ListNode,
		TableNode
	} from '$lib/exercises/types';
	import 'mathlive';

	interface Props {
		markdown: string;
	}

	let { markdown }: Props = $props();

	let ast = $derived<DocumentNode | null>(
		(() => {
			try {
				return parseMarkdown(markdown);
			} catch (error) {
				console.error('Error parsing markdown:', error);
				return null;
			}
		})()
	);

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
	 * Render the full AST to HTML
	 */
	let html = $derived(
		(() => {
			if (!ast) return '<p class="text-muted-foreground">Erreur de parsing</p>';
			if (ast.children.length === 0) return '<p class="text-muted-foreground">Aucun contenu</p>';

			return ast.children.map((child) => renderBlock(child)).join('');
		})()
	);

	// Mount MathLive styles
	onMount(() => {
		// MathLive CSS is loaded via 'mathlive' import
	});
</script>

<!-- Display Area -->
<div class="prose prose-sm max-w-none">
	{@html html}
</div>

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
