<!--
  Signup Page

  AUTHENTICATION APPROACH:
  This page uses SvelteKit form actions (server-side) instead of client-side
  JavaScript to ensure cookies are properly set on the server.

  WHY NOT CLIENT-SIDE?
  - Client Supabase uses localStorage
  - Server Supabase uses cookies
  - If we signup on client, server doesn't know → UI doesn't update

  INSTEAD:
  - Form POSTs to server action (?/signup)
  - Server calls signUp() → sets cookies (if auto-confirm enabled)
  - Server redirects on success OR returns success message
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
	import {
		calculatePasswordStrength,
		getStrengthBarWidth,
		getStrengthBarColor
	} from '$lib/utils/passwordStrength';

	// Form action result (contains error/success if signup completed)
	let { form }: { form: ActionData } = $props();

	// Password strength tracking
	let password = $state('');
	let passwordStrength = $derived(calculatePasswordStrength(password));
	let showStrength = $derived(password.length > 0);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="text-center text-3xl font-bold text-gray-900 dark:text-white">
				Create your account
			</h2>
		</div>
		<form method="POST" action="?/signup" use:enhance class="mt-8 space-y-6">
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
						autocomplete="new-password"
						required
						bind:value={password}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					/>

					{#if showStrength}
						<!-- Password Strength Indicator -->
						<div class="mt-2 space-y-2">
							<!-- Progress bar -->
							<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
								<div
									class="{getStrengthBarColor(
										passwordStrength.strength
									)} h-2 rounded-full transition-all duration-300"
									style="width: {getStrengthBarWidth(passwordStrength.score)}"
								></div>
							</div>

							<!-- Feedback text -->
							<p class="text-xs {passwordStrength.color}">
								{passwordStrength.feedback}
							</p>

							<!-- Requirements checklist -->
							<div class="text-xs space-y-1 text-gray-600 dark:text-gray-400">
								<div class="flex items-center gap-2">
									<span class={passwordStrength.requirements.minLength ? 'text-green-600' : ''}>
										{passwordStrength.requirements.minLength ? '✓' : '○'} At least 8 characters
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span
										class={passwordStrength.requirements.hasUpperCase &&
										passwordStrength.requirements.hasLowerCase
											? 'text-green-600'
											: ''}
									>
										{passwordStrength.requirements.hasUpperCase &&
										passwordStrength.requirements.hasLowerCase
											? '✓'
											: '○'} Mixed case letters
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span class={passwordStrength.requirements.hasNumber ? 'text-green-600' : ''}>
										{passwordStrength.requirements.hasNumber ? '✓' : '○'} Numbers
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span
										class={passwordStrength.requirements.hasSpecialChar ? 'text-green-600' : ''}
									>
										{passwordStrength.requirements.hasSpecialChar ? '✓' : '○'} Special characters
									</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
				<div>
					<label
						for="confirmPassword"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
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

			{#if form?.success && form?.message}
				<div class="text-green-600 dark:text-green-400 text-sm">
					{form.message}
				</div>
			{/if}

			<div>
				<button
					type="submit"
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Sign up
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
