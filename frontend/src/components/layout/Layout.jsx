// src/components/layout/Layout.jsx
import '../../styles/revex.css';
import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import api from '../../api/axios';
import TokenBalance from '../tokens/TokenBalance';

const FOREST = '#1E3D0F';
const LEAF   = '#4A7C2F';
const CREAM  = '#F6F1E7';
const MID    = '#D9CEBC';
const MUTED  = '#5C5C50';
const ECO    = '#27AE60';
const URGENT = '#C0392B';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { data: notifData } = useQuery(
    'notifications-count',
    () => api.get('/messages/notifications').then(r => r.data.unread),
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );

  const unread = notifData || 0;

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const dashPath =
    user?.role === 'admin'       ? '/admin'       :
    user?.role === 'seller'      ? '/seller'      :
    user?.role === 'distributor' ? '/distributor' :
    user?.role === 'acheteur_auto' ? '/buyer' :
    '/buyer';

  const roleLabel =
    user?.role === 'admin'       ? 'Admin'       :
    user?.role === 'seller'      ? 'Vendeur'     :
    user?.role === 'distributor' ? 'Distributeur':
    user?.role === 'acheteur_auto' ? 'Mon compte'  :
    'Acheteur';

  const roleIcon =
    user?.role === 'admin'       ? '⚙' :
    user?.role === 'seller'      ? '🏭' :
    user?.role === 'distributor' ? '🔄' :
    user?.role === 'acheteur_auto' ? '🚗' :
    '🛒';

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif", background:CREAM }}>

      {/* ══════════════════════════════════════════
          NAVBAR — Vert Racing Premium
      ══════════════════════════════════════════ */}
      <nav style={{
        position:'sticky', top:0, zIndex:200,
        background:'#0F2318',
        borderBottom:'1px solid rgba(74,144,101,0.2)',
        boxShadow:'0 2px 20px rgba(0,0,0,0.3)',
      }}>
        {/* Accent line top */}
        <div style={{ height:2, background:'linear-gradient(90deg,transparent,#4A9065 30%,#E8C866 50%,#4A9065 70%,transparent)' }}/>

        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 clamp(0.8rem,3vw,2rem)', display:'flex', alignItems:'center', height:60, overflow:'hidden' }}>

          {/* ── LOGO Option D ── */}
          <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'0.55rem', flexShrink:0, marginRight:'1.5rem' }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'#4A9065', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.88rem', color:'#F4F6F4', letterSpacing:'0.02em' }}>RX</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1.15rem', color:'#F4F6F4', letterSpacing:'0.04em', lineHeight:1 }}>REVEX</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:400, fontSize:'0.55rem', color:'rgba(141,184,160,0.7)', letterSpacing:'0.18em', lineHeight:1 }}>PIÈCES · MAROC</span>
            </div>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#E8C866', marginBottom:12, flexShrink:0 }}/>
          </Link>

          {/* Separator */}
          <div style={{ width:1, height:24, background:'rgba(255,255,255,0.1)', marginRight:'1.5rem', flexShrink:0 }}/>

          {/* ── NAV CENTRE ── */}
          <div className="revex-nav-links" style={{ display:'flex', alignItems:'center', gap:2, flex:1 }}>
            <NavItem to="/pieces-auto" active={isActive('/pieces-auto')}>
              <span style={{ fontSize:13 }}>🚗</span> Pièces Auto
            </NavItem>
            {isAuthenticated && user?.role !== 'acheteur_auto' && (
              <>
                <NavItem to="/catalogue" active={isActive('/catalogue')}>
                  <CatalogIcon /> Catalogue
                </NavItem>
                <NavItem to="/lots" active={isActive('/lots')}>
                  <LotsIcon /> Lots
                </NavItem>
                <NavItem to="/transport" active={isActive('/transport')}>
                  <TruckIcon /> Transport
                </NavItem>
              </>
            )}
            {(user?.role === 'seller' || user?.role === 'distributor' || user?.role === 'admin') && (
              <NavItem to="/seller/analyse" active={isActive('/seller/analyse')}>
                <AnalyseIcon /> Analyse
              </NavItem>
            )}
            {(user?.role === 'buyer' || user?.role === 'distributor') && (
              <NavItem to="/buyer/urgence" active={isActive('/buyer/urgence')}>
                <BoltIcon /> Urgence
              </NavItem>
            )}
            {user?.role === 'acheteur_auto' && (
              <NavItem to="/buyer/commandes" active={isActive('/buyer/commandes')}>
                <span style={{ fontSize:13 }}>📦</span> Mes commandes
              </NavItem>
            )}
            {isAuthenticated && (
              <NavItem to={dashPath} active={isActive(dashPath)}>
                <span style={{ fontSize:13 }}>{roleIcon}</span> {roleLabel}
              </NavItem>
            )}
          </div>

          {/* ── DROITE ── */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>

            {isAuthenticated ? (
              <>
                {/* Messages — desktop only */}
                <Link to="/messages" className="hide-mobile"
                  style={{ position:'relative', display:'flex', alignItems:'center', gap:5, padding:'0.4rem 0.8rem', borderRadius:100, fontSize:'0.82rem', fontWeight:500, color:isActive('/messages')?'#E8C866':'rgba(244,246,244,0.6)', background:isActive('/messages')?'rgba(232,200,102,0.12)':'transparent', border:'1px solid '+(isActive('/messages')?'rgba(232,200,102,0.3)':'transparent'), textDecoration:'none', transition:'all 0.15s' }}
                  onMouseEnter={e=>{ if(!isActive('/messages')){ e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(244,246,244,0.9)'; }}}
                  onMouseLeave={e=>{ if(!isActive('/messages')){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(244,246,244,0.6)'; }}}>
                  <ChatIcon />
                  <span>Messages</span>
                  {unread > 0 && (
                    <span style={{ position:'absolute', top:2, right:4, background:'#E8C866', color:'#0F2318', borderRadius:'50%', minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, lineHeight:1 }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                {/* Jetons — desktop only */}
                <span className="hide-mobile"><TokenBalance compact /></span>

                {/* Divider — desktop only */}
                <div className="hide-mobile" style={{ width:1, height:22, background:'rgba(255,255,255,0.1)' }}/>

                {/* User menu */}
                <div ref={menuRef} style={{ position:'relative' }}>
                  <button onClick={() => setUserMenuOpen(o => !o)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'0.3rem 0.5rem 0.3rem 0.4rem', borderRadius:100,
                      border:'1px solid '+(userMenuOpen?'rgba(74,144,101,0.5)':'rgba(255,255,255,0.12)'),
                      background:userMenuOpen?'rgba(74,144,101,0.15)':'rgba(255,255,255,0.05)',
                      cursor:'pointer', transition:'all 0.15s', fontFamily:"'DM Sans',sans-serif" }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#2D5A46,#4A9065)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0, border:'1.5px solid rgba(255,255,255,0.15)' }}>
                      {(user?.company_name || user?.contact_name || 'U').substring(0,2).toUpperCase()}
                    </div>
                    <div className="hide-mobile" style={{ textAlign:'left', lineHeight:1.25 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#F4F6F4', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {user?.company_name?.split(' ')[0] || user?.contact_name?.split(' ')[0] || 'Mon compte'}
                      </div>
                      <div style={{ fontSize:10, color:'rgba(244,246,244,0.45)' }}>{roleLabel}</div>
                    </div>
                    <span className="hide-mobile"><ChevronIcon rotated={userMenuOpen} /></span>
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div style={{ position:'fixed', top:70, right:8, background:'#0F2318', border:'1px solid rgba(74,144,101,0.25)', borderRadius:16, minWidth:240, maxWidth:'calc(100vw - 16px)', boxShadow:'0 12px 40px rgba(0,0,0,0.4)', zIndex:400, overflow:'hidden' }}>
                      {/* User header */}
                      <div style={{ padding:'1rem 1.1rem', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(26,60,46,0.6)' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#F4F6F4' }}>{user?.company_name || user?.contact_name}</div>
                        <div style={{ fontSize:11, color:'rgba(244,246,244,0.4)', marginTop:2 }}>{user?.email}</div>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:5, background:'rgba(74,144,101,0.15)', border:'1px solid rgba(74,144,101,0.3)', borderRadius:100, padding:'1px 8px' }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'#4A9065', display:'inline-block' }}/>
                          <span style={{ fontSize:10, color:'#8DB8A0', fontWeight:600 }}>{roleLabel} · {user?.city || 'Maroc'}</span>
                        </div>
                      </div>
                      {/* Menu items */}
                      {[
                        { to:dashPath,            icon:'⊞', label:'Mon dashboard' },
                        { to: '/profil', icon:'👤', label:'Mon profil' },
                        ...(user?.role === 'seller' || user?.role === 'distributor' ? [{ to:'/seller/achats', icon:'🛒', label:'Mes achats' }] : []),
                        { to:'/messages',          icon:'✉', label:'Messages', badge:unread },
                        { to:'/tokens',            icon:'◈', label:'Mes jetons' },
                        ...(user?.role !== 'buyer' && user?.role !== 'acheteur_auto' ? [{ to:'/seller/qualification', icon:'☑', label:'Ma qualification' }] : []),
                        ...(user?.role !== 'acheteur_auto' ? [{ to:'/transport/profil', icon:'🚛', label:'Espace transporteur' }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to}
                          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.6rem 1rem', fontSize:13, color:'rgba(244,246,244,0.75)', textDecoration:'none', transition:'all 0.12s' }}
                          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(74,144,101,0.12)'; e.currentTarget.style.color='#F4F6F4'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(244,246,244,0.75)'; }}>
                          <span style={{ display:'flex', alignItems:'center', gap:9 }}>
                            <span style={{ fontSize:14, width:18, textAlign:'center', opacity:0.8 }}>{item.icon}</span>
                            {item.label}
                          </span>
                          {item.badge > 0 && (
                            <span style={{ background:'#E8C866', color:'#0F2318', borderRadius:100, padding:'1px 7px', fontSize:10, fontWeight:800 }}>{item.badge}</span>
                          )}
                        </Link>
                      ))}
                      {/* Logout */}
                      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'0.4rem 0.5rem' }}>
                        <button onClick={handleLogout}
                          style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'0.55rem 0.7rem', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:'rgba(220,80,80,0.8)', fontWeight:600, fontFamily:"'DM Sans',sans-serif", transition:'all 0.12s' }}
                          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(220,38,38,0.12)'; e.currentTarget.style.color='#FC8181'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(220,80,80,0.8)'; }}>
                          <LogoutIcon />
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hide-mobile"
                  style={{ padding:'0.42rem 1.1rem', borderRadius:100, border:'1px solid rgba(255,255,255,0.18)', fontSize:'0.84rem', color:'rgba(244,246,244,0.8)', fontWeight:500, textDecoration:'none', transition:'all 0.15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#F4F6F4'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(244,246,244,0.8)'; }}>
                  Connexion
                </Link>
                <Link to="/register" className="hide-mobile"
                  style={{ padding:'0.42rem 1.2rem', borderRadius:100, background:'#4A9065', color:'#fff', fontSize:'0.84rem', fontWeight:600, textDecoration:'none', transition:'all 0.15s', border:'1px solid rgba(74,144,101,0.5)' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='#2D5A46'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='#4A9065'; }}>
                  S'inscrire
                </Link>
              </>
            )}


          </div>
        </div>
      </nav>

      {/* ── MOBILE SLIDE MENU ── */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:'fixed', top:0, left:0, bottom:0, width:'80%', maxWidth:320,
              background:'#0F2318', boxShadow:'4px 0 32px rgba(0,0,0,0.4)',
              display:'flex', flexDirection:'column', overflowY:'auto' }}>

            {/* Header du menu */}
            <div style={{ padding:'1.5rem 1.2rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <div style={{ width:32, height:32, borderRadius:7, background:'#4A9065', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.8rem', color:'#F4F6F4' }}>RX</span>
                </div>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1.1rem', color:'#F4F6F4', letterSpacing:'0.05em' }}>REVEX</span>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#E8C866', marginBottom:10 }}/>
              </div>
              <button onClick={() => setMobileOpen(false)}
                style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%', width:32, height:32, color:'rgba(244,246,244,0.7)', fontSize:'1rem', cursor:'pointer' }}>
                ✕
              </button>
            </div>

            {/* User info si connecté */}
            {isAuthenticated && (
              <div style={{ padding:'1rem 1.2rem', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(26,60,46,0.5)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.8rem' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#2D5A46,#4A9065)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }}>
                    {(user && (user.company_name || user.contact_name || 'U')).substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:'0.88rem', fontWeight:700, color:'#F4F6F4' }}>
                      {user && (user.company_name || user.contact_name || 'Mon compte')}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'rgba(244,246,244,0.45)' }}>{roleLabel}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ flex:1, padding:'0.8rem 0.8rem', display:'flex', flexDirection:'column', gap:2 }}>
              <MobileNavItem to="/pieces-auto" label="🚗 Pièces Auto" active={isActive('/pieces-auto')} onClick={() => setMobileOpen(false)}/>
              {isAuthenticated && user && user.role !== 'acheteur_auto' && (
                <>
                  <MobileNavItem to="/catalogue"     label="📦 Catalogue PDR"      active={isActive('/catalogue')}      onClick={() => setMobileOpen(false)}/>
                  <MobileNavItem to="/lots"          label="🗂 Lots industriels"    active={isActive('/lots')}           onClick={() => setMobileOpen(false)}/>
                  <MobileNavItem to="/transport"     label="🚛 Transport éco"       active={isActive('/transport')}      onClick={() => setMobileOpen(false)}/>
                </>
              )}
              {user && (user.role === 'seller' || user.role === 'distributor' || user.role === 'admin') && (
                <MobileNavItem to="/seller/analyse"  label="📊 Analyse stock"       active={isActive('/seller/analyse')} onClick={() => setMobileOpen(false)}/>
              )}
              {user && (user.role === 'buyer' || user.role === 'distributor') && (
                <MobileNavItem to="/buyer/urgence"   label="⚡ Urgence PDR"         active={isActive('/buyer/urgence')}  onClick={() => setMobileOpen(false)}/>
              )}
              {user && user.role === 'acheteur_auto' && (
                <MobileNavItem to="/buyer/commandes" label="📦 Mes commandes"       active={isActive('/buyer/commandes')} onClick={() => setMobileOpen(false)}/>
              )}
              {isAuthenticated && (
                <>
                  <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'0.4rem 0.2rem' }}/>
                  <MobileNavItem to={dashPath}       label={roleIcon + ' Mon dashboard'} active={isActive(dashPath)}   onClick={() => setMobileOpen(false)}/>
                  <MobileNavItem to="/messages"      label={'💬 Messages' + (unread > 0 ? '  (' + unread + ')' : '')} active={isActive('/messages')} onClick={() => setMobileOpen(false)}/>
                </>
              )}
            </div>

            {/* Footer du menu */}
            <div style={{ padding:'0.8rem', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              {isAuthenticated ? (
                <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0.75rem', borderRadius:12, border:'1px solid rgba(220,38,38,0.25)', background:'rgba(220,38,38,0.08)', cursor:'pointer', fontSize:'0.85rem', color:'#FC8181', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                  🚪 Déconnexion
                </button>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                  <MobileNavItem to="/login"    label="→ Connexion"   active={false} onClick={() => setMobileOpen(false)}/>
                  <Link to="/register" onClick={() => setMobileOpen(false)}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0.65rem', background:'#4A9065', color:'#fff', borderRadius:10, fontSize:'0.85rem', fontWeight:700, textDecoration:'none' }}>
                    S'inscrire
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="mobile-bottom-nav">
        <Link to="/pieces-auto" className={isActive('/pieces-auto')?'active':''}>
          <span className="nav-icon">🚗</span>
          Auto
        </Link>
        {isAuthenticated && user && user.role !== 'acheteur_auto' && (
          <Link to="/catalogue" className={isActive('/catalogue')?'active':''}>
            <span className="nav-icon">📦</span>
            PDR
          </Link>
        )}
        {isAuthenticated ? (
          <Link to={dashPath} className={isActive(dashPath)?'active':''}>
            <span className="nav-icon">{roleIcon}</span>
            Mon espace
          </Link>
        ) : (
          <Link to="/register" className="">
            <span className="nav-icon">✨</span>
            Rejoindre
          </Link>
        )}
        {isAuthenticated && (
          <Link to="/messages" className={isActive('/messages')?'active':''} style={{ position:'relative' }}>
            <span className="nav-icon">💬</span>
            {unread > 0 && <span style={{ position:'absolute', top:0, right:8, background:'#E8C866', color:'#0F2318', borderRadius:'50%', minWidth:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, lineHeight:1 }}>{unread}</span>}
            Messages
          </Link>
        )}
        <button onClick={() => setMobileOpen(o => !o)} style={{ color:mobileOpen?'#E8C866':'rgba(244,246,244,0.5)' }}>
          <span className="nav-icon">{mobileOpen ? '✕' : '☰'}</span>
          Menu
        </button>
      </nav>

      {/* ── CONTENT ── */}
      <main style={{ flex:1 }}>
        <Outlet />
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#0F2318', position:'relative', overflow:'hidden' }}>

        {/* Texture dots */}
        <div style={{ position:'absolute', inset:0, opacity:0.03,
          backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.6) 1px,transparent 0)',
          backgroundSize:'28px 28px', pointerEvents:'none' }}/>

        {/* Top accent line */}
        <div style={{ height:2, background:'linear-gradient(90deg,transparent,#4A9065 30%,#E8C866 50%,#4A9065 70%,transparent)' }}/>

        <div style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'3.5rem 2rem 0' }}>

          {/* Main grid */}
          <div className='footer-grid' style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'3rem', marginBottom:'3rem' }}>

            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.7rem' }}>
                <div style={{ width:40, height:40, borderRadius:9, background:'#4A9065', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.95rem', color:'#F4F6F4' }}>RX</span>
                </div>
                <div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1.3rem', color:'#F4F6F4', letterSpacing:'0.05em', lineHeight:1 }}>REVEX</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:400, fontSize:'0.6rem', color:'rgba(141,184,160,0.6)', letterSpacing:'0.16em', marginTop:2 }}>PIÈCES · MAROC</div>
                </div>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#E8C866', alignSelf:'flex-start', marginTop:3 }}/>
              </div>
              <p style={{ fontSize:'0.82rem', color:'rgba(244,246,244,0.5)', lineHeight:1.75, marginBottom:'1.2rem', maxWidth:240 }}>
                Marketplace B2B de stock dormant industriel et pièces automobiles. Certifié, sécurisé, éco-responsable.
              </p>
              {/* Trust badges */}
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {[
                  ['🔒', 'Escrow sécurisé'],
                  ['🏆', 'Certification A+ à D'],
                  ['📜', 'Traçabilité QR'],
                ].map(([ic, lb]) => (
                  <div key={lb} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.75rem', color:'rgba(244,246,244,0.4)' }}>
                    <span>{ic}</span><span>{lb}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Marketplace */}
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#4A9065', marginBottom:'1rem' }}>Marketplace</div>
              {[
                ['/pieces-auto',    '🚗 Pièces Auto'],

              ].map(([to, label]) => (
                <Link key={to} to={to}
                  style={{ display:'block', fontSize:'0.82rem', color:'rgba(244,246,244,0.5)', textDecoration:'none', marginBottom:'0.5rem', lineHeight:1.6, transition:'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#8DB8A0'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(244,246,244,0.5)'}>
                  {label}
                </Link>
              ))}
            </div>

            {/* Compte */}
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#4A9065', marginBottom:'1rem' }}>Votre compte</div>
              {[
                ['/register',       '✨ Créer un compte'],
                ['/login',          '→ Se connecter'],
                ['/seller',         '🏭 Espace vendeur'],
                ['/buyer/commandes','📋 Mes commandes'],
              ].map(([to, label]) => (
                <Link key={to} to={to}
                  style={{ display:'block', fontSize:'0.82rem', color:'rgba(244,246,244,0.5)', textDecoration:'none', marginBottom:'0.5rem', lineHeight:1.6, transition:'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#8DB8A0'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(244,246,244,0.5)'}>
                  {label}
                </Link>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#4A9065', marginBottom:'1rem' }}>Contact</div>
              <div style={{ fontSize:'0.82rem', color:'rgba(244,246,244,0.5)', lineHeight:2 }}>
                <div>📧 contact@revex.ma</div>
                <div>📍 Casablanca, Maroc</div>
                <div>🕐 Lun–Ven 9h–18h</div>
              </div>
              <div style={{ marginTop:'1.2rem', display:'flex', gap:'0.5rem' }}>
                {['in', 'tw', 'fb'].map(s => (
                  <div key={s} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'rgba(244,246,244,0.4)', cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(74,144,101,0.2)'; e.currentTarget.style.color='#8DB8A0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(244,246,244,0.4)'; }}>
                    {s.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:'1.2rem', paddingBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.7rem' }}>
            <div style={{ fontSize:'0.75rem', color:'rgba(244,246,244,0.3)' }}>
              © {new Date().getFullYear()} REVEX · Marketplace industrielle marocaine · Tous droits réservés
            </div>
            <div style={{ display:'flex', gap:'1.2rem' }}>
              {['Confidentialité', 'CGU', 'Cookies'].map(l => (
                <span key={l} style={{ fontSize:'0.72rem', color:'rgba(244,246,244,0.3)', cursor:'pointer', transition:'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='rgba(244,246,244,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(244,246,244,0.3)'}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Composants internes ─────────────────────────────────── */
const MobileNavItem = ({ to, label, active, onClick }) => (
  <Link to={to} onClick={onClick}
    style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 1rem',
      borderRadius:10, fontSize:'0.88rem', fontWeight:active?700:400,
      color:active?'#E8C866':'rgba(244,246,244,0.75)',
      background:active?'rgba(232,200,102,0.1)':'transparent',
      textDecoration:'none', transition:'all 0.15s' }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
    {label}
  </Link>
);

const NavItem = ({ to, active, children }) => (
  <Link to={to}
    style={{ display:'flex', alignItems:'center', gap:5, padding:'0.38rem 0.8rem', borderRadius:100,
      fontSize:'0.83rem', fontWeight:active?600:400,
      color:active?'#E8C866':'rgba(244,246,244,0.6)',
      background:active?'rgba(232,200,102,0.12)':'transparent',
      border:'1px solid '+(active?'rgba(232,200,102,0.25)':'transparent'),
      textDecoration:'none', transition:'all 0.15s', whiteSpace:'nowrap' }}
    onMouseEnter={e=>{ if(!active){ e.currentTarget.style.color='rgba(244,246,244,0.9)'; e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}}
    onMouseLeave={e=>{ if(!active){ e.currentTarget.style.color='rgba(244,246,244,0.6)'; e.currentTarget.style.background='transparent'; }}}>
    {children}
  </Link>
);

const ChevronIcon = ({ rotated }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition:'transform 0.2s', transform:rotated?'rotate(180deg)':'none', flexShrink:0 }}>
    <path d="M2 3.5L5 6.5L8 3.5" stroke="#5C5C50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CatalogIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.7"/>
  </svg>
);

const TruckIcon = () => (
  <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
    <rect x="0" y="2" width="9" height="7" rx="1" fill="currentColor" opacity="0.7"/>
    <path d="M9 4h3l2 2v3H9V4z" fill="currentColor" opacity="0.7"/>
    <circle cx="3" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="11" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="11" height="15" viewBox="0 0 11 15" fill="none">
    <path d="M7 1L1 8.5H5.5L4 14L10 6.5H5.5L7 1Z" fill="currentColor" opacity="0.8"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2h10a1 1 0 011 1v7a1 1 0 01-1 1H4l-3 2V3a1 1 0 011-1z" fill="currentColor" opacity="0.7"/>
  </svg>
);

const AnalyseIcon = () => (
  <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
    <rect x="0" y="8" width="3" height="6" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="5" y="5" width="3" height="9" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="10" y="0" width="3" height="14" rx="1" fill="currentColor" opacity="0.7"/>
  </svg>
);

const LotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="4" width="12" height="9" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="3" y="1" width="8" height="4" rx="1" fill="currentColor" opacity="0.8"/>
    <line x1="4" y1="7" x2="10" y2="7" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    <line x1="4" y1="9.5" x2="8" y2="9.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
