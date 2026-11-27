# Cahier des charges — Refonte complète du Manoir de Tireveste

Version 1.0 — 26 novembre 2026

## 1. Objectif
Refondre le site public du Manoir de Tireveste et créer un outil de gestion commerciale et opérationnelle pour vendre les séjours en direct, sans OTA ni channel manager dans le périmètre initial.

## 2. Périmètre
- Site public responsive et SEO.
- Catalogue d'hébergements administrable.
- Moteur de recherche de disponibilités.
- Réservation instantanée.
- Paiement d'un acompte en ligne et suivi du solde.
- Gestion du planning et des indisponibilités.
- Gestion des clients et historique.
- Gestion des tarifs saisonniers et règles de séjour.
- Emails transactionnels.
- Tableau de bord et statistiques.
- Cartes cadeaux et prestations complémentaires en lots ultérieurs.
- Administration avec rôles et journal d'activité.

## 3. Règles de réservation
1. Le client saisit arrivée, départ, voyageurs et type de logement.
2. Le serveur calcule la disponibilité et le prix.
3. Une unité disponible est sélectionnée.
4. Le client saisit ses coordonnées.
5. Le serveur crée une réservation temporaire, avec une expiration paramétrable (20 minutes par défaut).
6. Le client paie l'acompte configuré.
7. Le webhook Stripe signé confirme le paiement.
8. Le statut passe à CONFIRMED et les dates deviennent indisponibles.
9. Un email client et une notification établissement sont envoyés.
10. Le solde restant et sa date d'échéance sont suivis dans l'administration.

## 4. Tarification
- Prix de base par hébergement.
- Prix par période/saison.
- Minimum de nuits par règle tarifaire.
- Ajustements éventuels par jour de semaine.
- Frais et options.
- Acompte en pourcentage ou montant fixe.
- Solde avec échéance paramétrable.
- Taxe de séjour distincte et affichée avant paiement, après validation des règles locales.

## 5. Administration
### Tableau de bord
CA encaissé, réservations confirmées, arrivées/départs, soldes à percevoir, taux d'occupation, panier moyen.

### Hébergements
Créer, modifier, désactiver, ordonner, gérer capacité, équipements, descriptions, photos, conditions et tarifs.

### Calendrier
Vue mensuelle/hebdomadaire/journalière, filtre par unité, blocage manuel, déplacement de séjour avec contrôle de disponibilité.

### Réservations
Recherche par référence, client, date ou statut ; création manuelle ; modification ; annulation ; historique des actions.

### Clients
Fiche client, coordonnées, consentements, séjours, paiements, notes internes et demandes particulières.

### Paiements
Acompte, solde, remboursement total/partiel, statut, référence Stripe, reçu et rapprochement.

### Communication
Modèles d'emails, confirmation, rappel avant arrivée, rappel de solde, informations pratiques et email post-séjour.

### Statistiques
CA par période/hébergement, occupation, durée moyenne, délai de réservation, annulations, ventes d'options.

## 6. Utilisateurs et sécurité
- Administrateur : tous droits.
- Gestionnaire : opérations courantes, sans accès aux secrets et paramètres sensibles.
- Personnel : planning et informations opérationnelles minimales.
- MFA recommandé pour les comptes à privilèges.
- Cookies HttpOnly, Secure en production, SameSite.
- Contrôle d'accès serveur pour chaque action.
- Journal d'audit, limitation de tentatives, sauvegardes chiffrées.
- RGPD : minimisation, durée de conservation, droits des personnes, sous-traitants et registre.

## 7. Architecture technique
- Next.js App Router + TypeScript.
- PostgreSQL + Prisma.
- Stripe Checkout + webhooks.
- Resend pour les emails.
- Vercel pour le déploiement.
- Stockage objet pour photos et documents.
- Tests automatisés et supervision.

## 8. SEO et contenus
- URLs lisibles et stables.
- Métadonnées uniques par page.
- Sitemap XML, robots.txt, canonical.
- Données structurées LodgingBusiness et pages hébergements.
- Images WebP/AVIF, dimensions et textes alternatifs.
- Redirections 301 des anciennes URLs.
- Search Console et mesure des conversions.
- Pages locales utiles et éditoriales sans duplication artificielle.

## 9. Données à fournir/valider par l'établissement
- Inventaire exact des chambres et gîtes, noms et capacités.
- Photos, descriptions, équipements et accessibilité.
- Tarifs par période et règles de séjour.
- Montant de l'acompte, échéance du solde, moyens de paiement.
- Conditions d'annulation et de remboursement.
- Taxe de séjour et frais éventuels.
- Horaires d'arrivée/départ, petit-déjeuner, ménage, linge, animaux.
- Adresse email d'envoi, téléphone, coordonnées de facturation.
- Mentions légales, CGV et politique de confidentialité.

## 10. Recette et critères d'acceptation
- Un client ne peut pas réserver une unité déjà occupée ou bloquée.
- Les dates restent bloquées pendant le tunnel de paiement et sont libérées à expiration.
- Un paiement confirmé par webhook crée une seule confirmation, même si Stripe renvoie le webhook.
- Le prix présenté est identique au prix encaissé.
- Les emails ne sont envoyés qu'après confirmation réelle.
- Les rôles limitent correctement les écrans et opérations.
- Les parcours mobile et desktop sont testés.
- Les sauvegardes et restaurations sont vérifiées.
- Les pages SEO, redirections et consentement cookies sont contrôlés.

## 11. Hors périmètre initial
- Synchronisation Airbnb/Booking.com.
- Channel manager et distribution OTA.
- Application mobile native.
- Comptabilité générale complète.
- Facturation électronique réglementaire sans cadrage spécifique.
