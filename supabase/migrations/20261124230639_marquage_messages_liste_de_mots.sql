-- =============================================================================
-- Écart T22 — marquage automatique des messages du chat : liste de mots élargie
-- =============================================================================
-- Avant : `check_profanity_simple` ne connaissait que quatre gros mots, cherchés
-- comme un morceau de texte (« salopette » était marquée, « connasse » non).
--
-- Après : liste relue par David le 2026-11-25 (six catégories : gros mots,
-- propos sexistes ou sexuels, racistes, homophobes, moqueries sur le physique ou
-- le handicap, menaces et incitations à se faire du mal). Le mot ou l'expression
-- est cherché EN ENTIER, sans tenir compte des majuscules, des accents, de la
-- ponctuation ni d'un « s » final (« con » marque « t'es trop CON », pas
-- « content »).
--
-- Accès (tranché par David le 2026-11-25) : personne ne lit rien de nouveau.
-- Davantage de messages portent `is_flagged`, donc la mention « signalé
-- automatiquement » dans la conversation, et arrivent dans l'onglet « Messages
-- marqués » du prof (écart T21), qui ne montre que les conversations qu'il peut
-- déjà ouvrir. Le message part toujours : le filtre ne bloque rien.
--
-- Les messages déjà envoyés ne sont pas relus (le trigger ne joue qu'à l'envoi
-- et à la modification du contenu).
--
-- Écart C32 au passage : le commentaire de `process_message_content` promettait
-- un contrôle « plus sophistiqué » côté serveur qui n'existe pas. Corps inchangé.
--
-- ADDITIF (deux fonctions remplacées, mêmes signatures, droits conservés).
-- Rollback : rejouer la définition de `check_profanity_simple` de
-- `20260616220000_baseline_schema.sql` (quatre mots, `position()`) et celle de
-- `process_message_content` de `20260616250000_trim_message_plain_text.sql`.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_profanity_simple(p_text text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  -- Formes normalisées : minuscules, sans accent, tout ce qui n'est ni lettre ni
  -- chiffre remplacé par une espace (« t'es mort » s'écrit donc « t es mort »).
  -- Uniquement [a-z0-9 ] : la liste est collée telle quelle dans une expression
  -- régulière.
  v_terms CONSTANT text[] := ARRAY[
    -- gros mots et insultes courantes
    'merde', 'putain', 'ptn', 'connard', 'connasse', 'con', 'conne', 'salaud', 'salopard',
    'enfoire', 'encule', 'batard', 'bouffon', 'abruti', 'cretin', 'debile', 'tocard',
    'cassos', 'boloss', 'clochard', 'trou du cul', 'fdp', 'fils de pute', 'ntm',
    'nique ta mere', 'nique', 'niquer', 'tg', 'ta gueule', 'ferme ta gueule', 'vtff',
    'va te faire foutre', 'fais chier', 'chier',
    -- insultes sexistes et propos sexuels
    'salope', 'pute', 'petasse', 'pouffiasse', 'grognasse', 'garce', 'chienne', 'trainee',
    'bite', 'chatte', 'couilles', 'suce', 'sucer', 'baise', 'branler', 'branleur', 'porno',
    'nude', 'nudes', 'envoie un nude',
    -- insultes racistes ou sur la religion
    'negre', 'negro', 'bougnoule', 'bicot', 'youpin', 'chinetoque', 'niakoue', 'bamboula',
    'macaque', 'romano', 'sale arabe', 'sale noir', 'sale blanc', 'sale juif',
    'sale musulman', 'sale chinois', 'sale rom', 'retourne dans ton pays',
    -- insultes homophobes
    'pede', 'pd', 'tapette', 'tarlouze', 'tafiole', 'fiotte', 'gouine', 'travelo',
    'sale gay', 'sale homo', 'sale lesbienne',
    -- moqueries sur le physique ou le handicap
    'gogol', 'mongol', 'mongolien', 'triso', 'trisomique', 'attarde', 'gros lard',
    'grosse vache', 'sale gros', 'sale grosse', 'gros porc', 'boudin', 'laideron',
    'bigleux', 't es moche', 'tes moche', 'tu es moche',
    -- menaces et incitations à se faire du mal
    'je vais te tuer', 'je vais te frapper', 'je vais te defoncer', 'je vais te buter',
    'je vais te niquer', 'on va te frapper', 'je te retrouve', 'je sais ou tu habites',
    't es mort', 'tes mort', 'tu es mort', 't es morte', 'tes morte', 'tu es morte',
    'tu vas mourir', 'va mourir', 'va crever', 'tu devrais mourir', 'suicide toi',
    'va te suicider', 'tue toi', 'va te pendre', 'personne ne t aime', 'personne t aime',
    'tout le monde te deteste'
  ];
  v_norm text;
BEGIN
  IF p_text IS NULL THEN
    RETURN false;
  END IF;

  v_norm := lower(p_text);
  v_norm := replace(replace(v_norm, 'œ', 'oe'), 'æ', 'ae');
  v_norm := translate(v_norm,
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
    'aaaaaaceeeeiiiinooooouuuuyy');
  v_norm := btrim(regexp_replace(v_norm, '[^a-z0-9]+', ' ', 'g'));

  IF v_norm = '' THEN
    RETURN false;
  END IF;

  -- Mot entier, « s » final toléré.
  RETURN v_norm ~ ('(^| )(' || array_to_string(v_terms, '|') || ')s?( |$)');
END;
$$;

CREATE OR REPLACE FUNCTION public.process_message_content() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_plain_text TEXT;
  v_has_profanity BOOLEAN;
BEGIN
  -- Extract plain text from TipTap JSON, trimming leading/trailing whitespace
  -- (extract_plain_text_from_tiptap appends a separator space after each block).
  v_plain_text := btrim(extract_plain_text_from_tiptap(NEW.content));
  NEW.plain_text := v_plain_text;

  -- Seul contrôle du contenu : la liste de mots de check_profanity_simple.
  -- Le message part toujours ; la marque le fait remonter chez le prof.
  v_has_profanity := check_profanity_simple(v_plain_text);

  IF v_has_profanity THEN
    NEW.is_flagged := true;
    NEW.flag_reason := 'Profanité détectée automatiquement';
  END IF;

  RETURN NEW;
END;
$$;
