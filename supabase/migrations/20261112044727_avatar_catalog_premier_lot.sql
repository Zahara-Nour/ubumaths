-- Boutique d'avatars, premier lot : 21 avatars (3 par famille)
-- =============================================================
--
-- Données seulement : aucune table, aucun droit, aucune policy ne change.
-- Question d'accès (tranchée par David le 2026-11-06) : le catalogue est lisible
-- par tout utilisateur connecté ; ces lignes n'ouvrent rien de plus.
--
-- Prix : paliers validés (Q3) — courant 15, recherché 30, rare 60.
-- Images : static/avatars/<key>.webp (pnpm avatars:convertir).
-- Les cadres viendront dans leur propre PR (colonne propagée partout, Q1).
--
-- Rollback (seulement si personne n'a encore acheté l'un d'eux : la clé
-- étrangère de student_avatars est en RESTRICT) :
--   delete from public.avatar_catalog
--   where key in ('green_candle', 'phynance_hook', 'colander_boat',
--     'galopine_braids', 'galopin_curly', 'galopin_glasses',
--     'cube_cow', 'dodecahedron_sheep', 'tetrahedron_goat',
--     'mustached_pi', 'infinity_caterpillar', 'mobius_ribbon',
--     'red_puppet', 'gidouille_jester', 'czar_puppet',
--     'lithuanian_bear', 'scholar_owl', 'palotin_fox',
--     'calculating_automaton', 'mechanical_nightingale', 'steam_cat');

insert into public.avatar_catalog (key, family, name, price, image_path, sort_order)
values
	('green_candle', 'emblem', 'La Chandelle verte', 15, '/avatars/green_candle.webp', 10),
	('phynance_hook', 'emblem', 'Le Croc à phynances', 15, '/avatars/phynance_hook.webp', 20),
	('colander_boat', 'emblem', 'Le Bateau-passoire', 15, '/avatars/colander_boat.webp', 30),

	('galopine_braids', 'galopin', 'La Galopine aux tresses', 30, '/avatars/galopine_braids.webp', 10),
	('galopin_curly', 'galopin', 'Le Galopin bouclé', 30, '/avatars/galopin_curly.webp', 20),
	('galopin_glasses', 'galopin', 'Le Galopin à lunettes', 30, '/avatars/galopin_glasses.webp', 30),

	('cube_cow', 'polyhedron', 'Le Cube-vache', 30, '/avatars/cube_cow.webp', 10),
	('dodecahedron_sheep', 'polyhedron', 'Le Dodécaèdre-mouton', 30, '/avatars/dodecahedron_sheep.webp', 20),
	('tetrahedron_goat', 'polyhedron', 'Le Tétraèdre-chèvre', 30, '/avatars/tetrahedron_goat.webp', 30),

	('mustached_pi', 'creature', 'Le Pi moustachu', 15, '/avatars/mustached_pi.webp', 10),
	('infinity_caterpillar', 'creature', 'L''Infini-chenille', 15, '/avatars/infinity_caterpillar.webp', 20),
	('mobius_ribbon', 'creature', 'Le Ruban de Möbius', 15, '/avatars/mobius_ribbon.webp', 30),

	('red_puppet', 'puppet', 'Le Pantin rouge', 30, '/avatars/red_puppet.webp', 10),
	('gidouille_jester', 'puppet', 'Le Bouffon à gidouille', 30, '/avatars/gidouille_jester.webp', 20),
	('czar_puppet', 'puppet', 'Le Pantin du Czar', 30, '/avatars/czar_puppet.webp', 30),

	('lithuanian_bear', 'animal', 'L''Ours de Lituanie', 30, '/avatars/lithuanian_bear.webp', 10),
	('scholar_owl', 'animal', 'Le Hibou savant', 30, '/avatars/scholar_owl.webp', 20),
	('palotin_fox', 'animal', 'Le Renard palotin', 30, '/avatars/palotin_fox.webp', 30),

	('calculating_automaton', 'automaton', 'L''Automate calculateur', 60, '/avatars/calculating_automaton.webp', 10),
	('mechanical_nightingale', 'automaton', 'Le Rossignol mécanique', 60, '/avatars/mechanical_nightingale.webp', 20),
	('steam_cat', 'automaton', 'Le Chat à vapeur', 60, '/avatars/steam_cat.webp', 30)
on conflict (key) do nothing;
