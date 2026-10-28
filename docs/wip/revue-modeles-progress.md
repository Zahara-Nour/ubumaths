# Chantier `revue-modeles` — revue des modèles de questions dans `/dev/modeles`

## Reprendre ici

_Mis à jour le 2026-10-28, après #1940 (PR 2 #1944 en revue)._

- **État** : table `question_template_reviews` en prod (#1940, `db:migrate` fait, vérifiée). PR 2 #1944 (page `/dev/modeles` + script de reprise) ouverte, CI et revues en cours.
- **Prochaine action** : revues + CI vertes → merge #1944 ; puis David lance la reprise (`--ecrire`).
- **En attente de David** : `pnpm tsx scripts/questions/reprise-verdicts.ts --fichier data/revue-modeles/verdicts-artefacts.json --ecrire` (simulation prod : 188 à écrire, 179 validés, 9 à revoir) ; `deploy:prod` pour voir la page en prod.
- **Pièges en cours** : `updated_at` bouge aussi aux migrations de rangement → « modifié depuis le verdict » peut sonner à tort. Shard 1 des Client Tests : crash du navigateur sur `fonctions-declarees` (relancé 2×, sans lien).
- **Worktree / branche** : `../ubumaths-wt-revue-modeles` · `feat/revue-modeles-page`.

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
- 2026-10-28 — #1940 mergée (audit : rien de bloquant ; test service_role ajouté) ; `db:migrate` ; RLS, 4 policies, anon sans droit vérifiés en prod.
- 2026-10-28 — PR 2 #1944 : page essayée en local (arbre, fiche, bornes, ↻, verdict posé / retiré). Écart au plan : les aperçus réutilisent `QuestionPreviewTabs` (vrai rendu élève) au lieu des fonctions de `page-a-cocher.ts`, qui restent au script.
- 2026-10-28 — Collecte des artefacts : 35 lus, 188 verdicts dans 25 (179 ok, 9 revoir) ; 7 pages « Relecture » sans verdict encore ; « Verdicts des modèles », « Verdicts modèles lycée », « Lot MODIFIER lycée » = verdicts de TAGS, hors sujet. Anciennes pages CP : id abrégé à 8 caractères, résolu par préfixe.
