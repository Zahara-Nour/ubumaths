<!--
  Header Component

  AUTHENTICATION FLOW - Step 4 (UI Display):
  This is the final step in the auth flow - displaying the UI based on verified auth state.

  PROPS RECEIVED:
  - session: Verified session from server (via +layout.server.ts → +layout.ts)
  - user: Verified user from server (safe to display)
  - supabase: Supabase client for making authenticated requests

  UI BEHAVIOR:
  1. When logged OUT: Shows "Login" button
  2. When logged IN: Shows user avatar with popup menu containing:
     - User email
     - Dashboard link
     - Logout button

  REACTIVITY:
  - Props automatically update when auth state changes
  - SvelteKit's data flow ensures this component re-renders with new data
  - No manual subscription needed - Svelte 5 props are reactive

  SECURITY:
  - All data displayed here is verified by the server
  - Session and user have been authenticated via getUser()
  - Safe to trust and display to the user

  LOGOUT FLOW:
  1. Call supabase.auth.signOut() to clear session
  2. Call invalidate('supabase:auth') to trigger server re-verification
  3. Navigate to home page
  4. The invalidate triggers the reactive chain:
     - +layout.ts re-runs → +layout.server.ts re-runs → safeGetSession() → returns null
     - Updated props flow to this component → Login button appears
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Sheet from '$lib/components/ui/sheet';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import type { User } from '@supabase/supabase-js';
	import type { Profile } from '$lib/types/database';
	import type { Component } from 'svelte';
	import {
		Menu,
		LogIn,
		LogOut,
		LayoutDashboard,
		Sun,
		Moon,
		Minus,
		Plus,
		Maximize,
		Minimize,
		Users,
		MessageCircle,
		Mail,
		Home,
		Gamepad2,
		FileSpreadsheet
	} from 'lucide-svelte';
	import gidouille from '$lib/assets/images/gidouille.png';
	import { getAvatarInitials, getAvatarUrl } from '$lib/utils/avatar';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// Fullscreen state
	let isFullscreen = $state(false);

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			isFullscreen = true;
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
				isFullscreen = false;
			}
		}
	}

	// Listen for fullscreen changes
	$effect(() => {
		const handleFullscreenChange = () => {
			isFullscreen = !!document.fullscreenElement;
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});

	// Navigation item type
	type NavItem = { label: string; href: string; icon: Component; roles?: string[] };

	// Props received from parent layout (+layout.svelte)
	// These are automatically reactive in Svelte 5
	let {
		title = 'UbuMaths',
		user = null,
		profile = null,
		sidebarItems = [
			{ label: 'Accueil', href: '/', icon: Home },
			{ label: 'Jeux', href: '/games', icon: Gamepad2 },
			{
				label: 'Worksheets',
				href: '/dashboard/teacher/worksheets',
				icon: FileSpreadsheet,
				roles: ['teacher']
			},
			{
				label: 'Mes Fiches',
				href: '/dashboard/student/worksheets',
				icon: FileSpreadsheet,
				roles: ['student']
			}
		]
	}: {
		title?: string;
		user?: User | null; // Verified user from server
		profile?: Profile | null; // User profile from database
		sidebarItems?: NavItem[];
	} = $props();

	// Filter items based on user role
	let visibleItems = $derived(
		sidebarItems.filter((item) => {
			// If no roles specified, show to everyone
			if (!item.roles) return true;
			// If roles specified, check if user has one of the required roles
			if (!profile) return false;
			return item.roles.includes(profile.role);
		})
	);

	// Check if a link is active
	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (pathname === href) return true;
		if (href !== '/' && pathname.startsWith(href + '/')) return true;
		return false;
	}

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Handle navigation - close drawer after click
	function handleNavClick(): void {
		mobileMenuOpen = false;
	}

	/**
	 * Handle user logout
	 *
	 * FLOW:
	 * 1. POST to server logout endpoint (clears cookies on server)
	 * 2. Server redirects to home page
	 * 3. The onAuthStateChange listener detects SIGNED_OUT
	 * 4. Calls invalidate() to refresh with null session
	 * 5. UI updates to show login button
	 */
	async function handleLogout() {
		// Use a form submission to POST to the server logout endpoint
		// This ensures cookies are cleared on the server side
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/logout';
		document.body.appendChild(form);
		form.submit();
	}
</script>

<header class="border-b border-border bg-background shadow-sm">
	<div class="flex h-16 items-center gap-4 px-4">
		<!-- Hamburger menu - visible only on mobile (md:hidden) -->
		<button
			class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none md:hidden"
			onclick={() => (mobileMenuOpen = true)}
			aria-label="Ouvrir le menu"
		>
			<Menu class="h-6 w-6" />
		</button>

		<!-- Gidouille + Title - centered on mobile, left-aligned on desktop -->
		<a
			href={resolve('/')}
			class="flex flex-1 items-center justify-center gap-2 transition-opacity hover:opacity-80 md:flex-none md:justify-start"
		>
			<img src={gidouille} alt="Gidouille" class="h-6 w-6" />
			<h1 class="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h1>
		</a>

		<!-- Spacer - only on desktop -->
		<div class="hidden flex-1 md:block"></div>

		<!-- Navigation -->
		<nav class="flex items-center gap-2">
			<!-- Auth section -->
			{#if user}
				<div class="border-l pl-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="relative h-10 w-10 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							<Avatar.Root class="h-10 w-10">
								<Avatar.Image
									src={getAvatarUrl(
										profile
											? {
													avatar_url: profile.avatar_url,
													role: profile.role,
													gender: profile.gender
												}
											: { avatar_url: null },
										user
									)}
									alt={user?.email || 'User'}
								/>
								<Avatar.Fallback>
									{getAvatarInitials(profile?.firstname ?? null, profile?.lastname ?? null) ||
										user?.email?.charAt(0).toUpperCase() ||
										'?'}
								</Avatar.Fallback>
							</Avatar.Root>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-56">
							<DropdownMenu.Label>{user?.email}</DropdownMenu.Label>
							<DropdownMenu.Separator />

							<!-- Mobile-only controls -->
							<div class="md:hidden">
								<!-- Dark mode toggle -->
								<DropdownMenu.Item onclick={() => theme.toggle()}>
									{#if theme.dark}
										<Sun class="mr-2 h-4 w-4" />
										Mode clair
									{:else}
										<Moon class="mr-2 h-4 w-4" />
										Mode sombre
									{/if}
								</DropdownMenu.Item>

								<!-- Font size controls -->
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger>
										<span class="mr-2 text-sm font-medium">A</span>
										Taille du texte
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<DropdownMenu.Item
											onclick={() => fontSize.decrease()}
											disabled={!fontSize.canDecrease}
										>
											<Minus class="mr-2 h-4 w-4" />
											Réduire
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() => fontSize.increase()}
											disabled={!fontSize.canIncrease}
										>
											<Plus class="mr-2 h-4 w-4" />
											Agrandir
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>

								<DropdownMenu.Separator />
							</div>

							<DropdownMenu.Item>
								<a href={resolve('/dashboard')} class="flex w-full items-center">
									<LayoutDashboard class="mr-2 h-4 w-4" />
									Tableau de bord
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								<a href={resolve('/dashboard/friends')} class="flex w-full items-center">
									<Users class="mr-2 h-4 w-4" />
									Amis
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								<a href={resolve('/dashboard/chat')} class="flex w-full items-center">
									<MessageCircle class="mr-2 h-4 w-4" />
									Chat
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								<a href={resolve('/messages/inbox')} class="flex w-full items-center">
									<Mail class="mr-2 h-4 w-4" />
									Messages
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleLogout}>
								<LogOut class="mr-2 h-4 w-4" />
								Déconnexion
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{:else}
				<Button href="/auth/login" size="sm" variant="destructive">
					<LogIn class="mr-2 h-4 w-4" /></Button
				>
			{/if}

			<!-- Desktop controls - hidden on mobile -->
			<div class="hidden items-center gap-2 border-l pl-2 md:flex">
				<!-- Font size controls -->
				<div class="flex items-center gap-1">
					<Button
						onclick={() => fontSize.decrease()}
						disabled={!fontSize.canDecrease}
						variant="ghost"
						size="icon-sm"
						aria-label="Réduire la taille du texte"
						title="Réduire la taille du texte"
					>
						<Minus class="h-5 w-5" />
					</Button>
					<span class="text-sm font-medium">A</span>
					<Button
						onclick={() => fontSize.increase()}
						disabled={!fontSize.canIncrease}
						variant="ghost"
						size="icon-sm"
						aria-label="Augmenter la taille du texte"
						title="Augmenter la taille du texte"
					>
						<Plus class="h-5 w-5" />
					</Button>
				</div>

				<!-- Dark mode toggle -->
				<Button
					onclick={() => theme.toggle()}
					variant="ghost"
					size="icon-sm"
					aria-label="Basculer le mode sombre"
				>
					{#if theme.dark}
						<Sun class="h-6 w-6" />
					{:else}
						<Moon class="h-6 w-6" />
					{/if}
				</Button>

				<!-- Fullscreen toggle -->
				<Button
					onclick={toggleFullscreen}
					variant="ghost"
					size="icon-sm"
					aria-label="Basculer le plein écran"
					title="Basculer le plein écran"
				>
					{#if isFullscreen}
						<Minimize class="h-6 w-6" />
					{:else}
						<Maximize class="h-6 w-6" />
					{/if}
				</Button>
			</div>
		</nav>
	</div>
</header>

<!-- Mobile Navigation Drawer -->
<Sheet.Root bind:open={mobileMenuOpen}>
	<Sheet.Content side="left" class="flex w-72 flex-col p-0">
		<Sheet.Header class="border-b border-border px-4 py-3">
			<Sheet.Title class="text-lg font-semibold">Navigation</Sheet.Title>
		</Sheet.Header>

		<nav class="flex flex-1 flex-col py-2" aria-label="Navigation principale">
			{#each visibleItems as item (item.href)}
				<a
					href={resolve(item.href as '/')}
					data-sveltekit-preload-data="tap"
					onclick={handleNavClick}
					class="flex items-center gap-3 px-4 py-3 text-base transition-colors
						{isActive(item.href)
						? 'bg-primary/10 font-medium text-primary'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'}"
				>
					<item.icon class="h-5 w-5 shrink-0" />
					<span class="flex-1">{item.label}</span>
				</a>
			{/each}
		</nav>

		<!-- Settings section at bottom -->
		<div class="border-t border-border px-4 py-3">
			<p class="mb-2 text-xs font-medium text-muted-foreground uppercase">Paramètres</p>
			<div class="flex items-center justify-between gap-4">
				<!-- Dark mode toggle -->
				<button
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

				<!-- Font size controls -->
				<div class="flex items-center gap-1">
					<button
						onclick={() => fontSize.decrease()}
						disabled={!fontSize.canDecrease}
						class="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
						aria-label="Réduire la taille du texte"
					>
						<Minus class="h-4 w-4" />
					</button>
					<span class="text-sm font-medium">A</span>
					<button
						onclick={() => fontSize.increase()}
						disabled={!fontSize.canIncrease}
						class="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
						aria-label="Augmenter la taille du texte"
					>
						<Plus class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
