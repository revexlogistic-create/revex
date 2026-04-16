// src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  muted:'#5C5C50', white:'#FDFAF4',
  auto:'#1A3C2E', autoMid:'#C8D4C8',
};

const inp = {
  width:'100%', padding:'0.7rem 0.95rem',
  border:'1.5px solid #D9CEBC', borderRadius:12,
  fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif",
  outline:'none', boxSizing:'border-box', background:'#fff',
};
const lbl = { fontSize:'0.78rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' };

const ACCOUNT_TYPES = [
  {
    role: 'buyer',
    icon: '🏭',
    title: 'Acheteur B2B',
    desc: 'Entreprise industrielle. Accès au catalogue PDR, lots, enchères, demandes urgentes.',
    color: C.forest,
    bg: C.beige,
    border: C.mid,
  },
  {
    role: 'acheteur_auto',
    icon: '🚗',
    title: 'Particulier — Pièces Auto',
    desc: 'Acheteur individuel. Accès à la marketplace pièces automobiles uniquement.',
    color: C.auto,
    bg: '#E8EDE8',
    border: C.autoMid,
  },
  {
    role: 'seller',
    icon: '🏪',
    title: 'Vendeur / Distributeur',
    desc: 'Publiez vos PDR industriels ou vos pièces automobiles sur REVEX.',
    color: '#2980B9',
    bg: '#EBF5FB',
    border: '#AED6F1',
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: '',
    email: '',
    password: '',
    confirm: '',
    contact_name: '',
    company_name: '',
    phone: '',
    city: '',
  });

  const setf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isAuto = form.role === 'acheteur_auto';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Mot de passe trop court (8 caractères minimum)');
      return;
    }
    setLoading(true);
    try {
      await register({
        email:        form.email,
        password:     form.password,
        role:         form.role,
        contact_name: form.contact_name,
        company_name: isAuto ? (form.contact_name || 'Particulier') : form.company_name,
        phone:        form.phone || null,
        city:         form.city || null,
      });
      toast.success('Compte créé avec succès !');
      navigate(isAuto ? '/pieces-auto' : form.role === 'seller' ? '/seller' : '/catalogue');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:C.cream, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem' }}>
      <div style={{ width:'100%', maxWidth: step === 1 ? 720 : 480 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <Link to="/" style={{ textDecoration:'none' }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:C.forest, letterSpacing:'0.05em' }}>
              RE<span style={{ color:C.leaf }}>VEX</span>
            </span>
          </Link>
          <div style={{ fontSize:'0.82rem', color:C.muted, marginTop:4 }}>
            {step === 1 ? 'Choisissez votre type de compte' : 'Créez votre compte'}
          </div>
        </div>

        {/* ÉTAPE 1 : Choix du type de compte */}
        {step === 1 && (
          <div>
            <div className='register-cards' style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' }}>
              {ACCOUNT_TYPES.map(t => (
                <button key={t.role} onClick={() => { setf('role', t.role); setStep(2); }}
                  style={{ background:'#fff', border:'2px solid '+(form.role===t.role?t.color:t.border), borderRadius:18, padding:'1.8rem 1.2rem', cursor:'pointer', textAlign:'center', transition:'all 0.2s', fontFamily:"'DM Sans',sans-serif",
                    boxShadow: form.role===t.role ? '0 8px 24px rgba(30,61,15,0.12)' : '0 2px 8px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=t.color; e.currentTarget.style.background=t.bg; e.currentTarget.style.transform='translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background='#fff'; e.currentTarget.style.transform='none'; }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:'0.7rem' }}>{t.icon}</div>
                  <div style={{ fontWeight:700, color:t.color, fontSize:'0.95rem', marginBottom:'0.5rem' }}>{t.title}</div>
                  <div style={{ fontSize:'0.75rem', color:C.muted, lineHeight:1.5 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.84rem', color:C.muted }}>
              Déjà un compte ?{' '}
              <Link to="/login" style={{ color:C.leaf, fontWeight:600, textDecoration:'none' }}>Se connecter</Link>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Formulaire */}
        {step === 2 && (
          <div style={{ background:'#fff', borderRadius:22, border:'1px solid '+C.mid, padding:'2.5rem', boxShadow:'0 4px 24px rgba(30,61,15,0.07)' }}>

            {/* Header avec type sélectionné */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'1.8rem', paddingBottom:'1rem', borderBottom:'1px solid '+C.beige }}>
              <button onClick={() => setStep(1)}
                style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:'1.1rem', padding:'0.2rem', display:'flex', alignItems:'center' }}>
                ←
              </button>
              <span style={{ fontSize:'1.4rem' }}>{ACCOUNT_TYPES.find(t=>t.role===form.role)?.icon}</span>
              <div>
                <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem' }}>
                  {ACCOUNT_TYPES.find(t=>t.role===form.role)?.title}
                </div>
                <div style={{ fontSize:'0.72rem', color:C.muted }}>
                  {isAuto ? 'Marketplace pièces automobiles' : form.role==='seller' ? 'Publier et vendre sur REVEX' : 'Catalogue PDR industriel B2B'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

              {isAuto ? (
                // Particulier : prénom + nom seulement
                <div>
                  <label style={lbl}>Prénom et Nom *</label>
                  <input value={form.contact_name} onChange={e => setf('contact_name', e.target.value)}
                    placeholder="Ex: Amine El Mansouri" required style={inp}/>
                </div>
              ) : (
                <div className='form-grid-2' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div>
                    <label style={lbl}>Nom de la société *</label>
                    <input value={form.company_name} onChange={e => setf('company_name', e.target.value)}
                      placeholder="Ex: IMACID SA" required style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Nom du responsable</label>
                    <input value={form.contact_name} onChange={e => setf('contact_name', e.target.value)}
                      placeholder="Ex: Amine El Mansouri" style={inp}/>
                  </div>
                </div>
              )}

              <div>
                <label style={lbl}>Email *</label>
                <input type="email" value={form.email} onChange={e => setf('email', e.target.value)}
                  placeholder="votre@email.com" required style={inp}/>
              </div>

              <div className='form-grid-2' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <label style={lbl}>Téléphone</label>
                  <input value={form.phone} onChange={e => setf('phone', e.target.value)}
                    placeholder="Ex: 06 00 00 00 00" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Ville</label>
                  <input value={form.city} onChange={e => setf('city', e.target.value)}
                    placeholder="Ex: Casablanca" style={inp}/>
                </div>
              </div>

              <div className='form-grid-2' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <label style={lbl}>Mot de passe *</label>
                  <input type="password" value={form.password} onChange={e => setf('password', e.target.value)}
                    placeholder="8 caractères minimum" required minLength={8} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Confirmer le mot de passe *</label>
                  <input type="password" value={form.confirm} onChange={e => setf('confirm', e.target.value)}
                    placeholder="Répétez le mot de passe" required style={inp}/>
                </div>
              </div>

              {/* Bandeau info acheteur auto */}
              {isAuto && (
                <div style={{ background:'#E8EDE8', border:'1px solid '+C.autoMid, borderRadius:12, padding:'0.8rem 1rem', fontSize:'0.78rem', color:C.auto, lineHeight:1.6 }}>
                  🚗 <strong>Compte Particulier</strong> — Accès à la marketplace pièces automobiles uniquement.<br/>
                  Pour accéder au catalogue industriel B2B, créez un compte Acheteur B2B.
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ background:loading?C.mid:isAuto?C.auto:C.forest, color:'#F6F1E7', border:'none', padding:'0.95rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', cursor:loading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", marginTop:'0.5rem', transition:'background 0.2s' }}>
                {loading ? '⏳ Création du compte...' : '✅ Créer mon compte'}
              </button>

              <div style={{ textAlign:'center', fontSize:'0.82rem', color:C.muted }}>
                Déjà un compte ?{' '}
                <Link to="/login" style={{ color:C.leaf, fontWeight:600, textDecoration:'none' }}>Se connecter</Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
