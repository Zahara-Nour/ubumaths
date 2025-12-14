<!--
	VideoDisplay Component
	=======================

	Renders video content with full format support:
	- HTML5 video elements (mp4, webm, etc.)
	- YouTube embeds (via youtube-nocookie.com for privacy)
	- Size classes (inline, small, medium, large, full)
	- Width percentage override
	- Alignment (left, center, right)
	- Playback controls (controls, autoplay, loop, muted)
	- XSS protection via HTML escaping
	- Accessibility (alt text, title attributes)
	- Responsive design

	@see ImageDisplay.svelte for sizing pattern reference
	@see video-extension.ts for TipTap rendering logic
-->
<script lang="ts">
	import type { ImageSizeClass, ImageAlignment } from '$lib/custom-markdown';
	import { escapeHtml } from '../utils';

	type VideoProvider = 'html5' | 'youtube';

	interface Props {
		src: string;
		alt?: string;
		provider?: VideoProvider;
		videoId?: string;
		sizeClass?: ImageSizeClass;
		widthPercent?: number;
		alignment?: ImageAlignment;
		controls?: boolean;
		autoplay?: boolean;
		loop?: boolean;
		muted?: boolean;
		class?: string;
	}

	let {
		src,
		alt = '',
		provider = 'html5',
		videoId = undefined,
		sizeClass = undefined,
		widthPercent = undefined,
		alignment = 'center',
		controls = true,
		autoplay = false,
		loop = false,
		muted = false,
		class: className = ''
	}: Props = $props();

	// Escaped values for safe rendering
	let escapedSrc = $derived(escapeHtml(src));
	let escapedAlt = $derived(escapeHtml(alt));

	/**
	 * Size class to CSS width/max-width mapping
	 * Matches the SIZE_CLASS_STYLES from video-extension.ts
	 */
	const SIZE_STYLES: Record<ImageSizeClass, { width: string; maxWidth: string }> = {
		inline: { width: '1.5em', maxWidth: '1.5em' },
		small: { width: '25%', maxWidth: '300px' },
		medium: { width: '50%', maxWidth: '600px' },
		large: { width: '75%', maxWidth: '900px' },
		full: { width: '100%', maxWidth: '1200px' }
	};

	/**
	 * Build inline styles for the video wrapper
	 * Handles sizing and alignment
	 */
	let wrapperStyles = $derived.by(() => {
		const styles: string[] = [];

		// Determine wrapper width from size class or width percent
		if (sizeClass && SIZE_STYLES[sizeClass]) {
			styles.push(`width: ${SIZE_STYLES[sizeClass].width}`);
			styles.push(`max-width: ${SIZE_STYLES[sizeClass].maxWidth}`);
		} else if (widthPercent !== undefined && widthPercent !== null) {
			styles.push(`width: ${widthPercent}%`);
		} else {
			// Default: fit content, max 100%
			styles.push('width: fit-content', 'max-width: 100%');
		}

		return styles.join('; ');
	});

	/**
	 * Alignment class for container
	 * Uses margin-based alignment (left: mr-auto, center: mx-auto, right: ml-auto)
	 */
	let alignmentClass = $derived.by(() => {
		if (alignment === 'center') return 'video-align-center';
		if (alignment === 'right') return 'video-align-right';
		return 'video-align-left';
	});

	/**
	 * Build YouTube embed URL with playback parameters
	 */
	let youtubeUrl = $derived.by(() => {
		if (provider !== 'youtube' || !videoId) return '';

		const params = new URLSearchParams();
		if (autoplay) params.set('autoplay', '1');
		if (loop) {
			params.set('loop', '1');
			params.set('playlist', videoId); // Required for loop to work
		}
		if (muted) params.set('mute', '1');
		if (!controls) params.set('controls', '0');

		const paramString = params.toString();
		return `https://www.youtube-nocookie.com/embed/${videoId}${paramString ? '?' + paramString : ''}`;
	});
</script>

{#if provider === 'youtube' && videoId}
	<!-- YouTube embed -->
	<div class="video-wrapper {alignmentClass} {className}" style={wrapperStyles}>
		<iframe
			src={youtubeUrl}
			title={escapedAlt || 'YouTube video'}
			frameborder="0"
			allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
			class="video-iframe"
		></iframe>
	</div>
{:else}
	<!-- HTML5 video -->
	<div class="video-wrapper {alignmentClass} {className}" style={wrapperStyles}>
		<video class="video-element" {controls} {autoplay} {loop} {muted} preload="metadata">
			<source src={escapedSrc} type="video/mp4" />
			{#if escapedAlt}
				<p>{escapedAlt}</p>
			{/if}
		</video>
	</div>
{/if}

<style>
	/* ============================================================================ */
	/* Video Wrapper Styles */
	/* ============================================================================ */

	/* Wrapper container for sizing and alignment */
	.video-wrapper {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	/* Alignment classes using margin-based positioning */
	.video-align-left {
		margin-left: 0;
		margin-right: auto;
	}

	.video-align-center {
		margin-left: auto;
		margin-right: auto;
	}

	.video-align-right {
		margin-left: auto;
		margin-right: 0;
	}

	/* ============================================================================ */
	/* Video Element Styles */
	/* ============================================================================ */

	/* HTML5 video element */
	.video-element {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
	}

	/* YouTube iframe */
	.video-iframe {
		width: 100%;
		aspect-ratio: 16 / 9;
		display: block;
		border-radius: 0.5rem;
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
	}

	/* Dark mode adjustments */
	:global(.dark) .video-element,
	:global(.dark) .video-iframe {
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.3),
			0 1px 2px -1px rgb(0 0 0 / 0.3);
	}

	/* Responsive adjustments for small screens */
	@media (max-width: 640px) {
		.video-wrapper {
			width: 100% !important;
			max-width: 100% !important;
		}

		.video-element,
		.video-iframe {
			width: 100%;
		}
	}
</style>
