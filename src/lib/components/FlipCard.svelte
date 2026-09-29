<script>
	/**
	 * Carte à deux faces qui se retourne
	 *
	 * Recto et verso ont TOUJOURS la même hauteur (décision de David, 2026-09-30).
	 * Les deux faces sont empilées dans la même cellule d'une grille CSS : la
	 * cellule prend d'elle-même la hauteur de la plus haute face. Aucune mesure en
	 * JavaScript, aucune copie cachée : chaque face n'est rendue qu'une fois.
	 *
	 * - `height` absent : hauteur du contenu (la plus haute des deux faces).
	 * - `height` renseigné (ex. '16rem') : hauteur imposée ; le contenu qui
	 *   dépasse défile dans la face.
	 *
	 * La face tournée vers l'arrière est `inert` : ni focus clavier, ni lecteur
	 * d'écran.
	 */
	let {
		flipped = $bindable(false),
		front = $bindable(),
		back = $bindable(),
		class: className = '',
		height = undefined
	} = $props();
</script>

<div class="flip-card {className}" class:fixed-height={!!height} style:height>
	<div class="flip-card-inner" class:flipped>
		<div class="flip-card-face flip-card-front" inert={flipped}>
			{@render front?.()}
		</div>

		<div class="flip-card-face flip-card-back" inert={!flipped}>
			{@render back?.()}
		</div>
	</div>
</div>

<style>
	.flip-card {
		perspective: 1000px;
		width: 100%;
	}

	.flip-card-inner {
		/* Les deux faces dans la même cellule : hauteur = la plus haute */
		display: grid;
		width: 100%;
		transition: transform 0.6s cubic-bezier(0.33, 1, 0.68, 1);
		transform-style: preserve-3d;
	}

	.flip-card-inner.flipped {
		transform: rotateY(180deg);
	}

	.flip-card-face {
		grid-area: 1 / 1;
		min-width: 0;
		min-height: 0;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.flip-card-face > :global(*) {
		flex: 1 1 auto;
		min-height: 0;
	}

	.flip-card-front {
		transform: rotateY(0deg);
	}

	.flip-card-back {
		transform: rotateY(180deg);
	}

	/* Hauteur imposée : la grille remplit la carte, chaque face défile au besoin */
	.fixed-height .flip-card-inner {
		height: 100%;
		grid-template-rows: minmax(0, 1fr);
	}

	.fixed-height .flip-card-face {
		overflow-y: auto;
	}
</style>
