// src/pages/Tokens.jsx — Gestion des jetons REVEX
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const OPERATION_ICONS = {
  publish_product:   '📦',
  bulk_publish:      '🚀',
  send_quote:        '💬',
  create_order:      '🛒',
  send_message:      '✉️',
  stock_analysis:    '🔬',
  urgent_request:    '⚡',
  publish_transport: '🚛',
  purchase:          '💳',
  admin_credit:      '🎁',
  welcome_bonus:     '🎉',
  refund:            '↩️',
};

const OPERATION_LABELS = {
  publish_product:   'Publication PDR',
  bulk_publish:      'Publication en masse (×article)',
  send_quote:        'Envoi de devis',
  create_order:      'Passer une commande',
  send_message:      'Nouveau message',
  stock_analysis:    'Analyse CCOM',
  urgent_request:    'Demande urgente',
  publish_transport: 'Offre transport',
  purchase:          'Achat de jetons',
  admin_credit:      'Crédit admin',
  welcome_bonus:     'Bonus bienvenue',
  refund:            'Remboursement',
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function Tokens() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [purchasing, setPurchasing] = useState(null);

  const { data, isLoading } = useQuery(
    'my-tokens',
    () => api.get('/tokens/me').then(r => r.data),
    { refetchInterval: 15000 }
  );

  const { data: pkgsData } = useQuery(
    'token-packages',
    () => api.get('/tokens/packages').then(r => r.data)
  );

  const purchaseMutation = useMutation(
    (package_id) => api.post('/tokens/purchase', { package_id }),
    {
      onSuccess: (res) => {
        toast.success(res.data.message);
        qc.invalidateQueries('my-tokens');
        setPurchasing(null);
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Erreur paiement')
    }
  );

  const balance   = data?.balance || 0;
  const history   = data?.history || [];
  const stats     = data?.stats || {};
  const costs     = data?.costs || {};
  const packages  = pkgsData?.packages || [];

  const isLow   = balance < 5;
  const isEmpty = balance === 0;
  const balanceColor = isEmpty ? C.urgent : isLow ? C.orange : C.leaf;

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div className="page-pad" style={{ maxWidth:1100, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', color:C.forest }}>
            🪙 Mes Jetons REVEX
          </h1>
          <p style={{ color:C.muted, fontSize:'0.88rem', marginTop:'0.2rem' }}>
            Chaque opération sur la plateforme consomme des jetons.
          </p>
        </div>
        <Link to={user?.role==='seller'?'/seller':'/buyer'} style={{ background:C.beige, color:C.muted, border:'1px solid '+(C.mid), padding:'0.6rem 1.2rem', borderRadius:100, textDecoration:'none', fontSize:'0.85rem' }}>
          ← Dashboard
        </Link>
      </div>

      {/* ── SOLDE PRINCIPAL ── */}
      <div style={{ background: isEmpty?'#FDECEA':isLow?'#FEF5E7':'#E8F8EE', border:'2px solid '+(balanceColor)+'55', borderRadius:20, padding:'2rem', marginBottom:'2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1.5rem' }}>
        <div>
          <div style={{ fontSize:'0.82rem', color:balanceColor, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>
            Solde actuel
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'3.5rem', fontWeight:700, color:balanceColor, lineHeight:1 }}>
            {balance} <span style={{ fontSize:'1.5rem', opacity:0.7 }}>jetons</span>
          </div>
          {isEmpty && <div style={{ fontSize:'0.85rem', color:C.urgent, marginTop:'0.5rem', fontWeight:600 }}>❌ Solde épuisé — rechargez pour continuer à publier</div>}
          {isLow && !isEmpty && <div style={{ fontSize:'0.85rem', color:C.orange, marginTop:'0.5rem', fontWeight:600 }}>⚠️ Solde faible — rechargez bientôt</div>}
          {!isLow && <div style={{ fontSize:'0.85rem', color:C.eco, marginTop:'0.5rem' }}>✅ Solde suffisant pour vos opérations</div>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem', minWidth:260 }}>
          {[
            { label:'Jetons consommés', value:Math.abs(Number(stats.total_spent)||0), color:C.urgent },
            { label:'Jetons reçus',     value:Number(stats.total_earned)||0,           color:C.eco   },
            { label:'Opérations',       value:Number(stats.total_operations)||0,        color:C.blue  },
            { label:'Solde actuel',     value:balance,                                 color:balanceColor },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.6)', borderRadius:10, padding:'0.7rem 0.9rem', backdropFilter:'blur(4px)' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'0.7rem', color:C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className='tabs-scroll' style={{ display:'flex', gap:'0.3rem', marginBottom:'1.5rem', borderBottom:'2px solid '+(C.mid)+'' }}>
        {[['overview','💡 Tarifs'],['buy','💳 Acheter'],['history','📋 Historique']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'0.65rem 1.3rem', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.88rem', fontWeight:activeTab===id?700:400, color:activeTab===id?C.forest:C.muted, borderBottom:activeTab===id?'3px solid '+(C.leaf)+'':'3px solid transparent', fontFamily:"'DM Sans',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ════ TAB : TARIFS ════ */}
      {activeTab === 'overview' && (
        <div>
          <p style={{ color:C.muted, fontSize:'0.88rem', marginBottom:'1.5rem', lineHeight:1.7 }}>
            Les jetons vous permettent d'accéder à toutes les fonctionnalités de REVEX.<br/>
            <strong>Chaque opération consomme un nombre défini de jetons.</strong> Vous recevez <strong>50 jetons offerts</strong> à l'inscription.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap:'1rem', marginBottom:'2rem' }}>
            {[
              { op:'publish_product',   cost:costs.publish_product||5,   desc:'Mettre en vente une pièce PDR',    icon:'📦' },
              { op:'bulk_publish',      cost:costs.bulk_publish||1,       desc:'Par article — publication CCOM',   icon:'🚀', perUnit:true },
              { op:'send_quote',        cost:costs.send_quote||2,         desc:'Demander un devis à un vendeur',   icon:'💬' },
              { op:'create_order',      cost:costs.create_order||3,       desc:'Passer une commande',              icon:'🛒' },
              { op:'send_message',      cost:costs.send_message||1,       desc:'Initier une conversation B2B',     icon:'✉️' },
              { op:'stock_analysis',    cost:costs.stock_analysis||10,    desc:'Analyse CCOM de votre stock',      icon:'🔬' },
              { op:'urgent_request',    cost:costs.urgent_request||5,     desc:'Demande de pièce urgente',         icon:'⚡' },
              { op:'publish_transport', cost:costs.publish_transport||3,  desc:'Publier une offre de transport',   icon:'🚛' },
            ].map(item => (
              <div key={item.op} style={{ background:C.white, border:'1px solid '+(C.mid), borderRadius:14, padding:'1.2rem', display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                <div style={{ fontSize:'1.8rem', flexShrink:0 }}>{item.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:C.forest, fontSize:'0.9rem' }}>{OPERATION_LABELS[item.op]}</div>
                  <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.2rem', lineHeight:1.4 }}>{item.desc}</div>
                  <div style={{ marginTop:'0.5rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    <span style={{ background:'#E8F8EE', color:C.eco, fontWeight:700, fontSize:'0.82rem', padding:'0.2rem 0.6rem', borderRadius:100 }}>
                      🪙 {item.cost} jeton{item.cost>1?'s':''}
                    </span>
                    {item.perUnit && <span style={{ fontSize:'0.72rem', color:C.muted }}>par article</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:C.beige, border:'1px solid '+(C.mid), borderRadius:14, padding:'1.2rem', fontSize:'0.82rem', color:C.muted, lineHeight:1.7 }}>
            💡 <strong>Admins exemptés</strong> — Les administrateurs n'ont pas de jetons à consommer.<br/>
            🎉 <strong>Bonus bienvenue</strong> — 50 jetons offerts à l'inscription.<br/>
            ♻️ <strong>Remboursement</strong> — Les jetons sont remboursés en cas d'annulation par le système.
          </div>
        </div>
      )}

      {/* ════ TAB : ACHETER ════ */}
      {activeTab === 'buy' && (
        <div>
          <p style={{ color:C.muted, fontSize:'0.88rem', marginBottom:'1.5rem' }}>
            Choisissez un forfait pour recharger votre compte. Paiement simulé pour le MVP.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap:'1.2rem' }}>
            {packages.map(pkg => {
              const totalTokens = pkg.tokens + Math.floor(pkg.tokens * (pkg.bonus_pct||0) / 100);
              const pricePerToken = (pkg.price_mad / totalTokens).toFixed(2);
              return (
                <div key={pkg.id}
                  style={{ background:C.white, border:'${pkg.is_popular?2:1}px solid '+(pkg.is_popular?C.leaf:C.mid)+'', borderRadius:18, padding:'1.8rem', position:'relative', textAlign:'center', transition:'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(30,61,15,0.12)'}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>

                  {pkg.is_popular && (
                    <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:C.leaf, color:'#fff', borderRadius:100, padding:'0.2rem 0.9rem', fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap' }}>
                      ⭐ LE PLUS POPULAIRE
                    </div>
                  )}

                  <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🪙</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.forest, marginBottom:'0.3rem' }}>{pkg.name}</div>

                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.5rem', fontWeight:700, color:pkg.is_popular?C.leaf:C.forest, lineHeight:1 }}>
                    {totalTokens}
                    <span style={{ fontSize:'1rem', opacity:0.7 }}> jetons</span>
                  </div>

                  {pkg.bonus_pct > 0 && (
                    <div style={{ fontSize:'0.78rem', color:C.eco, fontWeight:600, marginTop:'0.3rem' }}>
                      🎁 Dont {Math.floor(pkg.tokens * pkg.bonus_pct / 100)} jetons bonus (+{pkg.bonus_pct}%)
                    </div>
                  )}

                  <div style={{ fontSize:'0.72rem', color:C.muted, margin:'0.5rem 0', lineHeight:1.5 }}>
                    {pricePerToken} MAD / jeton
                  </div>

                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:C.forest, margin:'0.8rem 0' }}>
                    {fmt(pkg.price_mad)} MAD
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('Acheter le forfait "${pkg.name}" pour ${fmt(pkg.price_mad)} MAD ?\n'+(totalTokens)+' jetons seront crédités sur votre compte.')) {
                        purchaseMutation.mutate(pkg.id);
                      }
                    }}
                    disabled={purchaseMutation.isLoading}
                    style={{ width:'100%', background: pkg.is_popular ? C.forest : 'transparent', color: pkg.is_popular ? C.cream : C.forest, border:'2px solid '+(pkg.is_popular?C.forest:C.mid)+'', padding:'0.85rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", marginTop:'0.5rem' }}>
                    {purchaseMutation.isLoading ? 'Traitement...' : '💳 Acheter'}
                  </button>
                </div>
              );
            })}
          </div>

          {packages.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Aucun forfait disponible</div>
          )}

          <div style={{ marginTop:'1.5rem', background:'#EBF5FB', border:'1px solid #AED6F1', borderRadius:12, padding:'1rem 1.2rem', fontSize:'0.82rem', color:'#1A5276' }}>
            🔒 <strong>Paiement sécurisé</strong> — Les transactions sont sécurisées. Pour le MVP, le paiement est simulé. En production : CMI, CIH Pay, Visa/Mastercard.
          </div>
        </div>
      )}

      {/* ════ TAB : HISTORIQUE ════ */}
      {activeTab === 'history' && (
        <div>
          {isLoading ? (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.8rem', opacity:0.3 }}>📋</div>
              <p>Aucune transaction pour l'instant</p>
            </div>
          ) : (
            <div style={{ background:C.white, border:'1px solid '+(C.mid), borderRadius:18, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr 120px 120px', padding:'0.8rem 1.2rem', background:C.beige, borderBottom:'1px solid '+(C.mid)+'', fontSize:'0.72rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', gap:'0.5rem' }}>
                <div></div><div>Opération</div><div>Date</div><div>Jetons</div><div>Solde après</div>
              </div>
              <div className='revex-table-wrap' style={{ maxHeight:600, overflowY:'auto' }}>
                {history.map((tx, i) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <div key={tx.id} style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr 120px 120px', padding:'0.8rem 1.2rem', borderBottom:'1px solid '+(C.beige)+'', alignItems:'center', background:i%2===0?C.white:C.cream, gap:'0.5rem' }}>
                      <div style={{ fontSize:'1.2rem', textAlign:'center' }}>
                        {OPERATION_ICONS[tx.operation] || '🪙'}
                      </div>
                      <div>
                        <div style={{ fontWeight:500, fontSize:'0.86rem', color:C.forest }}>
                          {OPERATION_LABELS[tx.operation] || tx.operation}
                        </div>
                        {tx.description && (
                          <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.1rem' }}>{tx.description}</div>
                        )}
                      </div>
                      <div style={{ fontSize:'0.78rem', color:C.muted }}>
                        {new Date(tx.created_at).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'numeric' })}<br/>
                        <span style={{ fontSize:'0.7rem' }}>{new Date(tx.created_at).toLocaleTimeString('fr-MA', { hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:isCredit?C.eco:C.urgent }}>
                        {isCredit ? '+' : ''}{tx.amount}
                      </div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:600, color:C.forest }}>
                        {tx.balance_after} 🪙
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
