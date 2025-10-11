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
	import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
	import { Menu, X, Home, LogIn, LogOut, LayoutDashboard, Sun, Moon, Minus, Plus } from 'lucide-svelte';

	// Props received from parent layout (+layout.svelte)
	// These are automatically reactive in Svelte 5
	let {
		title = 'UbuMaths',
		session = null,
		user = null,
		supabase,
		sidebarItems = [
			{ label: 'Home', href: '/', icon: '🏠' },
			{ label: 'Exercises', href: '/exercises', icon: '📝' },
			{ label: 'Practice', href: '/practice', icon: '✏️' },
			{ label: 'Resources', href: '/resources', icon: '📚' }
		]
	}: {
		title?: string;
		session?: Session | null; // Verified session from server
		user?: User | null; // Verified user from server
		supabase?: SupabaseClient; // Client for making auth requests
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
	 * Get user initials from email for avatar fallback
	 * @param email - User's email address
	 * @returns First letter of email, uppercased
	 */
	function getUserInitials(email: string | undefined): string {
		if (!email) return '?';
		return email.charAt(0).toUpperCase();
	}

	/**
	 * Get user avatar URL from Supabase user metadata
	 * @param user - Supabase user object
	 * @returns Avatar URL if set, undefined otherwise
	 */
	function getAvatarUrl(user: User | null): string | undefined {
		return user?.user_metadata?.avatar_url;
	}
</script>

<header class="border-b bg-background">
	<div class="flex h-16 items-center px-4 gap-4">
		<!-- Hamburger menu - visible only on mobile (lg:hidden) -->
		<div class="lg:hidden">
			<DropdownMenu.Root bind:open={mobileMenuOpen}>
				<DropdownMenu.Trigger
					class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
				>
					{#if mobileMenuOpen}
						<X class="h-6 w-6" />
					{:else}
						<Menu class="h-6 w-6" />
					{/if}
					<span class="sr-only">Toggle menu</span>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-64">
					<DropdownMenu.Label>Navigation</DropdownMenu.Label>
					<DropdownMenu.Separator />
					{#each sidebarItems as item}
						<DropdownMenu.Item>
							<a href={item.href} class="flex items-center w-full" onclick={closeMobileMenu}>
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

		<!-- Title -->
		<h1 class="text-2xl font-bold">{title}</h1>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Navigation -->
		<nav class="flex items-center gap-2">
			<!-- Home link -->
			<Button href="/" variant="ghost" size="sm">
				<Home class="h-4 w-4 mr-2" />
				Home
			</Button>

			<!-- Auth section -->
			{#if session}
				<div class="border-l pl-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="cursor-pointer relative h-10 w-10 rounded-full hover:ring-2 hover:ring-ring transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Avatar.Root class="h-10 w-10">
								<Avatar.Image src={getAvatarUrl(user)} alt={user?.email || 'User'} />
								<Avatar.Fallback>{getUserInitials(user?.email)}</Avatar.Fallback>
							</Avatar.Root>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-48">
							<DropdownMenu.Label>{user?.email}</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item>
								<a href="/dashboard" class="flex items-center w-full">
									<LayoutDashboard class="mr-2 h-4 w-4" />
									Dashboard
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleLogout}>
								<LogOut class="mr-2 h-4 w-4" />
								Logout
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{:else}
				<Button href="/login" size="sm">
					<LogIn class="h-4 w-4 mr-2" />
					Login
				</Button>
			{/if}

			<!-- Font size controls -->
			<div class="flex items-center gap-1 border-l pl-2">
				<Button
					onclick={() => fontSize.decrease()}
					disabled={!fontSize.canDecrease}
					variant="ghost"
					size="icon-sm"
					aria-label="Decrease font size"
					title="Decrease font size"
				>
					<Minus class="h-5 w-5" />
				</Button>
				<span class="text-sm font-medium">A</span>
				<Button
					onclick={() => fontSize.increase()}
					disabled={!fontSize.canIncrease}
					variant="ghost"
					size="icon-sm"
					aria-label="Increase font size"
					title="Increase font size"
				>
					<Plus class="h-5 w-5" />
				</Button>
			</div>

			<!-- Dark mode toggle -->
			<Button
				onclick={() => theme.toggle()}
				variant="ghost"
				size="icon-sm"
				aria-label="Toggle dark mode"
			>
				{#if theme.dark}
					<Sun class="h-6 w-6" />
				{:else}
					<Moon class="h-6 w-6" />
				{/if}
			</Button>
		</nav>
	</div>
</header>
