<!--
  Password Reset Request Page

  Allows users to request a password reset link via email.
  Uses server-side form action for security.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	// Form action result
	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="text-center text-3xl font-bold text-gray-900 dark:text-white">
				Reset your password
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
				Enter your email address and we'll send you a link to reset your password.
			</p>
		</div>

		<form method="POST" action="?/resetPassword" use:enhance class="mt-8 space-y-6">
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

			{#if form?.error}
				<div class="text-red-600 dark:text-red-400 text-sm">
					{form.error}
				</div>
			{/if}

			{#if form?.success && form?.message}
				<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
					<p class="text-green-600 dark:text-green-400 text-sm">
						{form.message}
					</p>
				</div>
			{/if}

			<div>
				<button
					type="submit"
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Send reset link
				</button>
			</div>

			<div class="text-center text-sm space-y-2">
				<div>
					<a href="/login" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
						Back to login
					</a>
				</div>
				<div>
					<span class="text-gray-600 dark:text-gray-400">Don't have an account?</span>
					<a href="/signup" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
						Sign up
					</a>
				</div>
			</div>
		</form>
	</div>
</div>
