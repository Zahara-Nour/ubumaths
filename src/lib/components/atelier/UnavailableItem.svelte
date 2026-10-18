<script lang="ts">
	/**
	 * Un réglage du menu d'une carte qui ne s'applique pas ici — « Curseur »
	 * d'une grandeur, « Escalier » d'une suite explicite, « Nuage » d'une suite
	 * non tracée (lot 4a de la refonte de l'atelier).
	 *
	 * Comme une action indisponible (`CardActionItems`) : atteignable au clavier,
	 * annoncé indisponible, sa raison lue avec lui ; le choisir ne fait rien.
	 */
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	interface Props {
		label: string;
		reason: string;
		/** Le rôle d'un réglage coché (case ou choix exclusif). */
		role: 'menuitemcheckbox' | 'menuitemradio';
		/** Ce qu'il vaut, même indisponible (le curseur d'un paramètre reste affiché). */
		checked?: boolean;
	}

	let { label, reason, role, checked = false }: Props = $props();

	const uid = $props.id();
</script>

<DropdownMenu.Item class="indisponible" onSelect={(event) => event.preventDefault()}>
	{#snippet child({ props })}
		<div
			{...props}
			{role}
			aria-checked={checked ? 'true' : 'false'}
			aria-disabled="true"
			aria-label={label}
			aria-describedby="{uid}-raison"
		>
			<span class="item">
				<span>{label}</span>
				<span class="raison" id="{uid}-raison">{reason}</span>
			</span>
		</div>
	{/snippet}
</DropdownMenu.Item>

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
</style>
