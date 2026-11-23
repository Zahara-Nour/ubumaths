<!--
	Carnet de liaison — confirmer son adresse (ADR 0040 ; A2, A5)
	=============================================================

	La page ne lit rien : elle ne sait ni de quel élève il s'agit, ni si le lien
	est encore valable (un antivirus de messagerie qui l'ouvre ne doit rien
	déclencher). Les deux gestes sont des boutons ; la réponse vient après.

	Confirmer → le lien du carnet part par courriel (Q26). « Je ne suis pas le
	parent » → l'adresse est effacée et ne pourra plus être saisie pour cet
	élève ; le professeur le voit.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let pending = $state(false);

	function submitting() {
		pending = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			pending = false;
		};
	}
</script>

<svelte:head>
	<title>Carnet de liaison — confirmer votre adresse</title>
	<meta name="robots" content="noindex, nofollow" />
	<!-- Le jeton est dans l'adresse : aucun Referer, même vers le site lui-même -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="mx-auto w-full max-w-xl p-4">
	<Card.Root>
		<Card.Header>
			<h1 class="text-xl font-semibold">Carnet de liaison</h1>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if form?.outcome === 'refused'}
				<p role="status">
					C'est noté : votre adresse est effacée et ne recevra plus rien de Chiphre pour cet élève.
					Le professeur en est informé.
				</p>
			{:else if form?.outcome === 'link_sent'}
				<p role="status">
					Votre adresse est confirmée. Le lien de votre carnet vient de vous être envoyé : ouvrez le
					courriel « Le carnet de liaison de… » et gardez-le. Ce lien vous est propre ; ne le
					transférez pas.
				</p>
			{:else if form?.outcome === 'confirmed'}
				<p role="status">
					Votre adresse est confirmée. Le lien du carnet n'a pas pu vous être envoyé maintenant : le
					professeur vous l'enverra.
				</p>
			{:else if form?.outcome === 'invalid'}
				<p role="alert">
					Ce lien de confirmation n'est plus valide (déjà utilisé ou trop ancien). Demandez-en un
					nouveau au professeur.
				</p>
			{:else}
				<p>
					Le professeur de votre enfant vous propose de suivre son travail sur Chiphre : une page à
					vous, toujours à jour, et un courriel seulement si quelque chose mérite votre attention.
				</p>
				<p class="text-sm text-muted-foreground">
					Ni ses notes, ni ses messages : seulement la régularité de son travail, ses révisions et
					les évaluations faites ou non.
				</p>
				<div class="flex flex-col gap-3 sm:flex-row">
					<form method="POST" action="?/confirm" use:enhance={submitting}>
						<Button type="submit" disabled={pending}>Confirmer mon adresse</Button>
					</form>
					<form method="POST" action="?/refuse" use:enhance={submitting}>
						<Button type="submit" variant="outline" disabled={pending}>
							Je ne suis pas le parent de cet élève
						</Button>
					</form>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
