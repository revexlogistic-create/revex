// src/pages/seller/PublishAutoProduct.jsx
// Publication pièces automobiles — aligné avec AutoMarketplace

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const CA = {
  red:'#1A3C2E', darkRed:'#0F2318',
  cream:'#F4F6F4', beige:'#E8EDE8', mid:'#C8D4C8',
  white:'#FFFFFF', muted:'#4A4E5A', dark:'#1C1F23',
  blue:'#2563EB',
};

const MAKES = ['Toyota','Volkswagen','Renault','Peugeot','Citroën','Dacia','Hyundai','Kia','Ford','Mercedes-Benz','BMW','Audi','Fiat','Opel','Seat','Skoda','Honda','Nissan','Suzuki','Mitsubishi','Autre'];

const PART_CATS = [
  'Moteur & Distribution','Freinage','Electrique & Batterie',
  'Refroidissement','Suspension & Direction','Echappement',
  'Carrosserie & Vitrage','Transmission','Eclairage',
  'Climatisation','Filtres & Lubrifiants','Accessoires',
];

const CONDITIONS = [
  { value:'new',       label:'Neuf',        color:'#059669', bg:'#ECFDF5', desc:'Jamais utilisé' },
  { value:'good',      label:'Bon état',    color:'#2563EB', bg:'#EFF6FF', desc:'Peu de traces' },
  { value:'used',      label:'Occasion',    color:'#D97706', bg:'#FFFBEB', desc:'Usure normale' },
  { value:'for_parts', label:'Pour pièces', color:'#6B7280', bg:'#F3F4F6', desc:'Défectueux' },
];

const lbl = { fontSize:'0.78rem', fontWeight:600, color:'#111827', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', background:'#fff' };
const fmt = n => Number(n||0).toLocaleString('fr-MA');

function PreviewCard({ form, images }) {
  const cond = CONDITIONS.find(c => c.value === form.condition) || CONDITIONS[1];
  return (
    <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:'2px solid #FECACA', maxWidth:240, boxShadow:'0 8px 24px rgba(26,60,46,0.12)' }}>
      <div style={{ height:160, background:'#F4F6F4', position:'relative', overflow:'hidden' }}>
        {images[0] ? (
          <img src={images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        ) : (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.3rem' }}>
            <span style={{ fontSize:'2rem', opacity:0.2 }}>🔧</span>
            <span style={{ fontSize:'0.65rem', color:'#6B7280', opacity:0.5 }}>Ajoutez une photo</span>
          </div>
        )}
        <span style={{ position:'absolute', top:8, left:8, background:cond.bg, color:cond.color, fontSize:'0.6rem', fontWeight:700, padding:'0.15rem 0.5rem', borderRadius:100 }}>
          {cond.label}
        </span>
        {form.urgent_mode && (
          <span style={{ position:'absolute', top:8, right:8, background:'#1A3C2E', color:'#fff', fontSize:'0.58rem', fontWeight:700, padding:'0.15rem 0.5rem', borderRadius:100 }}>
            ⚡ Express
          </span>
        )}
        {form.vehicle_make && (
          <span style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:'0.6rem', fontWeight:600, padding:'0.12rem 0.5rem', borderRadius:100 }}>
            {form.vehicle_make}
          </span>
        )}
      </div>
      <div style={{ padding:'0.75rem' }}>
        <div style={{ fontWeight:700, color:'#111', fontSize:'0.82rem', lineHeight:1.3, marginBottom:'0.25rem', minHeight:36 }}>
          {form.title || 'Désignation de la pièce...'}
        </div>
        {form.reference && (
          <div style={{ fontSize:'0.65rem', color:'#6B7280', marginBottom:'0.3rem', fontFamily:'monospace' }}>
            Réf: {form.reference}
          </div>
        )}
        {form.vehicle_make && (
          <div style={{ fontSize:'0.68rem', color:'#2563EB', fontWeight:600, marginBottom:'0.3rem' }}>
            🚗 {form.vehicle_make}{form.vehicle_model ? ' '+form.vehicle_model : ''}{form.vehicle_year ? ' ('+form.vehicle_year+')' : ''}
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.4rem' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:'#1A3C2E' }}>
            {form.price ? fmt(form.price)+' MAD' : '— MAD'}
          </div>
          <div style={{ background:'#1A3C2E', color:'#fff', padding:'0.3rem 0.65rem', borderRadius:100, fontSize:'0.68rem', fontWeight:700 }}>
            Acheter →
          </div>
        </div>
        <div style={{ fontSize:'0.62rem', color:'#6B7280', marginTop:'0.4rem', paddingTop:'0.4rem', borderTop:'1px solid #F3F4F6' }}>
          🏪 Votre boutique · 📍 {form.location_city||'Ville'}
        </div>
      </div>
    </div>
  );
}

export default function PublishAutoProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Charger les données du produit en mode édition
  const { data: editData } = useQuery(
    ['edit-product', editId],
    function() { return api.get('/products/' + editId).then(function(r) { return r.data; }); },
    { enabled: !!editId, onSuccess: function(data) {
      var p = data.product;
      if (!p) return;
      var imgs = Array.isArray(p.images) ? p.images
        : (p.images ? (function() { try { return JSON.parse(p.images); } catch(e) { return []; } })() : []);
      setImages(imgs);
      setForm({
        title:          p.title         || '',
        description:    p.description   || '',
        price:          p.price         || '',
        quantity:       p.quantity      || 1,
        condition:      p.condition     || 'used',
        part_category:  p.part_category || '',
        reference:      p.reference     || '',
        brand:          p.brand         || '',
        location_city:  p.location_city || '',
        delivery_type:  p.delivery_type || 'standard',
        vehicle_make:   p.vehicle_make  || '',
        vehicle_model:  p.vehicle_model || '',
        vehicle_year:   p.vehicle_year  || '',
        vehicle_year_end: p.vehicle_year_end || '',
        urgent_mode:    p.urgent_mode   || false,
      });
    }}
  );

  const [form, setForm] = useState({
    title:'', reference:'', part_category:'', condition:'good',
    quantity:1, price:'', negotiable:false, description:'',
    vehicle_make:'', vehicle_model:'', vehicle_year:'', vehicle_year_end:'',
    location_city: (user && user.city) || '',
    delivery_type:'both', eco_delivery_price:'', urgent_delivery_price:'',
    urgent_mode:false,
  });

  var setf = function(k, v) { setForm(function(p) { return Object.assign({}, p, {[k]: v}); }); };
  const canPublish = form.title && form.price && form.location_city;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 6) { toast.error('Maximum 6 photos'); return; }
    setUploading(true);
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var fd = new FormData();
      fd.append('images', file);
      try {
        var res = await api.post('/upload/images?type=products', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        if (res.data && res.data.urls && res.data.urls[0]) {
          setImages(function(p) { return [...p, res.data.urls[0]]; });
        } else {
          toast.error('Erreur upload photo — réessayez');
        }
      } catch(err) {
        toast.error('Erreur upload : ' + (err.response && err.response.data && err.response.data.error || 'Vérifiez votre connexion'));
      }
    }
    setUploading(false);
  };

  const updateMutation = useMutation(
    function(payload) { return api.put('/products/' + editId, payload); },
    {
      onSuccess: function(res) {
        toast.success('✅ Annonce mise à jour !');
        // Rediriger vers le nouveau slug si le titre a changé, sinon l'ancien
        var newSlug = (res.data && res.data.product && res.data.product.slug) || editId;
        navigate('/auto/' + newSlug);
      },
      onError: function(e) { toast.error((e.response && e.response.data && e.response.data.error) || 'Erreur mise à jour'); }
    }
  );

  const publishMutation = useMutation(
    (payload) => api.post('/products', payload),
    {
      onSuccess: () => { toast.success('🚗 Pièce publiée !'); navigate('/pieces-auto'); },
      onError: e => toast.error(e.response?.data?.error || 'Erreur de publication'),
    }
  );

  const handlePublish = () => {
    if (!canPublish) { toast.error('Titre, prix et ville sont obligatoires'); return; }
    const compat = [form.vehicle_make, form.vehicle_model, form.vehicle_year, form.vehicle_year_end].filter(Boolean).join(' ');
    publishMutation.mutate({
      title:                form.title,
      brand:                form.vehicle_make || null,
      model:                form.vehicle_model || null,
      reference:            form.reference || null,
      description:          form.description + (compat ? ('\n\nCompatible : '+compat) : ''),
      condition:            form.condition,
      quantity:             Number(form.quantity) || 1,
      unit:                 'piece',
      price:                Number(form.price),
      negotiable:           form.negotiable,
      location_city:        form.location_city,
      delivery_type:        form.delivery_type,
      eco_delivery_price:   form.eco_delivery_price    ? Number(form.eco_delivery_price)    : null,
      urgent_delivery_price:form.urgent_delivery_price ? Number(form.urgent_delivery_price) : null,
      urgent_mode:          form.urgent_mode,
      images:               images,
      status:               'active',
      tags:                 'automobile auto ' + (form.vehicle_make||''),
      is_auto:              true,
      vehicle_make:         form.vehicle_make  || null,
      vehicle_model:        form.vehicle_model || null,
      vehicle_year:         form.vehicle_year  ? Number(form.vehicle_year) : null,
    });
  };

  return (
    <div style={{ background:'#F9FAFB', minHeight:'100vh' }}>

      <div style={{ background:'linear-gradient(135deg,#0F2318,#1A3C2E)', padding:'1.8rem 2rem' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Link to="/seller" style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', textDecoration:'none', display:'inline-block', marginBottom:'0.6rem' }}>
            ← Espace vendeur
          </Link>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:'#fff', margin:'0 0 0.3rem' }}>
            🚗 Publier une pièce automobile
          </h1>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.85rem' }}>
            Visible uniquement sur la marketplace /pieces-auto · Séparé du catalogue PDR industriel
          </p>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1100, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem', display:'grid', gridTemplateColumns:'1fr 260px', gap:'2rem', alignItems:'start' }}>

        <div style={{ display:'flex', flexDirection:'column', gap:'1.2rem' }}>

          {/* Pièce */}
          <section style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'1.5rem' }}>
            <div style={{ fontWeight:700, color:'#111', marginBottom:'1.2rem' }}>🔧 Identifier la pièce</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.9rem' }}>
              <div>
                <label style={lbl}>Désignation *</label>
                <input value={form.title} onChange={e => setf('title', e.target.value)}
                  placeholder="Ex: Filtre huile Renault, Disque frein avant, Alternateur..."
                  style={inp}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.9rem' }}>
                <div>
                  <label style={lbl}>Référence / Code OEM</label>
                  <input value={form.reference} onChange={e => setf('reference', e.target.value)}
                    placeholder="Ex: 0451103259..." style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Catégorie</label>
                  <select value={form.part_category} onChange={e => setf('part_category', e.target.value)} style={inp}>
                    <option value="">Sélectionner...</option>
                    {PART_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem' }}>
                {CONDITIONS.map(c => (
                  <label key={c.value}
                    style={{ border:'2px solid '+(form.condition===c.value?'#1A3C2E':'#E5E7EB'), background:form.condition===c.value?'#F4F6F4':'#F9FAFB', borderRadius:12, padding:'0.7rem 0.5rem', cursor:'pointer', textAlign:'center' }}>
                    <input type="radio" name="cond" value={c.value} checked={form.condition===c.value} onChange={() => setf('condition', c.value)} style={{ display:'none' }}/>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:form.condition===c.value?'#1A3C2E':'#111' }}>{c.label}</div>
                    <div style={{ fontSize:'0.62rem', color:'#6B7280', marginTop:2 }}>{c.desc}</div>
                  </label>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.9rem' }}>
                <div>
                  <label style={lbl}>Prix (MAD) *</label>
                  <input type="number" value={form.price} onChange={e => setf('price', e.target.value)}
                    placeholder="Ex: 350" min="0" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Quantité disponible</label>
                  <input type="number" value={form.quantity} onChange={e => setf('quantity', e.target.value)}
                    min="1" style={inp}/>
                </div>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:'0.6rem', cursor:'pointer' }}>
                <input type="checkbox" checked={form.negotiable} onChange={e => setf('negotiable', e.target.checked)} style={{ accentColor:'#1A3C2E', width:15, height:15 }}/>
                <span style={{ fontSize:'0.84rem' }}>Prix négociable</span>
              </label>
              <div>
                <label style={lbl}>Description</label>
                <textarea value={form.description} onChange={e => setf('description', e.target.value)} rows={3}
                  placeholder="Etat détaillé, historique, raison de la vente, numéro OEM..."
                  style={{ ...inp, resize:'vertical' }}/>
              </div>
            </div>
          </section>

          {/* Compatibilité */}
          <section style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'1.5rem' }}>
            <div style={{ fontWeight:700, color:'#111', marginBottom:'0.4rem' }}>🚗 Compatibilité véhicule <span style={{ fontSize:'0.72rem', color:'#6B7280', fontWeight:400 }}>(recommandé)</span></div>
            <p style={{ fontSize:'0.78rem', color:'#6B7280', marginBottom:'1rem' }}>
              Les acheteurs filtrent par marque · Augmente les vues de 3×
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0.8rem' }}>
              <div>
                <label style={lbl}>Marque</label>
                <select value={form.vehicle_make} onChange={e => setf('vehicle_make', e.target.value)} style={inp}>
                  <option value="">Universel</option>
                  {MAKES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Modèle</label>
                <input value={form.vehicle_model} onChange={e => setf('vehicle_model', e.target.value)}
                  placeholder="Ex: Clio III" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Année de</label>
                <input type="number" value={form.vehicle_year} onChange={e => setf('vehicle_year', e.target.value)}
                  placeholder="2010" min="1990" max="2025" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Année à</label>
                <input type="number" value={form.vehicle_year_end} onChange={e => setf('vehicle_year_end', e.target.value)}
                  placeholder="2018" min="1990" max="2025" style={inp}/>
              </div>
            </div>
            {form.vehicle_make && (
              <div style={{ marginTop:'0.8rem', background:'#F4F6F4', border:'1px solid #FECACA', borderRadius:10, padding:'0.6rem 0.9rem', fontSize:'0.8rem', color:'#0F2318' }}>
                🚗 Compatible : <strong>{form.vehicle_make} {form.vehicle_model}</strong>
                {form.vehicle_year && ' · '+form.vehicle_year+(form.vehicle_year_end?'–'+form.vehicle_year_end:' et après')}
              </div>
            )}
          </section>

          {/* Photos */}
          <section style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'1.5rem' }}>
            <div style={{ fontWeight:700, color:'#111', marginBottom:'0.4rem' }}>📸 Photos <span style={{ fontSize:'0.72rem', color:'#6B7280', fontWeight:400 }}>La 1ère = photo principale · Max 6</span></div>
            <label style={{ display:'block', background:'#F4F6F4', border:'2px dashed #FECACA', borderRadius:14, padding:'1.5rem', textAlign:'center', cursor:'pointer', marginBottom:'0.8rem' }}>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display:'none' }}/>
              <div style={{ fontSize:'2rem', opacity:0.3, marginBottom:'0.3rem' }}>📷</div>
              <div style={{ fontWeight:600, color:'#111', fontSize:'0.85rem' }}>{uploading ? '⏳ Upload...' : 'Cliquer pour ajouter des photos'}</div>
            </label>
            {images.length > 0 && (
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {images.map((url, i) => (
                  <div key={i} style={{ position:'relative', width:80, height:80, borderRadius:10, overflow:'hidden', border:'2px solid '+(i===0?'#1A3C2E':'#E5E7EB') }}>
                    <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    {i===0 && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(26,60,46,0.8)', color:'#fff', fontSize:'0.55rem', textAlign:'center', padding:'0.1rem' }}>Principale</div>}
                    <button onClick={() => setImages(imgs => imgs.filter((_,j) => j!==i))}
                      style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,0.55)', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', color:'#fff', fontSize:'0.7rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Livraison */}
          <section style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'1.5rem' }}>
            <div style={{ fontWeight:700, color:'#111', marginBottom:'1.2rem' }}>🚚 Options de livraison</div>

            {/* Ville + Mode */}
            <div className="form-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.9rem', marginBottom:'1rem' }}>
              <div>
                <label style={lbl}>Ville *</label>
                <input value={form.location_city} onChange={e => setf('location_city', e.target.value)} placeholder="Ex: Casablanca" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Mode de remise</label>
                <select value={form.delivery_type} onChange={e => setf('delivery_type', e.target.value)} style={inp}>
                  <option value="both">Envoi + Remise en main propre</option>
                  <option value="delivery">Envoi uniquement (partout au Maroc)</option>
                  <option value="pickup">Remise en main propre uniquement</option>
                </select>
              </div>
            </div>

            {/* Options d'envoi */}
            {form.delivery_type !== 'pickup' && (
              <div style={{ background:'#F9FAFB', borderRadius:12, padding:'1rem', marginBottom:'1rem', border:'1px solid #E5E7EB' }}>
                <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.8rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Frais d'envoi
                </div>
                <div className="form-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
                  <div>
                    <label style={lbl}>🚛 Livraison standard (MAD)</label>
                    <input type="number" value={form.eco_delivery_price}
                      onChange={e => setf('eco_delivery_price', e.target.value)}
                      placeholder="Ex: 80" min="0" style={inp}/>
                    <div style={{ fontSize:'0.68rem', color:'#9CA3AF', marginTop:3 }}>Délai 2–5 jours · Amana, Ghazala...</div>
                  </div>
                  <div>
                    <label style={lbl}>⚡ Livraison express (MAD)</label>
                    <input type="number" value={form.urgent_delivery_price}
                      onChange={e => setf('urgent_delivery_price', e.target.value)}
                      placeholder="Ex: 150" min="0" style={inp}/>
                    <div style={{ fontSize:'0.68rem', color:'#9CA3AF', marginTop:3 }}>Délai 24h · Laissez vide si non disponible</div>
                  </div>
                </div>
                {!form.eco_delivery_price && !form.urgent_delivery_price && (
                  <div style={{ background:'#FEF3C7', borderRadius:8, padding:'0.5rem 0.7rem', marginTop:'0.7rem', fontSize:'0.75rem', color:'#92400E' }}>
                    ⚠️ Précisez au moins un tarif d'envoi, sinon l'acheteur ne saura pas combien ça coûte.
                  </div>
                )}
              </div>
            )}

            {/* Remise en main propre info */}
            {(form.delivery_type === 'pickup' || form.delivery_type === 'both') && (
              <div style={{ background:'#EFF6FF', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1rem', fontSize:'0.8rem', color:'#1D4ED8', border:'1px solid #BFDBFE' }}>
                📍 Remise en main propre à <strong>{form.location_city || 'votre ville'}</strong> — l'acheteur vous contacte pour fixer le lieu de rendez-vous.
              </div>
            )}

            {/* Badge Express */}
            <label style={{ display:'flex', alignItems:'center', gap:'0.7rem', background:form.urgent_mode?'#EEF4F0':'#F9FAFB', border:'1.5px solid '+(form.urgent_mode?'#1A3C2E':'#E5E7EB'), borderRadius:12, padding:'0.8rem 1rem', cursor:'pointer' }}>
              <input type="checkbox" checked={form.urgent_mode} onChange={e => setf('urgent_mode', e.target.checked)} style={{ width:15, height:15, accentColor:'#1A3C2E' }}/>
              <div>
                <div style={{ fontWeight:700, color:form.urgent_mode?'#1A3C2E':'#111', fontSize:'0.85rem' }}>⚡ Badge "Disponible maintenant" sur la marketplace</div>
                <div style={{ fontSize:'0.7rem', color:'#6B7280' }}>Votre pièce est prête · Expédition possible dans la journée</div>
              </div>
            </label>
          </section>

          <button onClick={handlePublish} disabled={publishMutation.isLoading || !canPublish}
            style={{ background:!canPublish||publishMutation.isLoading?'#E5E7EB':'#1A3C2E', color:!canPublish||publishMutation.isLoading?'#6B7280':'#fff', border:'none', padding:'1rem', borderRadius:100, fontWeight:700, fontSize:'1rem', cursor:!canPublish||publishMutation.isLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {publishMutation.isLoading ? '⏳ Publication en cours...' : '🚗 Publier sur la marketplace auto'}
          </button>
        </div>

        {/* Aperçu live */}
        <div style={{ position:'sticky', top:85 }}>
          <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.7rem' }}>
            Aperçu marketplace
          </div>
          <PreviewCard form={form} images={images}/>
          <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:12, padding:'0.75rem 0.9rem', marginTop:'1rem', fontSize:'0.75rem', color:'#065F46', lineHeight:1.6 }}>
            ✅ <strong>Uniquement</strong> visible sur /pieces-auto<br/>
            🏭 <strong>Pas</strong> dans le catalogue PDR B2B<br/>
            👁 Visible dès la publication
          </div>
        </div>
      </div>
    </div>
  );
}
