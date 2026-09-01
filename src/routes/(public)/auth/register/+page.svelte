<!--
  Student self-registration page (/auth/register)

  Controlled by a class join code distributed by the teacher: only code holders can
  register, and they are auto-enrolled into that class (server-side). CGU + privacy
  acceptance is mandatory (RGPD). On success, a neutral "check your email" state is shown
  (anti-enumeration: never reveals whether an email already exists).
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
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Loader2, MailCheck } from '@lucide/svelte';
	import MyPasswordInput from '$lib/components/MyPasswordInput.svelte';

	let { form }: { form: ActionData } = $props();

	let isLoading = $state(false);
	let acceptTerms = $state(false);

	// Field-level error helper (validateFormData returns Record<string, string[]>).
	function fieldError(field: string): string | undefined {
		return form?.errors?.[field]?.[0];
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-8">
	<Card.Root class="w-full max-w-md">
		{#if form?.success}
			<!-- Neutral success state (check your email) -->
			<Card.Header>
				<div class="flex flex-col items-center gap-3 text-center">
					<MailCheck class="h-12 w-12 text-primary" />
					<Card.Title class="text-2xl">Vérifie ta boîte mail</Card.Title>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4 text-center">
				<p class="text-sm text-muted-foreground">
					Si un compte peut être créé, un email de confirmation vient d'être envoyé
					{#if form.email}à <span class="font-medium">{form.email}</span>{/if}. Clique sur le lien
					pour activer ton compte.
				</p>
				<p class="text-sm text-muted-foreground">
					Pense à vérifier tes spams. Le lien peut mettre quelques minutes à arriver.
				</p>
			</Card.Content>
			<Card.Footer class="justify-center">
				<Button variant="outline" href={resolve('/auth/login')}>Retour à la connexion</Button>
			</Card.Footer>
		{:else}
			<Card.Header>
				<Card.Title class="text-center text-3xl">Créer ton compte élève</Card.Title>
				<Card.Description class="text-center">
					Utilise le code de classe donné par ton professeur.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-6">
				<!-- Top-level errors (rate limit, server) -->
				{#if form?.error}
					<Alert.Root variant="destructive">
						<Alert.Description>{form.error}</Alert.Description>
					</Alert.Root>
				{/if}

				<form
					method="POST"
					action="?/register"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							await update();
							isLoading = false;
						};
					}}
					class="space-y-4"
				>
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="firstname">Prénom</Label>
							<Input id="firstname" name="firstname" required value={form?.firstname ?? ''} />
							{#if fieldError('firstname')}
								<p class="text-sm text-destructive">{fieldError('firstname')}</p>
							{/if}
						</div>
						<div class="space-y-2">
							<Label for="lastname">Nom</Label>
							<Input id="lastname" name="lastname" required value={form?.lastname ?? ''} />
							{#if fieldError('lastname')}
								<p class="text-sm text-destructive">{fieldError('lastname')}</p>
							{/if}
						</div>
					</div>

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
						{#if fieldError('email')}
							<p class="text-sm text-destructive">{fieldError('email')}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="classCode">Code de classe</Label>
						<Input
							id="classCode"
							name="classCode"
							required
							placeholder="Ex : 8B237F"
							value={form?.classCode ?? ''}
						/>
						{#if fieldError('classCode')}
							<p class="text-sm text-destructive">{fieldError('classCode')}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="password">Mot de passe</Label>
						<MyPasswordInput id="password" name="password" autocomplete="new-password" required />
						{#if fieldError('password')}
							<p class="text-sm text-destructive">{fieldError('password')}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword">Confirmer le mot de passe</Label>
						<MyPasswordInput
							id="confirmPassword"
							name="confirmPassword"
							autocomplete="new-password"
							required
						/>
						{#if fieldError('confirmPassword')}
							<p class="text-sm text-destructive">{fieldError('confirmPassword')}</p>
						{/if}
					</div>

					<!-- CGU / privacy acceptance (mandatory). Hidden input mirrors the state so it
					     is submitted deterministically. -->
					<div class="space-y-1">
						<input type="hidden" name="acceptTerms" value={acceptTerms ? 'true' : 'false'} />
						<MyCheckbox bind:checked={acceptTerms}>
							J'accepte les
							<a
								href={resolve('/legal/cgu')}
								target="_blank"
								rel="noopener"
								class="text-primary hover:underline">conditions générales d'utilisation</a
							>
							et la
							<a
								href={resolve('/legal/confidentialite')}
								target="_blank"
								rel="noopener"
								class="text-primary hover:underline">politique de confidentialité</a
							>.
						</MyCheckbox>
						{#if fieldError('acceptTerms')}
							<p class="text-sm text-destructive">{fieldError('acceptTerms')}</p>
						{/if}
					</div>

					<Button
						type="submit"
						variant="default"
						class="w-full"
						disabled={isLoading || !acceptTerms}
					>
						{#if isLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Créer mon compte
					</Button>
				</form>

				<p class="text-center text-sm text-muted-foreground">
					Déjà un compte ?
					<a href={resolve('/auth/login')} class="text-primary hover:underline">Se connecter</a>
				</p>
			</Card.Content>
		{/if}
	</Card.Root>
</div>
