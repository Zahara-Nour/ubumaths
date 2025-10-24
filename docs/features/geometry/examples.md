# Geometry Exercise Examples

This document contains **12 complete exercise examples** demonstrating all 4 exercise types at different difficulty levels.

Each example includes:

- Complete JSON configuration
- TypeScript component usage
- Expected student workflow
- Validation details
- Grading rubric

## Table of Contents

### View/Explore Exercises

1. [Easy: Triangle and Circumcircle](#1-easy-triangle-and-circumcircle)
2. [Medium: Thales Theorem Exploration](#2-medium-thales-theorem-exploration)
3. [Hard: Homothety and Similarity](#3-hard-homothety-and-similarity)

### Measurement Exercises

4. [Easy: Right Triangle Measurements](#4-easy-right-triangle-measurements)
5. [Medium: Circle and Angles](#5-medium-circle-and-angles)
6. [Hard: Area and Perimeter Relationships](#6-hard-area-and-perimeter-relationships)

### Construction Exercises

7. [Easy: Perpendicular Bisector](#7-easy-perpendicular-bisector)
8. [Medium: Inscribed Circle](#8-medium-inscribed-circle)
9. [Hard: Geometric Locus Construction](#9-hard-geometric-locus-construction)

### Proof Exercises

10. [Easy: Vertically Opposite Angles](#10-easy-vertically-opposite-angles)
11. [Medium: Pythagorean Theorem](#11-medium-pythagorean-theorem)
12. [Hard: Thales Theorem Proof](#12-hard-thales-theorem-proof)

---

## View/Explore Exercises

### 1. Easy: Triangle and Circumcircle

**Learning Objectives:**

- Understand the circumcircle of a triangle
- Observe the relationship between triangle type and circumcenter position

**Exercise Configuration:**

```json
{
	"id": "ex001",
	"title": "Triangle et cercle circonscrit",
	"exercise_type": "view",
	"difficulty_level": "easy",
	"estimated_time": 10,
	"max_score": 100,
	"instructions": "Déplace les sommets du triangle ABC et observe le cercle circonscrit. Réponds ensuite aux questions.",
	"learning_objectives": [
		"Comprendre le cercle circonscrit",
		"Observer la position du centre selon le type de triangle"
	],
	"base_figure": "[Base64 encoded MathGraph32 figure]",
	"validation_mode": "manual",
	"validation_config": {
		"questions": [
			{
				"id": "q1",
				"text": "Le centre du cercle est-il toujours à l'intérieur du triangle ?",
				"type": "multiple_choice",
				"options": [
					"Oui, toujours",
					"Non, parfois il est à l'extérieur",
					"Non, parfois il est sur un côté"
				],
				"correct_answer": 1,
				"explanation": "Le centre est à l'intérieur pour un triangle acutangle, sur l'hypoténuse pour un triangle rectangle, et à l'extérieur pour un triangle obtusangle."
			},
			{
				"id": "q2",
				"text": "Dans quel cas le centre du cercle est-il sur un côté du triangle ?",
				"type": "multiple_choice",
				"options": [
					"Triangle équilatéral",
					"Triangle rectangle",
					"Triangle isocèle",
					"Triangle quelconque"
				],
				"correct_answer": 1,
				"explanation": "Dans un triangle rectangle, le centre du cercle circonscrit est situé au milieu de l'hypoténuse."
			}
		]
	},
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Le cercle circonscrit passe par les trois sommets du triangle. Son centre est équidistant des trois sommets."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Essaie de créer différents types de triangles : un triangle aigu (tous les angles < 90°), un triangle rectangle, et un triangle obtus (un angle > 90°). Observe où se trouve le centre dans chaque cas."
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "1. Crée un triangle aigu en rapprochant tous les sommets. Le centre est à l'intérieur.\n2. Crée un triangle rectangle en formant un angle droit. Le centre est sur l'hypoténuse.\n3. Crée un triangle obtus avec un angle très ouvert. Le centre est à l'extérieur."
		}
	],
	"display_grid": true,
	"allow_zoom": true
}
```

**Component Usage:**

```svelte
<script lang="ts">
	import GeometryExercise from '$lib/components/geometry/GeometryExercise.svelte';
	import type { GeometryExercise as Exercise } from '$lib/types/geometry';

	let { exercise }: { exercise: Exercise } = $props();
</script>

<GeometryExercise {exercise} />
```

**Figure Generation Code:**

```typescript
import { MathGraphService } from '$lib/services/mathgraph-api';

async function generateTriangleCircumcircle(container: HTMLElement) {
	const service = MathGraphService.getInstance();
	await service.loadMathGraph();

	const app = await service.initializePlayer(container, {
		width: 600,
		height: 400,
		coordinateSystem: 'mathematical'
	});

	// Create triangle vertices (free points)
	const A = app.createPoint('A', 100, 250, { free: true });
	const B = app.createPoint('B', 300, 100, { free: true });
	const C = app.createPoint('C', 500, 250, { free: true });

	// Create triangle sides
	app.createSegment('AB', 'A', 'B');
	app.createSegment('BC', 'B', 'C');
	app.createSegment('CA', 'C', 'A');

	// Create circumcircle (circle through 3 points)
	const circumcircle = app.createCircleThrough3Points('cercle', 'A', 'B', 'C');

	// Get and display circumcenter
	const center = app.createCircumcenter('O', 'A', 'B', 'C');
	center.setStyle({ color: 'red', size: 4 });

	// Add label
	app.createLabel('label_O', 'O', { attachTo: 'O', offset: { x: 10, y: -10 } });

	return app.exportToBase64();
}
```

**Expected Student Workflow:**

1. Student opens the exercise and sees the triangle with its circumcircle
2. Drags vertex A, B, or C to create different triangle shapes
3. Observes how the circumcenter position changes
4. Tries to create acute, right, and obtuse triangles
5. Answers the two questions based on observations
6. Validates to check answers

**Grading:**

```typescript
// Manual grading based on question answers
{
  "rubric": {
    "q1_correct": { "points": 50, "description": "Question 1 correcte" },
    "q2_correct": { "points": 50, "description": "Question 2 correcte" }
  },
  "passing_score": 50
}
```

---

### 2. Medium: Thales Theorem Exploration

**Learning Objectives:**

- Understand Thales' theorem on parallel lines
- Explore proportional relationships in similar triangles

**Exercise Configuration:**

```json
{
	"id": "ex002",
	"title": "Théorème de Thalès - Exploration",
	"exercise_type": "explore",
	"difficulty_level": "medium",
	"estimated_time": 20,
	"max_score": 100,
	"instructions": "Observe la configuration de Thalès. Les droites (BC) et (DE) sont parallèles. Déplace les points et observe les rapports de longueurs affichés.",
	"learning_objectives": [
		"Comprendre le théorème de Thalès",
		"Identifier les rapports égaux",
		"Vérifier la condition de parallélisme"
	],
	"base_figure": "[Base64 encoded figure]",
	"validation_mode": "manual",
	"validation_config": {
		"questions": [
			{
				"id": "q1",
				"text": "Quand les droites (BC) et (DE) sont parallèles, que peux-tu dire des rapports AB/AD et AC/AE ?",
				"type": "multiple_choice",
				"options": [
					"Ils sont toujours différents",
					"Ils sont toujours égaux",
					"Ils sont parfois égaux, parfois différents"
				],
				"correct_answer": 1
			},
			{
				"id": "q2",
				"text": "Si AB/AD = 0.6 et AC/AE = 0.6, que peux-tu conclure ?",
				"type": "multiple_choice",
				"options": [
					"Les droites (BC) et (DE) sont parallèles",
					"Les droites (BC) et (DE) sont perpendiculaires",
					"On ne peut rien conclure",
					"Le triangle ABC est rectangle"
				],
				"correct_answer": 0
			},
			{
				"id": "q3",
				"text": "Complète : Si (BC) // (DE), alors AB/AD = AC/AE = ___/___",
				"type": "fill_blank",
				"correct_answer": "BC/DE",
				"alternatives": ["BC / DE", "bc/de"]
			}
		]
	},
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Le théorème de Thalès dit que si deux droites sont parallèles, alors elles découpent des segments proportionnels sur deux sécantes."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Observe les mesures affichées : AB, AD, AC, AE, BC, DE. Calcule les rapports AB/AD, AC/AE et BC/DE. Que remarques-tu ?"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "1. Note que AB = 120mm, AD = 200mm → AB/AD = 0.6\n2. Note que AC = 90mm, AE = 150mm → AC/AE = 0.6\n3. Note que BC = 60mm, DE = 100mm → BC/DE = 0.6\n4. Les trois rapports sont égaux car (BC) // (DE)"
		}
	],
	"display_measurements": true,
	"display_grid": true
}
```

**Figure Generation Code:**

```typescript
async function generateThalesConfiguration(container: HTMLElement) {
	const service = MathGraphService.getInstance();
	const app = await service.initializePlayer(container, {
		width: 700,
		height: 500
	});

	// Create point A (apex)
	const A = app.createPoint('A', 100, 100, { free: true });

	// Create points D and E on two rays from A
	const D = app.createPoint('D', 400, 250, { free: true });
	const E = app.createPoint('E', 500, 200, { free: true });

	// Create rays
	app.createRay('ray_AD', 'A', 'D');
	app.createRay('ray_AE', 'A', 'E');

	// Create point B on ray AD (constrained)
	const B = app.createPointOnObject('B', 'ray_AD', 0.6); // 60% along the ray

	// Create parallel to (DE) through B
	const parallel = app.createParallel('parallel_BC', 'ray_AE', 'B');

	// Create point C at intersection
	const C = app.createIntersection('C', 'parallel_BC', 'ray_AE');

	// Create segments BC and DE
	app.createSegment('BC', 'B', 'C', { color: 'blue', width: 2 });
	app.createSegment('DE', 'D', 'E', { color: 'blue', width: 2 });

	// Create measurements
	const AB = app.createMeasurement('m_AB', 'distance', ['A', 'B'], { display: true });
	const AD = app.createMeasurement('m_AD', 'distance', ['A', 'D'], { display: true });
	const AC = app.createMeasurement('m_AC', 'distance', ['A', 'C'], { display: true });
	const AE = app.createMeasurement('m_AE', 'distance', ['A', 'E'], { display: true });
	const BC = app.createMeasurement('m_BC', 'distance', ['B', 'C'], { display: true });
	const DE = app.createMeasurement('m_DE', 'distance', ['D', 'E'], { display: true });

	// Create ratio calculations
	app.createCalculation('ratio_AB_AD', 'm_AB / m_AD', { display: true, precision: 2 });
	app.createCalculation('ratio_AC_AE', 'm_AC / m_AE', { display: true, precision: 2 });
	app.createCalculation('ratio_BC_DE', 'm_BC / m_DE', { display: true, precision: 2 });

	return app.exportToBase64();
}
```

**Expected Student Workflow:**

1. Student observes the Thales configuration with parallel lines
2. Sees the measurements and ratios displayed
3. Drags points to change the configuration while keeping parallelism
4. Notes that the three ratios remain equal
5. Answers the three questions
6. Validates

**Grading:**

```json
{
	"rubric": {
		"q1_correct": { "points": 30 },
		"q2_correct": { "points": 40 },
		"q3_correct": { "points": 30 }
	},
	"passing_score": 60
}
```

---

### 3. Hard: Homothety and Similarity

**Learning Objectives:**

- Understand homothety transformations
- Explore center and ratio of homothety
- Recognize similar figures

**Exercise Configuration:**

```json
{
	"id": "ex003",
	"title": "Homothétie et similitude",
	"exercise_type": "explore",
	"difficulty_level": "hard",
	"estimated_time": 30,
	"max_score": 100,
	"instructions": "Le triangle A'B'C' est l'image du triangle ABC par une homothétie de centre O. Explore les propriétés de cette transformation en déplaçant les points et en modifiant le rapport k.",
	"learning_objectives": [
		"Comprendre la transformation par homothétie",
		"Identifier le centre et le rapport",
		"Reconnaître les propriétés de conservation"
	],
	"base_figure": "[Base64 encoded figure]",
	"validation_mode": "manual",
	"validation_config": {
		"questions": [
			{
				"id": "q1",
				"text": "Que deviennent les longueurs dans une homothétie de rapport k = 2 ?",
				"type": "multiple_choice",
				"options": [
					"Elles sont multipliées par 2",
					"Elles sont divisées par 2",
					"Elles restent identiques",
					"Elles sont multipliées par 4"
				],
				"correct_answer": 0
			},
			{
				"id": "q2",
				"text": "Que deviennent les aires dans une homothétie de rapport k ?",
				"type": "multiple_choice",
				"options": [
					"Elles sont multipliées par k",
					"Elles sont multipliées par k²",
					"Elles sont multipliées par 2k",
					"Elles restent identiques"
				],
				"correct_answer": 1
			},
			{
				"id": "q3",
				"text": "Les triangles ABC et A'B'C' sont-ils toujours :",
				"type": "checkbox",
				"options": [
					"Isométriques (superposables)",
					"Semblables (similaires)",
					"De même périmètre",
					"De même aire"
				],
				"correct_answers": [1]
			},
			{
				"id": "q4",
				"text": "Si OA' = 150 mm et OA = 100 mm, quel est le rapport k de l'homothétie ?",
				"type": "numeric",
				"correct_answer": 1.5,
				"tolerance": 0.1,
				"unit": ""
			}
		]
	},
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Une homothétie de centre O et de rapport k transforme un point M en un point M' tel que : vecteur(OM') = k × vecteur(OM)"
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Observe comment les longueurs changent. Si AB = 80 mm et A'B' = 160 mm, le rapport est k = 160/80 = 2. Les aires sont multipliées par k² = 4."
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "1. Mesure AB et A'B'. Le rapport des longueurs est k.\n2. Mesure l'aire de ABC et A'B'C'. Le rapport des aires est k².\n3. Mesure les angles : ils restent identiques (homothétie = similitude).\n4. Les triangles sont semblables mais pas isométriques (sauf si k = 1)."
		}
	],
	"allow_parameter_modification": true,
	"parameters": {
		"ratio_k": {
			"type": "slider",
			"min": 0.5,
			"max": 3,
			"step": 0.1,
			"default": 1.5,
			"label": "Rapport k"
		}
	}
}
```

**Figure Generation with Dynamic Ratio:**

```typescript
async function generateHomothetyFigure(container: HTMLElement, ratio: number = 1.5) {
	const service = MathGraphService.getInstance();
	const app = await service.initializePlayer(container, {
		width: 800,
		height: 600
	});

	// Create center of homothety
	const O = app.createPoint('O', 100, 300, { free: true, style: { color: 'red', size: 5 } });

	// Create original triangle ABC
	const A = app.createPoint('A', 200, 200, { free: true });
	const B = app.createPoint('B', 300, 350, { free: true });
	const C = app.createPoint('C', 250, 250, { free: true });

	app.createPolygon('triangle_ABC', ['A', 'B', 'C'], {
		fillColor: 'rgba(0, 100, 255, 0.2)',
		strokeColor: 'blue',
		strokeWidth: 2
	});

	// Create homothetic triangle A'B'C'
	// A' such that OA' = k * OA
	const A_prime = app.createHomothetic('A_prime', 'A', 'O', ratio);
	const B_prime = app.createHomothetic('B_prime', 'B', 'O', ratio);
	const C_prime = app.createHomothetic('C_prime', 'C', 'O', ratio);

	app.createPolygon('triangle_A_prime_B_prime_C_prime', ['A_prime', 'B_prime', 'C_prime'], {
		fillColor: 'rgba(255, 100, 0, 0.2)',
		strokeColor: 'orange',
		strokeWidth: 2
	});

	// Draw lines from O through A, B, C to show the transformation
	app.createLine('line_OA', 'O', 'A', { style: 'dashed', color: 'gray' });
	app.createLine('line_OB', 'O', 'B', { style: 'dashed', color: 'gray' });
	app.createLine('line_OC', 'O', 'C', { style: 'dashed', color: 'gray' });

	// Create measurements
	app.createMeasurement('AB', 'distance', ['A', 'B'], {
		display: true,
		position: 'midpoint',
		color: 'blue'
	});
	app.createMeasurement('A_prime_B_prime', 'distance', ['A_prime', 'B_prime'], {
		display: true,
		position: 'midpoint',
		color: 'orange'
	});

	app.createMeasurement('area_ABC', 'area', ['A', 'B', 'C'], { display: true });
	app.createMeasurement('area_A_prime_B_prime_C_prime', 'area', ['A_prime', 'B_prime', 'C_prime'], {
		display: true
	});

	// Create ratio calculations
	app.createCalculation('length_ratio', 'A_prime_B_prime / AB', {
		display: true,
		precision: 2,
		label: 'Rapport des longueurs'
	});

	app.createCalculation('area_ratio', 'area_A_prime_B_prime_C_prime / area_ABC', {
		display: true,
		precision: 2,
		label: 'Rapport des aires'
	});

	return app.exportToBase64();
}
```

**Grading:**

```json
{
	"rubric": {
		"q1_correct": { "points": 20 },
		"q2_correct": { "points": 30 },
		"q3_correct": { "points": 30 },
		"q4_correct": { "points": 20 }
	},
	"passing_score": 70
}
```

---

## Measurement Exercises

### 4. Easy: Right Triangle Measurements

**Learning Objectives:**

- Measure lengths and angles in a right triangle
- Verify the angle sum property
- Introduction to Pythagorean theorem

**Exercise Configuration:**

```json
{
	"id": "ex004",
	"title": "Mesures dans un triangle rectangle",
	"exercise_type": "measure",
	"difficulty_level": "easy",
	"estimated_time": 15,
	"max_score": 100,
	"instructions": "Le triangle ABC est rectangle en B. Effectue les mesures demandées et vérifie les propriétés.",
	"learning_objectives": [
		"Savoir mesurer des longueurs et des angles",
		"Vérifier la somme des angles d'un triangle",
		"Découvrir le théorème de Pythagore"
	],
	"base_figure": "[Base64 encoded right triangle]",
	"validation_mode": "automatic",
	"validation_config": {
		"expectedMeasurements": {
			"angle_ABC": {
				"value": 90,
				"tolerance": 1,
				"unit": "degrees",
				"description": "L'angle en B doit être droit (90°)"
			},
			"angle_BAC": {
				"value": 53,
				"tolerance": 2,
				"unit": "degrees",
				"description": "Angle en A"
			},
			"angle_BCA": {
				"value": 37,
				"tolerance": 2,
				"unit": "degrees",
				"description": "Angle en C"
			},
			"distance_AB": {
				"value": 120,
				"tolerance": 3,
				"unit": "mm",
				"description": "Longueur du côté AB"
			},
			"distance_BC": {
				"value": 90,
				"tolerance": 3,
				"unit": "mm",
				"description": "Longueur du côté BC"
			},
			"distance_AC": {
				"value": 150,
				"tolerance": 3,
				"unit": "mm",
				"description": "Longueur de l'hypoténuse AC"
			}
		},
		"requiredMeasurementTypes": ["angle", "distance"],
		"minimumMeasurements": 6
	},
	"tools_allowed": ["measure_distance", "measure_angle"],
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Pour mesurer un angle, utilise l'outil 'Mesure d'angle' et clique sur 3 points : le premier côté, le sommet, puis le deuxième côté."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Mesure d'abord l'angle droit en B en cliquant sur A, B puis C. Ensuite mesure les deux autres angles. Puis mesure les trois côtés avec l'outil 'Mesure de distance'."
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "1. Clique sur l'outil 'Mesure d'angle'\n2. Clique sur A, puis B, puis C → angle ABC = 90°\n3. Clique sur B, puis A, puis C → angle BAC ≈ 53°\n4. Clique sur B, puis C, puis A → angle BCA ≈ 37°\n5. Clique sur l'outil 'Mesure de distance'\n6. Mesure AB, BC et AC en cliquant sur les extrémités"
		}
	],
	"display_grid": true,
	"allow_zoom": true
}
```

**Component Usage:**

```svelte
<script lang="ts">
	import MeasurementExercise from '$lib/components/geometry/exercises/MeasurementExercise.svelte';

	let { exercise } = $props();
</script>

<MeasurementExercise {exercise} />
```

**Validation Logic:**

```typescript
import { validateExercise } from '$lib/services/geometry-validator';

async function validateMeasurements(app: MathGraphApp, exercise: GeometryExercise) {
	const results = await validateExercise(app, exercise);

	// Check each expected measurement
	const expectedMeasurements = exercise.validation_config.expectedMeasurements;
	const measurements = app.getAllMeasurements();

	let score = 0;
	const maxScore = Object.keys(expectedMeasurements).length;
	const feedback: string[] = [];

	for (const [key, expected] of Object.entries(expectedMeasurements)) {
		const measurement = measurements.find((m) => m.tag === key);

		if (!measurement) {
			feedback.push(`❌ Mesure ${key} manquante`);
			continue;
		}

		const value = measurement.getValue();
		const diff = Math.abs(value - expected.value);

		if (diff <= expected.tolerance) {
			score++;
			feedback.push(`✅ ${expected.description} : ${value.toFixed(1)}${expected.unit} (correct)`);
		} else {
			feedback.push(
				`❌ ${expected.description} : ${value.toFixed(1)}${expected.unit} (attendu : ${expected.value}${expected.unit} ±${expected.tolerance})`
			);
		}
	}

	const percentage = (score / maxScore) * 100;

	return {
		passed: percentage >= 70,
		score,
		maxScore,
		percentage,
		feedback
	};
}
```

**Expected Student Workflow:**

1. Opens the exercise and sees a right triangle
2. Reads instructions to measure 3 angles and 3 sides
3. Selects "Measure angle" tool
4. Measures angle ABC (90°), BAC (~53°), BCA (~37°)
5. Selects "Measure distance" tool
6. Measures AB, BC, AC
7. Clicks "Validate" to check measurements
8. Receives feedback on each measurement

**Grading:**

```json
{
	"rubric": {
		"angle_ABC_correct": { "points": 20, "description": "Angle droit mesuré correctement" },
		"angle_BAC_correct": { "points": 15, "description": "Angle en A mesuré correctement" },
		"angle_BCA_correct": { "points": 15, "description": "Angle en C mesuré correctement" },
		"distance_AB_correct": { "points": 15, "description": "Côté AB mesuré correctement" },
		"distance_BC_correct": { "points": 15, "description": "Côté BC mesuré correctement" },
		"distance_AC_correct": { "points": 20, "description": "Hypoténuse AC mesurée correctement" }
	},
	"passing_score": 70
}
```

---

### 5. Medium: Circle and Angles

**Learning Objectives:**

- Measure inscribed and central angles
- Understand the inscribed angle theorem
- Work with arc measures

**Exercise Configuration:**

```json
{
	"id": "ex005",
	"title": "Angles au centre et angles inscrits",
	"exercise_type": "measure",
	"difficulty_level": "medium",
	"estimated_time": 20,
	"max_score": 100,
	"instructions": "Dans le cercle de centre O, mesure les angles au centre et les angles inscrits qui interceptent le même arc. Vérifie la relation entre eux.",
	"learning_objectives": [
		"Mesurer des angles au centre et inscrits",
		"Découvrir le théorème de l'angle inscrit",
		"Comprendre la relation angle = arc/2"
	],
	"base_figure": "[Base64 encoded circle with points]",
	"validation_mode": "automatic",
	"validation_config": {
		"expectedMeasurements": {
			"angle_AOB": {
				"value": 80,
				"tolerance": 3,
				"unit": "degrees",
				"description": "Angle au centre AOB"
			},
			"angle_ACB": {
				"value": 40,
				"tolerance": 3,
				"unit": "degrees",
				"description": "Angle inscrit ACB (doit être la moitié de AOB)"
			},
			"angle_ADB": {
				"value": 40,
				"tolerance": 3,
				"unit": "degrees",
				"description": "Angle inscrit ADB (doit être égal à ACB)"
			},
			"arc_AB": {
				"value": 80,
				"tolerance": 3,
				"unit": "degrees",
				"description": "Mesure de l'arc AB"
			}
		},
		"relationshipChecks": [
			{
				"type": "ratio",
				"measure1": "angle_AOB",
				"measure2": "angle_ACB",
				"expectedRatio": 2,
				"tolerance": 0.2,
				"description": "L'angle au centre est le double de l'angle inscrit"
			},
			{
				"type": "equality",
				"measure1": "angle_ACB",
				"measure2": "angle_ADB",
				"tolerance": 3,
				"description": "Les angles inscrits interceptant le même arc sont égaux"
			}
		]
	},
	"tools_allowed": ["measure_angle", "measure_arc"],
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Théorème de l'angle inscrit : Un angle inscrit dans un cercle mesure la moitié de l'angle au centre qui intercepte le même arc."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Mesure l'angle au centre ∠AOB, puis les angles inscrits ∠ACB et ∠ADB. Compare leurs valeurs. Tu devrais constater que ∠ACB = ∠ADB = (1/2) × ∠AOB."
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "1. Mesure ∠AOB (angle au centre) → devrait être ≈ 80°\n2. Mesure ∠ACB (angle inscrit) → devrait être ≈ 40°\n3. Mesure ∠ADB (autre angle inscrit) → devrait être ≈ 40°\n4. Mesure l'arc AB → devrait être ≈ 80°\n5. Vérifie : ∠ACB = (1/2) × ∠AOB et arc AB = ∠AOB"
		}
	],
	"display_grid": false,
	"allow_zoom": true
}
```

**Figure Generation:**

```typescript
async function generateCircleAnglesFigure(container: HTMLElement) {
	const service = MathGraphService.getInstance();
	const app = await service.initializePlayer(container, {
		width: 600,
		height: 600
	});

	// Create circle with center O
	const O = app.createPoint('O', 300, 300, { free: false, style: { color: 'red', size: 5 } });
	const circle = app.createCircle('circle', 'O', 150); // radius 150

	// Create points A and B on the circle
	const A = app.createPointOnCircle('A', 'circle', 0); // at angle 0°
	const B = app.createPointOnCircle('B', 'circle', 80); // at angle 80°

	// Create points C and D on the circle (inscribed angle vertices)
	const C = app.createPointOnCircle('C', 'circle', 200);
	const D = app.createPointOnCircle('D', 'circle', 320);

	// Draw the central angle AOB
	app.createSegment('OA', 'O', 'A', { color: 'red', width: 2 });
	app.createSegment('OB', 'O', 'B', { color: 'red', width: 2 });
	app.createAngleMark('mark_AOB', 'A', 'O', 'B', { color: 'red' });

	// Draw inscribed angle ACB
	app.createSegment('CA', 'C', 'A', { color: 'blue', width: 2 });
	app.createSegment('CB', 'C', 'B', { color: 'blue', width: 2 });
	app.createAngleMark('mark_ACB', 'A', 'C', 'B', { color: 'blue' });

	// Draw inscribed angle ADB
	app.createSegment('DA', 'D', 'A', { color: 'green', width: 2 });
	app.createSegment('DB', 'D', 'B', { color: 'green', width: 2 });
	app.createAngleMark('mark_ADB', 'A', 'D', 'B', { color: 'green' });

	// Draw arc AB
	app.createArc('arc_AB', 'O', 'A', 'B', { color: 'orange', width: 3 });

	// Add labels
	app.createLabel('label_O', 'O', { position: 'center' });
	app.createLabel('label_A', 'A', { position: 'auto' });
	app.createLabel('label_B', 'B', { position: 'auto' });
	app.createLabel('label_C', 'C', { position: 'auto' });
	app.createLabel('label_D', 'D', { position: 'auto' });

	return app.exportToBase64();
}
```

**Grading:**

```json
{
	"rubric": {
		"angle_AOB_correct": { "points": 20 },
		"angle_ACB_correct": { "points": 25 },
		"angle_ADB_correct": { "points": 25 },
		"arc_AB_correct": { "points": 15 },
		"relationship_ratio_correct": { "points": 10 },
		"relationship_equality_correct": { "points": 5 }
	},
	"passing_score": 70
}
```

---

### 6. Hard: Area and Perimeter Relationships

**Learning Objectives:**

- Calculate areas and perimeters of complex figures
- Understand relationships between similar figures
- Apply formulas for circles and polygons

**Exercise Configuration:**

```json
{
	"id": "ex006",
	"title": "Aires et périmètres - Relations",
	"exercise_type": "measure",
	"difficulty_level": "hard",
	"estimated_time": 30,
	"max_score": 100,
	"instructions": "La figure montre un carré ABCD inscrit dans un cercle. Calcule les aires et périmètres demandés et vérifie les relations.",
	"learning_objectives": [
		"Calculer des aires de figures complexes",
		"Calculer des périmètres incluant des arcs",
		"Comprendre les relations entre figures inscrites"
	],
	"base_figure": "[Base64 encoded figure]",
	"validation_mode": "automatic",
	"validation_config": {
		"expectedMeasurements": {
			"side_AB": {
				"value": 100,
				"tolerance": 2,
				"unit": "mm",
				"description": "Côté du carré"
			},
			"diagonal_AC": {
				"value": 141.42,
				"tolerance": 3,
				"unit": "mm",
				"description": "Diagonale du carré (AB × √2)"
			},
			"radius_circle": {
				"value": 70.71,
				"tolerance": 2,
				"unit": "mm",
				"description": "Rayon du cercle (diagonal / 2)"
			},
			"area_square": {
				"value": 10000,
				"tolerance": 200,
				"unit": "mm²",
				"description": "Aire du carré (AB²)"
			},
			"area_circle": {
				"value": 15707.96,
				"tolerance": 300,
				"unit": "mm²",
				"description": "Aire du cercle (π × r²)"
			},
			"area_corners": {
				"value": 5707.96,
				"tolerance": 300,
				"unit": "mm²",
				"description": "Aire des 4 coins (cercle - carré)"
			},
			"perimeter_square": {
				"value": 400,
				"tolerance": 10,
				"unit": "mm",
				"description": "Périmètre du carré (4 × AB)"
			},
			"circumference_circle": {
				"value": 444.29,
				"tolerance": 10,
				"unit": "mm",
				"description": "Périmètre du cercle (2πr)"
			}
		},
		"calculationChecks": [
			{
				"type": "formula",
				"formula": "diagonal_AC = side_AB * sqrt(2)",
				"tolerance": 0.05,
				"description": "La diagonale d'un carré = côté × √2"
			},
			{
				"type": "formula",
				"formula": "area_circle - area_square = area_corners",
				"tolerance": 100,
				"description": "L'aire des coins = aire du cercle - aire du carré"
			},
			{
				"type": "ratio",
				"measure1": "area_circle",
				"measure2": "area_square",
				"expectedRatio": 1.5708,
				"tolerance": 0.05,
				"description": "Le rapport aire_cercle / aire_carré ≈ π/2"
			}
		]
	},
	"tools_allowed": ["measure_distance", "measure_area", "measure_perimeter", "calculation"],
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Dans un carré inscrit dans un cercle, la diagonale du carré est égale au diamètre du cercle. Utilise cette relation pour calculer le rayon."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Étapes :\n1. Mesure le côté AB du carré\n2. Calcule la diagonale : diagonal = AB × √2 (≈ AB × 1.414)\n3. Le rayon du cercle = diagonal / 2\n4. Aire carré = AB²\n5. Aire cercle = π × r²\n6. Aire des coins = aire cercle - aire carré"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "Solution complète :\n1. Mesure AB = 100 mm\n2. Calcul diagonal : 100 × 1.414 = 141.4 mm\n3. Rayon cercle : 141.4 / 2 = 70.7 mm\n4. Aire carré : 100² = 10000 mm²\n5. Aire cercle : π × 70.7² ≈ 15708 mm²\n6. Aire coins : 15708 - 10000 = 5708 mm²\n7. Périmètre carré : 4 × 100 = 400 mm\n8. Périmètre cercle : 2π × 70.7 ≈ 444 mm"
		}
	],
	"allow_calculations": true,
	"display_grid": true
}
```

**Validation with Calculations:**

```typescript
async function validateComplexMeasurements(app: MathGraphApp, exercise: GeometryExercise) {
	const measurements = app.getAllMeasurements();
	const calculations = app.getAllCalculations();

	const results: ValidationResult = {
		passed: false,
		score: 0,
		maxScore: 0,
		feedback: []
	};

	// Validate measurements
	for (const [key, expected] of Object.entries(exercise.validation_config.expectedMeasurements)) {
		const measurement = measurements.find((m) => m.tag === key);
		results.maxScore += 10;

		if (measurement && Math.abs(measurement.getValue() - expected.value) <= expected.tolerance) {
			results.score += 10;
			results.feedback.push(`✅ ${expected.description}`);
		} else {
			results.feedback.push(
				`❌ ${expected.description} : ${measurement ? 'valeur incorrecte' : 'mesure manquante'}`
			);
		}
	}

	// Validate calculation checks
	for (const check of exercise.validation_config.calculationChecks) {
		results.maxScore += 10;

		if (check.type === 'formula') {
			// Evaluate the formula
			const isValid = evaluateFormula(check.formula, measurements, check.tolerance);
			if (isValid) {
				results.score += 10;
				results.feedback.push(`✅ ${check.description}`);
			} else {
				results.feedback.push(`❌ ${check.description}`);
			}
		}
	}

	results.passed = results.score / results.maxScore >= 0.7;

	return results;
}

function evaluateFormula(formula: string, measurements: Measurement[], tolerance: number): boolean {
	// Parse and evaluate mathematical formula
	// Example: "diagonal_AC = side_AB * sqrt(2)"
	const parts = formula.split('=');
	const left = evaluateExpression(parts[0].trim(), measurements);
	const right = evaluateExpression(parts[1].trim(), measurements);

	return Math.abs(left - right) / Math.max(left, right) <= tolerance;
}
```

**Grading:**

```json
{
	"rubric": {
		"measurements_basic": {
			"points": 40,
			"description": "Mesures de base (côté, diagonale, rayon)"
		},
		"measurements_area": { "points": 30, "description": "Aires (carré, cercle, coins)" },
		"measurements_perimeter": { "points": 20, "description": "Périmètres" },
		"formula_checks": { "points": 10, "description": "Vérifications de formules" }
	},
	"passing_score": 70
}
```

---

## Construction Exercises

### 7. Easy: Perpendicular Bisector

**Learning Objectives:**

- Construct the perpendicular bisector of a segment
- Use midpoint and perpendicular tools
- Verify construction by dragging

**Exercise Configuration:**

```json
{
	"id": "ex007",
	"title": "Médiatrice d'un segment",
	"exercise_type": "construct",
	"difficulty_level": "easy",
	"estimated_time": 15,
	"max_score": 100,
	"instructions": "Construis la médiatrice du segment [AB]. La médiatrice est la droite perpendiculaire à [AB] passant par son milieu.",
	"learning_objectives": [
		"Savoir construire une médiatrice",
		"Utiliser les outils milieu et perpendiculaire",
		"Comprendre les propriétés de la médiatrice"
	],
	"base_figure": "[Base64 encoded segment AB]",
	"validation_mode": "automatic",
	"validation_config": {
		"requiredObjects": ["point_M", "line_mediatrice"],
		"objectTypes": {
			"point_M": "point",
			"line_mediatrice": "line"
		},
		"geometricChecks": [
			{
				"type": "midpoint",
				"pointTag": "point_M",
				"segment": ["A", "B"],
				"tolerance": 2,
				"description": "M est le milieu de [AB]"
			},
			{
				"type": "perpendicular",
				"line1Tag": "line_mediatrice",
				"line2": ["A", "B"],
				"angleTolerance": 2,
				"description": "La médiatrice est perpendiculaire à [AB]"
			},
			{
				"type": "pointOnLine",
				"pointTag": "point_M",
				"lineTag": "line_mediatrice",
				"tolerance": 2,
				"description": "M est sur la médiatrice"
			}
		]
	},
	"tools_allowed": ["point", "line", "midpoint", "perpendicular"],
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "La médiatrice d'un segment est la droite perpendiculaire au segment passant par son milieu. Tu auras besoin de deux outils : Milieu et Perpendiculaire."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Étape 1 : Utilise l'outil Milieu pour trouver le point M, milieu de [AB].\nÉtape 2 : Utilise l'outil Perpendiculaire pour tracer la droite perpendiculaire à [AB] passant par M."
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "1. Clique sur l'outil Milieu 🎯\n2. Clique sur le point A\n3. Clique sur le point B\n4. Le point M apparaît (milieu de [AB])\n5. Clique sur l'outil Perpendiculaire ⊥\n6. Clique sur le segment [AB]\n7. Clique sur le point M\n8. La médiatrice est tracée !\n9. Clique sur Valider"
		}
	],
	"display_grid": true,
	"allow_zoom": true
}
```

**Base Figure Generation:**

```typescript
async function generateSegmentAB(container: HTMLElement) {
	const service = MathGraphService.getInstance();
	const app = await service.initializePlayer(container, {
		width: 600,
		height: 400
	});

	// Create two free points A and B
	const A = app.createPoint('A', 150, 200, { free: true, style: { color: 'blue', size: 5 } });
	const B = app.createPoint('B', 450, 200, { free: true, style: { color: 'blue', size: 5 } });

	// Create segment [AB]
	app.createSegment('segment_AB', 'A', 'B', { color: 'blue', width: 2 });

	// Add labels
	app.createLabel('label_A', 'A', { position: 'left' });
	app.createLabel('label_B', 'B', { position: 'right' });

	return app.exportToBase64();
}
```

**Validation Code:**

```typescript
import {
	validatePointExists,
	validateLineExists,
	validatePointIsMidpoint,
	validateLinesPerpendiular,
	validatePointOnLine
} from '$lib/services/geometry-validator';

async function validatePerpendicularBisector(
	app: MathGraphApp,
	exercise: GeometryExercise
): Promise<ValidationResults> {
	const results: ValidationResults = {
		passed: false,
		score: 0,
		maxScore: 100,
		feedback: [],
		details: {}
	};

	// Check required objects exist
	const hasMidpoint = validatePointExists(app, 'point_M');
	const hasMediator = validateLineExists(app, 'line_mediatrice');

	if (!hasMidpoint) {
		results.feedback.push('❌ Le point M (milieu) est manquant');
		return results;
	}

	if (!hasMediator) {
		results.feedback.push('❌ La médiatrice est manquante');
		return results;
	}

	// Check M is midpoint of AB
	const isMidpoint = validatePointIsMidpoint(app, 'point_M', 'A', 'B', 2);
	if (isMidpoint) {
		results.score += 40;
		results.feedback.push('✅ M est bien le milieu de [AB]');
	} else {
		results.feedback.push("❌ M n'est pas le milieu de [AB]");
	}

	// Check mediator is perpendicular to AB
	const isPerpendicular = validateLinesPerpendicular(app, 'line_mediatrice', 'segment_AB', 2);
	if (isPerpendicular) {
		results.score += 40;
		results.feedback.push('✅ La médiatrice est perpendiculaire à [AB]');
	} else {
		results.feedback.push("❌ La médiatrice n'est pas perpendiculaire à [AB]");
	}

	// Check M is on mediator
	const isOnLine = validatePointOnLine(app, 'point_M', 'line_mediatrice', 2);
	if (isOnLine) {
		results.score += 20;
		results.feedback.push('✅ M est sur la médiatrice');
	} else {
		results.feedback.push("❌ M n'est pas sur la médiatrice");
	}

	results.passed = results.score >= 70;

	return results;
}
```

**Expected Student Workflow:**

1. Student sees segment [AB]
2. Reads instructions about perpendicular bisector
3. Selects Midpoint tool
4. Clicks on A, then B → Point M appears
5. Selects Perpendicular tool
6. Clicks on segment [AB], then point M → Line appears
7. Tags the line as "line_mediatrice"
8. Clicks Validate
9. Sees feedback confirming construction is correct
10. Drags points A and B to verify construction remains valid

**Grading:**

```json
{
	"rubric": {
		"midpoint_correct": { "points": 40, "description": "Point M correctement placé au milieu" },
		"perpendicular_correct": { "points": 40, "description": "Médiatrice perpendiculaire à [AB]" },
		"point_on_line": { "points": 20, "description": "M est sur la médiatrice" }
	},
	"passing_score": 70,
	"achievements": {
		"perfect_construction": "Construction parfaite sans erreur",
		"robust_construction": "Construction reste valide après déplacement des points"
	}
}
```

---

### 8. Medium: Inscribed Circle

**Learning Objectives:**

- Construct the inscribed circle of a triangle
- Use angle bisector tool
- Understand the incenter of a triangle

**Exercise Configuration:**

```json
{
	"id": "ex008",
	"title": "Cercle inscrit dans un triangle",
	"exercise_type": "construct",
	"difficulty_level": "medium",
	"estimated_time": 25,
	"max_score": 100,
	"instructions": "Construis le cercle inscrit dans le triangle ABC. Le centre I du cercle inscrit est le point d'intersection des trois bissectrices. Le rayon est la distance de I à un côté du triangle.",
	"learning_objectives": [
		"Construire les bissectrices d'un triangle",
		"Trouver le centre du cercle inscrit (incentre)",
		"Construire un cercle tangent aux trois côtés"
	],
	"base_figure": "[Base64 encoded triangle ABC]",
	"validation_mode": "automatic",
	"validation_config": {
		"requiredObjects": ["bisector_A", "bisector_B", "point_I", "point_H", "circle_inscrit"],
		"geometricChecks": [
			{
				"type": "angleBisector",
				"lineTag": "bisector_A",
				"vertex": "A",
				"side1": ["A", "B"],
				"side2": ["A", "C"],
				"angleTolerance": 2,
				"description": "Bissectrice de l'angle en A"
			},
			{
				"type": "angleBisector",
				"lineTag": "bisector_B",
				"vertex": "B",
				"side1": ["B", "A"],
				"side2": ["B", "C"],
				"angleTolerance": 2,
				"description": "Bissectrice de l'angle en B"
			},
			{
				"type": "intersection",
				"pointTag": "point_I",
				"object1Tag": "bisector_A",
				"object2Tag": "bisector_B",
				"tolerance": 3,
				"description": "I est l'intersection des bissectrices"
			},
			{
				"type": "perpendicularFoot",
				"pointTag": "point_H",
				"fromPoint": "point_I",
				"toLine": ["A", "B"],
				"tolerance": 3,
				"description": "H est le pied de la perpendiculaire de I à [AB]"
			},
			{
				"type": "circleCenterRadius",
				"circleTag": "circle_inscrit",
				"centerTag": "point_I",
				"radiusPoints": ["point_I", "point_H"],
				"tolerance": 3,
				"description": "Cercle de centre I et de rayon IH"
			},
			{
				"type": "circleTangentToLine",
				"circleTag": "circle_inscrit",
				"lineTag": "segment_AB",
				"tolerance": 3,
				"description": "Le cercle est tangent à [AB]"
			},
			{
				"type": "circleTangentToLine",
				"circleTag": "circle_inscrit",
				"lineTag": "segment_BC",
				"tolerance": 3,
				"description": "Le cercle est tangent à [BC]"
			},
			{
				"type": "circleTangentToLine",
				"circleTag": "circle_inscrit",
				"lineTag": "segment_CA",
				"tolerance": 3,
				"description": "Le cercle est tangent à [CA]"
			}
		]
	},
	"tools_allowed": ["point", "line", "bisector", "perpendicular", "circle", "intersection"],
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Le centre du cercle inscrit (l'incentre) est le point de concours des trois bissectrices du triangle. Le rayon est la distance de ce centre à n'importe quel côté."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Étapes :\n1. Trace les bissectrices de deux angles du triangle (par exemple en A et en B)\n2. Trouve leur point d'intersection I (l'incentre)\n3. Trace la perpendiculaire de I à un côté (par exemple [AB])\n4. Le pied H de cette perpendiculaire donne le rayon IH\n5. Trace le cercle de centre I passant par H"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "Solution complète :\n1. Outil Bissectrice → Clique sur B, A, C → Bissectrice de l'angle en A\n2. Outil Bissectrice → Clique sur A, B, C → Bissectrice de l'angle en B\n3. Outil Intersection → Clique sur les deux bissectrices → Point I\n4. Outil Perpendiculaire → Clique sur [AB], puis sur I → Perpendiculaire\n5. Outil Intersection → Intersection de la perpendiculaire et [AB] → Point H\n6. Outil Cercle → Centre I, passant par H → Cercle inscrit"
		}
	],
	"display_grid": true,
	"allow_zoom": true
}
```

**Figure Generation:**

```typescript
async function generateTriangleABC(container: HTMLElement) {
	const service = MathGraphService.getInstance();
	const app = await service.initializePlayer(container, {
		width: 700,
		height: 600
	});

	// Create triangle vertices
	const A = app.createPoint('A', 200, 150, { free: true, style: { color: 'blue', size: 5 } });
	const B = app.createPoint('B', 500, 450, { free: true, style: { color: 'blue', size: 5 } });
	const C = app.createPoint('C', 600, 200, { free: true, style: { color: 'blue', size: 5 } });

	// Create triangle sides
	app.createSegment('segment_AB', 'A', 'B', { color: 'blue', width: 2 });
	app.createSegment('segment_BC', 'B', 'C', { color: 'blue', width: 2 });
	app.createSegment('segment_CA', 'C', 'A', { color: 'blue', width: 2 });

	// Add labels
	app.createLabel('label_A', 'A', { position: 'top-left' });
	app.createLabel('label_B', 'B', { position: 'bottom' });
	app.createLabel('label_C', 'C', { position: 'top-right' });

	return app.exportToBase64();
}
```

**Grading:**

```json
{
	"rubric": {
		"bisectors_correct": { "points": 30, "description": "Deux bissectrices correctement tracées" },
		"incenter_correct": { "points": 20, "description": "Centre I correctement trouvé" },
		"perpendicular_correct": { "points": 20, "description": "Perpendiculaire et point H corrects" },
		"circle_correct": { "points": 20, "description": "Cercle de centre I et rayon IH" },
		"tangency_verified": {
			"points": 10,
			"description": "Le cercle est bien tangent aux trois côtés"
		}
	},
	"passing_score": 70
}
```

---

### 9. Hard: Geometric Locus Construction

**Learning Objectives:**

- Understand geometric loci
- Construct the set of points equidistant from two lines
- Combine multiple construction techniques

**Exercise Configuration:**

```json
{
	"id": "ex009",
	"title": "Lieu géométrique - Points équidistants",
	"exercise_type": "construct",
	"difficulty_level": "hard",
	"estimated_time": 35,
	"max_score": 100,
	"instructions": "Construis l'ensemble des points équidistants des deux droites (d1) et (d2). Cet ensemble est formé par les deux bissectrices de l'angle formé par les droites.",
	"learning_objectives": [
		"Comprendre la notion de lieu géométrique",
		"Identifier les bissectrices comme équidistance",
		"Maîtriser les constructions complexes"
	],
	"base_figure": "[Base64 encoded two intersecting lines]",
	"validation_mode": "automatic",
	"validation_config": {
		"requiredObjects": [
			"point_O",
			"bisector_1",
			"bisector_2",
			"point_M1",
			"point_M2",
			"perpendicular_M1_d1",
			"perpendicular_M1_d2"
		],
		"geometricChecks": [
			{
				"type": "intersection",
				"pointTag": "point_O",
				"object1Tag": "line_d1",
				"object2Tag": "line_d2",
				"tolerance": 2,
				"description": "O est l'intersection des deux droites"
			},
			{
				"type": "angleBisector",
				"lineTag": "bisector_1",
				"vertex": "point_O",
				"side1Tag": "line_d1",
				"side2Tag": "line_d2",
				"angleTolerance": 2,
				"description": "Première bissectrice de l'angle formé par d1 et d2"
			},
			{
				"type": "angleBisector",
				"lineTag": "bisector_2",
				"vertex": "point_O",
				"side1Tag": "line_d1",
				"side2Tag": "line_d2",
				"isOtherBisector": true,
				"angleTolerance": 2,
				"description": "Deuxième bissectrice (perpendiculaire à la première)"
			},
			{
				"type": "pointOnLine",
				"pointTag": "point_M1",
				"lineTag": "bisector_1",
				"tolerance": 2,
				"description": "M1 est sur la première bissectrice"
			},
			{
				"type": "equidistantFromLines",
				"pointTag": "point_M1",
				"line1Tag": "line_d1",
				"line2Tag": "line_d2",
				"tolerance": 3,
				"description": "M1 est équidistant de d1 et d2"
			},
			{
				"type": "pointOnLine",
				"pointTag": "point_M2",
				"lineTag": "bisector_2",
				"tolerance": 2,
				"description": "M2 est sur la deuxième bissectrice"
			},
			{
				"type": "equidistantFromLines",
				"pointTag": "point_M2",
				"line1Tag": "line_d1",
				"line2Tag": "line_d2",
				"tolerance": 3,
				"description": "M2 est équidistant de d1 et d2"
			}
		]
	},
	"tools_allowed": ["point", "line", "bisector", "perpendicular", "intersection", "measurement"],
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Un point est équidistant de deux droites si sa distance à la première droite est égale à sa distance à la deuxième droite. L'ensemble de ces points forme deux droites : les bissectrices de l'angle formé par les deux droites données."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Stratégie :\n1. Trouve le point d'intersection O des deux droites\n2. Les bissectrices de l'angle en O sont les lieux recherchés\n3. Il y a deux bissectrices (perpendiculaires entre elles)\n4. Pour vérifier, place un point M sur une bissectrice et mesure sa distance aux deux droites : elles doivent être égales"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "Solution détaillée :\n1. Outil Intersection → Trouve O (intersection de d1 et d2)\n2. Outil Bissectrice → Trace la première bissectrice de l'angle formé par d1 et d2\n3. Outil Perpendiculaire → Trace la perpendiculaire à la première bissectrice passant par O (deuxième bissectrice)\n4. Place un point M1 sur la première bissectrice\n5. Outil Perpendiculaire → Perpendiculaire de M1 à d1\n6. Outil Perpendiculaire → Perpendiculaire de M1 à d2\n7. Outil Mesure → Mesure les deux distances (elles doivent être égales)\n8. Répète pour M2 sur la deuxième bissectrice"
		}
	],
	"display_grid": false,
	"allow_zoom": true,
	"verification_hints": [
		"Déplace les points M1 et M2 le long des bissectrices : les distances restent égales",
		"Les deux bissectrices sont perpendiculaires entre elles"
	]
}
```

**Validation Code:**

```typescript
async function validateGeometricLocus(
	app: MathGraphApp,
	exercise: GeometryExercise
): Promise<ValidationResults> {
	// Complex validation checking:
	// 1. Two bisectors are constructed
	// 2. They are perpendicular to each other
	// 3. Points on bisectors are equidistant from the two lines
	// 4. Distance measurements confirm equidistance

	const results: ValidationResults = {
		passed: false,
		score: 0,
		maxScore: 100,
		feedback: []
	};

	// Check intersection point O
	const O = app.getObjectByTag('point_O');
	if (!O || !isIntersectionPoint(O, 'line_d1', 'line_d2')) {
		results.feedback.push('❌ Point O (intersection de d1 et d2) manquant ou incorrect');
		return results;
	}
	results.score += 15;
	results.feedback.push('✅ Point O correctement trouvé');

	// Check first bisector
	const bisector1 = app.getObjectByTag('bisector_1');
	if (!bisector1 || !isAngleBisector(bisector1, 'point_O', 'line_d1', 'line_d2')) {
		results.feedback.push('❌ Première bissectrice manquante ou incorrecte');
	} else {
		results.score += 25;
		results.feedback.push('✅ Première bissectrice correctement tracée');
	}

	// Check second bisector
	const bisector2 = app.getObjectByTag('bisector_2');
	if (!bisector2 || !isPerpendicularTo(bisector2, bisector1)) {
		results.feedback.push('❌ Deuxième bissectrice manquante ou pas perpendiculaire à la première');
	} else {
		results.score += 25;
		results.feedback.push('✅ Deuxième bissectrice correctement tracée');
	}

	// Check point M1 on bisector 1
	const M1 = app.getObjectByTag('point_M1');
	if (M1 && isPointOnLine(M1, bisector1)) {
		const dist1 = distancePointToLine(M1, 'line_d1');
		const dist2 = distancePointToLine(M1, 'line_d2');

		if (Math.abs(dist1 - dist2) <= 3) {
			results.score += 17.5;
			results.feedback.push(
				`✅ Point M1 est équidistant de d1 (${dist1.toFixed(1)}mm) et d2 (${dist2.toFixed(1)}mm)`
			);
		} else {
			results.feedback.push(
				`❌ Point M1 n'est pas équidistant : d(M1,d1) = ${dist1.toFixed(1)}mm, d(M1,d2) = ${dist2.toFixed(1)}mm`
			);
		}
	}

	// Check point M2 on bisector 2
	const M2 = app.getObjectByTag('point_M2');
	if (M2 && isPointOnLine(M2, bisector2)) {
		const dist1 = distancePointToLine(M2, 'line_d1');
		const dist2 = distancePointToLine(M2, 'line_d2');

		if (Math.abs(dist1 - dist2) <= 3) {
			results.score += 17.5;
			results.feedback.push(
				`✅ Point M2 est équidistant de d1 (${dist1.toFixed(1)}mm) et d2 (${dist2.toFixed(1)}mm)`
			);
		} else {
			results.feedback.push(`❌ Point M2 n'est pas équidistant`);
		}
	}

	results.passed = results.score >= 70;

	return results;
}
```

**Grading:**

```json
{
	"rubric": {
		"intersection_point": { "points": 15, "description": "Point O d'intersection trouvé" },
		"first_bisector": { "points": 25, "description": "Première bissectrice correcte" },
		"second_bisector": {
			"points": 25,
			"description": "Deuxième bissectrice correcte et perpendiculaire"
		},
		"verification_M1": { "points": 17.5, "description": "M1 vérifie l'équidistance" },
		"verification_M2": { "points": 17.5, "description": "M2 vérifie l'équidistance" }
	},
	"passing_score": 70,
	"bonus_points": {
		"perpendicular_measurements_shown": 5,
		"multiple_verification_points": 5
	}
}
```

---

## Proof Exercises

### 10. Easy: Vertically Opposite Angles

**Learning Objectives:**

- Understand vertically opposite angles
- Write a simple geometric proof
- Use supplementary angles property

**Exercise Configuration:**

```json
{
	"id": "ex010",
	"title": "Angles opposés par le sommet",
	"exercise_type": "proof",
	"difficulty_level": "easy",
	"estimated_time": 15,
	"max_score": 100,
	"instructions": "Deux droites (AB) et (CD) se coupent en O. Démontre que les angles ∠AOC et ∠BOD sont égaux.",
	"learning_objectives": [
		"Comprendre les angles opposés par le sommet",
		"Utiliser les angles adjacents supplémentaires",
		"Rédiger une démonstration simple"
	],
	"base_figure": "[Base64 encoded two intersecting lines]",
	"validation_mode": "automatic",
	"validation_config": {
		"propertyToProve": "∠AOC = ∠BOD",
		"givenInformation": ["Les droites (AB) et (CD) se coupent en O"],
		"requiredSteps": [
			{
				"id": "step1",
				"statement": "∠AOC + ∠COB = 180°",
				"acceptedJustifications": [
					"angles_supplementary",
					"angles_on_straight_line",
					"definition_straight_angle"
				],
				"points": 30
			},
			{
				"id": "step2",
				"statement": "∠BOD + ∠COB = 180°",
				"acceptedJustifications": [
					"angles_supplementary",
					"angles_on_straight_line",
					"definition_straight_angle"
				],
				"points": 30
			},
			{
				"id": "step3",
				"statement": "∠AOC + ∠COB = ∠BOD + ∠COB",
				"acceptedJustifications": ["equality_of_sums", "both_equal_180", "transitive_property"],
				"points": 20
			},
			{
				"id": "step4",
				"statement": "∠AOC = ∠BOD",
				"acceptedJustifications": [
					"simplification",
					"subtract_common_term",
					"vertically_opposite_angles"
				],
				"points": 20
			}
		],
		"availableJustifications": [
			{
				"id": "angles_supplementary",
				"label": "Angles adjacents supplémentaires",
				"description": "Deux angles adjacents qui forment un angle plat sont supplémentaires (somme = 180°)"
			},
			{
				"id": "angles_on_straight_line",
				"label": "Angles sur une droite",
				"description": "Les angles adjacents formés par une droite somment à 180°"
			},
			{
				"id": "definition_straight_angle",
				"label": "Définition d'un angle plat",
				"description": "Un angle plat mesure 180°"
			},
			{
				"id": "equality_of_sums",
				"label": "Égalité de sommes",
				"description": "Si deux sommes sont égales à la même valeur, elles sont égales entre elles"
			},
			{
				"id": "both_equal_180",
				"label": "Les deux sommes valent 180°",
				"description": "D'après les étapes précédentes"
			},
			{
				"id": "transitive_property",
				"label": "Propriété de transitivité",
				"description": "Si A = C et B = C, alors A = B"
			},
			{
				"id": "simplification",
				"label": "Simplification",
				"description": "En simplifiant l'égalité par le terme commun"
			},
			{
				"id": "subtract_common_term",
				"label": "Soustraction du terme commun",
				"description": "En soustrayant ∠COB des deux côtés"
			},
			{
				"id": "vertically_opposite_angles",
				"label": "Propriété des angles opposés par le sommet",
				"description": "Les angles opposés par le sommet sont égaux"
			}
		]
	},
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Les angles opposés par le sommet sont les angles formés par deux droites qui se coupent et qui ne sont pas adjacents. Pour les démontrer égaux, utilise le fait que les angles adjacents sont supplémentaires."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Stratégie :\n1. Écris que ∠AOC et ∠COB sont supplémentaires (ils forment la droite AB)\n2. Écris que ∠BOD et ∠COB sont supplémentaires (ils forment la droite AB)\n3. Les deux sommes valent 180°, donc elles sont égales\n4. Simplifie pour obtenir ∠AOC = ∠BOD"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "Démonstration complète :\nÉtape 1 : ∠AOC + ∠COB = 180° (angles adjacents supplémentaires sur la droite AB)\nÉtape 2 : ∠BOD + ∠COB = 180° (angles adjacents supplémentaires sur la droite AB)\nÉtape 3 : ∠AOC + ∠COB = ∠BOD + ∠COB (les deux sommes valent 180°)\nÉtape 4 : ∠AOC = ∠BOD (en simplifiant par ∠COB)"
		}
	],
	"display_grid": false,
	"allow_zoom": true
}
```

**Component Usage:**

```svelte
<script lang="ts">
	import ProofExercise from '$lib/components/geometry/exercises/ProofExercise.svelte';

	let { exercise } = $props();
</script>

<ProofExercise {exercise} />
```

**Proof Interface:**

```svelte
<!-- ProofExercise.svelte -->
<div class="proof-container">
	<div class="proof-header">
		<h3>À démontrer : {exercise.validation_config.propertyToProve}</h3>
		<div class="given-info">
			<strong>Données :</strong>
			<ul>
				{#each exercise.validation_config.givenInformation as info}
					<li>{info}</li>
				{/each}
			</ul>
		</div>
	</div>

	<div class="proof-steps">
		{#each proofSteps as step, index}
			<div class="proof-step">
				<div class="step-number">Étape {index + 1}</div>

				<div class="step-statement">
					<label>Énoncé :</label>
					<input
						type="text"
						bind:value={step.statement}
						placeholder="Écris l'affirmation mathématique..."
					/>
				</div>

				<div class="step-justification">
					<label>Justification :</label>
					<select bind:value={step.justificationId}>
						<option value="">-- Sélectionne une justification --</option>
						{#each exercise.validation_config.availableJustifications as justif}
							<option value={justif.id}>
								{justif.label}
							</option>
						{/each}
					</select>

					{#if step.justificationId}
						<div class="justification-description">
							{exercise.validation_config.availableJustifications.find(
								(j) => j.id === step.justificationId
							)?.description}
						</div>
					{/if}
				</div>
			</div>
		{/each}

		<button onclick={addStep}>+ Ajouter une étape</button>
	</div>

	<button class="validate-button" onclick={validateProof}> Valider la démonstration </button>
</div>
```

**Validation Logic:**

```typescript
async function validateProof(
	studentProof: ProofStep[],
	exercise: GeometryExercise
): Promise<ValidationResults> {
	const requiredSteps = exercise.validation_config.requiredSteps;
	const results: ValidationResults = {
		passed: false,
		score: 0,
		maxScore: 100,
		feedback: []
	};

	// Check if all required steps are present with correct justifications
	for (const required of requiredSteps) {
		const studentStep = studentProof.find(
			(step) => normalizeStatement(step.statement) === normalizeStatement(required.statement)
		);

		if (!studentStep) {
			results.feedback.push(`❌ Étape manquante : "${required.statement}"`);
			continue;
		}

		if (required.acceptedJustifications.includes(studentStep.justificationId)) {
			results.score += required.points;
			results.feedback.push(`✅ "${required.statement}" - Justification correcte`);
		} else {
			results.feedback.push(`❌ "${required.statement}" - Justification incorrecte`);
		}
	}

	// Check logical flow
	if (isLogicalFlow(studentProof)) {
		results.feedback.push("✅ L'enchaînement logique est correct");
	} else {
		results.feedback.push("⚠️  L'ordre des étapes pourrait être amélioré");
	}

	results.passed = results.score >= 70;

	return results;
}

function normalizeStatement(statement: string): string {
	// Normalize mathematical statements for comparison
	return statement.toLowerCase().replace(/\s+/g, '').replace(/∠/g, 'angle').replace(/°/g, 'deg');
}
```

**Grading:**

```json
{
	"rubric": {
		"step1_correct": { "points": 30, "description": "Étape 1 avec justification correcte" },
		"step2_correct": { "points": 30, "description": "Étape 2 avec justification correcte" },
		"step3_correct": { "points": 20, "description": "Étape 3 avec justification correcte" },
		"step4_correct": { "points": 20, "description": "Conclusion correcte" }
	},
	"passing_score": 70
}
```

---

### 11. Medium: Pythagorean Theorem

**Learning Objectives:**

- Apply the Pythagorean theorem
- Write a proof with measurements
- Verify with calculations

**Exercise Configuration:**

```json
{
	"id": "ex011",
	"title": "Théorème de Pythagore",
	"exercise_type": "proof",
	"difficulty_level": "medium",
	"estimated_time": 20,
	"max_score": 100,
	"instructions": "Le triangle ABC est rectangle en B. Démontre que AB² + BC² = AC² en utilisant les mesures affichées.",
	"learning_objectives": [
		"Appliquer le théorème de Pythagore",
		"Effectuer des calculs dans une démonstration",
		"Vérifier une propriété avec des mesures"
	],
	"base_figure": "[Base64 encoded right triangle with measurements]",
	"validation_mode": "automatic",
	"validation_config": {
		"propertyToProve": "AB² + BC² = AC²",
		"givenInformation": [
			"Le triangle ABC est rectangle en B",
			"AB = 120 mm",
			"BC = 90 mm",
			"AC = 150 mm"
		],
		"requiredSteps": [
			{
				"id": "step1",
				"statement": "Le triangle ABC est rectangle en B",
				"acceptedJustifications": ["given", "hypothesis"],
				"points": 10
			},
			{
				"id": "step2",
				"statement": "D'après le théorème de Pythagore : AB² + BC² = AC²",
				"acceptedJustifications": ["pythagoras_theorem", "right_triangle_property"],
				"points": 30
			},
			{
				"id": "step3",
				"type": "calculation",
				"statement": "AB² = 120² = 14400",
				"expectedValue": 14400,
				"tolerance": 1,
				"acceptedJustifications": ["calculation", "measurement"],
				"points": 15
			},
			{
				"id": "step4",
				"type": "calculation",
				"statement": "BC² = 90² = 8100",
				"expectedValue": 8100,
				"tolerance": 1,
				"acceptedJustifications": ["calculation", "measurement"],
				"points": 15
			},
			{
				"id": "step5",
				"type": "calculation",
				"statement": "AC² = 150² = 22500",
				"expectedValue": 22500,
				"tolerance": 1,
				"acceptedJustifications": ["calculation", "measurement"],
				"points": 15
			},
			{
				"id": "step6",
				"type": "verification",
				"statement": "AB² + BC² = 14400 + 8100 = 22500 = AC²",
				"acceptedJustifications": ["verification", "numerical_check"],
				"points": 15
			}
		],
		"availableJustifications": [
			{ "id": "given", "label": "Donné dans l'énoncé" },
			{ "id": "hypothesis", "label": "Hypothèse" },
			{ "id": "pythagoras_theorem", "label": "Théorème de Pythagore" },
			{ "id": "right_triangle_property", "label": "Propriété du triangle rectangle" },
			{ "id": "calculation", "label": "Calcul" },
			{ "id": "measurement", "label": "Mesure" },
			{ "id": "verification", "label": "Vérification numérique" },
			{ "id": "numerical_check", "label": "Vérification par le calcul" }
		]
	},
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Le théorème de Pythagore dit que dans un triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Pour démontrer :\n1. Rappelle que le triangle est rectangle en B (donné)\n2. Applique le théorème de Pythagore : AB² + BC² = AC²\n3. Calcule AB² = 120² = 14400\n4. Calcule BC² = 90² = 8100\n5. Calcule AC² = 150² = 22500\n6. Vérifie : 14400 + 8100 = 22500 ✓"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "Démonstration complète :\n\nÉtape 1 : Le triangle ABC est rectangle en B (donné)\n         Justification : Hypothèse\n\nÉtape 2 : D'après le théorème de Pythagore : AB² + BC² = AC²\n         Justification : Théorème de Pythagore\n\nÉtape 3 : AB² = 120² = 14400 mm²\n         Justification : Calcul\n\nÉtape 4 : BC² = 90² = 8100 mm²\n         Justification : Calcul\n\nÉtape 5 : AC² = 150² = 22500 mm²\n         Justification : Calcul\n\nÉtape 6 : AB² + BC² = 14400 + 8100 = 22500 = AC² ✓\n         Justification : Vérification numérique"
		}
	],
	"display_measurements": true,
	"display_grid": true
}
```

**Grading:**

```json
{
	"rubric": {
		"hypothesis_stated": { "points": 10 },
		"theorem_applied": { "points": 30 },
		"calculation_AB_squared": { "points": 15 },
		"calculation_BC_squared": { "points": 15 },
		"calculation_AC_squared": { "points": 15 },
		"verification_correct": { "points": 15 }
	},
	"passing_score": 70,
	"bonus_points": {
		"units_included": 5,
		"clear_conclusion": 5
	}
}
```

---

### 12. Hard: Thales Theorem Proof

**Learning Objectives:**

- Prove Thales' theorem
- Use proportional reasoning
- Construct a rigorous multi-step proof

**Exercise Configuration:**

```json
{
	"id": "ex012",
	"title": "Démonstration du théorème de Thalès",
	"exercise_type": "proof",
	"difficulty_level": "hard",
	"estimated_time": 35,
	"max_score": 100,
	"instructions": "Les droites (BC) et (DE) sont parallèles. Démontre que AB/AD = AC/AE = BC/DE.",
	"learning_objectives": [
		"Démontrer le théorème de Thalès",
		"Utiliser les propriétés des droites parallèles",
		"Construire un raisonnement avec plusieurs rapports"
	],
	"base_figure": "[Base64 encoded Thales configuration]",
	"validation_mode": "automatic",
	"validation_config": {
		"propertyToProve": "AB/AD = AC/AE = BC/DE",
		"givenInformation": [
			"Les points A, B, D sont alignés",
			"Les points A, C, E sont alignés",
			"Les droites (BC) et (DE) sont parallèles"
		],
		"requiredSteps": [
			{
				"id": "step1",
				"statement": "Les droites (BC) et (DE) sont parallèles",
				"acceptedJustifications": ["given", "hypothesis"],
				"points": 10
			},
			{
				"id": "step2",
				"statement": "Les triangles ABC et ADE ont les mêmes angles",
				"acceptedJustifications": [
					"corresponding_angles_parallel",
					"alternate_angles_parallel",
					"angles_in_similar_triangles"
				],
				"points": 20
			},
			{
				"id": "step3",
				"statement": "Les triangles ABC et ADE sont semblables",
				"acceptedJustifications": ["aa_similarity", "equal_angles_similarity", "thales_similarity"],
				"points": 25
			},
			{
				"id": "step4",
				"statement": "Dans des triangles semblables, les côtés sont proportionnels",
				"acceptedJustifications": [
					"similar_triangles_property",
					"proportional_sides",
					"definition_similarity"
				],
				"points": 20
			},
			{
				"id": "step5",
				"statement": "Donc AB/AD = AC/AE",
				"acceptedJustifications": ["proportional_sides", "similar_triangles_property"],
				"points": 10
			},
			{
				"id": "step6",
				"statement": "Et AB/AD = BC/DE",
				"acceptedJustifications": ["proportional_sides", "similar_triangles_property"],
				"points": 10
			},
			{
				"id": "step7",
				"statement": "Conclusion : AB/AD = AC/AE = BC/DE",
				"acceptedJustifications": ["transitive_equality", "thales_theorem", "conclusion"],
				"points": 5
			}
		],
		"availableJustifications": [
			{
				"id": "given",
				"label": "Donné dans l'énoncé",
				"description": "Information fournie au départ"
			},
			{
				"id": "hypothesis",
				"label": "Hypothèse",
				"description": "Point de départ de la démonstration"
			},
			{
				"id": "corresponding_angles_parallel",
				"label": "Angles correspondants (droites parallèles)",
				"description": "Si deux droites parallèles sont coupées par une sécante, les angles correspondants sont égaux"
			},
			{
				"id": "alternate_angles_parallel",
				"label": "Angles alternes-internes (droites parallèles)",
				"description": "Si deux droites parallèles sont coupées par une sécante, les angles alternes-internes sont égaux"
			},
			{
				"id": "angles_in_similar_triangles",
				"label": "Angles dans des triangles semblables",
				"description": "Des triangles semblables ont les mêmes angles"
			},
			{
				"id": "aa_similarity",
				"label": "Critère AA de similitude",
				"description": "Si deux triangles ont deux angles égaux, ils sont semblables"
			},
			{
				"id": "equal_angles_similarity",
				"label": "Angles égaux ⇒ triangles semblables",
				"description": "Des triangles avec les mêmes angles sont semblables"
			},
			{
				"id": "thales_similarity",
				"label": "Configuration de Thalès ⇒ similitude",
				"description": "La configuration de Thalès implique que les triangles sont semblables"
			},
			{
				"id": "similar_triangles_property",
				"label": "Propriété des triangles semblables",
				"description": "Dans des triangles semblables, les côtés homologues sont proportionnels"
			},
			{
				"id": "proportional_sides",
				"label": "Côtés proportionnels",
				"description": "Les côtés correspondants sont dans le même rapport"
			},
			{
				"id": "definition_similarity",
				"label": "Définition de la similitude",
				"description": "Des figures semblables ont des longueurs proportionnelles"
			},
			{
				"id": "transitive_equality",
				"label": "Transitivité de l'égalité",
				"description": "Si A = B et B = C, alors A = B = C"
			},
			{
				"id": "thales_theorem",
				"label": "Théorème de Thalès",
				"description": "Si deux droites sont parallèles, elles découpent des segments proportionnels"
			},
			{
				"id": "conclusion",
				"label": "Conclusion",
				"description": "Résultat final de la démonstration"
			}
		],
		"optionalVerification": {
			"type": "numerical",
			"description": "Tu peux vérifier numériquement avec les mesures affichées",
			"measurements": ["AB", "AD", "AC", "AE", "BC", "DE"]
		}
	},
	"hints": [
		{
			"level": "general",
			"penalty": 0,
			"content": "Le théorème de Thalès repose sur la similitude des triangles. Deux triangles sont semblables s'ils ont les mêmes angles. Dans ce cas, leurs côtés sont proportionnels."
		},
		{
			"level": "specific",
			"penalty": 5,
			"content": "Structure de la démonstration :\n1. Rappelle que (BC) // (DE)\n2. Montre que les triangles ABC et ADE ont les mêmes angles (utilise les propriétés des angles formés par des parallèles)\n3. Conclus que les triangles sont semblables\n4. Utilise la propriété des triangles semblables : côtés proportionnels\n5. Écris les trois rapports égaux"
		},
		{
			"level": "step_by_step",
			"penalty": 10,
			"content": "Démonstration complète :\n\nÉtape 1 : (BC) // (DE) [Hypothèse]\n\nÉtape 2 : ∠ABC = ∠ADE (angles correspondants, car (BC) // (DE))\n         ∠ACB = ∠AED (angles correspondants, car (BC) // (DE))\n         ∠BAC = ∠DAE (angle commun)\n         [Angles correspondants formés par des droites parallèles]\n\nÉtape 3 : Les triangles ABC et ADE ont les mêmes angles,\n         donc ils sont semblables\n         [Critère AA de similitude]\n\nÉtape 4 : Dans des triangles semblables, les côtés homologues sont proportionnels\n         [Propriété des triangles semblables]\n\nÉtape 5 : Donc AB/AD = AC/AE (côtés homologues)\n         [Côtés proportionnels]\n\nÉtape 6 : Et AB/AD = BC/DE (côtés homologues)\n         [Côtés proportionnels]\n\nÉtape 7 : Conclusion : AB/AD = AC/AE = BC/DE\n         [Transitivité de l'égalité]"
		}
	],
	"display_measurements": true,
	"display_grid": true,
	"allow_numerical_verification": true
}
```

**Advanced Validation:**

```typescript
async function validateThalesProof(
	studentProof: ProofStep[],
	exercise: GeometryExercise
): Promise<ValidationResults> {
	const results: ValidationResults = {
		passed: false,
		score: 0,
		maxScore: 100,
		feedback: [],
		details: {}
	};

	// Check for required logical structure
	const requiredSteps = exercise.validation_config.requiredSteps;

	// Must have hypothesis
	const hasHypothesis = studentProof.some(
		(step) =>
			step.statement.includes('parallèles') &&
			['given', 'hypothesis'].includes(step.justificationId)
	);

	if (!hasHypothesis) {
		results.feedback.push("❌ L'hypothèse (droites parallèles) doit être rappelée");
		return results;
	}

	// Must show angle equality
	const hasAngleEquality = studentProof.some(
		(step) =>
			(step.statement.includes('angles') && step.statement.includes('égaux')) ||
			step.justificationId.includes('angles')
	);

	if (!hasAngleEquality) {
		results.feedback.push('❌ Tu dois montrer que les angles sont égaux');
	} else {
		results.score += 20;
		results.feedback.push('✅ Angles égaux établis');
	}

	// Must establish similarity
	const hasSimilarity = studentProof.some(
		(step) => step.statement.includes('semblables') && step.justificationId.includes('similarity')
	);

	if (!hasSimilarity) {
		results.feedback.push('❌ Tu dois établir que les triangles sont semblables');
	} else {
		results.score += 25;
		results.feedback.push('✅ Similitude des triangles établie');
	}

	// Must use proportional sides property
	const hasProportionalSides = studentProof.some(
		(step) =>
			step.statement.includes('proportionnel') && step.justificationId.includes('proportional')
	);

	if (!hasProportionalSides) {
		results.feedback.push('❌ Tu dois utiliser la propriété des côtés proportionnels');
	} else {
		results.score += 20;
		results.feedback.push('✅ Propriété des côtés proportionnels utilisée');
	}

	// Must write the three ratios
	const hasThreeRatios = studentProof.some(
		(step) =>
			step.statement.includes('AB/AD') &&
			step.statement.includes('AC/AE') &&
			step.statement.includes('BC/DE')
	);

	if (!hasThreeRatios) {
		results.feedback.push('❌ La conclusion doit inclure les trois rapports');
	} else {
		results.score += 15;
		results.feedback.push('✅ Les trois rapports sont écrits');
	}

	// Check logical flow
	if (isLogicallyOrdered(studentProof, requiredSteps)) {
		results.score += 20;
		results.feedback.push("✅ L'enchaînement logique est correct");
	} else {
		results.feedback.push("⚠️  L'ordre des étapes pourrait être amélioré");
	}

	results.passed = results.score >= 70;

	return results;
}

function isLogicallyOrdered(studentProof: ProofStep[], requiredSteps: RequiredStep[]): boolean {
	// Check that hypothesis comes before conclusion
	// Check that similarity is established before using proportional sides
	// etc.

	const hypothesisIndex = studentProof.findIndex((step) =>
		['given', 'hypothesis'].includes(step.justificationId)
	);

	const similarityIndex = studentProof.findIndex((step) =>
		step.justificationId.includes('similarity')
	);

	const proportionalIndex = studentProof.findIndex((step) =>
		step.justificationId.includes('proportional')
	);

	const conclusionIndex = studentProof.findIndex((step) => step.justificationId === 'conclusion');

	// Hypothesis must come first
	if (hypothesisIndex !== 0 && hypothesisIndex !== 1) return false;

	// Similarity must come before proportional sides
	if (similarityIndex > proportionalIndex) return false;

	// Conclusion must come last
	if (conclusionIndex !== -1 && conclusionIndex !== studentProof.length - 1) return false;

	return true;
}
```

**Grading:**

```json
{
	"rubric": {
		"hypothesis_stated": { "points": 10, "description": "Hypothèse clairement énoncée" },
		"angles_equality": { "points": 20, "description": "Égalité des angles démontrée" },
		"similarity_established": { "points": 25, "description": "Similitude des triangles établie" },
		"proportional_property": {
			"points": 20,
			"description": "Propriété des côtés proportionnels utilisée"
		},
		"first_ratio": { "points": 10, "description": "Premier rapport AB/AD = AC/AE" },
		"second_ratio": { "points": 10, "description": "Deuxième rapport AB/AD = BC/DE" },
		"conclusion": { "points": 5, "description": "Conclusion correcte" }
	},
	"passing_score": 70,
	"bonus_points": {
		"logical_flow": 10,
		"numerical_verification": 5,
		"clear_justifications": 5
	}
}
```

---

## Summary

This document provides **12 complete, ready-to-use geometry exercise examples** covering:

- **4 exercise types** (View/Explore, Measurement, Construction, Proof)
- **3 difficulty levels** each (Easy, Medium, Hard)
- **Complete JSON configurations** for database storage
- **TypeScript/Svelte component usage** examples
- **MathGraph32 figure generation code**
- **Detailed validation logic** for each exercise
- **Grading rubrics** with point distributions
- **Expected student workflows**
- **Hint systems** (3 levels per exercise)

These examples demonstrate the full capabilities of the geometry system and can be used directly by teachers or adapted for new exercises.
