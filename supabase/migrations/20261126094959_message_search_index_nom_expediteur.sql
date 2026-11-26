-- Messagerie privée : l'envoi échouait pour un expéditeur sans nom complet (V131).
--
-- Le trigger `update_message_search_index` écrit le nom de l'expéditeur dans
-- `message_search_index.sender_name` (NOT NULL) à partir de `profiles.full_name`,
-- qui peut être vide : c'est le cas de presque tous les élèves en prod (prénom
-- et nom remplis, nom complet vide). L'insertion du message était alors refusée
-- (23502) et `POST /api/messages/send` rendait 500.
--
-- Repli : nom complet, sinon « prénom nom », sinon un texte fixe. Les chaînes
-- vides ou faites d'espaces comptent comme absentes.
--
-- Accès (tranché par David le 2026-11-26) : personne ne lit rien de nouveau. Le
-- nom écrit est celui de l'expéditeur, lu par les seuls destinataires du message
-- (recherche), qui voient déjà qui leur écrit.
--
-- Additive : seule la fonction du trigger change (mêmes droits, même
-- `search_path` que depuis 20261003210000). Aucune donnée modifiée : les lignes
-- d'index existantes ont toutes un nom.
--
-- Rollback : rejouer la définition précédente (baseline 20260616220000, avec
-- `SET search_path = public, pg_temp`), c'est-à-dire remplacer le calcul de
-- `v_sender_name` ci-dessous par :
--   SELECT full_name, role INTO v_sender_name, v_sender_role
--   FROM profiles WHERE id = NEW.sender_id;

CREATE OR REPLACE FUNCTION public.update_message_search_index() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_role TEXT;
  v_has_attachments BOOLEAN;
BEGIN
  -- Nom et rôle de l'expéditeur : nom complet, sinon « prénom nom »
  SELECT
    COALESCE(
      NULLIF(btrim(p.full_name), ''),
      NULLIF(btrim(concat_ws(' ', NULLIF(btrim(p.firstname), ''), NULLIF(btrim(p.lastname), ''))), '')
    ),
    p.role
  INTO v_sender_name, v_sender_role
  FROM profiles p
  WHERE p.id = NEW.sender_id;

  -- Ni nom complet, ni prénom, ni nom : le message part quand même
  v_sender_name := COALESCE(v_sender_name, 'Sans nom');

  -- Pièces jointes
  SELECT EXISTS (
    SELECT 1 FROM message_attachments_v2
    WHERE message_id = NEW.id
  ) INTO v_has_attachments;

  -- Ligne d'index créée ou mise à jour
  INSERT INTO message_search_index (
    message_id,
    sender_name,
    sender_role,
    subject_tsv,
    content_tsv,
    sent_at,
    has_attachments,
    recipient_count
  ) VALUES (
    NEW.id,
    v_sender_name,
    v_sender_role,
    to_tsvector('french', COALESCE(NEW.subject, '')),
    to_tsvector('french', COALESCE(NEW.plain_text, '')),
    NEW.sent_at,
    v_has_attachments,
    NEW.recipient_count
  )
  ON CONFLICT (message_id) DO UPDATE SET
    subject_tsv = to_tsvector('french', COALESCE(NEW.subject, '')),
    content_tsv = to_tsvector('french', COALESCE(NEW.plain_text, '')),
    has_attachments = v_has_attachments;

  RETURN NEW;
END;
$$;
