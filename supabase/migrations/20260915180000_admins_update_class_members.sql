-- Retirer un élève d'une classe l'ARCHIVE, au lieu de l'effacer
-- =============================================================
--
-- Décision de David, 2026-09-13 : « je veux garder la trace du passage ».
--
-- Aujourd'hui, `api/admin/remove-from-class` fait un DELETE. Sans ligne dans
-- `class_members`, la relecture rétroactive (`had_class_access_to_assignment`)
-- ne rend plus rien : l'ancien élève perd d'un coup les énoncés de TOUT ce
-- qu'on lui avait donné — il garde ses résultats, il perd son classeur.
--
-- Archiver conserve la trace : il relit ce qu'il a reçu pendant son
-- inscription, et la borne `left_at` (migration 20260915160000) l'empêche de
-- recevoir ce qui est distribué après son départ.
--
-- Cette migration ne fait qu'une chose : donner aux admins le droit de mettre
-- à jour une adhésion. Ils n'avaient qu'INSERT et DELETE, si bien qu'archiver
-- leur était impossible.
--
-- ACCÈS — qui pourra lire quoi, qu'il ne pouvait pas lire avant ?
--   Cette policy ne change AUCUNE lecture : elle porte sur UPDATE. Elle ne
--   donne rien à un élève — il n'a toujours aucune policy UPDATE sur cette
--   table, et ne peut donc ni se réactiver, ni déplacer sa date de départ.
--
--   Pour l'admin, c'est un pouvoir strictement PLUS FAIBLE que ce qu'il a
--   déjà : il pouvait supprimer l'adhésion puis la recréer, ce qui produit le
--   même résultat en perdant l'historique au passage.
--
--   L'effet de LECTURE voulu vient du code appelant, pas d'ici : une fois que
--   « retirer » archive au lieu de supprimer, un élève retiré RETROUVE la
--   relecture de ce qu'il avait reçu. C'est la conséquence assumée de la
--   décision du 2026-09-13 — la seule de ce chantier qui rende de l'accès
--   plutôt que d'en retirer. Elle reste bornée : rien après le départ, et
--   extinction douze mois après la fin de l'année scolaire.
--
-- ROLLBACK (additive, sans perte) :
--   -- drop policy if exists "admins_update_class_members" on class_members;
--   Les adhésions déjà archivées le restent : elles redeviennent seulement
--   non modifiables par un admin, comme avant. Aucune donnée perdue. Penser à
--   remettre le DELETE dans `api/admin/remove-from-class` si on revient en
--   arrière côté code, sinon retirer un élève cesserait de fonctionner.

drop policy if exists "admins_update_class_members" on class_members;
create policy "admins_update_class_members"
	on class_members for update to authenticated
	using (is_admin())
	with check (is_admin());
