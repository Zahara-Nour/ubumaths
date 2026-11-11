<!--
	PalotinBadge
	============
	L'écusson du Palotin, hors de sa maison (chantier `palotins`) : un blason
	immobile qui porte la pièce héraldique de son nom — giron (triangle de
	l'angle au cœur), pile (pointe qui descend du chef), cotice (bande étroite
	en diagonale). Décoratif : le bouton qui le porte dit son nom.
-->

<script lang="ts">
	import type { PalotinType } from '$lib/config/buddy-messages';

	interface Props {
		palotin: PalotinType;
	}

	let { palotin }: Props = $props();

	// Couleurs de la pièce : celles du repli de `BuddyAvatar`
	const pieceColors: Record<PalotinType, string> = {
		giron: 'text-red-500',
		pile: 'text-blue-500',
		cotice: 'text-green-600'
	};

	// Pièces, dessinées dans le blason (viewBox 24 × 28)
	const piecePoints: Record<PalotinType, string> = {
		giron: '3,3 12,12.5 3,12.5',
		pile: '8,3 16,3 12,21',
		cotice: '3,5.5 5.5,3 19,16.5 16.5,19'
	};
</script>

<svg
	viewBox="0 0 24 28"
	class="h-8 w-8 {pieceColors[palotin]}"
	aria-hidden="true"
	data-testid="palotin-badge"
	data-palotin={palotin}
>
	<path
		d="M3 3 H21 V12.5 C21 19.5 12 25 12 25 C12 25 3 19.5 3 12.5 Z"
		fill="var(--color-card)"
		stroke="var(--color-foreground)"
		stroke-width="1.5"
		stroke-linejoin="round"
	/>
	<polygon points={piecePoints[palotin]} fill="currentColor" />
</svg>
