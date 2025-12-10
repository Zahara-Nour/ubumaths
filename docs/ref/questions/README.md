# Systeme de Questions - Guide Technique

> Documentation technique complete du systeme de questions mathematiques d'UbuMaths.

---

## Vue d'ensemble

Le **Systeme de Questions** est un moteur de generation de questions mathematiques base sur des templates parametres. Il permet de creer un template unique qui genere une infinite de questions avec des valeurs aleatoires.

### Distinction avec le Systeme d'Exercices

| Aspect           | Questions                          | Exercices                             |
| ---------------- | ---------------------------------- | ------------------------------------- |
| **But**          | Flashcards reponse unique pour SRS | Problemes multi-etapes avec solutions |
| **Stockage**     | `question_templates`               | `exercises`                           |
| **Contenu**      | Enonce parametre + reponse         | Enonce + solution markdown complete   |
| **Validation**   | Automatique (equivalence math)     | Manuelle (affichage solution)         |
| **Distribution** | Generation seedee, decks SRS       | on_demand, per_student, per_group     |
| **UI**           | FlashCard component                | Exercise renderer                     |

### Pourquoi ce systeme ?

1. **Efficacite** : Un template genere des milliers de questions
2. **Reproductibilite** : Seeds deterministes pour instances identiques
3. **Flexibilite** : 7 types de questions, validation dynamique
4. **Integration** : SRS flashcards, automaths, quiz chapitres

---

## Architecture

```
+------------------------------------------------------------+
|  DATABASE (Supabase)                                       |
|  question_templates table (JSONB)                          |
+----------------------------+-------------------------------+
                             |
                             v
+------------------------------------------------------------+
|  VALIDATION LAYER                                          |
|  validateTemplate() + detectCircularDependencies()         |
+----------------------------+-------------------------------+
                             |
                             v
+------------------------------------------------------------+
|  GENERATION PIPELINE                                       |
|  1. Select variation (seed-based)                          |
|  2. Merge shared + variation data                          |
|  3. Resolve variables (3-step pipeline)                    |
|  4. Resolve content (statement, solution, correction)      |
|  5. Process type-specific (choices, blanks)                |
+----------------------------+-------------------------------+
                             |
                             v
+------------------------------------------------------------+
|  QuestionInstance (runtime object)                         |
+----------------------------+-------------------------------+
                             |
                             v
+------------------------------------------------------------+
|  PRESENTATION LAYER                                        |
|  FlashCard + NumericalInput + MultipleChoiceInput + ...    |
+------------------------------------------------------------+
```

---

## Table des matieres

| Document                                   | Description                           |
| ------------------------------------------ | ------------------------------------- |
| [types.md](types.md)                       | Les 7 types de questions supportes    |
| [templates.md](templates.md)               | Structure des templates et variations |
| [generation.md](generation.md)             | Pipeline de generation d'instances    |
| [parameterization.md](parameterization.md) | Syntaxe variables, random, eval       |
| [validation.md](validation.md)             | Regles de validation et contraintes   |
| [components.md](components.md)             | Composants UI (inputs, FlashCard)     |
| [api.md](api.md)                           | Endpoints API REST                    |
| [troubleshooting.md](troubleshooting.md)   | Problemes courants et solutions       |

---

## Structure des fichiers

```
src/lib/questions/
  types.ts                    # Definitions de types (~750 lignes)
  index.ts                    # API publique
  generator/
    instance-generator.ts     # Orchestrateur principal
    variable-resolver.ts      # Wrapper resolution
    content-resolver.ts       # Resolution markdown
    random-generator.ts       # Generation aleatoire seedee
    choice-shuffler.ts        # Melange Fisher-Yates
  validators/
    template-validator.ts     # Validation structure
  compute-engine/
    wrapper.ts                # MathLive Compute Engine
  constraint-validators.ts    # Contraintes de forme
  validation-rule-evaluator.ts # Regles dynamiques

src/lib/shared/parameterization/
  parser/
    tokenizer.ts              # Detection {{...}}
    random-parser.ts          # Parse {{random:...}}
    eval-parser.ts            # Parse {{eval:...}}
    variable-parser.ts        # Parse {{var}}
  resolver/
    variable-resolver.ts      # Pipeline 3 etapes
    random-generator.ts       # Generation nombres
    text-resolver.ts          # Resolution texte
  validator/
    circular-dependency.ts    # Detection cycles
  display-options.ts          # Options affichage
  expression-transforms.ts    # Transformations LaTeX

src/lib/components/question-inputs/
  NumericalInput.svelte       # Champ math MathLive
  MultipleChoiceInput.svelte  # Boutons choix
  FillBlanksInput.svelte      # Champs inline

src/lib/components/questions/
  FlashCard.svelte            # Affichage principal

src/routes/api/questions/
  templates/+server.ts        # CRUD templates
  templates/[id]/+server.ts   # Operations par ID
  generate/[id]/+server.ts    # Generation instance
  categories/+server.ts       # Categories
```

---

## Exemple rapide

### Template minimal

```typescript
const template: QuestionTemplate = {
	id: crypto.randomUUID(),
	type: 'numerical_exact',
	title: 'Addition simple',

	variations: [
		{
			statement: 'Calculer : $${{a}} + {{b}}$$',
			variables: [
				{ name: 'a', expression: '{{1..10}}' },
				{ name: 'b', expression: '{{1..10}}' }
			],
			solution: '{{eval:a+b}}'
		}
	],

	grades: ['6'],
	theme: 'Arithmetique',
	domain: 'Addition',
	level: 1,
	status: 'published'
};
```

### Generation

```typescript
import { generateInstance } from '$lib/questions';

// Aleatoire
const result = generateInstance(template);

// Deterministe (meme seed = meme instance)
const result42 = generateInstance(template, 42);

if (result.success) {
	console.log(result.instance.statement); // "Calculer : $$7 + 3$$"
	console.log(result.instance.solution); // "10"
}
```

---

## Integration SRS

Le systeme de questions alimente le systeme SRS (Spaced Repetition System) :

```typescript
// Dans src/lib/srs/types.ts
interface Card {
	templateId: string; // Reference QuestionTemplate.id
	// ... autres champs FSRS
}

interface ReviewCard {
	card: Card;
	instance: QuestionInstance; // Instance generee
}
```

Chaque review genere une nouvelle instance avec un seed base sur la session, garantissant varietee et reproductibilite.

---

## Voir aussi

- [../exercices/](../exercices/) - Systeme d'exercices (distinct)
- [../../claude/database.md](../../claude/database.md) - Guide Supabase
- [../../claude/best-practices.md](../../claude/best-practices.md) - Conventions code
