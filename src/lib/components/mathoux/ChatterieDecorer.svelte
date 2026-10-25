<script lang="ts">
	/**
	 * « Décorer » un Mathou de la Chatterie (lots B, C et D des accessoires,
	 * décisions de David du 2026-10-24 et du 2026-10-25) : quatre rangées,
	 * « Panse » (six décorations), « Cou » (quatre colliers), « Yeux » (cinq
	 * lunettes) et « Tête » (cinq chapeaux), dessinées sur CE Mathou — avec ce
	 * qu'il porte aux autres emplacements, tous se cumulant —, leur prix,
	 * « Achetée » ou « Portée par … ». Lunettes et chapeaux se montrent sur le
	 * Mathou éveillé : en sieste, il les retire.
	 *
	 * - pas encore achetée : « Acheter » (l'achat la pose sur ce Mathou) ; sans
	 *   consentement parental, le bouton est grisé (comme la boutique VIP) ; solde
	 *   insuffisant : « Il te manque N gidouilles » ;
	 * - achetée : « Poser » (la retire du Mathou qui la portait : un seul à la
	 *   fois), ou « Retirer » si ce Mathou la porte. Gratuit.
	 *
	 * La base débite et vérifie tout (`/api/student/mathoux/decorations/*`) ; la
	 * page est rechargée après chaque action (`invalidateAll`).
	 */

	import { invalidateAll } from '$app/navigation';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { consent } from '$lib/stores/consent.svelte';
	import MathouAvatar from './MathouAvatar.svelte';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { syncGidouilles } from '$lib/utils/cache-sync';
	import {
		MATHOU_COLLARS,
		MATHOU_DECORATIONS,
		MATHOU_GLASSES,
		MATHOU_HATS,
		type MathouCatalogId,
		type MathouDecorationInfo
	} from '$lib/mathoux/decorations';
	import type { Mathou } from '$lib/mathoux/collection-logic';
	import { capitalize } from '$lib/mathoux/news';

	// Types
	interface Props {
		/** Le Mathou à décorer ; `null` = fenêtre fermée */
		mathou: Mathou | null;
		/** Tous les Mathoux de l'élève : qui porte quoi */
		mathoux: Mathou[];
		owned: MathouCatalogId[];
		balance: number;
		onclose: () => void;
	}

	type PostOutcome = 'done' | 'refused' | 'failed';

	type CatalogInfo = MathouDecorationInfo<MathouCatalogId>;

	/** Accord des participes : « Portée », « Porté », « Portées » */
	type Agreement = 'f' | 'm' | 'fp';

	/** L'emplacement : ce que porte le Mathou (`Mathou[slot]`) */
	type Slot = 'decoration' | 'collar' | 'glasses' | 'hat';

	interface Row {
		id: 'panse' | 'cou' | 'yeux' | 'tete';
		title: string;
		slot: Slot;
		items: readonly CatalogInfo[];
		/** Route de pose et nom du champ qu'elle attend */
		wearPath: string;
		/** Accord d'une pièce de la rangée */
		agreement: (info: CatalogInfo) => Agreement;
		/** Toast du retrait */
		removed: (info: CatalogInfo) => string;
		/** Montrée sur le Mathou éveillé (il la retire pour la sieste) */
		awake: boolean;
	}

	// Constantes
	const FAILURE = 'Action impossible pour l’instant : réessaie dans un moment.';

	const ENDINGS: Record<Agreement, string> = { f: 'e', m: '', fp: 'es' };

	const ROWS: readonly Row[] = [
		{
			id: 'panse',
			title: 'Panse',
			slot: 'decoration',
			items: MATHOU_DECORATIONS,
			wearPath: '/api/student/mathoux/decorations/wear',
			agreement: () => 'f',
			removed: () => 'Décoration retirée',
			awake: false
		},
		{
			id: 'cou',
			title: 'Cou',
			slot: 'collar',
			items: MATHOU_COLLARS,
			wearPath: '/api/student/mathoux/decorations/wear-collar',
			agreement: () => 'm',
			removed: () => 'Collier retiré',
			awake: false
		},
		{
			id: 'yeux',
			title: 'Yeux',
			slot: 'glasses',
			items: MATHOU_GLASSES,
			wearPath: '/api/student/mathoux/decorations/wear-glasses',
			// Les lunettes, mais le monocle et le pince-nez
			agreement: (info) => (info.plural ? 'fp' : 'm'),
			removed: (info) => (info.plural ? 'Lunettes retirées' : `${info.name} retiré`),
			awake: true
		},
		{
			id: 'tete',
			title: 'Tête',
			slot: 'hat',
			items: MATHOU_HATS,
			wearPath: '/api/student/mathoux/decorations/wear-hat',
			agreement: () => 'm',
			removed: () => 'Chapeau retiré',
			awake: true
		}
	];

	// Variables
	let { mathou, mathoux, owned, balance, onclose }: Props = $props();

	let busy = $state<MathouCatalogId | null>(null);

	// Qui porte quoi, aux quatre emplacements
	const wornBy = $derived(
		new Map<MathouCatalogId, Mathou>(
			mathoux.flatMap((m) =>
				[m.decoration, m.collar, m.glasses, m.hat].flatMap((id) => (id ? [[id, m] as const] : []))
			)
		)
	);

	// Functions
	function missingFor(info: CatalogInfo): number {
		return Math.max(0, Math.ceil(info.price - balance));
	}

	function gidouilles(n: number): string {
		return `${n} gidouille${n > 1 ? 's' : ''}`;
	}

	/**
	 * `refused` : la base a dit non (déjà achetée, pas achetée, solde…) — la page
	 * était périmée (autre onglet) : on la recharge aussi. `failed` : panne.
	 */
	async function post(path: string, body: unknown): Promise<PostOutcome> {
		try {
			const response = await fetch(path, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (response.ok) return 'done';
			const payload: unknown = await response.json().catch(() => null);
			const message =
				payload && typeof payload === 'object' && 'message' in payload
					? String(payload.message)
					: FAILURE;
			toaster.error(message);
			return response.status === 404 || response.status === 409 ? 'refused' : 'failed';
		} catch {
			toaster.error(FAILURE);
			return 'failed';
		}
	}

	/** Une action à la fois ; la page rechargée sauf panne ; jamais de boutons bloqués. */
	async function run(info: CatalogInfo, action: () => Promise<PostOutcome>) {
		busy = info.id;
		try {
			if ((await action()) !== 'failed') await invalidateAll();
		} finally {
			busy = null;
		}
	}

	function buy(target: Mathou, info: CatalogInfo) {
		return run(info, async () => {
			const outcome = await post('/api/student/mathoux/decorations/buy', {
				decoration: info.id,
				notionId: target.notionId
			});
			if (outcome === 'done') {
				syncGidouilles({ type: 'student' }, -info.price);
				toaster.success(
					`Achat fait : ${info.name} pour ${target.name} (−${gidouilles(info.price)})`
				);
			}
			return outcome;
		});
	}

	function wear(row: Row, target: Mathou, info: CatalogInfo, on: boolean) {
		return run(info, async () => {
			const outcome = await post(row.wearPath, {
				notionId: target.notionId,
				[row.slot]: on ? info.id : null
			});
			if (outcome === 'done') {
				toaster.success(on ? `${capitalize(target.name)} porte : ${info.name}` : row.removed(info));
			}
			return outcome;
		});
	}

	/** Ce que porte le Mathou, avec `info` à son emplacement */
	function wearing(target: Mathou, row: Row, info: CatalogInfo) {
		return {
			decoration: target.decoration,
			collar: target.collar,
			glasses: target.glasses,
			hat: target.hat,
			[row.slot]: info.id
		};
	}
</script>

<Dialog.Root
	open={mathou !== null}
	onOpenChange={(open) => {
		if (!open) onclose();
	}}
>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		{#if mathou}
			{@const target = mathou}
			<Dialog.Header>
				<Dialog.Title>Décorer {target.name}</Dialog.Title>
				<Dialog.Description>
					Une décoration sur la panse, un collier au cou, des lunettes et un chapeau. Chacun
					s’achète une fois et orne un seul Mathou à la fois. Le changer de Mathou ou le retirer est
					gratuit.
				</Dialog.Description>
			</Dialog.Header>

			<p class="flex items-center gap-1.5 text-sm font-medium">
				Tu as {balance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
				<img src={gidouilleImage} alt="gidouilles" class="h-4 w-4" />
			</p>

			{#if consent.isReadOnly}
				<p class="rounded-md border border-border bg-muted/40 p-3 text-sm" role="status">
					Pour acheter une décoration, il faut l’accord de tes parents. Tu peux déjà les regarder.
				</p>
			{/if}

			{#each ROWS as row (row.id)}
				<section aria-labelledby="decorer-{row.id}" data-row={row.id} class="space-y-2">
					<h3 id="decorer-{row.id}" class="font-semibold">{row.title}</h3>
					<ul class="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
						{#each row.items as info (info.id)}
							{@const isOwned = owned.includes(info.id)}
							{@const wearer = wornBy.get(info.id)}
							{@const onThis = wearer?.notionId === target.notionId}
							{@const missing = missingFor(info)}
							{@const ending = ENDINGS[row.agreement(info)]}
							<li
								class="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 text-center"
								data-decoration={info.id}
							>
								<MathouAvatar
									raceIndex={target.raceIndex}
									stage={target.growth === 'a_decouvrir' ? 'chaton' : target.growth}
									asleep={target.asleep && !row.awake}
									animated={false}
									{...wearing(target, row, info)}
									size={88}
									label={`${target.name} avec : ${info.name}`}
								/>
								<p class="font-medium">{info.name}</p>
								{#if !isOwned}
									<p class="flex items-center gap-1 text-sm">
										{info.price}
										<img src={gidouilleImage} alt="gidouilles" class="h-4 w-4" />
									</p>
								{:else if wearer}
									<p class="text-sm text-muted-foreground">
										Porté{ending} par {wearer.name}
									</p>
								{:else}
									<p class="text-sm text-muted-foreground">Acheté{ending}</p>
								{/if}

								<div class="mt-auto">
									{#if !isOwned}
										{#if missing > 0}
											<p class="text-sm text-muted-foreground">
												Il te manque {gidouilles(missing)}
											</p>
										{:else}
											<Button
												size="sm"
												disabled={busy !== null || consent.isReadOnly}
												title={consent.isReadOnly ? consent.getDisabledTooltip() : undefined}
												aria-label="Acheter {info.name} pour {target.name}"
												onclick={() => buy(target, info)}
											>
												Acheter
											</Button>
										{/if}
									{:else if onThis}
										<Button
											size="sm"
											variant="outline"
											disabled={busy !== null}
											aria-label="Retirer {info.name}, porté{ending} par {target.name}"
											onclick={() => wear(row, target, info, false)}
										>
											Retirer
										</Button>
									{:else}
										<Button
											size="sm"
											disabled={busy !== null}
											aria-label="Poser {info.name} sur {target.name}"
											onclick={() => wear(row, target, info, true)}
										>
											Poser
										</Button>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
	</Dialog.Content>
</Dialog.Root>
