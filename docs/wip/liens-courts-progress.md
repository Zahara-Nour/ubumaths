# Liens courts — journal de progression

## Reprendre ici

_Mis à jour le 2026-10-19, après #1539._

- **État** : chantier livré côté code. #1537 (migration, jouée en prod) et #1539 (route `/l/[code]`, `POST /api/short-links`, QR de série par lien court, cibles limitées aux séries) mergées, pas encore déployées. Doc durable : `docs/systeme/qr-codes.md`.
- **Prochaine action** : après le `deploy:prod` de David, vérification manuelle (ligne #1539 de `verifications-manuelles.md`), puis versement : archiver ce journal et `liens-courts-phase0.md` dans `docs/archive/`.
- **En attente de David** : la vérification au téléphone, après déploiement.
- **Pièges** : cible = lien de série seulement (`SERIES_TARGET`, Zod) ; la base n'exige qu'un chemin interne. Un nouvel usage (atelier public) ajoutera son préfixe.
- **Worktree / branche** : aucun (supprimés après #1539).

## Historique

### 2026-10-19 — PR 2, route et QR

- `db:types` ; `short_links` classée dans « Outils du professeur » (`generate-db-doc.ts`).
- Serveur : validation Zod partagée (`src/lib/validation/short-link.ts`), `POST /api/short-links`, `/l/[code]` (302, `X-Robots-Tag: noindex`, 404 identique inconnu / mal formé, cible relue revalidée). Code écrit avant les tests : rouge prouvé par mutation (garde `//`/`\` et revalidation retirées → 5 rouges).
- Client : `QrCodeButton` `resolveUrl` (adresse fabriquée à l'ouverture, réponse périmée ignorée — rouge prouvé sans la garde), `SeriesLinkShare` réservé prof/admin.
- Vérifié sur serveur local (5178) : 302 + noindex, 404 « Ce lien n’existe pas », POST anonyme 401. Parcours prof non joué en local (pas de session prof sans toucher aux mots de passe partagés) → vérification manuelle.
- Revues : `code-reviewer` (3 mineurs : 2 corrigés, 1 noté — en échec, le lien long se copie après fermeture de la fenêtre) ; `security-auditor` (0 bloquant ; notes : cibles vers toute route interne, pas de limite de débit sur `/l/`, corps sans plafond applicatif).

### 2026-10-19 — PR 1, migration

- Tests d'abord : `tests/integration/liens-courts.test.ts`, 19 rouges (`PGRST202`/`PGRST205`) sans la migration, puis verts.
- Migration appliquée en local par `psql`, sans `db:reset`.
- Revues : cible restreinte à l'ASCII imprimable (l'Unicode ferait planter l'en-tête `Location` et permet `/∕hote`) ; tests renforcés (comptage par cible, 42501 pour l'anonyme, filet de la table au client service). Les trois cas Unicode vérifiés rouges avec l'ancienne regex.
- Garde SECURITY DEFINER : deux entrées ajoutées. Vérifié que le garde échoue sans l'entrée `create_short_link`.
- #1537 mergée, `db:migrate` joué depuis `main`, droits vérifiés en prod par le MCP.
