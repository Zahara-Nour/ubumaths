<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<!-- Holographic Card CSS -->
	<link rel="stylesheet" href="/css/holo-cards/base.css" />
	<link rel="stylesheet" href="/css/holo-cards/cards.css" />
	<link rel="stylesheet" href="/css/holo-cards/regular-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/cosmos-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/rainbow-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/secret-rare.css" />
</svelte:head>

{@render children()}
