<script lang="ts">
	/**
	 * Slides Layout - No parent layout inheritance
	 * The @ suffix breaks the layout chain completely
	 * But we still import app.css for Shadcn theme variables
	 */
	import type { Snippet } from 'svelte';
	import '../../app.css';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<style>
		/* Reset global styles for slides */
		html,
		body {
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
			height: 100% !important;
			overflow: hidden !important;
			background: #000 !important;
		}
		/* Hide UbuMaths layout elements (but not slide elements) */
		body > header,
		body > footer,
		body > nav,
		.sidebar,
		.header,
		.dashboard-header,
		.dashboard-sidebar {
			display: none !important;
		}
	</style>
</svelte:head>

{@render children()}
