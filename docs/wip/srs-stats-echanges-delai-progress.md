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
