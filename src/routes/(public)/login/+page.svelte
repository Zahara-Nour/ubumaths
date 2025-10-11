<!--
  Login Page

  AUTHENTICATION APPROACH:
  This page supports two authentication methods:
  1. Google OAuth (default) - One-click sign-in with Google workspace accounts
  2. Email/Password - Traditional authentication method

  Both methods use SvelteKit form actions (server-side) to ensure cookies are
  properly set on the server.

  WHY NOT CLIENT-SIDE?
  - Client Supabase uses localStorage
  - Server Supabase uses cookies
  - If we login on client, server doesn't know → UI doesn't update

  INSTEAD:
  - Form POSTs to server action (?/googleSignIn or ?/login)
  - Server initiates OAuth flow or calls signInWithPassword() → sets cookies
  - Server redirects on success
  - Browser detects auth change → UI updates

  PROGRESSIVE ENHANCEMENT:
  The use:enhance directive provides:
  - Client-side validation before submit
  - Loading states during submission
  - Prevents full page reload
  - Falls back to standard form POST if JS disabled
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { ActionData } from './$types';

	// Form action result (contains error if login failed)
	let { form }: { form: ActionData } = $props();

	// Active authentication method tab
	let activeTab = $state<'google' | 'email'>('google');

	// Extract error from URL query params (for OAuth callback errors)
	let urlError = $derived($page.url.searchParams.get('error'));
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="text-center text-3xl font-bold text-gray-900 dark:text-white">
				Sign in to your account
			</h2>
		</div>

		<!-- Tab Switcher -->
		<div class="flex space-x-1 bg-muted p-1 rounded-lg">
			<button
				type="button"
				onclick={() => (activeTab = 'google')}
				class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
				style="background-color: {activeTab === 'google'
					? '#2563eb'
					: 'transparent'}; color: {activeTab === 'google'
					? 'white'
					: '#9ca3af'}; box-shadow: {activeTab === 'google' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};"
			>
				Google Sign In
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'email')}
				class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
				style="background-color: {activeTab === 'email'
					? '#2563eb'
					: 'transparent'}; color: {activeTab === 'email'
					? 'white'
					: '#9ca3af'}; box-shadow: {activeTab === 'email' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};"
			>
				Email & Password
			</button>
		</div>

		<!-- Display errors from OAuth callback or form actions -->
		{#if urlError}
			<div class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
				{urlError}
			</div>
		{/if}

		<!-- Google Sign In Tab -->
		{#if activeTab === 'google'}
			<form method="POST" action="?/googleSignIn" use:enhance class="space-y-6">
				<div class="space-y-4">
					<p class="text-sm text-gray-600 dark:text-gray-400 text-center">
						Sign in with your Voltaire Doha Google account (@voltairedoha.com)
					</p>

					<button
						type="submit"
						class="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Sign in with Google
					</button>
				</div>

				{#if form?.error && !urlError}
					<div class="text-red-600 dark:text-red-400 text-sm text-center">
						{form.error}
					</div>
				{/if}
			</form>
		{/if}

		<!-- Email & Password Tab -->
		{#if activeTab === 'email'}
			<form method="POST" action="?/login" use:enhance class="space-y-6">
				<div class="space-y-4">
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							value={form?.email ?? ''}
							class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<div>
						<div class="flex items-center justify-between">
							<label
								for="password"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								Password
							</label>
							<a
								href="/auth/reset-password"
								class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
							>
								Forgot password?
							</a>
						</div>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				{#if form?.error && !urlError}
					<div class="text-red-600 dark:text-red-400 text-sm">
						{form.error}
					</div>
				{/if}

				<div>
					<button
						type="submit"
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Sign in
					</button>
				</div>

				<!-- Sign up link - only show in email/password tab -->
				<div class="text-center text-sm">
					<span class="text-gray-600 dark:text-gray-400">Don't have an account?</span>
					<a href="/signup" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
						Sign up
					</a>
				</div>
			</form>
		{/if}
	</div>
</div>
