---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; lot RGPD fait sauf T14 (lots B ensuite)
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-03, après #2340, #2342, #2343 ; #2345 ouverte._

- **État** : lot B en cours. **Faits** : M4 code (#2340), M11 `DROP` appliqué en prod + `db:types` (#2342, #2345), M8 (#2343). Liste A et lot RGPD comme avant (T14 attend David ; #2330 pas encore en prod).
- **Prochaine action** : **#2345** (`db:types` M11) : porte de la CI fermée 2 fois, « origin/main injoignable » (panne réseau GitHub, `main` rouge aussi à 19:30) → relancer le run (`gh run rerun <id>`), merger si verte, supprimer la branche ; puis D11 + C10 ; C14 ; V35 ; V39 (mesurer les modèles d'abord) ; V40 ; L9 ; L20 (doc). Clore V4, V8, M2, M20, V41, D10, D20, V49 et M4/M8/M11 dans `ecarts-a-trier.md`. **M4 `DROP worksheet_instances`** : seulement après le prochain `deploy:prod` (retirer aussi les tests d'intégration qui la lisent : `phantom-columns`, `anon-option-b`, `eleve-inscrit-apres-publication`, `profiles-columns`, `worksheet-instance-not-writable-by-student`).
- **En attente de David** : **V63** (réexpliqué simplement) ; DPA (Drive privé, preuves d'acceptation) ; relire `conformite/violation-de-donnees.md` ; T14 ; perf `requireAuth` ; `account/delete` 1 / 24 h.
- **Pièges en cours** : `db:migrate` refusé par le mode auto → David le lance (`! cd <worktree> && pnpm db:migrate`) ; worktree non lié → copier `../ubumaths/supabase/.temp` ; un `DROP` garde la ligne de `generate-db-doc.ts` jusqu'à `db:types` (test « aucune table sans domaine ») ; migration appliquée en local par `psql` sous verrou (pas de `db:reset`, base partagée).
- **Worktree / branche** : `../ubumaths-wt-ecarts-a-trier`, une branche par PR du lot (actuelle : `chore/ecarts-db-types-m11`).

---

## Historique

- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.

## Décisions de David (2026-11-01, sur mes recos)

- V65 reste `|x^2-1|=3` : **refus gardé** (périmètre affine voulu de `absolute-value.ts`) ; à rouvrir seulement si un modèle de 1re en a besoin.
- #2061, #1850 : à merger (CI fraîche) ; #1802 à fermer.
- Tests RLS `it.skip` « deux profs » : **supprimés**. Agent `mathast-expert` : **corrigé** (`e` = constante d'Euler, `i` = nœud `complex`).
- Liste A : **L8 d'abord** ; **M19 jamais seul** (seulement en passant, dans un chantier de géométrie) ; **L12 sur demande** seulement.
- Écriture : racines approchées → **décimal arrondi avec ≈** (ou forme exacte), jamais une fraction décimale géante ; `\sin(x)^2` → **`\sin^2(x)`** ; `\dfrac{-6}{\pi-9}` → **`\dfrac{6}{9-\pi}`** (dénominateur positif ; touche `tidy` → chantier `fusion-moteurs`).
- `a(x) = x^2` puis `a = 2` : **fonction constante gardée** (cohérent avec #905), l'Atelier doit afficher `a(x) = 2`.

## Décisions de David (2026-11-03, page à cocher RGPD, toutes mes recos validées)

- **T1** présence des amis : relecture toutes les 60 s, `user_presence` reste non publiée. Phase 0 validée : ami en ligne si signal de vie < 270 s (calcul navigateur, pas de cron), échec → dernier statut gardé, abonnement et bandeau « système de présence » retirés.
- **T2** canaux match / présence / notifications / succès : ~~passer en privé~~ → mesure en prod (2026-11-03) : ils ne portent que des `postgres_changes` filtrés par la RLS, le privé n'apporte rien. **David a choisi une garde de test** (`canaux-publics-garde.test.ts`), sans passage en privé.
- **T3** canal privé gardé après retrait d'un droit : limite acceptée et documentée (`realtime.md`) — fait.
- **T6** CSP `unsafe-eval` : tester si `wasm-unsafe-eval` suffit à Typst ; sinon le restreindre aux pages PDF.
  - **Mesuré le 2026-11-03** : `wasm-unsafe-eval` ne suffit pas (le WASM Typst appelle `new Function`), et une CSP par route casse à la navigation côté client. **David : garder `unsafe-eval`, documenter** (`auth.md`, point 12) — fait. Futur chantier possible : nonces à la place de `unsafe-inline`.
- **T7** deux `requireAuth` : renommer celle qui redirige (`requireUserOrRedirect`) et passer les ~32 routes à la garde commune, avec revue sécurité.
  - **Fait, #2311 (2026-11-03)** : 62 endpoints migrés (rôles identiques, jamais `requireAdmin`) ; laissés `admin/elevate*`, `auth/logout`, `errors/log`. Revue sécurité : aucun accès gagné. Constats hors périmètre jugés sans suite : `python-exercises/mastery` prend `student_id` du client mais la RLS (`pem_select_own` / `pem_select_teacher`) borne ; correction d'un devoir ouverte à tout prof (mono-prof). Journal : [archive](../archive/wip/garde-auth-commune-progress.md).
- **T8** limiteur en mémoire : unifier sur le limiteur en base, supprimer celui en mémoire.
  - **Fait, #2325 (2026-11-03)** : `rateLimit()` (12 appels, désormais `await`) et la `Map` de `api/admin/cron/trigger` comptent dans `rate_limits` via `checkEndpointRateLimit`, échec ouvert ; double `fake-rate-limiter.ts` pour les tests de routes. Revues : code rien de bloquant ; sécurité aucun accès gagné, rien de bloquant. Constats ouverts : **`account/delete` 1 / 24 h devient une vraie limite**, comptée avant la suppression (un échec en cours empêche de réessayer 24 h → question à David) ; `error-log` par IP partagé derrière le NAT d'un collège (20/min pour toute la classe, faible) ; IP dans `rate_limits` ajoutée au § conservation de `rgpd.md`.
- **T9** double CSRF : garder les deux, documenté (`auth.md`) — fait.
- **T12** grâce du consentement : 30 jours glissants, doc corrigée (conformité) — fait.
- **T13** registre des sous-traitants : HuggingFace (non activé) + Vercel Analytics ajoutés — fait.
- **T14** mentions légales : David donne les infos (en attente).
- **T15** dans l'ordre : archiver les DPA (Supabase, Vercel, Sentry, Groq), bouton « signaler » dans le chat, finaliser l'AIPD.
  - **2026-11-03** : le signalement existait déjà et sert en prod (4 signalements, tous traités) ; seul défaut, le menu « ⋮ » n'apparaissait qu'au survol → **#2330** (visible au toucher et au clavier, réactions comprises). DPA : David a choisi un **Drive privé** ; les 6 DPA en vigueur (Supabase, Vercel, Sentry, Groq, Google Cloud en français, Brevo) imprimés en PDF ; lien Groq du registre corrigé (404). AIPD : David a choisi « doc + #6 » → statuts à jour, procédure de violation rédigée (`conformite/violation-de-donnees.md`, à valider) ; #1 rétention pédagogique = futur chantier, #8 attend T14.

## Décisions de David (2026-11-03, page à cocher lot B)

Page : https://claude.ai/artifact/J4Z8UfhGXAwSafQX59x1nm (20 fiches, revérifiées le jour même).

- **Destructif** : **M4** `worksheet_instances` (0 ligne, aucune FK ni fonction) → PR de code (décompte « Publié pour N élève(s) » sur les élèves de l'affectation au lieu de la table, toujours 0 aujourd'hui ; `canStudentAccessInstanceCorrection` sans appelant retirée), puis `DROP` après le `deploy:prod` suivant. **M11** `class_google_classroom_links` (0 ligne, aucune référence dans `src/`) → `DROP` + `db:types` + ligne de `scripts/generate-db-doc.ts`. **M20** retiré de la liste : `question_templates.type` est lu (stats prof, anti-fraude, filtres admin).
- **Fermés** : V4 (tableur retiré, 55bc75c0d), V8 (ADR 0007 faite), M2 (`'graphical'` porte les cases figure), V41, D10 + L11, D20.
- **V35** : partie imaginaire écrite **i derrière** : `-\dfrac{1}{2} + \dfrac{\sqrt{3}}{2}i` (aujourd'hui `\dfrac{i\sqrt{3}}{2}`, mesuré).
- **V39** : `\ln 5^2` lu **ln(5²)** comme les manuels, après mesure des modèles touchés (aujourd'hui (ln 5)², mesuré).
- **V40** : rédiger |u| = c ⇔ u = c ou u = −c (c > 0), u = 0 (c = 0), ∅ (c < 0).
- **V48** (a) : en attente du sélecteur résumé / détaillé. **V49** : limite connue, fermé. **L20** : limite connue, à écrire dans la doc.
- **L9** : STIX Two Math (OFL) dans le dépôt, polices listées. **D6** : reporté.
- **M8** : retirer l'export `.tex` d'ubumark. **M22** : **garder** les règles trigo / hyperboliques (futur « Comment ? » trigo).
- **D11 + C10** : renommer « capacité » dans le code (point du programme). **C14** : `src/lib/lexicon/` → `src/lib/dictionary/`.
- **D21** : tuteur en pause, V31 / L32 / L33 suspendus avec lui. **C13** : David relit les récits du chiffrement (→ vérifications manuelles).
- **Sans choix** : **L13** (commentaire : « l'atelier est censé lire tout seul les unités ») et **V63** (« je ne comprends rien ») → reposés dans la conversation.

## Lot B, avancement (2026-11-03)

- **M4** (#2340) : « Publié pour N élève(s) » compte les élèves de l'affectation ; `canStudentAccessInstanceCorrection` retirée ; plus aucun code ne lit `worksheet_instances`. `DROP` après le prochain `deploy:prod`.
- **M11** (#2342 + #2345) : `class_google_classroom_links` supprimée (0 ligne, aucune dépendance), migration `20261103170936` appliquée en prod par David ; types régénérés.
- **M8** (#2343) : export `.tex` d'ubumark retiré (`latex-generator.ts`, `variation-table-latex.ts`, `probability-tree-latex.ts` + tests).
- **L13 fermé** (2026-11-03) : déjà tranché (lecture naturelle des unités, 2026-10-11, `grandeurs.md`) ; question reposée à tort.
