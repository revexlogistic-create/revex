// src/components/transport/EcoDeliveryMatcher.jsx
// Composant affiché sur la page produit pour choisir un trajet retour à vide
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50', eco:'#27AE60',
  urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function EcoDeliveryMatcher({ fromCity, toCity, onSelectTransport, selectedTransportId }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery(
    ['transport-match', fromCity, toCity],
    () => api.get(`/transport/match?from=${encodeURIComponent(fromCity||'')}&to=${encodeURIComponent(toCity||'')}`).then(r => r.data),
    {
      enabled: !!(fromCity && toCity),
      staleTime: 60000
    }
  );

  const transports = data?.transports || [];

  if (!fromCity || !toCity) return null;

  return (
    <div style={{ marginTop:'0.8rem', background:'#E8F8EE', border:`1.5px solid ${C.eco}55`, borderRadius:14, overflow:'hidden' }}>

      {/* Header cliquable */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding:'0.8rem 1.1rem', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <span>🌿</span>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.forest }}>
              Livraison Économique — Retour à vide
            </div>
            <div style={{ fontSize:'0.72rem', color:C.muted }}>
              {isLoading ? 'Recherche trajets...'
                : transports.length > 0 ? `${transports.length} trajet(s) disponible(s) : ${fromCity} → ${toCity}`
                : `Aucun trajet direct trouvé (${fromCity} → ${toCity})`}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {selectedTransportId && (
            <span style={{ background:C.eco, color:'#fff', borderRadius:100, padding:'0.15rem 0.6rem', fontSize:'0.72rem', fontWeight:700 }}>
              ✓ Sélectionné
            </span>
          )}
          <span style={{ color:C.muted, fontSize:'0.8rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Liste trajets */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.eco}33` }}>
          {isLoading && (
            <div style={{ padding:'1.2rem', textAlign:'center', color:C.muted, fontSize:'0.85rem' }}>
              🔍 Recherche des trajets disponibles...
            </div>
          )}

          {!isLoading && transports.length === 0 && (
            <div style={{ padding:'1.2rem' }}>
              <p style={{ fontSize:'0.82rem', color:C.muted, marginBottom:'0.8rem' }}>
                Aucun transporteur disponible sur ce trajet pour l'instant.<br/>
                La livraison sera organisée directement avec le vendeur.
              </p>
              <Link to="/transport" target="_blank"
                style={{ fontSize:'0.78rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>
                Voir tous les transporteurs →
              </Link>
            </div>
          )}

          {!isLoading && transports.map(t => {
            const isSelected = selectedTransportId === t.id;
            const availCap   = Number(t.available_capacity || t.capacity_tons || 0);
            const departDate = new Date(t.departure_date).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'numeric' });

            return (
              <div key={t.id}
                style={{ padding:'0.9rem 1.1rem', borderBottom:`1px solid ${C.eco}22`, background: isSelected ? '#D5F5E3' : C.white, cursor:'pointer', transition:'background 0.15s' }}
                onClick={() => onSelectTransport && onSelectTransport(isSelected ? null : t)}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0FAF4'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = C.white; }}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.8rem' }}>
                  {/* Infos trajet */}
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem' }}>
                      <span style={{ fontWeight:700, fontSize:'0.9rem', color:C.forest }}>
                        {t.departure_city} → {t.arrival_city}
                      </span>
                      {isSelected && <span style={{ background:C.eco, color:'#fff', borderRadius:100, padding:'0.1rem 0.5rem', fontSize:'0.68rem', fontWeight:700 }}>✓ Choisi</span>}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:C.muted, lineHeight:1.6 }}>
                      📅 Départ : <strong>{departDate}</strong><br/>
                      🚛 {t.vehicle_type || 'Camion'} • {availCap > 0 ? `${availCap}T disponibles` : 'Capacité à confirmer'}
                      {t.carrier_company && <> • <strong>{t.carrier_company}</strong></>}
                      {t.carrier_rating > 0 && <> • ⭐ {Number(t.carrier_rating).toFixed(1)}</>}
                    </div>
                  </div>

                  {/* Prix */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {t.price_per_kg ? (
                      <>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.eco, fontSize:'1rem' }}>
                          {fmt(t.price_per_kg)} MAD/kg
                        </div>
                        <div style={{ fontSize:'0.68rem', color:C.muted }}>Prix au kg</div>
                      </>
                    ) : (
                      <div style={{ fontSize:'0.78rem', color:C.eco, fontWeight:600 }}>Prix à négocier</div>
                    )}
                  </div>
                </div>

                {t.notes && (
                  <div style={{ marginTop:'0.4rem', fontSize:'0.72rem', color:C.muted, fontStyle:'italic' }}>
                    📝 {t.notes}
                  </div>
                )}
              </div>
            );
          })}

          {/* Lien voir plus */}
          <div style={{ padding:'0.7rem 1.1rem', borderTop:`1px solid ${C.eco}22` }}>
            <Link to={`/transport?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`}
              style={{ fontSize:'0.78rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>
              Voir tous les transporteurs disponibles →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
