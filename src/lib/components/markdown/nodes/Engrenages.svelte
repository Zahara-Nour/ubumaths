<!--
	Engrenages — bloc ```engrenages
	===============================

	Deux ou trois roues dentées en ligne, chacune avec son repère (outil n° 52,
	`docs/wip/outil-engrenages-progress.md`). Dessin : `gearsScene`, le même
	que le PDF.

	- Dans l'énoncé : figure à l'arrêt.
	- Dans une correction (`readInCorrection`) : bouton « Voir tourner ». Les
	  roues tournent jusqu'au premier retour de tous les repères, avec le
	  nombre de tours de chaque roue ; à la fin, une phrase le redit (lue par
	  les lecteurs d'écran). Mouvement réduit demandé : la phrase seule.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Engrenages
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { EngrenagesNode } from '#lib/ubumark/types/engrenages.ts';
	import { ENGRENAGES_UNAVAILABLE } from '#lib/ubumark/types/engrenages.ts';
	import { gearsReturn, gearsScene, wheelRotation } from '#lib/ubumark/utils/engrenages-moteur.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import { readInCorrection } from '../correction-context';

	interface Props {
		node: EngrenagesNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		/** Forcer l'animation ; sinon, seulement dans une correction */
		animated?: boolean;
		class?: string;
	}

	let { node, showErrors, animated, class: className = '' }: Props = $props();

	/** Un tour de la plus grande roue (la plus lente) */
	const SECONDS_PER_SLOW_TURN = 1.6;
	const MIN_SECONDS = 2;
	const MAX_SECONDS = 20;

	const authoring = readAuthoringErrors();
	const inCorrection = readInCorrection();
	let errorsVisible = $derived(showErrors ?? authoring());
	let canAnimate = $derived(animated ?? inCorrection);

	let scene = $derived(node.wheels ? gearsScene(node.wheels, node.sizeCm) : null);
	let back = $derived(node.wheels ? gearsReturn(node.wheels) : null);
	let durationSeconds = $derived.by(() => {
		if (!back || !node.wheels) return 0;
		const slowest = Math.min(...back.turns);
		return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, slowest * SECONDS_PER_SLOW_TURN));
	});

	/** Avancement de 0 (départ) à 1 (repères revenus) */
	let progress = $state(0);
	let running = $state(false);
	let frame: number | null = null;

	let angleOfA = $derived(back ? progress * 2 * Math.PI * back.turns[0] : 0);
	let turnsDone = $derived(
		back ? back.turns.map((n) => Math.floor(progress * n + 1e-9)) : ([] as number[])
	);

	const plural = (n: number) => `${n} tour${n > 1 ? 's' : ''}`;

	let summary = $derived.by(() => {
		if (!back || !node.wheels) return '';
		const wheels = node.wheels;
		const parts = back.turns.map((n, i) => `${wheels[i].label} a fait ${plural(n)}`);
		return `Les repères sont revenus ensemble à leur place après ${back.teethPassed} dents : ${parts.join(', ')}.`;
	});

	function stop() {
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
		running = false;
	}

	function start() {
		stop();
		if (prefersReducedMotion.current) {
			progress = 1;
			return;
		}
		progress = 0;
		running = true;
		const startedAt = performance.now();
		const tick = (now: number) => {
			progress = Math.min(1, (now - startedAt) / (durationSeconds * 1000));
			if (progress < 1) frame = requestAnimationFrame(tick);
			else stop();
		};
		frame = requestAnimationFrame(tick);
	}

	function handleClick() {
		if (running) {
			stop();
			progress = 0;
		} else {
			start();
		}
	}

	$effect(() => stop);

	// Bloc modifié (aperçu en direct de l'éditeur) : animation remise au départ
	$effect(() => {
		void node.wheels;
		untrack(() => {
			stop();
			progress = 0;
		});
	});

	const toDegrees = (radians: number) => (radians * 180) / Math.PI;
</script>

{#if node.errors.length > 0 || scene === null || node.wheels === null}
	{#if errorsVisible}
		<div class="engrenages-erreur rounded-md border border-destructive p-3 text-sm {className}">
			<p class="font-medium text-destructive">Bloc engrenages : figure non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="engrenages-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{ENGRENAGES_UNAVAILABLE}
		</div>
	{/if}
{:else}
	{@const wheels = node.wheels}
	<figure
		class="engrenages-bloc mx-auto my-2 flex w-fit max-w-full flex-col items-center gap-2 {className}"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {scene.width} {scene.height}"
			width="{node.sizeCm}cm"
			class="h-auto max-w-full"
			role="img"
			aria-label="Engrenages : {wheels
				.map((w) => `roue ${w.label}, ${w.teeth} dents`)
				.join(' ; ')}, chacune avec un repère"
		>
			{#each scene.wheels as wheel, i (i)}
				<g
					transform="rotate({toDegrees(wheelRotation(wheels, i, angleOfA))} {wheel.cx} {wheel.cy})"
				>
					<path
						d={wheel.path}
						class="engrenages-roue"
						stroke-width={scene.width / 400}
						stroke-linejoin="round"
					/>
					<circle
						cx={wheel.cx}
						cy={wheel.cy}
						r={wheel.hubRadius}
						class="engrenages-moyeu"
						stroke-width={scene.width / 400}
					/>
					<circle cx={wheel.mark.x} cy={wheel.mark.y} r={wheel.mark.r} class="engrenages-repere" />
				</g>
				<text
					x={wheel.labelAt.x}
					y={wheel.labelAt.y}
					font-size={scene.fontSize}
					text-anchor="middle"
					dominant-baseline="middle"
					class="engrenages-legende">{wheel.label}</text
				>
			{/each}
		</svg>

		{#if canAnimate && back}
			<div class="flex flex-col items-center gap-1 text-sm">
				<button
					type="button"
					class="rounded-md border border-border px-3 py-1 font-medium text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					onclick={handleClick}
				>
					{running ? 'Arrêter' : progress === 1 ? 'Revoir tourner' : 'Voir tourner'}
				</button>
				{#if running}
					<p class="engrenages-compteur text-muted-foreground tabular-nums" aria-hidden="true">
						{turnsDone.map((n, i) => `${wheels[i].label} : ${plural(n)}`).join(' · ')}
					</p>
				{/if}
				<p class="engrenages-bilan text-center" aria-live="polite">
					{#if progress === 1}{summary}{/if}
				</p>
			</div>
		{/if}
	</figure>
{/if}

<style>
	.engrenages-roue {
		fill: color-mix(in oklab, var(--color-fig-bleu) 18%, var(--color-background));
		stroke: var(--color-foreground);
	}
	.engrenages-moyeu {
		fill: var(--color-background);
		stroke: var(--color-foreground);
	}
	.engrenages-repere {
		fill: var(--color-fig-orange);
	}
	.engrenages-legende {
		fill: var(--color-foreground);
	}
</style>
