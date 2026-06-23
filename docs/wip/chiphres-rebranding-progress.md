# Rebranding Ubumaths → Chiphre — Progression

> Source de vérité narrative : `docs/Chiphres/lore-pataphysique.md` (Compendium) + `lexique-pataphysique.md` (Lexique).
> Ce doc-ci = suivi d'implémentation (crash-recovery) + mapping de la roadmap sur le code RÉEL.
> Démarré le 2026-06-23.

## Décisions canoniques (validées par David)

- **La plateforme = `Chiphre`** (singulier, dérivé du domaine **chiph.re**). C'est la marque dans tous les titres, header, footer, `package.json`.
- **`chiphres` (pluriel) = `chiffres`** écrits à l'ubuesque (le _ph_). Forme **collective / jeu de mots** légitime (sous-titre « les Chiphres de la Chandelle Verte »). Ce n'est **pas** la marque. → relève du **lexique (Sprint 1)**, pas du renommage de marque.
- **Domaine canonique : `chiph.re`** (le Compendium disait `chiphr.es` → corrigé dans les 2 docs ; le pluriel « Chiphres » du doc est **conservé** tel quel, c'est voulu).
- **Pages légales + RGPD/consent traitées séparément** (PR2), relecture dédiée.

> ⚠️ Le Compendium (rédigé via claude.ai) écrit « Chiphres » (pluriel) partout, y compris pour la marque. C'est une dérive : la marque est **Chiphre** singulier. Ne pas re-propager « Chiphres » comme nom de plateforme.

## Gaps doc ↔ code (vérifiés)

- Le doc liste des remplacements `Salopin → Galopin` et `Czar Mathématique → Czar Alexis`, mais **`salopin` / `czar` n'existent nulle part dans le repo**. Ce ne sont **pas** des renommages : c'est du lore **net-neuf** à introduire (Sprint 3).
- Lore **déjà présent** dans le code : `gidouille` (monnaie virtuelle), `palotin` (système buddy/amis), cartes VIP, marketplace. Base gamifiée existante.
- Pas de config de marque centrale (`SITE_NAME`, `og:site_name`) ni de manifest PWA (juste `static/favicon.png`). `src/lib/config/lore.ts` reste à créer (Sprint 1).

## PR1 — Renommage marque (app non-légal) — branche `chore/rebrand-chiphres-app`

**Fait** (working tree, **non committé**) :

- Sweep `UbuMaths` / `Ubumaths` → `Chiphre` sur **203 fichiers** `src/**/*.{ts,svelte}` (titres de pages, header, footer, labels, commentaires, `\author{}` LaTeX, api-docs…).
- `package.json` : `name` → `chiphre`.
- `svelte.config.js` : commentaire domaine → `chiph.re`.
- Filenames de download (admin backup, export profil) → `chiphre-*`.
- Sample du debug rich-text → `[Chiphre](https://chiph.re)`.
- Docs : `chiphr.es → chiph.re` (lore + lexique).
- `check:incremental` = 0 erreur.

## Renommage des identifiants internes (catégorie A) — FAIT cette session

David : fenêtre de maintenance + vacances → on assainit, on accepte de casser l'état transitoire. `ubumaths` → `chiphre` sur **les identifiants**, tests mis à jour en lockstep :

- **Clés localStorage/session** : auth (`+layout.ts`), spreadsheet, grapheur, calculator, repl, blocklyPlayground, pythonPlayground (+splitter, +migration-dismissed), code Python par exercice, panier de questions, freezeData, **whiteboard** (autosave/index/legacy/sync-state).
- **Pomodoro** : BroadcastChannel + clé + tag (`chiphre:pomodoro:v1`, `chiphre-pomodoro`).
- **Thème Blockly** : `UBUMATHS_THEME` → `CHIPHRE_THEME`, `defineTheme('chiphre')`, `name:'chiphre'`.
- **Boundary multipart Drive** + **métadonnée générateur Typst**.
- **Filenames de download serveur** : `chiphre-exercises-backup-*`, `chiphre-export-*`.
- **Sandbox Python** : `_ubumaths_*` → `_chiphre_*`, `_UBUMATHS_*` → `_CHIPHRE_*` (~200 occ. dans `pyodide.worker.ts` + test debug).

**4 décisions sur les items à conséquence durable :**

| Item                                           | Décision                                     | Conséquence                                                                         |
| ---------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| MIME whiteboard `vnd.ubumaths.whiteboard+json` | **Renommé franchement** → `vnd.chiphre…`     | anciens `.ubw` sur Google Drive **non reconnus**                                    |
| Tag `BACKUP_FORMAT = 'ubumaths-backup'`        | **Renommé franchement** → `'chiphre-backup'` | anciens backups d'exos **non ré-importables**                                       |
| postMessage `type:'ubumaths-theme'` (Upsilon)  | **Gardé**                                    | protocole inter-dépôts ; à renommer **avec le rebuild du submodule Upsilon** (TODO) |
| Préfixe sandbox `_ubumaths_`                   | **Renommé** → `_chiphre_`                    | interne worker, invisible                                                           |

**Gardé volontairement (le reste) :**

- `type:'ubumaths-theme'` (`upsilon/+page.svelte`) → cf. décision ci-dessus.
- `'ubumaths'` dans `passwordPolicy.ts` → **conservé** (toujours interdit) + `'chiphre'` **ajouté**.

**Vérif** : `check:incremental` = 0 erreur ; **7 fichiers de tests serveur impactés = 236 tests verts**. Tests **client** (calculator, pythonPlayground, exercise-validation-real) **non exécutés en local** (Playwright/Chromium absent) → **CI** ; littéraux renommés source+test en lockstep donc cohérents.

## À FAIRE — lots restants du renommage (avant Sprint 1)

- **PR2 — Légal + RGPD/consent** (relecture dédiée, texte légal inchangé, seul le nom bouge) :
  - `routes/(public)/legal/{cgu,confidentialite,mentions-legales}/+page.svelte`
  - `routes/(public)/consent/{[token],success}/+page.svelte`, `dashboard/teacher/consent/+page.svelte`
  - `components/ConsentBanner.svelte`, `lib/email-templates/parental-consent.ts`
- **Lot B — domaine / sécurité (à coordonner avec le passage en prod de chiph.re)** — `ubumaths.com`/`.fr` → `chiph.re` :
  - `lib/server/csrfProtection.ts` : allow-list + **heuristique `origin.includes('ubumaths') && .vercel.app`** (sinon les preview deploys `chiphre-*.vercel.app` seront **bloqués**). + `csrfProtection.test.ts`.
  - `lib/server/email/brevo.ts` (sender `noreply@ubumaths.fr`), `lib/server/openapi/generator.ts`, `lib/typst/templates/default-templates.ts` (footer PDF), `lib/templates/templateVariables.ts` (URLs d'exemple), tests associés.
- **Hors app (follow-ups)** : `static/openapi.json`, `scripts/*`, `docs/**` (hors Compendium), `CHANGELOG.md`.
- **À toi (infra, hors code)** : DNS, redirection 301 ubumaths.\* → chiph.re, renommage comptes Stripe / Supabase / Vercel / sociaux, favicon/logo définitifs. ⚠️ Le renommage du projet Vercel changera l'URL des preview deploys → synchroniser avec la garde CSRF ci-dessus.

## Roadmap (Compendium §XIV) — mapping

- **Sprint 0 — Renommage marque** : 🟡 en cours (PR1 prête, PR2 légal/RGPD à suivre).
- **Sprint 1 — Lexique partout** : créer `src/lib/config/lore.ts` (source unique), swap wording (Empocher, Cabinet des Phynances, Cornegidouille…), `chiffres → chiphres`, `maths → Mathres`, sous-titre officiel « les Chiphres de la Chandelle Verte », pages 404/500 ubuesques.
- **Sprint 2** — voix tutorales (Père Ubu / Mère Ubu / Prudhomme / Tristan Bernard / Czar Alexis) + prompts LLM.
- **Sprint 3** — grades OGP + 7 niveaux scolaires (Syz'esme→Phinalle) + Galopin + Czar Alexis (lore net-neuf).
- **Sprints 4-9** — personnages secondaires, easter eggs, calendrier/événements, identité visuelle, sound design, phynances réelles.
