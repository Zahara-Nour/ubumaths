# Chantier `admin-suppression-eleve`

## Reprendre ici

_Mis à jour le 2026-11-25, PR 1 ouverte._

- **État** : PR 1 (bouton admin « Supprimer définitivement ») ouverte, revues faites (aucun bloquant), essai de bout en bout fait sur le serveur de dev ; audit RGPD de la suppression fait (§ Audit) · **Prochaine action** : merger la PR 1 quand David le dit (déploiement en cours, rien sur `main`), puis `db:migrate` (colonne `requested_by`, additive) ; ensuite PR 2 = corrections RGPD selon ses réponses · **En attente de David** : fin du déploiement ; réponses aux questions de l'audit (§ Audit, « À trancher ») · **Pièges en cours** : migration de la branche déjà jouée sur la base LOCALE de dev (`db:a-jour`) · **Worktree / branche** : `ubumaths-wt-admin-suppression-eleve` / `feat/admin-suppression-eleve`

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

## Audit RGPD de la suppression (security-auditor, 2026-11-25, lecture seule)

Environ 140 tables partent en cascade ou par `delete_user_account` (messages, aperçus, consentements,
carnet, jeux, marché, fichiers des 3 buckets où un élève dépose) : OK. Ce qui RESTE :

1. **Permanent — nom de l'élève chez ses partenaires d'échange** : `execute_trade`
   (`20261004190000_echanges_garde_base.sql` l. 697, 708, 776, 780) recopie « Prénom Nom » dans
   `vip_cards_activity.metadata` (`traded_to_name`, `received_from_name` + uuid) et
   `gidouilles_activity.reason` (« Donné à / Reçu de … ») du partenaire. Prod : 172 + 84 lignes.
2. **Permanent — `account_deletion_audit`** : `cleanup_account_deletion_audit()` (purge à 1 an)
   n'est appelée par rien ; garde IP, navigateur, empreinte SHA-256 sans sel de l'adresse
   (retrouvable par dictionnaire) ; lignes `failed` / `rate_limited` gardent `user_id`.
3. **60 jours — `audit_logs`** : instantané complet du profil à sa création (adresse, prénom, nom)
   par `audit_trigger_func` (`20260902107000…:50`), `record_id` = l'élève.
4. **30 jours — notifications** qui citent son nom (signalement d'erreur au prof, échange aux
   partenaires) et celles qui le visent.
5. À signaler : `error_logs` 30 j (`user_id` à null) ; ids orphelins sans nom
   (`srs_deck_assignments.assigned_to` sans FK, `game_combats.*_player_ids`,
   `message_drafts.recipient_ids`, `school_year_closures.class_member_ids`) ; preuve de
   consentement parental effacée avec le compte ; courriels déjà envoyés et sauvegardes Supabase
   hors de portée (à dire dans la politique de confidentialité).
6. Non examiné : textes libres du prof (`class_journal_entries`, `rag_*`) et messages d'autres
   élèves qui citeraient l'élève.

Revue de sécurité de la PR 1 : le prof élevé n'apparaît pas dans `requested_by` (c'est l'id du
compte admin, pas `elevatedBy`).

### À trancher par David

- A. Échanges (1) : remplacer le nom par « Élève supprimé » dans l'historique des partenaires à la
  suppression, et arrêter de recopier le nom (affichage par jointure) ?
- B. Journal des suppressions (2) : purge à 1 an branchée, IP et navigateur effacés dès la
  suppression terminée ; empreinte de l'adresse salée, ou effacée elle aussi au bout d'un an ?
- C. `audit_logs` et notifications (3, 4) : effacés par `delete_user_account` ?
- D. Consentement parental (5) : garder une preuve minimale (date + empreinte) après suppression ?
