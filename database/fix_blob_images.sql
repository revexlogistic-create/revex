-- fix_blob_images.sql
-- Les images sont des blob: URLs inutilisables → les vider

-- 1. Vider les images blob (elles ne fonctionneront jamais)
UPDATE products
SET images = '[]'
WHERE images::text LIKE '%blob:http%';

-- Vérification
SELECT id, title, LEFT(images::text, 80) as images_preview
FROM products
WHERE images IS NOT NULL AND images != '[]'
LIMIT 10;
