# RGPD et sécurité — constats à traiter

> Relevés le 2026-10-10 pendant la réorganisation de docs/ (session « docs »), par lecture du code et
> des migrations ; ✅ = **mesuré en production** (MCP Supabase, lecture seule). Rien n'a été corrigé.
> Docs de référence : [systeme/conformite/](../systeme/conformite/README.md),
> [systeme/auth.md](../systeme/auth.md), [systeme/base-de-donnees.md](../systeme/base-de-donnees.md),
> [systeme/jeux-et-economie.md](../systeme/jeux-et-economie.md), [systeme/srs.md](../systeme/srs.md).

## A. Droits légaux cassés ou contournables (priorité 1)

1. ✅ **Suppression de compte (art. 17) en échec pour tout le monde.** `delete_user_account`
   (baseline `20260616220000`, redéfinie nulle part ensuite) met à jour `shop_purchase_history` et
   `item_usage_log` — **absentes en prod** (`to_regclass` NULL) — et passe à NULL `student_id` dans
   `gidouilles_activity`, `bonus_history`, `vip_cards_activity`, colonnes `NOT NULL`. Pas de bloc
   EXCEPTION → `/api/account/delete` (`src/routes/api/account/delete/+server.ts:124-144`) rend 500.
   `rgpd.md:298-302,543` et l'AIPD la disent « fonctionnelle ».
2. **Mode lecture seule (sans consentement parental) contournable.** `chat.svelte.ts:853` insère
   directement dans `messages` ; la policy d'INSERT ignore le consentement → la garde de
   `/api/messages/send` est évitée. Aussi sans garde : `marketplace/listings` POST,
   `trades/[id]/chat|confirm`, démineur multijoueur et tournois (`queue`, `start`, `complete`).
   (Déduit du code, non exécuté.)
3. **Règle de consentement : base ≠ code ≠ docs.** Docs (`rgpd.md:312,321`, README §4,
   `consentement-parental.md:17-18`) : 6e→2nde. Base depuis `20261001190000`/`210000` : tous niveaux
   sauf 1re/Tle (primaire et inconnu compris), question d'âge en 2nde, dispense prof, grâce 30 j.
   Code : `GRADES_REQUIRING_CONSENT` = 6→2 ; `teacher/consent/+page.server.ts:180` n'affiche pas les
   élèves de primaire soumis → impossible de leur envoyer la demande. **Question produit pour David.**

## B. Sécurité de l'authentification

4. **Élévation admin qui survit au logout** (vérifié dans le code). `auth/logout` n'efface pas le
   cookie `ubu-admin-elevation` (jeton admin ≤ 1 h) ; seul `api/admin/elevate/revoke` le supprime.
   Ni `createAdminElevationHandle` ni l'étape 1 de `requireAdmin`
   (`src/lib/server/middleware/auth.ts:375`) n'exigent `locals.user`. Poste partagé en classe →
   `/api/admin/*` utilisable sans session.
5. **Élévation peut-être cassée** (à mesurer) : `api/admin/elevate` lit l'e-mail admin avec le client
   du prof ; aucune policy ne semble le permettre depuis `20260915580000`.
6. Comptes `pending`/`rejected` : statut contrôlé seulement par `(protected)/+layout.server.ts`, pas
   par `requireAuth`/`requireRole` des API ni les actions de formulaire.
7. `handle_new_user` approuve tout e-mail hors `@voltairedoha.com` : un `signUp` GoTrue direct sans
   code de classe crée un élève `approved`, hors limites de débit de l'app.
8. Points mineurs : cookie d'élévation non chiffré (décision du 2026-06-18) ; limites de débit qui échouent
   ouvertes ; `api/google/auth/*` sans test de `GOOGLE_CLASSROOM_ENABLED` ; `/auth/register` hors
   `ALLOWED_SERVICE_ROLE_PATHS`.

9bis. **Route d'écriture peut-être ouverte à tous** : `api/riddles/auto-select-daily` n'exige une clé
que si `VITE_RIDDLE_AUTO_SELECT_API_KEY` est définie ; sinon tout POST passe, et la route écrit
avec le client service role. Valeur de la variable en prod non lue (secret) : à vérifier. Rien ne
planifie cette route ; le bouton admin envoie `CRON_SECRET`, pas cette clé (→ 401 si elle est définie).
(Relevé le 2026-10-10, docs/systeme/serveur.md.)

## C. Promesses RGPD sans code (aligner le code OU les documents — décision de David)

9. « Qui a accédé aux données de mon enfant ? » : seules les écritures sont tracées, pas de rôle
   parent, `audit_logs` purgé à 60 j (`rgpd.md:370`, `audit-trail.md:382`).
10. Texte et images de l'élève envoyés bruts à Groq (`api/chat/+server.ts`, vision l.334-343) ; les
    registres promettent une anonymisation (`registre-sous-traitants.md:251-257`).
11. Conservation promise (profil = scolarité + 5 ans, pédagogie = 5 ans, page publique §7) :
    `run_cleanup_expired_data` ne purge ni profils inactifs, ni pédagogie, ni `tutor_messages` ;
    `pending_students` jamais activés gardés indéfiniment.
12. Export (art. 20, `format_version` 1.3) : manquent `tutor_messages` et la déclaration d'âge ;
    `rgpd.md:580-597` liste des tables mortes.
13. Page de confidentialité : sous-traitants Brevo, Groq, HuggingFace absents
    (`confidentialite/+page.svelte:195-225`) ; journaux annoncés à 90 j, purgés à 30 j.
14. Compte supprimé : dans `messages`, l'auteur passe à NULL mais le contenu reste (`rgpd.md:300`
    dit « hard delete »).
15. `registre-traitements.md:60` cite un rôle « parent » inexistant ; `age_declaration` /
    `age_declared_at` absents des fiches.

## D. RLS et frontière école (ADR 0002)

16. `minesweeper_games` terminées lisibles par tout compte connecté **et `anon`**, sans borne
    d'école, avec `student_id`. (Relevé statique des policies.)
17. `exercises`, `constructions` : policies `is_public` sans clause `TO` → ouvertes à `anon` (voulu ?).
18. Frontière école absente : `join_multiplayer_queue` (démineur), classement des énigmes (vue
    `riddle_progress`), `/api/games/2048/leaderboard` (top global, sans appelant).

## E. Fonctions cassées (données d'élèves)

19. ✅ Six fonctions écrivent dans `gidouilles_history` (**absente en prod**, renommée
    `gidouilles_activity`) : `finalize_tournament`, `redistribute_tournament_rewards`,
    `complete_multiplayer_match`, `abandon_multiplayer_match`, `process_weekly_rewards`,
    `purchase_shop_item` → récompenses de tournoi et de multijoueur probablement jamais versées.
20. SRS : les DELETE de `api/srs/cards/[id]`, `api/srs/decks/[id]`, `…/sections/[sectionId]` sans
    `.select()` → la RLS refuse en silence, la route répond « supprimé ». Anti-triche cassé
    (`listScanPairs` lit des colonnes de la famille A), éteint en prod.

## Méthode (CLAUDE.md)

- Toute migration : **question d'accès posée à David avant le SQL**, test d'intégration qui échoue
  sans la migration, `security-auditor`, additive + rollback en commentaire. Destructive → arrêt.
- Chaque constat « déduit du code » se **prouve d'abord par un test qui rougit** ou une mesure en prod
  (lecture seule) — plusieurs peuvent être faux.
