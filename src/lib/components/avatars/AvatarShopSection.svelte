<!--
	AvatarShopSection
	=================

	Onglet « Avatars » du Marché : la boutique d'avatars de l'élève (décisions de
	David du 2026-11-06, docs/wip/boutique-avatars-progress.md, comportements 1 à 3,
	5, 6, 8 à 12).

	- Catalogue rangé par famille : image, nom, prix, état « acheté » / « porté ».
	- Acheter (consentement parental exigé, comme la boutique VIP) n'équipe pas
	  l'avatar ; porter et retirer sont gratuits et restent possibles sans
	  consentement.
	- Après un port ou un retrait, la page est rechargée (`invalidateAll`) : l'en-tête
	  relit le profil et montre le nouvel avatar aussitôt.

	La base tient les règles (solde, possession, fenêtre de vente) : ici, seulement
	l'affichage et les messages de refus rendus par le serveur.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ConsentButton from '$lib/components/ConsentButton.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import { CircleUserRound } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { syncGidouilles } from '$lib/utils/cache-sync';
	import { AVATAR_FAMILIES, type AvatarShop, type ShopAvatar } from '$lib/avatars/shop';
	import type { CacheContext } from '$lib/types/cache-context';

	interface Props {
		/** Profil de l'élève (pour l'aperçu de son avatar actuel) */
		avatarUrl: string | null;
		firstname: string | null;
		lastname: string | null;
	}

	let { avatarUrl, firstname, lastname }: Props = $props();

	// Constantes
	const cacheContext: CacheContext = { type: 'student' };
	const untilFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

	// State
	let shop = $state<AvatarShop | null>(null);
	let loadError = $state<string | null>(null);
	/** Clé de l'avatar dont l'action est en cours (bloque le double clic) */
	let busyKey = $state<string | null>(null);

	let balance = $derived(studentCache.getRewardsSync()?.gidouilles ?? 0);

	let sections = $derived(
		AVATAR_FAMILIES.map((family) => ({
			...family,
			avatars: (shop?.avatars ?? []).filter((a) => a.family === family.id)
		})).filter((section) => section.avatars.length > 0)
	);

	// Functions
	async function load() {
		loadError = null;
		try {
			const response = await fetch('/api/student/avatars');
			if (!response.ok) throw new Error(await messageOf(response));
			shop = (await response.json()) as AvatarShop;
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Boutique indisponible.';
		}
	}

	async function messageOf(response: Response): Promise<string> {
		const body: unknown = await response.json().catch(() => null);
		if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string')
			return body.message;
		return 'Action impossible pour l’instant : réessaie dans un moment.';
	}

	async function post(path: string, avatar: string | null): Promise<Response> {
		return fetch(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ avatar })
		});
	}

	async function buy(avatar: ShopAvatar) {
		if (busyKey) return;
		busyKey = avatar.key;
		try {
			const response = await post('/api/student/avatars/buy', avatar.key);
			if (!response.ok) {
				toaster.error(await messageOf(response));
				return;
			}
			syncGidouilles(cacheContext, -avatar.price);
			toaster.success(`${avatar.name} rejoint ta collection.`);
			await load();
		} finally {
			busyKey = null;
		}
	}

	async function wear(avatar: ShopAvatar | null) {
		if (busyKey) return;
		busyKey = avatar?.key ?? 'retirer';
		try {
			const response = await post('/api/student/avatars/wear', avatar?.key ?? null);
			if (!response.ok) {
				toaster.error(await messageOf(response));
				return;
			}
			toaster.success(avatar ? `Tu portes ${avatar.name}.` : 'Avatar retiré.');
			await Promise.all([load(), invalidateAll()]);
		} finally {
			busyKey = null;
		}
	}

	function missing(avatar: ShopAvatar): number {
		return Math.max(0, Math.ceil(avatar.price - balance));
	}

	// Chargement unique à l'ouverture de l'onglet (rien à suivre)
	onMount(() => {
		load();
		studentCache.getRewards();
	});
</script>

<div class="space-y-8">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<UserAvatar
				avatar_url={avatarUrl}
				role="student"
				{firstname}
				{lastname}
				class="size-14"
				loading="eager"
			/>
			<div>
				<h2 class="flex items-center gap-2 text-2xl font-bold">
					<CircleUserRound class="h-6 w-6 text-primary" />
					Avatars
				</h2>
				<p class="text-sm text-muted-foreground">
					Achetés une fois pour toutes ; tu changes d’avatar quand tu veux, gratuitement.
				</p>
			</div>
		</div>
		{#if shop?.worn}
			<Button variant="outline" disabled={busyKey !== null} onclick={() => wear(null)}>
				Retirer mon avatar
			</Button>
		{/if}
	</div>

	{#if loadError}
		<div class="rounded-lg border border-destructive/40 p-4 text-sm">
			<p>{loadError}</p>
			<Button variant="outline" size="sm" class="mt-3" onclick={load}>Réessayer</Button>
		</div>
	{:else if !shop}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
			{#each { length: 5 } as _, i (i)}
				<Skeleton class="h-56 rounded-xl" />
			{/each}
		</div>
	{:else if sections.length === 0}
		<p class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
			Les premiers avatars arrivent bientôt au Marché.
		</p>
	{:else}
		{#each sections as section (section.id)}
			<section class="space-y-3">
				<h3 class="text-lg font-semibold">{section.label}</h3>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					{#each section.avatars as avatar (avatar.key)}
						{@const isWorn = shop.worn === avatar.key}
						<article
							class="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center shadow-sm"
							class:ring-2={isWorn}
							class:ring-primary={isWorn}
						>
							<img
								src={avatar.imagePath}
								alt=""
								loading="lazy"
								class="size-24 rounded-full bg-muted object-cover"
							/>
							<p class="leading-tight font-medium">{avatar.name}</p>
							{#if avatar.availableUntil && avatar.onSale && !avatar.owned}
								<p class="text-xs text-muted-foreground">
									jusqu’au {untilFormat.format(new Date(avatar.availableUntil))}
								</p>
							{/if}

							{#if isWorn}
								<Badge>Porté</Badge>
							{:else if avatar.owned}
								<Button
									size="sm"
									variant="secondary"
									class="w-full"
									disabled={busyKey !== null}
									onclick={() => wear(avatar)}
								>
									Porter
								</Button>
							{:else}
								<span class="flex items-center gap-1 text-sm font-semibold">
									{avatar.price}
									<img src={gidouilleImage} alt="gidouilles" class="h-4 w-4" />
								</span>
								<ConsentButton
									size="sm"
									class="w-full"
									disabled={busyKey !== null || missing(avatar) > 0}
									onclick={() => buy(avatar)}
								>
									Acheter
								</ConsentButton>
								{#if missing(avatar) > 0}
									<p class="text-xs text-muted-foreground">
										Il te manque {missing(avatar)} gidouille{missing(avatar) > 1 ? 's' : ''}.
									</p>
								{/if}
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
