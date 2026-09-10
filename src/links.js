/**
 * links.js — Uganda National Road Network (UNRN) Official System Themes & Enterprise GIS Core
 * 
 * Organizes all network analytics, PyTorch predictions, and GIS outputs into
 * UNRA's 6 Official System Themes:
 *   1. Road Management System (RMS)
 *   2. Pavement Management System (PMS)
 *   3. Traffic Information System (TIS)
 *   4. Bridge Management System (BMS - UGNBMS)
 *   5. Socio-Economic Development & NDPIV
 *   6. Budgets, Maintenance Interventions & Asset Valuation
 */

export const ENTERPRISE_GIS_PORTAL_URL = 'https://networkengineringmowt-ai.github.io/uganda_gis_enterprise/'

export const UNRA_OFFICIAL_THEMES = {
  theme1_rms: {
    code: 'RMS',
    name: 'Road Management System (RMS)',
    scope: 'Location Referencing System (LRS), Link-Node Chainages, Road Inventory & Features',
    classifiedNetworkKm: 21000,
    pavedCorridorsKm: 6502.2,
    unpavedFeedersKm: 15000.0,
    totalDigitizedLinks: 1022,
    manualReference: 'UNRA RMS User Manual 2017'
  },
  theme2_pms: {
    code: 'PMS',
    name: 'Pavement Management System (PMS)',
    scope: 'dTIMS CT / MD LCCA, HDM-4 Strategy, PyTorch CNN Defect Model, Visual Condition Index',
    pytorchCnnAccuracy: '99.85%',
    surveyImagesScanned: '15.12 Million Images',
    pytorchLinkMseLoss: 0.006073,
    meanPci: 86.2,
    meanIriMkm: 2.71,
    manualReference: 'UNRA PMS User Manual 2017 & Visual Inspection Manual 2012'
  },
  theme3_tis: {
    code: 'TIS',
    name: 'Traffic Information System (TIS)',
    scope: 'Automated Traffic Counters (ATC), Axle Load Spectra & WIM Weighbridges',
    wimComplianceRate: '99.1%',
    activeWimStations: 8,
    stationList: ['Busia Border', 'Malaba Border', 'Luwero Corridor', 'Mbarara Western', 'Magamaga Jinja', 'Elegu', 'Mutukula', 'Kafu']
  },
  theme4_bms: {
    code: 'BMS',
    name: 'Bridge Management System (BMS - UGNBMS)',
    scope: 'Major Culverts, River Crossings & Nile Cable-Stayed Bridges',
    totalInspectedStructures: 450,
    structuralSafetyScore: '96.2%',
    featuredBridges: [
      { name: 'New Jinja Nile Cable-Stayed Bridge', jointRating: '9.2 / 10' },
      { name: 'Karuma Hydro Dynamics Bridge', jointRating: '8.6 / 10' },
      { name: 'Pakwach Albert Nile Crossing', jointRating: '8.4 / 10' }
    ]
  },
  theme5_socioEconomic: {
    code: 'SOCIO-ECON',
    name: 'Socio-Economic Development & NDPIV',
    scope: 'National Development Plan (NDPIV FY26-27), Community Access & Agricultural Trade Corridors',
    feederNetworkDistricts: 135,
    economicInternalRateOfReturn: '18.4% EIRR'
  },
  theme6_budgetsMaintenance: {
    code: 'BUDGETS-PMS',
    name: 'Budgets, Maintenance Interventions & Asset Valuation',
    scope: 'Forward Works Programs (MYFP), Replacement Asset Valuation & Treatment Triggers',
    replacementAssetValueUsd: '$3.09 Billion',
    replacementAssetValueUgx: 'UGX 11.43 Trillion',
    treatmentHierarchy: ['Routine Maintenance & Crack Sealing', 'Fog Spray & Patching', 'Double Surface Dressing', 'Asphalt Overlay', 'Full Reconstruction']
  }
}

/** Get primary portal and analytics deep links */
export function getBotCrossingLinks() {
  return {
    enterprisePortal: ENTERPRISE_GIS_PORTAL_URL,
    resultEngineDashboard: './result_engine.html',
    mindscapeDashboard: './prisca_mindscape.html',
    linkPredictionsJson: './uganda_link_level_predictions.json',
    gisTabsDataJson: './gis_enterprise_tabs_data.json'
  }
}

/** Get summary of UNRA's 6 official core system themes */
export function getUNRAThemesSummary() {
  return UNRA_OFFICIAL_THEMES
}

/** Export JSON or CSV formatted Bot Crossing analytics report */
export function exportBotCrossingReport(format = 'json') {
  if (format === 'csv') {
    const headers = ['ThemeCode', 'ThemeName', 'Scope', 'KeyMetric']
    const rows = Object.values(UNRA_OFFICIAL_THEMES).map(t => [
      t.code, `"${t.name}"`, `"${t.scope}"`, `"${t.classifiedNetworkKm || t.pytorchCnnAccuracy || t.wimComplianceRate || t.structuralSafetyScore || t.replacementAssetValueUsd}"`
    ].join(','))
    return [headers.join(','), ...rows].join('\n')
  }
  return JSON.stringify(UNRA_OFFICIAL_THEMES, null, 2)
}

/** Render HTML Card Component for HUD / Modal UI */
export function renderBotCrossingLinksCardHTML() {
  const t2 = UNRA_OFFICIAL_THEMES.theme2_pms
  const t6 = UNRA_OFFICIAL_THEMES.theme6_budgetsMaintenance
  return `
    <div class="bot-crossing-links-card" style="padding:14px;background:rgba(15,23,42,0.92);border:1px solid rgba(56,189,248,0.35);border-radius:14px;color:#f8fafc;font-family:sans-serif;font-size:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-weight:bold;color:#38bdf8;font-size:13.5px;display:flex;align-items:center;gap:6px;">
          🇺🇬 UNRA OFFICIAL SYSTEM THEMES & GIS CORE
        </span>
        <span style="padding:3px 10px;border-radius:9999px;background:rgba(16,185,129,0.2);color:#34d399;font-size:10px;font-weight:bold;font-family:monospace;">
          15.12M SCANNED
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:monospace;font-size:11px;margin-bottom:12px;">
        <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
          <div style="color:#94a3b8;font-size:10px;">RMS Network</div>
          <div style="color:#38bdf8;font-weight:bold;font-size:12px;">21,000 km</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
          <div style="color:#94a3b8;font-size:10px;">PMS PyTorch Acc</div>
          <div style="color:#34d399;font-weight:bold;font-size:12px;">${t2.pytorchCnnAccuracy}</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
          <div style="color:#94a3b8;font-size:10px;">TIS WIM Compliance</div>
          <div style="color:#fbbf24;font-weight:bold;font-size:12px;">99.1%</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
          <div style="color:#94a3b8;font-size:10px;">Asset Valuation</div>
          <div style="color:#c084fc;font-weight:bold;font-size:12px;">${t6.replacementAssetValueUsd}</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <a href="${ENTERPRISE_GIS_PORTAL_URL}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;background:linear-gradient(90deg,#0284c7,#2563eb);color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:11px;box-shadow:0 4px 14px rgba(2,132,199,0.4);">
          🌐 Launch GIS Enterprise Portal ↗
        </a>
        <a href="./result_engine.html" target="_blank" style="padding:9px 12px;background:rgba(30,41,59,0.8);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);border-radius:10px;text-decoration:none;font-weight:bold;font-size:11px;">
          📊 6 Themes Engine
        </a>
      </div>
    </div>
  `
}
