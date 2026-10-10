<!--
  Password Reset Request Page

  Allows users to request a password reset link via email.
  Uses server-side form action for security.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';

	// Form action result
	let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<Card.Title class="text-center text-3xl"
				><h1 class="text-3xl! leading-none!">Mot de passe oublié</h1></Card.Title
			>
			<Card.Description class="text-center">
				Indique ton adresse email : tu recevras un lien pour choisir un nouveau mot de passe.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<form method="POST" action="?/resetPassword" use:enhance class="space-y-4">
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

				<Button type="submit" class="w-full">Envoyer le lien</Button>

				<div class="text-center text-sm">
					<a href={resolve('/auth/login')} class="font-medium text-primary hover:underline"
						>Retour à la connexion</a
					>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
