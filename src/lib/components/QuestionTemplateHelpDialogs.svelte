<!--
	Help Dialogs for QuestionTemplateForm
	======================================

	Contains 7 static help dialogs with contextual guidance:
	- Title & Description
	- Exercise Instruction
	- Categorization
	- Variations
	- Statement
	- Answer
	- Correction

	All props are $bindable() booleans controlling dialog open state.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	interface Props {
		titleDescriptionHelpOpen: boolean;
		exerciseInstructionHelpOpen: boolean;
		categorizationHelpOpen: boolean;
		variationsHelpOpen: boolean;
		statementHelpOpen: boolean;
		answerHelpOpen: boolean;
		correctionHelpOpen: boolean;
	}

	let {
		titleDescriptionHelpOpen = $bindable(),
		exerciseInstructionHelpOpen = $bindable(),
		categorizationHelpOpen = $bindable(),
		variationsHelpOpen = $bindable(),
		statementHelpOpen = $bindable(),
		answerHelpOpen = $bindable(),
		correctionHelpOpen = $bindable()
	}: Props = $props();
</script>

<!-- Title and Description Help -->
<Dialog.Root bind:open={titleDescriptionHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Titre et Description</Dialog.Title>
			<Dialog.Description>
				Guide pour renseigner le titre et la description d'un template
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Titre (obligatoire)</h4>
				<p class="text-sm text-muted-foreground">
					Le titre est un résumé court et descriptif du template. Il sert à identifier rapidement le
					template dans la liste et aide à l'organisation.
				</p>
				<div class="mt-2 space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="font-medium">Exemples de bons titres :</p>
					<ul class="ml-4 space-y-1 font-mono text-xs">
						<li>• "Calcul de dérivées - Polynômes"</li>
						<li>• "Résolution d'équations du premier degré"</li>
						<li>• "Théorème de Pythagore - Application"</li>
						<li>• "Simplification de $$\frac{'{a}'}{'{b}'}$$"</li>
					</ul>
					<p class="mt-3 text-muted-foreground">
						💡 Le titre supporte LaTeX : utilisez $$formule$$ pour inclure des expressions
						mathématiques
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Description (optionnel)</h4>
				<p class="text-sm text-muted-foreground">
					La description permet d'ajouter du contexte supplémentaire sur le template. Elle peut
					servir :
				</p>
				<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Pour les {lore.entities.teacher}s</strong> : Notes internes, objectifs pédagogiques,
							prérequis</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Pour les {lore.entities.student}s</strong> : Instructions supplémentaires, rappels
							de cours, conseils</span
						>
					</li>
				</ul>
				<div class="mt-2 space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="font-medium">Exemple de description :</p>
					<p class="text-xs italic">
						"Ce template permet de travailler sur la dérivation de polynômes de degré 2 et 3. Les
						{lore.entities.student}s doivent appliquer les règles de dérivation apprises en cours.
						Rappel : la dérivée de x^n est nx^(n-1)."
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Éditeur riche</h4>
				<p class="text-sm text-muted-foreground">
					La description utilise un éditeur de texte riche avec de nombreuses fonctionnalités :
				</p>
				<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Formatage</strong> : Gras, italique, souligné, barré, exposant, indice</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Structure</strong> : Titres, listes (à puces, numérotées, tâches), alignement</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span><strong>Couleurs</strong> : Couleur de texte et surlignage</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Formules mathématiques</strong> : Utilisez la section "Formule" pour insérer des
							expressions LaTeX (fractions, racines, exposants...)</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span><strong>Autres</strong> : Liens, emojis, citations, blocs de code</span>
					</li>
				</ul>
				<p class="mt-2 text-xs text-muted-foreground">
					💡 Les sections de la barre d'outils sont repliables (Texte, Paragraphe, Insertion,
					Formule)
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Support LaTeX pour le titre</h4>
				<p class="text-sm text-muted-foreground">
					Le champ <strong>titre</strong> supporte LaTeX pour inclure des formules mathématiques :
				</p>
				<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Utilisez <code class="rounded bg-muted px-1">$$formule$$</code> pour délimiter les expressions
							LaTeX</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Des boutons d'aide sont disponibles pour insérer les syntaxes courantes (fractions,
							racines...)</span
						>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Affichage</h4>
				<p class="text-sm text-muted-foreground">
					Le titre apparaît dans la liste des templates pour faciliter l'identification. La
					description peut être consultée lors de la visualisation du template.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (titleDescriptionHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Exercise Instruction Help -->
<Dialog.Root bind:open={exerciseInstructionHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Consigne de {lore.learning.exercise}</Dialog.Title>
			<Dialog.Description>
				Guide pour utiliser efficacement la consigne de {lore.learning.exercise}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">À quoi sert la consigne ?</h4>
				<p class="text-sm text-muted-foreground">
					La consigne de {lore.learning.exercise} est une instruction partagée par toutes les variations
					de la question. Elle permet d'indiquer ce que le {lore.entities.student} doit faire (ex: "Calculer",
					"Résoudre", "Simplifier").
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Où apparaît-elle ?</h4>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Dans les cartes/flashcards</strong> : La consigne apparaît avant l'énoncé
							pour guider le {lore.entities.student}</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Dans les feuilles de {lore.learning.exercise}s</strong> : Elle sert de titre
							de {lore.learning.exercise} et n'est pas répétée devant chaque question</span
						>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemples</h4>
				<div class="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="font-medium">Bonnes consignes :</p>
					<ul class="ml-4 space-y-1 font-mono text-xs">
						<li>• "Calculer"</li>
						<li>• "Résoudre l'équation"</li>
						<li>• "Simplifier l'expression"</li>
						<li>• "Factoriser"</li>
						<li>• "Développer et réduire"</li>
					</ul>
					<p class="mt-3 text-muted-foreground">
						💡 Conseil : Restez concis, l'énoncé contient déjà les détails
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Optionnel</h4>
				<p class="text-sm text-muted-foreground">
					Ce champ est facultatif. Si vous ne le remplissez pas, seul l'énoncé sera affiché.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (exerciseInstructionHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Categorization Help -->
<Dialog.Root bind:open={categorizationHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Catégorisation des questions</Dialog.Title>
			<Dialog.Description>
				Organisez vos questions par thème, domaine et difficulté
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Pourquoi catégoriser ?</h4>
				<p class="text-sm text-muted-foreground">La catégorisation permet de :</p>
				<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Organiser votre banque de questions de manière logique</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Filtrer et rechercher facilement des questions spécifiques</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Créer des {lore.learning.exercise}s ciblées sur un sujet précis</span>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Les trois niveaux</h4>

				<div class="space-y-3">
					<div class="rounded-lg border bg-muted/30 p-3">
						<p class="mb-1 text-sm font-medium">1. Thème (obligatoire)</p>
						<p class="text-xs text-muted-foreground">Catégorie générale de mathématiques</p>
						<p class="mt-2 font-mono text-xs">Ex: Algèbre, Géométrie, Analyse, Probabilités</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3">
						<p class="mb-1 text-sm font-medium">2. Domaine (obligatoire)</p>
						<p class="text-xs text-muted-foreground">Sous-catégorie plus précise du thème</p>
						<p class="mt-2 font-mono text-xs">
							Ex: Pour "Algèbre" → Équations, Polynômes, Systèmes<br />
							Pour "Géométrie" → Triangles, Cercles, Vecteurs
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3">
						<p class="mb-1 text-sm font-medium">3. Sous-domaine (optionnel)</p>
						<p class="text-xs text-muted-foreground">Spécialisation encore plus fine</p>
						<p class="mt-2 font-mono text-xs">
							Ex: Pour "Équations" → Linéaires, Quadratiques, Polynomiales
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Niveau de difficulté</h4>
				<p class="mb-2 text-sm text-muted-foreground">
					Le niveau est un nombre entier positif (1, 2, 3...) qui indique la difficulté de la
					question.
				</p>
				<div class="rounded-lg border bg-muted/30 p-3 text-sm">
					<p class="mb-2 font-medium">Recommandations :</p>
					<ul class="space-y-1 text-xs">
						<li><strong>1-2</strong> : Questions basiques, introduction</li>
						<li><strong>3-4</strong> : Questions intermédiaires</li>
						<li><strong>5-7</strong> : Questions avancées</li>
						<li><strong>8+</strong> : Questions expertes/compétition</li>
					</ul>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Indépendant des niveaux scolaires</h4>
				<p class="text-sm text-muted-foreground">
					⚠️ La catégorisation est indépendante des "Niveaux scolaires" (6ème, 2nde, etc.). Une même
					question peut être utilisée pour plusieurs niveaux scolaires.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (categorizationHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Variations Help -->
<Dialog.Root bind:open={variationsHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Variations de questions</Dialog.Title>
			<Dialog.Description>
				Créez plusieurs versions d'une même question pour plus de diversité
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Qu'est-ce qu'une variation ?</h4>
				<p class="text-sm text-muted-foreground">
					Une variation est une version alternative de la question avec son propre énoncé, variables
					et réponse. Lors de la génération d'une instance, une variation est choisie aléatoirement
					parmi celles disponibles.
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Pourquoi utiliser des variations ?</h4>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Diversité</strong> : Éviter que les {lore.entities.student}s tombent toujours
							sur la même formulation</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Contextes variés</strong> : Poser le même concept mathématique dans différents
							contextes</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Complexité graduée</strong> : Créer des variations plus ou moins difficiles de
							la même question</span
						>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemple concret</h4>
				<div class="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
					<div>
						<p class="mb-1 font-semibold">Variation 1 :</p>
						<p class="text-xs">Énoncé : "Calculer $$&#123;@:a&#125; + &#123;@:b&#125;$$"</p>
					</div>
					<div>
						<p class="mb-1 font-semibold">Variation 2 :</p>
						<p class="text-xs">
							Énoncé : "Quelle est la somme de $$&#123;@:a&#125;$$ et $$&#123;@:b&#125;$$ ?"
						</p>
					</div>
					<div>
						<p class="mb-1 font-semibold">Variation 3 :</p>
						<p class="text-xs">
							Énoncé : "Marie a $$&#123;@:a&#125;$$ pommes, Jean lui en donne $$&#123;@:b&#125;$$.
							Combien en a-t-elle ?"
						</p>
					</div>
					<p class="mt-3 text-xs text-muted-foreground italic">
						Les trois variations posent le même calcul mais avec des formulations différentes
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Champs partagés vs. spécifiques</h4>
				<div class="space-y-2">
					<div class="rounded border bg-blue-50 p-3 text-sm dark:bg-blue-950">
						<p class="mb-1 font-semibold">Partagés (même pour toutes les variations) :</p>
						<ul class="ml-4 space-y-0.5 text-xs">
							<li>• Consigne de {lore.learning.exercise}</li>
							<li>• Catégorisation (thème, domaine, niveau)</li>
							<li>• Niveaux scolaires</li>
							<li>• Type de question</li>
						</ul>
					</div>
					<div class="rounded border bg-green-50 p-3 text-sm dark:bg-green-950">
						<p class="mb-1 font-semibold">Spécifiques (différents pour chaque variation) :</p>
						<ul class="ml-4 space-y-0.5 text-xs">
							<li>• Énoncé</li>
							<li>• Variables</li>
							<li>• Réponse</li>
							<li>• Correction</li>
						</ul>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Conseils</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Une seule variation suffit si votre question est déjà très variée grâce aux variables
							aléatoires</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Utilisez 2-3 variations pour des formulations différentes du même concept</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Le bouton "Dupliquer" permet de copier une variation existante comme point de départ</span
						>
					</li>
				</ul>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (variationsHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Statement Help -->
<Dialog.Root bind:open={statementHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Énoncé de la question</Dialog.Title>
			<Dialog.Description>
				Rédigez l'énoncé avec support LaTeX et variables dynamiques
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Qu'est-ce que l'énoncé ?</h4>
				<p class="text-sm text-muted-foreground">
					L'énoncé est la question posée au {lore.entities.student}. Il peut contenir du texte, des
					formules mathématiques (LaTeX), des images, et faire référence aux variables définies.
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Syntaxes disponibles</h4>
				<div class="space-y-2">
					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">LaTeX pour les mathématiques :</p>
						<code class="text-xs">$$x^2 + 2x + 1$$</code>
						<p class="mt-1 text-xs text-muted-foreground">Entourer les formules de $$ ... $$</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">Variables :</p>
						<code class="text-xs">&#123;@:nomVariable&#125;</code>
						<p class="mt-1 text-xs text-muted-foreground">
							Insère la valeur de la variable définie précédemment
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">Nombres aléatoires directs :</p>
						<code class="text-xs">&#123;#:1-10&#125;</code>
						<p class="mt-1 text-xs text-muted-foreground">
							Génère un nombre aléatoire (utile si pas besoin de variable)
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">Évaluation d'expression :</p>
						<code class="text-xs">&#123;eval:&#123;@:a&#125;+&#123;@:b&#125;&#125;</code>
						<p class="mt-1 text-xs text-muted-foreground">
							Calcule et affiche le résultat d'une expression
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemple complet</h4>
				<div class="rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="mb-2 font-semibold">Variables définies :</p>
					<div class="mb-3 ml-3 space-y-1 font-mono text-xs">
						<p>a = &#123;#:1-10&#125;</p>
						<p>b = &#123;#:1-10&#125;</p>
					</div>
					<p class="mb-2 font-semibold">Énoncé :</p>
					<p class="font-mono text-xs">Calculer $$&#123;@:a&#125; + &#123;@:b&#125;$$</p>
					<p class="mt-3 text-xs text-muted-foreground">
						→ Si a=3 et b=5, le {lore.entities.student} verra : "Calculer $$3 + 5$$"
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Boutons d'aide rapide</h4>
				<p class="text-sm text-muted-foreground">
					Utilisez les boutons sous le champ de texte pour insérer rapidement la syntaxe LaTeX et
					les variables.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (statementHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Answer Help -->
<Dialog.Root bind:open={answerHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Réponse attendue</Dialog.Title>
			<Dialog.Description>
				Définissez la réponse correcte selon le type de question
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Format selon le type de question</h4>
				<div class="space-y-3">
					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-1 font-semibold">Texte à trous (fill-in-blanks)</p>
						<p class="text-xs text-muted-foreground">
							Définissez les trous et la réponse attendue pour chacun. Les réponses peuvent utiliser
							des variables et des expressions évaluées.
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-1 font-semibold">QCM (multiple choice)</p>
						<p class="text-xs text-muted-foreground">
							Créez les choix et cochez ceux qui sont corrects. Vous pouvez autoriser une ou
							plusieurs bonnes réponses.
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Utilisation des variables</h4>
				<p class="mb-2 text-sm text-muted-foreground">
					La réponse peut utiliser les mêmes syntaxes que l'énoncé :
				</p>
				<ul class="space-y-1 text-sm">
					<li class="flex gap-2">
						<code class="text-xs">&#123;@:var&#125;</code>
						<span class="text-xs text-muted-foreground">- Référence à une variable</span>
					</li>
					<li class="flex gap-2">
						<code class="text-xs">&#123;eval:...&#125;</code>
						<span class="text-xs text-muted-foreground">- Évaluation d'expression</span>
					</li>
					<li class="flex gap-2">
						<code class="text-xs">&#123;#:1-10&#125;</code>
						<span class="text-xs text-muted-foreground">- Nombre aléatoire</span>
					</li>
				</ul>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (answerHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Correction Help -->
<Dialog.Root bind:open={correctionHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Correction détaillée</Dialog.Title>
			<Dialog.Description>Fournissez une explication de la solution (optionnel)</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Qu'est-ce que la correction ?</h4>
				<p class="text-sm text-muted-foreground">
					La correction est une explication détaillée de la solution qui sera montrée au {lore
						.entities.student}
					après qu'il ait répondu à la question. Elle est <strong>optionnelle</strong>.
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Quand l'utiliser ?</h4>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pour les questions complexes nécessitant des étapes intermédiaires</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pour expliquer la méthode de résolution</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pour donner des astuces ou rappels théoriques</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pas nécessaire pour les questions simples où la réponse se suffit</span>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Format</h4>
				<p class="mb-2 text-sm text-muted-foreground">Comme l'énoncé, la correction supporte :</p>
				<ul class="space-y-1 text-xs text-muted-foreground">
					<li>• LaTeX pour les formules mathématiques</li>
					<li>• Variables avec <code>&#123;@:nom&#125;</code></li>
					<li>• Évaluations avec <code>&#123;eval:...&#125;</code></li>
					<li>• Texte et images</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemple</h4>
				<div class="rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="mb-2 font-semibold">Question : Résoudre $$2x + 3 = 11$$</p>
					<div class="mt-3 space-y-2 text-xs">
						<p class="font-semibold">Correction :</p>
						<p>On isole x en plusieurs étapes :</p>
						<ol class="ml-4 space-y-1">
							<li>1. Soustraire 3 de chaque côté : $$2x = 8$$</li>
							<li>2. Diviser par 2 : $$x = 4$$</li>
						</ol>
						<p class="mt-2 text-muted-foreground">
							💡 Astuce : On effectue toujours les opérations inverses dans l'ordre inverse de
							priorité.
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Conseils</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Soyez pédagogique : expliquez le raisonnement, pas seulement les calculs</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Utilisez des étapes numérotées pour les solutions en plusieurs parties</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Ajoutez des rappels théoriques si nécessaire</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Restez concis : une correction trop longue ne sera pas lue</span>
					</li>
				</ul>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (correctionHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
