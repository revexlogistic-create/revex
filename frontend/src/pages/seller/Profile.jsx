// src/pages/seller/Profile.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  deep:'#0F2318', forest:'#1A3C2E', sage:'#4A9065',
  nardo:'#4A4E5A', steel:'#7A8090', ghost:'#E8ECEB',
  cream:'#F4F6F4', white:'#FAFBFA', eco:'#27AE60', urgent:'#C0392B',
};

export default function SellerProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  const { data } = useQuery('seller-profile', function() {
    return api.get('/users/me').then(function(r) { return r.data; });
  }, {
    onSuccess: function(d) {
      var p = d.user || {};
      setForm({
        company_name: p.company_name || '',
        contact_name: p.contact_name || '',
        phone:        p.phone        || '',
        city:         p.city         || '',
        region:       p.region       || '',
        sector:       p.sector       || '',
        ice_number:   p.ice_number   || '',
        rc_number:    p.rc_number    || '',
        address:      p.address      || '',
      });
    }
  });

  const { data: statsData } = useQuery('seller-stats', function() {
    return api.get('/orders?role_as=seller&limit=1000').then(function(r) { return r.data; });
  });

  const updateMutation = useMutation(
    function(data) { return api.put('/users/me', data); },
    {
      onSuccess: function() {
        toast.success('✅ Profil mis à jour !');
        setEditMode(false);
        qc.invalidateQueries('seller-profile');
      },
      onError: function(e) { toast.error((e.response && e.response.data && e.response.data.error) || 'Erreur'); }
    }
  );

  var profile = (data && data.user) || user || {};
  var orders = (statsData && statsData.orders) || [];
  var totalSales = orders.filter(function(o) { return o.status === 'delivered'; }).length;
  var totalRevenue = orders.filter(function(o) { return o.status === 'delivered'; })
    .reduce(function(s, o) { return s + Number(o.final_price || 0); }, 0);

  var initials = ((profile.company_name || 'V')).substring(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 5rem', fontFamily:"'DM Sans',sans-serif", background:C.cream, minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,'+C.deep+','+C.forest+')', borderRadius:20, padding:'2rem', marginBottom:'1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:'1.2rem', flexWrap:'wrap' }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:'linear-gradient(135deg,'+C.sage+','+C.forest+')', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', fontWeight:700, color:'#fff', flexShrink:0, border:'3px solid rgba(255,255,255,0.2)' }}>
            {initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:'#F4F6F4', lineHeight:1 }}>
              {profile.company_name || 'Mon entreprise'}
            </div>
            <div style={{ fontSize:'0.8rem', color:'rgba(244,246,244,0.55)', marginTop:4, display:'flex', gap:'0.8rem', flexWrap:'wrap' }}>
              <span>🏭 Vendeur REVEX</span>
              {profile.city && <span>📍 {profile.city}</span>}
              {profile.sector && <span>⚙️ {profile.sector}</span>}
            </div>
          </div>
          <button onClick={function() { setEditMode(true); }}
            style={{ background:'rgba(255,255,255,0.12)', color:'#F4F6F4', border:'1px solid rgba(255,255,255,0.2)', borderRadius:100, padding:'0.5rem 1.2rem', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            ✏️ Modifier
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'📦', label:'Ventes livrées',  value:totalSales,                            color:C.sage   },
          { icon:'💰', label:'Chiffre d\'affaires', value:Number(totalRevenue).toLocaleString('fr-MA')+' MAD', color:C.forest },
          { icon:'⭐', label:'Note',             value:(Number(profile.rating||0).toFixed(1))+'/5', color:'#D97706' },
          { icon:'🪙', label:'Jetons',           value:profile.tokens_balance || 0,           color:'#7C3AED' },
        ].map(function(k) {
          return (
            <div key={k.label} style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:16, padding:'1.2rem' }}>
              <div style={{ fontSize:'1.5rem', marginBottom:'0.4rem' }}>{k.icon}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:k.color }}>{k.value}</div>
              <div style={{ fontSize:'0.75rem', color:C.steel }}>{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Infos entreprise */}
      {!editMode ? (
        <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem', marginBottom:'1rem' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1.2rem' }}>
            Informations entreprise
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            {[
              ['🏢 Société',    profile.company_name],
              ['👤 Contact',    profile.contact_name],
              ['📞 Téléphone',  profile.phone],
              ['📍 Ville',      profile.city],
              ['🗺️ Région',    profile.region],
              ['⚙️ Secteur',    profile.sector],
              ['🔢 ICE',        profile.ice_number],
              ['📋 RC',         profile.rc_number],
              ['✉️ Email',      profile.email],
              ['📅 Membre depuis', profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-MA') : '—'],
            ].map(function(kv) {
              return (
                <div key={kv[0]} style={{ background:C.cream, borderRadius:10, padding:'0.8rem 1rem' }}>
                  <div style={{ fontSize:'0.7rem', color:C.steel, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{kv[0]}</div>
                  <div style={{ fontSize:'0.88rem', color:kv[1]?C.deep:C.urgent, fontWeight:kv[1]?600:400 }}>{kv[1]||'Non renseigné'}</div>
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
              ['Nom société',   'company_name', 'text'],
              ['Nom contact',   'contact_name', 'text'],
              ['Téléphone',     'phone',        'tel'],
              ['Ville',         'city',         'text'],
              ['Région',        'region',       'text'],
              ['Secteur',       'sector',       'text'],
              ['ICE',           'ice_number',   'text'],
              ['RC',            'rc_number',    'text'],
            ].map(function(f) {
              return (
                <div key={f[0]}>
                  <label style={{ fontSize:'0.75rem', color:C.steel, fontWeight:600, display:'block', marginBottom:4 }}>{f[0]}</label>
                  <input type={f[2]} value={form[f[1]]||''}
                    onChange={function(e) { var v=e.target.value; setForm(function(p) { var n=Object.assign({},p); n[f[1]]=v; return n; }); }}
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
              style={{ flex:2, background:C.forest, color:'#fff', border:'none', borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.88rem' }}>
              {updateMutation.isLoading ? 'Enregistrement...' : '✅ Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Sécurité */}
      <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem' }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1rem' }}>🔒 Sécurité</h2>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.8rem 1rem', background:C.cream, borderRadius:10, flexWrap:'wrap', gap:'0.5rem' }}>
          <div>
            <div style={{ fontSize:'0.85rem', fontWeight:600, color:C.deep }}>Mot de passe</div>
            <div style={{ fontSize:'0.75rem', color:C.steel }}>Modifiez votre mot de passe</div>
          </div>
          <button onClick={function() {
            api.post('/auth/forgot-password', { email: profile.email })
              .then(function() { toast.success('Email de réinitialisation envoyé !'); })
              .catch(function() {});
          }}
            style={{ background:C.ghost, color:C.deep, border:'none', borderRadius:100, padding:'0.5rem 1rem', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Changer →
          </button>
        </div>
      </div>

    </div>
  );
}
