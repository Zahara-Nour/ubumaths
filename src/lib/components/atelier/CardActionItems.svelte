<script lang="ts">
	/**
	 * Les actions d'une carte, dans son menu (lots 3 et 4a de la refonte de
	 * l'atelier) : une par élément, chacune avec sa raison quand elle est
	 * indisponible.
	 *
	 * Jamais `disabled` : un élément désactivé est sauté par le clavier, et sa
	 * raison ne serait jamais lue — or c'est elle qui dit à l'élève ce qui lui
	 * manque. L'élément reste atteignable, s'annonce indisponible
	 * (`aria-disabled`, posé APRÈS les props de bits-ui, qui l'écraseraient) et
	 * sa raison est sa description ; le choisir ne fait rien (revue de #1488).
	 */
	import type { ObjectAction } from '$lib/atelier/actions';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	interface Props {
		actions: readonly ObjectAction[];
		/** Une action DISPONIBLE choisie ; l'événement permet de garder le menu ouvert. */
		onselect: (action: ObjectAction, event: Event) => void;
	}

	let { actions, onselect }: Props = $props();

	const uid = $props.id();

	function handleSelect(action: ObjectAction, event: Event) {
		// Indisponible : le menu reste ouvert, la raison est lue avec l'élément
		if (action.disabledReason !== undefined) {
			event.preventDefault();
			return;
		}
		onselect(action, event);
	}
</script>

{#each actions as action (action.id)}
	{@const unavailable = action.disabledReason !== undefined}
	{@const reasonId = `${uid}-raison-${action.id.replace(/[^\w-]/g, '-')}`}
	<DropdownMenu.Item
		class={unavailable ? 'indisponible' : undefined}
		variant={action.id === 'remove' ? 'destructive' : 'default'}
		onSelect={(event) => handleSelect(action, event)}
	>
		{#snippet child({ props })}
			<div
				{...props}
				aria-disabled={unavailable ? 'true' : undefined}
				aria-label={unavailable ? action.label : undefined}
				aria-describedby={unavailable ? reasonId : undefined}
			>
				<span class="item">
					<span>{action.label}</span>
					{#if action.disabledReason}
						<span class="raison" id={reasonId}>{action.disabledReason}</span>
					{/if}
				</span>
			</div>
		{/snippet}
	</DropdownMenu.Item>
{/each}

<style>
	.item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.raison {
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}
	:global([data-slot='dropdown-menu-item'].indisponible) {
		cursor: not-allowed;
		opacity: 0.7;
	}
</style>
