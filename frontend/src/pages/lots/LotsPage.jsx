// src/pages/lots/LotsPage.jsx — Design premium REVEX
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const GRADE_C = { forest:'#1E3D0F', leaf:'#4A7C2F', cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC', white:'#FDFAF4', muted:'#5C5C50', eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9' };

const TYPE_CFG = {
  recyclage:  { icon:'♻️', label:'Recyclage',    color:'#059669', bg:'#ECFDF5', accent:'#D1FAE5' },
  diy:        { icon:'🔧', label:'DIY',           color:'#D97706', bg:'#FFFBEB', accent:'#FDE68A' },
  industriel: { icon:'🏭', label:'Industriel',    color:'#2563EB', bg:'#EFF6FF', accent:'#BFDBFE' },
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

function Countdown({ endDate }) {
  const [remaining, setRemaining] = useState({ d:0, h:0, m:0, s:0, done:false });
  React.useEffect(() => {
    const tick = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) { setRemaining({ done:true }); return; }
      setRemaining({
        d: Math.floor(diff/86400000),
        h: Math.floor((diff%86400000)/3600000),
        m: Math.floor((diff%3600000)/60000),
        s: Math.floor((diff%60000)/1000),
        done: false
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (remaining.done) return <span style={{ color:GRADE_C.muted, fontSize:'0.8rem' }}>Terminée</span>;

  const urgent = remaining.d === 0 && remaining.h < 24;
  const blocks = remaining.d > 0
    ? [{ v:remaining.d, u:'j' }, { v:remaining.h, u:'h' }, { v:remaining.m, u:'m' }]
    : [{ v:remaining.h, u:'h' }, { v:remaining.m, u:'m' }, { v:remaining.s, u:'s' }];

  return (
    <div style={{ display:'flex', gap:4 }}>
      {blocks.map(({ v, u }) => (
        <div key={u} style={{ textAlign:'center', minWidth:32, background:urgent?'#FEF2F2':'#1E3D0F', borderRadius:8, padding:'3px 6px' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:urgent?GRADE_C.urgent:'#F6F1E7', lineHeight:1 }}>
            {String(v).padStart(2,'0')}
          </div>
          <div style={{ fontSize:'0.55rem', color:urgent?'#FCA5A5':'rgba(246,241,231,0.6)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{u}</div>
        </div>
      ))}
    </div>
  );
}

function LotCard({ lot }) {
  const [hovered, setHovered] = useState(false);
  const tc = TYPE_CFG[lot.lot_type] || { icon:'📦', label:lot.lot_type, color:GRADE_C.muted, bg:GRADE_C.beige, accent:GRADE_C.mid };
  const isAuction = lot.sale_type === 'auction';
  const imgs = typeof lot.images === 'string'
    ? (() => { try { return JSON.parse(lot.images); } catch { return []; } })()
    : (lot.images || []);
  const urgent = isAuction && lot.auction_end && (new Date(lot.auction_end) - new Date()) < 86400000;

  return (
    <Link
      to={'/lots/'+lot.slug}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:'block', textDecoration:'none',
        background:'#fff',
        borderRadius:20, overflow:'hidden',
        boxShadow: hovered
          ? '0 20px 60px rgba(30,61,15,0.16), 0 4px 16px rgba(30,61,15,0.08)'
          : urgent ? '0 0 0 2px #FCA5A5, 0 4px 16px rgba(220,38,38,0.08)' : '0 2px 12px rgba(30,61,15,0.06)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        border: '1px solid ' + (urgent ? '#FECACA' : 'rgba(30,61,15,0.07)'),
      }}>

      {/* IMAGE */}
      <div style={{ height:180, position:'relative', overflow:'hidden', background:'linear-gradient(135deg,'+tc.accent+' 0%,'+tc.bg+' 100%)' }}>
        {imgs[0]
          ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform:hovered?'scale(1.07)':'scale(1)' }} onError={e=>e.target.style.display='none'}/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
              <span style={{ fontSize:'3.5rem', opacity:0.4 }}>{tc.icon}</span>
              <span style={{ fontSize:'0.68rem', color:tc.color, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7 }}>{tc.label}</span>
            </div>
        }

        {/* Badges top-left */}
        <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:5, flexDirection:'column' }}>
          <span style={{ background:'rgba(255,255,255,0.92)', color:tc.color, borderRadius:8, padding:'3px 8px', fontSize:'0.68rem', fontWeight:700, backdropFilter:'blur(8px)', boxShadow:'0 1px 6px rgba(0,0,0,0.1)' }}>
            {tc.icon} {tc.label}
          </span>
          <span style={{ background:isAuction?'rgba(217,119,6,0.92)':'rgba(5,150,105,0.92)', color:'#fff', borderRadius:8, padding:'3px 8px', fontSize:'0.68rem', fontWeight:700, backdropFilter:'blur(8px)' }}>
            {isAuction ? '🔨 Enchère' : '🏷️ Prix fixe'}
          </span>
          {lot.blind_lot && (
            <span style={{ background:'rgba(30,30,30,0.85)', color:'#fff', borderRadius:8, padding:'3px 8px', fontSize:'0.65rem', fontWeight:700 }}>
              🙈 Lot aveugle
            </span>
          )}
        </div>

        {/* Badge articles top-right */}
        {(lot.nb_items > 0 || lot.items_count > 0) && (
          <div style={{ position:'absolute', top:10, right:10, background:'rgba(30,61,15,0.8)', color:'#fff', borderRadius:8, padding:'3px 8px', fontSize:'0.7rem', fontWeight:700, backdropFilter:'blur(4px)' }}>
            {lot.nb_items || lot.items_count} article{(lot.nb_items||lot.items_count)>1?'s':''}
          </div>
        )}

        {/* Urgence banner */}
        {urgent && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top, rgba(220,38,38,0.8), transparent)', padding:'1rem 0.8rem 0.5rem', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:'0.7rem', color:'#fff', fontWeight:700, letterSpacing:'0.05em' }}>🔥 FIN IMMINENTE</span>
          </div>
        )}

        {/* Hover overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(30,61,15,0.35) 0%, transparent 55%)', opacity:hovered?1:0, transition:'opacity 0.3s' }}/>
      </div>

      {/* CONTENU */}
      <div style={{ padding:'1.1rem 1.2rem' }}>
        {/* Vendeur */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'0.45rem' }}>
          <span style={{ fontSize:'0.7rem', color:'#7EA86A', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            {lot.seller_company?.substring(0,22)}
          </span>
          {lot.location_city && (
            <span style={{ fontSize:'0.68rem', color:'#9CA3AF' }}>📍 {lot.location_city}</span>
          )}
        </div>

        {/* Titre */}
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:'#1E3D0F', lineHeight:1.35, marginBottom:'0.7rem', minHeight:'2.8rem' }}>
          {lot.title?.substring(0,60)}{lot.title?.length>60?'...':''}
        </h3>

        {/* Séparateur */}
        <div style={{ height:1, background:'linear-gradient(to right,#D9CEBC,transparent)', marginBottom:'0.75rem' }}/>

        {/* Prix / Enchère */}
        {isAuction ? (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'0.5rem' }}>
              <div>
                <div style={{ fontSize:'0.68rem', color:'#9CA3AF', marginBottom:2 }}>Enchère actuelle</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.45rem', fontWeight:700, color:'#D97706', lineHeight:1 }}>
                  {fmt(lot.current_bid || lot.start_price)} <span style={{ fontSize:'0.85rem' }}>MAD</span>
                </div>
              </div>
              {lot.auction_end && <Countdown endDate={lot.auction_end}/>}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'#9CA3AF' }}>
              <span>🔨 {lot.bid_count||0} enchère{lot.bid_count>1?'s':''}</span>
              <span>👁 {lot.watchers_count||0} surveillent</span>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:'#4A7C2F', lineHeight:1 }}>
                {fmt(lot.price)} <span style={{ fontSize:'0.85rem' }}>MAD</span>
              </div>
              {lot.negotiable && <div style={{ fontSize:'0.68rem', color:'#059669', marginTop:2 }}>✓ Prix négociable</div>}
            </div>
            {lot.total_weight_kg && (
              <div style={{ fontSize:'0.7rem', color:'#9CA3AF', textAlign:'right' }}>
                <div>⚖️ {fmt(lot.total_weight_kg)} kg</div>
              </div>
            )}
          </div>
        )}

        {/* CTA hover */}
        <div style={{
          marginTop:'0.85rem', background:'#1E3D0F', color:'#F6F1E7',
          textAlign:'center', padding:'0.55rem', borderRadius:100,
          fontSize:'0.8rem', fontWeight:600, letterSpacing:'0.04em',
          opacity:hovered?1:0, transform:hovered?'translateY(0)':'translateY(6px)',
          transition:'all 0.25s ease', pointerEvents:'none'
        }}>
          {isAuction ? 'Voir l\'enchère →' : 'Voir le lot →'}
        </div>
      </div>
    </Link>
  );
}

export default function LotsPage() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState('');
  const [saleFilter, setSaleFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['lots', typeFilter, saleFilter],
    () => api.get('/lots?' + (typeFilter ? 'type='+typeFilter+'&' : '') + (saleFilter ? 'sale_type='+saleFilter+'&' : '')).then(r => r.data),
    { refetchInterval: 15000 }
  );

  const allLots = data?.lots || [];
  const lots = search
    ? allLots.filter(l => l.title?.toLowerCase().includes(search.toLowerCase()) || l.seller_company?.toLowerCase().includes(search.toLowerCase()))
    : allLots;

  const auctions = lots.filter(l => l.sale_type === 'auction');
  const fixedPrice = lots.filter(l => l.sale_type === 'fixed_price');
  const showAll = !saleFilter;

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'3rem 2rem 2.5rem', position:'relative', overflow:'hidden' }}>
        {/* Décors */}
        <div style={{ position:'absolute', top:-50, right:-50, width:240, height:240, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.18)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:30, right:80, width:140, height:140, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.12)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:80, width:180, height:180, borderRadius:'50%', background:'rgba(74,124,47,0.07)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1.5rem' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(126,168,106,0.15)', border:'1px solid rgba(126,168,106,0.3)', borderRadius:100, padding:'0.3rem 0.9rem', marginBottom:'0.8rem' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block', animation:'pulse 2s infinite' }}/>
                <span style={{ fontSize:'0.72rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Lots Disponibles</span>
              </div>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.8rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, margin:'0 0 0.5rem' }}>
                Marketplace des Lots
              </h1>
              <p style={{ color:'rgba(246,241,231,0.6)', fontSize:'0.92rem', margin:'0 0 1rem' }}>
                {isLoading ? '...' : allLots.length+' lot'+(allLots.length!==1?'s':'')+' · Recyclage · DIY · Industriel · Prix fixe & Enchères'}
              </p>
              <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                {[['♻️','Recyclage matière'],['🔧','DIY & Créatif'],['🏭','Pièces industrielles'],['🔨','Enchères live']].map(([ico,lbl]) => (
                  <span key={lbl} style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.8)', borderRadius:100, padding:'0.25rem 0.75rem', fontSize:'0.72rem', border:'1px solid rgba(255,255,255,0.12)' }}>
                    {ico} {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', alignItems:'flex-end' }}>
              {/* Recherche */}
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:0.6 }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un lot..."
                  style={{ padding:'0.75rem 1rem 0.75rem 2.6rem', borderRadius:100, border:'none', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(12px)', color:'#fff', fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', width:260, boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15)' }}
                />
              </div>
              {user && (
                <Link to="/lots/publier"
                  style={{ background:'#F6F1E7', color:'#1E3D0F', textDecoration:'none', padding:'0.75rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
                  + Publier un lot
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1280, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

        {/* ── FILTRES ── */}
        <div style={{ background:'#fff', borderRadius:16, padding:'1rem 1.2rem', marginBottom:'1.5rem', boxShadow:'0 2px 16px rgba(30,61,15,0.06)', border:'1px solid rgba(30,61,15,0.07)', display:'flex', gap:'0.6rem', flexWrap:'wrap', alignItems:'center' }}>
          {/* Type */}
          <span style={{ fontSize:'0.75rem', color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginRight:4 }}>Type</span>
          {[['','Tous'],['recyclage','♻️ Recyclage'],['diy','🔧 DIY'],['industriel','🏭 Industriel']].map(([val, label]) => (
            <button key={val} onClick={() => setTypeFilter(val)}
              style={{ padding:'0.4rem 1rem', borderRadius:100, border:'1.5px solid '+(typeFilter===val?'#1E3D0F':'#D9CEBC'), background:typeFilter===val?'#1E3D0F':'transparent', color:typeFilter===val?'#F6F1E7':'#5C5C50', fontSize:'0.8rem', fontWeight:typeFilter===val?600:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
              {label}
            </button>
          ))}

          <div style={{ width:1, height:22, background:'#D9CEBC', margin:'0 6px' }}/>

          {/* Mode vente */}
          <span style={{ fontSize:'0.75rem', color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginRight:4 }}>Vente</span>
          {[['','Tous'],['fixed_price','🏷️ Prix fixe'],['auction','🔨 Enchères']].map(([val, label]) => (
            <button key={val} onClick={() => setSaleFilter(val)}
              style={{ padding:'0.4rem 1rem', borderRadius:100, border:'1.5px solid '+(saleFilter===val?'#1E3D0F':'#D9CEBC'), background:saleFilter===val?'#1E3D0F':'transparent', color:saleFilter===val?'#F6F1E7':'#5C5C50', fontSize:'0.8rem', fontWeight:saleFilter===val?600:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
              {label}
            </button>
          ))}

          <div style={{ marginLeft:'auto', fontSize:'0.82rem', color:'#9CA3AF' }}>
            {lots.length} résultat{lots.length!==1?'s':''}
          </div>
        </div>

        {/* ── CHARGEMENT SKELETON ── */}
        {isLoading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'1.5rem' }}>
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ borderRadius:20, overflow:'hidden', background:'#fff', border:'1px solid rgba(30,61,15,0.06)' }}>
                <div style={{ height:180, background:'linear-gradient(90deg,#EDE6D3 25%,#F6F1E7 50%,#EDE6D3 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
                <div style={{ padding:'1.1rem' }}>
                  <div style={{ height:11, background:'#EDE6D3', borderRadius:100, marginBottom:8, width:'55%' }}/>
                  <div style={{ height:17, background:'#EDE6D3', borderRadius:100, marginBottom:14, width:'80%' }}/>
                  <div style={{ height:22, background:'#EDE6D3', borderRadius:100, width:'45%' }}/>
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}

        {/* ── VIDE ── */}
        {!isLoading && lots.length === 0 && (
          <div style={{ textAlign:'center', padding:'5rem 2rem', background:'#fff', borderRadius:20, border:'1px solid rgba(30,61,15,0.06)' }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:0.25 }}>📦</div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F', marginBottom:'0.5rem' }}>Aucun lot disponible</h3>
            <p style={{ color:'#9CA3AF', fontSize:'0.9rem', marginBottom:'1.5rem' }}>Modifiez vos filtres ou revenez plus tard</p>
            {user && (
              <Link to="/lots/publier"
                style={{ display:'inline-block', background:'#1E3D0F', color:'#F6F1E7', padding:'0.75rem 2rem', borderRadius:100, textDecoration:'none', fontWeight:600, fontSize:'0.9rem' }}>
                Publier le premier lot →
              </Link>
            )}
          </div>
        )}

        {/* ── SECTION ENCHÈRES ── */}
        {!isLoading && (showAll || saleFilter === 'auction') && auctions.length > 0 && (
          <div style={{ marginBottom:'2.5rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'1.2rem' }}>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'#FEF3C7', borderRadius:10, padding:'4px 8px', fontSize:'1rem' }}>🔨</span>
                Enchères en cours
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', color:'#9CA3AF', fontWeight:400 }}>{auctions.length} lot{auctions.length>1?'s':''}</span>
              </h2>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
                <span style={{ fontSize:'0.75rem', color:'#DC2626', fontWeight:600 }}>Live</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'1.2rem' }}>
              {auctions.map(lot => <LotCard key={lot.id} lot={lot}/>)}
            </div>
          </div>
        )}

        {/* ── SECTION PRIX FIXE ── */}
        {!isLoading && (showAll || saleFilter === 'fixed_price') && fixedPrice.length > 0 && (
          <div>
            {showAll && auctions.length > 0 && (
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F', marginBottom:'1.2rem', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'#ECFDF5', borderRadius:10, padding:'4px 8px', fontSize:'1rem' }}>🏷️</span>
                Prix fixe
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', color:'#9CA3AF', fontWeight:400 }}>{fixedPrice.length} lot{fixedPrice.length>1?'s':''}</span>
              </h2>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'1.2rem' }}>
              {fixedPrice.map(lot => <LotCard key={lot.id} lot={lot}/>)}
            </div>
          </div>
        )}

        {/* Si filtre sale_type mais section vide */}
        {!isLoading && !showAll && lots.length > 0 && auctions.length === 0 && fixedPrice.length === 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'1.2rem' }}>
            {lots.map(lot => <LotCard key={lot.id} lot={lot}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
