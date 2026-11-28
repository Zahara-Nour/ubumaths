-- Boutique d'avatars : le prof retrouve l'emblème du Capitaine
-- ==============================================================================
--
-- Accord de David le 2026-11-11 (docs/wip/boutique-avatars-progress.md).
--
-- Constat : la photo Google du seul profil prof (adresse lh3 `…/a/ACg8ocJr7f…`)
-- répond 200 avec le pictogramme gris « photo indisponible » de Google (PNG 96×96
-- de 800 octets). L'image se charge : `onerror` ne se déclenche pas, et l'appli
-- n'affiche jamais l'emblème par défaut. Une adresse invalide (400) retombe bien
-- sur l'emblème ; sur 8 photos d'élèves testées, aucune ne renvoie ce pictogramme.
--
-- Effet : avatar_url et google_avatar_url du profil prof passent à NULL ; il voit
-- l'emblème du Capitaine. Prod mesurée le 2026-11-11 : 1 profil `teacher`, avec
-- cette adresse dans les deux colonnes, aucun avatar porté ; le profil `admin` n'a
-- aucune photo. Aucun élève touché (filtre sur le rôle ET sur l'adresse).
--
-- QUESTION D'ACCÈS : aucun changement de droit. Personne ne gagne ni ne perd de
-- lecture ; seule la valeur d'une ligne change.
--
-- PERTE (accord de David le 2026-11-11) : l'adresse de la photo Google du prof,
-- qui n'affiche plus que le pictogramme gris. Rien d'autre.
--
-- Ne revient pas par la connexion : le retour OAuth reposerait la photo Google sur
-- un profil sans avatar, mais l'appli n'offre plus la connexion Google (aucun
-- appel à signInWithOAuth) ; handle_new_user ne joue qu'à la création du compte.
--
-- Passe les gardes : la migration s'exécute en `postgres` ;
-- guard_profile_avatar_fields ne refuse qu'à `authenticated` et `anon`, et
-- keep_google_avatar_url ne recopie qu'une photo Google (pas NULL).
--
-- Idempotente : rejouée, elle ne trouve plus de ligne.
--
-- ROLLBACK : aucun utile. L'adresse retirée n'affichait que le pictogramme gris ;
-- une nouvelle photo viendrait d'une reconnexion Google (si elle est rouverte) ou,
-- plus tard, d'un avatar de la boutique.

update public.profiles
set avatar_url = null,
	google_avatar_url = null
where role = 'teacher'
	and worn_avatar is null
	and avatar_url like 'https://lh3.googleusercontent.com/a/ACg8ocJr7f%';
