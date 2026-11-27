# Manoir de Tireveste — application Next.js

Base de projet pour la refonte du site et le logiciel de réservation directe.

## Choix fonctionnels actés
- Réservation instantanée.
- Paiement d'un acompte puis règlement du solde.
- Canal de vente : site direct uniquement (aucune connexion OTA / channel manager).
- Administration complète : hébergements, réservations, clients, tarifs, paiements et statistiques.

## Stack
Next.js App Router, React, TypeScript, PostgreSQL, Prisma, Stripe Checkout, Resend, authentification administrateur par cookie JWT signé.

## Démarrage local
Prérequis : Node.js 20.9+, PostgreSQL.

1. Copier `.env.example` vers `.env`.
2. Renseigner `DATABASE_URL`, les clés Stripe, Resend et les secrets administrateur.
3. `npm install`
4. `npx prisma migrate dev --name init`
5. `npm run db:seed`
6. `npm run dev`

Site : http://localhost:3000
Admin : http://localhost:3000/admin

## Configurer l'administrateur
- Générer un hash bcrypt pour le mot de passe avec `node -e "require('bcryptjs').hash('MOT_DE_PASSE_LONG',12).then(console.log)"`.
- Copier le hash dans `ADMIN_PASSWORD_HASH`.
- Générer `AUTH_SECRET` avec `openssl rand -base64 48`.
- Ne jamais committer `.env`.

## Stripe
- Utiliser d'abord les clés de test.
- Créer un webhook vers `/api/webhooks/stripe`.
- Événement à écouter : `checkout.session.completed`.
- Copier le secret `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.
- Tester paiement réussi, échec, abandon, webhook dupliqué et remboursement.

## Email
Créer et authentifier le domaine d'envoi dans Resend, configurer `EMAIL_FROM`, `RESEND_API_KEY` et `BOOKING_NOTIFICATION_EMAIL`.

## Modèle de réservation
Le flux crée une réservation `PENDING_PAYMENT` avec expiration de 20 minutes, puis une session Stripe pour l'acompte. Le webhook passe la réservation à `CONFIRMED` après paiement. Le calendrier considère les réservations confirmées et les paiements en attente non expirés comme bloquants.

## À compléter impérativement avant production
Ce dépôt est une base applicative structurée, pas une plateforme certifiée prête à encaisser des clients. Les éléments ci-dessous nécessitent configuration, tests et validation métier :
- Vérifier le verrouillage concurrent des dates en base : mettre en place une transaction sérialisable ou une contrainte PostgreSQL adaptée pour éliminer toute course entre deux paiements simultanés.
- Ajouter une tâche planifiée pour expirer les réservations `PENDING_PAYMENT` et libérer les dates.
- Mettre en place les paiements du solde, échéancier, remboursements Stripe et rapprochement.
- Compléter les écrans CRUD d'administration (le tableau de bord est fourni comme point de départ).
- Ajouter gestion des rôles équipe, réinitialisation de mot de passe, limitation de tentatives, journalisation et audit de sécurité.
- Ajouter pages de gestion clients, tarifs, disponibilités, cartes cadeaux, prestations, factures et exports.
- Compléter les mentions légales, CGV, politique de confidentialité, cookies et taxe de séjour.
- Ajouter validations, tests unitaires/intégration/e2e, monitoring, sauvegardes et procédure de restauration.
- Faire vérifier le paramétrage juridique et comptable des acomptes, annulations, remboursements et facturation.
- Ajouter les photos autorisées, contenus exacts, tarifs, règles et capacités validés par les propriétaires.

## Inventaire de départ
Le seed crée les cinq chambres mentionnées dans des informations touristiques publiques. Il n'invente pas les gîtes : ils devront être ajoutés avec leurs noms, capacités, équipements, prix et photos exacts. Vérifier également l'inventaire complet directement avec l'établissement.

## Déploiement
- Vercel : importer le dépôt Git.
- Base PostgreSQL : Neon ou Supabase.
- Configurer toutes les variables d'environnement sur Vercel.
- Exécuter les migrations Prisma en environnement de déploiement.
- Configurer le webhook Stripe sur le domaine de production.
- Tester l'ensemble du tunnel avec les clés Stripe de test avant bascule en production.

## Architecture cible détaillée
Voir `CAHIER-DES-CHARGES.md`.
