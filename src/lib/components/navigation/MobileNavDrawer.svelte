<script lang="ts">
	import { page } from '$app/state';
	import { resolvePath } from '#lib/navigation/resolve-path.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import { theme } from '#lib/stores/theme.svelte.ts';
	import { fontSize } from '#lib/stores/fontSize.svelte.ts';
	import EasyReadingToggle from '#lib/components/EasyReadingToggle.svelte';
	import { Sun, Moon, Minus, Plus } from '@lucide/svelte';
	import type { LucideIcon } from '@lucide/svelte';

	/**
	 * Navigation item type for MobileNavDrawer
	 */
	export type NavItem = {
		label: string;
		href: string;
		icon: LucideIcon;
		roles?: string[];
		badge?: number;
		/** Ce que compte la pastille, lu par les lecteurs d'écran. */
		badgeLabel?: string;
		/** Footer items render after a separator at the bottom of the drawer. */
		footer?: boolean;
		/** When true, the item triggers onLogout instead of navigating. */
		logout?: boolean;
	};

	// Props
	let {
		open = $bindable(false),
		items = [],
		onNavigate,
		onLogout,
		isActive: customIsActive,
		showSettings = false
	}: {
		open?: boolean;
		items: NavItem[];
		onNavigate?: () => void;
		onLogout?: () => void;
		/** Custom function to check if a link is active (for complex route matching) */
		isActive?: (href: string) => boolean;
		/** When true, render a "Préférences" section (dark mode, font size) at the bottom. */
		showSettings?: boolean;
	} = $props();

	let mainItems = $derived(items.filter((i) => !i.footer));
	let footerItems = $derived(items.filter((i) => i.footer));

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
	// svelte-ignore state_referenced_locally
	const checkActive = customIsActive ?? defaultIsActive;

	// Handle navigation - close drawer after click
	function handleNavClick(): void {
		open = false;
		onNavigate?.();
	}

	function handleLogoutClick(): void {
		open = false;
		onLogout?.();
	}
</script>

{#snippet itemLink(item: NavItem)}
	<a
		href={resolvePath(item.href)}
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
				<span aria-hidden="true">{item.badge > 99 ? '99+' : item.badge}</span>
				{#if item.badgeLabel}<span class="sr-only">{item.badgeLabel}</span>{/if}
			</span>
		{/if}
	</a>
{/snippet}

<Sheet.Root bind:open>
	<Sheet.Content side="left" class="flex w-72 flex-col p-0">
		<Sheet.Header class="border-b border-border px-4 py-3">
			<Sheet.Title class="text-lg font-semibold">Navigation</Sheet.Title>
		</Sheet.Header>

		<!-- La liste défile seule (`min-h-0` : sans lui un enfant flex ne rétrécit pas sous son contenu) ;
		     l'en-tête et « Préférences » restent à l'écran -->
		<nav
			class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2"
			aria-label="Navigation principale"
		>
			{#each mainItems as item (item.href)}
				{@render itemLink(item)}
			{/each}

			{#if footerItems.length > 0}
				<hr class="mx-4 my-2 border-t border-border" />
				{#each footerItems as item (item.href)}
					{#if item.logout}
						<button
							type="button"
							onclick={handleLogoutClick}
							class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted/80"
						>
							<item.icon class="h-5 w-5 shrink-0" />
							<span class="flex-1">{item.label}</span>
						</button>
					{:else}
						{@render itemLink(item)}
					{/if}
				{/each}
			{/if}
		</nav>

		{#if showSettings}
			<div class="shrink-0 border-t border-border px-4 py-3">
				<p class="mb-2 text-xs font-medium text-muted-foreground uppercase">Préférences</p>
				<div class="flex items-center justify-between gap-4">
					<button
						type="button"
						onclick={() => theme.toggle()}
						class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
						aria-label="Basculer le mode sombre"
					>
						{#if theme.dark}
							<Sun class="h-5 w-5" />
							<span>Clair</span>
						{:else}
							<Moon class="h-5 w-5" />
							<span>Sombre</span>
						{/if}
					</button>

					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => fontSize.decrease()}
							disabled={!fontSize.canDecrease}
							class="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
							aria-label="Réduire la taille du texte"
						>
							<Minus class="h-4 w-4" />
						</button>
						<span class="text-sm font-medium">A</span>
						<button
							type="button"
							onclick={() => fontSize.increase()}
							disabled={!fontSize.canIncrease}
							class="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
							aria-label="Augmenter la taille du texte"
						>
							<Plus class="h-4 w-4" />
						</button>
					</div>
				</div>
				<div class="mt-2">
					<EasyReadingToggle variant="menu" />
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
