import React from 'react';

export function NHSFooter() {
  return (
    <footer className="nhs-footer">
      <div className="nhs-footer__inner">
        <div className="nhs-footer__disclaimer">
          <strong>Clinical Disclaimer:</strong> This tool is a research prototype for
          decision-support only. It must not be used as the sole basis for any clinical
          decision. Predictions are based on historical NHS PROMs data (2016–2019) and may
          not reflect current patient populations. Always exercise professional clinical
          judgement.
        </div>
        <div className="nhs-footer__links">
          <span>NHS England PROMs Programme</span>
          <span>|</span>
          <span>EAISI Academy Group Project</span>
          <span>|</span>
          <span>Data: 2016/17 – 2018/19</span>
          <span>|</span>
          <span>Knee Replacement</span>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)' }}>
          <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Team The Commodores:</strong>{' '}
          Bart Appels &middot; Yvonne Kuijt &middot; Audrius Saras &middot; Jos Schaffers
        </div>
        <p className="nhs-footer__copy">
          &copy; {new Date().getFullYear()} EAISI Academy. Research use only.
          Model accuracy may vary across patient populations.
        </p>
      </div>
    </footer>
  );
}
