// src/components/ui/BackButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ to, label = 'Retour', style = {} }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: 'transparent', border: '1px solid #D9CEBC',
        color: '#5C5C50', padding: '0.4rem 1rem', borderRadius: 100,
        fontSize: '0.85rem', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
        ...style
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#EDE6D3'; e.currentTarget.style.color = '#1E3D0F'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5C5C50'; }}
    >
      ← {label}
    </button>
  );
}
