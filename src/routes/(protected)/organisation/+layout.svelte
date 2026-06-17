<!--
	Organisation Layout
	===================

	Shared layout for /organisation/* routes.
	Authentication is already enforced by the parent (protected) layout, so we
	only handle the visual chrome here: a discreet header with a breadcrumb,
	a sub-navigation bar (Kanban / Pomodoro), and a max-width container.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { LayoutDashboard } from '@lucide/svelte';

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

	// Sub-navigation tools. Extend this array when new tools are added.
	// Paths are stored unresolved so `resolve()` can be applied inline at
	// render time (consistent with the rest of the codebase, and so the
	// active-state comparison uses the resolved value too).
	const tools = [
		{ path: '/organisation/kanban', label: 'Kanban' },
		{ path: '/organisation/pomodoro', label: 'Pomodoro' }
	] as const;

	// A tool is "active" when the current pathname IS its resolved href or
	// starts with that href followed by '/' — covers sub-routes like
	// /organisation/kanban/[boardId] without falsely matching a hypothetical
	// future tool like /organisation/kanbanboard.
	let activeTool = $derived(
		tools.find((t) => {
			const href = resolve(t.path);
			return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
		}) ?? null
	);
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<header class="flex flex-col gap-3 border-b pb-4">
		<!-- Breadcrumb -->
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

		<!-- Sub-navigation: one link per tool -->
		<nav aria-label="Outils d'organisation" class="flex items-center gap-1">
			{#each tools as tool (tool.path)}
				{@const isActive = activeTool?.path === tool.path}
				<a
					href={resolve(tool.path)}
					aria-current={isActive ? 'page' : undefined}
					class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors
						{isActive
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				>
					{tool.label}
				</a>
			{/each}
		</nav>
	</header>

	<main>
		{@render children?.()}
	</main>
</div>
