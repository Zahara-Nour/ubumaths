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

  Niveau (`niveau: 4e | 3e` du bloc, chantier `tortue-variables`) : les blocs proposés
  (`toolboxTortue`), la notation du programme et les blocs exécutés. Changé en cours de route
  (sélecteur du bac à sable) : la boîte à outils change, les blocs posés restent ; un bloc
  au-dessus du niveau est refusé au lancer. En 4e / 3e, un nom de variable refusé l'est dès sa
  création (`surveillerNomsDeVariables`), message sous les blocs.
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import * as BlocklyCore from 'blockly';
	import { onDestroy, untrack } from 'svelte';
	import { Play, FastForward, Trash2 } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import TortueCanvas from './TortueCanvas.svelte';
	import { toolboxTortue } from '#lib/shared/blockly/tortue/toolbox.ts';
	import { surveillerNomsDeVariables } from '#lib/shared/blockly/calcul/blocs.ts';
	import {
		executerTortue,
		messageErreurTortue,
		type NiveauTortue,
		type ResultatTortue
	} from '#lib/shared/blockly/tortue/interpreteur.ts';
	import {
		imageAnimation,
		rythmeAnimation,
		PAUSE_DEPART_MS
	} from '#lib/shared/blockly/tortue/animation.ts';
	import { etatVersTexteTortue, texteVersEtatTortue } from '#lib/shared/blockly/tortue/niveaux.ts';
	import type { TexteLu } from '#lib/shared/blockly/tortue/notation.ts';
	import type { Segment } from '#lib/shared/blockly/tortue/segments.ts';

	// =============================================================================
	// Types
	// =============================================================================

	type Onglet = 'blocs' | 'tortue';

	interface Props {
		/** Programme de départ (notation texte) ; relu verrouillé pour dessiner le tracé final */
		programme: string;
		/** Blocs proposés, notation et blocs exécutés (sans niveau par défaut) */
		niveau?: NiveauTortue;
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
		niveau = 'base',
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

	/** Boîte à outils de l'espace de travail : celle du niveau de départ */
	const toolbox = untrack(() => toolboxTortue(niveau));

	/** Niveau de la boîte à outils affichée */
	let niveauAffiche: NiveauTortue = untrack(() => niveau);

	/** Nom de variable refusé à sa création ou à son renommage (message) ; null sinon */
	let nomRefuse = $state<string | null>(null);

	let minuterie: ReturnType<typeof setInterval> | null = null;
	let attente: ReturnType<typeof setTimeout> | null = null;

	// =============================================================================
	// État dérivé
	// =============================================================================

	const enCours = $derived(resultat !== null && etape < resultat.etapes.length - 1);

	/** Verrouillé : le tracé final du programme de l'élève, sans animation */
	const traceVerrouillee = $derived.by((): ResultatTortue | null => {
		if (!readonly) return null;
		const lu = texteVersEtatTortue(programme, niveau);
		return executerTortue(lu.ok ? lu.etat : {}, niveau);
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
			const lu = texteVersEtatTortue(programme, niveau);
			if (!lu.ok) return;
			BlocklyCore.serialization.workspaces.load(lu.etat, espace);
			// La réponse relue peut s'écrire autrement (point décimal…) : le rechargement ne la renvoie pas
			const relu = etatVersTexteTortue(BlocklyCore.serialization.workspaces.save(espace), niveau);
			if (relu.ok) dernierTexte = relu.texte;
		});
	});

	// Noms de variables refusés dès leur création (4e / 3e)
	$effect(() => {
		const espace = workspace;
		if (!espace || readonly) return;
		return surveillerNomsDeVariables(espace, (message) => {
			nomRefuse = message;
			// Un renommage refusé est remis sans événement : la réponse est refaite ici
			if (message) rendreProgramme();
		});
	});

	// Niveau changé (sélecteur du bac à sable) : la boîte à outils suit, les blocs restent
	$effect(() => {
		const espace = workspace;
		const voulu = niveau;
		if (!espace || readonly || voulu === niveauAffiche) return;
		niveauAffiche = voulu;
		espace.updateToolbox(
			toolboxTortue(voulu) as unknown as Blockly.utils.toolbox.ToolboxDefinition
		);
		// Le dernier lancer était au niveau d'avant : il ne vaut plus
		untrack(remettreAZero);
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
		const nouveau = executerTortue(BlocklyCore.serialization.workspaces.save(workspace), niveau);
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
		nomRefuse = null;
		workspace?.clear();
	}

	function remettreAZero(): void {
		arreterAnimation();
		resultat = null;
		etape = -1;
	}

	/** Toute modification des blocs arrête l'animation, vide le quadrillage, refait la réponse. */
	function handleChange(event: Blockly.Events.Abstract): void {
		// Verrouillé : les événements viennent du rechargement des blocs, pas de l'élève
		if (readonly || !workspace) return;
		remettreAZero();
		// L'élève passe aux blocs : le nom refusé n'est plus d'actualité
		if (event instanceof BlocklyCore.Events.BlockBase) nomRefuse = null;
		rendreProgramme();
	}

	/** Le programme des blocs, en texte : la réponse, envoyée seulement si elle a changé. */
	function rendreProgramme(): void {
		if (!workspace) return;
		const lu = etatVersTexteTortue(BlocklyCore.serialization.workspaces.save(workspace), niveau);
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
			<BlocklyWorkspace bind:workspace {toolbox} {readonly} onchange={handleChange} />
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

	{#if nomRefuse && !readonly}
		<p class="tortue-nom-refuse text-sm text-destructive" role="alert">{nomRefuse}</p>
	{/if}
</div>
