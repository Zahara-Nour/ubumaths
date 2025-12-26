<script lang="ts">
	/**
	 * WaitingScreen - Displayed while waiting for opponent to join
	 *
	 * Shows share URL with copy button, loading animation, and cancel option.
	 */

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { cn } from '$lib/utils';
	import { Copy, Check, Loader2 } from 'lucide-svelte';

	interface Props {
		shareUrl: string;
		onCancel: () => void;
		class?: string;
	}

	let { shareUrl, onCancel, class: className = '' }: Props = $props();

	let copied = $state(false);
	let isCancelling = $state(false);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			toaster.success('Lien copie dans le presse-papiers !');

			// Reset copied state after 2 seconds
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (_err) {
			toaster.error('Impossible de copier le lien');
		}
	}

	async function handleCancel() {
		isCancelling = true;
		try {
			await onCancel();
		} finally {
			isCancelling = false;
		}
	}
</script>

<div class={cn('flex min-h-[400px] items-center justify-center p-4', className)}>
	<Card class="w-full max-w-md p-6">
		<!-- Header with loading animation -->
		<div class="mb-6 text-center">
			<div class="mb-4 flex justify-center">
				<div class="relative">
					<Loader2 class="h-16 w-16 animate-spin text-primary" />
					<div class="absolute inset-0 flex items-center justify-center">
						<span class="text-2xl">?</span>
					</div>
				</div>
			</div>
			<h2 class="text-2xl font-bold text-foreground">En attente d'un adversaire...</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Partagez le lien ci-dessous avec votre adversaire
			</p>
		</div>

		<Separator class="my-4" />

		<!-- Share URL section -->
		<div class="mb-6 space-y-3">
			<label class="block text-sm font-medium text-foreground">Lien de partage</label>
			<div class="flex items-stretch gap-2">
				<div
					class="flex-1 overflow-hidden rounded-md border bg-muted/50 px-3 py-2 text-sm text-foreground"
				>
					<span class="block truncate">{shareUrl}</span>
				</div>
				<Button
					variant="outline"
					size="icon"
					onclick={copyToClipboard}
					class={cn('shrink-0', copied && 'bg-green-100 dark:bg-green-900')}
					aria-label="Copier le lien"
				>
					{#if copied}
						<Check class="h-4 w-4 text-green-600" />
					{:else}
						<Copy class="h-4 w-4" />
					{/if}
				</Button>
			</div>
		</div>

		<!-- Waiting animation dots -->
		<div class="mb-6 flex justify-center gap-2">
			<span class="waiting-dot h-3 w-3 rounded-full bg-primary"></span>
			<span class="waiting-dot h-3 w-3 rounded-full bg-primary" style="animation-delay: 0.2s"
			></span>
			<span class="waiting-dot h-3 w-3 rounded-full bg-primary" style="animation-delay: 0.4s"
			></span>
		</div>

		<!-- Info box -->
		<div class="mb-6 rounded-lg bg-muted/30 p-4">
			<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
				<span aria-hidden="true">?</span>
				<span>Comment jouer</span>
			</h3>
			<ul class="space-y-1 text-xs text-muted-foreground">
				<li>- Chaque joueur recoit un nombre secret</li>
				<li>- Posez des questions pour deviner le nombre adverse</li>
				<li>- Repondez honnetement aux questions</li>
				<li>- Le premier a deviner gagne !</li>
			</ul>
		</div>

		<Separator class="my-4" />

		<!-- Cancel button -->
		<Button onclick={handleCancel} variant="outline" class="w-full" disabled={isCancelling}>
			{#if isCancelling}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Annulation...
			{:else}
				Annuler et quitter
			{/if}
		</Button>
	</Card>
</div>

<style>
	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: translateY(0);
			opacity: 0.5;
		}
		40% {
			transform: translateY(-8px);
			opacity: 1;
		}
	}

	.waiting-dot {
		animation: bounce 1.4s ease-in-out infinite;
	}
</style>
