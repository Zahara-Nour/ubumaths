/**
 * MathAST - Mathematical Abstract Syntax Tree
 *
 * A comprehensive library for representing mathematical expressions
 * as an immutable abstract syntax tree, designed as a pivot structure
 * for transpilation between LaTeX and custom syntax.
 *
 * @example
 * ```typescript
 * import { MathAST, isVariable, mapNode, withMetadata } from '$lib/mathAST';
 *
 * // Create expression: x^2 + 3x - 5 = 0
 * const ast = MathAST.equals(
 *   MathAST.subtract(
 *     MathAST.add(
 *       MathAST.power(MathAST.variable('x'), MathAST.number('2')),
 *       MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x'))
 *     ),
 *     MathAST.number('5')
 *   ),
 *   MathAST.number('0')
 * );
 *
 * // Color all variables red
 * const colored = mapNode(ast, node =>
 *   isVariable(node) ? withMetadata(node, { color: 'red' }) : node
 * );
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Metadata
	NodeMetadata,

	// Greek letters
	GreekLetter,

	// Symbols
	MathSymbol,

	// Mathematical constants
	MathConstant,
	MathConstantNode,

	// Display styles
	MultiplicationDisplayStyle,
	DivisionDisplayStyle,
	DelimiterType,
	DelimiterSemantic,
	RelationType,

	// Node types
	MathNode,
	NumberNode,
	VariableNode,
	GreekLetterNode,
	SymbolNode,
	HoleNode,
	AdditionNode,
	SubtractionNode,
	MultiplicationNode,
	DivisionNode,
	OppositeNode,
	PositiveNode,
	FunctionNode,
	CompositionNode,
	DelimiterNode,
	SubscriptNode,
	SuperscriptNode,
	RelationNode,
	UnitNode,
	MatrixNode,
	ComplexNode,

	// Union types
	LiteralNode,
	BinaryOperationNode,
	UnaryOperationNode,
	StructuralNode,

	// Utility types
	MathNodeType
} from './types';

// =============================================================================
// Factory Functions and Options Types
// =============================================================================

export {
	// Namespace with all factories
	MathAST,

	// Individual factories (for tree-shaking)
	// Literals
	number,
	variable,
	greek,
	symbol,
	hole,

	// Mathematical constants
	mathConstant,
	euler,
	piConstant,

	// Binary operations
	add,
	subtract,
	multiply,
	implicitMultiply,
	divide,
	fraction,

	// Unary operations
	opposite,
	positive,

	// Functions
	func,
	sin,
	cos,
	tan,
	ln,
	log,
	exp,
	sqrt,
	abs,
	derivativeFunc,
	inverseFunc,
	compose,

	// Structural
	delimiter,
	parentheses,
	subscript,
	superscript,
	power,

	// Relations
	relation,
	equals,
	lessThan,
	greaterThan,
	lessThanOrEqual,
	greaterThanOrEqual,
	notEquals,
	approx,
	congruent,
	elementOf,
	notElementOf,
	subset,
	subsetOrEqual,
	superset,
	supersetOrEqual,
	implies,
	iff,

	// Relation chains
	relationChain,
	equalsChain,
	lessThanChain,
	lessThanOrEqualChain,
	greaterThanChain,
	greaterThanOrEqualChain,
	impliesChain,
	iffChain,

	// Units
	withUnit,
	quantity,
	quantityVar,

	// Matrices
	matrix,
	rowVector,
	columnVector,
	identityMatrix,
	zeroMatrix,

	// Complex numbers
	complex
} from './factory';

// Options types for extended metadata
export type {
	BinaryOpOptions,
	UnaryOpOptions,
	DelimiterOptions,
	FunctionMetadataOptions,
	RelationOptions,
	UnitOptions
} from './factory';

// =============================================================================
// Transformation Helpers
// =============================================================================

export {
	withMetadata,
	withOperatorMetadata,
	withDelimiterMetadata,
	withRelationMetadata,
	withNameMetadata,
	withUnitMetadata,
	getChildren,
	mapNode,
	mapNodeTopDown,
	findNodes,
	findFirst,
	replaceNode,
	cloneNode,
	countNodes,
	getDepth
} from './transforms';

// =============================================================================
// Type Guards
// =============================================================================

export {
	// Category type guards
	isLiteralNode,
	isBinaryOperationNode,
	isUnaryOperationNode,
	isStructuralNode,

	// Individual type guards
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isHole,
	isMathConstant,
	isEulerConstant,
	isPiConstant,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDerivativeFunction,
	isInverseFunction,
	isComposition,
	isDelimiter,
	isSubscript,
	isSuperscript,
	isRelation,
	isUnit,
	isMatrix,
	isRowVector,
	isColumnVector,
	isSquareMatrix,
	isComplex,

	// Utility predicates
	hasDerivativeOrder,
	hasChildren,
	isLeaf,
	hasMetadata,

	// Specific predicates
	isFraction,
	isImplicitMultiplication,
	isComparison,
	isEquality,
	isInequality,

	// Relation chain predicates
	isRelationChain,
	isComparisonChain,
	isEqualityChain,
	isImplicationChain,
	isEquivalenceChain,
	getRelationChainLength,

	// Unit predicates
	hasUnitDescendant,
	isDimensionlessUnit,

	// Extended metadata predicates
	hasOperatorMetadata,
	hasDelimiterMetadata,
	hasNameMetadata,
	hasRelationMetadata,
	hasUnitMetadata,
	hasAnyMetadata
} from './guards';

// =============================================================================
// Flatten Helpers
// =============================================================================

export type {
	Sign,
	SignedTerm,
	FlatSum,
	FlatProduct,
	DeepFlatSumResult,
	DeepFlatProductResult,
	FlatRelationChain
} from './flatten';

export {
	// Utilities
	flipSign,

	// Shallow flattening
	flattenSumShallow,
	flattenProductShallow,

	// Deep flattening
	flattenSumDeep,
	flattenProductDeep,

	// Unflattening (reconstruction)
	unflattenSum,
	unflattenProduct,

	// Relation chain helpers
	flattenRelationChain,
	unflattenRelationChain
} from './flatten';

// =============================================================================
// LaTeX Generator
// =============================================================================

export type { LatexGeneratorOptions } from './latex-generator';

export { LatexGenerator, toLatex } from './latex-generator';

// =============================================================================
// LaTeX Parser
// =============================================================================

export type { LatexParserOptions, GenericFunctionConfig } from './parser';

export {
	// Default generic functions configuration
	DEFAULT_GENERIC_FUNCTIONS,
	DEFAULT_GENERIC_FUNCTION_NAMES,
	// Unified API (recommended)
	parseLatex,
	parseLatexSafe,
	validateLatex,
	// Direct parser access (for advanced use)
	parsePratt,
	parsePrattSafe,
	parseRD,
	parseRDSafe,
	// Parser exceptions
	PrattParseException,
	RDParseException
} from './parser';

// =============================================================================
// Custom Syntax Parser
// =============================================================================

export type { CustomParserOptions } from './parser/custom';

export {
	// Unified API (recommended) - includes default generic functions
	parseCustom,
	parseCustomSafe,
	// Pratt parser with default generic functions
	parseCustomPratt,
	parseCustomPrattSafe,
	// RD parser with default generic functions
	parseCustomRD,
	parseCustomRDSafe,
	// Parser exceptions
	PrattParseException as CustomPrattParseException,
	RDParseException as CustomRDParseException
} from './parser/custom';

// =============================================================================
// Custom Syntax Generator
// =============================================================================

export type { CustomGeneratorOptions } from './custom-generator';

export { CustomGenerator, toCustom, SUPPORTED_GREEK, SUPPORTED_SYMBOLS } from './custom-generator';

// =============================================================================
// Pretty Printer
// =============================================================================

export type { PrettyPrintOptions } from './pretty-print';

export { prettyPrint } from './pretty-print';

// =============================================================================
// Exp Fluent Wrapper
// =============================================================================

export { Exp } from './exp';

// =============================================================================
// Normal Form (Canonical Representation)
// =============================================================================

export * from './normal/index.js';

// =============================================================================
// Evaluation and Substitution
// =============================================================================

export { substitute, evaluate } from './eval';
export type { EvalBindings, EvalOptions, EvalResult } from './eval';

// Helper utilities for variable analysis
export { getVariables, hasVariable, hasAllBindings, getMissingBindings } from './eval';

// Function bindings for generic functions (f, g, h)
export type { FunctionDefinition, FunctionBindings } from './eval';
export {
	applyFunction,
	substituteFunction,
	applyComposition,
	getUndefinedFunctions,
	FunctionBindingError
} from './eval';

// =============================================================================
// Pattern Matching
// =============================================================================

// Export pattern matching (excluding nodesEqual - already exported from normal,
// and renaming conflicting exports)
export {
	// Core matching
	match,
	tryMatch,
	matches,
	// Builder
	P,
	wildcard,
	num as patternNum,
	varPat,
	lit,
	add as patternAdd,
	sub as patternSub,
	mul as patternMul,
	div as patternDiv,
	pow as patternPow,
	func as patternFunc,
	neg as patternNeg,
	pos as patternPos,
	paren,
	subscript as patternSubscript,
	rel,
	// Constraint builders (renamed to avoid conflicts with guards)
	isType,
	isNumber as patternIsNumber,
	isVariable as patternIsVariable,
	isPositive as patternIsPositive,
	isNegative as patternIsNegative,
	isNonzero,
	isInteger as patternIsInteger,
	isFreeOf,
	custom,
	and as patternAnd,
	or as patternOr,
	not as patternNot,
	rule,
	// Constraint functions
	checkConstraint,
	containsVariable as patternContainsVariable,
	isFreeOfVariables,
	// Rules
	createRule,
	instantiate,
	applyRule,
	applyRuleDeep,
	applyRules,
	arithmeticRules,
	powerRules,
	allRules,
	// Type guards
	isWildcardPattern,
	isLiteralPattern,
	isPositiveConstraint,
	isNegativeConstraint,
	isNonzeroConstraint,
	isIntegerConstraint,
	isNumericTypeConstraint,
	// Numeric type constraint builders
	isIntegerType as patternIsIntegerType,
	isRationalType as patternIsRationalType,
	isAlgebraicType as patternIsAlgebraicType,
	isRealType as patternIsRealType,
	isTranscendentalType as patternIsTranscendentalType,
	isComplexType as patternIsComplexType,
	isNumType,
	// Types
	type Pattern,
	type MatchResult,
	type PatternConstraint,
	type MatchBindings,
	type Rule,
	type RuleOptions,
	type NumericTypeConstraint
} from './pattern';

// =============================================================================
// Numeric Type System
// =============================================================================

export type { NumericType, SignInfo, MathType, TypeContext, TypeDescription } from './numtype';

export {
	// Constants
	EMPTY_CONTEXT,
	UNKNOWN_TYPE,
	INTEGER_TYPE,
	RATIONAL_TYPE,
	REAL_TYPE,
	COMPLEX_TYPE,
	TRANSCENDENTAL_TYPE,
	IRRATIONAL_ALGEBRAIC_TYPE,
	ALGEBRAIC_TYPE,
	// Type algebra
	isSubtype as numTypeIsSubtype,
	areCompatible,
	join as numTypeJoin,
	joinAll,
	meet as numTypeMeet,
	meetAll,
	getParents,
	getAncestors,
	getLevel,
	isLeafType,
	isAlgebraicBranch,
	isTranscendentalBranch,
	// Type inference
	inferType,
	clearTypeCache,
	clearAllTypeCache,
	// Type predicates
	isIntegerType,
	isRationalType,
	isAlgebraicType,
	isTranscendentalType,
	isRealType,
	isComplexType,
	isIrrationalAlgebraicType,
	hasType,
	isSubtypeOf,
	isPositiveType,
	isNegativeType,
	isZeroType,
	isNonzeroType,
	isNonNegativeType,
	isNonPositiveType,
	isFiniteType,
	isInfiniteType,
	getType,
	getBaseType,
	// French descriptions (feedback)
	describeType,
	describeTypeDetailed,
	getTypeName,
	getTypeNameWithArticle,
	describeTypeRelation,
	getTypeMismatchMessage,
	getTypeHint,
	getTypeExamples,
	formatTypeExamples
} from './numtype';

// =============================================================================
// Symbolic Differentiation
// =============================================================================

export { differentiate, differentiateN, DifferentiationError } from './differentiation';
export type { DifferentiationOptions } from './differentiation';

// =============================================================================
// Equation Solving
// =============================================================================

export { solve, solveEquation, SolveError } from './solve';
export {
	// Classification
	classifyEquation,
	toStandardForm,
	detectVariable,
	getPolynomialDegree,
	isPolynomialIn,
	containsTranscendental,
	getTranscendentalType,
	// Step recording
	createStepRecorder,
	// Descriptions (French)
	getRuleDescription,
	describeDiscriminant,
	describeSolution,
	// Solvers
	linearSolver,
	quadraticSolver,
	transcendentalSolver,
	ALL_SOLVERS,
	getSolverByName
} from './solve';

export type {
	EquationType,
	SolvingStrategy,
	SolutionStatus,
	SolvingVerbosity,
	Solution,
	SolveStep,
	SolveResult,
	SolveOptions,
	ClassificationResult,
	EquationSolver,
	SolveStepRecorder
} from './solve';

export { DEFAULT_SOLVE_OPTIONS } from './solve';

// =============================================================================
// Symbolic Integration
// =============================================================================

export { integrate, integrateDefinite, IntegrationError } from './integration';
export { simpson, adaptiveSimpson, numericIntegrate } from './integration';
export {
	basicIntegrator,
	uSubstitutionIntegrator,
	ALL_INTEGRATORS,
	selectIntegrator
} from './integration';

export type {
	IntegrandType,
	IntegrationTechnique,
	IntegrationStatus,
	IntegrationVerbosity,
	IntegrateStep,
	IntegrateResult,
	DefiniteIntegrateResult,
	IntegrateOptions,
	Integrator,
	NumericResult,
	NumericIntegrateOptions
} from './integration';

export { DEFAULT_INTEGRATE_OPTIONS } from './integration';

// =============================================================================
// Domain of Definition
// =============================================================================

export {
	// Value constructors
	fromNumber as domainFromNumber,
	// Factory functions
	emptyDomain,
	universalDomain,
	intervalDomain,
	conditionDomain,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	// Algebra (renamed to avoid conflicts with factory exports)
	isEmpty as domainIsEmpty,
	isUniversal as domainIsUniversal,
	containsValue,
	intersect as domainIntersect,
	union as domainUnion,
	complement as domainComplement,
	difference as domainDifference,
	excludePoints as domainExcludePoints,
	// Computation
	computeDomain,
	// Validation
	isInDomain,
	getDomainViolations,
	// Formatting
	formatDomainInterval,
	formatDomainCondition,
	formatDomainFull,
	formatEndpointValue as domainFormatEndpointValue,
	// Builtins
	getBuiltinDomain,
	hasRestrictedDomain,
	getBuiltinConstraintDescription,
	// Errors
	DomainError
} from './domain';

export type {
	Domain,
	// New types (intervals module)
	EmptySet,
	UniversalSet,
	IntervalSet,
	// Backward compatibility aliases
	EmptyDomain,
	UniversalDomain,
	IntervalDomain,
	// Domain-specific types
	ConditionDomain,
	Interval,
	Endpoint,
	EndpointValue,
	ExcludedPoint,
	Condition as DomainCondition,
	ComparisonCondition,
	DomainViolation,
	DomainResult,
	DomainStep,
	ComputeDomainOptions,
	Bindings as DomainBindings
} from './domain';

// =============================================================================
// Parse Cache
// =============================================================================

export { ParseCache } from './cache';
export type { CacheStats } from './cache';

// =============================================================================
// Security
// =============================================================================

export { SecurityError, DEFAULT_SECURITY_OPTIONS } from './parser';
export type { ParserSecurityOptions, SecurityErrorCode } from './parser';

// =============================================================================
// Rich Error Context
// =============================================================================

export {
	createErrorContext,
	computeLineAndColumn,
	getSuggestions,
	createEnhancedErrorFields
} from './parser';
export type { ErrorContext, LineColumn, EnhancedErrorFields } from './parser';

// =============================================================================
// Zod Validation Schemas
// =============================================================================

export {
	VariableNameSchema,
	NumericValueSchema,
	BindingValueSchema,
	EvalBindingsSchema,
	ParserSecurityOptionsSchema,
	createBoundedNumericSchema,
	validateVariableName,
	validateEvalBindings,
	validateSecurityOptions
} from './eval';
export type { ValidatedEvalBindings, ValidatedSecurityOptions } from './eval';

// =============================================================================
// Auto-Completion API
// =============================================================================

export { CompletionProvider } from './cli/completion';
export type {
	Completion,
	CompletionKind,
	CompletionContext,
	CompletionOptions
} from './cli/completion';

// =============================================================================
// Visitor Pattern
// =============================================================================

export { visitAST, transformAST } from './visitor';
export type {
	VisitorContext,
	EnterResult,
	TransformEnterResult,
	TransformLeaveResult,
	ASTVisitor,
	TransformVisitor
} from './visitor';

// =============================================================================
// Matrix Operations
// =============================================================================

export type {
	MatrixType,
	MatrixOptions,
	MatrixDimensions,
	MatrixVerbosity,
	MatrixStep,
	MatrixOperationOptions
} from './matrix';

export { MatrixDimensionError, MatrixOperationError } from './matrix';

export {
	getDimensions,
	matrixAdd,
	matrixSubtract,
	scalarMultiply,
	matrixMultiply,
	transpose,
	trace,
	determinant,
	inverse
} from './matrix';

// =============================================================================
// Sign Analysis
// =============================================================================

export { analyzeSign, SignAnalysisError, DEFAULT_SIGN_OPTIONS } from './sign';
export {
	// Rules
	signOfProduct,
	signOfProductMultiple,
	signOfQuotient,
	signOfSum,
	allSameSign,
	signOfDifference,
	negateSign,
	signOfPower,
	signOfIntegerPower,
	extractRationalExponent,
	signOfFunction,
	signOfMultiArgFunction,
	getBuiltinSignInfo,
	// Helpers
	findZeros,
	sortZerosByValue,
	getUniqueZeros,
	determineSignOnInterval,
	analyzeExpressionStructure,
	sampleSignOnInterval,
	getSamplePoints,
	getSamplePoint,
	signFromNumber,
	// Formatting
	formatSignAnalysis,
	formatSignTable,
	formatSignedIntervalsAsConditions,
	formatZeros,
	getSignSymbol,
	getSignDescription,
	signToCondition,
	formatSignSummary
} from './sign';

export type {
	Sign as SignAnalysisSign,
	SignedInterval,
	ZeroInfo,
	SignAnalysisResult,
	SignAnalysisStep,
	SignAnalysisOptions
} from './sign';

// =============================================================================
// Variation Study (Monotonicity)
// =============================================================================

export {
	computeVariations,
	getVariationSummary,
	VariationError,
	DEFAULT_VARIATION_OPTIONS
} from './variations';
export {
	// Critical points
	findCriticalPoints,
	classifyCriticalPoint,
	evaluateAtCriticalPoint,
	sortCriticalPoints,
	// Monotonicity
	signToMonotonicity,
	monotonicityToSign,
	buildMonotonicIntervals,
	mergeMonotonicIntervals,
	getMonotonicityDescription,
	getDerivativeSignDescription,
	getMonotonicitySymbol,
	// Extrema
	findExtrema,
	classifyExtremum,
	findAdjacentIntervals,
	classifyGlobalExtrema,
	isGlobalExtremum,
	getExtremumDescription,
	getExtremumLabel,
	// Boundary limits
	computeBoundaryLimits,
	getDomainBoundaries,
	convertLimitResult,
	getLimitDescription,
	getCompactLimitDescription,
	isFiniteLimit,
	isVerticalAsymptote,
	isHorizontalAsymptote,
	// Formatting
	formatVariationTable,
	formatMonotonicIntervals,
	formatExtrema,
	formatCriticalPoints
} from './variations';

export type {
	Monotonicity,
	MonotonicInterval,
	ExtremumType,
	ExtremumInfo,
	CriticalPointNature,
	CriticalPointInfo,
	LimitValue,
	BoundaryLimit,
	VariationPhase,
	VariationStep,
	VariationResult,
	VariationOptions
} from './variations';

// =============================================================================
// Analysis Module (Expression Classification, Continuity, etc.)
// =============================================================================

export {
	// Linear combination analysis
	extractLinearCombination,
	isLinearCombination,
	getCoefficient,
	equalLinearCombinations,
	// Expression classification
	classifyExpression,
	getPolynomialDegree as classifyPolynomialDegree,
	isPolynomialIn as classifyIsPolynomial,
	containsTranscendental as classifyContainsTranscendental,
	getTranscendentalType as classifyTranscendentalType,
	containsRadical,
	isRationalIn,
	calculateComplexity,
	// Polynomial analysis
	analyzePolynomial,
	getPolynomialCoefficients,
	isMonomial,
	isBinomial,
	isTrinomial,
	getTermCount,
	// Algebraic structure detection
	detectStructure,
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes,
	isQuadraticForm,
	isFactoredForm,
	hasCommonFactor,
	// Symmetry detection
	detectSymmetry,
	isEven,
	isOdd,
	hasNoSymmetry,
	// Periodicity detection
	detectPeriodicity,
	isPeriodic,
	getPeriod,
	getPeriodNumeric,
	registerPeriodicFunction,
	unregisterPeriodicFunction,
	clearPeriodicFunctionRegistry,
	getRegisteredPeriodicFunctions,
	isRegisteredPeriodicFunction,
	// Coefficient extraction utilities
	isTargetVariable,
	isTargetVariableIn,
	containsVariable as analysisContainsVariable,
	containsAnyVariable,
	applySign,
	addCoefficients,
	buildProduct,
	extractCoefficientAndVariable,
	extractLinearForm,
	// Continuity analysis
	analyzeContinuity,
	findDiscontinuityCandidates,
	checkContinuityAtPoint,
	// Continuity descriptions
	DISCONTINUITY_TYPE_DESCRIPTIONS,
	getDiscontinuityTypeDescription,
	DISCONTINUITY_SOURCE_DESCRIPTIONS,
	getDiscontinuitySourceDescription,
	CONTINUITY_RULE_DESCRIPTIONS,
	getContinuityRuleDescription,
	describeDiscontinuity as describeContinuityDiscontinuity,
	describeDiscontinuityShort,
	describePeriodicPattern,
	summarizeContinuityResult
} from './analysis';

export type {
	// Linear combination
	LinearCombinationResult,
	// Expression classification
	ExpressionCategory,
	ExpressionClassification,
	// Polynomial analysis
	MonomialInfo,
	PolynomialAnalysis,
	// Algebraic structures
	StructureType,
	DetectedStructure,
	DifferenceOfSquaresInfo,
	PerfectSquareTrinomialInfo,
	SumOfCubesInfo,
	DifferenceOfCubesInfo,
	QuadraticFormInfo,
	FactoredFormInfo,
	CommonFactorInfo,
	// Symmetry
	SymmetryType,
	SymmetryResult,
	// Periodicity
	PeriodicityResult,
	PeriodicityStep,
	PeriodicityRule,
	PeriodicityOptions,
	UserPeriodicFunction,
	RegisterFunctionOptions,
	// Coefficient extraction
	ExtractedTerm,
	LinearForm,
	// Continuity
	DiscontinuityType,
	DiscontinuitySource,
	PeriodicDiscontinuityInfo,
	Discontinuity,
	ContinuityRule,
	ContinuityStep,
	ContinuityResult,
	ContinuityOptions,
	DiscontinuityCandidate
} from './analysis';
