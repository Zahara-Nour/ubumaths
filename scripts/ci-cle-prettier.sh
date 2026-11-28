#!/bin/bash
# Clé du cache Prettier en CI (quality.yml job `Lint`, lint-nocturne.yml) : les versions
# installées de ce qui décide du formatage, et rien d'autre.
#
# La clé portait l'empreinte de tout `pnpm-lock.yaml` : la moindre mise à jour de
# dépendance la changeait, et jusqu'à la mise en prod suivante (seul moment où main
# refaisait ce cache) la première CI de chaque PR revérifiait tout l'arbre, ~270 s au
# lieu de ~30 s (mesuré le 2026-11-23, après le changement de lockfile de #3013).
#
# Pourquoi ces quatre paquets : le cache de Prettier ne s'invalide de lui-même que
# sur SA version, celle de Node et ses options ; la version d'un plugin n'y est pas.
# Tailwind y est parce que prettier-plugin-tailwindcss trie les classes selon lui.
# `.prettierrc` et `.prettierignore` restent dans la clé côté workflow (hashFiles).
#
# Lit node_modules (après `pnpm install`) : les versions réellement installées, pas
# les plages de package.json. Sortie : `prettier@3.9.10_prettier-plugin-svelte@…`.
# Tests : scripts/__tests__/ci-cle-prettier.test.ts.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
node -e '
const paquets = ["prettier", "prettier-plugin-svelte", "prettier-plugin-tailwindcss", "tailwindcss"];
const { readFileSync } = require("node:fs");
console.log(
	paquets
		.map((p) => `${p}@${JSON.parse(readFileSync(`node_modules/${p}/package.json`, "utf8")).version}`)
		.join("_")
);
'
