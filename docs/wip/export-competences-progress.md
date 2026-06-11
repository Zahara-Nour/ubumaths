# Progression — Vue + Export compétences (Chantier 1 MVP)

> Feature livrée le 2026-06-11. Étude source : `docs/wip/export-competences-study.md`.
> Plan : `~/.claude/plans/luminous-snuggling-puzzle.md`.

## État : ✅ Implémentation complète (avant commit)

Permet au prof de **consulter** les niveaux de compétences (famille B) d'une classe
et de les **exporter en CSV** pour réinjection manuelle dans son ENT (Pronote
collage / EcoleDirecte recopie / Sacoche saisie).

## Décisions actées (PO, 2026-06-11)

- Disposition **« large » 1-4 par défaut** (élèves × 6 compétences) ; « longue » en option.
- **Vue écran** = cœur du MVP ; le CSV exporte le même contenu.
- Mapping socle en **fichier TypeScript lecture seule** (pas de table DB). **Vérifié 2026-06-11**
  sur la table « Domaines du socle » du BO 2015 cycle 4 (Option B = sous-composantes, domaine 1 →
  D1.3) : chercher=`D2 D4`, calculer=`D4`, raisonner=`D2 D3 D4`, communiquer=`D1.3 D3`,
  modeliser=`D1.3 D2 D4`, representer=`D1.3 D5`. ⚠️ Corrige une 1ʳᵉ version qui mettait D1.3 partout.
- **Période = étiquette** (nom de fichier), ne filtre pas les données (`student_competence_level`
  est un cache d'état courant, pas d'historique par trimestre).
- **Log d'audit applicatif** (createServerLogger, pas de table).
- Identifiant élève = `nom+prenom+classe` (pas d'INE dans UbuMaths).
- RGPD : génération à la volée, zéro fichier stocké, `Cache-Control: no-store`, RLS prof.

## Fichiers créés

| Fichier                                                                       | Rôle                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/competences/niveau-format.ts`                                        | `formatNiveau(niveau, format)` — numeric/label/short (partagé client+serveur) |
| `src/lib/server/competences/socle-mapping.ts`                                 | `getSocleCodes` / `formatSocleCell` (mapping TS lecture seule)                |
| `src/lib/server/competences/export-csv.ts`                                    | `buildCompetencesCsv` — pur, 2 dispositions, BOM, escaping RFC 4180           |
| `src/lib/server/competences/export-csv.test.ts`                               | 13 tests (formatNiveau, socle, CSV)                                           |
| `src/lib/server/competences/load-export-data.ts`                              | `loadClassCompetenceExport` — charge élèves + niveaux                         |
| `src/lib/server/competences/load-export-data.test.ts`                         | 3 tests (mock Supabase)                                                       |
| `src/routes/api/teacher/competences/export/+server.ts`                        | endpoint GET → CSV                                                            |
| `src/routes/(protected)/dashboard/teacher/competences/export/+page.server.ts` | load (vue)                                                                    |
| `src/routes/(protected)/dashboard/teacher/competences/export/+page.svelte`    | vue tableau large + UI export                                                 |
| `docs/guides/export-competences-prof.md`                                      | guide d'usage prof (Pronote/ED/Sacoche)                                       |

## Réutilisation (pas de duplication)

- `requireTeacherOfClass` (`src/lib/server/stats/teacher-class-auth.ts`) — auth + ownership.
- `requireRole` (`src/lib/server/middleware/auth.ts`).
- Classes + périodes depuis le layout parent prof via `await parent()`.
- Visuels de niveau (`getMathCompetenceLevelVisual`) cohérents avec `ClassCompetenceGrid.svelte`.
- `createServerLogger` (redaction PII auto).

## Qualité

- **16 tests serveur** verts (`pnpm test:server src/lib/server/competences/`).
- `code-reviewer` ×2 (modules purs + page) : aucun bloquant. Correctifs appliqués :
  escaping `\r` (RFC 4180 §2.6), a11y tableau (`scope`, `caption`, `sr-only`).
- `security-auditor` (endpoint PII) : **aucune remédiation requise** (AuthZ avant chargement,
  Zod exhaustif, filename neutralisé via `slug()`, no-store, log sans PII).
- `svelte-autofixer` : 2 problèmes de réactivité corrigés (`$derived`). Reste la suggestion
  `resolve()` — **non adoptée dans le repo** (87 fichiers `goto` simple, 0 `resolve`).
- ESLint : 0 erreur/warning sur les fichiers modifiés.
- `pnpm check:incremental` : **9 ERRORS / 46 WARNINGS** = baseline inchangé.

## Reste à faire (hors MVP — Chantier 2 conditionnel)

- PDF récap A4 (cible EcoleDirecte) — sur demande.
- `profiles.identifiant_externe` — si blocage homonymes signalé.
- Historisation des niveaux par période (snapshot) si filtrage réel par trimestre demandé.
- (optionnel) Lien depuis la page vers le guide markdown — le guide est actuellement un doc dev,
  non servi en route ; l'encart in-page suffit pour le MVP.

## Vérification manuelle suggérée (non bloquante)

`pnpm dev -- --port 5175`, prof connecté → `/dashboard/teacher/competences/export` :
changer classe/période/disposition/format, vérifier le tableau coloré, télécharger,
ouvrir le CSV dans Excel (accents OK = BOM). Tester 403 (classe d'un autre prof) et
400 (param invalide) sur l'endpoint.
