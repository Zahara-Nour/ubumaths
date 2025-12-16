<script lang="ts">
	import { ChevronRight, ChevronDown } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { replStore } from '$lib/stores/repl.svelte';
	import type { MathNode } from '$lib/mathAST/types';
	import AstTreeViewer from './AstTreeViewer.svelte';

	interface Props {
		node: MathNode;
		depth?: number;
		nodeId?: string;
	}

	let { node, depth = 0, nodeId = 'root' }: Props = $props();

	// Track expanded state for collapsible nodes
	let expanded = $state(depth < 2);

	// Generate unique IDs for child nodes
	function childId(index: number): string {
		return `${nodeId}-${index}`;
	}

	// Check if this node is currently highlighted
	let isHighlighted = $derived(replStore.highlightedNodeId === nodeId);

	// Handle mouse enter/leave for highlighting
	function handleMouseEnter() {
		replStore.setHighlightedNode(nodeId);
	}

	function handleMouseLeave() {
		replStore.setHighlightedNode(null);
	}

	// Get display info for the node
	function getNodeDisplay(n: MathNode): { type: string; value?: string; badge?: string } {
		switch (n.type) {
			case 'number':
				return { type: 'Number', value: n.value, badge: 'literal' };
			case 'variable':
				return { type: 'Variable', value: n.name, badge: 'literal' };
			case 'greek':
				return { type: 'Greek', value: n.letter, badge: 'literal' };
			case 'symbol':
				return { type: 'Symbol', value: n.symbol, badge: 'literal' };
			case 'hole':
				return { type: 'Hole', value: `#${n.index}`, badge: 'literal' };
			case 'addition':
				return { type: 'Addition', badge: 'binary' };
			case 'subtraction':
				return { type: 'Subtraction', badge: 'binary' };
			case 'multiplication':
				return { type: 'Multiplication', value: n.displayStyle, badge: 'binary' };
			case 'division':
				return { type: 'Division', value: n.displayStyle, badge: 'binary' };
			case 'opposite':
				return { type: 'Opposite', badge: 'unary' };
			case 'positive':
				return { type: 'Positive', badge: 'unary' };
			case 'function':
				return { type: 'Function', value: n.name, badge: 'function' };
			case 'delimiter':
				return { type: 'Delimiter', value: n.delimiters, badge: 'structure' };
			case 'subscript':
				return { type: 'Subscript', badge: 'structure' };
			case 'superscript':
				return { type: 'Superscript', badge: 'structure' };
			case 'relation':
				return { type: 'Relation', value: n.relation, badge: 'relation' };
			case 'unit':
				return { type: 'Unit', value: n.unit.original ?? '[unit]', badge: 'unit' };
			default:
				return { type: n.type, badge: 'unknown' };
		}
	}

	// Get child nodes for the current node
	function getChildNodes(n: MathNode): Array<{ label: string; node: MathNode }> {
		const children: Array<{ label: string; node: MathNode }> = [];

		switch (n.type) {
			case 'addition':
			case 'subtraction':
			case 'multiplication':
			case 'division':
				if ('left' in n) children.push({ label: 'left', node: n.left });
				if ('right' in n) children.push({ label: 'right', node: n.right });
				if ('numerator' in n) children.push({ label: 'numerator', node: n.numerator });
				if ('denominator' in n) children.push({ label: 'denominator', node: n.denominator });
				break;
			case 'opposite':
			case 'positive':
				children.push({ label: 'operand', node: n.operand });
				break;
			case 'function':
				if (n.base) children.push({ label: 'base', node: n.base });
				if (n.power) children.push({ label: 'power', node: n.power });
				n.args.forEach((arg, i) => children.push({ label: `arg[${i}]`, node: arg }));
				break;
			case 'delimiter':
				children.push({ label: 'content', node: n.content });
				break;
			case 'subscript':
				children.push({ label: 'base', node: n.base });
				children.push({ label: 'subscript', node: n.subscript });
				break;
			case 'superscript':
				children.push({ label: 'base', node: n.base });
				children.push({ label: 'superscript', node: n.superscript });
				break;
			case 'relation':
				children.push({ label: 'left', node: n.left });
				children.push({ label: 'right', node: n.right });
				break;
			case 'unit':
				children.push({ label: 'expression', node: n.expression });
				break;
		}

		return children;
	}

	// Maximum recursion depth to prevent performance issues
	const MAX_DEPTH = 20;

	let display = $derived(getNodeDisplay(node));
	let children = $derived(getChildNodes(node));
	let hasChildren = $derived(children.length > 0);

	// Badge colors based on node category
	function getBadgeClass(badge?: string): string {
		switch (badge) {
			case 'literal':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'binary':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'unary':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
			case 'function':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			case 'structure':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
			case 'relation':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			case 'unit':
				return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
		}
	}
</script>

<div
	class="select-none"
	role="treeitem"
	aria-expanded={hasChildren ? expanded : undefined}
	aria-selected={isHighlighted}
	aria-level={depth + 1}
	aria-label={`${display.type}${display.value ? `: ${display.value}` : ''}`}
>
	<!-- Node row (interactive) -->
	<div
		class={cn(
			'group flex cursor-pointer items-center gap-1 rounded px-2 py-1 transition-colors',
			'hover:bg-muted/50',
			isHighlighted && 'bg-primary/10 ring-2 ring-primary/50'
		)}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		onclick={() => {
			if (hasChildren) expanded = !expanded;
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (hasChildren) expanded = !expanded;
			}
		}}
		role="button"
		tabindex={hasChildren ? 0 : -1}
	>
		<!-- Expand/Collapse indicator -->
		<span class="flex size-4 shrink-0 items-center justify-center">
			{#if hasChildren}
				{#if expanded}
					<ChevronDown class="size-3 text-muted-foreground" />
				{:else}
					<ChevronRight class="size-3 text-muted-foreground" />
				{/if}
			{/if}
		</span>

		<!-- Node type -->
		<span class="font-mono text-sm font-medium text-foreground">
			{display.type}
		</span>

		<!-- Node value (if applicable) -->
		{#if display.value}
			<span class="font-mono text-sm text-primary">
				: {display.value}
			</span>
		{/if}

		<!-- Category badge -->
		{#if display.badge}
			<span
				class={cn(
					'ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
					getBadgeClass(display.badge)
				)}
			>
				{display.badge}
			</span>
		{/if}
	</div>

	<!-- Children (recursive) -->
	{#if hasChildren && expanded}
		<div class="ml-4 border-l border-border pl-2" role="group">
			{#each children as child, index (childId(index))}
				<div class="mt-1">
					<!-- Child label -->
					<span class="ml-5 text-xs text-muted-foreground">{child.label}:</span>
					{#if depth + 1 < MAX_DEPTH}
						<AstTreeViewer node={child.node} depth={depth + 1} nodeId={childId(index)} />
					{:else}
						<div class="ml-5 text-xs text-muted-foreground italic">
							(profondeur maximale atteinte)
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
