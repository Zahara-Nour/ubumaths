<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	// Props
	let { children }: { children: Snippet } = $props();

	const isHome = $derived(page.url.pathname.replace(/\/$/, '') === '/chiffrement');
</script>

<article class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
	{#if !isHome}
		<a
			href={resolve('/chiffrement')}
			class="self-start text-sm text-muted-foreground hover:underline"
		>
			← Le Cabinet Noir de Turingrad
		</a>
	{/if}
	{@render children()}
</article>
