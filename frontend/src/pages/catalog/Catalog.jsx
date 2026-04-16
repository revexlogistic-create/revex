// src/pages/catalog/Catalog.jsx — Design premium REVEX
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';

const GRADE = { 'A+':'#059669','A':'#2563EB','B':'#D97706','C':'#DC2626','D':'#6B7280' };
const GRADE_LABEL = { 'A+':'Excellent','A':'Très bon','B':'Bon','C':'Usagé','D':'Pièces' };

const fmt = n => Number(n||0).toLocaleString('fr-MA');

function ProductCard({ p }) {
  const [hovered, setHovered] = useState(false);
  const imgs = Array.isArray(p.images) ? p.images : (p.images ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : []);
  const grade = p.quality_grade;

  return (
    <Link
      to={'/produit/'+p.slug}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:'block', textDecoration:'none',
        background:'#fff',
        borderRadius:20,
        overflow:'hidden',
        boxShadow: hovered
          ? '0 20px 60px rgba(30,61,15,0.18), 0 4px 16px rgba(30,61,15,0.08)'
          : '0 2px 12px rgba(30,61,15,0.06)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        border:'1px solid rgba(30,61,15,0.08)',
      }}>

      {/* Image */}
      <div style={{ position:'relative', height:200, overflow:'hidden', background:'linear-gradient(135deg,#EDE6D3 0%,#F6F1E7 100%)' }}>
        {imgs[0]
          ? <img src={imgs[0]} alt={p.title}
              style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform:hovered?'scale(1.06)':'scale(1)' }}
              onError={e => e.target.style.display='none'}/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
              <span style={{ fontSize:'3rem', opacity:0.25 }}>📦</span>
              <span style={{ fontSize:'0.72rem', color:'#9CAA97', letterSpacing:'0.1em', textTransform:'uppercase' }}>Pas de photo</span>
            </div>
        }

        {/* Badges top */}
        <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6, flexDirection:'column' }}>
          {grade && (
            <span style={{
              background:GRADE[grade]||'#888', color:'#fff',
              borderRadius:8, padding:'3px 8px', fontSize:'0.68rem', fontWeight:800,
              letterSpacing:'0.05em', boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
            }}>
              {grade} · {GRADE_LABEL[grade]||grade}
            </span>
          )}
          {p.revex_certified && (
            <span style={{ background:'rgba(5,150,105,0.9)', color:'#fff', borderRadius:8, padding:'3px 8px', fontSize:'0.65rem', fontWeight:700, backdropFilter:'blur(4px)' }}>
              ✓ Certifié REVEX
            </span>
          )}
        </div>

        {/* Livraison badge */}
        <div style={{ position:'absolute', bottom:10, right:10, display:'flex', gap:4 }}>
          {p.eco_delivery_price != null && (
            <span style={{ background:'rgba(255,255,255,0.92)', color:'#059669', fontSize:'0.68rem', fontWeight:700, padding:'3px 7px', borderRadius:100, backdropFilter:'blur(8px)' }}>🌿 Éco</span>
          )}
          {p.urgent_delivery_price != null && (
            <span style={{ background:'rgba(255,255,255,0.92)', color:'#DC2626', fontSize:'0.68rem', fontWeight:700, padding:'3px 7px', borderRadius:100, backdropFilter:'blur(8px)' }}>⚡ Urgent</span>
          )}
        </div>

        {/* Hover overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(30,61,15,0.4) 0%, transparent 50%)', opacity:hovered?1:0, transition:'opacity 0.3s' }}/>
      </div>

      {/* Contenu */}
      <div style={{ padding:'1.2rem 1.3rem' }}>
        {/* Vendeur + ville */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'0.5rem' }}>
          <span style={{ fontSize:'0.72rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.03em', textTransform:'uppercase' }}>
            {p.seller_company?.substring(0,20)}
          </span>
          {p.location_city && (
            <span style={{ fontSize:'0.7rem', color:'#9CA3AF', display:'flex', alignItems:'center', gap:3 }}>
              📍 {p.location_city}
            </span>
          )}
        </div>

        {/* Titre */}
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:'#1E3D0F', lineHeight:1.35, marginBottom:'0.8rem', minHeight:'2.7rem' }}>
          {p.title?.substring(0,65)}{p.title?.length>65?'...':''}
        </h3>

        {/* Séparateur décoratif */}
        <div style={{ height:1, background:'linear-gradient(to right,#D9CEBC,transparent)', marginBottom:'0.8rem' }}/>

        {/* Prix + stock */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:'#4A7C2F', lineHeight:1 }}>
              {p.price_on_request ? 'Sur demande' : fmt(p.price)+' MAD'}
            </div>
            {!p.price_on_request && p.price > 0 && (
              <div style={{ fontSize:'0.7rem', color:'#9CA3AF', marginTop:2 }}>HT · Négociable</div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#1E3D0F' }}>Qté : {p.quantity||'—'}</div>
            {p.trust_score > 0 && (
              <div style={{ fontSize:'0.68rem', color:'#7EA86A', marginTop:1 }}>🏆 Score {p.trust_score}%</div>
            )}
          </div>
        </div>

        {/* CTA hover */}
        <div style={{
          marginTop:'0.9rem', background:'#1E3D0F', color:'#F6F1E7',
          textAlign:'center', padding:'0.55rem', borderRadius:100,
          fontSize:'0.8rem', fontWeight:600, letterSpacing:'0.04em',
          opacity:hovered?1:0, transform:hovered?'translateY(0)':'translateY(6px)',
          transition:'all 0.25s ease', pointerEvents:'none'
        }}>
          Voir le produit →
        </div>
      </div>
    </Link>
  );
}

export const Catalog = () => {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const searchRef = useRef(null);

  const filters = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    condition: params.get('condition') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    city: params.get('city') || '',
    sort: params.get('sort') || 'newest',
    page, limit: viewMode === 'list' ? 20 : 12
  };

  const { data, isLoading, isPreviousData } = useQuery(
    ['products', filters],
    () => {
      const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
      p.set('is_auto','false'); return api.get('/products?' + p.toString()).then(r => r.data);
    },
    { keepPreviousData: true }
  );

  const { data: catsData } = useQuery('categories', () => api.get('/categories').then(r => r.data));

  const products = data?.products || [];
  const pagination = data?.pagination;
  const total = pagination?.total || products.length;
  const cats = catsData?.categories || [];

  const setFilter = (key, val) => {
    setParams(p => { val ? p.set(key, val) : p.delete(key); return p; });
    setPage(1);
  };

  const activeFiltersCount = [filters.category, filters.condition, filters.min_price, filters.max_price].filter(Boolean).length;

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO BANNER ── */}
      <div style={{
        background:'linear-gradient(135deg, #1E3D0F 0%, #2D5A1B 50%, #1E3D0F 100%)',
        padding:'3rem 2rem 2.5rem', position:'relative', overflow:'hidden'
      }}>
        {/* Décor géométrique */}
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.2)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:20, right:60, width:120, height:120, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:100, width:160, height:160, borderRadius:'50%', background:'rgba(74,124,47,0.08)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1.5rem' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(126,168,106,0.15)', border:'1px solid rgba(126,168,106,0.3)', borderRadius:100, padding:'0.3rem 0.9rem', marginBottom:'0.8rem' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block' }}/>
                <span style={{ fontSize:'0.72rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Marketplace B2B Industrielle</span>
              </div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.8rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, margin:'0 0 0.5rem' }}>
                Catalogue PDR
              </h1>
              <p style={{ color:'rgba(246,241,231,0.65)', fontSize:'0.95rem', margin:0 }}>
                {isLoading ? '...' : total.toLocaleString('fr-MA') + ' pièces de rechange industrielles certifiées'}
              </p>
            </div>

            {/* Barre de recherche hero */}
            <div style={{ flex:1, maxWidth:520, position:'relative' }}>
              <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:'1rem', pointerEvents:'none' }}>🔍</span>
              <input
                ref={searchRef}
                value={params.get('search') || ''}
                onChange={e => setFilter('search', e.target.value)}
                placeholder="Rechercher une pièce, référence, fabricant..."
                style={{
                  width:'100%', padding:'0.9rem 1rem 0.9rem 2.8rem',
                  borderRadius:100, border:'none',
                  background:'rgba(255,255,255,0.12)',
                  backdropFilter:'blur(12px)',
                  color:'#fff', fontSize:'0.92rem',
                  fontFamily:"'DM Sans',sans-serif",
                  outline:'none', boxSizing:'border-box',
                  boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15)',
                }}
              />
              {params.get('search') && (
                <button onClick={() => setFilter('search', '')}
                  style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', color:'#fff', fontSize:12 }}>
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1280, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

        {/* ── BARRE FILTRES ── */}
        <div style={{ background:'#fff', borderRadius:16, padding:'1rem 1.2rem', marginBottom:'1.5rem', boxShadow:'0 2px 16px rgba(30,61,15,0.06)', border:'1px solid rgba(30,61,15,0.07)' }}>
          <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap', alignItems:'center' }}>

            {/* Catégorie */}
            <select value={params.get('category')||''} onChange={e => setFilter('category', e.target.value)} style={selSt}>
              <option value="">📂 Toutes catégories</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* État */}
            <select value={params.get('condition')||''} onChange={e => setFilter('condition', e.target.value)} style={selSt}>
              <option value="">✨ Tous états</option>
              <option value="new">🟢 Neuf</option>
              <option value="good">🔵 Bon état</option>
              <option value="used">🟠 Usagé</option>
            </select>

            {/* Tri */}
            <select value={params.get('sort')||'newest'} onChange={e => setFilter('sort', e.target.value)} style={selSt}>
              <option value="newest">🕐 Plus récents</option>
              <option value="price_asc">💰 Prix croissant</option>
              <option value="price_desc">💰 Prix décroissant</option>
              <option value="views">👁 Plus vus</option>
            </select>

            {/* Prix min/max */}
            <div style={{ display:'flex', alignItems:'center', gap:4, background:'#F6F1E7', borderRadius:100, padding:'0 0.5rem', border:'1.5px solid #D9CEBC' }}>
              <input type="number" value={params.get('min_price')||''} onChange={e => setFilter('min_price', e.target.value)}
                placeholder="Prix min" style={{ ...numSt, width:90 }}/>
              <span style={{ color:'#D9CEBC', fontSize:'0.8rem' }}>—</span>
              <input type="number" value={params.get('max_price')||''} onChange={e => setFilter('max_price', e.target.value)}
                placeholder="Prix max" style={{ ...numSt, width:90 }}/>
              <span style={{ fontSize:'0.75rem', color:'#9CA3AF', paddingRight:4 }}>MAD</span>
            </div>

            {/* Clear */}
            {activeFiltersCount > 0 && (
              <button onClick={() => { ['category','condition','min_price','max_price'].forEach(k => setParams(p => { p.delete(k); return p; })); }}
                style={{ padding:'0.5rem 1rem', borderRadius:100, border:'1.5px solid #C0392B', background:'transparent', color:'#C0392B', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                ✕ Effacer ({activeFiltersCount})
              </button>
            )}

            <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
              {/* Mode vue */}
              {[['grid','⊞'],['list','≡']].map(([m,icon]) => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{ width:34, height:34, borderRadius:8, border:'1.5px solid '+(viewMode===m?'#1E3D0F':'#D9CEBC'), background:viewMode===m?'#1E3D0F':'transparent', color:viewMode===m?'#F6F1E7':'#9CA3AF', cursor:'pointer', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Tags filtres actifs */}
          {(params.get('search') || activeFiltersCount > 0) && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:'0.7rem', paddingTop:'0.7rem', borderTop:'1px solid #EDE6D3' }}>
              {params.get('search') && (
                <span style={tagSt} onClick={() => setFilter('search','')}>
                  🔍 "{params.get('search')}" ✕
                </span>
              )}
              {params.get('category') && cats.find(c => String(c.id) === params.get('category')) && (
                <span style={tagSt} onClick={() => setFilter('category','')}>
                  📂 {cats.find(c => String(c.id) === params.get('category'))?.name} ✕
                </span>
              )}
              {params.get('condition') && (
                <span style={tagSt} onClick={() => setFilter('condition','')}>
                  ✨ {params.get('condition')} ✕
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── RÉSULTATS HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'1.2rem' }}>
          <div style={{ fontSize:'0.88rem', color:'#5C5C50' }}>
            {isLoading ? (
              <span>Recherche en cours...</span>
            ) : (
              <span><strong style={{ color:'#1E3D0F' }}>{total.toLocaleString('fr-MA')}</strong> résultat{total !== 1 ? 's' : ''}</span>
            )}
          </div>
          {isPreviousData && !isLoading && (
            <span style={{ fontSize:'0.75rem', color:'#7EA86A' }}>Mise à jour...</span>
          )}
        </div>

        {/* ── ÉTAT VIDE / CHARGEMENT ── */}
        {isLoading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap:'1.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius:20, overflow:'hidden', background:'#fff', border:'1px solid rgba(30,61,15,0.06)' }}>
                <div style={{ height:200, background:'linear-gradient(90deg,#EDE6D3 25%,#F6F1E7 50%,#EDE6D3 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
                <div style={{ padding:'1.2rem' }}>
                  <div style={{ height:12, background:'#EDE6D3', borderRadius:100, marginBottom:8, width:'60%' }}/>
                  <div style={{ height:18, background:'#EDE6D3', borderRadius:100, marginBottom:16, width:'85%' }}/>
                  <div style={{ height:24, background:'#EDE6D3', borderRadius:100, width:'40%' }}/>
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div style={{ textAlign:'center', padding:'5rem 2rem', background:'#fff', borderRadius:20, border:'1px solid rgba(30,61,15,0.06)' }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:0.3 }}>📦</div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F', marginBottom:'0.5rem' }}>Aucun produit trouvé</h3>
            <p style={{ color:'#9CA3AF', fontSize:'0.9rem', marginBottom:'1.5rem' }}>Essayez de modifier vos filtres ou élargissez votre recherche</p>
            <button onClick={() => { setParams(new URLSearchParams()); setPage(1); }}
              style={{ background:'#1E3D0F', color:'#F6F1E7', border:'none', padding:'0.75rem 2rem', borderRadius:100, fontSize:'0.9rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Voir tous les produits
            </button>
          </div>
        )}

        {/* ── GRILLE PRODUITS ── */}
        {!isLoading && products.length > 0 && viewMode === 'grid' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap:'1.5rem' }}>
            {products.map(p => <ProductCard key={p.id} p={p}/>)}
          </div>
        )}

        {/* ── VUE LISTE ── */}
        {!isLoading && products.length > 0 && viewMode === 'list' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
            {products.map(p => {
              const imgs = Array.isArray(p.images) ? p.images : (p.images ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : []);
              return (
                <Link key={p.id} to={'/produit/'+p.slug}
                  style={{ display:'flex', gap:'1rem', background:'#fff', borderRadius:16, overflow:'hidden', textDecoration:'none', border:'1px solid rgba(30,61,15,0.07)', boxShadow:'0 2px 8px rgba(30,61,15,0.04)', transition:'all 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(30,61,15,0.12)';e.currentTarget.style.transform='translateX(4px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(30,61,15,0.04)';e.currentTarget.style.transform='none';}}>
                  {/* Thumb */}
                  <div style={{ width:120, flexShrink:0, background:'#EDE6D3', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    {imgs[0]
                      ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
                      : <span style={{ fontSize:'2rem', opacity:0.25 }}>📦</span>}
                    {p.quality_grade && (
                      <span style={{ position:'absolute', bottom:6, left:6, background:GRADE[p.quality_grade]||'#888', color:'#fff', borderRadius:6, padding:'2px 6px', fontSize:'0.62rem', fontWeight:800 }}>
                        {p.quality_grade}
                      </span>
                    )}
                  </div>
                  {/* Infos */}
                  <div style={{ flex:1, padding:'1rem 1rem 1rem 0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.7rem', color:'#7EA86A', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>
                        {p.seller_company} · {p.location_city}
                      </div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:'#1E3D0F', marginBottom:4 }}>
                        {p.title?.substring(0,80)}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        {p.eco_delivery_price != null && <span style={{ fontSize:'0.68rem', background:'#E8F8EE', color:'#059669', padding:'2px 7px', borderRadius:100, fontWeight:600 }}>🌿 Éco</span>}
                        {p.urgent_delivery_price != null && <span style={{ fontSize:'0.68rem', background:'#FEF2F2', color:'#DC2626', padding:'2px 7px', borderRadius:100, fontWeight:600 }}>⚡ Urgent</span>}
                        <span style={{ fontSize:'0.68rem', background:'#F6F1E7', color:'#5C5C50', padding:'2px 7px', borderRadius:100 }}>Qté : {p.quantity}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.35rem', fontWeight:700, color:'#4A7C2F' }}>
                        {p.price_on_request ? 'Sur demande' : fmt(p.price)+' MAD'}
                      </div>
                      <div style={{ fontSize:'0.7rem', color:'#9CA3AF', marginTop:2 }}>HT</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem', marginTop:'3rem' }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ padding:'0.55rem 1.1rem', borderRadius:100, border:'1.5px solid #D9CEBC', background:'transparent', color:page===1?'#D9CEBC':'#1E3D0F', cursor:page===1?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem' }}>
              ← Préc.
            </button>

            {Array.from({ length: pagination.pages }, (_,i) => i+1)
              .filter(p => p === 1 || p === pagination.pages || Math.abs(p-page) <= 2)
              .reduce((acc,p,i,arr) => {
                if(i>0 && p - arr[i-1] > 1) acc.push('...');
                acc.push(p); return acc;
              }, [])
              .map((p,i) => p === '...'
                ? <span key={'e'+i} style={{ color:'#9CA3AF', padding:'0 4px' }}>···</span>
                : <button key={p} onClick={() => setPage(p)}
                    style={{ width:38, height:38, borderRadius:'50%', border:'1.5px solid '+(p===page?'#1E3D0F':'#D9CEBC'), background:p===page?'#1E3D0F':'transparent', color:p===page?'#F6F1E7':'#5C5C50', fontWeight:p===page?700:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem', transition:'all 0.15s' }}>
                    {p}
                  </button>
              )
            }

            <button onClick={() => setPage(p => Math.min(pagination.pages,p+1))} disabled={page===pagination.pages}
              style={{ padding:'0.55rem 1.1rem', borderRadius:100, border:'1.5px solid #D9CEBC', background:'transparent', color:page===pagination.pages?'#D9CEBC':'#1E3D0F', cursor:page===pagination.pages?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem' }}>
              Suiv. →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const selSt = {
  padding:'0.5rem 1rem', border:'1.5px solid #D9CEBC', borderRadius:100,
  fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none',
  cursor:'pointer', background:'#F9F7F4', color:'#1E3D0F', appearance:'auto'
};

const numSt = {
  border:'none', background:'transparent', padding:'0.5rem 0.4rem',
  fontSize:'0.8rem', fontFamily:"'DM Sans',sans-serif", outline:'none',
  color:'#1E3D0F', width:80
};

const tagSt = {
  display:'inline-flex', alignItems:'center', gap:4,
  background:'#EDE6D3', color:'#1E3D0F', borderRadius:100,
  padding:'0.2rem 0.7rem', fontSize:'0.75rem', fontWeight:600,
  cursor:'pointer', border:'1px solid #D9CEBC'
};

export default Catalog;
