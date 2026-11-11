<!--
	StepsOnDemand
	=============

	Les étapes d'une ligne de la console, dont le composant
	(`GeneratedStepsCorrection`) n'est téléchargé qu'au premier dépliage
	(`$lib/atelier/steps-loader`). Une fois chargé, il s'affiche aussitôt, sur
	toutes les lignes.

	- pendant le chargement : « Chargement des étapes… » ;
	- en cas d'échec (réseau coupé, nouvelle version déployée) : un message et
	  « Réessayer » ; la ligne de calcul reste affichée au-dessus.
-->
<script lang="ts">
	import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
	import { Button } from '$lib/components/ui/button';
	import { stepsCorrection } from '$lib/atelier/steps-loader';

	interface Props {
		steps: readonly RenderedStep[];
	}

	let { steps }: Props = $props();

	let Steps = $state(stepsCorrection.loaded);
	let failed = $state(false);

	function load(): void {
		failed = false;
		stepsCorrection.load().then(
			(component) => {
				Steps = component;
			},
			() => {
				failed = true;
			}
		);
	}

	// Une fois, à la création : les étapes ne se montent qu'au dépliage
	if (stepsCorrection.loaded === undefined) load();
</script>

{#if Steps !== undefined}
	<Steps {steps} />
{:else if failed}
	<p class="echec" role="alert">
		Les étapes n'ont pas pu se charger.
		<Button variant="outline" size="sm" onclick={load}>Réessayer</Button>
	</p>
{:else}
	<p class="chargement" role="status">Chargement des étapes…</p>
{/if}

<style>
	.chargement,
	.echec {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}

	.echec {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
</style>
