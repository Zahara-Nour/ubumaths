<!--
	RobotCorrige.svelte
	===================

	Corrigé d'un robot à produire (bloc ```robot, `produire: oui`) : copie corrigée, verso de la
	carte flash, bonne réponse affichée.

	- Avec la réponse de l'élève : son trajet sur le quadrillage (vert s'il arrive, rouge
	  sinon, une croix où il sort ou bute), pourquoi c'est faux, son code ; puis un code juste,
	  son trajet en pointillés.
	- Sans réponse : le trajet d'un code juste et ce code.
	- Le code juste vient de la réponse attendue de la case (`<scène> | <code>`) : on n'en
	  montre que le CODE (`readExpectedRobotAnswer().solution`), jamais la chaîne entière.

	@module components/markdown/nodes/RobotCorrige
-->
<script lang="ts">
	import {
		ROBOT_AILLEURS,
		ROBOT_INTERDITE,
		ROBOT_SORTIE,
		readExpectedRobotAnswer
	} from '#lib/ubumark/utils/robot-answer.ts';
	import { ecrireCode, lireCode, simuler } from '#lib/ubumark/utils/robot-moteur.ts';
	import { ROBOT_UNAVAILABLE, type RobotNode } from '#lib/ubumark/types/robot.ts';
	import RobotQuadrillage from './RobotQuadrillage.svelte';

	interface Props {
		node: RobotNode;
		/** Code de l'élève (notation texte) ; null : le corrigé seul */
		answer: string | null;
		/** Verdict de la réponse (sans réponse : ignoré) */
		correct?: boolean;
		/** Réponse attendue de la case (`<scène> | <code>`) */
		expected?: string;
	}

	let { node, answer, correct = false, expected }: Props = $props();

	let spec = $derived(node.spec);

	/** Un code juste : celui de la réponse attendue, sinon le plus court calculé par le bloc */
	let reference = $derived.by((): string | null => {
		const lu = expected !== undefined ? readExpectedRobotAnswer(expected) : null;
		if (lu) return lu.solution;
		return spec?.solution ? ecrireCode(spec.solution, spec.codage) : null;
	});
	let cheminReference = $derived.by(() => {
		if (reference === null || spec === null) return null;
		const lu = lireCode(reference, spec.codage);
		return lu.ok ? simuler(spec, lu.instructions).chemin : null;
	});
	let eleve = $derived.by(() => {
		if (answer === null || spec === null) return null;
		const lu = lireCode(answer, spec.codage);
		if (!lu.ok) return { trajet: null, message: lu.message };
		const trajet = simuler(spec, lu.instructions);
		const message =
			trajet.fin === 'sortie'
				? ROBOT_SORTIE
				: trajet.fin === 'interdite'
					? ROBOT_INTERDITE
					: trajet.fin === 'ailleurs'
						? ROBOT_AILLEURS
						: null;
		return { trajet, message };
	});
</script>

{#if spec === null}
	<div
		class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
	>
		{ROBOT_UNAVAILABLE}
	</div>
{:else}
	<div class="robot-corrige mx-auto flex w-full max-w-md flex-col gap-2">
		{#if eleve !== null}
			<RobotQuadrillage
				scene={spec}
				chemin={eleve.trajet?.chemin ?? null}
				bute={eleve.trajet?.bute ?? null}
				verdict={correct}
				attendu={correct ? null : cheminReference}
				label="Le trajet de ton code{correct ? '' : ', et celui d’un code juste en pointillés'}"
			/>
			{#if !correct && eleve.message}
				<p class="text-sm text-destructive">{eleve.message}</p>
			{/if}
			<p class="text-sm">
				<span class="text-muted-foreground">Ton code :</span>
				<code class="robot-code">{answer}</code>
			</p>
		{:else}
			<RobotQuadrillage scene={spec} chemin={cheminReference} label="Le trajet d’un code juste" />
		{/if}
		{#if reference !== null}
			<p class="text-sm">
				<span class="text-muted-foreground">Un code juste :</span>
				<code class="robot-code">{reference}</code>
			</p>
		{/if}
	</div>
{/if}

<style>
	.robot-code {
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
</style>
