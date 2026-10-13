/**
 * Structure d'une expression : l'arbre des sous-expressions vu par l'élève et
 * le LaTeX marqué qui permet d'en encadrer une au survol.
 * Spécification : `docs/systeme/mathast/structure-expression.md`.
 */
export { buildStructure, structureFromLatex, type StructureOptions } from './build-structure';
export { readingOf, readingPlainText, type Reading, type ReadingSegment } from './reading';
export { ancestors, MARKER_PREFIX, markerIdFromClasses, markLatex, stripMarkers } from './markers';
export type {
	ExpressionStructure,
	PlainStructureNode,
	RelationStructureNode,
	StructureKind,
	StructureNode,
	StructureResult,
	StructureRole,
	SumStructureNode
} from './types';
export {
	cardLatex,
	expressionLatex,
	findMarkerBlock,
	GAP_CLASS_PREFIX,
	groupLatex,
	movableGroupOf,
	movedLatex,
	reorder,
	withoutPart,
	type GroupLayout,
	type MarkerBlock,
	type MovableGroup,
	type MovablePart,
	type RearrangeOptions
} from './rearrange';
export {
	parenthesesAdvice,
	type AdviceSegment,
	type ParenthesesAdvice
} from './parentheses-advice';
