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
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import type { Session, User } from '@supabase/supabase-js';
	import type { Profile } from '$lib/types/database';
	import {
		Menu,
		X,
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
		MessageCircle
	} from 'lucide-svelte';
	import gidouille from '$lib/assets/images/gidouille.png';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import { resolve } from '$app/paths';

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

	// Props received from parent layout (+layout.svelte)
	// These are automatically reactive in Svelte 5
	let {
		title = 'UbuMaths',
		session = null,
		user = null,
		profile = null,
		sidebarItems = [
			{ label: 'Accueil', href: '/', icon: '🏠' },
			{ label: 'Jeux', href: '/games', icon: '🎮' }
		]
	}: {
		title?: string;
		session?: Session | null; // Verified session from server
		user?: User | null; // Verified user from server
		profile?: Profile | null; // User profile from database
		sidebarItems?: Array<{ label: string; href: string; icon?: string }>;
	} = $props();

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	function closeMobileMenu() {
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

	/**
	 * Get user avatar URL with multi-level fallback strategy
	 *
	 * PRIORITY ORDER:
	 * 1. profile.avatar_url - Stored in database (primary source, saved on login)
	 * 2. user.user_metadata.picture - Google OAuth session data (Google's standard field)
	 * 3. user.user_metadata.avatar_url - Other OAuth providers (fallback field)
	 * 4. Role/gender-based default avatar - Static fallback images based on user role and gender
	 * 5. Empty string - Triggers Avatar.Fallback to show initials
	 *
	 * IMPORTANT: Google OAuth stores avatars in 'picture' field, not 'avatar_url'
	 * See: src/routes/(public)/auth/callback/+server.ts for avatar saving logic
	 * See: supabase/migrations/061_fix_google_avatar_picture_field.sql for database trigger
	 *
	 * @returns Avatar URL string or empty string for fallback to initials
	 */
	function getAvatarSrc(): string {
		// First try profile avatar_url (saved in database from OAuth login)
		if (profile?.avatar_url) {
			return profile.avatar_url;
		}

		// Then try user metadata - Google uses 'picture' field (OAuth standard)
		if (user?.user_metadata?.picture) {
			return user.user_metadata.picture;
		}

		// Check 'avatar_url' for other OAuth providers
		if (user?.user_metadata?.avatar_url) {
			return user.user_metadata.avatar_url;
		}

		// Use role/gender-based default avatar if profile is available
		// See: src/lib/utils/avatar.ts for implementation
		if (profile) {
			return getAvatarFallback(profile.role, profile.gender);
		}

		// Empty string triggers Avatar.Fallback component to show initials
		return '';
	}
</script>

<header class="border-b border-border bg-background shadow-sm">
	<div class="flex h-16 items-center gap-4 px-4">
		<!-- Hamburger menu - visible only on mobile (lg:hidden) -->
		<div class="lg:hidden">
			<DropdownMenu.Root bind:open={mobileMenuOpen}>
				<DropdownMenu.Trigger
					class="inline-flex h-9 w-9 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
				>
					{#if mobileMenuOpen}
						<X class="h-6 w-6" />
					{:else}
						<Menu class="h-6 w-6" />
					{/if}
					<span class="sr-only">Afficher le menu</span>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-64">
					<DropdownMenu.Label>Navigation</DropdownMenu.Label>
					<DropdownMenu.Separator />
					{#each sidebarItems as item (item.href)}
						<DropdownMenu.Item>
							<a
								href={resolve(item.href)}
								class="flex w-full items-center"
								onclick={closeMobileMenu}
							>
								{#if item.icon}
									<span class="mr-2">{item.icon}</span>
								{/if}
								{item.label}
							</a>
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<!-- Title with Gidouille - links to home -->
		<a href={resolve('/')} class="flex items-center gap-3 transition-opacity hover:opacity-80">
			<img src={gidouille} alt="Gidouille" class="h-10 w-10" />
			<h1 class="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
		</a>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Navigation -->
		<nav class="flex items-center gap-2">
			<!-- Auth section -->
			{#if session}
				<div class="border-l pl-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="relative h-10 w-10 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							<Avatar.Root class="h-10 w-10">
								<Avatar.Image src={getAvatarSrc()} alt={user?.email || 'User'} />
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
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleLogout}>
								<LogOut class="mr-2 h-4 w-4" />
								Déconnexion
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{:else}
				<Button href="/auth/login" size="sm" variant="default">
					<LogIn class="mr-2 h-4 w-4" />
					Connexion
				</Button>
			{/if}

			<!-- Font size controls -->
			<div class="flex items-center gap-1 border-l pl-2">
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
		</nav>
	</div>
</header>
