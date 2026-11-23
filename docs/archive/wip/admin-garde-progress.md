# Chantier `admin-garde` — routes admin et mode administration

## Reprendre ici

_Mis à jour le 2026-11-12, après #2575._

- **État** : ✅ clos — #2575 mergée (8 routes admin en `requireAdmin`, périmètre de l'élévation élargi, `/api/questions/templates/all` exclu) · **Prochaine action** : aucune · **En attente de David** : `pnpm deploy:prod`, puis supprimer le brouillon doublon `3a7a5711` (« Trouver la largeur d'un rectangle. », 6e) depuis `/dashboard/admin/questions` en mode administration (ligne dans `docs/wip/verifications-manuelles.md`) · **Pièges** : voir « Piège CI » ci-dessous · **Worktree / branche** : supprimés

## Constat (2026-11-11)

- Suppression du brouillon `3a7a5711` depuis l'admin en prod : `DELETE /api/questions/templates/[id]` → 403, deux fois ; rien supprimé.
- Cause : `requireRole(locals, 'admin')` lit le rôle du compte connecté (le prof, `teacher`) ; seul `requireAdmin` lit le mode administration. Et l'élévation n'était calculée que sous `/dashboard/admin`, `/api/admin`, `/dev`.
- 8 routes concernées : `PUT`/`DELETE` d'un modèle, `POST` modèles, `bulk-status`, approbation d'un modèle de message, config des signalements, `errors/bulk-resolve`, `errors/delete-resolved`.

## Décision (David, 2026-11-11)

- Élargir le périmètre de l'élévation à ces préfixes d'API (aucune adresse ni RLS ne change), routes passées à `requireAdmin` + client admin. Rejeté : déplacer sous `/api/admin` ; donner l'écriture des modèles au prof (migration RLS).
- Question d'accès : personne ne gagne d'accès. Le prof **en mode administration** (mot de passe admin saisi) obtient sur ces routes ce que le compte admin avait déjà ; sans élévation, toujours 403.

## Piège CI (2026-11-11)

- Le cliquet des types (`tsgo`) comptait 2 erreurs sur `navadra/combat/[combatId]/+page.server.ts` (fichier non touché) quand le test transversal vivait sous `src/lib/server/middleware/__tests__/` et importait 7 routes par `../../../../routes/api/…`. Prouvé : sans ce test, cliquet tenu ; `origin/main` seul, tenu. Test déplacé sous `src/routes/api/__tests__/routes-admin-elevation.test.ts` → cliquet tenu.
