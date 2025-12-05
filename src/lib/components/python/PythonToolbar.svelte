<script lang="ts">
	// Imports
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Play,
		Loader2,
		Trash2,
		Copy,
		RotateCcw,
		Circle,
		Share2,
		Maximize2,
		Minimize2,
		Minus,
		Plus,
		Cloud,
		FolderOpen,
		FilePlus,
		FileCode
	} from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		onExecute,
		onClear,
		onCopy,
		onReset,
		onShare,
		onToggleFullscreen,
		onIncreaseFontSize,
		onDecreaseFontSize,
		onSaveToCloud,
		onOpenFiles,
		onNewFile,
		canExecute,
		isExecuting,
		isModified = false,
		isFullscreen = false,
		fontSize = 14,
		isLoggedIn = false,
		currentFileName = null,
		isModifiedFromCloud = false,
		isSaving = false
	}: {
		onExecute: () => void;
		onClear: () => void;
		onCopy: () => void;
		onReset: () => void;
		onShare: () => void;
		onToggleFullscreen: () => void;
		onIncreaseFontSize: () => void;
		onDecreaseFontSize: () => void;
		onSaveToCloud?: () => void;
		onOpenFiles?: () => void;
		onNewFile?: () => void;
		canExecute: boolean;
		isExecuting: boolean;
		isModified?: boolean;
		isFullscreen?: boolean;
		fontSize?: number;
		isLoggedIn?: boolean;
		currentFileName?: string | null;
		isModifiedFromCloud?: boolean;
		isSaving?: boolean;
	} = $props();

	// State
	let copySuccess = $state(false);

	// Functions
	function handleCopy(): void {
		onCopy();
		copySuccess = true;
		toaster.success('Code copié dans le presse-papiers');
		setTimeout(() => {
			copySuccess = false;
		}, 2000);
	}
</script>

<div class="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
	<!-- Execute button -->
	<Button
		variant="default"
		size="sm"
		onclick={onExecute}
		disabled={!canExecute || isExecuting}
		class="gap-2"
	>
		{#if isExecuting}
			<Loader2 class="size-4 animate-spin" />
			<span>Exécution...</span>
		{:else}
			<Play class="size-4" />
			<span>Exécuter</span>
		{/if}
	</Button>

	<!-- Keyboard shortcut hint (hidden on mobile) -->
	<kbd class="hidden rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:inline">
		Ctrl+Entrée
	</kbd>

	<Separator orientation="vertical" class="mx-2 h-6" />

	<!-- Secondary actions -->
	<div class="flex items-center gap-1">
		<Button
			variant="ghost"
			size="icon"
			onclick={onClear}
			aria-label="Effacer la sortie"
			title="Effacer la sortie"
		>
			<Trash2 class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={handleCopy}
			aria-label="Copier le code"
			title="Copier le code"
			class={copySuccess ? 'text-green-500' : ''}
		>
			<Copy class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={onShare}
			aria-label="Partager le code"
			title="Partager le code"
		>
			<Share2 class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={onReset}
			aria-label="Réinitialiser le code"
			title="Réinitialiser le code"
		>
			<RotateCcw class="size-4" />
		</Button>

		<!-- Font size controls -->
		<Separator orientation="vertical" class="mx-1 h-6" />
		<Button
			variant="ghost"
			size="icon"
			onclick={onDecreaseFontSize}
			aria-label="Réduire la taille de police"
			title="Réduire la taille de police"
			class="size-8"
		>
			<Minus class="size-4" />
		</Button>
		<span class="w-6 text-center text-xs text-muted-foreground">{fontSize}</span>
		<Button
			variant="ghost"
			size="icon"
			onclick={onIncreaseFontSize}
			aria-label="Augmenter la taille de police"
			title="Augmenter la taille de police"
			class="size-8"
		>
			<Plus class="size-4" />
		</Button>

		<!-- Modified indicator -->
		{#if isModified}
			<span class="ml-1 text-xl font-bold text-destructive" title="Code modifie (non sauvegarde)"
				>*</span
			>
		{/if}

		<!-- Cloud actions -->
		<Separator orientation="vertical" class="mx-1 h-6" />

		<Button
			variant="ghost"
			size="icon"
			onclick={onNewFile}
			disabled={!isLoggedIn}
			aria-label="Nouveau fichier"
			title={isLoggedIn ? 'Nouveau fichier' : 'Connectez-vous pour creer un fichier'}
			class="size-8"
		>
			<FilePlus class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={onOpenFiles}
			disabled={!isLoggedIn}
			aria-label="Ouvrir un fichier"
			title={isLoggedIn ? 'Ouvrir un fichier' : 'Connectez-vous pour ouvrir vos fichiers'}
			class="size-8"
		>
			<FolderOpen class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={onSaveToCloud}
			disabled={!isLoggedIn || isSaving}
			aria-label="Sauvegarder dans le cloud"
			title={isLoggedIn ? 'Sauvegarder dans le cloud' : 'Connectez-vous pour sauvegarder'}
			class="size-8"
		>
			{#if isSaving}
				<Loader2 class="size-4 animate-spin" />
			{:else}
				<Cloud class="size-4" />
			{/if}
		</Button>
	</div>

	<!-- Current file name (when a cloud file is loaded) -->
	{#if currentFileName}
		<div class="hidden items-center gap-2 rounded-md bg-muted px-2 py-1 md:flex">
			<FileCode class="size-4 text-muted-foreground" />
			<span class="max-w-32 truncate text-sm font-medium">{currentFileName}</span>
			{#if isModifiedFromCloud}
				<span class="text-xs text-destructive" title="Modifications non sauvegardees">*</span>
			{/if}
		</div>
	{/if}

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Status indicator -->
	<div class="flex items-center gap-2 text-xs text-muted-foreground">
		<Circle
			class="size-2 {canExecute
				? 'fill-green-500 text-green-500'
				: 'fill-yellow-500 text-yellow-500'}"
		/>
		<span class="hidden sm:inline">
			{canExecute ? 'Prêt' : 'Chargement...'}
		</span>
	</div>

	<Separator orientation="vertical" class="mx-2 h-6" />

	<!-- Fullscreen toggle button -->
	<Button
		variant="ghost"
		size="icon"
		onclick={onToggleFullscreen}
		aria-label={isFullscreen ? 'Quitter le plein écran' : 'Mode plein écran'}
		title={isFullscreen ? 'Quitter le plein écran' : 'Mode plein écran'}
	>
		{#if isFullscreen}
			<Minimize2 class="size-4" />
		{:else}
			<Maximize2 class="size-4" />
		{/if}
	</Button>
</div>
