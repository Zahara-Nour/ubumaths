<!--
	Organisation Layout
	===================

	Shared layout for /organisation/* routes.
	Authentication is already enforced by the parent (protected) layout, so we
	only handle the visual chrome here: a discreet header with a breadcrumb and
	a max-width container for child content.

	v1 ships with a single tool (Kanban) so there is no sub-navigation. Add a
	tab bar or sidebar here when more tools are introduced.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { LayoutDashboard } from 'lucide-svelte';

	let { children }: { children: Snippet } = $props();

	// Build a simple breadcrumb from the current path segments after
	// /organisation. UUID-like segments (board ids, etc.) are skipped so we
	// don't render raw identifiers in the chrome.
	// Example: /organisation/kanban -> ['Organisation', 'Kanban']
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

	let breadcrumb = $derived.by(() => {
		const segments = page.url.pathname.split('/').filter(Boolean);
		const orgIndex = segments.indexOf('organisation');
		if (orgIndex === -1) return ['Organisation'];
		const after = segments.slice(orgIndex + 1).filter((s) => !UUID_RE.test(s));
		return ['Organisation', ...after.map((s) => s.charAt(0).toUpperCase() + s.slice(1))];
	});
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<header class="flex flex-col gap-2 border-b pb-4">
		<nav aria-label="Fil d'Ariane" class="flex items-center gap-2 text-sm text-muted-foreground">
			<LayoutDashboard class="h-4 w-4" aria-hidden="true" />
			{#each breadcrumb as crumb, i (i)}
				{#if i > 0}
					<span aria-hidden="true">/</span>
				{/if}
				<span
					class:font-medium={i === breadcrumb.length - 1}
					class:text-foreground={i === breadcrumb.length - 1}
				>
					{crumb}
				</span>
			{/each}
		</nav>
	</header>

	<main>
		{@render children?.()}
	</main>
</div>
