# Chantier `admin-garde` — routes admin et mode administration

## Reprendre ici

_Mis à jour le 2026-11-11, à l'ouverture de la PR._

- **État** : 8 routes passées à `requireAdmin` + périmètre de l'élévation élargi, PR ouverte · **Prochaine action** : revue code + sécurité, CI verte → merge · **En attente de David** : `deploy:prod`, puis supprimer le brouillon `3a7a5711` depuis `/dashboard/admin/questions` (ou me le redemander) · **Pièges** : `requireAdmin` lit `locals.user`/`locals.profile` (posés par les hooks), pas `safeGetSession` · **Worktree / branche** : `../ubumaths-wt-admin-garde` / `fix/admin-garde-elevation`

## Constat (2026-11-11)

- Suppression du brouillon `3a7a5711` depuis l'admin en prod : `DELETE /api/questions/templates/[id]` → 403, deux fois ; rien supprimé.
- Cause : `requireRole(locals, 'admin')` lit le rôle du compte connecté (le prof, `teacher`) ; seul `requireAdmin` lit le mode administration. Et l'élévation n'était calculée que sous `/dashboard/admin`, `/api/admin`, `/dev`.
- 8 routes concernées : `PUT`/`DELETE` d'un modèle, `POST` modèles, `bulk-status`, approbation d'un modèle de message, config des signalements, `errors/bulk-resolve`, `errors/delete-resolved`.

## Décision (David, 2026-11-11)

- Élargir le périmètre de l'élévation à ces préfixes d'API (aucune adresse ni RLS ne change), routes passées à `requireAdmin` + client admin. Rejeté : déplacer sous `/api/admin` ; donner l'écriture des modèles au prof (migration RLS).
- Question d'accès : personne ne gagne d'accès. Le prof **en mode administration** (mot de passe admin saisi) obtient sur ces routes ce que le compte admin avait déjà ; sans élévation, toujours 403.
