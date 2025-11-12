<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import VipCardPreview from '$lib/components/vip-cards/VipCardPreview.svelte';
	import VipCardTemplateEditor from '$lib/components/vip-cards/VipCardTemplateEditor.svelte';
	import VipCardImageUploader from '$lib/components/vip-cards/VipCardImageUploader.svelte';
	import VipCardConfigList from '$lib/components/vip-cards/VipCardConfigList.svelte';
	import VipCardConfigEditor from '$lib/components/vip-cards/VipCardConfigEditor.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { rarityLabel } from '$lib/components/vip-cards/utils';
	import type { Database } from '$lib/types/database';
	import type { PageData } from './$types';
	import { responseToTemplate } from '$lib/types/vip-card-admin';
	import type { TemplateResponse } from '$lib/types/vip-card-admin';
	import {
		updateTemplate,
		addTemplate,
		type VipCardTemplate
	} from '$lib/stores/vipCardTemplates.svelte';
	import type { VipCardAction } from '$lib/types/vip-card';

	type VipCardConfig = Database['public']['Tables']['vip_card_config']['Row'];

	interface CreateTemplateData {
		id: string;
		name: string;
		description: string;
		rarity: 'common' | 'rare' | 'epic' | 'legendary';
		category: 'bonus' | 'privilege' | 'social' | 'power';
		is_enabled: boolean;
		image_path: string;
		sort_order: number;
		action?: VipCardAction | null;
	}

	interface CreateConfigData {
		config_name: string;
		description: string | null;
		common_probability: number;
		rare_probability: number;
		epic_probability: number;
		legendary_probability: number;
		valid_from: string | null;
		valid_until: string | null;
	}

	let { data }: { data: PageData } = $props();

	// Local state with Svelte 5 $state
	let templates = $state<VipCardTemplate[]>(data.templates);
	let configs = $state<VipCardConfig[]>(data.configs);

	// Optimistic UI state
	let optimisticToggles = $state<Record<string, boolean>>({});

	// Modal states
	let creatingCard = $state(false);
	let editingCard = $state<VipCardTemplate | null>(null);
	let uploadingImageCard = $state<VipCardTemplate | null>(null);
	let deletingCard = $state<VipCardTemplate | null>(null);
	let creatingConfig = $state(false);
	let editingConfig = $state<VipCardConfig | null>(null);

	// Group templates by rarity using $derived
	const groupedTemplates = $derived(() => {
		const groups: Record<string, VipCardTemplate[]> = {
			common: [],
			rare: [],
			epic: [],
			legendary: []
		};

		templates.forEach((template) => {
			if (groups[template.rarity]) {
				groups[template.rarity].push(template);
			}
		});

		return groups;
	});

	// === TEMPLATE HANDLERS ===

	async function handleToggleCard(cardId: string, newState: boolean) {
		// Optimistic UI update
		optimisticToggles[cardId] = newState;

		try {
			const response = await fetch(`/api/admin/vip-cards/templates/${cardId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isEnabled: newState })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to update');
			}

			// API returns camelCase, convert to snake_case for local state
			const apiResponse: TemplateResponse = await response.json();
			const updated: VipCardTemplate = responseToTemplate(apiResponse);
			templates = templates.map((t) => (t.id === cardId ? updated : t));
			delete optimisticToggles[cardId];
			toaster.success('Carte mise à jour');
		} catch (error) {
			console.error('Toggle error:', error);
			delete optimisticToggles[cardId];
			toaster.error(error instanceof Error ? error.message : 'Échec de la mise à jour');
		}
	}

	async function handleSaveCard(cardData: CreateTemplateData) {
		const isEditing = !!editingCard;
		const url =
			isEditing && editingCard
				? `/api/admin/vip-cards/templates/${editingCard.id}`
				: '/api/admin/vip-cards/templates';
		const method = isEditing ? 'PATCH' : 'POST';

		// Convert snake_case to camelCase for API
		// Note: id is only sent for POST (creation), not PATCH (update)
		const apiPayload: Record<string, unknown> = {
			...(isEditing ? {} : { id: cardData.id }),
			name: cardData.name,
			description: cardData.description,
			rarity: cardData.rarity,
			category: cardData.category,
			isEnabled: cardData.is_enabled,
			imagePath: cardData.image_path,
			sortOrder: cardData.sort_order,
			...(cardData.action ? { action: cardData.action } : {})
		};

		try {
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(apiPayload)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to save');
			}

			// API returns camelCase, convert to snake_case for local state
			const apiResponse: TemplateResponse = await response.json();
			const savedCard = responseToTemplate(apiResponse) as VipCardTemplate;

			if (isEditing) {
				templates = templates.map((t) => (t.id === savedCard.id ? savedCard : t));
				updateTemplate(savedCard);
				toaster.success('Carte modifiée avec succès');
			} else {
				templates = [...templates, savedCard];
				addTemplate(savedCard);
				toaster.success('Carte créée avec succès');
			}

			creatingCard = false;
			editingCard = null;
		} catch (error) {
			console.error('Save error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
			throw error;
		}
	}

	function handleDeleteCard(cardId: string) {
		const card = templates.find((t) => t.id === cardId);
		if (card) {
			deletingCard = card;
		}
	}

	async function confirmDeleteCard() {
		if (!deletingCard) return;

		const cardId = deletingCard.id;

		try {
			const response = await fetch(`/api/admin/vip-cards/templates/${cardId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to delete');
			}

			templates = templates.filter((t) => t.id !== cardId);
			toaster.success('Carte supprimée');
			deletingCard = null;
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error(error instanceof Error ? error.message : 'Échec de la suppression');
		}
	}

	function handleImageUploaded(cardId: string, newImageUrl: string) {
		templates = templates.map((t) => (t.id === cardId ? { ...t, image_path: newImageUrl } : t));
		uploadingImageCard = null;
		toaster.success('Image mise à jour');
	}

	async function handleInlineEdit(
		cardId: string,
		name: string,
		description: string,
		action: VipCardTemplate['action'],
		rarity: VipCardTemplate['rarity']
	) {
		try {
			const response = await fetch(`/api/admin/vip-cards/templates/${cardId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description, action, rarity })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to update');
			}

			// API returns camelCase, convert to snake_case for local state
			const apiResponse: TemplateResponse = await response.json();
			const updated: VipCardTemplate = responseToTemplate(apiResponse);
			templates = templates.map((t) => (t.id === updated.id ? updated : t));
			toaster.success('Carte mise à jour');
		} catch (error) {
			console.error('Inline edit error:', error);
			toaster.error(error instanceof Error ? error.message : 'Échec de la mise à jour');
			throw error;
		}
	}

	// === CONFIG HANDLERS ===

	async function handleSaveConfig(configData: CreateConfigData) {
		const isEditing = !!editingConfig;
		const url =
			isEditing && editingConfig
				? `/api/admin/vip-cards/configs/${editingConfig.id}`
				: '/api/admin/vip-cards/configs';
		const method = isEditing ? 'PATCH' : 'POST';

		try {
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(configData)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to save');
			}

			const savedConfig: VipCardConfig = await response.json();

			if (isEditing) {
				configs = configs.map((c) => (c.id === savedConfig.id ? savedConfig : c));
				toaster.success('Configuration modifiée avec succès');
			} else {
				configs = [...configs, savedConfig];
				toaster.success('Configuration créée avec succès');
			}

			// Close modal
			creatingConfig = false;
			editingConfig = null;
		} catch (error) {
			console.error('Save config error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
			throw error;
		}
	}

	async function handleActivateConfig(configId: string) {
		try {
			const response = await fetch(`/api/admin/vip-cards/configs/${configId}/activate`, {
				method: 'POST'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to activate');
			}

			const _updatedConfig: VipCardConfig = await response.json();

			// Update configs: deactivate all others, activate this one
			configs = configs.map((c) => ({
				...c,
				is_active: c.id === configId
			}));

			toaster.success('Configuration activée');
		} catch (error) {
			console.error('Activate error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'activation");
		}
	}

	async function handleDeleteConfig(configId: string) {
		try {
			const response = await fetch(`/api/admin/vip-cards/configs/${configId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to delete');
			}

			configs = configs.filter((c) => c.id !== configId);
			toaster.success('Configuration supprimée');
		} catch (error) {
			console.error('Delete config error:', error);
			toaster.error(error instanceof Error ? error.message : 'Échec de la suppression');
		}
	}
</script>

<svelte:head>
	<title>Gestion des Cartes VIP - Admin | UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-8">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Gestion des Cartes VIP (Admin)</h1>
	</div>

	<Tabs.Root value="cards" class="w-full">
		<Tabs.List class="grid w-full max-w-md grid-cols-2">
			<Tabs.Trigger value="cards">Cartes</Tabs.Trigger>
			<Tabs.Trigger value="configs">Configurations</Tabs.Trigger>
		</Tabs.List>

		<!-- CARDS TAB -->
		<Tabs.Content value="cards" class="mt-6 space-y-6">
			<!-- Action bar -->
			<div class="flex items-center justify-between">
				<p class="text-sm text-muted-foreground">
					{templates.length} carte{templates.length > 1 ? 's' : ''} au total
				</p>
				<Button onclick={() => (creatingCard = true)}>+ Nouvelle Carte</Button>
			</div>

			<!-- Cards grouped by rarity -->
			{#each Object.entries(groupedTemplates()) as [rarity, cards] (rarity)}
				{#if cards.length > 0}
					<div class="space-y-4">
						<h2 class="text-xl font-semibold">
							{rarityLabel(rarity)}
						</h2>

						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{#each cards as card (card.id)}
								<VipCardPreview
									{card}
									isEnabled={optimisticToggles[card.id] ?? card.is_enabled}
									showActions={true}
									onToggle={(enabled) => handleToggleCard(card.id, enabled)}
									onInlineEdit={(name, description, action, rarity) =>
										handleInlineEdit(card.id, name, description, action, rarity)}
									onEdit={() => (editingCard = card)}
									onDelete={() => handleDeleteCard(card.id)}
									onUploadImage={() => (uploadingImageCard = card)}
								/>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#if templates.length === 0}
				<div class="rounded-lg border bg-muted/20 py-12 text-center">
					<p class="text-muted-foreground">Aucune carte VIP trouvée</p>
					<Button onclick={() => (creatingCard = true)} variant="outline" class="mt-4">
						Créer la première carte
					</Button>
				</div>
			{/if}
		</Tabs.Content>

		<!-- CONFIGS TAB -->
		<Tabs.Content value="configs" class="mt-6">
			<VipCardConfigList
				{configs}
				onActivate={handleActivateConfig}
				onEdit={(config) => (editingConfig = config)}
				onDelete={handleDeleteConfig}
				onCreate={() => (creatingConfig = true)}
			/>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- MODALS -->

<!-- Create/Edit Card Modal -->
{#if creatingCard || editingCard}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			creatingCard = false;
			editingCard = null;
		}}
	>
		<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>{editingCard ? 'Modifier' : 'Créer'} une Carte VIP</Dialog.Title>
				<Dialog.Description>
					{editingCard
						? 'Modifiez les informations de la carte VIP'
						: 'Créez une nouvelle carte VIP pour vos élèves'}
				</Dialog.Description>
			</Dialog.Header>
			<VipCardTemplateEditor
				card={editingCard ?? undefined}
				onSave={handleSaveCard}
				onCancel={() => {
					creatingCard = false;
					editingCard = null;
				}}
			/>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Upload Image Modal -->
{#if uploadingImageCard}
	{@const cardId = uploadingImageCard.id}
	{@const cardName = uploadingImageCard.name}
	{@const imagePath = uploadingImageCard.image_path}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			uploadingImageCard = null;
		}}
	>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Modifier l'image de "{cardName}"</Dialog.Title>
				<Dialog.Description>
					Uploadez une nouvelle image pour cette carte VIP (max 2MB, format PNG/JPG/WebP)
				</Dialog.Description>
			</Dialog.Header>
			<VipCardImageUploader
				{cardId}
				currentImageUrl={imagePath ?? undefined}
				onComplete={(newUrl) => handleImageUploaded(cardId, newUrl)}
				onCancel={() => (uploadingImageCard = null)}
			/>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Delete Card Confirmation Modal -->
{#if deletingCard}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			deletingCard = null;
		}}
	>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Confirmer la suppression</Dialog.Title>
				<Dialog.Description>
					Êtes-vous sûr de vouloir supprimer la carte <strong class="font-semibold text-foreground"
						>"{deletingCard.name}"</strong
					> ?
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4">
				<!-- Warning message -->
				<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<p class="text-sm text-destructive">
						⚠️ Cette action est <strong>irréversible</strong>. Toutes les cartes déjà attribuées aux
						élèves resteront, mais cette carte ne sera plus disponible pour de nouveaux tirages.
					</p>
				</div>

				<!-- Card preview -->
				<div class="rounded-lg border bg-muted/20 p-4">
					<div class="flex items-center gap-3">
						{#if deletingCard.image_path}
							<img
								src={deletingCard.image_path}
								alt={deletingCard.name}
								class="h-16 w-16 rounded-md object-cover"
							/>
						{/if}
						<div class="flex-1">
							<p class="font-medium">{deletingCard.name}</p>
							<p class="text-sm text-muted-foreground">{deletingCard.description}</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{rarityLabel(deletingCard.rarity)} • ID: {deletingCard.id}
							</p>
						</div>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex justify-end gap-2">
					<Button variant="outline" onclick={() => (deletingCard = null)}>Annuler</Button>
					<Button variant="destructive" onclick={confirmDeleteCard}>Supprimer</Button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Create/Edit Config Modal -->
{#if creatingConfig || editingConfig}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			creatingConfig = false;
			editingConfig = null;
		}}
	>
		<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>
					{editingConfig ? 'Modifier' : 'Créer'} une Configuration de Probabilités
				</Dialog.Title>
				<Dialog.Description>
					{editingConfig
						? 'Modifiez les probabilités de tirage des cartes VIP'
						: 'Créez une nouvelle configuration de probabilités pour les cartes VIP'}
				</Dialog.Description>
			</Dialog.Header>
			<VipCardConfigEditor
				config={editingConfig ?? undefined}
				onSave={handleSaveConfig}
				onCancel={() => {
					creatingConfig = false;
					editingConfig = null;
				}}
			/>
		</Dialog.Content>
	</Dialog.Root>
{/if}
