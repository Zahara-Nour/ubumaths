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
	import { lore } from '$lib/config/lore';
	import { Button } from '$lib/components/ui/button';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import type { User } from '@supabase/supabase-js';
	import type { Profile } from '$lib/types/database-helpers';
	import type { LucideIcon } from '@lucide/svelte';
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
		Home,
		Gamepad2,
		Terminal,
		Calculator,
		PenTool,
		Laugh
	} from '@lucide/svelte';
	import gidouille from '$lib/assets/images/gidouille.png';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { submitLogoutForm } from '$lib/utils/auth';

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
	type NavItem = { label: string; href: string; icon: LucideIcon; roles?: string[] };

	// Props received from parent layout (+layout.svelte)
	// These are automatically reactive in Svelte 5
	let {
		title = 'Chiphre',
		user = null,
		profile = null,
		sidebarItems = [
			{ label: 'Accueil', href: '/', icon: Home },
			{ label: 'Jeux', href: '/games', icon: Gamepad2 },
			{
				label: 'Python',
				href: '/python',
				icon: Terminal,
				roles: ['student', 'teacher']
			},
			{ label: 'Upsilon', href: '/upsilon', icon: Calculator },
			{
				label: 'Whiteboard',
				href: '/whiteboard',
				icon: PenTool,
				roles: ['teacher']
			},
			{
				label: 'Zygomatics',
				href: '/presques-evaluations',
				icon: Laugh
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

	const handleLogout = submitLogoutForm;
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
			<div class="flex flex-col leading-none">
				<h1 class="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h1>
			</div>
		</a>

		<!-- Spacer - only on desktop -->
		<div class="hidden flex-1 md:block"></div>

		<!-- Navigation -->
		<nav class="flex items-center gap-2">
			<!-- Auth section: avatar links directly to /dashboard (Mon cabinet).
				 Dropdown menu was removed in Phase 3 of the sidebar reorganization;
				 logout + GDPR features moved to /dashboard/profile. -->
			{#if user}
				<div class="border-l pl-2">
					<a
						href={resolve('/dashboard')}
						class="relative block h-10 w-10 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						aria-label="Aller à mon cabinet"
					>
						<UserAvatar
							avatar_url={profile?.avatar_url}
							role={profile?.role}
							firstname={profile?.firstname}
							lastname={profile?.lastname}
							class="h-10 w-10"
							decorative
						/>
					</a>
				</div>
			{:else}
				<Button href="/auth/login" size="sm" variant="destructive" aria-label="Se connecter">
					<LogIn class="h-4 w-4 sm:mr-2" />
					<span class="hidden sm:inline">Connexion</span>
				</Button>
			{/if}

			<!-- Desktop controls - hidden on mobile -->
			<div class="hidden items-center gap-2 border-l pl-2 md:flex">
				<!-- Font size controls -->
				<div class="flex items-center gap-1">
					<Button
						onclick={(e: MouseEvent) => {
							fontSize.decrease();
							(e.currentTarget as HTMLElement).blur();
						}}
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
						onclick={(e: MouseEvent) => {
							fontSize.increase();
							(e.currentTarget as HTMLElement).blur();
						}}
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
					onclick={(e: MouseEvent) => {
						theme.toggle();
						(e.currentTarget as HTMLElement).blur();
					}}
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
			<p class="mb-2 text-xs font-medium text-muted-foreground uppercase">{lore.nav.settings}</p>
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

		{#if user}
			<!-- Account section: shortcut to personal space + logout -->
			<div class="border-t border-border px-4 py-3">
				<p class="mb-2 text-xs font-medium text-muted-foreground uppercase">Compte</p>
				<div class="flex flex-col gap-1">
					<a
						href={resolve('/dashboard')}
						onclick={handleNavClick}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
					>
						<LayoutDashboard class="h-5 w-5 shrink-0" />
						<span>Mon cabinet</span>
					</a>
					<button
						type="button"
						onclick={() => {
							mobileMenuOpen = false;
							handleLogout();
						}}
						class="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
					>
						<LogOut class="h-5 w-5 shrink-0" />
						<span>Déconnexion</span>
					</button>
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
