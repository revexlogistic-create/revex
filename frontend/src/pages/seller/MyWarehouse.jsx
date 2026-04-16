// src/pages/seller/MyWarehouse.jsx — Mon stock chez REVEX
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/ui/BackButton';
import { generateCertificatePdf } from '../../utils/generateCertificate';
import { generateQualityReportPdf } from '../../utils/generateQualityReport';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const GRADE_COLORS = { 'A+':C.eco, A:C.blue, B:C.orange, C:C.urgent, D:'#7F8C8D' };
const STATUS_CONFIG = {
  active:   { label:'🟢 Actif',      color:C.eco,    bg:'#E8F8EE' },
  draft:    { label:'⬜ Brouillon',   color:C.muted,  bg:C.beige   },
  sold:     { label:'🔵 Vendu',       color:C.blue,   bg:'#EBF5FB' },
  archived: { label:'⬛ Archivé',     color:'#7F8C8D',bg:'#F2F3F4' },
  inactive: { label:'🔴 Inactif',     color:C.urgent, bg:'#FDECEA' },
};

const fmt  = n => Number(n||0).toLocaleString('fr-MA');
const fmtK = n => { const v = Number(n||0); return v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toString(); };
const parseImgs = (images) => {
  if (Array.isArray(images)) return images;
  try { return JSON.parse(images) || []; } catch { return []; }
};
const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / (1000*60*60*24));

export default function MyWarehouse() {
  const { user } = useAuth();
  const [search,       setSearch]       = useState('');

  const [viewMode,     setViewMode]     = useState('cards');
  const [articleSearch, setArticleSearch] = useState('');
  const [articleStatus, setArticleStatus] = useState(''); // cards | table
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [showStorageModal, setShowStorageModal] = useState(false);

  // ── Articles réellement stockés chez REVEX ────────────────
  const { data: articlesData, isLoading, refetch: refetchArticles } = useQuery(
    ['my-revex-articles', articleStatus, articleSearch],
    () => api.get(
      '/warehouse-articles/my' +
      (articleStatus ? '?status=' + articleStatus : '') +
      (articleSearch ? (articleStatus ? '&' : '?') + 'search=' + encodeURIComponent(articleSearch) : '')
    ).then(r => r.data).catch(() => ({ articles:[], stats:{} })),
    { staleTime: 20000 }
  );
  const revexArticles = articlesData?.articles || [];
  const revexStats    = articlesData?.stats    || {};

  // filtered = alias de revexArticles (filtrage géré côté serveur)
  const filtered = revexArticles;

  // ── Demandes de stockage en cours ──────────────────────────
  const { data: storageData, refetch: refetchStorage } = useQuery(
    'my-storage-requests',
    () => api.get('/storage/my').then(r => r.data).catch(() => ({ requests:[] })),
    { staleTime: 30000 }
  );
  const storageRequests = storageData?.requests || [];



  // ── Métriques globales ─────────────────────────────────────
  // Métriques basées sur les articles réellement stockés chez REVEX
  const metrics = useMemo(() => ({
    active:   revexStats.en_stock || 0,
    sold:     revexStats.expedie  || 0,
    draft:    revexStats.reserve  || 0,
    dormant:  revexArticles.filter(a => daysSince(a.entree_date || a.created_at) >= 90).length,
    totalVal: revexStats.total_val || 0,
    soldVal:  0,
  }), [revexStats, revexArticles]);

  // ── Filtrage & tri ─────────────────────────────────────────


  // ── Sélection multiple ─────────────────────────────────────

  const selectAll = () => setSelectedIds(revexArticles.map(a => a.id));
  const clearSel = () => setSelectedIds([]);

  // ── Alerte dormance ────────────────────────────────────────
  const getDormanceAlert = (a) => {
    const days = daysSince(a.entree_date || a.created_at);
    if (days >= 365) return { level:'red',    label:'🔴 +1 an en entrepôt', desc:'Article très long stockage' };
    if (days >= 180) return { level:'orange', label:'🟠 +6 mois',           desc:'Envisager une mise en vente' };
    if (days >= 90)  return { level:'yellow', label:'🟡 +90 jours',         desc:'Présent depuis 3 mois' };
    return null;
  };

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'2.5rem 2rem 2rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:220, height:220, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.18)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:60, width:150, height:150, borderRadius:'50%', background:'rgba(74,124,47,0.06)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ marginBottom:'1rem' }}><BackButton to="/seller" label="Dashboard" /></div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(126,168,106,0.15)', border:'1px solid rgba(126,168,106,0.3)', borderRadius:100, padding:'0.25rem 0.8rem', marginBottom:'0.7rem' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block' }}/>
                <span style={{ fontSize:'0.7rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Gestion Inventaire</span>
              </div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.3rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, marginBottom:'0.3rem' }}>
                🏭 Mon Stock chez REVEX
              </h1>
              <p style={{ color:'rgba(246,241,231,0.6)', fontSize:'0.9rem' }}>
                {user?.company_name} · Inventaire complet et traçabilité de vos PDR
              </p>
            </div>
            <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
              <button onClick={() => setShowStorageModal(true)}
                style={{ background:'rgba(255,255,255,0.1)', color:'#F6F1E7', border:'1px solid rgba(255,255,255,0.2)', padding:'0.7rem 1.3rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                🏢 Stocker chez REVEX
              </button>
              <Link to="/seller/inventaire"
                style={{ background:'rgba(139,92,246,0.2)', color:'#DDD6FE', border:'1px solid rgba(139,92,246,0.4)', padding:'0.7rem 1.3rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', textDecoration:'none', fontFamily:"'DM Sans',sans-serif", display:'inline-flex', alignItems:'center', gap:'0.4rem' }}>
                🔍 Demander un inventaire
              </Link>
              <Link to="/seller/publier"
                style={{ background:'#F6F1E7', color:'#1E3D0F', textDecoration:'none', padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem' }}>
                + Publier un PDR
              </Link>
            </div>
          </div>

          {/* KPIs dans le hero */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.75rem', marginTop:'1.8rem' }}>
            {[
              { icon:'📦', label:'Articles stockés',  value:revexStats.total    || 0,                          color:'#F6F1E7' },
              { icon:'🟢', label:'En stock',           value:revexStats.en_stock || 0,                          color:'#6EE7B7' },
              { icon:'🔒', label:'Réservés',           value:revexStats.reserve  || 0,                          color:'#93C5FD' },
              { icon:'🚛', label:'Expédiés',           value:revexStats.expedie  || 0,                          color:'#FCD34D' },
              { icon:'💰', label:'Valeur stockée',     value:fmtK(revexStats.total_val||0)+' MAD',              color:'rgba(246,241,231,0.7)' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'0.9rem', textAlign:'center', backdropFilter:'blur(4px)' }}>
                <div style={{ fontSize:'1.2rem', marginBottom:'0.3rem' }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.5)', marginTop:'0.2rem' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

        {/* ── Alertes dormance ── */}
        {revexArticles.filter(a => daysSince(a.entree_date||a.created_at)>=90).length > 0 && (
          <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1.5rem', display:'flex', gap:'0.8rem', alignItems:'center' }}>
            <span style={{ fontSize:'1.3rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#92400E', marginBottom:2 }}>
                {revexArticles.filter(a=>daysSince(a.entree_date||a.created_at)>=90).length} article(s) stocké(s) depuis +90 jours
              </div>
              <div style={{ fontSize:'0.78rem', color:'#B45309' }}>
                Ces PDR risquent de perdre de la valeur. Réduisez le prix, améliorez les photos, ou utilisez l'analyse CCOM pour prioriser.
              </div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:'0.5rem', flexShrink:0 }}>
              <Link to="/seller/analyse"
                style={{ background:'#D97706', color:'#fff', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', textDecoration:'none', fontWeight:600 }}>
                🔬 Analyser CCOM
              </Link>
            </div>
          </div>
        )}

        {/* ── Barre de filtres ── */}
        <div style={{ background:C.white, borderRadius:16, padding:'1rem 1.2rem', marginBottom:'1.2rem', display:'flex', gap:'0.7rem', flexWrap:'wrap', alignItems:'center', border:'1px solid '+C.mid, boxShadow:'0 2px 12px rgba(30,61,15,0.05)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Titre, référence, ville..."
            style={{ flex:1, minWidth:180, padding:'0.5rem 1rem', border:'1.5px solid '+C.mid, borderRadius:100, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream }} />

          <select value={articleStatus} onChange={e => setArticleStatus(e.target.value)}
            style={{ padding:'0.5rem 0.9rem', border:'1px solid '+C.mid, borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, cursor:'pointer' }}>
            <option value="">Tous les statuts</option>
            <option value="en_stock">🟢 En stock</option>
            <option value="reserve">🔒 Réservé</option>
            <option value="expedie">🚛 Expédié</option>
            <option value="sorti">📤 Sorti</option>
          </select>

          <select value={articleStatus} onChange={e => setGradeFilter(e.target.value)}
            style={{ padding:'0.5rem 0.9rem', border:'1px solid '+C.mid, borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, cursor:'pointer' }}>
            <option value="">Tous les grades</option>
            {['A+','A','B','C','D'].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>


          <div style={{ display:'flex', border:'1px solid '+C.mid, borderRadius:100, overflow:'hidden' }}>
            {[['cards','▦'],['table','☰']].map(([m, icon]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding:'0.45rem 0.85rem', border:'none', background:viewMode===m?C.forest:'transparent', color:viewMode===m?C.cream:C.muted, cursor:'pointer', fontSize:'0.9rem' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Barre sélection ── */}
        {selectedIds.length > 0 && (
          <div style={{ background:C.forest, borderRadius:12, padding:'0.75rem 1.2rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
            <span style={{ color:C.cream, fontSize:'0.85rem', fontWeight:600 }}>
              {selectedIds.length} article{selectedIds.length>1?'s':''} sélectionné{selectedIds.length>1?'s':''}
            </span>
            <div style={{ display:'flex', gap:'0.5rem', marginLeft:'auto', flexWrap:'wrap' }}>
              <button onClick={() => toast.info('Export en cours...')}
                style={{ background:'rgba(255,255,255,0.12)', color:C.cream, border:'1px solid rgba(255,255,255,0.2)', padding:'0.35rem 0.9rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                📥 Exporter sélection
              </button>
              <button onClick={clearSel}
                style={{ background:'transparent', color:'rgba(246,241,231,0.6)', border:'1px solid rgba(255,255,255,0.15)', padding:'0.35rem 0.7rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer' }}>
                ✕ Désélectionner
              </button>
            </div>
          </div>
        )}

        {/* ── Compteur ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem' }}>
          <div style={{ fontSize:'0.82rem', color:C.muted }}>
            {isLoading ? 'Chargement...' : filtered.length+' article'+(filtered.length!==1?'s':'')+' · Valeur totale : '+fmt(filtered.reduce((s,p) => s+(Number(p.unit_price||0)*Number(p.quantity||0)),0))+' MAD'}
          </div>
          <button onClick={selectAll} style={{ fontSize:'0.78rem', color:C.leaf, background:'transparent', border:'none', cursor:'pointer', textDecoration:'underline', fontFamily:"'DM Sans',sans-serif" }}>
            Tout sélectionner
          </button>
        </div>

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background:C.white, borderRadius:18, overflow:'hidden', border:'1px solid '+C.mid }}>
                <div style={{ height:160, background:C.beige }} />
                <div style={{ padding:'1rem' }}>
                  <div style={{ height:12, background:C.beige, borderRadius:100, marginBottom:8, width:'70%' }} />
                  <div style={{ height:12, background:C.beige, borderRadius:100, width:'40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Vide ── */}
        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'5rem 2rem', background:C.white, borderRadius:20, border:'1px solid '+C.mid }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:0.2 }}>📦</div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'0.5rem' }}>
              {articleSearch || articleStatus ? 'Aucun résultat pour ce filtre' : 'Aucun article stocké chez REVEX'}
            </h3>
            <p style={{ color:C.muted, marginBottom:'1.5rem', fontSize:'0.9rem' }}>
              {search ? 'Modifiez vos filtres' : 'Publiez votre premier PDR pour commencer à vendre'}
            </p>
            <Link to="/seller/publier"
              style={{ background:C.forest, color:C.cream, padding:'0.8rem 2rem', borderRadius:100, textDecoration:'none', fontWeight:600, fontSize:'0.9rem' }}>
              + Publier un PDR
            </Link>
          </div>
        )}

        {/* ════════════════ VUE CARTES ════════════════ */}
        {!isLoading && viewMode === 'cards' && filtered.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'1.1rem' }}>
            {filtered.map(p => {
              const imgs    = parseImgs(p.images);
              const st      = STATUS_CONFIG[p.status] || { label:p.status, color:C.muted, bg:C.beige };
              const gc      = GRADE_COLORS[p.quality_grade];
              const alert   = getDormanceAlert(p);
              const days    = daysSince(p.created_at);
              const value   = Number(p.price||0) * Number(p.quantity||0);
              const sel     = selectedIds.includes(p.id);

              return (
                <div key={p.id}
                  style={{ background:C.white, borderRadius:18, overflow:'hidden', border:'2px solid '+(sel ? C.forest : C.mid), transition:'all 0.2s', cursor:'pointer', boxShadow: sel ? '0 0 0 3px rgba(30,61,15,0.15)' : '0 2px 12px rgba(30,61,15,0.05)' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.boxShadow='0 8px 28px rgba(30,61,15,0.12)'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.boxShadow='0 2px 12px rgba(30,61,15,0.05)'; }}>

                  {/* Image */}
                  <div style={{ height:160, background:C.beige, position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {imgs[0]
                      ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                      : <span style={{ fontSize:'3rem', opacity:0.15 }}>📦</span>}

                    {/* Checkbox sélection */}
                    <div onClick={() => toggleSelect(p.id)}
                      style={{ position:'absolute', top:10, left:10, width:22, height:22, borderRadius:6, background:sel?C.forest:'rgba(255,255,255,0.85)', border:'2px solid '+(sel?C.forest:C.mid), display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:2 }}>
                      {sel && <span style={{ color:'#fff', fontSize:'0.75rem', fontWeight:700 }}>✓</span>}
                    </div>

                    {/* Badges */}
                    <div style={{ position:'absolute', top:10, right:10, display:'flex', flexDirection:'column', gap:3, alignItems:'flex-end' }}>
                      <span style={{ background:st.bg, color:st.color, padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.65rem', fontWeight:700 }}>{st.label}</span>
                      {gc && <span style={{ background:gc+'dd', color:'#fff', padding:'0.15rem 0.45rem', borderRadius:100, fontSize:'0.65rem', fontWeight:700 }}>Grade {p.quality_grade}</span>}
                    </div>

                    {/* Vues */}
                    <div style={{ position:'absolute', bottom:8, right:10, background:'rgba(30,61,15,0.75)', color:'#fff', borderRadius:100, padding:'0.12rem 0.5rem', fontSize:'0.65rem' }}>
                      👁 {p.views_count||0}
                    </div>

                    {/* Alerte dormance */}
                    {alert && (
                      <div style={{ position:'absolute', bottom:8, left:10, background: alert.level==='red'?'rgba(192,57,43,0.9)':alert.level==='orange'?'rgba(230,126,34,0.9)':'rgba(243,156,18,0.9)', color:'#fff', borderRadius:100, padding:'0.12rem 0.55rem', fontSize:'0.63rem', fontWeight:600 }}>
                        {alert.label}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div style={{ padding:'0.9rem 1rem' }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.forest, fontSize:'0.95rem', lineHeight:1.3, marginBottom:'0.2rem' }}>
                      {p.title?.substring(0,45)}{p.title?.length>45?'...':''}
                    </div>
                    {p.reference && (
                      <div style={{ fontSize:'0.7rem', color:C.muted, fontFamily:'monospace', marginBottom:'0.4rem' }}>
                        Réf: {p.reference}
                      </div>
                    )}

                    {/* Métriques */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.4rem', marginBottom:'0.7rem' }}>
                      {[
                        { label:'Prix unit.', value: p.price_on_request ? 'Sur devis' : fmt(p.price)+' MAD', color:C.leaf },
                        { label:'Quantité', value: (p.quantity||0)+' '+(p.unit||'u.'), color: p.quantity<3?C.urgent:C.forest },
                        { label:'Valeur totale', value: p.price_on_request ? '—' : fmt(value)+' MAD', color:C.forest },
                      ].map(m => (
                        <div key={m.label} style={{ background:C.cream, borderRadius:8, padding:'0.35rem 0.5rem', textAlign:'center' }}>
                          <div style={{ fontSize:'0.63rem', color:C.muted }}>{m.label}</div>
                          <div style={{ fontSize:'0.75rem', fontWeight:700, color:m.color, marginTop:1 }}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Infos secondaires */}
                    <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap', fontSize:'0.7rem', color:C.muted, marginBottom:'0.7rem' }}>
                      {p.location_city && <span>📍 {p.location_city}</span>}
                      {p.category_name && <span>🏷️ {p.category_name}</span>}
                      <span style={{ color: days>365?C.urgent:days>90?C.orange:C.eco, fontWeight:600 }}>
                        📅 {days}j
                      </span>
                      {p.revex_certified && <span style={{ color:C.eco, fontWeight:600 }}>✓ Certifié</span>}
                      {p.favorites_count > 0 && <span>❤️ {p.favorites_count}</span>}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                      <Link to={'/seller/publier/'+p.id}
                        style={{ flex:1, background:C.beige, color:C.forest, textDecoration:'none', padding:'0.42rem', borderRadius:100, fontSize:'0.73rem', textAlign:'center', fontWeight:500 }}>
                        ✏️ Modifier
                      </Link>
                      <Link to={'/produit/'+p.slug}
                        style={{ background:C.beige, color:C.forest, textDecoration:'none', padding:'0.42rem 0.65rem', borderRadius:100, fontSize:'0.73rem' }}>
                        👁
                      </Link>
                      <button
                        onClick={() => generateQualityReportPdf({
                          productTitle: p.title, reference: p.reference, grade: p.quality_grade,
                          quantity: p.quantity, unit: p.unit, price: p.price,
                          sellerCompany: user?.company_name, locationCity: p.location_city,
                          createdAt: p.created_at,
                        })}
                        style={{ background:'#F0FDF4', color:'#059669', border:'none', padding:'0.42rem 0.65rem', borderRadius:100, fontSize:'0.73rem', cursor:'pointer' }}
                        title="Rapport qualité">
                        🔬
                      </button>
                      {(p.status === 'sold' || p.revex_certified) && (
                        <button
                          onClick={() => generateCertificatePdf({
                            type:'product', id:p.id, title:p.title, reference:p.reference,
                            grade:p.quality_grade, price:p.price, quantity:p.quantity, unit:p.unit,
                            sellerCompany:user?.company_name, locationCity:p.location_city, createdAt:p.created_at,
                          })}
                          style={{ background:'#EFF6FF', color:'#1D4ED8', border:'none', padding:'0.42rem 0.65rem', borderRadius:100, fontSize:'0.73rem', cursor:'pointer' }}
                          title="Certificat">
                          📜
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════ VUE TABLEAU ════════════════ */}
        {!isLoading && viewMode === 'table' && filtered.length > 0 && (
          <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'32px 50px 2.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr', gap:'0.4rem', padding:'0.75rem 1rem', background:C.beige, borderBottom:'1px solid '+C.mid, fontSize:'0.68rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', alignItems:'center' }}>
              <div></div>
              <div>Photo</div>
              <div>Désignation</div>
              <div>Grade</div>
              <div>Prix</div>
              <div>Qté</div>
              <div>Vues</div>
              <div>Jours</div>
              <div>Statut</div>
              <div>Documents</div>
            </div>

            {filtered.map((p, i) => {
              const imgs  = parseImgs(p.images);
              const st    = STATUS_CONFIG[p.status] || { label:p.status, color:C.muted, bg:C.beige };
              const gc    = GRADE_COLORS[p.quality_grade];
              const days  = daysSince(p.created_at);
              const alert = getDormanceAlert(p);
              const sel   = selectedIds.includes(p.id);

              return (
                <div key={p.id} style={{ display:'grid', gridTemplateColumns:'32px 50px 2.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr', gap:'0.4rem', padding:'0.7rem 1rem', borderBottom:'1px solid '+C.beige, alignItems:'center', background: sel?'rgba(30,61,15,0.04)':i%2===0?C.white:C.cream }}>

                  {/* Checkbox */}
                  <div onClick={() => toggleSelect(p.id)}
                    style={{ width:18, height:18, borderRadius:4, background:sel?C.forest:'transparent', border:'2px solid '+(sel?C.forest:C.mid), display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                    {sel && <span style={{ color:'#fff', fontSize:'0.6rem', fontWeight:700 }}>✓</span>}
                  </div>

                  {/* Photo */}
                  <div style={{ width:42, height:42, borderRadius:8, overflow:'hidden', background:C.beige, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {imgs[0] ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'}/> : <span style={{ fontSize:'1.2rem', opacity:0.2 }}>📦</span>}
                  </div>

                  {/* Titre */}
                  <div>
                    <Link to={'/produit/'+p.slug} style={{ fontSize:'0.83rem', fontWeight:600, color:C.forest, textDecoration:'none', display:'block', lineHeight:1.3 }}>
                      {p.title?.substring(0,42)}{p.title?.length>42?'...':''}
                    </Link>
                    <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:1 }}>
                      {p.reference && 'Réf: '+p.reference}
                      {p.location_city && ' · 📍 '+p.location_city}
                    </div>
                    {alert && <span style={{ fontSize:'0.62rem', color:alert.level==='red'?C.urgent:C.orange, fontWeight:600 }}>{alert.label}</span>}
                  </div>

                  {/* Grade */}
                  <div>
                    {gc && <span style={{ background:gc+'22', color:gc, padding:'0.15rem 0.55rem', borderRadius:100, fontSize:'0.72rem', fontWeight:700 }}>Grade {p.quality_grade}</span>}
                  </div>

                  {/* Prix */}
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.leaf, fontSize:'0.9rem' }}>
                    {p.price_on_request ? 'Devis' : fmt(p.price)+' MAD'}
                  </div>

                  {/* Qté */}
                  <div style={{ fontWeight:600, color:p.quantity<3?C.urgent:C.forest, fontSize:'0.85rem' }}>
                    {p.quantity||0}<span style={{ fontSize:'0.7rem', color:C.muted, fontWeight:400 }}> {p.unit||'u.'}</span>
                  </div>

                  {/* Vues */}
                  <div style={{ fontSize:'0.82rem', color:C.muted, textAlign:'center' }}>{p.views_count||0}</div>

                  {/* Jours */}
                  <div style={{ fontSize:'0.82rem', fontWeight:600, color:days>365?C.urgent:days>90?C.orange:C.eco, textAlign:'center' }}>
                    {days}j
                  </div>

                  {/* Statut */}
                  <div>
                    <span style={{ background:st.bg, color:st.color, padding:'0.18rem 0.55rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600, whiteSpace:'nowrap' }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Documents */}
                  <div style={{ display:'flex', gap:'0.3rem' }}>
                    <button onClick={() => generateQualityReportPdf({ productTitle:p.title, reference:p.reference, grade:p.quality_grade, quantity:p.quantity, unit:p.unit, price:p.price, sellerCompany:user?.company_name, locationCity:p.location_city, createdAt:p.created_at })}
                      style={{ background:'#F0FDF4', color:'#059669', border:'none', padding:'0.28rem 0.55rem', borderRadius:100, fontSize:'0.7rem', cursor:'pointer' }} title="Rapport qualité">
                      🔬
                    </button>
                    <button onClick={() => generateCertificatePdf({ type:'product', id:p.id, title:p.title, reference:p.reference, grade:p.quality_grade, price:p.price, quantity:p.quantity, unit:p.unit, sellerCompany:user?.company_name, locationCity:p.location_city, createdAt:p.created_at })}
                      style={{ background:'#EFF6FF', color:'#1D4ED8', border:'none', padding:'0.28rem 0.55rem', borderRadius:100, fontSize:'0.7rem', cursor:'pointer' }} title="Certificat">
                      📜
                    </button>
                    <Link to={'/seller/publier/'+p.id}
                      style={{ background:C.beige, color:C.forest, textDecoration:'none', padding:'0.28rem 0.55rem', borderRadius:100, fontSize:'0.7rem' }} title="Modifier">
                      ✏️
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer ── */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.8rem', color:C.muted }}>
            {filtered.length} article(s) · Valeur totale : <strong style={{ color:C.forest }}>{fmt(filtered.reduce((s,p) => s+(Number(p.unit_price||0)*Number(p.quantity||0)),0))} MAD</strong>
          </div>
        )}

        {/* ── Mes demandes de stockage ── */}
        {storageRequests.length > 0 && (
          <div style={{ marginTop:'2.5rem' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.forest, marginBottom:'1rem' }}>
              🏢 Mes demandes de stockage chez REVEX
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {storageRequests.map(req => {
                const ST = {
                  pending:   { label:'⏳ En attente de confirmation', color:C.orange, bg:'#FEF5E7' },
                  confirmed: { label:'✅ Confirmée — dépôt à planifier', color:C.blue, bg:'#EBF5FB' },
                  active:    { label:'🟢 Stock actif en entrepôt REVEX', color:C.eco, bg:'#E8F8EE' },
                  completed: { label:'🔵 Terminée', color:'#8B5CF6', bg:'#F3E8FF' },
                  rejected:  { label:'❌ Refusée', color:C.urgent, bg:'#FDECEA' },
                };
                const st = ST[req.status] || ST.pending;
                const days = Math.floor((Date.now() - new Date(req.created_at).getTime()) / (1000*60*60*24));
                return (
                  <div key={req.id} style={{ background:C.white, border:'1.5px solid '+(req.status==='pending'?C.orange:req.status==='active'?C.eco:C.mid), borderRadius:16, overflow:'hidden', boxShadow:'0 2px 8px rgba(30,61,15,0.05)' }}>
                    <div style={{ padding:'0.9rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.6rem' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:C.forest }}>
                            {req.company_name || req.companyName}
                          </span>
                          <span style={{ fontFamily:'monospace', fontSize:'0.7rem', color:C.muted }}>
                            {req.id?.substring(0,8).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:2 }}>
                          📍 {req.city} · 📐 ~{req.estimated_vol||'?'} m³ · 📅 {days}j
                          {req.start_date && ' · Dépôt : '+new Date(req.start_date).toLocaleDateString('fr-MA')}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                        <span style={{ background:st.bg, color:st.color, padding:'0.25rem 0.8rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700 }}>
                          {st.label}
                        </span>
                        {req.estimated_revenue && (
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:C.leaf }}>
                            ~{Number(req.estimated_revenue).toLocaleString('fr-MA')} MAD/mois
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Services demandés */}
                    <div style={{ padding:'0.5rem 1.2rem', background:C.cream, borderTop:'1px solid '+C.beige, display:'flex', gap:'1rem', fontSize:'0.75rem', color:C.muted, flexWrap:'wrap' }}>
                      {req.want_photos    && <span>📸 Photos</span>}
                      {req.want_certif    && <span>📜 Certification</span>}
                      {req.want_inventory && <span>📊 Inventaire</span>}
                      {req.want_picking   && <span>📦 Picking</span>}
                      <span>🚛 {req.delivery_mode==='self'?'Dépôt direct':req.delivery_mode==='revex'?'Collecte REVEX':'Transporteur'}</span>
                      <span>{req.storage_type==='court'?'Court terme':req.storage_type==='long'?'Long terme':'Indéfini'}</span>
                      {req.admin_notes && (
                        <span style={{ color:req.status==='rejected'?C.urgent:C.blue, fontWeight:600, marginLeft:'auto' }}>
                          💬 REVEX : {req.admin_notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL STOCKAGE REVEX ── */}
      {showStorageModal && (
        <StorageProcedureModal
          onClose={() => { setShowStorageModal(false); refetchStorage(); }}
          products={revexArticles}
        />
      )}
    </div>
  );
}

// ── Composant procédure complète de stockage ──────────────────
function StorageProcedureModal({ onClose, products }) {
  const C = {
    forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
    cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
  };

  const STEPS = [
    { id:1, icon:'📋', label:'Demande',       desc:'Informations de base' },
    { id:2, icon:'📦', label:'Articles',       desc:'Sélection du stock' },
    { id:3, icon:'🚛', label:'Livraison',      desc:'Mode d\'acheminement' },
    { id:4, icon:'📜', label:'Conditions',     desc:'Contrat & tarifs' },
    { id:5, icon:'✅', label:'Confirmation',   desc:'Récapitulatif & envoi' },
  ];

  const [step,    setStep]    = useState(1);
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    // Étape 1
    contactName:   '',
    contactPhone:  '',
    contactEmail:  '',
    companyName:   '',
    city:          '',
    storageType:   'court', // court | long | indefini
    startDate:     '',
    // Étape 2
    selectedItems: [],
    customItems:   '', // articles non publiés
    estimatedVol:  '',
    estimatedQty:  '',
    // Étape 3
    deliveryMode:  'self', // self | revex | transporter
    deliveryDate:  '',
    deliveryNotes: '',
    // Étape 4
    acceptConditions: false,
    acceptTarifs:     false,
    acceptAssurance:  false,
    // Services optionnels
    wantPhotos:    true,
    wantCertif:    true,
    wantInventory: true,
    wantPicking:   false,
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleItem = (id) => set('selectedItems', form.selectedItems.includes(id) ? form.selectedItems.filter(x => x!==id) : [...form.selectedItems, id]);

  // Calcul tarif estimé
  const estimatedCost = () => {
    const vol  = Number(form.estimatedVol)  || (form.selectedItems.length * 0.1);
    const base = Math.max(1, vol) * 15;
    const opts = (form.wantPhotos?150:0) + (form.wantCertif?100:0) + (form.wantInventory?200:0) + (form.wantPicking?50:0);
    return { base: Math.round(base), opts, total: Math.round(base + opts) };
  };
  const cost = estimatedCost();

  const canNext = () => {
    if (step===1) return form.contactName && form.contactPhone && form.city;
    if (step===2) return form.selectedItems.length > 0 || form.customItems.trim();
    if (step===3) return form.deliveryMode && (form.deliveryMode === 'self' || form.deliveryDate);
    if (step===4) return form.acceptConditions && form.acceptTarifs && form.acceptAssurance;
    return true;
  };

  const submit = async () => {
    setSending(true);
    try {
      await api.post('/storage', {
        contactName:        form.contactName,
        companyName:        form.companyName,
        contactPhone:       form.contactPhone,
        contactEmail:       form.contactEmail,
        city:               form.city,
        storageType:        form.storageType,
        startDate:          form.startDate || null,
        selectedProductIds: form.selectedItems,
        customItems:        form.customItems,
        estimatedVol:       form.estimatedVol ? Number(form.estimatedVol) : null,
        estimatedQty:       form.estimatedQty ? Number(form.estimatedQty) : null,
        wantPhotos:         form.wantPhotos,
        wantCertif:         form.wantCertif,
        wantInventory:      form.wantInventory,
        wantPicking:        form.wantPicking,
        deliveryMode:       form.deliveryMode,
        deliveryDate:       form.deliveryDate || null,
        deliveryNotes:      form.deliveryNotes,
      });
      setSending(false);
      setDone(true);
      toast.success('✅ Demande de stockage envoyée ! Notre équipe vous contacte sous 24h.');
    } catch (err) {
      setSending(false);
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi. Réessayez.');
    }
  };

  if (done) return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.white, borderRadius:24, maxWidth:480, width:'100%', padding:'3rem 2rem', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>🎉</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:C.forest, marginBottom:'0.5rem' }}>
          Demande envoyée avec succès !
        </div>
        <p style={{ fontSize:'0.9rem', color:C.muted, lineHeight:1.7, marginBottom:'1.5rem' }}>
          L'équipe REVEX vous contactera sous <strong>24 heures ouvrables</strong> au <strong>{form.contactPhone}</strong> pour confirmer votre demande et vous transmettre le bon de dépôt officiel.
        </p>
        <div style={{ background:C.beige, borderRadius:14, padding:'1rem', marginBottom:'1.5rem', textAlign:'left' }}>
          <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.forest, marginBottom:'0.6rem' }}>📋 Récapitulatif</div>
          <div style={{ fontSize:'0.82rem', color:C.muted, lineHeight:1.8 }}>
            📦 {form.selectedItems.length} article(s) sélectionné(s)<br/>
            📍 Livraison : {form.deliveryMode==='self'?'Dépôt direct à l\'entrepôt':form.deliveryMode==='revex'?'Collecte par REVEX':'Transporteur personnel'}<br/>
            🗓️ Date souhaitée : {form.deliveryDate || 'À définir'}<br/>
            💰 Estimation : ~{cost.total} MAD/mois
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:C.forest, color:C.cream, border:'none', padding:'0.9rem 2.5rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          Fermer
        </button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#F6F1E7', borderRadius:24, maxWidth:600, width:'100%', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', margin:'auto', maxHeight:'95vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.4rem 1.8rem', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#F6F1E7' }}>
                🏢 Procédure de Stockage REVEX
              </div>
              <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)', marginTop:2 }}>
                Entrepôts industriels sécurisés · Conditions adaptées PDR
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              ✕
            </button>
          </div>

          {/* Stepper */}
          <div style={{ display:'flex', gap:0, alignItems:'center' }}>
            {STEPS.map((s, i) => {
              const done2  = step > s.id;
              const active = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:done2?'#27AE60':active?'#F6F1E7':'rgba(255,255,255,0.15)', border:'2px solid '+(done2?'#27AE60':active?'#F6F1E7':'rgba(255,255,255,0.25)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', color:done2?'#fff':active?C.forest:'rgba(246,241,231,0.5)', fontWeight:700, transition:'all 0.3s', marginBottom:4 }}>
                      {done2 ? '✓' : s.icon}
                    </div>
                    <div style={{ fontSize:'0.62rem', color:active?'#F6F1E7':done2?'#6EE7B7':'rgba(246,241,231,0.4)', fontWeight:active?700:400, textAlign:'center', lineHeight:1.2 }}>
                      {s.label}
                    </div>
                  </div>
                  {i < STEPS.length-1 && (
                    <div style={{ width:20, height:2, background:done2?'#27AE60':'rgba(255,255,255,0.15)', flexShrink:0, marginBottom:14 }}/>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div style={{ overflowY:'auto', flex:1 }}>
          <div style={{ padding:'1.5rem 1.8rem' }}>

            {/* ═══ ÉTAPE 1 — Informations de contact ═══ */}
            {step === 1 && (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'1rem' }}>
                  📋 Vos informations de contact
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem', marginBottom:'0.85rem' }}>
                  {[
                    { key:'contactName',  label:'Nom du responsable *',  placeholder:'Mohamed Alami' },
                    { key:'companyName',  label:'Entreprise *',           placeholder:'IMACID SA' },
                    { key:'contactPhone', label:'Téléphone *',            placeholder:'+212 6XX XXX XXX' },
                    { key:'contactEmail', label:'Email professionnel',    placeholder:'m.alami@imacid.ma' },
                    { key:'city',         label:'Ville de l\'entrepôt *', placeholder:'Jorf Lasfar' },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: f.key==='contactEmail' ? '1 / -1' : 'auto' }}>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>{f.label}</label>
                      <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, boxSizing:'border-box' }}/>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:'0.85rem' }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.4rem' }}>Type de stockage souhaité *</label>
                  <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                    {[
                      { val:'court',    label:'⚡ Court terme',   desc:'1 à 3 mois' },
                      { val:'long',     label:'📅 Long terme',    desc:'3 à 12 mois' },
                      { val:'indefini', label:'♾️ Indéfini',      desc:'Jusqu\'à vente' },
                    ].map(t => (
                      <div key={t.val} onClick={() => set('storageType', t.val)}
                        style={{ flex:1, minWidth:120, padding:'0.75rem', border:'2px solid '+(form.storageType===t.val?C.forest:C.mid), borderRadius:12, cursor:'pointer', background:form.storageType===t.val?C.beige:C.white, transition:'all 0.2s', textAlign:'center' }}>
                        <div style={{ fontSize:'0.85rem', fontWeight:700, color:form.storageType===t.val?C.forest:C.muted }}>{t.label}</div>
                        <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>Date de dépôt souhaitée</label>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                    style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, boxSizing:'border-box' }}/>
                </div>
              </div>
            )}

            {/* ═══ ÉTAPE 2 — Sélection des articles ═══ */}
            {step === 2 && (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'0.3rem' }}>
                  📦 Articles à stocker
                </div>
                <p style={{ fontSize:'0.8rem', color:C.muted, marginBottom:'1rem' }}>
                  Sélectionnez vos PDR publiés ou décrivez les articles non encore publiés.
                </p>

                {/* Articles publiés */}
                {products.length > 0 && (
                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color:C.forest, marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      PDR déjà publiés ({products.length})
                    </div>
                    <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.4rem', paddingRight:4 }}>
                      {products.map(p => {
                        const sel = form.selectedItems.includes(p.id);
                        return (
                          <div key={p.id} onClick={() => toggleItem(p.id)}
                            style={{ display:'flex', gap:'0.7rem', alignItems:'center', padding:'0.6rem 0.8rem', background:sel?C.beige:C.white, border:'1.5px solid '+(sel?C.forest:C.mid), borderRadius:10, cursor:'pointer', transition:'all 0.15s' }}>
                            <div style={{ width:18, height:18, borderRadius:4, background:sel?C.forest:'transparent', border:'2px solid '+(sel?C.forest:C.mid), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {sel && <span style={{ color:'#fff', fontSize:'0.65rem', fontWeight:700 }}>✓</span>}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'0.82rem', fontWeight:600, color:C.forest, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                {p.title?.substring(0,40)}
                              </div>
                              <div style={{ fontSize:'0.68rem', color:C.muted }}>
                                {p.reference && 'Réf: '+p.reference+' · '}
                                {p.quantity} {p.unit||'u.'} · Grade {p.quality_grade||'—'}
                              </div>
                            </div>
                            <div style={{ fontSize:'0.78rem', fontWeight:700, color:C.leaf, flexShrink:0 }}>
                              {Number(p.price||0).toLocaleString('fr-MA')} MAD
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {form.selectedItems.length > 0 && (
                      <div style={{ marginTop:'0.5rem', fontSize:'0.78rem', color:C.eco, fontWeight:600 }}>
                        ✓ {form.selectedItems.length} article(s) sélectionné(s)
                      </div>
                    )}
                  </div>
                )}

                {/* Articles non publiés */}
                <div style={{ marginBottom:'0.85rem' }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>
                    Articles non encore publiés (description libre)
                  </label>
                  <textarea value={form.customItems} onChange={e => set('customItems', e.target.value)} rows={3}
                    placeholder="Ex: 3 pompes centrifuges GRUNDFOS DN80, 10 vannes papillon DN200 inox, 2 moteurs électriques ABB 15kW..."
                    style={{ width:'100%', padding:'0.65rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', background:C.white, boxSizing:'border-box' }}/>
                </div>

                {/* Volume estimé */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem', marginBottom:'0.85rem' }}>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>Volume estimé (m³)</label>
                    <input type="number" value={form.estimatedVol} onChange={e => set('estimatedVol', e.target.value)} placeholder="Ex: 2.5"
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>Nombre de références</label>
                    <input type="number" value={form.estimatedQty} onChange={e => set('estimatedQty', e.target.value)} placeholder={form.selectedItems.length || 'Ex: 15'}
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, boxSizing:'border-box' }}/>
                  </div>
                </div>

                {/* Services optionnels */}
                <div>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:C.forest, marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    Services inclus à la réception
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                    {[
                      { key:'wantPhotos',    icon:'📸', label:'Photos professionnelles', price:'+150 MAD' },
                      { key:'wantCertif',    icon:'📜', label:'Certification REVEX',     price:'+100 MAD' },
                      { key:'wantInventory', icon:'📊', label:'Inventaire numérique',    price:'+200 MAD' },
                      { key:'wantPicking',   icon:'📦', label:'Préparation commandes',   price:'+50 MAD/exp.' },
                    ].map(s => (
                      <div key={s.key} onClick={() => set(s.key, !form[s.key])}
                        style={{ display:'flex', gap:'0.6rem', alignItems:'center', padding:'0.6rem 0.7rem', border:'1.5px solid '+(form[s.key]?C.forest:C.mid), borderRadius:10, cursor:'pointer', background:form[s.key]?C.beige:C.white, transition:'all 0.15s' }}>
                        <div style={{ width:16, height:16, borderRadius:4, background:form[s.key]?C.forest:'transparent', border:'2px solid '+(form[s.key]?C.forest:C.mid), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {form[s.key] && <span style={{ color:'#fff', fontSize:'0.6rem', fontWeight:700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:'0.85rem', flexShrink:0 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize:'0.78rem', fontWeight:600, color:C.forest }}>{s.label}</div>
                          <div style={{ fontSize:'0.68rem', color:C.muted }}>{s.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ ÉTAPE 3 — Livraison à l'entrepôt ═══ */}
            {step === 3 && (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'0.3rem' }}>
                  🚛 Acheminement vers l'entrepôt REVEX
                </div>
                <p style={{ fontSize:'0.8rem', color:C.muted, marginBottom:'1rem' }}>
                  Comment souhaitez-vous acheminer votre stock vers notre entrepôt à Casablanca ?
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem', marginBottom:'1rem' }}>
                  {[
                    {
                      val: 'self',
                      icon: '🚗',
                      title: 'Dépôt direct',
                      desc: 'Vous amenez vous-même le stock à notre entrepôt Casablanca — Gratuit',
                      detail: 'Entrepôt REVEX · Zone industrielle Ain Sebaâ, Casablanca · Lun-Sam 8h-17h',
                      price: 'Gratuit',
                    },
                    {
                      val: 'revex',
                      icon: '🚛',
                      title: 'Collecte par REVEX',
                      desc: 'Notre équipe vient collecter votre stock sur votre site — Sur devis',
                      detail: 'Disponible dans le corridor Jorf Lasfar → Casablanca → Kénitra → Tanger',
                      price: 'Sur devis',
                    },
                    {
                      val: 'transporter',
                      icon: '📦',
                      title: 'Transporteur partenaire',
                      desc: 'Utilisez un transporteur retour à vide REVEX — Tarif préférentiel',
                      detail: 'Matching automatique avec les transporteurs disponibles sur votre corridor',
                      price: '~15 MAD/kg',
                    },
                  ].map(m => (
                    <div key={m.val} onClick={() => set('deliveryMode', m.val)}
                      style={{ border:'2px solid '+(form.deliveryMode===m.val?C.forest:C.mid), borderRadius:14, padding:'1rem', cursor:'pointer', background:form.deliveryMode===m.val?C.beige:C.white, transition:'all 0.2s' }}>
                      <div style={{ display:'flex', gap:'0.8rem', alignItems:'flex-start' }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:form.deliveryMode===m.val?C.forest:C.beige, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                          {m.icon}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                            <span style={{ fontWeight:700, fontSize:'0.9rem', color:C.forest }}>{m.title}</span>
                            <span style={{ fontSize:'0.78rem', color:form.deliveryMode===m.val?C.eco:C.muted, fontWeight:600 }}>{m.price}</span>
                          </div>
                          <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:3 }}>{m.desc}</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted, fontStyle:'italic' }}>{m.detail}</div>
                        </div>
                        <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid '+(form.deliveryMode===m.val?C.forest:C.mid), background:form.deliveryMode===m.val?C.forest:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {form.deliveryMode===m.val && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {form.deliveryMode !== 'self' && (
                  <div style={{ marginBottom:'0.85rem' }}>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>Date de collecte souhaitée *</label>
                    <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)}
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, boxSizing:'border-box' }}/>
                  </div>
                )}

                <div>
                  <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' }}>Instructions particulières</label>
                  <textarea value={form.deliveryNotes} onChange={e => set('deliveryNotes', e.target.value)} rows={2}
                    placeholder="Ex: Pièces fragiles, accès quai n°3, contacter avant passage..."
                    style={{ width:'100%', padding:'0.65rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', background:C.white, boxSizing:'border-box' }}/>
                </div>
              </div>
            )}

            {/* ═══ ÉTAPE 4 — Conditions & tarifs ═══ */}
            {step === 4 && (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'1rem' }}>
                  📜 Conditions générales & tarification
                </div>

                {/* Grille tarifaire */}
                <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, overflow:'hidden', marginBottom:'1rem' }}>
                  <div style={{ background:C.forest, padding:'0.7rem 1rem' }}>
                    <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.cream }}>💰 Grille tarifaire REVEX Stockage</div>
                  </div>
                  {[
                    ['Stockage de base', '15 MAD/m³/mois', 'Surface sécurisée, ventilée, assurée'],
                    ['Réception & inventaire', '200 MAD', 'Comptage, identification, enregistrement'],
                    ['Photos professionnelles', '150 MAD', 'Photos HD de chaque article'],
                    ['Certification REVEX', '100 MAD', 'Attribution du grade A+ à D'],
                    ['Préparation commande', '50 MAD/expédition', 'Picking, emballage, étiquetage'],
                    ['Commission sur vente', '3% (vs 6% standard)', 'Réduction pour stock en entrepôt REVEX'],
                  ].map(([label, price, desc], i) => (
                    <div key={label} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1.5fr', gap:'0.5rem', padding:'0.6rem 1rem', borderBottom:'1px solid '+C.beige, background:i%2===0?C.white:C.cream, fontSize:'0.8rem', alignItems:'center' }}>
                      <div style={{ fontWeight:600, color:C.forest }}>{label}</div>
                      <div style={{ fontWeight:700, color:C.leaf }}>{price}</div>
                      <div style={{ color:C.muted, fontSize:'0.72rem' }}>{desc}</div>
                    </div>
                  ))}
                </div>

                {/* Estimation */}
                <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:12, padding:'0.9rem 1rem', marginBottom:'1rem' }}>
                  <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#065F46', marginBottom:'0.5rem' }}>📊 Estimation pour votre demande</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'0.68rem', color:'#047857' }}>Stockage/mois</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#065F46' }}>{cost.base} MAD</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'0.68rem', color:'#047857' }}>Services</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#065F46' }}>{cost.opts} MAD</div>
                    </div>
                    <div style={{ textAlign:'center', background:'#D1FAE5', borderRadius:8, padding:'0.3rem' }}>
                      <div style={{ fontSize:'0.68rem', color:'#047857' }}>Total estimé</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:'#059669' }}>{cost.total} MAD</div>
                    </div>
                  </div>
                </div>

                {/* Checkboxes acceptation */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                  {[
                    { key:'acceptConditions', text:'J\'accepte les conditions générales de stockage REVEX et les engagements de sécurité.' },
                    { key:'acceptTarifs',     text:'J\'accepte la grille tarifaire ci-dessus. Je comprends que le devis définitif sera confirmé après inspection.' },
                    { key:'acceptAssurance',  text:'Je confirme que les articles déposés sont ma propriété et ne font l\'objet d\'aucun litige juridique.' },
                  ].map(c => (
                    <div key={c.key} onClick={() => set(c.key, !form[c.key])}
                      style={{ display:'flex', gap:'0.7rem', alignItems:'flex-start', padding:'0.75rem', background:form[c.key]?'#ECFDF5':C.white, border:'1.5px solid '+(form[c.key]?'#A7F3D0':C.mid), borderRadius:10, cursor:'pointer', transition:'all 0.2s' }}>
                      <div style={{ width:18, height:18, borderRadius:4, background:form[c.key]?C.eco:'transparent', border:'2px solid '+(form[c.key]?C.eco:C.mid), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        {form[c.key] && <span style={{ color:'#fff', fontSize:'0.65rem', fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:'0.8rem', color:C.muted, lineHeight:1.5 }}>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ ÉTAPE 5 — Récapitulatif ═══ */}
            {step === 5 && (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest, marginBottom:'1rem' }}>
                  ✅ Récapitulatif de votre demande
                </div>

                {[
                  {
                    title: '📋 Contact',
                    rows: [
                      ['Responsable', form.contactName],
                      ['Entreprise', form.companyName],
                      ['Téléphone', form.contactPhone],
                      ['Ville', form.city],
                      ['Type stockage', form.storageType==='court'?'Court terme (1-3 mois)':form.storageType==='long'?'Long terme (3-12 mois)':'Indéfini (jusqu\'à vente)'],
                      ['Date souhaitée', form.startDate || 'À définir'],
                    ]
                  },
                  {
                    title: '📦 Articles',
                    rows: [
                      ['PDR publiés sélectionnés', form.selectedItems.length+' article(s)'],
                      form.customItems ? ['Articles supplémentaires', form.customItems.substring(0,60)+'...'] : null,
                      form.estimatedVol ? ['Volume estimé', form.estimatedVol+' m³'] : null,
                    ].filter(Boolean)
                  },
                  {
                    title: '🚛 Livraison',
                    rows: [
                      ['Mode', form.deliveryMode==='self'?'Dépôt direct':form.deliveryMode==='revex'?'Collecte REVEX':'Transporteur partenaire'],
                      form.deliveryDate ? ['Date', form.deliveryDate] : null,
                      form.deliveryNotes ? ['Notes', form.deliveryNotes.substring(0,60)] : null,
                    ].filter(Boolean)
                  },
                  {
                    title: '🔧 Services',
                    rows: [
                      ['Photos HD', form.wantPhotos?'✅ Inclus':'❌ Non'],
                      ['Certification REVEX', form.wantCertif?'✅ Inclus':'❌ Non'],
                      ['Inventaire numérique', form.wantInventory?'✅ Inclus':'❌ Non'],
                      ['Préparation commandes', form.wantPicking?'✅ Actif':'❌ Non'],
                    ]
                  },
                ].map(section => (
                  <div key={section.title} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:12, overflow:'hidden', marginBottom:'0.75rem' }}>
                    <div style={{ background:C.beige, padding:'0.5rem 0.9rem', fontSize:'0.78rem', fontWeight:700, color:C.forest }}>{section.title}</div>
                    {section.rows.map(([k, v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.45rem 0.9rem', borderBottom:'1px solid '+C.beige, fontSize:'0.8rem' }}>
                        <span style={{ color:C.muted }}>{k}</span>
                        <span style={{ color:C.forest, fontWeight:600, maxWidth:'60%', textAlign:'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Total final */}
                <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:14, padding:'1rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'0.78rem', color:'rgba(246,241,231,0.6)' }}>Estimation mensuelle</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:'#F6F1E7' }}>~{cost.total} MAD/mois</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)' }}>Commission sur vente</div>
                    <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#6EE7B7' }}>3% (vs 6%)</div>
                  </div>
                </div>

                <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'0.75rem 1rem', marginTop:'0.75rem', fontSize:'0.78rem', color:'#1D4ED8' }}>
                  ℹ️ Un devis définitif vous sera transmis sous 24h après validation de votre demande par notre équipe.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer navigation */}
        <div style={{ padding:'1rem 1.8rem', borderTop:'1px solid '+C.mid, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:C.white }}>
          <button onClick={() => step > 1 ? setStep(s => s-1) : onClose()}
            style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.7rem 1.4rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem' }}>
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>

          <div style={{ fontSize:'0.75rem', color:C.muted }}>Étape {step} sur {STEPS.length}</div>

          {step < 5 ? (
            <button onClick={() => canNext() && setStep(s => s+1)} disabled={!canNext()}
              style={{ background:canNext()?C.forest:'#D9CEBC', color:canNext()?C.cream:'#8C8C7A', border:'none', padding:'0.7rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:canNext()?'pointer':'not-allowed', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s' }}>
              Suivant →
            </button>
          ) : (
            <button onClick={submit} disabled={sending}
              style={{ background:sending?C.muted:C.eco, color:'#fff', border:'none', padding:'0.7rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:sending?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {sending ? '⏳ Envoi...' : '📩 Envoyer la demande'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
