// src/pages/lots/PublishLot.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9',
  purple:'#8E44AD'
};

const LOT_TYPES = [
  {
    id:'recyclage',
    icon:'♻️',
    label:'Recyclage matière première',
    desc:'Ferraille, métaux, plastiques, câbles, composants à fondre ou recycler',
    color:'#27AE60', bg:'#E8F8EE',
    examples:'Ferraille acier, Cuivre dénudé, Aluminium, Plastiques HDPE'
  },
  {
    id:'diy',
    icon:'🔧',
    label:'Make It Yourself (DIY)',
    desc:'Pièces et composants pour bricolage, projets créatifs, restauration',
    color:'#E67E22', bg:'#FEF5E7',
    examples:'Moteurs électriques, Engrenages, Visserie, Profilés, Optiques'
  },
  {
    id:'industriel',
    icon:'🏭',
    label:'Pièces industrielles utilisables',
    desc:'Lots de pièces opérationnelles par secteur ou catégorie',
    color:'#2980B9', bg:'#EBF5FB',
    examples:'Roulements SKF, Vannes pneumatiques, Capteurs, Relais, Pompes'
  },
];

const INDUSTRIES = [
  'Chimie & Phosphates','Ciment & BTP','Agroalimentaire','Énergie & Pétrole',
  'Mines & Métallurgie','Textile','Automobile','Électronique','Hydraulique & Pneumatique','Autre'
];

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const EMPTY_ITEM = { designation:'', reference:'', quantity:1, unit:'unité', unit_weight_kg:'', condition:'used', notes:'' };

export default function PublishLot() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1:type | 2:vente | 3:détails | 4:articles
  const [lotType, setLotType]       = useState('');
  const [saleType, setSaleType]     = useState('fixed_price');
  const [form, setForm] = useState({
    title:'', description:'', industry_category:'',
    price:'', negotiable:true,
    start_price:'', reserve_price:'', bid_increment:'100',
    auction_start:'', auction_end:'',
    total_weight_kg:'', total_value_est:'',
    location_city:'', condition:'mixed',
    blind_lot:false,
    images:[]
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const addItem    = () => setItems(it => [...it, { ...EMPTY_ITEM }]);
  const removeItem = i  => setItems(it => it.filter((_, idx) => idx !== i));
  const setItem    = (i, k, v) => setItems(it => it.map((item, idx) => idx===i ? {...item,[k]:v} : item));

  const totalPoids = items.reduce((s,it) => s + (Number(it.unit_weight_kg||0) * Number(it.quantity||1)), 0);

  const publishMutation = useMutation(
    (payload) => api.post('/lots', payload),
    {
      onSuccess: (res) => {
        toast.success('🎉 Lot publié avec succès !');
        navigate(`/lots/${res.data.lot.slug}`);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur publication')
    }
  );

  const handlePublish = (status = 'active') => {
    if (!form.title.trim()) return toast.error('Titre obligatoire');
    if (!lotType)           return toast.error('Sélectionnez un type de lot');
    if (saleType === 'fixed_price' && !form.price) return toast.error('Prix obligatoire');
    if (saleType === 'auction' && !form.start_price) return toast.error('Prix de départ obligatoire');
    if (saleType === 'auction' && !form.auction_end) return toast.error('Date de fin obligatoire');
    if (items.filter(it => it.designation.trim()).length === 0) return toast.error('Ajoutez au moins 1 article');

    publishMutation.mutate({
      ...form,
      lot_type:   lotType,
      sale_type:  saleType,
      items:      items.filter(it => it.designation.trim()),
      total_weight_kg: totalPoids || form.total_weight_kg || null,
      status,
    });
  };

  const canNext = step === 1 ? !!lotType : step === 2 ? !!saleType : step === 3 ? !!form.title : true;

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div style={{ maxWidth:860, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

      {/* En-tête */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', color:C.forest }}>📦 Publier un Lot</h1>
          <p style={{ color:C.muted, fontSize:'0.88rem' }}>Vendez plusieurs articles groupés en un lot</p>
        </div>
        <Link to="/lots" style={{ color:C.muted, textDecoration:'none', fontSize:'0.85rem' }}>← Retour aux lots</Link>
      </div>

      {/* Stepper */}
      <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:'2.5rem' }}>
        {[['1','Type de lot'],['2','Mode de vente'],['3','Informations'],['4','Articles']].map(([n, label], i) => (
          <React.Fragment key={n}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background: step > i+1 ? C.eco : step === i+1 ? C.forest : C.beige,
                color: step >= i+1 ? '#fff' : C.muted,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.85rem', fontWeight:700, flexShrink:0, transition:'all 0.2s'
              }}>
                {step > i+1 ? '✓' : n}
              </div>
              <div style={{ fontSize:'0.7rem', color:step===i+1?C.forest:C.muted, fontWeight:step===i+1?600:400, whiteSpace:'nowrap' }}>{label}</div>
            </div>
            {i < 3 && <div style={{ flex:1, height:2, background:step>i+1?C.eco:C.mid, margin:'0 0.5rem', marginBottom:18, transition:'all 0.3s' }}/>}
          </React.Fragment>
        ))}
      </div>

      {/* ══ ÉTAPE 1 : TYPE DE LOT ══ */}
      {step === 1 && (
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'1.5rem' }}>
            Quel type de lot voulez-vous publier ?
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {LOT_TYPES.map(t => (
              <div key={t.id} onClick={() => setLotType(t.id)}
                style={{ border:'2px solid '+lotType===t.id?t.color:C.mid+'', borderRadius:18, padding:'1.5rem', cursor:'pointer', background:lotType===t.id?t.bg:C.white, transition:'all 0.2s' }}>
                <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                  <div style={{ fontSize:'2.5rem', flexShrink:0 }}>{t.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.forest, marginBottom:'0.3rem' }}>{t.label}</div>
                    <div style={{ fontSize:'0.85rem', color:C.muted, marginBottom:'0.5rem' }}>{t.desc}</div>
                    <div style={{ fontSize:'0.78rem', color:t.color, fontWeight:600 }}>
                      Ex: {t.examples}
                    </div>
                  </div>
                  {lotType === t.id && (
                    <div style={{ width:24, height:24, borderRadius:'50%', background:t.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 2 : MODE DE VENTE ══ */}
      {step === 2 && (
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'1.5rem' }}>
            Comment voulez-vous vendre ce lot ?
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
            {[
              {
                id:'fixed_price', icon:'🏷️', label:'Prix fixe',
                desc:'Vous fixez un prix. L\'acheteur paie et reçoit le lot immédiatement.',
                avantage:'Vente rapide et certaine', color:C.eco, bg:'#E8F8EE'
              },
              {
                id:'auction', icon:'🔨', label:'Enchères',
                desc:'Les acheteurs enchérissent. Le plus offrant remporte le lot à la date de clôture.',
                avantage:'Maximiser la valeur', color:C.orange, bg:'#FEF5E7'
              }
            ].map(s => (
              <div key={s.id} onClick={() => setSaleType(s.id)}
                style={{ border:'2.5px solid '+saleType===s.id?s.color:C.mid+'', borderRadius:18, padding:'2rem', cursor:'pointer', background:saleType===s.id?s.bg:C.white, transition:'all 0.2s', textAlign:'center' }}>
                <div style={{ fontSize:'3rem', marginBottom:'0.8rem' }}>{s.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:C.forest, marginBottom:'0.5rem' }}>{s.label}</div>
                <div style={{ fontSize:'0.85rem', color:C.muted, lineHeight:1.6, marginBottom:'0.8rem' }}>{s.desc}</div>
                <div style={{ background:s.color+'22', color:s.color, borderRadius:100, padding:'0.3rem 0.8rem', fontSize:'0.78rem', fontWeight:700, display:'inline-block' }}>
                  ✓ {s.avantage}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 3 : INFORMATIONS ══ */}
      {step === 3 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
          {/* Infos générales */}
          <div style={card}>
            <h3 style={secTitle}>📋 Informations du lot</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Titre du lot *</label>
                <input value={form.title} onChange={set('title')} placeholder="Ex: Lot ferraille acier 2T — IMACID" style={inp} />
              </div>
              {lotType === 'industriel' && (
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Secteur industriel cible</label>
                  <select value={form.industry_category} onChange={set('industry_category')} style={inp}>
                    <option value="">Tous secteurs</option>
                    {INDUSTRIES.map(ind => <option key={ind}>{ind}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lbl}>Ville d'expédition</label>
                <input value={form.location_city} onChange={set('location_city')} placeholder="Ex: Jorf Lasfar" style={inp}/>
              </div>
              <div>
                <label style={lbl}>État général du lot</label>
                <select value={form.condition} onChange={set('condition')} style={inp}>
                  <option value="new">Neuf</option>
                  <option value="good">Bon état</option>
                  <option value="used">Usagé</option>
                  <option value="mixed">Mixte</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Description du lot</label>
                <textarea value={form.description} onChange={set('description')} rows={4}
                  placeholder="Décrivez le contenu, l'état, l'origine, les conditions de retrait..."
                  style={{ ...inp, resize:'vertical' }} />
              </div>

              {/* Option Lot Aveugle */}
              <div style={{ gridColumn:'1/-1' }}>
                <div
                  onClick={() => setForm(f => ({ ...f, blind_lot: !f.blind_lot }))}
                  style={{ display:'flex', alignItems:'flex-start', gap:'1rem', padding:'1rem 1.2rem', border:'2px solid '+(form.blind_lot?'#2C3E50':C.mid), borderRadius:14, cursor:'pointer', background:form.blind_lot?'#2C3E5015':C.cream, transition:'all 0.2s' }}>
                  <div style={{ width:22, height:22, borderRadius:6, border:'2px solid '+(form.blind_lot?'#2C3E50':C.mid), background:form.blind_lot?'#2C3E50':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                    {form.blind_lot && <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:C.forest, fontSize:'0.92rem', marginBottom:'0.2rem' }}>
                      🙈 Lot Aveugle <span style={{ background:'#2C3E50', color:'#fff', borderRadius:100, padding:'0.1rem 0.5rem', fontSize:'0.7rem', marginLeft:6 }}>MYSTÈRE</span>
                    </div>
                    <div style={{ fontSize:'0.8rem', color:C.muted, lineHeight:1.5 }}>
                      Le contenu détaillé est masqué aux acheteurs avant l'achat.<br/>
                      Seuls le poids total, le type de lot et le nombre d'articles sont visibles.<br/>
                      <strong style={{ color:C.orange }}>⚠️ L'acheteur accepte le lot sans garantie de contenu spécifique.</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label style={lbl}>Poids total estimé (kg)</label>
                <input type="number" value={form.total_weight_kg} onChange={set('total_weight_kg')} placeholder="Ex: 2000" style={inp} min="0"/>
              </div>
              <div>
                <label style={lbl}>Valeur estimée totale (MAD)</label>
                <input type="number" value={form.total_value_est} onChange={set('total_value_est')} placeholder="Ex: 45000" style={inp} min="0"/>
              </div>
            </div>
          </div>

          {/* Prix (fixe ou enchères) */}
          <div style={card}>
            <h3 style={secTitle}>{saleType==='auction'?'🔨 Paramètres d\'enchères':'🏷️ Prix fixe'}</h3>
            {saleType === 'fixed_price' ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
                <div>
                  <label style={lbl}>Prix de vente (MAD HT) *</label>
                  <input type="number" value={form.price} onChange={set('price')} placeholder="Ex: 35000" style={inp} min="0"/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:24 }}>
                  <input type="checkbox" id="neg" checked={form.negotiable} onChange={set('negotiable')} style={{ width:18, height:18 }} />
                  <label htmlFor="neg" style={{ fontSize:'0.85rem', color:C.forest, cursor:'pointer' }}>Prix négociable</label>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
                <div>
                  <label style={lbl}>Prix de départ (MAD) *</label>
                  <input type="number" value={form.start_price} onChange={set('start_price')} placeholder="Ex: 5000" style={inp} min="0"/>
                </div>
                <div>
                  <label style={lbl}>Prix de réserve (MAD) — confidentiel</label>
                  <input type="number" value={form.reserve_price} onChange={set('reserve_price')} placeholder="Minimum acceptable (non publié)" style={inp} min="0"/>
                </div>
                <div>
                  <label style={lbl}>Palier minimum (MAD)</label>
                  <input type="number" value={form.bid_increment} onChange={set('bid_increment')} placeholder="100" style={inp} min="1"/>
                </div>
                <div>
                  <label style={lbl}>Début de l'enchère</label>
                  <input type="datetime-local" value={form.auction_start} onChange={set('auction_start')} style={inp}/>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Fin de l'enchère *</label>
                  <input type="datetime-local" value={form.auction_end} onChange={set('auction_end')} style={inp} min={new Date().toISOString().slice(0,16)}/>
                </div>

                {/* Aperçu enchère */}
                {form.start_price && (
                  <div style={{ gridColumn:'1/-1', background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:12, padding:'0.9rem 1.1rem', fontSize:'0.82rem', color:'#784212' }}>
                    🔨 Enchère démarre à <strong>{fmt(form.start_price)} MAD</strong>
                    {form.reserve_price && ' • Prix de réserve : '+fmt(form.reserve_price)+' MAD (confidentiel)'}
                    {form.auction_end && ' • Se termine le ' + new Date(form.auction_end).toLocaleDateString('fr-MA', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'})}                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 4 : ARTICLES ══ */}
      {step === 4 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.forest }}>
                📦 Articles dans le lot
              </h2>
              <p style={{ fontSize:'0.82rem', color:C.muted, marginTop:'0.2rem' }}>
                {items.length} article(s) • {totalPoids > 0 ? ''+fmt(totalPoids)+' kg' : 'poids à renseigner'}
              </p>
            </div>
            <button onClick={addItem}
              style={{ background:C.forest, color:C.cream, border:'none', padding:'0.55rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              + Ajouter un article
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', marginBottom:'1.5rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{ background:C.white, border:'1px solid '+C.mid+'', borderRadius:14, padding:'1.2rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem' }}>
                  <div style={{ fontWeight:600, color:C.forest, fontSize:'0.88rem' }}>Article #{i+1}</div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)}
                      style={{ background:'#FDECEA', color:C.urgent, border:'none', padding:'0.25rem 0.6rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer' }}>
                      ✕ Retirer
                    </button>
                  )}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'0.6rem' }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={lbl}>Désignation *</label>
                    <input value={item.designation} onChange={e => setItem(i,'designation',e.target.value)} placeholder="Ex: Moteur électrique 15kW" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Référence</label>
                    <input value={item.reference} onChange={e => setItem(i,'reference',e.target.value)} placeholder="REF-XXX" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Quantité</label>
                    <input type="number" value={item.quantity} onChange={e => setItem(i,'quantity',e.target.value)} min="1" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Unité</label>
                    <input value={item.unit} onChange={e => setItem(i,'unit',e.target.value)} placeholder="unité" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Poids/unité (kg)</label>
                    <input type="number" value={item.unit_weight_kg} onChange={e => setItem(i,'unit_weight_kg',e.target.value)} placeholder="0" style={inp} min="0" step="0.1"/>
                  </div>
                  <div>
                    <label style={lbl}>État</label>
                    <select value={item.condition} onChange={e => setItem(i,'condition',e.target.value)} style={inp}>
                      <option value="new">Neuf</option>
                      <option value="good">Bon état</option>
                      <option value="used">Usagé</option>
                    </select>
                  </div>
                  <div style={{ gridColumn:'2/-1' }}>
                    <label style={lbl}>Notes</label>
                    <input value={item.notes} onChange={e => setItem(i,'notes',e.target.value)} placeholder="Précisions, dimensions, marque..." style={inp}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Récapitulatif */}
          <div style={{ background:C.beige, border:'1px solid '+C.mid+'', borderRadius:14, padding:'1.2rem', marginBottom:'1.5rem' }}>
            <div style={{ fontWeight:700, color:C.forest, marginBottom:'0.7rem' }}>📊 Récapitulatif du lot</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.8rem' }}>
              {[
                ['Type',       LOT_TYPES.find(t=>t.id===lotType)?.label, C.forest],
                ['Vente',      saleType==='fixed_price'?'Prix fixe':'Enchères', saleType==='fixed_price'?C.eco:C.orange],
                ['Articles',   ''+items.filter(it=>it.designation.trim()).length+' article(s)', C.blue],
                ['Poids total',totalPoids>0?`${fmt(totalPoids)} kg`:'—', C.muted],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:C.white, borderRadius:10, padding:'0.7rem', textAlign:'center' }}>
                  <div style={{ fontSize:'0.7rem', color:C.muted, marginBottom:'0.2rem' }}>{l}</div>
                  <div style={{ fontWeight:700, color:c, fontSize:'0.88rem' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2rem', paddingTop:'1.5rem', borderTop:'1px solid '+C.mid+'' }}>
        <button onClick={() => setStep(s => Math.max(1, s-1))} disabled={step===1}
          style={{ background:'transparent', color:step===1?C.mid:C.muted, border:'1px solid '+step===1?C.beige:C.mid+'', padding:'0.75rem 1.8rem', borderRadius:100, cursor:step===1?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.9rem' }}>
          ← Précédent
        </button>
        {step < 4 ? (
          <button onClick={() => canNext && setStep(s => s+1)} disabled={!canNext}
            style={{ background:canNext?C.forest:C.mid, color:C.cream, border:'none', padding:'0.75rem 2.5rem', borderRadius:100, cursor:canNext?'pointer':'not-allowed', fontWeight:600, fontFamily:"'DM Sans',sans-serif", fontSize:'0.9rem' }}>
            Suivant →
          </button>
        ) : (
          <div style={{ display:'flex', gap:'0.7rem' }}>
            <button onClick={() => handlePublish('draft')}
              style={{ background:'transparent', color:C.muted, border:'1px solid '+C.mid+'', padding:'0.75rem 1.5rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem' }}>
              💾 Brouillon
            </button>
            <button onClick={() => handlePublish('active')} disabled={publishMutation.isLoading}
              style={{ background:saleType==='auction'?C.orange:C.forest, color:'#fff', border:'none', padding:'0.75rem 2.5rem', borderRadius:100, cursor:'pointer', fontWeight:700, fontFamily:"'DM Sans',sans-serif", fontSize:'0.9rem' }}>
              {publishMutation.isLoading ? '⏳ Publication...' : saleType==='auction' ? '🔨 Lancer l\'enchère' : '🚀 Publier le lot'}
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

const card = { background:'#FDFAF4', border:'1px solid #D9CEBC', borderRadius:18, padding:'1.5rem' };
const secTitle = { fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:'#1E3D0F', marginBottom:'1rem' };
const lbl = { fontSize:'0.78rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
