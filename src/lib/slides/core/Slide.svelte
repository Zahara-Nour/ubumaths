<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SlideProps } from './types.js';

	interface Props extends SlideProps {
		/** Slide content */
		children: Snippet;
		/** Nested vertical slides */
		vertical?: Snippet;
	}

	let {
		children,
		vertical,
		transition,
		transitionSpeed,
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundOpacity,
		state,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data
	}: Props = $props();

	// Build data attributes object
	const dataAttrs = $derived(() => {
		const attrs: Record<string, string | undefined> = {};

		if (transition) attrs['data-transition'] = transition;
		if (transitionSpeed) attrs['data-transition-speed'] = transitionSpeed;
		if (background) attrs['data-background'] = background;
		if (backgroundImage) attrs['data-background-image'] = backgroundImage;
		if (backgroundVideo) attrs['data-background-video'] = backgroundVideo;
		if (backgroundIframe) attrs['data-background-iframe'] = backgroundIframe;
		if (backgroundSize) attrs['data-background-size'] = backgroundSize;
		if (backgroundPosition) attrs['data-background-position'] = backgroundPosition;
		if (backgroundRepeat) attrs['data-background-repeat'] = backgroundRepeat;
		if (backgroundOpacity !== undefined)
			attrs['data-background-opacity'] = String(backgroundOpacity);
		if (state) attrs['data-state'] = state;
		if (autoSlide !== undefined) attrs['data-autoslide'] = String(autoSlide);
		if (autoAnimate) attrs['data-auto-animate'] = '';
		if (autoAnimateId) attrs['data-auto-animate-id'] = autoAnimateId;
		if (visibility) attrs['data-visibility'] = visibility;

		// Merge custom data attributes
		if (data) {
			for (const [key, value] of Object.entries(data)) {
				attrs[`data-${key}`] = value;
			}
		}

		return attrs;
	});
</script>

{#if vertical}
	<!-- Vertical slide stack -->
	<section>
		<section class={className} {...dataAttrs()}>
			{@render children()}
		</section>
		{@render vertical()}
	</section>
{:else}
	<!-- Single slide -->
	<section class={className} {...dataAttrs()}>
		{@render children()}
	</section>
{/if}
