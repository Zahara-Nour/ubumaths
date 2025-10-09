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
	import { AppBar, Avatar, Popover } from '@skeletonlabs/skeleton-svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import type { Session, User, SupabaseClient } from '@supabase/supabase-js';

	// Props received from parent layout (+layout.svelte)
	// These are automatically reactive in Svelte 5
	let {
		title = 'UbuMaths',
		session = null,
		user = null,
		supabase
	}: {
		title?: string;
		session?: Session | null; // Verified session from server
		user?: User | null; // Verified user from server
		supabase?: SupabaseClient; // Client for making auth requests
	} = $props();

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

<AppBar>
	{#snippet lead()}
		<h1 class="text-2xl font-bold">{title}</h1>
	{/snippet}

	{#snippet trail()}
		<nav class="flex items-center gap-2">
			<!-- Home link -->
			<a href="/" class="btn btn-sm variant-ghost-surface">Home</a>

			<!-- Auth buttons -->
			{#if session}
				<div class="border-l border-surface-400-500 pl-2">
					<Popover closeOnInteractOutside={true}>
						{#snippet trigger()}
							<Avatar
								src={getAvatarUrl(user)}
								name={user?.email || 'User'}
								size="w-10 h-10"
								classes="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
							>
								{getUserInitials(user?.email)}
							</Avatar>
						{/snippet}
						{#snippet content()}
							<div class="bg-surface-100-900 rounded-lg shadow-xl border border-surface-300-700 min-w-48">
								<div class="p-3 border-b border-surface-300-700">
									<p class="text-sm font-medium">{user?.email}</p>
								</div>
								<div class="p-2">
									<a
										href="/dashboard"
										class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-200-800 rounded transition-colors"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
											/>
										</svg>
										Dashboard
									</a>
									<button
										onclick={handleLogout}
										class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-200-800 rounded transition-colors text-left"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
											/>
										</svg>
										Logout
									</button>
								</div>
							</div>
						{/snippet}
					</Popover>
				</div>
			{:else}
				<a href="/login" class="btn btn-sm variant-filled-primary flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
						/>
					</svg>
					Login
				</a>
			{/if}

			<!-- Font size controls -->
			<div class="flex items-center gap-1 border-l border-surface-400-500 pl-2">
				<button
					onclick={() => fontSize.decrease()}
					disabled={!fontSize.canDecrease}
					class="btn-icon btn-icon-sm variant-filled-surface"
					aria-label="Decrease font size"
					title="Decrease font size"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
					</svg>
				</button>
				<span class="text-sm font-medium">A</span>
				<button
					onclick={() => fontSize.increase()}
					disabled={!fontSize.canIncrease}
					class="btn-icon btn-icon-sm variant-filled-surface"
					aria-label="Increase font size"
					title="Increase font size"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
			</div>

			<!-- Dark mode toggle -->
			<button
				onclick={() => theme.toggle()}
				class="btn-icon btn-icon-sm variant-filled-surface"
				aria-label="Toggle dark mode"
			>
				{#if theme.dark}
					<!-- Sun icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				{:else}
					<!-- Moon icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
						/>
					</svg>
				{/if}
			</button>
		</nav>
	{/snippet}
</AppBar>
