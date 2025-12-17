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

	const BRANCH_LENGTH = 80; // Length of each branch (horizontal)
	const MIN_NODE_SPACING = 50; // Minimum vertical spacing between sibling leaves
	const CHAR_WIDTH = 8; // Estimated width per character for labels
	const MIN_LABEL_WIDTH = 25; // Minimum width for event labels
	const LABEL_PADDING = 16; // Extra padding around labels
	const PROB_PERP_OFFSET = 14; // Perpendicular offset for probability label above line
	const PROB_HORIZ_SHIFT = 12; // Horizontal shift along branch direction (towards child)
	const ROOT_X = 20; // X position of root
	const PADDING_TOP = 30;
	const PADDING_BOTTOM = 30;
	const PADDING_RIGHT = 40;
	const OUTCOMES_WIDTH = 120; // Width reserved for outcomes column

	// =========================================================================
	// DYNAMIC LABEL WIDTH CALCULATION
	// =========================================================================

	/**
	 * Estimate visual length of a label (accounting for LaTeX commands)
	 * LaTeX commands like \bar{A} render as single character with diacritic
	 */
	function estimateVisualLength(text: string): number {
		// Commands that modify but don't add width (\bar{X} -> X, same width)
		let processed = text
			.replace(/\\(bar|hat|tilde|overline|underline|vec|dot|ddot)\{([^}]*)\}/g, '$2')
			// Greek letters and symbols render as single characters
			.replace(
				/\\(Omega|omega|Alpha|alpha|Beta|beta|Gamma|gamma|Delta|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|infty|pm|mp|times|div|cdot|frac)/gi,
				'X'
			)
			// Any other LaTeX command becomes approximately single char
			.replace(/\\[a-zA-Z]+/g, 'X')
			// Remove braces and backslashes
			.replace(/[{}\\]/g, '');

		return processed.length || 1;
	}

	/**
	 * Collect all event labels from the tree
	 */
	function collectAllLabels(treeNode: ProbTreeNode): string[] {
		const labels: string[] = [];
		for (const branch of treeNode.branches) {
			labels.push(branch.eventLabel);
			labels.push(...collectAllLabels(branch.child));
		}
		return labels;
	}

	// Calculate dynamic label width based on longest event label (visual length)
	let nodeLabelWidth = $derived.by(() => {
		const allLabels = collectAllLabels(node.root);
		// Include root label if present
		if (node.config.rootLabel) {
			allLabels.push(node.config.rootLabel);
		}
		if (allLabels.length === 0) return MIN_LABEL_WIDTH;
		const maxVisualLength = Math.max(...allLabels.map((l) => estimateVisualLength(l)));
		return Math.max(MIN_LABEL_WIDTH, maxVisualLength * CHAR_WIDTH + LABEL_PADDING);
	});

	// Calculate level distance (branch + label width)
	let levelDistance = $derived(BRANCH_LENGTH + nodeLabelWidth);

	// =========================================================================
	// STATE
	// =========================================================================

	let hoveredPath = $state<string[]>([]);
	let selectedPath = $state<string[]>([]);
	// Multiple paths selected (for event label click)
	let selectedPaths = $state<string[][]>([]);
	// Track which branches show probability name instead of value (use object for guaranteed reactivity)
	let showProbName = $state<Record<string, boolean>>({});

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
		positions: Map<string, NodePosition>,
		levelDist: number
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
			const childHeight = calculatePositions(
				branch.child,
				x + levelDist,
				currentY,
				positions,
				levelDist
			);
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
		calculatePositions(node.root, ROOT_X, PADDING_TOP, posMap, levelDistance);
		return posMap;
	});

	// Calculate SVG dimensions
	let svgWidth = $derived(
		ROOT_X +
			levelDistance * node.maxDepth +
			nodeLabelWidth + // Space for leaf event labels
			PADDING_RIGHT +
			(node.config.showIntersection ? OUTCOMES_WIDTH : 0) + // Space for P(A ∩ B) if enabled
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
	 * Check if a branch is in the current highlighted path
	 */
	function isBranchInPath(parentId: string, childId: string, path: string[]): boolean {
		const parentIndex = path.indexOf(parentId);
		const childIndex = path.indexOf(childId);
		return parentIndex !== -1 && childIndex !== -1 && childIndex === parentIndex + 1;
	}

	/**
	 * Check if a node is in any of the multiple selected paths
	 */
	function isInAnyPath(nodeId: string, paths: string[][]): boolean {
		return paths.some((path) => path.includes(nodeId));
	}

	/**
	 * Check if a branch is in any of the multiple selected paths
	 */
	function isBranchInAnyPath(parentId: string, childId: string, paths: string[][]): boolean {
		return paths.some((path) => isBranchInPath(parentId, childId, path));
	}

	/**
	 * Find all paths from root to leaves that end with a specific event label
	 */
	function findPathsByEventLabel(eventLabel: string): string[][] {
		const paths: string[][] = [];

		function traverse(current: ProbTreeNode, currentPath: string[]) {
			const newPath = [...currentPath, current.id];

			if (current.isLeaf) {
				// Check if this leaf's parent branch has the matching event label
				const parentBranch = parentBranchMap.get(current.id);
				if (parentBranch && parentBranch.eventLabel === eventLabel) {
					paths.push(newPath);
				}
				return;
			}

			for (const branch of current.branches) {
				traverse(branch.child, newPath);
			}
		}

		traverse(node.root, []);
		return paths;
	}

	/**
	 * Build a map from node ID to the branch that leads to it (for parent event lookup)
	 */
	function buildParentBranchMap(
		current: ProbTreeNode,
		parentBranch: ProbTreeBranch | null,
		map: Map<string, ProbTreeBranch | null>
	): void {
		map.set(current.id, parentBranch);
		for (const branch of current.branches) {
			buildParentBranchMap(branch.child, branch, map);
		}
	}

	// Map from node ID to its parent branch (null for root)
	let parentBranchMap = $derived.by(() => {
		const map = new Map<string, ProbTreeBranch | null>();
		buildParentBranchMap(node.root, null, map);
		return map;
	});

	/**
	 * Get intersection probability notation P(A ∩ B ∩ ...) for a path to a leaf
	 * Traverses from root to leaf collecting all event labels
	 */
	function getIntersectionProbability(leafId: string): string {
		const eventLabels: string[] = [];

		function traverse(current: ProbTreeNode, targetId: string): boolean {
			if (current.id === targetId) {
				return true;
			}
			for (const branch of current.branches) {
				if (traverse(branch.child, targetId)) {
					// Found the path - add this branch's event label
					const cleanLabel = branch.eventLabel.replace(/^\$|\$$/g, '');
					eventLabels.unshift(wrapTextLabel(cleanLabel)); // prepend to keep order root->leaf
					return true;
				}
			}
			return false;
		}

		traverse(node.root, leafId);

		if (eventLabels.length === 0) return '';
		if (eventLabels.length === 1) return `P(${eventLabels[0]})`;
		return `P(${eventLabels.join(' \\cap ')})`;
	}

	/**
	 * Wrap multi-letter text labels in \text{} for proper LaTeX rendering
	 * Single letters or already LaTeX-formatted strings are left as-is
	 */
	function wrapTextLabel(label: string): string {
		// Already contains LaTeX commands - leave as-is
		if (label.includes('\\')) return label;
		// Single character - leave as-is (will render as math variable)
		if (label.length === 1) return label;
		// Multi-letter word - wrap in \text{}
		return `\\text{${label}}`;
	}

	/**
	 * Get conditional probability notation P_A(B) for a branch
	 * - First level (from root): P(B)
	 * - Deeper levels: P_A(B) where A is parent event
	 */
	function getConditionalProbabilityName(parentId: string, childEventLabel: string): string {
		const parentBranch = parentBranchMap.get(parentId);
		// Clean event label for notation (remove $ markers if present)
		const cleanChild = childEventLabel.replace(/^\$|\$$/g, '');
		const wrappedChild = wrapTextLabel(cleanChild);

		if (parentBranch === null || parentBranch === undefined) {
			// First level - simple P(B)
			return `P(${wrappedChild})`;
		}
		// Deeper level - conditional P_A(B)
		const cleanParent = parentBranch.eventLabel.replace(/^\$|\$$/g, '');
		const wrappedParent = wrapTextLabel(cleanParent);
		return `P_{${wrappedParent}}(${wrappedChild})`;
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
		// Clear multi-path selection when clicking a branch
		selectedPaths = [];
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

	function handleEventLabelClick(event: MouseEvent, eventLabel: string) {
		event.stopPropagation();
		// Clear single path selection
		selectedPath = [];
		// Find all paths ending with this event label
		const paths = findPathsByEventLabel(eventLabel);
		// Toggle: if same paths are already selected, deselect
		if (
			selectedPaths.length === paths.length &&
			paths.every((p) => selectedPaths.some((sp) => sp.join('-') === p.join('-')))
		) {
			selectedPaths = [];
		} else {
			selectedPaths = paths;
		}
	}

	function handleSvgClick(event: MouseEvent) {
		// Only deselect if clicking directly on SVG background
		if (event.target === event.currentTarget) {
			selectedPath = [];
			selectedPaths = [];
		}
	}

	function handleProbLabelClick(event: MouseEvent, branchKey: string) {
		event.stopPropagation();
		const currentValue = showProbName[branchKey] ?? false;
		showProbName = { ...showProbName, [branchKey]: !currentValue };
	}

	// =========================================================================
	// RENDERING HELPERS
	// =========================================================================

	/**
	 * Get the effective paths for highlighting
	 * Priority: selectedPaths > selectedPath > hoveredPath
	 */
	let effectivePaths = $derived.by(() => {
		if (selectedPaths.length > 0) return selectedPaths;
		if (selectedPath.length > 0) return [selectedPath];
		if (hoveredPath.length > 0) return [hoveredPath];
		return [];
	});

	/**
	 * Determine if we should dim non-highlighted elements
	 */
	let hasHighlight = $derived(effectivePaths.length > 0);

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
		width={svgWidth}
		height={svgHeight}
		viewBox="0 0 {svgWidth} {svgHeight}"
		class="pt-svg"
		role="img"
		aria-label="Arbre de probabilité{node.config.rootLabel ? ` : ${node.config.rootLabel}` : ''}"
		onclick={handleSvgClick}
	>
		<!-- Root label (at root node position, same as event labels) -->
		{#if node.config.rootLabel}
			{@const rootPos = positions.get(node.root.id)}
			{#if rootPos}
				<foreignObject x={rootPos.x} y={rootPos.y - 10} width={nodeLabelWidth} height="20">
					<div class="pt-label pt-event-label pt-root-label">
						<math-span>{toLatex(wrapTextLabel(node.config.rootLabel))}</math-span>
					</div>
				</foreignObject>
			{/if}
		{/if}

		<!-- Branches (lines with labels) -->
		{#each allBranches as branchData (branchData.parentId + '-' + branchData.childId)}
			{@const isHighlighted = isBranchInAnyPath(
				branchData.parentId,
				branchData.childId,
				effectivePaths
			)}
			{@const isLeaf = branchData.branch.child.isLeaf}
			{@const branchStartX = branchData.parentPos.x + nodeLabelWidth}
			{@const branchEndX = branchData.childPos.x}
			{@const branchStartY = branchData.parentPos.y}
			{@const branchEndY = branchData.childPos.y}
			{@const midX = (branchStartX + branchEndX) / 2}
			{@const midY = (branchStartY + branchEndY) / 2}
			{@const dx = branchEndX - branchStartX}
			{@const dy = branchEndY - branchStartY}
			{@const branchLength = Math.sqrt(dx * dx + dy * dy)}
			{@const normalX = dy / branchLength}
			{@const normalY = -dx / branchLength}
			{@const isHorizontal = Math.abs(dy / dx) < 0.3}
			{@const isDescending = dy > 10}
			{@const tangentShift = isHorizontal
				? PROB_HORIZ_SHIFT
				: isDescending
					? PROB_HORIZ_SHIFT * 0.5
					: 0}
			{@const labelX = midX + normalX * PROB_PERP_OFFSET + (dx / branchLength) * tangentShift}
			{@const labelY = midY + normalY * PROB_PERP_OFFSET + (dy / branchLength) * tangentShift}
			{@const branchKey = `${branchData.parentId}-${branchData.childId}`}
			{@const showName = showProbName[branchKey] ?? false}
			{@const probText = showName
				? getConditionalProbabilityName(branchData.parentId, branchData.branch.eventLabel)
				: branchData.branch.probability.display}

			<g
				class="pt-branch"
				class:pt-highlighted={isHighlighted}
				class:pt-dimmed={hasHighlight && !isHighlighted}
			>
				<!-- Invisible wider line for easier hover/focus -->
				<line
					role="button"
					tabindex="0"
					aria-label="Branche: {branchData.branch.eventLabel}, probabilité: {branchData.branch
						.probability.display}"
					x1={branchStartX}
					y1={branchData.parentPos.y}
					x2={branchEndX}
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
				>
					<title>P = {activeTooltipContent || branchData.branch.probability.display}</title>
				</line>
				<!-- Visible line -->
				<line
					x1={branchStartX}
					y1={branchData.parentPos.y}
					x2={branchEndX}
					y2={branchData.childPos.y}
					class="pt-branch-line"
				/>

				<!-- Probability label (perpendicular to branch, above line) - clickable to toggle name/value -->
				<foreignObject
					x={labelX - 40}
					y={labelY - 10}
					width="80"
					height="20"
					class="pt-prob-foreign"
					onclick={(e) => handleProbLabelClick(e, branchKey)}
				>
					<div class="pt-label pt-prob-label pt-prob-clickable">
						{#key probText}
							<math-span>{toLatex(probText)}</math-span>
						{/key}
					</div>
				</foreignObject>

				<!-- Event label (at child node, centered in label space) -->
				<!-- If leaf, make clickable to highlight all paths ending with this event -->
				<foreignObject
					x={branchData.childPos.x}
					y={branchData.childPos.y - 10}
					width={nodeLabelWidth}
					height="20"
					class:pt-event-foreign-clickable={isLeaf}
				>
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div
						class="pt-label pt-event-label"
						class:pt-event-clickable={isLeaf}
						onclick={isLeaf
							? (e) => handleEventLabelClick(e, branchData.branch.eventLabel)
							: undefined}
					>
						<math-span>{toLatex(wrapTextLabel(branchData.branch.eventLabel))}</math-span>
					</div>
				</foreignObject>
			</g>
		{/each}

		<!-- Intersection probability at leaves: P(A ∩ B ∩ ...) -->
		{#if node.config.showIntersection}
			{#each allLeaves as leaf (leaf.node.id)}
				{@const isHighlighted = isInAnyPath(leaf.node.id, effectivePaths)}
				{@const intersectionProb = getIntersectionProbability(leaf.node.id)}
				<foreignObject
					x={leaf.pos.x + nodeLabelWidth + 10}
					y={leaf.pos.y - 12}
					width={OUTCOMES_WIDTH - 20}
					height="24"
				>
					<div
						class="pt-intersection-prob"
						class:pt-highlighted={isHighlighted}
						class:pt-dimmed={hasHighlight && !isHighlighted}
					>
						<math-span>{toLatex(intersectionProb)}</math-span>
					</div>
				</foreignObject>
			{/each}
		{/if}

		<!-- Outcomes column (after intersection probabilities if shown) -->
		{#if node.config.showOutcomes}
			{@const outcomesOffsetX = node.config.showIntersection ? OUTCOMES_WIDTH : 0}
			{#each allLeaves as leaf (leaf.node.id)}
				{#if leaf.node.outcome}
					{@const isHighlighted = isInAnyPath(leaf.node.id, effectivePaths)}
					<foreignObject
						x={leaf.pos.x + nodeLabelWidth + 10 + outcomesOffsetX}
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
	}

	/* Root label - inherits from pt-label and pt-event-label */
	.pt-root-label {
		/* Additional styling if needed */
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
		stroke: var(--pt-highlight-color, #3b82f6);
		stroke-width: var(--pt-highlight-width, 2.5px);
	}

	.pt-branch-line {
		stroke: var(--pt-line-color, #1f2937);
		stroke-width: var(--pt-line-width, 1.5px);
		fill: none;
		pointer-events: none;
		transition:
			stroke 0.2s ease,
			stroke-width 0.2s ease;
	}

	.pt-branch.pt-highlighted .pt-branch-line {
		stroke: var(--pt-highlight-color, #3b82f6);
		stroke-width: var(--pt-highlight-width, 2.5px);
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

	.pt-prob-label {
		font-weight: 500;
	}

	.pt-prob-foreign {
		cursor: pointer;
	}

	.pt-prob-clickable {
		pointer-events: auto;
		cursor: pointer;
	}

	.pt-prob-clickable:hover {
		color: var(--pt-highlight-color, #3b82f6);
	}

	.pt-branch.pt-highlighted .pt-prob-label {
		color: var(--pt-highlight-color, #3b82f6);
	}

	.pt-event-label {
		justify-content: center;
		font-weight: 500;
	}

	.pt-event-foreign-clickable {
		cursor: pointer;
	}

	.pt-event-clickable {
		pointer-events: auto;
		cursor: pointer;
	}

	.pt-event-clickable:hover {
		color: var(--pt-highlight-color, #3b82f6);
	}

	.pt-branch.pt-highlighted .pt-event-label {
		color: var(--pt-highlight-color, #3b82f6);
	}

	/* Intersection probability at leaves */
	.pt-intersection-prob {
		display: flex;
		align-items: center;
		height: 100%;
		font-size: 0.85em;
		transition: opacity 0.2s ease;
	}

	.pt-intersection-prob.pt-highlighted {
		color: var(--pt-highlight-color);
		font-weight: 500;
	}

	.pt-intersection-prob.pt-dimmed {
		opacity: var(--pt-dimmed-opacity);
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
