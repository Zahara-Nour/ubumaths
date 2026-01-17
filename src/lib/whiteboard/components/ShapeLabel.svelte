<script lang="ts">
	/**
	 * ShapeLabel - Renders a label centered on a shape
	 *
	 * Displays markdown content (including math) centered on a shape.
	 * Supports rotation to follow the shape's angle.
	 *
	 * VIEW mode: Renders parsed markdown via InlineRenderer
	 * EDIT mode: Simple textarea for editing
	 */

	import type { ShapeElement } from '../types/document';
	import { getElementBounds, getBoundsCenter } from '../core/hit-testing';
	import { calculateLineAngle, calculateLineLength, normalizeAngleForText } from '../core/shapes';
	import { parseLabelToInline } from '../utils/label-parser';
	import InlineRenderer from '$lib/components/markdown/InlineRenderer.svelte';

	// ==========================================================================
	// Constants for line/arrow label layout
	// ==========================================================================

	/** Estimated width per character in pixels */
	const CHAR_WIDTH_ESTIMATE = 7;
	/** Vertical offset from line center in pixels */
	const VERTICAL_OFFSET = 8;

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** The shape element with label */
		element: ShapeElement;
		/** Scale factor for coordinate transformation */
		scale?: number;
		/** Whether this label is currently being edited */
		isEditing: boolean;
		/** Initial character to prepend when entering edit mode (from keyboard shortcut) */
		initialChar?: string | null;
		/** Live position offset during drag (from livePositions) */
		liveOffset?: { dx: number; dy: number } | null;
		/** Live rotation override during rotation (from liveRotations) */
		liveRotation?: number | null;
		/** Live resize transform during resize (from liveResizes) */
		liveResize?: { scaleX: number; scaleY: number; originX: number; originY: number } | null;
		/** Live endpoint position during endpoint drag (from liveEndpoints) */
		liveEndpoint?: { endpoint: 'start' | 'end'; x: number; y: number } | null;
		/** Callback when edit mode should end */
		onEndEdit: () => void;
		/** Callback when content changes */
		onContentChange: (content: string) => void;
	}

	let {
		element,
		scale = 1,
		isEditing,
		initialChar = null,
		liveOffset = null,
		liveRotation = null,
		liveResize = null,
		liveEndpoint = null,
		onEndEdit,
		onContentChange
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Local content for editing */
	let editContent = $state(element.labelMarkdown ?? '');

	/** Reference to textarea for focus */
	let textareaRef: HTMLTextAreaElement | null = $state(null);

	/** Track if we've already initialized for this edit session */
	let hasInitializedEdit = $state(false);

	// ==========================================================================
	// Derived
	// ==========================================================================

	/** Shape bounds and center */
	let bounds = $derived(getElementBounds(element));
	let baseCenter = $derived(getBoundsCenter(bounds));

	/** Is this a line or arrow shape? */
	let isLineOrArrow = $derived(element.shapeType === 'line' || element.shapeType === 'arrow');

	/** Effective start point (considering liveEndpoint during drag) */
	let effectiveStart = $derived.by(() => {
		if (liveEndpoint?.endpoint === 'start') {
			return { x: liveEndpoint.x, y: liveEndpoint.y };
		}
		return element.start;
	});

	/** Effective end point (considering liveEndpoint during drag) */
	let effectiveEnd = $derived.by(() => {
		if (liveEndpoint?.endpoint === 'end') {
			return { x: liveEndpoint.x, y: liveEndpoint.y };
		}
		return element.end;
	});

	/**
	 * Effective center including all live transforms:
	 * 1. For lines/arrows with liveEndpoint: use effective points
	 * 2. Apply resize (scale around origin)
	 * 3. Apply position offset (translate)
	 */
	let center = $derived.by(() => {
		let cx: number;
		let cy: number;

		// For lines/arrows, calculate center from effective endpoints
		if (isLineOrArrow && liveEndpoint) {
			cx = (effectiveStart.x + effectiveEnd.x) / 2;
			cy = (effectiveStart.y + effectiveEnd.y) / 2;
		} else {
			cx = baseCenter.x;
			cy = baseCenter.y;
		}

		// Apply live resize: scale around origin point
		// Formula: newPos = origin + (pos - origin) * scale
		if (liveResize) {
			cx = liveResize.originX + (cx - liveResize.originX) * liveResize.scaleX;
			cy = liveResize.originY + (cy - liveResize.originY) * liveResize.scaleY;
		}

		// Apply live position offset
		if (liveOffset) {
			cx += liveOffset.dx;
			cy += liveOffset.dy;
		}

		return { x: cx, y: cy };
	});

	/** Shape rotation - auto-calculate for lines/arrows to align text along the line */
	let rotation = $derived.by(() => {
		// Use live rotation during drag if provided
		if (liveRotation !== null) return liveRotation;

		// Use explicit rotation if set
		if (element.rotation) return element.rotation;

		// Auto-calculate rotation for lines/arrows (use effective points for live updates)
		if (isLineOrArrow) {
			const angle = calculateLineAngle(effectiveStart, effectiveEnd);
			return normalizeAngleForText(angle);
		}

		return 0;
	});

	/** Line length in pixels (for lines/arrows only, use effective points) */
	let lineLength = $derived(
		isLineOrArrow ? calculateLineLength(effectiveStart, effectiveEnd) : Infinity
	);

	/** Split label text for lines/arrows when text is too long */
	let labelParts = $derived.by(() => {
		const text = element.labelMarkdown ?? '';
		if (!text || !isLineOrArrow) {
			return { above: text, below: null as string | null };
		}

		const maxCharsPerLine = Math.floor(lineLength / CHAR_WIDTH_ESTIMATE);

		// Short text: all above the line
		if (text.length <= maxCharsPerLine) {
			return { above: text, below: null as string | null };
		}

		// Medium/long text: split at space nearest to middle
		const midPoint = Math.floor(text.length / 2);
		let splitIndex = text.lastIndexOf(' ', midPoint);
		if (splitIndex === -1) splitIndex = text.indexOf(' ', midPoint);
		if (splitIndex === -1) splitIndex = midPoint; // No space found, split at middle

		let above = text.slice(0, splitIndex).trim();
		let below = text.slice(splitIndex).trim();

		// Truncate if text is too long (> 2x line length)
		const maxTotal = maxCharsPerLine * 2;
		if (text.length > maxTotal) {
			const maxBelow = Math.max(maxCharsPerLine - 3, 1); // -3 for "...", minimum 1
			if (below.length > maxBelow) {
				below = below.slice(0, maxBelow) + '...';
			}
		}

		return { above, below };
	});

	/** Parsed inline nodes for rendering (standard mode) */
	let inlineNodes = $derived(parseLabelToInline(element.labelMarkdown ?? ''));

	/** Parsed inline nodes for above part (line/arrow mode) */
	let aboveNodes = $derived(parseLabelToInline(labelParts.above));

	/** Parsed inline nodes for below part (line/arrow mode) */
	let belowNodes = $derived(labelParts.below ? parseLabelToInline(labelParts.below) : []);

	/** Has content to display */
	let hasContent = $derived(inlineNodes.length > 0 || isEditing);

	// ==========================================================================
	// Effects
	// ==========================================================================

	// Sync content when element changes (external update) and reset init flag
	$effect(() => {
		if (!isEditing) {
			editContent = element.labelMarkdown ?? '';
			hasInitializedEdit = false;
		}
	});

	// Focus textarea when entering edit mode and handle initial character (once)
	$effect(() => {
		if (isEditing && textareaRef && !hasInitializedEdit) {
			hasInitializedEdit = true;

			// If there's an initial character, append it to the existing content
			if (initialChar) {
				editContent = (element.labelMarkdown ?? '') + initialChar;
				// Place cursor at end (after the initial char)
				textareaRef.focus();
				textareaRef.setSelectionRange(editContent.length, editContent.length);
			} else {
				// No initial char - select all for easy replacement
				textareaRef.focus();
				textareaRef.select();
			}
		}
	});

	// Handle click outside when editing
	// Note: Cleanup is guaranteed by Svelte 5 $effect - the returned function
	// runs when isEditing changes or component is destroyed
	$effect(() => {
		if (!isEditing) return;

		function handleClickOutside(e: MouseEvent) {
			if (textareaRef && !textareaRef.contains(e.target as Node)) {
				saveAndClose();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			saveAndClose();
		} else if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveAndClose();
		}
	}

	function saveAndClose() {
		onContentChange(editContent.trim());
		onEndEdit();
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		editContent = target.value;
	}
</script>

{#if hasContent}
	{#if isEditing}
		<!-- EDIT Mode: Simple textarea (always centered on shape) -->
		<div
			class="shape-label editing absolute"
			style="
				left: {center.x * scale}px;
				top: {center.y * scale}px;
				transform: translate(-50%, -50%) rotate({rotation}deg);
				pointer-events: auto;
			"
		>
			<textarea
				bind:this={textareaRef}
				value={editContent}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				class="label-editor min-w-16 resize-none rounded border-2 border-primary bg-white px-2 py-1 text-center text-sm shadow-lg outline-none"
				rows="1"
				placeholder="Label..."
			></textarea>
		</div>
	{:else if isLineOrArrow && labelParts.below}
		<!-- VIEW Mode: Line/Arrow with TWO lines (above + below) -->
		<div
			class="shape-label absolute"
			style="
				left: {center.x * scale}px;
				top: {center.y * scale}px;
				transform: translate(-50%, -50%) rotate({rotation}deg);
				pointer-events: none;
			"
		>
			<div class="label-line-container">
				<div
					class="label-above text-sm whitespace-nowrap"
					style="transform: translateY(-{VERTICAL_OFFSET}px);"
				>
					<InlineRenderer children={aboveNodes} />
				</div>
				<div
					class="label-below text-sm whitespace-nowrap"
					style="transform: translateY({VERTICAL_OFFSET}px);"
				>
					<InlineRenderer children={belowNodes} />
				</div>
			</div>
		</div>
	{:else}
		<!-- VIEW Mode: Standard (single line, offset above for lines/arrows) -->
		<div
			class="shape-label absolute"
			style="
				left: {center.x * scale}px;
				top: {center.y * scale}px;
				transform: translate(-50%, -50%) rotate({rotation}deg) translateY({isLineOrArrow
				? -VERTICAL_OFFSET
				: 0}px);
				pointer-events: none;
			"
		>
			<div class="label-view text-sm whitespace-nowrap">
				<InlineRenderer children={inlineNodes} />
			</div>
		</div>
	{/if}
{/if}

<style>
	.shape-label {
		z-index: 10;
	}

	.shape-label.editing {
		z-index: 100;
	}

	.label-view {
		/* Allow overflow - text can extend beyond shape bounds */
		overflow: visible;
		/* Center text */
		text-align: center;
		/* Inherit font from parent */
		font-family: inherit;
	}

	.label-editor {
		/* Auto-grow width based on content */
		min-width: 60px;
		max-width: 300px;
		/* Center text in textarea */
		text-align: center;
	}

	/* Line/arrow label container for two-line layout */
	.label-line-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}

	.label-above,
	.label-below {
		overflow: visible;
		text-align: center;
		font-family: inherit;
	}
</style>
