// src/utils/generateContract.js
// Génère un contrat de vente B2B industriel REVEX (HTML → PDF via impression)

export function generateContractPdf(data) {
  const {
    orderNumber, productTitle, reference, grade, quantity, unit,
    unitPrice, totalPrice, deliveryType, deliveryPrice,
    sellerCompany, sellerCity, sellerIce,
    buyerCompany, buyerCity, buyerIce,
    createdAt,
  } = data;

  const now       = new Date();
  const dateStr   = now.toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' });
  const contratNum = 'REVEX-CVT-' + (orderNumber||'').toString().replace(/-/g,'').substring(0,8).toUpperCase();
  const tp        = Number(totalPrice||0).toLocaleString('fr-MA');
  const up        = Number(unitPrice||0).toLocaleString('fr-MA');
  const dp        = Number(deliveryPrice||0).toLocaleString('fr-MA');
  const total     = Number(totalPrice||0) + Number(deliveryPrice||0);

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"/>
<title>Contrat ${contratNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#f0ece3;padding:24px;display:flex;flex-direction:column;align-items:center}
.doc{background:#fff;width:210mm;max-width:780px;padding:0;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
.hdr{background:linear-gradient(135deg,#1E3D0F,#2D5A1B);padding:26px 36px 20px;position:relative}
.hdr::after{content:'';position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;border:1.5px solid rgba(126,168,106,0.18)}
.logo-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.logo{font-size:30px;font-weight:700;color:#F6F1E7;letter-spacing:3px}
.badge{background:rgba(126,168,106,0.2);border:1px solid rgba(126,168,106,0.4);border-radius:100px;padding:3px 12px;font-size:9px;color:#7EA86A;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;font-family:Calibri,sans-serif}
.hdr h1{font-size:18px;color:#F6F1E7;margin-bottom:3px}
.hdr p{font-size:10px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
.body{padding:24px 36px}
/* Numéro contrat */
.num-bar{background:#F6F1E7;border:1px solid #D9CEBC;border-radius:8px;padding:11px 16px;display:flex;justify-content:space-between;margin-bottom:20px}
.num{font-family:Consolas,monospace;font-size:14px;font-weight:700;color:#1E3D0F;letter-spacing:2px}
.dt{font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif;text-align:right}
/* Parties */
.parties-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.party-box{border:1px solid #D9CEBC;border-radius:8px;padding:12px 14px}
.party-role{font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:5px}
.party-name{font-size:14px;font-weight:700;color:#1E3D0F;margin-bottom:2px}
.party-info{font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.6}
/* Section titles */
.section-title{font-size:11px;font-weight:700;color:#1E3D0F;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;border-left:3px solid #1E3D0F;padding-left:8px;margin:18px 0 10px}
/* Objet du contrat */
.objet{background:#F6F1E7;border-radius:8px;padding:12px 14px;border:1px solid #EDE6D3;margin-bottom:20px}
.objet-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #EDE6D3;font-size:11px}
.objet-row:last-child{border-bottom:none;font-weight:700;color:#1E3D0F}
.objet-label{color:#5C5C50;font-family:Calibri,sans-serif}
.objet-value{color:#1E3D0F;font-weight:600}
/* Articles légaux */
.article{margin-bottom:14px}
.article h3{font-size:11px;font-weight:700;color:#1E3D0F;margin-bottom:5px;font-family:Calibri,sans-serif}
.article p{font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.7}
/* Signatures */
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding-top:16px;border-top:1px solid #EDE6D3}
.sig-box{}
.sig-role{font-size:10px;font-weight:700;color:#1E3D0F;font-family:Calibri,sans-serif;margin-bottom:4px}
.sig-name{font-size:11px;color:#5C5C50;font-family:Calibri,sans-serif;margin-bottom:30px}
.sig-line{border-bottom:1.5px solid #1E3D0F;width:80%;margin-bottom:4px}
.sig-label{font-size:9px;color:#8C8C7A;font-family:Calibri,sans-serif}
/* Footer */
.cftr{background:#1E3D0F;padding:11px 36px;display:flex;justify-content:space-between;align-items:center;margin-top:0}
.cftr-t{font-size:9px;color:rgba(246,241,231,0.55);font-family:Calibri,sans-serif}
.cftr-l{font-size:12px;font-weight:700;color:rgba(246,241,231,0.8);letter-spacing:3px}
.print-btn{margin-top:16px;padding:10px 28px;background:#1E3D0F;color:#F6F1E7;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Calibri,sans-serif}
@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}.print-btn{display:none}}
</style></head>
<body>
<div class="doc">
  <div class="hdr">
    <div class="logo-row">
      <div class="logo">REVEX</div>
      <div class="badge">Contrat de Vente B2B</div>
    </div>
    <h1>Contrat de Vente de Pièce de Rechange Industrielle</h1>
    <p>Marketplace B2B PDR Certifiée — Maroc · revex.ma</p>
  </div>

  <div class="body">
    <div class="num-bar">
      <div>
        <div style="font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:1px;font-family:Calibri,sans-serif;margin-bottom:2px">Numéro de Contrat</div>
        <div class="num">${contratNum}</div>
      </div>
      <div class="dt">Casablanca, le<br/><strong>${dateStr}</strong><br/><span style="font-size:9px">Commande : ${orderNumber||'—'}</span></div>
    </div>

    <div class="section-title">Article 1 — Les Parties</div>
    <div class="parties-grid">
      <div class="party-box">
        <div class="party-role">🏭 Le Vendeur</div>
        <div class="party-name">${sellerCompany||'—'}</div>
        <div class="party-info">
          Ville : ${sellerCity||'—'}<br/>
          ${sellerIce ? 'ICE : '+sellerIce+'<br/>' : ''}
          Vendeur qualifié REVEX
        </div>
      </div>
      <div class="party-box">
        <div class="party-role">🛒 L'Acheteur</div>
        <div class="party-name">${buyerCompany||'—'}</div>
        <div class="party-info">
          Ville : ${buyerCity||'—'}<br/>
          ${buyerIce ? 'ICE : '+buyerIce+'<br/>' : ''}
          Acheteur enregistré REVEX
        </div>
      </div>
    </div>

    <div class="section-title">Article 2 — Objet du Contrat</div>
    <div class="objet">
      <div class="objet-row"><span class="objet-label">Désignation</span><span class="objet-value">${(productTitle||'—').substring(0,50)}</span></div>
      <div class="objet-row"><span class="objet-label">Référence</span><span class="objet-value" style="font-family:Consolas,monospace">${reference||'—'}</span></div>
      <div class="objet-row"><span class="objet-label">Grade certifié REVEX</span><span class="objet-value">Grade ${grade||'—'}</span></div>
      <div class="objet-row"><span class="objet-label">Quantité</span><span class="objet-value">${quantity||1} ${unit||'u.'}</span></div>
      <div class="objet-row"><span class="objet-label">Prix unitaire HT</span><span class="objet-value">${up} MAD</span></div>
      <div class="objet-row"><span class="objet-label">Frais de livraison</span><span class="objet-value">${dp} MAD${deliveryType==='eco'?' (Retour à vide REVEX)':' (Urgente)'}</span></div>
      <div class="objet-row" style="margin-top:4px;padding-top:8px"><span class="objet-label">💰 Total TTC</span><span class="objet-value" style="font-size:14px;color:#1E3D0F">${Number(total).toLocaleString('fr-MA')} MAD</span></div>
    </div>

    <div class="section-title">Article 3 — Conditions de Paiement</div>
    <div class="article">
      <p>Le paiement est sécurisé par le mécanisme d'<strong>escrow REVEX</strong>. La somme de <strong>${tp} MAD</strong> est bloquée en séquestre dès la confirmation de commande par la plateforme Roamers Community SARL (REVEX). Les fonds seront libérés au Vendeur uniquement après confirmation de réception conforme par l'Acheteur, dans un délai maximum de 72 heures suivant la livraison. En cas de non-confirmation dans ce délai, les fonds sont libérés automatiquement sauf litige déclaré.</p>
    </div>

    <div class="section-title">Article 4 — Livraison</div>
    <div class="article">
      <p>La livraison est effectuée par ${deliveryType==='eco'?'un transporteur retour à vide partenaire REVEX (livraison éco-responsable, délai 48-96h)':'service de livraison urgente (délai 24-48h)'}. Le Vendeur s'engage à expédier la marchandise dans les <strong>48 heures</strong> suivant la confirmation de commande. Le transfert de risques intervient à la prise en charge par le transporteur. Les frais de livraison de <strong>${dp} MAD</strong> sont à la charge de l'Acheteur, inclus dans le prix total.</p>
    </div>

    <div class="section-title">Article 5 — Garanties et Conformité</div>
    <div class="article">
      <p>La pièce de rechange vendue a été certifiée <strong>Grade ${grade||'A'}</strong> par le processus de contrôle qualité REVEX en 16 étapes. Le Vendeur garantit la conformité de la pièce à la description et au grade certifié. L'Acheteur dispose d'un délai de <strong>72 heures</strong> après réception pour signaler toute non-conformité via la plateforme REVEX. Tout litige est traité par l'arbitrage REVEX dans un délai de 5 à 7 jours ouvrables.</p>
    </div>

    <div class="section-title">Article 6 — Propriété et Traçabilité</div>
    <div class="article">
      <p>La propriété de la marchandise est transférée à l'Acheteur après libération de l'escrow et confirmation de paiement au Vendeur. Un <strong>certificat digital de traçabilité</strong> portant un QR code unique est émis par REVEX à la clôture de la transaction. Ce certificat est légalement opposable et doit être conservé pendant une durée minimale de <strong>5 ans</strong> conformément à la prescription commerciale marocaine (Code de Commerce, article 5).</p>
    </div>

    <div class="section-title">Article 7 — Droit Applicable</div>
    <div class="article">
      <p>Le présent contrat est soumis au droit marocain. Tout litige non résolu par l'arbitrage REVEX sera porté devant les tribunaux compétents de <strong>Casablanca, Maroc</strong>. Les parties reconnaissent la validité juridique du présent contrat électronique conformément à la <strong>Loi 53-05</strong> relative à l'échange électronique de données juridiques.</p>
    </div>

    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-role">Pour le Vendeur</div>
        <div class="sig-name">${sellerCompany||'—'}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature et cachet</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">Pour l'Acheteur</div>
        <div class="sig-name">${buyerCompany||'—'}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature et cachet</div>
      </div>
    </div>
    <p style="font-size:9px;color:#8C8C7A;font-family:Calibri,sans-serif;margin-top:12px;text-align:center">
      Contrat généré automatiquement par REVEX — Plateforme certifiée · Roamers Community SARL · Casablanca, Maroc<br/>
      Conformément à la Loi 53-05 sur l'échange électronique de données juridiques
    </p>
  </div>

  <div class="cftr">
    <div class="cftr-t">Contrat ${contratNum} · REVEX · revex.ma · Conservation 5 ans obligatoire</div>
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
