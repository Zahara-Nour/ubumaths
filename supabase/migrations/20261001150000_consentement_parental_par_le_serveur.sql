-- Consentement parental : accordé par le serveur seul
-- ===================================================
--
-- Faille : grant_parental_consent(p_token, p_ip, p_user_agent) était exécutable
-- par anon et authenticated. Quiconque détenait le lien de consentement pouvait
-- donc appeler la fonction directement (clé anon publique) et inscrire l'adresse IP
-- et le navigateur de son choix dans la preuve RGPD du consentement.
--
-- Correctif : seul service_role l'exécute. La page /consent/[token] l'appelle avec
-- le client service, en lui passant l'IP et le navigateur de la requête reçue par
-- le serveur. Le parent ne voit aucune différence.
--
-- Qui perd quoi : anon et les comptes connectés ne peuvent plus appeler la fonction
-- directement par l'API. get_consent_info (lecture de la page) reste inchangée.
-- Aucune donnée touchée.
--
-- ROLLBACK :
--   grant execute on function public.grant_parental_consent(uuid, inet, text) to anon, authenticated;

revoke execute on function public.grant_parental_consent(uuid, inet, text) from public, anon, authenticated;

grant execute on function public.grant_parental_consent(uuid, inet, text) to service_role;
