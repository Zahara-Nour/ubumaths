<!--
  CalculEditeur.svelte

  Éditeur d'une question « programme de calcul » (bloc ```calcul, 5e) : blocs de calcul, un
  nombre à taper (« Essayer avec »), « Lancer » à volonté, ce que le programme affiche. Le
  programme est rendu en notation texte (`etatVersTexteCalcul`) à chaque modification ; c'est
  `CalculProgramme.svelte` qui en fait la réponse de la case.

  Importe Blockly : n'est chargé qu'à la demande (`import()` depuis `CalculProgramme`), jamais
  avec les autres questions. Les blocs sont exécutés par `executerCalcul` (ADR 0039), jamais
  par du JavaScript.

  Verrouillé (`readonly`, après la validation) : les blocs de l'élève sans boîte à outils ; il
  peut encore essayer son programme sur d'autres nombres.
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import * as BlocklyCore from 'blockly';
	import { untrack } from 'svelte';
	import { Play, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import { CALCUL_TOOLBOX } from '$lib/shared/blockly/calcul/toolbox';
	import {
		executerCalcul,
		messageErreurCalcul,
		type ResultatCalcul
	} from '$lib/shared/blockly/calcul/interpreteur';
	import {
		ecrireNombreCalcul,
		etatVersTexteCalcul,
		texteVersEtatCalcul
	} from '$lib/shared/blockly/calcul/notation';
	import { lireEssais } from '$lib/shared/blockly/calcul/jugement';
	import type { TexteLu } from '$lib/shared/blockly/tortue/notation';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		/** Programme de départ (notation texte) : la réponse déjà donnée, ou `départ:` */
		programme: string;
		readonly?: boolean;
		/** Le programme, écrit en texte, à chaque modification des blocs */
		onprogramme?: (lu: TexteLu) => void;
	}

	interface Essai {
		nombre: number;
		resultat: ResultatCalcul;
	}

	// =============================================================================
	// Constantes
	// =============================================================================

	/** Nombre proposé dans « Essayer avec » */
	const NOMBRE_PROPOSE = '5';

	/** Affichages montrés au plus (une répétition peut en faire des milliers) */
	const AFFICHAGES_MAX = 50;

	const NOMBRE_ILLISIBLE = 'Écris un nombre, par exemple 5, −3 ou 2,5.';

	// =============================================================================
	// Props
	// =============================================================================

	let { programme, readonly = false, onprogramme }: Props = $props();

	const uid = $props.id();

	// =============================================================================
	// Variables
	// =============================================================================

	let workspace = $state<Blockly.WorkspaceSvg | null>(null);

	/** Nombre tapé par l'élève */
	let saisie = $state(NOMBRE_PROPOSE);

	/** Dernier lancer (null : rien lancé depuis la dernière modification) */
	let essai = $state<Essai | null>(null);

	/** Le nombre tapé ne se lit pas */
	let saisieRefusee = $state(false);

	/** Dernier texte rendu : un rechargement des blocs ne refait pas la réponse */
	let dernierTexte: string | null = untrack(() => programme);

	// =============================================================================
	// État dérivé
	// =============================================================================

	/** Ce que le dernier lancer a affiché, et son erreur éventuelle */
	const sortie = $derived.by(() => {
		if (!essai) return null;
		const { affichages } = essai.resultat;
		const montres = affichages.slice(0, AFFICHAGES_MAX).map(ecrireNombreCalcul);
		return {
			nombre: ecrireNombreCalcul(essai.nombre),
			affichages: montres,
			coupe: affichages.length > AFFICHAGES_MAX,
			erreur: essai.resultat.ok ? null : messageErreurCalcul(essai.resultat.erreur)
		};
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
			const lu = texteVersEtatCalcul(programme);
			if (!lu.ok) return;
			BlocklyCore.serialization.workspaces.load(lu.etat, espace);
			// La réponse relue peut s'écrire autrement (point décimal…) : le rechargement ne la renvoie pas
			const relu = etatVersTexteCalcul(BlocklyCore.serialization.workspaces.save(espace));
			if (relu.ok) dernierTexte = relu.texte;
		});
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	function lancer(): void {
		if (!workspace) return;
		const lu = lireEssais(saisie);
		if (!lu.ok || lu.essais.length !== 1) {
			saisieRefusee = true;
			essai = null;
			return;
		}
		saisieRefusee = false;
		const nombre = lu.essais[0];
		essai = {
			nombre,
			resultat: executerCalcul(BlocklyCore.serialization.workspaces.save(workspace), nombre)
		};
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter') return;
		// Entrée lance le programme ; elle ne valide pas la question
		event.preventDefault();
		lancer();
	}

	function effacer(): void {
		workspace?.clear();
	}

	/** Toute modification des blocs efface le dernier lancer et refait la réponse. */
	function handleChange(): void {
		// Verrouillé : les événements viennent du rechargement des blocs, pas de l'élève
		if (readonly || !workspace) return;
		essai = null;
		const lu = etatVersTexteCalcul(BlocklyCore.serialization.workspaces.save(workspace));
		const texte = lu.ok ? lu.texte : null;
		if (texte !== null && texte === dernierTexte) return;
		dernierTexte = texte;
		onprogramme?.(lu);
	}
</script>

<div class="calcul-editeur flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<label for="{uid}-nombre" class="text-sm font-medium">Essayer avec</label>
		<Input
			id="{uid}-nombre"
			class="h-8 w-24"
			inputmode="decimal"
			autocomplete="off"
			aria-invalid={saisieRefusee}
			aria-describedby={saisieRefusee ? `${uid}-refus` : undefined}
			bind:value={saisie}
			onkeydown={handleKeydown}
			data-calcul-focus
		/>
		<Button size="sm" onclick={lancer} disabled={!workspace}>
			<Play class="size-4" aria-hidden="true" />
			Lancer
		</Button>
		{#if !readonly}
			<Button size="sm" variant="ghost" onclick={effacer} disabled={!workspace}>
				<Trash2 class="size-4" aria-hidden="true" />
				Effacer
			</Button>
		{/if}
	</div>

	<div class="h-[50dvh] min-h-64 overflow-hidden rounded-md border border-border lg:h-[24rem]">
		<BlocklyWorkspace bind:workspace toolbox={CALCUL_TOOLBOX} {readonly} onchange={handleChange} />
	</div>

	<div class="calcul-sortie min-h-5 text-sm" role="status">
		{#if saisieRefusee}
			<p id="{uid}-refus" class="text-destructive">{NOMBRE_ILLISIBLE}</p>
		{:else if sortie}
			{#if sortie.affichages.length > 0}
				<p>
					<span class="text-muted-foreground">Avec {sortie.nombre}, le programme affiche :</span>
					<span class="calcul-affichages font-medium"
						>{sortie.affichages.join(' ; ')}{sortie.coupe ? ' ; …' : ''}</span
					>
				</p>
			{:else if !sortie.erreur}
				<p class="text-muted-foreground">Avec {sortie.nombre}, le programme n’affiche rien.</p>
			{/if}
			{#if sortie.erreur}
				<p class="text-destructive">{sortie.erreur}</p>
			{/if}
		{/if}
	</div>
</div>

<style>
	.calcul-affichages {
		overflow-wrap: anywhere;
	}
</style>
