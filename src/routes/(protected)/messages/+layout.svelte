<script lang="ts">
	import { page } from '$app/state';
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Inbox, Send, PencilLine, Archive, Trash2, Menu } from 'lucide-svelte';
	import MobileNavDrawer, { type NavItem } from '$lib/components/navigation/MobileNavDrawer.svelte';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Note: Unread count updates are handled by activityStore (manual refresh only, no polling)
	// See dashboard layout for initial load. Updates occur after user actions only.

	// Navigation items for MobileNavDrawer
	const mobileNavItems: NavItem[] = [
		{
			href: '/messages/inbox',
			label: 'Boîte de réception',
			icon: Inbox,
			badge: privateMessages.unreadCount > 0 ? privateMessages.unreadCount : undefined
		},
		{ href: '/messages/sent', label: 'Envoyés', icon: Send },
		{ href: '/messages/drafts', label: 'Brouillons', icon: PencilLine },
		{ href: '/messages/compose', label: 'Nouveau message', icon: PencilLine },
		{ href: '/messages/archived', label: 'Archivés', icon: Archive }
	];

	// Desktop navigation items (original structure)
	const navItems = [
		{ href: '/messages/inbox', label: 'Boîte de réception', icon: Inbox, badge: true },
		{ href: '/messages/sent', label: 'Envoyés', icon: Send, badge: false },
		{ href: '/messages/drafts', label: 'Brouillons', icon: PencilLine, badge: false },
		{ href: '/messages/compose', label: 'Nouveau message', icon: PencilLine, badge: false }
	];

	// Check if current path matches href
	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<div class="flex h-[calc(100vh-4rem)] flex-col bg-background md:flex-row">
	<!-- Mobile header with hamburger -->
	<div class="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
		<Button
			variant="ghost"
			size="icon"
			onclick={() => (mobileMenuOpen = true)}
			aria-label="Ouvrir le menu"
		>
			<Menu class="h-6 w-6" />
		</Button>
		<h2 class="text-lg font-semibold text-foreground">Messagerie</h2>
	</div>

	<!-- Sidebar - hidden on mobile -->
	<aside class="hidden w-64 border-r border-border bg-card p-4 md:block">
		<div class="mb-4">
			<h2 class="text-lg font-semibold text-foreground">Messagerie</h2>
		</div>

		<nav class="space-y-1">
			{#each navItems as item (item.href)}
				<a href={item.href} class="block">
					<Button
						variant={isActive(item.href) ? 'default' : 'ghost'}
						class="w-full justify-start gap-2"
					>
						<item.icon class="h-4 w-4" />
						<span class="flex-1 text-left">{item.label}</span>
						{#if item.badge && privateMessages.unreadCount > 0}
							<span
								class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
							>
								{privateMessages.unreadCount}
							</span>
						{/if}
					</Button>
				</a>
			{/each}
		</nav>

		<!-- Additional actions -->
		<div class="mt-6 space-y-1">
			<a href="/messages/archived" data-sveltekit-preload-data="hover" class="block">
				<Button
					variant={isActive('/messages/archived') ? 'default' : 'ghost'}
					class="w-full justify-start gap-2"
				>
					<Archive class="h-4 w-4" />
					<span>Archivés</span>
				</Button>
			</a>
			<Button variant="ghost" class="w-full justify-start gap-2" disabled>
				<Trash2 class="h-4 w-4" />
				<span>Corbeille</span>
			</Button>
		</div>

		<!-- Stats -->
		<div class="mt-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
			<div class="flex items-center justify-between">
				<span>Messages non lus</span>
				<span class="font-semibold text-foreground">{privateMessages.unreadCount}</span>
			</div>
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>

	<!-- Mobile Navigation Drawer -->
	<MobileNavDrawer bind:open={mobileMenuOpen} items={mobileNavItems} />
</div>
