<!--
  Invitation de cours particulier — page du parent (/auth/register/invitation/[token])

  Le parent crée l'espace de son enfant : prénom déjà écrit (non modifiable), mot de passe
  (deux fois), CGU, consentement → identifiant affiché, et redit par courriel.
  Le jeton est dans l'adresse : aucun referer ne part de cette page (N3, audit de la PR 2).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Alert from '#lib/components/ui/alert/index.ts';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import MyPasswordInput from '#lib/components/MyPasswordInput.svelte';
	import { CircleCheck, CircleAlert, Loader2 } from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isLoading = $state(false);
	let acceptTerms = $state(false);
	let consent = $state(false);

	const invitation = $derived(data.invitation);
	const linkInvalid = $derived(!invitation || (form !== null && 'invalid' in form));
	const succeeded = $derived(form !== null && 'success' in form && form.success === true);

	function fieldError(field: string): string | undefined {
		return form && 'errors' in form ? form.errors?.[field]?.[0] : undefined;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'Europe/Paris'
		});
	}
</script>

<svelte:head>
	<title>Créer l'espace de votre enfant — Chiphre</title>
	<meta name="referrer" content="no-referrer" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-8">
	<Card.Root class="w-full max-w-md">
		{#if form && 'success' in form && succeeded}
			<Card.Header>
				<div class="flex flex-col items-center gap-3 text-center">
					<CircleCheck class="h-12 w-12 text-primary" />
					<Card.Title class="text-2xl"
						><h1 class="text-2xl! leading-none!">
							L'espace de {form.childFirstname} est prêt
						</h1></Card.Title
					>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4 text-center">
				<div class="rounded-lg border bg-muted/40 p-4">
					<p class="text-sm text-muted-foreground">Identifiant de connexion — notez-le&nbsp;:</p>
					<p class="mt-1 font-mono text-3xl font-bold tracking-wide">{form.loginId}</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Avec le mot de passe que vous venez de choisir.
					</p>
				</div>
				<p class="text-sm text-muted-foreground">
					Pour se connecter : <span class="font-medium">chiph.re</span>, « Se connecter », puis
					l'identifiant et le mot de passe.
				</p>
				{#if form.emailSent}
					<p class="text-sm text-muted-foreground">
						Un courriel vient de vous redire l'identifiant et l'adresse de connexion.
					</p>
				{:else}
					<Alert.Root>
						<Alert.Description>
							Le courriel récapitulatif n'a pas pu partir : notez bien l'identifiant ci-dessus.
						</Alert.Description>
					</Alert.Root>
				{/if}
			</Card.Content>
			<Card.Footer class="justify-center">
				<Button variant="outline" href={resolve('auth/login')}>Aller à la connexion</Button>
			</Card.Footer>
		{:else if linkInvalid}
			<Card.Header>
				<div class="flex flex-col items-center gap-3 text-center">
					<CircleAlert class="h-12 w-12 text-muted-foreground" />
					<Card.Title class="text-2xl"
						><h1 class="text-2xl! leading-none!">Ce lien n'est plus valable</h1></Card.Title
					>
				</div>
			</Card.Header>
			<Card.Content class="space-y-3 text-center text-sm text-muted-foreground">
				{#if data.loadError}
					<p>Une erreur est survenue. Rechargez la page dans un instant.</p>
				{:else}
					<p>Il a peut-être déjà servi, expiré ou été annulé.</p>
					<p>Demandez-en un nouveau à votre professeur.</p>
				{/if}
			</Card.Content>
		{:else if invitation}
			<Card.Header>
				<Card.Title class="text-center text-3xl"
					><h1 class="text-3xl! leading-none!">
						Créer l'espace de {invitation.firstname}
					</h1></Card.Title
				>
				<Card.Description class="text-center">
					Cours particuliers · {invitation.schoolName} · {invitation.gradeLabel}
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
					action="?/create"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							// Les mots de passe ne restent pas dans les champs après un refus.
							await update({ reset: true });
							acceptTerms = false;
							consent = false;
							isLoading = false;
						};
					}}
					class="space-y-4"
				>
					<div class="space-y-2">
						<p class="text-sm font-medium">Prénom de l'enfant</p>
						<p class="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
							{invitation.firstname}
						</p>
					</div>

					<div class="space-y-2">
						<Label for="password">Mot de passe de {invitation.firstname}</Label>
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

					<div class="space-y-1">
						<input type="hidden" name="acceptTerms" value={acceptTerms ? 'true' : 'false'} />
						<MyCheckbox bind:checked={acceptTerms} labelClass="leading-snug">
							<span
								>J'accepte les
								<a
									href={resolve('legal/cgu')}
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary hover:underline">conditions générales d'utilisation</a
								>
								et la
								<a
									href={resolve('legal/confidentialite')}
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary hover:underline">politique de confidentialité</a
								>.</span
							>
						</MyCheckbox>
						{#if fieldError('acceptTerms')}
							<p class="text-sm text-destructive">{fieldError('acceptTerms')}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<div class="border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
							<strong>RGPD, article 8</strong> : {invitation.firstname} a moins de 15 ans, votre consentement
							est nécessaire.
						</div>
						<input type="hidden" name="consent" value={consent ? 'true' : 'false'} />
						<MyCheckbox bind:checked={consent} labelClass="leading-snug">
							<span
								>Je suis le parent ou le responsable légal de {invitation.firstname} et j'autorise son
								inscription sur Chiphre.</span
							>
						</MyCheckbox>
						{#if fieldError('consent')}
							<p class="text-sm text-destructive">{fieldError('consent')}</p>
						{/if}
					</div>

					<Button
						type="submit"
						variant="default"
						class="w-full"
						disabled={isLoading || !acceptTerms || !consent}
					>
						{#if isLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Créer l'espace de {invitation.firstname}
					</Button>
				</form>

				<p class="text-center text-xs text-muted-foreground">
					Ce lien sert une seule fois et expire le {formatDate(invitation.expiresAt)}.
				</p>
			</Card.Content>
		{/if}
	</Card.Root>
</div>
