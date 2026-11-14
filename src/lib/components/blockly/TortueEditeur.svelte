<!--
  TortueEditeur.svelte

  Éditeur d'une question « programme tortue » (bloc ```tortue) : blocs tortue, quadrillage
  animé, « Lancer » à volonté. Le programme est rendu en notation texte (`etatVersTexte`) à
  chaque modification ; c'est `TortueProgramme.svelte` qui en fait la réponse de la case.

  Importe Blockly : n'est chargé qu'à la demande (`import()` depuis `TortueProgramme`), jamais
  avec les autres questions. Les blocs sont exécutés par `executerTortue` (ADR 0039), jamais
  par du JavaScript.

  Verrouillé (`readonly`, après la validation) : les blocs de l'élève sans boîte à outils, le
  tracé final de son programme tout de suite, l'attendu en pointillés s'il est connu.
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import * as BlocklyCore from 'blockly';
	import { onDestroy, untrack } from 'svelte';
	import { Play, FastForward, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import TortueCanvas from './TortueCanvas.svelte';
	import { TORTUE_TOOLBOX } from '$lib/shared/blockly/tortue/toolbox';
	import {
		executerTortue,
		messageErreurTortue,
		type ResultatTortue
	} from '$lib/shared/blockly/tortue/interpreteur';
	import {
		imageAnimation,
		rythmeAnimation,
		PAUSE_DEPART_MS
	} from '$lib/shared/blockly/tortue/animation';
	import { etatVersTexte, texteVersEtat, type TexteLu } from '$lib/shared/blockly/tortue/notation';
	import type { Segment } from '$lib/shared/blockly/tortue/segments';

	// =============================================================================
	// Types
	// =============================================================================

	type Onglet = 'blocs' | 'tortue';

	interface Props {
		/** Programme de départ (notation texte) ; relu verrouillé pour dessiner le tracé final */
		programme: string;
		readonly?: boolean;
		modele?: readonly Segment[] | null;
		attendu?: readonly Segment[] | null;
		verdict?: boolean | null;
		/** Le programme, écrit en texte, à chaque modification des blocs */
		onprogramme?: (lu: TexteLu) => void;
	}

	// =============================================================================
	// Constantes
	// =============================================================================

	const ONGLETS: { valeur: Onglet; libelle: string }[] = [
		{ valeur: 'blocs', libelle: 'Blocs' },
		{ valeur: 'tortue', libelle: 'Tortue' }
	];

	const DEPART = { x: 0, y: 0, cap: 0, styloBaisse: true };

	// =============================================================================
	// Props
	// =============================================================================

	let {
		programme,
		readonly = false,
		modele = null,
		attendu = null,
		verdict = null,
		onprogramme
	}: Props = $props();

	const uid = $props.id();

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

	/** Dernier texte rendu : un rechargement des blocs ne refait pas la réponse */
	let dernierTexte: string | null = untrack(() => programme);

	let minuterie: ReturnType<typeof setInterval> | null = null;
	let attente: ReturnType<typeof setTimeout> | null = null;

	// =============================================================================
	// État dérivé
	// =============================================================================

	const enCours = $derived(resultat !== null && etape < resultat.etapes.length - 1);

	/** Verrouillé : le tracé final du programme de l'élève, sans animation */
	const traceVerrouillee = $derived.by((): ResultatTortue | null => {
		if (!readonly) return null;
		const lu = texteVersEtat(programme);
		return executerTortue(lu.ok ? lu.etat : {});
	});

	const image = $derived(
		resultat
			? imageAnimation(resultat, etape)
			: traceVerrouillee
				? { segments: traceVerrouillee.segments, tortue: traceVerrouillee.tortue }
				: { segments: [], tortue: DEPART }
	);

	/** Message affiché une fois l'animation finie. */
	const message = $derived.by(() => {
		const fini = resultat ?? traceVerrouillee;
		if (!fini || enCours) return null;
		if (!fini.ok) return { erreur: true, texte: messageErreurTortue(fini.erreur) };
		const n = fini.segments.length;
		return { erreur: false, texte: `Tracé terminé : ${n} segment${n > 1 ? 's' : ''}.` };
	});

	// =============================================================================
	// Effets
	// =============================================================================

	// Espace de travail prêt (au montage, ou recréé au verrouillage) : les blocs du programme.
	// Jamais à chaque frappe (`programme` n'est pas suivi) : recharger effacerait le geste.
	$effect(() => {
		const espace = workspace;
		if (!espace) return;
		untrack(() => {
			if (programme.trim() === '') return;
			const lu = texteVersEtat(programme);
			if (!lu.ok) return;
			BlocklyCore.serialization.workspaces.load(lu.etat, espace);
			// La réponse relue peut s'écrire autrement (point décimal…) : le rechargement ne la renvoie pas
			const relu = etatVersTexte(BlocklyCore.serialization.workspaces.save(espace));
			if (relu.ok) dernierTexte = relu.texte;
		});
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

	function effacer(): void {
		workspace?.clear();
	}

	/** Toute modification des blocs arrête l'animation, vide le quadrillage, refait la réponse. */
	function handleChange(): void {
		// Verrouillé : les événements viennent du rechargement des blocs, pas de l'élève
		if (readonly || !workspace) return;
		arreterAnimation();
		resultat = null;
		etape = -1;
		const lu = etatVersTexte(BlocklyCore.serialization.workspaces.save(workspace));
		const texte = lu.ok ? lu.texte : null;
		if (texte !== null && texte === dernierTexte) return;
		dernierTexte = texte;
		onprogramme?.(lu);
	}

	onDestroy(arreterAnimation);
</script>

<div class="tortue-editeur flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<!-- Téléphone et tablette en portrait : un panneau à la fois (comme le bac à sable) -->
		<div
			class="flex rounded-md border border-border p-0.5 lg:hidden"
			role="tablist"
			aria-label="Panneau affiché"
		>
			{#each ONGLETS as { valeur, libelle } (valeur)}
				<button
					type="button"
					role="tab"
					id="{uid}-onglet-{valeur}"
					aria-selected={onglet === valeur}
					aria-controls="{uid}-panneau-{valeur}"
					class="rounded px-3 py-1.5 text-sm font-medium {onglet === valeur
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground'}"
					onclick={() => (onglet = valeur)}
				>
					{libelle}
				</button>
			{/each}
		</div>

		<Button size="sm" onclick={lancer} disabled={!workspace} data-tortue-focus>
			<Play class="size-4" aria-hidden="true" />
			Lancer
		</Button>
		<Button size="sm" variant="outline" onclick={toutDeSuite} disabled={!enCours}>
			<FastForward class="size-4" aria-hidden="true" />
			Tout de suite
		</Button>
		{#if !readonly}
			<Button size="sm" variant="ghost" onclick={effacer} disabled={!workspace}>
				<Trash2 class="size-4" aria-hidden="true" />
				Effacer
			</Button>
		{/if}
	</div>

	<div class="flex flex-col gap-4 lg:flex-row">
		<!-- Masqué, jamais démonté : le programme reste en place quand on change d'onglet -->
		<div
			id="{uid}-panneau-blocs"
			role="tabpanel"
			aria-labelledby="{uid}-onglet-blocs"
			class="h-[55dvh] min-h-72 overflow-hidden rounded-md border border-border lg:block lg:h-[26rem] lg:flex-1 {onglet ===
			'blocs'
				? ''
				: 'hidden'}"
		>
			<BlocklyWorkspace
				bind:workspace
				toolbox={TORTUE_TOOLBOX}
				{readonly}
				onchange={handleChange}
			/>
		</div>

		<div
			id="{uid}-panneau-tortue"
			role="tabpanel"
			aria-labelledby="{uid}-onglet-tortue"
			class="w-full flex-col gap-2 lg:flex lg:w-80 lg:flex-shrink-0 {onglet === 'tortue'
				? 'flex'
				: 'hidden'}"
		>
			<TortueCanvas
				segments={image.segments}
				tortue={image.tortue}
				{modele}
				attendu={readonly ? attendu : null}
				verdict={readonly ? verdict : null}
			/>

			<p
				class="min-h-5 text-sm {message?.erreur ? 'text-destructive' : 'text-muted-foreground'}"
				role="status"
			>
				{message?.texte ?? ''}
			</p>
		</div>
	</div>
</div>
