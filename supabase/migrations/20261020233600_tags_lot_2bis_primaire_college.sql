-- ============================================================================
-- Tags du lot 2 bis : les modèles du primaire et du collège (CP → 3e) reçoivent leur point
-- de programme (ADR 0020 § 7), après les déplacements et changements de niveau qu'exige la
-- garde des tags.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/{cycle2,cm,sixieme,cycle4}.csv, verdicts
-- VALIDÉS par David (questions des modèles et niveaux, 2026-10-20) ; liste commentée :
-- docs/wip/arbre-notions/analyse/lot-2bis-modifications.md. Fichier GÉNÉRÉ par
-- docs/wip/arbre-notions/analyse/lot-2bis-migration.py — ne pas éditer à la main.
--   * 306 tags (verdict TAG) ; les modèles MODIFIER seront tagués après leur modification ;
--   * 91 modèles déplacés sur la sous-notion de leur point (R2), sans quoi le trigger
--     question_template_points_check_rules refuserait le tag ;
--   * 3 modèles reclassés de 5e en 4e ;
--   * les points 4-073 et 4-004 (sa moitié d'origine) rattachés au nœud « écriture d'une
--     expression », où est le modèle de 4-073.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche
-- aucun modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (321 modèles). Elle
-- est prouvée par tests/integration/tags-lot-2bis.test.ts, qui fabrique des copies des
-- identifiants de la prod (à leur nœud et leurs niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud et aux niveaux relevés, et aucun ne doit
-- porter de tag au CP → 3e (sinon une saisie faite depuis serait écrasée ou contredite).
-- Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- `updated_at` des modèles est PRÉSERVÉ (ranger et taguer ne modifient pas le contenu ; le
-- niveau suit la même règle que le rangement de la #981).
--
-- Accès (question tranchée par David le 2026-10-20) : aucune règle d'accès ne change. Les tags
-- sont lisibles par tout utilisateur connecté (policy question_template_points_read_authenticated),
-- comme avant ; l'élève du CP à la 3e voit son programme dans « Ma progression » dès qu'un
-- modèle de son niveau est tagué. Aucune donnée d'élève n'est touchée.
--
-- Rollback (il ne retire que ce que la migration a posé ; aucune donnée d'élève). Les tags
-- saisis depuis sur ces modèles sont gardés, mais un retour de nœud qui les contredirait est
-- refusé par question_templates_guard_point_tags : les compter d'abord. Bloc éprouvé par le
-- test d'intégration, à jouer dans une transaction :
-- ROLLBACK:BEGIN
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
--   ('52c4d773-d86c-45a3-88e4-ddc99cc4beab'::uuid, 'CP', 'CP-005'),
--   ('6165a051-7414-49ed-a78f-29d6af1595fe'::uuid, 'CP', 'CP-025'),
--   ('12c377ec-831d-4a2a-b5ff-17950ff80470'::uuid, 'CP', 'CP-018'),
--   ('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f'::uuid, 'CP', 'CP-023'),
--   ('9710ae96-13eb-4347-948f-9c84866f9c4e'::uuid, 'CP', 'CP-019'),
--   ('0eb500fe-8388-4b4c-9ed1-cf4c4fe5a1c5'::uuid, 'CP', 'CP-018'),
--   ('7feb1566-e7d3-4d2c-8f9f-8b72612cc761'::uuid, 'CP', 'CP-018'),
--   ('aeca7054-b690-4660-abf8-481c4b36d02e'::uuid, 'CP', 'CP-018'),
--   ('00497e5e-8025-4749-9591-907dec371319'::uuid, 'CP', 'CP-073'),
--   ('987d3641-05db-4201-8a33-cfd08f1ef6dc'::uuid, 'CP', 'CP-073'),
--   ('cf0d20d5-61ed-4aea-9a8f-b3eec9ca304e'::uuid, 'CP', 'CP-073'),
--   ('03d73489-42c8-49bd-b363-a0b1f3f8e1fa'::uuid, 'CP', 'CP-018'),
--   ('0830bc42-9462-4ab7-8854-9d9a50b1f885'::uuid, 'CP', 'CP-018'),
--   ('14db0ac6-1b80-4fcc-b79f-2a10dc578886'::uuid, 'CP', 'CP-018'),
--   ('1bd5fec6-12dc-4b04-9c30-6a09aa5fc3e9'::uuid, 'CP', 'CP-018'),
--   ('38d05331-5890-4e42-99ab-cab52cfb39f8'::uuid, 'CP', 'CP-018'),
--   ('3acfd757-25e1-4e58-9d5f-3684b9bfa830'::uuid, 'CP', 'CP-018'),
--   ('9e936c05-a438-40ef-8cab-63cd6059ab9a'::uuid, 'CP', 'CP-018'),
--   ('ce407cd3-2d10-460f-af58-e5bcc2a8c595'::uuid, 'CP', 'CP-018'),
--   ('f316e71e-a58e-4bbc-bed3-5fc483478186'::uuid, 'CP', 'CP-018'),
--   ('5bd4b19a-0416-4fcf-b55a-59f4ceb733e3'::uuid, 'CP', 'CP-005'),
--   ('c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e'::uuid, 'CE1', 'CE1-034'),
--   ('022130ca-f6c1-4c78-a147-6519a15f62cd'::uuid, 'CE1', 'CE1-028'),
--   ('713b71ab-6c7e-40ab-9923-fc9940dc7b89'::uuid, 'CE1', 'CE1-026'),
--   ('76d8c8ee-2d45-40c4-99fe-d0188455107f'::uuid, 'CE1', 'CE1-090'),
--   ('d6268317-c78c-4404-a474-634a0b89553a'::uuid, 'CE1', 'CE1-010'),
--   ('4d94ec28-27a9-4af5-8b11-42dc9d9aa103'::uuid, 'CE1', 'CE1-103'),
--   ('e94c03b6-604f-4074-8763-0744b97cb7dd'::uuid, 'CE1', 'CE1-024'),
--   ('9d709f5b-e079-4316-a4c7-fe51ae73544c'::uuid, 'CE1', 'CE1-035'),
--   ('e4c70b53-57ae-490d-9405-e9e6bc0b6c69'::uuid, 'CE1', 'CE1-101'),
--   ('47f97c9f-5117-4817-8d10-7c17777397d8'::uuid, 'CE1', 'CE1-028'),
--   ('4063af49-ad24-46be-a9c1-124dcbe74413'::uuid, 'CE1', 'CE1-030'),
--   ('0d57cc73-26f3-4c99-a77d-885e2111e4b4'::uuid, 'CE1', 'CE1-091'),
--   ('a0ac57ee-81b2-44ed-a421-2c3da817d58c'::uuid, 'CE1', 'CE1-091'),
--   ('b1c712cd-b969-495b-abc9-f3f6fb3e5a40'::uuid, 'CE1', 'CE1-091'),
--   ('b8e781f6-6562-45ce-b261-49e78a004d13'::uuid, 'CE1', 'CE1-091'),
--   ('495a397f-23b6-4bc4-82c3-2974b234b275'::uuid, 'CE1', 'CE1-006'),
--   ('9827242b-fbcd-4b63-8003-2b898372be63'::uuid, 'CE1', 'CE1-006'),
--   ('3eedd905-1526-4c90-9005-eb1df389a9f9'::uuid, 'CE1', 'CE1-006'),
--   ('17ed1fc1-07b6-4ec8-b140-393b5c56f55e'::uuid, 'CE1', 'CE1-006'),
--   ('c73734a8-aac1-4ce7-9aae-d568ce8752c5'::uuid, 'CE1', 'CE1-025'),
--   ('4988fdac-b8db-4761-8876-e434b3f4496b'::uuid, 'CE2', 'CE2-026'),
--   ('56b2737d-f208-4b46-a4af-80ba3a4d8c03'::uuid, 'CE2', 'CE2-026'),
--   ('0efb7c40-1e6e-4ba0-833e-8df0a0c29235'::uuid, 'CE2', 'CE2-025'),
--   ('0e39dbfb-cd2c-4d78-b070-7bdc1d7a62cc'::uuid, 'CE2', 'CE2-027'),
--   ('43c7fa4f-adec-49f9-b04f-e4ac8d7999b1'::uuid, 'CE2', 'CE2-028'),
--   ('59004d6b-3240-4708-be7f-c99ecae55a67'::uuid, 'CE2', 'CE2-028'),
--   ('6a7f461d-0123-40f3-9be0-ffae8c8d44cd'::uuid, 'CE2', 'CE2-028'),
--   ('72b8d989-4811-4f9a-a582-5a46b1f4ba24'::uuid, 'CE2', 'CE2-028'),
--   ('bc760fa1-d509-4730-8865-ffc2bb4b9ecf'::uuid, 'CE2', 'CE2-028'),
--   ('824a8b26-ec03-4c52-9a6d-1c54b1d32506'::uuid, 'CE2', 'CE2-092'),
--   ('61093b4f-9b77-4d2e-a937-5d7fca632107'::uuid, 'CE2', 'CE2-022'),
--   ('2c3a18e7-2727-4ae3-a899-e16cfc9c730b'::uuid, 'CE2', 'CE2-023'),
--   ('220b954f-cdf3-445b-94ef-5a255cf0d747'::uuid, 'CE2', 'CE2-021'),
--   ('2042caf5-b8cf-406f-8b31-d5841981301e'::uuid, 'CE2', 'CE2-085'),
--   ('89525edd-a895-4069-880e-4f5ef421e36f'::uuid, 'CE2', 'CE2-085'),
--   ('91ebd2ad-3035-492d-938a-5c76dad1ac8c'::uuid, 'CE2', 'CE2-085'),
--   ('bd127419-9f0f-4bd7-860c-b3ff94b5786e'::uuid, 'CE2', 'CE2-085'),
--   ('f4abc638-36cf-4544-9199-c676cac586a3'::uuid, 'CE2', 'CE2-085'),
--   ('7a34967c-bcb2-414b-920f-05d04aba34b4'::uuid, 'CE2', 'CE2-006'),
--   ('823f9e95-4459-49fb-9378-683e1b886079'::uuid, 'CE2', 'CE2-006'),
--   ('6ef8aedf-c8cf-4769-aa3e-b3de249492ae'::uuid, 'CE2', 'CE2-006'),
--   ('13d52989-fff8-4da6-a189-1f589cd53355'::uuid, 'CE2', 'CE2-006'),
--   ('421e9fc9-b141-48b8-aed8-bb3a6c35bf7a'::uuid, 'CM1', 'CM1-061'),
--   ('b4b5cf8b-32bc-4273-8c5a-20dc0e7550db'::uuid, 'CM1', 'CM1-061'),
--   ('c9c1966e-f644-412c-807e-b0620489a1e6'::uuid, 'CM1', 'CM1-061'),
--   ('e49b0cf8-3b48-4f0b-90ab-9687f8e37b1e'::uuid, 'CM1', 'CM1-061'),
--   ('b19167c8-49f8-427f-b493-2e2e14fb8508'::uuid, 'CM1', 'CM1-061'),
--   ('b26e8a84-3788-40f8-baf0-23f0f96fe1f0'::uuid, 'CM1', 'CM1-132'),
--   ('160f782d-c2ee-4d54-a8f9-86f52418abe9'::uuid, 'CM1', 'CM1-154'),
--   ('2227cd4e-cde2-4dbd-9930-5116d110c626'::uuid, 'CM1', 'CM1-155'),
--   ('ce00dd64-d584-4bfc-b23c-75d895f82a37'::uuid, 'CM1', 'CM1-155'),
--   ('f96588e4-50ee-4505-9015-54f965f8ab43'::uuid, 'CM1', 'CM1-155'),
--   ('8e32995e-a0fa-4a98-a975-379cc7274f50'::uuid, 'CM1', 'CM1-030'),
--   ('9c602223-064b-4efb-8649-8bf104e1d8b2'::uuid, 'CM1', 'CM1-030'),
--   ('c680af72-1509-440b-b6a9-bbac0828d0e1'::uuid, 'CM1', 'CM1-030'),
--   ('fac5225d-2dae-49ec-b449-8900e7385fe6'::uuid, 'CM1', 'CM1-132'),
--   ('668b1fe6-12e2-4c51-899e-646556e69675'::uuid, 'CM1', 'CM1-061'),
--   ('0629645f-7de3-4225-8326-83c868ce8adf'::uuid, 'CM1', 'CM1-042'),
--   ('f8e5c256-9522-4232-8e65-dadba885dba9'::uuid, 'CM1', 'CM1-061'),
--   ('69f6a332-5c4f-4e85-af37-0a4e1bcd07ad'::uuid, 'CM1', 'CM1-041'),
--   ('32beec3b-7d78-4d07-808b-0b0091ce89cf'::uuid, 'CM1', 'CM1-061'),
--   ('45e9fa53-1c61-40e8-88a4-183fcb162ce5'::uuid, 'CM1', 'CM1-061'),
--   ('7612e79a-7d54-4020-8d11-7253ec42622a'::uuid, 'CM1', 'CM1-006'),
--   ('a6045667-0ede-4774-a56b-d4728841133c'::uuid, 'CM1', 'CM1-006'),
--   ('7c642d2f-7060-45bf-bce7-9192925ff49c'::uuid, 'CM1', 'CM1-006'),
--   ('accbfd16-cfcb-4256-a4db-c2f9383b5feb'::uuid, 'CM1', 'CM1-006'),
--   ('16056d25-3fb3-489c-bab1-f833f5de007c'::uuid, 'CM1', 'CM1-011'),
--   ('58cf29a1-7110-4882-b514-dcaf6bf4efef'::uuid, 'CM1', 'CM1-011'),
--   ('d6e49340-e465-4228-8c37-306398c71ccb'::uuid, 'CM1', 'CM1-011'),
--   ('e4e3b16e-76f9-471a-966c-cca9a3cea9e4'::uuid, 'CM1', 'CM1-061'),
--   ('ee0ae544-946a-4c5a-a1cf-4761c4288cb2'::uuid, 'CM1', 'CM1-061'),
--   ('1af7263e-bb3a-4e81-8503-a08b7c31db25'::uuid, 'CM1', 'CM1-061'),
--   ('1b3adbd5-4f0c-4b08-9723-e512261a3a55'::uuid, 'CM1', 'CM1-047'),
--   ('2de16f41-5385-445d-84be-d587b287d6ba'::uuid, 'CM1', 'CM1-047'),
--   ('4b9bce94-082a-424f-8a8c-bc6e48348482'::uuid, 'CM1', 'CM1-047'),
--   ('71cb3df0-e60d-49aa-9418-c1867f5df447'::uuid, 'CM1', 'CM1-047'),
--   ('b73cf408-2dde-4083-935c-78e76716861a'::uuid, 'CM1', 'CM1-047'),
--   ('bf3089fa-4323-4af8-b4df-dd5d7dcb657f'::uuid, 'CM1', 'CM1-047'),
--   ('f74eede7-3447-43c9-9119-84af3805fbe7'::uuid, 'CM1', 'CM1-047'),
--   ('7caa084f-655c-49ce-8658-1e253efbbeda'::uuid, 'CM1', 'CM1-162'),
--   ('68bb6eda-b853-4a98-aad6-4fea055a7482'::uuid, 'CM1', 'CM1-044'),
--   ('8390762c-b72d-4449-a8cc-5322e5bd77a4'::uuid, 'CM1', 'CM1-040'),
--   ('3c79eb9c-af15-4bce-ac3a-fff675a30484'::uuid, 'CM1', 'CM1-045'),
--   ('b7cd1846-fb2a-4d5e-8269-925887ebfb3d'::uuid, 'CM1', 'CM1-045'),
--   ('9089828a-2190-4f39-9c9a-2b123cdd81d9'::uuid, 'CM1', 'CM1-020'),
--   ('83450f91-3dba-4d35-9139-f0ee013a3118'::uuid, 'CM1', 'CM1-026'),
--   ('37e39a3e-2714-4ca4-917a-7c865067aa86'::uuid, 'CM1', 'CM1-030'),
--   ('8a3a572b-526d-4d3a-a854-bb8b9e364190'::uuid, 'CM1', 'CM1-030'),
--   ('c88d66d6-099c-407f-8b41-2508888e4bd7'::uuid, 'CM1', 'CM1-030'),
--   ('d159d49f-4141-4ac4-9cb1-de40cba2ffc1'::uuid, 'CM1', 'CM1-030'),
--   ('acfdddb3-7f60-4e12-9408-3ee162b8cb17'::uuid, 'CM1', 'CM1-021'),
--   ('58f7a8dd-b8de-48f4-9cfa-5356b75e1c64'::uuid, 'CM2', 'CM2-141'),
--   ('ef7785cf-e448-4ee7-b588-a4e298bcc696'::uuid, 'CM2', 'CM2-142'),
--   ('1b94c415-df9a-43ad-b48e-0cbf894c342e'::uuid, 'CM2', 'CM2-142'),
--   ('5cc22ecd-351e-4959-ab27-79883cb9c9d3'::uuid, 'CM2', 'CM2-142'),
--   ('a377acaf-8e96-4ff4-93b6-23e841b0b094'::uuid, 'CM2', 'CM2-030'),
--   ('fcc54919-0d4d-4794-b27f-1a7945d19fd3'::uuid, 'CM2', 'CM2-030'),
--   ('757fc872-e037-47b6-b344-21d48a81e952'::uuid, 'CM2', 'CM2-030'),
--   ('4b1968b9-2210-4f08-a1b8-69eae735d714'::uuid, 'CM2', 'CM2-065'),
--   ('651836d4-4caf-4318-8a19-31c193349683'::uuid, 'CM2', 'CM2-065'),
--   ('590169c4-e51d-4ea1-adaa-1cc38093442f'::uuid, 'CM2', 'CM2-043'),
--   ('de15a4b0-a846-40d5-acb2-7a3f0b1aa22c'::uuid, 'CM2', 'CM2-043'),
--   ('6661b9ae-ece2-4d5c-8bcf-91f6825cf56f'::uuid, 'CM2', 'CM2-065'),
--   ('ec030034-54c7-413a-a379-ab494b41f70d'::uuid, 'CM2', 'CM2-003'),
--   ('71621ba5-d436-444c-a1e2-823a87f9b8fa'::uuid, 'CM2', 'CM2-008'),
--   ('ae96d7af-e1f6-4390-8100-c779260e4152'::uuid, 'CM2', 'CM2-065'),
--   ('7ac0e898-2063-4321-82e9-c8ab1ad534a4'::uuid, 'CM2', 'CM2-065'),
--   ('883fbf29-693b-45b0-8d83-4882fa7fdde4'::uuid, 'CM2', 'CM2-065'),
--   ('d22731c2-d6bd-4aca-8aac-f90d4aaa3d8f'::uuid, 'CM2', 'CM2-065'),
--   ('bddd7963-1e7d-4583-beb9-bb8b4cb759e3'::uuid, 'CM2', 'CM2-047'),
--   ('c4de2983-0df0-46a5-8bfb-1170bbdee706'::uuid, 'CM2', 'CM2-047'),
--   ('f0420211-adb3-4e2c-955d-43c12f43ae98'::uuid, 'CM2', 'CM2-047'),
--   ('f1e954b5-b2b7-455c-ae63-8355013e9a2b'::uuid, 'CM2', 'CM2-047'),
--   ('e765013f-7b0a-4357-bfbf-4612f9943301'::uuid, 'CM2', 'CM2-046'),
--   ('3d0d175f-0d2a-40d1-bc08-104c564d66d3'::uuid, 'CM2', 'CM2-047'),
--   ('59b9170e-90db-4912-a6ee-0b7a9215e523'::uuid, 'CM2', 'CM2-026'),
--   ('a186aa54-af28-46c9-ad2a-70cd70c1b495'::uuid, 'CM2', 'CM2-014'),
--   ('a62ccb82-e528-4618-867d-728eda80dd8e'::uuid, 'CM2', 'CM2-030'),
--   ('b1d3c8aa-34f3-4d01-9e27-499a91c1940e'::uuid, 'CM2', 'CM2-030'),
--   ('f3477519-1309-4deb-b3cc-5af828f900bb'::uuid, 'CM2', 'CM2-030'),
--   ('93147367-804e-4f71-aa6c-f80ca249fb0a'::uuid, '6', '6-125'),
--   ('ab257a42-2c02-4823-9ae8-f2bd2c79b82b'::uuid, '6', '6-125'),
--   ('81a64b0a-e6a2-45fc-90ce-c0aee11f539c'::uuid, '6', '6-106'),
--   ('5aa1d44c-074a-45d6-a03c-d4532b233b0a'::uuid, '6', '6-132'),
--   ('4290259a-df97-4cd9-a932-a1c22dbf12e7'::uuid, '6', '6-188'),
--   ('101cd4bd-b042-44cc-8065-d27bed53454b'::uuid, '6', '6-187'),
--   ('01e205ed-e30a-402f-8517-fd308a2fb26a'::uuid, '6', '6-152'),
--   ('9f33998e-af2a-4109-b664-10e5c9469d44'::uuid, '6', '6-151'),
--   ('fdd849f5-56b8-4da5-82d8-37f819e3ceaf'::uuid, '6', '6-201'),
--   ('059e3fc9-bc87-40b4-a8d8-b37e632fd3db'::uuid, '6', '6-200'),
--   ('90aaf9dd-9b0a-45d2-9fa9-8d71ca41ab29'::uuid, '6', '6-206'),
--   ('de806bd6-d768-497c-81ad-c620a8d60aca'::uuid, '6', '6-206'),
--   ('2f3b42a3-8a03-463b-bce7-4953c3bfb62d'::uuid, '6', '6-206'),
--   ('7a1bce0f-7db4-4e93-a1ea-2bed457995d3'::uuid, '6', '6-206'),
--   ('66348f97-93b5-4b4e-8671-363d846641ad'::uuid, '6', '6-206'),
--   ('75956b22-7d7d-4f3e-b16e-c65a884fd75f'::uuid, '6', '6-206'),
--   ('663fafd3-2a1f-4021-957a-2d94e318481e'::uuid, '6', '6-157'),
--   ('0bb7a4ca-9c8c-4d37-a7d9-889aa7ed152a'::uuid, '6', '6-157'),
--   ('018c28a6-a7a5-4a18-81ab-127ec6ee8083'::uuid, '6', '6-159'),
--   ('0d7faf05-ac00-4492-a723-7217bb24e765'::uuid, '6', '6-159'),
--   ('311bf024-36c9-4256-9c5a-9444d20086e5'::uuid, '6', '6-159'),
--   ('35ce2472-0efc-4119-9b61-0c25985411d8'::uuid, '6', '6-159'),
--   ('38ba3458-1561-4667-94e8-66302759fe2c'::uuid, '6', '6-159'),
--   ('3e21300d-4634-4810-8d64-90e5177d1653'::uuid, '6', '6-159'),
--   ('4c1139bc-b581-4cc2-ab72-d007b6f08ff8'::uuid, '6', '6-159'),
--   ('5c5b5d76-a5e6-4fd9-b239-4d0748f120b9'::uuid, '6', '6-159'),
--   ('65c32979-d51b-4c65-9759-f1e8fa9c676e'::uuid, '6', '6-159'),
--   ('b409c04c-81ff-477e-a7fd-f1dc1548e39b'::uuid, '6', '6-159'),
--   ('ebdc9d34-2444-4fe2-847e-7552611e4cfe'::uuid, '6', '6-159'),
--   ('ed61b1c5-4a2a-4c59-bab6-52ee2545fd53'::uuid, '6', '6-159'),
--   ('060086c8-2576-4b6f-a2c1-5994b83530db'::uuid, '6', '6-144'),
--   ('00e255ee-0b1f-4ace-8097-d744bedfde8d'::uuid, '6', '6-149'),
--   ('66f9abbf-6e85-42ff-bf3c-af6d573491c3'::uuid, '6', '6-199'),
--   ('3a7a5711-941c-466f-95c6-51a4691c767b'::uuid, '6', '6-200'),
--   ('571ca739-e3be-47de-b431-e888a9e46f18'::uuid, '6', '6-118'),
--   ('ddbce820-5e75-4a7a-832e-33980cd4b43a'::uuid, '6', '6-118'),
--   ('e1b540fa-1be8-4993-a731-e536eac64c3e'::uuid, '6', '6-115'),
--   ('4a097db2-5c7e-47d7-8e1b-7a7edd746363'::uuid, '6', '6-115'),
--   ('bac3e110-94a4-459e-a0a1-238c60266555'::uuid, '6', '6-115'),
--   ('7c1f54d2-88f4-4101-9fec-a3835165569c'::uuid, '6', '6-115'),
--   ('d3348c15-81a2-481b-bbe5-aa2ef1bc56c0'::uuid, '6', '6-115'),
--   ('04586513-034d-4503-8eb8-e8a3789000b9'::uuid, '6', '6-118'),
--   ('341cdac0-a149-438b-a1a4-ec9255fbca1c'::uuid, '6', '6-118'),
--   ('e8db6091-2d87-4f76-aab4-af17aa3071f3'::uuid, '6', '6-118'),
--   ('7607426e-7e1e-4312-a1ee-d3c70a64764d'::uuid, '6', '6-118'),
--   ('6268eb21-1b8e-4264-953c-0c1abdcd6dc7'::uuid, '6', '6-118'),
--   ('000368e1-cc26-4b75-a3f3-cc619c02f940'::uuid, '6', '6-106'),
--   ('c1a83c8f-47ea-4253-92cd-3cc703f913c2'::uuid, '6', '6-106'),
--   ('58bbee5d-b4b1-4d03-9fad-08ec6172a580'::uuid, '6', '6-135'),
--   ('6fdcdda1-abba-44d5-9e10-610599ff8b06'::uuid, '6', '6-126'),
--   ('c415d81d-64be-453a-a30e-fb5625530a68'::uuid, '6', '6-127'),
--   ('0e4284e3-1275-4758-aeba-5194a6b406ba'::uuid, '6', '6-141'),
--   ('625ef069-3001-497b-b373-fd32df017044'::uuid, '6', '6-141'),
--   ('75b46e1c-a819-40c0-9774-69b64ec45719'::uuid, '6', '6-141'),
--   ('892540a1-af39-4f66-b9b0-3d6d930f5d48'::uuid, '6', '6-141'),
--   ('ab9fa42c-a753-43df-a691-f8e037ad140c'::uuid, '6', '6-141'),
--   ('fc34853f-1de7-4c8a-96cb-57132357206f'::uuid, '6', '6-141'),
--   ('62590cd3-c811-4acc-9b0d-0ff9e19c4c55'::uuid, '6', '6-105'),
--   ('8fd459da-05ef-4053-a52e-5bd2f2ac1a44'::uuid, '6', '6-105'),
--   ('e0ccaf84-14b4-4422-8dc0-f5da48c87c42'::uuid, '6', '6-191'),
--   ('3107454a-6271-430b-ab8e-26c28fa69772'::uuid, '5', '5-028'),
--   ('514dab07-b251-432f-b79a-5a0218f59010'::uuid, '5', '5-025'),
--   ('7abb09ef-bf3b-4e09-b013-777e3d4ad92e'::uuid, '5', '5-025'),
--   ('378f7535-ea7f-44ef-98ea-bb7d9c3c105f'::uuid, '5', '5-039'),
--   ('9356e80e-54a5-4a3d-b581-77d4f5c4dd4c'::uuid, '5', '5-039'),
--   ('11aa8848-272f-48b0-9e2f-94abf8533523'::uuid, '5', '5-035'),
--   ('6f196b0c-bb7f-47b0-a842-de67922c3566'::uuid, '5', '5-035'),
--   ('d0e52256-07bd-40b5-bfbf-4f768c232ef8'::uuid, '5', '5-035'),
--   ('91d67722-87da-4afd-a5e8-bda65c28ed84'::uuid, '5', '5-045'),
--   ('b5fb27b0-dd83-4d19-bb23-fec0f51c82bb'::uuid, '5', '5-045'),
--   ('07de8610-123c-49c8-9258-edf4ce098354'::uuid, '5', '5-045'),
--   ('8ad66c77-ecb1-44bb-86f6-321248445615'::uuid, '5', '5-045'),
--   ('2c695c23-74d0-44e4-998c-a048ad7d231b'::uuid, '5', '5-045'),
--   ('60274461-d74e-4f9d-bde0-64059d17d7c7'::uuid, '5', '5-045'),
--   ('6bc8108f-f558-4218-9a50-f0bb254af5f5'::uuid, '4', '4-024'),
--   ('d80e2e02-b4eb-4170-84f3-ce4fcbe94875'::uuid, '4', '4-024'),
--   ('1a6ff542-94c6-4f90-a4cc-e67f9af3cc59'::uuid, '5', '5-126'),
--   ('aca32223-37cb-4d05-8d4d-5fe27bb9b921'::uuid, '5', '5-126'),
--   ('810fd3be-3d56-4638-bd8f-7e29c90deabd'::uuid, '5', '5-073'),
--   ('2250fe9f-4b62-4492-9cf2-1e16e66a710d'::uuid, '5', '5-007'),
--   ('7d004582-6216-4a5b-845a-ebb96c424fc9'::uuid, '5', '5-007'),
--   ('e5cf940b-0b97-41ba-8667-839c44c3e029'::uuid, '5', '5-007'),
--   ('78feafed-650f-44e0-a2c3-1e677809722b'::uuid, '4', '4-073'),
--   ('176e619d-52e2-45d5-8a9d-6b015f7a865e'::uuid, '5', '5-026'),
--   ('79a9aaa1-5b7a-44fd-b97d-fdfedfc62ffd'::uuid, '5', '5-026'),
--   ('a7ba721b-0d9d-41e9-bff7-6a2369432e08'::uuid, '5', '5-020'),
--   ('26cfe6ef-55b4-4284-a431-495e0f18cf30'::uuid, '5', '5-020'),
--   ('1d41e370-b662-4c43-89c5-519495d8fd2b'::uuid, '5', '5-020'),
--   ('1b866448-717d-44a8-8a6e-648c4ec55a48'::uuid, '5', '5-020'),
--   ('fd2c3e4b-832a-4eda-87d8-cc61ab1c9c71'::uuid, '5', '5-018'),
--   ('b896b6ce-9cf0-430a-87ef-b242204cbc3b'::uuid, '5', '5-018'),
--   ('31144f5f-04e1-40d3-8972-871527d5669c'::uuid, '5', '5-018'),
--   ('3c0464a3-4904-4e0d-b1a8-60e50e3e1f82'::uuid, '5', '5-018'),
--   ('32469cec-a95f-4a47-9672-870707027eba'::uuid, '5', '5-018'),
--   ('372d4f79-d0d9-4016-bd07-56fd782b5b95'::uuid, '5', '5-045'),
--   ('6e44d741-ec0a-49f2-8eb3-3c971c31dc11'::uuid, '5', '5-018'),
--   ('0a34e472-b985-4faa-b4d6-c804e96aff29'::uuid, '5', '5-020'),
--   ('abc5d417-7638-4048-b710-0394c4ccc42c'::uuid, '5', '5-023'),
--   ('8c7942e4-b81a-4049-9e78-7e2f14d5b055'::uuid, '5', '5-022'),
--   ('756bdbb7-edaa-4263-bd19-493620183371'::uuid, '5', '5-012'),
--   ('0f182533-6669-43f5-b5d8-3ce9955e9dee'::uuid, '5', '5-013'),
--   ('f7f22023-19cd-4745-aa96-8a3c930cde0f'::uuid, '5', '5-012'),
--   ('12e27dba-8939-4f84-94e9-87c88458b7c3'::uuid, '5', '5-017'),
--   ('e0b6d00a-cc63-43bb-b2a0-c13d0e0fa00e'::uuid, '5', '5-017'),
--   ('5edc1514-51d0-4905-8982-2205086e9ae8'::uuid, '5', '5-031'),
--   ('53834a24-7e69-4ce6-a2be-b98cf56de981'::uuid, '4', '4-024'),
--   ('779ee55a-2fc4-4778-b7b0-4ea4b99e5646'::uuid, '4', '4-025'),
--   ('8c173562-4cfe-4a98-9d03-ca33313ff4e2'::uuid, '4', '4-025'),
--   ('c81c5852-9be1-4bd0-bc87-855faabb54f5'::uuid, '4', '4-024'),
--   ('dcf060e6-647c-40c7-b5e4-9bb680010bc6'::uuid, '4', '4-024'),
--   ('e32c95b0-6da2-42bd-8628-5aced23320c2'::uuid, '4', '4-024'),
--   ('4466d293-33fd-4a47-b707-2e56297ed527'::uuid, '4', '4-024'),
--   ('53b5e68d-28ae-4bd8-9cb0-a4335ca689a7'::uuid, '4', '4-024'),
--   ('d9f2003b-d028-4bcb-b5ab-2fe93933c5b4'::uuid, '4', '4-015'),
--   ('3fe98dd9-7545-4287-8301-7d87e8c1976f'::uuid, '4', '4-015'),
--   ('6b44d220-2485-4d2c-aa35-70e74abec66e'::uuid, '4', '4-052'),
--   ('1dd4d0ea-26d6-40a8-b804-e4dbf412c710'::uuid, '4', '4-052'),
--   ('32a81f6f-2725-41b0-84e6-3d395728b30a'::uuid, '4', '4-022'),
--   ('d4679e2d-e8dc-4577-b7c4-1ef739189f8e'::uuid, '4', '4-022'),
--   ('2120ce5f-57f3-45cb-bd76-dcf8f8b41e52'::uuid, '4', '4-070'),
--   ('dac2e771-1de1-4379-82fd-0acb5af7d55c'::uuid, '4', '4-070'),
--   ('2cefbf89-44a7-406b-83e2-e9d7f793c08e'::uuid, '4', '4-012'),
--   ('30a906e7-b128-437c-9cc8-55361a50db36'::uuid, '4', '4-012'),
--   ('3527eaae-8a99-47fe-b7a3-8746b1c940f8'::uuid, '4', '4-012'),
--   ('9c8d35a9-bc07-48e6-b58e-5cf86a43b776'::uuid, '4', '4-012'),
--   ('a395f569-1fa7-4d07-a85d-5c2a45edde3c'::uuid, '4', '4-012'),
--   ('4115768c-ddd5-4ecd-9436-ae3228dd9eed'::uuid, '4', '4-011'),
--   ('25b78a6f-7a6e-4067-a729-761351333b27'::uuid, '4', '4-008'),
--   ('4bbe387a-6577-437f-8ae5-58619f22c115'::uuid, '4', '4-008'),
--   ('f4e3c18f-54ec-489a-8712-182c5ed53637'::uuid, '4', '4-008'),
--   ('f705befd-9b37-45a9-8ee5-1f431e99b884'::uuid, '4', '4-008'),
--   ('27d0361f-e935-4443-b631-f69d523928ea'::uuid, '4', '4-016'),
--   ('de2cd6a1-dd65-41d7-a9ed-92da94178572'::uuid, '4', '4-016'),
--   ('ce6c3465-9f48-4a95-a0eb-457e54e9095b'::uuid, '4', '4-019'),
--   ('ee4e4979-12cf-46c6-b631-ac148b1df005'::uuid, '4', '4-019'),
--   ('9f660581-dcd2-470e-9ad1-6c7b5982ee1c'::uuid, '4', '4-015'),
--   ('2da974f7-133c-4ad3-9053-dc18a48e4afd'::uuid, '4', '4-001'),
--   ('a5d4c3ee-4e84-4dde-ac7e-aeb557e56a45'::uuid, '4', '4-024'),
--   ('ace89247-0194-4049-b365-76c3a644069b'::uuid, '4', '4-001'),
--   ('4bee24f9-60bc-47f3-aab9-e8904c8772bf'::uuid, '4', '4-001'),
--   ('74a31e06-3cb6-4360-823b-299e7cb55e03'::uuid, '4', '4-003'),
--   ('aa8d6e3b-256f-4b8e-b7eb-9493dbf7f193'::uuid, '4', '4-003'),
--   ('995bd551-58e8-4295-bd06-f2d377784a64'::uuid, '4', '4-002'),
--   ('4d13f5d6-8350-4c34-96de-a5e31fb9759b'::uuid, '4', '4-002'),
--   ('4b07cd65-5d06-4fd4-ac56-d2388f4a66fe'::uuid, '4', '4-002'),
--   ('ac0e5b62-b6bc-4a82-85c4-d1b25a9d4d69'::uuid, '4', '4-015'),
--   ('ae8ad17a-39ad-486b-aea5-6d1a61f2a885'::uuid, '4', '4-015'),
--   ('4df558f0-37b9-4093-a3e4-fdc45a05e847'::uuid, '4', '4-019'),
--   ('1703620c-ceb3-48ec-bc08-de90d54086a1'::uuid, '3', '3-013'),
--   ('9fefb94c-283f-44aa-9adf-203221a2edc0'::uuid, '3', '3-013'),
--   ('32cf5766-85eb-46c0-8885-4b6a00ee8a97'::uuid, '3', '3-016'),
--   ('a6a6c491-be89-4a81-8a9d-6412c2396f2d'::uuid, '3', '3-016'),
--   ('ff8082bd-fe4d-4747-bddc-19eced72839f'::uuid, '3', '3-058'),
--   ('ff9bb2fb-9104-43af-98a8-344df090f716'::uuid, '3', '3-058'),
--   ('843c3186-afc6-4ccd-83f7-beab64d3e420'::uuid, '3', '3-011'),
--   ('aeb86af9-7bf1-440a-be17-735a41b5ce46'::uuid, '3', '3-011'),
--   ('c32ebff9-7e10-400e-bc06-c376f6991ea8'::uuid, '3', '3-011'),
--   ('2d29792b-f7d7-4950-90db-9530ca3b02c4'::uuid, '3', '3-044'),
--   ('7c07749c-c90d-4393-a087-370f518e93e6'::uuid, '3', '3-066'),
--   ('15ddcc75-6c66-4ad1-a9e9-cd843241d006'::uuid, '3', '3-066'),
--   ('0d43f797-8217-4dfe-a2be-9ee040f1ca35'::uuid, '3', '3-044'),
--   ('1c5bce2c-5cdd-4c36-b11e-8b222844252f'::uuid, '3', '3-044'),
--   ('18761148-ca6b-4c7f-ae72-506819de30bb'::uuid, '3', '3-052'),
--   ('8b213d74-4ffa-4a6e-88c4-cb6bf3bed88a'::uuid, '3', '3-052'),
--   ('93a5f7a9-61f2-4553-a529-6f89c37b569c'::uuid, '3', '3-012')
--  ) as r(template_id, grade, code)
--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- create temporary table _l2_retour on commit drop as
-- select r.id, r.grades, case when r.sous_notion is null then nn.id else s.id end as node_id
--   from (values
--   ('12c377ec-831d-4a2a-b5ff-17950ff80470'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$complément$l2$, array['CP']),
--   ('5bd4b19a-0416-4fcf-b55a-59f4ceb733e3'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CP']),
--   ('022130ca-f6c1-4c78-a147-6519a15f62cd'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$double et moitié$l2$, array['CE1']),
--   ('acf15102-533f-49bf-8add-2d6ffd4237aa'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CE1']),
--   ('17ed1fc1-07b6-4ec8-b140-393b5c56f55e'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CE1']),
--   ('c73734a8-aac1-4ce7-9aae-d568ce8752c5'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CE1']),
--   ('4988fdac-b8db-4761-8876-e434b3f4496b'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, array['CE2']),
--   ('56b2737d-f208-4b46-a4af-80ba3a4d8c03'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, array['CE2']),
--   ('13d52989-fff8-4da6-a189-1f589cd53355'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CE2']),
--   ('421e9fc9-b141-48b8-aed8-bb3a6c35bf7a'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, array['CM1']),
--   ('b4b5cf8b-32bc-4273-8c5a-20dc0e7550db'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, array['CM1']),
--   ('c9c1966e-f644-412c-807e-b0620489a1e6'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, array['CM1']),
--   ('e49b0cf8-3b48-4f0b-90ab-9687f8e37b1e'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, array['CM1']),
--   ('b19167c8-49f8-427f-b493-2e2e14fb8508'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, array['CM1']),
--   ('b26e8a84-3788-40f8-baf0-23f0f96fe1f0'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$ordre$l2$, array['CM1']),
--   ('160f782d-c2ee-4d54-a8f9-86f52418abe9'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('2227cd4e-cde2-4dbd-9930-5116d110c626'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('8e32995e-a0fa-4a98-a975-379cc7274f50'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM1']),
--   ('9c602223-064b-4efb-8649-8bf104e1d8b2'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM1']),
--   ('c680af72-1509-440b-b6a9-bbac0828d0e1'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM1']),
--   ('668b1fe6-12e2-4c51-899e-646556e69675'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM1']),
--   ('f8e5c256-9522-4232-8e65-dadba885dba9'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['CM1']),
--   ('32beec3b-7d78-4d07-808b-0b0091ce89cf'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, array['CM1']),
--   ('45e9fa53-1c61-40e8-88a4-183fcb162ce5'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$complément$l2$, array['CM1']),
--   ('7612e79a-7d54-4020-8d11-7253ec42622a'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('a6045667-0ede-4774-a56b-d4728841133c'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('7c642d2f-7060-45bf-bce7-9192925ff49c'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('accbfd16-cfcb-4256-a4db-c2f9383b5feb'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('e4e3b16e-76f9-471a-966c-cca9a3cea9e4'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM1']),
--   ('ee0ae544-946a-4c5a-a1cf-4761c4288cb2'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM1']),
--   ('1af7263e-bb3a-4e81-8503-a08b7c31db25'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, array['CM1']),
--   ('7caa084f-655c-49ce-8658-1e253efbbeda'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$décomposition$l2$, array['CM1']),
--   ('59b781cc-1e3c-45e7-8b31-9773931129b3'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, array['CM1']),
--   ('3c79eb9c-af15-4bce-ac3a-fff675a30484'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, array['CM1']),
--   ('b7cd1846-fb2a-4d5e-8269-925887ebfb3d'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, array['CM1']),
--   ('37e39a3e-2714-4ca4-917a-7c865067aa86'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM1']),
--   ('8a3a572b-526d-4d3a-a854-bb8b9e364190'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM1']),
--   ('c88d66d6-099c-407f-8b41-2508888e4bd7'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM1']),
--   ('d159d49f-4141-4ac4-9cb1-de40cba2ffc1'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM1']),
--   ('58f7a8dd-b8de-48f4-9cfa-5356b75e1c64'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, array['CM2']),
--   ('ef7785cf-e448-4ee7-b588-a4e298bcc696'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, array['CM2']),
--   ('a377acaf-8e96-4ff4-93b6-23e841b0b094'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM2']),
--   ('fcc54919-0d4d-4794-b27f-1a7945d19fd3'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM2']),
--   ('757fc872-e037-47b6-b344-21d48a81e952'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM2']),
--   ('45e06ece-246e-4182-ae1f-8d04a98e6aae'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM2']),
--   ('4b1968b9-2210-4f08-a1b8-69eae735d714'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM2']),
--   ('651836d4-4caf-4318-8a19-31c193349683'::uuid, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM2']),
--   ('6661b9ae-ece2-4d5c-8bcf-91f6825cf56f'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, array['CM2']),
--   ('ae96d7af-e1f6-4390-8100-c779260e4152'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM2']),
--   ('7ac0e898-2063-4321-82e9-c8ab1ad534a4'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, array['CM2']),
--   ('883fbf29-693b-45b0-8d83-4882fa7fdde4'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, array['CM2']),
--   ('d22731c2-d6bd-4aca-8aac-f90d4aaa3d8f'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, array['CM2']),
--   ('a62ccb82-e528-4618-867d-728eda80dd8e'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM2']),
--   ('b1d3c8aa-34f3-4d01-9e27-499a91c1940e'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM2']),
--   ('f3477519-1309-4deb-b3cc-5af828f900bb'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['CM2']),
--   ('93147367-804e-4f71-aa6c-f80ca249fb0a'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['6']),
--   ('ab257a42-2c02-4823-9ae8-f2bd2c79b82b'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['6']),
--   ('81a64b0a-e6a2-45fc-90ce-c0aee11f539c'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, array['6']),
--   ('101cd4bd-b042-44cc-8065-d27bed53454b'::uuid, $l2$Probabilités$l2$, $l2$Expériences aléatoires$l2$, $l2$probabilité simple$l2$, array['6']),
--   ('00e255ee-0b1f-4ace-8097-d744bedfde8d'::uuid, $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$carré$l2$, array['6']),
--   ('3a7a5711-941c-466f-95c6-51a4691c767b'::uuid, $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$rectangle$l2$, array['6']),
--   ('5d7726eb-edd4-4ae0-891a-3069d4694d06'::uuid, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$définition$l2$, array['6']),
--   ('82748db8-01fe-4c2e-86b6-4ef8c1dde805'::uuid, $l2$Grandeurs et mesures$l2$, $l2$Unités et conversions$l2$, $l2$unités composées$l2$, array['6']),
--   ('3107454a-6271-430b-ab8e-26c28fa69772'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$carrés$l2$, array['5']),
--   ('6bc8108f-f558-4218-9a50-f0bb254af5f5'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5']),
--   ('d80e2e02-b4eb-4170-84f3-ce4fcbe94875'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5']),
--   ('78feafed-650f-44e0-a2c3-1e677809722b'::uuid, $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$écriture d'une expression$l2$, array['5']),
--   ('24331791-3177-437f-bfc9-8e727e270293'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5']),
--   ('84755a7b-fe7d-4be7-b306-40d38dd07aef'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5']),
--   ('372d4f79-d0d9-4016-bd07-56fd782b5b95'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5']),
--   ('0a34e472-b985-4faa-b4d6-c804e96aff29'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5']),
--   ('347eb0d0-4607-4fdb-8f0f-2ecc42ff40b8'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5']),
--   ('5b53b1be-f9e7-4fc1-bbeb-be84e180a4fd'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5']),
--   ('db4f1dde-503b-4fad-8b02-96a5124221d5'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5']),
--   ('b1550840-5b8f-4a36-8581-5a8aa1267778'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5']),
--   ('5edc1514-51d0-4905-8982-2205086e9ae8'::uuid, $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, array['5']),
--   ('53834a24-7e69-4ce6-a2be-b98cf56de981'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, array['4']),
--   ('779ee55a-2fc4-4778-b7b0-4ea4b99e5646'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, array['4']),
--   ('8c173562-4cfe-4a98-9d03-ca33313ff4e2'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, array['4']),
--   ('c81c5852-9be1-4bd0-bc87-855faabb54f5'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, array['4']),
--   ('dcf060e6-647c-40c7-b5e4-9bb680010bc6'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, array['4']),
--   ('e32c95b0-6da2-42bd-8628-5aced23320c2'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, array['4']),
--   ('4466d293-33fd-4a47-b707-2e56297ed527'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, array['4']),
--   ('53b5e68d-28ae-4bd8-9cb0-a4335ca689a7'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, array['4']),
--   ('6a60ed10-3090-4278-b39a-292a6601c5c6'::uuid, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, array['4']),
--   ('b2af6f39-9f24-4491-95ba-7d25d53813fe'::uuid, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$simplification$l2$, array['4']),
--   ('9f660581-dcd2-470e-9ad1-6c7b5982ee1c'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$carré$l2$, array['4']),
--   ('a5d4c3ee-4e84-4dde-ac7e-aeb557e56a45'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, array['4']),
--   ('0b6d749f-95fc-4cfe-a83d-4e2c84bc0e38'::uuid, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, array['4']),
--   ('2d8e7948-bec8-4520-8d3d-4d6ac6d3d34c'::uuid, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$puissances de 10$l2$, array['4']),
--   ('ac0e5b62-b6bc-4a82-85c4-d1b25a9d4d69'::uuid, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$puissances de 10$l2$, array['4']),
--   ('ae8ad17a-39ad-486b-aea5-6d1a61f2a885'::uuid, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$puissances de 10$l2$, array['4']),
--   ('4df558f0-37b9-4093-a3e4-fdc45a05e847'::uuid, $l2$Nombres et calculs$l2$, $l2$Racines carrées : calculs$l2$, $l2$techniques de calcul$l2$, array['4']),
--   ('93a5f7a9-61f2-4553-a529-6f89c37b569c'::uuid, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$réduction$l2$, array['3'])
--   ) as r(id, branche, notion, sous_notion, grades)
--   left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
--   left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
--   left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion;
-- do $retour$ begin
-- 	if exists (select 1 from _l2_retour where node_id is null) then
-- 		raise exception 'rollback : % chemin(s) d''origine introuvable(s)', (select count(*) from _l2_retour where node_id is null);
-- 	end if;
-- end $retour$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = r.node_id, grades = r.grades
--   from _l2_retour r where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _l2_retour;
-- update public.curriculum_points p set node_id = nn.id
--   from public.classification_nodes b
--   join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = $l2$Relatifs : calculs$l2$
--  where b.kind = 'branch' and b.parent_id is null and b.name = $l2$Nombres et calculs$l2$ and p.grade = '4' and p.code = '4-004' and p.archived_at is null;
-- update public.curriculum_points p set node_id = nn.id
--   from public.classification_nodes b
--   join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = $l2$Relatifs : calculs$l2$
--  where b.kind = 'branch' and b.parent_id is null and b.name = $l2$Nombres et calculs$l2$ and p.grade = '4' and p.code = '4-073' and p.archived_at is null;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._l2_modeles;
drop table if exists pg_temp._l2_points;
create temporary table _l2_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null, grades_apres text[] not null,
	tag_grade text, tag_code text
);
create temporary table _l2_points (
	grade text not null, code text not null,
	branche text not null, notion text not null, sous_notion text
);
insert into _l2_modeles values
  ('52c4d773-d86c-45a3-88e4-ddc99cc4beab', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CP'], array['CP'], 'CP', 'CP-005'),
  ('6165a051-7414-49ed-a78f-29d6af1595fe', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, array['CP'], array['CP'], 'CP', 'CP-025'),
  ('12c377ec-831d-4a2a-b5ff-17950ff80470', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$complément$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$complément$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$complément$l2$, array['CP'], array['CP'], 'CP', 'CP-023'),
  ('9710ae96-13eb-4347-948f-9c84866f9c4e', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$double et moitié$l2$, array['CP'], array['CP'], 'CP', 'CP-019'),
  ('0eb500fe-8388-4b4c-9ed1-cf4c4fe5a1c5', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('7feb1566-e7d3-4d2c-8f9f-8b72612cc761', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('aeca7054-b690-4660-abf8-481c4b36d02e', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('00497e5e-8025-4749-9591-907dec371319', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-073'),
  ('987d3641-05db-4201-8a33-cfd08f1ef6dc', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-073'),
  ('cf0d20d5-61ed-4aea-9a8f-b3eec9ca304e', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-073'),
  ('03d73489-42c8-49bd-b363-a0b1f3f8e1fa', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('0830bc42-9462-4ab7-8854-9d9a50b1f885', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('14db0ac6-1b80-4fcc-b79f-2a10dc578886', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('1bd5fec6-12dc-4b04-9c30-6a09aa5fc3e9', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('38d05331-5890-4e42-99ab-cab52cfb39f8', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('3acfd757-25e1-4e58-9d5f-3684b9bfa830', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('9e936c05-a438-40ef-8cab-63cd6059ab9a', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('ce407cd3-2d10-460f-af58-e5bcc2a8c595', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('f316e71e-a58e-4bbc-bed3-5fc483478186', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CP'], array['CP'], 'CP', 'CP-018'),
  ('5bd4b19a-0416-4fcf-b55a-59f4ceb733e3', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CP'], array['CP'], 'CP', 'CP-005'),
  ('c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$double et moitié$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-034'),
  ('022130ca-f6c1-4c78-a147-6519a15f62cd', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-028'),
  ('acf15102-533f-49bf-8add-2d6ffd4237aa', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, array['CE1'], array['CE1'], null, null),
  ('713b71ab-6c7e-40ab-9923-fc9940dc7b89', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-026'),
  ('76d8c8ee-2d45-40c4-99fe-d0188455107f', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$tables$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-090'),
  ('d6268317-c78c-4404-a474-634a0b89553a', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$droite graduée$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$droite graduée$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-010'),
  ('4d94ec28-27a9-4af5-8b11-42dc9d9aa103', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-103'),
  ('e94c03b6-604f-4074-8763-0744b97cb7dd', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-024'),
  ('9d709f5b-e079-4316-a4c7-fe51ae73544c', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-035'),
  ('e4c70b53-57ae-490d-9405-e9e6bc0b6c69', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-101'),
  ('47f97c9f-5117-4817-8d10-7c17777397d8', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-028'),
  ('4063af49-ad24-46be-a9c1-124dcbe74413', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$puissances de 10$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$puissances de 10$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-030'),
  ('0d57cc73-26f3-4c99-a77d-885e2111e4b4', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-091'),
  ('a0ac57ee-81b2-44ed-a421-2c3da817d58c', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-091'),
  ('b1c712cd-b969-495b-abc9-f3f6fb3e5a40', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-091'),
  ('b8e781f6-6562-45ce-b261-49e78a004d13', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-091'),
  ('495a397f-23b6-4bc4-82c3-2974b234b275', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-006'),
  ('9827242b-fbcd-4b63-8003-2b898372be63', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-006'),
  ('3eedd905-1526-4c90-9005-eb1df389a9f9', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-006'),
  ('17ed1fc1-07b6-4ec8-b140-393b5c56f55e', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-006'),
  ('c73734a8-aac1-4ce7-9aae-d568ce8752c5', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$pair ou impair$l2$, array['CE1'], array['CE1'], 'CE1', 'CE1-025'),
  ('4988fdac-b8db-4761-8876-e434b3f4496b', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-026'),
  ('56b2737d-f208-4b46-a4af-80ba3a4d8c03', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-026'),
  ('0efb7c40-1e6e-4ba0-833e-8df0a0c29235', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-025'),
  ('0e39dbfb-cd2c-4d78-b070-7bdc1d7a62cc', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-027'),
  ('43c7fa4f-adec-49f9-b04f-e4ac8d7999b1', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-028'),
  ('59004d6b-3240-4708-be7f-c99ecae55a67', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-028'),
  ('6a7f461d-0123-40f3-9be0-ffae8c8d44cd', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-028'),
  ('72b8d989-4811-4f9a-a582-5a46b1f4ba24', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-028'),
  ('bc760fa1-d509-4730-8865-ffc2bb4b9ecf', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-028'),
  ('824a8b26-ec03-4c52-9a6d-1c54b1d32506', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-092'),
  ('61093b4f-9b77-4d2e-a937-5d7fca632107', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$double et moitié$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-022'),
  ('2c3a18e7-2727-4ae3-a899-e16cfc9c730b', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$puissances de 10$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$puissances de 10$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-023'),
  ('220b954f-cdf3-445b-94ef-5a255cf0d747', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-021'),
  ('2042caf5-b8cf-406f-8b31-d5841981301e', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-085'),
  ('89525edd-a895-4069-880e-4f5ef421e36f', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-085'),
  ('91ebd2ad-3035-492d-938a-5c76dad1ac8c', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-085'),
  ('bd127419-9f0f-4bd7-860c-b3ff94b5786e', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-085'),
  ('f4abc638-36cf-4544-9199-c676cac586a3', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-085'),
  ('7a34967c-bcb2-414b-920f-05d04aba34b4', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-006'),
  ('823f9e95-4459-49fb-9378-683e1b886079', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-006'),
  ('6ef8aedf-c8cf-4769-aa3e-b3de249492ae', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-006'),
  ('13d52989-fff8-4da6-a189-1f589cd53355', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, array['CE2'], array['CE2'], 'CE2', 'CE2-006'),
  ('421e9fc9-b141-48b8-aed8-bb3a6c35bf7a', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('b4b5cf8b-32bc-4273-8c5a-20dc0e7550db', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('c9c1966e-f644-412c-807e-b0620489a1e6', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('e49b0cf8-3b48-4f0b-90ab-9687f8e37b1e', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('b19167c8-49f8-427f-b493-2e2e14fb8508', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$addition$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('b26e8a84-3788-40f8-baf0-23f0f96fe1f0', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$ordre$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$encadrement$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-132'),
  ('160f782d-c2ee-4d54-a8f9-86f52418abe9', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-154'),
  ('2227cd4e-cde2-4dbd-9930-5116d110c626', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-155'),
  ('ce00dd64-d584-4bfc-b23c-75d895f82a37', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-155'),
  ('f96588e4-50ee-4505-9015-54f965f8ab43', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-155'),
  ('8e32995e-a0fa-4a98-a975-379cc7274f50', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('9c602223-064b-4efb-8649-8bf104e1d8b2', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('c680af72-1509-440b-b6a9-bbac0828d0e1', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('fac5225d-2dae-49ec-b449-8900e7385fe6', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$encadrement$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$encadrement$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-132'),
  ('668b1fe6-12e2-4c51-899e-646556e69675', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('0629645f-7de3-4225-8326-83c868ce8adf', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-042'),
  ('f8e5c256-9522-4232-8e65-dadba885dba9', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('69f6a332-5c4f-4e85-af37-0a4e1bcd07ad', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-041'),
  ('32beec3b-7d78-4d07-808b-0b0091ce89cf', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('45e9fa53-1c61-40e8-88a4-183fcb162ce5', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$complément$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('7612e79a-7d54-4020-8d11-7253ec42622a', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-006'),
  ('a6045667-0ede-4774-a56b-d4728841133c', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-006'),
  ('7c642d2f-7060-45bf-bce7-9192925ff49c', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-006'),
  ('accbfd16-cfcb-4256-a4db-c2f9383b5feb', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-006'),
  ('16056d25-3fb3-489c-bab1-f833f5de007c', $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$critères de divisibilité$l2$, $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$critères de divisibilité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-011'),
  ('58cf29a1-7110-4882-b514-dcaf6bf4efef', $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$critères de divisibilité$l2$, $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$critères de divisibilité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-011'),
  ('d6e49340-e465-4228-8c37-306398c71ccb', $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$critères de divisibilité$l2$, $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$critères de divisibilité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-011'),
  ('e4e3b16e-76f9-471a-966c-cca9a3cea9e4', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('ee0ae544-946a-4c5a-a1cf-4761c4288cb2', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('1af7263e-bb3a-4e81-8503-a08b7c31db25', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-061'),
  ('1b3adbd5-4f0c-4b08-9723-e512261a3a55', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('2de16f41-5385-445d-84be-d587b287d6ba', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('4b9bce94-082a-424f-8a8c-bc6e48348482', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('71cb3df0-e60d-49aa-9418-c1867f5df447', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('b73cf408-2dde-4083-935c-78e76716861a', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('bf3089fa-4323-4af8-b4df-dd5d7dcb657f', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('f74eede7-3447-43c9-9119-84af3805fbe7', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-047'),
  ('7caa084f-655c-49ce-8658-1e253efbbeda', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$tables$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-162'),
  ('68bb6eda-b853-4a98-aad6-4fea055a7482', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-044'),
  ('59b781cc-1e3c-45e7-8b31-9773931129b3', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM1'], array['CM1'], null, null),
  ('8390762c-b72d-4449-a8cc-5322e5bd77a4', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$puissances de 10$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$puissances de 10$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-040'),
  ('3c79eb9c-af15-4bce-ac3a-fff675a30484', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-045'),
  ('b7cd1846-fb2a-4d5e-8269-925887ebfb3d', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$quadruple et quart$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-045'),
  ('9089828a-2190-4f39-9c9a-2b123cdd81d9', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$ordre$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$ordre$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-020'),
  ('83450f91-3dba-4d35-9139-f0ee013a3118', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$décomposition$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-026'),
  ('37e39a3e-2714-4ca4-917a-7c865067aa86', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('8a3a572b-526d-4d3a-a854-bb8b9e364190', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('c88d66d6-099c-407f-8b41-2508888e4bd7', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('d159d49f-4141-4ac4-9cb1-de40cba2ffc1', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-030'),
  ('acfdddb3-7f60-4e12-9408-3ee162b8cb17', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, array['CM1'], array['CM1'], 'CM1', 'CM1-021'),
  ('58f7a8dd-b8de-48f4-9cfa-5356b75e1c64', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-141'),
  ('ef7785cf-e448-4ee7-b588-a4e298bcc696', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-142'),
  ('1b94c415-df9a-43ad-b48e-0cbf894c342e', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-142'),
  ('5cc22ecd-351e-4959-ab27-79883cb9c9d3', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-142'),
  ('a377acaf-8e96-4ff4-93b6-23e841b0b094', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-030'),
  ('fcc54919-0d4d-4794-b27f-1a7945d19fd3', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-030'),
  ('757fc872-e037-47b6-b344-21d48a81e952', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-030'),
  ('45e06ece-246e-4182-ae1f-8d04a98e6aae', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], null, null),
  ('4b1968b9-2210-4f08-a1b8-69eae735d714', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('651836d4-4caf-4318-8a19-31c193349683', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('590169c4-e51d-4ea1-adaa-1cc38093442f', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-043'),
  ('de15a4b0-a846-40d5-acb2-7a3f0b1aa22c', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$division$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-043'),
  ('6661b9ae-ece2-4d5c-8bcf-91f6825cf56f', $l2$Nombres et calculs$l2$, $l2$Entiers : addition et soustraction$l2$, $l2$calcul astucieux$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('ec030034-54c7-413a-a379-ab494b41f70d', $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : numération$l2$, $l2$écritures$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-003'),
  ('71621ba5-d436-444c-a1e2-823a87f9b8fa', $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$multiples et diviseurs$l2$, $l2$Arithmétique$l2$, $l2$Divisibilité$l2$, $l2$multiples et diviseurs$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-008'),
  ('ae96d7af-e1f6-4390-8100-c779260e4152', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('7ac0e898-2063-4321-82e9-c8ab1ad534a4', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('883fbf29-693b-45b0-8d83-4882fa7fdde4', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('d22731c2-d6bd-4aca-8aac-f90d4aaa3d8f', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$produits particuliers$l2$, $l2$Algèbre$l2$, $l2$Premiers pas algébriques$l2$, $l2$égalités à trous$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-065'),
  ('bddd7963-1e7d-4583-beb9-bb8b4cb759e3', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-047'),
  ('c4de2983-0df0-46a5-8bfb-1170bbdee706', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-047'),
  ('f0420211-adb3-4e2c-955d-43c12f43ae98', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-047'),
  ('f1e954b5-b2b7-455c-ae63-8355013e9a2b', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-047'),
  ('e765013f-7b0a-4357-bfbf-4612f9943301', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$calcul astucieux$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-046'),
  ('3d0d175f-0d2a-40d1-bc08-104c564d66d3', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$distributivité$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-047'),
  ('59b9170e-90db-4912-a6ee-0b7a9215e523', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$décomposition$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-026'),
  ('a186aa54-af28-46c9-ad2a-70cd70c1b495', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$décomposition$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$décomposition$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-014'),
  ('a62ccb82-e528-4618-867d-728eda80dd8e', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-030'),
  ('b1d3c8aa-34f3-4d01-9e27-499a91c1940e', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-030'),
  ('f3477519-1309-4deb-b3cc-5af828f900bb', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['CM2'], array['CM2'], 'CM2', 'CM2-030'),
  ('93147367-804e-4f71-aa6c-f80ca249fb0a', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, array['6'], array['6'], '6', '6-125'),
  ('ab257a42-2c02-4823-9ae8-f2bd2c79b82b', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, array['6'], array['6'], '6', '6-125'),
  ('81a64b0a-e6a2-45fc-90ce-c0aee11f539c', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$forme décimale$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['6'], array['6'], '6', '6-106'),
  ('5aa1d44c-074a-45d6-a03c-d4532b233b0a', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$égalité de fractions$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$égalité de fractions$l2$, array['6'], array['6'], '6', '6-132'),
  ('4290259a-df97-4cd9-a932-a1c22dbf12e7', $l2$Probabilités$l2$, $l2$Expériences aléatoires$l2$, $l2$fréquences$l2$, $l2$Probabilités$l2$, $l2$Expériences aléatoires$l2$, $l2$fréquences$l2$, array['6'], array['6'], '6', '6-188'),
  ('101cd4bd-b042-44cc-8065-d27bed53454b', $l2$Probabilités$l2$, $l2$Expériences aléatoires$l2$, $l2$probabilité simple$l2$, $l2$Probabilités$l2$, $l2$Expériences aléatoires$l2$, $l2$équiprobabilité$l2$, array['6'], array['6'], '6', '6-187'),
  ('01e205ed-e30a-402f-8517-fd308a2fb26a', $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$carré$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$carré$l2$, array['6'], array['6'], '6', '6-152'),
  ('9f33998e-af2a-4109-b664-10e5c9469d44', $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$carré$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$carré$l2$, array['6'], array['6'], '6', '6-151'),
  ('fdd849f5-56b8-4da5-82d8-37f819e3ceaf', $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$rectangle$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$rectangle$l2$, array['6'], array['6'], '6', '6-201'),
  ('059e3fc9-bc87-40b4-a8d8-b37e632fd3db', $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$rectangle$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$rectangle$l2$, array['6'], array['6'], '6', '6-200'),
  ('90aaf9dd-9b0a-45d2-9fa9-8d71ca41ab29', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-206'),
  ('de806bd6-d768-497c-81ad-c620a8d60aca', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-206'),
  ('2f3b42a3-8a03-463b-bce7-4953c3bfb62d', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-206'),
  ('7a1bce0f-7db4-4e93-a1ea-2bed457995d3', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-206'),
  ('66348f97-93b5-4b4e-8671-363d846641ad', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-206'),
  ('75956b22-7d7d-4f3e-b16e-c65a884fd75f', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-206'),
  ('663fafd3-2a1f-4021-957a-2d94e318481e', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-157'),
  ('0bb7a4ca-9c8c-4d37-a7d9-889aa7ed152a', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$calcul de durées$l2$, array['6'], array['6'], '6', '6-157'),
  ('018c28a6-a7a5-4a18-81ab-127ec6ee8083', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('0d7faf05-ac00-4492-a723-7217bb24e765', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('311bf024-36c9-4256-9c5a-9444d20086e5', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('35ce2472-0efc-4119-9b61-0c25985411d8', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('38ba3458-1561-4667-94e8-66302759fe2c', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('3e21300d-4634-4810-8d64-90e5177d1653', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('4c1139bc-b581-4cc2-ab72-d007b6f08ff8', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('5c5b5d76-a5e6-4fd9-b239-4d0748f120b9', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('65c32979-d51b-4c65-9759-f1e8fa9c676e', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('b409c04c-81ff-477e-a7fd-f1dc1548e39b', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('ebdc9d34-2444-4fe2-847e-7552611e4cfe', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('ed61b1c5-4a2a-4c59-bab6-52ee2545fd53', $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, $l2$Grandeurs et mesures$l2$, $l2$Durées$l2$, $l2$conversions$l2$, array['6'], array['6'], '6', '6-159'),
  ('060086c8-2576-4b6f-a2c1-5994b83530db', $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$carré$l2$, $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$carré$l2$, array['6'], array['6'], '6', '6-144'),
  ('00e255ee-0b1f-4ace-8097-d744bedfde8d', $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$carré$l2$, $l2$Grandeurs et mesures$l2$, $l2$Longueurs$l2$, $l2$comparaison et mesure$l2$, array['6'], array['6'], '6', '6-149'),
  ('66f9abbf-6e85-42ff-bf3c-af6d573491c3', $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$rectangle$l2$, $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$rectangle$l2$, array['6'], array['6'], '6', '6-199'),
  ('3a7a5711-941c-466f-95c6-51a4691c767b', $l2$Grandeurs et mesures$l2$, $l2$Périmètres$l2$, $l2$rectangle$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$rectangle$l2$, array['6'], array['6'], '6', '6-200'),
  ('571ca739-e3be-47de-b431-e888a9e46f18', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('ddbce820-5e75-4a7a-832e-33980cd4b43a', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('e1b540fa-1be8-4993-a731-e536eac64c3e', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-115'),
  ('4a097db2-5c7e-47d7-8e1b-7a7edd746363', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-115'),
  ('bac3e110-94a4-459e-a0a1-238c60266555', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-115'),
  ('7c1f54d2-88f4-4101-9fec-a3835165569c', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-115'),
  ('d3348c15-81a2-481b-bbe5-aa2ef1bc56c0', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-115'),
  ('04586513-034d-4503-8eb8-e8a3789000b9', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('341cdac0-a149-438b-a1a4-ec9255fbca1c', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('e8db6091-2d87-4f76-aab4-af17aa3071f3', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('7607426e-7e1e-4312-a1ee-d3c70a64764d', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('6268eb21-1b8e-4264-953c-0c1abdcd6dc7', $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : calculs$l2$, $l2$multiplication$l2$, array['6'], array['6'], '6', '6-118'),
  ('000368e1-cc26-4b75-a3f3-cc619c02f940', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['6'], array['6'], '6', '6-106'),
  ('c1a83c8f-47ea-4253-92cd-3cc703f913c2', $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['6'], array['6'], '6', '6-106'),
  ('58bbee5d-b4b1-4d03-9fad-08ec6172a580', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, array['6'], array['6'], '6', '6-135'),
  ('6fdcdda1-abba-44d5-9e10-610599ff8b06', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, array['6'], array['6'], '6', '6-126'),
  ('c415d81d-64be-453a-a30e-fb5625530a68', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, array['6'], array['6'], '6', '6-127'),
  ('0e4284e3-1275-4758-aeba-5194a6b406ba', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, array['6'], array['6'], '6', '6-141'),
  ('625ef069-3001-497b-b373-fd32df017044', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, array['6'], array['6'], '6', '6-141'),
  ('75b46e1c-a819-40c0-9774-69b64ec45719', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, array['6'], array['6'], '6', '6-141'),
  ('892540a1-af39-4f66-b9b0-3d6d930f5d48', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, array['6'], array['6'], '6', '6-141'),
  ('ab9fa42c-a753-43df-a691-f8e037ad140c', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, array['6'], array['6'], '6', '6-141');
insert into _l2_modeles values
  ('fc34853f-1de7-4c8a-96cb-57132357206f', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$calculs de pourcentages$l2$, array['6'], array['6'], '6', '6-141'),
  ('5d7726eb-edd4-4ae0-891a-3069d4694d06', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Décimaux : numération$l2$, $l2$forme fractionnaire$l2$, array['6'], array['6'], null, null),
  ('62590cd3-c811-4acc-9b0d-0ff9e19c4c55', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$définition$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$définition$l2$, array['6'], array['6'], '6', '6-105'),
  ('8fd459da-05ef-4053-a52e-5bd2f2ac1a44', $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$définition$l2$, $l2$Proportionnalité$l2$, $l2$Pourcentages$l2$, $l2$définition$l2$, array['6'], array['6'], '6', '6-105'),
  ('e0ccaf84-14b4-4422-8dc0-f5da48c87c42', $l2$Proportionnalité$l2$, $l2$Situations de proportionnalité$l2$, null, $l2$Proportionnalité$l2$, $l2$Situations de proportionnalité$l2$, null, array['6'], array['6'], '6', '6-191'),
  ('82748db8-01fe-4c2e-86b6-4ef8c1dde805', $l2$Grandeurs et mesures$l2$, $l2$Unités et conversions$l2$, $l2$unités composées$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$unités et conversions$l2$, array['6'], array['6'], null, null),
  ('3107454a-6271-430b-ab8e-26c28fa69772', $l2$Nombres et calculs$l2$, $l2$Entiers : multiplication$l2$, $l2$carrés$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['5'], array['5'], '5', '5-028'),
  ('514dab07-b251-432f-b79a-5a0218f59010', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$ordre$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$ordre$l2$, array['5'], array['5'], '5', '5-025'),
  ('7abb09ef-bf3b-4e09-b013-777e3d4ad92e', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$ordre$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$ordre$l2$, array['5'], array['5'], '5', '5-025'),
  ('378f7535-ea7f-44ef-98ea-bb7d9c3c105f', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$réduction$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$réduction$l2$, array['5'], array['5'], '5', '5-039'),
  ('9356e80e-54a5-4a3d-b581-77d4f5c4dd4c', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$réduction$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$réduction$l2$, array['5'], array['5'], '5', '5-039'),
  ('11aa8848-272f-48b0-9e2f-94abf8533523', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$substitution$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$substitution$l2$, array['5'], array['5'], '5', '5-035'),
  ('6f196b0c-bb7f-47b0-a842-de67922c3566', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$substitution$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$substitution$l2$, array['5'], array['5'], '5', '5-035'),
  ('d0e52256-07bd-40b5-bfbf-4f768c232ef8', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$substitution$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$substitution$l2$, array['5'], array['5'], '5', '5-035'),
  ('91d67722-87da-4afd-a5e8-bda65c28ed84', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('b5fb27b0-dd83-4d19-bb23-fec0f51c82bb', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('07de8610-123c-49c8-9258-edf4ce098354', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('8ad66c77-ecb1-44bb-86f6-321248445615', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('2c695c23-74d0-44e4-998c-a048ad7d231b', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('60274461-d74e-4f9d-bde0-64059d17d7c7', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('6bc8108f-f558-4218-9a50-f0bb254af5f5', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['4'], '4', '4-024'),
  ('d80e2e02-b4eb-4170-84f3-ce4fcbe94875', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['4'], '4', '4-024'),
  ('1a6ff542-94c6-4f90-a4cc-e67f9af3cc59', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, array['5'], array['5'], '5', '5-126'),
  ('aca32223-37cb-4d05-8d4d-5fe27bb9b921', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, array['5'], array['5'], '5', '5-126'),
  ('810fd3be-3d56-4638-bd8f-7e29c90deabd', $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$parallélogramme$l2$, $l2$Grandeurs et mesures$l2$, $l2$Aires$l2$, $l2$parallélogramme$l2$, array['5'], array['5'], '5', '5-073'),
  ('2250fe9f-4b62-4492-9cf2-1e16e66a710d', $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$sans parenthèses$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$sans parenthèses$l2$, array['5'], array['5'], '5', '5-007'),
  ('7d004582-6216-4a5b-845a-ebb96c424fc9', $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$sans parenthèses$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$sans parenthèses$l2$, array['5'], array['5'], '5', '5-007'),
  ('e5cf940b-0b97-41ba-8667-839c44c3e029', $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$sans parenthèses$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$sans parenthèses$l2$, array['5'], array['5'], '5', '5-007'),
  ('78feafed-650f-44e0-a2c3-1e677809722b', $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$écriture d'une expression$l2$, $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$écriture d'une expression$l2$, array['5'], array['4'], '4', '4-073'),
  ('176e619d-52e2-45d5-8a9d-6b015f7a865e', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, array['5'], array['5'], '5', '5-026'),
  ('79a9aaa1-5b7a-44fd-b97d-fdfedfc62ffd', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$addition et soustraction$l2$, array['5'], array['5'], '5', '5-026'),
  ('a7ba721b-0d9d-41e9-bff7-6a2369432e08', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], '5', '5-020'),
  ('26cfe6ef-55b4-4284-a431-495e0f18cf30', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], '5', '5-020'),
  ('1d41e370-b662-4c43-89c5-519495d8fd2b', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], '5', '5-020'),
  ('1b866448-717d-44a8-8a6e-648c4ec55a48', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], '5', '5-020'),
  ('fd2c3e4b-832a-4eda-87d8-cc61ab1c9c71', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5'], array['5'], '5', '5-018'),
  ('b896b6ce-9cf0-430a-87ef-b242204cbc3b', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5'], array['5'], '5', '5-018'),
  ('31144f5f-04e1-40d3-8972-871527d5669c', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5'], array['5'], '5', '5-018'),
  ('3c0464a3-4904-4e0d-b1a8-60e50e3e1f82', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5'], array['5'], '5', '5-018'),
  ('32469cec-a95f-4a47-9672-870707027eba', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5'], array['5'], '5', '5-018'),
  ('24331791-3177-437f-bfc9-8e727e270293', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], null, null),
  ('84755a7b-fe7d-4be7-b306-40d38dd07aef', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], null, null),
  ('372d4f79-d0d9-4016-bd07-56fd782b5b95', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], '5', '5-045'),
  ('6e44d741-ec0a-49f2-8eb3-3c971c31dc11', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes$l2$, array['5'], array['5'], '5', '5-018'),
  ('0a34e472-b985-4faa-b4d6-c804e96aff29', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], '5', '5-020'),
  ('abc5d417-7638-4048-b710-0394c4ccc42c', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5'], array['5'], '5', '5-023'),
  ('347eb0d0-4607-4fdb-8f0f-2ecc42ff40b8', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], null, null),
  ('5b53b1be-f9e7-4fc1-bbeb-be84e180a4fd', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], null, null),
  ('db4f1dde-503b-4fad-8b02-96a5124221d5', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$différences$l2$, array['5'], array['5'], null, null),
  ('b1550840-5b8f-4a36-8581-5a8aa1267778', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['5'], array['5'], null, null),
  ('8c7942e4-b81a-4049-9e78-7e2f14d5b055', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$sommes algébriques$l2$, array['5'], array['5'], '5', '5-022'),
  ('756bdbb7-edaa-4263-bd19-493620183371', $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$définition$l2$, array['5'], array['5'], '5', '5-012'),
  ('0f182533-6669-43f5-b5d8-3ce9955e9dee', $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$définition$l2$, array['5'], array['5'], '5', '5-013'),
  ('f7f22023-19cd-4745-aa96-8a3c930cde0f', $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$définition$l2$, array['5'], array['5'], '5', '5-012'),
  ('12e27dba-8939-4f84-94e9-87c88458b7c3', $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$ordre$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$ordre$l2$, array['5'], array['5'], '5', '5-017'),
  ('e0b6d00a-cc63-43bb-b2a0-c13d0e0fa00e', $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$ordre$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : sens et écritures$l2$, $l2$ordre$l2$, array['5'], array['5'], '5', '5-017'),
  ('5edc1514-51d0-4905-8982-2205086e9ae8', $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['5'], array['5'], '5', '5-031'),
  ('53834a24-7e69-4ce6-a2be-b98cf56de981', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('779ee55a-2fc4-4778-b7b0-4ea4b99e5646', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = cx + d$l2$, array['4'], array['4'], '4', '4-025'),
  ('8c173562-4cfe-4a98-9d03-ca33313ff4e2', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = cx + d$l2$, array['4'], array['4'], '4', '4-025'),
  ('c81c5852-9be1-4bd0-bc87-855faabb54f5', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('dcf060e6-647c-40c7-b5e4-9bb680010bc6', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('e32c95b0-6da2-42bd-8628-5aced23320c2', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, null, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('4466d293-33fd-4a47-b707-2e56297ed527', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('53b5e68d-28ae-4bd8-9cb0-a4335ca689a7', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('6a60ed10-3090-4278-b39a-292a6601c5c6', $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax = b$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], null, null),
  ('b2af6f39-9f24-4491-95ba-7d25d53813fe', $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$simplification$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], null, null),
  ('d9f2003b-d028-4bcb-b5ab-2fe93933c5b4', $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-015'),
  ('3fe98dd9-7545-4287-8301-7d87e8c1976f', $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-015'),
  ('6b44d220-2485-4d2c-aa35-70e74abec66e', $l2$Proportionnalité$l2$, $l2$Vitesse$l2$, null, $l2$Proportionnalité$l2$, $l2$Vitesse$l2$, null, array['4'], array['4'], '4', '4-052'),
  ('1dd4d0ea-26d6-40a8-b804-e4dbf412c710', $l2$Proportionnalité$l2$, $l2$Vitesse$l2$, null, $l2$Proportionnalité$l2$, $l2$Vitesse$l2$, null, array['4'], array['4'], '4', '4-052'),
  ('32a81f6f-2725-41b0-84e6-3d395728b30a', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, array['4'], array['4'], '4', '4-022'),
  ('d4679e2d-e8dc-4577-b7c4-1ef739189f8e', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, array['4'], array['4'], '4', '4-022'),
  ('2120ce5f-57f3-45cb-bd76-dcf8f8b41e52', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$factorisation$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$factorisation$l2$, array['4'], array['4'], '4', '4-070'),
  ('dac2e771-1de1-4379-82fd-0acb5af7d55c', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$factorisation$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$factorisation$l2$, array['4'], array['4'], '4', '4-070'),
  ('2cefbf89-44a7-406b-83e2-e9d7f793c08e', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, array['4'], array['4'], '4', '4-012'),
  ('30a906e7-b128-437c-9cc8-55361a50db36', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, array['4'], array['4'], '4', '4-012'),
  ('3527eaae-8a99-47fe-b7a3-8746b1c940f8', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, array['4'], array['4'], '4', '4-012'),
  ('9c8d35a9-bc07-48e6-b58e-5cf86a43b776', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, array['4'], array['4'], '4', '4-012'),
  ('a395f569-1fa7-4d07-a85d-5c2a45edde3c', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$division$l2$, array['4'], array['4'], '4', '4-012'),
  ('4115768c-ddd5-4ecd-9436-ae3228dd9eed', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$inverse$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$inverse$l2$, array['4'], array['4'], '4', '4-011'),
  ('25b78a6f-7a6e-4067-a729-761351333b27', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, array['4'], array['4'], '4', '4-008'),
  ('4bbe387a-6577-437f-8ae5-58619f22c115', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, array['4'], array['4'], '4', '4-008'),
  ('f4e3c18f-54ec-489a-8712-182c5ed53637', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, array['4'], array['4'], '4', '4-008'),
  ('f705befd-9b37-45a9-8ee5-1f431e99b884', $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, $l2$Nombres et calculs$l2$, $l2$Fractions : calculs$l2$, $l2$multiplication$l2$, array['4'], array['4'], '4', '4-008'),
  ('27d0361f-e935-4443-b631-f69d523928ea', $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$produit de puissances$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$produit de puissances$l2$, array['4'], array['4'], '4', '4-016'),
  ('de2cd6a1-dd65-41d7-a9ed-92da94178572', $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$produit de puissances$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$produit de puissances$l2$, array['4'], array['4'], '4', '4-016'),
  ('ce6c3465-9f48-4a95-a0eb-457e54e9095b', $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-019'),
  ('ee4e4979-12cf-46c6-b631-ac148b1df005', $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-019'),
  ('9f660581-dcd2-470e-9ad1-6c7b5982ee1c', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$carré$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-015'),
  ('2da974f7-133c-4ad3-9053-dc18a48e4afd', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, array['4'], array['4'], '4', '4-001'),
  ('a5d4c3ee-4e84-4dde-ac7e-aeb557e56a45', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], '4', '4-024'),
  ('ace89247-0194-4049-b365-76c3a644069b', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, array['4'], array['4'], '4', '4-001'),
  ('4bee24f9-60bc-47f3-aab9-e8904c8772bf', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, array['4'], array['4'], '4', '4-001'),
  ('74a31e06-3cb6-4360-823b-299e7cb55e03', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, array['4'], array['4'], '4', '4-003'),
  ('aa8d6e3b-256f-4b8e-b7eb-9493dbf7f193', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$produit$l2$, array['4'], array['4'], '4', '4-003'),
  ('0b6d749f-95fc-4cfe-a83d-4e2c84bc0e38', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, $l2$Algèbre$l2$, $l2$Équations : premier degré$l2$, $l2$ax + b = c$l2$, array['4'], array['4'], null, null),
  ('995bd551-58e8-4295-bd06-f2d377784a64', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, array['4'], array['4'], '4', '4-002'),
  ('4d13f5d6-8350-4c34-96de-a5e31fb9759b', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, array['4'], array['4'], '4', '4-002'),
  ('4b07cd65-5d06-4fd4-ac56-d2388f4a66fe', $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, $l2$Nombres et calculs$l2$, $l2$Relatifs : calculs$l2$, $l2$quotient$l2$, array['4'], array['4'], '4', '4-002'),
  ('2d8e7948-bec8-4520-8d3d-4d6ac6d3d34c', $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$puissances de 10$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], null, null),
  ('ac0e5b62-b6bc-4a82-85c4-d1b25a9d4d69', $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$puissances de 10$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-015'),
  ('ae8ad17a-39ad-486b-aea5-6d1a61f2a885', $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$puissances de 10$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-015'),
  ('4df558f0-37b9-4093-a3e4-fdc45a05e847', $l2$Nombres et calculs$l2$, $l2$Racines carrées : calculs$l2$, $l2$techniques de calcul$l2$, $l2$Nombres et calculs$l2$, $l2$Racines carrées : sens et écritures$l2$, $l2$définition$l2$, array['4'], array['4'], '4', '4-019'),
  ('1703620c-ceb3-48ec-bc08-de90d54086a1', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, array['3'], array['3'], '3', '3-013'),
  ('9fefb94c-283f-44aa-9adf-203221a2edc0', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$développement$l2$, array['3'], array['3'], '3', '3-013'),
  ('32cf5766-85eb-46c0-8885-4b6a00ee8a97', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, array['3'], array['3'], '3', '3-016'),
  ('a6a6c491-be89-4a81-8a9d-6412c2396f2d', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, array['3'], array['3'], '3', '3-016'),
  ('ff8082bd-fe4d-4747-bddc-19eced72839f', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, array['3'], array['3'], '3', '3-058'),
  ('ff9bb2fb-9104-43af-98a8-344df090f716', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$identités remarquables$l2$, array['3'], array['3'], '3', '3-058'),
  ('843c3186-afc6-4ccd-83f7-beab64d3e420', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$opposé d'une expression$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$opposé d'une expression$l2$, array['3'], array['3'], '3', '3-011'),
  ('aeb86af9-7bf1-440a-be17-735a41b5ce46', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$opposé d'une expression$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$opposé d'une expression$l2$, array['3'], array['3'], '3', '3-011'),
  ('c32ebff9-7e10-400e-bc06-c376f6991ea8', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$opposé d'une expression$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$opposé d'une expression$l2$, array['3'], array['3'], '3', '3-011'),
  ('2d29792b-f7d7-4950-90db-9530ca3b02c4', $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, null, $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, null, array['3'], array['3'], '3', '3-044'),
  ('7c07749c-c90d-4393-a087-370f518e93e6', $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, array['3'], array['3'], '3', '3-066'),
  ('15ddcc75-6c66-4ad1-a9e9-cd843241d006', $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, array['3'], array['3'], '3', '3-066'),
  ('0d43f797-8217-4dfe-a2be-9ee040f1ca35', $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, array['3'], array['3'], '3', '3-044'),
  ('1c5bce2c-5cdd-4c36-b11e-8b222844252f', $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, $l2$Fonctions$l2$, $l2$Fonctions affines$l2$, $l2$expression et droite$l2$, array['3'], array['3'], '3', '3-044'),
  ('18761148-ca6b-4c7f-ae72-506819de30bb', $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$quotient de puissances$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$quotient de puissances$l2$, array['3'], array['3'], '3', '3-052'),
  ('8b213d74-4ffa-4a6e-88c4-cb6bf3bed88a', $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$quotient de puissances$l2$, $l2$Nombres et calculs$l2$, $l2$Puissances : calculs$l2$, $l2$quotient de puissances$l2$, array['3'], array['3'], '3', '3-052'),
  ('93a5f7a9-61f2-4553-a529-6f89c37b569c', $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$réduction$l2$, $l2$Algèbre$l2$, $l2$Calcul littéral$l2$, $l2$écriture simplifiée$l2$, array['3'], array['3'], '3', '3-012');
insert into _l2_points values
  ('4', '4-004', $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$écriture d'une expression$l2$),
  ('4', '4-073', $l2$Nombres et calculs$l2$, $l2$Entiers : priorités opératoires$l2$, $l2$écriture d'une expression$l2$);

-- ---- 2. Résolution STRICTE des chemins -------------------------------------------------
create temporary table _l2_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _l2_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.name = r.apres_sous_notion;
create temporary table _l2_points_noeuds as
	select p.id as point_id, case when r.sous_notion is null then nn.id else s.id end as node_id
	  from _l2_points r
	  left join public.curriculum_points p on p.grade = r.grade and p.code = r.code and p.archived_at is null
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion;
create temporary table _l2_tags as
	select r.id as template_id, p.id as point_id
	  from _l2_modeles r
	  left join public.curriculum_points p on p.grade = r.tag_grade and p.code = r.tag_code and p.archived_at is null
	 where r.tag_code is not null;
do $resolution$
begin
	if exists (select 1 from _l2_noeuds where avant is null or apres is null)
	   or exists (select 1 from _l2_points_noeuds where point_id is null or node_id is null)
	   or exists (select 1 from _l2_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s) rattaché(s), % point(s) de tag',
			(select count(*) from _l2_noeuds where avant is null or apres is null),
			(select count(*) from _l2_points_noeuds where point_id is null or node_id is null),
			(select count(*) from _l2_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état relevé, aucun tag déjà posé ---------------
do $garde$
declare v_presents integer; v_ecarts integer; v_tags integer;
begin
	select count(*) into v_presents from _l2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 321) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 321', v_presents;
	end if;
	select count(*) into v_ecarts from _l2_modeles r
	  join _l2_noeuds x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.avant or q.grades is distinct from r.grades_avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _l2_modeles r on r.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id
	 where p.grade in ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3');
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
end $garde$;

-- ---- 4. Point rattaché, modèles déplacés et reclassés, tags ---------------------------
update public.curriculum_points p set node_id = r.node_id
  from _l2_points_noeuds r
 where p.id = r.point_id;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres, grades = r.grades_apres
  from _l2_modeles r join _l2_noeuds x on x.id = r.id
 where q.id = r.id
   and (q.classification_node_id is distinct from x.apres or q.grades is distinct from r.grades_apres);
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _l2_tags t
  join public.question_templates q on q.id = t.template_id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tags_attendus integer; v_points integer;
begin
	select count(*) into v_presents from _l2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _l2_modeles r
	  join _l2_noeuds x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id = x.apres and q.grades = r.grades_apres;
	select count(*) into v_tags from _l2_tags t
	  join public.question_template_points q on q.template_id = t.template_id and q.point_id = t.point_id;
	select count(*) into v_points from _l2_points_noeuds r
	  join public.curriculum_points p on p.id = r.point_id and p.node_id = r.node_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 306;
	if v_ok <> v_presents or v_tags <> v_tags_attendus or v_points <> 2 then
		raise exception 'lot incohérent : modèles %/%, tags %/%, points rattachés %/2',
			v_ok, v_presents, v_tags, v_tags_attendus, v_points;
	end if;
end $check$;

drop table _l2_tags;
drop table _l2_points_noeuds;
drop table _l2_noeuds;
drop table _l2_points;
drop table _l2_modeles;
