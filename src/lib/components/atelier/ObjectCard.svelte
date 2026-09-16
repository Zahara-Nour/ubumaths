<script lang="ts">
	/**
	 * Un objet de l'atelier : son nom, sa définition, son état, ses actions.
	 *
	 * Les actions sont attachées ICI, sur l'objet, et jamais dans une barre de
	 * menus globale — c'est ce qui fait la progressivité 6ᵉ → terminale (§3).
	 */
	import type { AtelierObject } from '$lib/atelier/types';
	import { actionsFor, type ObjectAction } from '$lib/atelier/actions';

	interface Props {
		object: AtelierObject;
		selected?: boolean;
		onSelect?: (name: string) => void;
		onAction?: (action: ObjectAction, object: AtelierObject) => void;
	}

	let { object, selected = false, onSelect, onAction }: Props = $props();

	const actions = $derived(actionsFor(object));

	/** Ce que l'élève lit quand l'objet ne peut rien produire. */
	const stateLabel = $derived.by(() => {
		switch (object.status) {
			case 'error':
				return 'erreur';
			case 'pending':
				return 'en attente';
			case 'incomplete':
				return 'à compléter';
			default:
				return null;
		}
	});
</script>

<article class="objet" class:selected data-status={object.status}>
	<button type="button" class="entete" onclick={() => onSelect?.(object.name)}>
		<span class="nom">{object.name}</span>
		<span class="definition">{object.definition || '…'}</span>
		<span class="type">{object.kind}</span>
		{#if stateLabel}
			<span class="etat">{stateLabel}</span>
		{/if}
	</button>

	{#if object.message}
		<p class="message">{object.message}</p>
	{/if}

	{#if selected}
		<div class="actions">
			{#each actions as action (action.id)}
				<button
					type="button"
					class="action"
					disabled={action.disabledReason !== undefined}
					title={action.disabledReason}
					onclick={() => onAction?.(action, object)}
				>
					{action.label}
				</button>
			{/each}
		</div>
	{/if}
</article>

<style>
	.objet {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.5rem 0.625rem;
		border: 1px solid transparent;
		border-radius: 0.5rem;
	}
	.objet:hover {
		border-color: var(--color-border);
	}
	.objet.selected {
		border-color: var(--color-primary);
		background: var(--color-card);
	}

	.entete {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.nom {
		font-style: italic;
		font-weight: 600;
		font-size: 1.0625rem;
	}
	.definition {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		overflow-wrap: anywhere;
	}
	.type {
		font-size: 0.625rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}
	.etat {
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}

	.message {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	[data-status='error'] .message {
		color: var(--color-destructive);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.action {
		font-size: 0.75rem;
		padding: 0.1875rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		cursor: pointer;
	}
	.action:disabled {
		opacity: 0.55;
		cursor: help;
		border-style: dashed;
	}
</style>
