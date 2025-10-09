<!--
  Login Page

  AUTHENTICATION APPROACH:
  This page uses SvelteKit form actions (server-side) instead of client-side
  JavaScript to ensure cookies are properly set on the server.

  WHY NOT CLIENT-SIDE?
  - Client Supabase uses localStorage
  - Server Supabase uses cookies
  - If we login on client, server doesn't know → UI doesn't update

  INSTEAD:
  - Form POSTs to server action (?/login)
  - Server calls signInWithPassword() → sets cookies
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
	import type { ActionData } from './$types';

	// Form action result (contains error if login failed)
	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="text-center text-3xl font-bold text-gray-900 dark:text-white">
				Sign in to your account
			</h2>
		</div>
		<form method="POST" action="?/login" use:enhance class="mt-8 space-y-6">
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
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Password
					</label>
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

			{#if form?.error}
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

			<div class="text-center text-sm">
				<span class="text-gray-600 dark:text-gray-400">Don't have an account?</span>
				<a href="/signup" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
					Sign up
				</a>
			</div>
		</form>
	</div>
</div>
