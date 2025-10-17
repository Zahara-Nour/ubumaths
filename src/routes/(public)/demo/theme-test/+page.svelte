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
	import { Info } from 'lucide-svelte';

	let progressValue = $state(60);
	let sliderValue = $state([50]);
	let checkboxChecked = $state(false);
	let switchChecked = $state(false);
</script>

<div class="min-h-screen bg-background p-8">
	<div class="max-w-6xl mx-auto space-y-12">
		<!-- Header -->
		<div class="space-y-4">
			<h1 class="text-4xl font-bold">Référence des Composants Shadcn</h1>
			<p class="text-lg text-muted-foreground">
				Guide complet des composants UI avec tous les variants et explications
			</p>

			<div class="flex items-center gap-4">
				<Button onclick={() => theme.toggle()} variant="outline">
					Basculer le thème
				</Button>
				<span class="text-sm text-muted-foreground">
					Testez les composants dans les deux modes
				</span>
			</div>
		</div>

		<Separator />

		<!-- Système de Couleurs -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Système de Couleurs</h2>
				<p class="text-muted-foreground">
					Shadcn utilise des variables CSS sémantiques pour une gestion cohérente des thèmes
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card.Root>
					<Card.Header>
						<Card.Title>Background</Card.Title>
						<Card.Description>Couleur de fond principale de l'application</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="p-8 bg-background border border-border rounded-lg">
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
						<div class="p-8 bg-card border border-border rounded-lg">
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
						<div class="p-8 bg-muted rounded-lg">
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
						<div class="p-8 bg-primary text-primary-foreground rounded-lg">
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
						<div class="p-8 bg-secondary text-secondary-foreground rounded-lg">
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
						<div class="p-8 bg-destructive text-destructive-foreground rounded-lg">
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
						<div class="p-8 bg-accent text-accent-foreground rounded-lg">
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
						<div class="p-8 border-4 border-border rounded-lg">
							<p class="text-foreground">Bordure</p>
							<code class="text-xs text-muted-foreground">border-border</code>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Ring</Card.Title>
						<Card.Description>Couleur pour l'anneau de focus (accessibilité clavier)</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="p-8 rounded-lg ring-4 ring-ring ring-offset-2 ring-offset-background">
							<p class="text-foreground">Focus ring</p>
							<code class="text-xs text-muted-foreground">ring-ring</code>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</section>

		<Separator />

		<!-- Buttons -->
		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-semibold">Boutons</h2>
				<p class="text-muted-foreground">
					Différents variants de boutons pour toutes les situations
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
							<Label for="terms" class="cursor-pointer">
								J'accepte les termes et conditions
							</Label>
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
							<Select.Trigger class="w-full">
								Choisissez une option
							</Select.Trigger>
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

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
				<Card.Content class="pt-6 space-y-4">
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

		<!-- Footer -->
		<div class="pt-8 pb-4 text-center text-sm text-muted-foreground">
			<p>
				Page de référence des composants Shadcn-Svelte • Testez les deux thèmes (clair/sombre) pour
				vérifier la cohérence
			</p>
		</div>
	</div>
</div>
