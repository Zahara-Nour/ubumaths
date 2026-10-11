# Cours partageable par lien — journal

ADR : [0025](../../adr/0025-cours-lisible-par-lien-sans-compte.md). Modèle : lien du cahier (#174).

## Décisions de David (2026-10-12)

- Lien **distinct** de celui du cahier ; table séparée `class_course_share_tokens` (A) ; nouvel ADR (B).
- Lisible sans compte : plan + documents, fiches en lecture (PDF), checklists (texte seul), séries
  (entraînement libre). Réservé aux comptes : **masqué**.
- Fiche : publiée dans un chapitre visible ET distribuée à la classe (miroir de
  `student_has_worksheet_access`).

## Lots

- [x] **PR 1** (#1150, migrée le 2026-10-12) — migration `20261016100300_class_course_share_tokens.sql` (table + 3 RPC), tests
      d'intégration (preuve rouge), liste DEFINER, `security-auditor`, merge, `db:migrate`, `db:types`.
- [x] **PR 2** — route `(public)/cours/[token]` (+ `fiche/[id]`), endpoint document (URL signée courte,
      service role), bloc prof sur la page Cours (copier, renouveler, révoquer), doc
      `docs/systeme/cours-et-chapitres.md`, versement de ce journal.
      Branche `feat/cours-partageable-page` (2026-10-12) : code, tests (serveur 78, client 37),
      `code-reviewer` (ordre à égalité corrigé) et `security-auditor` sans bloquant. Reste : PR,
      CI, merge, versement de ce journal.
