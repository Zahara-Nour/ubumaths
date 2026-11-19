/// <reference types="vitest/browser" />
// Styles de l'application (Tailwind + thème) : les composants testés ont le même rendu qu'en vrai
import './src/app.css';

// SvelteKit 3 : en dev, le module `$app/env/public` (et `$env/static/public`, qui le
// réexporte) lit `globalThis.__sveltekit_dev.env`, posé par la page HTML de SvelteKit.
// La page de test de vitest ne le pose pas : sans lui, l'import plante. Nos variables
// publiques sont toutes statiques (`src/env.ts`), inlinées : `env` peut rester vide.
const kitGlobal = globalThis as { __sveltekit_dev?: { env: Record<string, unknown> } };
kitGlobal.__sveltekit_dev ??= { env: {} };
