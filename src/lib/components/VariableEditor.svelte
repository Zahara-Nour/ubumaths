<!--
	Variable Editor Component
	=========================

	Editor for question template variables with syntax helpers.

	FEATURES:
	- Add/remove variables
	- Reorder variables (declaration order matters)
	- Syntax helper buttons for common patterns
	- Live validation of variable names
	- Visual feedback for syntax errors

	SYNTAX HELPERS:
	- {@:varName} - Variable reference
	- {#:min-max} - Random integer
	- {#:min-max:step} - Random decimal
	- {#:digits.digits} - Random decimal by digits
	- {eval:expression} - Mathematical evaluation

	PROPS:
	- variables: QuestionVariable[] (bindable)
-->

<script lang="ts">
	import type { QuestionVariable } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from 'lucide-svelte';

	interface Props {
		variables: QuestionVariable[];
	}

	let { variables = $bindable() }: Props = $props();

	// Add new variable
	function addVariable() {
		variables = [...variables, { name: '', expression: '' }];
	}

	// Remove variable
	function removeVariable(index: number) {
		variables = variables.filter((_, i) => i !== index);
	}

	// Move variable up
	function moveUp(index: number) {
		if (index === 0) return;
		const newVars = [...variables];
		[newVars[index - 1], newVars[index]] = [newVars[index], newVars[index - 1]];
		variables = newVars;
	}

	// Move variable down
	function moveDown(index: number) {
		if (index === variables.length - 1) return;
		const newVars = [...variables];
		[newVars[index], newVars[index + 1]] = [newVars[index + 1], newVars[index]];
		variables = newVars;
	}

	// Insert syntax helper into expression
	function insertSyntax(index: number, syntax: string) {
		const input = document.getElementById(`var-expression-${index}`) as HTMLInputElement;
		if (!input) return;

		const start = input.selectionStart || 0;
		const end = input.selectionEnd || 0;
		const expression = variables[index].expression;

		variables[index].expression =
			expression.substring(0, start) + syntax + expression.substring(end);

		// Set cursor after inserted text
		setTimeout(() => {
			input.focus();
			input.setSelectionRange(start + syntax.length, start + syntax.length);
		}, 0);
	}

	// Validate variable name
	function isValidVariableName(name: string): boolean {
		return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
	}

	// Check for duplicate names
	function hasDuplicateName(name: string, currentIndex: number): boolean {
		return variables.some((v, i) => i !== currentIndex && v.name === name);
	}
</script>

<div class="space-y-4">
	<!-- Syntax Helper Reference -->
	<Card.Root class="bg-muted/50">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-base">
				<HelpCircle class="h-4 w-4" />
				Aide à la syntaxe
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-2 text-sm">
			<div class="grid gap-2 md:grid-cols-2">
				<div>
					<code class="rounded bg-background px-2 py-1">&#123;@:nom&#125;</code>
					<span class="ml-2 text-muted-foreground">Référence à une variable</span>
				</div>
				<div>
					<code class="rounded bg-background px-2 py-1">&#123;#:1-10&#125;</code>
					<span class="ml-2 text-muted-foreground">Nombre aléatoire entier</span>
				</div>
				<div>
					<code class="rounded bg-background px-2 py-1">&#123;#:0.5-9.99:0.01&#125;</code>
					<span class="ml-2 text-muted-foreground">Nombre décimal avec step</span>
				</div>
				<div>
					<code class="rounded bg-background px-2 py-1">&#123;#:2.3&#125;</code>
					<span class="ml-2 text-muted-foreground">Décimal (2 av., 3 ap.)</span>
				</div>
				<div>
					<code class="rounded bg-background px-2 py-1">&#123;#:1-100!5,10-20&#125;</code>
					<span class="ml-2 text-muted-foreground">Avec exclusions</span>
				</div>
				<div>
					<code class="rounded bg-background px-2 py-1">&#123;eval:2+3&#125;</code>
					<span class="ml-2 text-muted-foreground">Évaluation mathématique</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Variable List -->
	{#if variables.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-8">
				<p class="mb-4 text-muted-foreground">Aucune variable définie</p>
				<Button onclick={addVariable} class="gap-2">
					<Plus class="h-4 w-4" />
					Ajouter une variable
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-3">
			{#each variables as variable, index}
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="flex gap-4">
							<!-- Reorder buttons -->
							<div class="flex flex-col gap-1">
								<Button
									variant="outline"
									size="icon"
									class="h-8 w-8"
									onclick={() => moveUp(index)}
									disabled={index === 0}
								>
									<ArrowUp class="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									class="h-8 w-8"
									onclick={() => moveDown(index)}
									disabled={index === variables.length - 1}
								>
									<ArrowDown class="h-4 w-4" />
								</Button>
							</div>

							<!-- Variable fields -->
							<div class="flex-1 space-y-3">
								<!-- Variable name -->
								<div class="space-y-1">
									<Label for="var-name-{index}">
										Nom de la variable
										<Badge variant="outline" class="ml-2">#{index + 1}</Badge>
									</Label>
									<Input
										id="var-name-{index}"
										bind:value={variable.name}
										placeholder="Ex: a, min, base"
										class={!isValidVariableName(variable.name) && variable.name.length > 0
											? 'border-destructive'
											: hasDuplicateName(variable.name, index)
												? 'border-destructive'
												: ''}
									/>
									{#if variable.name.length > 0 && !isValidVariableName(variable.name)}
										<p class="text-xs text-destructive">
											Le nom doit commencer par une lettre et contenir uniquement des lettres, chiffres, et underscores
										</p>
									{/if}
									{#if hasDuplicateName(variable.name, index)}
										<p class="text-xs text-destructive">
											Ce nom est déjà utilisé par une autre variable
										</p>
									{/if}
								</div>

								<!-- Variable expression -->
								<div class="space-y-1">
									<Label for="var-expression-{index}">Expression</Label>
									<Input
										id="var-expression-{index}"
										bind:value={variable.expression}
										placeholder="Ex: {#:1-10}, {@:min}+5, {eval:2^3}"
									/>
								</div>

								<!-- Syntax helper buttons -->
								<div class="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{@:}')}
										class="text-xs"
									>
										Variable
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{#:1-10}')}
										class="text-xs"
									>
										Aléatoire
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{#:0.5-9.99:0.01}')}
										class="text-xs"
									>
										Décimal
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{#:1-100!5}')}
										class="text-xs"
									>
										Exclusion
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{eval:}')}
										class="text-xs"
									>
										Évaluation
									</Button>
								</div>
							</div>

							<!-- Delete button -->
							<Button
								variant="destructive"
								size="icon"
								onclick={() => removeVariable(index)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Add button -->
		<Button onclick={addVariable} class="w-full gap-2" variant="outline">
			<Plus class="h-4 w-4" />
			Ajouter une variable
		</Button>
	{/if}
</div>
