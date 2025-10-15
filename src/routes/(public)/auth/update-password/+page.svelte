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
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';

	// Form action result
	let { form }: { form: ActionData } = $props();

	// Password strength tracking
	let password = $state('');
	let passwordStrength = $derived(calculatePasswordStrength(password));
	let showStrength = $derived(password.length > 0);
</script>

<div class="min-h-screen flex items-center justify-center bg-background px-4">
	<Card.Root class="max-w-md w-full">
		<Card.Header>
			<Card.Title class="text-center text-3xl">Set new password</Card.Title>
			<Card.Description class="text-center">
				Choose a strong password for your account.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="password">New Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={password}
					/>

					{#if showStrength}
						<!-- Password Strength Indicator -->
						<div class="mt-2 space-y-2">
							<!-- Progress bar -->
							<div class="w-full bg-muted rounded-full h-2">
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
							<div class="text-xs space-y-1 text-muted-foreground">
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

				<div class="space-y-2">
					<Label for="confirmPassword">Confirm New Password</Label>
					<Input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						required
					/>
				</div>

				{#if form?.error}
					<Alert.Root variant="destructive">
						<Alert.Description>{form.error}</Alert.Description>
					</Alert.Root>
				{/if}

				<Button type="submit" class="w-full">Update password</Button>

				<div class="text-center text-sm">
					<a href="/auth/login" class="text-primary hover:underline font-medium">Back to login</a>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
