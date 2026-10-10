<!--
  Password Update Page

  Allows users to set a new password after clicking a password reset link.
  This page is only accessible after the reset token has been verified.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';
	import {
		calculatePasswordStrength,
		getStrengthBarWidth,
		getStrengthBarColor
	} from '$lib/utils/passwordStrength';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import MyPasswordInput from '$lib/components/MyPasswordInput.svelte';

	// Form action result
	let { form }: { form: ActionData } = $props();

	// Password strength tracking
	let password = $state('');
	let passwordStrength = $derived(calculatePasswordStrength(password));
	let showStrength = $derived(password.length > 0);
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<Card.Title class="text-center text-3xl"
				><h1 class="text-3xl! leading-none!">Nouveau mot de passe</h1></Card.Title
			>
			<Card.Description class="text-center">
				Choisis un mot de passe solide pour ton compte.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="password">Nouveau mot de passe</Label>
					<MyPasswordInput
						id="password"
						name="password"
						autocomplete="new-password"
						required
						bind:value={password}
					/>

					{#if showStrength}
						<!-- Password Strength Indicator -->
						<div class="mt-2 space-y-2">
							<!-- Progress bar -->
							<div class="h-2 w-full rounded-full bg-muted">
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
							<div class="space-y-1 text-xs text-muted-foreground">
								<div class="flex items-center gap-2">
									<span class={passwordStrength.requirements.minLength ? 'text-green-600' : ''}>
										{passwordStrength.requirements.minLength ? '✓' : '○'} Au moins 8 caractères
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
											: '○'} Majuscules et minuscules
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span class={passwordStrength.requirements.hasNumber ? 'text-green-600' : ''}>
										{passwordStrength.requirements.hasNumber ? '✓' : '○'} Des chiffres
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span
										class={passwordStrength.requirements.hasSpecialChar ? 'text-green-600' : ''}
									>
										{passwordStrength.requirements.hasSpecialChar ? '✓' : '○'} Des caractères spéciaux
									</span>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="confirmPassword">Confirme le nouveau mot de passe</Label>
					<MyPasswordInput
						id="confirmPassword"
						name="confirmPassword"
						autocomplete="new-password"
						required
					/>
				</div>

				{#if form?.error}
					<Alert.Root variant="destructive">
						<Alert.Description>{form.error}</Alert.Description>
					</Alert.Root>
				{/if}

				<Button type="submit" class="w-full">Changer le mot de passe</Button>

				<div class="text-center text-sm">
					<a href={resolve('/auth/login')} class="font-medium text-primary hover:underline"
						>Retour à la connexion</a
					>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
