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
- [ ] PR de code : supprimer les routes offers / accept et la modale (point e).
