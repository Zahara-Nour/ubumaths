<!--
	Carnet de liaison — « J'ai perdu mon lien » (ADR 0040 ; A6)
	===========================================================

	Le parent saisit son adresse ; la réponse est la même, qu'elle soit connue
	ou non. Un lien neuf part si elle reçoit un carnet ; l'ancien ne marche plus.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
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
	<title>Carnet de liaison — lien perdu</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto w-full max-w-xl p-4">
	<Card.Root>
		<Card.Header>
			<h1 class="text-xl font-semibold">J'ai perdu le lien de mon carnet</h1>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if form && 'sent' in form}
				<p role="status">
					Si cette adresse reçoit un carnet de liaison, un nouveau lien vient de lui être envoyé.
					L'ancien lien ne fonctionne plus.
				</p>
				<p class="text-sm text-muted-foreground">
					Rien reçu ? Vérifiez vos courriers indésirables, ou demandez un nouveau lien au
					professeur.
				</p>
			{:else}
				<p>
					Saisissez l'adresse à laquelle vous recevez le carnet de liaison de votre enfant. Un
					nouveau lien vous sera envoyé ; l'ancien ne fonctionnera plus.
				</p>
				<form method="POST" use:enhance={submitting} class="space-y-3">
					<div class="space-y-1.5">
						<Label for="carnet-lost-email">Votre adresse</Label>
						<Input
							id="carnet-lost-email"
							name="email"
							type="email"
							autocomplete="email"
							required
							maxlength={254}
						/>
					</div>
					{#if form && 'error' in form}
						<p role="alert" class="text-sm text-destructive">{form.error}</p>
					{/if}
					<Button type="submit" disabled={pending}>Recevoir un nouveau lien</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
