<script lang="ts">
	import { page } from '$app/state';
	import { resolvePath } from '#lib/navigation/resolve-path.ts';
	import {
		PUBLIC_NAV_ITEMS,
		isNavItemActive,
		type NavItem
	} from '#lib/navigation/public-nav-items.ts';
	import type { Tables } from '#lib/types/database.ts';

	// Props
	let {
		profile = null,
		items = PUBLIC_NAV_ITEMS
	}: {
		profile?: Tables<'profiles'> | null;
		items?: NavItem[];
	} = $props();

	// Filter items based on user role, then split by section (serious | fun).
	// Items without an explicit section default to 'serious' to keep current
	// behaviour for existing callers.
	let visibleItems = $derived(
		items.filter((item) => {
			if (!item.roles) return true;
			if (!profile) return false;
			return item.roles.includes(profile.role);
		})
	);

	let seriousItems = $derived(
		visibleItems.filter((item) => (item.section ?? 'serious') === 'serious')
	);
	let funItems = $derived(visibleItems.filter((item) => item.section === 'fun'));

	// Lien surligné : même règle que le tiroir (écart V75)
	function isActive(href: string): boolean {
		return isNavItemActive(href, page.url.pathname);
	}
</script>

{#snippet itemLink(item: NavItem)}
	<a
		href={resolvePath(item.href)}
		data-sveltekit-preload-data="tap"
		class="group flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {isActive(
			item.href
		)
			? 'bg-primary/10 text-primary'
			: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
		title={item.label}
	>
		<item.icon class="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
		<span class="text-center text-xs leading-tight font-medium">{item.label}</span>
	</a>
{/snippet}

<!-- RAIL SIDEBAR - Vertical icon navigation (Claude AI style) -->
<aside class="hidden w-20 border-r border-border bg-card/50 shadow-sm md:block dark:bg-card">
	<nav class="flex flex-col items-center gap-1 py-4">
		{#each seriousItems as item (item.href)}
			{@render itemLink(item)}
		{/each}

		{#if funItems.length > 0}
			<hr class="my-2 w-10 border-t border-border" />
			{#each funItems as item (item.href)}
				{@render itemLink(item)}
			{/each}
		{/if}
	</nav>
</aside>
