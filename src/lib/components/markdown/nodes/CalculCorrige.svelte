<!--
	CalculCorrige.svelte
	====================

	Corrigé d'une question « programme de calcul » (bloc ```calcul), sans Blockly : les
	programmes écrits en texte et le tableau nombre → résultat sur les nombres d'essai.

	- Avec la réponse de l'élève : son programme, un programme juste, puis le tableau (ce que
	  son programme affiche, ce qu'il fallait afficher) ; les lignes fausses sont marquées.
	- Sans réponse : le programme de référence et ce qu'il affiche.
	- Référence inconnue (énoncé masqué d'une évaluation notée, `attendu: ?`) : jamais d'attendu
	  inventé, la colonne de l'élève seule.

	@module components/markdown/nodes/CalculCorrige
-->
<script lang="ts">
	import { executerCalcul } from '$lib/shared/blockly/calcul/interpreteur';
	import { ecrireNombreCalcul, texteVersEtatCalcul } from '$lib/shared/blockly/calcul/notation';
	import {
		lireProgrammeCalcul,
		memesAffichages,
		RIEN_AFFICHE
	} from '$lib/shared/blockly/calcul/jugement';
	import { readExpectedCalculAnswer } from '$lib/ubumark/utils/calcul-answer';
	import { CALCUL_UNAVAILABLE, type CalculNode } from '$lib/ubumark/types/calcul';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		node: CalculNode;
		/** Programme de l'élève (notation texte) ; null : le corrigé seul */
		answer: string | null;
		/** Verdict de la réponse (sans réponse : ignoré) */
		correct?: boolean;
		/** Réponse attendue de la case (`<essais> | <programme>`), prime sur le bloc */
		expected?: string;
	}

	/** Ce qu'un programme affiche pour un nombre ; null : il s'est arrêté sur une erreur */
	type Cellule = number[] | null;

	interface Ligne {
		nombre: number;
		eleve: Cellule;
		reference: Cellule;
		juste: boolean;
	}

	// =============================================================================
	// Props
	// =============================================================================

	let { node, answer, correct = false, expected }: Props = $props();

	// =============================================================================
	// État dérivé
	// =============================================================================

	let spec = $derived(node.spec);
	let lu = $derived(expected !== undefined ? readExpectedCalculAnswer(expected) : null);
	let reference = $derived(lu?.attendu ?? spec?.attendu ?? null);
	let essais = $derived(lu?.essais ?? spec?.essais ?? []);

	/** Pourquoi le programme de l'élève s'arrête (premier essai en erreur), ou n'affiche rien */
	let messageEleve = $derived.by((): string | null => {
		if (answer === null) return null;
		const sorties = lireProgrammeCalcul(answer, essais);
		if (!sorties.ok) return sorties.message;
		return sorties.sorties.every((s) => s.length === 0) ? RIEN_AFFICHE : null;
	});

	let lignes = $derived.by((): Ligne[] => {
		const eleve = answer === null ? null : cellules(answer);
		const attendu = reference === null ? null : cellules(reference);
		return essais.map((nombre, i) => {
			const e = eleve?.[i] ?? null;
			const r = attendu?.[i] ?? null;
			return {
				nombre,
				eleve: e,
				reference: r,
				juste: e !== null && r !== null && memesAffichages(e, r)
			};
		});
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	/** Ce que le programme affiche pour chaque essai ; programme illisible : rien */
	function cellules(texte: string): Cellule[] | null {
		const etat = texteVersEtatCalcul(texte);
		if (!etat.ok) return null;
		return essais.map((nombre) => {
			const resultat = executerCalcul(etat.etat, nombre);
			return resultat.ok ? resultat.affichages : null;
		});
	}

	function ecrire(cellule: Cellule): string {
		if (cellule === null) return 'erreur';
		if (cellule.length === 0) return 'rien';
		return cellule.map(ecrireNombreCalcul).join(' ; ');
	}
</script>

{#if spec === null}
	<div
		class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
	>
		{CALCUL_UNAVAILABLE}
	</div>
{:else}
	<div class="calcul-corrige flex max-w-xl flex-col gap-2 text-sm">
		{#if answer !== null}
			<p>
				<span class="text-muted-foreground">Ton programme :</span>
				<code class="calcul-code">{answer}</code>
			</p>
		{/if}
		{#if reference !== null}
			<p>
				<span class="text-muted-foreground">Un programme juste :</span>
				<code class="calcul-code">{reference}</code>
			</p>
		{/if}
		{#if essais.length > 0 && (answer !== null || reference !== null)}
			<table class="calcul-tableau w-auto border-collapse">
				<caption class="sr-only">Ce que les programmes affichent pour chaque nombre</caption>
				<thead>
					<tr>
						<th scope="col">Nombre choisi</th>
						{#if answer !== null}
							<th scope="col">Ton programme affiche</th>
						{/if}
						{#if reference !== null}
							<th scope="col">{answer !== null ? 'Il fallait afficher' : 'Le programme affiche'}</th
							>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each lignes as ligne (ligne.nombre)}
						<tr data-juste={answer !== null && reference !== null ? ligne.juste : undefined}>
							<th scope="row">{ecrireNombreCalcul(ligne.nombre)}</th>
							{#if answer !== null}
								<td class={reference !== null && !ligne.juste ? 'calcul-cellule-fausse' : ''}>
									{ecrire(ligne.eleve)}
								</td>
							{/if}
							{#if reference !== null}
								<td>{ecrire(ligne.reference)}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if messageEleve !== null && !correct}
			<p class="text-destructive">{messageEleve}</p>
		{/if}
	</div>
{/if}

<style>
	.calcul-code {
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	.calcul-tableau th,
	.calcul-tableau td {
		border: 1px solid var(--color-border);
		padding: 0.25rem 0.75rem;
		text-align: center;
	}

	.calcul-tableau thead th {
		font-weight: 500;
	}

	.calcul-cellule-fausse {
		color: var(--color-destructive);
		font-weight: 600;
	}
</style>
