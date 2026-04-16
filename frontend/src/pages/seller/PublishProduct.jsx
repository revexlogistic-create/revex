// src/pages/seller/PublishProduct.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const C = { forest: '#1E3D0F', leaf: '#4A7C2F', cream: '#F6F1E7', beige: '#EDE6D3', beigemid: '#D9CEBC', white: '#FDFAF4', muted: '#5C5C50', eco: '#27AE60', urgent:'#C0392B' };

export default function PublishProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', category_id: '', reference: '', brand: '', model: '',
    description: '', condition: 'new', quality_grade: 'A',
    quantity: 1, unit: 'unité', price: '', negotiable: true, price_on_request: false,
    weight_kg: '', location_city: '', location_region: '',
    delivery_type: 'both', eco_delivery_price: '', urgent_delivery_price: '',
    delivery_days_eco: 5, delivery_days_urgent: 2,
    dormant_since: '', tags: '', specifications: '',
    warranty_months: 0, sla_available: false, urgent_mode: false, is_auto: false,
    vehicle_make: '', vehicle_model: '', vehicle_year: '',
    status: 'active', images: []
  });

  const { data: catsData } = useQuery('categories', () => api.get('/categories').then(r => r.data));
  const { data: existingData } = useQuery(['product-edit', id], () => api.get(`/products/${id}`).then(r => r.data), { enabled: isEdit });
  const { data: tokenData }   = useQuery('my-tokens', () => api.get('/tokens/me').then(r => r.data), { staleTime: 15000 });
  const tokenBalance = tokenData?.balance ?? 0;
  const COST_PUBLISH = tokenData?.costs?.publish_product || 5;

  useEffect(() => {
    if (existingData?.product) {
      const p = existingData.product;
      setForm(f => ({ ...f, ...p, tags: Array.isArray(p.tags) ? p.tags.join(', ') : '', specifications: typeof p.specifications === 'object' ? JSON.stringify(p.specifications, null, 2) : p.specifications || '' }));
    }
  }, [existingData]);

  const mutation = useMutation(
    (data) => isEdit ? api.put(`/products/${id}`, data) : api.post('/products', data),
    {
      onSuccess: () => { toast.success(isEdit ? 'Produit mis à jour !' : 'Produit publié !'); navigate('/seller/produits'); },
      onError: (e) => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  const uploadMutation = useMutation(
    (files) => { const fd = new FormData(); files.forEach(f => fd.append('images', f)); return api.post('/upload/images?type=products', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    { onSuccess: (res) => { setForm(f => ({ ...f, images: [...f.images, ...res.data.urls] })); toast.success('Images uploadées'); } }
  );

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try { payload.specifications = form.specifications ? JSON.parse(form.specifications) : {}; } catch { payload.specifications = {}; }
    mutation.mutate(payload);
  };

  const suggestPrice = async () => {
    if (!form.category_id || !form.condition) return;
    try {
      const { data } = await api.post('/analysis/price-suggestion', { category_id: form.category_id, condition: form.condition, product_id: id || undefined });
      if (data.suggested_price) { setForm(f => ({ ...f, price: data.suggested_price })); toast.info(`💡 Prix suggéré : ${data.suggested_price} MAD (confiance: ${Math.round(data.confidence * 100)}%)`); }
      else toast.info('Pas assez de données pour suggérer un prix');
    } catch {}
  };

  const s = (k, type = 'text') => ({ value: form[k] ?? '', onChange: set(k), type, style: inp });

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', color: C.forest, marginBottom: '0.3rem' }}>
            {isEdit ? '✏️ Modifier le PDR' : '📦 Publier un PDR'}
          </h1>
          <p style={{ color: C.muted }}>Étapes 4-6 du processus REVEX : Fiche technique, classification qualité, Trust Score</p>
        </div>
        {!isEdit && (
          <Link to="/tokens" style={{ display:'flex', alignItems:'center', gap:6, background: tokenBalance < COST_PUBLISH ? '#FDECEA' : '#E8F8EE', border:`1.5px solid ${tokenBalance < COST_PUBLISH ? C.urgent : C.eco}55`, borderRadius:100, padding:'0.45rem 1rem', textDecoration:'none', fontSize:'0.85rem', fontWeight:700, color: tokenBalance < COST_PUBLISH ? C.urgent : C.leaf }}>
            🪙 {tokenBalance} jetons {tokenBalance < COST_PUBLISH && '— Recharger'}
          </Link>
        )}
      </div>

      {/* Alerte jetons insuffisants */}
      {!isEdit && tokenBalance < COST_PUBLISH && (
        <div style={{ background:'#FDECEA', border:'1.5px solid '+C.urgent, borderRadius:12, padding:'0.9rem 1.2rem', marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
          <div style={{ fontSize:'0.85rem', color:C.urgent, fontWeight:600 }}>
            🪙 Publication coûte {COST_PUBLISH} jetons — Solde insuffisant ({tokenBalance}/{COST_PUBLISH})
          </div>
          <Link to="/tokens" style={{ background:C.urgent, color:'#fff', padding:'0.45rem 1rem', borderRadius:100, textDecoration:'none', fontSize:'0.8rem', fontWeight:700 }}>Recharger →</Link>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1 : Identification */}
        <div style={section}>
          <h3 style={secTitle}>📋 Identification de la pièce</h3>
          <div style={grid2}>
            <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Titre de l'annonce *</label><input {...s('title')} required placeholder="Ex: Moteur électrique Siemens 15kW - Neuf en stock" /></div>
            <div><label style={lbl}>Catégorie *</label>
              <select value={form.category_id} onChange={set('category_id')} required style={inp}>
                <option value="">Sélectionner...</option>
                {(catsData?.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Référence fabricant</label><input {...s('reference')} placeholder="REF-ME15-073" /></div>
            <div><label style={lbl}>Marque</label><input {...s('brand')} placeholder="Siemens" /></div>
            <div><label style={lbl}>Modèle</label><input {...s('model')} placeholder="1LA7163-4AA60" /></div>
          </div>
          <div style={{ marginTop: '0.8rem' }}><label style={lbl}>Description détaillée</label><textarea value={form.description} onChange={set('description')} rows={4} placeholder="Décrivez l'état, l'historique, la raison de disponibilité..." style={{ ...inp, resize: 'vertical' }} /></div>
          <div style={{ marginTop: '0.8rem' }}><label style={lbl}>Spécifications techniques (JSON)</label><textarea value={form.specifications} onChange={set('specifications')} rows={4} placeholder={'{\n  "puissance": "15 kW",\n  "tension": "380V"\n}'} style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }} /></div>
        </div>

        {/* Section 2 : Qualité */}
        <div style={section}>
          <h3 style={secTitle}>🏆 Classification qualité (Étape 5 REVEX)</h3>
          <div style={grid2}>
            <div>
              <label style={lbl}>État physique *</label>
              <select value={form.condition} onChange={set('condition')} style={inp}>
                <option value="new">Neuf</option><option value="good">Bon état</option><option value="used">Usagé</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Grade qualité REVEX *</label>
              <select value={form.quality_grade} onChange={set('quality_grade')} style={inp}>
                <option value="A+">A+ — Neuf certifié REVEX</option>
                <option value="A">A — Neuf non certifié</option>
                <option value="B">B — Bon état révisé</option>
                <option value="C">C — Usagé fonctionnel</option>
                <option value="D">D — Pour pièces</option>
              </select>
            </div>
            <div><label style={lbl}>Garantie (mois)</label><input {...s('warranty_months', 'number')} min={0} /></div>
            <div><label style={lbl}>Dormant depuis</label><input {...s('dormant_since', 'date')} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {/* Catégorie marketplace */}
            <div style={{ gridColumn:'1/-1', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'0.9rem 1.1rem', marginBottom:'0.2rem' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'0.8rem', cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_auto} onChange={e => setForm(f => ({ ...f, is_auto: e.target.checked }))} style={{ width:16, height:16, accentColor:'#DC2626' }}/>
                <div>
                  <div style={{ fontWeight:700, color:'#DC2626', fontSize:'0.88rem' }}>🚗 Pièce Automobile — Marketplace Particuliers</div>
                  <div style={{ fontSize:'0.72rem', color:'#9B1C1C', marginTop:2 }}>
                    Ce produit apparaîtra dans la section "Pièces Auto" pour les acheteurs particuliers (pas dans le catalogue PDR industriel)
                  </div>
                </div>
              </label>
              {form.is_auto && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.6rem', marginTop:'0.8rem' }}>
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#DC2626', display:'block', marginBottom:'0.2rem' }}>Marque véhicule</label>
                    <input value={form.vehicle_make} onChange={e => setForm(f=>({...f, vehicle_make:e.target.value}))}
                      placeholder="Ex: Renault, Toyota..." style={{ ...inp, borderColor:'#FECACA' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#DC2626', display:'block', marginBottom:'0.2rem' }}>Modèle</label>
                    <input value={form.vehicle_model} onChange={e => setForm(f=>({...f, vehicle_model:e.target.value}))}
                      placeholder="Ex: Clio, Corolla..." style={{ ...inp, borderColor:'#FECACA' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#DC2626', display:'block', marginBottom:'0.2rem' }}>Année</label>
                    <input type="number" value={form.vehicle_year} onChange={e => setForm(f=>({...f, vehicle_year:e.target.value}))}
                      placeholder="Ex: 2018" min="1990" max="2025" style={{ ...inp, borderColor:'#FECACA' }}/>
                  </div>
                </div>
              )}
            </div>

            {[['urgent_mode', '⚡ Mode urgence maintenance'], ['sla_available', '📋 SLA industriel disponible']].map(([k, l]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', color: C.forest }}>
                <input type="checkbox" checked={!!form[k]} onChange={set(k)} /> {l}
              </label>
            ))}
          </div>
        </div>

        {/* Section 3 : Prix & Stock */}
        <div style={section}>
          <h3 style={secTitle}>💰 Prix et stock</h3>
          <div style={grid2}>
            <div>
              <label style={lbl}>Prix unitaire HT (MAD) *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input {...s('price', 'number')} required min={0} style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={suggestPrice} style={{ background: C.eco, color: '#fff', border: 'none', padding: '0 1rem', borderRadius: 10, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>💡 Suggérer</button>
              </div>
            </div>
            <div><label style={lbl}>Quantité disponible *</label><input {...s('quantity', 'number')} required min={1} /></div>
            <div><label style={lbl}>Unité</label><select value={form.unit} onChange={set('unit')} style={inp}><option>unité</option><option>lot</option><option>kg</option><option>mètre</option><option>litre</option></select></div>
            <div><label style={lbl}>Poids (kg)</label><input {...s('weight_kg', 'number')} min={0} step="0.1" /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', color: C.forest }}>
              <input type="checkbox" checked={form.negotiable} onChange={set('negotiable')} /> Prix négociable
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', color: C.forest }}>
              <input type="checkbox" checked={form.price_on_request} onChange={set('price_on_request')} /> Prix sur demande
            </label>
          </div>
        </div>

        {/* Section 4 : Logistique */}
        <div style={section}>
          <h3 style={secTitle}>🚛 Logistique & Livraison</h3>
          <div style={grid2}>
            <div><label style={lbl}>Ville *</label><input {...s('location_city')} required placeholder="Casablanca" /></div>
            <div><label style={lbl}>Région</label><input {...s('location_region')} placeholder="Grand Casablanca" /></div>
            <div><label style={lbl}>Mode livraison</label>
              <select value={form.delivery_type} onChange={set('delivery_type')} style={inp}>
                <option value="both">🌿 Éco + ⚡ Urgente</option>
                <option value="eco">🌿 Économique seulement</option>
                <option value="urgent">⚡ Urgente seulement</option>
              </select>
            </div>
            <div />
            {(form.delivery_type === 'both' || form.delivery_type === 'eco') && <>
              <div><label style={lbl}>Prix livraison éco (MAD)</label><input {...s('eco_delivery_price', 'number')} min={0} /></div>
              <div><label style={lbl}>Délai éco (jours)</label><input {...s('delivery_days_eco', 'number')} min={1} /></div>
            </>}
            {(form.delivery_type === 'both' || form.delivery_type === 'urgent') && <>
              <div><label style={lbl}>Prix livraison urgente (MAD)</label><input {...s('urgent_delivery_price', 'number')} min={0} /></div>
              <div><label style={lbl}>Délai urgent (heures)</label><input {...s('delivery_days_urgent', 'number')} min={1} /></div>
            </>}
          </div>
        </div>

        {/* Section 5 : Images */}
        <div style={section}>
          <h3 style={secTitle}>📸 Photos de la pièce</h3>
          <input type="file" accept="image/*" multiple id="img-upload" style={{ display: 'none' }} onChange={e => uploadMutation.mutate(Array.from(e.target.files))} />
          <label htmlFor="img-upload" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: `2px dashed ${C.beigemid}`, borderRadius: 14, padding: '2rem', cursor: 'pointer', background: C.cream, fontSize: '0.9rem', color: C.muted, transition: 'border-color 0.2s' }}>
            📁 Cliquer pour ajouter des photos (max 5, 5MB chacune)
          </label>
          {form.images?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
              {form.images.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.beigemid}` }} onError={e => e.target.style.display = 'none'} />
                  <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} style={{ position: 'absolute', top: -6, right: -6, background: '#C0392B', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <label style={lbl}>Tags (séparés par virgules)</label>
            <input {...s('tags')} placeholder="moteur, siemens, 15kw, neuf" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems:'center', flexWrap:'wrap' }}>
          {!isEdit && (
            <div style={{ fontSize:'0.8rem', color:C.muted }}>
              Coût : 🪙 {COST_PUBLISH} jetons — Solde : {tokenBalance}
            </div>
          )}
          <button type="button" onClick={() => setForm(f => ({ ...f, status: 'draft' }))} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.beigemid}`, padding: '0.85rem 1.8rem', borderRadius: 100, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sauvegarder brouillon</button>
          <button type="submit" disabled={mutation.isLoading || (!isEdit && tokenBalance < COST_PUBLISH)}
            style={{ background: (!isEdit && tokenBalance < COST_PUBLISH) ? C.muted : C.forest, color: C.cream, border: 'none', padding: '0.85rem 2.5rem', borderRadius: 100, fontWeight: 600, cursor: (mutation.isLoading || (!isEdit && tokenBalance < COST_PUBLISH)) ? 'not-allowed' : 'pointer', opacity: mutation.isLoading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {mutation.isLoading ? 'Publication...'
              : isEdit ? '✅ Mettre à jour'
              : tokenBalance < COST_PUBLISH ? `🪙 Insuffisant (${tokenBalance}/${COST_PUBLISH})`
              : `🚀 Publier — 🪙 ${COST_PUBLISH} jetons`}
          </button>
        </div>
      </form>
    </div>
  );
}

const section = { background: '#FDFAF4', border: '1px solid #D9CEBC', borderRadius: 18, padding: '1.8rem', marginBottom: '1.5rem' };
const secTitle = { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#1E3D0F', marginBottom: '1.2rem' };
const lbl = { fontSize: '0.78rem', fontWeight: 600, color: '#1E3D0F', display: 'block', marginBottom: '0.3rem' };
const inp = { width: '100%', padding: '0.65rem 0.9rem', border: '1.5px solid #D9CEBC', borderRadius: 10, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' };
