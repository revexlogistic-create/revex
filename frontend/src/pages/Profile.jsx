// src/pages/Profile.jsx — Page profil universelle
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const C = {
  deep:'#0F2318', forest:'#1A3C2E', sage:'#4A9065',
  nardo:'#4A4E5A', steel:'#7A8090', ghost:'#E8ECEB',
  cream:'#F4F6F4', white:'#FAFBFA', eco:'#27AE60',
  urgent:'#C0392B', amber:'#E8C866',
};

const ROLE_LABELS = {
  admin:        { label:'Administrateur', icon:'🛡️', color:'#8B5CF6' },
  seller:       { label:'Vendeur',        icon:'🏭', color:C.forest },
  distributor:  { label:'Distributeur',   icon:'📦', color:'#2563EB' },
  buyer:        { label:'Acheteur B2B',   icon:'🏢', color:C.sage },
  acheteur_auto:{ label:'Particulier',    icon:'🚗', color:'#D97706' },
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [activeTab, setActiveTab] = useState('infos');
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });

  const { data } = useQuery('my-profile', function() {
    return api.get('/auth/me').then(function(r) { return r.data; });
  });

  var profile = (data && data.user) || user || {};
  var roleInfo = ROLE_LABELS[profile.role] || { label: profile.role, icon:'👤', color:C.sage };
  var initials = ((profile.company_name || profile.contact_name || 'U')).substring(0,2).toUpperCase();

  function startEdit() {
    setForm({
      company_name: profile.company_name || '',
      contact_name: profile.contact_name || '',
      phone:        profile.phone        || '',
      city:         profile.city         || '',
      region:       profile.region       || '',
      sector:       profile.sector       || '',
      ice_number:   profile.ice_number   || '',
      rc_number:    profile.rc_number    || '',
      address:      profile.address      || '',
    });
    setEditMode(true);
  }

  var updateMutation = useMutation(
    function(data) { return api.put('/users/me', data); },
    {
      onSuccess: function() {
        toast.success('✅ Profil mis à jour !');
        setEditMode(false);
        qc.invalidateQueries('my-profile');
      },
      onError: function(e) { toast.error((e.response && e.response.data && e.response.data.error) || 'Erreur'); }
    }
  );

  var pwMutation = useMutation(
    function(data) { return api.put('/auth/change-password', data); },
    {
      onSuccess: function() {
        toast.success('✅ Mot de passe modifié !');
        setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
      },
      onError: function(e) { toast.error((e.response && e.response.data && e.response.data.error) || 'Erreur'); }
    }
  );

  function submitPw() {
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('Minimum 8 caractères');
      return;
    }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  }

  var inp = { width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid '+C.ghost, borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', background:C.cream, color:C.deep };
  var lbl = { display:'block', fontSize:'0.72rem', color:C.steel, fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' };

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 5rem', fontFamily:"'DM Sans',sans-serif", background:C.cream, minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,'+C.deep+','+C.forest+')', borderRadius:20, padding:'2rem', marginBottom:'1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.07)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:'1.2rem', flexWrap:'wrap' }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:'linear-gradient(135deg,'+C.sage+','+C.forest+')', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', fontWeight:700, color:C.white, flexShrink:0, border:'3px solid rgba(255,255,255,0.2)' }}>
            {initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.7rem', fontWeight:700, color:C.white, lineHeight:1 }}>
              {profile.company_name || profile.contact_name || 'Mon profil'}
            </div>
            <div style={{ marginTop:6, display:'flex', gap:'0.7rem', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ background:roleInfo.color+'33', color:C.white, borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.75rem', fontWeight:600 }}>
                {roleInfo.icon} {roleInfo.label}
              </span>
              {profile.city && <span style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.78rem' }}>📍 {profile.city}</span>}
              <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.78rem' }}>✉️ {profile.email}</span>
            </div>
          </div>
          <button onClick={startEdit}
            style={{ background:'rgba(255,255,255,0.12)', color:C.white, border:'1px solid rgba(255,255,255,0.2)', borderRadius:100, padding:'0.5rem 1.2rem', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
            ✏️ Modifier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', borderBottom:'1px solid '+C.ghost, paddingBottom:'0.5rem' }}>
        {[['infos','📋 Informations'],['securite','🔒 Sécurité']].map(function(t) {
          return (
            <button key={t[0]} onClick={function() { setActiveTab(t[0]); setEditMode(false); }}
              style={{ padding:'0.5rem 1.1rem', border:'none', background:'transparent', color:activeTab===t[0]?C.forest:C.steel, fontWeight:activeTab===t[0]?700:400, fontSize:'0.85rem', cursor:'pointer', borderBottom:activeTab===t[0]?'2px solid '+C.forest:'2px solid transparent', fontFamily:"'DM Sans',sans-serif" }}>
              {t[1]}
            </button>
          );
        })}
      </div>

      {/* Infos tab */}
      {activeTab === 'infos' && !editMode && (
        <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            {[
              ['👤 Nom contact',  profile.contact_name],
              ['🏢 Société',      profile.company_name],
              ['📞 Téléphone',    profile.phone],
              ['📍 Ville',        profile.city],
              ['🗺️ Région',      profile.region],
              ['🏭 Secteur',      profile.sector],
              ['📋 ICE',          profile.ice_number],
              ['📄 RC',           profile.rc_number],
              ['✉️ Email',        profile.email],
              ['👥 Rôle',         roleInfo.icon+' '+roleInfo.label],
            ].map(function(kv) {
              return (
                <div key={kv[0]} style={{ background:C.cream, borderRadius:10, padding:'0.8rem 1rem' }}>
                  <div style={{ fontSize:'0.68rem', color:C.steel, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{kv[0]}</div>
                  <div style={{ fontSize:'0.88rem', color:kv[1]?C.deep:C.urgent, fontWeight:kv[1]?600:400 }}>{kv[1]||'Non renseigné'}</div>
                </div>
              );
            })}
          </div>

          {/* Adresse */}
          {profile.address && (
            <div style={{ marginTop:'0.8rem', background:C.cream, borderRadius:10, padding:'0.8rem 1rem' }}>
              <div style={{ fontSize:'0.68rem', color:C.steel, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>📍 Adresse</div>
              <div style={{ fontSize:'0.88rem', color:C.deep, fontWeight:600 }}>{profile.address}</div>
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {activeTab === 'infos' && editMode && (
        <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem' }}>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1.2rem' }}>
            Modifier mes informations
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem', marginBottom:'1.2rem' }}>
            {[
              ['Nom complet',   'contact_name', 'text'],
              ['Société',       'company_name', 'text'],
              ['Téléphone',     'phone',        'tel'],
              ['Ville',         'city',         'text'],
              ['Région',        'region',       'text'],
              ['Secteur',       'sector',       'text'],
              ['ICE',           'ice_number',   'text'],
              ['RC',            'rc_number',    'text'],
            ].map(function(f) {
              return (
                <div key={f[0]}>
                  <label style={lbl}>{f[0]}</label>
                  <input type={f[2]} value={form[f[1]]||''} onChange={function(e) { var v=e.target.value; setForm(function(p) { var n=Object.assign({},p); n[f[1]]=v; return n; }); }} style={inp}/>
                </div>
              );
            })}
          </div>
          <div style={{ marginBottom:'1.2rem' }}>
            <label style={lbl}>Adresse complète</label>
            <input value={form.address||''} onChange={function(e) { var v=e.target.value; setForm(function(p) { var n=Object.assign({},p); n.address=v; return n; }); }} style={inp} placeholder="Rue, quartier..."/>
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

      {/* Sécurité tab */}
      {activeTab === 'securite' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem' }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 1.2rem' }}>
              🔒 Changer le mot de passe
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', marginBottom:'1.2rem' }}>
              <div>
                <label style={lbl}>Mot de passe actuel</label>
                <input type="password" value={pwForm.currentPassword} onChange={function(e){ setPwForm(function(p){ return Object.assign({},p,{currentPassword:e.target.value}); }); }} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Nouveau mot de passe</label>
                <input type="password" value={pwForm.newPassword} onChange={function(e){ setPwForm(function(p){ return Object.assign({},p,{newPassword:e.target.value}); }); }} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Confirmer le nouveau mot de passe</label>
                <input type="password" value={pwForm.confirm} onChange={function(e){ setPwForm(function(p){ return Object.assign({},p,{confirm:e.target.value}); }); }} style={inp}/>
              </div>
            </div>
            <button onClick={submitPw} disabled={pwMutation.isLoading}
              style={{ background:C.forest, color:C.white, border:'none', borderRadius:100, padding:'0.75rem 2rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.88rem' }}>
              {pwMutation.isLoading ? 'Modification...' : '🔒 Changer le mot de passe'}
            </button>
          </div>

          {/* Déconnexion */}
          <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:18, padding:'1.5rem' }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.deep, margin:'0 0 0.5rem' }}>
              Déconnexion
            </h3>
            <p style={{ color:C.steel, fontSize:'0.85rem', marginBottom:'1rem' }}>
              Vous serez redirigé vers la page d'accueil.
            </p>
            <button onClick={function() { logout(); navigate('/'); }}
              style={{ background:C.urgent+'15', color:C.urgent, border:'1px solid '+C.urgent+'33', borderRadius:100, padding:'0.6rem 1.5rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:'0.85rem' }}>
              🚪 Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
