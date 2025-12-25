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
		onNavigate
	}: {
		open?: boolean;
		items: NavItem[];
		onNavigate?: () => void;
	} = $props();

	// Check if a link is active
	function isActive(href: string): boolean {
		return page.url.pathname === href;
	}

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
						{isActive(item.href)
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
