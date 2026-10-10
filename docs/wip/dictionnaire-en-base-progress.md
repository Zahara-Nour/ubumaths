# Dictionnaire en base — progression

ADR 0022 et spécification validées par David le 2026-10-10 ([spec](dictionnaire-en-base-spec.md)).
PR 1 : #1024 (fusionnée). PR 2 : worktree `../ubumaths-wt-dico-admin`, branche `feat/dictionnaire-admin`.

## PR 1 — tables, droits, reprise (FAITE, #1024)

- Migration `20261012153000_dictionnaire_en_base.sql`, générée depuis le fichier (671 entrées, ordre
  gardé dans `position`) : `dictionary_entries`, `dictionary_entry_versions`, trigger d'historique
  (droits de l'appelant), lecture publique des entrées non masquées, écriture admin (`is_admin()`),
  aucun DELETE accordé, historique lisible par l'admin seul.
- Tests `tests/integration/dictionnaire-en-base.test.ts` : 11 rouges sans la migration ; 16 verts avec, après la revue sécurité (lien « Voir aussi » et image en liste blanche, pas de fausse version, auteur et dates posés par le trigger).
- Supabase local : la migration `20261012120000` (autre session) avait été appliquée à la main, sans
  trace dans l'historique ; `migration repair --status applied` avant `migration up --local`.
- Fusionnée le 2026-10-10 ; `db:migrate` appliqué en prod (seule migration en attente). Vérifié en
  lecture seule : 671 entrées, RLS active, 6 policies, droits = ceux de la migration (anon : SELECT
  seul sur les entrées ; personne n'a DELETE).

## PR 2 — lecture depuis la base, page d'admin (en cours)

- `db:types` régénéré depuis la prod (+101 lignes, les deux tables seulement), commité en premier.
- PR 2 découpée : **2a = lecture depuis la base** (cette branche), 2b = page d'admin + règles de
  cohérence.
- 2a fait : `$lib/dictionary/model.ts` (types + lecture par niveau, sortis du fichier),
  `entry-schema.ts` (Zod : liste blanche « Voir aussi », image du site seulement, `//hôte` refusé),
  `$lib/server/dictionary/load.ts` (filtre `hidden` explicite, mémoire 2 min, dernière lecture si
  base injoignable), `GET /api/dictionnaire` (cache public 1 min navigateur / 2 min CDN ; `?frais`
  pour l'admin seul), linker en fabrique (`createLinker`, `createLexicon`), glossaire et Mathémo
  lus par `+page.server.ts` (Mathémo ne reçoit que nom/niveau/filières des mots jouables).
- Migration additive `20261013090000` : contrainte `dictionary_entries_image_same_site` (la
  contrainte de la PR 1 laissait passer `//hôte/x.png`). Rouge sans elle, vert avec ; aucune image
  en prod (vérifié).
- Tests : 20 intégration verts (4 nouveaux ; filtre `hidden` et image prouvés rouges), route
  (garde admin de `?frais` prouvée rouge), schéma (671 entrées relues à l'identique).
- Revues 2a (2026-10-10) : security-auditor sans bloquant ; code-reviewer sans bloquant. Corrigé :
  réponse qui pose un cookie toujours `private, no-store` (`server/private-response.ts`, appelé par
  `securityHeadersHandle` : une session rafraîchie sur `/api/dictionnaire` partait en cache public) ;
  marge des 5 min (mémoire 90 s + CDN 90 s + navigateur 60 s) ; repli base injoignable borné à
  15 min ; une seule lecture pour des requêtes simultanées ; mots cliquables relus après 5 min dans
  un onglet ouvert + `refreshLexiconRuntime()` ; Mathémo : niveau sans mot → tous les mots ;
  `findPrincipal` partagé avec le glossaire.
- Pour 2b : appeler `forgetDictionary()` (serveur) puis `markDictionaryEdited()` +
  `refreshLexiconRuntime()` (navigateur) après un enregistrement. Hors diff, signalé :
  `HintReference.svelte` met `href={hint.url}` sans `sanitizeUrl`.
- Ancien « à faire » : règles de cohérence partagées (refus 10–16), Zod (`see_also`, `image`), lecture en base
  avec cache 5 min (immédiat pour l'admin) dans le glossaire, Mathémo et le runtime des mots
  cliquables, page `/dashboard/admin/dictionnaire` (comportements 5–9), revues.

## PR 3 — suppression du fichier (après un `deploy:prod` lancé par David)
