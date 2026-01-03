<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { vipCardTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import type { CreateListingData } from '$lib/types/marketplace';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import VipCardSelector from './VipCardSelector.svelte';
	import VipCard from '$lib/components/VipCard.svelte';
	import { RARITY_COLORS, RARITY_LABELS } from '$lib/constants/vip-card-ui';
	import { Info, Check } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { cn } from '$lib/utils';

	// Props
	let { open = $bindable(false) } = $props<{
		open?: boolean;
	}>();

	// Form state
	let listingType = $state<'sell' | 'buy'>('sell');
	let title = $state('');
	let description = $state('');
	let offeredCardIds = $state<string[]>([]);
	let offeredGidouilles = $state(0);
	let wantedCardTemplateIds = $state<string[]>([]);
	let wantedGidouilles = $state(0);
	let expiresInDays = $state('7');
	let isSubmitting = $state(false);

	// Template selection mode
	let showTemplateSelector = $state(false);

	// Listing type options
	const listingTypeOptions = [
		{ value: 'sell', label: 'Je veux vendre' },
		{ value: 'buy', label: 'Je veux acheter' }
	];

	// Expiry options
	const expiryOptions = [
		{ value: '1', label: '1 jour' },
		{ value: '3', label: '3 jours' },
		{ value: '7', label: '7 jours' },
		{ value: '14', label: '14 jours' },
		{ value: '30', label: '30 jours' }
	];

	// Validation
	let isValid = $derived.by(() => {
		// Title is required
		if (!title.trim()) return false;

		// Check if user has enough gidouilles to offer
		if (offeredGidouilles > marketplaceStore.userGidouilles) return false;

		// At least one offer or demand
		const hasOffer = offeredCardIds.length > 0 || offeredGidouilles > 0;
		const hasDemand = wantedCardTemplateIds.length > 0 || wantedGidouilles > 0;

		if (listingType === 'sell') {
			// For selling, must have something to offer
			return hasOffer;
		} else {
			// For buying, must specify what you want
			return hasDemand;
		}
	});

	// Get selected template names for display
	let selectedTemplateNames = $derived.by(() => {
		if (!$vipCardTemplates.length) return [];

		return wantedCardTemplateIds.map((id) => {
			const template = $vipCardTemplates.find((t) => t.id === id);
			return template?.name || 'Inconnue';
		});
	});

	// Reset form
	function resetForm() {
		listingType = 'sell';
		title = '';
		description = '';
		offeredCardIds = [];
		offeredGidouilles = 0;
		wantedCardTemplateIds = [];
		wantedGidouilles = 0;
		expiresInDays = '7';
		showTemplateSelector = false;
	}

	// Submit form
	async function handleSubmit() {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;

		try {
			const data: CreateListingData = {
				listing_type: listingType,
				title: title.trim(),
				description: description.trim() || undefined,
				offered_card_ids: offeredCardIds.length > 0 ? offeredCardIds : undefined,
				offered_gidouilles: offeredGidouilles > 0 ? offeredGidouilles : undefined,
				wanted_card_template_ids:
					wantedCardTemplateIds.length > 0 ? wantedCardTemplateIds : undefined,
				wanted_gidouilles: wantedGidouilles > 0 ? wantedGidouilles : undefined,
				expires_in_days: parseInt(expiresInDays, 10)
			};

			const success = await marketplaceStore.createListing(data);

			if (success) {
				open = false;
				resetForm();
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Toggle template selection
	function toggleTemplate(templateId: string) {
		if (wantedCardTemplateIds.includes(templateId)) {
			wantedCardTemplateIds = wantedCardTemplateIds.filter((id) => id !== templateId);
		} else {
			if (
				marketplaceStore.config &&
				wantedCardTemplateIds.length >= marketplaceStore.config.max_cards_per_trade
			) {
				toaster.warning(
					`Maximum ${marketplaceStore.config.max_cards_per_trade} types de cartes par annonce`
				);
				return;
			}
			wantedCardTemplateIds = [...wantedCardTemplateIds, templateId];
		}
	}

	// Templates are loaded in root layout, no need to fetch here

	// Convert template to VipCard format
	function templateToVipCard(template: (typeof $vipCardTemplates)[0]): VipCardType {
		return {
			id: template.id,
			name: template.name,
			description: template.description,
			imagePath: template.image_path ?? undefined,
			rarity: template.rarity as VipCard['rarity'],
			category: template.category as VipCard['category']
		};
	}

	// Reset when closing
	$effect(() => {
		if (!open) {
			resetForm();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Créer une annonce</Dialog.Title>
			<Dialog.Description>
				Créez une annonce pour échanger des cartes VIP et des gidouilles
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<!-- Listing Type -->
			<div class="space-y-2">
				<Label>Type d'annonce</Label>
				<MySelect type="single" bind:value={listingType} items={listingTypeOptions} />
			</div>

			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titre de l'annonce *</Label>
				<Input
					id="title"
					type="text"
					bind:value={title}
					placeholder={listingType === 'sell'
						? 'Ex: Échange carte épique contre gidouilles'
						: 'Ex: Recherche carte Azuka'}
					maxlength={100}
					required
				/>
				<p class="text-xs text-muted-foreground">
					{title.length}/100 caractères
				</p>
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<Label for="description">Description (optionnel)</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Ajoutez des détails sur votre annonce..."
					rows={3}
					maxlength={500}
				/>
				<p class="text-xs text-muted-foreground">
					{description.length}/500 caractères
				</p>
			</div>

			<!-- What I Offer Section -->
			<div class="space-y-3 rounded-lg border bg-muted/30 p-4">
				<h3 class="font-medium">
					{listingType === 'sell' ? "Ce que j'offre" : 'Ce que je peux échanger'}
				</h3>

				{#if listingType === 'sell'}
					<p class="text-sm text-muted-foreground">
						Sélectionnez les cartes et/ou gidouilles que vous voulez vendre
					</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						Optionnel: Indiquez ce que vous pourriez échanger
					</p>
				{/if}

				<!-- Card Selection -->
				<div class="space-y-2">
					<Label>Mes cartes VIP</Label>
					{#if marketplaceStore.myVipCards.length > 0}
						<VipCardSelector
							cards={marketplaceStore.myVipCards}
							bind:selectedCardIds={offeredCardIds}
							mode="multiple"
							excludeLocked={true}
							maxSelection={marketplaceStore.config?.max_cards_per_trade || 10}
							compact={true}
						/>
					{:else}
						<p class="py-4 text-center text-sm text-muted-foreground">
							Vous n'avez pas de cartes VIP disponibles
						</p>
					{/if}
				</div>

				<!-- Gidouilles -->
				<div class="space-y-2">
					<Label for="offered-gidouilles">
						Gidouilles
						<span class="ml-2 text-xs text-muted-foreground">
							(Solde: {marketplaceStore.userGidouilles})
						</span>
					</Label>
					<Input
						id="offered-gidouilles"
						type="number"
						bind:value={offeredGidouilles}
						min={0}
						max={Math.min(
							marketplaceStore.userGidouilles,
							marketplaceStore.config?.max_gidouilles_per_trade || 10000
						)}
						placeholder="0"
						class={offeredGidouilles > marketplaceStore.userGidouilles ? 'border-destructive' : ''}
					/>
					{#if offeredGidouilles > marketplaceStore.userGidouilles}
						<p class="text-xs text-destructive">
							Vous n'avez pas assez de gidouilles (solde: {marketplaceStore.userGidouilles})
						</p>
					{/if}
				</div>
			</div>

			<!-- What I Want Section -->
			<div class="space-y-3 rounded-lg border bg-muted/30 p-4">
				<h3 class="font-medium">
					{listingType === 'buy' ? 'Ce que je recherche' : 'Ce que je demande en échange'}
				</h3>

				{#if listingType === 'buy'}
					<p class="text-sm text-muted-foreground">
						Spécifiez les cartes et/ou gidouilles que vous recherchez
					</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						Optionnel: Indiquez ce que vous aimeriez en échange
					</p>
				{/if}

				<!-- Template Selection -->
				<div class="space-y-2">
					<Label>Types de cartes recherchés</Label>

					{#if selectedTemplateNames.length > 0}
						<div class="mb-2 flex flex-wrap gap-2">
							{#each selectedTemplateNames as name (name)}
								<Badge variant="secondary">{name}</Badge>
							{/each}
						</div>
					{/if}

					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => (showTemplateSelector = !showTemplateSelector)}
					>
						{showTemplateSelector ? 'Fermer la sélection' : 'Sélectionner des cartes'}
					</Button>

					{#if showTemplateSelector}
						<div class="mt-2 max-h-80 overflow-y-auto rounded-lg border p-3">
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
								{#each $vipCardTemplates as template (template.id)}
									{@const isSelected = wantedCardTemplateIds.includes(template.id)}
									<button
										type="button"
										onclick={() => toggleTemplate(template.id)}
										class={cn(
											'relative flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition-all hover:scale-105',
											isSelected
												? 'border-primary bg-primary/10 ring-2 ring-primary'
												: 'border-transparent hover:border-foreground/20'
										)}
									>
										<VipCard card={templateToVipCard(template)} size="sm" clickable={false} />
										<div class="text-center">
											<div class="line-clamp-1 text-xs font-medium">{template.name}</div>
											<Badge
												variant="outline"
												class="mt-1 border {RARITY_COLORS[
													template.rarity as keyof typeof RARITY_COLORS
												]} text-xs"
											>
												{RARITY_LABELS[template.rarity as keyof typeof RARITY_LABELS]}
											</Badge>
										</div>
										{#if isSelected}
											<div
												class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
											>
												<Check class="h-3 w-3" />
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Gidouilles -->
				<div class="space-y-2">
					<Label for="wanted-gidouilles">Gidouilles demandés</Label>
					<Input
						id="wanted-gidouilles"
						type="number"
						bind:value={wantedGidouilles}
						min={0}
						max={marketplaceStore.config?.max_gidouilles_per_trade || 10000}
						placeholder="0"
					/>
				</div>
			</div>

			<!-- Expiry -->
			<div class="space-y-2">
				<Label>Durée de l'annonce</Label>
				<MySelect type="single" bind:value={expiresInDays} items={expiryOptions} />
			</div>

			<!-- Info -->
			<div class="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
				<Info class="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
				<div class="text-xs text-blue-900 dark:text-blue-100">
					<p>Votre annonce sera visible par tous les étudiants de votre classe.</p>
					<p class="mt-1">
						Les échanges sont définitifs une fois acceptés. Vérifiez bien avant de confirmer !
					</p>
				</div>
			</div>
		</form>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Annuler</Button>
			<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
				{isSubmitting ? 'Création...' : "Créer l'annonce"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
