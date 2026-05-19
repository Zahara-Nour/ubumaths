/**
 * Decorator resolution for construction choreographies.
 *
 * Takes a list of decorator names (captured by the DSL parser as
 * `DslAssignment.decorators`) and a builtin name, and returns a validated
 * `DecoratorTriple` (contrainte, methode, visibilite).
 *
 * Validation is strict : unknown decorators, conflicting categories, and
 * methods not declared for the (builtin, contrainte) pair all raise
 * `DecoratorResolveError` with explicit hints.
 *
 * See `docs/wip/v1-choreographies-phase0-tdd.md` section P0.3 for the spec.
 */

import {
	CONTRAINTES,
	VISIBILITES,
	type Contrainte,
	type DecoratorTriple,
	type Visibilite
} from './types';
import { REGISTRY, CHOREOGRAPHED_BUILTINS } from './registry';

/** Default visibility when none is explicitly specified. */
export const DEFAULT_VISIBILITE: Visibilite = 'squelette';

/** Default constraint when none is explicitly specified. */
export const DEFAULT_CONTRAINTE: Contrainte = 'direct';

export class DecoratorResolveError extends Error {
	constructor(
		message: string,
		readonly hint?: string
	) {
		super(message);
		this.name = 'DecoratorResolveError';
	}
}

/**
 * Resolve a list of decorator names into a validated triple.
 *
 * @param decorators List of decorator names (no `@` prefix) in source order.
 * @param builtinName Builtin under which the decorators were attached (e.g. 'mediatrice').
 * @returns The resolved triple {contrainte, methode, visibilite}.
 * @throws DecoratorResolveError on any inconsistency.
 */
export function resolveDecorators(
	decorators: readonly string[],
	builtinName: string
): DecoratorTriple {
	let contrainte: Contrainte | null = null;
	let visibilite: Visibilite | null = null;
	let methode: string | null = null;

	const knownMethodsForBuiltinAndContrainte = (c: Contrainte): string[] => {
		const builtinEntry = REGISTRY[builtinName];
		if (!builtinEntry) return [];
		const voies = builtinEntry[c];
		return voies ? voies.map((v) => v.id) : [];
	};

	for (const dec of decorators) {
		// Constraint ?
		if ((CONTRAINTES as ReadonlySet<string>).has(dec)) {
			if (contrainte !== null && contrainte !== dec) {
				throw new DecoratorResolveError(
					`Contraintes mutuellement exclusives : \`@${contrainte}\` et \`@${dec}\`. Choisissez une seule contrainte par construction.`,
					'Les contraintes disponibles sont : `@direct`, `@euclide`, `@equerre`, `@mesure`.'
				);
			}
			contrainte = dec as Contrainte;
			continue;
		}

		// Visibility ?
		if ((VISIBILITES as ReadonlySet<string>).has(dec)) {
			if (visibilite !== null && visibilite !== dec) {
				throw new DecoratorResolveError(
					`Visibilités mutuellement exclusives : \`@${visibilite}\` et \`@${dec}\`. Choisissez une seule visibilité.`,
					'Les visibilités disponibles sont : `@epure`, `@squelette` (défaut), `@complet`.'
				);
			}
			visibilite = dec as Visibilite;
			continue;
		}

		// Method ?
		// We don't know yet which contrainte applies (could come later in the
		// list). Defer validation : capture the candidate, validate after the loop.
		if (methode !== null && methode !== dec) {
			throw new DecoratorResolveError(
				`Deux méthodes simultanées : \`@${methode}\` et \`@${dec}\`. Choisissez une seule méthode par construction.`
			);
		}
		methode = dec;
	}

	// Defaults.
	const finalContrainte: Contrainte = contrainte ?? DEFAULT_CONTRAINTE;
	const finalVisibilite: Visibilite = visibilite ?? DEFAULT_VISIBILITE;

	// Validate the candidate method against the (builtin, contrainte) pair.
	if (methode !== null) {
		if (!CHOREOGRAPHED_BUILTINS.has(builtinName)) {
			throw new DecoratorResolveError(
				`Le builtin \`${builtinName}\` n’a pas de chorégraphie déclarée ; \`@${methode}\` n’est donc pas applicable.`,
				`Builtins avec chorégraphies V1 : ${[...CHOREOGRAPHED_BUILTINS].join(', ')}.`
			);
		}
		const availableMethods = knownMethodsForBuiltinAndContrainte(finalContrainte);
		if (availableMethods.length === 0) {
			throw new DecoratorResolveError(
				`Contrainte \`@${finalContrainte}\` non disponible pour \`${builtinName}\`. La méthode \`@${methode}\` est donc inapplicable.`,
				`Contraintes disponibles pour \`${builtinName}\` : ${availableContrainteList(builtinName)}.`
			);
		}
		if (!availableMethods.includes(methode)) {
			throw new DecoratorResolveError(
				`\`@${methode}\` n’est pas une méthode disponible pour \`${builtinName}\` en mode \`@${finalContrainte}\`.`,
				`Méthodes disponibles : ${availableMethods.map((m) => `\`@${m}\``).join(', ')}.`
			);
		}
	}

	// If contrainte is explicit and non-`direct` but no voies declared for it,
	// fail explicitly.
	if (contrainte !== null && contrainte !== 'direct') {
		const availableMethods = knownMethodsForBuiltinAndContrainte(contrainte);
		if (availableMethods.length === 0) {
			throw new DecoratorResolveError(
				`Contrainte \`@${contrainte}\` non disponible pour \`${builtinName}\`.`,
				`Contraintes disponibles pour \`${builtinName}\` : ${availableContrainteList(builtinName)}.`
			);
		}
	}

	// Reject anything that wasn't recognized as constraint / visibility /
	// method-for-known-builtin. We need to do this for "unknown decorators"
	// where the builtin has no choreography at all.
	if (methode !== null && !CHOREOGRAPHED_BUILTINS.has(builtinName)) {
		// Already handled above ; just for clarity.
	}

	return { contrainte: finalContrainte, methode, visibilite: finalVisibilite };
}

function availableContrainteList(builtinName: string): string {
	const entry = REGISTRY[builtinName];
	if (!entry) return '`@direct` (par défaut)';
	const declared: string[] = ['`@direct`'];
	for (const c of CONTRAINTES) {
		if (c !== 'direct' && entry[c] !== undefined) {
			declared.push(`\`@${c}\``);
		}
	}
	return declared.join(', ');
}

/**
 * Look up the actual Voie chosen by a triple. Returns null if `contrainte`
 * is `direct` (no choreography, executor runs default animation) or if no
 * Voie matches.
 */
export function lookupVoie(triple: DecoratorTriple, builtinName: string) {
	if (triple.contrainte === 'direct') return null;
	const entry = REGISTRY[builtinName];
	if (!entry) return null;
	const voies = entry[triple.contrainte];
	if (!voies || voies.length === 0) return null;
	if (triple.methode === null) {
		return voies.find((v) => v.defaut) ?? voies[0];
	}
	return voies.find((v) => v.id === triple.methode) ?? null;
}
