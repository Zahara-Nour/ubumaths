# Migration `lucide-svelte` → `@lucide/svelte` — progress

> Chantier issu de l'analyse de bundle (visualizer, PR #21). Crash-recovery doc.

## Objectif

Migrer les imports d'icônes du paquet **déprécié** `lucide-svelte@0.545.0` (528 kB gz, **1ʳᵉ dépendance par le poids**, 482 fichiers) vers **`@lucide/svelte@1.16.0`** (maintenu, Svelte 5 natif, déjà tiré transitivement par bits-ui/shadcn). But : **lib d'icônes unique + fin de la dépréciation**. (Ne réduit PAS les 528 kB — mêmes icônes ; gain = maintenance/dédoublonnage.)

## Périmètre mesuré

- **482 fichiers**, **190 icônes distinctes**, 3 styles d'import :
  1. Named : `import { X, Y } from 'lucide-svelte'` (majorité).
  2. Sous-chemin : `import Play from 'lucide-svelte/icons/play'` (PlayerControls + qq.).
  3. Type : `import type { Icon as LucideIcon } from 'lucide-svelte'` (ToolButton.svelte).

## Phase 0 — Spec & table de renommage — ✅ FAIT

**Découverte clé : la table de renommage est VIDE.** `@lucide/svelte` réexporte tous les anciens noms :

```js
// node_modules/@lucide/svelte/dist/lucide-svelte.js  (exports['.'])
export * from './icons/index.js'; // noms canoniques
export * from './aliases/index.js'; // aliases + prefixed + suffixed = TOUS les anciens noms
export { default as Icon } from './Icon.svelte';
```

- **190/190 icônes couvertes** sous l'ancien nom (188 directes/alias + `FileIcon`/`ImageIcon` via `suffixed.js`). 0 à mapper.
- Sous-chemins utilisés (`play`, `pause`, `rotate-ccw`, `skip-back`, `skip-forward`) : présents dans `@lucide/svelte/icons`.
- Type `Icon` : exporté → l'import type devrait passer ; **à confirmer en Phase 2** (sinon basculer sur `LucideIcon`, exporté aussi).
- ⚠️ On s'appuie sur les **alias dépréciés** (noms) : sort du _paquet_ déprécié, pas des _noms_. Nettoyage canonique = chantier séparé optionnel.

**Filet de sécurité** : imports nommés typés → tout export inexistant = erreur TS → `check:incremental`/CI rouge. Pas de casse silencieuse.

## Phase 1 — Codemod — ✅ FAIT (branche `chore/lucide-migration`)

- **482 fichiers** migrés `'lucide-svelte'` → `'@lucide/svelte'` (named + sous-chemins + type import) via codemod perl.
- `lucide-svelte` retiré de `package.json` (`pnpm remove`).
- **2 différences d'API surfacées par le filet TS** (= la valeur du `check:incremental`) :
  1. **Type icône** : `icon: ComponentType` (Svelte 4) incompatible avec `Component<LucideProps>` (Svelte 5) → corrigé en `icon: LucideIcon` (importé de `@lucide/svelte`, = `Component<LucideProps>`) dans `dashboard-nav.ts`, `Header.svelte`, `Sidebar.svelte`, `navigation/MobileNavDrawer.svelte`.
  2. **Icône de marque retirée** : `Youtube` n'existe plus dans Lucide (trademark) → remplacé par **`Video`** dans `materials/+page.svelte` (type `YOUTUBE_VIDEO`). ⚠️ choix visuel à confirmer (alternatives : `Film`, `MonitorPlay`).
- `pnpm check:incremental` = **0 erreur** (1697 fichiers, 46 warnings préexistants).
- NB `Chrome` (20 occurrences) = chaînes user-agent, **pas** des icônes lucide (confirmé).

### Détails initiaux du codemod (référence)

Script `tsx` déterministe sur `src/` :

- `from 'lucide-svelte'` → `from '@lucide/svelte'` (named).
- `from 'lucide-svelte/icons/<kebab>'` → `from '@lucide/svelte/icons/<kebab>'`.
- Type import : `'lucide-svelte'` → `'@lucide/svelte'` (garder `Icon as LucideIcon`, ajuster si Phase 2 le réclame).
- Retirer `lucide-svelte` de `package.json` (garder `@lucide/svelte`).

## Phase 2 — Vérif — ⏳

`pnpm check:incremental` = 0 erreur · CI verte (Type Check + Build) · smoke visuel (dashboard-nav, whiteboard toolbar, PlayerControls) · re-run `bundle-analyze` → `lucide-svelte` disparu.

## Phase 3 — `code-reviewer` + PR — ⏳

1 PR atomique. Pas de `security-auditor` (aucun auth/RLS/API).

## Definition of Done

check:incremental 0 erreur · CI verte · bundle sans `lucide-svelte` · icônes OK pages clés · dep retirée.

## Statut

- [x] Phase 0 (table vide, périmètre confirmé) — 2026-06-17
- [ ] Phase 1 codemod
- [ ] Phase 2 vérif
- [ ] Phase 3 review + PR
