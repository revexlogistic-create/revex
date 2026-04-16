// src/pages/TransportProfile.jsx — Profil & espace transporteur
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/ui/BackButton';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const VEHICLE_TYPES = [
  'Fourgon (< 1T)', 'Porteur (1-5T)', 'Porteur (5-10T)',
  'Semi-remorque (10-20T)', 'Semi-remorque (> 20T)', 'Camion frigorifique', 'Plateau bâché'
];

const STATUS_CONFIG = {
  available:  { label:'🟢 Disponible',  color:C.eco,    bg:'#E8F8EE' },
  booked:     { label:'🔵 Réservé',     color:C.blue,   bg:'#EBF5FB' },
  in_transit: { label:'🚛 En route',    color:C.orange, bg:'#FEF5E7' },
  completed:  { label:'✅ Terminé',     color:C.muted,  bg:C.beige   },
  cancelled:  { label:'❌ Annulé',      color:C.urgent, bg:'#FDECEA' },
};

const BOOKING_STATUS = {
  pending:           { label:'⏳ En attente',       color:C.orange },
  confirmed:         { label:'✅ Confirmé',          color:C.eco    },
  picked_up:         { label:'📦 Pris en charge',   color:C.blue   },
  delivered:         { label:'✅ Livré',             color:C.eco    },
  cancelled:         { label:'❌ Annulé',            color:C.urgent },
};

const EMPTY_FORM = {
  departure_city:'', departure_region:'', arrival_city:'', arrival_region:'',
  departure_date:'', vehicle_type:'Porteur (1-10T)',
  capacity_tons:'', volume_m3:'', price_per_kg:'', notes:'',
  contact_phone:'', contact_name:'', vehicle_photos:[]
};

export default function TransportProfile() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const [activeTab, setActiveTab] = useState('trajets');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Mes trajets ──────────────────────────────────────────────
  const { data: trajetsData, isLoading: loadTrajets } = useQuery(
    'my-transports',
    () => api.get('/transport?my=true').then(r => r.data),
    { retry: false }
  );

  // ── Mes réservations ─────────────────────────────────────────
  const { data: bookingsData, isLoading: loadBookings } = useQuery(
    'my-transport-bookings',
    () => api.get('/transport/bookings').then(r => r.data),
    { retry: false }
  );

  const trajets  = trajetsData?.transports || [];
  const bookings = bookingsData?.bookings  || [];

  // ── Statistiques ─────────────────────────────────────────────
  const stats = {
    total:     trajets.length,
    actifs:    trajets.filter(t => t.status === 'available').length,
    reservations: bookings.length,
    livrees:   bookings.filter(b => b.status === 'delivered').length,
    ca:        bookings.filter(b => b.status === 'delivered').reduce((s,b) => s + Number(b.booking_price||0), 0),
  };

  // ── Publier un trajet ────────────────────────────────────────
  const publishMutation = useMutation(
    (data) => api.post('/transport', data),
    {
      onSuccess: () => {
        toast.success('🚛 Trajet publié avec succès !');
        setShowForm(false);
        setForm(EMPTY_FORM);
        qc.invalidateQueries('my-transports');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur publication')
    }
  );

  // ── Annuler un trajet ────────────────────────────────────────
  const cancelMutation = useMutation(
    (id) => api.delete('/transport/'+id),
    {
      onSuccess: () => { toast.success('Trajet annulé'); qc.invalidateQueries('my-transports'); },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  // ── Confirmer une réservation ────────────────────────────────
  const confirmBookingMutation = useMutation(
    (id) => api.put('/transport/bookings/'+id+'/confirm'),
    {
      onSuccess: () => { toast.success('✅ Réservation confirmée !'); qc.invalidateQueries('my-transport-bookings'); },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  const handlePublish = () => {
    if (!form.departure_city || !form.arrival_city || !form.departure_date)
      return toast.error('Ville départ, arrivée et date obligatoires');
    publishMutation.mutate(form);
  };

  if (!user) return (
    <div style={{ textAlign:'center', padding:'4rem' }}>
      <Link to="/login" style={{ background:C.forest, color:C.cream, padding:'0.8rem 2rem', borderRadius:100, textDecoration:'none', fontWeight:600 }}>
        Se connecter pour accéder à l'espace transporteur
      </Link>
    </div>
  );

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'2.5rem 2rem 2rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:220, height:220, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.18)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:60, width:150, height:150, borderRadius:'50%', background:'rgba(74,124,47,0.06)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ marginBottom:'1.2rem' }}><BackButton to="/transport" label="Transport" style={{ color:'rgba(246,241,231,0.7)', borderColor:'rgba(246,241,231,0.2)', background:'rgba(255,255,255,0.08)' }}/></div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(126,168,106,0.15)', border:'1px solid rgba(126,168,106,0.3)', borderRadius:100, padding:'0.25rem 0.8rem', marginBottom:'0.7rem' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block' }}/>
                <span style={{ fontSize:'0.7rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Espace Transporteur</span>
              </div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.4rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, marginBottom:'0.3rem' }}>
                🚛 Mes Retours à Vide
              </h1>
              <p style={{ color:'rgba(246,241,231,0.6)', fontSize:'0.9rem' }}>
                {user.company_name} · Livraisons éco REVEX
              </p>
            </div>
            <button onClick={() => setShowForm(s => !s)}
              style={{ background:showForm?'rgba(255,255,255,0.1)':'#F6F1E7', color:showForm?'#F6F1E7':'#1E3D0F', border:showForm?'1px solid rgba(255,255,255,0.25)':'none', padding:'0.8rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s' }}>
              {showForm ? '✕ Annuler' : '+ Déclarer un retour à vide'}
            </button>
          </div>

          {/* KPIs dans le hero */}
          <div className='kpi-grid' style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.8rem', marginTop:'1.8rem' }}>
            {[
              { icon:'🚛', label:'Trajets publiés',     value:stats.total,       color:'#F6F1E7'   },
              { icon:'🟢', label:'Actifs',              value:stats.actifs,      color:'#7EA86A'   },
              { icon:'📦', label:'Réservations',        value:stats.reservations, color:'#93C5FD'  },
              { icon:'✅', label:'Livrés',              value:stats.livrees,     color:'#6EE7B7'   },
              { icon:'💰', label:'CA réalisé',          value:fmt(stats.ca)+' MAD', color:'#FCD34D' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'1rem', textAlign:'center', backdropFilter:'blur(4px)' }}>
                <div style={{ fontSize:'1.4rem', marginBottom:'0.3rem' }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:'0.68rem', color:'rgba(246,241,231,0.55)', marginTop:'0.25rem' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    <div style={{ maxWidth:1200, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

      {/* ── FORMULAIRE NOUVEAU TRAJET ── */}
      {showForm && (
        <div style={{ background:C.white, border:'1.5px solid '+(C.leaf)+'', borderRadius:20, padding:'2rem', marginBottom:'2rem' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'1.5rem' }}>
            🚛 Déclarer un retour à vide
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.9rem' }}>
            <div>
              <label style={lbl}>Ville de départ *</label>
              <input value={form.departure_city} onChange={set('departure_city')} placeholder="Ex: Casablanca" style={inp} />
            </div>
            <div>
              <label style={lbl}>Ville d'arrivée *</label>
              <input value={form.arrival_city} onChange={set('arrival_city')} placeholder="Ex: Marrakech" style={inp} />
            </div>
            <div>
              <label style={lbl}>Région départ</label>
              <input value={form.departure_region} onChange={set('departure_region')} placeholder="Ex: Grand Casablanca" style={inp} />
            </div>
            <div>
              <label style={lbl}>Région arrivée</label>
              <input value={form.arrival_region} onChange={set('arrival_region')} placeholder="Ex: Marrakech-Safi" style={inp} />
            </div>
            <div>
              <label style={lbl}>Date de départ *</label>
              <input type="date" value={form.departure_date} onChange={set('departure_date')} style={inp} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label style={lbl}>Type de véhicule</label>
              <select value={form.vehicle_type} onChange={set('vehicle_type')} style={inp}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Capacité disponible (Tonnes)</label>
              <input type="number" value={form.capacity_tons} onChange={set('capacity_tons')} placeholder="Ex: 12" style={inp} min="0" step="0.5" />
            </div>
            <div>
              <label style={lbl}>Volume disponible (m³)</label>
              <input type="number" value={form.volume_m3} onChange={set('volume_m3')} placeholder="Ex: 45" style={inp} min="0" />
            </div>
            <div>
              <label style={lbl}>Tarif (MAD/kg)</label>
              <input type="number" value={form.price_per_kg} onChange={set('price_per_kg')} placeholder="Ex: 0.18" style={inp} min="0" step="0.01" />
            </div>
            <div>
              <label style={lbl}>Téléphone contact</label>
              <input value={form.contact_phone} onChange={set('contact_phone')} placeholder="Ex: 06 12 34 56 78" style={inp} />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Notes / Conditions</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3}
                placeholder="Ex: Marchandises sèches uniquement, chargement disponible dès 8h..."
                style={{ ...inp, resize:'vertical', fontFamily:"'DM Sans',sans-serif" }} />
            </div>

            {/* ── PHOTOS DE LA REMORQUE ── */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>📸 Photos du véhicule / remorque <span style={{ color:C.muted, fontWeight:400 }}>(optionnel — max 4 photos)</span></label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.6rem', marginTop:'0.3rem' }}>
                {/* Slots photos */}
                {[0,1,2,3].map(idx => {
                  const photo = form.vehicle_photos[idx];
                  return (
                    <div key={idx} style={{ position:'relative', aspectRatio:'4/3', borderRadius:12, overflow:'hidden', border:'1.5px dashed '+(photo?C.leaf:C.mid), background:photo?'transparent':C.beige, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'border-color 0.2s' }}
                      onClick={() => !photo && document.getElementById('photo-input-'+idx).click()}
                      onMouseEnter={e=>!photo&&(e.currentTarget.style.borderColor=C.leaf)}
                      onMouseLeave={e=>!photo&&(e.currentTarget.style.borderColor=C.mid)}>
                      {photo ? (
                        <>
                          <img src={photo} alt={'Photo '+(idx+1)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                          <button
                            onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, vehicle_photos: f.vehicle_photos.filter((_,i)=>i!==idx) })); }}
                            style={{ position:'absolute', top:4, right:4, background:'rgba(192,57,43,0.85)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                            ✕
                          </button>
                        </>
                      ) : (
                        <div style={{ textAlign:'center', color:C.muted }}>
                          <div style={{ fontSize:'1.4rem', marginBottom:'0.2rem' }}>📷</div>
                          <div style={{ fontSize:'0.7rem' }}>Photo {idx+1}</div>
                        </div>
                      )}
                      <input
                        id={'photo-input-'+idx}
                        type="file" accept="image/*" style={{ display:'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.size > 3 * 1024 * 1024) { alert('Photo trop grande (max 3 Mo)'); return; }
                          const reader = new FileReader();
                          reader.onload = ev => {
                            setForm(f => {
                              const photos = [...f.vehicle_photos];
                              photos[idx] = ev.target.result;
                              return { ...f, vehicle_photos: photos.filter(Boolean) };
                            });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {form.vehicle_photos.length > 0 && (
                <div style={{ fontSize:'0.75rem', color:C.eco, marginTop:'0.4rem' }}>
                  ✅ {form.vehicle_photos.length} photo(s) ajoutée(s)
                </div>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.8rem', marginTop:'1.2rem' }}>
            <button onClick={handlePublish} disabled={publishMutation.isLoading}
              style={{ background:C.forest, color:C.cream, border:'none', padding:'0.85rem 2.5rem', borderRadius:100, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity:publishMutation.isLoading?0.7:1 }}>
              {publishMutation.isLoading ? '⏳ Publication...' : '✅ Publier le trajet'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              style={{ background:'transparent', color:C.muted, border:'1px solid '+C.mid, padding:'0.85rem 1.5rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className='tabs-scroll' style={{ display:'flex', gap:'0.3rem', marginBottom:'1.5rem', borderBottom:'2px solid '+(C.mid)+'' }}>
        {[
          ['trajets',      '🚛 Mes trajets ('+(trajets.length)+')'],
          ['reservations', '📦 Réservations ('+(bookings.length)+')'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'0.65rem 1.3rem', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.9rem', fontWeight:activeTab===id?700:400, color:activeTab===id?C.forest:C.muted, borderBottom:activeTab===id?'3px solid '+C.leaf:'3px solid transparent', fontFamily:"'DM Sans',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ════ TAB : MES TRAJETS ════ */}
      {activeTab === 'trajets' && (
        <div>
          {loadTrajets ? (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
          ) : trajets.length === 0 ? (
            <div style={{ textAlign:'center', padding:'4rem', color:C.muted }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.3 }}>🚛</div>
              <p style={{ marginBottom:'1.5rem' }}>Aucun trajet publié pour l'instant.</p>
              <button onClick={() => setShowForm(true)}
                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.8rem 2rem', borderRadius:100, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Déclarer mon premier retour à vide
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {trajets.map(t => {
                const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.available;
                const departDate = new Date(t.departure_date).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' });
                return (
                  <div key={t.id} style={{ background:'#fff', border:'1px solid '+(t.status==='available'?'rgba(39,174,96,0.25)':'rgba(30,61,15,0.08)'), borderRadius:20, overflow:'hidden', boxShadow:'0 2px 12px rgba(30,61,15,0.06)', transition:'box-shadow 0.2s' }}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow='0 8px 28px rgba(30,61,15,0.12)'}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(30,61,15,0.06)'}>
                    {/* Header coloré */}
                    <div style={{ background:t.status==='available'?'linear-gradient(135deg,#1E3D0F,#2D5A1B)':'linear-gradient(135deg,#4B5563,#6B7280)', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
                      {/* Trajet */}
                      <div style={{ display:'flex', alignItems:'center', gap:'1.5rem' }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:'#F6F1E7' }}>{t.departure_city}</div>
                          <div style={{ fontSize:'0.68rem', color:'rgba(246,241,231,0.6)' }}>{t.departure_region || '—'}</div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:40, height:2, background:'rgba(126,168,106,0.6)', borderRadius:2 }}/>
                          <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.5)', letterSpacing:'0.08em' }}>RETOUR VIDE</div>
                          <div style={{ width:40, height:2, background:'rgba(126,168,106,0.6)', borderRadius:2 }}/>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:'#F6F1E7' }}>{t.arrival_city}</div>
                          <div style={{ fontSize:'0.68rem', color:'rgba(246,241,231,0.6)' }}>{t.arrival_region || '—'}</div>
                        </div>
                      </div>
                      {/* Statut + Actions */}
                      <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <span style={{ background:st.bg+'33', color:t.status==='available'?'#6EE7B7':'rgba(246,241,231,0.7)', border:'1px solid '+(t.status==='available'?'rgba(110,231,183,0.3)':'rgba(255,255,255,0.15)'), padding:'0.3rem 0.9rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700 }}>
                          {st.label}
                        </span>
                        {t.status === 'available' && (
                          <button onClick={() => window.confirm('Annuler ce trajet ?') && cancelMutation.mutate(t.id)}
                            style={{ background:'rgba(220,38,38,0.2)', color:'#FCA5A5', border:'1px solid rgba(220,38,38,0.3)', padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                            ✕ Annuler
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Infos */}
                    <div style={{ padding:'1rem 1.5rem' }}>
                      <div style={{ display:'flex', gap:'1.2rem', flexWrap:'wrap', fontSize:'0.82rem', color:'#5C5C50', marginBottom:'0.7rem' }}>
                        <span>📅 {departDate}</span>
                        <span>🚛 {t.vehicle_type}</span>
                        {t.capacity_tons && <span style={{ color:'#059669', fontWeight:600 }}>⚖️ {t.capacity_tons} T disponibles</span>}
                        {t.volume_m3 && <span>📐 {t.volume_m3} m³</span>}
                        {t.price_per_kg && <span style={{ color:'#4A7C2F', fontWeight:700 }}>💰 {t.price_per_kg} MAD/kg</span>}
                      </div>

                    {t.notes && (
                      <div style={{ fontSize:'0.78rem', color:'#5C5C50', fontStyle:'italic', background:'#F6F1E7', borderRadius:8, padding:'0.5rem 0.8rem', marginBottom:'0.7rem' }}>
                        📝 {t.notes}
                      </div>
                    )}

                    {/* Photos véhicule */}
                    {(() => {
                      const photos = typeof t.vehicle_photos === 'string'
                        ? (() => { try { return JSON.parse(t.vehicle_photos); } catch { return []; } })()
                        : (t.vehicle_photos || []);
                      return photos.length > 0 ? (
                        <div>
                          <div style={{ fontSize:'0.73rem', color:C.muted, fontWeight:600, marginBottom:'0.4rem' }}>📸 Photos du véhicule</div>
                          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                            {photos.map((photo, i) => (
                              <div key={i} style={{ width:90, height:68, borderRadius:8, overflow:'hidden', border:'1px solid '+C.mid }}>
                                <img src={photo} alt={'Véhicule '+(i+1)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    </div>{/* end padding div */}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB : RÉSERVATIONS ════ */}
      {activeTab === 'reservations' && (
        <div>
          {loadBookings ? (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign:'center', padding:'4rem', color:C.muted }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.3 }}>📦</div>
              <p>Aucune réservation reçue pour l'instant.</p>
              <p style={{ fontSize:'0.82rem', marginTop:'0.5rem' }}>Publiez des trajets pour recevoir des demandes de livraison éco.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {bookings.map(b => {
                const bst = BOOKING_STATUS[b.status] || { label:b.status, color:C.muted };
                return (
                  <div key={b.id} style={{ background:C.white, border:'1.5px solid '+(b.status==='pending'?C.orange+'55':C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.8rem', marginBottom:'1rem', flexWrap:'wrap', gap:'0.8rem' }}>
                      <div>
                        <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem', marginBottom:'0.2rem' }}>
                          {b.order_number} — {b.product_title?.substring(0,45)}
                        </div>
                        <div style={{ fontSize:'0.78rem', color:C.muted }}>
                          📍 {b.pickup_city || b.departure_city} → {b.delivery_city || b.arrival_city}
                        </div>
                      </div>
                      <span style={{ background:bst.color+'22', color:bst.color, padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700 }}>
                        {bst.label}
                      </span>
                    </div>

                    <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.82rem', color:C.muted, marginBottom:'1rem' }}>
                      <span>🏭 Vendeur : <strong>{b.seller_company}</strong></span>
                      <span>🛒 Acheteur : <strong>{b.buyer_company}</strong></span>
                      <span>📅 {new Date(b.created_at).toLocaleDateString('fr-MA')}</span>
                      {b.booking_price > 0 && (
                        <span style={{ color:C.leaf, fontWeight:700 }}>💰 {fmt(b.booking_price)} MAD</span>
                      )}
                    </div>

                    {/* Actions selon statut */}
                    <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                      {b.status === 'pending' && b.carrier_id === user?.id && (
                        <button onClick={() => confirmBookingMutation.mutate(b.id)}
                          style={{ background:C.eco, color:'#fff', border:'none', padding:'0.6rem 1.4rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ✅ Confirmer la prise en charge
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <div style={{ fontSize:'0.8rem', color:C.muted, padding:'0.4rem 0' }}>
                          En attente du chargement • Contacter le vendeur pour coordonner
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

const lbl = { fontSize:'0.78rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
