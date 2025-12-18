/**
 * Exercise Bank System - Type Definitions
 * ========================================
 *
 * Complete type system for the mathematical exercise bank, including:
 * - Database model (Exercise)
 * - Parameterization support (variables, instances, distribution)
 * - Transpiler options
 * - Rendering options
 *
 * Note: AST types and ParseOptions are now in $lib/custom-markdown
 *
 * @module exercises/types
 */

// ============================================================================
// IMPORTS
// ============================================================================

import type { Variable, ResolvedVariable, DocumentNode } from '$lib/custom-markdown';

// Re-export AST types from custom-markdown for backwards compatibility
export type {
	BaseNode,
	TextNode,
	MathInlineNode,
	MathBlockNode,
	ParagraphNode,
	HeadingNode,
	ListItemNode,
	ListNode,
	TableCellNode,
	TableNode,
	ImageNode,
	HorizontalRuleNode,
	BlockquoteNode,
	CodeBlockNode,
	LineBreakNode,
	BlankNode,
	InputState,
	InlineNode,
	BlockNode,
	ASTNode,
	DocumentNode,
	ImageSizeClass,
	ImageAlignment,
	ImageSizeMapping,
	ParseOptions,
	ParseResult,
	MathPlaceholder,
	RenderOptions
} from '$lib/custom-markdown';

export { DEFAULT_IMAGE_SIZE_MAPPINGS } from '$lib/custom-markdown';

// ============================================================================
// RESOURCE TYPES
// ============================================================================

/**
 * Type of supplementary resource
 */
export type ExerciseResourceType = 'video' | 'pdf' | 'link' | 'geogebra' | 'image';

/**
 * Supplementary resource attached to an exercise
 *
 * @example Video resource
 * ```typescript
 * const resource: ExerciseResource = {
 *   type: 'video',
 *   url: 'https://youtube.com/watch?v=...',
 *   title: 'Explication détaillée du théorème'
 * };
 * ```
 *
 * @example PDF with description
 * ```typescript
 * const resource: ExerciseResource = {
 *   type: 'pdf',
 *   url: '/docs/fiche-methode.pdf',
 *   title: 'Fiche méthode',
 *   description: 'Résumé des formules essentielles'
 * };
 * ```
 */
export interface ExerciseResource {
	/** Resource type for display icon/handling */
	type: ExerciseResourceType;

	/** URL to the resource (can be relative or absolute) */
	url: string;

	/** Display title */
	title: string;

	/** Optional description for additional context */
	description?: string;
}

// ============================================================================
// PARAMETERIZATION TYPES
// ============================================================================

/**
 * Distribution mode for parameterized exercises
 *
 * Determines how exercise instances are generated and distributed:
 * - `on_demand`: New instance generated each time (practice mode)
 * - `per_student`: Each student gets their own instance (personalized homework)
 * - `per_group`: All students in group see same instance (class work)
 *
 * @example On-demand (infinite practice)
 * ```typescript
 * const exercise: Exercise = {
 *   distribution_mode: 'on_demand',
 *   variables: [{ name: 'a', expression: '{{1..10}}' }]
 * };
 * // Each refresh generates new values
 * ```
 *
 * @example Per-student (homework)
 * ```typescript
 * const exercise: Exercise = {
 *   distribution_mode: 'per_student',
 *   variables: [{ name: 'a', expression: '{{1..100}}' }]
 * };
 * // Each student gets consistent values (seeded by student_id)
 * ```
 *
 * @example Per-group (class work)
 * ```typescript
 * const exercise: Exercise = {
 *   distribution_mode: 'per_group',
 *   variables: [{ name: 'x', expression: '{{1..20}}' }]
 * };
 * // All students in assignment see same values
 * ```
 */
export type DistributionMode = 'on_demand' | 'per_student' | 'per_group';

/**
 * Options for generating an exercise instance
 *
 * @example With specific seed (reproducible)
 * ```typescript
 * const options: GenerateInstanceOptions = {
 *   seed: 12345,
 *   parseAST: true
 * };
 * const instance = generateExerciseInstance(template, options);
 * ```
 *
 * @example Random seed
 * ```typescript
 * const options: GenerateInstanceOptions = {
 *   parseAST: false
 * };
 * // Seed will be generated randomly
 * ```
 */
export interface GenerateInstanceOptions {
	/**
	 * Random seed for reproducible generation
	 * If not provided, a random seed will be generated
	 */
	seed?: number;

	/**
	 * Whether to parse markdown content to AST
	 * Set to false if you only need resolved text
	 * @default false
	 */
	parseAST?: boolean;

	/**
	 * Select specific variation by index (for exercises with variations)
	 * If not provided, first variation (index 0) is used
	 * @default 0
	 */
	variationIndex?: number;
}

/**
 * Result of instance generation
 *
 * @example Successful generation
 * ```typescript
 * const result: InstanceGenerationResult = {
 *   success: true,
 *   instance: {
 *     exerciseId: 'ex-123',
 *     seed: 12345,
 *     resolvedVariables: [{ name: 'a', value: '7' }],
 *     statement_md: 'Calculate 7 + 5',
 *     solution_md: 'The answer is 12'
 *   }
 * };
 * ```
 *
 * @example Failed generation
 * ```typescript
 * const result: InstanceGenerationResult = {
 *   success: false,
 *   errors: [
 *     'Circular dependency: a -> b -> a',
 *     'Undefined variable: {{c}}'
 *   ]
 * };
 * ```
 */
export interface InstanceGenerationResult {
	/** Whether generation succeeded */
	success: boolean;

	/** Generated instance (only if success=true) */
	instance?: ExerciseInstance;

	/** Error messages (only if success=false) */
	errors?: string[];
}

// ============================================================================
// DATABASE MODEL
// ============================================================================

/**
 * Exercise stored in database (template form)
 *
 * Exercises can be static or parameterized:
 * - **Static**: No variables, content is fixed
 * - **Parameterized**: Has variables, content contains {{var}} syntax
 *
 * Parameterized exercises are templates that generate instances with
 * specific values. The distribution_mode determines how instances are created.
 *
 * @example Static exercise
 * ```typescript
 * const exercise: Exercise = {
 *   id: 'ex-123',
 *   statement_md: 'Calculate $2 + 3$',
 *   solution_md: 'The answer is $5$',
 *   distribution_mode: 'on_demand',
 *   difficulty: 1,
 *   tags: ['addition'],
 *   created_by: 'teacher-id',
 *   // ... other fields
 * };
 * ```
 *
 * @example Parameterized exercise (template)
 * ```typescript
 * const exercise: Exercise = {
 *   id: 'ex-456',
 *   variables: [
 *     { name: 'a', expression: '{{1..10}}' },
 *     { name: 'b', expression: '{{1..10}}' },
 *     { name: 'sum', expression: '{{eval:a+b}}' }
 *   ],
 *   statement_md: 'Calculate ${{a}} + {{b}}$',
 *   solution_md: 'The answer is ${{sum}}$',
 *   distribution_mode: 'per_student',
 *   difficulty: 1,
 *   tags: ['addition'],
 *   created_by: 'teacher-id',
 *   // ... other fields
 * };
 * // This is a TEMPLATE - must generate instance before showing to students
 * ```
 *
 * @see ExerciseInstance for resolved instances
 * @see ExerciseTemplate type alias for clarity
 */
export interface Exercise {
	/** Unique identifier (UUID) */
	id: string;

	/** URL-friendly slug (topic-nanoid format, e.g., "algebre-k8m2n4p7") */
	slug?: string;

	// Metadata
	/** Exercise title (optional, for organization) */
	title?: string;

	/** Source reference (e.g., book name, author) */
	source?: string;

	/** Difficulty level: 1=easy, 2=medium, 3=hard */
	difficulty: 1 | 2 | 3;

	/** Tags for categorization (e.g., ['algèbre', 'équations', '3ème']) */
	tags: string[];

	// Content (markdown with LaTeX and optional {{}} parameterization)
	/**
	 * Exercise statement in markdown with $...$ and $$...$$ for math
	 *
	 * May contain parameterization syntax:
	 * - Variable references: {{varName}}
	 * - Random numbers: {{1..10}}, {{2.3}}, {{0.5..9.99:0.01}}
	 * - Expressions: {{eval:a+b}}
	 */
	statement_md: string;

	/**
	 * Solution/correction in markdown with LaTeX math
	 *
	 * May contain same parameterization syntax as statement_md
	 */
	solution_md: string;

	// Parameterization
	/**
	 * Variable definitions for parameterized exercises
	 *
	 * If undefined or empty, exercise is static (not parameterized)
	 * Variables are resolved in declaration order
	 */
	variables?: Variable[];

	/**
	 * How exercise instances are distributed to students
	 *
	 * - `on_demand`: New instance each time (infinite practice)
	 * - `per_student`: Each student gets unique instance (personalized homework)
	 * - `per_group`: All students share same instance (class work)
	 *
	 * @default 'on_demand'
	 */
	distribution_mode: DistributionMode;

	// Sharing
	/**
	 * Whether exercise is public in the shared library
	 *
	 * Public exercises are visible to all teachers
	 * @default false
	 */
	is_public?: boolean;

	// Additional metadata
	/** Applicable grade levels (e.g., ['3', '2', '1_SPE']) - uses GradeCode from unified system */
	grade_levels?: string[];

	/** Topic category (e.g., 'Algèbre', 'Géométrie') */
	topic?: string;

	/** Supplementary resources (videos, PDFs, links, etc.) */
	resources?: ExerciseResource[];

	// Math parsing configuration
	/**
	 * Custom function identifiers to recognize in math expressions.
	 *
	 * When math expressions contain identifiers like P(x), Q'(x), etc., the parser
	 * needs to know which identifiers should be treated as function calls rather
	 * than implicit multiplication.
	 *
	 * - `undefined`: Use parser defaults (f, g, h, u, v, w, F, G, H)
	 * - `[]`: Disable generic function parsing entirely
	 * - `['f', 'P', 'Q']`: Recognize only these identifiers as functions
	 *
	 * This enables parsing of:
	 * - Function calls: P(x), Q(a, b)
	 * - Derivatives: f'(x), P''(x)
	 * - Inverse functions: f^{-1}(x)
	 *
	 * @example
	 * ```typescript
	 * const exercise: Exercise = {
	 *   generic_functions: ['f', 'P', 'Q'],
	 *   statement_md: "Soit $f$ et $P$ deux fonctions. Calculer $P'(x)$.",
	 *   // P'(x) will be parsed as derivative of function P
	 * };
	 * ```
	 */
	generic_functions?: string[];

	// Audit fields
	created_at: string;
	updated_at: string;
	created_by: string; // UUID of creator

	// Variations system (optional - for exercises with multiple guidance levels)
	/**
	 * Shared defaults applied to all variations
	 *
	 * Variables defined here are resolved before per-variation variables.
	 * statement_md and solution_md serve as fallbacks if a variation doesn't define them.
	 */
	shared?: SharedExerciseDefaults;

	/**
	 * Array of variations with different guidance levels
	 *
	 * When defined, the exercise supports multiple versions (e.g., guided, intermediate, autonomous).
	 * Each variation can have its own hints, statement, solution, and variables.
	 */
	variations?: ExerciseVariation[];
}

// ============================================================================
// VARIATION TYPES
// ============================================================================

/**
 * Guidance level label for exercise variations
 *
 * Standard labels for progressive difficulty/autonomy:
 * - `guided`: Maximum support (step-by-step hints, detailed prompts)
 * - `intermediate`: Moderate support (some hints available)
 * - `autonomous`: Minimal support (student works independently)
 *
 * Custom string labels are also supported for flexibility.
 */
export type GuidanceLabel = 'guided' | 'intermediate' | 'autonomous';

/**
 * Inline hint that can be referenced in markdown via {{hint:id}} syntax
 *
 * Hints are displayed as interactive elements (buttons/tooltips) that reveal
 * additional resources when clicked. Different from ExerciseResource which
 * is shown in a separate resources section.
 *
 * @example Video hint
 * ```typescript
 * const hint: ExerciseHint = {
 *   id: 'rappel-pythagore',
 *   type: 'video',
 *   url: 'https://youtube.com/watch?v=...',
 *   title: 'Rappel: Théorème de Pythagore',
 *   description: 'Vidéo de 3 minutes expliquant le théorème'
 * };
 * // Referenced in markdown as: {{hint:rappel-pythagore}}
 * ```
 *
 * @example Image hint
 * ```typescript
 * const hint: ExerciseHint = {
 *   id: 'schema-triangle',
 *   type: 'image',
 *   url: '/images/triangle-rectangle.png',
 *   title: 'Schéma du triangle'
 * };
 * ```
 */
export interface ExerciseHint {
	/** Unique ID for {{hint:id}} reference in markdown */
	id: string;

	/** Resource type for display handling (icon, viewer, etc.) */
	type: ExerciseResourceType;

	/** URL to the hint resource */
	url: string;

	/** Display title shown on hint button/tooltip */
	title: string;

	/** Optional description providing context */
	description?: string;
}

/**
 * Exercise variation with specific guidance level
 *
 * Variations allow the same exercise to be presented with different levels
 * of scaffolding. A guided variation might include step-by-step hints,
 * while an autonomous variation provides just the problem statement.
 *
 * Statements can include {{hint:id}} references that render as interactive
 * hint buttons, allowing students to access help on demand.
 *
 * @example Guided variation with hints
 * ```typescript
 * const variation: ExerciseVariation = {
 *   label: 'guided',
 *   statement_md: `Dans un triangle rectangle ABC, on donne AB = {{a}} cm et BC = {{b}} cm.
 *     {{hint:rappel-pythagore}}
 *     Calculer AC.`,
 *   solution_md: `On applique le théorème de Pythagore...`,
 *   hints: [
 *     {
 *       id: 'rappel-pythagore',
 *       type: 'video',
 *       url: 'https://...',
 *       title: 'Rappel: Théorème de Pythagore'
 *     }
 *   ]
 * };
 * ```
 *
 * @example Autonomous variation (minimal hints)
 * ```typescript
 * const variation: ExerciseVariation = {
 *   label: 'autonomous',
 *   statement_md: `Triangle ABC rectangle en B. AB = {{a}} cm, BC = {{b}} cm. Calculer AC.`,
 *   solution_md: `AC = √({{a}}² + {{b}}²) = {{result}} cm`
 * };
 * ```
 */
export interface ExerciseVariation {
	/**
	 * Guidance level label
	 *
	 * Use standard labels ('guided', 'intermediate', 'autonomous') when possible
	 * for consistent UI treatment. Custom strings are supported for special cases.
	 */
	label: GuidanceLabel | string;

	/**
	 * Statement markdown - can contain {{hint:id}} references
	 *
	 * The statement can embed hint triggers using the syntax {{hint:id}}
	 * where id matches a hint in the hints array.
	 */
	statement_md: string;

	/**
	 * Solution markdown - can adapt to guidance level
	 *
	 * Guided variations might have more detailed solutions with
	 * step-by-step explanations, while autonomous variations
	 * might show just the final answer.
	 */
	solution_md: string;

	/**
	 * Per-variation variables (merged with shared variables)
	 *
	 * These variables are resolved after shared variables.
	 * If a variable name matches a shared variable, it overrides it.
	 */
	variables?: Variable[];

	/**
	 * Hints available in this variation
	 *
	 * Each hint can be referenced in statement_md or solution_md
	 * via {{hint:id}} syntax.
	 */
	hints?: ExerciseHint[];
}

/**
 * Shared defaults applied to all variations
 *
 * Reduces duplication when variations share common content.
 * Per-variation fields take precedence over shared defaults.
 *
 * @example Shared variables with variation-specific statements
 * ```typescript
 * const exercise: Exercise = {
 *   // ... other fields ...
 *   shared: {
 *     variables: [
 *       { name: 'a', expression: '{{3..10}}' },
 *       { name: 'b', expression: '{{3..10}}' },
 *       { name: 'result', expression: '{{eval:Math.sqrt(a*a + b*b)}}' }
 *     ],
 *     solution_md: 'AC = {{result}} cm'
 *   },
 *   variations: [
 *     {
 *       label: 'guided',
 *       statement_md: 'Detailed statement with hints...',
 *       solution_md: 'Step-by-step solution...' // Overrides shared
 *     },
 *     {
 *       label: 'autonomous',
 *       statement_md: 'Concise statement...'
 *       // Uses shared solution_md
 *     }
 *   ]
 * };
 * ```
 */
export interface SharedExerciseDefaults {
	/**
	 * Shared variables resolved before per-variation variables
	 *
	 * Variables with the same name in per-variation override these.
	 */
	variables?: Variable[];

	/**
	 * Fallback statement if variation doesn't define one
	 *
	 * Useful when all variations share the same problem setup
	 * but differ only in hints and scaffolding.
	 */
	statement_md?: string;

	/**
	 * Fallback solution if variation doesn't define one
	 *
	 * Useful when all variations lead to the same answer
	 * but provide different levels of detail.
	 */
	solution_md?: string;
}

/**
 * Type alias for Exercise in parameterized template form
 *
 * Use this when you want to emphasize that an Exercise contains
 * variables and {{}} syntax (not yet resolved).
 *
 * This is different from ExerciseTemplate which is a saved template entity.
 * This is just the Exercise type when used as a template.
 *
 * @example
 * ```typescript
 * function validateParameterizedExercise(exercise: ParameterizedExercise): ValidationResult {
 *   // Validate that variables are defined, no circular deps, etc.
 * }
 * ```
 */
export type ParameterizedExercise = Exercise;

/**
 * Exercise Instance - A resolved version of an Exercise Template
 *
 * When a parameterized exercise is displayed to a student, we generate
 * an instance with specific variable values. The instance contains:
 * - Resolved content ({{var}} replaced with actual values)
 * - Optional parsed AST (for rendering)
 * - Metadata about generation (seed, variables used, etc.)
 *
 * Static exercises (no variables) can be converted to instances for
 * consistent handling, but their content remains unchanged.
 *
 * @example Instance from parameterized template
 * ```typescript
 * // Template (what teacher creates)
 * const template: Exercise = {
 *   id: 'ex-123',
 *   variables: [
 *     { name: 'a', expression: '{{1..10}}' },
 *     { name: 'b', expression: '{{1..10}}' }
 *   ],
 *   statement_md: 'Calculate ${{a}} + {{b}}$',
 *   solution_md: 'The answer is ${{eval:a+b}}$',
 *   distribution_mode: 'per_student',
 *   difficulty: 1,
 *   // ... other fields
 * };
 *
 * // Instance (what student sees) - seed based on student_id
 * const instance: ExerciseInstance = {
 *   exerciseId: 'ex-123',
 *   title: undefined,
 *   difficulty: 1,
 *   seed: 54321, // Generated from student_id
 *   resolvedVariables: [
 *     { name: 'a', value: '7' },
 *     { name: 'b', value: '3' }
 *   ],
 *   statement_md: 'Calculate $7 + 3$', // Resolved
 *   solution_md: 'The answer is $10$', // Resolved
 *   generatedAt: new Date('2024-01-15T10:30:00Z'),
 *   distributionMode: 'per_student'
 * };
 * ```
 *
 * @example Instance from static exercise
 * ```typescript
 * // Static template
 * const template: Exercise = {
 *   id: 'ex-456',
 *   statement_md: 'Calculate $2 + 3$',
 *   solution_md: 'The answer is $5$',
 *   distribution_mode: 'on_demand',
 *   difficulty: 1,
 *   // ... other fields
 * };
 *
 * // Instance (same content, but consistent structure)
 * const instance: ExerciseInstance = {
 *   exerciseId: 'ex-456',
 *   title: undefined,
 *   difficulty: 1,
 *   seed: 0, // No randomization needed
 *   resolvedVariables: [], // No variables
 *   statement_md: 'Calculate $2 + 3$', // Unchanged
 *   solution_md: 'The answer is $5$', // Unchanged
 *   generatedAt: new Date('2024-01-15T10:30:00Z'),
 *   distributionMode: 'on_demand'
 * };
 * ```
 *
 * @see Exercise for the template type
 * @see ParameterizedExercise type alias for parameterized exercises
 * @see generateExerciseInstance() for creating instances
 */
export interface ExerciseInstance {
	// Original exercise metadata (copied from template)
	/** ID of the source exercise template */
	exerciseId: string;

	/** Exercise title (copied from template) */
	title?: string;

	/** Difficulty level (copied from template) */
	difficulty: 1 | 2 | 3;

	/** Tags (copied from template) */
	tags?: string[];

	/** Source reference (copied from template) */
	source?: string;

	/** Grade levels (copied from template) */
	grade_levels?: string[];

	/** Topic (copied from template) */
	topic?: string;

	// Instance-specific data
	/**
	 * Random seed used for variable resolution
	 *
	 * This seed allows reproducible instance generation:
	 * - Same seed + same template = same instance
	 * - For per_student mode: seed derived from student_id
	 * - For per_group mode: seed derived from assignment_id
	 * - For on_demand mode: random seed each time
	 */
	seed: number;

	/**
	 * Resolved variable values
	 *
	 * Variables resolved in declaration order with this seed
	 * Empty array for static exercises (no variables)
	 */
	resolvedVariables: ResolvedVariable[];

	// Resolved content (variables replaced with actual values)
	/**
	 * Resolved statement markdown
	 *
	 * All {{var}} syntax replaced with actual values
	 * Ready for parsing and display
	 */
	statement_md: string;

	/**
	 * Resolved solution markdown
	 *
	 * All {{var}} syntax replaced with actual values
	 * Ready for parsing and display
	 */
	solution_md: string;

	// Parsed content (optional, only if parseAST was requested)
	/**
	 * Parsed AST from resolved statement
	 *
	 * Only present if parseAST option was true during generation
	 * Used for rendering the statement
	 */
	statement_ast?: DocumentNode;

	/**
	 * Parsed AST from resolved solution
	 *
	 * Only present if parseAST option was true during generation
	 * Used for rendering the solution
	 */
	solution_ast?: DocumentNode;

	// Generation metadata
	/** Timestamp when instance was generated */
	generatedAt: Date;

	/** Distribution mode (copied from template) */
	distributionMode: DistributionMode;

	// Variation tracking (only for exercises using variations system)
	/**
	 * Index of the selected variation in the exercise's variations array
	 *
	 * Only present if the exercise uses the variations system.
	 * Used to track which variation was shown to the student.
	 */
	selectedVariationIndex?: number;

	/**
	 * Label of the selected variation (e.g., 'guided', 'intermediate', 'autonomous')
	 *
	 * Copied from the selected variation for easy access without
	 * needing to look up the original exercise template.
	 */
	selectedVariationLabel?: string;

	/**
	 * Resolved hints from the selected variation
	 *
	 * Contains the hints with URLs ready for display.
	 * {{hint:id}} references in statement_md/solution_md use these.
	 */
	resolvedHints?: ExerciseHint[];
}

/**
 * Partial exercise for creation (excludes auto-generated fields)
 *
 * Use this type when creating a new exercise. The database will
 * automatically generate id, created_at, and updated_at.
 *
 * @example Creating parameterized exercise
 * ```typescript
 * const newExercise: ExerciseCreate = {
 *   title: 'Addition Practice',
 *   difficulty: 1,
 *   tags: ['addition', 'arithmetic'],
 *   variables: [
 *     { name: 'a', expression: '{{1..20}}' },
 *     { name: 'b', expression: '{{1..20}}' }
 *   ],
 *   statement_md: 'Calculate ${{a}} + {{b}}$',
 *   solution_md: 'The answer is ${{eval:a+b}}$',
 *   distribution_mode: 'on_demand',
 *   created_by: userId
 * };
 * ```
 *
 * @example Creating static exercise
 * ```typescript
 * const newExercise: ExerciseCreate = {
 *   title: 'Pythagorean Theorem',
 *   difficulty: 2,
 *   tags: ['geometry', 'triangles'],
 *   statement_md: 'Find $c$ if $a=3$ and $b=4$...',
 *   solution_md: 'Using $c^2 = a^2 + b^2$...',
 *   distribution_mode: 'on_demand',
 *   created_by: userId
 * };
 * ```
 */
export type ExerciseCreate = Omit<Exercise, 'id' | 'created_at' | 'updated_at'>;

/**
 * Partial exercise for updates (all fields optional except id)
 *
 * Use this type when updating an existing exercise. Only the id is required,
 * all other fields are optional and will only update if provided.
 *
 * Note: created_at and created_by cannot be updated (audit fields)
 *
 * @example Updating title and difficulty
 * ```typescript
 * const update: ExerciseUpdate = {
 *   id: 'ex-123',
 *   title: 'New Title',
 *   difficulty: 2
 * };
 * ```
 *
 * @example Adding variables to existing exercise
 * ```typescript
 * const update: ExerciseUpdate = {
 *   id: 'ex-456',
 *   variables: [
 *     { name: 'a', expression: '{{1..10}}' }
 *   ],
 *   statement_md: 'Calculate {{a}} + 5',
 *   distribution_mode: 'per_student'
 * };
 * ```
 *
 * @example Changing distribution mode
 * ```typescript
 * const update: ExerciseUpdate = {
 *   id: 'ex-789',
 *   distribution_mode: 'per_group'
 * };
 * ```
 */
export type ExerciseUpdate = Partial<Omit<Exercise, 'id' | 'created_at' | 'created_by'>> & {
	id: string;
};

// Note: AST NODE TYPES and PARSER OPTIONS have been moved to $lib/custom-markdown/types

// ============================================================================
// TRANSPILER OPTIONS
// ============================================================================

/**
 * Options for LaTeX transpilation
 */
export interface LatexTranspilerOptions {
	/**
	 * Document class (article, report, book)
	 * @default 'article'
	 */
	documentClass?: 'article' | 'report' | 'book';

	/**
	 * Paper size (a4paper, letterpaper, etc.)
	 * @default 'a4paper'
	 */
	paperSize?: string;

	/**
	 * Font size (10pt, 11pt, 12pt)
	 * @default '11pt'
	 */
	fontSize?: string;

	/**
	 * Language for babel package
	 * @default 'french'
	 */
	language?: string;

	/**
	 * Additional LaTeX packages to include
	 */
	extraPackages?: string[];

	/**
	 * Whether to include preamble (useful for standalone compilation)
	 * @default true
	 */
	includePreamble?: boolean;

	/**
	 * Base path for resolving image URLs
	 */
	imageBasePath?: string;

	/**
	 * Title for the document
	 */
	title?: string;

	/**
	 * Author for the document
	 */
	author?: string;
}

/**
 * Options for Typst transpilation
 */
export interface TypstTranspilerOptions {
	/**
	 * Paper size (a4, us-letter, etc.)
	 * @default 'a4'
	 */
	paperSize?: string;

	/**
	 * Font size in points
	 * @default 11
	 */
	fontSize?: number;

	/**
	 * Language setting
	 * @default 'fr'
	 */
	language?: string;

	/**
	 * Base path for resolving image URLs
	 */
	imageBasePath?: string;

	/**
	 * Whether to include document setup
	 * @default true
	 */
	includeSetup?: boolean;

	/**
	 * Title for the document
	 */
	title?: string;

	/**
	 * Author for the document
	 */
	author?: string;
}

// Note: RenderOptions, ParseResult, and MathPlaceholder are re-exported from $lib/custom-markdown

// ============================================================================
// EXPORT/IMPORT TYPES
// ============================================================================

/**
 * Legacy exercise export format (v1.0 - without variations)
 * This format is kept for backward compatibility with existing exports
 */
export interface ExerciseExportV1 {
	/** Format version for backwards compatibility */
	version: '1.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];

	// Content
	statement_md: string;
	solution_md: string;

	// Additional metadata
	grade_levels?: string[];
	topic?: string;
}

/**
 * Modern exercise export format (v2.0 - with variations support)
 * This is the current format used for new exports
 */
export interface ExerciseExportV2 {
	/** Format version */
	version: '2.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];

	// Content - preserved for legacy compatibility and as fallbacks
	statement_md: string;
	solution_md: string;

	// Additional metadata
	grade_levels?: string[];
	topic?: string;

	// Variations system
	variations?: ExerciseVariation[];
	shared?: SharedExerciseDefaults;
}

/**
 * Clean exercise format for export (without id, timestamps, created_by)
 * This is the format used for JSON export and sharing between teachers
 *
 * Union type supporting both v1.0 (legacy) and v2.0 (with variations) formats.
 */
export type ExerciseExport = ExerciseExportV1 | ExerciseExportV2;

/**
 * YAML frontmatter for Markdown export (v1.0 - legacy)
 */
export interface ExerciseFrontmatterV1 {
	/** Format version */
	version: '1.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];
	grade_levels?: string[];
	topic?: string;
}

/**
 * YAML frontmatter for Markdown export (v2.0 - with variations)
 */
export interface ExerciseFrontmatterV2 {
	/** Format version */
	version: '2.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];
	grade_levels?: string[];
	topic?: string;

	// Variations system
	variations?: ExerciseVariation[];
	shared?: SharedExerciseDefaults;
}

/**
 * YAML frontmatter for Markdown export
 * Used in the --- section at the top of exported .md files
 *
 * Union type supporting both v1.0 (legacy) and v2.0 (with variations) formats.
 */
export type ExerciseFrontmatter = ExerciseFrontmatterV1 | ExerciseFrontmatterV2;

/**
 * Result of an import operation
 */
export interface ImportResult {
	success: boolean;
	/** Number of exercises successfully imported */
	imported: number;
	/** Number of exercises skipped (duplicates) */
	skipped: number;
	/** Number of exercises that failed to import */
	failed: number;
	/** IDs of successfully imported exercises */
	importedIds: string[];
	/** Detailed error messages for failed imports */
	errors: Array<{
		index: number;
		title?: string;
		error: string;
	}>;
}

/**
 * Options for exporting exercises
 */
export interface ExportOptions {
	/** Format to export to */
	format: 'json' | 'markdown' | 'zip';
	/** Whether to include solution in export */
	includeSolution?: boolean;
	/** Whether to pretty-print JSON */
	prettyPrint?: boolean;
}

/**
 * Options for importing exercises
 */
export interface ImportOptions {
	/** How to handle duplicates (based on title + statement hash) */
	onDuplicate: 'skip' | 'replace' | 'create-copy';
	/** Validate exercises before import */
	validate?: boolean;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

/**
 * Exercise template (system or user-created)
 */
export interface ExerciseTemplate {
	id: string;
	title: string;
	description?: string;

	/** Template data in clean export format */
	template_data: ExerciseExport;

	/** True for built-in system templates, false for user-created */
	is_system: boolean;

	// Audit fields (null for system templates)
	created_at?: string;
	created_by?: string; // UUID of creator (null for system templates)
}

/**
 * Template for creation (without id and timestamps)
 */
export type TemplateCreate = Omit<ExerciseTemplate, 'id' | 'created_at'>;

/**
 * System template loaded from static files
 */
export interface SystemTemplate {
	id: string;
	title: string;
	description?: string;
	template_data: ExerciseExport;
	/** Category for organizing templates (e.g., 'Algèbre', 'Géométrie') */
	category?: string;
	/** Preview image URL (optional) */
	preview?: string;
}

// ============================================================================
// IMAGE UPLOAD TYPES
// ============================================================================

/**
 * Result of an image upload operation
 */
export interface ImageUploadResult {
	/** Whether upload succeeded */
	success: boolean;
	/** Public URL of uploaded image (only if success=true) */
	url?: string;
	/** Storage path (only if success=true) */
	storagePath?: string;
	/** Error message (only if success=false) */
	error?: string;
}

/**
 * Result of an image delete operation
 */
export interface ImageDeleteResult {
	/** Whether deletion succeeded */
	success: boolean;
	/** Error message (only if success=false) */
	error?: string;
}

/**
 * Image upload progress (for UI feedback)
 */
export interface ImageUploadProgress {
	/** File being uploaded */
	file: File;
	/** Upload progress percentage (0-100) */
	progress: number;
	/** Status of upload */
	status: 'pending' | 'uploading' | 'success' | 'error';
	/** Result (only when status is 'success' or 'error') */
	result?: ImageUploadResult;
}

// ============================================================================
// SHARING & FAVORITES TYPES
// ============================================================================

/**
 * Exercise with sharing information
 *
 * Extended Exercise type that includes sharing and favorite metadata.
 * Used when displaying exercises in the public library or favorites list.
 *
 * @example In public library view
 * ```typescript
 * const publicExercise: ExerciseWithSharing = {
 *   // ... all Exercise fields ...
 *   is_public: true,
 *   is_favorited: false,
 *   creator: {
 *     id: 'teacher-123',
 *     full_name: 'Marie Dupont',
 *     email: 'marie.dupont@example.com'
 *   }
 * };
 * ```
 */
export interface ExerciseWithSharing extends Exercise {
	/** Whether exercise is public and visible to all teachers */
	is_public: boolean;
	/** Whether current user has favorited this exercise */
	is_favorited?: boolean;
	/** Information about the creator (for public exercises) */
	creator?: {
		id: string;
		full_name?: string;
		email: string;
	};
}

/**
 * Favorite exercise record
 */
export interface ExerciseFavorite {
	user_id: string;
	exercise_id: string;
	created_at: string;
}

// ============================================================================
// ASSIGNMENT & COMPLETION TYPES
// ============================================================================

/**
 * Type for assignment target
 *
 * Determines who can access an assigned exercise:
 * - `student`: Assigned to a specific student
 * - `class`: Assigned to all students in a class
 * - `public`: Available to all students (like a public exercise)
 */
export type AssignmentTargetType = 'student' | 'class' | 'public';

/**
 * Exercise assignment (base database record)
 *
 * Represents an exercise assigned by a teacher to students, classes, or made public.
 * Teachers use assignments to distribute exercises with optional deadlines and notes.
 *
 * @example Student assignment
 * ```typescript
 * const assignment: ExerciseAssignment = {
 *   id: 'assign-123',
 *   exercise_id: 'ex-456',
 *   assigned_by: 'teacher-789',
 *   assigned_to_type: 'student',
 *   student_id: 'student-abc',
 *   class_id: null,
 *   assigned_at: '2024-01-15T10:00:00Z',
 *   optional_deadline: '2024-01-20T23:59:59Z',
 *   notes: 'Complete before next class',
 *   is_active: true
 * };
 * ```
 *
 * @example Class assignment
 * ```typescript
 * const assignment: ExerciseAssignment = {
 *   id: 'assign-456',
 *   exercise_id: 'ex-789',
 *   assigned_by: 'teacher-789',
 *   assigned_to_type: 'class',
 *   student_id: null,
 *   class_id: 'class-3eme-a',
 *   assigned_at: '2024-01-15T10:00:00Z',
 *   optional_deadline: null,
 *   notes: null,
 *   is_active: true
 * };
 * ```
 *
 * @example Public assignment
 * ```typescript
 * const assignment: ExerciseAssignment = {
 *   id: 'assign-789',
 *   exercise_id: 'ex-123',
 *   assigned_by: 'teacher-789',
 *   assigned_to_type: 'public',
 *   student_id: null,
 *   class_id: null,
 *   assigned_at: '2024-01-15T10:00:00Z',
 *   optional_deadline: null,
 *   notes: 'Practice exercise for all students',
 *   is_active: true
 * };
 * ```
 */
export interface ExerciseAssignment {
	/** Unique identifier (UUID) */
	id: string;

	/** Exercise being assigned (FK → exercises) */
	exercise_id: string;

	/** Teacher who created the assignment (FK → profiles) */
	assigned_by: string;

	/** Target type for the assignment */
	assigned_to_type: AssignmentTargetType;

	/** Target student ID (required if assigned_to_type='student', null otherwise) */
	student_id: string | null;

	/** Target class ID (required if assigned_to_type='class', null otherwise) */
	class_id: string | null;

	/** Timestamp when assignment was created (ISO 8601) */
	assigned_at: string;

	/** Optional deadline for completion (ISO 8601) */
	optional_deadline: string | null;

	/** Optional notes from teacher (e.g., instructions, context) */
	notes: string | null;

	/** Whether assignment is active (can be deactivated to hide from students) */
	is_active: boolean;
}

/**
 * Exercise completion tracking record
 *
 * Tracks student interaction with exercises, including views and completion status.
 * Created when student first views an exercise, updated when they complete it.
 *
 * Note: completed_at is null until student marks exercise as completed.
 * This allows tracking of started-but-not-completed exercises.
 *
 * @example Viewed but not completed
 * ```typescript
 * const completion: ExerciseCompletion = {
 *   id: 'complete-123',
 *   exercise_id: 'ex-456',
 *   assignment_id: 'assign-789', // If accessed via assignment
 *   student_id: 'student-abc',
 *   completed_at: null, // Not yet completed
 *   last_viewed_at: '2024-01-15T14:30:00Z',
 *   view_count: 3,
 *   created_at: '2024-01-15T10:00:00Z'
 * };
 * ```
 *
 * @example Completed exercise
 * ```typescript
 * const completion: ExerciseCompletion = {
 *   id: 'complete-456',
 *   exercise_id: 'ex-789',
 *   assignment_id: 'assign-123',
 *   student_id: 'student-xyz',
 *   completed_at: '2024-01-15T15:00:00Z', // Marked complete
 *   last_viewed_at: '2024-01-15T15:00:00Z',
 *   view_count: 5,
 *   created_at: '2024-01-15T10:00:00Z'
 * };
 * ```
 */
export interface ExerciseCompletion {
	/** Unique identifier (UUID) */
	id: string;

	/** Exercise being tracked (FK → exercises) */
	exercise_id: string;

	/** Related assignment (FK → exercise_assignments, null if accessed directly) */
	assignment_id: string | null;

	/** Student being tracked (FK → profiles) */
	student_id: string;

	/** Timestamp when student marked exercise as complete (ISO 8601, null if not completed) */
	completed_at: string | null;

	/** Timestamp of most recent view (ISO 8601) */
	last_viewed_at: string;

	/** Number of times student has viewed this exercise */
	view_count: number;

	/** Timestamp when tracking started (ISO 8601) */
	created_at: string;
}

/**
 * Data for creating a new assignment
 *
 * Used when teacher assigns an exercise. Excludes server-generated fields
 * (id, assigned_by, assigned_at, is_active).
 *
 * @example Creating student assignment with deadline
 * ```typescript
 * const data: CreateExerciseAssignment = {
 *   exercise_id: 'ex-123',
 *   assigned_to_type: 'student',
 *   student_id: 'student-abc',
 *   optional_deadline: '2024-01-20T23:59:59Z',
 *   notes: 'Review before test'
 * };
 * ```
 *
 * @example Creating class assignment
 * ```typescript
 * const data: CreateExerciseAssignment = {
 *   exercise_id: 'ex-456',
 *   assigned_to_type: 'class',
 *   class_id: 'class-3eme-a'
 * };
 * ```
 */
export interface CreateExerciseAssignment {
	/** Exercise to assign */
	exercise_id: string;

	/** Who to assign to */
	assigned_to_type: AssignmentTargetType;

	/** Student ID (required if assigned_to_type='student') */
	student_id?: string;

	/** Class ID (required if assigned_to_type='class') */
	class_id?: string;

	/** Optional deadline (ISO 8601) */
	optional_deadline?: string | null;

	/** Optional notes for students */
	notes?: string;
}

/**
 * Validated assignment data ready for database insertion
 *
 * After validating CreateExerciseAssignment and adding assigned_by
 * from auth context, this type is ready for database insertion.
 *
 * @internal Used by server-side assignment creation logic
 */
export interface ValidatedAssignmentData extends CreateExerciseAssignment {
	/** Teacher creating the assignment (from auth context) */
	assigned_by: string;
}

/**
 * Assignment with full exercise and user details
 *
 * Result of joining exercise_assignments with exercises, profiles, and classes.
 * Corresponds to the assigned_exercises_with_details database view.
 * Used for displaying assignments in teacher dashboard.
 *
 * @example In teacher dashboard
 * ```typescript
 * const details: AssignedExerciseWithDetails = {
 *   // Assignment fields
 *   id: 'assign-123',
 *   exercise_id: 'ex-456',
 *   assigned_by: 'teacher-789',
 *   assigned_to_type: 'class',
 *   student_id: null,
 *   class_id: 'class-3eme-a',
 *   assigned_at: '2024-01-15T10:00:00Z',
 *   optional_deadline: '2024-01-20T23:59:59Z',
 *   notes: 'Complete before Friday',
 *   is_active: true,
 *
 *   // Exercise details
 *   exercise_title: 'Théorème de Pythagore',
 *   statement_md: 'Dans un triangle rectangle...',
 *   distribution_mode: 'per_student',
 *   exercise_is_public: false,
 *   difficulty: 2,
 *   tags: ['géométrie', 'pythagore'],
 *   grade_levels: ['3'],
 *
 *   // Creator details
 *   assigned_by_name: 'Marie Dupont',
 *
 *   // Computed field
 *   assigned_to_name: '3ème A' // Class name
 * };
 * ```
 */
export interface AssignedExerciseWithDetails extends ExerciseAssignment {
	// From exercises table
	/** Exercise title */
	exercise_title: string;

	/** Exercise statement content */
	statement_md: string;

	/** How instances are distributed */
	distribution_mode: DistributionMode;

	/** Whether exercise is public */
	exercise_is_public: boolean;

	/** Difficulty level */
	difficulty: number;

	/** Exercise tags */
	tags: string[];

	/** Applicable grade levels */
	grade_levels: string[] | null;

	// From profiles (teacher)
	/** Full name of teacher who assigned */
	assigned_by_name: string;

	// Computed field
	/**
	 * Display name for assignment target
	 * - Student name if assigned_to_type='student'
	 * - Class name if assigned_to_type='class'
	 * - "Public" if assigned_to_type='public'
	 */
	assigned_to_name: string;
}

/**
 * Exercise with completion status for student view
 *
 * Combines Exercise with optional assignment and completion data.
 * Used when displaying exercises to students to show which are assigned
 * and track their progress.
 *
 * @example Assigned exercise with completion
 * ```typescript
 * const exercise: ExerciseWithCompletion = {
 *   // ... all Exercise fields ...
 *   id: 'ex-123',
 *   title: 'Addition Practice',
 *   // ... other exercise fields ...
 *
 *   assignment: {
 *     id: 'assign-456',
 *     exercise_id: 'ex-123',
 *     assigned_by: 'teacher-789',
 *     assigned_to_type: 'student',
 *     student_id: 'student-abc',
 *     class_id: null,
 *     assigned_at: '2024-01-15T10:00:00Z',
 *     optional_deadline: '2024-01-20T23:59:59Z',
 *     notes: 'Complete this week',
 *     is_active: true
 *   },
 *
 *   completion: {
 *     id: 'complete-789',
 *     exercise_id: 'ex-123',
 *     assignment_id: 'assign-456',
 *     student_id: 'student-abc',
 *     completed_at: '2024-01-16T14:30:00Z',
 *     last_viewed_at: '2024-01-16T14:30:00Z',
 *     view_count: 2,
 *     created_at: '2024-01-15T10:30:00Z'
 *   },
 *
 *   is_accessible: true // Has assignment
 * };
 * ```
 *
 * @example Public exercise without assignment
 * ```typescript
 * const exercise: ExerciseWithCompletion = {
 *   // ... all Exercise fields ...
 *   id: 'ex-456',
 *   is_public: true,
 *   // ... other fields ...
 *
 *   assignment: undefined, // Not assigned, just public
 *   completion: undefined, // Not yet viewed
 *   is_accessible: true // Is public
 * };
 * ```
 */
export interface ExerciseWithCompletion extends Exercise {
	/** Assignment data if exercise was assigned to this student */
	assignment?: ExerciseAssignment;

	/** Completion tracking data if student has viewed/completed */
	completion?: ExerciseCompletion;

	/**
	 * Whether student can access this exercise
	 * True if: has assignment OR exercise.is_public=true
	 */
	is_accessible: boolean;
}

/**
 * Union type for assignment target data
 *
 * Type-safe representation of assignment targets.
 * Use with discriminated union pattern for type narrowing.
 *
 * @example Type narrowing
 * ```typescript
 * function handleAssignment(target: AssignmentTarget) {
 *   switch (target.type) {
 *     case 'student':
 *       console.log('Assigned to student:', target.student_id);
 *       break;
 *     case 'class':
 *       console.log('Assigned to class:', target.class_id);
 *       break;
 *     case 'public':
 *       console.log('Made public to all');
 *       break;
 *   }
 * }
 * ```
 */
export type AssignmentTarget =
	| { type: 'student'; student_id: string }
	| { type: 'class'; class_id: string }
	| { type: 'public' };

/**
 * Bulk assignment creation data
 *
 * Used when teacher wants to assign same exercise to multiple students/classes.
 * More efficient than creating individual assignments.
 *
 * @example Assign to multiple students
 * ```typescript
 * const bulk: BulkAssignmentData = {
 *   exercise_id: 'ex-123',
 *   students: ['student-1', 'student-2', 'student-3'],
 *   optional_deadline: '2024-01-20T23:59:59Z',
 *   notes: 'Complete for homework'
 * };
 * ```
 *
 * @example Assign to classes and make public
 * ```typescript
 * const bulk: BulkAssignmentData = {
 *   exercise_id: 'ex-456',
 *   classes: ['class-3eme-a', 'class-3eme-b'],
 *   make_public: true
 * };
 * ```
 */
export interface BulkAssignmentData {
	/** Exercise to assign */
	exercise_id: string;

	/** Student IDs to assign to (creates one assignment per student) */
	students?: string[];

	/** Class IDs to assign to (creates one assignment per class) */
	classes?: string[];

	/** Whether to create a public assignment (accessible to all students) */
	make_public?: boolean;

	/** Optional deadline for all assignments */
	optional_deadline?: string | null;

	/** Optional notes for all assignments */
	notes?: string;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Pagination parameters for list queries
 *
 * Used to implement offset-based pagination for large result sets.
 * Prevents loading thousands of records at once.
 *
 * @example First page (default)
 * ```typescript
 * const pagination: PaginationParams = {
 *   limit: 20,
 *   offset: 0
 * };
 * ```
 *
 * @example Second page
 * ```typescript
 * const pagination: PaginationParams = {
 *   limit: 20,
 *   offset: 20  // Skip first 20 results
 * };
 * ```
 */
export interface PaginationParams {
	/**
	 * Maximum number of items to return
	 * @default 50
	 */
	limit?: number;

	/**
	 * Number of items to skip (for pagination)
	 * @default 0
	 */
	offset?: number;
}

/**
 * Paginated response wrapper
 *
 * Wraps list results with pagination metadata to help
 * client implement infinite scroll or page navigation.
 *
 * @example With more results available
 * ```typescript
 * const response: PaginatedResponse<Exercise> = {
 *   data: [...], // 50 exercises
 *   total: 150,  // Total count in DB
 *   limit: 50,
 *   offset: 0,
 *   hasMore: true  // More results available
 * };
 * ```
 *
 * @example Last page
 * ```typescript
 * const response: PaginatedResponse<Exercise> = {
 *   data: [...], // 20 exercises
 *   total: 120,
 *   limit: 50,
 *   offset: 100,
 *   hasMore: false  // No more results
 * };
 * ```
 */
export interface PaginatedResponse<T> {
	/** Result items for this page */
	data: T[];

	/** Total number of items matching query (across all pages) */
	total: number;

	/** Limit used for this query */
	limit: number;

	/** Offset used for this query */
	offset: number;

	/** Whether more results are available (offset + limit < total) */
	hasMore: boolean;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

/**
 * Filter options for student exercise list
 *
 * Used when students browse available exercises.
 * Helps filter by completion status, assignment status, and accessibility.
 *
 * @example Show only assigned uncompleted exercises
 * ```typescript
 * const filters: StudentExerciseFilters = {
 *   show_completed: false,
 *   show_assigned_only: true
 * };
 * ```
 */
export interface StudentExerciseFilters {
	/** Include completed exercises in results */
	show_completed?: boolean;

	/** Show only assigned exercises (exclude public exercises) */
	show_assigned_only?: boolean;

	/** Show public exercises (not assigned to student) */
	show_public?: boolean;

	/** Show only exercises with deadlines */
	has_deadline?: boolean;

	/** Search in title and statement */
	search?: string;
}

/**
 * Filter options for teacher assignment management
 *
 * Used when teachers view and manage their assignments.
 * Helps organize assignments by type, status, and target.
 *
 * @example Show only active class assignments
 * ```typescript
 * const filters: TeacherAssignmentFilters = {
 *   assigned_to_type: 'class',
 *   is_active: true
 * };
 * ```
 */
export interface TeacherAssignmentFilters {
	/** Filter by specific exercise */
	exercise_id?: string;

	/** Filter by assignment target type */
	assigned_to_type?: AssignmentTargetType;

	/** Filter by active status */
	is_active?: boolean;

	/** Show only assignments with deadlines */
	has_deadline?: boolean;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Assignment statistics for teacher dashboard
 *
 * Aggregate statistics about a teacher's assignments.
 * Useful for dashboard overview and analytics.
 *
 * @example Dashboard stats
 * ```typescript
 * const stats: AssignmentStats = {
 *   total_assignments: 45,
 *   active_assignments: 42,
 *   student_assignments: 30,
 *   class_assignments: 10,
 *   public_assignments: 5,
 *   with_deadline: 25
 * };
 * ```
 */
export interface AssignmentStats {
	/** Total number of assignments created by teacher */
	total_assignments: number;

	/** Number of active assignments (is_active=true) */
	active_assignments: number;

	/** Number of student-targeted assignments */
	student_assignments: number;

	/** Number of class-targeted assignments */
	class_assignments: number;

	/** Number of public assignments */
	public_assignments: number;

	/** Number of assignments with deadlines */
	with_deadline: number;
}

/**
 * Completion statistics for a specific exercise
 *
 * Tracks student engagement and completion rates for an exercise.
 * Useful for teachers to monitor exercise effectiveness.
 *
 * @example Exercise performance
 * ```typescript
 * const stats: ExerciseCompletionStats = {
 *   exercise_id: 'ex-123',
 *   total_assigned: 30, // Assigned to 30 students
 *   total_viewed: 28, // 28 students viewed it
 *   total_completed: 25, // 25 students completed it
 *   completion_rate: 83.33, // 25/30 = 83.33%
 *   average_view_count: 2.4 // Students viewed it 2.4 times on average
 * };
 * ```
 */
export interface ExerciseCompletionStats {
	/** Exercise being tracked */
	exercise_id: string;

	/** Number of students assigned this exercise */
	total_assigned: number;

	/** Number of students who viewed the exercise */
	total_viewed: number;

	/** Number of students who completed the exercise */
	total_completed: number;

	/**
	 * Completion percentage: (total_completed / total_assigned) * 100
	 * Value between 0 and 100
	 */
	completion_rate: number;

	/** Average number of times students viewed this exercise */
	average_view_count: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate assignment creation data
 *
 * Ensures that assignment data has the correct target fields:
 * - student assignments must have student_id
 * - class assignments must have class_id
 * - public assignments must not have student_id or class_id
 *
 * @param data - Assignment data to validate
 * @returns Validation result with error message if invalid
 *
 * @example Valid student assignment
 * ```typescript
 * const result = validateAssignmentData({
 *   exercise_id: 'ex-123',
 *   assigned_to_type: 'student',
 *   student_id: 'student-abc'
 * });
 * // result = { valid: true }
 * ```
 *
 * @example Invalid student assignment (missing student_id)
 * ```typescript
 * const result = validateAssignmentData({
 *   exercise_id: 'ex-123',
 *   assigned_to_type: 'student'
 * });
 * // result = { valid: false, error: 'student_id required for student assignment' }
 * ```
 */
export function validateAssignmentData(data: CreateExerciseAssignment): {
	valid: boolean;
	error?: string;
} {
	if (data.assigned_to_type === 'student' && !data.student_id) {
		return { valid: false, error: 'student_id required for student assignment' };
	}
	if (data.assigned_to_type === 'class' && !data.class_id) {
		return { valid: false, error: 'class_id required for class assignment' };
	}
	if (data.assigned_to_type === 'public' && (data.student_id || data.class_id)) {
		return { valid: false, error: 'public assignment cannot have student_id or class_id' };
	}
	return { valid: true };
}

/**
 * Check if assignment has a deadline
 *
 * @param assignment - Assignment to check
 * @returns True if assignment has a non-null deadline
 *
 * @example
 * ```typescript
 * const assignment: ExerciseAssignment = {
 *   // ... fields ...
 *   optional_deadline: '2024-01-20T23:59:59Z'
 * };
 * hasDeadline(assignment); // true
 * ```
 */
export function hasDeadline(assignment: ExerciseAssignment): boolean {
	return assignment.optional_deadline !== null;
}

/**
 * Check if exercise has been completed by student
 *
 * An exercise is considered completed if completion record exists
 * and has a non-null completed_at timestamp.
 *
 * @param completion - Completion record (may be undefined)
 * @returns True if exercise is completed
 *
 * @example Completed exercise
 * ```typescript
 * const completion: ExerciseCompletion = {
 *   // ... fields ...
 *   completed_at: '2024-01-16T14:30:00Z'
 * };
 * isExerciseCompleted(completion); // true
 * ```
 *
 * @example Not completed
 * ```typescript
 * const completion: ExerciseCompletion = {
 *   // ... fields ...
 *   completed_at: null // Viewed but not completed
 * };
 * isExerciseCompleted(completion); // false
 * ```
 */
export function isExerciseCompleted(completion?: ExerciseCompletion): boolean {
	return completion?.completed_at !== null && completion?.completed_at !== undefined;
}

/**
 * Get completion percentage as rounded integer
 *
 * @param stats - Completion statistics
 * @returns Completion rate as integer (0-100)
 *
 * @example
 * ```typescript
 * const stats: ExerciseCompletionStats = {
 *   // ... fields ...
 *   completion_rate: 83.33333
 * };
 * getCompletionPercentage(stats); // 83
 * ```
 */
export function getCompletionPercentage(stats: ExerciseCompletionStats): number {
	return Math.round(stats.completion_rate);
}

/**
 * Format assignment target for display
 *
 * Returns a human-readable string for the assignment target type.
 * Useful for UI labels and tables.
 *
 * @param assignment - Assignment to format
 * @returns Display string ('Student', 'Class', or 'Public')
 *
 * @example
 * ```typescript
 * const assignment: ExerciseAssignment = {
 *   // ... fields ...
 *   assigned_to_type: 'class'
 * };
 * formatAssignmentTarget(assignment); // 'Class'
 * ```
 */
export function formatAssignmentTarget(assignment: ExerciseAssignment): string {
	switch (assignment.assigned_to_type) {
		case 'student':
			return 'Student';
		case 'class':
			return 'Class';
		case 'public':
			return 'Public';
	}
}

// ============================================================================
// VARIATION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if exercise uses the variations system
 *
 * An exercise uses variations if it has a non-empty variations array.
 * This determines whether to use the standard rendering path or
 * the variation-aware rendering path.
 *
 * @param exercise - Exercise to check
 * @returns True if exercise has variations defined
 *
 * @example Standard exercise (no variations)
 * ```typescript
 * const exercise: Exercise = {
 *   // ... fields ...
 *   variations: undefined
 * };
 * isVariationsExercise(exercise); // false
 * ```
 *
 * @example Exercise with variations
 * ```typescript
 * const exercise: Exercise = {
 *   // ... fields ...
 *   variations: [
 *     { label: 'guided', statement_md: '...', solution_md: '...' },
 *     { label: 'autonomous', statement_md: '...', solution_md: '...' }
 *   ]
 * };
 * isVariationsExercise(exercise); // true
 * ```
 */
export function isVariationsExercise(exercise: Exercise): boolean {
	return exercise.variations !== undefined && exercise.variations.length > 0;
}

/**
 * Merge shared and per-variation variables
 *
 * Combines shared variables with per-variation variables, allowing
 * per-variation to override shared variables with the same name.
 *
 * Resolution order:
 * 1. Shared variables (resolved first)
 * 2. Per-variation variables (can reference and override shared)
 *
 * @param shared - Shared variables from exercise.shared.variables
 * @param perVariation - Per-variation variables from variation.variables
 * @returns Merged variable array, or undefined if both are empty
 *
 * @example No variables
 * ```typescript
 * mergeExerciseVariables(undefined, undefined); // undefined
 * ```
 *
 * @example Only shared variables
 * ```typescript
 * const shared = [{ name: 'a', expression: '{{1..10}}' }];
 * mergeExerciseVariables(shared, undefined);
 * // [{ name: 'a', expression: '{{1..10}}' }]
 * ```
 *
 * @example Override shared variable
 * ```typescript
 * const shared = [{ name: 'a', expression: '{{1..10}}' }];
 * const perVar = [{ name: 'a', expression: '{{5..15}}' }];
 * mergeExerciseVariables(shared, perVar);
 * // [{ name: 'a', expression: '{{5..15}}' }] - per-variation wins
 * ```
 *
 * @example Merge different variables
 * ```typescript
 * const shared = [{ name: 'a', expression: '{{1..10}}' }];
 * const perVar = [{ name: 'b', expression: '{{eval:a*2}}' }];
 * mergeExerciseVariables(shared, perVar);
 * // [{ name: 'a', expression: '{{1..10}}' }, { name: 'b', expression: '{{eval:a*2}}' }]
 * ```
 */
export function mergeExerciseVariables(
	shared: Variable[] | undefined,
	perVariation: Variable[] | undefined
): Variable[] | undefined {
	if (!shared?.length) return perVariation;
	if (!perVariation?.length) return shared;

	// Build set of overridden variable names
	const overriddenNames = new Set(perVariation.map((v) => v.name));

	// Filter out shared variables that are overridden
	const effectiveShared = shared.filter((v) => !overriddenNames.has(v.name));

	return [...effectiveShared, ...perVariation];
}

/**
 * Resolve variation with shared defaults applied
 *
 * Creates a complete variation by applying shared defaults for any
 * fields not defined in the per-variation object.
 *
 * Priority (highest to lowest):
 * 1. Per-variation value (if defined and non-empty)
 * 2. Shared default value
 * 3. Empty string (for required string fields)
 *
 * @param shared - Shared defaults from exercise.shared
 * @param variation - Per-variation values
 * @returns Complete variation with all fields resolved
 *
 * @example No shared defaults
 * ```typescript
 * const variation = {
 *   label: 'guided',
 *   statement_md: 'Problem...',
 *   solution_md: 'Answer...'
 * };
 * resolveExerciseVariationWithShared(undefined, variation);
 * // Returns variation unchanged
 * ```
 *
 * @example Using shared solution
 * ```typescript
 * const shared = {
 *   variables: [{ name: 'a', expression: '{{1..10}}' }],
 *   solution_md: 'The answer is {{a}}'
 * };
 * const variation = {
 *   label: 'guided',
 *   statement_md: 'Calculate {{a}}...',
 *   solution_md: '' // Empty, will use shared
 * };
 * resolveExerciseVariationWithShared(shared, variation);
 * // {
 * //   label: 'guided',
 * //   statement_md: 'Calculate {{a}}...',
 * //   solution_md: 'The answer is {{a}}', // From shared
 * //   variables: [{ name: 'a', expression: '{{1..10}}' }],
 * //   hints: undefined
 * // }
 * ```
 */
export function resolveExerciseVariationWithShared(
	shared: SharedExerciseDefaults | undefined,
	variation: ExerciseVariation
): ExerciseVariation {
	if (!shared) return variation;

	return {
		label: variation.label,
		statement_md: variation.statement_md || shared.statement_md || '',
		solution_md: variation.solution_md || shared.solution_md || '',
		variables: mergeExerciseVariables(shared.variables, variation.variables),
		hints: variation.hints
	};
}
