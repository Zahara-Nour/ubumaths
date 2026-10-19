<!--
	QrBlock — bloc ```qr
	====================

	QR code placé par l'auteur dans un document (lot 2 des QR codes,
	`docs/wip/qr-codes-phase0.md`) : le QR, la légende, et l'adresse en lien
	(sur un ordinateur, on ne scanne pas son propre écran).

	Composant LÉGER, dans le chunk des pages Markdown : le calcul de la matrice
	(`uqr`) est chargé À LA DEMANDE, seulement quand une page contient un QR.

	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).
	- Adresse trop longue pour un QR lisible : traitée comme une erreur.
	- QR stylé (`qrDrawing`, le même dessin que le bouton et les PDF), fond
	  blanc quel que soit le thème : un QR inversé se lit mal.

	@module components/markdown/nodes/QrBlock
-->
<script lang="ts">
	import type { QrNode } from '$lib/ubumark/types/qr';
	import { QR_UNAVAILABLE } from '$lib/ubumark/types/qr';
	import { SITE_URL } from '$lib/seo/site';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: QrNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	/** Un site extérieur s'ouvre dans un nouvel onglet, sans accès à la page d'origine */
	let external = $derived(node.url !== null && !node.url.startsWith(`${SITE_URL}/`));

	/** L'adresse affichée, sans le schéma */
	let shownUrl = $derived(node.url?.replace(/^https:\/\//, '') ?? '');

	const qrModule = import('$lib/qr/qr-code');
</script>

{#snippet failure(messages: string[])}
	{#if errorsVisible}
		<div
			class="qr-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc qr : QR code non dessiné</p>
			<ul class="mt-1 list-disc pl-5">
				{#each messages as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="qr-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{QR_UNAVAILABLE}
		</div>
	{/if}
{/snippet}

{#if node.errors.length > 0 || node.url === null}
	{@render failure(node.errors.map((e) => e.message))}
{:else}
	{#await qrModule}
		<div
			class="qr-chargement mx-auto my-2 rounded-md bg-muted/40 {className}"
			style:width="{node.sizeCm}cm"
			style:aspect-ratio="1"
			aria-busy="true"
			aria-label="QR code en cours de chargement"
		></div>
	{:then { encodeQr, qrDrawing, QR_COLORS, QR_TOO_LONG_MESSAGE }}
		{@const qr = encodeQr(node.url)}
		{#if qr === null}
			{@render failure([QR_TOO_LONG_MESSAGE])}
		{:else}
			{@const drawing = qrDrawing(qr)}
			<figure
				class="qr-bloc mx-auto my-2 flex w-fit max-w-full flex-col items-center gap-1 {className}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 {qr.size} {qr.size}"
					width="{node.sizeCm}cm"
					height="{node.sizeCm}cm"
					role="img"
					aria-label="QR code vers {node.url}"
					class="max-w-full"
				>
					<rect width={qr.size} height={qr.size} fill={QR_COLORS.background} />
					<path d={drawing.modules} fill={QR_COLORS.modules} />
					<path d={drawing.eyeRings} fill={QR_COLORS.eyes} fill-rule="evenodd" />
					<path d={drawing.eyePupils} fill={QR_COLORS.eyes} />
					<path d={drawing.logoBackdrop} fill={QR_COLORS.background} />
					<path
						d={drawing.gidouille}
						fill="none"
						stroke={QR_COLORS.gidouille}
						stroke-width={drawing.gidouilleWidth}
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<figcaption class="flex flex-col items-center text-center text-sm">
					{#if node.caption}<span>{node.caption}</span>{/if}
					{#if external}
						<a
							href={node.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs break-all text-primary underline">{shownUrl}</a
						>
					{:else}
						<a href={node.url} class="text-xs break-all text-primary underline">{shownUrl}</a>
					{/if}
				</figcaption>
			</figure>
		{/if}
	{:catch}
		{@render failure([QR_UNAVAILABLE])}
	{/await}
{/if}
