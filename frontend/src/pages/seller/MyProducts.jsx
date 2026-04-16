// src/pages/seller/MyProducts.jsx — Mes PDR publiés
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import BackButton from '../../components/ui/BackButton';
import { generateCertificatePdf } from '../../utils/generateCertificate';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const STATUS_CONFIG = {
  active:   { label:'🟢 Actif',      color:C.eco,    bg:'#E8F8EE' },
  draft:    { label:'⬜ Brouillon',   color:C.muted,  bg:C.beige   },
  sold:     { label:'🔵 Vendu',       color:C.blue,   bg:'#EBF5FB' },
  archived: { label:'⬛ Archivé',     color:'#7F8C8D',bg:'#F2F3F4' },
  inactive: { label:'🔴 Inactif',     color:C.urgent, bg:'#FDECEA' },
};

const GRADE_COLORS = {
  'A+':C.eco, A:'#2980B9', B:C.orange, C:C.urgent, D:'#7F8C8D'
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const parseImgs = (images) => {
  if (Array.isArray(images)) return images;
  try { return JSON.parse(images) || []; } catch { return []; }
};

export default function MyProducts() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [sortBy, setSortBy]             = useState('date');
  const [marketplaceTab, setMarketplaceTab] = useState('pdr'); // 'pdr' | 'auto'
  const [viewMode, setViewMode]         = useState('table');
  const [trackingProduct, setTrackingProduct] = useState(null);

  // ── Charger TOUS les produits (sans limite) ──────────────────
  const { data, isLoading } = useQuery(
    'my-products-all',
    () => api.get('/products/me').then(r => r.data),
    { staleTime: 30000 }
  );

  const allProducts = data?.products || [];
  // Filtre PDR vs Auto selon l'onglet actif
  const tabProducts = marketplaceTab === 'auto'
    ? allProducts.filter(p => p.is_auto === true)
    : allProducts.filter(p => p.is_auto !== true);

  // ── Filtrage + tri côté client (pas de refetch sur filtre) ────
  const filtered = tabProducts
    .filter(p => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.title?.toLowerCase().includes(s) ||
        p.reference?.toLowerCase().includes(s) ||
        p.category_name?.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date')   return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'price')  return Number(b.price) - Number(a.price);
      if (sortBy === 'views')  return (b.views_count||0) - (a.views_count||0);
      if (sortBy === 'stock')  return (b.quantity||0) - (a.quantity||0);
      return 0;
    });

  // ── Stats rapides ────────────────────────────────────────────
  const stats = {
    total:     tabProducts.length,
    actifs:    tabProducts.filter(p => p.status === 'active').length,
    vendus:    tabProducts.filter(p => p.status === 'sold').length,
    vues:      tabProducts.reduce((s, p) => s + (p.views_count||0), 0),
    valeur:    tabProducts.filter(p=>p.status==='active').reduce((s,p) => s + Number(p.price||0)*(p.quantity||0), 0),
    favoris:   tabProducts.reduce((s, p) => s + (p.favorites_count||0), 0),
  };

  const byStatus = allProducts.reduce((acc, p) => {
    acc[p.status] = (acc[p.status]||0) + 1; return acc;
  }, {});

  // ── Mutations ────────────────────────────────────────────────
  const archiveMutation = useMutation(
    (id) => api.delete('/products/'+(id)+''),
    {
      onSuccess: () => { toast.success('✅ Produit archivé'); qc.invalidateQueries('my-products-all'); },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  const activateMutation = useMutation(
    (id) => api.put('/products/'+(id)+'', { status: 'active' }),
    {
      onSuccess: () => { toast.success('✅ Produit activé'); qc.invalidateQueries('my-products-all'); },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div style={{ maxWidth:1280, margin:'0 auto', padding:'2rem 2rem 4rem' }}>


      <div style={{ marginBottom:'1rem' }}>
        <BackButton to={'/seller'} label="Dashboard vendeur" />
      </div>      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', color:C.forest }}>
            📦 Mes PDR publiés
          </h1>
          <p style={{ color:C.muted, fontSize:'0.88rem', marginTop:'0.2rem' }}>
            {stats.actifs} actifs • {stats.total} total • {fmt(stats.vues)} vues
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
          <Link to="/seller/analyse" style={btnLink(C.beige, C.forest, C.mid)}>🔬 Analyser stock</Link>
          <Link to="/seller/publier" style={btnLink(C.forest, C.cream)}>+ Nouveau PDR</Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { label:'Total annonces',      value:stats.total,              color:C.forest },
          { label:'Actifs',              value:stats.actifs,             color:C.eco    },
          { label:'Vendus',              value:stats.vendus,             color:C.blue   },
          { label:'Vues totales',        value:fmt(stats.vues),          color:C.orange },
          { label:'Valeur stock actif',  value:''+(fmt(stats.valeur))+' MAD', color:C.leaf },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:14, padding:'1.1rem', textAlign:'center' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:'0.73rem', color:C.muted, marginTop:'0.2rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── FILTRES + SEARCH + SORT ── */}
      <div style={{ display:'flex', gap:'0.7rem', marginBottom:'1.2rem', flexWrap:'wrap', alignItems:'center' }}>
        {/* Filtres statut */}
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
          {[
            ['',         'Tous ('+(allProducts.length)+')'],
            ['active',   '🟢 Actifs ('+(byStatus.active||0)+')'],
            ['draft',    '⬜ Brouillons ('+(byStatus.draft||0)+')'],
            ['sold',     '🔵 Vendus ('+(byStatus.sold||0)+')'],
            ['archived', '⬛ Archivés ('+(byStatus.archived||0)+')'],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              style={{ padding:'0.4rem 0.9rem', borderRadius:100, border:'1.5px solid '+(statusFilter===val ? C.forest : C.mid)+'', background:statusFilter===val ? C.forest : C.white, color:statusFilter===val ? C.cream : C.muted, fontSize:'0.8rem', fontWeight:statusFilter===val?600:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par titre, référence..."
          style={{ flex:1, minWidth:200, padding:'0.5rem 1rem', border:'1.5px solid '+(C.mid)+'', borderRadius:100, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white }}
        />

        {/* Tri */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding:'0.5rem 0.9rem', border:'1px solid '+(C.mid)+'', borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, cursor:'pointer' }}>
          <option value="date">Tri : Plus récents</option>
          <option value="price">Tri : Prix ↓</option>
          <option value="views">Tri : Vues ↓</option>
          <option value="stock">Tri : Stock ↓</option>
        </select>

        {/* Vue table/grille */}
        <div style={{ display:'flex', border:'1px solid '+(C.mid)+'', borderRadius:100, overflow:'hidden' }}>
          {[['table','☰'],['grid','⊞']].map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding:'0.45rem 0.8rem', border:'none', background:viewMode===mode?C.forest:'transparent', color:viewMode===mode?C.cream:C.muted, cursor:'pointer', fontSize:'0.85rem' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Nombre résultats */}
      {search && (
        <div style={{ fontSize:'0.82rem', color:C.muted, marginBottom:'0.8rem' }}>
          {filtered.length} résultat(s) pour "<strong>{search}</strong>"
        </div>
      )}

      {/* ── LOADING ── */}
      {isLoading && (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
          Chargement de vos produits...
        </div>
      )}

      {/* ── LISTE VIDE ── */}
      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'4rem', color:C.muted }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.3 }}>📦</div>
          <p style={{ fontSize:'0.95rem', marginBottom:'1.5rem' }}>
            {search ? 'Aucun produit trouvé pour "'+(search)+'"' : 'Aucun produit dans cette catégorie'}
          </p>
          <Link to="/seller/publier" style={{ background:C.forest, color:C.cream, padding:'0.8rem 1.8rem', borderRadius:100, textDecoration:'none', fontWeight:600 }}>
            Publier mon premier PDR
          </Link>
        </div>
      )}

      {/* ════════════════════════════════════
          VUE TABLEAU
      ════════════════════════════════════ */}
      {!isLoading && viewMode === 'table' && filtered.length > 0 && (
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, overflow:'hidden' }}>
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'50px 3fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1.2fr', gap:'0.5rem', padding:'0.8rem 1.2rem', background:C.beige, borderBottom:'1px solid '+(C.mid)+'', fontSize:'0.7rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', alignItems:'center' }}>
            <div>Photo</div>
            <div>Désignation</div>
            <div>Prix</div>
            <div>Stock</div>
            <div>Vues</div>
            <div>Favoris</div>
            <div>Statut</div>
            <div>Actions</div>
          </div>

          {/* Lignes */}
          {filtered.map((p, i) => {
            const imgs = parseImgs(p.images);
            const st   = STATUS_CONFIG[p.status] || { label:p.status, color:C.muted, bg:C.beige };
            const grade = GRADE_COLORS[p.quality_grade];
            return (
              <div key={p.id}
                style={{ display:'grid', gridTemplateColumns:'50px 3fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1.2fr', gap:'0.5rem', padding:'0.8rem 1.2rem', borderBottom:'1px solid '+(C.beige)+'', alignItems:'center', background:i%2===0?C.white:C.cream }}>

                {/* Photo */}
                <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', background:C.beige, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {imgs[0]
                    ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                    : <span style={{ fontSize:'1.2rem', opacity:0.3 }}>📦</span>}
                </div>

                {/* Désignation */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexWrap:'wrap', marginBottom:'0.2rem' }}>
                    <Link to={'/produit/'+(p.slug)+''} style={{ fontWeight:600, color:C.forest, fontSize:'0.88rem', textDecoration:'none' }}>
                      {p.title?.substring(0,50)}{p.title?.length>50?'...':''}
                    </Link>
                    {grade && (
                      <span style={{ background:grade+'22', color:grade, fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:100 }}>
                        Grade {p.quality_grade}
                      </span>
                    )}
                    {p.revex_certified && (
                      <span style={{ background:'#E8F8EE', color:C.eco, fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:100 }}>
                        ✓ REVEX
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:C.muted }}>
                    {p.reference && <span>Réf: {p.reference} • </span>}
                    {p.category_name && <span>{p.category_name} • </span>}
                    <span>{new Date(p.created_at).toLocaleDateString('fr-MA')}</span>
                  </div>
                </div>

                {/* Prix */}
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.leaf, fontSize:'1rem' }}>
                  {p.price_on_request ? 'Sur demande' : ''+(fmt(p.price))+' MAD'}
                </div>

                {/* Stock */}
                <div style={{ fontWeight:600, color: p.quantity === 0 ? C.urgent : p.quantity < 5 ? C.orange : C.forest, fontSize:'0.88rem' }}>
                  {p.quantity}
                  <span style={{ fontSize:'0.72rem', color:C.muted, fontWeight:400 }}> {p.unit||'u.'}</span>
                </div>

                {/* Vues */}
                <div style={{ fontSize:'0.85rem', color:C.muted, textAlign:'center' }}>{p.views_count||0}</div>

                {/* Favoris */}
                <div style={{ fontSize:'0.85rem', color:C.muted, textAlign:'center' }}>{p.favorites_count||0}</div>

                {/* Statut */}
                <div>
                  <span style={{ background:st.bg, color:st.color, padding:'0.2rem 0.6rem', borderRadius:100, fontSize:'0.72rem', fontWeight:600, whiteSpace:'nowrap' }}>
                    {st.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
                  <button onClick={() => setTrackingProduct(p)}
                    style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'0.35rem 0.7rem', borderRadius:100, fontSize:'0.73rem', cursor:'pointer', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>
                    📍 Traçabilité
                  </button>
                  <Link to={'/seller/publier/'+p.id}
                    style={{ background:C.beige, color:C.forest, border:'none', padding:'0.35rem 0.7rem', borderRadius:100, fontSize:'0.73rem', textDecoration:'none', whiteSpace:'nowrap' }}>
                    ✏️ Modifier
                  </Link>
                  <Link to={p.is_auto ? '/auto/'+p.slug : '/produit/'+p.slug}
                    style={{ background:C.beige, color:C.forest, border:'none', padding:'0.35rem 0.7rem', borderRadius:100, fontSize:'0.73rem', textDecoration:'none', whiteSpace:'nowrap' }}>
                    👁 Voir
                  </Link>
                  {p.status === 'draft' && (
                    <button onClick={() => activateMutation.mutate(p.id)}
                      style={{ background:'#E8F8EE', color:C.eco, border:'none', padding:'0.35rem 0.7rem', borderRadius:100, fontSize:'0.73rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                      ✅ Activer
                    </button>
                  )}
                  {p.status !== 'archived' && (
                    <button onClick={() => window.confirm('Archiver ce produit ?') && archiveMutation.mutate(p.id)}
                      style={{ background:'#FDECEA', color:C.urgent, border:'none', padding:'0.35rem 0.7rem', borderRadius:100, fontSize:'0.73rem', cursor:'pointer' }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════
          VUE GRILLE
      ════════════════════════════════════ */}
      {!isLoading && viewMode === 'grid' && filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1.2rem' }}>
          {filtered.map(p => {
            const imgs  = parseImgs(p.images);
            const st    = STATUS_CONFIG[p.status] || { label:p.status, color:C.muted, bg:C.beige };
            const grade = GRADE_COLORS[p.quality_grade];
            return (
              <div key={p.id} style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:16, overflow:'hidden', transition:'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(30,61,15,0.1)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>

                {/* Image */}
                <div style={{ height:160, background:C.beige, position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {imgs[0]
                    ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                    : <span style={{ fontSize:'3rem', opacity:0.2 }}>📦</span>}
                  <div style={{ position:'absolute', top:8, left:8, display:'flex', flexDirection:'column', gap:3 }}>
                    <span style={{ background:st.bg, color:st.color, padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.68rem', fontWeight:700 }}>{st.label}</span>
                    {grade && <span style={{ background:grade+'dd', color:'#fff', padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.65rem', fontWeight:700 }}>Grade {p.quality_grade}</span>}
                  </div>
                  <div style={{ position:'absolute', top:8, right:8, background:'rgba(30,61,15,0.75)', color:'#fff', borderRadius:100, padding:'0.15rem 0.5rem', fontSize:'0.68rem' }}>
                    👁 {p.views_count||0}
                  </div>
                </div>

                {/* Infos */}
                <div style={{ padding:'1rem' }}>
                  {p.is_auto && (
                    <span style={{ display:'inline-block', background:'#FEE2E2', color:'#DC2626', fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100, marginBottom:'0.3rem' }}>🚗 Pièce Auto</span>
                  )}
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.forest, fontSize:'1rem', lineHeight:1.3, marginBottom:'0.3rem' }}>
                    {p.title?.substring(0,50)}{p.title?.length>50?'...':''}
                  </div>
                  {p.reference && <div style={{ fontSize:'0.72rem', color:C.muted, marginBottom:'0.4rem', fontFamily:'monospace' }}>Réf: {p.reference}</div>}

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem' }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.leaf, fontSize:'1.1rem' }}>
                      {p.price_on_request ? 'Sur demande' : ''+(fmt(p.price))+' MAD'}
                    </div>
                    <div style={{ fontSize:'0.78rem', color: p.quantity<5?C.orange:C.muted }}>
                      📦 {p.quantity} en stock
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                    <button onClick={() => setTrackingProduct(p)}
                      style={{ flex:1, background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'0.5rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      📍 Traçabilité
                    </button>
                    <Link to={'/seller/publier/'+p.id}
                      style={{ flex:1, background:C.beige, color:C.forest, textDecoration:'none', padding:'0.5rem', borderRadius:100, fontSize:'0.78rem', textAlign:'center', fontWeight:500 }}>
                      ✏️ Modifier
                    </Link>
                    <Link to={p.is_auto ? '/auto/'+p.slug : '/produit/'+p.slug}
                      style={{ background:C.beige, color:C.forest, textDecoration:'none', padding:'0.5rem 0.7rem', borderRadius:100, fontSize:'0.78rem' }}>
                      👁
                    </Link>
                    {p.status !== 'archived' && (
                      <button onClick={() => window.confirm('Archiver ?') && archiveMutation.mutate(p.id)}
                        style={{ background:'#FDECEA', color:C.urgent, border:'none', padding:'0.5rem 0.7rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer' }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total affiché */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.8rem', color:C.muted }}>
          {filtered.length} produit(s) affiché(s) sur {allProducts.length} total
        </div>
      )}

      {/* ── Modal Traçabilité PDR ── */}
      {trackingProduct && (
        <PdrTrackingModal product={trackingProduct} onClose={() => setTrackingProduct(null)} />
      )}
    </div>
    </div>
  );
}

const btnLink = (bg, color, border) => ({
  background:bg, color, textDecoration:'none', padding:'0.65rem 1.4rem',
  borderRadius:100, fontWeight:600, fontSize:'0.85rem',
  border:border?'1px solid '+border:'none',
  whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif"
});

// ── Composant PdrTrackingModal ──────────────────────────────────
function PdrTrackingModal({ product, onClose }) {
  const C = {
    forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
    cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
  };

  const { data: ordersData } = useQuery(
    ['product-orders', product.id],
    () => api.get('/orders?role_as=seller&product_id='+product.id).then(r => r.data),
    { retry: false, staleTime: 60000 }
  );

  const orders = ordersData?.orders || [];
  const imgs = parseImgs(product.images);

  // Métriques de cycle de vie
  const daysOnPlatform = Math.floor((Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const totalSold = orders.filter(o => ['delivered','shipped','confirmed'].includes(o.status)).length;
  const totalRevenue = orders
    .filter(o => ['delivered','confirmed'].includes(o.status))
    .reduce((s, o) => s + Number(o.final_price || 0), 0);
  const conversionRate = product.views_count > 0
    ? Math.min(100, Math.round((orders.length / product.views_count) * 100))
    : 0;
  const dormancyDays = product.last_movement_date
    ? Math.floor((Date.now() - new Date(product.last_movement_date).getTime()) / (1000 * 60 * 60 * 24))
    : daysOnPlatform;

  // Timeline du cycle de vie PDR
  const getLifecycleSteps = () => {
    const steps = [
      {
        key: 'analysed',
        icon: '🔬',
        label: 'Analyse CCOM',
        desc: 'Article analysé via l\'algorithme CCOM — score de dormance calculé.',
        done: true,
        date: product.created_at,
        color: '#8B5CF6',
      },
      {
        key: 'certified',
        icon: '📜',
        label: 'Certification qualité',
        desc: 'Grade ' + (product.quality_grade || 'A') + ' attribué — Trust Score calculé sur 8 critères.',
        done: !!product.quality_grade,
        date: product.created_at,
        color: C.blue,
      },
      {
        key: 'published',
        icon: '📢',
        label: 'Publié sur REVEX',
        desc: 'Article visible dans le catalogue B2B industriel marocain.',
        done: ['active','sold'].includes(product.status),
        date: product.created_at,
        color: C.leaf,
      },
      {
        key: 'viewed',
        icon: '👁',
        label: 'Découverte acheteurs',
        desc: (product.views_count || 0) + ' vue(s) · ' + (product.favorites_count || 0) + ' favori(s) — article référencé par des acheteurs.',
        done: (product.views_count || 0) > 0,
        date: null,
        color: C.orange,
      },
      {
        key: 'ordered',
        icon: '🛒',
        label: 'Commande(s) reçue(s)',
        desc: orders.length > 0
          ? orders.length + ' commande(s) reçue(s) — paiements escrow sécurisés.'
          : 'En attente de première commande.',
        done: orders.length > 0,
        date: orders.length > 0 ? orders[0]?.created_at : null,
        color: C.eco,
      },
      {
        key: 'sold',
        icon: '🏆',
        label: 'Transaction certifiée',
        desc: product.status === 'sold'
          ? 'Stock valorisé avec succès — certificat digital émis. Capital récupéré.'
          : product.status === 'active' && orders.length > 0
            ? 'Commandes en cours — transaction en cours de finalisation.'
            : 'Livraison et certification en attente.',
        done: product.status === 'sold',
        date: null,
        color: C.gold || '#F59E0B',
      },
    ];
    return steps;
  };

  const steps = getLifecycleSteps();
  const currentIdx = steps.filter(s => s.done).length - 1;

  // Localisation du PDR
  const getLocation = () => {
    if (product.status === 'sold')     return { icon:'🏭', label:'Livré à l\'acheteur', detail:'Article sorti de votre stock — transaction certifiée', color:C.eco };
    if (product.status === 'active')   return { icon:'📍', label: product.location_city || product.city || 'Votre site', detail:'En stock · Disponible à la vente · Visible dans le catalogue', color:C.leaf };
    if (product.status === 'draft')    return { icon:'📂', label:'Brouillon', detail:'Non publié · En attente de finalisation', color:C.muted };
    if (product.status === 'inactive') return { icon:'⏸️', label:'Suspendu', detail:'Retiré temporairement du catalogue', color:C.orange };
    if (product.status === 'archived') return { icon:'🗄️', label:'Archivé', detail:'Article archivé — non visible dans le catalogue', color:'#7F8C8D' };
    return { icon:'📦', label:'—', detail:'Statut inconnu', color:C.muted };
  };

  const loc = getLocation();

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#F6F1E7', borderRadius:24, maxWidth:580, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', maxHeight:'94vh', overflowY:'auto', margin:'auto' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.4rem 1.8rem', borderRadius:'24px 24px 0 0', position:'relative' }}>
          <div style={{ position:'absolute', top:-15, right:-15, width:90, height:90, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>
          <button onClick={onClose}
            style={{ position:'absolute', top:14, right:16, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
          <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
            {/* Miniature */}
            <div style={{ width:54, height:54, borderRadius:12, overflow:'hidden', background:'rgba(126,168,106,0.2)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {imgs[0]
                ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <span style={{ fontSize:'1.6rem', opacity:0.5 }}>📦</span>}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:'1.1rem' }}>📍</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#F6F1E7' }}>
                  Traçabilité & Localisation PDR
                </span>
              </div>
              <div style={{ fontSize:'0.78rem', color:'rgba(246,241,231,0.6)' }}>
                {product.title?.substring(0,45)}{product.title?.length>45?'...':''}
                {product.reference && ' · Réf: '+product.reference}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'1.5rem 1.8rem' }}>

          {/* ── KPIs rapides ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.6rem', marginBottom:'1.2rem' }}>
            {[
              { icon:'📅', label:'Jours en catalogue', value:daysOnPlatform, color:C.blue },
              { icon:'👁', label:'Vues totales', value:product.views_count||0, color:C.orange },
              { icon:'🛒', label:'Commandes', value:totalSold, color:C.eco },
              { icon:'💰', label:'Revenu généré', value:Number(totalRevenue).toLocaleString()+' MAD', color:C.leaf },
            ].map(k => (
              <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'0.75rem 0.5rem', textAlign:'center', border:'1px solid #D9CEBC' }}>
                <div style={{ fontSize:'1.1rem', marginBottom:3 }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:'0.63rem', color:C.muted, marginTop:3, lineHeight:1.3 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* ── Localisation actuelle ── */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.1rem', marginBottom:'1.1rem', border:'1px solid #D9CEBC' }}>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.forest, marginBottom:'0.8rem' }}>🗺️ Localisation actuelle</div>
            <div style={{ display:'flex', gap:'1rem', alignItems:'center', background:loc.color+'11', border:'1px solid '+loc.color+'33', borderRadius:12, padding:'0.85rem 1rem' }}>
              <span style={{ fontSize:'2rem', flexShrink:0 }}>{loc.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:loc.color }}>{loc.label}</div>
                <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:2 }}>{loc.detail}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:'0.68rem', color:C.muted }}>Taux conversion</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:C.leaf }}>{conversionRate}%</div>
              </div>
            </div>

            {/* Jauge de performance */}
            <div style={{ marginTop:'0.8rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:'0.72rem', color:C.muted }}>Performance visibilité</span>
                <span style={{ fontSize:'0.72rem', color:C.leaf, fontWeight:600 }}>{Math.min(100, (product.views_count||0) * 2)}%</span>
              </div>
              <div style={{ background:'#EDE6D3', borderRadius:100, height:6, overflow:'hidden' }}>
                <div style={{ width:Math.min(100,(product.views_count||0)*2)+'%', height:'100%', background:'linear-gradient(90deg,#1E3D0F,#4A7C2F)', borderRadius:100, transition:'width 0.8s ease' }}/>
              </div>
            </div>

            {/* Durée de dormance sur plateforme */}
            <div style={{ display:'flex', gap:'0.8rem', marginTop:'0.8rem', flexWrap:'wrap' }}>
              <div style={{ background:'#F6F1E7', borderRadius:8, padding:'0.45rem 0.8rem', fontSize:'0.75rem', color:C.forest }}>
                📅 Publié le {new Date(product.created_at).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })}
              </div>
              {product.location_city && (
                <div style={{ background:'#F6F1E7', borderRadius:8, padding:'0.45rem 0.8rem', fontSize:'0.75rem', color:C.forest }}>
                  📍 Stocké à {product.location_city}
                </div>
              )}
              <div style={{ background: dormancyDays > 365 ? '#FEF2F2' : dormancyDays > 90 ? '#FEF5E7' : '#ECFDF5', borderRadius:8, padding:'0.45rem 0.8rem', fontSize:'0.75rem', color: dormancyDays > 365 ? C.urgent : dormancyDays > 90 ? C.orange : C.eco, fontWeight:600 }}>
                {dormancyDays > 365 ? '🔴' : dormancyDays > 90 ? '🟠' : '🟢'} {dormancyDays} j. depuis publication
              </div>
            </div>
          </div>

          {/* ── Cycle de vie du PDR ── */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.1rem', marginBottom:'1.1rem', border:'1px solid #D9CEBC' }}>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.forest, marginBottom:'1rem' }}>🔄 Cycle de vie REVEX</div>

            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {steps.map((step, i) => {
                const isCurrent = i === currentIdx;
                const isLast    = i === steps.length - 1;
                return (
                  <div key={step.key} style={{ display:'flex', gap:'0.85rem' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:30, flexShrink:0 }}>
                      <div style={{
                        width:30, height:30, borderRadius:'50%',
                        background: step.done ? step.color : '#EDE6D3',
                        border: isCurrent ? '3px solid '+step.color : '2px solid '+(step.done ? step.color : '#D9CEBC'),
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem',
                        boxShadow: isCurrent ? '0 0 0 4px '+step.color+'22' : 'none',
                      }}>
                        {step.done ? step.icon : '○'}
                      </div>
                      {!isLast && <div style={{ width:2, flex:1, minHeight:22, background: step.done ? step.color : '#D9CEBC', marginTop:2, marginBottom:2 }}/>}
                    </div>
                    <div style={{ paddingBottom:isLast?0:'0.9rem', paddingTop:'0.2rem', flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:'0.85rem', fontWeight:isCurrent?700:600, color: step.done ? step.color : C.muted }}>
                          {step.label}
                        </span>
                        {isCurrent && <span style={{ background:step.color+'22', color:step.color, fontSize:'0.62rem', fontWeight:700, padding:'0.1rem 0.45rem', borderRadius:100 }}>EN COURS</span>}
                        {step.done && !isCurrent && <span style={{ color:step.color, fontSize:'0.72rem' }}>✓</span>}
                      </div>
                      {step.done && (
                        <div style={{ fontSize:'0.75rem', color:C.muted, lineHeight:1.5, marginTop:2 }}>
                          {step.desc}
                          {step.date && (
                            <span style={{ marginLeft:6, color:C.muted, opacity:0.7 }}>
                              · {new Date(step.date).toLocaleDateString('fr-MA')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Commandes liées ── */}
          {orders.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, padding:'1.1rem', marginBottom:'1.1rem', border:'1px solid #D9CEBC' }}>
              <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.forest, marginBottom:'0.8rem' }}>
                🛒 Commandes liées ({orders.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {orders.slice(0,5).map(o => {
                  const stColors = { pending:C.orange, confirmed:C.leaf, shipped:C.orange, delivered:C.eco, disputed:C.urgent, cancelled:'#7F8C8D' };
                  const stLabels = { pending:'⏳ En attente', confirmed:'✅ Confirmée', shipped:'🚛 Expédiée', delivered:'📦 Livrée', disputed:'⚖️ Litige', cancelled:'❌ Annulée' };
                  const col = stColors[o.status] || C.muted;
                  return (
                    <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.8rem', background:'#F6F1E7', borderRadius:10, border:'1px solid #EDE6D3' }}>
                      <div>
                        <div style={{ fontSize:'0.82rem', fontWeight:700, color:C.forest }}>{o.order_number}</div>
                        <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:1 }}>
                          🏭 {o.buyer_company} · {new Date(o.created_at).toLocaleDateString('fr-MA')}
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:C.leaf }}>
                          {Number(o.final_price).toLocaleString()} MAD
                        </div>
                        <span style={{ background:col+'22', color:col, fontSize:'0.68rem', fontWeight:700, padding:'0.15rem 0.5rem', borderRadius:100 }}>
                          {stLabels[o.status] || o.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Certificat de traçabilité ── */}
          <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:16, padding:'1.1rem', marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.7rem', marginBottom:'0.9rem' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', color:'#F6F1E7', fontWeight:700 }}>
                  📜 Certificat de Traçabilité REVEX
                </div>
                <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)', marginTop:2 }}>
                  {product.revex_certified ? 'Certifié REVEX · QR code vérifiable · Opposable juridiquement' : 'Certification disponible à la publication'}
                </div>
              </div>
              {product.status === 'sold' ? (
                <button onClick={() => generateCertificatePdf({
                    type: 'product',
                    id: product.id,
                    title: product.title,
                    reference: product.reference,
                    grade: product.quality_grade,
                    price: product.price,
                    quantity: product.quantity,
                    unit: product.unit,
                    sellerCompany: product.seller_company,
                    locationCity: product.location_city,
                    createdAt: product.created_at,
                    deliveryType: 'eco',
                  })}
                  style={{ background:'#F6F1E7', color:'#1E3D0F', border:'none', borderRadius:100, padding:'0.5rem 1rem', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  ⬇️ Télécharger
                </button>
              ) : product.revex_certified ? (
                <span style={{ background:'rgba(39,174,96,0.25)', color:'#6EE7B7', fontSize:'0.72rem', fontWeight:700, padding:'0.3rem 0.8rem', borderRadius:100, border:'1px solid rgba(110,231,183,0.3)' }}>
                  ✓ Certifié
                </span>
              ) : (
                <span style={{ background:'rgba(255,255,255,0.08)', color:'rgba(246,241,231,0.5)', fontSize:'0.72rem', padding:'0.3rem 0.8rem', borderRadius:100, border:'1px solid rgba(255,255,255,0.12)' }}>
                  🔒 Non certifié
                </span>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.45rem' }}>
              {[
                ['Référence', product.reference || '—'],
                ['Grade certifié', 'Grade '+(product.quality_grade||'N/A')],
                ['Valeur unitaire', product.price_on_request ? 'Sur demande' : Number(product.price||0).toLocaleString()+' MAD'],
                ['Quantité', (product.quantity||0)+' '+(product.unit||'u.')],
                ['Localisation', product.location_city || '—'],
                ['Statut', product.status || '—'],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'rgba(255,255,255,0.07)', borderRadius:8, padding:'0.4rem 0.65rem' }}>
                  <div style={{ fontSize:'0.62rem', color:'rgba(246,241,231,0.4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                  <div style={{ fontSize:'0.8rem', color:'#F6F1E7', fontWeight:600, marginTop:1 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onClose}
            style={{ width:'100%', background:'transparent', color:C.muted, border:'1.5px solid #D9CEBC', borderRadius:100, padding:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
