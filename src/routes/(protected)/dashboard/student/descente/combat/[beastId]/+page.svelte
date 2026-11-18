<!--
	La Descente de la Vistule — combat d'une Bête (étape 3)
	Chargement : +page.server.ts (`openCombat`). Combat : CombatArena.
	⚠️ « Quitter » mène à la carte de la Descente, qui arrive à l'étape 4.
-->

<script lang="ts">
	import CombatArena from '#lib/components/descente/CombatArena.svelte';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import type { PageProps } from './$types';

	// Constantes
	const MAP_HREF = '/dashboard/student/descente';

	// Variables
	let { data }: PageProps = $props();

	const unavailableMessage = $derived.by(() => {
		switch (data.unavailable) {
			case 'defeated':
				return 'Cette Bête est déjà vaincue : elle est dans ton carnet de voyage.';
			case 'gone':
				return 'Cette Bête est repartie.';
			case 'no_grade':
				return 'Pour combattre, ton niveau scolaire doit être renseigné : vois avec ton professeur.';
			case 'not_found':
				return 'Cette Bête est introuvable.';
			default:
				return 'Le combat ne peut pas commencer pour l’instant. Réessaie un peu plus tard.';
		}
	});
</script>

<svelte:head>
	<title>Combat — La Descente de la Vistule</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	{#if data.combat}
		<CombatArena combat={data.combat} quitHref={MAP_HREF} />
	{:else}
		<div class="mx-auto w-full max-w-2xl space-y-4">
			<BackLink href={MAP_HREF} label="Retour à la Descente" />
			<Card.Root>
				<Card.Content class="p-6 text-center" data-testid="combat-unavailable">
					<p>{unavailableMessage}</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
