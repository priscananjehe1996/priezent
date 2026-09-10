-- ==============================================================================
-- UGANDA NATIONAL ROAD NETWORK - ENTERPRISE SPATIAL SQL DATABASE DDL SCHEMA
-- Governing Body: Department of National Roads — Ministry of Works and Transport (DNR-MOWT)
-- Network Extent: 21,169.0 km Across 1,015 Link Sections & 15.12M Georeferenced Survey Images
-- Primary Condition Metric: Visual Condition Index (VCI %)
-- Standards: PostGIS 3.x / SpatiaLite 5.x OpenGIS OGC Standards (EPSG:4326 WGS84)
-- ==============================================================================

-- Enable Spatial Extensions (PostGIS or SpatiaLite load_extension)
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- ------------------------------------------------------------------------------
-- 1. TABLE: georeferenced_images
-- Stores 15.12M georeferenced road survey camera frames with GPS spatial points,
-- camera telemetry, LCMS 3D pavement defect classes, PyTorch confidence, and VCI ratings.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS georeferenced_images (
    image_id TEXT PRIMARY KEY,
    link_id TEXT NOT NULL,
    road_no TEXT NOT NULL,
    chainage_km REAL NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation_m REAL DEFAULT 1150.0,
    heading_deg REAL DEFAULT 0.0,
    camera_type TEXT DEFAULT 'LCMS-3D Stereo Vision',
    vci_score REAL NOT NULL,
    vci_rating_class TEXT NOT NULL,
    detected_defect_class TEXT NOT NULL,
    severity_level TEXT DEFAULT 'Moderate',
    confidence_score REAL NOT NULL,
    image_filename TEXT NOT NULL,
    survey_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(Point, 4326),
    FOREIGN KEY (link_id) REFERENCES road_links(link_id) ON DELETE CASCADE
);

-- Spatial R-Tree Index for Sub-Millisecond Bounding Box Spatial Queries (ST_DWithin, ST_Intersects)
CREATE INDEX IF NOT EXISTS idx_georeferenced_images_geom ON georeferenced_images USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_georeferenced_images_link_id ON georeferenced_images(link_id);
CREATE INDEX IF NOT EXISTS idx_georeferenced_images_vci ON georeferenced_images(vci_score);
CREATE INDEX IF NOT EXISTS idx_georeferenced_images_defect ON georeferenced_images(detected_defect_class);

-- ------------------------------------------------------------------------------
-- 2. TABLE: road_links
-- Stores 1,015 Uganda National Road Network links with LineString vector geometry,
-- Visual Condition Index (VCI %), HDM-4 budget allocations, and pavement degradation parameters.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS road_links (
    link_id TEXT PRIMARY KEY,
    road_no TEXT NOT NULL,
    road_class TEXT NOT NULL,
    link_name TEXT NOT NULL,
    length_km REAL NOT NULL,
    surface_type TEXT NOT NULL,
    region TEXT NOT NULL,
    station TEXT NOT NULL,
    vci_percent REAL NOT NULL,
    vci_rating_class TEXT NOT NULL,
    predicted_pci REAL NOT NULL,
    predicted_iri REAL NOT NULL,
    remaining_life_years REAL NOT NULL,
    dnr_mowt_recommended_treatment TEXT NOT NULL,
    replacement_asset_val_usd REAL NOT NULL,
    hdm4_annual_maintenance_budget_usd REAL NOT NULL,
    survey_date DATE DEFAULT '2026-03-31',
    geom GEOMETRY(LineString, 4326)
);

-- Spatial Index on Road Links LineStrings
CREATE INDEX IF NOT EXISTS idx_road_links_geom ON road_links USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_road_links_vci ON road_links(vci_percent);
CREATE INDEX IF NOT EXISTS idx_road_links_region ON road_links(region);
CREATE INDEX IF NOT EXISTS idx_road_links_station ON road_links(station);

-- ------------------------------------------------------------------------------
-- 3. TABLE: weighbridge_stations
-- Stores regional weighbridge telemetry, vehicle axle overloading rates, and compliance enforcement.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weighbridge_stations (
    station_id TEXT PRIMARY KEY,
    station_name TEXT NOT NULL,
    road_no TEXT NOT NULL,
    region TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    overloading_rate_pct REAL NOT NULL,
    daily_truck_volume INTEGER NOT NULL,
    enforcement_status TEXT NOT NULL,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_weighbridges_geom ON weighbridge_stations USING GIST (geom);

-- ------------------------------------------------------------------------------
-- 4. TABLE: bridge_structures
-- Stores key bridge structures across the Uganda network (e.g. Source of the Nile Bridge).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bridge_structures (
    bridge_id TEXT PRIMARY KEY,
    bridge_name TEXT NOT NULL,
    road_no TEXT NOT NULL,
    river_crossing TEXT NOT NULL,
    span_length_m REAL NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    structural_health_pct REAL NOT NULL,
    inspection_rating TEXT NOT NULL,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_bridges_geom ON bridge_structures USING GIST (geom);

-- ------------------------------------------------------------------------------
-- 5. SPATIAL VIEWS & SUMMARY ANALYTICS
-- ------------------------------------------------------------------------------

-- View: Network Summary by Visual Condition Index (VCI) Rating Band
CREATE VIEW IF NOT EXISTS view_vci_condition_summary AS
SELECT 
    vci_rating_class,
    COUNT(*) AS total_links,
    ROUND(SUM(length_km), 2) AS total_length_km,
    ROUND(AVG(vci_percent), 2) AS mean_vci_percent,
    ROUND(SUM(replacement_asset_val_usd), 2) AS total_asset_value_usd,
    ROUND(SUM(hdm4_annual_maintenance_budget_usd), 2) AS total_hdm4_budget_usd
FROM road_links
GROUP BY vci_rating_class
ORDER BY mean_vci_percent DESC;

-- View: High-Priority Pavement Defect Hotspots (VCI < 50% or High Defect Density)
CREATE VIEW IF NOT EXISTS view_critical_defect_hotspots AS
SELECT 
    img.image_id,
    img.link_id,
    lnk.link_name,
    lnk.road_no,
    lnk.region,
    img.chainage_km,
    img.latitude,
    img.longitude,
    img.vci_score,
    img.detected_defect_class,
    img.confidence_score,
    lnk.dnr_mowt_recommended_treatment
FROM georeferenced_images img
JOIN road_links lnk ON img.link_id = lnk.link_id
WHERE img.vci_score < 60.0 OR img.detected_defect_class IN ('Severe Fatigue Alligator Cracking', 'Deep Pothole (>50mm)', 'Rutting Depth (>25mm)')
ORDER BY img.vci_score ASC;
