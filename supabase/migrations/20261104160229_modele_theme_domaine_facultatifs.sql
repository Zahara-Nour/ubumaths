-- =============================================================================
-- Modèle de question : `theme` et `domain` deviennent facultatifs
-- =============================================================================
--
-- ADR 0035 (chantier `automaths-arbre`, lot 3) : un modèle est rangé dans
-- l'arbre des notions (`classification_node_id`) ; l'éditeur n'écrira plus
-- thème / domaine / sous-domaine (`subdomain` est déjà facultatif). Les
-- colonnes seront retirées au lot 4 (destructif, après la mise en prod du code
-- qui n'en dépend plus).
--
-- Additive : l'ancien code, encore en prod jusqu'au `deploy:prod`, continue
-- d'écrire les deux colonnes. Les modèles existants gardent leurs valeurs :
-- les anciens liens et les séries pas encore converties s'en servent.
--
-- L'index unique `idx_question_templates_unique_category` (publiés) reste :
-- un modèle sans thème ni domaine n'y entre jamais en conflit (NULL distincts),
-- et un ancien quadruplet continue de désigner au plus un modèle publié.
--
-- Question d'accès (confirmée par David le 2026-11-04) : personne ne gagne de
-- lecture ; on relâche une obligation à l'écriture, aucune policy ni droit
-- touché.
--
-- Rollback (prod au 2026-11-04 : aucun modèle sans thème ni domaine) :
--   update public.question_templates set theme = 'Non rangé' where theme is null;
--   update public.question_templates set domain = 'Non rangé' where domain is null;
--   alter table public.question_templates alter column theme set not null;
--   alter table public.question_templates alter column domain set not null;
-- ⚠️ Avec le retour à l'ancien code seulement (ou avant) : le code du lot 3
-- n'écrit plus ces colonnes, chaque enregistrement échouerait sinon.
-- (deux modèles publiés « Non rangé » de même niveau et sans sous-domaine
-- buteraient sur l'index unique : leur donner un sous-domaine distinct avant.)
-- =============================================================================

alter table public.question_templates
	alter column theme drop not null,
	alter column domain drop not null;

comment on column public.question_templates.theme is
	'Ancien thème du modèle. Facultatif depuis ADR 0035 (le modèle est rangé par classification_node_id) ; retiré au lot 4.';
comment on column public.question_templates.domain is
	'Ancien domaine du modèle. Facultatif depuis ADR 0035 ; retiré au lot 4.';
