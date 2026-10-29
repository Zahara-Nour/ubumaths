# Chantier `revue-modeles` — revue des modèles de questions dans `/dev/modeles`

## Reprendre ici

_Mis à jour le 2026-10-29, après la reprise des verdicts._

- **État** : table en prod (#1940) ; page `/dev/modeles` mergée (#1944, pas encore en prod) ; doc versée dans `docs/systeme/questions.md`. Reprise lancée par David le 2026-10-29 : 188 verdicts en base prod, vérifiés (179 validés, 9 à revoir). Worktree et branches retirés.
- **Prochaine action** : après le `deploy:prod`, archiver ce journal et retirer le renvoi au journal dans `src/routes/(protected)/dev/modeles/+page.svelte` (commentaire d'en-tête), à la prochaine PR qui touche ce fichier.
- **En attente de David** : `deploy:prod` pour voir la page en prod.
- **Pièges en cours** : les verdicts repris portent la date des artefacts ; tout modèle retouché depuis (migrations de rangement comprises, `updated_at`) sonnera « modifié depuis le verdict ». Les nouvelles pages à cocher écrivent encore dans les artefacts : à reprendre par le même script, ou juger directement dans `/dev/modeles`.
- **Worktree / branche** : aucun (chantier fini côté code).

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
- 2026-10-28 — Revues #1944 : sécurité rien à corriger ; code : saisie d'une fiche effacée à l'enregistrement d'une autre (corrigé, vérifié dans le navigateur), glob sans `questions*.json`, alerte si aucune borne chargée, « Tout déplier » limité à 20, doublons du script. #1944 mergée.
