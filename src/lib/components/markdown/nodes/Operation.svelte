<!--
	Operation — bloc ```operation
	=============================

	Opération posée en colonnes (addition, soustraction ; phase 0 :
	`docs/wip/operations-posees-progress.md`). Dessinée depuis
	`buildOperationScene`, la même scène que le PDF.

	- Grille HTML (pas SVG) : les cases de saisie du lot 1b s'y logeront.
	- Carreaux de cahier, une seule couleur d'accent (les cases à remplir) ;
	  couleurs du thème uniquement.
	- Cases à remplir : AUCUNE valeur attendue dans le DOM (ni texte, ni
	  attribut), sinon la réponse se lit dans la page.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Operation
-->
<script lang="ts">
	import {
		OPERATION_ARIA_LABEL,
		OPERATION_UNAVAILABLE,
		type OperationNode
	} from '$lib/ubumark/types/operation';
	import { buildOperationScene, type OperationMark } from '$lib/ubumark/utils/operation-scene';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: OperationNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const SIGN = { '+': '+', '-': '−' } as const;

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let scene = $derived(node.spec === null ? null : buildOperationScene(node.spec));

	/** Texte visible d'une petite écriture : jamais l'attendu d'une case */
	function markText(mark: OperationMark): string {
		return mark.blank ? '' : mark.text;
	}
</script>

{#if scene === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="operation-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc opération : opération non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="operation-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{OPERATION_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div class="operation-bloc my-2 flex justify-center {className}">
		<div
			class="operation-grille"
			role="group"
			aria-label={OPERATION_ARIA_LABEL}
			style:--operation-colonnes={scene.columns + 1}
		>
			<!-- Au-dessus : retenues (addition), nouvelles valeurs (cassage) -->
			<span class="operation-carreau"></span>
			{#each scene.above as mark, c (c)}
				<span class="operation-carreau operation-dessus">
					{#if mark}
						<span class="operation-petit" class:operation-case-petite={mark.blank}
							>{markText(mark)}</span
						>
					{/if}
				</span>
			{/each}

			{#each scene.terms as row, r (r)}
				{@const last = r === scene.terms.length - 1}
				<span class="operation-carreau operation-signe" class:operation-trait={last}
					>{last ? SIGN[scene.operator] : ''}</span
				>
				{#each row as cell, c (c)}
					<span class="operation-carreau" class:operation-trait={last}>
						{#if cell.mark}
							<span class="operation-retenue" class:operation-case-petite={cell.mark.blank}
								>{markText(cell.mark)}</span
							>
						{/if}
						<span class:operation-barre={cell.struck}>{cell.digit}</span>
						{#if cell.comma}<span class="operation-virgule">,</span>{/if}
					</span>
				{/each}
			{/each}

			<span class="operation-carreau"></span>
			{#each scene.result as cell, c (c)}
				<span class="operation-carreau">
					{#if cell.blank}
						<span class="operation-case"></span>
					{:else}
						{cell.digit}
					{/if}
					{#if cell.comma}<span class="operation-virgule">,</span>{/if}
				</span>
			{/each}
		</div>
	</div>
{/if}

<style>
	.operation-grille {
		display: grid;
		grid-template-columns: repeat(var(--operation-colonnes), minmax(1.25rem, 2.25rem));
		max-width: 100%;
		font-size: 1.35rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	/* Carreaux de cahier, sur les tokens du thème */
	.operation-carreau {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		border: 1px solid var(--color-border);
		margin: 0 -1px -1px 0;
		color: var(--color-foreground);
	}

	.operation-signe {
		font-weight: 600;
	}

	/* Le trait de l'opération, sous le dernier terme */
	.operation-trait {
		border-bottom: 2px solid var(--color-foreground);
	}

	.operation-dessus {
		align-items: flex-end;
	}

	.operation-petit,
	.operation-retenue {
		font-size: 0.6em;
		color: var(--color-muted-foreground);
	}

	/* Petit 1 de la compensation : en haut à gauche du chiffre */
	.operation-retenue {
		position: absolute;
		top: 0.1em;
		left: 0.15em;
	}

	.operation-case-petite {
		display: inline-block;
		min-width: 0.9em;
		min-height: 0.9em;
		border: 1px dashed var(--color-muted-foreground);
		border-radius: 2px;
	}

	.operation-barre {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
	}

	/* Virgule posée sur le trait de droite du chiffre des unités */
	.operation-virgule {
		position: absolute;
		z-index: 1;
		right: -0.16em;
		bottom: 0.12em;
		font-size: 1.2em;
		font-weight: 700;
	}

	/* La seule couleur d'accent : les cases du résultat */
	.operation-case {
		width: 78%;
		height: 78%;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
	}
</style>
