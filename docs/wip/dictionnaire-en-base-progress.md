# Dictionnaire en base — progression

ADR 0022 et spécification validées par David le 2026-10-10 ([spec](dictionnaire-en-base-spec.md)).
PR 1 : #1024 (fusionnée). PR 2a : #1025 (fusionnée). PR 2b : worktree `../ubumaths-wt-dictionnaire-admin`, branche `feat/dictionnaire-admin`.

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

## PR 2b — page d'admin et règles de cohérence (en cours)

- Migration `20261013090000` appliquée en prod le 2026-10-10 (question d'accès tranchée par David :
  « oui » ; contrainte vérifiée en lecture seule). Images futures : stockées comme nom de fichier
  dans le stockage Supabase (comme `question-images`), règle à assouplir à ce moment-là.
- `$lib/dictionary/consistency.ts` : `checkDictionary` (refus 10 à 16, messages en français) et
  `newProblems(avant, après)` — un défaut déjà présent ailleurs ne bloque pas un enregistrement.
  Les 671 entrées passent sans refus. Entrées masquées : non vérifiées, mais leur nom reste pris
  (15) et un renvoi visible ne peut pas les viser (11, 16).
- `$lib/dictionary/admin-draft.ts` : brouillon de la page (listes séparées par des virgules),
  recherche accents/majuscules ignorés ; aller-retour sans perte prouvé sur les 671 entrées.
  Image, « Voir aussi » et mode d'un champ gradué : gardés tels quels, non éditables.
- `$lib/server/dictionary/admin.ts` + routes `/api/admin/dictionnaire` (GET, POST),
  `[id]` (PATCH : entrée et/ou `hidden`), `[id]/versions` (GET) : `requireAdmin` (client de
  l'admin élevé), Zod borné (`dictionaryEntryInputSchema`), règles sur tout le dictionnaire relu,
  `.single()` après écriture (RLS silencieuse), `forgetDictionary()`. Aucune suppression.
- Page `/dashboard/admin/dictionnaire` (+ lien « Dictionnaire » du menu admin) : liste cherchable,
  fiche éditable (définitions et exemples par niveau avec aperçu, partage limité aux filières
  parallèles, renvoi, « jamais souligné »), ajout, masquer/réafficher, historique. Après
  enregistrement : `markDictionaryEdited()` + `refreshLexiconRuntime()`.
- Tests : règles 17 (rouges 14/17 sans les règles), brouillon 5, routes 11 (rouges 3/11 sans la
  garde de cohérence), intégration 4 (rouges 2/4 sans la garde). Base locale : tables réappliquées
  à la main (`docker exec psql` + `migration repair`), une autre session l'avait recréée.

## PR 3 — suppression du fichier (après un `deploy:prod` lancé par David)
