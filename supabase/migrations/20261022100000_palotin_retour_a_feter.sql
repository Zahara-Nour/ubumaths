-- Palotin « tu m'as manqué » : le retour est mémorisé jusqu'à ce que le Palotin le dise.
--
-- Besoin (décidé par David le 2026-10-21, docs/wip/palotins-presence-progress.md) : la
-- présence de l'élève est notée sur TOUTE page vue (lien de cours partagé, Automaths…),
-- plus seulement sur son tableau de bord. Le retour après 21 jours d'absence est donc
-- souvent détecté loin du Palotin : on garde le jour du retour jusqu'à ce que le Palotin
-- ait dit « tu m'as manqué » (acquitté), ou 7 jours au plus (au-delà, on l'oublie).
--
-- Question d'accès (tranchée par David le 2026-10-21) : PERSONNE de plus. La colonne vit
-- dans `student_last_visits`, lisible par le serveur seul (RLS sans policy, droits retirés
-- à anon et authenticated, migration 20261021210000). Le serveur n'en transmet que
-- « retour à fêter oui/non ».
--
-- Qui gagne quoi : personne. Qui perd quoi : rien (colonne neuve, NULL partout).
--
-- Rollback (sans perte utile : seuls les « tu m'as manqué » en attente sont perdus) :
--   ALTER TABLE public.student_last_visits DROP COLUMN IF EXISTS welcome_back_on;

ALTER TABLE public.student_last_visits
  -- Jour UTC du retour après une longue absence, pas encore fêté par le Palotin ; NULL sinon
  ADD COLUMN welcome_back_on date;

COMMENT ON COLUMN public.student_last_visits.welcome_back_on IS
  'Jour du retour après une longue absence, en attente du « tu m''as manqué » du Palotin : serveur seulement (2026-10-21).';
