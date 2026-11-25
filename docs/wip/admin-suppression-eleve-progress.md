# Chantier `admin-suppression-eleve`

## Reprendre ici

_Mis à jour le 2026-11-25, ouverture._

- **État** : phase 0 validée (« je suis tes recommandations ») ; code en cours · **Prochaine action** : tests → route admin → UI → revues → PR · **En attente de David** : rien · **Pièges en cours** : audit RGPD de la suppression demandé par David, en parallèle · **Worktree / branche** : `ubumaths-wt-admin-suppression-eleve` / `feat/admin-suppression-eleve`

## But

David, 2026-11-25 : pouvoir supprimer définitivement un élève depuis le dashboard admin (il
n'existait que l'archivage d'adhésion et la suppression par l'élève lui-même, page Profil). Et
vérifier que la suppression enlève bien toutes les données (RGPD).

## Phase 0 (validée par David le 2026-11-25 : « je suis tes recommandations »)

**Emplacement** : page Users (`/dashboard/admin/users`), fiche de l'élève, encadré rouge
« Supprimer définitivement » tout en bas.

**Nominal**

- L'encadré n'apparaît que pour un élève (jamais prof/admin).
- Fenêtre qui dit ce qui disparaît (compte, progression, messages, fichiers, sans retour) ;
  confirmation en retapant prénom + nom exacts, bouton grisé sinon.
- Même suppression que la page Profil (nettoyage en base, compte, fichiers), journal des
  suppressions avec l'adresse hachée.
- Message de succès, fiche refermée, élève retiré de la liste.

**Limites**

- Admin seulement (élévation comprise) ; le serveur refuse les autres.
- Jamais son propre compte.
- Fichiers non retirés → compte supprimé quand même, le cron hebdomadaire reprend.

**Erreurs**

- Nettoyage en base en échec → rien n'est supprimé, message d'erreur, journal `failed`.
- Élève déjà supprimé → « Élève introuvable ».

**Garder qui a supprimé** (recommandé, validé) : colonne `requested_by` dans
`account_deletion_audit` (null = l'élève lui-même). Question d'accès : personne ne gagne de
lecture (table sans policy, service seul).
