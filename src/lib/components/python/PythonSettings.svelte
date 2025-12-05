<script lang="ts">
	/**
	 * PythonSettings - Settings modal for the Python Playground
	 *
	 * Allows users to configure:
	 * - Editor theme (with live preview)
	 * - Font size
	 * - Pedagogic error messages toggle
	 */

	// Imports
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Settings, Minus, Plus, Palette, Type, GraduationCap } from 'lucide-svelte';
	import {
		pythonStore,
		EDITOR_THEMES,
		type EditorTheme
	} from '$lib/stores/pythonPlayground.svelte';

	// Props
	let { open = $bindable(false) }: { open: boolean } = $props();

	// Derived state from store for theme selection
	let selectedTheme = $derived(pythonStore.editorTheme);

	// Transform EDITOR_THEMES to MySelect format
	const themeItems = EDITOR_THEMES.map((t) => ({
		value: t.value,
		label: t.label
	}));

	// Handle theme change
	function handleThemeChange(value: string): void {
		pythonStore.setTheme(value as EditorTheme);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Settings class="size-5" />
				Parametres de l'editeur
			</Dialog.Title>
			<Dialog.Description>
				Personnalisez l'apparence et le comportement de l'editeur Python.
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-4 space-y-6">
			<!-- Theme Selection -->
			<div class="space-y-2">
				<Label class="flex items-center gap-2 text-sm font-medium">
					<Palette class="size-4" />
					Theme de l'editeur
				</Label>
				<MySelect
					type="single"
					items={themeItems}
					value={selectedTheme}
					onValueChange={handleThemeChange}
					placeholder="Choisir un theme..."
				/>
				<p class="text-xs text-muted-foreground">
					Le theme sera applique immediatement a l'editeur.
				</p>
			</div>

			<!-- Font Size -->
			<div class="space-y-2">
				<Label class="flex items-center gap-2 text-sm font-medium">
					<Type class="size-4" />
					Taille de police
				</Label>
				<div class="flex items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						onclick={() => pythonStore.decreaseFontSize()}
						aria-label="Reduire la taille"
						class="size-9"
					>
						<Minus class="size-4" />
					</Button>
					<span class="w-12 text-center text-lg font-medium">
						{pythonStore.fontSize}px
					</span>
					<Button
						variant="outline"
						size="icon"
						onclick={() => pythonStore.increaseFontSize()}
						aria-label="Augmenter la taille"
						class="size-9"
					>
						<Plus class="size-4" />
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">Ajustez la taille du texte dans l'editeur.</p>
			</div>

			<!-- Pedagogic Errors Toggle -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label for="pedagogic-errors" class="flex items-center gap-2 text-sm font-medium">
						<GraduationCap class="size-4" />
						Messages d'erreur pedagogiques
					</Label>
					<Switch
						id="pedagogic-errors"
						checked={pythonStore.showPedagogicErrors}
						onCheckedChange={() => pythonStore.togglePedagogicErrors()}
					/>
				</div>
				<p class="text-xs text-muted-foreground">
					Affiche des explications en francais pour les erreurs Python courantes.
				</p>
			</div>
		</div>

		<Dialog.Footer class="mt-6">
			<Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
