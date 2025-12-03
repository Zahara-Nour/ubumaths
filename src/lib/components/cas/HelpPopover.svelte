<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { HelpCircle, Keyboard, Info } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';

	// Get available commands from the store
	const commands = replStore.getCommands();
</script>

<Popover.Root>
	<Popover.Trigger asChild let:builder>
		<Button builders={[builder]} variant="ghost" size="icon" aria-label="Aide">
			<HelpCircle class="size-4" />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-[400px]" align="end">
		<div class="space-y-4">
			<!-- Header -->
			<div>
				<h3 class="text-lg font-semibold text-foreground">Aide - REPL Mathématique</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Console interactive pour le calcul symbolique
				</p>
			</div>

			<Separator />

			<!-- Keyboard Shortcuts -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Keyboard class="size-4 text-primary" />
					<h4 class="font-medium text-foreground">Raccourcis clavier</h4>
				</div>
				<div class="space-y-1.5 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Exécuter</span>
						<kbd
							class="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground"
						>
							Entrée
						</kbd>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Historique précédent</span>
						<kbd
							class="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground"
						>
							↑
						</kbd>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Historique suivant</span>
						<kbd
							class="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground"
						>
							↓
						</kbd>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Nouvelle ligne (Terminal)</span>
						<kbd
							class="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground"
						>
							Maj+Entrée
						</kbd>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Input Modes -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Info class="size-4 text-primary" />
					<h4 class="font-medium text-foreground">Modes de saisie</h4>
				</div>
				<div class="space-y-1.5 text-sm">
					<div>
						<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">auto</code>
						<p class="mt-0.5 text-muted-foreground">
							Détection automatique (LaTeX ou notation personnalisée)
						</p>
					</div>
					<div>
						<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">latex</code>
						<p class="mt-0.5 text-muted-foreground">Force la syntaxe LaTeX</p>
					</div>
					<div>
						<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">custom</code
						>
						<p class="mt-0.5 text-muted-foreground">Force la notation personnalisée</p>
					</div>
				</div>
				<p class="text-xs text-muted-foreground">
					Utilisez <code class="rounded bg-muted px-1 font-mono">.mode [type]</code> pour changer
				</p>
			</div>

			<Separator />

			<!-- Available Commands -->
			<div class="space-y-2">
				<h4 class="font-medium text-foreground">Commandes disponibles</h4>
				<div class="max-h-[200px] space-y-1 overflow-y-auto text-sm">
					{#each commands as command (command.name)}
						<div class="rounded-md border border-border bg-muted/50 p-2">
							<div class="flex items-baseline gap-2">
								<code class="font-mono text-xs font-semibold text-primary">.{command.name}</code>
								{#if command.aliases.length > 0}
									<span class="text-xs text-muted-foreground">
										({command.aliases.map((a) => `.${a}`).join(', ')})
									</span>
								{/if}
							</div>
							<p class="mt-0.5 text-xs text-muted-foreground">{command.description}</p>
						</div>
					{/each}
				</div>
			</div>

			<Separator />

			<!-- Example Usage -->
			<div class="space-y-1">
				<h4 class="text-sm font-medium text-foreground">Exemples</h4>
				<div class="space-y-1 text-xs text-muted-foreground">
					<p><code class="rounded bg-muted px-1 font-mono">2x^2 + 3x - 5</code> (expression)</p>
					<p><code class="rounded bg-muted px-1 font-mono">.simplify</code> (commande)</p>
					<p><code class="rounded bg-muted px-1 font-mono">.help</code> (aide détaillée)</p>
				</div>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
