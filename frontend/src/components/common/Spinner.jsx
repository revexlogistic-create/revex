// src/components/common/Spinner.jsx
import React from 'react';
export default function Spinner({ fullPage }) {
  const spinner = (
    <>
      <div style={{width:36,height:36,border:'3px solid #D9CEBC',borderTop:'3px solid #4A7C2F',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
  if (fullPage) return (
    <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(246,241,231,0.85)',zIndex:999}}>
      {spinner}
    </div>
  );
  return <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}>{spinner}</div>;
}
