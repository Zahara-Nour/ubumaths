<script lang="ts">
	/**
	 * « Ouvrir dans l'atelier » : les listes du programme exécuté, copiées dans
	 * un atelier éphémère ouvert dans un nouvel onglet (phase 0
	 * `docs/archive/wip/python-vers-atelier-phase0.md`). Le playground ne bouge pas.
	 */
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDown } from '@lucide/svelte';
	import { offerOf, type AtelierOffer, type PythonListReport } from '$lib/atelier/from-python';
	import { postToAtelier } from '$lib/atelier/python-mailbox';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let { lists }: { lists: readonly PythonListReport[] } = $props();

	// Constants
	const uid = $props.id();
	const STORAGE_UNAVAILABLE =
		'La liste n’a pas pu être préparée : le stockage du navigateur est plein ou bloqué.';

	// Variables
	let offers = $derived(lists.map(offerOf));

	// Functions
	function open(offer: Exclude<AtelierOffer, { kind: 'refused' }>) {
		const url = postToAtelier(offer.lists);
		if (url === null) {
			toaster.error(STORAGE_UNAVAILABLE);
			return;
		}
		window.open(url, '_blank', 'noopener');
	}
</script>

{#if offers.length > 0}
	<div class="mt-2 flex justify-end">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm">
						Ouvrir dans l’atelier
						<ChevronDown class="size-4" aria-hidden="true" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-80">
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Les listes du programme</DropdownMenu.GroupHeading>
					{#each offers as offer, index (offer.name)}
						{#if offer.kind === 'refused'}
							<!--
							Refusée : atteignable au clavier, annoncée indisponible avec sa raison
							(un élément `disabled` est sauté, et sa raison jamais lue — revue de #1488)
						-->
							<DropdownMenu.Item
								class="cursor-default"
								onSelect={(event) => event.preventDefault()}
							>
								{#snippet child({ props })}
									<div
										{...props}
										aria-disabled="true"
										aria-label={offer.name}
										aria-describedby="{uid}-raison-{index}"
									>
										<span class="item">
											<span class="font-mono">{offer.name}</span>
											<span class="raison" id="{uid}-raison-{index}">{offer.message}</span>
										</span>
									</div>
								{/snippet}
							</DropdownMenu.Item>
						{:else}
							<DropdownMenu.Item onSelect={() => open(offer)}>{offer.label}</DropdownMenu.Item>
						{/if}
					{/each}
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{/if}

<style>
	.item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.raison {
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
</style>
