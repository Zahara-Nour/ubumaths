# Échanges de cartes : garde en base — suivi

Branche `fix/echanges-garde-base`, worktree `../ubumaths-wt-echanges`.

## Faille (audit du 2026-10-04)

Un élève A pouvait voler les cartes et les gidouilles d'un élève B : créer un échange avec B,
écrire `current_offer.from_partner` (les biens de B), appeler `rpc/execute_trade`. La fonction ne
regardait ni validations ni confirmations ; la policy UPDATE laissait réécrire toute la ligne ;
l'INSERT ne vérifiait ni amitié ni école ; le DELETE effaçait l'historique.

## Décisions de David (2026-10-04)

- Question d'accès : chaque élève ne modifie que sa moitié de l'offre, sa validation, sa
  confirmation, ou annule ; exécution seulement après validation puis confirmation des deux ;
  ni partenaire ni statut « terminé » à la main ; création entre élèves autorisés ; plus de
  suppression.
- a) remettre à FALSE la validation / confirmation de l'autre : permis ; à TRUE : jamais.
- b) `confirmation_started_at` libre ; `validated_at` reste au trigger existant.
- c) offre dont la moitié de l'autre change : REFUSÉE ; offre changée → validation de l'autre et
  toutes les confirmations à false, celle de l'auteur inchangée.
- d) `accept_proposal_atomic` pose les 4 drapeaux ; `execute_trade` les exige sans exception ;
  INSERT élève = `friend` seulement, drapeaux à false ; `trade_type`, `listing_id`,
  `proposal_id` figés.
- e) routes `trades/[id]/offers` et `trades/[id]/accept` (modale `TradeNegotiationModal`) :
  laissées refusées par la base. **À faire : PR de code séparée pour les supprimer** (offers
  écrit les deux moitiés au format `initiator_cards…`, accept exécute sans drapeaux).
- f) création : amis (amitié acceptée) ET même école. Marché activé et quotas laissés à la route.

## Fait

- [x] Étape 0 : inventaire des chemins d'écriture (store, routes, RPC).
- [x] Migration `supabase/migrations/20261004190000_echanges_garde_base.sql` (additive,
      rollback complet en commentaire avec les deux corps précédents).
- [x] Tests `tests/integration/marketplace-trades-garde.test.ts` (13 cas).
- [x] Preuve rouge : sans la migration, 11 rouges sur 13 (les 2 flux marché restent verts :
      ce sont des tests de non-régression).
- [x] Vert avec la migration.

## Ajouts au-delà de la lettre des décisions (à signaler)

- Une validation retirée remet aussi les deux confirmations à false (sinon une confirmation
  d'un tour refusé survivait au tour suivant).
- Sa propre confirmation exige les deux validations.
- Moitié d'offre contrôlée : gidouilles entières ≥ 0 (une valeur négative faisait payer
  l'autre à l'exécution), cartes = liste de chaînes.
- Échange `completed` / `cancelled` : plus aucune écriture élève.

## Reste

- [ ] Revue `security-auditor`.
- [ ] PR, CI, `db:migrate` (David / session principale), `db:types`.
- [ ] PR de code séparée : supprimer les routes `trades/[id]/validate`, `trades/[id]/offers`,
      `trades/[id]/accept` et la modale `TradeNegotiationModal` (point e). Ne pas les toucher
      dans cette PR.
- [ ] Prod, avant ou juste après `db:migrate` : lancer les deux requêtes de lecture
      ci-dessous (MCP read-only) et décider de la suite avec David. Aucune mise à jour de
      données dans la migration.

## Compléments après audit (2026-10-04)

- Preuve que les 4 drapeaux d'`accept_proposal_atomic` sont nécessaires : sans eux (garde
  d'`execute_trade` conservée), le test « flux marché » passe au rouge
  (`{ success: false }` au lieu de `{ success: true }`) ; vert une fois restauré.
- Gidouilles : le trigger exige un entier écrit sans point ni signe (`^[0-9]{1,9}$` sur
  `->>`). `5.0` passait le contrôle numérique mais casse `::INTEGER` dans `execute_trade`
  (jsonb garde l'échelle). `5e0` et `-0` sont rangés par jsonb en `5` et `0`, donc sans risque.
- Tests ajoutés : vider la moitié de l'autre (y compris `current_offer` à NULL), clé de
  premier niveau en trop, moitié JSON `null`, gidouilles non entières, appel anonyme.
- `REVOKE EXECUTE … execute_trade FROM PUBLIC, anon` + `GRANT … TO authenticated,
service_role`, explicites. État déjà en place en local (anon sans EXECUTE), à confirmer en
  prod. Aucun chemin légitime en anon : `/confirm` et `/accept` utilisent le client élève ;
  l'acceptation automatique passe par `auto_accept_exact_proposal` (client service) puis
  `accept_proposal_atomic`, qui appelle `execute_trade` en tant que postgres.

## `cleanup_stale_trades` : qui l'appelle ?

- Aucun `cron.schedule` dans `supabase/migrations/` : s'il est planifié en prod, c'est hors
  dépôt (pg_cron créé au Dashboard). À vérifier en lecture :
  `select jobid, jobname, schedule, command, active from cron.job where command ilike '%stale_trades%';`
- Déclenchement manuel par l'admin : page `dashboard/admin/cron` → `POST
/api/admin/cron/trigger` (`rpc:cleanup_stale_trades`, liste blanche
  `src/lib/server/validation/cron.ts`), via le client service.
- EXECUTE retiré à PUBLIC, anon et authenticated par `20261003180000_rpc_lot2_maintenance_prof`.
- Fonction SECURITY DEFINER (postgres) : le nouveau trigger la laisse passer. Elle annule les
  échanges `negotiating` inactifs depuis 30 min.

## Requêtes de LECTURE pour la prod (à lancer via le MCP read-only, rien d'autre)

Échanges en négociation avec au moins un drapeau déjà vrai (posés avant la garde, donc
possiblement par l'autre élève) :

```sql
select id, trade_type, created_at, updated_at,
       validated_by_initiator, validated_by_partner,
       confirmed_by_initiator, confirmed_by_partner,
       validated_at, confirmation_started_at
from public.marketplace_trades
where status = 'negotiating'
  and (validated_by_initiator or validated_by_partner
       or coalesce(confirmed_by_initiator, false) or coalesce(confirmed_by_partner, false))
order by updated_at desc;
```

Échanges entre amis terminés sans validation et confirmation complètes (exécutions
suspectes), avec le nombre et les dates, ids seulement :

```sql
select count(*) over () as total,
       id, created_at, completed_at,
       validated_at is null as sans_validated_at,
       coalesce(confirmed_by_initiator, false) as confirme_initiateur,
       coalesce(confirmed_by_partner, false) as confirme_partenaire
from public.marketplace_trades
where trade_type = 'friend'
  and status = 'completed'
  and (validated_at is null
       or coalesce(confirmed_by_initiator, false) = false
       or coalesce(confirmed_by_partner, false) = false)
order by completed_at desc;
```

⚠️ `validated_at` n'est rempli que si les deux validations étaient vraies au même moment
(trigger `set_trade_validation_timestamp`). Une ligne de la seconde requête n'est donc pas
une preuve de vol : c'est une ligne à examiner (le contenu de `final_trade` dit ce qui a
changé de main).
