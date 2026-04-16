// src/utils/generateQualityReport.js
// Génère un rapport de vérification qualité REVEX

export function generateQualityReportPdf(data) {
  const {
    productTitle, reference, grade, quantity, unit,
    price, sellerCompany, locationCity, createdAt,
    views, description,
  } = data;

  const now    = new Date();
  const dateStr = now.toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' });
  const repNum = 'REVEX-VQ-' + (reference||'PDR').replace(/[^A-Z0-9]/gi,'').substring(0,6).toUpperCase() + '-' + Date.now().toString().slice(-4);

  const gradeColors  = {'A+':'#059669','A':'#2563EB','B':'#D97706','C':'#DC2626','D':'#6B7280'};
  const gradeColor   = gradeColors[grade] || '#1E3D0F';
  const gradeDesc    = {'A+':'Neuf ou état neuf — Aucune usure détectée.','A':'Excellent état — Légères traces d\'utilisation non fonctionnelles.','B':'Bon état — Usure normale, totalement fonctionnel.','C':'Acceptable — Usure visible, fonctionnel avec précautions.','D':'Dégradé — Utilisation pour pièces ou réparation uniquement.'};
  const gradeScore   = {'A+':98,'A':88,'B':72,'C':55,'D':35};
  const score        = gradeScore[grade] || 75;

  const criteria = [
    { name: 'Intégrité structurelle',    score: grade==='A+'?100:grade==='A'?92:grade==='B'?78:grade==='C'?60:40, weight:'30%' },
    { name: 'État de surface',           score: grade==='A+'?100:grade==='A'?88:grade==='B'?72:grade==='C'?55:35, weight:'20%' },
    { name: 'Dimensions & tolérances',   score: grade==='A+'?100:grade==='A'?95:grade==='B'?85:grade==='C'?70:50, weight:'25%' },
    { name: 'Fonctionnement vérifié',    score: grade==='A+'?100:grade==='A'?90:grade==='B'?80:grade==='C'?60:30, weight:'15%' },
    { name: 'Marquages & identification',score: grade==='A+'?100:grade==='A'?95:grade==='B'?85:grade==='C'?75:55, weight:'10%' },
  ];

  const steps16 = [
    'Réception du stock','Dépotage & inventaire','Nettoyage initial','Contrôle visuel',
    'Mesure dimensionnelle','Test fonctionnel','Contrôle marquages','Détection défauts',
    'Attribution du grade','Photographie','Documentation','Certification',
    'Publication catalogue','Vérification acheteur','Confirmation escrow','Archivage'
  ];

  const barHtml = (s) => {
    const c = s >= 80 ? '#059669' : s >= 60 ? '#D97706' : '#DC2626';
    return `<div style="flex:1;background:#EDE6D3;border-radius:100px;height:8px;overflow:hidden"><div style="width:${s}%;height:100%;background:${c};border-radius:100px"></div></div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"/>
<title>Rapport Qualité ${repNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#f0ece3;padding:24px;display:flex;flex-direction:column;align-items:center}
.doc{background:#fff;width:210mm;max-width:780px;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
.hdr{background:linear-gradient(135deg,#1E3D0F,#2D5A1B);padding:26px 36px 20px;position:relative}
.hdr::after{content:'';position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;border:1.5px solid rgba(126,168,106,0.18)}
.logo-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.logo{font-size:30px;font-weight:700;color:#F6F1E7;letter-spacing:3px}
.badge{background:rgba(126,168,106,0.2);border:1px solid rgba(126,168,106,0.4);border-radius:100px;padding:3px 12px;font-size:9px;color:#7EA86A;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;font-family:Calibri,sans-serif}
.hdr h1{font-size:18px;color:#F6F1E7;margin-bottom:3px}
.hdr p{font-size:10px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
.body{padding:24px 36px}
.num-bar{background:#F6F1E7;border:1px solid #D9CEBC;border-radius:8px;padding:11px 16px;display:flex;justify-content:space-between;margin-bottom:20px}
.num{font-family:Consolas,monospace;font-size:14px;font-weight:700;color:#1E3D0F;letter-spacing:2px}
.section-title{font-size:11px;font-weight:700;color:#1E3D0F;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;border-left:3px solid #1E3D0F;padding-left:8px;margin:18px 0 10px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}
.cell{background:#F6F1E7;border-radius:8px;padding:10px 12px;border:1px solid #EDE6D3}
.lbl{font-size:8px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:2px}
.val{font-size:12px;font-weight:600;color:#1E3D0F}
.cftr{background:#1E3D0F;padding:11px 36px;display:flex;justify-content:space-between;align-items:center}
.cftr-t{font-size:9px;color:rgba(246,241,231,0.55);font-family:Calibri,sans-serif}
.cftr-l{font-size:12px;font-weight:700;color:rgba(246,241,231,0.8);letter-spacing:3px}
.print-btn{margin-top:16px;padding:10px 28px;background:#1E3D0F;color:#F6F1E7;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Calibri,sans-serif}
@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}.print-btn{display:none}}
</style></head>
<body>
<div class="doc">
  <div class="hdr">
    <div class="logo-row"><div class="logo">REVEX</div><div class="badge">Rapport Vérification Qualité</div></div>
    <h1>Rapport de Vérification Qualité PDR</h1>
    <p>Processus qualité certifié 16 étapes · Marketplace B2B industrielle · revex.ma</p>
  </div>

  <div class="body">
    <div class="num-bar">
      <div>
        <div style="font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:1px;font-family:Calibri,sans-serif;margin-bottom:2px">Numéro de Rapport</div>
        <div class="num">${repNum}</div>
      </div>
      <div style="font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif;text-align:right">
        Rédigé le<br/><strong>${dateStr}</strong>
      </div>
    </div>

    <!-- Score global -->
    <div style="display:flex;align-items:center;gap:20px;background:#F6F1E7;border-radius:10px;padding:16px;border:1px solid #EDE6D3;margin-bottom:20px">
      <div style="width:70px;height:70px;border-radius:50%;background:${gradeColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;flex-shrink:0">${grade||'A'}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#1E3D0F;margin-bottom:3px">Grade ${grade||'—'} — Score global : ${score}/100</div>
        <div style="font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;margin-bottom:8px">${gradeDesc[grade]||'Grade déterminé par inspection REVEX.'}</div>
        <div style="background:#EDE6D3;border-radius:100px;height:10px;overflow:hidden">
          <div style="width:${score}%;height:100%;background:linear-gradient(90deg,#1E3D0F,${gradeColor});border-radius:100px"></div>
        </div>
      </div>
    </div>

    <div class="section-title">Identification de la pièce</div>
    <div class="info-grid">
      <div class="cell"><div class="lbl">Désignation</div><div class="val">${(productTitle||'—').substring(0,42)}</div></div>
      <div class="cell"><div class="lbl">Référence</div><div class="val" style="font-family:Consolas,monospace">${reference||'—'}</div></div>
      <div class="cell"><div class="lbl">Quantité inspectée</div><div class="val">${quantity||1} ${unit||'u.'}</div></div>
      <div class="cell"><div class="lbl">Valeur déclarée</div><div class="val">${price?Number(price).toLocaleString('fr-MA')+' MAD':'—'}</div></div>
      ${locationCity?'<div class="cell"><div class="lbl">Site d\'inspection</div><div class="val">📍 '+locationCity+'</div></div>':''}
      <div class="cell"><div class="lbl">Vendeur</div><div class="val">${sellerCompany||'—'}</div></div>
    </div>

    <div class="section-title">Grille d'évaluation par critère</div>
    <div style="margin-bottom:18px">
      ${criteria.map(c => `
      <div style="display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid #EDE6D3">
        <div style="width:180px;font-size:10px;color:#1E3D0F;font-family:Calibri,sans-serif;flex-shrink:0">${c.name}</div>
        ${barHtml(c.score)}
        <div style="width:36px;text-align:right;font-size:10px;font-weight:700;color:${c.score>=80?'#059669':c.score>=60?'#D97706':'#DC2626'};flex-shrink:0">${c.score}</div>
        <div style="width:28px;font-size:9px;color:#8C8C7A;font-family:Calibri,sans-serif;flex-shrink:0">${c.weight}</div>
      </div>`).join('')}
    </div>

    <div class="section-title">Processus de vérification REVEX (16 étapes)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:18px">
      ${steps16.map((s, i) => `
      <div style="display:flex;align-items:center;gap:7px;padding:6px 8px;background:#F6F1E7;border-radius:6px;border:1px solid #EDE6D3">
        <span style="width:18px;height:18px;border-radius:50%;background:#1E3D0F;color:#fff;font-size:8px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${i+1}</span>
        <span style="font-size:9.5px;color:#1E3D0F;font-family:Calibri,sans-serif">✓ ${s}</span>
      </div>`).join('')}
    </div>

    ${description ? `
    <div class="section-title">Observations de l'inspecteur</div>
    <div style="background:#F6F1E7;border-radius:8px;padding:12px 14px;border:1px solid #EDE6D3;margin-bottom:18px;font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.7">
      ${description.substring(0,300)}
    </div>` : ''}

    <div class="section-title">Conclusion et recommandation</div>
    <div style="border:1px solid ${gradeColor}44;border-radius:8px;padding:12px 14px;margin-bottom:18px;background:${gradeColor}0a">
      <div style="font-size:12px;font-weight:700;color:${gradeColor};margin-bottom:5px">
        ${grade==='A+'||grade==='A' ? '✅ Article recommandé pour vente immédiate' : grade==='B' ? '✅ Article recommandé pour vente avec description complète' : grade==='C' ? '⚠️ Article vendable avec mention des réserves' : '⚠️ Article à vendre pour pièces uniquement'}
      </div>
      <p style="font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.6">
        ${grade==='A+'||grade==='A' ? 'La pièce présente un excellent état général. Elle est recommandée pour une utilisation en conditions normales de service. Aucune restriction d\'usage.' : grade==='B' ? 'La pièce présente une usure normale compatible avec un usage industriel standard. Informer l\'acheteur de l\'état général.' : grade==='C' ? 'La pièce présente une usure notable. Son utilisation est possible avec un contrôle préalable par l\'acheteur.' : 'La pièce est dégradée. Son utilisation est réservée au démontage pour pièces détachées ou à la réparation.'}
      </p>
    </div>

    <p style="font-size:9px;color:#8C8C7A;font-family:Calibri,sans-serif;text-align:center;margin-bottom:4px">
      Rapport généré automatiquement par REVEX sur la base du processus qualité certifié en 16 étapes<br/>
      Roamers Community SARL · Casablanca, Maroc · revex.ma · contact@revex.ma
    </p>
  </div>

  <div class="cftr">
    <div class="cftr-t">Rapport ${repNum} · REVEX · Conservation 5 ans obligatoire</div>
    <div class="cftr-l">REVEX</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); };
  }
}
