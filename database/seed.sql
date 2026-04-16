-- ============================================================
-- REVEX MARKETPLACE — SEED DATA
-- Données de test réalistes (secteur industriel marocain)
-- Exécuter APRÈS schema.sql
-- ============================================================

-- ============================================================
-- CATÉGORIES
-- ============================================================
INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
('Électrotechnique',      'electrotechnique',   '⚡', 'Moteurs, variateurs, transformateurs, armoires électriques', 1),
('Mécanique industrielle','mecanique',          '⚙️', 'Roulements, arbres, accouplements, engrenages', 2),
('Hydraulique & Pneumatique','hydraulique',     '💧', 'Pompes, vérins, vannes, compresseurs', 3),
('Instrumentation',       'instrumentation',    '📡', 'Capteurs, transmetteurs, analyseurs, régulateurs', 4),
('Automatisme',           'automatisme',        '🤖', 'Automates, IHM, relais, cartes électroniques', 5),
('Équipements lourds',    'equipements-lourds', '🏗️', 'Chariots, grues, nacelles, convoyeurs', 6),
('Pièces de rechange',    'pieces-rechange',    '🔧', 'Consumables, pièces détachées diverses', 7),
('Matières premières',    'matieres-premieres', '🏭', 'Métaux, polymères, produits chimiques industriels', 8);

-- Sous-catégories électrotechnique
INSERT INTO categories (name, slug, parent_id, icon, sort_order) VALUES
('Moteurs électriques',  'moteurs-electriques',   1, '⚡', 1),
('Variateurs de vitesse','variateurs-vitesse',     1, '🔄', 2),
('Transformateurs',      'transformateurs',        1, '🔌', 3),
('Câbles & Fils',        'cables-fils',            1, '🔗', 4);

-- Sous-catégories hydraulique
INSERT INTO categories (name, slug, parent_id, icon, sort_order) VALUES
('Pompes hydrauliques',  'pompes-hydrauliques', 3, '💧', 1),
('Compresseurs d''air',  'compresseurs-air',    3, '💨', 2),
('Vannes industrielles', 'vannes',              3, '🔴', 3);

-- ============================================================
-- USERS (mots de passe : "Password123!" hashé bcrypt)
-- Hash bcrypt de "Password123!" : $2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO
-- ============================================================

-- Admin
INSERT INTO users (id, email, password_hash, role, status, company_name, contact_name, phone, city, region, country, sector, email_verified) VALUES
('00000000-0000-0000-0000-000000000001',
 'admin@revex.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'admin', 'active', 'REVEX Platform', 'Admin REVEX',
 '+212 5 22 00 00 01', 'Casablanca', 'Grand Casablanca', 'Maroc', 'Technologie', true);

-- Vendeurs
INSERT INTO users (id, email, password_hash, role, status, company_name, contact_name, phone, city, region, country, sector, ice_number, email_verified, total_sales, rating, reviews_count) VALUES
('00000000-0000-0000-0000-000000000002',
 'vendeur1@cimencas.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'seller', 'active', 'CIMENCAS Industrie', 'Mohammed Benali',
 '+212 5 22 34 56 78', 'Casablanca', 'Grand Casablanca', 'Maroc',
 'Cimenterie', 'ICE001234567890', true, 12, 4.50, 8),

('00000000-0000-0000-0000-000000000003',
 'vendeur2@lafarge.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'seller', 'active', 'LafargeHolcim Maroc', 'Fatima Zahra Alaoui',
 '+212 5 22 87 65 43', 'Meknès', 'Fès-Meknès', 'Maroc',
 'Cimenterie', 'ICE009876543210', true, 24, 4.80, 15),

('00000000-0000-0000-0000-000000000004',
 'vendeur3@ocp.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'seller', 'active', 'OCP Group - Division Technique', 'Khalid Mansouri',
 '+212 5 23 11 22 33', 'Khouribga', 'Béni Mellal-Khénifra', 'Maroc',
 'Mines & Phosphates', 'ICE005544332211', true, 35, 4.90, 22),

('00000000-0000-0000-0000-000000000005',
 'vendeur4@samir.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'seller', 'active', 'SAMIR Industries', 'Youssef Tazi',
 '+212 5 37 44 55 66', 'Mohammedia', 'Grand Casablanca', 'Maroc',
 'Pétrochimie', 'ICE007788990011', true, 8, 4.20, 5);

-- Acheteurs
INSERT INTO users (id, email, password_hash, role, status, company_name, contact_name, phone, city, region, country, sector, email_verified, total_purchases) VALUES
('00000000-0000-0000-0000-000000000006',
 'acheteur1@managem.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'buyer', 'active', 'Managem Group', 'Samira Benkirane',
 '+212 5 22 99 88 77', 'Marrakech', 'Marrakech-Safi', 'Maroc',
 'Mines & Métaux', 'ICE001122334455', true, 7),

('00000000-0000-0000-0000-000000000007',
 'acheteur2@jem.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'buyer', 'active', 'JEM - Jordaan Equipment Maroc', 'Hassan Chraibi',
 '+212 5 37 22 33 44', 'Rabat', 'Rabat-Salé-Kénitra', 'Maroc',
 'Agroalimentaire', 'ICE002233445566', true, 15);

-- Distributeur
INSERT INTO users (id, email, password_hash, role, status, company_name, contact_name, phone, city, region, country, sector, email_verified) VALUES
('00000000-0000-0000-0000-000000000008',
 'distrib@techparts.ma',
 '$2b$10$XJqH4s9YZ2KHp1Kk4Q5XHunr8yIqGx3vFBF9G.eXU5w7W1P2y2SqO',
 'distributor', 'active', 'TechParts Distribution Maroc', 'Rachid Idrissi',
 '+212 5 22 66 77 88', 'Casablanca', 'Grand Casablanca', 'Maroc',
 'Distribution industrielle', 'ICE003344556677', true);

-- ============================================================
-- PRODUITS (Stock dormant réaliste)
-- ============================================================
INSERT INTO products (
  id, seller_id, category_id, title, slug, reference, brand, model,
  description, specifications, condition, quantity, unit, price,
  negotiable, weight_kg, location_city, location_region,
  delivery_type, eco_delivery_price, urgent_delivery_price,
  delivery_days_eco, delivery_days_urgent,
  images, status, dormant_since, tags, views_count, favorites_count, published_at
) VALUES

-- Produit 1: Moteur électrique
('10000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000002',
 10, -- moteurs-electriques
 'Moteur électrique asynchrone Siemens 15kW - Neuf en stock',
 'moteur-electrique-siemens-15kw-neuf',
 'REF-ME15-073', 'Siemens', '1LA7163-4AA60',
 'Moteur électrique asynchrone triphasé 15kW, 380V, 1450 tr/min, IP55. Commandé en 2021 comme pièce de rechange, jamais installé. Emballage d''origine intact. Idéal pour remplacement ou nouveau projet.',
 '{"puissance": "15 kW", "tension": "380V", "frequence": "50 Hz", "vitesse": "1450 tr/min", "protection": "IP55", "classe_isolement": "F", "rendement": "IE3", "frame": "160M"}',
 'new', 2, 'unité', 18500.00, true,
 125.0, 'Casablanca', 'Grand Casablanca',
 'both', 450.00, 1200.00, 5, 2,
 '["/uploads/products/moteur-siemens-1.jpg", "/uploads/products/moteur-siemens-2.jpg"]',
 'active', '2021-06-15',
 ARRAY['moteur', 'siemens', 'électrique', 'asynchrone', '15kw', 'neuf'],
 145, 12, NOW() - INTERVAL '3 months'),

-- Produit 2: Pompe hydraulique
('10000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000003',
 13, -- pompes-hydrauliques
 'Pompe hydraulique Parker PVplus 45 - Bon état - Révisée',
 'pompe-hydraulique-parker-pvplus-45',
 'REF-PH45-112', 'Parker Hannifin', 'PVplus45R1EC02',
 'Pompe à pistons axiales Parker PVplus 45, déplacement 45 cm³/tr, pression max 350 bar. Révisée et testée par notre service maintenance en 2023. Accompagnée de son certificat de révision.',
 '{"cylindree": "45 cm³/tr", "pression_max": "350 bar", "vitesse_max": "3000 tr/min", "poids": "28 kg", "raccordement": "SAE A 4 trous"}',
 'good', 1, 'unité', 32000.00, true,
 28.0, 'Meknès', 'Fès-Meknès',
 'both', 380.00, 950.00, 6, 2,
 '["/uploads/products/pompe-parker-1.jpg"]',
 'active', '2020-03-01',
 ARRAY['pompe', 'parker', 'hydraulique', 'piston', 'révisée'],
 89, 7, NOW() - INTERVAL '2 months'),

-- Produit 3: Variateur de vitesse
('10000000-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000004',
 11, -- variateurs-vitesse
 'Variateur de vitesse ABB ACS880 75kW - Neuf emballé',
 'variateur-vitesse-abb-acs880-75kw',
 'REF-VV75-ABB', 'ABB', 'ACS880-01-145A-3',
 'Variateur de fréquence ABB ACS880 75kW, 400V triphasé. Commande de 2022 pour extension d''usine annulée. Neuf, jamais déballé, emballage d''origine avec tous accessoires. Documentation complète.',
 '{"puissance": "75 kW", "tension_alim": "380-480V", "courant_nominal": "145A", "protection": "IP21", "communication": "EtherNet/IP, Profibus", "freinage": "intégré"}',
 'new', 1, 'unité', 78000.00, true,
 42.0, 'Khouribga', 'Béni Mellal-Khénifra',
 'both', 520.00, 1400.00, 7, 3,
 '["/uploads/products/abb-acs880-1.jpg", "/uploads/products/abb-acs880-2.jpg"]',
 'active', '2022-09-01',
 ARRAY['variateur', 'ABB', 'ACS880', '75kW', 'neuf', 'fréquence'],
 234, 19, NOW() - INTERVAL '1 month'),

-- Produit 4: Roulements (lot)
('10000000-0000-0000-0000-000000000004',
 '00000000-0000-0000-0000-000000000002',
 2, -- mecanique
 'Lot roulements à billes SKF 6210 - 24 unités neuves',
 'lot-roulements-skf-6210-24-unites',
 'REF-SKF6210-LOT', 'SKF', '6210-2RS',
 'Lot de 24 roulements à billes SKF 6210-2RS (étanchéité 2 côtés). Dimensions : 50×90×20mm. Stock commandé pour révision annuelle non réalisée. Emballages individuels d''origine.',
 '{"alésage": "50 mm", "diametre_ext": "90 mm", "largeur": "20 mm", "charge_dyn": "35.1 kN", "charge_stat": "19.6 kN", "etancheite": "2RS1"}',
 'new', 24, 'pièce', 185.00, true,
 0.4, 'Casablanca', 'Grand Casablanca',
 'both', 95.00, 220.00, 4, 1,
 '["/uploads/products/skf-6210-1.jpg"]',
 'active', '2022-01-15',
 ARRAY['roulement', 'SKF', '6210', 'billes', 'lot', 'étanchéité'],
 312, 28, NOW() - INTERVAL '4 months'),

-- Produit 5: Vanne pneumatique
('10000000-0000-0000-0000-000000000005',
 '00000000-0000-0000-0000-000000000003',
 15, -- vannes
 'Vanne papillon pneumatique Bürkert DN150 - Neuve',
 'vanne-papillon-pneumatique-burkert-dn150',
 'REF-VP150-BUK', 'Bürkert', '2103 DN150',
 'Vanne papillon avec actionneur pneumatique double effet, DN150, PN16. Inox 316L corps et papillon. Certifiée ATEX. Convient process chimique, alimentaire, eau. Jamais installée.',
 '{"diametre": "DN150", "pression_max": "16 bar", "materiau": "Inox 316L", "actionnement": "Pneumatique double effet", "certif": "ATEX II 2G", "etancheite": "PTFE"}',
 'new', 3, 'unité', 8900.00, true,
 18.5, 'Meknès', 'Fès-Meknès',
 'both', 250.00, 680.00, 5, 2,
 '["/uploads/products/vanne-burkert-1.jpg"]',
 'active', '2021-11-01',
 ARRAY['vanne', 'papillon', 'pneumatique', 'bürkert', 'DN150', 'ATEX', 'inox'],
 67, 5, NOW() - INTERVAL '5 months'),

-- Produit 6: Automate Schneider
('10000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000004',
 5, -- automatisme
 'Automate programmable Schneider M340 - Complet + modules',
 'automate-schneider-m340-complet',
 'REF-AP-M340-KIT', 'Schneider Electric', 'BMX P34 2020',
 'Kit automate M340 complet : CPU BMX P34 2020 + rack 8 emplacements + modules E/S (4×TOR 16E, 4×TOR 16S, 2×ANA 4E) + alimentation 24VDC. Déposé lors d''une migration vers M580. En parfait état de fonctionnement.',
 '{"cpu": "BMX P34 2020", "memoire": "512 Ko", "slots": "8", "communication": "Modbus RTU, Ethernet", "alim": "24VDC", "modules_inclus": "10 modules"}',
 'good', 1, 'kit', 45000.00, true,
 35.0, 'Khouribga', 'Béni Mellal-Khénifra',
 'both', 420.00, 1100.00, 7, 3,
 '["/uploads/products/schneider-m340-1.jpg", "/uploads/products/schneider-m340-2.jpg"]',
 'active', '2023-01-01',
 ARRAY['automate', 'schneider', 'M340', 'PLC', 'modules', 'IO'],
 198, 22, NOW() - INTERVAL '2 months'),

-- Produit 7: Compresseur
('10000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000005',
 14, -- compresseurs-air
 'Compresseur à vis Atlas Copco GA15 - 15kW - Bon état',
 'compresseur-vis-atlas-copco-ga15',
 'REF-COMP-GA15', 'Atlas Copco', 'GA15 FF',
 'Compresseur à vis lubrifiée Atlas Copco GA15 avec sécheur intégré. 15kW, 8 bar, 28 m³/h. 18 000h de fonctionnement, dernière révision en 2023 (factures disponibles). Remplacé par un modèle plus grand.',
 '{"puissance": "15 kW", "pression": "8 bar", "debit": "28 m³/h", "heures": "18000 h", "annee": "2016", "secheur": "intégré FFD", "cuve": "270 litres"}',
 'used', 1, 'unité', 55000.00, true,
 450.0, 'Mohammedia', 'Grand Casablanca',
 'both', 850.00, 2200.00, 8, 4,
 '["/uploads/products/atlas-ga15-1.jpg", "/uploads/products/atlas-ga15-2.jpg"]',
 'active', '2023-07-01',
 ARRAY['compresseur', 'atlas copco', 'GA15', 'vis', 'sécheur', 'occasion'],
 156, 14, NOW() - INTERVAL '1 month');

-- ============================================================
-- COMMANDES (échantillon)
-- ============================================================
INSERT INTO orders (
  id, order_number, buyer_id, seller_id, product_id,
  quantity, unit_price, total_price, delivery_type, delivery_price, final_price,
  status, delivery_address, confirmed_at, created_at
) VALUES
('20000000-0000-0000-0000-000000000001',
 'ORD-2024-00001',
 '00000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000004',
 12, 185.00, 2220.00, 'eco', 95.00, 2315.00,
 'delivered',
 '{"company": "Managem Group", "address": "Zone Industrielle Marrakech", "city": "Marrakech", "zip": "40000"}',
 NOW() - INTERVAL '20 days',
 NOW() - INTERVAL '25 days'),

('20000000-0000-0000-0000-000000000002',
 'ORD-2024-00002',
 '00000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000004',
 '10000000-0000-0000-0000-000000000003',
 1, 78000.00, 78000.00, 'urgent', 1400.00, 79400.00,
 'confirmed',
 '{"company": "JEM Maroc", "address": "Rue des Industries, Ain Sebaa", "city": "Rabat", "zip": "10000"}',
 NOW() - INTERVAL '2 days',
 NOW() - INTERVAL '3 days');

-- ============================================================
-- DEVIS
-- ============================================================
INSERT INTO quotes (
  id, product_id, buyer_id, seller_id, quantity, proposed_price, message,
  delivery_type, status, expires_at
) VALUES
('30000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000002',
 2, 16000.00,
 'Bonjour, nous sommes intéressés par 2 moteurs pour notre atelier de broyage. Pouvez-vous nous accorder une remise pour une commande double ? Livraison souhaitée sous 1 semaine.',
 'urgent', 'pending',
 NOW() + INTERVAL '7 days'),

('30000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000004',
 1, 40000.00,
 'Notre technicien a examiné les specs. Nous pouvons proposer 40 000 MAD. Le rack est-il inclus avec tous les modules mentionnés ?',
 'eco', 'accepted',
 NOW() + INTERVAL '5 days');

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
INSERT INTO conversations (id, participant_1, participant_2, product_id) VALUES
('40000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000001');

INSERT INTO messages (conversation_id, sender_id, type, content, is_read) VALUES
('40000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000006', 'text',
 'Bonjour, ces moteurs sont-ils toujours disponibles ? Quel est le délai de livraison vers Marrakech ?',
 true),
('40000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000002', 'text',
 'Bonjour, oui les 2 unités sont disponibles. Pour Marrakech comptez 5 à 6 jours en livraison économique. Je vous envoie les fiches techniques.',
 true),
('40000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000006', 'text',
 'Parfait, nous allons procéder à la commande. Pouvez-vous nous faire une facture pro forma ?',
 false);

-- ============================================================
-- TRANSPORTS
-- ============================================================
INSERT INTO transports (carrier_id, departure_city, departure_region, arrival_city, arrival_region, departure_date, vehicle_type, capacity_tons, volume_m3, price_per_kg) VALUES
('00000000-0000-0000-0000-000000000008', 'Casablanca', 'Grand Casablanca', 'Marrakech', 'Marrakech-Safi', CURRENT_DATE + 2, 'Semi-remorque', 24.0, 86.0, 0.18),
('00000000-0000-0000-0000-000000000008', 'Casablanca', 'Grand Casablanca', 'Fès', 'Fès-Meknès', CURRENT_DATE + 3, 'Porteur', 8.0, 32.0, 0.14),
('00000000-0000-0000-0000-000000000008', 'Casablanca', 'Grand Casablanca', 'Rabat', 'Rabat-Salé-Kénitra', CURRENT_DATE + 1, 'Fourgon', 2.0, 12.0, 0.20),
('00000000-0000-0000-0000-000000000008', 'Marrakech', 'Marrakech-Safi', 'Casablanca', 'Grand Casablanca', CURRENT_DATE + 4, 'Semi-remorque', 18.0, 65.0, 0.16);

-- ============================================================
-- NOTIFICATIONS (démo)
-- ============================================================
INSERT INTO notifications (user_id, type, title, body, data) VALUES
('00000000-0000-0000-0000-000000000002', 'new_quote', 'Nouveau devis reçu',
 'Managem Group vous a envoyé un devis pour Moteur Siemens 15kW',
 '{"product_id": "10000000-0000-0000-0000-000000000001", "quote_id": "30000000-0000-0000-0000-000000000001"}'),
('00000000-0000-0000-0000-000000000006', 'order_confirmed', 'Commande confirmée',
 'Votre commande ORD-2024-00001 a été confirmée par CIMENCAS Industrie',
 '{"order_id": "20000000-0000-0000-0000-000000000001"}'),
('00000000-0000-0000-0000-000000000007', 'new_message', 'Nouveau message',
 'OCP Group vous a envoyé un message concernant Variateur ABB ACS880',
 '{"conversation_id": "40000000-0000-0000-0000-000000000001"}');

-- ============================================================
-- AVIS
-- ============================================================
INSERT INTO reviews (reviewer_id, reviewed_id, order_id, rating, title, comment, is_verified) VALUES
('00000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000002',
 '20000000-0000-0000-0000-000000000001',
 5, 'Excellent vendeur, très professionnel',
 'Les roulements étaient exactement comme décrits, emballage parfait. Livraison rapide. Je recommande vivement CIMENCAS pour leurs pièces de qualité.',
 true);

SELECT 'Seed data loaded successfully!' AS status,
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM categories) AS categories_count,
  (SELECT COUNT(*) FROM products) AS products_count,
  (SELECT COUNT(*) FROM orders) AS orders_count;
