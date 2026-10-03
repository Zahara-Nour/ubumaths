-- Mémoire de révision écrite par le serveur seul (Q171, décision de David)
--
-- Question d'accès tranchée : l'élève ne peut plus créer, modifier ni supprimer
-- sa mémoire de révision (`srs_card_stats`) par un appel direct à l'API de la
-- base. Il continue de la LIRE ; le professeur garde sa lecture des statistiques
-- des paquets qu'il a assignés. Personne ne gagne d'accès.
--
-- Avant : policies INSERT / UPDATE / DELETE « own » (auth.uid() = user_id) pour
-- le rôle public, et GRANT ALL à anon / authenticated → un élève pouvait, avec
-- son propre jeton, se reprogrammer une carte dans un an, effacer son historique
-- ou se fabriquer des révisions.
--
-- Écrivains légitimes (tous serveur) : `upsertCardStats` (src/lib/server/srs/
-- fsrs-actions.ts), au client SERVICE depuis la PR du même nom, et
-- `/api/srs/decks/[id]/assign` (déjà au client service). Aucune fonction ni
-- trigger SQL n'écrit dans la table ; la cascade ON DELETE depuis `profiles`
-- (suppression de compte) s'exécute avec les droits du propriétaire de la table
-- et n'est pas concernée.
--
-- ORDRE DE LIVRAISON : le code au client service fonctionne avec ou sans cette
-- migration → code d'abord (merge + déploiement), migration ensuite.
--
-- Additive : aucune policy supprimée, aucune donnée touchée. SELECT inchangé.
--
-- ROLLBACK (état prod relevé le 2026-10-03 : policies `TO public`, et sur la
-- table anon/authenticated = SELECT, INSERT, UPDATE, DELETE, REFERENCES,
-- TRIGGER, MAINTAIN) :
--
--   ALTER POLICY "Users can create their own card stats" ON public.srs_card_stats TO public;
--   ALTER POLICY "Users can update their own card stats" ON public.srs_card_stats TO public;
--   ALTER POLICY "Users can delete their own card stats" ON public.srs_card_stats TO public;
--   GRANT INSERT, UPDATE, DELETE ON TABLE public.srs_card_stats TO anon, authenticated;

-- 1. Les policies d'écriture ne s'appliquent plus qu'au rôle service
--    (qui contourne de toute façon la RLS : la clause documente l'intention et
--    neutralise la policy pour tout autre rôle).
ALTER POLICY "Users can create their own card stats" ON public.srs_card_stats TO service_role;
ALTER POLICY "Users can update their own card stats" ON public.srs_card_stats TO service_role;
ALTER POLICY "Users can delete their own card stats" ON public.srs_card_stats TO service_role;

-- 2. Le privilège lui-même : sans lui, l'écriture directe sort en 42501
--    (erreur explicite) au lieu de 0 ligne silencieuse.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.srs_card_stats FROM anon, authenticated;
