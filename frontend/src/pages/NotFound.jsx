// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{textAlign:'center',padding:'6rem 2rem',background:'#F6F1E7',minHeight:'60vh'}}>
      <div style={{fontFamily:"'Cormorant Garamond', serif",fontSize:'8rem',color:'#D9CEBC',fontWeight:700,lineHeight:1}}>404</div>
      <h1 style={{fontFamily:"'Cormorant Garamond', serif",fontSize:'2rem',color:'#1E3D0F',margin:'1rem 0'}}>Page introuvable</h1>
      <p style={{color:'#5C5C50',marginBottom:'2rem'}}>Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/" style={{background:'#1E3D0F',color:'#F6F1E7',padding:'0.9rem 2rem',borderRadius:100,textDecoration:'none',fontWeight:600}}>Retour à l'accueil</Link>
    </div>
  );
}
