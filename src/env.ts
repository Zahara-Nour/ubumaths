import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Variables d'environnement lues par `$env/*` (SvelteKit 3).
 *
 * Depuis SvelteKit 3, `$env/static/*` et `$env/dynamic/*` n'exposent plus que les
 * variables déclarées ici : une variable absente de cette liste vaut `undefined`
 * à l'import (statique : erreur de build). `process.env` n'est pas concerné.
 *
 * - `static: true` : valeur inlinée au build, obligatoire (comme `$env/static/*` en kit 2).
 * - sans `static` : lue au démarrage ; `optionnelle` garde le comportement de kit 2
 *   (`undefined` si la variable n'est pas posée).
 */

// Variable facultative : rendue telle quelle, `undefined` si absente.
const optionnelle = (value: string | undefined) => value;

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true, static: true },
	PUBLIC_SUPABASE_ANON_KEY: { public: true, static: true },
	SUPABASE_SERVICE_ROLE_KEY: { static: true },
	MAINTENANCE_MODE: { schema: optionnelle },
	MAINTENANCE_BYPASS_SECRET: { schema: optionnelle },
	MAINTENANCE_UNTIL: { schema: optionnelle },
	BREVO_API_KEY: { schema: optionnelle },
	BREVO_SENDER_EMAIL: { schema: optionnelle },
	BREVO_SENDER_NAME: { schema: optionnelle },
	VERCEL: { schema: optionnelle },
	EMAIL_ENVOI_REEL: { schema: optionnelle },
	EMAIL_CAPTURE_DIR: { schema: optionnelle }
});
