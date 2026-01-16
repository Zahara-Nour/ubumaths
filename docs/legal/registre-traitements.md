# Registre des Activites de Traitement - UbuMaths

> **Article RGPD** : Art. 30 - Registre des activites de traitement
> **Responsable de traitement** : [A completer] > **Derniere mise a jour** : 2026-01-16
> **Version** : 1.0

---

## Table des matieres

1. [Informations generales](#1-informations-generales)
2. [Traitements lies a l'authentification](#2-traitements-lies-a-lauthentification)
3. [Traitements lies aux donnees pedagogiques](#3-traitements-lies-aux-donnees-pedagogiques)
4. [Traitements lies a la communication](#4-traitements-lies-a-la-communication)
5. [Traitements lies a la gamification](#5-traitements-lies-a-la-gamification)
6. [Traitements lies au monitoring](#6-traitements-lies-au-monitoring)
7. [Traitements lies au consentement parental](#7-traitements-lies-au-consentement-parental)
8. [Synthese des bases legales](#8-synthese-des-bases-legales)
9. [Mesures de securite](#9-mesures-de-securite)

---

## 1. Informations generales

### Responsable de traitement

| Information       | Valeur        |
| ----------------- | ------------- |
| **Denomination**  | [A completer] |
| **Adresse**       | [A completer] |
| **Email contact** | [A completer] |
| **Telephone**     | [A completer] |

### Delegue a la Protection des Donnees (DPO)

| Information | Valeur                      |
| ----------- | --------------------------- |
| **Nom**     | [A completer si applicable] |
| **Email**   | [A completer si applicable] |

> **Note** : La designation d'un DPO est obligatoire pour les etablissements scolaires publics (Art. 37).

### Representant UE (si applicable)

Non applicable si le responsable de traitement est etabli dans l'UE.

---

## 2. Traitements lies a l'authentification

### 2.1 Gestion des comptes utilisateurs

| Attribut                    | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| **Finalite**                | Permettre l'acces securise a la plateforme educative |
| **Base legale**             | Execution du contrat (Art. 6(1)(b))                  |
| **Categories de personnes** | Eleves, enseignants, administrateurs                 |
| **Categories de donnees**   | Email, nom, prenom, avatar, role, niveau scolaire    |
| **Source des donnees**      | Saisie utilisateur, Google OAuth                     |
| **Destinataires internes**  | Enseignants (pour leurs eleves), administrateurs     |
| **Destinataires externes**  | Supabase (hebergement)                               |
| **Transfert hors UE**       | Non (Supabase region UE)                             |
| **Duree de conservation**   | Duree de la scolarite + 5 ans apres inactivite       |
| **Mesures de securite**     | RLS, chiffrement TLS, authentification OAuth         |

**Donnees collectees** :

- `profiles.id` (UUID)
- `profiles.email`
- `profiles.firstname`, `profiles.lastname`
- `profiles.avatar_url`
- `profiles.grade` (6eme, 5eme, etc.)
- `profiles.role` (student, teacher, admin)

---

### 2.2 Integration Google OAuth (enseignants)

| Attribut                    | Description                                        |
| --------------------------- | -------------------------------------------------- |
| **Finalite**                | Permettre la synchronisation avec Google Classroom |
| **Base legale**             | Consentement (Art. 6(1)(a))                        |
| **Categories de personnes** | Enseignants uniquement                             |
| **Categories de donnees**   | Tokens OAuth, email Google, scopes autorises       |
| **Source des donnees**      | API Google OAuth                                   |
| **Destinataires externes**  | Google Cloud, Supabase                             |
| **Transfert hors UE**       | Oui (Google - SCCs)                                |
| **Duree de conservation**   | Jusqu'a revocation ou suppression du compte        |
| **Mesures de securite**     | Chiffrement AES-256-GCM des tokens                 |

**Donnees collectees** :

- `google_integrations.access_token` (chiffre)
- `google_integrations.refresh_token` (chiffre)
- `google_integrations.google_email`
- `google_integrations.scopes`

---

### 2.3 Pre-enregistrement des eleves

| Attribut                    | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| **Finalite**                | Permettre aux enseignants de pre-configurer les comptes eleves |
| **Base legale**             | Interet legitime de l'etablissement (Art. 6(1)(f))             |
| **Categories de personnes** | Eleves (avant activation du compte)                            |
| **Categories de donnees**   | Email, nom, prenom, niveau scolaire                            |
| **Source des donnees**      | Import CSV par l'enseignant, saisie manuelle                   |
| **Destinataires**           | Enseignant createur, Supabase                                  |
| **Duree de conservation**   | Jusqu'a activation ou 1 an sans activation                     |
| **Mesures de securite**     | RLS, acces limite a l'enseignant createur                      |

**Donnees collectees** :

- `pending_students.email`
- `pending_students.firstname`, `pending_students.lastname`
- `pending_students.grade`

---

## 3. Traitements lies aux donnees pedagogiques

### 3.1 Suivi des exercices

| Attribut                    | Description                                        |
| --------------------------- | -------------------------------------------------- |
| **Finalite**                | Suivre la progression et adapter l'apprentissage   |
| **Base legale**             | Execution du contrat educatif (Art. 6(1)(b))       |
| **Categories de personnes** | Eleves                                             |
| **Categories de donnees**   | Reponses, temps passe, indices utilises, resultats |
| **Source des donnees**      | Activite de l'eleve sur la plateforme              |
| **Destinataires internes**  | Enseignants (pour leurs eleves)                    |
| **Destinataires externes**  | Supabase                                           |
| **Transfert hors UE**       | Non                                                |
| **Duree de conservation**   | 5 ans apres fin d'annee scolaire                   |
| **Mesures de securite**     | RLS, audit trail                                   |

**Donnees collectees** :

- `exercise_completions.student_id`
- `exercise_completions.exercise_id`
- `exercise_completions.completed_at`
- `student_exercise_mastery.mastery_level`

---

### 3.2 Evaluations et devoirs

| Attribut                    | Description                                   |
| --------------------------- | --------------------------------------------- |
| **Finalite**                | Evaluer les competences des eleves            |
| **Base legale**             | Execution du contrat educatif (Art. 6(1)(b))  |
| **Categories de personnes** | Eleves                                        |
| **Categories de donnees**   | Soumissions, notes, pourcentage de completion |
| **Source des donnees**      | Soumissions des eleves                        |
| **Destinataires internes**  | Enseignants                                   |
| **Duree de conservation**   | 5 ans apres fin d'annee scolaire              |

**Tables concernees** :

- `assessment_assignments`
- `assessment_results`
- `worksheet_assignments`
- `worksheet_instances`

---

### 3.3 Systeme de flashcards (SRS)

| Attribut                    | Description                                   |
| --------------------------- | --------------------------------------------- |
| **Finalite**                | Revision espacee pour memorisation            |
| **Base legale**             | Execution du contrat (Art. 6(1)(b))           |
| **Categories de personnes** | Eleves                                        |
| **Categories de donnees**   | Cartes, statistiques de revision, intervalles |
| **Duree de conservation**   | 5 ans apres fin d'annee                       |

**Tables concernees** :

- `srs_cards`
- `srs_review_sessions`
- `srs_deck_assignments`

---

### 3.4 Tuteur IA

| Attribut                    | Description                             |
| --------------------------- | --------------------------------------- |
| **Finalite**                | Assistance pedagogique personnalisee    |
| **Base legale**             | Execution du contrat (Art. 6(1)(b))     |
| **Categories de personnes** | Eleves                                  |
| **Categories de donnees**   | Messages, contexte exercice (anonymise) |
| **Destinataires externes**  | Groq (API LLM)                          |
| **Transfert hors UE**       | Oui (USA - politique zero-retention)    |
| **Duree de conservation**   | 1 an                                    |
| **Mesures de securite**     | Pas d'envoi de PII a l'API externe      |

**Tables concernees** :

- `tutor_conversations`
- `tutor_messages`

---

## 4. Traitements lies a la communication

### 4.1 Messagerie de classe

| Attribut                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| **Finalite**                | Communication pedagogique eleve-enseignant       |
| **Base legale**             | Interet legitime (Art. 6(1)(f))                  |
| **Categories de personnes** | Eleves, enseignants                              |
| **Categories de donnees**   | Contenu des messages, horodatage, pieces jointes |
| **Destinataires**           | Participants de la classe                        |
| **Duree de conservation**   | 3 ans (hard delete)                              |
| **Mesures de securite**     | RLS, moderation enseignant                       |

**Tables concernees** :

- `messages`
- `message_attachments`
- `message_reactions`

---

### 4.2 Messages prives

| Attribut                    | Description                                        |
| --------------------------- | -------------------------------------------------- |
| **Finalite**                | Communication directe entre utilisateurs autorises |
| **Base legale**             | Interet legitime (Art. 6(1)(f))                    |
| **Categories de personnes** | Eleves, enseignants                                |
| **Categories de donnees**   | Contenu, expediteur, destinataires                 |
| **Duree de conservation**   | 3 ans (hard delete)                                |

**Tables concernees** :

- `private_messages`
- `message_inbox`
- `conversations`

---

### 4.3 Notifications

| Attribut                  | Description                              |
| ------------------------- | ---------------------------------------- |
| **Finalite**              | Informer les utilisateurs des evenements |
| **Base legale**           | Execution du contrat (Art. 6(1)(b))      |
| **Categories de donnees** | Type, contenu, statut lecture            |
| **Duree de conservation** | 1 an                                     |

**Tables concernees** :

- `notifications`
- `notification_reads`

---

### 4.4 Systeme d'amis

| Attribut                    | Description                 |
| --------------------------- | --------------------------- |
| **Finalite**                | Reseau social educatif      |
| **Base legale**             | Consentement (Art. 6(1)(a)) |
| **Categories de personnes** | Eleves                      |
| **Categories de donnees**   | Demandes d'amitie, statut   |
| **Duree de conservation**   | Demandes rejetees: 2 ans    |

**Tables concernees** :

- `friendships`

---

## 5. Traitements lies a la gamification

### 5.1 Monnaie virtuelle (Gidouilles)

| Attribut                    | Description                           |
| --------------------------- | ------------------------------------- |
| **Finalite**                | Motivation par recompenses virtuelles |
| **Base legale**             | Execution du contrat (Art. 6(1)(b))   |
| **Categories de personnes** | Eleves                                |
| **Categories de donnees**   | Solde, historique transactions        |
| **Duree de conservation**   | Duree du compte                       |

**Tables concernees** :

- `profiles.gidouilles`
- `gidouilles_history`

---

### 5.2 Cartes VIP et boutique

| Attribut                  | Description                                 |
| ------------------------- | ------------------------------------------- |
| **Finalite**              | Systeme de recompenses et d'objets virtuels |
| **Base legale**           | Execution du contrat (Art. 6(1)(b))         |
| **Categories de donnees** | Inventaire, achats, utilisations            |
| **Duree de conservation** | Duree du compte                             |

**Tables concernees** :

- `student_item_inventory`
- `shop_purchase_history`
- `vip_cards_activity`

---

### 5.3 Jeux educatifs (Demineur, 2048, etc.)

| Attribut                  | Description                             |
| ------------------------- | --------------------------------------- |
| **Finalite**              | Apprentissage ludique des mathematiques |
| **Base legale**           | Execution du contrat (Art. 6(1)(b))     |
| **Categories de donnees** | Scores, temps, statistiques de jeu      |
| **Duree de conservation** | Duree du compte                         |

**Tables concernees** :

- `minesweeper_games`
- `minesweeper_player_stats`
- `game_players`
- `daily_game_rewards`

---

### 5.4 Marketplace d'echange

| Attribut                    | Description                            |
| --------------------------- | -------------------------------------- |
| **Finalite**                | Echange d'objets virtuels entre eleves |
| **Base legale**             | Consentement (Art. 6(1)(a))            |
| **Categories de personnes** | Eleves                                 |
| **Categories de donnees**   | Annonces, propositions, transactions   |
| **Duree de conservation**   | Duree du compte                        |

**Tables concernees** :

- `marketplace_listings`
- `marketplace_trades`
- `marketplace_proposals`

---

## 6. Traitements lies au monitoring

### 6.1 Journalisation des erreurs

| Attribut                  | Description                                 |
| ------------------------- | ------------------------------------------- |
| **Finalite**              | Amelioration de la qualite du service       |
| **Base legale**           | Interet legitime (Art. 6(1)(f))             |
| **Categories de donnees** | Erreurs, URL, user-agent, user_id optionnel |
| **Destinataires**         | Administrateurs                             |
| **Duree de conservation** | 90 jours                                    |
| **Mesures de securite**   | Acces restreint aux admins                  |

**Tables concernees** :

- `error_logs`
- `error_occurrences`

> **Note** : Les `request_body` peuvent contenir des PII - sanitization a implementer.

---

### 6.2 Presence en ligne

| Attribut                  | Description                                |
| ------------------------- | ------------------------------------------ |
| **Finalite**              | Afficher le statut de connexion            |
| **Base legale**           | Interet legitime (Art. 6(1)(f))            |
| **Categories de donnees** | Statut (online/offline), dernier heartbeat |
| **Duree de conservation** | 30 jours                                   |

**Tables concernees** :

- `user_presence`

---

### 6.3 Audit trail RGPD

| Attribut                  | Description                                       |
| ------------------------- | ------------------------------------------------- |
| **Finalite**              | Tracabilite des acces aux donnees personnelles    |
| **Base legale**           | Obligation legale (Art. 6(1)(c)) - RGPD Art. 5(2) |
| **Categories de donnees** | Actions, tables, valeurs modifiees                |
| **Duree de conservation** | 2 ans                                             |
| **Mesures de securite**   | Ecriture seule via triggers, RLS                  |

**Tables concernees** :

- `audit_logs`

---

## 7. Traitements lies au consentement parental

### 7.1 Gestion du consentement parental

| Attribut                    | Description                                  |
| --------------------------- | -------------------------------------------- |
| **Finalite**                | Conformite Art. 8 RGPD (mineurs < 15 ans)    |
| **Base legale**             | Obligation legale (Art. 6(1)(c))             |
| **Categories de personnes** | Parents d'eleves mineurs                     |
| **Categories de donnees**   | Email parent, token, IP consentement, statut |
| **Duree de conservation**   | Duree de la scolarite + 5 ans (preuve)       |
| **Mesures de securite**     | Tokens a usage unique, expiration 7 jours    |

**Tables concernees** :

- `parental_consents`
- `profiles.consent_required`
- `profiles.consent_granted_at`

---

## 8. Synthese des bases legales

| Base legale                             | Traitements concernes                                      |
| --------------------------------------- | ---------------------------------------------------------- |
| **Execution du contrat** (Art. 6(1)(b)) | Comptes, donnees pedagogiques, gamification, notifications |
| **Consentement** (Art. 6(1)(a))         | OAuth Google, amis, marketplace                            |
| **Obligation legale** (Art. 6(1)(c))    | Audit trail, consentement parental                         |
| **Interet legitime** (Art. 6(1)(f))     | Pre-enregistrement, messagerie, monitoring, presence       |

---

## 9. Mesures de securite

### Mesures techniques

| Mesure                 | Implementation                                   |
| ---------------------- | ------------------------------------------------ |
| Chiffrement en transit | TLS 1.3 sur toutes les connexions                |
| Chiffrement au repos   | AES-256 (Supabase), AES-256-GCM (tokens Google)  |
| Controle d'acces       | Row Level Security (RLS) sur toutes les tables   |
| Authentification       | OAuth 2.0 PKCE, cookies httpOnly/secure/sameSite |
| Validation des entrees | Zod sur tous les endpoints API                   |
| Rate limiting          | Configurable par endpoint                        |
| Audit                  | Table `audit_logs` avec triggers automatiques    |

### Mesures organisationnelles

| Mesure                       | Statut       |
| ---------------------------- | ------------ |
| Politique de confidentialite | Publiee      |
| CGU                          | Publiees     |
| Formation RGPD equipe        | A planifier  |
| Procedure violation donnees  | A documenter |
| Revue periodique des acces   | A planifier  |

---

## Annexe : Flux de donnees

```
                                    ┌─────────────────┐
                                    │   Google APIs   │
                                    │ (OAuth, Class,  │
                                    │  Drive, Gmail)  │
                                    └────────┬────────┘
                                             │
                                             ▼
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Eleves  │────▶│   Vercel     │────▶│  Supabase   │────▶│  Audit Logs  │
│Enseignants│    │  (Frontend)  │     │ (Backend)   │     │              │
└──────────┘     └──────────────┘     └──────┬──────┘     └──────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │    Groq API     │
                                    │  (Tuteur IA)    │
                                    └─────────────────┘
```

---

## Historique des modifications

| Date       | Version | Modification                  |
| ---------- | ------- | ----------------------------- |
| 2026-01-16 | 1.0     | Creation initiale du registre |

---

**Document conforme a l'Art. 30 du RGPD**
**Prochaine revue** : 2026-04-16 (trimestrielle)
