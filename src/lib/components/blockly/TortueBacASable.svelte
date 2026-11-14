<!--
  TortueBacASable.svelte

  Bac à sable public de la tortue (`/tortue`) : blocs tortue, quadrillage animé, aperçu Python
  replié. Rien n'est enregistré. Les blocs sont exécutés par `executerTortue` (ADR 0039) :
  aucun JavaScript n'est exécuté ici, le code Python n'est qu'un aperçu.
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import * as BlocklyCore from 'blockly';
	import { onDestroy } from 'svelte';
	import { Play, FastForward, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import TortueCanvas from './TortueCanvas.svelte';
	import {
		TORTUE_TOOLBOX,
		DUREE_ETAPE_MS,
		executerTortue,
		imageAnimation,
		messageErreurTortue,
		type ResultatTortue
	} from '$lib/shared/blockly/tortue';
	import { generateCode } from '$lib/shared/blockly/generators';

	// =============================================================================
	// Variables
	// =============================================================================

	let workspace = $state<Blockly.WorkspaceSvg | null>(null);

	/** Dernière exécution (null : rien lancé depuis la dernière modification). */
	let resultat = $state<ResultatTortue | null>(null);

	/** Étape affichée ; -1 avant la première. */
	let etape = $state(-1);

	let minuterie: ReturnType<typeof setInterval> | null = null;

	let python = $state('');

	// =============================================================================
	// État dérivé
	// =============================================================================

	const enCours = $derived(resultat !== null && etape < resultat.etapes.length - 1);

	const image = $derived(
		resultat
			? imageAnimation(resultat, etape)
			: { segments: [], tortue: { x: 0, y: 0, cap: 0, styloBaisse: true } }
	);

	/** Message affiché une fois l'animation finie. */
	const message = $derived.by(() => {
		if (!resultat || enCours) return null;
		if (!resultat.ok) return { erreur: true, texte: messageErreurTortue(resultat.erreur) };
		const n = resultat.segments.length;
		return { erreur: false, texte: `Tracé terminé : ${n} segment${n > 1 ? 's' : ''}.` };
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	function arreterAnimation(): void {
		if (minuterie !== null) {
			clearInterval(minuterie);
			minuterie = null;
		}
	}

	function lancer(): void {
		if (!workspace) return;
		arreterAnimation();
		const nouveau = executerTortue(BlocklyCore.serialization.workspaces.save(workspace));
		resultat = nouveau;
		etape = -1;
		if (nouveau.etapes.length === 0) return;
		minuterie = setInterval(() => {
			etape++;
			if (etape >= nouveau.etapes.length - 1) arreterAnimation();
		}, DUREE_ETAPE_MS);
	}

	function toutDeSuite(): void {
		if (!resultat) return;
		arreterAnimation();
		etape = resultat.etapes.length - 1;
	}

	function remettreAZero(): void {
		arreterAnimation();
		resultat = null;
		etape = -1;
	}

	function effacer(): void {
		workspace?.clear();
		remettreAZero();
	}

	/** Toute modification des blocs arrête l'animation et vide le quadrillage. */
	function handleChange(): void {
		remettreAZero();
		if (!workspace) return;
		const genere = generateCode(workspace, 'python');
		python = genere.success ? genere.code : '';
	}

	onDestroy(arreterAnimation);
</script>

<div class="flex flex-col gap-4 lg:flex-row">
	<div
		class="h-[60vh] min-h-80 flex-1 overflow-hidden rounded-md border border-border lg:h-[calc(100vh-12rem)]"
	>
		<BlocklyWorkspace bind:workspace toolbox={TORTUE_TOOLBOX} onchange={handleChange} />
	</div>

	<div class="flex w-full flex-col gap-3 lg:w-96 lg:flex-shrink-0">
		<div class="flex flex-wrap gap-2">
			<Button onclick={lancer} disabled={!workspace}>
				<Play class="size-4" aria-hidden="true" />
				Lancer
			</Button>
			<Button variant="outline" onclick={toutDeSuite} disabled={!enCours}>
				<FastForward class="size-4" aria-hidden="true" />
				Tout de suite
			</Button>
			<Button variant="ghost" onclick={effacer} disabled={!workspace}>
				<Trash2 class="size-4" aria-hidden="true" />
				Effacer
			</Button>
		</div>

		<TortueCanvas segments={image.segments} tortue={image.tortue} />

		<p
			class="min-h-5 text-sm {message?.erreur ? 'text-destructive' : 'text-muted-foreground'}"
			role="status"
		>
			{message?.texte ?? ''}
		</p>

		<details class="rounded-md border border-border">
			<summary class="cursor-pointer px-3 py-2 text-sm font-medium">Voir en Python</summary>
			<pre class="overflow-x-auto border-t border-border px-3 py-2 text-sm"><code
					>{python || '# Pose des blocs pour voir le programme en Python.'}</code
				></pre>
		</details>
	</div>
</div>
