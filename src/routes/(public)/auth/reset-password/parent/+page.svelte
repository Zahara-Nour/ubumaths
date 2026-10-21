<!--
  Page du lien du parent : nouveau mot de passe de l'enfant (PR 3)

  Le parent choisit le mot de passe sans être connecté au compte de l'enfant ; à la fin, il
  lit l'identifiant à transmettre. Vouvoiement : la page s'adresse au parent.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import MyPasswordInput from '$lib/components/MyPasswordInput.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tokenHash = $derived(form && 'tokenHash' in form ? form.tokenHash : data.tokenHash);
	const done = $derived(form && 'success' in form ? form : null);
	const expired = $derived(!tokenHash || (form && 'expired' in form && form.expired));
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<Card.Title class="text-center text-3xl"
				><h1 class="text-3xl! leading-none!">Nouveau mot de passe</h1></Card.Title
			>
			{#if !done && !expired}
				<Card.Description class="text-center">
					Choisissez le nouveau mot de passe de votre enfant.
				</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-4">
			{#if done}
				<Alert.Root class="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
					<Alert.Description class="text-green-700 dark:text-green-400">
						C'est fait : {done.firstname || 'votre enfant'} peut se connecter avec l'identifiant
						<strong>{done.loginId}</strong> et ce nouveau mot de passe.
					</Alert.Description>
				</Alert.Root>
				<div class="text-center text-sm">
					<a href={resolve('/auth/login')} class="font-medium text-primary hover:underline"
						>Page de connexion</a
					>
				</div>
			{:else if expired}
				<Alert.Root variant="destructive">
					<Alert.Description>
						{form?.error ??
							'Ce lien est incomplet. Ouvrez le lien du courriel en entier, ou refaites une demande.'}
					</Alert.Description>
				</Alert.Root>
				<div class="text-center text-sm">
					<a href={resolve('/auth/reset-password')} class="font-medium text-primary hover:underline"
						>Mot de passe oublié</a
					>
				</div>
			{:else}
				<form method="POST" action="?/setPassword" use:enhance class="space-y-4">
					<input type="hidden" name="tokenHash" value={tokenHash} />

					<div class="space-y-2">
						<Label for="password">Nouveau mot de passe</Label>
						<MyPasswordInput id="password" name="password" autocomplete="new-password" required />
						<p class="text-xs text-muted-foreground">
							Au moins 8 caractères, avec trois sortes parmi : majuscules, minuscules, chiffres,
							symboles.
						</p>
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword">Confirmez le mot de passe</Label>
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

					<Button type="submit" class="w-full">Enregistrer le mot de passe</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
