/**
 * links.js — DNR-MOWT 8-Planet Solar Architecture & GIS Enterprise Link Registry
 * 
 * Architectural Core:
 *   ☀️ THE SUN = Road Management System (RMS) — Central LRS Gravitational Hub
 *   🪐 THE 8 PLANETS = Subsystem Modules Revolving around RMS Core:
 *      1. PMS (Pavement Management System)
 *      2. TIS (Traffic Information System)
 *      3. BMS (Bridge Management System - UGNBMS)
 *      4. Socio-Economic Development (NDPIV)
 *      5. Budgets & Maintenance Interventions (LCCA)
 *      6. Geospatial Remote Sensing & LiDAR
 *      7. Global Case Studies & Asset Benchmarks (PIARC / World Bank)
 *      8. Projects & Public Investment Management System (PIMS)
 */

export const ENTERPRISE_GIS_PORTAL_URL = 'https://networkengineringmowt-ai.github.io/uganda_gis_enterprise/'

export const SOLAR_SYSTEM_ARCHITECTURE = {
  sunCore: {
    symbol: '☀️',
    name: 'Road Management System (RMS)',
    role: 'Central Gravitational Hub & Location Referencing System (LRS)',
    description: 'Master Repository of 21,000 km Classified Network Topology, Link-Node Chainages, & Asset Register. All 8 subsystem modules revolve around RMS.',
    networkCoverageKm: 21000,
    totalDigitizedLinks: 1022,
    manualReference: 'DNR-MOWT RMS User Manual 2017'
  },
  orbitingPlanets: [
    {
      symbol: '🪐',
      code: 'PMS',
      name: 'Pavement Management System (PMS)',
      focus: 'PyTorch CNN Defect Model (15.12M images), PCI/IRI Decay, HDM-4 LCCA',
      metric: '99.85% Accuracy | VCI 86.8% (Primary Metric) | PCI 86.2 | IRI 2.71 m/km',
      manualReference: 'DNR-MOWT PMS User Manual 2017 & Visual Inspection Manual 2012'
    },
    {
      symbol: '🚦',
      code: 'TIS',
      name: 'Traffic Information System (TIS)',
      focus: 'Automated Traffic Counters (ATC), Axle Load Spectra & WIM Weighbridges',
      metric: '99.1% WIM Compliance | 8 High-Speed Stations'
    },
    {
      symbol: '🌉',
      code: 'BMS',
      name: 'Bridge Management System (BMS - UGNBMS)',
      focus: 'Major Culverts, River Crossings & Nile Cable-Stayed Bridges',
      metric: '96.2% Structural Safety | 450 Inspected Structures'
    },
    {
      symbol: '🌾',
      code: 'SOCIO-ECON',
      name: 'Socio-Economic Development (NDPIV)',
      focus: '135 District Feeder Networks (15,000 km), Agricultural Trade Corridors',
      metric: '18.4% EIRR | 135 Districts Connected'
    },
    {
      symbol: '💰',
      code: 'BUDGETS-LCCA',
      name: 'Budgets & Maintenance Interventions',
      focus: 'Multi-Year Forward Programs (MYFP), Replacement Asset Valuation',
      metric: '$3.09 Billion USD Asset Value (~11.43 Trillion UGX)'
    },
    {
      symbol: '🛰️',
      code: 'GEOSPATIAL',
      name: 'Geospatial Remote Sensing & LiDAR',
      focus: '4,800 km² Drone LiDAR (0.05m DEM), InSAR Radar Deformation',
      metric: '0.05m DEM | 0.12 mm/yr Stability'
    },
    {
      symbol: '🌍',
      code: 'GLOBAL-CASE-STUDIES',
      name: 'Global Case Studies & Benchmarks',
      focus: 'PIARC World Road Association, World Bank RMI, AASHTO, Climate Resilient Pavements (NZ, UK, SA, Japan)',
      metric: 'PIARC / WB RMI Benchmarked'
    },
    {
      symbol: '🏗️',
      code: 'PIMS-PROJECTS',
      name: 'Projects & Public Investment Management (PIMS)',
      focus: 'NDPIV Capital Project Pipeline, PIMS Gatekeeper Clearance, Donor Corridors (WB, AfDB, JICA)',
      metric: 'PIMS Gatekeeper Cleared'
    }
  ]
}

export function getBotCrossingLinks() {
  return {
    enterprisePortal: ENTERPRISE_GIS_PORTAL_URL,
    resultEngineDashboard: './result_engine.html',
    mindscapeDashboard: './prisca_mindscape.html',
    linkPredictionsJson: './uganda_link_level_predictions.json',
    gisTabsDataJson: './gis_enterprise_tabs_data.json',
    solarDiagramHtml: './solar_architecture_diagram.html'
  }
}

export const BOT_CROSSING_OUTPUTS = getBotCrossingLinks()

export function exportBotCrossingReport(format = 'json') {
  if (format === 'csv') {
    const headers = ['Symbol', 'Code', 'SystemName', 'FocusArea', 'KeyMetric']
    const sunRow = [SOLAR_SYSTEM_ARCHITECTURE.sunCore.symbol, 'RMS-SUN', `"${SOLAR_SYSTEM_ARCHITECTURE.sunCore.name}"`, `"${SOLAR_SYSTEM_ARCHITECTURE.sunCore.role}"`, `"${SOLAR_SYSTEM_ARCHITECTURE.sunCore.networkCoverageKm} km"`].join(',')
    const planetRows = SOLAR_SYSTEM_ARCHITECTURE.orbitingPlanets.map(p => [
      p.symbol, p.code, `"${p.name}"`, `"${p.focus}"`, `"${p.metric}"`
    ].join(','))
    return [headers.join(','), sunRow, ...planetRows].join('\n')
  }
  return JSON.stringify(SOLAR_SYSTEM_ARCHITECTURE, null, 2)
}

export function renderBotCrossingLinksCardHTML() {
  const sun = SOLAR_SYSTEM_ARCHITECTURE.sunCore
  return `
    <div class="bot-crossing-links-card" style="padding:14px;background:rgba(15,23,42,0.92);border:1px solid rgba(56,189,248,0.35);border-radius:14px;color:#f8fafc;font-family:sans-serif;font-size:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-weight:bold;color:#fbbf24;font-size:13.5px;display:flex;align-items:center;gap:6px;">
          ${sun.symbol} ${sun.name} (SUN CORE)
        </span>
        <span style="padding:3px 10px;border-radius:9999px;background:rgba(251,191,36,0.2);color:#fbbf24;font-size:10px;font-weight:bold;font-family:monospace;">
          8 PLANETS INTERLINKED
        </span>
      </div>

      <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);margin-bottom:10px;font-family:monospace;font-size:11px;">
        <div style="color:#38bdf8;font-weight:bold;">${sun.networkCoverageKm.toLocaleString()} km Classified Network Topology</div>
        <div style="color:#94a3b8;font-size:10px;margin-top:2px;">Master Link-Node Chainages & DNR-MOWT Asset Register</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:monospace;font-size:10px;margin-bottom:12px;">
        <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
          <div style="color:#34d399;font-weight:bold;">🪐 PMS Planet</div>
          <div style="color:#94a3b8;font-size:9px;">VCI 86.8% | 99.85% PyTorch CNN</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
          <div style="color:#fbbf24;font-weight:bold;">🚦 TIS Planet</div>
          <div style="color:#94a3b8;font-size:9px;">99.1% WIM Compliance</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
          <div style="color:#60a5fa;font-weight:bold;">🌉 BMS Planet</div>
          <div style="color:#94a3b8;font-size:9px;">96.2% Safety Score</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
          <div style="color:#c084fc;font-weight:bold;">🌍 Global Case Studies</div>
          <div style="color:#94a3b8;font-size:9px;">PIARC / WB Benchmarks</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
          <div style="color:#f472b6;font-weight:bold;">🏗️ PIMS Projects</div>
          <div style="color:#94a3b8;font-size:9px;">NDPIV Capital Pipeline</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
          <div style="color:#2dd4bf;font-weight:bold;">🛰️ LiDAR Planet</div>
          <div style="color:#94a3b8;font-size:9px;">0.05m DEM Elevation</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <a href="${ENTERPRISE_GIS_PORTAL_URL}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;background:linear-gradient(90deg,#0284c7,#2563eb);color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:11px;box-shadow:0 4px 14px rgba(2,132,199,0.4);">
          🌐 Launch Enterprise GIS Portal ↗
        </a>
      </div>
    </div>
  `
}
