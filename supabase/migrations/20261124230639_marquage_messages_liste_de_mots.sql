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
-- « content »). Les accents saisis en deux caractères et les caractères
-- invisibles glissés dans un mot ne le cachent pas.
--
-- Accès (tranché par David le 2026-11-25) : personne ne lit rien de nouveau.
-- Davantage de messages portent `is_flagged`, donc la mention « signalé
-- automatiquement » dans la conversation, et arrivent dans l'onglet « Messages
-- marqués » du prof (écart T21), qui ne montre que les conversations qu'il peut
-- déjà ouvrir. Le message part toujours : le filtre ne bloque rien.
--
-- « tg » n'est pas dans la liste (décision de David, 2026-11-25) : c'est aussi
-- l'ancienne notation de la tangente (« tg x = 3 »). « ta gueule » y est.
--
-- Les messages déjà envoyés ne sont pas relus (le trigger ne joue qu'à l'envoi
-- et à la modification du contenu).
--
-- Écart C32 au passage : le commentaire de `process_message_content` promettait
-- un contrôle « plus sophistiqué » côté serveur qui n'existe pas.
--
-- La marque ne se maquille plus (constat du security-auditor, 2026-11-25). Les
-- policies UPDATE de `messages` n'ont pas de liste de colonnes et le trigger ne
-- jouait que sur `UPDATE OF content` : un élève pouvait, par l'API de la base,
-- retirer la marque de son message, changer la raison, ou remplacer le texte lu
-- par le prof (`plain_text`). Le trigger joue maintenant sur tout UPDATE.
-- Accès en miroir (tranché par David le 2026-11-25) : qui ne pourra plus écrire
-- ce qu'il écrivait ? L'élève n'écrit plus `is_flagged`, `flag_reason` ni
-- `plain_text` de ses messages (l'application ne le faisait jamais) ; il garde
-- la modification du contenu. Prof, admin et serveur écrivent toujours la marque.
-- `plain_text` est recalculé depuis le contenu pour tout le monde.
-- Test : tests/integration/messages-marque-non-maquillable.test.ts
--
-- ADDITIF (deux fonctions remplacées, mêmes signatures, droits conservés ; un
-- trigger redéfini sur la même fonction). Aucune donnée touchée.
-- Rollback : rejouer la définition de `check_profanity_simple` de
-- `20260616220000_baseline_schema.sql` (quatre mots, `position()`), celle de
-- `process_message_content` de `20260616250000_trim_message_plain_text.sql`, puis
--   CREATE OR REPLACE TRIGGER trigger_process_message_content
--     BEFORE INSERT OR UPDATE OF content ON public.messages
--     FOR EACH ROW EXECUTE FUNCTION public.process_message_content();
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
    'nique ta mere', 'nique', 'niquer', 'ta gueule', 'ferme ta gueule', 'vtff',
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

  -- Forme décomposée (NFKD) : une lettre accentuée devient la lettre suivie de
  -- son accent, quelle que soit la façon dont elle a été saisie ; les variantes
  -- de présentation (pleine chasse, ligatures) redeviennent des lettres simples.
  -- On retire ensuite les accents (de lettres et de symboles) et les caractères
  -- invisibles (trait d'union conditionnel, espaces et liants de largeur nulle,
  -- marques de sens d'écriture, sélecteurs de variante, étiquettes), qui
  -- couperaient un mot sans se voir à l'écran. Non traités : une lettre d'un
  -- autre alphabet qui ressemble à la nôtre, un chiffre à la place d'une lettre.
  v_norm := lower(normalize(p_text, NFKD));
  v_norm := regexp_replace(v_norm,
    '[\u0300-\u036F\u20D0-\u20FF\uFE00-\uFE0F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\U000E0000-\U000E007F]',
    '', 'g');
  v_norm := replace(replace(v_norm, 'œ', 'oe'), 'æ', 'ae');
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
  c_reason CONSTANT text := 'Profanité détectée automatiquement';
  v_plain_text text;
  v_privileged boolean;
  v_content_changed boolean;
  v_detected boolean;
  v_was_flagged boolean;
BEGIN
  -- Le texte lu par le prof vient TOUJOURS du contenu, jamais de ce que l'appelant
  -- écrit dans `plain_text` (extract_plain_text_from_tiptap ajoute une espace après
  -- chaque bloc, d'où btrim).
  v_plain_text := btrim(extract_plain_text_from_tiptap(NEW.content));
  NEW.plain_text := v_plain_text;

  -- Seul contrôle du contenu : la liste de mots de check_profanity_simple, jouée à
  -- l'envoi et quand le contenu change. Le message part toujours ; la marque le
  -- fait remonter chez le prof.
  v_content_changed := TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content;
  v_detected := v_content_changed AND check_profanity_simple(v_plain_text);

  -- Qui peut écrire la marque à la main : le serveur (service_role, tâche système :
  -- pas d'utilisateur connecté), le prof et l'admin. Les policies de `messages`
  -- ne laissent passer aucune écriture d'un visiteur non connecté.
  v_privileged := auth.uid() IS NULL OR is_teacher_or_admin();

  IF v_privileged THEN
    IF v_detected THEN
      NEW.is_flagged := true;
      NEW.flag_reason := c_reason;
    END IF;
    RETURN NEW;
  END IF;

  -- Un élève n'écrit ni la marque ni sa raison : elles viennent de la détection,
  -- et une marque posée ne se retire pas.
  IF TG_OP = 'INSERT' THEN
    NEW.is_flagged := v_detected;
    NEW.flag_reason := CASE WHEN v_detected THEN c_reason END;
  ELSE
    v_was_flagged := coalesce(OLD.is_flagged, false);
    NEW.is_flagged := v_was_flagged OR v_detected;
    NEW.flag_reason := CASE
      WHEN v_detected AND NOT v_was_flagged THEN c_reason
      ELSE OLD.flag_reason
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Le trigger ne jouait que sur `UPDATE OF content` : un UPDATE des seules colonnes
-- `is_flagged`, `flag_reason` ou `plain_text` lui échappait.
CREATE OR REPLACE TRIGGER trigger_process_message_content
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.process_message_content();
