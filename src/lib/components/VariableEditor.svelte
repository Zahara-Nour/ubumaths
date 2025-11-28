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
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';

	interface Props {
		variables?: QuestionVariable[];
		helpDialogOpen?: boolean;
	}

	let { variables = $bindable([]), helpDialogOpen = $bindable(false) }: Props = $props();

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
	<!-- Help Dialog -->
	<Dialog.Root bind:open={helpDialogOpen}>
		<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>Guide des Variables</Dialog.Title>
				<Dialog.Description>
					Syntaxe complète pour la création de variables dynamiques dans vos questions
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-6 py-4">
				<!-- Introduction -->
				<section>
					<h4 class="mb-2 font-semibold">Qu'est-ce qu'une variable ?</h4>
					<p class="text-sm text-muted-foreground">
						Les variables permettent de créer des questions dynamiques avec des valeurs aléatoires.
						Elles sont résolues dans l'ordre de déclaration, ce qui permet à une variable de
						référencer les variables précédentes.
					</p>
				</section>

				<!-- Syntax types -->
				<section>
					<h4 class="mb-3 font-semibold">Types de syntaxe</h4>

					<div class="space-y-4">
						<!-- Variable reference -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-2 flex items-center gap-2">
								<code class="rounded bg-background px-2 py-1 font-mono text-sm">{'{{'}nom}}</code>
								<span class="text-sm font-medium">Référence à une variable</span>
							</div>
							<p class="mb-2 text-sm text-muted-foreground">
								Insère la valeur d'une variable déclarée précédemment.
							</p>
							<div class="rounded bg-background p-3 text-sm">
								<p class="mb-1 font-medium">Exemple :</p>
								<div class="space-y-1 font-mono text-xs">
									<p>
										<span class="text-muted-foreground">Variable 1 :</span> a =
										<code>{'{{'}random:1-10}}</code>
									</p>
									<p>
										<span class="text-muted-foreground">Variable 2 :</span> b =
										<code>{'{{'}a}} + 5</code>
									</p>
									<p class="text-muted-foreground">→ Si a=3, alors b=8</p>
								</div>
							</div>
						</div>

						<!-- Random integer -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-2 flex items-center gap-2">
								<code class="rounded bg-background px-2 py-1 font-mono text-sm"
									>{'{{'}random:min-max}}</code
								>
								<span class="text-sm font-medium">Nombre aléatoire entier</span>
							</div>
							<p class="mb-2 text-sm text-muted-foreground">
								Génère un nombre entier aléatoire entre min et max (inclus).
							</p>
							<div class="rounded bg-background p-3 text-sm">
								<p class="mb-1 font-medium">Exemples :</p>
								<div class="space-y-1 font-mono text-xs">
									<p><code>{'{{'}random:1-10}}</code> → nombre entre 1 et 10</p>
									<p><code>{'{{'}random:-5-5}}</code> → nombre entre -5 et 5</p>
									<p>
										<code>{'{{'}random:{'{{'}min}}-{'{{'}max}}}}</code> → bornes variables
									</p>
								</div>
							</div>
						</div>

						<!-- Random decimal -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-2 flex items-center gap-2">
								<code class="rounded bg-background px-2 py-1 font-mono text-sm"
									>{'{{'}random:min-max:step}}</code
								>
								<span class="text-sm font-medium">Nombre décimal avec pas</span>
							</div>
							<p class="mb-2 text-sm text-muted-foreground">
								Génère un nombre décimal aléatoire avec un pas spécifique.
							</p>
							<div class="rounded bg-background p-3 text-sm">
								<p class="mb-1 font-medium">Exemples :</p>
								<div class="space-y-1 font-mono text-xs">
									<p><code>{'{{'}random:0.5-9.99:0.01}}</code> → décimal par step de 0.01</p>
									<p><code>{'{{'}random:0-100:0.5}}</code> → multiple de 0.5</p>
								</div>
							</div>
						</div>

						<!-- Random decimal by digits -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-2 flex items-center gap-2">
								<code class="rounded bg-background px-2 py-1 font-mono text-sm"
									>{'{{'}random:avant.après}}</code
								>
								<span class="text-sm font-medium">Décimal par nombre de chiffres</span>
							</div>
							<p class="mb-2 text-sm text-muted-foreground">
								Génère un décimal avec un nombre spécifique de chiffres avant et après la virgule.
							</p>
							<div class="rounded bg-background p-3 text-sm">
								<p class="mb-1 font-medium">Exemples :</p>
								<div class="space-y-1 font-mono text-xs">
									<p><code>{'{{'}random:2.3}}</code> → 2 chiffres avant, 3 après (ex: 45.382)</p>
									<p><code>{'{{'}random:1.2}}</code> → 1 chiffre avant, 2 après (ex: 7.25)</p>
								</div>
							</div>
						</div>

						<!-- Exclusions -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-2 flex items-center gap-2">
								<code class="rounded bg-background px-2 py-1 font-mono text-sm"
									>{'{{'}random:min-max!exclusions}}</code
								>
								<span class="text-sm font-medium">Nombres avec exclusions</span>
							</div>
							<p class="mb-2 text-sm text-muted-foreground">
								Génère un nombre en excluant certaines valeurs ou plages.
							</p>
							<div class="rounded bg-background p-3 text-sm">
								<p class="mb-1 font-medium">Exemples :</p>
								<div class="space-y-1 font-mono text-xs">
									<p><code>{'{{'}random:1-20!5}}</code> → 1 à 20 sauf 5</p>
									<p><code>{'{{'}random:1-20!5,7}}</code> → exclure 5 et 7</p>
									<p><code>{'{{'}random:1-20!5..10}}</code> → exclure la plage 5 à 10</p>
									<p>
										<code>{'{{'}random:1-20!{'{{'}a}}}}</code> → exclure la valeur de la variable a
									</p>
									<p>
										<code>{'{{'}random:1-100!5,10-20,{'{{'}b}}}}</code> → exclusions multiples
									</p>
								</div>
							</div>
						</div>

						<!-- Mathematical evaluation -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-2 flex items-center gap-2">
								<code class="rounded bg-background px-2 py-1 font-mono text-sm"
									>{'{{'}eval:expression}}</code
								>
								<span class="text-sm font-medium">Évaluation mathématique</span>
							</div>
							<p class="mb-2 text-sm text-muted-foreground">
								Évalue une expression mathématique LaTeX et retourne le résultat.
							</p>
							<div class="rounded bg-background p-3 text-sm">
								<p class="mb-1 font-medium">Exemples :</p>
								<div class="space-y-1 font-mono text-xs">
									<p><code>{'{{'}eval:2+3}}</code> → 5</p>
									<p><code>{'{{'}eval:2^3}}</code> → 8</p>
									<p><code>{'{{'}eval:\frac&#123;10&#125;&#123;2&#125;}}</code> → 5</p>
									<p>
										<code>{'{{'}eval:{'{{'}a}}*{'{{'}b}}}}</code> → produit de a et b
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- Ordre de résolution -->
				<section>
					<h4 class="mb-2 font-semibold">Ordre de résolution</h4>
					<div class="rounded-lg border bg-muted/30 p-4 text-sm">
						<p class="mb-3 text-muted-foreground">
							Les variables sont résolues <strong>séquentiellement</strong> dans l'ordre de
							déclaration. Une variable peut référencer uniquement les variables déclarées
							<strong>avant</strong> elle.
						</p>
						<div class="rounded bg-background p-3">
							<p class="mb-2 font-medium">Exemple d'ordre valide :</p>
							<div class="space-y-1 font-mono text-xs">
								<p class="text-green-600">✓ Variable 1 : min = {'{{'}random:1-5}}</p>
								<p class="text-green-600">✓ Variable 2 : max = {'{{'}random:10-20}}</p>
								<p class="text-green-600">
									✓ Variable 3 : x = {'{{'}random:{'{{'}min}}-{'{{'}max}}}}
								</p>
								<p class="text-green-600">
									✓ Variable 4 : resultat = {'{{'}eval:{'{{'}x}}*2}}
								</p>
							</div>
							<p class="mt-4 mb-2 font-medium">Exemple d'ordre invalide :</p>
							<div class="space-y-1 font-mono text-xs">
								<p class="text-destructive">
									✗ Variable 1 : x = {'{{'}random:{'{{'}min}}-{'{{'}max}}}}
								</p>
								<p class="text-destructive">
									✗ Variable 2 : min = {'{{'}random:1-5}} ← min n'existe pas encore !
								</p>
							</div>
						</div>
					</div>
				</section>

				<!-- Utilisation dans les questions -->
				<section>
					<h4 class="mb-2 font-semibold">Utilisation dans l'énoncé et la réponse</h4>
					<div class="rounded-lg border bg-muted/30 p-4 text-sm">
						<p class="mb-3 text-muted-foreground">
							Une fois les variables définies, vous pouvez les utiliser dans l'énoncé et la réponse
							avec la syntaxe <code class="rounded bg-background px-1">{'{{'}nom}}</code>.
						</p>
						<div class="rounded bg-background p-3">
							<p class="mb-2 font-medium">Exemple complet :</p>
							<div class="space-y-2 text-xs">
								<div>
									<p class="font-semibold">Variables :</p>
									<div class="ml-3 space-y-1 font-mono">
										<p>a = {'{{'}random:1-10}}</p>
										<p>b = {'{{'}random:1-10!{'{{'}a}}}}</p>
										<p>resultat = {'{{'}eval:{'{{'}a}}+{'{{'}b}}}}</p>
									</div>
								</div>
								<div>
									<p class="font-semibold">Énoncé :</p>
									<p class="ml-3">Calculer $${'{{'}a}} + {'{{'}b}}$$</p>
								</div>
								<div>
									<p class="font-semibold">Réponse :</p>
									<p class="ml-3">{'{{'}resultat}}</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- Tips -->
				<section>
					<h4 class="mb-2 font-semibold">Conseils</h4>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex gap-2">
							<span class="text-primary">•</span>
							<span
								>Utilisez des noms de variables explicites (ex: <code>base</code>,
								<code>exposant</code>)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary">•</span>
							<span
								>Les variables peuvent contenir du LaTeX (ex: <code
									>\frac&#123;:a}&#125;&#123;:b}&#125;</code
								>)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary">•</span>
							<span>Vous pouvez combiner plusieurs syntaxes dans une même expression</span>
						</li>
						<li class="flex gap-2">
							<span class="text-primary">•</span>
							<span>Utilisez les boutons d'aide rapide sous chaque champ d'expression</span>
						</li>
					</ul>
				</section>
			</div>

			<Dialog.Footer>
				<Button onclick={() => (helpDialogOpen = false)}>Fermer</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

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
			{#each variables as variable, index (index)}
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
											Le nom doit commencer par une lettre et contenir uniquement des lettres,
											chiffres, et underscores
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
										placeholder={'Ex: {{random:1..10}}, {{var}}+5, {{eval:2^3}}'}
									/>
								</div>

								<!-- Syntax helper buttons -->
								<div class="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{{var}}')}
										class="text-xs"
									>
										{'{{var}}'}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{{random:1..10}}')}
										class="text-xs"
									>
										{'{{random:1..10}}'}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{{random:0.5..9.99:0.01}}')}
										class="text-xs"
									>
										Décimal
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{{random:1..100!5}}')}
										class="text-xs"
									>
										Exclusion
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => insertSyntax(index, '{{eval:}}')}
										class="text-xs"
									>
										Évaluation
									</Button>
								</div>
							</div>

							<!-- Delete button -->
							<Button variant="destructive" size="icon" onclick={() => removeVariable(index)}>
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
