<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { MathGraphService } from '$lib/services/mathgraph-api';
	import { calculateGrade } from '$lib/services/geometry-grader';
	import type { GeometryExercise, ValidationResults } from '$lib/types/geometry';
	import MathGraphFullscreen from '$lib/components/MathGraphFullscreen.svelte';

	let mathGraphLoaded = $state(false);
	let loadingError = $state('');

	// Wrapper containers (bound to MathGraphFullscreen)
	let triangleWrapper: HTMLDivElement;
	let circleWrapper: HTMLDivElement;

	// Inner containers (where we render MathGraph)
	let triangleContainer: HTMLDivElement;
	let circleContainer: HTMLDivElement;
	let bisectorContainer: HTMLDivElement;
	let measureContainer: HTMLDivElement;

	// Demo states
	let triangleCreated = $state(false);
	let circleCreated = $state(false);
	let bisectorCreated = $state(false);
	let measurementCreated = $state(false);

	// Grading demo state
	let demoScore = $state(90);
	let demoHints = $state(0);
	let demoTime = $state(600);
	let demoAttempts = $state(1);
	let gradeResult = $state<{ grade: string; percentage: number } | null>(null);

	// Static data
	const systemFeatures = [
		{ icon: '⚡', title: 'Validation automatique', desc: '30+ validateurs géométriques' },
		{ icon: '🎯', title: 'Notation intelligente', desc: 'Lettres A-F avec pénalités' },
		{ icon: '💡', title: "Système d'indices", desc: '3 niveaux progressifs' },
		{ icon: '🏆', title: 'Récompenses', desc: '5 succès déblocables' },
		{ icon: '📊', title: 'Suivi de progression', desc: 'Statistiques détaillées' },
		{ icon: '🔄', title: 'Génération aléatoire', desc: 'Figures randomisées' }
	];

	const documentation = [
		{
			title: 'MATHGRAPH32_API_GUIDE.md',
			desc: "Guide complet de l'API MathGraph32",
			lines: '~1,000 lignes',
			audience: 'Développeurs'
		},
		{
			title: 'GEOMETRY_API_DOCS.md',
			desc: 'Documentation API complète du système',
			lines: '~2,000 lignes',
			audience: 'Développeurs'
		},
		{
			title: 'GEOMETRY_TEACHER_GUIDE.md',
			desc: 'Guide pour les enseignants (Français)',
			lines: '~1,500 lignes',
			audience: 'Enseignants'
		},
		{
			title: 'GEOMETRY_STUDENT_GUIDE.md',
			desc: 'Guide pour les élèves (Français)',
			lines: '~800 lignes',
			audience: 'Élèves'
		},
		{
			title: 'GEOMETRY_EXAMPLES.md',
			desc: "12 exemples d'exercices complets",
			lines: '~1,200 lignes',
			audience: 'Tous'
		}
	];

	// Load MathGraph32 on mount
	onMount(async () => {
		try {
			const service = MathGraphService.getInstance();
			await service.loadMathGraph();
			mathGraphLoaded = true;
		} catch (error) {
			console.error('Failed to load MathGraph32:', error);
			loadingError = error instanceof Error ? error.message : 'Erreur de chargement';
		}
	});

	// Example 1: Create Triangle
	async function createTriangle() {
		if (!mathGraphLoaded) return;

		try {
			if (!triangleContainer) {
				console.error('triangleContainer is not defined!');
				return;
			}

			// Clear the container and create canvas element
			triangleContainer.innerHTML = '';
			const canvas = document.createElement('div');
			canvas.id = 'triangle-canvas';
			canvas.style.width = `${triangleContainer.clientWidth}px`;
			canvas.style.height = '350px';
			triangleContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise((resolve) => setTimeout(resolve, 10));

			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: triangleContainer.clientWidth,
				height: 350,
				level: 1
			});

			// Create triangle ABC using English API with object references
			// Centered coordinates for better visibility
			const pointA = app.addPointXY({
				tag: 'pointA',
				name: 'A',
				x: 2,
				y: 2,
				visible: true,
				nameVisible: true
			});

			const pointB = app.addPointXY({
				tag: 'pointB',
				name: 'B',
				x: 8,
				y: 2,
				visible: true,
				nameVisible: true
			});

			const pointC = app.addPointXY({
				tag: 'pointC',
				name: 'C',
				x: 5,
				y: 7,
				visible: true,
				nameVisible: true
			});

			// Create segments using object references
			app.addSegment({
				tag: 'segAB',
				a: pointA,
				b: pointB,
				visible: true,
				color: 'blue'
			});

			app.addSegment({
				tag: 'segBC',
				a: pointB,
				b: pointC,
				visible: true,
				color: 'blue'
			});

			app.addSegment({
				tag: 'segCA',
				a: pointC,
				b: pointA,
				visible: true,
				color: 'blue'
			});

			app.updateFigDisplay();
			triangleCreated = true;
		} catch (error) {
			console.error('Error creating triangle:', error);
		}
	}

	// Example 2: Create Circle
	async function createCircle() {
		if (!mathGraphLoaded) return;

		try {
			if (!circleContainer) {
				console.error('circleContainer is not defined!');
				return;
			}

			// Clear the container and create canvas element
			circleContainer.innerHTML = '';
			const canvas = document.createElement('div');
			canvas.id = 'circle-canvas';
			canvas.style.width = `${circleContainer.clientWidth}px`;
			canvas.style.height = '350px';
			circleContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise((resolve) => setTimeout(resolve, 10));

			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: circleContainer.clientWidth,
				height: 350,
				level: 1
			});

			// Create center and radius point using English API with object references
			const center = app.addPointXY({
				tag: 'centerO',
				name: 'O₁',
				x: 5,
				y: 5,
				visible: true,
				nameVisible: true
			});

			const radiusPoint = app.addPointXY({
				tag: 'radiusP',
				name: 'P',
				x: 8,
				y: 5,
				visible: true,
				nameVisible: true
			});

			// Create circle using object references
			app.addCircleOA({
				tag: 'circle1',
				o: center,
				a: radiusPoint,
				visible: true,
				color: 'blue'
			});

			app.updateFigDisplay();
			circleCreated = true;
		} catch (error) {
			console.error('Error creating circle:', error);
		}
	}

	// Example 3: Perpendicular Bisector
	async function createBisector() {
		if (!mathGraphLoaded) return;

		try {
			// Always create a fresh canvas element
			bisectorContainer.innerHTML = ''; // Clear everything
			const canvas = document.createElement('div');
			canvas.id = 'bisector-canvas';
			canvas.style.width = `${bisectorContainer.clientWidth}px`;
			canvas.style.height = '350px';
			bisectorContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise((resolve) => setTimeout(resolve, 10));

			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: bisectorContainer.clientWidth,
				height: 350,
				level: 1
			});

			// Create segment AB using English API with object references
			const pointA = app.addPointXY({
				tag: 'pointD',
				name: 'D',
				x: 2,
				y: 5,
				visible: true,
				nameVisible: true
			});

			const pointB = app.addPointXY({
				tag: 'pointE',
				name: 'E',
				x: 8,
				y: 5,
				visible: true,
				nameVisible: true
			});

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const segmentAB = app.addSegment({
				tag: 'segDE',
				a: pointA,
				b: pointB,
				visible: true,
				color: 'blue'
			});

			// Create midpoint using object references
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const midpoint = app.addMidpoint({
				tag: 'midpointM',
				name: 'M₁',
				a: pointA,
				b: pointB,
				visible: true,
				nameVisible: true
			});

			// Create perpendicular line using tag references
			app.addLinePerp({
				tag: 'perpendicular',
				a: 'midpointM',
				d: 'segDE',
				color: 'red'
			});

			app.updateFigDisplay();
			bisectorCreated = true;
		} catch (error) {
			console.error('Error creating bisector:', error);
		}
	}

	// Example 4: Measurement Exercise
	async function createMeasurement() {
		if (!mathGraphLoaded) return;

		try {
			// Always create a fresh canvas element
			measureContainer.innerHTML = ''; // Clear everything
			const canvas = document.createElement('div');
			canvas.id = 'measure-canvas';
			canvas.style.width = `${measureContainer.clientWidth}px`;
			canvas.style.height = '350px';
			measureContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise((resolve) => setTimeout(resolve, 10));

			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: measureContainer.clientWidth,
				height: 350,
				level: 1
			});

			// Create right triangle using English API with object references
			const pointA = app.addPointXY({
				tag: 'pointF',
				name: 'F',
				x: 2,
				y: 2,
				visible: true,
				nameVisible: true
			});

			const pointB = app.addPointXY({
				tag: 'pointG',
				name: 'G',
				x: 8,
				y: 2,
				visible: true,
				nameVisible: true
			});

			const pointC = app.addPointXY({
				tag: 'pointH',
				name: 'H',
				x: 2,
				y: 7,
				visible: true,
				nameVisible: true
			});

			// Create segments using object references
			app.addSegment({
				tag: 'segAB',
				a: pointA,
				b: pointB,
				visible: true,
				color: 'blue'
			});

			app.addSegment({
				tag: 'segBC',
				a: pointB,
				b: pointC,
				visible: true,
				color: 'blue'
			});

			app.addSegment({
				tag: 'segCA',
				a: pointC,
				b: pointA,
				visible: true,
				color: 'blue'
			});

			// Create angle marks using tag references
			app.addAngleMark({
				tag: 'angleCAB',
				o: 'pointF',
				a: 'pointH',
				b: 'pointG',
				r: 30
			});

			app.addAngleMark({
				tag: 'angleABC',
				o: 'pointG',
				a: 'pointF',
				b: 'pointH',
				r: 30
			});

			app.addAngleMark({
				tag: 'angleBCA',
				o: 'pointH',
				a: 'pointG',
				b: 'pointF',
				r: 30
			});

			app.updateFigDisplay();
			measurementCreated = true;
		} catch (error) {
			console.error('Error creating measurement:', error);
		}
	}

	// Calculate grade demo
	function calculateDemoGrade() {
		const mockExercise: Partial<GeometryExercise> = {
			max_score: 100,
			passing_score: 60,
			time_limit_minutes: 15
		};

		const mockValidation: ValidationResults = {
			isValid: true,
			score: demoScore,
			maxScore: 100,
			errors: [],
			feedback: []
		};

		const hintPenalties = [];
		if (demoHints >= 1) hintPenalties.push({ level: 'specific' as const, penalty: 5 });
		if (demoHints >= 2) hintPenalties.push({ level: 'step_by_step' as const, penalty: 10 });
		if (demoHints >= 3) hintPenalties.push({ level: 'step_by_step' as const, penalty: 10 });

		gradeResult = calculateGrade(mockExercise as GeometryExercise, mockValidation, {
			hintsUsed: hintPenalties,
			timeSpent: demoTime,
			attemptNumber: demoAttempts
		});
	}

	// Auto-calculate when sliders change
	$effect(() => {
		if (demoScore !== undefined) {
			calculateDemoGrade();
		}
	});
</script>

<svelte:head>
	<title>Demo - Système de Géométrie | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 text-center">
		<h1 class="mb-4 text-4xl font-bold">Système d'Exercices de Géométrie</h1>
		<p class="text-lg text-muted-foreground">
			Plateforme complète d'exercices interactifs avec MathGraph32
		</p>
		<div class="mt-4 flex items-center justify-center gap-4">
			<Button href="/dashboard/teacher" variant="default">Interface Enseignant</Button>
			<Button href="/dashboard" variant="outline">Interface Élève</Button>
		</div>
	</div>

	<Separator class="my-8" />

	<!-- Loading State -->
	{#if !mathGraphLoaded && !loadingError}
		<Card.Root>
			<Card.Content class="p-12 text-center">
				<div class="mb-4 text-5xl">⏳</div>
				<p class="text-lg text-muted-foreground">Chargement de MathGraph32...</p>
			</Card.Content>
		</Card.Root>
	{:else if loadingError}
		<Card.Root>
			<Card.Content class="p-12 text-center">
				<div class="mb-4 text-5xl">❌</div>
				<p class="text-lg text-destructive">Erreur de chargement: {loadingError}</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Vérifiez votre connexion internet et rechargez la page.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Main Tabs -->
		<Tabs.Root value="interactive" class="w-full">
			<Tabs.List class="grid w-full grid-cols-5">
				<Tabs.Trigger value="interactive">Exemples Live</Tabs.Trigger>
				<Tabs.Trigger value="grading">Notation</Tabs.Trigger>
				<Tabs.Trigger value="features">Fonctionnalités</Tabs.Trigger>
				<Tabs.Trigger value="examples">Exercices</Tabs.Trigger>
				<Tabs.Trigger value="docs">Documentation</Tabs.Trigger>
			</Tabs.List>

			<!-- Interactive Examples Tab -->
			<Tabs.Content value="interactive" class="mt-6">
				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>🔺 Exemple 1 : Triangle Interactif (avec plein écran)</Card.Title>
							<Card.Description>
								Créez un triangle avec 3 points déplaçables - l'exemple le plus basique. Cliquez sur
								l'icône en bas à droite pour passer en plein écran !
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<Button onclick={createTriangle} disabled={triangleCreated}>
								{triangleCreated ? '✅ Triangle créé' : 'Créer le triangle'}
							</Button>
							<MathGraphFullscreen
								bind:container={triangleWrapper}
								onFullscreenChange={(isFullscreen) => console.log('Fullscreen:', isFullscreen)}
							>
								<div
									bind:this={triangleContainer}
									class="relative min-h-[350px] rounded-lg border border-border bg-card"
								>
									{#if !triangleCreated}
										<div class="flex h-[350px] items-center justify-center text-muted-foreground">
											Cliquez sur le bouton pour créer un triangle
										</div>
									{/if}
								</div>
							</MathGraphFullscreen>
							{#if triangleCreated}
								<div class="rounded-lg bg-muted/50 p-4 text-sm">
									<p class="font-semibold">💡 Essayez de déplacer les points A, B, C !</p>
									<p class="mt-1 text-muted-foreground">
										Les segments restent connectés car c'est une construction géométrique dynamique.
									</p>
									<p class="mt-2 text-xs font-semibold text-muted-foreground">
										🖥️ Astuce : Appuyez sur F ou cliquez sur l'icône pour passer en plein écran !
									</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>⭕ Exemple 2 : Cercle avec Rayon (avec plein écran)</Card.Title>
							<Card.Description>
								Cercle défini par son centre O et un point A sur le cercle. Cliquez sur l'icône en
								bas à droite pour passer en plein écran !
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<Button onclick={createCircle} disabled={circleCreated}>
								{circleCreated ? '✅ Cercle créé' : 'Créer le cercle'}
							</Button>
							<MathGraphFullscreen bind:container={circleWrapper}>
								<div
									bind:this={circleContainer}
									class="relative min-h-[350px] rounded-lg border border-border bg-card"
								>
									{#if !circleCreated}
										<div class="flex h-[350px] items-center justify-center text-muted-foreground">
											Cliquez sur le bouton pour créer un cercle
										</div>
									{/if}
								</div>
							</MathGraphFullscreen>
							{#if circleCreated}
								<div class="rounded-lg bg-muted/50 p-4 text-sm">
									<p class="font-semibold">💡 Déplacez le point O ou le point A !</p>
									<p class="mt-1 text-muted-foreground">
										Le cercle s'adapte automatiquement pour garder A sur sa circonférence.
									</p>
									<p class="mt-2 text-xs font-semibold text-muted-foreground">
										🖥️ Touche F ou Échap pour contrôler le plein écran !
									</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>📐 Exemple 3 : Médiatrice d'un Segment</Card.Title>
							<Card.Description>
								Construction classique : perpendiculaire au milieu d'un segment
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<Button onclick={createBisector} disabled={bisectorCreated}>
								{bisectorCreated ? '✅ Médiatrice créée' : 'Créer la médiatrice'}
							</Button>
							<div
								bind:this={bisectorContainer}
								class="min-h-[350px] rounded-lg border border-border bg-card"
							>
								{#if !bisectorCreated}
									<div class="flex h-[350px] items-center justify-center text-muted-foreground">
										Cliquez sur le bouton pour créer la médiatrice
									</div>
								{/if}
							</div>
							{#if bisectorCreated}
								<div class="rounded-lg bg-muted/50 p-4 text-sm">
									<p class="font-semibold">💡 Déplacez A ou B !</p>
									<p class="mt-1 text-muted-foreground">
										La médiatrice reste toujours perpendiculaire et passe par le milieu M.
									</p>
									<p class="mt-2 text-xs text-muted-foreground">
										Cet exemple montre comment le système valide les constructions d'élèves.
									</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>📏 Exemple 4 : Mesure d'Angles</Card.Title>
							<Card.Description>
								Triangle avec angles marqués pour exercices de mesure
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<Button onclick={createMeasurement} disabled={measurementCreated}>
								{measurementCreated ? '✅ Figure créée' : 'Créer la figure'}
							</Button>
							<div
								bind:this={measureContainer}
								class="min-h-[350px] rounded-lg border border-border bg-card"
							>
								{#if !measurementCreated}
									<div class="flex h-[350px] items-center justify-center text-muted-foreground">
										Cliquez sur le bouton pour créer la figure
									</div>
								{/if}
							</div>
							{#if measurementCreated}
								<div class="rounded-lg bg-muted/50 p-4 text-sm">
									<p class="font-semibold">💡 Exercice : Mesurez les 3 angles</p>
									<p class="mt-1 text-muted-foreground">
										Les élèves doivent mesurer α, β et γ, puis vérifier que α + β + γ = 180°
									</p>
									<p class="mt-2 text-xs text-muted-foreground">
										Le système valide automatiquement les mesures avec une tolérance de ±2°
									</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>

			<!-- Grading Demo Tab -->
			<Tabs.Content value="grading" class="mt-6">
				<div class="grid gap-6 lg:grid-cols-2">
					<Card.Root>
						<Card.Header>
							<Card.Title>Calculateur de Note Interactif</Card.Title>
							<Card.Description>
								Ajustez les paramètres pour voir comment la note est calculée
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-6">
							<!-- Score Slider -->
							<div class="space-y-2">
								<label class="flex items-center justify-between text-sm font-medium">
									<span>Score brut</span>
									<span class="text-muted-foreground">{demoScore}/100</span>
								</label>
								<input
									type="range"
									min="0"
									max="100"
									step="5"
									bind:value={demoScore}
									class="w-full"
								/>
							</div>

							<!-- Hints Slider -->
							<div class="space-y-2">
								<label class="flex items-center justify-between text-sm font-medium">
									<span>Indices utilisés</span>
									<span class="text-muted-foreground">{demoHints}</span>
								</label>
								<input
									type="range"
									min="0"
									max="3"
									step="1"
									bind:value={demoHints}
									class="w-full"
								/>
								<div class="text-xs text-muted-foreground">
									{#if demoHints === 0}
										Aucun indice
									{:else if demoHints === 1}
										1 indice (-5%)
									{:else if demoHints === 2}
										2 indices (-15%)
									{:else}
										3 indices (-25%)
									{/if}
								</div>
							</div>

							<!-- Time Slider -->
							<div class="space-y-2">
								<label class="flex items-center justify-between text-sm font-medium">
									<span>Temps utilisé</span>
									<span class="text-muted-foreground">{Math.floor(demoTime / 60)} min</span>
								</label>
								<input
									type="range"
									min="300"
									max="1800"
									step="60"
									bind:value={demoTime}
									class="w-full"
								/>
								<div class="text-xs text-muted-foreground">
									Limite: 15 min • Pénalité: -1% par minute au-delà
								</div>
							</div>

							<!-- Attempts Slider -->
							<div class="space-y-2">
								<label class="flex items-center justify-between text-sm font-medium">
									<span>Tentatives</span>
									<span class="text-muted-foreground">{demoAttempts}</span>
								</label>
								<input
									type="range"
									min="1"
									max="10"
									step="1"
									bind:value={demoAttempts}
									class="w-full"
								/>
								<div class="text-xs text-muted-foreground">
									Pénalité: -2% par tentative supplémentaire (max -10%)
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Grade Result -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Résultat de la Notation</Card.Title>
							<Card.Description>
								Calcul automatique avec toutes les pénalités appliquées
							</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if gradeResult}
								<div class="space-y-4">
									<!-- Letter Grade -->
									<div class="rounded-lg border-2 border-primary bg-primary/10 p-6 text-center">
										<div class="text-6xl font-bold text-primary">{gradeResult.grade}</div>
										<div class="text-2xl font-semibold text-muted-foreground">
											{gradeResult.percentage.toFixed(1)}%
										</div>
									</div>

									<!-- Score Breakdown -->
									<div class="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
										<div class="flex justify-between">
											<span>Score brut:</span>
											<span class="font-mono">{gradeResult.rawScore}/100</span>
										</div>
										<Separator />
										<div class="flex justify-between text-muted-foreground">
											<span>Pénalité indices:</span>
											<span class="font-mono">-{gradeResult.penalties.hints}pts</span>
										</div>
										<div class="flex justify-between text-muted-foreground">
											<span>Pénalité temps:</span>
											<span class="font-mono">-{gradeResult.penalties.time}pts</span>
										</div>
										<div class="flex justify-between text-muted-foreground">
											<span>Pénalité tentatives:</span>
											<span class="font-mono">-{gradeResult.penalties.attempts}pts</span>
										</div>
										<Separator />
										<div class="flex justify-between font-bold">
											<span>Score final:</span>
											<span class="font-mono">{gradeResult.finalScore}/100</span>
										</div>
									</div>

									<!-- Pass/Fail -->
									<div
										class="rounded-lg p-4 {gradeResult.passed
											? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
											: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
									>
										<p class="text-center font-semibold">
											{gradeResult.passed ? '✅ Exercice réussi !' : '❌ Exercice échoué'}
										</p>
										<p class="text-center text-sm">
											{gradeResult.passed
												? `Score supérieur au seuil de réussite (60%)`
												: `Score inférieur au seuil de réussite (60%)`}
										</p>
									</div>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Grade Scale -->
				<Card.Root class="mt-6">
					<Card.Header>
						<Card.Title>Barème de Notation</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-2 md:grid-cols-5">
							<div
								class="rounded-lg border-2 border-green-500 bg-green-50 p-3 text-center dark:bg-green-950"
							>
								<div class="text-2xl font-bold text-green-700 dark:text-green-300">A</div>
								<div class="text-xs text-green-600 dark:text-green-400">90-100%</div>
								<div class="text-xs text-green-600 dark:text-green-400">Excellent</div>
							</div>
							<div
								class="rounded-lg border-2 border-blue-500 bg-blue-50 p-3 text-center dark:bg-blue-950"
							>
								<div class="text-2xl font-bold text-blue-700 dark:text-blue-300">B</div>
								<div class="text-xs text-blue-600 dark:text-blue-400">80-89%</div>
								<div class="text-xs text-blue-600 dark:text-blue-400">Très bien</div>
							</div>
							<div
								class="rounded-lg border-2 border-yellow-500 bg-yellow-50 p-3 text-center dark:bg-yellow-950"
							>
								<div class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">C</div>
								<div class="text-xs text-yellow-600 dark:text-yellow-400">70-79%</div>
								<div class="text-xs text-yellow-600 dark:text-yellow-400">Bien</div>
							</div>
							<div
								class="rounded-lg border-2 border-orange-500 bg-orange-50 p-3 text-center dark:bg-orange-950"
							>
								<div class="text-2xl font-bold text-orange-700 dark:text-orange-300">D</div>
								<div class="text-xs text-orange-600 dark:text-orange-400">60-69%</div>
								<div class="text-xs text-orange-600 dark:text-orange-400">Satisfaisant</div>
							</div>
							<div
								class="rounded-lg border-2 border-red-500 bg-red-50 p-3 text-center dark:bg-red-950"
							>
								<div class="text-2xl font-bold text-red-700 dark:text-red-300">F</div>
								<div class="text-xs text-red-600 dark:text-red-400">0-59%</div>
								<div class="text-xs text-red-600 dark:text-red-400">Insuffisant</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Features Tab -->
			<Tabs.Content value="features" class="mt-6">
				<div class="grid gap-4 md:grid-cols-2">
					{#each systemFeatures as feature (feature.title)}
						<div class="flex items-start gap-3 rounded-lg border p-4">
							<div class="text-2xl">{feature.icon}</div>
							<div>
								<h4 class="font-semibold">{feature.title}</h4>
								<p class="text-sm text-muted-foreground">{feature.desc}</p>
							</div>
						</div>
					{/each}
				</div>

				<Card.Root class="mt-6">
					<Card.Header>
						<Card.Title>10 Outils de Construction</Card.Title>
						<Card.Description
							>Outils disponibles pour les exercices de construction</Card.Description
						>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-3 md:grid-cols-2">
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">📍</span>
								<span class="text-sm"><strong>Point</strong> - Créer un point libre</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">📏</span>
								<span class="text-sm"><strong>Droite</strong> - Tracer une droite</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">〰️</span>
								<span class="text-sm"><strong>Segment</strong> - Tracer un segment</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">🌙</span>
								<span class="text-sm"><strong>Cercle</strong> - Créer un cercle</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">⊥</span>
								<span class="text-sm"
									><strong>Perpendiculaire</strong> - Tracer une perpendiculaire</span
								>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">∥</span>
								<span class="text-sm"><strong>Parallèle</strong> - Tracer une parallèle</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">🎯</span>
								<span class="text-sm"><strong>Milieu</strong> - Point milieu d'un segment</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">∠</span>
								<span class="text-sm"><strong>Bissectrice</strong> - Bissectrice d'un angle</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">🎪</span>
								<span class="text-sm"><strong>Médiatrice</strong> - Médiatrice d'un segment</span>
							</div>
							<div class="flex items-center gap-2 rounded border p-2">
								<span class="font-mono text-sm">🔺</span>
								<span class="text-sm"><strong>Polygone</strong> - Créer un polygone</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Examples Tab -->
			<Tabs.Content value="examples" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>12 Exemples d'Exercices Complets</Card.Title>
						<Card.Description>Consultez GEOMETRY_EXAMPLES.md pour le code complet</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid gap-4 md:grid-cols-2">
							<div class="rounded-lg border p-4">
								<div class="mb-2 flex items-center justify-between">
									<h3 class="font-semibold">👁️ Exploration</h3>
									<span class="text-sm text-muted-foreground">3 exemples</span>
								</div>
								<ul class="space-y-1 text-sm text-muted-foreground">
									<li>• Triangle et cercle circonscrit</li>
									<li>• Théorème de Thalès</li>
									<li>• Homothétie et similitude</li>
								</ul>
							</div>

							<div class="rounded-lg border p-4">
								<div class="mb-2 flex items-center justify-between">
									<h3 class="font-semibold">📏 Mesure</h3>
									<span class="text-sm text-muted-foreground">3 exemples</span>
								</div>
								<ul class="space-y-1 text-sm text-muted-foreground">
									<li>• Triangle rectangle (angles)</li>
									<li>• Angles au centre et inscrits</li>
									<li>• Aires et périmètres</li>
								</ul>
							</div>

							<div class="rounded-lg border p-4">
								<div class="mb-2 flex items-center justify-between">
									<h3 class="font-semibold">🔧 Construction</h3>
									<span class="text-sm text-muted-foreground">3 exemples</span>
								</div>
								<ul class="space-y-1 text-sm text-muted-foreground">
									<li>• Médiatrice d'un segment</li>
									<li>• Cercle inscrit dans un triangle</li>
									<li>• Lieux géométriques</li>
								</ul>
							</div>

							<div class="rounded-lg border p-4">
								<div class="mb-2 flex items-center justify-between">
									<h3 class="font-semibold">📝 Démonstration</h3>
									<span class="text-sm text-muted-foreground">3 exemples</span>
								</div>
								<ul class="space-y-1 text-sm text-muted-foreground">
									<li>• Angles opposés par le sommet</li>
									<li>• Théorème de Pythagore</li>
									<li>• Théorème de Thalès</li>
								</ul>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Documentation Tab -->
			<Tabs.Content value="docs" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Documentation Complète</Card.Title>
						<Card.Description>
							~6,500 lignes de documentation + JSDoc sur 6 services
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each documentation as doc (doc.title)}
							<div class="rounded-lg border p-4">
								<div class="mb-2 flex items-start justify-between">
									<div>
										<h3 class="font-semibold">{doc.title}</h3>
										<p class="text-sm text-muted-foreground">{doc.desc}</p>
									</div>
									<span class="text-xs text-muted-foreground">{doc.lines}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
										{doc.audience}
									</span>
								</div>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{/if}

	<!-- Footer -->
	<div class="mt-8 rounded-lg bg-muted p-6 text-center">
		<h3 class="mb-2 text-lg font-semibold">Prêt à commencer ?</h3>
		<p class="mb-4 text-sm text-muted-foreground">
			Explorez les exercices de géométrie ou consultez la documentation complète
		</p>
		<div class="flex items-center justify-center gap-4">
			<Button href="/dashboard" variant="default">Tableau de bord</Button>
			<Button href="/dashboard/admin/debug/mathgraph" variant="outline">Plus d'exemples</Button>
		</div>
	</div>
</div>
