// src/pages/auto/AutoMarketplace.jsx
// Marketplace Pièces Automobiles — Acheteurs Particuliers

import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const CA = {
  red:    '#1A3C2E', darkRed:'#0F2318',
  cream:  '#F4F6F4', beige:  '#E8EDE8',
  mid:    '#C8D4C8', muted:  '#4A4E5A',
  forest: '#1E3D0F', white:  '#FFFFFF',
  eco:    '#059669', orange: '#D97706', blue:'#2563EB',
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const MAKES = ['Toyota','Volkswagen','Renault','Peugeot','Citroën','Dacia','Hyundai','Kia','Ford','Mercedes-Benz','BMW','Audi','Fiat','Opel','Seat','Skoda','Honda','Nissan','Suzuki','Mitsubishi'];

const PART_TYPES = [
  { icon:'⚙️', label:'Moteur & Distribution', slug:'moteur' },
  { icon:'🔧', label:'Freinage', slug:'freinage' },
  { icon:'⚡', label:'Électrique & Batterie', slug:'electrique' },
  { icon:'🌬️', label:'Refroidissement', slug:'refroidissement' },
  { icon:'🔩', label:'Suspension & Direction', slug:'suspension' },
  { icon:'💨', label:'Échappement', slug:'echappement' },
  { icon:'🪟', label:'Carrosserie & Vitrage', slug:'carrosserie' },
  { icon:'🛢️', label:'Transmission & Embrayage', slug:'transmission' },
  { icon:'💡', label:'Éclairage', slug:'eclairage' },
  { icon:'🌡️', label:'Climatisation', slug:'climatisation' },
  { icon:'🧴', label:'Filtres & Lubrifiants', slug:'filtres' },
  { icon:'📦', label:'Accessoires', slug:'accessoires' },
];

const CONDITIONS = [
  { value:'new',       label:'Neuf',       color:'#059669', bg:'#ECFDF5' },
  { value:'good',      label:'Bon état',   color:'#2563EB', bg:'#EFF6FF' },
  { value:'used',      label:'Occasion',   color:'#D97706', bg:'#FFFBEB' },
  { value:'for_parts', label:'Pour pièces',color:'#6B7280', bg:'#F3F4F6' },
];

function AutoProductCard({ p }) {
  const [hov, setHov] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgs = Array.isArray(p.images) ? p.images
    : (p.images ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : []);
  const cond = CONDITIONS.find(c => c.value === p.condition) || CONDITIONS[2];
  const make = p.vehicle_make || p.brand || '';
  const model = p.vehicle_model || p.model || '';

  return (
    <Link to={'/auto/'+p.slug}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display:'flex', flexDirection:'column', textDecoration:'none', background:'#fff',
        borderRadius:20, overflow:'hidden',
        boxShadow: hov ? '0 20px 56px rgba(15,35,24,0.16), 0 4px 16px rgba(0,0,0,0.06)' : '0 2px 16px rgba(0,0,0,0.06)',
        transform: hov ? 'translateY(-6px) scale(1.01)' : 'none',
        transition:'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        border: hov ? '1.5px solid #1A3C2E' : '1.5px solid #E8ECEB',
        cursor:'pointer' }}>

      {/* Zone image */}
      <div className='product-card-img' style={{ height:200, position:'relative', overflow:'hidden', background:'#F8F8F8', flexShrink:0 }}>
        {imgs[0] && !imgError ? (
          <img src={imgs[0]} alt={p.title} onError={() => setImgError(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover',
              transform: hov ? 'scale(1.06)' : 'scale(1)', transition:'transform 0.5s ease' }}/>
        ) : (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', background:'linear-gradient(145deg,#FFF0F0,#FFF7F7)' }}>
            <span style={{ fontSize:'3.5rem', opacity:0.12, lineHeight:1 }}>🔧</span>
            <span style={{ fontSize:'0.7rem', color:'#D1D5DB', marginTop:6, fontWeight:500 }}>Photo à venir</span>
          </div>
        )}

        {/* Gradient bas pour lisibilité */}
        {imgs[0] && !imgError && (
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.55) 100%)' }}/>
        )}

        {/* Badges top */}
        <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
          <span style={{ background:cond.bg, color:cond.color, fontSize:'0.63rem', fontWeight:700,
            padding:'0.2rem 0.65rem', borderRadius:100, boxShadow:'0 1px 4px rgba(0,0,0,0.12)',
            backdropFilter:'blur(4px)' }}>
            {cond.label}
          </span>
          {p.negotiable && (
            <span style={{ background:'rgba(255,255,255,0.92)', color:'#059669', fontSize:'0.63rem',
              fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:100 }}>
              Négociable
            </span>
          )}
        </div>
        {p.urgent_mode && (
          <span style={{ position:'absolute', top:10, right:10, background:CA.red, color:'#fff',
            fontSize:'0.62rem', fontWeight:800, padding:'0.22rem 0.6rem', borderRadius:100,
            boxShadow:'0 2px 8px rgba(26,60,46,0.4)', letterSpacing:'0.04em' }}>
            ⚡ EXPRESS
          </span>
        )}

        {/* Marque / modèle en bas de l'image */}
        {(make || model) && imgs[0] && !imgError && (
          <div style={{ position:'absolute', bottom:10, left:10, right:10, display:'flex', alignItems:'center', gap:'0.4rem' }}>
            {make && (
              <span style={{ background:'rgba(0,0,0,0.72)', backdropFilter:'blur(6px)', color:'#fff',
                fontSize:'0.7rem', fontWeight:700, padding:'0.2rem 0.65rem', borderRadius:100 }}>
                {make}
              </span>
            )}
            {model && (
              <span style={{ background:'rgba(26,60,46,0.85)', backdropFilter:'blur(4px)', color:'#fff',
                fontSize:'0.65rem', fontWeight:600, padding:'0.18rem 0.55rem', borderRadius:100 }}>
                {model}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Corps */}
      <div style={{ padding:'0.9rem 1rem 1rem', flex:1, display:'flex', flexDirection:'column' }}>

        {/* Titre */}
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, color:'#111', fontSize:'0.9rem',
          lineHeight:1.35, marginBottom:'0.4rem',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
          minHeight:42 }}>
          {p.title}
        </div>

        {/* Ref + véhicule (si pas en image) */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem', marginBottom:'0.6rem' }}>
          {p.reference && (
            <span style={{ background:'#F3F4F6', color:'#6B7280', fontSize:'0.63rem', fontWeight:600,
              padding:'0.15rem 0.5rem', borderRadius:6, fontFamily:'monospace' }}>
              {p.reference}
            </span>
          )}
          {(make || model) && (!imgs[0] || imgError) && (
            <span style={{ background:'#EFF6FF', color:'#2563EB', fontSize:'0.65rem', fontWeight:700,
              padding:'0.15rem 0.55rem', borderRadius:6 }}>
              🚗 {make}{model ? ' '+model : ''}{p.vehicle_year ? ' '+p.vehicle_year : ''}
            </span>
          )}
        </div>

        {/* Séparateur flex */}
        <div style={{ flex:1 }}/>

        {/* Prix + action */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingTop:'0.65rem', borderTop:'1px solid #F3F4F6', marginTop:'0.4rem' }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.45rem', fontWeight:700,
              color:CA.red, lineHeight:1 }}>
              {fmt(p.price)} <span style={{ fontSize:'0.85rem', fontWeight:600 }}>MAD</span>
            </div>
            {p.quantity > 1 && (
              <div style={{ fontSize:'0.62rem', color:'#9CA3AF', marginTop:1 }}>{p.quantity} disponibles</div>
            )}
          </div>
          <div style={{ background: hov ? CA.red : '#FEF2F2',
            color: hov ? '#fff' : CA.red,
            padding:'0.45rem 0.85rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700,
            transition:'all 0.2s', border:'1.5px solid '+CA.red,
            letterSpacing:'0.01em' }}>
            Voir →
          </div>
        </div>

        {/* Vendeur */}
        <div style={{ fontSize:'0.67rem', color:'#9CA3AF', marginTop:'0.5rem',
          display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ width:16, height:16, borderRadius:'50%', background:'#F3F4F6',
            display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', flexShrink:0 }}>
            🏪
          </span>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {p.seller_company || '—'}
          </span>
          {(p.location_city||p.seller_city) && (
            <><span>·</span><span style={{ flexShrink:0 }}>📍 {p.location_city||p.seller_city}</span></>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function AutoMarketplace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const search    = params.get('search')    || '';
  const make      = params.get('make')      || '';
  const partType  = params.get('type')      || '';
  const condition = params.get('condition') || '';
  const minPrice  = params.get('min')       || '';
  const maxPrice  = params.get('max')       || '';

  const setP = (k, v) => setParams(p => { const np = new URLSearchParams(p); if (v) np.set(k, v); else np.delete(k); return np; });

  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data, isLoading } = useQuery(
    ['auto-products', search, make, partType, condition, minPrice, maxPrice, page],
    () => api.get(
      '/products?limit=10&is_auto=true&page='+page +
      (search    ? '&search='+encodeURIComponent(search)          : '') +
      (make      ? '&vehicle_make='+encodeURIComponent(make)      : '') +
      (condition ? '&condition='+condition                         : '') +
      (minPrice  ? '&min_price='+minPrice                         : '') +
      (maxPrice  ? '&max_price='+maxPrice                         : '') +
      (partType  ? '&part_category='+encodeURIComponent(partType) : '')
    ).then(r => r.data).catch(() => ({ products:[], total:0, pagination:{ pages:1, total:0 } })),
    { keepPreviousData: true },
    { staleTime: 30000 }
  );

  const rawProducts = data?.products || [];
  // Filtre client-side partType par mot-clé dans titre/description
  const products = partType
    ? rawProducts.filter(p => {
        const hay = ((p.title||'')+(p.description||'')+(p.brand||'')).toLowerCase();
        const keywords = {
          moteur:['moteur','distribution','vilebrequin','piston','soupape','courroie','joint culasse'],
          freinage:['frein','disque','plaquette','etrier','maitre','abs'],
          electrique:['alternateur','demarreur','batterie','bobine','capteur','fusible','relais','electr'],
          refroidissement:['radiateur','thermostat','pompe eau','ventilateur','liquide refr'],
          suspension:['amortisseur','ressort','rotule','silent','bras','direction','cremaillere'],
          echappement:['echappement','pot','catalyseur','collecteur'],
          carrosserie:['carrosserie','pare-choc','capot','portiere','aile','vitrage','pare-brise'],
          transmission:['boite','embrayage','transmission','differentiel','cardан','CV'],
          eclairage:['phare','feu','ampoule','eclairage','optique'],
          climatisation:['climatisation','compresseur','clim','evaporateur','condenseur'],
          filtres:['filtre','huile','air','carburant','habitacle','lubrif'],
          accessoires:['accessoire','tapis','cache','poignee','antenne'],
        };
        const kws = keywords[partType] || [partType];
        return kws.some(kw => hay.includes(kw));
      })
    : rawProducts;
  const pagination = data?.pagination || null;
  const total    = pagination?.total || data?.total || products.length;
  React.useEffect(() => { setPage(1); }, [search, make, partType, condition, minPrice, maxPrice]);

  const [searchInput, setSearchInput] = useState(search);

  return (
    <div style={{ background:'#F9FAFB', minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#0F2318 0%,#1A3C2E 60%,#243D2F 100%)', position:'relative', overflow:'hidden', padding:'2.5rem 2rem 2rem' }}>
        {/* Décorations */}
        <div style={{ position:'absolute', top:-60, right:-60, width:260, height:260, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:60, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:20, left:-30, fontSize:'8rem', opacity:0.05, pointerEvents:'none', lineHeight:1 }}>🚗</div>

        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:100, padding:'0.25rem 0.85rem', marginBottom:'0.8rem' }}>
            <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.7)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>🚗 Particuliers</span>
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.5rem', fontWeight:700, color:'#fff', margin:'0 0 0.4rem', lineHeight:1.1 }}>
            Pièces de Rechange Automobile
          </h1>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.9rem', marginBottom:'1.5rem', maxWidth:520 }}>
            Trouvez la pièce qu'il vous faut pour votre voiture · Neuves et d'occasion · Livraison dans tout le Maroc
          </p>

          {/* Barre de recherche principale */}
          <div style={{ display:'flex', gap:'0.5rem', maxWidth:640 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') setP('search', searchInput); }}
                placeholder="Référence, désignation, marque... Ex: filtre huile Renault Clio"
                style={{ width:'100%', padding:'0.85rem 1.2rem', borderRadius:100, border:'none', fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}
              />
            </div>
            <button onClick={() => setP('search', searchInput)}
              style={{ background:'#fff', color:CA.red, border:'none', padding:'0.85rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>
              🔍 Rechercher
            </button>
          </div>

          {/* Bouton vendeur */}
          <div style={{ marginTop:'1rem', marginBottom:'0.5rem' }}>
            <Link to="/seller/publier-auto"
              style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', padding:'0.5rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, textDecoration:'none' }}>
              + Vendre une pièce
            </Link>
          </div>

          {/* Stats rapides */}
          <div style={{ display:'flex', gap:'1.5rem', marginTop:'0.5rem', flexWrap:'wrap' }}>
            {[['📦', total+' pièces'],['🚚', 'Livraison express'],['✅', 'Vendeurs vérifiés'],['🔒', 'Paiement sécurisé']].map(([ic,lb]) => (
              <div key={lb} style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.78rem', color:'rgba(255,255,255,0.7)' }}>
                <span>{ic}</span><span>{lb}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTRES PAR MARQUE ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0.75rem 0', overflowX:'auto' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 2rem', display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'nowrap' }}>
          <span style={{ fontSize:'0.72rem', fontWeight:600, color:CA.muted, whiteSpace:'nowrap', marginRight:'0.3rem' }}>Marque :</span>
          <button onClick={() => setP('make', '')}
            style={{ background:!make?CA.red:'#F3F4F6', color:!make?'#fff':CA.muted, border:'none', padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:!make?700:400, whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>
            Toutes
          </button>
          {MAKES.map(m => (
            <button key={m} onClick={() => setP('make', m)}
              style={{ background:make===m?CA.red:'#F3F4F6', color:make===m?'#fff':CA.muted, border:'none', padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:make===m?700:400, whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 clamp(1rem,3vw,2rem) 4rem' }}>
        {/* Bouton filtres mobile */}
        <button onClick={() => setSidebarOpen(function(o){ return !o; })}
          style={{ display:'none', width:'100%', padding:'0.75rem', background:'#0F2318', color:'#F4F6F4', border:'none', borderRadius:12, fontSize:'0.88rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", alignItems:'center', justifyContent:'center', gap:'0.5rem', marginBottom:'1rem' }}
          className="show-mobile-flex">
          🔍 {sidebarOpen ? 'Masquer les filtres' : 'Filtres & catégories'}
        </button>

        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:'1.5rem', alignItems:'start' }}
          className="auto-marketplace-grid">

        {/* ── SIDEBAR FILTRES ── */}
        <div style={{ position:'sticky', top:80 }} className={sidebarOpen ? 'sidebar-col-panel open' : 'sidebar-col-panel'}>
          <div>

          {/* Types de pièces */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1rem', border:'1px solid #E5E7EB' }}>
            <div style={{ fontWeight:700, color:'#111', fontSize:'0.85rem', marginBottom:'0.8rem' }}>🔧 Type de pièce</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              <button onClick={() => setP('type', '')}
                style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:!partType?CA.beige:'transparent', color:!partType?CA.red:'#374151', border:'none', padding:'0.5rem 0.7rem', borderRadius:10, cursor:'pointer', fontSize:'0.82rem', textAlign:'left', fontFamily:"'DM Sans',sans-serif", fontWeight:!partType?700:400 }}>
                <span>🚗</span> Toutes les pièces
              </button>
              {PART_TYPES.map(pt => (
                <button key={pt.slug} onClick={() => setP('type', pt.slug)}
                  style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:partType===pt.slug?CA.beige:'transparent', color:partType===pt.slug?CA.red:'#374151', border:'none', padding:'0.5rem 0.7rem', borderRadius:10, cursor:'pointer', fontSize:'0.82rem', textAlign:'left', fontFamily:"'DM Sans',sans-serif", fontWeight:partType===pt.slug?700:400 }}>
                  <span>{pt.icon}</span> {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* État */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1rem', border:'1px solid #E5E7EB' }}>
            <div style={{ fontWeight:700, color:'#111', fontSize:'0.85rem', marginBottom:'0.8rem' }}>✅ État</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              <button onClick={() => setP('condition', '')}
                style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:!condition?CA.beige:'transparent', color:!condition?CA.red:'#374151', border:'none', padding:'0.4rem 0.7rem', borderRadius:10, cursor:'pointer', fontSize:'0.82rem', textAlign:'left', fontFamily:"'DM Sans',sans-serif", fontWeight:!condition?700:400 }}>
                Tous les états
              </button>
              {CONDITIONS.map(c => (
                <button key={c.value} onClick={() => setP('condition', c.value)}
                  style={{ display:'flex', alignItems:'center', gap:'0.6rem', background:condition===c.value?CA.beige:'transparent', color:condition===c.value?CA.red:'#374151', border:'none', padding:'0.4rem 0.7rem', borderRadius:10, cursor:'pointer', fontSize:'0.82rem', textAlign:'left', fontFamily:"'DM Sans',sans-serif", fontWeight:condition===c.value?700:400 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prix */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1rem', border:'1px solid #E5E7EB' }}>
            <div style={{ fontWeight:700, color:'#111', fontSize:'0.85rem', marginBottom:'0.8rem' }}>💰 Budget (MAD)</div>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <input type="number" value={minPrice} onChange={e => setP('min', e.target.value)}
                placeholder="Min" min="0"
                style={{ flex:1, padding:'0.5rem 0.6rem', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', width:'100%', boxSizing:'border-box' }}/>
              <span style={{ color:CA.muted, fontSize:'0.8rem' }}>—</span>
              <input type="number" value={maxPrice} onChange={e => setP('max', e.target.value)}
                placeholder="Max" min="0"
                style={{ flex:1, padding:'0.5rem 0.6rem', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', width:'100%', boxSizing:'border-box' }}/>
            </div>
            <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
              {[[0,500,'< 500'],[500,2000,'500–2k'],[2000,10000,'2k–10k'],[10000,'','> 10k']].map(([mn,mx,lbl]) => (
                <button key={lbl} onClick={() => { setP('min', String(mn)); setP('max', mx ? String(mx) : ''); }}
                  style={{ background:'#F3F4F6', color:CA.muted, border:'none', padding:'0.25rem 0.6rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          </div>
        </div>

        {/* ── RÉSULTATS ── */}
        <div>
          {/* Barre résultats + tri */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem', flexWrap:'wrap', gap:'0.5rem' }}>
            <div style={{ fontSize:'0.85rem', color:'#374151', fontWeight:500 }}>
              {isLoading ? 'Recherche en cours...' : (
                <><strong style={{ color:CA.red }}>{total}</strong> pièce{total!==1?'s':''} trouvée{total!==1?'s':''}{pagination&&pagination.pages>1?' · Page '+page+'/'+pagination.pages:''}</>
              )}
              {(search||make||partType||condition) && (
                <button onClick={() => setParams({})}
                  style={{ marginLeft:'0.7rem', background:'transparent', color:CA.red, border:'1px solid '+CA.mid, padding:'0.2rem 0.6rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  ✕ Effacer les filtres
                </button>
              )}
            </div>

            {/* Filtres actifs pills */}
            <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
              {search && <span style={{ background:CA.beige, color:CA.red, fontSize:'0.72rem', padding:'0.2rem 0.65rem', borderRadius:100, fontWeight:600 }}>🔍 {search}</span>}
              {make && <span style={{ background:CA.beige, color:CA.red, fontSize:'0.72rem', padding:'0.2rem 0.65rem', borderRadius:100, fontWeight:600 }}>🚗 {make}</span>}
              {partType && <span style={{ background:CA.beige, color:CA.red, fontSize:'0.72rem', padding:'0.2rem 0.65rem', borderRadius:100, fontWeight:600 }}>🔧 {PART_TYPES.find(p=>p.slug===partType)?.label||partType}</span>}
              {condition && <span style={{ background:CA.beige, color:CA.red, fontSize:'0.72rem', padding:'0.2rem 0.65rem', borderRadius:100, fontWeight:600 }}>✅ {CONDITIONS.find(c=>c.value===condition)?.label}</span>}
            </div>
          </div>

          {/* Catégories rapides (si pas de filtre type) */}
          {!partType && !search && !isLoading && (
            <div style={{ marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.7rem' }}>
                Parcourir par catégorie
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(140px,100%),1fr))', gap:'0.6rem' }}>
                {PART_TYPES.slice(0,8).map(pt => (
                  <button key={pt.slug} onClick={() => setP('type', pt.slug)}
                    style={{ background:'#fff', border:'1.5px solid #F3F4F6', borderRadius:16, padding:'0.9rem 0.5rem',
                      cursor:'pointer', textAlign:'center', transition:'all 0.2s', fontFamily:"'DM Sans',sans-serif",
                      boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=CA.red; e.currentTarget.style.background=CA.cream; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(26,60,46,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#F3F4F6'; e.currentTarget.style.background='#fff'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'; }}>
                    <div style={{ fontSize:'1.5rem', marginBottom:'0.4rem', lineHeight:1 }}>{pt.icon}</div>
                    <div style={{ fontSize:'0.67rem', fontWeight:600, color:'#374151', lineHeight:1.25 }}>{pt.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.2rem' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ borderRadius:20, overflow:'hidden', background:'#fff', border:'1.5px solid #F3F4F6', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ height:200, background:'linear-gradient(90deg,#F9F9F9 25%,#F0F0F0 50%,#F9F9F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
                  <div style={{ padding:'0.9rem 1rem 1rem' }}>
                    <div style={{ height:13, background:'#F3F4F6', borderRadius:100, marginBottom:8, width:'85%' }}/>
                    <div style={{ height:11, background:'#F9F9F9', borderRadius:100, marginBottom:16, width:'60%' }}/>
                    <div style={{ height:1, background:'#F3F4F6', marginBottom:12 }}/>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ height:22, background:'#E8EDE8', borderRadius:100, width:'45%' }}/>
                      <div style={{ height:30, background:'#F3F4F6', borderRadius:100, width:'25%' }}/>
                    </div>
                  </div>
                </div>
              ))}
              <style>{'@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'}</style>
            </div>
          )}

          {/* Vide */}
          {!isLoading && products.length === 0 && (
            <div style={{ textAlign:'center', padding:'5rem 2rem', background:'#fff', borderRadius:20, border:'1px solid #E5E7EB' }}>
              <div style={{ fontSize:'4rem', opacity:0.12, marginBottom:'0.8rem' }}>🔧</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:'#111', marginBottom:'0.4rem' }}>
                Aucune pièce trouvée
              </div>
              <p style={{ color:CA.muted, fontSize:'0.9rem', marginBottom:'1.2rem' }}>
                Essayez une autre recherche ou élargissez vos filtres.
              </p>
              <div style={{ display:'flex', gap:'0.7rem', justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => setParams({})}
                  style={{ background:CA.red, color:'#fff', border:'none', padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  Voir toutes les pièces
                </button>
                <Link to="/buyer/urgence"
                  style={{ background:'#F3F4F6', color:'#374151', textDecoration:'none', padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:600, fontSize:'0.9rem' }}>
                  ⚡ Demande urgente
                </Link>
              </div>
            </div>
          )}

          {/* Grille produits */}
          {!isLoading && products.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.2rem' }}>
              {products.map(p => <AutoProductCard key={p.id} p={p}/>)}
            </div>
          )}

          {/* Pagination 1 2 3 ... */}
          {pagination && pagination.pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem', marginTop:'2.5rem', flexWrap:'wrap' }}>
              <button onClick={() => { setPage(p => Math.max(1,p-1)); window.scrollTo(0,0); }} disabled={page===1}
                style={{ padding:'0.55rem 1.1rem', borderRadius:100, border:'1.5px solid '+(page===1?'#F3F4F6':'#C8D4C8'), background:'transparent', color:page===1?'#D1D5DB':CA.red, cursor:page===1?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', fontWeight:600 }}>
                ← Préc.
              </button>

              {Array.from({ length: pagination.pages }, (_,i) => i+1)
                .filter(p => p === 1 || p === pagination.pages || Math.abs(p-page) <= 2)
                .reduce((acc,p,i,arr) => { if(i>0 && p - arr[i-1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                .map((p,i) => p === '...'
                  ? <span key={'e'+i} style={{ color:'#9CA3AF', padding:'0 4px' }}>···</span>
                  : <button key={p} onClick={() => { setPage(p); window.scrollTo(0,0); }}
                      style={{ width:38, height:38, borderRadius:'50%', border:'1.5px solid '+(p===page?CA.red:'#C8D4C8'), background:p===page?CA.red:'transparent', color:p===page?'#fff':CA.red, fontWeight:p===page?700:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem', transition:'all 0.15s' }}>
                      {p}
                    </button>
                )
              }

              <button onClick={() => { setPage(p => Math.min(pagination.pages,p+1)); window.scrollTo(0,0); }} disabled={page===pagination.pages}
                style={{ padding:'0.55rem 1.1rem', borderRadius:100, border:'1.5px solid '+(page===pagination.pages?'#F3F4F6':'#C8D4C8'), background:'transparent', color:page===pagination.pages?'#D1D5DB':CA.red, cursor:page===pagination.pages?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', fontWeight:600 }}>
                Suiv. →
              </button>
            </div>
          )}

          {/* CTA demande urgente */}
          {!isLoading && products.length > 0 && (
            <div style={{ marginTop:'2rem', background:'linear-gradient(135deg,#0F2318,#1A3C2E)', borderRadius:18, padding:'1.5rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#fff', marginBottom:'0.2rem' }}>
                  Vous ne trouvez pas votre pièce ?
                </div>
                <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)' }}>
                  Décrivez votre besoin — nos vendeurs vous répondent sous 2h
                </div>
              </div>
              <Link to="/buyer/urgence"
                style={{ background:'#fff', color:CA.red, textDecoration:'none', padding:'0.75rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
                ⚡ Demande urgente →
              </Link>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
