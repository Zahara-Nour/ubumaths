---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; lot RGPD fait sauf T14 (lots B ensuite)
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-03, après #2330 (T15)._

- **État** : liste A finie et en prod. Lot RGPD : T1, T2, T3, T6, T7, T8, T9, T12, T13 faits ; T15 fait en partie (signalement visible au toucher #2330, DPA en PDF, AIPD à jour, procédure de violation rédigée). #2330 est mergé après le `deploy:prod` du 2026-11-03 : **pas encore en prod**.
- **Prochaine action** : lots B « destructif » et « spécification ».
- **En attente de David** : **DPA** : David les range lui-même dans son Drive privé (les connecteurs Google de claude.ai ne sont pas sur son compte : n'y rien écrire) ; les 6 PDF sont dans `~/Downloads/Chiphre-DPA/` ; **preuves d'acceptation** des DPA à tirer de ses comptes ; **relire `conformite/violation-de-donnees.md`** (brouillon) ; T14 = infos des mentions légales ; perf de `requireAuth` (reco : futur chantier, mesurer d'abord) ; `account/delete` 1 / 24 h compté avant la suppression (reco : compteur remis à zéro si elle échoue).
- **Pièges en cours** : test unitaire d'une route limitée → `vi.mock('$lib/server/rateLimiter', () => import('$lib/server/__tests__/helpers/fake-rate-limiter'))` ; `cleanup_stale_presence` non planifiée (contourné par T1) ; garde « doc à jour » compare des COMMITS ; commitlint refuse un sujet qui commence par une majuscule (« AIPD… ») ; dépôt PUBLIC : aucune adresse e-mail ni document signé dans `docs/`.
- **Worktree / branche** : aucun (journal sur `main`).

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
