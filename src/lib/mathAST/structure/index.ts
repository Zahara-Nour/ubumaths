/**
 * Structure d'une expression : l'arbre des sous-expressions vu par l'élève et
 * le LaTeX marqué qui permet d'en encadrer une au survol.
 * Spécification : `docs/wip/structure-expression-progress.md`.
 */
export { buildStructure, structureFromLatex } from './build-structure';
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
	needsParenthesesAdvice,
	parenthesesAdvice,
	type AdviceSegment,
	type ParenthesesAdvice
} from './parentheses-advice';
