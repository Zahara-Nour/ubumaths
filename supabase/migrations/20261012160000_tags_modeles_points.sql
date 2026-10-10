-- ============================================================================
-- Tags modèles → points du programme : les 473 liens neufs, et les deux règles de tag en base
-- ============================================================================
-- Étape 2 de C5 (ADR 0020 § 7, précisée par David le 2026-10-09). Source : l'état final
-- consolidé — lot de l'étape 2, crible et audit des facettes VALIDÉS par David le 2026-10-09
-- (docs/wip/arbre-notions/c5-transfert-liens.md et .csv) ; phase 0 (comportements) et décision
-- (a) VALIDÉES par David le 2026-10-10 (« comportements validés ; a) »). Fichier généré ; copie
-- figée de ses tags : tests/integration/fixtures/tags-modeles-points.json.
--
--   * 473 tags modèle → point NEUF, sur 420 modèles (1_SPE : 177, 2 : 52, T_COMP : 65, T_EXP : 57, T_SPE : 122) ;
--   * les anciens tags (points sans nœud) restent tels quels jusqu'à l'étape 4 de C5 ;
--   * les deux générations de points s'excluent (contrainte curriculum_points_one_generation) : un point
--     porte un objectif (ancien) OU un nœud de l'arbre (neuf), jamais les deux, jamais aucun ;
--   * deux RÈGLES posées en base, par triggers, pour tout point NEUF (`node_id` non nul ; un
--     ancien point, sans nœud, est exempté) :
--       règle 1 — le point est sur le nœud du modèle, ou sur la notion de ce nœud ; pour un
--                 exercice, sur l'un de ses nœuds ou sur leur notion ;
--       (a)     — un modèle sans nœud, un exercice sans rangement, ne reçoit pas de point neuf :
--                 on le range d'abord ;
--       règle 2 — un modèle a au plus UN point neuf par programme, même en écritures simultanées
--                 (verrou consultatif de transaction, un par modèle), en READ COMMITTED — le mode
--                 de PostgREST, de supabase-js et de pg ; pas de règle 2 pour un exercice, qui
--                 porte plusieurs points ;
--     et toute écriture qui casserait un tag neuf existant est refusée : déplacer un modèle (ou
--     lui retirer son nœud), re-rattacher un point (ou changer son programme, ou donner un nœud
--     à un ancien point), changer de notion une sous-notion, retirer ou déplacer le rangement
--     d'un exercice.
--   * Écritures simultanées entre tables : le point d'un tag est lu verrouillé (3a, 3e) ; un
--     modèle déplacé verrouille les points qu'il porte (3b) ; un point re-rattaché verrouille
--     les modèles qui le portent, et prend le verrou consultatif des exercices qui le portent
--     (3c, celui de 3e et 3f). L'une des deux écritures attend l'autre, puis voit son résultat.
--     Si les deux se croisent exactement, Postgres détecte l'interblocage et annule l'une d'elles
--     (un refus : la règle tient). Reste ouverte : une sous-notion re-parentée (3d) en même
--     temps qu'un tag ou qu'un rangement sur elle.
--
-- Accès : AUCUN changement (question posée à David et tranchée le 2026-10-10) — les nouveaux
-- tags se lisent comme les anciens, par les mêmes personnes.
-- Fonctions de trigger SECURITY INVOKER (le choix INVOKER / SECURITY DEFINER reste à trancher par
-- David) : elles lisent avec les droits de l'appelant, et une ligne que la RLS lui masque ne lève
-- pas d'erreur. Selon la requête, elle fait refuser ou elle passe sans être vérifiée :
--   * le point d'un tag (3a, 3e) est lu verrouillé ; masqué, le tag est refusé ;
--   * les gardes 3b, 3c, 3d et 3f ne vérifient pas un modèle, un tag ou un rangement masqué.
-- Pour les modèles, pas de trou : le prof et l'admin (seuls à taguer et à re-rattacher un point)
-- et l'admin (seul à déplacer un modèle) voient tous les modèles et tous les tags. Pour les
-- exercices, un trou : un exercice privé du prof est invisible de l'admin. Une sous-notion
-- re-parentée par l'admin (3d) ne vérifie donc pas les exercices privés rangés sur elle ; un point
-- re-rattaché par l'admin (3c) les voit sans rangement, et refuse.
-- Un verrou FOR SHARE exige en outre le droit de MODIFIER la ligne : masquée par la RLS de
-- modification, elle n'est pas verrouillée (sans erreur) ; la vérification reste juste, mais la
-- course n'est fermée que pour un appelant qui peut modifier (pour les modèles : l'admin).
-- Effets acceptés par David :
--   * les états d'acquisition des élèves sur les points neufs se calculent aux PROCHAINES
--     tentatives (trigger d'acquisition existant), sur tout leur historique ; aucune page ne les
--     montre avant la bascule du code (étape 3), seul l'export RGPD de l'élève les contient ;
--   * un point neuf tagué ne se supprime plus (clé étrangère RESTRICT, comme les anciens).
-- Aucune donnée d'élève n'est écrite par cette migration.
--
-- Les modèles n'existent qu'en production : en base locale, la migration pose les règles et
-- n'écrit aucun tag ; elle exige pour les modèles TOUT ou RIEN (420 ou 0). Les gardes
-- passent AVANT toute écriture, définitions comprises.
--
-- ⚠️ Ne JAMAIS jouer ce fichier hors d'une transaction : `pnpm db:migrate` (supabase db push)
-- l'exécute en une seule transaction ; en autocommit, l'atomicité ne tient plus.
--
-- Rollback — ⚠️ DESTRUCTIF : il retire les 473 tags de cette migration, la contrainte des deux
-- générations, puis les triggers et les fonctions des règles, et vérifie ses comptes. TOUT ou
-- RIEN : il refuse si une partie seulement des 473 tags est encore présente (un tag retiré
-- depuis) ; un tag retiré puis reposé à l'identique ne se distingue pas des autres et part avec
-- eux. Un tag neuf posé depuis, hors des 473, reste en place — sans règle pour le garder.
-- Les états d'acquisition des élèves (`student_point_state`) calculés entre-temps sur les points
-- neufs RESTENT : ce sont des données d'élèves, et les purger serait une décision destructive à
-- part, soumise à David.
-- Avant de l'exécuter : appliquer la règle CLAUDE.md des migrations destructives (arrêt,
-- explication en français, décision de David). À jouer dans une transaction (begin; … commit;),
-- en retirant les « -- » du bloc :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- create temporary table _tgr_tags (template_id uuid not null, code text not null, grade text not null, primary key (template_id, code));
-- insert into _tgr_tags (template_id, code, grade) values
-- 	('0113c53d-ee4a-4da9-9327-537461ffdc85', '1SPE-287', '1_SPE'),
-- 	('0140fdfa-1066-4885-b0ab-c597ff503283', '1SPE-274', '1_SPE'),
-- 	('03b3d9b3-2d38-4062-a70b-c9b31839444b', '1SPE-283', '1_SPE'),
-- 	('0417223e-923d-4ae2-b25c-89b60f4c7631', '1SPE-351', '1_SPE'),
-- 	('044a3ae3-c54a-4521-9265-3997fcc6b0d2', '1SPE-323', '1_SPE'),
-- 	('046ee43f-2f1d-4563-96cb-ff96d68c7fbf', 'TEXP-274', 'T_EXP'),
-- 	('0495289a-abb1-4fed-b058-5e924a5f05ed', '1SPE-223', '1_SPE'),
-- 	('04ec9518-1d43-461c-beb0-aa38d62b6835', 'TCOMP-230', 'T_COMP'),
-- 	('04ec9518-1d43-461c-beb0-aa38d62b6835', 'TSPE-415', 'T_SPE'),
-- 	('05387201-2403-409a-8ebe-5898b6e77e3c', '1SPE-272', '1_SPE'),
-- 	('0718f490-bfdd-4a62-b78f-b15753c27d8a', '1SPE-358', '1_SPE'),
-- 	('07bce646-6a88-4b7c-aaf6-fe07ffa63ed6', 'TSPE-382', 'T_SPE'),
-- 	('0808e518-9aa6-4241-85b0-5132033fe3c8', 'TSPE-372', 'T_SPE'),
-- 	('08f9ad7b-7885-474f-b0a1-630a8847140e', 'TCOMP-265', 'T_COMP'),
-- 	('08f9ad7b-7885-474f-b0a1-630a8847140e', 'TSPE-420', 'T_SPE'),
-- 	('0943e867-e639-45f5-939d-df7492d0ecaf', 'TSPE-530', 'T_SPE'),
-- 	('0965c56c-7808-4698-8c1f-8124d3a6505d', 'TSPE-309', 'T_SPE'),
-- 	('09f0c9ec-70ea-4b90-a949-7c6154e91104', '2-347', '2'),
-- 	('0a1ff14f-ac73-4b9e-ab4c-a4d465c78e76', '2-207', '2'),
-- 	('0a2d3681-eb19-43db-89e9-762c406d9db4', 'TSPE-454', 'T_SPE'),
-- 	('0ab3faa5-a660-4841-9a5f-6563458d2489', '1SPE-204', '1_SPE'),
-- 	('0ab3faa5-a660-4841-9a5f-6563458d2489', '2-211', '2'),
-- 	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', '1SPE-224', '1_SPE'),
-- 	('0b686e01-725c-448d-9e10-b295cf9b4128', '1SPE-237', '1_SPE'),
-- 	('0bde6091-c122-46c0-94d5-a97cdde28d9d', 'TSPE-312', 'T_SPE'),
-- 	('0d2edda7-1d90-46ee-b07d-792ebbd43849', '2-261', '2'),
-- 	('0dee4515-8030-441c-bd7c-f1b7418e664b', '1SPE-245', '1_SPE'),
-- 	('0fbe194d-003b-4407-8486-10b0141530a7', 'TEXP-295', 'T_EXP'),
-- 	('0feeabaf-e90d-45a1-b5f1-997b3da067a7', 'TSPE-319', 'T_SPE'),
-- 	('10393ff9-b797-4557-a841-6e0b4e18c52b', 'TCOMP-220', 'T_COMP'),
-- 	('10393ff9-b797-4557-a841-6e0b4e18c52b', 'TSPE-425', 'T_SPE'),
-- 	('119b9148-e95b-4865-b0d4-52f0cf264de2', 'TSPE-345', 'T_SPE'),
-- 	('1239554b-d442-4be6-8867-d9dc38311999', '1SPE-223', '1_SPE'),
-- 	('1277a5b6-b979-4e3b-b5b6-e10aedfbedfb', 'TSPE-345', 'T_SPE'),
-- 	('1315d326-1a4b-4abc-af93-f8ab9aeecc66', '1SPE-213', '1_SPE'),
-- 	('1338da34-00a6-4500-97fc-fcece9514ae6', '2-262', '2'),
-- 	('13e2d419-770b-4e97-a2f8-972d467cf2fc', 'TCOMP-298', 'T_COMP'),
-- 	('13e2d419-770b-4e97-a2f8-972d467cf2fc', 'TSPE-516', 'T_SPE'),
-- 	('14036c68-6854-422b-b06d-3890b3745573', 'TCOMP-238', 'T_COMP'),
-- 	('14036c68-6854-422b-b06d-3890b3745573', 'TSPE-446', 'T_SPE'),
-- 	('158ecaa4-7fa7-4313-a6be-bf60fc538ab6', '1SPE-212', '1_SPE'),
-- 	('15d3aaa0-5eef-4c08-a38c-5b5c8d5ed6e1', '1SPE-289', '1_SPE'),
-- 	('1602c40d-818f-4218-beb9-0d7f116992a4', '1SPE-332', '1_SPE'),
-- 	('164edf6b-d68c-4a19-8f81-1a0d596496a4', 'TCOMP-279', 'T_COMP'),
-- 	('164edf6b-d68c-4a19-8f81-1a0d596496a4', 'TSPE-490', 'T_SPE'),
-- 	('1666b8e9-8225-4e66-8b8c-4d5190806ed1', '1SPE-266', '1_SPE'),
-- 	('17f35a67-b665-4c4c-9ebf-f0b413ca43d9', 'TCOMP-323', 'T_COMP'),
-- 	('17f64f63-9af0-48ea-96b1-a74e0bef16f4', '1SPE-281', '1_SPE'),
-- 	('1820cab8-ab88-4365-bc13-d44c5e234c49', 'TEXP-339', 'T_EXP'),
-- 	('18855802-b8e9-4fff-bfa8-256cc4d50c31', 'TSPE-456', 'T_SPE'),
-- 	('18e26873-dca0-4c73-bc23-f181e0164a66', '1SPE-244', '1_SPE'),
-- 	('18ff6a91-3e94-4391-81a8-037af4ce1470', 'TEXP-241', 'T_EXP'),
-- 	('19961e67-88c4-43bf-a76b-6a2af61dedf3', '1SPE-237', '1_SPE'),
-- 	('1a57c0a4-8992-4c3f-8ca7-f1a7ce9320dc', 'TCOMP-224', 'T_COMP'),
-- 	('1a57c0a4-8992-4c3f-8ca7-f1a7ce9320dc', 'TSPE-438', 'T_SPE'),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', '1SPE-287', '1_SPE'),
-- 	('1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', '1SPE-244', '1_SPE'),
-- 	('1bbfa5f2-1c32-4a81-92cf-b9e7c5996977', '1SPE-219', '1_SPE'),
-- 	('1c443c35-ef93-4dc5-8635-b7ddcea32b77', '2-377', '2'),
-- 	('1c65d58e-8596-4e11-b917-6c8a86d8ef0f', 'TCOMP-326', 'T_COMP'),
-- 	('1cfc575d-e122-406d-9b4e-60556d3260a5', '2-399', '2'),
-- 	('1ebd1c86-7970-49c9-a373-74ba4d71d9ec', 'TCOMP-209', 'T_COMP'),
-- 	('1ebd1c86-7970-49c9-a373-74ba4d71d9ec', 'TSPE-402', 'T_SPE'),
-- 	('1f88d29a-086b-4fc9-9b28-debca396c697', 'TEXP-335', 'T_EXP'),
-- 	('21840f6c-e705-4ce7-b400-af9ca3ca195b', 'TSPE-418', 'T_SPE'),
-- 	('219c9470-ffe0-48a6-bebf-39fb814ad613', '2-210', '2'),
-- 	('226e5b3b-fad4-4c99-92cb-42e123014055', '2-245', '2'),
-- 	('227f2c9c-3494-412d-bf88-e9b2c48c01a6', '1SPE-295', '1_SPE'),
-- 	('23402520-cbc3-4d49-b6dc-999e1ff17e3c', 'TSPE-467', 'T_SPE'),
-- 	('234270ac-a763-4cb9-bf87-4d44f441cde5', 'TEXP-322', 'T_EXP'),
-- 	('245b4eb1-11fc-497a-b4cd-0a8934719d2c', '1SPE-297', '1_SPE'),
-- 	('2491dd75-f888-4b86-aff6-e969c375cb5c', 'TCOMP-233', 'T_COMP'),
-- 	('2491dd75-f888-4b86-aff6-e969c375cb5c', 'TSPE-430', 'T_SPE'),
-- 	('2562438e-4ad7-4c95-b9a4-0b3534ceaed0', '2-367', '2'),
-- 	('25a7549a-34f5-4afc-a97d-d61c0a9efe4d', '1SPE-248', '1_SPE'),
-- 	('279cf28f-a9e9-4c15-bd00-adbb9442c9bd', '1SPE-216', '1_SPE'),
-- 	('27d77564-e109-4681-8a64-13a3ee1729cd', '1SPE-230', '1_SPE'),
-- 	('2871990c-21d1-4d96-a2df-897ee2a1cc5c', '1SPE-243', '1_SPE'),
-- 	('288c2bf0-2442-4e2d-ad4b-afcc1d23b6b2', '2-262', '2'),
-- 	('293f8225-0268-48bc-8487-52c6bf5b01e3', 'TEXP-246', 'T_EXP'),
-- 	('294206b9-0b78-412f-9528-505d53b372eb', 'TSPE-343', 'T_SPE'),
-- 	('2a1413ff-de6d-4380-912f-e8fbd977a8c9', 'TCOMP-255', 'T_COMP'),
-- 	('2a1413ff-de6d-4380-912f-e8fbd977a8c9', 'TSPE-469', 'T_SPE'),
-- 	('2af6296f-7863-40db-89de-eda542be5e45', '1SPE-357', '1_SPE'),
-- 	('2b240d8c-bdc2-4a55-a8db-a028f02ec889', 'TSPE-375', 'T_SPE'),
-- 	('2b382069-eaad-4627-8405-bddd24b81c38', '1SPE-281', '1_SPE'),
-- 	('2bae040c-347b-401f-a646-6cd2914b3399', 'TSPE-320', 'T_SPE'),
-- 	('2bf66851-c1e0-4531-b2eb-153803a573bf', 'TEXP-265', 'T_EXP'),
-- 	('2bf6edc7-e12f-450e-951c-cbf2b20b1e19', 'TSPE-384', 'T_SPE'),
-- 	('2bfbf2fc-e7dc-4fd9-ab50-0cb3e7f5d402', '1SPE-318', '1_SPE'),
-- 	('2c116f4d-d7ef-4d8c-8114-9f113a983c4c', '2-400', '2'),
-- 	('2d480f3d-2092-4f25-91b5-b92887f7b71b', 'TCOMP-252', 'T_COMP'),
-- 	('2d480f3d-2092-4f25-91b5-b92887f7b71b', 'TSPE-468', 'T_SPE'),
-- 	('2dcb4b3c-e5ad-4b8b-9728-1b4e614bcba1', 'TEXP-204', 'T_EXP'),
-- 	('2dd2b712-3687-4910-ab92-378c46125129', '1SPE-253', '1_SPE'),
-- 	('3091d426-e98f-4da1-abc1-1777dc2061f3', 'TEXP-274', 'T_EXP'),
-- 	('30b597c3-a350-4027-8c6f-b6678ab0868f', 'TCOMP-295', 'T_COMP'),
-- 	('30b597c3-a350-4027-8c6f-b6678ab0868f', 'TSPE-508', 'T_SPE'),
-- 	('318ea542-65cb-4040-9b46-1d5803d9dee5', '1SPE-283', '1_SPE'),
-- 	('31a77ba9-520c-4f35-82b3-066492b512c1', '1SPE-236', '1_SPE'),
-- 	('31be400c-29fb-4877-a0e8-49c33d40add7', 'TEXP-314', 'T_EXP'),
-- 	('32993a13-829a-4876-bfe2-965c4a404d03', '1SPE-248', '1_SPE'),
-- 	('32bb4b83-1323-435e-b21d-4dd722321dd7', 'TCOMP-254', 'T_COMP'),
-- 	('32bb4b83-1323-435e-b21d-4dd722321dd7', 'TSPE-469', 'T_SPE'),
-- 	('337d31c3-5d6b-4bd0-b9da-f025ddb26145', '1SPE-213', '1_SPE'),
-- 	('33be404b-d498-4243-8653-dbb819ea7542', 'TSPE-366', 'T_SPE'),
-- 	('33eb676e-e3d7-4710-a1c1-50133a060125', '2-262', '2'),
-- 	('349e1be5-65c5-49ce-b8e5-627a0c4a0bf5', '1SPE-216', '1_SPE'),
-- 	('34b03dee-865d-405c-a284-abfac4248997', 'TSPE-376', 'T_SPE'),
-- 	('34e569e7-7834-456f-8e48-65b2a1183030', '2-262', '2'),
-- 	('35697e01-53f5-4a45-9eb5-c7e9882065b2', 'TSPE-364', 'T_SPE'),
-- 	('35ad8891-e0bc-4666-a7e1-8cf917927f9f', '1SPE-357', '1_SPE'),
-- 	('36010981-8f6b-4b95-bc86-4fcbf87be4ac', '1SPE-341', '1_SPE'),
-- 	('36abc642-aa7a-44a2-8597-4246fc62069c', '2-378', '2'),
-- 	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', '1SPE-224', '1_SPE'),
-- 	('37ce7759-c2fa-4353-a726-f0c942284053', 'TCOMP-264', 'T_COMP'),
-- 	('37ce7759-c2fa-4353-a726-f0c942284053', 'TSPE-419', 'T_SPE'),
-- 	('3a6583b5-9cc4-4005-9eb8-742828c5f7b4', '1SPE-332', '1_SPE'),
-- 	('3aca54e9-28c7-4ea4-930b-30be6979549b', 'TSPE-312', 'T_SPE'),
-- 	('3b396d9c-5e35-42dd-8c21-f63323418f37', 'TCOMP-267', 'T_COMP'),
-- 	('3b396d9c-5e35-42dd-8c21-f63323418f37', 'TSPE-482', 'T_SPE'),
-- 	('3bace561-460f-466d-b834-a605a59500a7', 'TSPE-371', 'T_SPE'),
-- 	('3cb90b97-2ec4-4050-973e-4b194aa65fb3', 'TCOMP-285', 'T_COMP'),
-- 	('3cfcc718-445a-42f5-8d5e-fe4d8339f4bf', 'TCOMP-315', 'T_COMP'),
-- 	('3dbc5a7b-ceea-4ab9-8922-b77ee206f329', 'TCOMP-247', 'T_COMP'),
-- 	('3dbc5a7b-ceea-4ab9-8922-b77ee206f329', 'TSPE-462', 'T_SPE'),
-- 	('3edf49f2-16e4-4deb-940d-42c01fa61519', 'TEXP-283', 'T_EXP'),
-- 	('4016b05c-f6cf-4fe1-a1e8-19067a57a931', '2-396', '2'),
-- 	('411abdf2-13ff-459c-a961-5fb67658bd0c', 'TEXP-289', 'T_EXP'),
-- 	('41eb477b-89b6-487c-9951-a5393caacc46', 'TEXP-335', 'T_EXP'),
-- 	('42f091c1-35f2-47e4-8fb3-e38c1bbf0dfd', 'TSPE-457', 'T_SPE'),
-- 	('4314e62e-6357-4374-856d-69dd36883851', 'TSPE-457', 'T_SPE'),
-- 	('448894f3-f0e8-459d-91db-fc81433038c2', '1SPE-353', '1_SPE'),
-- 	('44a4236b-be18-4835-a6e0-c50f0b36833f', 'TEXP-279', 'T_EXP'),
-- 	('44b32cad-1803-4ff2-a649-4c502610b43c', '1SPE-226', '1_SPE'),
-- 	('44b58fce-45ec-4979-819f-e4bdb8540944', '1SPE-254', '1_SPE'),
-- 	('45d1cdd6-9c17-4b83-be67-067df8c3f816', 'TEXP-240', 'T_EXP'),
-- 	('45e47034-959d-4996-a5d6-ea22fd0ac316', '1SPE-243', '1_SPE'),
-- 	('466954a9-c86e-4692-856f-96c400b72817', 'TEXP-203', 'T_EXP'),
-- 	('46913a48-c97f-4f00-9cdc-b98214b8420b', '1SPE-260', '1_SPE'),
-- 	('49134f4f-864d-43a4-ab26-b60db0fe2388', 'TEXP-344', 'T_EXP'),
-- 	('496f958d-4733-45a2-be3c-243dc9f7dd66', '1SPE-289', '1_SPE'),
-- 	('498d6d3e-f7bc-4146-934e-b35184a99d8d', '2-261', '2'),
-- 	('49fac266-f622-4ef5-8a2b-5638ca5a4c99', 'TCOMP-328', 'T_COMP'),
-- 	('4a1deda8-d1a1-4222-8763-453750dc8412', 'TSPE-319', 'T_SPE'),
-- 	('4b3c1d88-c064-45da-8976-820dff5be28e', '1SPE-303', '1_SPE'),
-- 	('4c4d43dc-966d-4661-be5c-85272a3d73cf', 'TSPE-453', 'T_SPE'),
-- 	('4cc21ccd-03d9-4e62-b669-f5ca03a1cc9a', '2-263', '2'),
-- 	('4f8f420a-c93b-4d99-8fe2-acfac2d38cbe', '1SPE-221', '1_SPE'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'TCOMP-295', 'T_COMP'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'TSPE-508', 'T_SPE'),
-- 	('5042401b-ceb0-4dc2-aa48-b83e90ee4bf2', '1SPE-229', '1_SPE'),
-- 	('5062197a-5ffa-47bf-805d-8ec39d4445b8', '2-201', '2'),
-- 	('5072030d-8036-4621-a92b-75df54d371f9', 'TSPE-456', 'T_SPE'),
-- 	('50b81c94-8062-4b37-985c-07291de9466a', 'TEXP-220', 'T_EXP'),
-- 	('50feeefd-27d8-4b73-9e97-e3226091fb0a', 'TCOMP-228', 'T_COMP'),
-- 	('50feeefd-27d8-4b73-9e97-e3226091fb0a', 'TSPE-413', 'T_SPE'),
-- 	('518f7f0b-389b-4cf2-b67c-5591ca00afb9', '1SPE-330', '1_SPE'),
-- 	('536c01bb-8401-4f53-b8ca-faf9bf4c243d', '1SPE-202', '1_SPE'),
-- 	('536db399-2e04-45fc-9f0b-a37a7678d8e8', 'TSPE-353', 'T_SPE'),
-- 	('5426cead-c0c2-48d3-a10b-2e46714f9129', '2-214', '2'),
-- 	('568c7bee-093c-4765-839c-7b94e95d4a67', '1SPE-251', '1_SPE'),
-- 	('56b1803f-f707-49a9-a0b7-3e6b8220f2d7', '1SPE-247', '1_SPE'),
-- 	('57063ada-a70d-442d-a8c0-5081c8402f27', 'TSPE-432', 'T_SPE'),
-- 	('570f91d5-75e6-4af8-b22b-67fae6c4bde1', '1SPE-353', '1_SPE'),
-- 	('5a53d098-b331-4d64-bcad-e14dbab53591', 'TEXP-313', 'T_EXP'),
-- 	('5a89b292-e311-40fb-9115-e6572d031e40', '1SPE-305', '1_SPE'),
-- 	('5b20321f-e86a-4a13-b478-1cf4f441e920', '2-201', '2'),
-- 	('5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', '1SPE-340', '1_SPE'),
-- 	('5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', '1SPE-228', '1_SPE'),
-- 	('604f83b7-4ed3-4b0f-b393-85e60ac353b4', '1SPE-253', '1_SPE'),
-- 	('60a428b9-72d0-4375-99a3-26ef6f594d3b', '1SPE-333', '1_SPE'),
-- 	('6137a555-a62d-4382-b509-4a6f7cbd346b', '1SPE-294', '1_SPE'),
-- 	('618d795c-5f19-49ba-be65-9a9ecd491e70', 'TSPE-386', 'T_SPE'),
-- 	('61e2ac1f-c21d-46ce-b5e2-57a72b9680af', '1SPE-213', '1_SPE'),
-- 	('622c0802-8474-416c-b145-44a8f13a33dc', 'TEXP-221', 'T_EXP'),
-- 	('6233c5a9-0ce4-4bc0-b613-43263c736cc3', 'TEXP-292', 'T_EXP'),
-- 	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'TCOMP-249', 'T_COMP'),
-- 	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'TSPE-465', 'T_SPE'),
-- 	('629c231b-50d4-459f-9361-fa8098f4d079', 'TEXP-282', 'T_EXP'),
-- 	('62b99aa7-ad93-43aa-b7af-7b48c0f8af50', '2-340', '2'),
-- 	('646b4cd3-71da-4092-9542-5fee745b3043', 'TSPE-376', 'T_SPE'),
-- 	('64e53490-57b0-44ba-9737-94779b78191b', '1SPE-243', '1_SPE'),
-- 	('65e96f31-31fe-4c2b-b894-e689b998b849', '1SPE-224', '1_SPE'),
-- 	('667a3618-fa5a-42bb-8541-046cf0e4ff03', 'TCOMP-212', 'T_COMP'),
-- 	('667a3618-fa5a-42bb-8541-046cf0e4ff03', 'TSPE-432', 'T_SPE'),
-- 	('679a2e3e-d034-4c9f-8c8f-5e0b6f545d1a', '1SPE-307', '1_SPE'),
-- 	('67b349ab-02c1-4e06-9026-b31d918acd46', 'TSPE-307', 'T_SPE'),
-- 	('68166a11-b481-44cc-b881-07252a6fb98f', '1SPE-292', '1_SPE'),
-- 	('68b13d33-57b5-4f5f-a3d0-ffbc80d78587', 'TSPE-371', 'T_SPE'),
-- 	('6909bfde-1fcb-4372-8205-db5bb54a05f8', '2-262', '2'),
-- 	('69a05f98-9dd9-4ce5-b23e-5376e85fbbaf', '2-400', '2'),
-- 	('6a5e58da-8015-4d0d-9a1f-6c8e8d9cae4d', '1SPE-292', '1_SPE'),
-- 	('6be786ef-507f-4fdb-80ec-74db1b9179f5', 'TEXP-315', 'T_EXP'),
-- 	('6c3ee9e6-3c71-4ff9-943b-22691a9a92c7', '2-210', '2'),
-- 	('6c80b4ec-541d-47dc-a652-13b51f9b8b9b', 'TCOMP-297', 'T_COMP'),
-- 	('6c80b4ec-541d-47dc-a652-13b51f9b8b9b', 'TSPE-510', 'T_SPE'),
-- 	('6dd2f133-e203-4cf6-a422-6a0e716203f3', '1SPE-340', '1_SPE'),
-- 	('6ece66a6-85e6-45ff-beff-25b9954c1984', '2-245', '2'),
-- 	('6ed907d7-03b3-43b2-b737-37bf7c633f16', 'TCOMP-274', 'T_COMP'),
-- 	('6ed907d7-03b3-43b2-b737-37bf7c633f16', 'TSPE-485', 'T_SPE'),
-- 	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', '1SPE-356', '1_SPE'),
-- 	('6fe11613-789b-43c1-a38b-0d72bcb0d44e', '1SPE-292', '1_SPE'),
-- 	('6ff00846-f06d-49f3-b6cb-336821ea8649', 'TEXP-246', 'T_EXP'),
-- 	('7026a36a-dc96-4d46-8c39-950220a60f82', 'TSPE-459', 'T_SPE'),
-- 	('7063979e-b3b5-4b12-8ff9-e6df2c05b23c', 'TSPE-381', 'T_SPE'),
-- 	('708f8a08-31c0-49f2-85f9-8f9b8a2b4a44', 'TCOMP-210', 'T_COMP'),
-- 	('708f8a08-31c0-49f2-85f9-8f9b8a2b4a44', 'TSPE-402', 'T_SPE'),
-- 	('7179a3b5-580a-4696-a22e-cd5f89c32c29', '1SPE-292', '1_SPE'),
-- 	('71cb8ab7-664a-45f6-83b0-6b0739ebb5a1', 'TSPE-527', 'T_SPE'),
-- 	('71d10661-2f62-47df-9e00-37e2a6789080', '1SPE-327', '1_SPE'),
-- 	('721324f9-6ab3-4f62-b22e-103b9eb71fda', '1SPE-320', '1_SPE'),
-- 	('723779c8-23a5-4768-9648-a19cab5558be', 'TCOMP-227', 'T_COMP'),
-- 	('723779c8-23a5-4768-9648-a19cab5558be', 'TSPE-440', 'T_SPE'),
-- 	('7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', '1SPE-213', '1_SPE'),
-- 	('727fb88a-0cb7-4937-88c7-c522dffe04f4', '1SPE-225', '1_SPE'),
-- 	('74363137-8fef-4a59-bb0a-ce1c0908198f', '1SPE-315', '1_SPE'),
-- 	('74d77343-34b9-4259-94c2-c9e2c473b052', '1SPE-264', '1_SPE'),
-- 	('75fe996a-ba8e-4e72-a1c3-536078b8254e', '2-339', '2'),
-- 	('760093ec-400a-4774-beb7-ca9d2cb389fb', 'TEXP-247', 'T_EXP'),
-- 	('76843d15-31fa-42a3-9da3-8ee1490d6018', 'TCOMP-277', 'T_COMP'),
-- 	('76843d15-31fa-42a3-9da3-8ee1490d6018', 'TSPE-483', 'T_SPE'),
-- 	('7690e290-8eaa-4729-9d34-6fd58107e294', 'TEXP-223', 'T_EXP'),
-- 	('7703e625-8a3e-48bd-b4d3-245201766457', '1SPE-223', '1_SPE'),
-- 	('77b5e06d-1040-49ca-b8a4-f524ab0448ac', 'TSPE-454', 'T_SPE'),
-- 	('77d6fedc-1643-4451-a685-2451dc1616cb', '2-395', '2'),
-- 	('782bf7f8-b6af-43f2-a1d7-78089cdb9485', '1SPE-281', '1_SPE'),
-- 	('7844be9a-36f9-4f27-8c6a-34529c3e6523', 'TSPE-403', 'T_SPE'),
-- 	('79d69593-e815-496c-b429-637a1cd68b4d', '1SPE-223', '1_SPE'),
-- 	('7a28103b-435d-4f7d-a583-44d9269ff4a1', 'TEXP-341', 'T_EXP'),
-- 	('7b4b149a-5a82-4aca-8b7f-7ef48d0ffd48', 'TSPE-453', 'T_SPE'),
-- 	('7d094336-5d95-4530-9374-7d767348f456', 'TEXP-336', 'T_EXP'),
-- 	('7d244203-3ea6-4c4d-9b3d-869ae82ccceb', 'TEXP-278', 'T_EXP'),
-- 	('7d552757-61db-493a-a846-7d2cdc0ec631', 'TSPE-457', 'T_SPE'),
-- 	('7d9d9b81-e11f-4572-8221-21e95107112d', 'TSPE-313', 'T_SPE'),
-- 	('7df468d6-647c-4b59-9a6c-026a2279fd86', 'TSPE-453', 'T_SPE'),
-- 	('7e9b9b32-0d7a-4bd9-89f3-af0dd3a95431', '1SPE-348', '1_SPE'),
-- 	('7eec7032-a49c-4662-a2af-73c9ef8f2f98', '1SPE-280', '1_SPE'),
-- 	('7f13ca89-ad64-4665-9f6b-e11fad8f8b08', 'TCOMP-231', 'T_COMP'),
-- 	('7f13ca89-ad64-4665-9f6b-e11fad8f8b08', 'TSPE-416', 'T_SPE'),
-- 	('7ff99f85-b7a4-4d4a-a346-46f8593bd7ca', 'TEXP-263', 'T_EXP'),
-- 	('80489c90-34aa-4212-bf2e-62438ab017a0', '1SPE-287', '1_SPE'),
-- 	('806c10f4-d04c-44c2-9af1-84a65b636aca', 'TCOMP-230', 'T_COMP'),
-- 	('806c10f4-d04c-44c2-9af1-84a65b636aca', 'TSPE-415', 'T_SPE'),
-- 	('81811b59-b17c-4d94-bbd4-7f5515b4dd6d', '1SPE-330', '1_SPE'),
-- 	('81ff485d-b40a-4778-bb95-43c3c17818f2', 'TCOMP-213', 'T_COMP'),
-- 	('822d0318-0c4d-4e60-9c4d-1082302e09f3', 'TCOMP-270', 'T_COMP'),
-- 	('822d0318-0c4d-4e60-9c4d-1082302e09f3', 'TSPE-498', 'T_SPE'),
-- 	('8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', '1SPE-356', '1_SPE'),
-- 	('83b1f614-95db-4d74-9fbf-d4d502ee8c01', '1SPE-283', '1_SPE'),
-- 	('849aabbc-4576-4644-a5c6-5b840b4dbbb9', '1SPE-231', '1_SPE'),
-- 	('85afd455-84a0-4caa-82c0-36840b19a219', '1SPE-216', '1_SPE'),
-- 	('85f6e96e-f1a9-4ed3-b321-4e070e097c9d', '2-262', '2'),
-- 	('86199c41-5344-4aea-8ad3-b3083ae1bfe4', 'TEXP-291', 'T_EXP'),
-- 	('87140df3-ed7a-4afc-98d9-dcd4d43e65bb', '1SPE-246', '1_SPE'),
-- 	('8997f7c6-4a99-44e0-bd03-e76c7e69c596', '1SPE-274', '1_SPE'),
-- 	('89d49fae-5f08-439d-a531-a0b1966dab99', 'TSPE-305', 'T_SPE'),
-- 	('89e16891-1301-4b1c-af75-a8f03ba0dcdb', 'TCOMP-311', 'T_COMP'),
-- 	('8a6e41cc-264c-40df-b0b7-8a47e779d40d', 'TSPE-322', 'T_SPE'),
-- 	('8b435b9d-ca30-44db-b4ce-1e1bd581387d', 'TEXP-207', 'T_EXP'),
-- 	('8b599a53-7e46-44a1-8e48-860c4d501b14', '1SPE-274', '1_SPE'),
-- 	('8b59ca4b-9a09-49df-a10c-4f3772176d46', '2-378', '2'),
-- 	('8c31675a-44af-48df-bb3e-cde85a8d3f35', '2-244', '2'),
-- 	('8d4e5302-a133-441d-a618-69abb9cb4b63', '1SPE-221', '1_SPE'),
-- 	('8d69e3a9-3b97-4ec5-a768-adac14a53ca3', 'TEXP-323', 'T_EXP'),
-- 	('8ed02829-51de-40e2-af77-8fa47d01ea98', '1SPE-224', '1_SPE'),
-- 	('91c7b083-8714-4559-9a6e-8e9fe86b59bd', 'TSPE-368', 'T_SPE'),
-- 	('91db0034-86d4-49bf-b190-0884db19e9b7', 'TSPE-533', 'T_SPE'),
-- 	('93539700-7047-4edd-98fa-85a80276931e', 'TEXP-323', 'T_EXP'),
-- 	('939153b6-9aa8-4a59-809e-071a7d3b8b77', '2-340', '2'),
-- 	('94e4d691-ad7e-4e7a-9130-acb805864764', 'TCOMP-204', 'T_COMP'),
-- 	('94e4d691-ad7e-4e7a-9130-acb805864764', 'TSPE-402', 'T_SPE'),
-- 	('95c38330-063f-4ade-b1ae-152b84bce20f', '1SPE-225', '1_SPE'),
-- 	('95ee8348-8d34-4cf4-a798-544ee0622aa7', 'TCOMP-272', 'T_COMP'),
-- 	('95ee8348-8d34-4cf4-a798-544ee0622aa7', 'TSPE-476', 'T_SPE'),
-- 	('95f04c3e-03e1-4db4-a16e-36b713a2273f', 'TSPE-369', 'T_SPE'),
-- 	('968f4295-08a9-44a4-8327-9087de7efd85', 'TCOMP-253', 'T_COMP'),
-- 	('968f4295-08a9-44a4-8327-9087de7efd85', 'TSPE-464', 'T_SPE'),
-- 	('9724dc3d-8df6-4c45-b936-439b18ed4c39', '2-202', '2'),
-- 	('9755a856-1059-40aa-abf7-cb531d85cebc', '1SPE-264', '1_SPE'),
-- 	('9765d776-cc70-4472-95e9-1c0d05396584', '1SPE-289', '1_SPE'),
-- 	('97b3a376-01de-42cd-8297-b0f7937e38f1', '1SPE-353', '1_SPE'),
-- 	('98ba277c-b99f-4e3f-b33c-8138755eb917', 'TCOMP-205', 'T_COMP'),
-- 	('98ba277c-b99f-4e3f-b33c-8138755eb917', 'TSPE-402', 'T_SPE'),
-- 	('9a04eb9f-18f7-413e-97b7-7ce41a899747', '1SPE-283', '1_SPE'),
-- 	('9a4592bf-5e79-4a4a-bb1a-698a715a4a34', '1SPE-292', '1_SPE'),
-- 	('9a6087c5-34e9-448e-9805-b05a4484d144', 'TEXP-340', 'T_EXP'),
-- 	('9ad36217-5f60-45c7-83ce-a1a870adc5da', 'TCOMP-225', 'T_COMP'),
-- 	('9ad36217-5f60-45c7-83ce-a1a870adc5da', 'TSPE-442', 'T_SPE'),
-- 	('9bea5ec2-237f-4ad8-bc21-b4374b85c6f4', '1SPE-331', '1_SPE'),
-- 	('9c7f7ef0-8491-4ce9-a52c-80bcf907845f', '1SPE-321', '1_SPE'),
-- 	('9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278', 'TSPE-458', 'T_SPE'),
-- 	('9d7c4d98-c7fe-4c2e-8993-d162294e1dde', '2-398', '2'),
-- 	('9e1d084e-ff83-4852-ad51-fe79c3328ae0', '1SPE-250', '1_SPE'),
-- 	('9f00da01-a030-4697-8d69-20c380fa0b78', '1SPE-247', '1_SPE'),
-- 	('9f14d672-e460-4161-a9bf-da2b06f734f3', 'TCOMP-214', 'T_COMP'),
-- 	('a0089728-f07a-46ba-8109-7550d2ac800d', '1SPE-244', '1_SPE'),
-- 	('a32e6d38-6472-41fe-8499-cb4a85a9b718', 'TCOMP-271', 'T_COMP'),
-- 	('a32e6d38-6472-41fe-8499-cb4a85a9b718', 'TSPE-479', 'T_SPE'),
-- 	('a3f92832-2daf-4f00-94b5-68b57275e93a', '1SPE-349', '1_SPE'),
-- 	('a3fa892a-6b80-4d70-857d-dbb98ffbc117', 'TCOMP-259', 'T_COMP'),
-- 	('a3fa892a-6b80-4d70-857d-dbb98ffbc117', 'TSPE-409', 'T_SPE'),
-- 	('a3fce9d4-948e-4042-b015-5c11feaee488', 'TEXP-238', 'T_EXP'),
-- 	('a4272b10-cb61-42d1-8127-6c0224fc1d9b', '1SPE-294', '1_SPE'),
-- 	('a430a698-851d-40b9-b4b0-146153788397', '1SPE-221', '1_SPE'),
-- 	('a45c83ab-d85b-4958-b43c-223342a81acc', 'TEXP-319', 'T_EXP'),
-- 	('a4d8dc52-30c4-4414-b9d7-b1a0d13f6ae9', 'TCOMP-219', 'T_COMP'),
-- 	('a4d8dc52-30c4-4414-b9d7-b1a0d13f6ae9', 'TSPE-404', 'T_SPE'),
-- 	('a573d517-be46-442b-a298-03469d286e79', 'TCOMP-328', 'T_COMP'),
-- 	('a69dfde7-44b7-489e-a248-be0a1e5c5117', 'TSPE-325', 'T_SPE'),
-- 	('a6cc7712-b21a-4d85-9cfe-52b0eda74faf', 'TCOMP-322', 'T_COMP'),
-- 	('a6d7b414-b42d-4378-a3fd-eff48890cc72', '1SPE-332', '1_SPE'),
-- 	('a6f0ca3f-e981-479d-80f4-3ce032c93b80', '1SPE-317', '1_SPE'),
-- 	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'TCOMP-262', 'T_COMP'),
-- 	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'TSPE-411', 'T_SPE'),
-- 	('a86442c1-78a0-42d1-af23-7f43d217bfa3', '1SPE-264', '1_SPE'),
-- 	('a86fc757-1639-4b22-84bd-af5abcf2b9e0', '1SPE-283', '1_SPE'),
-- 	('a8b51d16-261f-4acd-a2c2-933d3ea9bab5', '1SPE-224', '1_SPE'),
-- 	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'TCOMP-290', 'T_COMP'),
-- 	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'TSPE-510', 'T_SPE'),
-- 	('a9aece33-74e0-4120-817d-5bdf6b9414f3', '1SPE-246', '1_SPE'),
-- 	('a9c71276-30e3-406f-8082-248cce389824', '2-400', '2'),
-- 	('aad6c700-242c-40a4-bd13-f24b016a8a59', '1SPE-306', '1_SPE'),
-- 	('ab4d55f7-d89d-4629-a60e-4ab880ff155c', '1SPE-216', '1_SPE'),
-- 	('ac94a453-5a3f-43f0-9984-d832e9117263', 'TSPE-333', 'T_SPE'),
-- 	('acd9104c-e29e-4df6-89cc-3d549a21b3fb', 'TEXP-249', 'T_EXP'),
-- 	('aced2e6c-0f00-49ac-bcde-821d2bc91e9b', 'TSPE-524', 'T_SPE'),
-- 	('ad555cb1-c4a2-4390-ad14-6a626b39e0fb', '1SPE-358', '1_SPE'),
-- 	('ae0ad163-0c3a-4334-8748-8ccdefc7134c', '2-347', '2'),
-- 	('aeb1389d-0805-4421-9b25-1fcb4e4f4670', '1SPE-230', '1_SPE'),
-- 	('aebb400f-be97-43be-af91-d41156712dd0', 'TEXP-285', 'T_EXP'),
-- 	('affceacd-5dab-474e-aa7e-75d2d542a935', 'TSPE-371', 'T_SPE'),
-- 	('b09c430a-8ed5-44f1-a431-7b108299982b', '1SPE-248', '1_SPE'),
-- 	('b125d1dd-4cac-407d-a0a5-7485741de66f', 'TEXP-237', 'T_EXP'),
-- 	('b1e27739-f316-47b0-b820-989d5b94af10', '2-271', '2'),
-- 	('b4096cd8-1aef-4b70-a185-b4b689258e08', 'TCOMP-231', 'T_COMP'),
-- 	('b4096cd8-1aef-4b70-a185-b4b689258e08', 'TSPE-416', 'T_SPE'),
-- 	('b48d72dd-e93b-4f5c-ac81-117ff1c2c79c', '1SPE-251', '1_SPE'),
-- 	('b500b44e-af29-4a2e-a2bd-67a57ed5ab20', 'TSPE-318', 'T_SPE'),
-- 	('b52c53d8-df28-48a3-b494-56fb1cd72009', 'TCOMP-276', 'T_COMP'),
-- 	('b52c53d8-df28-48a3-b494-56fb1cd72009', 'TSPE-487', 'T_SPE'),
-- 	('b72fae4a-f8c1-4758-a4d7-9a7523cda877', '1SPE-227', '1_SPE'),
-- 	('b7304fcb-afc1-449b-90ce-57343621fbc0', 'TEXP-290', 'T_EXP'),
-- 	('b73923a1-ed5a-49b0-ba69-6e389e28cec3', '1SPE-321', '1_SPE'),
-- 	('b83f1392-a1b1-4c2d-8f04-599b92dbe6c0', '1SPE-348', '1_SPE'),
-- 	('b97dabe1-0c52-483e-a738-e62386d5a638', 'TSPE-403', 'T_SPE'),
-- 	('ba8ae428-e22b-4b01-b3d7-9d42af96a6c3', '1SPE-321', '1_SPE'),
-- 	('bad86bec-f4e9-4b2d-b238-7a7339e3f77f', '1SPE-357', '1_SPE'),
-- 	('bb554c62-ed89-4c2f-817b-c5aed549a469', '1SPE-283', '1_SPE'),
-- 	('bb6749d5-59a2-4b26-b259-bb64dcf9b600', 'TEXP-291', 'T_EXP'),
-- 	('bbd211a5-536a-4d7a-bc3e-4d578d9caf68', 'TEXP-239', 'T_EXP'),
-- 	('bbd511cb-73fe-4b91-9b50-06d001f5b666', '2-379', '2'),
-- 	('bc1807a1-400e-4645-9f22-1157addd36bc', 'TSPE-407', 'T_SPE'),
-- 	('bd45ed7f-0e09-4777-9f66-1b932cd087d0', '1SPE-294', '1_SPE'),
-- 	('bd7f1336-d58f-47d4-869f-98bc5cc57958', 'TEXP-286', 'T_EXP'),
-- 	('bf3e3211-3dc9-4a91-964a-eb8a68350903', '1SPE-219', '1_SPE'),
-- 	('bf5dadf6-ba11-4fbb-a527-014f59e3145a', '1SPE-319', '1_SPE'),
-- 	('bff6ba73-181e-46b5-aa84-aef634c6d7fb', 'TEXP-342', 'T_EXP'),
-- 	('c0f49b76-fe50-44cf-80b6-3ee8ee5ab9f5', 'TSPE-378', 'T_SPE'),
-- 	('c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', '1SPE-213', '1_SPE'),
-- 	('c2add21a-3c8a-4f02-bb87-59755c033510', '1SPE-330', '1_SPE'),
-- 	('c2e70ba1-08e2-4d6e-ba97-9194e2d2109d', '1SPE-248', '1_SPE'),
-- 	('c4372fd8-eb9d-4d62-a01a-7ab7618eed4b', '2-377', '2'),
-- 	('c4775a3a-114f-41bb-a469-d29c5484dde7', 'TCOMP-265', 'T_COMP'),
-- 	('c4775a3a-114f-41bb-a469-d29c5484dde7', 'TSPE-420', 'T_SPE'),
-- 	('c611f92b-490e-468f-935a-06ec654fb3de', 'TSPE-402', 'T_SPE'),
-- 	('c6b5894c-c753-4dc4-b92b-18702b1f1f81', 'TCOMP-312', 'T_COMP'),
-- 	('c7b5130d-15f7-4b80-b678-34c3c13dff40', '1SPE-292', '1_SPE'),
-- 	('c7cdca01-326b-487f-8400-ba25d382de74', '2-263', '2'),
-- 	('c7d06dad-757d-4f44-ad7a-faa84a7871f0', 'TEXP-331', 'T_EXP'),
-- 	('c8f6970e-76b4-4bd5-beac-ee824751d6e3', 'TEXP-343', 'T_EXP'),
-- 	('c90fa022-9493-4812-adb7-c785babee9d4', '1SPE-230', '1_SPE'),
-- 	('ca36b9c4-27b9-4376-ac37-7351a100abf5', 'TSPE-354', 'T_SPE'),
-- 	('ca8f40c2-bcb9-4f1d-8647-53e84a04ed79', '1SPE-293', '1_SPE'),
-- 	('cac2d6ed-c215-4e58-aaeb-1b314476f41d', 'TSPE-459', 'T_SPE'),
-- 	('cd4f9fb3-9deb-402d-8fa5-278ef5089d61', 'TEXP-338', 'T_EXP'),
-- 	('cda8e0d2-366c-482f-8cf3-2564b4b7083d', '1SPE-274', '1_SPE'),
-- 	('cf51cb93-c89b-477d-bfed-eb3cffae5edf', '1SPE-225', '1_SPE'),
-- 	('cf548ea1-2333-42f8-8d6c-e5af54f2b492', '2-395', '2'),
-- 	('cffdd283-49ee-4292-b8ca-b6096b8b1ae2', '1SPE-289', '1_SPE'),
-- 	('d03e49c0-ba65-4e1b-80ef-c595bba65d10', '2-245', '2'),
-- 	('d0930e8c-a11b-489e-a931-0a8679cef3c6', 'TCOMP-251', 'T_COMP'),
-- 	('d0930e8c-a11b-489e-a931-0a8679cef3c6', 'TSPE-467', 'T_SPE'),
-- 	('d1648508-035e-4a2f-abce-87592365038f', '2-262', '2'),
-- 	('d192da3e-534d-4c3e-b30e-68c9f166b8a9', 'TSPE-367', 'T_SPE'),
-- 	('d2067413-da43-42bb-a24c-642d2a3cc5e8', '1SPE-214', '1_SPE'),
-- 	('d2943133-ebf7-424d-946a-8fed6cfa76be', '1SPE-213', '1_SPE'),
-- 	('d2d94e71-f768-46ac-883d-ef239bb7cf17', 'TEXP-292', 'T_EXP'),
-- 	('d3301f2d-6293-4766-a789-d432cb11b489', 'TCOMP-238', 'T_COMP'),
-- 	('d3301f2d-6293-4766-a789-d432cb11b489', 'TSPE-446', 'T_SPE'),
-- 	('d3ae0f61-3377-4d00-896e-291aaaf6ba5d', 'TCOMP-235', 'T_COMP'),
-- 	('d3ae0f61-3377-4d00-896e-291aaaf6ba5d', 'TSPE-431', 'T_SPE'),
-- 	('d400a330-ede5-4167-ab2a-1919eeed2468', 'TEXP-260', 'T_EXP'),
-- 	('d520539a-4d14-492d-8d85-a303a6c30798', '1SPE-312', '1_SPE'),
-- 	('d540f96e-6656-434f-bdbd-72347a2232a9', '2-245', '2'),
-- 	('d5780995-4cd1-49f9-af54-45edca0a27b8', '1SPE-338', '1_SPE'),
-- 	('d58208eb-48f8-4a77-b5bb-55cddcd845ab', '1SPE-270', '1_SPE'),
-- 	('d683e906-b1ca-44f0-bed5-8df2a9740b11', '1SPE-355', '1_SPE'),
-- 	('d6938108-2f87-430c-bc69-c2b148356087', 'TSPE-332', 'T_SPE'),
-- 	('d6a810f4-aa45-46b3-853a-c276a22870e7', '2-245', '2'),
-- 	('d73d7929-fd39-4234-963c-80038c22f5a3', '1SPE-292', '1_SPE'),
-- 	('d787d8c0-6f5a-45d0-84de-73b887f81bc8', '1SPE-321', '1_SPE'),
-- 	('d7ad48d8-614c-44e3-905d-b60f6630d2f5', '1SPE-333', '1_SPE'),
-- 	('d98aa53a-2a3f-4c2f-b702-9abbc5065e6a', '2-366', '2'),
-- 	('d9937325-b96e-462e-8e99-bb74f0c92a63', 'TEXP-290', 'T_EXP'),
-- 	('db8b5dc8-2d2d-41ed-9af5-a4f5551c6aaa', '2-205', '2'),
-- 	('dbee4649-3ab6-49f0-8a5e-5814ce15ba43', 'TCOMP-291', 'T_COMP'),
-- 	('dbee4649-3ab6-49f0-8a5e-5814ce15ba43', 'TSPE-522', 'T_SPE'),
-- 	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'TCOMP-275', 'T_COMP'),
-- 	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'TSPE-486', 'T_SPE'),
-- 	('df88eea9-eb08-427a-9d19-6037a481ad40', 'TCOMP-316', 'T_COMP'),
-- 	('dfb727cd-c55b-439c-8738-0e20484369c5', 'TSPE-308', 'T_SPE'),
-- 	('e02fb162-ca4e-417c-ae37-e39a3798f16c', 'TSPE-470', 'T_SPE'),
-- 	('e05bb79b-f304-4bab-a856-ee73b5a20e6a', '2-367', '2'),
-- 	('e12e4d95-1e6c-4d37-ae9c-77304ad0ea4a', 'TEXP-284', 'T_EXP'),
-- 	('e12e58cb-1630-4bfe-bb43-5726c325a918', '2-366', '2'),
-- 	('e2366d49-d150-4a5a-8097-0636db5b3c27', 'TEXP-272', 'T_EXP'),
-- 	('e332140f-28aa-4069-bbc2-88ee18c81ea0', 'TSPE-468', 'T_SPE'),
-- 	('e5205176-140d-4376-9761-8172ca8bf10a', '1SPE-201', '1_SPE'),
-- 	('e67b1cbd-3a00-4379-bb4c-5a39ddff360f', '1SPE-225', '1_SPE'),
-- 	('e6b429b4-e6b4-41a1-b25b-57b66c989ce4', '1SPE-294', '1_SPE'),
-- 	('e710f32f-993f-4c49-9b18-f06ace3f1af7', '1SPE-330', '1_SPE'),
-- 	('e7cfe442-6653-4f97-a74e-08b8853d3305', '1SPE-227', '1_SPE'),
-- 	('e814175b-95f0-4a2d-8689-e76c01ea91e6', 'TSPE-417', 'T_SPE'),
-- 	('e90997eb-3058-460e-b120-9c045d2114e6', 'TEXP-319', 'T_EXP'),
-- 	('ea9d2de8-70df-4481-a658-d319702d57ab', 'TSPE-383', 'T_SPE'),
-- 	('eae25eba-49aa-4be5-a3ae-eef9ec4e0a31', 'TSPE-370', 'T_SPE'),
-- 	('eae2ff6a-5e46-445b-bfa6-02cadb6d956a', '1SPE-244', '1_SPE'),
-- 	('eafd17a1-6e78-4bf3-932c-da806ac9d889', '1SPE-358', '1_SPE'),
-- 	('eb9517ed-85ed-4702-b8d0-e155f5a5d474', '1SPE-237', '1_SPE'),
-- 	('ebe7e788-3fdc-4d48-8429-ecc959f35349', '1SPE-341', '1_SPE'),
-- 	('eca755e6-dd1f-4a49-996d-88168fcfc4e5', '1SPE-225', '1_SPE'),
-- 	('ecba8a9e-bedb-478d-a324-a4f3fbdb3967', '1SPE-219', '1_SPE'),
-- 	('ed01a843-e3ff-4383-8933-fe7593000693', 'TSPE-306', 'T_SPE'),
-- 	('ed8444bb-dfa3-4b6c-8414-27afb3066d2b', '1SPE-261', '1_SPE'),
-- 	('ee4e2ac6-c683-47ec-91bd-524409ef241e', '1SPE-305', '1_SPE'),
-- 	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'TCOMP-296', 'T_COMP'),
-- 	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'TSPE-314', 'T_SPE'),
-- 	('ef807ee9-f95b-469a-a6a8-4232e933b4c6', '1SPE-215', '1_SPE'),
-- 	('efb12f4b-8f51-4e22-b6a3-2a5d977583b5', 'TCOMP-250', 'T_COMP'),
-- 	('f01270c2-3c63-45c5-bfbb-8233154fadc6', 'TCOMP-252', 'T_COMP'),
-- 	('f01270c2-3c63-45c5-bfbb-8233154fadc6', 'TSPE-468', 'T_SPE'),
-- 	('f1440b52-5a2b-4e6a-a112-7182b029d023', '1SPE-274', '1_SPE'),
-- 	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'TCOMP-239', 'T_COMP'),
-- 	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'TSPE-387', 'T_SPE'),
-- 	('f2133048-6672-4519-ba1c-133c3f59cea0', 'TEXP-264', 'T_EXP'),
-- 	('f26151ff-9b70-414b-9c92-b53a1839bd79', 'TCOMP-281', 'T_COMP'),
-- 	('f26151ff-9b70-414b-9c92-b53a1839bd79', 'TSPE-493', 'T_SPE'),
-- 	('f2cc01fc-a317-4052-92d9-2c9f67255a14', '1SPE-318', '1_SPE'),
-- 	('f36ce3ff-9ae5-435e-b6c2-affe0ad902ec', '1SPE-223', '1_SPE'),
-- 	('f3addbe3-7254-483f-a640-0ea75e23dc69', '1SPE-348', '1_SPE'),
-- 	('f3e68e4b-9855-4e91-bc0d-7363b7650b86', '2-396', '2'),
-- 	('f40e8a4a-bddc-43aa-8c2c-ccf7cb5d4ae6', '1SPE-296', '1_SPE'),
-- 	('f52395d1-31ca-4bdb-be8f-723c5d96d2ac', '1SPE-272', '1_SPE'),
-- 	('f52b93c4-ba45-4bb1-8d4f-e9f34f413f65', 'TSPE-413', 'T_SPE'),
-- 	('f57c0a5a-c76f-402d-8c94-49718f112ac2', '2-271', '2'),
-- 	('f6219e5a-af46-4818-8537-6c65b6d9ae63', '1SPE-245', '1_SPE'),
-- 	('f63408c5-ec96-4a17-92bc-15796e0b9a61', '1SPE-213', '1_SPE'),
-- 	('f680361c-58ec-4f63-8e00-2b4399298977', 'TEXP-206', 'T_EXP'),
-- 	('f69a6e9e-28cf-46e3-b823-5712a2e028d9', '1SPE-248', '1_SPE'),
-- 	('f6c423de-acdf-4e7e-a622-feabdb289cce', '1SPE-331', '1_SPE'),
-- 	('f7194c9d-5056-4444-8a66-78205d1dde32', '1SPE-304', '1_SPE'),
-- 	('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8', 'TSPE-318', 'T_SPE'),
-- 	('f7c15433-a944-4440-bb42-4a2f899e5f06', '1SPE-319', '1_SPE'),
-- 	('f8ccc8b6-b5ec-4fce-9c74-8dd1520bb709', '1SPE-244', '1_SPE'),
-- 	('f98164b1-031d-4ff9-8d16-8c97ebe485f6', '2-212', '2'),
-- 	('fc2ea212-c23b-407a-b4b7-6f3a48b40ef5', 'TSPE-488', 'T_SPE'),
-- 	('fc921674-ee4f-488c-9fe4-5598795c0508', '1SPE-225', '1_SPE'),
-- 	('fe25be0a-db90-4052-8f4e-fffcafd763e8', 'TCOMP-251', 'T_COMP'),
-- 	('fe25be0a-db90-4052-8f4e-fffcafd763e8', 'TSPE-467', 'T_SPE'),
-- 	('fe407c88-478d-419e-aa02-8b3c8e1a917a', '1SPE-321', '1_SPE'),
-- 	('ffd5c051-3db1-416b-9279-ee740ffb8d34', 'TCOMP-236', 'T_COMP'),
-- 	('ffd5c051-3db1-416b-9279-ee740ffb8d34', 'TSPE-444', 'T_SPE');
-- create temporary table _tgr_avant as
-- 	select count(*)::integer as n
-- 	  from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	  join _tgr_tags t on t.template_id = q.template_id and t.code = p.code and t.grade = p.grade;
-- do $tgr_garde$
-- begin
-- 	-- Tout ou rien : les 473 tags (production) ou aucun (base sans les modèles). Sinon, une
-- 	-- partie des 473 a été retirée depuis la migration : à examiner avant de rejouer.
-- 	if (select n from _tgr_avant) not in (0, 473) then
-- 		raise exception 'rollback : % tag(s) de la migration présent(s) sur 473 (tout ou rien) : à examiner avant de rejouer', (select n from _tgr_avant);
-- 	end if;
-- end $tgr_garde$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, _tgr_tags t
--  where p.id = q.point_id and q.template_id = t.template_id and p.code = t.code and p.grade = t.grade;
-- alter table public.curriculum_points drop constraint if exists curriculum_points_one_generation;
-- drop trigger if exists question_template_points_rules on public.question_template_points;
-- drop trigger if exists question_templates_guard_point_tags on public.question_templates;
-- drop trigger if exists curriculum_points_guard_tags on public.curriculum_points;
-- drop trigger if exists classification_nodes_guard_point_tags on public.classification_nodes;
-- drop trigger if exists exercise_curriculum_points_rules on public.exercise_curriculum_points;
-- drop trigger if exists exercise_classifications_guard_point_tags on public.exercise_classifications;
-- drop function if exists public.question_template_points_check_rules();
-- drop function if exists public.question_templates_guard_point_tags();
-- drop function if exists public.curriculum_points_guard_tags();
-- drop function if exists public.classification_nodes_guard_point_tags();
-- drop function if exists public.exercise_curriculum_points_check_rules();
-- drop function if exists public.exercise_classifications_guard_point_tags();
-- do $tgr_check$
-- declare
-- 	v_n integer;
-- begin
-- 	select count(*) into v_n
-- 	  from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	  join _tgr_tags t on t.template_id = q.template_id and t.code = p.code and t.grade = p.grade;
-- 	if v_n <> 0 then
-- 		raise exception 'rollback : % tag(s) de la migration encore présent(s)', v_n;
-- 	end if;
-- 	select count(*) into v_n from pg_constraint where conname = 'curriculum_points_one_generation';
-- 	if v_n <> 0 then
-- 		raise exception 'rollback : contrainte des deux générations encore présente';
-- 	end if;
-- 	select count(*) into v_n from pg_trigger
-- 	 where not tgisinternal and tgname in ('question_template_points_rules', 'question_templates_guard_point_tags', 'curriculum_points_guard_tags', 'classification_nodes_guard_point_tags', 'exercise_curriculum_points_rules', 'exercise_classifications_guard_point_tags');
-- 	if v_n <> 0 then
-- 		raise exception 'rollback : % trigger(s) de règle encore présent(s)', v_n;
-- 	end if;
-- 	select count(*) into v_n from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
-- 	 where ns.nspname = 'public' and pr.proname in ('question_template_points_check_rules', 'question_templates_guard_point_tags', 'curriculum_points_guard_tags', 'classification_nodes_guard_point_tags', 'exercise_curriculum_points_check_rules', 'exercise_classifications_guard_point_tags');
-- 	if v_n <> 0 then
-- 		raise exception 'rollback : % fonction(s) de règle encore présente(s)', v_n;
-- 	end if;
-- end $tgr_check$;
-- drop table _tgr_avant;
-- drop table _tgr_tags;
-- ROLLBACK:END
-- ============================================================================

-- Une écriture concurrente (un admin qui tague) fait échouer proprement la migration au lieu
-- d'empiler les écritures en attente.
set local lock_timeout = '5s';

-- ---- 1. Les 473 tags, en table temporaire --------------------------------------------------
create temporary table _tg_tags (
	template_id uuid not null,
	code text not null,
	grade text not null,
	primary key (template_id, code)
);
insert into _tg_tags (template_id, code, grade) values
	('0113c53d-ee4a-4da9-9327-537461ffdc85', '1SPE-287', '1_SPE'),
	('0140fdfa-1066-4885-b0ab-c597ff503283', '1SPE-274', '1_SPE'),
	('03b3d9b3-2d38-4062-a70b-c9b31839444b', '1SPE-283', '1_SPE'),
	('0417223e-923d-4ae2-b25c-89b60f4c7631', '1SPE-351', '1_SPE'),
	('044a3ae3-c54a-4521-9265-3997fcc6b0d2', '1SPE-323', '1_SPE'),
	('046ee43f-2f1d-4563-96cb-ff96d68c7fbf', 'TEXP-274', 'T_EXP'),
	('0495289a-abb1-4fed-b058-5e924a5f05ed', '1SPE-223', '1_SPE'),
	('04ec9518-1d43-461c-beb0-aa38d62b6835', 'TCOMP-230', 'T_COMP'),
	('04ec9518-1d43-461c-beb0-aa38d62b6835', 'TSPE-415', 'T_SPE'),
	('05387201-2403-409a-8ebe-5898b6e77e3c', '1SPE-272', '1_SPE'),
	('0718f490-bfdd-4a62-b78f-b15753c27d8a', '1SPE-358', '1_SPE'),
	('07bce646-6a88-4b7c-aaf6-fe07ffa63ed6', 'TSPE-382', 'T_SPE'),
	('0808e518-9aa6-4241-85b0-5132033fe3c8', 'TSPE-372', 'T_SPE'),
	('08f9ad7b-7885-474f-b0a1-630a8847140e', 'TCOMP-265', 'T_COMP'),
	('08f9ad7b-7885-474f-b0a1-630a8847140e', 'TSPE-420', 'T_SPE'),
	('0943e867-e639-45f5-939d-df7492d0ecaf', 'TSPE-530', 'T_SPE'),
	('0965c56c-7808-4698-8c1f-8124d3a6505d', 'TSPE-309', 'T_SPE'),
	('09f0c9ec-70ea-4b90-a949-7c6154e91104', '2-347', '2'),
	('0a1ff14f-ac73-4b9e-ab4c-a4d465c78e76', '2-207', '2'),
	('0a2d3681-eb19-43db-89e9-762c406d9db4', 'TSPE-454', 'T_SPE'),
	('0ab3faa5-a660-4841-9a5f-6563458d2489', '1SPE-204', '1_SPE'),
	('0ab3faa5-a660-4841-9a5f-6563458d2489', '2-211', '2'),
	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', '1SPE-224', '1_SPE'),
	('0b686e01-725c-448d-9e10-b295cf9b4128', '1SPE-237', '1_SPE'),
	('0bde6091-c122-46c0-94d5-a97cdde28d9d', 'TSPE-312', 'T_SPE'),
	('0d2edda7-1d90-46ee-b07d-792ebbd43849', '2-261', '2'),
	('0dee4515-8030-441c-bd7c-f1b7418e664b', '1SPE-245', '1_SPE'),
	('0fbe194d-003b-4407-8486-10b0141530a7', 'TEXP-295', 'T_EXP'),
	('0feeabaf-e90d-45a1-b5f1-997b3da067a7', 'TSPE-319', 'T_SPE'),
	('10393ff9-b797-4557-a841-6e0b4e18c52b', 'TCOMP-220', 'T_COMP'),
	('10393ff9-b797-4557-a841-6e0b4e18c52b', 'TSPE-425', 'T_SPE'),
	('119b9148-e95b-4865-b0d4-52f0cf264de2', 'TSPE-345', 'T_SPE'),
	('1239554b-d442-4be6-8867-d9dc38311999', '1SPE-223', '1_SPE'),
	('1277a5b6-b979-4e3b-b5b6-e10aedfbedfb', 'TSPE-345', 'T_SPE'),
	('1315d326-1a4b-4abc-af93-f8ab9aeecc66', '1SPE-213', '1_SPE'),
	('1338da34-00a6-4500-97fc-fcece9514ae6', '2-262', '2'),
	('13e2d419-770b-4e97-a2f8-972d467cf2fc', 'TCOMP-298', 'T_COMP'),
	('13e2d419-770b-4e97-a2f8-972d467cf2fc', 'TSPE-516', 'T_SPE'),
	('14036c68-6854-422b-b06d-3890b3745573', 'TCOMP-238', 'T_COMP'),
	('14036c68-6854-422b-b06d-3890b3745573', 'TSPE-446', 'T_SPE'),
	('158ecaa4-7fa7-4313-a6be-bf60fc538ab6', '1SPE-212', '1_SPE'),
	('15d3aaa0-5eef-4c08-a38c-5b5c8d5ed6e1', '1SPE-289', '1_SPE'),
	('1602c40d-818f-4218-beb9-0d7f116992a4', '1SPE-332', '1_SPE'),
	('164edf6b-d68c-4a19-8f81-1a0d596496a4', 'TCOMP-279', 'T_COMP'),
	('164edf6b-d68c-4a19-8f81-1a0d596496a4', 'TSPE-490', 'T_SPE'),
	('1666b8e9-8225-4e66-8b8c-4d5190806ed1', '1SPE-266', '1_SPE'),
	('17f35a67-b665-4c4c-9ebf-f0b413ca43d9', 'TCOMP-323', 'T_COMP'),
	('17f64f63-9af0-48ea-96b1-a74e0bef16f4', '1SPE-281', '1_SPE'),
	('1820cab8-ab88-4365-bc13-d44c5e234c49', 'TEXP-339', 'T_EXP'),
	('18855802-b8e9-4fff-bfa8-256cc4d50c31', 'TSPE-456', 'T_SPE'),
	('18e26873-dca0-4c73-bc23-f181e0164a66', '1SPE-244', '1_SPE'),
	('18ff6a91-3e94-4391-81a8-037af4ce1470', 'TEXP-241', 'T_EXP'),
	('19961e67-88c4-43bf-a76b-6a2af61dedf3', '1SPE-237', '1_SPE'),
	('1a57c0a4-8992-4c3f-8ca7-f1a7ce9320dc', 'TCOMP-224', 'T_COMP'),
	('1a57c0a4-8992-4c3f-8ca7-f1a7ce9320dc', 'TSPE-438', 'T_SPE'),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', '1SPE-287', '1_SPE'),
	('1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', '1SPE-244', '1_SPE'),
	('1bbfa5f2-1c32-4a81-92cf-b9e7c5996977', '1SPE-219', '1_SPE'),
	('1c443c35-ef93-4dc5-8635-b7ddcea32b77', '2-377', '2'),
	('1c65d58e-8596-4e11-b917-6c8a86d8ef0f', 'TCOMP-326', 'T_COMP'),
	('1cfc575d-e122-406d-9b4e-60556d3260a5', '2-399', '2'),
	('1ebd1c86-7970-49c9-a373-74ba4d71d9ec', 'TCOMP-209', 'T_COMP'),
	('1ebd1c86-7970-49c9-a373-74ba4d71d9ec', 'TSPE-402', 'T_SPE'),
	('1f88d29a-086b-4fc9-9b28-debca396c697', 'TEXP-335', 'T_EXP'),
	('21840f6c-e705-4ce7-b400-af9ca3ca195b', 'TSPE-418', 'T_SPE'),
	('219c9470-ffe0-48a6-bebf-39fb814ad613', '2-210', '2'),
	('226e5b3b-fad4-4c99-92cb-42e123014055', '2-245', '2'),
	('227f2c9c-3494-412d-bf88-e9b2c48c01a6', '1SPE-295', '1_SPE'),
	('23402520-cbc3-4d49-b6dc-999e1ff17e3c', 'TSPE-467', 'T_SPE'),
	('234270ac-a763-4cb9-bf87-4d44f441cde5', 'TEXP-322', 'T_EXP'),
	('245b4eb1-11fc-497a-b4cd-0a8934719d2c', '1SPE-297', '1_SPE'),
	('2491dd75-f888-4b86-aff6-e969c375cb5c', 'TCOMP-233', 'T_COMP'),
	('2491dd75-f888-4b86-aff6-e969c375cb5c', 'TSPE-430', 'T_SPE'),
	('2562438e-4ad7-4c95-b9a4-0b3534ceaed0', '2-367', '2'),
	('25a7549a-34f5-4afc-a97d-d61c0a9efe4d', '1SPE-248', '1_SPE'),
	('279cf28f-a9e9-4c15-bd00-adbb9442c9bd', '1SPE-216', '1_SPE'),
	('27d77564-e109-4681-8a64-13a3ee1729cd', '1SPE-230', '1_SPE'),
	('2871990c-21d1-4d96-a2df-897ee2a1cc5c', '1SPE-243', '1_SPE'),
	('288c2bf0-2442-4e2d-ad4b-afcc1d23b6b2', '2-262', '2'),
	('293f8225-0268-48bc-8487-52c6bf5b01e3', 'TEXP-246', 'T_EXP'),
	('294206b9-0b78-412f-9528-505d53b372eb', 'TSPE-343', 'T_SPE'),
	('2a1413ff-de6d-4380-912f-e8fbd977a8c9', 'TCOMP-255', 'T_COMP'),
	('2a1413ff-de6d-4380-912f-e8fbd977a8c9', 'TSPE-469', 'T_SPE'),
	('2af6296f-7863-40db-89de-eda542be5e45', '1SPE-357', '1_SPE'),
	('2b240d8c-bdc2-4a55-a8db-a028f02ec889', 'TSPE-375', 'T_SPE'),
	('2b382069-eaad-4627-8405-bddd24b81c38', '1SPE-281', '1_SPE'),
	('2bae040c-347b-401f-a646-6cd2914b3399', 'TSPE-320', 'T_SPE'),
	('2bf66851-c1e0-4531-b2eb-153803a573bf', 'TEXP-265', 'T_EXP'),
	('2bf6edc7-e12f-450e-951c-cbf2b20b1e19', 'TSPE-384', 'T_SPE'),
	('2bfbf2fc-e7dc-4fd9-ab50-0cb3e7f5d402', '1SPE-318', '1_SPE'),
	('2c116f4d-d7ef-4d8c-8114-9f113a983c4c', '2-400', '2'),
	('2d480f3d-2092-4f25-91b5-b92887f7b71b', 'TCOMP-252', 'T_COMP'),
	('2d480f3d-2092-4f25-91b5-b92887f7b71b', 'TSPE-468', 'T_SPE'),
	('2dcb4b3c-e5ad-4b8b-9728-1b4e614bcba1', 'TEXP-204', 'T_EXP'),
	('2dd2b712-3687-4910-ab92-378c46125129', '1SPE-253', '1_SPE'),
	('3091d426-e98f-4da1-abc1-1777dc2061f3', 'TEXP-274', 'T_EXP'),
	('30b597c3-a350-4027-8c6f-b6678ab0868f', 'TCOMP-295', 'T_COMP'),
	('30b597c3-a350-4027-8c6f-b6678ab0868f', 'TSPE-508', 'T_SPE'),
	('318ea542-65cb-4040-9b46-1d5803d9dee5', '1SPE-283', '1_SPE'),
	('31a77ba9-520c-4f35-82b3-066492b512c1', '1SPE-236', '1_SPE'),
	('31be400c-29fb-4877-a0e8-49c33d40add7', 'TEXP-314', 'T_EXP'),
	('32993a13-829a-4876-bfe2-965c4a404d03', '1SPE-248', '1_SPE'),
	('32bb4b83-1323-435e-b21d-4dd722321dd7', 'TCOMP-254', 'T_COMP'),
	('32bb4b83-1323-435e-b21d-4dd722321dd7', 'TSPE-469', 'T_SPE'),
	('337d31c3-5d6b-4bd0-b9da-f025ddb26145', '1SPE-213', '1_SPE'),
	('33be404b-d498-4243-8653-dbb819ea7542', 'TSPE-366', 'T_SPE'),
	('33eb676e-e3d7-4710-a1c1-50133a060125', '2-262', '2'),
	('349e1be5-65c5-49ce-b8e5-627a0c4a0bf5', '1SPE-216', '1_SPE'),
	('34b03dee-865d-405c-a284-abfac4248997', 'TSPE-376', 'T_SPE'),
	('34e569e7-7834-456f-8e48-65b2a1183030', '2-262', '2'),
	('35697e01-53f5-4a45-9eb5-c7e9882065b2', 'TSPE-364', 'T_SPE'),
	('35ad8891-e0bc-4666-a7e1-8cf917927f9f', '1SPE-357', '1_SPE'),
	('36010981-8f6b-4b95-bc86-4fcbf87be4ac', '1SPE-341', '1_SPE'),
	('36abc642-aa7a-44a2-8597-4246fc62069c', '2-378', '2'),
	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', '1SPE-224', '1_SPE'),
	('37ce7759-c2fa-4353-a726-f0c942284053', 'TCOMP-264', 'T_COMP'),
	('37ce7759-c2fa-4353-a726-f0c942284053', 'TSPE-419', 'T_SPE'),
	('3a6583b5-9cc4-4005-9eb8-742828c5f7b4', '1SPE-332', '1_SPE'),
	('3aca54e9-28c7-4ea4-930b-30be6979549b', 'TSPE-312', 'T_SPE'),
	('3b396d9c-5e35-42dd-8c21-f63323418f37', 'TCOMP-267', 'T_COMP'),
	('3b396d9c-5e35-42dd-8c21-f63323418f37', 'TSPE-482', 'T_SPE'),
	('3bace561-460f-466d-b834-a605a59500a7', 'TSPE-371', 'T_SPE'),
	('3cb90b97-2ec4-4050-973e-4b194aa65fb3', 'TCOMP-285', 'T_COMP'),
	('3cfcc718-445a-42f5-8d5e-fe4d8339f4bf', 'TCOMP-315', 'T_COMP'),
	('3dbc5a7b-ceea-4ab9-8922-b77ee206f329', 'TCOMP-247', 'T_COMP'),
	('3dbc5a7b-ceea-4ab9-8922-b77ee206f329', 'TSPE-462', 'T_SPE'),
	('3edf49f2-16e4-4deb-940d-42c01fa61519', 'TEXP-283', 'T_EXP'),
	('4016b05c-f6cf-4fe1-a1e8-19067a57a931', '2-396', '2'),
	('411abdf2-13ff-459c-a961-5fb67658bd0c', 'TEXP-289', 'T_EXP'),
	('41eb477b-89b6-487c-9951-a5393caacc46', 'TEXP-335', 'T_EXP'),
	('42f091c1-35f2-47e4-8fb3-e38c1bbf0dfd', 'TSPE-457', 'T_SPE'),
	('4314e62e-6357-4374-856d-69dd36883851', 'TSPE-457', 'T_SPE'),
	('448894f3-f0e8-459d-91db-fc81433038c2', '1SPE-353', '1_SPE'),
	('44a4236b-be18-4835-a6e0-c50f0b36833f', 'TEXP-279', 'T_EXP'),
	('44b32cad-1803-4ff2-a649-4c502610b43c', '1SPE-226', '1_SPE'),
	('44b58fce-45ec-4979-819f-e4bdb8540944', '1SPE-254', '1_SPE'),
	('45d1cdd6-9c17-4b83-be67-067df8c3f816', 'TEXP-240', 'T_EXP'),
	('45e47034-959d-4996-a5d6-ea22fd0ac316', '1SPE-243', '1_SPE'),
	('466954a9-c86e-4692-856f-96c400b72817', 'TEXP-203', 'T_EXP'),
	('46913a48-c97f-4f00-9cdc-b98214b8420b', '1SPE-260', '1_SPE'),
	('49134f4f-864d-43a4-ab26-b60db0fe2388', 'TEXP-344', 'T_EXP'),
	('496f958d-4733-45a2-be3c-243dc9f7dd66', '1SPE-289', '1_SPE'),
	('498d6d3e-f7bc-4146-934e-b35184a99d8d', '2-261', '2'),
	('49fac266-f622-4ef5-8a2b-5638ca5a4c99', 'TCOMP-328', 'T_COMP'),
	('4a1deda8-d1a1-4222-8763-453750dc8412', 'TSPE-319', 'T_SPE'),
	('4b3c1d88-c064-45da-8976-820dff5be28e', '1SPE-303', '1_SPE'),
	('4c4d43dc-966d-4661-be5c-85272a3d73cf', 'TSPE-453', 'T_SPE'),
	('4cc21ccd-03d9-4e62-b669-f5ca03a1cc9a', '2-263', '2'),
	('4f8f420a-c93b-4d99-8fe2-acfac2d38cbe', '1SPE-221', '1_SPE'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'TCOMP-295', 'T_COMP'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'TSPE-508', 'T_SPE'),
	('5042401b-ceb0-4dc2-aa48-b83e90ee4bf2', '1SPE-229', '1_SPE'),
	('5062197a-5ffa-47bf-805d-8ec39d4445b8', '2-201', '2'),
	('5072030d-8036-4621-a92b-75df54d371f9', 'TSPE-456', 'T_SPE'),
	('50b81c94-8062-4b37-985c-07291de9466a', 'TEXP-220', 'T_EXP'),
	('50feeefd-27d8-4b73-9e97-e3226091fb0a', 'TCOMP-228', 'T_COMP'),
	('50feeefd-27d8-4b73-9e97-e3226091fb0a', 'TSPE-413', 'T_SPE'),
	('518f7f0b-389b-4cf2-b67c-5591ca00afb9', '1SPE-330', '1_SPE'),
	('536c01bb-8401-4f53-b8ca-faf9bf4c243d', '1SPE-202', '1_SPE'),
	('536db399-2e04-45fc-9f0b-a37a7678d8e8', 'TSPE-353', 'T_SPE'),
	('5426cead-c0c2-48d3-a10b-2e46714f9129', '2-214', '2'),
	('568c7bee-093c-4765-839c-7b94e95d4a67', '1SPE-251', '1_SPE'),
	('56b1803f-f707-49a9-a0b7-3e6b8220f2d7', '1SPE-247', '1_SPE'),
	('57063ada-a70d-442d-a8c0-5081c8402f27', 'TSPE-432', 'T_SPE'),
	('570f91d5-75e6-4af8-b22b-67fae6c4bde1', '1SPE-353', '1_SPE'),
	('5a53d098-b331-4d64-bcad-e14dbab53591', 'TEXP-313', 'T_EXP'),
	('5a89b292-e311-40fb-9115-e6572d031e40', '1SPE-305', '1_SPE'),
	('5b20321f-e86a-4a13-b478-1cf4f441e920', '2-201', '2'),
	('5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', '1SPE-340', '1_SPE'),
	('5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', '1SPE-228', '1_SPE'),
	('604f83b7-4ed3-4b0f-b393-85e60ac353b4', '1SPE-253', '1_SPE'),
	('60a428b9-72d0-4375-99a3-26ef6f594d3b', '1SPE-333', '1_SPE'),
	('6137a555-a62d-4382-b509-4a6f7cbd346b', '1SPE-294', '1_SPE'),
	('618d795c-5f19-49ba-be65-9a9ecd491e70', 'TSPE-386', 'T_SPE'),
	('61e2ac1f-c21d-46ce-b5e2-57a72b9680af', '1SPE-213', '1_SPE'),
	('622c0802-8474-416c-b145-44a8f13a33dc', 'TEXP-221', 'T_EXP'),
	('6233c5a9-0ce4-4bc0-b613-43263c736cc3', 'TEXP-292', 'T_EXP'),
	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'TCOMP-249', 'T_COMP'),
	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'TSPE-465', 'T_SPE'),
	('629c231b-50d4-459f-9361-fa8098f4d079', 'TEXP-282', 'T_EXP'),
	('62b99aa7-ad93-43aa-b7af-7b48c0f8af50', '2-340', '2'),
	('646b4cd3-71da-4092-9542-5fee745b3043', 'TSPE-376', 'T_SPE'),
	('64e53490-57b0-44ba-9737-94779b78191b', '1SPE-243', '1_SPE'),
	('65e96f31-31fe-4c2b-b894-e689b998b849', '1SPE-224', '1_SPE'),
	('667a3618-fa5a-42bb-8541-046cf0e4ff03', 'TCOMP-212', 'T_COMP'),
	('667a3618-fa5a-42bb-8541-046cf0e4ff03', 'TSPE-432', 'T_SPE'),
	('679a2e3e-d034-4c9f-8c8f-5e0b6f545d1a', '1SPE-307', '1_SPE'),
	('67b349ab-02c1-4e06-9026-b31d918acd46', 'TSPE-307', 'T_SPE'),
	('68166a11-b481-44cc-b881-07252a6fb98f', '1SPE-292', '1_SPE'),
	('68b13d33-57b5-4f5f-a3d0-ffbc80d78587', 'TSPE-371', 'T_SPE'),
	('6909bfde-1fcb-4372-8205-db5bb54a05f8', '2-262', '2'),
	('69a05f98-9dd9-4ce5-b23e-5376e85fbbaf', '2-400', '2'),
	('6a5e58da-8015-4d0d-9a1f-6c8e8d9cae4d', '1SPE-292', '1_SPE'),
	('6be786ef-507f-4fdb-80ec-74db1b9179f5', 'TEXP-315', 'T_EXP'),
	('6c3ee9e6-3c71-4ff9-943b-22691a9a92c7', '2-210', '2'),
	('6c80b4ec-541d-47dc-a652-13b51f9b8b9b', 'TCOMP-297', 'T_COMP'),
	('6c80b4ec-541d-47dc-a652-13b51f9b8b9b', 'TSPE-510', 'T_SPE'),
	('6dd2f133-e203-4cf6-a422-6a0e716203f3', '1SPE-340', '1_SPE'),
	('6ece66a6-85e6-45ff-beff-25b9954c1984', '2-245', '2'),
	('6ed907d7-03b3-43b2-b737-37bf7c633f16', 'TCOMP-274', 'T_COMP'),
	('6ed907d7-03b3-43b2-b737-37bf7c633f16', 'TSPE-485', 'T_SPE'),
	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', '1SPE-356', '1_SPE'),
	('6fe11613-789b-43c1-a38b-0d72bcb0d44e', '1SPE-292', '1_SPE'),
	('6ff00846-f06d-49f3-b6cb-336821ea8649', 'TEXP-246', 'T_EXP'),
	('7026a36a-dc96-4d46-8c39-950220a60f82', 'TSPE-459', 'T_SPE'),
	('7063979e-b3b5-4b12-8ff9-e6df2c05b23c', 'TSPE-381', 'T_SPE'),
	('708f8a08-31c0-49f2-85f9-8f9b8a2b4a44', 'TCOMP-210', 'T_COMP'),
	('708f8a08-31c0-49f2-85f9-8f9b8a2b4a44', 'TSPE-402', 'T_SPE'),
	('7179a3b5-580a-4696-a22e-cd5f89c32c29', '1SPE-292', '1_SPE'),
	('71cb8ab7-664a-45f6-83b0-6b0739ebb5a1', 'TSPE-527', 'T_SPE'),
	('71d10661-2f62-47df-9e00-37e2a6789080', '1SPE-327', '1_SPE'),
	('721324f9-6ab3-4f62-b22e-103b9eb71fda', '1SPE-320', '1_SPE'),
	('723779c8-23a5-4768-9648-a19cab5558be', 'TCOMP-227', 'T_COMP'),
	('723779c8-23a5-4768-9648-a19cab5558be', 'TSPE-440', 'T_SPE'),
	('7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', '1SPE-213', '1_SPE'),
	('727fb88a-0cb7-4937-88c7-c522dffe04f4', '1SPE-225', '1_SPE'),
	('74363137-8fef-4a59-bb0a-ce1c0908198f', '1SPE-315', '1_SPE'),
	('74d77343-34b9-4259-94c2-c9e2c473b052', '1SPE-264', '1_SPE'),
	('75fe996a-ba8e-4e72-a1c3-536078b8254e', '2-339', '2'),
	('760093ec-400a-4774-beb7-ca9d2cb389fb', 'TEXP-247', 'T_EXP'),
	('76843d15-31fa-42a3-9da3-8ee1490d6018', 'TCOMP-277', 'T_COMP'),
	('76843d15-31fa-42a3-9da3-8ee1490d6018', 'TSPE-483', 'T_SPE'),
	('7690e290-8eaa-4729-9d34-6fd58107e294', 'TEXP-223', 'T_EXP'),
	('7703e625-8a3e-48bd-b4d3-245201766457', '1SPE-223', '1_SPE'),
	('77b5e06d-1040-49ca-b8a4-f524ab0448ac', 'TSPE-454', 'T_SPE'),
	('77d6fedc-1643-4451-a685-2451dc1616cb', '2-395', '2'),
	('782bf7f8-b6af-43f2-a1d7-78089cdb9485', '1SPE-281', '1_SPE'),
	('7844be9a-36f9-4f27-8c6a-34529c3e6523', 'TSPE-403', 'T_SPE'),
	('79d69593-e815-496c-b429-637a1cd68b4d', '1SPE-223', '1_SPE'),
	('7a28103b-435d-4f7d-a583-44d9269ff4a1', 'TEXP-341', 'T_EXP'),
	('7b4b149a-5a82-4aca-8b7f-7ef48d0ffd48', 'TSPE-453', 'T_SPE'),
	('7d094336-5d95-4530-9374-7d767348f456', 'TEXP-336', 'T_EXP'),
	('7d244203-3ea6-4c4d-9b3d-869ae82ccceb', 'TEXP-278', 'T_EXP'),
	('7d552757-61db-493a-a846-7d2cdc0ec631', 'TSPE-457', 'T_SPE'),
	('7d9d9b81-e11f-4572-8221-21e95107112d', 'TSPE-313', 'T_SPE'),
	('7df468d6-647c-4b59-9a6c-026a2279fd86', 'TSPE-453', 'T_SPE'),
	('7e9b9b32-0d7a-4bd9-89f3-af0dd3a95431', '1SPE-348', '1_SPE'),
	('7eec7032-a49c-4662-a2af-73c9ef8f2f98', '1SPE-280', '1_SPE'),
	('7f13ca89-ad64-4665-9f6b-e11fad8f8b08', 'TCOMP-231', 'T_COMP'),
	('7f13ca89-ad64-4665-9f6b-e11fad8f8b08', 'TSPE-416', 'T_SPE'),
	('7ff99f85-b7a4-4d4a-a346-46f8593bd7ca', 'TEXP-263', 'T_EXP'),
	('80489c90-34aa-4212-bf2e-62438ab017a0', '1SPE-287', '1_SPE'),
	('806c10f4-d04c-44c2-9af1-84a65b636aca', 'TCOMP-230', 'T_COMP'),
	('806c10f4-d04c-44c2-9af1-84a65b636aca', 'TSPE-415', 'T_SPE'),
	('81811b59-b17c-4d94-bbd4-7f5515b4dd6d', '1SPE-330', '1_SPE'),
	('81ff485d-b40a-4778-bb95-43c3c17818f2', 'TCOMP-213', 'T_COMP'),
	('822d0318-0c4d-4e60-9c4d-1082302e09f3', 'TCOMP-270', 'T_COMP'),
	('822d0318-0c4d-4e60-9c4d-1082302e09f3', 'TSPE-498', 'T_SPE'),
	('8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', '1SPE-356', '1_SPE'),
	('83b1f614-95db-4d74-9fbf-d4d502ee8c01', '1SPE-283', '1_SPE'),
	('849aabbc-4576-4644-a5c6-5b840b4dbbb9', '1SPE-231', '1_SPE'),
	('85afd455-84a0-4caa-82c0-36840b19a219', '1SPE-216', '1_SPE'),
	('85f6e96e-f1a9-4ed3-b321-4e070e097c9d', '2-262', '2'),
	('86199c41-5344-4aea-8ad3-b3083ae1bfe4', 'TEXP-291', 'T_EXP'),
	('87140df3-ed7a-4afc-98d9-dcd4d43e65bb', '1SPE-246', '1_SPE'),
	('8997f7c6-4a99-44e0-bd03-e76c7e69c596', '1SPE-274', '1_SPE'),
	('89d49fae-5f08-439d-a531-a0b1966dab99', 'TSPE-305', 'T_SPE'),
	('89e16891-1301-4b1c-af75-a8f03ba0dcdb', 'TCOMP-311', 'T_COMP'),
	('8a6e41cc-264c-40df-b0b7-8a47e779d40d', 'TSPE-322', 'T_SPE'),
	('8b435b9d-ca30-44db-b4ce-1e1bd581387d', 'TEXP-207', 'T_EXP'),
	('8b599a53-7e46-44a1-8e48-860c4d501b14', '1SPE-274', '1_SPE'),
	('8b59ca4b-9a09-49df-a10c-4f3772176d46', '2-378', '2'),
	('8c31675a-44af-48df-bb3e-cde85a8d3f35', '2-244', '2'),
	('8d4e5302-a133-441d-a618-69abb9cb4b63', '1SPE-221', '1_SPE'),
	('8d69e3a9-3b97-4ec5-a768-adac14a53ca3', 'TEXP-323', 'T_EXP'),
	('8ed02829-51de-40e2-af77-8fa47d01ea98', '1SPE-224', '1_SPE'),
	('91c7b083-8714-4559-9a6e-8e9fe86b59bd', 'TSPE-368', 'T_SPE'),
	('91db0034-86d4-49bf-b190-0884db19e9b7', 'TSPE-533', 'T_SPE'),
	('93539700-7047-4edd-98fa-85a80276931e', 'TEXP-323', 'T_EXP'),
	('939153b6-9aa8-4a59-809e-071a7d3b8b77', '2-340', '2'),
	('94e4d691-ad7e-4e7a-9130-acb805864764', 'TCOMP-204', 'T_COMP'),
	('94e4d691-ad7e-4e7a-9130-acb805864764', 'TSPE-402', 'T_SPE'),
	('95c38330-063f-4ade-b1ae-152b84bce20f', '1SPE-225', '1_SPE'),
	('95ee8348-8d34-4cf4-a798-544ee0622aa7', 'TCOMP-272', 'T_COMP'),
	('95ee8348-8d34-4cf4-a798-544ee0622aa7', 'TSPE-476', 'T_SPE'),
	('95f04c3e-03e1-4db4-a16e-36b713a2273f', 'TSPE-369', 'T_SPE'),
	('968f4295-08a9-44a4-8327-9087de7efd85', 'TCOMP-253', 'T_COMP'),
	('968f4295-08a9-44a4-8327-9087de7efd85', 'TSPE-464', 'T_SPE'),
	('9724dc3d-8df6-4c45-b936-439b18ed4c39', '2-202', '2'),
	('9755a856-1059-40aa-abf7-cb531d85cebc', '1SPE-264', '1_SPE'),
	('9765d776-cc70-4472-95e9-1c0d05396584', '1SPE-289', '1_SPE'),
	('97b3a376-01de-42cd-8297-b0f7937e38f1', '1SPE-353', '1_SPE'),
	('98ba277c-b99f-4e3f-b33c-8138755eb917', 'TCOMP-205', 'T_COMP'),
	('98ba277c-b99f-4e3f-b33c-8138755eb917', 'TSPE-402', 'T_SPE'),
	('9a04eb9f-18f7-413e-97b7-7ce41a899747', '1SPE-283', '1_SPE'),
	('9a4592bf-5e79-4a4a-bb1a-698a715a4a34', '1SPE-292', '1_SPE'),
	('9a6087c5-34e9-448e-9805-b05a4484d144', 'TEXP-340', 'T_EXP'),
	('9ad36217-5f60-45c7-83ce-a1a870adc5da', 'TCOMP-225', 'T_COMP'),
	('9ad36217-5f60-45c7-83ce-a1a870adc5da', 'TSPE-442', 'T_SPE'),
	('9bea5ec2-237f-4ad8-bc21-b4374b85c6f4', '1SPE-331', '1_SPE'),
	('9c7f7ef0-8491-4ce9-a52c-80bcf907845f', '1SPE-321', '1_SPE'),
	('9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278', 'TSPE-458', 'T_SPE'),
	('9d7c4d98-c7fe-4c2e-8993-d162294e1dde', '2-398', '2'),
	('9e1d084e-ff83-4852-ad51-fe79c3328ae0', '1SPE-250', '1_SPE'),
	('9f00da01-a030-4697-8d69-20c380fa0b78', '1SPE-247', '1_SPE'),
	('9f14d672-e460-4161-a9bf-da2b06f734f3', 'TCOMP-214', 'T_COMP'),
	('a0089728-f07a-46ba-8109-7550d2ac800d', '1SPE-244', '1_SPE'),
	('a32e6d38-6472-41fe-8499-cb4a85a9b718', 'TCOMP-271', 'T_COMP'),
	('a32e6d38-6472-41fe-8499-cb4a85a9b718', 'TSPE-479', 'T_SPE'),
	('a3f92832-2daf-4f00-94b5-68b57275e93a', '1SPE-349', '1_SPE'),
	('a3fa892a-6b80-4d70-857d-dbb98ffbc117', 'TCOMP-259', 'T_COMP'),
	('a3fa892a-6b80-4d70-857d-dbb98ffbc117', 'TSPE-409', 'T_SPE'),
	('a3fce9d4-948e-4042-b015-5c11feaee488', 'TEXP-238', 'T_EXP'),
	('a4272b10-cb61-42d1-8127-6c0224fc1d9b', '1SPE-294', '1_SPE'),
	('a430a698-851d-40b9-b4b0-146153788397', '1SPE-221', '1_SPE'),
	('a45c83ab-d85b-4958-b43c-223342a81acc', 'TEXP-319', 'T_EXP'),
	('a4d8dc52-30c4-4414-b9d7-b1a0d13f6ae9', 'TCOMP-219', 'T_COMP'),
	('a4d8dc52-30c4-4414-b9d7-b1a0d13f6ae9', 'TSPE-404', 'T_SPE'),
	('a573d517-be46-442b-a298-03469d286e79', 'TCOMP-328', 'T_COMP'),
	('a69dfde7-44b7-489e-a248-be0a1e5c5117', 'TSPE-325', 'T_SPE'),
	('a6cc7712-b21a-4d85-9cfe-52b0eda74faf', 'TCOMP-322', 'T_COMP'),
	('a6d7b414-b42d-4378-a3fd-eff48890cc72', '1SPE-332', '1_SPE'),
	('a6f0ca3f-e981-479d-80f4-3ce032c93b80', '1SPE-317', '1_SPE'),
	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'TCOMP-262', 'T_COMP'),
	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'TSPE-411', 'T_SPE'),
	('a86442c1-78a0-42d1-af23-7f43d217bfa3', '1SPE-264', '1_SPE'),
	('a86fc757-1639-4b22-84bd-af5abcf2b9e0', '1SPE-283', '1_SPE'),
	('a8b51d16-261f-4acd-a2c2-933d3ea9bab5', '1SPE-224', '1_SPE'),
	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'TCOMP-290', 'T_COMP'),
	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'TSPE-510', 'T_SPE'),
	('a9aece33-74e0-4120-817d-5bdf6b9414f3', '1SPE-246', '1_SPE'),
	('a9c71276-30e3-406f-8082-248cce389824', '2-400', '2'),
	('aad6c700-242c-40a4-bd13-f24b016a8a59', '1SPE-306', '1_SPE'),
	('ab4d55f7-d89d-4629-a60e-4ab880ff155c', '1SPE-216', '1_SPE'),
	('ac94a453-5a3f-43f0-9984-d832e9117263', 'TSPE-333', 'T_SPE'),
	('acd9104c-e29e-4df6-89cc-3d549a21b3fb', 'TEXP-249', 'T_EXP'),
	('aced2e6c-0f00-49ac-bcde-821d2bc91e9b', 'TSPE-524', 'T_SPE'),
	('ad555cb1-c4a2-4390-ad14-6a626b39e0fb', '1SPE-358', '1_SPE'),
	('ae0ad163-0c3a-4334-8748-8ccdefc7134c', '2-347', '2'),
	('aeb1389d-0805-4421-9b25-1fcb4e4f4670', '1SPE-230', '1_SPE'),
	('aebb400f-be97-43be-af91-d41156712dd0', 'TEXP-285', 'T_EXP'),
	('affceacd-5dab-474e-aa7e-75d2d542a935', 'TSPE-371', 'T_SPE'),
	('b09c430a-8ed5-44f1-a431-7b108299982b', '1SPE-248', '1_SPE'),
	('b125d1dd-4cac-407d-a0a5-7485741de66f', 'TEXP-237', 'T_EXP'),
	('b1e27739-f316-47b0-b820-989d5b94af10', '2-271', '2'),
	('b4096cd8-1aef-4b70-a185-b4b689258e08', 'TCOMP-231', 'T_COMP'),
	('b4096cd8-1aef-4b70-a185-b4b689258e08', 'TSPE-416', 'T_SPE'),
	('b48d72dd-e93b-4f5c-ac81-117ff1c2c79c', '1SPE-251', '1_SPE'),
	('b500b44e-af29-4a2e-a2bd-67a57ed5ab20', 'TSPE-318', 'T_SPE'),
	('b52c53d8-df28-48a3-b494-56fb1cd72009', 'TCOMP-276', 'T_COMP'),
	('b52c53d8-df28-48a3-b494-56fb1cd72009', 'TSPE-487', 'T_SPE'),
	('b72fae4a-f8c1-4758-a4d7-9a7523cda877', '1SPE-227', '1_SPE'),
	('b7304fcb-afc1-449b-90ce-57343621fbc0', 'TEXP-290', 'T_EXP'),
	('b73923a1-ed5a-49b0-ba69-6e389e28cec3', '1SPE-321', '1_SPE'),
	('b83f1392-a1b1-4c2d-8f04-599b92dbe6c0', '1SPE-348', '1_SPE'),
	('b97dabe1-0c52-483e-a738-e62386d5a638', 'TSPE-403', 'T_SPE'),
	('ba8ae428-e22b-4b01-b3d7-9d42af96a6c3', '1SPE-321', '1_SPE'),
	('bad86bec-f4e9-4b2d-b238-7a7339e3f77f', '1SPE-357', '1_SPE'),
	('bb554c62-ed89-4c2f-817b-c5aed549a469', '1SPE-283', '1_SPE'),
	('bb6749d5-59a2-4b26-b259-bb64dcf9b600', 'TEXP-291', 'T_EXP'),
	('bbd211a5-536a-4d7a-bc3e-4d578d9caf68', 'TEXP-239', 'T_EXP'),
	('bbd511cb-73fe-4b91-9b50-06d001f5b666', '2-379', '2'),
	('bc1807a1-400e-4645-9f22-1157addd36bc', 'TSPE-407', 'T_SPE'),
	('bd45ed7f-0e09-4777-9f66-1b932cd087d0', '1SPE-294', '1_SPE'),
	('bd7f1336-d58f-47d4-869f-98bc5cc57958', 'TEXP-286', 'T_EXP'),
	('bf3e3211-3dc9-4a91-964a-eb8a68350903', '1SPE-219', '1_SPE'),
	('bf5dadf6-ba11-4fbb-a527-014f59e3145a', '1SPE-319', '1_SPE'),
	('bff6ba73-181e-46b5-aa84-aef634c6d7fb', 'TEXP-342', 'T_EXP'),
	('c0f49b76-fe50-44cf-80b6-3ee8ee5ab9f5', 'TSPE-378', 'T_SPE'),
	('c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', '1SPE-213', '1_SPE'),
	('c2add21a-3c8a-4f02-bb87-59755c033510', '1SPE-330', '1_SPE'),
	('c2e70ba1-08e2-4d6e-ba97-9194e2d2109d', '1SPE-248', '1_SPE'),
	('c4372fd8-eb9d-4d62-a01a-7ab7618eed4b', '2-377', '2'),
	('c4775a3a-114f-41bb-a469-d29c5484dde7', 'TCOMP-265', 'T_COMP'),
	('c4775a3a-114f-41bb-a469-d29c5484dde7', 'TSPE-420', 'T_SPE'),
	('c611f92b-490e-468f-935a-06ec654fb3de', 'TSPE-402', 'T_SPE'),
	('c6b5894c-c753-4dc4-b92b-18702b1f1f81', 'TCOMP-312', 'T_COMP'),
	('c7b5130d-15f7-4b80-b678-34c3c13dff40', '1SPE-292', '1_SPE'),
	('c7cdca01-326b-487f-8400-ba25d382de74', '2-263', '2'),
	('c7d06dad-757d-4f44-ad7a-faa84a7871f0', 'TEXP-331', 'T_EXP'),
	('c8f6970e-76b4-4bd5-beac-ee824751d6e3', 'TEXP-343', 'T_EXP'),
	('c90fa022-9493-4812-adb7-c785babee9d4', '1SPE-230', '1_SPE'),
	('ca36b9c4-27b9-4376-ac37-7351a100abf5', 'TSPE-354', 'T_SPE'),
	('ca8f40c2-bcb9-4f1d-8647-53e84a04ed79', '1SPE-293', '1_SPE'),
	('cac2d6ed-c215-4e58-aaeb-1b314476f41d', 'TSPE-459', 'T_SPE'),
	('cd4f9fb3-9deb-402d-8fa5-278ef5089d61', 'TEXP-338', 'T_EXP'),
	('cda8e0d2-366c-482f-8cf3-2564b4b7083d', '1SPE-274', '1_SPE'),
	('cf51cb93-c89b-477d-bfed-eb3cffae5edf', '1SPE-225', '1_SPE'),
	('cf548ea1-2333-42f8-8d6c-e5af54f2b492', '2-395', '2'),
	('cffdd283-49ee-4292-b8ca-b6096b8b1ae2', '1SPE-289', '1_SPE'),
	('d03e49c0-ba65-4e1b-80ef-c595bba65d10', '2-245', '2'),
	('d0930e8c-a11b-489e-a931-0a8679cef3c6', 'TCOMP-251', 'T_COMP'),
	('d0930e8c-a11b-489e-a931-0a8679cef3c6', 'TSPE-467', 'T_SPE'),
	('d1648508-035e-4a2f-abce-87592365038f', '2-262', '2'),
	('d192da3e-534d-4c3e-b30e-68c9f166b8a9', 'TSPE-367', 'T_SPE'),
	('d2067413-da43-42bb-a24c-642d2a3cc5e8', '1SPE-214', '1_SPE'),
	('d2943133-ebf7-424d-946a-8fed6cfa76be', '1SPE-213', '1_SPE'),
	('d2d94e71-f768-46ac-883d-ef239bb7cf17', 'TEXP-292', 'T_EXP'),
	('d3301f2d-6293-4766-a789-d432cb11b489', 'TCOMP-238', 'T_COMP'),
	('d3301f2d-6293-4766-a789-d432cb11b489', 'TSPE-446', 'T_SPE'),
	('d3ae0f61-3377-4d00-896e-291aaaf6ba5d', 'TCOMP-235', 'T_COMP'),
	('d3ae0f61-3377-4d00-896e-291aaaf6ba5d', 'TSPE-431', 'T_SPE'),
	('d400a330-ede5-4167-ab2a-1919eeed2468', 'TEXP-260', 'T_EXP'),
	('d520539a-4d14-492d-8d85-a303a6c30798', '1SPE-312', '1_SPE'),
	('d540f96e-6656-434f-bdbd-72347a2232a9', '2-245', '2'),
	('d5780995-4cd1-49f9-af54-45edca0a27b8', '1SPE-338', '1_SPE'),
	('d58208eb-48f8-4a77-b5bb-55cddcd845ab', '1SPE-270', '1_SPE'),
	('d683e906-b1ca-44f0-bed5-8df2a9740b11', '1SPE-355', '1_SPE'),
	('d6938108-2f87-430c-bc69-c2b148356087', 'TSPE-332', 'T_SPE'),
	('d6a810f4-aa45-46b3-853a-c276a22870e7', '2-245', '2'),
	('d73d7929-fd39-4234-963c-80038c22f5a3', '1SPE-292', '1_SPE'),
	('d787d8c0-6f5a-45d0-84de-73b887f81bc8', '1SPE-321', '1_SPE'),
	('d7ad48d8-614c-44e3-905d-b60f6630d2f5', '1SPE-333', '1_SPE'),
	('d98aa53a-2a3f-4c2f-b702-9abbc5065e6a', '2-366', '2'),
	('d9937325-b96e-462e-8e99-bb74f0c92a63', 'TEXP-290', 'T_EXP'),
	('db8b5dc8-2d2d-41ed-9af5-a4f5551c6aaa', '2-205', '2'),
	('dbee4649-3ab6-49f0-8a5e-5814ce15ba43', 'TCOMP-291', 'T_COMP'),
	('dbee4649-3ab6-49f0-8a5e-5814ce15ba43', 'TSPE-522', 'T_SPE'),
	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'TCOMP-275', 'T_COMP'),
	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'TSPE-486', 'T_SPE'),
	('df88eea9-eb08-427a-9d19-6037a481ad40', 'TCOMP-316', 'T_COMP'),
	('dfb727cd-c55b-439c-8738-0e20484369c5', 'TSPE-308', 'T_SPE'),
	('e02fb162-ca4e-417c-ae37-e39a3798f16c', 'TSPE-470', 'T_SPE'),
	('e05bb79b-f304-4bab-a856-ee73b5a20e6a', '2-367', '2'),
	('e12e4d95-1e6c-4d37-ae9c-77304ad0ea4a', 'TEXP-284', 'T_EXP'),
	('e12e58cb-1630-4bfe-bb43-5726c325a918', '2-366', '2'),
	('e2366d49-d150-4a5a-8097-0636db5b3c27', 'TEXP-272', 'T_EXP'),
	('e332140f-28aa-4069-bbc2-88ee18c81ea0', 'TSPE-468', 'T_SPE'),
	('e5205176-140d-4376-9761-8172ca8bf10a', '1SPE-201', '1_SPE'),
	('e67b1cbd-3a00-4379-bb4c-5a39ddff360f', '1SPE-225', '1_SPE'),
	('e6b429b4-e6b4-41a1-b25b-57b66c989ce4', '1SPE-294', '1_SPE'),
	('e710f32f-993f-4c49-9b18-f06ace3f1af7', '1SPE-330', '1_SPE'),
	('e7cfe442-6653-4f97-a74e-08b8853d3305', '1SPE-227', '1_SPE'),
	('e814175b-95f0-4a2d-8689-e76c01ea91e6', 'TSPE-417', 'T_SPE'),
	('e90997eb-3058-460e-b120-9c045d2114e6', 'TEXP-319', 'T_EXP'),
	('ea9d2de8-70df-4481-a658-d319702d57ab', 'TSPE-383', 'T_SPE'),
	('eae25eba-49aa-4be5-a3ae-eef9ec4e0a31', 'TSPE-370', 'T_SPE'),
	('eae2ff6a-5e46-445b-bfa6-02cadb6d956a', '1SPE-244', '1_SPE'),
	('eafd17a1-6e78-4bf3-932c-da806ac9d889', '1SPE-358', '1_SPE'),
	('eb9517ed-85ed-4702-b8d0-e155f5a5d474', '1SPE-237', '1_SPE'),
	('ebe7e788-3fdc-4d48-8429-ecc959f35349', '1SPE-341', '1_SPE'),
	('eca755e6-dd1f-4a49-996d-88168fcfc4e5', '1SPE-225', '1_SPE'),
	('ecba8a9e-bedb-478d-a324-a4f3fbdb3967', '1SPE-219', '1_SPE'),
	('ed01a843-e3ff-4383-8933-fe7593000693', 'TSPE-306', 'T_SPE'),
	('ed8444bb-dfa3-4b6c-8414-27afb3066d2b', '1SPE-261', '1_SPE'),
	('ee4e2ac6-c683-47ec-91bd-524409ef241e', '1SPE-305', '1_SPE'),
	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'TCOMP-296', 'T_COMP'),
	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'TSPE-314', 'T_SPE'),
	('ef807ee9-f95b-469a-a6a8-4232e933b4c6', '1SPE-215', '1_SPE'),
	('efb12f4b-8f51-4e22-b6a3-2a5d977583b5', 'TCOMP-250', 'T_COMP'),
	('f01270c2-3c63-45c5-bfbb-8233154fadc6', 'TCOMP-252', 'T_COMP'),
	('f01270c2-3c63-45c5-bfbb-8233154fadc6', 'TSPE-468', 'T_SPE'),
	('f1440b52-5a2b-4e6a-a112-7182b029d023', '1SPE-274', '1_SPE'),
	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'TCOMP-239', 'T_COMP'),
	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'TSPE-387', 'T_SPE'),
	('f2133048-6672-4519-ba1c-133c3f59cea0', 'TEXP-264', 'T_EXP'),
	('f26151ff-9b70-414b-9c92-b53a1839bd79', 'TCOMP-281', 'T_COMP'),
	('f26151ff-9b70-414b-9c92-b53a1839bd79', 'TSPE-493', 'T_SPE'),
	('f2cc01fc-a317-4052-92d9-2c9f67255a14', '1SPE-318', '1_SPE'),
	('f36ce3ff-9ae5-435e-b6c2-affe0ad902ec', '1SPE-223', '1_SPE'),
	('f3addbe3-7254-483f-a640-0ea75e23dc69', '1SPE-348', '1_SPE'),
	('f3e68e4b-9855-4e91-bc0d-7363b7650b86', '2-396', '2'),
	('f40e8a4a-bddc-43aa-8c2c-ccf7cb5d4ae6', '1SPE-296', '1_SPE'),
	('f52395d1-31ca-4bdb-be8f-723c5d96d2ac', '1SPE-272', '1_SPE'),
	('f52b93c4-ba45-4bb1-8d4f-e9f34f413f65', 'TSPE-413', 'T_SPE'),
	('f57c0a5a-c76f-402d-8c94-49718f112ac2', '2-271', '2'),
	('f6219e5a-af46-4818-8537-6c65b6d9ae63', '1SPE-245', '1_SPE'),
	('f63408c5-ec96-4a17-92bc-15796e0b9a61', '1SPE-213', '1_SPE'),
	('f680361c-58ec-4f63-8e00-2b4399298977', 'TEXP-206', 'T_EXP'),
	('f69a6e9e-28cf-46e3-b823-5712a2e028d9', '1SPE-248', '1_SPE'),
	('f6c423de-acdf-4e7e-a622-feabdb289cce', '1SPE-331', '1_SPE'),
	('f7194c9d-5056-4444-8a66-78205d1dde32', '1SPE-304', '1_SPE'),
	('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8', 'TSPE-318', 'T_SPE'),
	('f7c15433-a944-4440-bb42-4a2f899e5f06', '1SPE-319', '1_SPE'),
	('f8ccc8b6-b5ec-4fce-9c74-8dd1520bb709', '1SPE-244', '1_SPE'),
	('f98164b1-031d-4ff9-8d16-8c97ebe485f6', '2-212', '2'),
	('fc2ea212-c23b-407a-b4b7-6f3a48b40ef5', 'TSPE-488', 'T_SPE'),
	('fc921674-ee4f-488c-9fe4-5598795c0508', '1SPE-225', '1_SPE'),
	('fe25be0a-db90-4052-8f4e-fffcafd763e8', 'TCOMP-251', 'T_COMP'),
	('fe25be0a-db90-4052-8f4e-fffcafd763e8', 'TSPE-467', 'T_SPE'),
	('fe407c88-478d-419e-aa02-8b3c8e1a917a', '1SPE-321', '1_SPE'),
	('ffd5c051-3db1-416b-9279-ee740ffb8d34', 'TCOMP-236', 'T_COMP'),
	('ffd5c051-3db1-416b-9279-ee740ffb8d34', 'TSPE-444', 'T_SPE');

-- Les anciens tags, pour vérifier à la fin qu'ils sont intacts
create temporary table _tg_anciens as
	select q.template_id, q.point_id
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id
	 where p.node_id is null;

-- ---- 2. Gardes : rien d'inattendu, sinon RIEN ne change ------------------------------------
do $garde$
declare
	v_n integer;
	v_list text;
begin
	-- 2a. aucun tag de point neuf n'existe encore : ce remplissage ne croise aucune saisie
	select count(*) into v_n
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id
	 where p.node_id is not null;
	if v_n <> 0 then
		raise exception 'tags de points neufs déjà présents (%) : transfert refusé', v_n;
	end if;

	-- 2b. chaque code désigne un point NEUF de son programme (le code est unique en base)
	select count(*), string_agg(x.label, ', ' order by x.label) into v_n, v_list
	  from (select distinct t.code, t.grade, t.code || ' (' || t.grade || ')' as label from _tg_tags t) x
	 where not exists (
		select 1 from public.curriculum_points p
		 where p.code = x.code and p.grade = x.grade and p.node_id is not null);
	if v_n <> 0 then
		raise exception 'points neufs introuvables (code, programme) : %', v_list;
	end if;

	-- 2c. modèles : TOUT ou RIEN
	select count(*) into v_n
	  from (select distinct template_id from _tg_tags) t
	  join public.question_templates q on q.id = t.template_id;
	if v_n not in (0, 420) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 420', v_n;
	end if;

	-- 2d. chaque point est d'une génération, et d'une seule (contrainte posée en 3.0)
	select count(*) into v_n
	  from public.curriculum_points
	 where (objective_id is null) = (node_id is null);
	if v_n <> 0 then
		raise exception 'points des deux générations, ou d''aucune : % — contrainte curriculum_points_one_generation impossible', v_n;
	end if;
end $garde$;

-- ---- 3. Les règles ---------------------------------------------------------------------------
-- 3.0 Les deux générations s'excluent.
-- Un point d'ancienne génération porte un objectif ; un point neuf, un nœud de l'arbre. Jamais
-- les deux, jamais aucun : c'est ce qui permet aux règles de reconnaître un point neuf à son nœud.
alter table public.curriculum_points
	add constraint curriculum_points_one_generation
	check ((objective_id is null) <> (node_id is null));

-- Les règles, par fonctions de trigger.
-- « Point neuf » : `node_id` non nul ; un ancien point (sans nœud) est exempté.
-- « Notion d'un nœud » : la notion elle-même, ou le parent d'une sous-notion (le genre d'un
-- nœud ne change pas : classification_nodes_validate).

-- 3a. Taguer un modèle : (a), règle 1, règle 2.
create function public.question_template_points_check_rules()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
	v_code text;
	v_grade text;
	v_point_node uuid;
	v_point_node_name text;
	v_template_node uuid;
	v_template_node_name text;
	v_template_notion uuid;
	v_other text;
begin
	-- Le point est lu VERROUILLÉ (for share) : un re-rattachement ou un changement de programme
	-- simultané (3c) attend cette transaction, ou cette transaction l'attend et lit l'état validé.
	select p.code, p.grade, p.node_id
	  into v_code, v_grade, v_point_node
	  from public.curriculum_points p
	 where p.id = new.point_id
	   for share;
	-- Introuvable, ou masqué par la RLS de modification (qu'exige le verrou) : refus.
	if not found then
		raise exception 'Point % introuvable ou illisible : tag refusé.', new.point_id
			using errcode = 'check_violation';
	end if;
	-- Ancien point (sans nœud) : exempté.
	if v_point_node is null then
		return new;
	end if;
	select n.name into v_point_node_name from public.classification_nodes n where n.id = v_point_node;

	-- Un verrou par modèle, pris APRÈS la lecture (verrouillée) du point et AVANT celle du modèle
	-- et de ses tags : deux tags simultanés d'un même modèle passent l'un après l'autre, et le
	-- second voit le premier (règle 2) ; un déplacement du modèle (3b) prend le même verrou.
	-- Cela ne tient qu'en READ COMMITTED, où chaque requête voit ce qui a été validé avant elle :
	-- c'est le mode de PostgREST, de supabase-js et de pg. En REPEATABLE READ, le second tag ne
	-- verrait pas le premier.
	perform pg_advisory_xact_lock(hashtextextended('question_template_points:' || new.template_id::text, 0));

	select q.classification_node_id, n.name, case when n.kind = 'subnotion' then n.parent_id else n.id end
	  into v_template_node, v_template_node_name, v_template_notion
	  from public.question_templates q
	  left join public.classification_nodes n on n.id = q.classification_node_id
	 where q.id = new.template_id;
	if not found then
		raise exception 'Modèle % introuvable : tag du point % refusé.', new.template_id, v_code
			using errcode = 'check_violation';
	end if;

	if v_template_node is null then
		raise exception 'Le modèle % n''est rangé dans aucun nœud de l''arbre : rangez-le avant de le taguer avec le point %.', new.template_id, v_code
			using errcode = 'check_violation';
	end if;

	if v_point_node <> v_template_node and v_point_node is distinct from v_template_notion then
		raise exception 'Le point % est posé sur « % », ni sur le nœud du modèle (« % ») ni sur sa notion : un modèle se tague avec un point de son nœud ou de sa notion.', v_code, v_point_node_name, v_template_node_name
			using errcode = 'check_violation';
	end if;

	select p.code into v_other
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id
	 where q.template_id = new.template_id
	   and q.point_id <> new.point_id
	   and p.node_id is not null
	   and p.grade = v_grade
	   and not (tg_op = 'UPDATE' and q.template_id = old.template_id and q.point_id = old.point_id)
	 limit 1;
	if v_other is not null then
		raise exception 'Le modèle porte déjà le point % du programme % : un modèle a au plus un point par programme (tag du point % refusé).', v_other, v_grade, v_code
			using errcode = 'check_violation';
	end if;

	return new;
end $fn$;

create trigger question_template_points_rules
	before insert or update on public.question_template_points
	for each row execute function public.question_template_points_check_rules();

-- 3b. Déplacer un modèle (ou lui retirer son nœud) ne doit casser aucun de ses tags neufs.
create function public.question_templates_guard_point_tags()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
	v_notion uuid;
	v_node_name text;
	v_code text;
begin
	if new.classification_node_id is not distinct from old.classification_node_id then
		return null;
	end if;
	-- Même verrou que le tag : un tag et un déplacement simultanés du même modèle passent l'un
	-- après l'autre, et le second voit le premier.
	perform pg_advisory_xact_lock(hashtextextended('question_template_points:' || new.id::text, 0));
	-- Les points tagués sur ce modèle sont verrouillés (for share), anciens compris (un ancien
	-- point peut recevoir un nœud, 3c) : un re-rattachement simultané attend cette transaction,
	-- ou cette transaction l'attend, et la vérification lit l'état validé.
	perform 1
	  from public.curriculum_points p
	 where p.id in (select q.point_id from public.question_template_points q where q.template_id = new.id)
	   for share;

	select case when n.kind = 'subnotion' then n.parent_id else n.id end, n.name
	  into v_notion, v_node_name
	  from public.classification_nodes n
	 where n.id = new.classification_node_id;

	select p.code into v_code
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id
	 where q.template_id = new.id
	   and p.node_id is not null
	   and (new.classification_node_id is null
	        or (p.node_id <> new.classification_node_id and p.node_id is distinct from v_notion))
	 limit 1;
	if v_code is null then
		return null;
	end if;
	if new.classification_node_id is null then
		raise exception 'Le modèle % porte le point % : il ne peut pas perdre son rangement (retirez d''abord ce tag).', new.id, v_code
			using errcode = 'check_violation';
	end if;
	raise exception 'Le modèle % porte le point %, qui ne serait ni sur « % » ni sur sa notion : retirez d''abord ce tag, ou rangez le modèle sur un nœud compatible.', new.id, v_code, v_node_name
		using errcode = 'check_violation';
end $fn$;

create trigger question_templates_guard_point_tags
	after update of classification_node_id on public.question_templates
	for each row execute function public.question_templates_guard_point_tags();

-- 3c. Re-rattacher un point, changer son programme, ou donner un nœud à un ancien point, ne doit
-- casser aucun tag : règle 1 pour les modèles et les exercices qui le portent, règle 2 pour les
-- modèles.
create function public.curriculum_points_guard_tags()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
	v_id uuid;
begin
	if new.node_id is not distinct from old.node_id and new.grade is not distinct from old.grade then
		return null;
	end if;

	if new.node_id is null then
		if old.node_id is not null
		   and (exists (select 1 from public.question_template_points q where q.point_id = new.id)
		        or exists (select 1 from public.exercise_curriculum_points e where e.point_id = new.id)) then
			raise exception 'Le point % est tagué : il ne peut pas perdre son nœud (retirez d''abord ses tags).', new.code
				using errcode = 'check_violation';
		end if;
		return null;
	end if;

	-- Les modèles qui portent le point sont verrouillés (for share) : un déplacement simultané
	-- (3b) attend cette transaction, ou cette transaction l'attend. Pour les exercices, le verrou
	-- est celui de 3e et 3f (consultatif, par exercice) : retirer ou déplacer un rangement ne
	-- touche pas la ligne de l'exercice, qu'un for share n'aurait pas protégée.
	perform 1
	  from public.question_templates t
	 where t.id in (select q.template_id from public.question_template_points q where q.point_id = new.id)
	   for share;
	perform pg_advisory_xact_lock(hashtextextended('exercise_curriculum_points:' || x.exercise_id::text, 0))
	  from (select distinct e.exercise_id from public.exercise_curriculum_points e where e.point_id = new.id) x
	 order by x.exercise_id;

	-- Un modèle sans nœud ne porte que des anciens points (règle (a)) : c'est l'un d'eux qui
	-- recevrait un nœud.
	select q.template_id into v_id
	  from public.question_template_points q
	  join public.question_templates t on t.id = q.template_id
	 where q.point_id = new.id
	   and t.classification_node_id is null
	 limit 1;
	if v_id is not null then
		raise exception 'Le point % serait sur un nœud, mais le modèle % qui le porte n''est rangé dans aucun nœud : rangez d''abord le modèle, ou retirez ce tag.', new.code, v_id
			using errcode = 'check_violation';
	end if;

	select q.template_id into v_id
	  from public.question_template_points q
	  join public.question_templates t on t.id = q.template_id
	  join public.classification_nodes n on n.id = t.classification_node_id
	 where q.point_id = new.id
	   and new.node_id <> t.classification_node_id
	   and new.node_id is distinct from (case when n.kind = 'subnotion' then n.parent_id else n.id end)
	 limit 1;
	if v_id is not null then
		raise exception 'Le point % est tagué sur le modèle %, et ne serait ni sur le nœud de ce modèle ni sur sa notion : retirez d''abord ce tag.', new.code, v_id
			using errcode = 'check_violation';
	end if;

	select e.exercise_id into v_id
	  from public.exercise_curriculum_points e
	 where e.point_id = new.id
	   and not exists (
		select 1 from public.exercise_classifications c
		  join public.classification_nodes n on n.id = c.node_id
		 where c.exercise_id = e.exercise_id
		   and (new.node_id = c.node_id
		        or new.node_id = (case when n.kind = 'subnotion' then n.parent_id else n.id end)))
	 limit 1;
	if v_id is not null then
		raise exception 'Le point % est tagué sur l''exercice %, qui n''est rangé ni sur le nœud du point ni sur sa notion : retirez d''abord ce tag.', new.code, v_id
			using errcode = 'check_violation';
	end if;

	select q.template_id into v_id
	  from public.question_template_points q
	 where q.point_id = new.id
	   and exists (
		select 1 from public.question_template_points q2
		  join public.curriculum_points p2 on p2.id = q2.point_id
		 where q2.template_id = q.template_id
		   and q2.point_id <> new.id
		   and p2.node_id is not null
		   and p2.grade = new.grade)
	 limit 1;
	if v_id is not null then
		raise exception 'Le point % passerait au programme %, dont le modèle % porte déjà un point : un modèle a au plus un point par programme.', new.code, new.grade, v_id
			using errcode = 'check_violation';
	end if;

	return null;
end $fn$;

create trigger curriculum_points_guard_tags
	after update of node_id, grade on public.curriculum_points
	for each row execute function public.curriculum_points_guard_tags();

-- 3d. Une sous-notion qui change de notion ne doit casser aucun tag des modèles et des
-- exercices rangés sur elle (un point posé sur l'ancienne notion n'en serait plus la notion).
create function public.classification_nodes_guard_point_tags()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
	v_id uuid;
	v_code text;
begin
	-- Le genre ne change pas : seule une sous-notion qui change de parent change de notion.
	if new.kind <> 'subnotion' or new.parent_id is not distinct from old.parent_id then
		return null;
	end if;

	select t.id, p.code into v_id, v_code
	  from public.question_templates t
	  join public.question_template_points q on q.template_id = t.id
	  join public.curriculum_points p on p.id = q.point_id
	 where t.classification_node_id = new.id
	   and p.node_id is not null
	   and p.node_id <> new.id
	   and p.node_id is distinct from new.parent_id
	 limit 1;
	if v_code is not null then
		raise exception 'La sous-notion « % » changerait de notion alors que le modèle %, rangé sur elle, porte le point % de son ancienne notion : retirez d''abord ce tag.', new.name, v_id, v_code
			using errcode = 'check_violation';
	end if;

	select c0.exercise_id, p.code into v_id, v_code
	  from public.exercise_classifications c0
	  join public.exercise_curriculum_points e on e.exercise_id = c0.exercise_id
	  join public.curriculum_points p on p.id = e.point_id
	 where c0.node_id = new.id
	   and p.node_id is not null
	   and not exists (
		select 1 from public.exercise_classifications c
		  join public.classification_nodes n on n.id = c.node_id
		 where c.exercise_id = e.exercise_id
		   and (p.node_id = c.node_id
		        or p.node_id = (case when n.kind = 'subnotion' then n.parent_id else n.id end)))
	 limit 1;
	if v_code is not null then
		raise exception 'La sous-notion « % » changerait de notion alors que l''exercice %, rangé sur elle, porte le point %, qui ne serait plus couvert : retirez d''abord ce tag.', new.name, v_id, v_code
			using errcode = 'check_violation';
	end if;

	return null;
end $fn$;

create trigger classification_nodes_guard_point_tags
	after update of parent_id on public.classification_nodes
	for each row execute function public.classification_nodes_guard_point_tags();

-- 3e. Taguer un exercice : (a) et règle 1 (sur l'un de ses nœuds ou sur leur notion). Pas de
-- règle 2 : un exercice porte plusieurs points.
create function public.exercise_curriculum_points_check_rules()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
	v_code text;
	v_point_node uuid;
	v_point_node_name text;
begin
	-- Le point est lu VERROUILLÉ (for share), comme en 3a.
	select p.code, p.node_id into v_code, v_point_node
	  from public.curriculum_points p
	 where p.id = new.point_id
	   for share;
	-- Introuvable, ou masqué par la RLS de modification (qu'exige le verrou) : refus.
	if not found then
		raise exception 'Point % introuvable ou illisible : tag refusé.', new.point_id
			using errcode = 'check_violation';
	end if;
	-- Ancien point (sans nœud) : exempté.
	if v_point_node is null then
		return new;
	end if;
	select n.name into v_point_node_name from public.classification_nodes n where n.id = v_point_node;

	-- Un verrou par exercice, partagé avec le retrait d'un rangement (3f) et le re-rattachement
	-- d'un point (3c) : pas de course entre eux.
	perform pg_advisory_xact_lock(hashtextextended('exercise_curriculum_points:' || new.exercise_id::text, 0));

	if not exists (select 1 from public.exercise_classifications c where c.exercise_id = new.exercise_id) then
		raise exception 'L''exercice % n''est rangé dans aucun nœud de l''arbre : rangez-le avant de le taguer avec le point %.', new.exercise_id, v_code
			using errcode = 'check_violation';
	end if;

	if not exists (
		select 1 from public.exercise_classifications c
		  join public.classification_nodes n on n.id = c.node_id
		 where c.exercise_id = new.exercise_id
		   and (v_point_node = c.node_id
		        or v_point_node = (case when n.kind = 'subnotion' then n.parent_id else n.id end))) then
		raise exception 'Le point % est posé sur « % », hors des nœuds de l''exercice % et de leurs notions : un exercice se tague avec un point de l''un de ses nœuds ou de leur notion.', v_code, v_point_node_name, new.exercise_id
			using errcode = 'check_violation';
	end if;

	return new;
end $fn$;

create trigger exercise_curriculum_points_rules
	before insert or update on public.exercise_curriculum_points
	for each row execute function public.exercise_curriculum_points_check_rules();

-- 3f. Retirer ou déplacer le rangement d'un exercice (y compris vers un autre exercice) ne doit
-- laisser aucun de ses tags neufs hors règle. La suppression d'un exercice (cascade) n'est pas
-- concernée : il n'existe plus.
create function public.exercise_classifications_guard_point_tags()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
	v_code text;
begin
	if tg_op = 'UPDATE' and new.node_id is not distinct from old.node_id
	   and new.exercise_id is not distinct from old.exercise_id then
		return null;
	end if;
	if not exists (select 1 from public.exercises x where x.id = old.exercise_id) then
		return null;
	end if;
	perform pg_advisory_xact_lock(hashtextextended('exercise_curriculum_points:' || old.exercise_id::text, 0));

	select p.code into v_code
	  from public.exercise_curriculum_points e
	  join public.curriculum_points p on p.id = e.point_id
	 where e.exercise_id = old.exercise_id
	   and p.node_id is not null
	   and not exists (
		select 1 from public.exercise_classifications c
		  join public.classification_nodes n on n.id = c.node_id
		 where c.exercise_id = e.exercise_id
		   and (p.node_id = c.node_id
		        or p.node_id = (case when n.kind = 'subnotion' then n.parent_id else n.id end)))
	 limit 1;
	if v_code is not null then
		raise exception 'L''exercice % porte le point %, qui ne serait plus couvert par aucun de ses rangements : retirez d''abord ce tag.', old.exercise_id, v_code
			using errcode = 'check_violation';
	end if;

	return null;
end $fn$;

create trigger exercise_classifications_guard_point_tags
	after delete or update of node_id, exercise_id on public.exercise_classifications
	for each row execute function public.exercise_classifications_guard_point_tags();

-- Des fonctions de trigger, jamais appelées directement (même règle que l'arbre des notions).
revoke execute on function public.question_template_points_check_rules() from public, anon, authenticated;
revoke execute on function public.question_templates_guard_point_tags() from public, anon, authenticated;
revoke execute on function public.curriculum_points_guard_tags() from public, anon, authenticated;
revoke execute on function public.classification_nodes_guard_point_tags() from public, anon, authenticated;
revoke execute on function public.exercise_curriculum_points_check_rules() from public, anon, authenticated;
revoke execute on function public.exercise_classifications_guard_point_tags() from public, anon, authenticated;

-- ---- 4. Écrire les tags (chaque ligne passe par les règles ci-dessus) -----------------------
insert into public.question_template_points (template_id, point_id)
select t.template_id, p.id
  from _tg_tags t
  join public.curriculum_points p on p.code = t.code and p.grade = t.grade and p.node_id is not null
  join public.question_templates q on q.id = t.template_id
 order by t.template_id, t.code;

-- ---- 5. Vérifications ---------------------------------------------------------------------
do $check$
declare
	v_n integer;
	v_m integer;
begin
	-- Tags écrits : les 473 (modèles présents) ou aucun, et aucun autre tag neuf
	select count(*) into v_m
	  from (select distinct template_id from _tg_tags) t
	  join public.question_templates q on q.id = t.template_id;
	select count(*) into v_n
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id and p.node_id is not null
	  join _tg_tags t on t.template_id = q.template_id and t.code = p.code and t.grade = p.grade;
	if (v_m = 420 and v_n <> 473) or (v_m = 0 and v_n <> 0) then
		raise exception 'tags écrits : % (modèles présents : %)', v_n, v_m;
	end if;
	select count(*) into v_m
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id
	 where p.node_id is not null;
	if v_m <> v_n then
		raise exception 'tags de points neufs : % en base pour % écrits', v_m, v_n;
	end if;

	-- Les règles tiennent pour TOUS les tags neufs
	select count(*) into v_n
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id and p.node_id is not null
	  join public.question_templates t on t.id = q.template_id
	  left join public.classification_nodes n on n.id = t.classification_node_id
	 where t.classification_node_id is null
	    or (p.node_id <> t.classification_node_id
	        and p.node_id is distinct from (case when n.kind = 'subnotion' then n.parent_id else n.id end));
	if v_n <> 0 then
		raise exception 'règle 1 (modèles) : % tag(s) hors règle', v_n;
	end if;
	select count(*) into v_n
	  from (select q.template_id, p.grade
	          from public.question_template_points q
	          join public.curriculum_points p on p.id = q.point_id and p.node_id is not null
	         group by q.template_id, p.grade
	        having count(*) > 1) x;
	if v_n <> 0 then
		raise exception 'règle 2 : % modèle(s) avec deux points d''un même programme', v_n;
	end if;
	select count(*) into v_n
	  from public.exercise_curriculum_points e
	  join public.curriculum_points p on p.id = e.point_id and p.node_id is not null
	 where not exists (
		select 1 from public.exercise_classifications c
		  join public.classification_nodes n on n.id = c.node_id
		 where c.exercise_id = e.exercise_id
		   and (p.node_id = c.node_id
		        or p.node_id = (case when n.kind = 'subnotion' then n.parent_id else n.id end)));
	if v_n <> 0 then
		raise exception 'règle 1 (exercices) : % tag(s) hors règle', v_n;
	end if;

	-- La contrainte des deux générations est posée et validée
	select count(*) into v_n from pg_constraint where conname = 'curriculum_points_one_generation' and convalidated;
	if v_n <> 1 then
		raise exception 'contrainte curriculum_points_one_generation absente ou non validée';
	end if;

	-- Les anciens tags sont intacts
	select count(*) into v_n
	  from _tg_anciens a
	 where not exists (
		select 1 from public.question_template_points q
		 where q.template_id = a.template_id and q.point_id = a.point_id);
	if v_n <> 0 then
		raise exception 'anciens tags disparus : %', v_n;
	end if;
	select count(*) into v_n
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id
	 where p.node_id is null;
	select count(*) into v_m from _tg_anciens;
	if v_n <> v_m then
		raise exception 'anciens tags : % au lieu de %', v_n, v_m;
	end if;
end $check$;

drop table _tg_anciens;
drop table _tg_tags;
