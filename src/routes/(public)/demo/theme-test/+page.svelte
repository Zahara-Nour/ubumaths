<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import { Slider } from '$lib/components/ui/slider';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Popover from '$lib/components/ui/popover';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { theme } from '$lib/stores/theme.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Info, Copy, Search } from 'lucide-svelte';

	let progressValue = $state(60);
	let sliderValue = $state([50]);
	let checkboxChecked = $state(false);
	let switchChecked = $state(false);

	// Tailwind color palette state
	let searchFilter = $state('');

	// Tailwind color palette with hex values
	const tailwindColors = {
		slate: { name: 'Slate', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
		gray: { name: 'Gray', 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
		zinc: { name: 'Zinc', 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
		neutral: { name: 'Neutral', 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' },
		stone: { name: 'Stone', 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917', 950: '#0c0a09' },
		red: { name: 'Red', 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a' },
		orange: { name: 'Orange', 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
		amber: { name: 'Amber', 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
		yellow: { name: 'Yellow', 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' },
		lime: { name: 'Lime', 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314', 950: '#1a2e05' },
		green: { name: 'Green', 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
		emerald: { name: 'Emerald', 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
		teal: { name: 'Teal', 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e' },
		cyan: { name: 'Cyan', 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
		sky: { name: 'Sky', 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
		blue: { name: 'Blue', 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
		indigo: { name: 'Indigo', 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
		violet: { name: 'Violet', 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
		purple: { name: 'Purple', 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' },
		fuchsia: { name: 'Fuchsia', 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' },
		pink: { name: 'Pink', 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724' },
		rose: { name: 'Rose', 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' }
	};

	const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

	// Filtered colors based on search
	const filteredColors = $derived(
		Object.entries(tailwindColors).filter(([_key, color]) =>
			color.name.toLowerCase().includes(searchFilter.toLowerCase())
		)
	);

	// Copy color class to clipboard
	function copyColorClass(colorKey: string, shade: number) {
		const className = `bg-${colorKey}-${shade}`;
		navigator.clipboard.writeText(className);
		toaster.success(`Copié : ${className}`);
	}

	// Get hex color for a given color and shade
	function getColorHex(colorKey: string, shade: number): string {
		const color = tailwindColors[colorKey as keyof typeof tailwindColors];
		return color[shade as keyof typeof color] as string;
	}

	// Determine if text should be white or black based on shade
	function shouldUseWhiteText(shade: number): boolean {
		return shade >= 600;
	}
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-6xl space-y-12">
		<!-- Header -->
		<div class="space-y-4">
			<h1 class="text-4xl font-bold">Référence des Composants Shadcn</h1>
			<p class="text-lg text-muted-foreground">
				Guide complet des composants UI avec tous les variants et explications
			</p>

			<div class="flex items-center gap-4">
				<Button onclick={() => theme.toggle()} variant="outline">Basculer le thème</Button>
				<span class="text-sm text-muted-foreground">
					Testez les composants dans les deux modes
				</span>
			</div>
		</div>

		<Separator />

		<!-- Tabs Navigation -->
		<Tabs.Root value="shadcn" class="w-full">
			<Tabs.List class="grid w-full grid-cols-3 mb-8">
				<Tabs.Trigger value="shadcn">Couleurs Shadcn</Tabs.Trigger>
				<Tabs.Trigger value="tailwind">Palette Tailwind</Tabs.Trigger>
				<Tabs.Trigger value="components">Composants</Tabs.Trigger>
			</Tabs.List>

			<!-- Tab 1: Shadcn Semantic Colors -->
			<Tabs.Content value="shadcn" class="space-y-6">
		<!-- Système de Couleurs -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Système de Couleurs</h2>
				<p class="text-muted-foreground">
					Shadcn utilise des variables CSS sémantiques pour une gestion cohérente des thèmes
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card.Root>
					<Card.Header>
						<Card.Title>Background</Card.Title>
						<Card.Description>Couleur de fond principale de l'application</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border border-border bg-background p-8">
							<p class="text-foreground">Texte sur background</p>
							<code class="text-xs text-muted-foreground">bg-background</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Card</Card.Title>
						<Card.Description>
							Couleur pour les cartes et conteneurs. S'élève légèrement au-dessus du background
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border border-border bg-card p-8">
							<p class="text-card-foreground">Texte sur card</p>
							<code class="text-xs text-muted-foreground">bg-card</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Muted</Card.Title>
						<Card.Description>
							Couleur pour les éléments subtils, backgrounds secondaires et états désactivés
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg bg-muted p-8">
							<p class="text-muted-foreground">Texte atténué</p>
							<code class="text-xs text-muted-foreground">bg-muted</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Primary</Card.Title>
						<Card.Description>
							Couleur principale pour les actions importantes (boutons principaux, liens, etc.)
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg bg-primary p-8 text-primary-foreground">
							<p class="font-semibold">Action principale</p>
							<code class="text-xs opacity-80">bg-primary</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Secondary</Card.Title>
						<Card.Description>
							Couleur pour les actions secondaires, moins importantes que primary
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg bg-secondary p-8 text-secondary-foreground">
							<p class="font-semibold">Action secondaire</p>
							<code class="text-xs text-muted-foreground">bg-secondary</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Destructive</Card.Title>
						<Card.Description>
							Couleur pour les actions destructives (suppression, erreurs, dangers)
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg bg-destructive p-8 text-destructive-foreground">
							<p class="font-semibold">Action destructive</p>
							<code class="text-xs opacity-80">bg-destructive</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Accent</Card.Title>
						<Card.Description>
							Couleur d'accentuation pour mettre en valeur des éléments spécifiques
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg bg-accent p-8 text-accent-foreground">
							<p class="font-semibold">Accent</p>
							<code class="text-xs text-muted-foreground">bg-accent</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Border</Card.Title>
						<Card.Description>Couleur pour les bordures et séparateurs visuels</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border-4 border-border p-8">
							<p class="text-foreground">Bordure</p>
							<code class="text-xs text-muted-foreground">border-border</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Ring</Card.Title>
						<Card.Description
							>Couleur pour l'anneau de focus (accessibilité clavier)</Card.Description
						>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg p-8 ring-4 ring-ring ring-offset-2 ring-offset-background">
							<p class="text-foreground">Focus ring</p>
							<code class="text-xs text-muted-foreground">ring-ring</code>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</section>
			</Tabs.Content>

			<!-- Tab 2: Tailwind Color Palette -->
			<Tabs.Content value="tailwind" class="space-y-6">
				<section class="space-y-6">
					<div class="space-y-2">
						<h2 class="text-3xl font-semibold">Palette de Couleurs Tailwind</h2>
						<p class="text-muted-foreground">
							Palette complète de couleurs Tailwind CSS avec toutes les nuances (50-950)
						</p>
					</div>

					<!-- Search Filter -->
					<div class="flex items-center gap-2">
						<div class="relative flex-1 max-w-md">
							<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchFilter}
								placeholder="Rechercher une couleur..."
								class="pl-10"
							/>
						</div>
						<span class="text-sm text-muted-foreground">
							{filteredColors.length} {filteredColors.length === 1 ? 'couleur' : 'couleurs'}
						</span>
					</div>

					<!-- Color Grid -->
					<div class="space-y-4">
						{#each filteredColors as [colorKey, colorData] (colorKey)}
							<Card.Root>
								<Card.Header class="pb-3">
									<Card.Title class="text-lg">{colorData.name}</Card.Title>
								</Card.Header>
								<Card.Content>
									<div class="grid grid-cols-11 gap-2">
										{#each shades as shade (shade)}
											<button
												onclick={() => copyColorClass(colorKey, shade)}
												class="group relative aspect-square rounded-lg border-2 border-transparent transition-all hover:scale-110 hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
												style="background-color: {getColorHex(colorKey, shade)}"
												title="Cliquer pour copier bg-{colorKey}-{shade}"
											>
												<!-- Shade number label -->
												<span
													class="absolute inset-0 flex items-center justify-center text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100"
													style="color: {shouldUseWhiteText(shade) ? '#ffffff' : '#000000'}"
												>
													{shade}
												</span>

												<!-- Copy icon on hover -->
												<div
													class="absolute -right-1 -top-1 rounded-full bg-background p-1 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
												>
													<Copy class="h-3 w-3 text-primary" />
												</div>
											</button>
										{/each}
									</div>
									<!-- Color class reference -->
									<p class="mt-3 text-xs text-muted-foreground">
										Classes: <code>bg-{colorKey}-50</code> à <code>bg-{colorKey}-950</code>
									</p>
								</Card.Content>
							</Card.Root>
						{/each}

						{#if filteredColors.length === 0}
							<Card.Root>
								<Card.Content class="py-12 text-center">
									<p class="text-muted-foreground">Aucune couleur trouvée pour "{searchFilter}"</p>
								</Card.Content>
							</Card.Root>
						{/if}
					</div>
				</section>
			</Tabs.Content>

			<!-- Tab 3: Components -->
			<Tabs.Content value="components" class="space-y-12">
		<Separator />

		<!-- Buttons -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Boutons</h2>
				<p class="text-muted-foreground">
					Différents variants de boutons pour toutes les situations
				</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Variants</Card.Title>
						<Card.Description>
							<strong>default:</strong> Action principale •
							<strong>secondary:</strong> Action secondaire •
							<strong>outline:</strong> Action neutre avec bordure •
							<strong>ghost:</strong> Action discrète sans fond •
							<strong>destructive:</strong> Action dangereuse •
							<strong>link:</strong> Style de lien
						</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-wrap gap-3">
						<Button variant="default">Default</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="outline">Outline</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="destructive">Destructive</Button>
						<Button variant="link">Link</Button>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Tailles</Card.Title>
						<Card.Description>
							<strong>sm:</strong> Petit •
							<strong>default:</strong> Taille normale •
							<strong>lg:</strong> Grand •
							<strong>icon:</strong> Bouton carré pour icônes
						</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-wrap items-center gap-3">
						<Button size="sm">Small</Button>
						<Button size="default">Default</Button>
						<Button size="lg">Large</Button>
						<Button size="icon">
							<Info class="h-4 w-4" />
						</Button>
					</Card.Content>
				</Card.Root>
			</div>
		</section>

		<Separator />

		<!-- Badges -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Badges</h2>
				<p class="text-muted-foreground">Labels et étiquettes pour statuts et catégories</p>
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>Variants de Badge</Card.Title>
					<Card.Description>
						<strong>default:</strong> Badge standard •
						<strong>secondary:</strong> Badge secondaire •
						<strong>outline:</strong> Badge avec bordure •
						<strong>destructive:</strong> Badge d'erreur/danger
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-wrap gap-3">
					<Badge variant="default">Default</Badge>
					<Badge variant="secondary">Secondary</Badge>
					<Badge variant="outline">Outline</Badge>
					<Badge variant="destructive">Destructive</Badge>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<!-- Forms -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Formulaires</h2>
				<p class="text-muted-foreground">Inputs, labels, et autres éléments de formulaire</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Input & Label</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input id="email" type="email" placeholder="nom@exemple.fr" />
						</div>
						<div class="space-y-2">
							<Label for="password">Mot de passe</Label>
							<Input id="password" type="password" placeholder="••••••••" />
						</div>
						<div class="space-y-2">
							<Label for="disabled">Désactivé</Label>
							<Input id="disabled" disabled value="Input désactivé" />
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Textarea</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="message">Message</Label>
							<Textarea id="message" placeholder="Entrez votre message ici..." rows={5} />
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Checkbox & Switch</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex items-center gap-2">
							<Checkbox id="terms" bind:checked={checkboxChecked} />
							<Label for="terms" class="cursor-pointer">J'accepte les termes et conditions</Label>
						</div>
						<div class="flex items-center gap-2">
							<Switch id="notifications" bind:checked={switchChecked} />
							<Label for="notifications" class="cursor-pointer">
								Activer les notifications ({switchChecked ? 'Oui' : 'Non'})
							</Label>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Select</Card.Title>
					</Card.Header>
					<Card.Content>
						<Select.Root>
							<Select.Trigger class="w-full">Choisissez une option</Select.Trigger>
							<Select.Content>
								<Select.Item value="option1">Option 1</Select.Item>
								<Select.Item value="option2">Option 2</Select.Item>
								<Select.Item value="option3">Option 3</Select.Item>
							</Select.Content>
						</Select.Root>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Slider</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<Label>Valeur: {sliderValue[0]}%</Label>
						<Slider bind:value={sliderValue} max={100} step={1} />
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Progress</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<Label>Progression: {progressValue}%</Label>
						<Progress value={progressValue} />
						<div class="flex gap-2">
							<Button size="sm" onclick={() => (progressValue = Math.max(0, progressValue - 10))}>
								-10%
							</Button>
							<Button size="sm" onclick={() => (progressValue = Math.min(100, progressValue + 10))}>
								+10%
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</section>

		<Separator />

		<!-- Alerts -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Alerts</h2>
				<p class="text-muted-foreground">Messages d'information, avertissements et erreurs</p>
			</div>

			<div class="space-y-4">
				<Alert.Root>
					<Info class="h-4 w-4" />
					<Alert.Title>Information</Alert.Title>
					<Alert.Description>
						Ceci est une alerte d'information par défaut. Utilisée pour des messages généraux.
					</Alert.Description>
				</Alert.Root>

				<Alert.Root variant="destructive">
					<Info class="h-4 w-4" />
					<Alert.Title>Erreur</Alert.Title>
					<Alert.Description>
						Ceci est une alerte destructive. Utilisée pour les erreurs et les avertissements
						critiques.
					</Alert.Description>
				</Alert.Root>
			</div>
		</section>

		<Separator />

		<!-- Cards -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Cards</h2>
				<p class="text-muted-foreground">Conteneurs pour organiser le contenu</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<Card.Root>
					<Card.Header>
						<Card.Title>Card Simple</Card.Title>
						<Card.Description>Description de la carte</Card.Description>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">Contenu de la carte ici.</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Card avec Footer</Card.Title>
						<Card.Description>Avec pied de page</Card.Description>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">Contenu principal.</p>
					</Card.Content>
					<Card.Footer>
						<Button size="sm">Action</Button>
					</Card.Footer>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Card Complète</Card.Title>
						<Card.Description>Toutes les parties</Card.Description>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">Contenu avec toutes les sections.</p>
					</Card.Content>
					<Card.Footer class="flex justify-between">
						<Button variant="outline" size="sm">Annuler</Button>
						<Button size="sm">Confirmer</Button>
					</Card.Footer>
				</Card.Root>
			</div>
		</section>

		<Separator />

		<!-- Tabs -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Tabs</h2>
				<p class="text-muted-foreground">Navigation par onglets</p>
			</div>

			<Card.Root>
				<Card.Content class="pt-6">
					<Tabs.Root value="tab1">
						<Tabs.List class="grid w-full grid-cols-3">
							<Tabs.Trigger value="tab1">Onglet 1</Tabs.Trigger>
							<Tabs.Trigger value="tab2">Onglet 2</Tabs.Trigger>
							<Tabs.Trigger value="tab3">Onglet 3</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="tab1" class="mt-4">
							<p class="text-muted-foreground">Contenu du premier onglet.</p>
						</Tabs.Content>
						<Tabs.Content value="tab2" class="mt-4">
							<p class="text-muted-foreground">Contenu du deuxième onglet.</p>
						</Tabs.Content>
						<Tabs.Content value="tab3" class="mt-4">
							<p class="text-muted-foreground">Contenu du troisième onglet.</p>
						</Tabs.Content>
					</Tabs.Root>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<!-- Avatar -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Avatar</h2>
				<p class="text-muted-foreground">Images de profil avec fallback</p>
			</div>

			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-center gap-4">
						<Avatar.Root>
							<Avatar.Image src="https://github.com/shadcn.png" alt="Avatar" />
							<Avatar.Fallback>SC</Avatar.Fallback>
						</Avatar.Root>
						<Avatar.Root>
							<Avatar.Fallback>FB</Avatar.Fallback>
						</Avatar.Root>
						<Avatar.Root>
							<Avatar.Fallback class="bg-primary text-primary-foreground">JD</Avatar.Fallback>
						</Avatar.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<!-- Dropdown Menu -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Dropdown Menu</h2>
				<p class="text-muted-foreground">Menus contextuels et actions</p>
			</div>

			<Card.Root>
				<Card.Content class="pt-6">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="outline">Ouvrir le menu</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Label>Mon Compte</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item>Profil</DropdownMenu.Item>
							<DropdownMenu.Item>Paramètres</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item class="text-destructive">Se déconnecter</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<!-- Dialog -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Dialog</h2>
				<p class="text-muted-foreground">Modales et fenêtres de dialogue</p>
			</div>

			<Card.Root>
				<Card.Content class="pt-6">
					<Dialog.Root>
						<Dialog.Trigger>
							<Button>Ouvrir le dialogue</Button>
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Êtes-vous sûr ?</Dialog.Title>
								<Dialog.Description>
									Cette action est irréversible. Voulez-vous vraiment continuer ?
								</Dialog.Description>
							</Dialog.Header>
							<Dialog.Footer>
								<Button variant="outline">Annuler</Button>
								<Button>Confirmer</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<!-- Popover -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Popover</h2>
				<p class="text-muted-foreground">Contenus flottants au clic</p>
			</div>

			<Card.Root>
				<Card.Content class="pt-6">
					<Popover.Root>
						<Popover.Trigger>
							<Button variant="outline">Ouvrir le popover</Button>
						</Popover.Trigger>
						<Popover.Content class="w-80">
							<div class="space-y-2">
								<h4 class="font-semibold">Titre du Popover</h4>
								<p class="text-sm text-muted-foreground">
									Contenu du popover avec plus d'informations. Idéal pour des explications
									contextuelles.
								</p>
							</div>
						</Popover.Content>
					</Popover.Root>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<!-- Separator -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Separator</h2>
				<p class="text-muted-foreground">Séparateurs visuels</p>
			</div>

			<Card.Root>
				<Card.Content class="space-y-4 pt-6">
					<div>
						<p class="text-sm">Section 1</p>
						<Separator class="my-4" />
						<p class="text-sm">Section 2</p>
					</div>
					<div class="flex items-center gap-4">
						<p class="text-sm">Gauche</p>
						<Separator orientation="vertical" class="h-8" />
						<p class="text-sm">Droite</p>
					</div>
				</Card.Content>
			</Card.Root>
		</section>
			</Tabs.Content>
		</Tabs.Root>

		<!-- Footer -->
		<div class="pt-8 pb-4 text-center text-sm text-muted-foreground">
			<p>
				Page de référence des composants Shadcn-Svelte • Testez les deux thèmes (clair/sombre) pour
				vérifier la cohérence
			</p>
		</div>
	</div>
</div>
