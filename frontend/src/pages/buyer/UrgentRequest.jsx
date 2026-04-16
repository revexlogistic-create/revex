// src/pages/buyer/UrgentRequest.jsx
// Demande urgente PDR — Acheteur B2B

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9',
};

const URGENCY = {
  critical: { label:'🔴 Critique — Arrêt de production',  hours:8,  color:C.urgent,  bg:'#FDECEA' },
  high:     { label:'🟠 Haute — Impact fort',             hours:24, color:C.orange,  bg:'#FEF5E7' },
  medium:   { label:'🟡 Moyenne — Planifiable',           hours:72, color:'#D4A017', bg:'#FFFBEB' },
};

const SECTORS = ['Chimie & Pétrochimie','Mines & Carrières','Ciment & BTP','Agroalimentaire','Sidérurgie','Énergie & Utilities','Automobile','Textile','Pharma','Autre'];

const fmt = n => Number(n||0).toLocaleString('fr-MA');
const fmtDate = d => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

export default function UrgentRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [matches, setMatches] = useState([]);
  const [submittedReq, setSubmittedReq] = useState(null);

  const [form, setForm] = useState({
    part_reference:    '',
    part_description:  '',
    equipment_model:   '',
    equipment_brand:   '',
    sector:            user?.sector || SECTORS[0],
    urgency_level:     'high',
    max_delivery_hours:24,
    max_budget:        '',
    location_city:     user?.city || '',
    location_region:   '',
    quantity:          1,
    unit:              'unité',
    notes:             '',
    accept_alternative:true,
    contact_phone:     user?.phone || '',
  });

  const setf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Mes demandes ─────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery(
    'my-urgent-requests',
    () => api.get('/analysis/urgent').then(r => r.data).catch(() => ({ requests:[] })),
    { staleTime: 30000 }
  );
  const requests = data?.requests || [];

  // ── Mutation création ─────────────────────────────────────────
  const createMutation = useMutation(
    (payload) => api.post('/analysis/urgent', payload),
    {
      onSuccess: (res) => {
        qc.invalidateQueries('my-urgent-requests');
        qc.invalidateQueries('buyer-urgent');
        setMatches(res.data.matches || []);
        setSubmittedReq(res.data.request);
        setStep(3);
        toast.success('⚡ Demande urgente envoyée ! Notification aux vendeurs actifs.');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur lors de l\'envoi'),
    }
  );

  // ── Mutation devis vers un vendeur ────────────────────────────
  const quoteMutation = useMutation(
    ({ seller_id, product_id, message }) =>
      api.post('/quotes', { seller_id, product_id, message, urgent: true }),
    {
      onSuccess: (res) => {
        toast.success('💬 Demande de devis envoyée !');
        qc.invalidateQueries('buyer-quotes-all');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur devis'),
    }
  );

  // ── Mutation commande directe ─────────────────────────────────
  const orderMutation = useMutation(
    ({ product_id, qty }) => api.post('/orders', {
      product_id, quantity: qty || 1,
      delivery_mode: 'urgent',
      notes: 'Commande urgente — ' + form.part_description,
    }),
    {
      onSuccess: (res) => {
        toast.success('✅ Commande urgente créée !');
        navigate('/buyer/commandes');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur commande'),
    }
  );

  const handleSubmit = () => {
    if (!form.part_description || !form.location_city) {
      toast.error('Description et ville sont obligatoires');
      return;
    }
    createMutation.mutate({
      part_reference:    form.part_reference || null,
      part_description:  form.part_description,
      equipment_model:   form.equipment_model || null,
      urgency_level:     form.urgency_level,
      max_delivery_hours:Number(form.max_delivery_hours),
      max_budget:        form.max_budget ? Number(form.max_budget) : null,
      location_city:     form.location_city,
      location_region:   form.location_region || null,
      quantity:          Number(form.quantity) || 1,
      unit:              form.unit,
      notes:             form.notes || null,
      accept_alternative:form.accept_alternative,
      contact_phone:     form.contact_phone || null,
    });
  };

  const urgInfo = URGENCY[form.urgency_level] || URGENCY.high;

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#7B1113,#C0392B)', padding:'2rem 2rem 1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.1)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:80, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <Link to="/buyer" style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', textDecoration:'none', display:'inline-block', marginBottom:'0.7rem' }}>
                ← Mon espace acheteur
              </Link>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', fontWeight:700, color:'#FFF', margin:0, lineHeight:1.1 }}>
                ⚡ Demande PDR Urgente
              </h1>
              <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.88rem', marginTop:'0.4rem' }}>
                Besoin immédiat · Notification à tous les vendeurs actifs · Réponse sous 2h
              </p>
            </div>
            <button onClick={() => { setShowForm(!showForm); setStep(1); }}
              style={{ background:showForm?'rgba(255,255,255,0.15)':'#fff', color:showForm?'#fff':C.urgent, border:'2px solid rgba(255,255,255,0.4)', padding:'0.75rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.92rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
              {showForm ? '✕ Fermer' : '⚡ Nouvelle demande'}
            </button>
          </div>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.7rem', marginTop:'1.5rem' }}>
            {[
              { icon:'📋', label:'Mes demandes',   value:requests.length,                                                 color:'#fff' },
              { icon:'🔴', label:'Critiques',      value:requests.filter(r=>r.urgency_level==='critical').length,         color:'#FCA5A5' },
              { icon:'✅', label:'Satisfaites',    value:requests.filter(r=>r.status==='fulfilled').length,               color:'#6EE7B7' },
              { icon:'⏳', label:'En attente',     value:requests.filter(r=>r.status==='open').length,                    color:'#FCD34D' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, padding:'0.8rem', textAlign:'center' }}>
                <div style={{ fontSize:'1.1rem', marginBottom:'0.25rem' }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)', marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

        {/* ── FORMULAIRE ── */}
        {showForm && step < 3 && (
          <div style={{ background:C.white, borderRadius:20, border:'2px solid '+C.urgent+'44', overflow:'hidden', marginBottom:'2rem', boxShadow:'0 4px 20px rgba(192,57,43,0.1)' }}>

            {/* Barre de progression */}
            <div style={{ background:'linear-gradient(135deg,#7B1113,#C0392B)', padding:'1.2rem 1.8rem', display:'flex', gap:'0', alignItems:'center' }}>
              {[['1','Pièce','📦'],['2','Urgence','⚡']].map(([n,l,ic], i) => {
                const active = step === i+1;
                const done = step > i+1;
                return (
                  <React.Fragment key={n}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:done?C.eco:active?'#fff':'rgba(255,255,255,0.2)', border:'2px solid '+(done?C.eco:active?'#fff':'rgba(255,255,255,0.4)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', color:done||active?C.urgent:'rgba(255,255,255,0.6)', fontWeight:700 }}>
                        {done?'✓':n}
                      </div>
                      <div style={{ fontSize:'0.65rem', color:active?'#fff':'rgba(255,255,255,0.5)', fontWeight:active?700:400 }}>{ic} {l}</div>
                    </div>
                    {i < 1 && <div style={{ flex:1, height:2, background:done?C.eco:'rgba(255,255,255,0.2)', margin:'0 8px', marginBottom:20 }}/>}
                  </React.Fragment>
                );
              })}
            </div>

            <div style={{ padding:'1.8rem' }}>

              {/* ── ÉTAPE 1 : Description de la pièce ── */}
              {step === 1 && (
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'1.2rem' }}>
                    📦 Identifier la pièce recherchée
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>

                    {/* Description */}
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>Description de la pièce * <span style={{ color:C.urgent, fontWeight:400 }}>(obligatoire)</span></label>
                      <textarea value={form.part_description} onChange={e => setf('part_description', e.target.value)} rows={3}
                        placeholder="Ex: Pompe centrifuge INOX DN80 PN16, joint mécanique torique, filtre à cartouche 10 microns..."
                        style={{ ...inp, resize:'vertical' }}/>
                    </div>

                    <div>
                      <label style={lbl}>Référence constructeur</label>
                      <input value={form.part_reference} onChange={e => setf('part_reference', e.target.value)}
                        placeholder="Ex: SKF-6205-2RS, 3M-1234-A..."
                        style={inp}/>
                    </div>

                    <div>
                      <label style={lbl}>Quantité demandée</label>
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        <input type="number" value={form.quantity} onChange={e => setf('quantity', e.target.value)} min="1"
                          style={{ ...inp, width:80, flex:'none' }}/>
                        <select value={form.unit} onChange={e => setf('unit', e.target.value)} style={inp}>
                          {['unité','lot','paire','kit','mètre','kg','litre','m²','m³'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>Modèle d'équipement</label>
                      <input value={form.equipment_model} onChange={e => setf('equipment_model', e.target.value)}
                        placeholder="Ex: Pompe Atlas Copco GA55, Compresseur..."
                        style={inp}/>
                    </div>

                    <div>
                      <label style={lbl}>Marque / Fabricant</label>
                      <input value={form.equipment_brand} onChange={e => setf('equipment_brand', e.target.value)}
                        placeholder="Ex: SKF, Siemens, ABB, Schneider..."
                        style={inp}/>
                    </div>

                    <div>
                      <label style={lbl}>Secteur industriel</label>
                      <select value={form.sector} onChange={e => setf('sector', e.target.value)} style={inp}>
                        {SECTORS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={lbl}>Ville *</label>
                      <input value={form.location_city} onChange={e => setf('location_city', e.target.value)}
                        placeholder="Ex: Jorf Lasfar, Casablanca, Marrakech..."
                        style={inp}/>
                    </div>

                    <div>
                      <label style={lbl}>Budget maximum (MAD)</label>
                      <input type="number" value={form.max_budget} onChange={e => setf('max_budget', e.target.value)}
                        placeholder="Ex: 15000"
                        style={inp} min="0"/>
                    </div>

                    <div>
                      <label style={lbl}>Téléphone de contact</label>
                      <input type="tel" value={form.contact_phone} onChange={e => setf('contact_phone', e.target.value)}
                        placeholder="+212 6XX XXX XXX"
                        style={inp}/>
                    </div>

                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>Notes supplémentaires</label>
                      <textarea value={form.notes} onChange={e => setf('notes', e.target.value)} rows={2}
                        placeholder="Condition acceptable (neuf/occasion), dimensions spécifiques, contraintes techniques..."
                        style={{ ...inp, resize:'vertical' }}/>
                    </div>

                    {/* Accepter alternatives */}
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:'0.7rem', cursor:'pointer', background:form.accept_alternative?'#ECFDF5':'#F9FAFB', border:'1px solid '+(form.accept_alternative?C.eco:C.mid), borderRadius:12, padding:'0.7rem 1rem', transition:'all 0.15s' }}>
                        <input type="checkbox" checked={form.accept_alternative} onChange={e => setf('accept_alternative', e.target.checked)} style={{ accentColor:C.eco, width:16, height:16 }}/>
                        <div>
                          <div style={{ fontWeight:600, color:C.forest, fontSize:'0.85rem' }}>✅ Accepter les équivalences et alternatives</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted }}>Les vendeurs pourront proposer des pièces de marques différentes mais compatibles</div>
                        </div>
                      </label>
                    </div>

                  </div>

                  <div style={{ marginTop:'1.5rem', display:'flex', justifyContent:'flex-end' }}>
                    <button onClick={() => {
                        if (!form.part_description || !form.location_city) { toast.error('Description et ville obligatoires'); return; }
                        setStep(2);
                      }}
                      style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.8rem 2rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      Suivant → Niveau d'urgence
                    </button>
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 2 : Urgence & délai ── */}
              {step === 2 && (
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'1.2rem' }}>
                    ⚡ Niveau d'urgence et délai acceptable
                  </div>

                  {/* Sélection urgence */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1.5rem' }}>
                    {Object.entries(URGENCY).map(([k, v]) => (
                      <label key={k} onClick={() => { setf('urgency_level', k); setf('max_delivery_hours', v.hours); }}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', background:form.urgency_level===k?v.bg:C.white, border:'2px solid '+(form.urgency_level===k?v.color:C.mid), borderRadius:14, padding:'1rem 1.2rem', cursor:'pointer', transition:'all 0.15s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                          <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid '+(form.urgency_level===k?v.color:C.mid), background:form.urgency_level===k?v.color:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {form.urgency_level===k && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, color:v.color, fontSize:'0.95rem' }}>{v.label}</div>
                            <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:2 }}>Délai maximum : {v.hours}h · Notifications prioritaires aux vendeurs locaux</div>
                          </div>
                        </div>
                        <div style={{ background:v.color+'22', color:v.color, borderRadius:100, padding:'0.25rem 0.75rem', fontSize:'0.8rem', fontWeight:700, flexShrink:0 }}>
                          {v.hours}h max
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Délai personnalisé */}
                  <div style={{ background:C.beige, borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1.5rem' }}>
                    <label style={lbl}>Ou saisir un délai précis (heures)</label>
                    <input type="number" value={form.max_delivery_hours} onChange={e => setf('max_delivery_hours', e.target.value)}
                      min="2" max="720" placeholder="Ex: 48"
                      style={{ ...inp, maxWidth:180 }}/>
                  </div>

                  {/* Récap */}
                  <div style={{ background:'linear-gradient(135deg,#7B1113,#C0392B)', borderRadius:14, padding:'1.2rem 1.5rem', marginBottom:'1.5rem' }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', color:'#fff', fontWeight:700, marginBottom:'0.8rem' }}>
                      📋 Récapitulatif de votre demande
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', fontSize:'0.78rem' }}>
                      {[
                        ['🔧 Pièce', form.part_description?.substring(0,40)+'...'],
                        ['📍 Ville', form.location_city || '—'],
                        ['📦 Qté', form.quantity+' '+form.unit],
                        ['🔖 Réf.', form.part_reference || 'Non précisée'],
                        ['⚡ Urgence', urgInfo.label?.split('—')[0]],
                        ['⏱ Délai max', form.max_delivery_hours+'h'],
                        ['💰 Budget max', form.max_budget ? fmt(form.max_budget)+' MAD' : 'Non précisé'],
                        ['✅ Équivalences', form.accept_alternative ? 'Acceptées' : 'Refusées'],
                      ].map(([k,v]) => (
                        <div key={k} style={{ background:'rgba(255,255,255,0.08)', borderRadius:8, padding:'0.4rem 0.6rem' }}>
                          <div style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.65rem', marginBottom:2 }}>{k}</div>
                          <div style={{ color:'#FFF', fontWeight:600, fontSize:'0.78rem' }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Infos sur la diffusion */}
                  <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:12, padding:'0.9rem 1.1rem', marginBottom:'1.5rem', fontSize:'0.82rem', color:'#92400E' }}>
                    <strong>📡 Votre demande sera diffusée à :</strong><br/>
                    • Tous les vendeurs avec mode urgent activé<br/>
                    • Les vendeurs de votre secteur ({form.sector})<br/>
                    • Les vendeurs situés dans votre région ({form.location_city})<br/>
                    • <strong>Coût : 5 jetons</strong> — réponse attendue sous {form.max_delivery_hours}h
                  </div>

                  <div style={{ display:'flex', gap:'0.7rem' }}>
                    <button onClick={() => setStep(1)}
                      style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.8rem 1.5rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      ← Retour
                    </button>
                    <button onClick={handleSubmit} disabled={createMutation.isLoading}
                      style={{ flex:1, background:createMutation.isLoading?C.muted:C.urgent, color:'#fff', border:'none', padding:'0.8rem 2rem', borderRadius:100, fontWeight:700, fontSize:'0.92rem', cursor:createMutation.isLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      {createMutation.isLoading ? '⏳ Envoi en cours...' : '⚡ Envoyer la demande urgente'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : RÉSULTATS & ACTIONS ── */}
        {showForm && step === 3 && (
          <div style={{ marginBottom:'2rem' }}>
            <div style={{ background:C.white, border:'2px solid '+C.eco, borderRadius:20, padding:'1.8rem', marginBottom:'1.5rem', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.7rem' }}>✅</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:C.forest }}>
                Demande envoyée avec succès !
              </div>
              <div style={{ color:C.muted, fontSize:'0.88rem', marginTop:'0.4rem' }}>
                Référence : <strong>{submittedReq?.id?.substring(0,8).toUpperCase()}</strong> · Expire dans 7 jours · Notifications envoyées aux vendeurs
              </div>
            </div>

            {/* Matches trouvés */}
            {matches.length > 0 && (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'1rem' }}>
                  🎯 {matches.length} produit(s) correspondant(s) trouvé(s)
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1.5rem' }}>
                  {matches.map(m => (
                    <div key={m.id} style={{ background:C.white, border:'1.5px solid '+C.mid, borderRadius:14, padding:'1rem 1.3rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                      <div>
                        <div style={{ fontWeight:700, color:C.forest, fontSize:'0.92rem', marginBottom:3 }}>{m.title}</div>
                        <div style={{ fontSize:'0.75rem', color:C.muted }}>
                          🏭 {m.company_name}
                          {m.delivery_days_urgent && ' · ⚡ '+m.delivery_days_urgent+'h livraison'}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', flexWrap:'wrap' }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.leaf }}>{fmt(m.price)} MAD</div>
                          {m.urgent_delivery_price && <div style={{ fontSize:'0.72rem', color:C.urgent }}>+{fmt(m.urgent_delivery_price)} livraison urgente</div>}
                        </div>
                        <div style={{ display:'flex', gap:'0.5rem' }}>
                          <button onClick={() => orderMutation.mutate({ product_id:m.id, qty:form.quantity })}
                            disabled={orderMutation.isLoading}
                            style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.45rem 1rem', borderRadius:100, fontWeight:700, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                            ⚡ Commander
                          </button>
                          <button onClick={() => quoteMutation.mutate({ seller_id:m.seller_id, product_id:m.id, message:'Demande urgente : '+form.part_description+' — Délai max : '+form.max_delivery_hours+'h' })}
                            style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.45rem 0.9rem', borderRadius:100, fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            💬 Devis
                          </button>
                          <Link to={'/produit/'+m.slug}
                            style={{ background:'#EFF6FF', color:C.blue, border:'1px solid #BFDBFE', padding:'0.45rem 0.9rem', borderRadius:100, fontWeight:600, fontSize:'0.8rem', textDecoration:'none', whiteSpace:'nowrap' }}>
                            👁 Voir
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matches.length === 0 && (
              <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:14, padding:'1.2rem 1.5rem', marginBottom:'1.5rem' }}>
                <div style={{ fontWeight:700, color:'#92400E', marginBottom:'0.4rem' }}>⏳ Aucune correspondance immédiate</div>
                <div style={{ fontSize:'0.83rem', color:'#92400E' }}>
                  Votre demande a été diffusée. Les vendeurs vous contacteront directement. En attendant, vous pouvez chercher manuellement dans le catalogue.
                </div>
                <Link to={'/catalogue?search='+encodeURIComponent(form.part_description)}
                  style={{ display:'inline-block', marginTop:'0.8rem', background:C.forest, color:C.cream, textDecoration:'none', padding:'0.6rem 1.3rem', borderRadius:100, fontWeight:700, fontSize:'0.82rem' }}>
                  🔍 Chercher dans le catalogue →
                </Link>
              </div>
            )}

            <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
              <button onClick={() => { setShowForm(false); setStep(1); setMatches([]); setSubmittedReq(null); refetch(); }}
                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                ✅ Fermer
              </button>
              <Link to="/catalogue"
                style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:600, textDecoration:'none' }}>
                📦 Parcourir le catalogue
              </Link>
              <Link to="/buyer/commandes"
                style={{ background:'#EFF6FF', color:C.blue, border:'1px solid #BFDBFE', padding:'0.7rem 1.3rem', borderRadius:100, fontWeight:600, textDecoration:'none' }}>
                🛒 Mes commandes
              </Link>
            </div>
          </div>
        )}

        {/* ── MES DEMANDES URGENTES ── */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.forest, margin:0 }}>
              📋 Mes demandes urgentes
            </h2>
            {requests.length === 0 && !showForm && (
              <button onClick={() => setShowForm(true)}
                style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.55rem 1.2rem', borderRadius:100, fontWeight:700, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                + Première demande
              </button>
            )}
          </div>

          {isLoading && <div style={{ textAlign:'center', padding:'2rem', color:C.muted }}>Chargement...</div>}

          {!isLoading && requests.length === 0 && (
            <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'2px dashed '+C.mid }}>
              <div style={{ fontSize:'4rem', opacity:0.15, marginBottom:'0.7rem' }}>⚡</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.forest, marginBottom:'0.4rem' }}>
                Aucune demande urgente
              </div>
              <div style={{ fontSize:'0.85rem', color:C.muted, marginBottom:'1.2rem' }}>
                En cas d'arrêt de production ou besoin critique, alertez instantanément tous les vendeurs.
              </div>
              <button onClick={() => setShowForm(true)}
                style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.75rem 2rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                ⚡ Créer une demande urgente
              </button>
            </div>
          )}

          {!isLoading && requests.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {requests.map(r => {
                const urg = URGENCY[r.urgency_level] || URGENCY.high;
                const isExpired = new Date(r.expires_at) < new Date();
                const st = isExpired ? { label:'⏰ Expirée', color:C.muted, bg:C.beige }
                  : r.status === 'fulfilled' ? { label:'✅ Satisfaite', color:C.eco, bg:'#ECFDF5' }
                  : r.status === 'open' ? { label:'📡 En recherche', color:urg.color, bg:urg.bg }
                  : { label:'🔄 '+r.status, color:C.muted, bg:C.beige };

                return (
                  <div key={r.id} style={{ background:C.white, border:'1.5px solid '+(r.urgency_level==='critical'&&r.status==='open'?C.urgent:C.mid), borderRadius:16, overflow:'hidden', boxShadow:'0 2px 8px rgba(30,61,15,0.05)' }}>

                    <div style={{ padding:'0.9rem 1.4rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.7rem', background:r.urgency_level==='critical'&&r.status==='open'?'#FFF5F5':C.white }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:3 }}>
                          <span style={{ background:urg.bg, color:urg.color, fontSize:'0.68rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100 }}>
                            {urg.label?.split('—')[0].trim()}
                          </span>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontFamily:"'DM Sans',sans-serif", fontSize:'0.7rem', color:C.muted, fontFamily:'monospace' }}>#{r.id?.substring(0,8).toUpperCase()}</span>
                        </div>
                        <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem', marginBottom:3 }}>
                          {r.part_description?.substring(0,70)}{r.part_description?.length > 70 ? '...' : ''}
                        </div>
                        <div style={{ fontSize:'0.72rem', color:C.muted }}>
                          {r.part_reference && '🔖 '+r.part_reference+' · '}
                          📍 {r.location_city}
                          {' · ⏱ '+r.max_delivery_hours+'h max'}
                          {r.max_budget && ' · 💰 max '+fmt(r.max_budget)+' MAD'}
                          {' · 📅 '+fmtDate(r.created_at)}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', flexWrap:'wrap' }}>
                        <span style={{ background:st.bg, color:st.color, padding:'0.25rem 0.75rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700 }}>
                          {st.label}
                        </span>
                        <Link to={'/catalogue?search='+encodeURIComponent(r.part_reference || r.part_description?.split(' ').slice(0,3).join(' '))}
                          style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.3rem 0.7rem', borderRadius:100, fontSize:'0.75rem', textDecoration:'none', fontWeight:600 }}>
                          🔍 Chercher
                        </Link>
                      </div>
                    </div>

                  <UrgentResponsesList requestId={r.id} user={user} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── LIENS RAPIDES ── */}
        <div style={{ marginTop:'2rem', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' }}>
          {[
            { to:'/catalogue',        icon:'📦', label:'Parcourir le catalogue',       desc:'Recherche avancée par référence, marque, secteur', color:C.forest },
            { to:'/buyer/commandes',  icon:'🛒', label:'Mes commandes',                desc:'Suivre l\'état de vos commandes en cours',         color:C.blue   },
            { to:'/transport',        icon:'🚛', label:'Transport urgent',             desc:'Trajets disponibles pour livraison express',       color:C.eco    },
          ].map(lk => (
            <Link key={lk.to} to={lk.to}
              style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:16, padding:'1.2rem', textDecoration:'none', display:'block', transition:'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(30,61,15,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{ fontSize:'1.6rem', marginBottom:'0.5rem' }}>{lk.icon}</div>
              <div style={{ fontWeight:700, color:lk.color, fontSize:'0.88rem', marginBottom:3 }}>{lk.label}</div>
              <div style={{ fontSize:'0.72rem', color:C.muted, lineHeight:1.5 }}>{lk.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Réponses reçues pour une demande urgente ─────────────────
function UrgentResponsesList({ requestId, user }) {
  const qc = useQueryClient();
  const [accepting, setAccepting] = React.useState(null);

  const { data, isLoading } = useQuery(
    ['urgent-responses', requestId],
    () => api.get('/analysis/urgent/' + requestId + '/responses').then(r => r.data).catch(() => ({ responses:[] })),
    { staleTime: 30000, refetchInterval: 30000 }
  );
  const responses = data?.responses || [];

  if (isLoading) return null;
  if (!responses.length) return null;

  const fmt2 = n => Number(n||0).toLocaleString('fr-MA');

  const acceptMutation = useMutation(
    ({ respId }) => api.post('/analysis/urgent/' + requestId + '/accept/' + respId),
    {
      onSuccess: (res) => {
        qc.invalidateQueries('my-urgent-requests');
        qc.invalidateQueries(['urgent-responses', requestId]);
        toast.success('🎉 Offre acceptée ! ' + (res.data.order_id ? 'Commande créée.' : 'Le vendeur va vous contacter.'));
        setAccepting(null);
      },
      onError: e => { toast.error(e.response?.data?.error||'Erreur'); setAccepting(null); },
    }
  );

  const C2 = { forest:'#1E3D0F', eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', beige:'#EDE6D3', mid:'#D9CEBC', muted:'#5C5C50', white:'#FDFAF4' };

  return (
    <div style={{ borderTop:'2px solid #FDE68A', background:'#FFFBEB', padding:'0.9rem 1.4rem' }}>
      <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#92400E', marginBottom:'0.7rem' }}>
        ⚡ {responses.length} vendeur{responses.length > 1 ? 's ont' : ' a'} répondu à votre demande
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
        {responses.map(resp => {
          const isAccepted = resp.status === 'accepted';
          const isOrdered  = resp.status === 'ordered';
          return (
            <div key={resp.id} style={{ background:isAccepted?'#ECFDF5':C2.white, border:'1.5px solid '+(isAccepted?C2.eco:C2.mid), borderRadius:14, padding:'0.85rem 1.1rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.7rem' }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:4 }}>
                  <div style={{ fontWeight:700, color:C2.forest, fontSize:'0.9rem' }}>
                    {resp.seller_name || resp.seller_company}
                  </div>
                  {Number(resp.seller_rating) > 0 && (
                    <span style={{ fontSize:'0.7rem', color:'#D97706' }}>⭐ {Number(resp.seller_rating).toFixed(1)}</span>
                  )}
                  {(resp.seller_city||resp.seller_city_user) && (
                    <span style={{ fontSize:'0.7rem', color:C2.muted }}>📍 {resp.seller_city||resp.seller_city_user}</span>
                  )}
                </div>
                <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', fontSize:'0.78rem' }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C2.eco }}>
                    {fmt2(resp.proposed_price)} MAD
                  </span>
                  {resp.delivery_hours && (
                    <span style={{ color:C2.orange, fontWeight:600 }}>⏱ {resp.delivery_hours}h</span>
                  )}
                  {resp.quantity_available > 1 && (
                    <span style={{ color:C2.muted }}>📦 {resp.quantity_available} dispo</span>
                  )}
                  {resp.product_title && (
                    <span style={{ color:C2.forest, fontSize:'0.72rem' }}>🔗 {resp.product_title.substring(0,40)}</span>
                  )}
                </div>
                {resp.message && (
                  <div style={{ fontSize:'0.75rem', color:C2.muted, fontStyle:'italic', marginTop:4, lineHeight:1.5 }}>
                    "{resp.message.substring(0,120)}{resp.message.length>120?'...':''}"
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:'0.5rem', flexShrink:0, alignItems:'center' }}>
                {resp.product_slug && (
                  <Link to={'/produit/'+resp.product_slug}
                    style={{ background:C2.beige, color:C2.forest, border:'1px solid '+C2.mid, padding:'0.38rem 0.75rem', borderRadius:100, fontSize:'0.75rem', textDecoration:'none', fontWeight:600 }}>
                    👁 Voir
                  </Link>
                )}
                {isAccepted || isOrdered ? (
                  <span style={{ background:'#ECFDF5', color:C2.eco, border:'1px solid #A7F3D0', padding:'0.38rem 0.85rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700 }}>
                    ✅ Acceptée{isOrdered?' · Commandée':''}
                  </span>
                ) : resp.status === 'rejected' ? (
                  <span style={{ color:C2.muted, fontSize:'0.72rem' }}>❌ Déclinée</span>
                ) : (
                  <button
                    onClick={() => {
                      setAccepting(resp.id);
                      acceptMutation.mutate({ respId: resp.id });
                    }}
                    disabled={acceptMutation.isLoading && accepting===resp.id}
                    style={{ background:C2.eco, color:'#fff', border:'none', padding:'0.5rem 1.2rem', borderRadius:100, fontWeight:700, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {acceptMutation.isLoading && accepting===resp.id ? '⏳...' : '✅ Accepter'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const lbl = { fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
