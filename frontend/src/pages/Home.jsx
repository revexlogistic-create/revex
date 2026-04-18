// src/pages/Home.jsx — REVEX Premium · Vert Racing + Gris Nardo
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const G = {
  deep:'#0F2318', forest:'#1A3C2E', mid:'#2D5A46', sage:'#4A9065', light:'#8DB8A0',
  nardo:'#4A4E5A', steel:'#7A8090', silver:'#B8BCC8', ghost:'#E8ECEB',
  cream:'#F4F6F4', white:'#FAFBFA',
  gold:'#C8A84B', amber:'#E8C866',
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

function StatPill({ value, label, accent }) {
  return (
    <div style={{ textAlign:'center', padding:'0.5rem 1rem' }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:accent||G.amber, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'0.68rem', color:'rgba(244,246,244,0.45)', marginTop:4, letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov?G.forest:G.white, border:'1px solid '+(hov?G.sage:G.ghost), borderRadius:20, padding:'1.8rem',
        boxShadow:hov?'0 16px 48px rgba(15,35,24,0.15)':'0 2px 12px rgba(0,0,0,0.04)',
        transform:hov?'translateY(-4px)':'none', transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ width:48, height:48, borderRadius:14, background:hov?'rgba(255,255,255,0.1)':G.ghost, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', marginBottom:'1.1rem' }}>
        {icon}
      </div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:hov?G.cream:G.deep, marginBottom:'0.5rem' }}>{title}</div>
      <p style={{ fontSize:'0.82rem', color:hov?'rgba(244,246,244,0.65)':G.nardo, lineHeight:1.7, margin:0 }}>{desc}</p>
    </div>
  );
}

function ProductCard({ p }) {
  const [hov, setHov] = useState(false);
  const imgs = Array.isArray(p.images)?p.images:(typeof p.images==='string'?(()=>{ try{return JSON.parse(p.images||'[]')}catch{return []} })():[]);
  const isAuto = p.is_auto === true;
  return (
    <Link to={(isAuto?'/auto/':'/produit/')+p.slug}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'block', textDecoration:'none', background:G.white, borderRadius:18, overflow:'hidden',
        border:'1px solid '+(hov?G.sage:G.ghost),
        boxShadow:hov?'0 16px 40px rgba(15,35,24,0.12)':'0 2px 12px rgba(0,0,0,0.05)',
        transform:hov?'translateY(-5px)':'none', transition:'all 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ height:180, background:G.ghost, position:'relative', overflow:'hidden' }}>
        {imgs[0]
          ? <img src={imgs[0]} alt={p.title} style={{ width:'100%', height:'100%', objectFit:'cover', transform:hov?'scale(1.06)':'scale(1)', transition:'transform 0.5s' }} onError={e=>e.target.style.display='none'}/>
          : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', opacity:0.15 }}>{isAuto?'🔧':'📦'}</div>}
        {p.quality_grade && (
          <div style={{ position:'absolute', top:8, left:8, background:G.deep, color:G.amber, borderRadius:8, padding:'2px 8px', fontSize:'0.7rem', fontWeight:800 }}>{p.quality_grade}</div>
        )}
        {isAuto && (
          <div style={{ position:'absolute', top:8, right:8, background:'rgba(26,60,46,0.85)', color:'#fff', borderRadius:8, padding:'2px 8px', fontSize:'0.65rem', fontWeight:700 }}>🚗 Auto</div>
        )}
      </div>
      <div style={{ padding:'1rem 1.1rem' }}>
        <div style={{ fontSize:'0.68rem', color:G.sage, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.3rem' }}>
          {p.seller_company?.substring(0,18)} · {p.location_city||''}
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:G.deep, lineHeight:1.3, marginBottom:'0.7rem', minHeight:'2.4rem' }}>
          {p.title?.substring(0,52)}{p.title?.length>52?'...':''}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.25rem', fontWeight:700, color:G.sage }}>
            {p.price_on_request?'Sur demande':fmt(p.price)+' MAD'}
          </div>
          <div style={{ background:hov?G.forest:G.ghost, color:hov?G.cream:G.nardo, padding:'0.3rem 0.75rem', borderRadius:100, fontSize:'0.72rem', fontWeight:600, transition:'all 0.2s' }}>Voir →</div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 769);
  useEffect(function() { var h = function() { setIsMobile(window.innerWidth < 769); }; window.addEventListener('resize', h); return function() { window.removeEventListener('resize', h); }; }, []);
  const showPDR = isAuthenticated && user && user.role !== 'acheteur_auto';
  const [search, setSearch] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(function() {
    var handler = function(e) {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner only on mobile
      if (window.innerWidth < 769) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return function() { window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(function() {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    });
  }
  const [searchAuto, setSearchAuto] = useState('');

  const { data: featuredData } = useQuery('featured-home', () => api.get('/products?limit=6&sort=views&is_auto=false').then(r => r.data));
  const { data: autoData }     = useQuery('featured-auto',  () => api.get('/products?limit=4&sort=views&is_auto=true').then(r => r.data));
  const { data: catsData }     = useQuery('categories',     () => api.get('/categories').then(r => r.data));

  return (
    <div className='revex-home' style={{ fontFamily:"'DM Sans',sans-serif", background:G.cream, overflowX:'hidden', maxWidth:'100vw', position:'relative' }}>

      {/* HERO */}
      <section className='hero-section' style={{ overflow:'hidden', background:'linear-gradient(150deg,'+G.deep+' 0%,'+G.forest+' 50%,'+G.mid+' 100%)', padding:'2.5rem 2rem 0', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.5) 40px,rgba(255,255,255,0.5) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.5) 40px,rgba(255,255,255,0.5) 41px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:G.sage, opacity:0.05, top:-250, right:-150, filter:'blur(80px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:G.gold, opacity:0.04, bottom:0, left:'20%', filter:'blur(60px)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', padding:'0.4rem 1.1rem', borderRadius:100, fontSize:'0.75rem', color:G.light, marginBottom:'1.5rem', letterSpacing:'0.06em', textTransform:'uppercase' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:G.amber, display:'inline-block' }}/>
            Marketplace Industrielle & Automobile · Maroc
          </div>

          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(2rem,6vw,5.5rem)', fontWeight:700, lineHeight:1.02, marginBottom:'1.2rem', color:G.cream }}>
            {isMobile ? (
              <>
                Trouvez votre pièce<br/>
                <em style={{ color:G.amber, fontStyle:'italic' }}>auto au Maroc</em>
              </>
            ) : (
              <>
                Le stock dormant<br/>
                <em style={{ color:G.amber, fontStyle:'italic' }}>reprend vie</em>
              </>
            )}
          </h1>

          <p style={{ fontSize:'1rem', color:'rgba(244,246,244,0.65)', maxWidth:520, margin:'0 auto 3rem', lineHeight:1.8, fontWeight:300 }}>
            PDR industriels B2B · Pièces automobiles particuliers.<br/>
            Paiement escrow, certification A+ à D, transport éco.
          </p>

          {/* Search - dual if authenticated, auto only if not */}
          <div className='dual-search' style={{ display:'grid', gridTemplateColumns:showPDR?'1fr 1fr':'1fr', gap:'1.2rem', maxWidth:showPDR?760:420, margin:'0 auto' }}>
            {showPDR && (
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'1.8rem 1.5rem', textAlign:'left' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:'0.5rem' }}>🏭</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:G.cream, marginBottom:'0.3rem' }}>Catalogue PDR</div>
              <div style={{ fontSize:'0.75rem', color:'rgba(244,246,244,0.45)', marginBottom:'1rem', lineHeight:1.5 }}>Pièces industrielles · B2B · Lots</div>
              <div style={{ display:'flex', gap:'0.4rem' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && search.trim() && navigate('/catalogue?search='+encodeURIComponent(search))}
                  placeholder="Référence, désignation..."
                  style={{ flex:1, padding:'0.6rem 0.85rem', borderRadius:100, border:'none', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:'0.78rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.12)' }}/>
                <button onClick={() => search.trim() && navigate('/catalogue?search='+encodeURIComponent(search))}
                  style={{ background:G.amber, color:G.deep, border:'none', borderRadius:100, padding:'0.6rem 0.95rem', fontWeight:700, fontSize:'0.8rem', cursor:'pointer' }}>→</button>
              </div>
              <Link to="/catalogue" style={{ display:'inline-block', marginTop:'0.7rem', color:G.amber, fontSize:'0.75rem', fontWeight:600, textDecoration:'none' }}>Parcourir →</Link>
            </div>
            )}

            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'1.8rem 1.5rem', textAlign:'left' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:'0.5rem' }}>🚗</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:G.cream, marginBottom:'0.3rem' }}>Pièces Automobile</div>
              <div style={{ fontSize:'0.75rem', color:'rgba(244,246,244,0.45)', marginBottom:'1rem', lineHeight:1.5 }}>Particuliers · Toutes marques</div>
              <div style={{ display:'flex', gap:'0.4rem' }}>
                <input value={searchAuto} onChange={e => setSearchAuto(e.target.value)} onKeyDown={e => e.key==='Enter' && searchAuto.trim() && navigate('/pieces-auto?search='+encodeURIComponent(searchAuto))}
                  placeholder="Marque, pièce, référence..."
                  style={{ flex:1, padding:'0.6rem 0.85rem', borderRadius:100, border:'none', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:'0.78rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.12)' }}/>
                <button onClick={() => searchAuto.trim() && navigate('/pieces-auto?search='+encodeURIComponent(searchAuto))}
                  style={{ background:G.sage, color:'#fff', border:'none', borderRadius:100, padding:'0.6rem 0.95rem', fontWeight:700, fontSize:'0.8rem', cursor:'pointer' }}>→</button>
              </div>
              <Link to="/pieces-auto" style={{ display:'inline-block', marginTop:'0.7rem', color:G.light, fontSize:'0.75rem', fontWeight:600, textDecoration:'none' }}>Voir les pièces →</Link>
            </div>
          </div>

          {/* Stats */}
          <div className='stats-bar' style={{ display:'flex', justifyContent:'center', marginTop:'3rem', paddingTop:'2rem', borderTop:'1px solid rgba(255,255,255,0.08)', flexWrap:'wrap' }}>
            {[['685+','Pièces analysées',G.amber],['16 étapes','Processus certifié',G.light],['Escrow','Paiement sécurisé',G.silver],['A+ D','Grades qualité',G.amber]].map(([v,l,c]) => <StatPill key={l} value={v} label={l} accent={c}/>)}
          </div>
        </div>

        <div style={{ marginTop:'3rem', lineHeight:0 }}>
          <svg viewBox="0 0 1440 50" style={{ width:'100%', display:'block' }}>
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill={G.cream}/>
          </svg>
        </div>
      </section>

      {/* DEUX MARKETPLACES — visible uniquement si connecté */}
      {showPDR && (
      <section style={{ background:G.cream, padding:'4rem clamp(1rem,4vw,2rem)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div style={TAG}>Deux marketplaces, une plateforme</div>
            <h2 style={H2}>B2B Industriel · Particuliers Automobile</h2>
          </div>
          <div className='grid-2' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
            {/* PDR */}
            <div style={{ background:G.white, border:'1px solid '+G.ghost, borderRadius:22, padding:'2.5rem', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, width:140, height:140, background:'linear-gradient(225deg,'+G.ghost+',transparent)', borderRadius:'0 22px 0 100%', pointerEvents:'none' }}/>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:G.ghost, border:'1px solid '+G.silver+'55', padding:'0.3rem 0.85rem', borderRadius:100, fontSize:'0.68rem', color:G.nardo, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'1.2rem' }}>🏭 B2B Entreprises</div>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:G.deep, marginBottom:'0.6rem' }}>Catalogue PDR Industriel</h3>
              <p style={{ fontSize:'0.84rem', color:G.nardo, lineHeight:1.7, marginBottom:'1.3rem' }}>Pompes, vannes, moteurs, automatismes. Qualification vendeur, certification A+ à D, escrow B2B, lots et enchères.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem', marginBottom:'1.6rem' }}>
                {['📦 Catalogue + Lots + Enchères','🔒 Paiement escrow sécurisé','⚡ Demandes urgentes PDR','🚛 Transport retour à vide'].map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.81rem', color:G.nardo }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:G.sage, flexShrink:0 }}/>{f}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'0.7rem' }}>
                <Link to="/catalogue" style={{ background:G.forest, color:G.cream, textDecoration:'none', padding:'0.65rem 1.4rem', borderRadius:100, fontWeight:700, fontSize:'0.84rem' }}>Catalogue PDR →</Link>
                <Link to="/register" style={{ background:'transparent', color:G.forest, border:'1.5px solid '+G.ghost, textDecoration:'none', padding:'0.65rem 1.1rem', borderRadius:100, fontWeight:600, fontSize:'0.84rem' }}>S'inscrire</Link>
              </div>
            </div>

            {/* Auto */}
            <div style={{ background:G.deep, border:'1px solid '+G.mid, borderRadius:22, padding:'2.5rem', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, width:140, height:140, background:'linear-gradient(225deg,rgba(74,144,101,0.15),transparent)', borderRadius:'0 22px 0 100%', pointerEvents:'none' }}/>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', padding:'0.3rem 0.85rem', borderRadius:100, fontSize:'0.68rem', color:G.light, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'1.2rem' }}>🚗 Particuliers</div>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:G.cream, marginBottom:'0.6rem' }}>Marketplace Pièces Auto</h3>
              <p style={{ fontSize:'0.84rem', color:'rgba(244,246,244,0.6)', lineHeight:1.7, marginBottom:'1.3rem' }}>Pièces automobiles neuves et occasion. Toutes marques, toutes générations. Vendeurs vérifiés, livraison Maroc.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem', marginBottom:'1.6rem' }}>
                {['🔧 12 catégories de pièces','🚗 Filtre par marque et modèle','📸 Photos détaillées','⚡ Badge livraison express'].map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.81rem', color:'rgba(244,246,244,0.6)' }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:G.sage, flexShrink:0 }}/>{f}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'0.7rem' }}>
                <Link to="/pieces-auto" style={{ background:G.amber, color:G.deep, textDecoration:'none', padding:'0.65rem 1.4rem', borderRadius:100, fontWeight:700, fontSize:'0.84rem' }}>Pièces Auto →</Link>
                <Link to="/register" style={{ background:'rgba(255,255,255,0.1)', color:G.cream, border:'1px solid rgba(255,255,255,0.15)', textDecoration:'none', padding:'0.65rem 1.1rem', borderRadius:100, fontWeight:600, fontSize:'0.84rem' }}>Créer compte</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* FEATURES */}
      <section style={{ background:G.white, padding:'5rem clamp(1rem,4vw,2rem)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div style={TAG}>Plateforme de confiance</div>
            <h2 style={H2}>Conçu pour l'industrie marocaine</h2>
          </div>
          <div className='product-grid' style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.2rem' }}>
            {[
              { icon:'🔒', title:'Escrow B2B', desc:'Paiement séquestré jusqu\'à confirmation. Arbitrage REVEX sur litiges.' },
              { icon:'🏆', title:'Certification A+ à D', desc:'Chaque pièce classifiée selon état réel. Trust Score calculé sur 8 critères.' },
              { icon:'🚛', title:'Transport Éco', desc:'Trajets retour à vide. Jusqu\'à -60% vs transport dédié. Éco-responsable.' },
              { icon:'📜', title:'Traçabilité QR', desc:'Certificat digital REVEX avec QR code unique par transaction.' },
              { icon:'⚡', title:'Urgences PDR', desc:'Décrivez votre besoin urgent. Les vendeurs qualifiés répondent sous 2h.' },
              { icon:'📊', title:'Analyse Stock', desc:'Score de criticité, dormance, valeur dormante. Outil de décision intégré.' },
            ].map(f => <FeatureCard key={f.title} {...f}/>)}
          </div>
        </div>
      </section>

      {/* PRODUITS PDR - visible uniquement si connecté */}
      {showPDR && featuredData?.products?.length > 0 && (
        <section style={{ background:G.cream, padding:'5rem clamp(1rem,4vw,2rem)' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2.5rem', flexWrap:'wrap', gap:'1rem' }}>
              <div>
                <div style={TAG}>Catalogue PDR</div>
                <h2 style={H2}>Produits industriels disponibles</h2>
              </div>
              <Link to="/catalogue" style={{ color:G.sage, fontWeight:600, textDecoration:'none', fontSize:'0.9rem' }}>Voir tout le catalogue →</Link>
            </div>
            <div className='product-grid' style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:'1.2rem' }}>
              {featuredData.products.slice(0,6).map(p => <ProductCard key={p.id} p={p}/>)}
            </div>
          </div>
        </section>
      )}

      {/* PIÈCES AUTO */}
      {autoData?.products?.length > 0 && (
        <section style={{ background:G.deep, padding:'5rem clamp(1rem,4vw,2rem)' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2.5rem', flexWrap:'wrap', gap:'1rem' }}>
              <div>
                <div style={{ ...TAG, color:G.amber }}>Marketplace Auto</div>
                <h2 style={{ ...H2, color:G.cream }}>Pièces automobiles récentes</h2>
              </div>
              <Link to="/pieces-auto" style={{ color:G.amber, fontWeight:600, textDecoration:'none', fontSize:'0.9rem' }}>Voir toutes les pièces →</Link>
            </div>
            <div className='product-grid' style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'1.2rem' }}>
              {autoData.products.slice(0,4).map(p => <ProductCard key={p.id} p={p}/>)}
            </div>
          </div>
        </section>
      )}

      {/* PROCESSUS */}
      <section style={{ background:G.white, padding:'5rem clamp(1rem,4vw,2rem)' }}>
        <div className='grid-2' style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4rem', alignItems:'center' }}>
          <div>
            <div style={TAG}>Comment ça marche</div>
            <h2 style={{ ...H2, marginBottom:'1.2rem' }}>Un processus industriel<br/>en 16 étapes certifiées</h2>
            <p style={{ color:G.nardo, lineHeight:1.8, marginBottom:'2rem', fontSize:'0.9rem' }}>
              De la qualification du vendeur jusqu'au certificat de traçabilité, chaque transaction REVEX est documentée, sécurisée et certifiable.
            </p>

          </div>
          <div className='form-2col' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.9rem' }}>
            {[
              { icon:'🏢', n:'1–3', title:'Qualification', c:G.sage },
              { icon:'🔍', n:'4–6', title:'Certification', c:G.gold },
              { icon:'🚀', n:'7–9', title:'Publication', c:G.steel },
              { icon:'🔒', n:'10–15', title:'Escrow & Livraison', c:G.nardo },
            ].map(s => (
              <div key={s.n} style={{ background:G.cream, border:'1px solid '+G.ghost, borderRadius:16, padding:'1.3rem', position:'relative' }}>
                <div style={{ position:'absolute', top:-10, left:14, background:s.c, color:'#fff', borderRadius:100, padding:'1px 8px', fontSize:'0.65rem', fontWeight:700 }}>{s.n}</div>
                <div style={{ fontSize:'1.6rem', marginBottom:'0.5rem' }}>{s.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:G.deep, fontSize:'0.95rem' }}>{s.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background:'linear-gradient(135deg,'+G.deep+','+G.forest+')', padding:'5rem clamp(1rem,4vw,2rem)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.03, backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.5) 1px,transparent 0)', backgroundSize:'32px 32px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:600, margin:'0 auto' }}>
          <div style={{ ...TAG, color:G.amber }}>Rejoignez REVEX</div>
          <h2 style={{ ...H2, color:G.cream, marginBottom:'1rem' }}>Valorisez votre stock.<br/>Trouvez votre pièce.</h2>
          <p style={{ color:'rgba(244,246,244,0.6)', marginBottom:'2.5rem', lineHeight:1.8, fontSize:'0.95rem' }}>
            PDR industriels pour les entreprises · Pièces auto pour les particuliers.<br/>
            Une seule plateforme, deux marchés, zéro friction.
          </p>
          <div className='mobile-stack' style={{ display:'flex', gap:'0.9rem', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/register" style={{ background:G.amber, color:G.deep, textDecoration:'none', padding:'0.9rem 2rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem' }}>🏭 Je suis vendeur</Link>
            {showPDR && <Link to="/catalogue" style={{ background:'rgba(255,255,255,0.1)', color:G.cream, border:'1px solid rgba(255,255,255,0.2)', textDecoration:'none', padding:'0.9rem 2rem', borderRadius:100, fontWeight:600, fontSize:'0.9rem' }}>📦 Catalogue PDR</Link>}
            <Link to="/pieces-auto" style={{ background:'rgba(255,255,255,0.1)', color:G.cream, border:'1px solid rgba(255,255,255,0.2)', textDecoration:'none', padding:'0.9rem 2rem', borderRadius:100, fontWeight:600, fontSize:'0.9rem' }}>🚗 Pièces Auto</Link>
          </div>
        </div>
      </section>

    </div>
  );
}

const TAG = { fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#4A9065', display:'block', marginBottom:'0.5rem' };
const H2  = { fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:700, color:'#0F2318', lineHeight:1.1, margin:0 };
