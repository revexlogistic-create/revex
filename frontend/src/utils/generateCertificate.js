// src/utils/generateCertificate.js
// Génère et ouvre un certificat digital REVEX imprimable (→ PDF via Ctrl+P)

export function generateCertificatePdf(data) {
  const {
    type = 'product',
    id, orderNumber, title, reference, grade, price, quantity, unit,
    sellerCompany, buyerCompany, deliveryType, locationCity, createdAt,
  } = data;

  const now       = new Date();
  const emittedAt = now.toLocaleString('fr-MA', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const certNum   = 'REVEX-' + (orderNumber || id || '').toString().replace(/-/g,'').substring(0,8).toUpperCase();
  const isOrder   = type === 'order';

  // QR code pattern simulé (en production : vraie lib qrcode)
  const seed = certNum.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const SIZE = 11;
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const corner =
        (r < 3 && c < 3) || (r < 3 && c >= SIZE-3) || (r >= SIZE-3 && c < 3);
      cells.push(corner ? true : ((seed * (r+1) * (c+1) * 13) % 3) === 0);
    }
  }
  const qrRows = [];
  for (let r = 0; r < SIZE; r++) {
    const row = cells.slice(r*SIZE, (r+1)*SIZE)
      .map(d => '<span style="display:inline-block;width:5px;height:5px;background:'+(d?'#1E3D0F':'#fff')+'"></span>')
      .join('');
    qrRows.push('<div style="line-height:5px;">'+row+'</div>');
  }

  const gradeColorMap = {'A+':'#059669','A':'#2563EB','B':'#D97706','C':'#DC2626','D':'#6B7280'};
  const gradeColor = gradeColorMap[grade] || '#1E3D0F';
  const gradeDesc  = {'A+':'Neuf ou état neuf — Performance maximale.','A':'Excellent état — légères traces non fonctionnelles.','B':'Bon état — usure normale, totalement fonctionnel.','C':'Acceptable — usure visible, fonctionnel avec précautions.','D':'Dégradé — pièces ou réparation uniquement.'};

  const steps = ['Inscription','Qualification','Analyse CCOM','Grade','Publication','Demande','Devis','Accord','Escrow','Expédition','Transport','Livraison','Confirmation','Libération','Certificat','Archivage'];
  const stepsHtml = steps.map((s, i) =>
    '<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 0;">' +
    '<span style="width:18px;height:18px;border-radius:50%;background:#1E3D0F;color:#fff;font-size:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">'+(i+1)+'</span>' +
    '<span style="font-size:9px;color:#5C5C50;font-family:Calibri,sans-serif">'+s+'</span>' +
    (i < steps.length-1 ? '<span style="color:#7EA86A;font-size:10px;margin-left:2px">›</span>' : '') +
    '</span>'
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"/>
<title>Certificat ${certNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#f0ece3;padding:24px;display:flex;flex-direction:column;align-items:center}
.cert{background:#fff;width:210mm;max-width:780px;border-radius:10px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.18)}
.hdr{background:linear-gradient(135deg,#1E3D0F,#2D5A1B 60%,#1E3D0F);padding:28px 36px 22px;position:relative}
.hdr::after{content:'';position:absolute;top:-25px;right:-25px;width:120px;height:120px;border-radius:50%;border:1.5px solid rgba(126,168,106,0.18)}
.logo-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.logo{font-size:34px;font-weight:700;color:#F6F1E7;letter-spacing:3px}
.badge{background:rgba(126,168,106,0.2);border:1px solid rgba(126,168,106,0.4);border-radius:100px;padding:3px 12px;font-size:9px;color:#7EA86A;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;font-family:Calibri,sans-serif}
.hdr h1{font-size:20px;color:#F6F1E7;margin-bottom:3px}
.hdr p{font-size:11px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
.body{padding:24px 36px}
.num-bar{background:#F6F1E7;border:1px solid #D9CEBC;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.num{font-family:Consolas,monospace;font-size:15px;font-weight:700;color:#1E3D0F;letter-spacing:2px}
.dt{font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif;text-align:right}
.grade-row{display:flex;align-items:center;gap:16px;background:#F6F1E7;border-radius:10px;padding:14px;border:1px solid #EDE6D3;margin-bottom:18px}
.gb{width:54px;height:54px;border-radius:10px;color:#fff;font-size:24px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.gi h3{font-size:14px;color:#1E3D0F;margin-bottom:3px}
.gi p{font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif;line-height:1.5}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}
.cell{background:#F6F1E7;border-radius:8px;padding:10px 12px;border:1px solid #EDE6D3}
.lbl{font-size:8px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:2px}
.val{font-size:12px;font-weight:600;color:#1E3D0F}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.party{border:1px solid #D9CEBC;border-radius:8px;padding:10px 12px}
.prole{font-size:8px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:3px}
.pname{font-size:13px;font-weight:700;color:#1E3D0F}
.guar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px}
.g{border:1px solid #EDE6D3;border-radius:8px;padding:9px;text-align:center}
.g .icon{font-size:15px;margin-bottom:3px}
.g .txt{font-size:8.5px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.4}
.proc{background:#F6F1E7;border-radius:10px;padding:12px 14px;margin-bottom:18px}
.proc h4{font-size:10px;color:#1E3D0F;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif}
.proc-steps{display:flex;flex-wrap:wrap;gap:3px}
.ftr-row{display:flex;gap:18px;align-items:flex-start;margin-bottom:18px}
.qr-wrap{border:1px solid #D9CEBC;border-radius:8px;padding:7px;background:#fff;flex-shrink:0}
.sig h4{font-size:10px;font-weight:700;color:#1E3D0F;margin-bottom:6px;font-family:Calibri,sans-serif}
.sig p{font-size:9.5px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.6;margin-bottom:9px}
.sline{width:130px;border-bottom:1.5px solid #1E3D0F;margin-bottom:4px}
.sname{font-size:9px;color:#5C5C50;font-family:Calibri,sans-serif}
.cftr{background:#1E3D0F;padding:11px 36px;display:flex;justify-content:space-between;align-items:center}
.cftr-t{font-size:9px;color:rgba(246,241,231,0.55);font-family:Calibri,sans-serif}
.cftr-l{font-size:13px;font-weight:700;color:rgba(246,241,231,0.8);letter-spacing:3px}
.print-btn{margin-top:16px;padding:10px 28px;background:#1E3D0F;color:#F6F1E7;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Calibri,sans-serif}
@media print{body{background:#fff;padding:0}.cert{box-shadow:none;border-radius:0}.print-btn{display:none}}
</style></head>
<body>
<div class="cert">
  <div class="hdr">
    <div class="logo-row">
      <div class="logo">REVEX</div>
      <div class="badge">Certificat Digital</div>
    </div>
    <h1>Certificat de Traçabilité Industrielle</h1>
    <p>Marketplace B2B PDR Certifiée — Maroc · revex.ma</p>
  </div>

  <div class="body">
    <div class="num-bar">
      <div>
        <div style="font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:1px;font-family:Calibri,sans-serif;margin-bottom:2px">Numéro de Certificat</div>
        <div class="num">${certNum}</div>
      </div>
      <div class="dt">Émis le<br/><strong>${emittedAt}</strong></div>
    </div>

    <div class="grade-row">
      <div class="gb" style="background:${gradeColor}">${grade||'A'}</div>
      <div class="gi">
        <h3>Grade de Qualité Certifié : ${grade||'—'}</h3>
        <p>${gradeDesc[grade]||'Grade déterminé par inspection REVEX.'}</p>
      </div>
    </div>

    <div class="grid">
      <div class="cell"><div class="lbl">Désignation</div><div class="val">${(title||'—').substring(0,38)}</div></div>
      <div class="cell"><div class="lbl">Référence</div><div class="val" style="font-family:Consolas,monospace">${reference||'—'}</div></div>
      <div class="cell"><div class="lbl">Valeur certifiée</div><div class="val">${price?Number(price).toLocaleString('fr-MA')+' MAD':'Sur devis'}</div></div>
      <div class="cell"><div class="lbl">Quantité</div><div class="val">${quantity||'1'} ${unit||'u.'}</div></div>
      ${locationCity?'<div class="cell"><div class="lbl">Localisation</div><div class="val">📍 '+locationCity+'</div></div>':''}
      <div class="cell"><div class="lbl">Livraison</div><div class="val">${deliveryType==='eco'?'🌿 Retour à vide':deliveryType==='urgent'?'⚡ Urgent':'🏭 Enlèvement'}</div></div>
    </div>

    <div class="parties">
      <div class="party"><div class="prole">🏭 Vendeur</div><div class="pname">${sellerCompany||'—'}</div></div>
      ${isOrder&&buyerCompany?'<div class="party"><div class="prole">🛒 Acheteur</div><div class="pname">'+buyerCompany+'</div></div>':'<div class="party"><div class="prole">📅 Date publication</div><div class="pname">'+(createdAt?new Date(createdAt).toLocaleDateString('fr-MA',{day:'2-digit',month:'long',year:'numeric'}):'—')+'</div></div>'}
    </div>

    <div class="guar">
      <div class="g"><div class="icon">🔒</div><div class="txt">Paiement escrow sécurisé en MAD</div></div>
      <div class="g"><div class="icon">📜</div><div class="txt">Document légalement opposable</div></div>
      <div class="g"><div class="icon">🌿</div><div class="txt">Livraison éco-responsable</div></div>
    </div>

    <div class="proc">
      <h4>🔄 Processus de certification REVEX — 16 étapes validées</h4>
      <div class="proc-steps">${stepsHtml}</div>
    </div>

    <div class="ftr-row">
      <div class="qr-wrap">${qrRows.join('')}</div>
      <div class="sig">
        <h4>Certification REVEX</h4>
        <p>Ce certificat atteste que la pièce de rechange industrielle référencée a été contrôlée, certifiée et tracée conformément au processus qualité REVEX en 16 étapes. Il est légalement opposable et doit être conservé 5 ans.</p>
        <div class="sline"></div>
        <div class="sname">Roamers Community SARL — REVEX Platform<br/>Casablanca, Maroc · contact@revex.ma</div>
      </div>
    </div>
  </div>

  <div class="cftr">
    <div class="cftr-t">Certificat ${certNum} · revex.ma · Conservation 5 ans obligatoire</div>
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
