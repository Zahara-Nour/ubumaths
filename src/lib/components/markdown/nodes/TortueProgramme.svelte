<!--
	TortueProgramme.svelte
	======================

	Bloc ```tortue (chantier `blockly`, PR 4b ; journal `docs/archive/wip/blockly-progress.md`) : l'élève
	assemble des blocs tortue, sa réponse est son programme écrit en texte (`etatVersTexte`),
	jugé sur le tracé par le serveur.

	- L'éditeur (Blockly, lourd) est chargé à la demande, une fois la carte affichée : les autres
	  questions ne le paient pas. En attendant, et au rendu côté serveur : le quadrillage seul.
	- `montrer: oui` : la figure à reproduire en gris sur le quadrillage.
	- `départ:` : le programme posé d'avance dans l'espace de travail, à modifier. Il ne devient la
	  réponse qu'au premier changement (un programme de départ non touché n'est pas une réponse).
	- Programme vide → réponse vide (Valider grisé) ; trop long → refusé avant l'envoi, réponse vide.
	- `blocs: N` : consigne « Au plus N blocs » et compteur des blocs posés, signalé au-delà ;
	  dépasser est permis (la réponse part, le serveur la juge fausse).
	- Après la validation : blocs verrouillés, tracé de l'élève vert ou rouge, l'attendu en
	  pointillés quand il est connu (jamais dans une évaluation notée : `attendu: ?`).
	- Hors question (aperçu de l'éditeur, cours) : le geste libre, rien de jugé.
	- `niveau: 4e | 3e` (chantier `tortue-variables`) : les blocs proposés, la notation de la
	  réponse et le compte des blocs sont ceux du niveau.

	@module components/markdown/nodes/TortueProgramme
-->
<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import TortueCanvas from '#lib/components/blockly/TortueCanvas.svelte';
	import { LONGUEUR_MAX_PROGRAMME, type TexteLu } from '#lib/shared/blockly/tortue/notation.ts';
	import { nombreDeBlocsTortue } from '#lib/shared/blockly/tortue/niveaux.ts';
	import type { NiveauTortue } from '#lib/shared/blockly/tortue/interpreteur.ts';
	import { lireProgrammeTortue } from '#lib/shared/blockly/tortue/jugement.ts';
	import type { Segment } from '#lib/shared/blockly/tortue/segments.ts';
	import { readExpectedTortueAnswer } from '#lib/ubumark/utils/tortue-answer.ts';
	import { TORTUE_UNAVAILABLE, type TortueNode } from '#lib/ubumark/types/tortue.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';

	// =============================================================================
	// Types
	// =============================================================================

	interface EditeurProps {
		programme: string;
		niveau?: NiveauTortue;
		readonly?: boolean;
		modele?: readonly Segment[] | null;
		attendu?: readonly Segment[] | null;
		verdict?: boolean | null;
		onprogramme?: (lu: TexteLu) => void;
	}

	interface Props {
		node: TortueNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** Réponse attendue de la case (`position | <programme>`) : l'attendu en pointillés */
		expected?: string;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer */
		showErrors?: boolean;
		class?: string;
	}

	// =============================================================================
	// Constantes
	// =============================================================================

	const PROGRAMME_TROP_LONG =
		'Programme trop long : enlève des blocs (une répétition peut en remplacer plusieurs).';

	// =============================================================================
	// Props
	// =============================================================================

	let { node, answer, expected, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	// =============================================================================
	// Variables
	// =============================================================================

	let Editeur = $state<Component<EditeurProps> | null>(null);
	let chargementRate = $state(false);

	/** Programme du geste libre (sans case) */
	let programmeLibre = $state('');

	/** Pourquoi le programme n'est pas une réponse (trop long, bloc inconnu) ; null sinon */
	let refus = $state<string | null>(null);

	/**
	 * Blocs posés, comptés sur le texte du programme (comme le serveur), trop long compris ;
	 * null : pas comptés (illisible, bloc inconnu) ; undefined : rien de touché, ceux du programme
	 * posé à l'ouverture
	 */
	let blocsPoses = $state<number | null | undefined>(undefined);

	// =============================================================================
	// État dérivé
	// =============================================================================

	let spec = $derived(node.spec);
	let modele = $derived(spec?.montrer ? spec.modele : null);
	let verrouille = $derived(answer?.disabled ?? false);
	let verdict = $derived(answer?.isCorrect ?? null);
	/**
	 * Les blocs posés à l'ouverture : la réponse déjà donnée, sinon `départ:` — aussi projeté en
	 * classe (verrouillé sans verdict), jamais une fois jugé (ce n'est pas le programme de l'élève)
	 */
	let programme = $derived.by(() => {
		const donne = answer ? answer.value : programmeLibre;
		if (donne !== '' || verdict !== null) return donne;
		return spec?.depart ?? '';
	});

	let niveau = $derived(spec?.niveau ?? 'base');
	let blocsMax = $derived(spec?.blocsMax ?? null);
	let blocsComptes = $derived(
		blocsPoses === undefined ? nombreDeBlocsTortue(programme, niveau) : blocsPoses
	);

	/** L'attendu, après la validation seulement : la réponse attendue, sinon le bloc */
	let attendu = $derived.by((): Segment[] | null => {
		if (verdict === null) return null;
		const attendue = expected !== undefined ? readExpectedTortueAnswer(expected) : null;
		const reference = attendue?.attendu ?? spec?.attendu ?? null;
		if (reference === null) return null;
		const lu = lireProgrammeTortue(reference, attendue?.niveau ?? niveau);
		return lu.ok ? lu.segments : null;
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	function handleProgramme(lu: TexteLu): void {
		let valeur = '';
		blocsPoses = lu.ok ? nombreDeBlocsTortue(lu.texte, niveau) : null;
		if (!lu.ok) refus = lu.message;
		else if (lu.texte.length > LONGUEUR_MAX_PROGRAMME) refus = PROGRAMME_TROP_LONG;
		else {
			refus = null;
			valeur = lu.texte;
		}
		if (answer) answer.onChange(valeur);
		else programmeLibre = valeur;
	}

	onMount(() => {
		import('#lib/components/blockly/TortueEditeur.svelte')
			.then((module) => (Editeur = module.default))
			.catch(() => (chargementRate = true));
	});
</script>

{#if spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="tortue-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc tortue : question non affichée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="tortue-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{TORTUE_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div
		class="tortue-programme my-2 rounded-md border-2 p-2 {verdict === true
			? 'tortue-juste'
			: verdict === false
				? 'tortue-faux'
				: 'border-transparent'} {className}"
	>
		{#if blocsMax !== null}
			<p class="mb-2 flex flex-wrap justify-between gap-x-4 text-sm">
				<span class="font-medium">Au plus {blocsMax} bloc{blocsMax > 1 ? 's' : ''}</span>
				{#if Editeur && blocsComptes !== null}
					<span
						data-compteur-blocs
						data-depasse={blocsComptes > blocsMax}
						class={blocsComptes > blocsMax
							? 'font-medium text-destructive'
							: 'text-muted-foreground'}
					>
						Blocs : {blocsComptes} / {blocsMax}
					</span>
				{/if}
			</p>
		{/if}
		{#if Editeur}
			<Editeur
				{programme}
				{niveau}
				readonly={verrouille}
				{modele}
				{attendu}
				{verdict}
				onprogramme={handleProgramme}
			/>
			<!-- Aussi après la validation : la réponse est vide, l'élève voit pourquoi -->
			{#if refus}
				<p class="mt-2 text-sm text-destructive" role="alert">{refus}</p>
			{/if}
		{:else}
			<!-- Avant l'éditeur (rendu serveur, chargement) : le quadrillage et la figure -->
			<div class="mx-auto flex max-w-80 flex-col gap-2">
				<TortueCanvas segments={[]} tortue={{ x: 0, y: 0, cap: 0, styloBaisse: true }} {modele} />
				<p class="text-sm text-muted-foreground" role="status">
					{chargementRate
						? 'Les blocs ne se sont pas chargés : recharge la page.'
						: 'Chargement des blocs…'}
				</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.tortue-juste {
		border-color: var(--color-success);
	}

	.tortue-faux {
		border-color: var(--color-destructive);
	}
</style>
