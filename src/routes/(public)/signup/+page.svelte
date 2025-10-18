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
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';

	// Form action result (contains error/success if signup completed)
	let { form }: { form: ActionData } = $props();

	// Password strength tracking
	let password = $state('');
	let passwordStrength = $derived(calculatePasswordStrength(password));
	let showStrength = $derived(password.length > 0);
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<Card.Title class="text-center text-3xl">Créer votre compte</Card.Title>
		</Card.Header>

		<Card.Content>
			<form method="POST" action="?/signup" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Adresse email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={form?.email ?? ''}
					/>
				</div>

				<div class="space-y-2">
					<Label for="password">Mot de passe</Label>
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
											: '○'} Lettres majuscules et minuscules
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span class={passwordStrength.requirements.hasNumber ? 'text-green-600' : ''}>
										{passwordStrength.requirements.hasNumber ? '✓' : '○'} Chiffres
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span
										class={passwordStrength.requirements.hasSpecialChar ? 'text-green-600' : ''}
									>
										{passwordStrength.requirements.hasSpecialChar ? '✓' : '○'} Caractères spéciaux
									</span>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="confirmPassword">Confirmer le mot de passe</Label>
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

				{#if form?.success && form?.message}
					<Alert.Root
						class="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
					>
						<Alert.Description class="text-green-600 dark:text-green-400">
							{form.message}
						</Alert.Description>
					</Alert.Root>
				{/if}

				<Button type="submit" class="w-full">S'inscrire</Button>

				<p class="text-center text-sm text-muted-foreground">
					Vous avez déjà un compte ?
					<a href="/auth/login" class="font-medium text-primary hover:underline">Se connecter</a>
				</p>
			</form>
		</Card.Content>
	</Card.Root>
</div>
