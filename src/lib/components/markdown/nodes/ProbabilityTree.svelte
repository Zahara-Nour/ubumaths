<!--
	ProbabilityTree Component
	=========================

	Renders an interactive weighted probability tree with SVG.

	Features:
	- Horizontal layout (root left, leaves right)
	- Straight lines for branches
	- Event labels above branches, probabilities below
	- Optional outcomes column on the right
	- Hover: highlight path + tooltip with cumulative probability
	- Click: persistent path selection
	- MathLive rendering for mathematical expressions
	- Dark mode support via CSS variables

	@module components/markdown/nodes/ProbabilityTree
-->
<script lang="ts">
	import 'mathlive';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type {
		ProbabilityTreeNode,
		ProbTreeNode,
		ProbTreeBranch
	} from '$lib/custom-markdown/types/probability-tree';

	interface Props {
		node: ProbabilityTreeNode;
		class?: string;
	}

	let { node, class: className = '' }: Props = $props();

	// =========================================================================
	// LAYOUT CONSTANTS
	// =========================================================================

	const LEVEL_DISTANCE = 140; // Horizontal distance between levels
	const MIN_NODE_SPACING = 50; // Minimum vertical spacing between sibling leaves
	const LABEL_OFFSET_Y = -8; // Offset for event label above line
	const PROB_OFFSET_Y = 14; // Offset for probability below line
	const ROOT_X = 40; // X position of root
	const PADDING_TOP = 30;
	const PADDING_BOTTOM = 30;
	const PADDING_RIGHT = 40;
	const OUTCOMES_WIDTH = 120; // Width reserved for outcomes column

	// =========================================================================
	// STATE
	// =========================================================================

	let hoveredPath = $state<string[]>([]);
	let selectedPath = $state<string[]>([]);

	// =========================================================================
	// LAYOUT CALCULATION
	// =========================================================================

	interface NodePosition {
		x: number;
		y: number;
		subtreeHeight: number;
	}

	/**
	 * Calculate subtree height (number of leaves * spacing)
	 */
	function getSubtreeHeight(treeNode: ProbTreeNode): number {
		if (treeNode.isLeaf) {
			return MIN_NODE_SPACING;
		}
		let totalHeight = 0;
		for (const branch of treeNode.branches) {
			totalHeight += getSubtreeHeight(branch.child);
		}
		return totalHeight;
	}

	/**
	 * Calculate positions for all nodes
	 */
	function calculatePositions(
		treeNode: ProbTreeNode,
		x: number,
		yStart: number,
		positions: Map<string, NodePosition>
	): number {
		const subtreeHeight = getSubtreeHeight(treeNode);

		if (treeNode.isLeaf) {
			const y = yStart + subtreeHeight / 2;
			positions.set(treeNode.id, { x, y, subtreeHeight });
			return subtreeHeight;
		}

		let currentY = yStart;
		let minChildY = Infinity;
		let maxChildY = -Infinity;

		for (const branch of treeNode.branches) {
			const childHeight = calculatePositions(branch.child, x + LEVEL_DISTANCE, currentY, positions);
			const childPos = positions.get(branch.child.id);
			if (childPos) {
				minChildY = Math.min(minChildY, childPos.y);
				maxChildY = Math.max(maxChildY, childPos.y);
			}
			currentY += childHeight;
		}

		// Center parent between its children
		const y = (minChildY + maxChildY) / 2;
		positions.set(treeNode.id, { x, y, subtreeHeight });

		return subtreeHeight;
	}

	// Calculate all positions
	let positions = $derived.by(() => {
		const posMap = new Map<string, NodePosition>();
		calculatePositions(node.root, ROOT_X, PADDING_TOP, posMap);
		return posMap;
	});

	// Calculate SVG dimensions
	let svgWidth = $derived(
		ROOT_X +
			LEVEL_DISTANCE * node.maxDepth +
			PADDING_RIGHT +
			(node.config.showOutcomes ? OUTCOMES_WIDTH : 0)
	);

	let svgHeight = $derived.by(() => {
		const rootHeight = getSubtreeHeight(node.root);
		return rootHeight + PADDING_TOP + PADDING_BOTTOM;
	});

	// =========================================================================
	// HELPERS
	// =========================================================================

	/**
	 * Convert expression to proper LaTeX for MathLive rendering
	 */
	function toLatex(expr: string): string {
		return expr
			.replace(/\+inf/g, '+\\infty')
			.replace(/-inf/g, '-\\infty')
			.replace(/^inf$/g, '\\infty');
	}

	/**
	 * Get all node IDs from root to a specific node
	 */
	function getPathToNode(targetId: string, current: ProbTreeNode, path: string[]): string[] | null {
		const newPath = [...path, current.id];

		if (current.id === targetId) {
			return newPath;
		}

		for (const branch of current.branches) {
			const result = getPathToNode(targetId, branch.child, newPath);
			if (result) return result;
		}

		return null;
	}

	/**
	 * Calculate cumulative probability for a path
	 */
	function calculateCumulativeProbability(pathIds: string[]): {
		display: string;
		calculation: string;
		numeric: number | null;
	} {
		const probabilities: { display: string; numeric: number | null }[] = [];

		function collectProbabilities(current: ProbTreeNode, pathIndex: number) {
			if (pathIndex >= pathIds.length - 1) return;

			const nextId = pathIds[pathIndex + 1];
			const branch = current.branches.find((b) => b.child.id === nextId);

			if (branch) {
				probabilities.push({
					display: branch.probability.display,
					numeric: branch.probability.numeric
				});
				collectProbabilities(branch.child, pathIndex + 1);
			}
		}

		collectProbabilities(node.root, 0);

		if (probabilities.length === 0) {
			return { display: '1', calculation: '', numeric: 1 };
		}

		const calculation = probabilities.map((p) => p.display).join(' × ');

		let numeric: number | null = 1;
		for (const p of probabilities) {
			if (p.numeric === null) {
				numeric = null;
				break;
			}
			numeric *= p.numeric;
		}

		let display = calculation;
		if (numeric !== null && probabilities.length > 1) {
			// Format the result
			const formatted =
				numeric === Math.floor(numeric)
					? numeric.toString()
					: numeric.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
			display = `${calculation} = ${formatted}`;
		}

		return { display, calculation, numeric };
	}

	/**
	 * Check if a node is in the current highlighted path
	 */
	function isInPath(nodeId: string, path: string[]): boolean {
		return path.includes(nodeId);
	}

	/**
	 * Check if a branch is in the current highlighted path
	 */
	function isBranchInPath(parentId: string, childId: string, path: string[]): boolean {
		const parentIndex = path.indexOf(parentId);
		const childIndex = path.indexOf(childId);
		return parentIndex !== -1 && childIndex !== -1 && childIndex === parentIndex + 1;
	}

	// =========================================================================
	// EVENT HANDLERS
	// =========================================================================

	function handleBranchHover(parentId: string, childId: string) {
		const path = getPathToNode(childId, node.root, []);
		if (path) {
			hoveredPath = path;
		}
	}

	function handleBranchLeave() {
		hoveredPath = [];
	}

	function handleBranchClick(parentId: string, childId: string) {
		const path = getPathToNode(childId, node.root, []);
		if (path) {
			// Toggle selection
			if (selectedPath.length > 0 && selectedPath[selectedPath.length - 1] === childId) {
				selectedPath = [];
			} else {
				selectedPath = path;
			}
		}
	}

	function handleSvgClick(event: MouseEvent) {
		// Only deselect if clicking directly on SVG background
		if (event.target === event.currentTarget) {
			selectedPath = [];
		}
	}

	// =========================================================================
	// RENDERING HELPERS
	// =========================================================================

	/**
	 * Get the effective path for highlighting (selected takes precedence)
	 */
	let effectivePath = $derived(selectedPath.length > 0 ? selectedPath : hoveredPath);

	/**
	 * Determine if we should dim non-highlighted elements
	 */
	let hasHighlight = $derived(effectivePath.length > 0);

	/**
	 * Compute tooltip content based on hovered path (derived to avoid race condition)
	 */
	let activeTooltipContent = $derived.by(() => {
		if (hoveredPath.length === 0) return '';
		const cumProb = calculateCumulativeProbability(hoveredPath);
		return cumProb.display;
	});

	/**
	 * Collect all branches for rendering
	 */
	interface BranchRenderData {
		parentId: string;
		childId: string;
		branch: ProbTreeBranch;
		parentPos: NodePosition;
		childPos: NodePosition;
	}

	function collectBranches(current: ProbTreeNode, result: BranchRenderData[]): BranchRenderData[] {
		const parentPos = positions.get(current.id);
		if (!parentPos) return result;

		for (const branch of current.branches) {
			const childPos = positions.get(branch.child.id);
			if (childPos) {
				result.push({
					parentId: current.id,
					childId: branch.child.id,
					branch,
					parentPos,
					childPos
				});
				collectBranches(branch.child, result);
			}
		}

		return result;
	}

	let allBranches = $derived(collectBranches(node.root, []));

	/**
	 * Collect all leaf nodes for outcome rendering
	 */
	interface LeafRenderData {
		node: ProbTreeNode;
		pos: NodePosition;
	}

	function collectLeaves(current: ProbTreeNode, result: LeafRenderData[]): LeafRenderData[] {
		if (current.isLeaf) {
			const pos = positions.get(current.id);
			if (pos) {
				result.push({ node: current, pos });
			}
		} else {
			for (const branch of current.branches) {
				collectLeaves(branch.child, result);
			}
		}
		return result;
	}

	let allLeaves = $derived(collectLeaves(node.root, []));
</script>

<div class="probability-tree {className}">
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<svg
		width="100%"
		height={svgHeight}
		viewBox="0 0 {svgWidth} {svgHeight}"
		class="pt-svg"
		role="img"
		aria-label="Arbre de probabilité{node.config.rootLabel ? ` : ${node.config.rootLabel}` : ''}"
		onclick={handleSvgClick}
	>
		<!-- Root label -->
		{#if node.config.rootLabel}
			{@const rootPos = positions.get(node.root.id)}
			{#if rootPos}
				<foreignObject x={rootPos.x - 35} y={rootPos.y - 10} width="30" height="20">
					<div class="pt-root-label">
						<math-span>{toLatex(node.config.rootLabel)}</math-span>
					</div>
				</foreignObject>
			{/if}
		{/if}

		<!-- Branches (lines with labels) -->
		{#each allBranches as branchData (branchData.parentId + '-' + branchData.childId)}
			{@const isHighlighted = isBranchInPath(
				branchData.parentId,
				branchData.childId,
				effectivePath
			)}
			{@const midX = (branchData.parentPos.x + branchData.childPos.x) / 2}
			{@const midY = (branchData.parentPos.y + branchData.childPos.y) / 2}

			<g
				class="pt-branch"
				class:pt-highlighted={isHighlighted}
				class:pt-dimmed={hasHighlight && !isHighlighted}
			>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<!-- Invisible wider line for easier hover/focus -->
						<line
							role="button"
							tabindex="0"
							aria-label="Branche: {branchData.branch.eventLabel}, probabilité: {branchData.branch
								.probability.display}"
							x1={branchData.parentPos.x}
							y1={branchData.parentPos.y}
							x2={branchData.childPos.x}
							y2={branchData.childPos.y}
							class="pt-branch-hitarea"
							onmouseenter={() => handleBranchHover(branchData.parentId, branchData.childId)}
							onmouseleave={handleBranchLeave}
							onclick={() => handleBranchClick(branchData.parentId, branchData.childId)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleBranchClick(branchData.parentId, branchData.childId);
								}
							}}
							onfocus={() => handleBranchHover(branchData.parentId, branchData.childId)}
							onblur={handleBranchLeave}
						/>
						<!-- Visible line -->
						<line
							x1={branchData.parentPos.x}
							y1={branchData.parentPos.y}
							x2={branchData.childPos.x}
							y2={branchData.childPos.y}
							class="pt-branch-line"
						/>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p class="text-sm">
							P = {activeTooltipContent || branchData.branch.probability.display}
						</p>
					</Tooltip.Content>
				</Tooltip.Root>

				<!-- Event label (above line) -->
				<foreignObject x={midX - 40} y={midY + LABEL_OFFSET_Y - 16} width="80" height="20">
					<div class="pt-label pt-event-label">
						<math-span>{toLatex(branchData.branch.eventLabel)}</math-span>
					</div>
				</foreignObject>

				<!-- Probability label (below line) -->
				<foreignObject x={midX - 40} y={midY + PROB_OFFSET_Y - 4} width="80" height="20">
					<div class="pt-label pt-prob-label">
						<math-span>{toLatex(branchData.branch.probability.display)}</math-span>
					</div>
				</foreignObject>
			</g>
		{/each}

		<!-- Outcomes column -->
		{#if node.config.showOutcomes}
			{#each allLeaves as leaf (leaf.node.id)}
				{#if leaf.node.outcome}
					{@const isHighlighted = isInPath(leaf.node.id, effectivePath)}
					<foreignObject
						x={leaf.pos.x + 15}
						y={leaf.pos.y - 12}
						width={OUTCOMES_WIDTH - 20}
						height="24"
					>
						<div
							class="pt-outcome"
							class:pt-highlighted={isHighlighted}
							class:pt-dimmed={hasHighlight && !isHighlighted}
						>
							<math-span>{toLatex(leaf.node.outcome)}</math-span>
						</div>
					</foreignObject>
				{/if}
			{/each}
		{/if}
	</svg>
</div>

<style>
	/* CSS Variables for customization */
	.probability-tree {
		--pt-line-color: var(--foreground, #1f2937);
		--pt-line-width: 1.5px;
		--pt-highlight-color: var(--primary, #3b82f6);
		--pt-highlight-width: 2.5px;
		--pt-dimmed-opacity: 0.3;
	}

	/* Main container */
	.probability-tree {
		margin: 1rem 0;
		overflow-x: auto;
		font-size: inherit;
	}

	/* SVG */
	.pt-svg {
		display: block;
		max-width: 100%;
		height: auto;
	}

	/* Root label */
	.pt-root-label {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		font-weight: 500;
	}

	/* Branch group */
	.pt-branch {
		transition: opacity 0.2s ease;
	}

	.pt-branch.pt-dimmed {
		opacity: var(--pt-dimmed-opacity);
	}

	/* Branch lines */
	.pt-branch-hitarea {
		stroke: transparent;
		stroke-width: 20px;
		cursor: pointer;
		fill: none;
		outline: none;
	}

	.pt-branch-hitarea:focus-visible + .pt-branch-line {
		stroke: var(--pt-highlight-color);
		stroke-width: var(--pt-highlight-width);
	}

	.pt-branch-line {
		stroke: var(--pt-line-color);
		stroke-width: var(--pt-line-width);
		fill: none;
		transition:
			stroke 0.2s ease,
			stroke-width 0.2s ease;
	}

	.pt-branch.pt-highlighted .pt-branch-line {
		stroke: var(--pt-highlight-color);
		stroke-width: var(--pt-highlight-width);
	}

	/* Labels */
	.pt-label {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		font-size: 0.9em;
		pointer-events: none;
	}

	.pt-event-label {
		font-weight: 500;
	}

	.pt-prob-label {
		color: var(--muted-foreground, #6b7280);
		font-size: 0.85em;
	}

	.pt-branch.pt-highlighted .pt-prob-label {
		color: var(--pt-highlight-color);
		font-weight: 500;
	}

	/* Outcomes */
	.pt-outcome {
		display: flex;
		align-items: center;
		height: 100%;
		font-size: 0.85em;
		color: var(--muted-foreground, #6b7280);
		transition: opacity 0.2s ease;
	}

	.pt-outcome.pt-highlighted {
		color: var(--pt-highlight-color);
		font-weight: 500;
	}

	.pt-outcome.pt-dimmed {
		opacity: var(--pt-dimmed-opacity);
	}

	/* Math element styling */
	.probability-tree :global(math-span) {
		font-size: inherit;
	}

	/* Dark mode support */
	:global(.dark) .probability-tree {
		--pt-line-color: var(--foreground, #f3f4f6);
		--pt-highlight-color: var(--primary, #60a5fa);
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.probability-tree {
			font-size: 0.85em;
		}
	}
</style>
