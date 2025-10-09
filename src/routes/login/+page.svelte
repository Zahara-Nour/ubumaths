<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	async function handleLogin() {
		try {
			loading = true;
			errorMessage = '';

			console.log('[Login] Attempting login for:', email);

			const { data: authData, error } = await data.supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				console.error('[Login] Error:', error.message);
				errorMessage = error.message;
			} else {
				console.log('[Login] Success! User:', authData.user?.email);
				goto('/');
			}
		} catch (err) {
			console.error('[Login] Unexpected error:', err);
			errorMessage = 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="text-center text-3xl font-bold text-gray-900 dark:text-white">
				Sign in to your account
			</h2>
		</div>
		<form class="mt-8 space-y-6" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
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
						bind:value={email}
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
						bind:value={password}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
			</div>

			{#if errorMessage}
				<div class="text-red-600 dark:text-red-400 text-sm">
					{errorMessage}
				</div>
			{/if}

			<div>
				<button
					type="submit"
					disabled={loading}
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Signing in...' : 'Sign in'}
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
