// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const C = { forest: '#1E3D0F', leaf: '#4A7C2F', sage: '#7EA86A', cream: '#F6F1E7', beige: '#EDE6D3', beigemid: '#D9CEBC', white: '#FDFAF4', muted: '#5C5C50' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Bienvenue, ${user.contact_name} !`);
      const path = user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/buyer';
      navigate(path);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email ou mot de passe incorrect');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: C.cream }}>
      <div style={{ background: C.white, border: `1px solid ${C.beigemid}`, borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 700, color: C.forest, marginBottom: '0.5rem' }}>RE<span style={{ color: C.leaf }}>VEX</span></div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: C.forest }}>Connexion à votre compte</h1>
          <p style={{ color: C.muted, fontSize: '0.88rem', marginTop: '0.3rem' }}>Marketplace B2B Stock Dormant Industriel</p>
        </div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={lbl}>Email professionnel</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="vous@entreprise.ma" style={inp} />
          </div>
          <div>
            <label style={lbl}>Mot de passe</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="••••••••" style={inp} />
          </div>
          <button type="submit" disabled={loading} style={{ background: C.forest, color: C.cream, border: 'none', padding: '0.9rem', borderRadius: 100, fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", marginTop: '0.5rem' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: C.beige, borderRadius: 12, fontSize: '0.78rem', color: C.muted }}>
          <strong style={{ color: C.forest }}>Comptes de test :</strong><br />
          Admin: admin@revex.ma | Vendeur: vendeur1@cimencas.ma<br />
          Acheteur: acheteur1@managem.ma | Mot de passe: <strong>Password123!</strong>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: C.muted }}>
          Pas encore de compte ? <Link to="/register" style={{ color: C.leaf, fontWeight: 600 }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}

const lbl = { fontSize: '0.82rem', fontWeight: 600, color: '#1E3D0F', display: 'block', marginBottom: '0.4rem' };
const inp = { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #D9CEBC', borderRadius: 10, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' };
