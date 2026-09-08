/**
 * Resource addressing — public entry point.
 *
 * @module resources
 */

export { RESOURCE_KINDS, RESOURCE_REGISTRY, isResourceKind, resolveResource } from './registry';

export type {
	ResolveResourceOptions,
	ResolvedResource,
	ResourceKind,
	ResourceRouteContext,
	ViewerRole
} from './registry';
