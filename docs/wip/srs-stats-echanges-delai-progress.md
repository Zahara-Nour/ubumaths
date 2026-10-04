# Statistiques de paquet SRS et délai de confirmation des échanges — progression

Worktree : `../ubumaths-wt-srs-stats`, branche `fix/srs-stats-echanges-delai`.
Migration : `supabase/migrations/20261004230000_srs_stats_echanges_delai.sql` (additive,
rollback complet en commentaire). Tests : `tests/integration/srs-stats-echanges-delai.test.ts`.

## Point 1 — `get_deck_stats` vérifie le paquet

Défaut : la garde du lot 4 vérifiait le compte, pas le paquet ; un élève qui connaissait
l'identifiant du paquet d'un camarade lisait ses compteurs.

Règle : paquet lisible selon les policies SELECT de `srs_decks` (propriétaire ; ou prof/admin
sur la copie `is_assigned` d'un élève qu'il a assignée). Pas de policy SELECT admin sur
`srs_decks` : l'admin suit la même règle.

Inventaire des appelants (tous `locals.supabase`, aucune fonction SQL appelante) :

| Appelant                                                       | Rôle         | Paquet demandé                            |
| -------------------------------------------------------------- | ------------ | ----------------------------------------- |
| `dashboard/revisions/+page.server.ts`                          | tout rôle    | les siens (`owner_id = user.id`)          |
| `dashboard/teacher/srs/decks/+page.server.ts`                  | prof / admin | les siens                                 |
| `api/srs/decks/[id]/+server.ts` (GET)                          | tout rôle    | le sien (relu avec `owner_id`)            |
| `dashboard/teacher/srs/decks/[id]/assignments/+page.server.ts` | prof / admin | copie de l'élève, assignée par l'appelant |

Le dernier lit la copie par `findAssignedDeckCopy` avec le client du prof, donc déjà à
travers la policy « Teachers can view assigned student decks » : couvert.

Test existant ajusté : `rpc-lot4-hygiene.test.ts` appelait `get_deck_stats` avec un paquet
inexistant dans ses témoins ; il utilise désormais des paquets réels (A : le sien ; prof : le
sien, `p_user_id` = B).

## Point 2 — `confirmation_started_at` posée par la base

Décision de David : un élève ne fixe plus cette heure. Extension de
`guard_marketplace_trade_update` (rôles de l'API seulement) : NULL → non NULL = `now()` ;
posée = figée (écrasée en silence par l'ancienne valeur) ; remise à NULL permise.

Code applicatif inchangé : `startConfirmationPhase` (store) envoie encore son heure, acceptée
sans erreur et ignorée ; `/confirm` lit la valeur en base, et sa remise à NULL à l'expiration
passe.

Remarque : le passage NULL → non NULL ne peut avoir lieu que dans l'écriture qui rend les deux
validations vraies (contrainte `validate_timestamps_consistency`), où
`set_trade_validation_timestamp` posait déjà `now()`. Le vecteur réel était la réécriture d'une
heure déjà posée : c'est ce que bloque la migration (preuve rouge ci-dessous).

## Preuves

- Rouge (migration retirée sur copie, `db:reset`) : 5 échecs sur 12 — les 3 refus
  `get_deck_stats` et les 2 « heure posée ne se modifie plus » (2099 / 2000 écrites en base).
- Vert (restaurée depuis la copie, `db:reset`) : 12/12 ; suite complète 168 fichiers,
  2435 tests verts ; `test:definer-guard` 6/6.
- `check:integration-paths` : motif ajouté pour `api/marketplace/trades/*/confirm` (la route
  réelle est importée par le test).

## Reste à faire

- PR, `security-auditor`, puis `db:migrate` (session principale).

## Suite (branche `fix/echanges-delai-confirmation`) — délai de confirmation en base

Deux défauts de la phase de confirmation des échanges.

1. **Délai vérifié par la seule route `/confirm`.** Un élève écrivait `confirmed_by_<lui> = true`
   par PostgREST après les 5 minutes, puis appelait `rpc/execute_trade`. Décision de David
   (2026-10-04) : plus de confirmation après l'expiration. Migration
   `20261004233000_echanges_delai_confirmation` : `guard_marketplace_trade_update` (corps exact
   de `20261004230000`, un bloc ajouté) refuse (42501), pour les rôles de l'API, de passer SA
   confirmation à `true` si `confirmation_started_at` est NULL ou date de plus de
   `interval '5 minutes'`. Constante de la route (`CONFIRMATION_TIMEOUT = 5 * 60 * 1000`)
   vérifiée : même valeur, renvoi croisé en commentaire des deux côtés.
   `execute_trade` inchangée : ses 4 drapeaux ne passent à `true` (rôles de l'API) qu'à
   travers le trigger ; une garde de délai y devrait excepter le flux marché
   (`accept_proposal_atomic` insère sans heure) et refuserait un échange confirmé à temps
   mais exécuté juste après la limite.
2. **Remise à zéro de l'expiration non vérifiée** (route `/confirm`) : `.select('id')`,
   erreur ou 0 ligne → 500 explicite (« l'échange n'a pas pu être réinitialisé ») ; nominal
   inchangé (410).

Preuves :

- Intégration `tests/integration/echanges-delai-confirmation.test.ts` (8 tests). Rouge
  (migration retirée sur copie, `db:reset`) : 4 échecs / 8 — les 4 refus (`expected undefined
to be '42501'`) ; les 4 témoins (confirmation à 4 min, route `/confirm` jusqu'à l'exécution,
  expiration 410, flux marché) passent. Vert (restaurée, `db:reset`) : 8/8 ; suite complète
  169 fichiers, 2443 tests verts.
- Serveur `src/routes/api/marketplace/trades/[id]/confirm/__tests__/confirm-expiration.test.ts`
  (3 tests). Ancienne route : 2 échecs (`expected 410 to be 500`) ; nouvelle : 3/3.

Reste : PR, `security-auditor`, `db:migrate` (session principale).

### Finding d'audit (PR #792) — remise à NULL puis nouvelle phase

Scénario : (1) `confirmation_started_at = null` ; (2) nouvelle heure + sa confirmation ; puis
`execute_trade`. Test écrit d'abord, lancé sur la migration telle quelle : **il passait**.
(1) est refusée par la contrainte : `23514 new row for relation "marketplace_trades" violates
check constraint "validate_timestamps_consistency"` (`validated_at`, figé par la garde, reste
posé) ; (2) est refusée par la garde de délai : `42501 Le délai de confirmation (5 minutes) est
dépassé : revalidez l'offre.` ; `execute_trade` rend `success: false`.

Défense en profondeur ajoutée quand même dans la garde : heure posée → NULL = deux validations
et deux confirmations à false. Flux légitimes vérifiés : seuls `/confirm` (expiration) et
`refuseConfirmation` (store) remettent l'heure à NULL, et envoient déjà les deux validations à
false. Test dédié (« remise à NULL d'une phase posée ») : rouge sans la garde, vert avec.

Preuve rouge complète (migration retirée, `db:reset`) : 6 échecs / 10 ; restaurée : 10/10, les
4 fichiers frères verts (67 tests), suite complète 169 fichiers / 2445 tests.
