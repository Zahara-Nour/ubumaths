# Registre des activités de traitement — UbuMaths

> **Document de conformité RGPD (article 30 du Règlement (UE) 2016/679).**
> Modèle aligné sur le [registre simplifié de la CNIL](https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement).
> Ce document n'est **pas** publié sur le site : c'est le registre interne que le
> responsable de traitement doit tenir à jour et présenter à la CNIL en cas de contrôle.

|                                               |                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Responsable de traitement**                 | [À COMPLÉTER — nom / raison sociale]                                               |
| **Coordonnées**                               | contact@ubumaths.fr — [adresse postale À COMPLÉTER]                                |
| **Représentant légal**                        | [À COMPLÉTER]                                                                      |
| **Délégué à la protection des données (DPO)** | [À COMPLÉTER — facultatif sauf si désignation obligatoire ; sinon « Non désigné »] |
| **Date de dernière mise à jour**              | 17 novembre 2026                                                                   |
| **Version**                                   | 1.3                                                                                |

---

## ⚠️ Préalable : responsable de traitement ou sous-traitant ?

Cette question conditionne **toutes** les fiches ci-dessous et doit être tranchée :

- **Si des établissements scolaires déploient UbuMaths** et décident eux-mêmes des finalités
  (qui sont leurs élèves, quelles données suivre), alors **l'établissement est responsable de
  traitement** et **UbuMaths est sous-traitant** (art. 28). Dans ce cas il faut un **contrat de
  sous-traitance (DPA)** avec chaque établissement, et le présent registre relève de l'**art. 30.2**
  (registre du sous-traitant).
- **Si UbuMaths fournit le service en direct** aux élèves/familles et décide des finalités, alors
  **UbuMaths est responsable de traitement** (art. 30.1) — c'est l'hypothèse retenue ci-dessous.

👉 **[À CONFIRMER]** : adapter l'en-tête et les bases légales selon le cas (les deux peuvent
coexister : responsable pour le grand public, sous-traitant pour les établissements).

---

## Liste des traitements

| N°  | Traitement                                            | Base légale principale                                      | Données sensibles ? |
| --- | ----------------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| T1  | Gestion des comptes et authentification               | [Contrat / Consentement — À CONFIRMER]                      | Non                 |
| T2  | Suivi pédagogique et progression                      | [Intérêt légitime / Mission d'intérêt public — À CONFIRMER] | Non                 |
| T3  | Gamification et récompenses                           | Intérêt légitime                                            | Non                 |
| T4  | Communications transactionnelles (emails)             | Contrat / Intérêt légitime                                  | Non                 |
| T5  | Messagerie et collaboration temps réel                | Contrat / Intérêt légitime                                  | Non                 |
| T6  | Assistance IA — tuteur/chat + RAG (Groq, HuggingFace) | [Intérêt légitime / Consentement — À CONFIRMER]             | Non                 |
| T7  | Support et signalement de bugs                        | Intérêt légitime                                            | Non                 |
| T8  | Mesure d'audience et performance technique            | Intérêt légitime                                            | Non                 |
| T9  | Carnet de liaison (information des parents)           | Intérêt légitime (art. 6.1.f)                               | Non                 |

> Aucune **donnée sensible** au sens de l'art. 9 (santé, opinions, etc.) n'est traitée. ⚠️ Les
> données concernent en grande partie des **mineurs** → vigilance renforcée (voir § dédié en fin de doc).

---

## Fiches détaillées

### T1 — Gestion des comptes et authentification

| Champ                              | Contenu                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Créer et gérer les comptes ; authentifier les utilisateurs (email/mot de passe et Google OAuth) ; gérer les rôles (élève, enseignant, admin — il n'existe pas de rôle parent : un parent agit par le lien de consentement et par l'enseignant) et l'appartenance aux classes.                         |
| **Base légale**                    | [À CONFIRMER] — exécution du contrat (art. 6.1.b) et/ou consentement (art. 6.1.a). Pour les mineurs : consentement du titulaire de l'autorité parentale (art. 8).                                                                                                                                     |
| **Personnes concernées**           | Élèves (souvent mineurs), enseignants, administrateurs ; parents seulement via l'e-mail de consentement (pas de compte).                                                                                                                                                                              |
| **Catégories de données**          | Identité (prénom, nom, pseudonyme), email, mot de passe (haché — jamais en clair), identifiants OAuth Google, rôle, classe/établissement, dates de création/connexion ; statut du consentement parental et **déclaration d'âge** (`age_declaration`, `age_declared_at` : « 15 ans ou plus » en 2nde). |
| **Source**                         | Saisie directe par l'utilisateur ou import par l'enseignant ; Google (OAuth).                                                                                                                                                                                                                         |
| **Destinataires / sous-traitants** | Supabase (BDD + Auth) ; Google (OAuth).                                                                                                                                                                                                                                                               |
| **Transferts hors UE**             | Auth Google : USA → CCT + Data Privacy Framework. BDD : **néant** (UE/France).                                                                                                                                                                                                                        |
| **Durée de conservation**          | Durée de la scolarité + 5 ans (cf. § Durées de conservation).                                                                                                                                                                                                                                         |
| **Mesures de sécurité**            | Hachage des mots de passe, RLS PostgreSQL, chiffrement au repos et en transit, cookies de session `sb-*`, jetons CSRF.                                                                                                                                                                                |

### T2 — Suivi pédagogique et progression

| Champ                              | Contenu                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Finalité(s)**                    | Enregistrer les réponses aux exercices, scores, progression, statistiques et historique d'apprentissage ; permettre à l'enseignant de suivre ses élèves.                                                     |
| **Base légale**                    | [À CONFIRMER] — intérêt légitime (art. 6.1.f) ou mission d'intérêt public (art. 6.1.e) selon le cas établissement.                                                                                           |
| **Personnes concernées**           | Élèves, enseignants.                                                                                                                                                                                         |
| **Catégories de données**          | Réponses aux questions, scores, niveaux de maîtrise par compétence, historique d'activité, statistiques agrégées (achievements).                                                                             |
| **Source**                         | Activité de l'élève sur l'application.                                                                                                                                                                       |
| **Destinataires / sous-traitants** | Supabase (BDD).                                                                                                                                                                                              |
| **Transferts hors UE**             | Néant (UE/France).                                                                                                                                                                                           |
| **Durée de conservation**          | 5 ans après la dernière activité, puis anonymisation/suppression.                                                                                                                                            |
| **Mesures de sécurité**            | RLS (un élève ne voit que ses données ; le professeur unique / l'admin accède aux données des élèves de l'école — modèle mono-professeur, frontière sociale = école), chiffrement, journalisation des accès. |

### T3 — Gamification et récompenses

| Champ                              | Contenu                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Système de motivation : « gidouilles » (monnaie), cartes VIP, achievements, classements ; le Palotin (compagnon) remarque le retour de l'élève après une longue absence.                          |
| **Base légale**                    | Intérêt légitime (art. 6.1.f) — engagement pédagogique.                                                                                                                                           |
| **Personnes concernées**           | Élèves.                                                                                                                                                                                           |
| **Catégories de données**          | Solde de récompenses, cartes/objets débloqués, statistiques de jeu ; jour du dernier passage et jour du retour après une longue absence (`student_last_visits`, lisible par le serveur seul).     |
| **Destinataires / sous-traitants** | Supabase (BDD + Storage pour les images de cartes).                                                                                                                                               |
| **Transferts hors UE**             | Néant (UE/France).                                                                                                                                                                                |
| **Durée de conservation**          | [À COMPLÉTER] — liée au compte. Jour du dernier passage : remplacé chaque jour de présence ; jour du retour : effacé dès que le Palotin l'a salué, au plus tard au premier passage après 7 jours. |
| **Mesures de sécurité**            | RLS, validation serveur (Zod), chiffrement.                                                                                                                                                       |

### T4 — Communications transactionnelles (emails)

| Champ                              | Contenu                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Envoi d'emails de service : vérification de compte, réinitialisation de mot de passe, notifications, invitations. |
| **Base légale**                    | Exécution du contrat (art. 6.1.b) / intérêt légitime (art. 6.1.f).                                                |
| **Personnes concernées**           | Tous les utilisateurs.                                                                                            |
| **Catégories de données**          | Email, prénom/nom, contenu de la notification.                                                                    |
| **Destinataires / sous-traitants** | Brevo (envoi d'emails) ; Supabase Auth (emails d'authentification).                                               |
| **Transferts hors UE**             | Brevo : société française (UE) → **néant**. [À CONFIRMER].                                                        |
| **Durée de conservation**          | [À COMPLÉTER] — logs d'envoi conservés [X] mois.                                                                  |
| **Mesures de sécurité**            | Connexions chiffrées (TLS), clés API en variables d'environnement.                                                |

### T5 — Messagerie et collaboration temps réel

| Champ                              | Contenu                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Messagerie/chat, présence et fonctionnalités temps réel entre utilisateurs autorisés.                                                              |
| **Base légale**                    | Exécution du contrat / intérêt légitime.                                                                                                           |
| **Personnes concernées**           | Élèves, enseignants.                                                                                                                               |
| **Catégories de données**          | Messages, métadonnées (auteur, horodatage, statut de présence).                                                                                    |
| **Destinataires / sous-traitants** | Supabase (BDD + Realtime).                                                                                                                         |
| **Transferts hors UE**             | Néant (UE/France).                                                                                                                                 |
| **Durée de conservation**          | 3 ans.                                                                                                                                             |
| **Mesures de sécurité**            | RLS, modération (marquage du chat sur une liste de quatre mots, en base ; aucun filtre sur la messagerie privée), assainissement HTML (DOMPurify). |
| **Remarque**                       | ⚠️ Vérifier si la messagerie est effectivement active en production ; sinon retirer cette fiche.                                                   |

### T6 — Assistance IA (tuteur/chat + RAG) — **active en production**

| Champ                              | Contenu                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Tuteur/chatbot pédagogique (`/api/chat`) et recherche augmentée (RAG).                                    |
| **Base légale**                    | [Intérêt légitime / Consentement — À CONFIRMER].                                                          |
| **Personnes concernées**           | Élèves, enseignants.                                                                                      |
| **Catégories de données**          | Messages élève + contexte d'exercice transmis au LLM ; texte indexé pour les embeddings.                  |
| **Destinataires / sous-traitants** | **Groq** (LLM, llama-3.3-70b) ; **HuggingFace** (embeddings RAG, `multilingual-e5-large`).                |
| **Transferts hors UE**             | **USA → CCT** (Groq + HuggingFace). [DPA / zero-retention à confirmer].                                   |
| **Durée de conservation**          | Dépend du prestataire — exiger une politique **« zero data retention »**.                                 |
| **Mesures de sécurité**            | Minimisation (contenu dit anonymisé côté code), rate-limiting, clés API serveur.                          |
| **Remarque**                       | ⚠️ Sous-traitants à **ajouter au registre dédié** (cf. [README](README.md) §7) — actuellement non listés. |

### T7 — Support et signalement de bugs

| Champ                              | Contenu                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Recevoir et traiter les signalements de bugs et demandes de support.                                |
| **Base légale**                    | Intérêt légitime (art. 6.1.f).                                                                      |
| **Personnes concernées**           | Tous les utilisateurs.                                                                              |
| **Catégories de données**          | Description du problème, éventuelles captures d'écran, identifiant utilisateur, contexte technique. |
| **Destinataires / sous-traitants** | Supabase (BDD + Storage privé pour captures).                                                       |
| **Transferts hors UE**             | Néant (UE/France).                                                                                  |
| **Durée de conservation**          | [À COMPLÉTER] — ex. suppression après résolution.                                                   |
| **Mesures de sécurité**            | Bucket privé (accès service_role), RLS.                                                             |

### T8 — Mesure d'audience et performance technique

| Champ                              | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Statistiques d'usage et de performance (Web Vitals) pour améliorer le service.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Base légale**                    | Intérêt légitime (art. 6.1.f).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Personnes concernées**           | Tous les visiteurs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Catégories de données**          | Pages vues, métriques de performance, données techniques agrégées/anonymisées. Depuis novembre 2026, aussi **chez nous** (table `web_vital_samples`) : heure arrondie à l'heure, page sous sa forme générique (identifiant de route, jamais l'adresse réelle), indicateur, valeur, type d'appareil (mobile, tablette, ordinateur). Ni compte, ni adresse IP, ni navigateur, ni identifiant de visite.                                                                                                                                                                                    |
| **Destinataires / sous-traitants** | Vercel (Analytics + Speed Insights — **sans cookie**). Table `web_vital_samples` : Supabase (hébergeur de la base, UE), lecture des lignes par l'admin seul. Le relevé mensuel (GitHub Actions, issue publique du dépôt) ne reçoit que des résultats calculés, par jours entiers : nombre de mesures par page, et 75ᵉ centile à partir de 5 mesures.                                                                                                                                                                                                                                     |
| **Transferts hors UE**             | Vercel : société US → CCT. Traitement réalisé sur les fonctions **cdg1/Paris**. Table `web_vital_samples` : aucun (base en UE, eu-west-3).                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Durée de conservation**          | Selon Vercel (données agrégées). Table `web_vital_samples` : **90 jours** (purge hebdomadaire `purge_web_vital_samples`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Mesures de sécurité**            | Mesure **sans cookie** et sans identifiant persistant. Table `web_vital_samples` : écrite par le serveur seul, qui ne se sert pas de la session et n'accepte que les pages du site ; pages d'admin non mesurées. L'adresse IP ne sert qu'à limiter le nombre d'envois : son empreinte (SHA-256, un **pseudonyme** et non une donnée anonyme) reste dans `rate_limits` jusqu'à la purge quotidienne (au plus ~26 h), sans lien avec les mesures. Risque résiduel : l'heure d'une mesure est arrondie, mais l'ordre d'écriture des lignes reste lisible par qui a accès à la base (admin). |
| **Remarque**                       | ⚠️ Cohérence à vérifier avec les mentions légales (« aucun cookie de mesure d'audience ») — c'est exact car Vercel Analytics est cookieless, mais le documenter ici.                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

### T9 — Carnet de liaison (information des parents)

Mis en place par le chantier `partage-parents` (novembre 2026). Décision :
[ADR 0040](../../adr/0040-carnet-de-liaison-lien-par-parent.md) ; fonctionnement :
[carnet-de-liaison.md](../carnet-de-liaison.md).

| Champ                              | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité(s)**                    | Informer les parents du travail de leur enfant, sans compte : une page par parent et par élève (le carnet de liaison), et des courriels seulement quand quelque chose ne va pas (évaluation non faite, révisions en retard, inactivité), plus un message positif par trimestre s'il y a du vrai à dire. Activé par le professeur, classe par classe.                                                                                                                                                                                                                                                                                                                                                                          |
| **Base légale**                    | **Intérêt légitime** (art. 6.1.f), tranché le 2026-11-17 et écrit dans la politique de confidentialité ; à revoir (mission d'intérêt public, art. 6.1.e) si un établissement déploie Chiphre. L'information des titulaires de l'autorité parentale court jusqu'à 18 ans ; un élève majeur obtient l'arrêt auprès du professeur. La confirmation de l'adresse par le parent n'a **pas** valeur de consentement.                                                                                                                                                                                                                                                                                                                |
| **Personnes concernées**           | Élèves des classes dont le professeur a activé le carnet ; leurs parents (deux adresses au plus par élève) ; une personne dont l'adresse a été saisie par erreur (elle ne reçoit qu'un courriel de confirmation).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Catégories de données**          | **Parent** : adresse e-mail et son empreinte (sha256), état (en attente, confirmée, refusée, invalide, retirée), origine (consentement, professeur, élève), dates de confirmation et d'arrêt des courriels ; empreinte des liens et des jetons de courriel (jamais en clair), expiration, révocation, nombre et date du dernier accès ; journal des courriels envoyés (date, nature, motifs — sans l'adresse). **Élève** (lu, non copié) : prénom, palier de jours de travail par semaine (0, 1, 2-3, 4+ ; 5 semaines), nombre de révisions en retard, évaluations faites ou non avec échéance (**jamais la note**), liens du cahier et du cours de sa classe. Épisodes d'exception (motif, dates). Aucune date de naissance. |
| **Destinataires / sous-traitants** | Le détenteur du lien (le parent) ; l'élève lui-même (même carnet, et la liste des courriels envoyés, jamais les adresses) ; le professeur de la classe (adresses et état des liens, jamais les empreintes). Brevo (envoi des courriels) ; Supabase (hébergement) ; Vercel (hébergement ; les journaux d'exécution gardent l'adresse de la page, jeton compris).                                                                                                                                                                                                                                                                                                                                                               |
| **Transferts hors UE**             | Brevo : société française (UE) → néant [À CONFIRMER]. Vercel : société US → CCT, traitement réalisé sur les fonctions **cdg1/Paris**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Durée de conservation**          | Adresse : tant que l'élève est membre d'une classe active ; **effacée 90 jours** après qu'il n'en a plus aucune (passage quotidien) ; effacée aussitôt si le destinataire répond « Je ne suis pas le parent » ou si le professeur la retire (l'empreinte reste alors pour bloquer la ressaisie, jusqu'à l'effacement des 90 jours). Lien : expire à la **fin de l'année scolaire de l'école** (le 31 août si elle n'a pas saisi ses dates) ; effacé avec l'adresse. Épisodes d'exception : effacés avec l'adresse. Journal des courriels : chaque ligne **effacée 1 an** après l'envoi (passage quotidien, Q42). Tout est supprimé avec le profil de l'élève.                                                                 |
| **Mesures de sécurité**            | Jetons de 32 octets aléatoires, stockés hachés ; accès par fonctions `SECURITY DEFINER` réservées au serveur, aucune policy `anon` ; pages `noindex`, `Cache-Control: private, no-store`, aucun Referer ; jeton masqué dans la mesure d'audience et dans le journal des erreurs ; limites de débit par IP et par adresse ; confirmation et refus par bouton (un antivirus de messagerie qui ouvre le lien ne confirme rien) ; réponse identique que l'adresse soit connue ou non (« J'ai perdu mon lien ») ; la forme du carnet est filtrée côté serveur (une donnée ajoutée par erreur ne descend pas).                                                                                                                      |
| **Droits**                         | Le parent arrête les courriels en un clic (le carnet reste ouvert) ; le destinataire d'une confirmation se déclare « pas le parent » (adresse effacée) ; l'élève voit exactement ce que voient ses parents ; un élève majeur obtient la coupure du partage auprès du professeur. Autres droits : § Droits des personnes concernées.                                                                                                                                                                                                                                                                                                                                                                                           |
| **Remarque**                       | La politique de confidentialité publique (`/legal/confidentialite`, version 1.4 du 2026-11-17) décrit ce traitement : § 3.3, 4, 5.2, 6, 7 et 8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## Récapitulatif des sous-traitants (art. 28)

| Sous-traitant          | Rôle                                                              | Siège       | Localisation des données               | Garanties / encadrement                                        |
| ---------------------- | ----------------------------------------------------------------- | ----------- | -------------------------------------- | -------------------------------------------------------------- |
| **Supabase Inc.**      | Hébergement BDD, Auth, Storage, Realtime                          | Singapour   | **UE — France (AWS eu-west-3, Paris)** | DPA Supabase ; chiffrement ; UE → **pas de transfert hors UE** |
| **Vercel Inc.**        | Hébergement application + fonctions                               | USA         | Fonctions **cdg1/Paris (UE)**          | DPA Vercel ; **CCT** (société US)                              |
| **Google LLC**         | Authentification OAuth / Classroom (+ Gmail API emails élèves)    | USA         | USA                                    | **CCT + Data Privacy Framework**                               |
| **Brevo (Sendinblue)** | Emails transactionnels (consentement parental, carnet de liaison) | France (UE) | UE                                     | DPA ; UE — pas de transfert hors UE [À CONFIRMER]              |
| **Groq Inc.**          | LLM tuteur/chat (`/api/chat`)                                     | USA         | USA                                    | **CCT** ; exiger zero-retention [À CONFIRMER]                  |
| **Hugging Face Inc.**  | Embeddings RAG (`multilingual-e5-large`)                          | USA         | USA                                    | **CCT** [DPA à confirmer]                                      |
| **Vercel (Analytics)** | Mesure d'audience/perf **sans cookie**                            | USA         | USA (agrégé)                           | **CCT** ; cookieless                                           |

> Penser à conserver une **copie signée du DPA** de chaque sous-traitant.

---

## Transferts de données hors Union Européenne

| Destinataire      | Pays          | Encadrement                                                 | Donnée concernée                                                   |
| ----------------- | ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Google LLC        | USA           | Clauses Contractuelles Types (CCT) + Data Privacy Framework | Identifiants d'authentification (OAuth), emails élèves (Gmail API) |
| Vercel Inc.       | USA (société) | CCT — traitement effectif en UE (cdg1)                      | Logs techniques, métriques (sans cookie)                           |
| Groq Inc.         | USA           | CCT (exiger zero-retention)                                 | Messages élève + contexte d'exercice (tuteur/chat)                 |
| Hugging Face Inc. | USA           | CCT                                                         | Texte indexé pour embeddings (RAG)                                 |

> **L'hébergement de la base de données ne donne plus lieu à aucun transfert hors UE** depuis la
> migration du **15 juin 2026** (us-east-2/Ohio, USA → **eu-west-3/Paris, France**).

---

## Mesures de sécurité techniques et organisationnelles (TOMs)

- **Chiffrement** : au repos (base et stockage) et en transit (TLS/HTTPS).
- **Contrôle d'accès** : Row Level Security (RLS) PostgreSQL sur l'ensemble des tables ;
  séparation stricte des rôles ; clés de service (`sb_secret_*`) côté serveur uniquement.
- **Authentification** : mots de passe hachés ; OAuth ; cookies de session ; protection CSRF.
- **Validation des entrées** : schémas Zod côté serveur sur toutes les API.
- **Minimisation** : ne sont collectées que les données nécessaires aux finalités.
- **Journalisation** : logs d'accès et d'audit (Supabase).
- **Gestion des secrets** : variables d'environnement (Vercel) ; rotation des clés réalisée le
  15 juin 2026 (mots de passe BDD + clés API).
- **Sauvegardes** : sauvegardes automatiques Supabase.
- **Sous-traitance** : DPA avec chaque sous-traitant ; localisation UE privilégiée.

---

## Durées de conservation (récapitulatif)

> Durées reprises de la **politique de confidentialité §7** — à valider et à tenir **cohérentes
> entre les deux documents** (toute modification ici doit être répercutée sur la page publique).

| Donnée                                   | Durée de conservation                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Profil utilisateur                       | Durée de la scolarité + 5 ans, puis suppression/anonymisation ou sur demande                    |
| Données pédagogiques                     | 5 ans après la dernière activité, puis suppression/anonymisation                                |
| Messages                                 | 3 ans                                                                                           |
| Logs techniques                          | 90 jours (suppression automatique)                                                              |
| Signalements de bugs                     | Jusqu'à résolution, puis suppression                                                            |
| Adresses des parents (carnet de liaison) | 90 jours après que l'élève n'est plus dans aucune classe active ; aussitôt sur refus ou retrait |
| Liens du carnet de liaison               | Expirent à la fin de l'année scolaire de l'école (31 août par défaut) ; effacés avec l'adresse  |

---

## Spécificités « données de mineurs »

- L'application s'adresse en grande partie à des **élèves mineurs** → vigilance renforcée (CNIL,
  art. 8 RGPD).
- **Consentement parental** : pour les moins de 15 ans (France), recueillir/encadrer le consentement
  du titulaire de l'autorité parentale, ou s'appuyer sur le cadre de l'établissement scolaire.
- **Minimisation** stricte : pas de données superflues, pas de finalité commerciale, **aucun cookie
  publicitaire ni de suivi**.
- **Information adaptée** : politique de confidentialité accessible et compréhensible.
- **Droits** : accès, rectification, effacement, portabilité, opposition — exercés via
  contact@ubumaths.fr ; réclamation possible auprès de la CNIL.

---

## Droits des personnes concernées

Conformément aux art. 15 à 22 du RGPD : droit d'accès, de rectification, à l'effacement, à la
limitation, à la portabilité et d'opposition. Exercice à : **contact@ubumaths.fr**.
Autorité de contrôle : **CNIL** — www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07.

---

## Historique des révisions

| Date             | Version | Modification                                                                                                                                           |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 17 novembre 2026 | 1.3     | T9 : journal des courriels effacé au bout d'un an (Q42).                                                                                               |
| 17 novembre 2026 | 1.2     | T9 : carnet de liaison (chantier `partage-parents`, ADR 0040) ; Brevo : courriels du carnet.                                                           |
| 22 octobre 2026  | 1.1     | T3 : présence de l'élève pour le Palotin (`student_last_visits` : jour du dernier passage, jour du retour à fêter), finalité, données et conservation. |
| 15 juin 2026     | 1.0     | Création du registre. Hébergement BDD migré USA (us-east-2) → UE/France (eu-west-3).                                                                   |
