<!--
  « J'inscris mon enfant » (/auth/register/parent)

  Le parent crée le compte d'un enfant sans adresse : l'enfant se connectera avec un
  identifiant (`noelie42`), affiché à la fin et envoyé au parent avec le lien de
  consentement. L'adresse du parent n'est qu'un contact.
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
	import MyPasswordInput from '$lib/components/MyPasswordInput.svelte';
	import { CircleCheck, Loader2 } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();

	let isLoading = $state(false);
	let acceptTerms = $state(false);

	function fieldError(field: string): string | undefined {
		return form && 'errors' in form ? form.errors?.[field]?.[0] : undefined;
	}

	function echo(field: 'childFirstname' | 'parentEmail' | 'classCode'): string {
		return form && field in form ? String((form as Record<string, unknown>)[field] ?? '') : '';
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-8">
	<Card.Root class="w-full max-w-md">
		{#if form && 'success' in form && form.success}
			<Card.Header>
				<div class="flex flex-col items-center gap-3 text-center">
					<CircleCheck class="h-12 w-12 text-primary" />
					<Card.Title class="text-2xl"
						><h1 class="text-2xl! leading-none!">Inscription réussie</h1></Card.Title
					>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4 text-center">
				<div class="rounded-lg border bg-muted/40 p-4">
					<p class="text-sm text-muted-foreground">Identifiant de connexion — notez-le :</p>
					<p class="mt-1 font-mono text-3xl font-bold tracking-wide">{form.loginId}</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Avec le mot de passe que vous venez de choisir.
					</p>
				</div>
				{#if form.emailSent}
					<p class="text-sm text-muted-foreground">
						Un courriel vient d'être envoyé à <span class="font-medium">{form.parentEmail}</span>.
						{form.consentRequired
							? 'Cliquez sur le lien qu’il contient pour confirmer votre adresse et donner votre accord.'
							: 'Cliquez sur le lien qu’il contient pour confirmer votre adresse.'}
					</p>
				{:else}
					<Alert.Root>
						<Alert.Description>
							Le courriel n'a pas pu partir. Le compte existe : le professeur pourra vous renvoyer
							le lien.
						</Alert.Description>
					</Alert.Root>
				{/if}
			</Card.Content>
			<Card.Footer class="justify-center">
				<Button variant="outline" href={resolve('/auth/login')}>Aller à la connexion</Button>
			</Card.Footer>
		{:else}
			<Card.Header>
				<Card.Title class="text-center text-3xl"
					><h1 class="text-3xl! leading-none!">J'inscris mon enfant</h1></Card.Title
				>
				<Card.Description class="text-center">
					Pour un enfant sans adresse email. Il se connectera avec un identifiant.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-6">
				{#if form && 'error' in form && form.error}
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
					<div class="space-y-2">
						<Label for="classCode">Code de classe</Label>
						<Input
							id="classCode"
							name="classCode"
							required
							placeholder="Ex : 8B237F"
							value={echo('classCode')}
						/>
						{#if fieldError('classCode')}
							<p class="text-sm text-destructive">{fieldError('classCode')}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="childFirstname">Prénom de l'enfant</Label>
						<Input
							id="childFirstname"
							name="childFirstname"
							required
							autocomplete="off"
							value={echo('childFirstname')}
						/>
						{#if fieldError('childFirstname')}
							<p class="text-sm text-destructive">{fieldError('childFirstname')}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="password">Mot de passe de l'enfant</Label>
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

					<div class="space-y-2">
						<Label for="parentEmail">Votre adresse email</Label>
						<Input
							id="parentEmail"
							name="parentEmail"
							type="email"
							autocomplete="email"
							required
							value={echo('parentEmail')}
						/>
						<p class="text-xs text-muted-foreground">
							Vous y recevrez l'identifiant et un lien pour donner votre accord.
						</p>
						{#if fieldError('parentEmail')}
							<p class="text-sm text-destructive">{fieldError('parentEmail')}</p>
						{/if}
					</div>

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
						Inscrire mon enfant
					</Button>
				</form>

				<p class="text-center text-sm text-muted-foreground">
					Votre enfant a sa propre adresse ?
					<a href={resolve('/auth/register')} class="text-primary hover:underline"
						>Il s'inscrit lui-même</a
					>
				</p>
			</Card.Content>
		{/if}
	</Card.Root>
</div>
