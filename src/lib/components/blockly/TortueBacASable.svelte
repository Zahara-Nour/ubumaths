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
		executerTortue,
		imageAnimation,
		rythmeAnimation,
		PAUSE_DEPART_MS,
		messageErreurTortue,
		type ResultatTortue
	} from '$lib/shared/blockly/tortue';
	import { generateCode } from '$lib/shared/blockly/generators';

	// =============================================================================
	// Types
	// =============================================================================

	type Onglet = 'blocs' | 'tortue';

	// =============================================================================
	// Constantes
	// =============================================================================

	const ONGLETS: { valeur: Onglet; libelle: string }[] = [
		{ valeur: 'blocs', libelle: 'Blocs' },
		{ valeur: 'tortue', libelle: 'Tortue' }
	];

	// =============================================================================
	// Variables
	// =============================================================================

	/** Panneau affiché sous `lg` ; au-dessus, les deux sont côte à côte. */
	let onglet = $state<Onglet>('blocs');

	let workspace = $state<Blockly.WorkspaceSvg | null>(null);

	/** Dernière exécution (null : rien lancé depuis la dernière modification). */
	let resultat = $state<ResultatTortue | null>(null);

	/** Étape affichée ; -1 avant la première. */
	let etape = $state(-1);

	let minuterie: ReturnType<typeof setInterval> | null = null;

	/** Pause au départ, avant le premier pas. */
	let attente: ReturnType<typeof setTimeout> | null = null;

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
		if (attente !== null) {
			clearTimeout(attente);
			attente = null;
		}
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
		// Sur téléphone, on montre le tracé : l'animation se joue sous les yeux de l'élève
		onglet = 'tortue';
		// Tortue au départ, rien de tracé, le temps de voir le quadrillage ; puis premier pas
		etape = -1;
		const derniere = nouveau.etapes.length - 1;
		if (derniere < 0) return;
		const { dureeMs, etapesParTic } = rythmeAnimation(nouveau.etapes.length);
		attente = setTimeout(() => {
			attente = null;
			etape = 0;
			if (etape >= derniere) return;
			minuterie = setInterval(() => {
				etape = Math.min(etape + etapesParTic, derniere);
				if (etape >= derniere) arreterAnimation();
			}, dureeMs);
		}, PAUSE_DEPART_MS);
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

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<!-- Téléphone et tablette en portrait : un panneau à la fois (David, 2026-11-14) -->
		<div
			class="flex rounded-md border border-border p-0.5 lg:hidden"
			role="tablist"
			aria-label="Panneau affiché"
		>
			{#each ONGLETS as { valeur, libelle } (valeur)}
				<button
					type="button"
					role="tab"
					id="onglet-{valeur}"
					aria-selected={onglet === valeur}
					aria-controls="panneau-{valeur}"
					class="rounded px-3 py-1.5 text-sm font-medium {onglet === valeur
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground'}"
					onclick={() => (onglet = valeur)}
				>
					{libelle}
				</button>
			{/each}
		</div>

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

	<div class="flex flex-col gap-4 lg:flex-row">
		<!-- Masqué, jamais démonté : le programme reste en place quand on change d'onglet -->
		<div
			id="panneau-blocs"
			role="tabpanel"
			aria-labelledby="onglet-blocs"
			class="h-[65dvh] min-h-80 overflow-hidden rounded-md border border-border lg:block lg:h-[calc(100vh-12rem)] lg:flex-1 {onglet ===
			'blocs'
				? ''
				: 'hidden'}"
		>
			<BlocklyWorkspace bind:workspace toolbox={TORTUE_TOOLBOX} onchange={handleChange} />
		</div>

		<div
			id="panneau-tortue"
			role="tabpanel"
			aria-labelledby="onglet-tortue"
			class="w-full flex-col gap-3 lg:flex lg:w-96 lg:flex-shrink-0 {onglet === 'tortue'
				? 'flex'
				: 'hidden'}"
		>
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
</div>
