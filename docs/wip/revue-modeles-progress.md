# Chantier `revue-modeles` — revue des modèles de questions dans `/dev/modeles`

## Reprendre ici

_Mis à jour le 2026-10-28, avant la PR 1._

- **État** : phase 0 validée ; PR 1 (migration `question_template_reviews` + tests d'intégration) en cours.
- **Prochaine action** : PR 1 verte → merge → `db:migrate` (dépôt principal) → `db:types` ; puis PR 2 (page).
- **En attente de David** : rien.
- **Pièges en cours** : `updated_at` des modèles bouge aussi aux migrations de rangement/tags → l'alerte « modifié depuis le verdict » peut sonner à tort (à affiner en PR 2 si gênant).
- **Worktree / branche** : `../ubumaths-wt-revue-modeles` · `feat/revue-modeles`.

## Phase 0 (validée par David le 2026-10-28)

Page `/dev/modeles` (admin seul, garde `/dev` existante) : vue globale de TOUS les modèles en base.

- **Rangement** : programme > branche > notion > sous-notion ; compteurs par nœud (✅ validé · 🔶 à revoir · ⚪ sans verdict). Un modèle tagué dans deux programmes apparaît dans les deux (même verdict) ; sans point → « Hors programme » ; sans nœud → « Non rangé » + alerte.
- **Vue d'ensemble** : totaux, filtres (verdict, brouillon/publié, programme, avec alerte).
- **Fiche** : titre, id, statut, niveau, grades ; point (code + libellé) et ses bornes ; rangement ; consigne ; plages des variables ; specs de test ; aperçu de chaque variation, régénérable (↻) ; verdict validé / à revoir + commentaire, enregistré aussitôt ; alerte « modifié depuis le verdict ».
- **Charge** : fiches chargées à l'ouverture d'une notion.
- **Erreurs** : variation qui ne se génère pas → erreur dans la fiche, page intacte ; verdict non enregistré → toast d'erreur, statut inchangé.

Décisions :

1. **Accès** : verdicts lus et écrits par l'admin seul (`is_admin()` ; le prof élevé passe par le client admin). Aucun élève ni prof.
2. **Historique** : le dernier verdict + sa date (pas de fil).
3. **Reprise** : importer les verdicts déjà donnés dans les artefacts (pages à cocher).
4. **Bornes** : `docs/systeme/programmes/bornes/*.json` restent la source, importés au build (Vite).

Découpage : PR 1 migration · PR 2 page (fonctions de `scripts/lib/page-a-cocher.ts` remontées dans `src/lib`) · import des anciens verdicts (simulation, puis David lance).

## Journal

- 2026-10-28 — phase 0 validée ; worktree créé ; PR 1 commencée.
