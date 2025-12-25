<script lang="ts">
	import { page } from '$app/state';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { Component } from 'svelte';

	/**
	 * Navigation item type for MobileNavDrawer
	 */
	export type NavItem = {
		label: string;
		href: string;
		icon: Component;
		roles?: string[];
		badge?: number;
	};

	// Props
	let {
		open = $bindable(false),
		items = [],
		onNavigate,
		isActive: customIsActive
	}: {
		open?: boolean;
		items: NavItem[];
		onNavigate?: () => void;
		/** Custom function to check if a link is active (for complex route matching) */
		isActive?: (href: string) => boolean;
	} = $props();

	// Default active check: exact match or starts with (for nested routes)
	function defaultIsActive(href: string): boolean {
		const pathname = page.url.pathname;
		// Exact match
		if (pathname === href) return true;
		// Nested route match (e.g., /messages/inbox/123 matches /messages/inbox)
		if (href !== '/' && pathname.startsWith(href + '/')) return true;
		return false;
	}

	// Use custom or default isActive function
	const checkActive = customIsActive ?? defaultIsActive;

	// Handle navigation - close drawer after click
	function handleNavClick(): void {
		open = false;
		onNavigate?.();
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="left" class="w-72 p-0">
		<Sheet.Header class="border-b border-border px-4 py-3">
			<Sheet.Title class="text-lg font-semibold">Navigation</Sheet.Title>
		</Sheet.Header>

		<nav class="flex flex-col py-2" aria-label="Navigation principale">
			{#each items as item (item.href)}
				<a
					href={item.href}
					data-sveltekit-preload-data="tap"
					onclick={handleNavClick}
					class="flex items-center gap-3 px-4 py-3 text-base transition-colors
						{checkActive(item.href)
						? 'bg-primary/10 font-medium text-primary'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'}"
				>
					<item.icon class="h-5 w-5 shrink-0" />
					<span class="flex-1">{item.label}</span>
					{#if item.badge && item.badge > 0}
						<span
							class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
						>
							{item.badge > 99 ? '99+' : item.badge}
						</span>
					{/if}
				</a>
			{/each}
		</nav>
	</Sheet.Content>
</Sheet.Root>
