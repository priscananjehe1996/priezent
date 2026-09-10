import * as THREE from 'three'
import { atlasTexture, hasPart, part } from './kit.js'

/**
 * The three worlds you can put the colony on, and the terrain generator that draws them.
 *
 * A planet is nothing but a bag of colours and a couple of switches — terrain, scatter, sky
 * and lighting all read from the same preset, so adding a fourth world is a data change
 * rather than a code change.
 */

export const PLANETS = {
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    blurb: 'Scorched iron plains, intense solar glare, razor-sharp shadows.',
    gravity: 0.38,
    gravityLabel: '0.38g (Solar Thermal Glare)',
    bulkOfWork: 'High (Weighbridge & Axle Load Control)',
    workloadScore: 780,
    sizeScale: 1.6,
    suitTrim: 0xff6600,
    ground: { low: 0x2a2826, high: 0x6e6862, tint: 0x9c948a },
    rock: 0x4a443e,
    horizon: 0x1f140e,
    sky: { top: 0x080402, bottom: 0x261408 },
    fog: { color: 0x0d0805, near: 150, far: 1800 },
    sun: { color: 0xffe0b0, intensity: 3.5, night: 0.03 },
    ambient: { sky: 0x5a4838, ground: 0x3a2818, intensity: 0.8 },
    atmosphere: 0,
    craters: 32,
    roughness: 1.2,
    scatter: 'rocks',
    companion: { name: 'Sun Core', color: 0xffd060, size: 9.0, glow: 0xffa020 },
    dust: 0.1,
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    blurb: 'Golden sulfuric haze, volcanic basalt, crushing density.',
    gravity: 0.90,
    gravityLabel: '0.90g (Heavy Sulfuric Pressure)',
    bulkOfWork: 'High (MOWT Standards & Manuals)',
    workloadScore: 820,
    sizeScale: 1.75,
    suitTrim: 0xeab308,
    ground: { low: 0x593010, high: 0xaa6620, tint: 0xd49438 },
    rock: 0x774015,
    horizon: 0x50300a,
    sky: { top: 0x3a2005, bottom: 0xe8a030 },
    fog: { color: 0x603c0c, near: 120, far: 1700 },
    sun: { color: 0xffc860, intensity: 2.0, night: 0.15 },
    ambient: { sky: 0xd08c28, ground: 0x502808, intensity: 0.85 },
    atmosphere: 0.9,
    craters: 8,
    roughness: 1.0,
    scatter: 'rocks',
    companion: { name: 'Acid Clouds', color: 0xedd080, size: 4.5, glow: 0xffea90 },
    dust: 0.8,
  },
  terra: {
    id: 'terra',
    name: 'Terra (Earth)',
    blurb: 'Lush green biomes, blue oceans, vibrant atmosphere.',
    gravity: 1.00,
    gravityLabel: '1.00g (Earth Standard)',
    bulkOfWork: 'Massive (21,000 km Classified Network Master)',
    workloadScore: 980,
    sizeScale: 2.4,
    suitTrim: 0x10b981,
    ground: { low: 0x2f5a34, high: 0x6d9a4a, tint: 0x86ae5c },
    rock: 0x6b6f63,
    horizon: 0x6fa8d8,
    sky: { top: 0x1d4d8f, bottom: 0x9ec8e8 },
    fog: { color: 0x6b8fa8, near: 180, far: 2200 },
    sun: { color: 0xfff0d4, intensity: 2.4, night: 0.13 },
    ambient: { sky: 0x88bfe8, ground: 0x3f5a30, intensity: 0.95 },
    atmosphere: 1,
    craters: 0,
    roughness: 0.75,
    scatter: 'flora',
    companion: { name: 'Luna', color: 0xdcd8cc, size: 3.2, glow: 0xfff6e0 },
    dust: 0.25,
  },
  moon: {
    id: 'moon',
    name: 'Luna (Moon)',
    blurb: 'Airless, high contrast regolith, stark shadows.',
    gravity: 0.165,
    gravityLabel: '0.165g (Lunar Leaps & Low Gravity)',
    bulkOfWork: 'Extreme (Road Condition & LCMS 3D Laser Scans)',
    workloadScore: 940,
    sizeScale: 2.2,
    suitTrim: 0x38bdf8,
    ground: { low: 0x4a4a52, high: 0x8f8d90, tint: 0xb9b4ae },
    rock: 0x6d6a70,
    horizon: 0x14141c,
    sky: { top: 0x05060c, bottom: 0x101018 },
    fog: { color: 0x07080e, near: 180, far: 2200 },
    sun: { color: 0xfff4e2, intensity: 2.6, night: 0.05 },
    ambient: { sky: 0x3a4258, ground: 0x4a423a, intensity: 0.7 },
    atmosphere: 0,
    craters: 26,
    roughness: 0.9,
    scatter: 'rocks',
    companion: { name: 'Earth', color: 0x4a7fc9, size: 5.4, glow: 0x6ea8ff },
    dust: 0,
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    blurb: 'Rust red dunes, Phobos companion, howling dust.',
    gravity: 0.38,
    gravityLabel: '0.38g (Martian Dune Float)',
    bulkOfWork: 'High (Traffic Volumetrics & ATC Counts)',
    workloadScore: 860,
    sizeScale: 1.9,
    suitTrim: 0xef4444,
    ground: { low: 0x6b3320, high: 0xb56b40, tint: 0xd89464 },
    rock: 0x8a4a2c,
    horizon: 0x3a2118,
    sky: { top: 0x2b1a1e, bottom: 0xc4703c },
    fog: { color: 0x50301f, near: 150, far: 1900 },
    sun: { color: 0xffd9b0, intensity: 2.2, night: 0.09 },
    ambient: { sky: 0xc07a52, ground: 0x4a2418, intensity: 0.75 },
    atmosphere: 0.55,
    craters: 12,
    roughness: 1.15,
    scatter: 'rocks',
    companion: { name: 'Phobos', color: 0x9a8878, size: 1.5, glow: 0xb8a494 },
    dust: 1,
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter (Europa)',
    blurb: 'Ice crust above subsurface ocean, towering Jovian gas giant sky.',
    gravity: 0.134,
    gravityLabel: '0.134g (Jovian Ice Float)',
    bulkOfWork: 'Massive (UGNBMS National Bridge Management)',
    workloadScore: 920,
    sizeScale: 2.1,
    suitTrim: 0x06b6d4,
    ground: { low: 0x384a5c, high: 0x7ca4c0, tint: 0xa8d0e8 },
    rock: 0x4d667d,
    horizon: 0x20354a,
    sky: { top: 0x0a1624, bottom: 0x386088 },
    fog: { color: 0x16283d, near: 160, far: 1900 },
    sun: { color: 0x88c0ff, intensity: 1.8, night: 0.1 },
    ambient: { sky: 0x4078a8, ground: 0x203850, intensity: 0.8 },
    atmosphere: 0.4,
    craters: 16,
    roughness: 0.6,
    scatter: 'rocks',
    companion: { name: 'Jupiter Giant', color: 0xc89860, size: 8.5, glow: 0xe0b080 },
    dust: 0.2,
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn (Titan)',
    blurb: 'Golden methane seas, orange smog, magnificent planetary rings.',
    gravity: 0.14,
    gravityLabel: '0.14g (Methane Haze Float)',
    bulkOfWork: 'Massive (GIS Shapefiles & Cartography)',
    workloadScore: 900,
    sizeScale: 2.0,
    suitTrim: 0xf59e0b,
    ground: { low: 0x5a4820, high: 0xaa8e40, tint: 0xd8bf68 },
    rock: 0x786430,
    horizon: 0x403010,
    sky: { top: 0x281c08, bottom: 0xc49c38 },
    fog: { color: 0x4a3814, near: 120, far: 2000 },
    sun: { color: 0xffd880, intensity: 1.6, night: 0.12 },
    ambient: { sky: 0xb89030, ground: 0x483410, intensity: 0.85 },
    atmosphere: 0.8,
    craters: 6,
    roughness: 0.7,
    scatter: 'rocks',
    companion: { name: 'Saturn Rings', color: 0xe8d090, size: 9.2, glow: 0xffeaad },
    dust: 0.5,
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus (Titania)',
    blurb: 'Pale aquamarine ice cliffs, deep void, faint silver rings.',
    gravity: 0.89,
    gravityLabel: '0.89g (Aquamarine Ice Physics)',
    bulkOfWork: 'High (NTIS Transport Information System)',
    workloadScore: 840,
    sizeScale: 1.8,
    suitTrim: 0x14b8a6,
    ground: { low: 0x20484a, high: 0x488a8c, tint: 0x70c0c2 },
    rock: 0x306062,
    horizon: 0x103032,
    sky: { top: 0x051416, bottom: 0x206064 },
    fog: { color: 0x0d282a, near: 170, far: 2100 },
    sun: { color: 0x80e8ff, intensity: 1.4, night: 0.06 },
    ambient: { sky: 0x30888c, ground: 0x184042, intensity: 0.7 },
    atmosphere: 0.3,
    craters: 20,
    roughness: 0.8,
    scatter: 'rocks',
    companion: { name: 'Uranus Orb', color: 0x50e0e4, size: 6.8, glow: 0x80ffff },
    dust: 0.1,
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune (Triton)',
    blurb: 'Deep cobalt methane ice, cryovolcanoes, Triton moon sky.',
    gravity: 1.12,
    gravityLabel: '1.12g (High Methane Density)',
    bulkOfWork: 'High (Inland Waterways & Ferries)',
    workloadScore: 810,
    sizeScale: 1.7,
    suitTrim: 0x6366f1,
    ground: { low: 0x142050, high: 0x2c4898, tint: 0x5078d8 },
    rock: 0x203470,
    horizon: 0x0c1438,
    sky: { top: 0x04081c, bottom: 0x182c68 },
    fog: { color: 0x0a1230, near: 160, far: 2100 },
    sun: { color: 0x70a0ff, intensity: 1.3, night: 0.05 },
    ambient: { sky: 0x2848b0, ground: 0x101a48, intensity: 0.65 },
    atmosphere: 0.35,
    craters: 18,
    roughness: 0.85,
    scatter: 'rocks',
    companion: { name: 'Neptune Giant', color: 0x3860ff, size: 7.2, glow: 0x688cff },
    dust: 0.15,
  },
  pluto: {
    id: 'pluto',
    name: 'Pluto',
    blurb: 'Nitrogen ice glaciers, Charon binary moon, edge of the solar system.',
    gravity: 0.063,
    gravityLabel: '0.063g (Ultra Low Gravity Glacier Float)',
    bulkOfWork: 'High (60m Road Reserve Management)',
    workloadScore: 800,
    sizeScale: 1.65,
    suitTrim: 0xa855f7,
    ground: { low: 0x302830, high: 0x685868, tint: 0x988898 },
    rock: 0x483c48,
    horizon: 0x181018,
    sky: { top: 0x060206, bottom: 0x181018 },
    fog: { color: 0x0e080e, near: 180, far: 2200 },
    sun: { color: 0xd0c0ff, intensity: 1.0, night: 0.02 },
    ambient: { sky: 0x483848, ground: 0x281828, intensity: 0.5 },
    atmosphere: 0.1,
    craters: 28,
    roughness: 1.1,
    scatter: 'rocks',
    companion: { name: 'Charon', color: 0x786878, size: 4.0, glow: 0x988898 },
    dust: 0.05,
  },
}

const GROUND_SIZE = 2400
/** Everything inside this radius is the buildable colony, and is kept nearly flat. */
export const COLONY_RADIUS = 360
const DETAIL_SEGMENTS = { low: 72, medium: 128, high: 190 }

/**
 * Terrain is one plane, displaced and vertex-coloured on the CPU at build time. Doing it
 * once and baking it into the buffer means the GPU only ever sees static geometry — no
 * displacement map sample, no per-frame work — and vertex colours give the surface its
 * mottling for free rather than costing a texture fetch.
 */
export function createTerrain(planet, detail, seed = 1337) {
  const segments = DETAIL_SEGMENTS[detail] || DETAIL_SEGMENTS.medium
  const geo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, segments, segments)
  geo.rotateX(-Math.PI / 2)

  const noise = makeNoise(seed)
  const craters = makeCraters(planet.craters, seed)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)

  const low = new THREE.Color(planet.ground.low)
  const high = new THREE.Color(planet.ground.high)
  const tint = new THREE.Color(planet.ground.tint)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const dist = Math.hypot(x, z)

    // Flat where the colony lives, then hills that ramp in over the next forty metres —
    // so nothing ever builds on a slope but the horizon still has shape to it.
    const outside = THREE.MathUtils.smoothstep(dist, COLONY_RADIUS - 6, COLONY_RADIUS + 40)
    const gentle = fbm(noise, x * 0.035, z * 0.035, 3) * 0.5
    const hills = fbm(noise, x * 0.012, z * 0.012, 4) * 9 + fbm(noise, x * 0.05, z * 0.05, 2) * 1.4
    let y = gentle * planet.roughness * (1 - outside) + hills * outside * planet.roughness

    for (const crater of craters) {
      const d = Math.hypot(x - crater.x, z - crater.z)
      if (d > crater.r * 1.5) continue
      // A bowl with a raised rim — the rim is what makes it read as an impact.
      const t = d / crater.r
      if (t < 1) y -= (1 - t * t) * crater.depth
      else y += (1 - Math.abs(t - 1.22) / 0.28) * crater.depth * 0.32
    }

    pos.setY(i, y)

    // Colour: height-driven blend, mottled with a second noise band so it never bands.
    const shade = THREE.MathUtils.clamp(0.42 + y * 0.09 + fbm(noise, x * 0.09, z * 0.09, 2) * 0.5, 0, 1)
    c.copy(low).lerp(high, shade)
    const speck = fbm(noise, x * 0.55, z * 0.55, 1)
    c.lerp(tint, Math.max(0, speck) * 0.22)
    // Darken the far field hard so the eye settles on the colony and the hills read as a
    // silhouette rather than as more ground competing with the plots for attention.
    c.multiplyScalar(1 - THREE.MathUtils.smoothstep(dist, COLONY_RADIUS * 0.7, GROUND_SIZE * 0.35) * 0.75)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    // Flat-ish shading keeps the low-poly read; a dielectric surface with no spec highlight
    // is what sells "dust" rather than "plastic".
    envMapIntensity: 0.3,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  mesh.name = 'terrain'

  // Sampler so anything placed later can sit exactly on the surface.
  mesh.userData.heightAt = (x, z) => sampleHeight(x, z, noise, craters, planet)
  return mesh
}

function sampleHeight(x, z, noise, craters, planet) {
  const dist = Math.hypot(x, z)
  const outside = THREE.MathUtils.smoothstep(dist, COLONY_RADIUS - 6, COLONY_RADIUS + 40)
  const gentle = fbm(noise, x * 0.035, z * 0.035, 3) * 0.5
  const hills = fbm(noise, x * 0.012, z * 0.012, 4) * 9 + fbm(noise, x * 0.05, z * 0.05, 2) * 1.4
  let y = gentle * planet.roughness * (1 - outside) + hills * outside * planet.roughness
  for (const crater of craters) {
    const d = Math.hypot(x - crater.x, z - crater.z)
    if (d > crater.r * 1.5) continue
    const t = d / crater.r
    if (t < 1) y -= (1 - t * t) * crater.depth
    else y += (1 - Math.abs(t - 1.22) / 0.28) * crater.depth * 0.32
  }
  return y
}

/** Craters only ever land outside the colony, so they never eat a build plot. */
function makeCraters(count, seed) {
  const rand = mulberry(seed ^ 0x9e37)
  const out = []
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const d = COLONY_RADIUS + 14 + rand() * 110
    const r = 4 + rand() * 16
    out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r, depth: r * (0.18 + rand() * 0.16) })
  }
  return out
}

// ── scatter ───────────────────────────────────────────────────────────────────────────

const SCATTER_BUDGET = 900

/**
 * Rocks, boulders and plants. All instanced, all placed with a deterministic RNG so the
 * same planet always looks the same, and all kept clear of the plots and walkways.
 */
/**
 * What grows on a world, and how it is planted.
 *
 * `weight` is how often a shape comes up relative to its siblings, `size` the range of its
 * base scale, and `sink` how far into the ground it settles as a fraction of that scale.
 * A boulder half-buried reads as bedrock; a tree buried by the same amount reads as a
 * mistake, so the two want very different numbers.
 *
 * All of it comes from KayKit's Forest Nature Pack, which is why the same list can dress a
 * meadow and a crater field: its boulders are painted neutral grey, so a per-instance tint
 * takes them to lunar dust or Martian rust without touching the atlas.
 */
const SCATTER = {
  flora: [
    { part: 'Tree_1_A_Color1', weight: 3, size: [0.35, 0.6], sink: 0.02, upright: true },
    { part: 'Tree_3_A_Color1', weight: 3, size: [0.35, 0.6], sink: 0.02, upright: true },
    { part: 'Tree_4_A_Color1', weight: 2, size: [0.3, 0.55], sink: 0.02, upright: true },
    { part: 'Tree_1_C_Color1', weight: 1, size: [0.25, 0.4], sink: 0.02, upright: true },
    { part: 'Tree_3_C_Color1', weight: 1, size: [0.22, 0.38], sink: 0.02, upright: true },
    { part: 'Tree_4_C_Color1', weight: 1, size: [0.2, 0.35], sink: 0.02, upright: true },
    { part: 'Bush_1_E_Color1', weight: 3, size: [0.5, 1.1], sink: 0.06, upright: true },
    { part: 'Bush_3_B_Color1', weight: 3, size: [0.5, 1.1], sink: 0.06, upright: true },
    { part: 'Grass_2_D_Color1', weight: 4, size: [0.6, 1.3], sink: 0.05, upright: true },
    { part: 'Rock_1_D_Color1', weight: 2, size: [0.4, 0.9], sink: 0.3, tint: true },
  ],
  rocks: [
    { part: 'Rock_1_D_Color1', weight: 4, size: [0.5, 1.2], sink: 0.3, tint: true },
    { part: 'Rock_2_C_Color1', weight: 4, size: [0.5, 1.2], sink: 0.3, tint: true },
    { part: 'Rock_3_E_Color1', weight: 3, size: [0.6, 1.4], sink: 0.15, tint: true },
    { part: 'Rock_1_J_Color1', weight: 1, size: [0.3, 0.7], sink: 0.25, tint: true },
    { part: 'Rock_2_G_Color1', weight: 1, size: [0.3, 0.7], sink: 0.25, tint: true },
    { part: 'Rock_3_L_Color1', weight: 2, size: [0.4, 0.9], sink: 0.12, tint: true },
    { part: 'Rock_3_Q_Color1', weight: 1, size: [0.25, 0.55], sink: 0.1, tint: true },
  ],
}

/** The fallback when the kit has not loaded: the primitives this used to be made of. */
function fallbackShapes(isFlora) {
  const shapes = isFlora
    ? [new THREE.IcosahedronGeometry(0.5, 0), new THREE.ConeGeometry(0.42, 1.5, 5), new THREE.SphereGeometry(0.5, 6, 4)]
    : [
        new THREE.DodecahedronGeometry(0.55, 0),
        new THREE.IcosahedronGeometry(0.6, 0),
        new THREE.TetrahedronGeometry(0.72, 0),
      ]
  for (const g of shapes) g.computeVertexNormals()
  return shapes.map((geo) => ({ geo, sink: 0.25, size: [0.28, 0.83], tint: true, upright: false }))
}

export function createScatter(planet, density, keepClear = [], seed = 4242) {
  const group = new THREE.Group()
  group.name = 'scatter'
  const count = Math.round(SCATTER_BUDGET * THREE.MathUtils.clamp(density, 0, 1))
  if (count <= 0) return group

  const rand = mulberry(seed)
  const isFlora = planet.scatter === 'flora'
  const recipe = SCATTER[planet.scatter] || SCATTER.rocks
  const ready = recipe.every((r) => hasPart(r.part, 'forest'))

  const kinds = ready
    ? recipe.map((r) => ({ ...r, geo: part(r.part, 'forest'), weight: r.weight }))
    : fallbackShapes(isFlora).map((r) => ({ ...r, weight: 1 }))

  // One material for the lot. The pack's atlas carries the greens and the greys, and the
  // per-instance colour is a *tint* on top of it — white for anything already the right
  // colour, the planet's own rock for a boulder that has to belong to this world.
  const atlas = ready ? atlasTexture('forest') : null
  const material = new THREE.MeshStandardMaterial({
    map: atlas,
    color: 0xffffff,
    roughness: isFlora ? 0.82 : 0.95,
    metalness: 0,
    flatShading: !ready,
  })

  const total = kinds.reduce((sum, k) => sum + k.weight, 0)
  const meshes = kinds.map((k) =>
    new THREE.InstancedMesh(k.geo, material, Math.ceil((count * k.weight) / total) + 8)
  )

  const rock = new THREE.Color(planet.rock)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const fill = new Array(kinds.length).fill(0)

  // Pick by weight: a cumulative table beats a uniform index when a fir should be rarer
  // than a grass tuft.
  const pickKind = () => {
    let roll = rand() * total
    for (let i = 0; i < kinds.length; i++) {
      roll -= kinds[i].weight
      if (roll <= 0) return i
    }
    return kinds.length - 1
  }

  for (let i = 0; i < count; i++) {
    // Bias outward: a ring is thicker where there is more area, which √ gives for free.
    const a = rand() * Math.PI * 2
    const d = 9 + Math.sqrt(rand()) * 150
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (keepClear.some((p) => Math.hypot(x - p.x, z - p.z) < p.r)) continue

    const which = pickKind()
    const kind = kinds[which]
    const mesh = meshes[which]
    const slot = fill[which]
    if (slot >= mesh.instanceMatrix.count) continue

    // Far-field props are allowed to be much bigger, which reads as distance.
    const far = THREE.MathUtils.smoothstep(d, COLONY_RADIUS, 130)
    const [lo, hi] = kind.size
    const s = (lo + rand() * (hi - lo)) * (1 + far * 1.9)

    dummy.position.set(x, sampleY(x, z, planet, seed) - s * kind.sink, z)
    // A tree that leans is a fallen tree. Boulders may lie however they landed.
    if (kind.upright) dummy.rotation.set(0, rand() * Math.PI * 2, 0)
    else dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5)
    const jitter = kind.upright ? 0.14 : 0.35
    dummy.scale.set(
      s * (1 - jitter / 2 + rand() * jitter),
      s * (1 - jitter / 2 + rand() * jitter),
      s * (1 - jitter / 2 + rand() * jitter)
    )
    dummy.updateMatrix()
    mesh.setMatrixAt(slot, dummy.matrix)

    // Foliage keeps the colour it was painted; rock takes the planet's. The tint is lifted
    // because it *multiplies* the atlas rather than replacing it — the pack's stone is a
    // mid grey, and rust times mid grey is a much darker rust than the ground it sits on.
    if (kind.tint) color.copy(rock).multiplyScalar(1.55)
    else color.setRGB(1, 1, 1)
    color.offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.14)
    mesh.setColorAt(slot, color)
    fill[which] = slot + 1
  }

  meshes.forEach((mesh, i) => {
    mesh.count = fill[i]
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
  })
  return group
}

/**
 * Terrain height at a world point — the same field the mesh was built from, evaluated on
 * demand. Used to place scatter, and to keep anything that walks on the ground *on* it.
 */
export function terrainHeight(x, z, planet) {
  return sampleY(x, z, planet, 1337)
}

// A private terrain sampler for scatter placement — the same field the mesh was built from.
const _samplers = new Map()
function sampleY(x, z, planet, seed) {
  let s = _samplers.get(planet.id)
  if (!s) {
    s = { noise: makeNoise(1337), craters: makeCraters(planet.craters, 1337) }
    _samplers.set(planet.id, s)
  }
  return sampleHeight(x, z, s.noise, s.craters, planet)
}

// ── noise ─────────────────────────────────────────────────────────────────────────────

/** Small deterministic PRNG — same seed, same world, every reload. */
export function mulberry(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Value noise on a hashed lattice with smoothstep interpolation — cheap and smooth enough. */
function makeNoise(seed) {
  const rand = mulberry(seed)
  const size = 256
  const table = new Float32Array(size * size)
  for (let i = 0; i < table.length; i++) table[i] = rand() * 2 - 1

  return function noise(x, y) {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const at = (a, b) => table[(((a % size) + size) % size) * size + (((b % size) + size) % size)]
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
  }
}

function fbm(noise, x, y, octaves) {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.07
  }
  return sum / norm
}
