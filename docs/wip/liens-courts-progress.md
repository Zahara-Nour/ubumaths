# Liens courts — journal de progression

## Reprendre ici

_Mis à jour le 2026-10-19, PR 2 ouverte._

- **État** : PR 2 (`feat/liens-courts-route`) ouverte : route `/l/[code]`, `POST /api/short-links`, QR de série par lien court (prof/admin), doc `qr-codes.md`. Revues faites (aucun bloquant).
- **Prochaine action** : CI verte → merge ; puis vérification manuelle (QR scanné au téléphone) et versement du chantier (journal → archive).
- **En attente de David** : rien. Tranché le 2026-10-19 : cibles restreintes aux liens de série (`/automaths/panier?` et `/automaths/test?`), dans Zod seulement (la base garde « chemin interne »).
- **Pièges** : cible en ASCII imprimable seulement. Port 5176/5177 souvent pris par d'autres worktrees : vérifier avec `lsof`.
- **Worktree / branche** : `../ubumaths-wt-liens-courts` · `feat/liens-courts-route`.

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
