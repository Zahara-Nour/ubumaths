---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-03, après le lot doc RGPD (commit direct sur `main`)._

- **État** : liste A finie et en prod (v0.62.0). Lot RGPD (liste B) : **David a validé toutes mes recos** de la page à cocher (2026-11-03, voir « Décisions » ci-dessous). Lot doc fait : T3, T9, T12, T13.
- **Prochaine action** : **T2** (canaux temps réel publics → privés) dans un worktree `ubumaths-wt-ecarts-a-trier`. ⚠️ `realtime.md` dit que ces canaux ne portent que des `postgres_changes` filtrés par la RLS : **mesurer d'abord ce qui fuit vraiment** (présence `track` ? broadcast ?) avant de coder. Puis T1, T6, T7, T8, T15, puis lots B « destructif » et « spécification ».
- **En attente de David** : T14 = les infos des mentions légales (responsable de publication, statut, adresse, nom).
- **Pièges en cours** : migrations : `pnpm migration:horodatage`, `pnpm check:migrations --pr <n>` avant merge ; CI allégée pour le contenu, CI Summary fait foi ; `charger-repartir-annuler.svelte.test.ts` (client) instable.
- **Worktree / branche** : aucun pour l'instant (journal sur `main`).

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

- **T1** présence des amis : relecture toutes les 60 s, `user_presence` reste non publiée.
- **T2** canaux match / présence / notifications / succès : passer en privé (+ policies + tests d'intégration).
- **T3** canal privé gardé après retrait d'un droit : limite acceptée et documentée (`realtime.md`) — fait.
- **T6** CSP `unsafe-eval` : tester si `wasm-unsafe-eval` suffit à Typst ; sinon le restreindre aux pages PDF.
- **T7** deux `requireAuth` : renommer celle qui redirige (`requireUserOrRedirect`) et passer les ~32 routes à la garde commune, avec revue sécurité.
- **T8** limiteur en mémoire : unifier sur le limiteur en base, supprimer celui en mémoire.
- **T9** double CSRF : garder les deux, documenté (`auth.md`) — fait.
- **T12** grâce du consentement : 30 jours glissants, doc corrigée (conformité) — fait.
- **T13** registre des sous-traitants : HuggingFace (non activé) + Vercel Analytics ajoutés — fait.
- **T14** mentions légales : David donne les infos (en attente).
- **T15** dans l'ordre : archiver les DPA (Supabase, Vercel, Sentry, Groq), bouton « signaler » dans le chat, finaliser l'AIPD.
