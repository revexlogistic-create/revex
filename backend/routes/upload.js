// routes/upload.js — Upload vers Cloudinary (production)
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
 
// ── Cloudinary (production) ou stockage local (dev) ──────────
let cloudinary = null;
let useCloudinary = false;
 
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    useCloudinary = true;
    console.log('✅ Cloudinary activé');
  } catch(e) {
    console.log('⚠️  Cloudinary non disponible — stockage local utilisé');
  }
}
 
// ── Stockage local (fallback dev) ────────────────────────────
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const type = req.query.type || 'products';
    const dir = path.join(__dirname, '../uploads', type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
 
const upload = multer({
  storage: multer.memoryStorage(), // mémoire pour Cloudinary
  fileFilter: function(req, file, cb) {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf',
      'text/csv','application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type non autorisé: ' + file.mimetype), false);
  },
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});
 
// Upload local fallback
const localUpload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});
 
function getBaseUrl(req) {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return req.protocol + '://' + req.get('host');
}
 
// ── POST /api/upload/images ───────────────────────────────────
router.post('/images', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
 
    if (useCloudinary) {
      // Upload vers Cloudinary
      const urls = await Promise.all(req.files.map(function(file) {
        return new Promise(function(resolve, reject) {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'revex/products', resource_type: 'image' },
            function(err, result) {
              if (err) reject(err);
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      }));
      return res.json({ urls, count: urls.length });
    }
 
    // Fallback local — sauvegarder sur disque
    const type = req.query.type || 'products';
    const dir = path.join(__dirname, '../uploads', type);
    fs.mkdirSync(dir, { recursive: true });
    const baseUrl = getBaseUrl(req);
    const urls = req.files.map(function(file) {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
      fs.writeFileSync(path.join(dir, filename), file.buffer);
      return baseUrl + '/uploads/' + type + '/' + filename;
    });
    return res.json({ urls, count: urls.length });
 
  } catch(err) {
    console.error('[upload/images]', err.message);
    res.status(500).json({ error: err.message });
  }
});
 
// ── POST /api/upload/document ─────────────────────────────────
router.post('/document', authenticate, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
 
    if (useCloudinary) {
      var result = await new Promise(function(resolve, reject) {
        var folder = req.query.type ? 'revex/' + req.query.type : 'revex/documents';
        cloudinary.uploader.upload_stream(
          { folder: folder, resource_type: 'auto' },
          function(err, r) { if(err) reject(err); else resolve(r); }
        ).end(req.file.buffer);
      });
      return res.json({ url: result.secure_url });
    }
 
    var docType = req.query.type || 'documents';
    var docDir = path.join(__dirname, '../uploads', docType);
    fs.mkdirSync(docDir, { recursive: true });
    var docExt = path.extname(req.file.originalname).toLowerCase();
    var docFilename = Date.now() + '-' + Math.random().toString(36).slice(2) + docExt;
    fs.writeFileSync(path.join(docDir, docFilename), req.file.buffer);
    var docBaseUrl = getBaseUrl(req);
    res.json({ url: docBaseUrl + '/uploads/' + docType + '/' + docFilename });
 
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ── POST /api/upload/stock-file ───────────────────────────────
router.post('/stock-file', authenticate, upload.single('file'), function(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const dir = path.join(__dirname, '../uploads/stock');
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
  fs.writeFileSync(path.join(dir, filename), req.file.buffer);
  const baseUrl = getBaseUrl(req);
  res.json({ filename, url: baseUrl + '/uploads/stock/' + filename, size: req.file.size });
});
 
// ── DELETE /api/upload ────────────────────────────────────────
router.delete('/', authenticate, function(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante' });
 
  // Cloudinary delete
  if (useCloudinary && url.includes('cloudinary.com')) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    const publicId = folder + '/' + filename;
    cloudinary.uploader.destroy(publicId, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Fichier supprimé de Cloudinary' });
    });
    return;
  }
 
  // Local delete
  let relativePath = url;
  try {
    if (url.startsWith('http')) relativePath = new URL(url).pathname;
  } catch(e) {}
 
  if (!relativePath.startsWith('/uploads/')) {
    return res.status(400).json({ error: 'URL invalide' });
  }
  const filePath = path.join(__dirname, '..', relativePath);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'Fichier supprimé' });
  } catch(e) {
    res.status(500).json({ error: 'Erreur suppression' });
  }
});
 
// Gestion erreur multer
router.use(function(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fichier trop volumineux (max 5MB)' });
  }
  next(err);
});
 
module.exports = router;
 
