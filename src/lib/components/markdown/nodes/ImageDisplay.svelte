<!--
	ImageDisplay Component
	======================

	Renders an image with full format support:
	- Size classes (inline, small, medium, large, full)
	- Width percentage override
	- Alignment (left, center, right)
	- Optional caption with figure/figcaption
	- Extreme aspect ratio handling
	- XSS protection via HTML escaping
	- Accessibility (alt, lazy loading, async decoding, aria-describedby)
	- CLS prevention with aspect-ratio CSS

	@see ExerciseDisplay.svelte for original implementation
	@see image-dimensions.ts for dimension calculations
-->
<script lang="ts">
	import type { ImageSizeClass, ImageAlignment } from '$lib/ubumark';
	import {
		getDimensionsForFormat,
		shouldUseFigureEnvironment
	} from '$lib/exercises/services/image-dimensions';
	import { escapeHtml } from '../utils';

	interface Props {
		src: string;
		alt?: string;
		title?: string;
		sizeClass?: ImageSizeClass;
		widthPercent?: number;
		alignment?: ImageAlignment;
		caption?: string;
		originalWidth?: number;
		originalHeight?: number;
		class?: string;
	}

	let {
		src,
		alt = '',
		title = undefined,
		sizeClass = undefined,
		widthPercent = undefined,
		alignment = 'center',
		caption = undefined,
		originalWidth = undefined,
		originalHeight = undefined,
		class: className = ''
	}: Props = $props();

	// Escaped values for safe rendering
	let escapedSrc = $derived(escapeHtml(src));
	let escapedAlt = $derived(escapeHtml(alt));
	let escapedTitle = $derived(title ? escapeHtml(title) : undefined);
	let escapedCaption = $derived(caption ? escapeHtml(caption) : undefined);

	// Generate unique ID for aria-describedby (when caption exists)
	let figcaptionId = $derived(
		escapedCaption ? `fig-caption-${Math.random().toString(36).substring(2, 9)}` : undefined
	);

	// Build an ImageNode-like object for dimension calculation
	let imageNode = $derived({
		type: 'image' as const,
		src,
		alt,
		title,
		sizeClass,
		widthPercent,
		alignment,
		caption,
		originalWidth,
		originalHeight
	});

	// Get dimensions from service
	let dimensions = $derived(getDimensionsForFormat(imageNode, 'html'));

	// Check if we should use figure environment
	let useFigure = $derived(shouldUseFigureEnvironment(imageNode));

	// Build inline styles for the image
	let styleProperties = $derived.by(() => {
		const props: string[] = [];

		// Apply width
		if (dimensions.width) {
			props.push(`width: ${dimensions.width}`);
		}

		// Apply max-width
		if (dimensions.maxWidth) {
			props.push(`max-width: ${dimensions.maxWidth}`);
		}

		// Handle extreme aspect ratios and add aspect-ratio CSS for CLS prevention
		if (originalWidth && originalHeight) {
			const aspectRatio = originalWidth / originalHeight;

			// Very wide images (ratio > 3:1): Apply max-height constraint
			if (aspectRatio > 3) {
				props.push('max-height: 300px');
				props.push('width: auto');
			}
			// Very tall images (ratio < 1:3): Apply max-width constraint
			else if (aspectRatio < 1 / 3) {
				props.push('max-width: 200px');
				props.push('height: auto');
			}

			// Add aspect-ratio CSS to prevent CLS (Cumulative Layout Shift)
			props.push(`aspect-ratio: ${originalWidth} / ${originalHeight}`);
		}

		// Apply max-height from dimensions if present
		if (dimensions.maxHeight) {
			props.push(`max-height: ${dimensions.maxHeight}`);
		}

		return props;
	});

	// CSS classes for the image
	let imgClasses = $derived.by(() => {
		const classes = ['exercise-image'];
		if (sizeClass === 'inline') {
			classes.push('exercise-image-inline');
		}
		return classes.join(' ');
	});

	// Alignment class for container
	let alignmentClass = $derived(`exercise-image-${alignment}`);

	// Style attribute string
	let styleAttr = $derived(styleProperties.length > 0 ? styleProperties.join('; ') : undefined);
</script>

{#if useFigure}
	<figure class="exercise-figure {alignmentClass} {className}">
		<img
			src={escapedSrc}
			alt={escapedAlt}
			title={escapedTitle}
			aria-describedby={figcaptionId}
			class={imgClasses}
			style={styleAttr}
			loading="lazy"
			decoding="async"
		/>
		{#if escapedCaption && figcaptionId}
			<figcaption id={figcaptionId} class="exercise-figcaption">
				{@html escapedCaption}
			</figcaption>
		{/if}
	</figure>
{:else if sizeClass === 'inline'}
	<!-- Inline images: render directly without container -->
	<img
		src={escapedSrc}
		alt={escapedAlt}
		title={escapedTitle}
		class="{imgClasses} {className}"
		style={styleAttr}
		loading="lazy"
		decoding="async"
	/>
{:else}
	<!-- Block images without caption: use a simple div container for alignment -->
	<div class="{alignmentClass} {className}">
		<img
			src={escapedSrc}
			alt={escapedAlt}
			title={escapedTitle}
			class={imgClasses}
			style={styleAttr}
			loading="lazy"
			decoding="async"
		/>
	</div>
{/if}

<style>
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
