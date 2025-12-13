# Help Methods - Pedagogical Strategies

> Technical reference for the 15 pedagogical methods used by the AI tutor.

---

## Overview

The tutor uses 15 distinct pedagogical methods to guide students without giving direct answers. Methods are selected dynamically based on:

1. **Mandatory rules** (highest priority)
2. **Current help level** (0-7 progression)
3. **Math topic** context
4. **Grade level** filtering
5. **Previously used methods** (variety)

---

## Method Selection Algorithm

```typescript
// src/lib/config/tutor-help-methods.ts

function selectHelpMethod(context: HelpContext): string {
	// 1. Mandatory rules (absolute priority)
	if (context.isFirstMessage) return 'socratic';
	if (context.frustrationLevel > 70) return 'encouragement';
	if (context.failureCount >= 3) return 'worked_example';
	if (context.lastAnswerWasWrong) return 'error_analysis';

	// 2. Maximum help level reached
	if (context.currentHelpLevel >= 7) return 'redirect_to_teacher';

	// 3. Select based on help level
	let candidates = HELP_SELECTION_RULES.byHelpLevel[context.currentHelpLevel];

	// 4. Combine with topic-recommended methods
	if (context.topic) {
		candidates = combineWithTopicMethods(candidates, context.topic);
	}

	// 5. Filter by grade level
	candidates = filterByGrade(candidates, context.schoolYear);

	// 6. Exclude already-used methods (variety)
	candidates = excludePreviouslyUsed(candidates, context.previousMethodsUsed);

	// 7. Select highest priority method
	return selectHighestPriority(candidates);
}
```

### Selection Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Method Selection Flow                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ First message?  │─────Yes──▶ SOCRATIC
                    └────────┬────────┘
                             │ No
                             ▼
                    ┌─────────────────┐
                    │ Frustration>70? │─────Yes──▶ ENCOURAGEMENT
                    └────────┬────────┘
                             │ No
                             ▼
                    ┌─────────────────┐
                    │ Failures >= 3?  │─────Yes──▶ WORKED_EXAMPLE
                    └────────┬────────┘
                             │ No
                             ▼
                    ┌─────────────────┐
                    │ Last was wrong? │─────Yes──▶ ERROR_ANALYSIS
                    └────────┬────────┘
                             │ No
                             ▼
                    ┌─────────────────┐
                    │ Help level = 7? │─────Yes──▶ REDIRECT_TO_TEACHER
                    └────────┬────────┘
                             │ No
                             ▼
              ┌──────────────────────────────┐
              │ Combine:                     │
              │  • Methods for help level    │
              │  • Methods for math topic    │
              │  • Filter by grade           │
              │  • Exclude already used      │
              └──────────────┬───────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Select highest  │
                    │ priority method │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Return method   │
                    └─────────────────┘
```

---

## The 15 Methods

### 1. Socratic (Questionnement Socratique)

**Purpose**: Guide students through open-ended questions to self-discovery.

| Property  | Value                                       |
| --------- | ------------------------------------------- |
| Priority  | 1 (High)                                    |
| Min Grade | CE2 (Year 3)                                |
| Max Grade | Terminale (Year 12)                         |
| Best For  | Proofs, Logic, Algebra, Functions, Calculus |

**Strategy**:

- Ask about what the student already understands
- Have them identify known and unknown data
- Guide to next step with questions, not instructions
- Celebrate correct answers with pataphysical exclamations

**Example Questions**:

```
"Cornegidouille ! Qu'est-ce que l'énoncé te demande de trouver exactement ?"
"Par ma chandelle verte ! Quelles informations as-tu à ta disposition ?"
"Hornstrompe ! Si tu devais expliquer ce problème à un palotron, que dirais-tu ?"
"De par ma science pataphysique, quelle opération pourrait t'aider ici ?"
```

---

### 2. Analogy (Analogies et Métaphores)

**Purpose**: Make abstract concepts concrete through familiar comparisons.

| Property  | Value                                              |
| --------- | -------------------------------------------------- |
| Priority  | 2 (Medium)                                         |
| Min Grade | CP (Year 1)                                        |
| Max Grade | Terminale (Year 12)                                |
| Best For  | Geometry, Functions, Algebra, Calculus, Statistics |

**Strategy**:

- Choose age-appropriate analogies
- Connect math to familiar situations
- Use absurd but pedagogically relevant images
- Always return to the math problem

**Pere Ubu Analogies**:

```
Fractions: "Imagine une tarte à la rhubarbe, ma passion ! Si je la coupe en 4 parts égales..."
Equations: "C'est comme une balance royale dans ma cour ! Des deux côtés, ça doit peser pareil..."
Percentages: "Sur 100 sujets de mon royaume imaginaire..."
Geometry: "Visualise le terrain de mon palais pataphysique..."
```

---

### 3. Decomposition (Décomposition en Étapes)

**Purpose**: Break complex problems into smaller, manageable steps.

| Property  | Value                                               |
| --------- | --------------------------------------------------- |
| Priority  | 1 (High)                                            |
| Min Grade | CP (Year 1)                                         |
| Max Grade | Terminale (Year 12)                                 |
| Best For  | Arithmetic, Algebra, Geometry, Calculus, Statistics |

**Strategy**:

- Identify major steps needed
- Present ONE step at a time
- Wait for understanding before proceeding
- Use numbers or milestones for structure

**Example**:

```
"Cornegidouille ! Ce problème se décompose en étapes grandioses !
Première étape de notre expédition pataphysique : [étape 1]"

"Par ma chandelle verte ! Avant de gravir la montagne mathématique,
commençons par le premier pas : [étape 1]"
```

---

### 4. Worked Example (Exemple Similaire Résolu)

**Purpose**: Show a SIMILAR (but DIFFERENT) solved problem to illustrate method.

| Property  | Value                                              |
| --------- | -------------------------------------------------- |
| Priority  | 3 (Low)                                            |
| Min Grade | CP (Year 1)                                        |
| Max Grade | Terminale (Year 12)                                |
| Best For  | Arithmetic, Algebra, Geometry, Functions, Calculus |

**Critical Rule**: Example MUST have DIFFERENT numbers/values than the student's problem.

**Strategy**:

- Create example with same structure, different numbers
- Explain each step of example solution
- Ask student to apply same method to their problem
- Example should be SIMPLER than original

**Example**:

```
"Hornstrompe ! Laisse-moi te montrer comment j'ai résolu un problème
semblable dans ma cour..."

"Par ma chandelle verte ! Observe cet exemple de ma collection pataphysique :
[exemple avec nombres différents]"
```

---

### 5. Visual (Indice Visuel)

**Purpose**: Suggest visual representations to clarify the problem.

| Property  | Value                                              |
| --------- | -------------------------------------------------- |
| Priority  | 2 (Medium)                                         |
| Min Grade | CP (Year 1)                                        |
| Max Grade | Terminale (Year 12)                                |
| Best For  | Geometry, Functions, Statistics, Calculus, Algebra |

**Visual Types by Topic**:

- Geometry: figures with dimensions, marked angles
- Functions: value tables, graphs
- Statistics: diagrams, data tables
- Algebra: balance, organizational schemas

**Strategy**:

- Suggest appropriate representation type
- Describe what the schema should contain
- Guide student to construct it themselves
- Use simple ASCII descriptions if needed

**Example**:

```
"Cornegidouille ! Si tu dessinais ce problème, que verrais-tu ?"
"Par ma chandelle verte ! Un schéma digne de mes architectes royaux s'impose !"
"De par ma science pataphysique, trace-moi un tableau avec les données..."
```

---

### 6. Error Analysis (Analyse d'Erreur)

**Purpose**: Identify why an approach is incorrect and guide toward correction.

| Property  | Value                                          |
| --------- | ---------------------------------------------- |
| Priority  | 1 (High)                                       |
| Min Grade | CP (Year 1)                                    |
| Max Grade | Terminale (Year 12)                            |
| Best For  | Arithmetic, Algebra, Geometry, Calculus, Logic |

**Trigger**: Used after wrong answer (mandatory rule).

**Strategy**:

- Start by valuing what IS correct
- Identify precisely where error occurred
- Explain WHY it's an error (without giving answer)
- Ask question to help self-correction

**Common Error Types**:

- Sign errors
- Forgotten operations
- Misread problem statement
- Incorrect formula application
- Calculation mistakes

**Example**:

```
"Cornegidouille ! Tu as bien commencé, mais attention à cette étape..."
"Par ma chandelle verte ! Je vois ton raisonnement, mais il y a un petit piège pataphysique ici..."
"Hornstrompe ! Ton calcul est presque correct, mais relis bien [partie spécifique]..."
```

---

### 7. Formula Reminder (Rappel de Formule)

**Purpose**: Remind relevant mathematical formula or property.

| Property  | Value                                              |
| --------- | -------------------------------------------------- |
| Priority  | 2 (Medium)                                         |
| Min Grade | CE2 (Year 3)                                       |
| Max Grade | Terminale (Year 12)                                |
| Best For  | Algebra, Geometry, Calculus, Statistics, Functions |

**Critical Rule**: Remind GENERAL formula, do NOT substitute problem values.

**Strategy**:

- Recall general formula without applying it
- Explain what each symbol/variable represents
- Ask student to identify how to use formula
- Never substitute values yourself

**Example Reminders**:

```
Pythagorean theorem: $$a^2 + b^2 = c^2$$
Notable identities: $$(a+b)^2 = a^2 + 2ab + b^2$$
Triangle area: $$A = \frac{base \times hauteur}{2}$$
```

---

### 8. Real World (Lien avec le Réel)

**Purpose**: Connect abstract problems to concrete daily situations.

| Property  | Value                                                |
| --------- | ---------------------------------------------------- |
| Priority  | 2 (Medium)                                           |
| Min Grade | CP (Year 1)                                          |
| Max Grade | Terminale (Year 12)                                  |
| Best For  | Arithmetic, Statistics, Geometry, Functions, Algebra |

**Age-Appropriate Contexts**:

- **Primary**: candy, toys, games, animals, snacks
- **Middle**: pocket money, video games, sports, music, shopping
- **High**: economy, travel, technology, personal projects

**Example**:

```
"Cornegidouille ! Imagine que tu es dans un magasin de rhubarbe..."
"Par ma chandelle verte ! C'est comme quand tu partages des bonbons avec tes amis..."
"De par ma science pataphysique, pense à [situation concrète]..."
```

---

### 9. Prerequisite (Vérification Prérequis)

**Purpose**: Verify mastery of necessary concepts before continuing.

| Property  | Value                                          |
| --------- | ---------------------------------------------- |
| Priority  | 2 (Medium)                                     |
| Min Grade | CE1 (Year 2)                                   |
| Max Grade | Terminale (Year 12)                            |
| Best For  | Algebra, Calculus, Proofs, Functions, Geometry |

**Common Prerequisites**:

- Basic operations (addition, subtraction, multiplication, division)
- Order of operations
- Fractions and decimals
- Solving simple equations
- Basic geometric properties

**Strategy**:

- Identify required prior knowledge
- Ask simple questions to verify mastery
- If prerequisite missing, explain briefly
- Only continue when foundations are solid

**Example**:

```
"Cornegidouille ! Avant de gravir cette montagne mathématique, vérifions tes provisions !"
"Par ma chandelle verte ! Sais-tu comment [concept prérequis] ?"
"Hornstrompe ! Pour résoudre ceci, il faut maîtriser [prérequis]. Tu te sens à l'aise avec ça ?"
```

---

### 10. Reformulation

**Purpose**: Restate the problem in simpler or different words.

| Property  | Value                                            |
| --------- | ------------------------------------------------ |
| Priority  | 2 (Medium)                                       |
| Min Grade | CP (Year 1)                                      |
| Max Grade | Terminale (Year 12)                              |
| Best For  | Arithmetic, Algebra, Geometry, Statistics, Logic |

**Techniques**:

- Clearly identify: data, unknown, relationship
- Use simpler words
- Add logical connectors ("donc", "alors", "parce que")
- Break long sentences into shorter ones

**Example**:

```
"Cornegidouille ! Laisse-moi traduire cet énoncé en langage pataphysique..."
"Par ma chandelle verte ! En d'autres termes, on te demande de..."
"De par ma science royale, reformulons : tu as [données], tu cherches [inconnue]..."
```

---

### 11. Method Hint (Indice sur la Méthode)

**Purpose**: Suggest which approach to use without solving.

| Property  | Value                                              |
| --------- | -------------------------------------------------- |
| Priority  | 2 (Medium)                                         |
| Min Grade | CE1 (Year 2)                                       |
| Max Grade | Terminale (Year 12)                                |
| Best For  | Algebra, Calculus, Geometry, Arithmetic, Functions |

**Example Hints**:

- "Utilise la mise en équation"
- "Fais un tableau de proportionnalité"
- "Applique le théorème de Thalès"
- "Développe puis réduis"
- "Factorise l'expression"

**Strategy**:

- Name the method or technique
- Briefly explain what it involves
- Let student apply method themselves
- Do NOT do calculations

**Example**:

```
"Cornegidouille ! Ce problème appelle la méthode de [nom de la méthode] !"
"Par ma chandelle verte ! Je te suggère d'utiliser [technique]..."
"De par ma science pataphysique, la technique du [nom] serait parfaite ici !"
```

---

### 12. Encouragement (Encouragement Ciblé)

**Purpose**: Value efforts and reinforce student confidence.

| Property  | Value               |
| --------- | ------------------- |
| Priority  | 1 (High)            |
| Min Grade | CP (Year 1)         |
| Max Grade | Terminale (Year 12) |
| Best For  | ALL topics          |

**Trigger**: Frustration level > 70 (mandatory rule).

**Exception**: Does NOT need to end with a question.

**Age-Adapted Styles**:

**Primary (Playful)**:

```
"Cornegidouille ! Tu es un vrai champion des mathématiques en herbe !"
"Par ma chandelle verte ! Quel magnifique effort ! Tu brilles comme ma couronne !"
"Hornstrompe ! Tu as le cerveau d'un grand palotron mathématicien !"
```

**Middle School (Supportive)**:

```
"Cornegidouille ! Ton raisonnement est sur la bonne voie, continue !"
"Par ma chandelle verte ! Je vois que tu réfléchis bien, c'est excellent !"
"De par ma science, tu progresses vraiment ! Encore un petit effort !"
```

**High School (Respectful)**:

```
"Cornegidouille ! Ton approche montre une vraie maturité mathématique !"
"Par ma chandelle verte ! Tu maîtrises déjà une bonne partie du raisonnement !"
"Hornstrompe ! Ta persévérance est digne des plus grands mathématiciens de ma cour !"
```

---

### 13. Counter-Example (Contre-Exemple)

**Purpose**: Show a case where student's approach fails.

| Property  | Value                                       |
| --------- | ------------------------------------------- |
| Priority  | 3 (Low)                                     |
| Min Grade | 5ème (Year 7)                               |
| Max Grade | Terminale (Year 12)                         |
| Best For  | Proofs, Logic, Algebra, Functions, Calculus |

**Strategy**:

- Identify reasoning/generalization error
- Build simple example where approach fails
- Let student see the problem themselves
- Guide toward correction

**Example Counter-Examples**:

- "Si x = 0, que devient ton expression ?"
- "Prenons un triangle rectangle particulier..."
- "Essayons avec des nombres négatifs..."
- "Que se passe-t-il si les deux valeurs sont égales ?"

---

### 14. Metacognitive (Question Métacognitive)

**Purpose**: Make student reflect on their own thinking process.

| Property  | Value                                       |
| --------- | ------------------------------------------- |
| Priority  | 3 (Low)                                     |
| Min Grade | 6ème (Year 6)                               |
| Max Grade | Terminale (Year 12)                         |
| Best For  | Proofs, Logic, Algebra, Calculus, Functions |

**Question Types**:

- **Understanding**: "Qu'as-tu compris de l'énoncé ?"
- **Strategy**: "Pourquoi as-tu choisi cette approche ?"
- **Difficulties**: "Où sens-tu que ça bloque ?"
- **Confidence**: "Es-tu sûr de cette étape ? Pourquoi ?"

**Example**:

```
"Cornegidouille ! Comment as-tu décidé de procéder ainsi ?"
"Par ma chandelle verte ! Qu'est-ce qui t'a fait penser à cette méthode ?"
"De par ma science pataphysique, si tu devais expliquer ton raisonnement à un ami, que dirais-tu ?"
```

---

### 15. Scaffolded (Pratique Guidée)

**Purpose**: Guide step-by-step with very structured questions.

| Property  | Value                                               |
| --------- | --------------------------------------------------- |
| Priority  | 3 (Low)                                             |
| Min Grade | CP (Year 1)                                         |
| Max Grade | Terminale (Year 12)                                 |
| Best For  | Arithmetic, Algebra, Geometry, Calculus, Statistics |

**Strategy**:

- Decompose into micro-steps
- Ask ONE very precise question per message
- Wait for response before next step
- Validate each response before continuing

**Typical Structure**:

1. "Qu'est-ce que l'énoncé te demande de trouver ?"
2. "Quelles sont les données du problème ?"
3. "Quelle formule/méthode pourrait t'aider ?"
4. "Applique cette formule. Qu'obtiens-tu ?"
5. "Vérifie : ta réponse a-t-elle du sens ?"

**Example**:

```
"Cornegidouille ! Procédons étape par étape, comme dans ma recette royale de rhubarbe !"
"Par ma chandelle verte ! Première étape : [question très précise]"
```

---

## Method Mapping by Help Level

| Level | Description       | Methods                           |
| ----- | ----------------- | --------------------------------- |
| **0** | Subtle, indirect  | `socratic`, `reformulation`       |
| **1** | Increased support | `analogy`, `decomposition`        |
| **2** | More direct hints | `method_hint`, `formula_reminder` |
| **3** | Concrete help     | `visual`, `real_world`            |
| **4** | Very explicit     | `worked_example`, `prerequisite`  |
| **5** | Intensive support | `scaffolded`, `counter_example`   |
| **6** | Metacognitive     | `metacognitive`                   |
| **7** | Maximum           | `redirect_to_teacher`             |

---

## Method Mapping by Topic

| Math Topic     | Recommended Methods                                |
| -------------- | -------------------------------------------------- |
| **Geometry**   | `visual`, `decomposition`, `analogy`               |
| **Algebra**    | `decomposition`, `worked_example`, `reformulation` |
| **Arithmetic** | `real_world`, `decomposition`, `scaffolded`        |
| **Functions**  | `visual`, `decomposition`, `analogy`               |
| **Proofs**     | `socratic`, `prerequisite`, `metacognitive`        |
| **Statistics** | `real_world`, `visual`, `decomposition`            |
| **Calculus**   | `decomposition`, `visual`, `formula_reminder`      |
| **Logic**      | `socratic`, `counter_example`, `reformulation`     |

---

## Mandatory Rules Summary

| Condition                   | Method                | Reason                    |
| --------------------------- | --------------------- | ------------------------- |
| First message               | `socratic`            | Start with open questions |
| Wrong answer (< 3 failures) | `error_analysis`      | Understand the mistake    |
| Frustration > 70            | `encouragement`       | Emotional support first   |
| 3+ failures                 | `worked_example`      | Need concrete model       |
| Help level 7                | `redirect_to_teacher` | Human help needed         |

---

## Configuration File

**Location**: `src/lib/config/tutor-help-methods.ts`

**Exports**:

- `HELP_METHODS`: Array of 15 method definitions
- `HELP_SELECTION_RULES`: Mandatory/topic/level rules
- `selectHelpMethod(context)`: Main selection function
- `getHelpMethodById(id)`: Retrieve method by ID
- `getMethodsForTopic(topic)`: Filter by topic
- `getMethodsForGrade(year)`: Filter by grade level

---

## See Also

- [Pere Ubu Tutor](./pere-ubu-tutor.md) - AI personality details
- [Architecture](./architecture.md) - System architecture
- [Rate Limiting & Security](./rate-limiting-security.md) - Quotas
