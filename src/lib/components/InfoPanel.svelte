<!--
	Bouton « Infos et confidentialité » de l'accueil et son panneau (décision de
	David, 2026-10-06). Il remplace l'ancien pied de page : quatre liens (à propos,
	données personnelles, CGU, éditeur), le copyright et la version.

	Une seule fenêtre Dialog (bits-ui), responsive : sous `sm`, elle est collée en
	bas de l'écran et monte du bas, comme un Sheet ; au-delà, elle est centrée.
	Bits-ui piège le focus, ferme sur Échap et rend le focus au bouton.
-->
<script lang="ts">
	// Imports
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import XIcon from '@lucide/svelte/icons/x';
	import * as Dialog from '$lib/components/ui/dialog';
	import { getVersion } from '$lib/utils/version';

	// Types

	interface InfoLink {
		path: '/a-propos' | '/legal/confidentialite' | '/legal/cgu' | '/legal/mentions-legales';
		label: string;
		hint?: string;
	}

	// Constants

	const LINKS: InfoLink[] = [
		{ path: '/a-propos', label: 'Chiphre, c’est quoi ?' },
		{
			path: '/legal/confidentialite',
			label: 'Données personnelles',
			hint: 'Ce que Chiphre collecte, pourquoi, et vos droits (RGPD)'
		},
		{
			path: '/legal/cgu',
			label: 'Conditions d’utilisation (CGU)',
			hint: 'Ce qui est permis, la modération, les responsabilités'
		},
		{
			path: '/legal/mentions-legales',
			label: 'Qui édite Chiphre',
			hint: 'L’éditeur, l’hébergeur, les crédits (mentions légales)'
		}
	];

	const YEAR = new Date().getFullYear();

	// Variables

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		class="rounded-md px-3 py-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden dark:text-foreground"
	>
		Infos et confidentialité
	</Dialog.Trigger>
	<Dialog.Content
		showCloseButton={false}
		class="max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=open]:zoom-in-100 gap-0 p-0 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[env(safe-area-inset-bottom)] sm:max-w-md"
	>
		<div class="flex items-center justify-between border-b border-border px-5 py-4">
			<Dialog.Title class="text-base font-semibold">Infos et confidentialité</Dialog.Title>
			<Dialog.Close
				class="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
			>
				<XIcon class="size-4" aria-hidden="true" />
				<span class="sr-only">Fermer</span>
			</Dialog.Close>
		</div>

		<nav aria-label="Informations sur Chiphre">
			<ul class="flex flex-col py-2">
				{#each LINKS as link (link.path)}
					<li>
						<a
							href={resolve(link.path)}
							onclick={() => (open = false)}
							class="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-hidden"
						>
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="text-sm font-medium text-foreground">{link.label}</span>
								{#if link.hint}
									<span class="text-xs text-muted-foreground">{link.hint}</span>
								{/if}
							</span>
							<ChevronRight
								class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
								aria-hidden="true"
							/>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div
			class="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground"
		>
			<span>© {YEAR} Chiphre</span>
			<span>{getVersion()}</span>
		</div>
	</Dialog.Content>
</Dialog.Root>
