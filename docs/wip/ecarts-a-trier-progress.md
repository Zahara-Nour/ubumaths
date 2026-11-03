---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; lot RGPD en cours (T7 ensuite)
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-03, après #2325 (T8)._

- **État** : liste A finie et en prod. Lot RGPD : T1, T2, T3, T6, T7, T8, T9, T12, T13 faits (T8 = #2325 : tout limiteur de débit compte en base, plus de compteur en mémoire). Mergés depuis #2293, **pas encore en prod** (pas de `deploy:prod` demandé).
- **Prochaine action** : **T15** (archiver les DPA, bouton « signaler » dans le chat, finaliser l'AIPD), puis lots B « destructif » et « spécification ».
- **En attente de David** : T14 = infos des mentions légales ; **perf de la garde commune** (`requireAuth` relit session et profil, 342 endpoints — reco : futur chantier, mesurer d'abord) ; **suppression de compte limitée à 1 / 24 h, comptée avant la suppression** : un échec en cours bloque la nouvelle tentative 24 h — reco : remettre le compteur à zéro si la suppression échoue (ou 3 / 24 h).
- **Pièges en cours** : test unitaire d'une route limitée → `vi.mock('$lib/server/rateLimiter', () => import('$lib/server/__tests__/helpers/fake-rate-limiter'))`, sinon il écrit dans la base locale ; `cleanup_stale_presence` non planifiée (contourné par T1) ; CI client : `wrapDynamicImport` passagers → relancer ; garde « doc à jour » compare des COMMITS ; migrations : `pnpm migration:horodatage`, `check:migrations --pr <n>`.
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
