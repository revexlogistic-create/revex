// src/pages/TransportPage.jsx — Design premium REVEX
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const fmt = n => Number(n||0).toLocaleString('fr-MA');

function TransportCard({ t, user, onBook, onDetail }) {
  const [hovered, setHovered] = useState(false);
  const departDate = new Date(t.departure_date).toLocaleDateString('fr-MA', { weekday:'short', day:'2-digit', month:'long', year:'numeric' });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onDetail && onDetail(t)}
      style={{
        background:'#fff', borderRadius:20, overflow:'hidden',
        boxShadow: hovered ? '0 20px 60px rgba(30,61,15,0.16)' : '0 2px 12px rgba(30,61,15,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        border:'1px solid rgba(30,61,15,0.07)',
        cursor:'pointer'
      }}>

      {/* Header coloré */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.2rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
        {/* Route */}
        <div style={{ display:'flex', alignItems:'center', gap:'1.5rem' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:'#F6F1E7', lineHeight:1 }}>{t.departure_city}</div>
            {t.departure_region && <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.55)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{t.departure_region}</div>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <div style={{ width:44, height:2, background:'rgba(126,168,106,0.6)', borderRadius:2 }}/>
            <span style={{ fontSize:'0.58rem', color:'rgba(246,241,231,0.45)', letterSpacing:'0.12em', textTransform:'uppercase' }}>retour vide</span>
            <div style={{ width:44, height:2, background:'rgba(126,168,106,0.6)', borderRadius:2 }}/>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:'#F6F1E7', lineHeight:1 }}>{t.arrival_city}</div>
            {t.arrival_region && <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.55)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{t.arrival_region}</div>}
          </div>
        </div>

        {/* Prix */}
        <div style={{ textAlign:'right' }}>
          {t.price_per_kg
            ? <><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:'#FCD34D', lineHeight:1 }}>{t.price_per_kg} MAD</div><div style={{ fontSize:'0.68rem', color:'rgba(246,241,231,0.55)', marginTop:2 }}>par kg</div></>
            : <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:'rgba(246,241,231,0.7)' }}>Sur devis</div>
          }
        </div>
      </div>

      {/* Infos */}
      <div style={{ padding:'1rem 1.5rem' }}>
        <div style={{ display:'flex', gap:'1.2rem', flexWrap:'wrap', fontSize:'0.82rem', color:'#5C5C50', marginBottom:'0.8rem' }}>
          <span>📅 {departDate}</span>
          <span>🚛 {t.vehicle_type||'Non précisé'}</span>
          {t.capacity_tons && <span style={{ color:'#059669', fontWeight:600 }}>⚖️ {t.capacity_tons}T dispo</span>}
          {t.volume_m3 && <span>📐 {t.volume_m3}m³</span>}
          <span style={{ color:'#4A7C2F', fontWeight:600 }}>🏭 {t.carrier_company}</span>
          {Number(t.carrier_rating) > 0 && <span>⭐ {Number(t.carrier_rating).toFixed(1)}/5</span>}
        </div>

        {/* Photos */}
        {(() => {
          const photos = typeof t.vehicle_photos === 'string'
            ? (() => { try { return JSON.parse(t.vehicle_photos); } catch { return []; } })()
            : (t.vehicle_photos || []);
          return photos.length > 0 ? (
            <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.8rem' }}>
              <span style={{ fontSize:'0.7rem', color:'#9CA3AF', alignSelf:'center' }}>📸</span>
              {photos.map((p, i) => (
                <div key={i} style={{ width:72, height:54, borderRadius:8, overflow:'hidden', border:'1px solid #D9CEBC' }}>
                  <img src={p} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
            </div>
          ) : null;
        })()}

        {t.notes && (
          <div style={{ fontSize:'0.78rem', color:'#5C5C50', fontStyle:'italic', background:'#F6F1E7', borderRadius:8, padding:'0.45rem 0.8rem', marginBottom:'0.8rem' }}>
            📝 {t.notes}
          </div>
        )}

        {/* CTA */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          {user ? (
            <button onClick={e => { e.stopPropagation(); onBook(t); }}
              style={{ background:hovered?'#059669':'#27AE60', color:'#fff', border:'none', padding:'0.65rem 1.6rem', borderRadius:100, fontSize:'0.88rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'background 0.2s' }}>
              📦 Réserver ce trajet
            </button>
          ) : (
            <Link to="/login"
              onClick={e => e.stopPropagation()}
              style={{ background:'#27AE60', color:'#fff', padding:'0.65rem 1.6rem', borderRadius:100, fontSize:'0.88rem', fontWeight:700, textDecoration:'none' }}>
              Se connecter pour réserver
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransportPage() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const [filters, setFilters]   = useState({ departure:'', arrival:'', date:'' });
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [detailTransport,   setDetailTransport]   = useState(null);
  const [bookForm, setBookForm] = useState({ pickup_city:'', delivery_city:'', weight_kg:'', notes:'' });

  const sf = k => e => setFilters(f => ({ ...f, [k]:e.target.value }));
  const bf = k => e => setBookForm(f => ({ ...f, [k]:e.target.value }));

  const { data, isLoading } = useQuery(
    ['transports', filters],
    () => api.get('/transport?departure='+filters.departure+'&arrival='+filters.arrival+(filters.date?'&date='+filters.date:'')).then(r => r.data),
    { staleTime: 30000 }
  );

  const transports = data?.transports || [];

  const bookMutation = useMutation(
    (payload) => api.post('/transport/book', payload),
    {
      onSuccess: (res) => {
        toast.success('✅ ' + res.data.message);
        setSelectedTransport(null);
        setBookForm({ pickup_city:'', delivery_city:'', weight_kg:'', notes:'' });
        qc.invalidateQueries('transports');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur réservation')
    }
  );

  const handleBook = () => {
    if (!selectedTransport) return;
    bookMutation.mutate({
      transport_id:   selectedTransport.id,
      pickup_city:    bookForm.pickup_city || selectedTransport.departure_city,
      delivery_city:  bookForm.delivery_city || selectedTransport.arrival_city,
      weight_kg:      Number(bookForm.weight_kg) || 50,
      notes:          bookForm.notes
    });
  };

  const openBook = (t) => {
    setSelectedTransport(t);
    setBookForm({ pickup_city:t.departure_city, delivery_city:t.arrival_city, weight_kg:'', notes:'' });
  };

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'3rem 2rem 2.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:240, height:240, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.18)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:30, right:80, width:140, height:140, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.12)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:80, width:180, height:180, borderRadius:'50%', background:'rgba(74,124,47,0.07)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1.5rem' }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(126,168,106,0.15)', border:'1px solid rgba(126,168,106,0.3)', borderRadius:100, padding:'0.3rem 0.9rem', marginBottom:'0.8rem' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block' }}/>
              <span style={{ fontSize:'0.72rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Transport Éco</span>
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.8rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, margin:'0 0 0.5rem' }}>
              🚛 Transport Retour à Vide
            </h1>
            <p style={{ color:'rgba(246,241,231,0.62)', fontSize:'0.92rem', margin:'0 0 1rem' }}>
              {isLoading ? '...' : transports.length+' trajet'+(transports.length!==1?'s':'')+' disponibles · Livraison éco, jusqu\'à -60%'}
            </p>
            <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
              {[['✅','-60% vs transport dédié'],['🌿','Éco-responsable'],['📦','Chargement partiel accepté'],['🏭','B2B industriel']].map(([ico,lbl]) => (
                <span key={lbl} style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.8)', borderRadius:100, padding:'0.25rem 0.75rem', fontSize:'0.72rem', border:'1px solid rgba(255,255,255,0.12)' }}>
                  {ico} {lbl}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', alignItems:'flex-end' }}>
            <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.45)', textAlign:'center' }}>{transports.length} trajet(s) disponible(s)</div>
            <Link to={user ? '/transport/profil' : '/register'}
              style={{ background:'#F6F1E7', color:'#1E3D0F', textDecoration:'none', padding:'0.8rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
              {user ? '🚛 Mon espace transporteur →' : "S'inscrire transporteur →"}
            </Link>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1280, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

        {/* ── FILTRES ── */}
        <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1.5rem', boxShadow:'0 2px 16px rgba(30,61,15,0.06)', border:'1px solid rgba(30,61,15,0.07)', display:'flex', gap:'0.8rem', flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={lbl}>🏙 Ville de départ</label>
            <input value={filters.departure} onChange={sf('departure')} placeholder="Ex: Casablanca" style={inp}/>
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={lbl}>🏁 Ville d'arrivée</label>
            <input value={filters.arrival} onChange={sf('arrival')} placeholder="Ex: Marrakech" style={inp}/>
          </div>
          <div style={{ minWidth:180 }}>
            <label style={lbl}>📅 Date minimum</label>
            <input type="date" value={filters.date} onChange={sf('date')} style={inp}/>
          </div>
          <button onClick={() => setFilters({ departure:'', arrival:'', date:'' })}
            style={{ padding:'0.65rem 1.2rem', background:'#F6F1E7', color:'#5C5C50', border:'1.5px solid #D9CEBC', borderRadius:100, cursor:'pointer', fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', alignSelf:'flex-end' }}>
            Réinitialiser
          </button>
        </div>

        {/* ── RÉSULTATS ── */}
        <div style={{ fontSize:'0.85rem', color:'#9CA3AF', marginBottom:'1rem' }}>
          {isLoading ? 'Recherche...' : transports.length+' résultat'+(transports.length!==1?'s':'')}
        </div>

        {isLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ borderRadius:20, overflow:'hidden', background:'#fff', border:'1px solid rgba(30,61,15,0.06)' }}>
                <div style={{ height:80, background:'linear-gradient(90deg,#1E3D0F 0%,#2D5A1B 50%,#1E3D0F 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
                <div style={{ padding:'1rem 1.5rem' }}>
                  <div style={{ height:12, background:'#EDE6D3', borderRadius:100, width:'50%', marginBottom:8 }}/>
                  <div style={{ height:28, background:'#EDE6D3', borderRadius:100, width:'30%' }}/>
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        ) : transports.length === 0 ? (
          <div style={{ textAlign:'center', padding:'5rem 2rem', background:'#fff', borderRadius:20, border:'1px solid rgba(30,61,15,0.06)' }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:0.25 }}>🚛</div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F', marginBottom:'0.5rem' }}>Aucun trajet disponible</h3>
            <p style={{ color:'#9CA3AF', marginBottom:'1.5rem', fontSize:'0.9rem' }}>Modifiez vos filtres ou revenez plus tard</p>
            <Link to={user ? '/transport/profil' : '/register'}
              style={{ display:'inline-block', background:'#1E3D0F', color:'#F6F1E7', padding:'0.75rem 2rem', borderRadius:100, textDecoration:'none', fontWeight:600, fontSize:'0.9rem' }}>
              {user ? 'Déclarer votre trajet →' : "S'inscrire comme transporteur →"}
            </Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {transports.map(t => <TransportCard key={t.id} t={t} user={user} onBook={openBook} onDetail={t => setDetailTransport(t)}/>)}
          </div>
        )}

        {/* ── CTA Transporteur ── */}
        <div style={{ marginTop:'2.5rem', background:'#fff', border:'1px solid rgba(30,61,15,0.08)', borderRadius:18, padding:'2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1.5rem', boxShadow:'0 2px 12px rgba(30,61,15,0.05)' }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:'#1E3D0F', marginBottom:'0.3rem' }}>
              Vous êtes transporteur ?
            </div>
            <div style={{ fontSize:'0.88rem', color:'#5C5C50', lineHeight:1.6 }}>
              Déclarez vos retours à vide et générez des revenus sur vos trajets non chargés.<br/>
              <span style={{ color:'#059669', fontWeight:600 }}>Commissionnement REVEX : 5% seulement sur les transactions réalisées.</span>
            </div>
          </div>
          <Link to={user ? '/transport/profil' : '/register'}
            style={{ background:'#1E3D0F', color:'#F6F1E7', textDecoration:'none', padding:'0.9rem 2rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(30,61,15,0.25)' }}>
            {user ? '🚛 Mon espace transporteur →' : "S'inscrire comme transporteur →"}
          </Link>
        </div>
      </div>

      {/* ══ POPUP DÉTAIL TRAJET ══ */}
      {detailTransport && (
        <div onClick={() => setDetailTransport(null)}
          style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#F6F1E7', borderRadius:24, maxWidth:560, width:'100%', maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.3)', margin:'auto' }}>

            {/* Header — avec photo plein-largeur si disponible */}
            {(() => {
              const hPhotos = typeof detailTransport.vehicle_photos === 'string'
                ? (() => { try { return JSON.parse(detailTransport.vehicle_photos); } catch { return []; } })()
                : (detailTransport.vehicle_photos || []);
              return hPhotos.length > 0 ? (
                <div style={{ position:'relative', flexShrink:0, height:200, overflow:'hidden' }}>
                  <img src={hPhotos[0]} alt="Véhicule"
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                  {/* Overlay gradient */}
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(30,61,15,0.85) 100%)' }}/>

                  {/* Vignettes thumbnails si plusieurs photos */}
                  {hPhotos.length > 1 && (
                    <div style={{ position:'absolute', bottom:10, right:12, display:'flex', gap:'0.35rem' }}>
                      {hPhotos.slice(1,4).map((p, i) => (
                        <div key={i} style={{ width:44, height:33, borderRadius:6, overflow:'hidden', border:'1.5px solid rgba(255,255,255,0.5)', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
                          <img src={p} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        </div>
                      ))}
                      {hPhotos.length > 4 && (
                        <div style={{ width:44, height:33, borderRadius:6, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'#fff', fontWeight:700 }}>
                          +{hPhotos.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Trajet en overlay bas */}
                  <div style={{ position:'absolute', bottom:10, left:16, display:'flex', alignItems:'center', gap:'0.9rem' }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:'#F6F1E7', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
                      {detailTransport.departure_city}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                      <div style={{ width:30, height:1.5, background:'rgba(255,255,255,0.6)', borderRadius:2 }}/>
                      <div style={{ fontSize:'0.45rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>vide</div>
                      <div style={{ width:30, height:1.5, background:'rgba(255,255,255,0.6)', borderRadius:2 }}/>
                    </div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:'#F6F1E7', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
                      {detailTransport.arrival_city}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.5rem 1.8rem', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'0.6rem' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:'#F6F1E7', lineHeight:1 }}>
                        {detailTransport.departure_city}
                      </div>
                      {detailTransport.departure_region && (
                        <div style={{ fontSize:'0.62rem', color:'rgba(246,241,231,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                          {detailTransport.departure_region}
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                      <div style={{ width:40, height:2, background:'rgba(126,168,106,0.5)', borderRadius:2 }}/>
                      <div style={{ fontSize:'0.55rem', color:'rgba(246,241,231,0.4)', letterSpacing:'0.12em', textTransform:'uppercase' }}>retour vide</div>
                      <div style={{ width:40, height:2, background:'rgba(126,168,106,0.5)', borderRadius:2 }}/>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:'#F6F1E7', lineHeight:1 }}>
                        {detailTransport.arrival_city}
                      </div>
                      {detailTransport.arrival_region && (
                        <div style={{ fontSize:'0.62rem', color:'rgba(246,241,231,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                          {detailTransport.arrival_region}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'rgba(246,241,231,0.6)' }}>
                    🏭 {detailTransport.carrier_company}
                    {Number(detailTransport.carrier_rating) > 0 && (' · ⭐ '+Number(detailTransport.carrier_rating).toFixed(1)+'/5')}
                  </div>
                </div>

              </div>
            </div>

            {/* Corps scrollable */}
            <div style={{ overflowY:'auto', flex:1, padding:'1.5rem 1.8rem' }}>

              {/* Grille infos */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginBottom:'1.2rem' }}>
                {[
                  ['📅 Date départ', new Date(detailTransport.departure_date).toLocaleDateString('fr-MA', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })],
                  ['🚛 Type véhicule', detailTransport.vehicle_type || 'Non précisé'],
                  ['⚖️ Capacité', detailTransport.capacity_tons ? detailTransport.capacity_tons+' T disponibles' : '—'],
                  ['📐 Volume', detailTransport.volume_m3 ? detailTransport.volume_m3+' m³' : '—'],
                  ['💰 Tarif', detailTransport.price_per_kg ? detailTransport.price_per_kg+' MAD / kg' : 'Sur devis'],
                  ['📍 Corridor', (detailTransport.departure_city||'—')+' → '+(detailTransport.arrival_city||'—')],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:'#EDE6D3', borderRadius:10, padding:'0.6rem 0.85rem' }}>
                    <div style={{ fontSize:'0.62rem', color:'#5C5C50', marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#1E3D0F' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Galerie photos supplémentaires */}
              {(() => {
                const photos = typeof detailTransport.vehicle_photos === 'string'
                  ? (() => { try { return JSON.parse(detailTransport.vehicle_photos); } catch { return []; } })()
                  : (detailTransport.vehicle_photos || []);
                const extra = photos.slice(1); // La 1ère est déjà en header
                return extra.length > 0 ? (
                  <div style={{ marginBottom:'1.2rem' }}>
                    <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#1E3D0F', marginBottom:'0.5rem' }}>📸 Autres photos</div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {extra.map((p, i) => (
                        <div key={i} style={{ width:120, height:90, borderRadius:10, overflow:'hidden', border:'1px solid #D9CEBC' }}>
                          <img src={p} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Notes */}
              {detailTransport.notes && (
                <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1.2rem', fontSize:'0.82rem', color:'#1D4ED8' }}>
                  📝 <strong>Notes du transporteur :</strong> {detailTransport.notes}
                </div>
              )}

              {/* Avantages */}
              <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1.2rem', fontSize:'0.78rem', color:'#065F46', lineHeight:1.7 }}>
                ✅ Trajet retour à vide — économisez jusqu'à 60% vs transport dédié<br/>
                🌿 Solution éco-responsable — camion qui rentrerait à vide<br/>
                📦 Chargement partiel accepté — payez uniquement votre tonnage
              </div>

              {/* Estimation coût */}
              {detailTransport.price_per_kg && (
                <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1.2rem' }}>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#92400E', marginBottom:'0.5rem' }}>💰 Estimateur de coût</div>
                  <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap', fontSize:'0.82rem', color:'#78350F' }}>
                    <span>100 kg → <strong>{(100 * Number(detailTransport.price_per_kg)).toLocaleString('fr-MA')} MAD</strong></span>
                    <span>500 kg → <strong>{(500 * Number(detailTransport.price_per_kg)).toLocaleString('fr-MA')} MAD</strong></span>
                    <span>1T → <strong>{(1000 * Number(detailTransport.price_per_kg)).toLocaleString('fr-MA')} MAD</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'1rem 1.8rem', borderTop:'1px solid #EDE6D3', background:'#fff', display:'flex', gap:'0.7rem', flexShrink:0 }}>
              {user ? (
                <button onClick={() => { setDetailTransport(null); openBook(detailTransport); }}
                  style={{ flex:1, background:'#27AE60', color:'#fff', border:'none', padding:'0.85rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  📦 Réserver ce trajet
                </button>
              ) : (
                <Link to="/login"
                  style={{ flex:1, background:'#27AE60', color:'#fff', textAlign:'center', padding:'0.85rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', textDecoration:'none', display:'block' }}>
                  Se connecter pour réserver
                </Link>
              )}
              <button onClick={() => setDetailTransport(null)}
                style={{ background:'transparent', color:'#5C5C50', border:'1.5px solid #D9CEBC', padding:'0.85rem 1.3rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL RÉSERVATION ══ */}
      {selectedTransport && (
        <div onClick={() => setSelectedTransport(null)}
          className='revex-modal' style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem', overflowY:'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:24, padding:'2.5rem', maxWidth:500, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', maxHeight:'92vh', overflowY:'auto', margin:'auto' }}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.8rem', marginBottom:'1.5rem' }}>
              <div>
                <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', color:'#1E3D0F', marginBottom:'0.2rem' }}>
                  📦 Réserver ce trajet
                </h2>
                <div style={{ fontSize:'0.84rem', color:'#5C5C50' }}>
                  {selectedTransport.departure_city} → {selectedTransport.arrival_city} · {selectedTransport.carrier_company}
                </div>
              </div>
              <button onClick={() => setSelectedTransport(null)}
                style={{ background:'#EDE6D3', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:'0.9rem', flexShrink:0, marginLeft:'1rem' }}>
                ✕
              </button>
            </div>

            {/* Récap */}
            <div style={{ background:'#F6F1E7', borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1.5rem' }}>
              {[
                ['Date départ',    new Date(selectedTransport.departure_date).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })],
                ['Véhicule',       selectedTransport.vehicle_type || 'Non précisé'],
                ['Capacité',       selectedTransport.capacity_tons ? selectedTransport.capacity_tons+'T' : '—'],
                ['Tarif',          selectedTransport.price_per_kg ? selectedTransport.price_per_kg+' MAD/kg' : 'Sur devis'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.4rem 0', borderBottom:'1px solid #D9CEBC', fontSize:'0.84rem' }}>
                  <span style={{ color:'#5C5C50' }}>{k}</span>
                  <span style={{ color:'#1E3D0F', fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Formulaire */}
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1.5rem' }}>
              <div>
                <label style={lbl}>Ville de chargement</label>
                <input value={bookForm.pickup_city} onChange={bf('pickup_city')} placeholder={selectedTransport.departure_city} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Ville de livraison</label>
                <input value={bookForm.delivery_city} onChange={bf('delivery_city')} placeholder={selectedTransport.arrival_city} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Poids de la marchandise (kg)</label>
                <input type="number" value={bookForm.weight_kg} onChange={bf('weight_kg')} placeholder="Ex: 500" style={inp} min="1"/>
                {selectedTransport.price_per_kg && Number(bookForm.weight_kg) > 0 && (
                  <div style={{ background:'#ECFDF5', borderRadius:8, padding:'0.4rem 0.8rem', marginTop:'0.35rem', fontSize:'0.8rem', color:'#059669', fontWeight:700 }}>
                    💰 Estimation : {fmt(Math.round(Number(selectedTransport.price_per_kg) * Number(bookForm.weight_kg)))} MAD
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Notes <span style={{ color:'#9CA3AF', fontWeight:400 }}>(optionnel)</span></label>
                <textarea value={bookForm.notes} onChange={bf('notes')} rows={3}
                  placeholder="Ex: Marchandises fragiles, disponible à partir de 8h, accès quai n°3..."
                  style={{ ...inp, resize:'vertical' }}/>
              </div>
            </div>

            <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1.5rem', fontSize:'0.78rem', color:'#065F46', lineHeight:1.65 }}>
              ✅ Demande transmise au transporteur · 📩 Message automatique envoyé · ⏱ Confirmation sous 24h
            </div>

            <div style={{ display:'flex', gap:'0.8rem' }}>
              <button onClick={handleBook} disabled={bookMutation.isLoading}
                style={{ flex:1, background:bookMutation.isLoading?'#D9CEBC':'#27AE60', color:'#fff', border:'none', padding:'1rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', cursor:bookMutation.isLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                {bookMutation.isLoading ? '⏳ Envoi...' : '✅ Confirmer la réservation'}
              </button>
              <button onClick={() => setSelectedTransport(null)}
                style={{ background:'transparent', color:'#5C5C50', border:'1.5px solid #D9CEBC', padding:'1rem 1.4rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize:'0.78rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.68rem 0.9rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
