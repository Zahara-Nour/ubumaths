<!--
  Password Update Page

  Allows users to set a new password after clicking a password reset link.
  This page is only accessible after the reset token has been verified.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import {
		calculatePasswordStrength,
		getStrengthBarWidth,
		getStrengthBarColor
	} from '$lib/utils/passwordStrength';

	// Form action result
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
				Set new password
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
				Choose a strong password for your account.
			</p>
		</div>

		<form method="POST" action="?/updatePassword" use:enhance class="mt-8 space-y-6">
			<div class="space-y-4">
				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						New Password
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
						Confirm New Password
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

			<div>
				<button
					type="submit"
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Update password
				</button>
			</div>

			<div class="text-center text-sm">
				<a href="/login" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
					Back to login
				</a>
			</div>
		</form>
	</div>
</div>
