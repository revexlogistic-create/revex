// src/pages/buyer/Profile.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  deep:'#0F2318', forest:'#1A3C2E', sage:'#4A9065', light:'#8DB8A0',
  nardo:'#4A4E5A', steel:'#7A8090', ghost:'#E8ECEB',
  cream:'#F4F6F4', white:'#FAFBFA', amber:'#E8C866', urgent:'#C0392B',
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function BuyerProfile() {
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const isAuto = user && user.role === 'acheteur_auto';

  const { data: profileData } = useQuery(
    'buyer-profile',
    () => api.get('/users/me').then(r => r.data),
    { retry: false }
  );

  const { data: ordersData } = useQuery(
    'buyer-orders-profile',
    () => api.get('/orders?role_as=buyer&limit=1000').then(r => r.data),
    { retry: false }
  );

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  const profile = profileData?.user || user || {};
  const orders  = (ordersData && ordersData.orders) || [];
  const delivered = orders.filter(function(o) { return o.status === 'delivered'; });
  const totalSpent = delivered.reduce(function(s,o) { return s + Number(o.final_price||0); }, 0);

  const updateMutation = useMutation(
    function(data) { return api.put('/users/me', data); },
    {
      onSuccess: function() {
        toast.success('✅ Profil mis à jour !');
        setEditMode(false);
        qc.invalidateQueries('buyer-profile');
      },
      onError: function(e) { toast.error((e.response && e.response.data && e.response.data.error) || 'Erreur'); }
    }
  );

  function startEdit() {
    setForm({
      contact_name: profile.contact_name || '',
      company_name: profile.company_name || '',
      phone:        profile.phone        || '',
      city:         profile.city         || '',
      address:      profile.address      || '',
    });
    setEditMode(true);
  }

  var initials = ((profile.contact_name || profile.company_name || 'U')).substring(0,2).toUpperCase();

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 5rem', fontFamily:"'DM Sans',sans-serif", background:C.cream, minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,'+C.deep+','+C.forest+')', borderRadius:20, padding:'2rem', marginBottom:'1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:'1.2rem', flexWrap:'wrap' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,'+C.sage+','+C.forest+')', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', fontWeight:700, color:C.white, flexShrink:0, border:'3px solid rgba(255,255,255,0.2)' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:C.white, lineHeight:1 }}>
              {profile.contact_name || profile.company_name || 'Mon profil'}
            </div>
            <div style={{ fontSize:'0.8rem', color:'rgba(244,246,244,0.55)', marginTop:4, display:'flex', gap:'0.8rem', flexWrap:'wrap' }}>
              <span>{isAuto ? '🚗 Particulier' : '🏭 Professionnel'}</span>
              {profile.city && <span>📍 {profile.city}</span>}
              <span>✉️ {profile.email}</span>
            </div>
          </div>
          <button onClick={startEdit}
            style={{ marginLeft:'auto', background:'rgba(255,255,255,0.12)', color:C.white, border:'1px solid rgba(255,255,255,0.2)', borderRadius:100, padding:'0.5rem 1.2rem', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            ✏️ Modifier
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(150px,100%),1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'📦', label:'Commandes', value:orders.length, color:C.forest },
          { icon:'✅', label:'Livrées',   value:delivered.length, color:C.sage },
          { icon:'💰', label:'Total dépensé', value:fmt(totalSpent)+' MAD', color:C.forest },
        ].map(function(k) {
          return (
            <div key={k.label} style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:16, padding:'1.2rem' }}>
              <div style={{ fontSize:'1.5rem', marginBottom:'0.4rem' }}>{k.icon}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color }}>{k.value}</div>
              <div style={{ fontSize:'0.75rem', color:C.steel }}>{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Infos profil */}
      {!editMode ? (
        <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem', marginBottom:'1rem' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1.2rem' }}>
            Informations personnelles
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            {[
              ['👤 Nom', profile.contact_name || '—'],
              ['🏢 Entreprise', profile.company_name || '—'],
              ['📞 Téléphone', profile.phone || '—'],
              ['📍 Ville', profile.city || '—'],
              ['✉️ Email', profile.email || '—'],
              ['📋 Rôle', isAuto ? 'Acheteur auto' : 'Acheteur'],
            ].map(function(kv) {
              return (
                <div key={kv[0]} style={{ background:C.cream, borderRadius:10, padding:'0.8rem 1rem' }}>
                  <div style={{ fontSize:'0.7rem', color:C.steel, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{kv[0]}</div>
                  <div style={{ fontSize:'0.88rem', color:C.deep, fontWeight:600 }}>{kv[1]}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem', marginBottom:'1rem' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1.2rem' }}>
            Modifier le profil
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem', marginBottom:'1.2rem' }}>
            {[
              ['Nom complet',   'contact_name', 'text'],
              ['Entreprise',    'company_name', 'text'],
              ['Téléphone',     'phone',        'tel' ],
              ['Ville',         'city',         'text'],
            ].map(function(f) {
              return (
                <div key={f[0]}>
                  <label style={{ fontSize:'0.75rem', color:C.steel, fontWeight:600, display:'block', marginBottom:4 }}>{f[0]}</label>
                  <input type={f[2]} value={form[f[1]]||''} onChange={function(e) { var v=e.target.value; setForm(function(prev) { var n=Object.assign({},prev); n[f[1]]=v; return n; }); }}
                    style={{ width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid '+C.ghost, borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', background:C.cream, color:C.deep }}/>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', gap:'0.8rem' }}>
            <button onClick={function() { setEditMode(false); }}
              style={{ flex:1, background:'transparent', color:C.steel, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
            <button onClick={function() { updateMutation.mutate(form); }}
              disabled={updateMutation.isLoading}
              style={{ flex:2, background:C.forest, color:C.white, border:'none', borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.88rem' }}>
              {updateMutation.isLoading ? 'Enregistrement...' : '✅ Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Sécurité */}
      <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem' }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1rem' }}>
          🔒 Sécurité du compte
        </h2>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.8rem 1rem', background:C.cream, borderRadius:10, flexWrap:'wrap', gap:'0.5rem' }}>
          <div>
            <div style={{ fontSize:'0.85rem', fontWeight:600, color:C.deep }}>Mot de passe</div>
            <div style={{ fontSize:'0.75rem', color:C.steel }}>Dernière modification inconnue</div>
          </div>
          <button onClick={function() { toast.info('Envoi email de réinitialisation...'); api.post('/auth/forgot-password', { email: profile.email }).then(function() { toast.success('Email envoyé !'); }).catch(function(){}); }}
            style={{ background:C.ghost, color:C.deep, border:'none', borderRadius:100, padding:'0.5rem 1rem', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Changer →
          </button>
        </div>
      </div>

    </div>
  );
}
