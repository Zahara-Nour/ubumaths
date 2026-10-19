<script lang="ts">
	/**
	 * Le bouton « QR code » d'une page ou d'une ressource, et sa fenêtre : le QR
	 * en grand (projetable), l'adresse en clair, Copier, Télécharger PNG et SVG.
	 *
	 * L'adresse du QR est TOUJOURS celle du domaine canonique (`canonicalUrl`) :
	 * un QR imprimé depuis un aperçu ou le serveur local doit mener au site.
	 * Phase 0 : `docs/wip/qr-codes-phase0.md`.
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import { canonicalUrl } from '$lib/seo/site';
	import { encodeQr, qrFileName, qrSvg, type QrMatrix } from '$lib/qr/qr-code';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		/** L'adresse à encoder (relative ou absolue), ou `null` si elle n'existe pas encore */
		url: string | null;
		/** La ressource, telle qu'on la nomme : « QR code de <label> », nom du fichier */
		label: string;
		/** Pourquoi il n'y a pas d'adresse (bouton indisponible) */
		unavailableReason?: string;
		/** L'adresse porte un jeton de partage : prévenir qu'un QR imprimé ne se reprend pas */
		containsToken?: boolean;
		/** Bouton avec son texte (« QR code ») ou icône seule */
		variant?: 'text' | 'icon';
		size?: 'default' | 'sm';
	}

	// Constantes

	/** Pixels par module du PNG : un QR de 77 modules fait 770 px, assez pour une diapositive */
	const PNG_MODULE_PX = 10;

	let {
		url,
		label,
		unavailableReason,
		containsToken = false,
		variant = 'text',
		size = 'sm'
	}: Props = $props();

	let open = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let addressInput: HTMLInputElement | undefined = $state();

	const address = $derived(url === null ? null : canonicalUrl(url));
	const qr = $derived(address === null ? null : encodeQr(address));
	const alt = $derived(address === null ? '' : `QR code vers ${address}`);
	const svg = $derived(qr === null ? null : qrSvg(qr, alt));
	const imageSrc = $derived(
		svg === null ? null : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
	);
	const disabled = $derived(address === null);
	const name = $derived(`QR code de ${label}`);

	// Functions

	function handleOpenChange(next: boolean) {
		// Sans adresse, la fenêtre ne s'ouvre pas : le bouton dit déjà pourquoi
		open = next && !disabled;
		copied = false;
	}

	async function copyAddress() {
		if (address === null) return;
		try {
			await navigator.clipboard.writeText(address);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			// Presse-papiers refusé : l'adresse est sélectionnée, prête pour Cmd/Ctrl+C
			addressInput?.select();
			toaster.info('Adresse sélectionnée : copie-la avec Ctrl+C ou Cmd+C');
		}
	}

	function saveBlob(blob: Blob, fileName: string) {
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = fileName;
		document.body.append(link);
		link.click();
		link.remove();
		// Laisser au navigateur le temps de lancer le téléchargement
		setTimeout(() => URL.revokeObjectURL(href), 1000);
	}

	function downloadSvg() {
		if (svg === null) return;
		saveBlob(new Blob([svg], { type: 'image/svg+xml' }), qrFileName(label, 'svg'));
	}

	function drawPng(matrix: QrMatrix): Promise<Blob | null> {
		const canvas = document.createElement('canvas');
		canvas.width = matrix.size * PNG_MODULE_PX;
		canvas.height = matrix.size * PNG_MODULE_PX;
		const context = canvas.getContext('2d');
		if (!context) return Promise.resolve(null);
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = '#000000';
		matrix.data.forEach((row, y) => {
			row.forEach((dark, x) => {
				if (dark)
					context.fillRect(x * PNG_MODULE_PX, y * PNG_MODULE_PX, PNG_MODULE_PX, PNG_MODULE_PX);
			});
		});
		return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
	}

	async function downloadPng() {
		if (qr === null) return;
		const blob = await drawPng(qr);
		if (blob === null) {
			toaster.error('Impossible de fabriquer l’image PNG : télécharge le SVG.');
			return;
		}
		saveBlob(blob, qrFileName(label, 'png'));
	}
</script>

<Dialog.Root bind:open={() => open, handleOpenChange}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size={variant === 'icon' ? 'icon' : size}
				aria-label={name}
				aria-disabled={disabled ? 'true' : undefined}
				title={disabled && unavailableReason ? `${name} : ${unavailableReason}` : name}
			>
				<QrCode class="h-4 w-4" aria-hidden="true" />
				{#if variant === 'text'}<span class="ml-2">QR code</span>{/if}
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>{name}</Dialog.Title>
			<Dialog.Description
				>À projeter, à scanner avec un téléphone, ou à télécharger.</Dialog.Description
			>
		</Dialog.Header>

		{#if imageSrc !== null}
			<!-- Noir sur blanc quel que soit le thème : un QR inversé se lit mal -->
			<img class="qr" src={imageSrc} {alt} />
		{:else}
			<p class="text-sm text-destructive" role="alert">
				Ce lien est trop long pour un QR code lisible. Copie le lien à la place.
			</p>
		{/if}

		{#if address !== null}
			<div class="flex items-center gap-2">
				<input
					bind:this={addressInput}
					class="min-w-0 flex-1 truncate rounded border bg-muted px-2 py-1 font-mono text-xs"
					value={address}
					readonly
					aria-label="Adresse du QR code"
				/>
				<Button size="sm" variant="outline" onclick={copyAddress}>
					{#if copied}
						<Check class="mr-2 h-4 w-4" aria-hidden="true" />Copié
					{:else}
						<Copy class="mr-2 h-4 w-4" aria-hidden="true" />Copier
					{/if}
				</Button>
			</div>
		{/if}

		{#if containsToken}
			<p class="text-sm text-amber-700 dark:text-amber-500">
				Ce QR contient le jeton de partage : une fois imprimé, il ne se reprend pas. Pour qu'il ne
				marche plus, retire le lien de partage.
			</p>
		{/if}

		{#if qr !== null}
			<div class="flex flex-wrap gap-2">
				<Button size="sm" onclick={downloadPng}>
					<Download class="mr-2 h-4 w-4" aria-hidden="true" />Télécharger (PNG)
				</Button>
				<Button size="sm" variant="outline" onclick={downloadSvg}>
					<Download class="mr-2 h-4 w-4" aria-hidden="true" />Télécharger (SVG)
				</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.qr {
		display: block;
		width: min(100%, 22rem);
		aspect-ratio: 1;
		margin-inline: auto;
		background: #ffffff;
		image-rendering: pixelated;
	}
</style>
