<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function handleSignup() {
		try {
			loading = true;
			errorMessage = '';
			successMessage = '';

			if (password !== confirmPassword) {
				errorMessage = 'Passwords do not match';
				return;
			}

			if (password.length < 6) {
				errorMessage = 'Password must be at least 6 characters';
				return;
			}

			console.log('[Signup] Attempting signup for:', email);

			const { data: authData, error } = await data.supabase.auth.signUp({
				email,
				password
			});

			if (error) {
				console.error('[Signup] Error:', error.message);
				errorMessage = error.message;
			} else {
				console.log('[Signup] Success! User:', authData.user?.email);
				console.log('[Signup] Session:', authData.session ? 'Created' : 'Email confirmation required');
				successMessage = 'Account created! Check your email to confirm your account.';
				setTimeout(() => goto('/login'), 2000);
			}
		} catch (err) {
			console.error('[Signup] Unexpected error:', err);
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
				Create your account
			</h2>
		</div>
		<form class="mt-8 space-y-6" onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
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
						autocomplete="new-password"
						required
						bind:value={password}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div>
					<label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Confirm Password
					</label>
					<input
						id="confirm-password"
						name="confirm-password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
			</div>

			{#if errorMessage}
				<div class="text-red-600 dark:text-red-400 text-sm">
					{errorMessage}
				</div>
			{/if}

			{#if successMessage}
				<div class="text-green-600 dark:text-green-400 text-sm">
					{successMessage}
				</div>
			{/if}

			<div>
				<button
					type="submit"
					disabled={loading}
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Creating account...' : 'Sign up'}
				</button>
			</div>

			<div class="text-center text-sm">
				<span class="text-gray-600 dark:text-gray-400">Already have an account?</span>
				<a href="/login" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
					Sign in
				</a>
			</div>
		</form>
	</div>
</div>
