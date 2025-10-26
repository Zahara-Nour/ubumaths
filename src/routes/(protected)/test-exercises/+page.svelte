<!--
	Test Page for Exercise Components
	==================================

	Demo page to test ExerciseMarkdownEditor and ExerciseDisplay components.
-->
<script lang="ts">
	import ExerciseMarkdownEditor from '$lib/components/exercises/ExerciseMarkdownEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let markdown = $state(`# Exercice de Mathématiques Complet

Résoudre les équations suivantes:

1. Équations du premier degré
   a. $2x + 3 = 7$
   b. $5x - 2 = 13$
2. Équations du second degré
   a. $(x + 2)(x - 3) = 0$
   b. $x^2 - 5x + 6 = 0$
3. Équations avec fractions
   - $\\frac{x}{2} + \\frac{x}{3} = 5$
   - $\\frac{2x-1}{3} = \\frac{x+2}{4}$

## Tableau de valeurs

| x | f(x) | g(x) | h(x) |
|---|------|------|------|
| 0 | 0    | 1    | -1   |
| 1 | 2    | 3    | 1    |
| 2 | 4    | 5    | 3    |

### Analyse du tableau

Les fonctions présentent des **propriétés** intéressantes:
- *f(x)* est linéaire
- *g(x)* croît plus rapidement
- *h(x)* peut être \`négative\`

## Formules importantes

$$\\int_0^\\pi \\sin(x) dx = 2$$

### Dérivées

$$\\frac{d}{dx}(x^n) = nx^{n-1}$$

#### Formule de Taylor

$$f(x) = f(a) + f'(a)(x-a) + \\frac{f''(a)}{2!}(x-a)^2 + \\cdots$$

---

**Note importante** : Utiliser les *propriétés* des fonctions \`trigonométriques\` et **vérifier** les résultats.
`);

	let _savedMarkdown = $state('');
	let showSaved = $state(false);

	function handleSave() {
		savedMarkdown = markdown;
		showSaved = true;
		setTimeout(() => {
			showSaved = false;
		}, 2000);
	}

	function handleClear() {
		markdown = '';
	}
</script>

<svelte:head>
	<title>Test Exercices - UbuMaths</title>
</svelte:head>

<div class="container mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Test - Système d'exercices</h1>
		<p class="mt-2 text-muted-foreground">
			Testez l'éditeur markdown et l'affichage des exercices avec MathLive
		</p>
	</div>

	<div class="grid gap-6">
		<!-- Editor Section -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Éditeur Markdown</Card.Title>
				<Card.Description>
					Éditez votre exercice en markdown avec support LaTeX. La prévisualisation se met à jour
					automatiquement.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="h-[600px]">
					<ExerciseMarkdownEditor bind:value={markdown} showPreview={true} />
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-between">
				<Button variant="outline" onclick={handleClear}>Effacer</Button>
				<div class="flex gap-2">
					{#if showSaved}
						<span class="self-center text-sm text-green-600">Enregistré !</span>
					{/if}
					<Button onclick={handleSave}>Enregistrer</Button>
				</div>
			</Card.Footer>
		</Card.Root>

		<!-- Example Markdown Syntax -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Syntaxe Markdown Supportée</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 text-sm">
					<div>
						<h3 class="mb-2 font-semibold text-foreground">Math (LaTeX)</h3>
						<code class="block rounded bg-muted p-2 text-foreground">
							Inline: $x^2$ ou $$x^2$$<br />
							Block: $$\int_0^\pi \sin(x) dx$$
						</code>
					</div>

					<div>
						<h3 class="mb-2 font-semibold text-foreground">Listes</h3>
						<code class="block rounded bg-muted p-2 text-foreground">
							1. Premier item<br />
							2. Deuxième item<br />
							&nbsp;&nbsp;a. Sous-item<br />
							- Liste non-ordonnée
						</code>
					</div>

					<div>
						<h3 class="mb-2 font-semibold text-foreground">Tableaux (GFM)</h3>
						<code class="block rounded bg-muted p-2 text-foreground">
							| Colonne 1 | Colonne 2 |<br />
							|-----------|-----------|<br />
							| Valeur 1&nbsp; | Valeur 2&nbsp; |
						</code>
					</div>

					<div>
						<h3 class="mb-2 font-semibold text-foreground">Formatage</h3>
						<code class="block rounded bg-muted p-2 text-foreground">
							**gras** *italique* `code`
						</code>
					</div>

					<div>
						<h3 class="mb-2 font-semibold text-foreground">Images</h3>
						<code class="block rounded bg-muted p-2 text-foreground">
							![Description](chemin/vers/image.png)
						</code>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
