import * as THREE from 'three'
import './ui/styles.css'
import { DEFAULT_PRESET, Settings, hasStoredSettings } from './core/settings.js'
import { Engine } from './core/engine.js'
import { CameraRig } from './core/camera.js'
import { Colony, STATUS_LABEL, STATUS_ORDER, statusFor, transcriptProgress } from './game/colony.js'
import { Hud } from './ui/hud.js'
import { PLANETS } from './world/planet.js'
import { loadKit } from './world/kit.js'
import { crewRig, loadCrew } from './agents/crew.js'
import { TIMES, systemTimeOfDay } from './world/sky.js'
import {
  fetchThreads,
  fetchState,
  saveState,
  openThread,
  newSession,
  revealFolder,
} from './game/api.js'
import { hideProject, hiddenCatalog, unhideProject } from './game/hidden-projects.js'

/**
 * Boot and the outer game loop.
 *
 * The one interesting piece of orchestration here is the archive round trip. The harness
 * owns the session records; the colony owns nothing but its own list of what you archived,
 * and that list is written by exactly one writer — this page — so a save from a stale tab
 * can never silently drop an archive. Everything else is wiring.
 */

const POLL_MS = 15000
const app = document.getElementById('app')

app.insertAdjacentHTML(
  'beforeend',
  `<div class="boot"><div class="inner">
     <h1>Bot Crossing</h1>
     <p>Scanning for agent threads…</p>
     <div class="bar"><i></i></div>
   </div></div>`
)

const settings = new Settings()
if (!hasStoredSettings()) settings.applyPreset(DEFAULT_PRESET)
if (settings.get('clockTime')) {
  settings.set('timeOfDay', systemTimeOfDay())
}

const engine = new Engine(settings).mount(app)
const rig = new CameraRig(engine.camera, engine.canvas, settings)
const colony = new Colony(engine.scene, settings, engine.camera, engine.renderer)

let state = { archived: [], archivedAt: {}, opened: [], plots: {}, seen: {}, hiddenProjects: [], viewedAt: {} }
let threads = []
/** Last legend built for the bottom bar, kept so the open zone's chip can light up between polls. */
let legendProjects = []
/** The zone layout as last written to the colony file, so an unchanged map is not re-saved. */
let lastLayout = ''
let selectedId = null
/** Which zone's sidebar is open. A repo, not a thread — they outlive the threads on them. */
let selectedProject = null
let hoverId = null
let statusCursor = 0
let pendingSave = 0
const hoverGround = new THREE.Vector3()

// ── actions the HUD can trigger ────────────────────────────────────────────────────────

const actions = {
  resetView: () => rig.resetView(),

  screenshot: () => {
    // Render one more frame, then read the buffer before the compositor clears it — the
    // alternative is preserveDrawingBuffer, which costs a copy on every single frame.
    engine.renderFrame()
    const url = engine.canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `bot-crossing-${colony.planet.id}-${stamp()}.png`
    a.click()
    hud.toast('Screenshot saved')
  },

  /** Google Earth's auto-rotate: a slow sweep around whatever is centred. */
  toggleOrbit: () => {
    const on = rig.toggleOrbit()
    hud.hint(on ? 'Orbit mode on — drag or press O to stop' : 'Orbit mode off')
    return on
  },

  cyclePlanet: () => {
    const ids = Object.keys(PLANETS)
    const next = ids[(ids.indexOf(settings.get('planet')) + 1) % ids.length]
    settings.set('planet', next)
    hud.hint(`${PLANETS[next].name} — ${PLANETS[next].blurb}`)
  },

  cycleTime: () => {
    settings.set('autoTime', false)
    settings.set('clockTime', false)
    const current = settings.get('timeOfDay')
    // Step to the next named time *after* the current one, wrapping at midnight.
    const next = TIMES.find((t) => t.value > current + 0.005) || TIMES[0]
    settings.set('timeOfDay', next.value)
    hud.hint(next.label)
  },

  /** Fly to the next astronaut in a given state, cycling through them on repeat presses. */
  focusStatus: (status) => {
    const key = status === 'agents' ? null : status
    const pool = colony.astronauts.agents.filter((a) => (key ? a.status === key : true))
    if (!pool.length) {
      hud.hint(key ? `Nobody is ${(STATUS_LABEL[key] || key).toLowerCase()} right now` : 'No crew on the surface')
      return
    }
    pool.sort((a, b) => a.id.localeCompare(b.id))
    const agent = pool[statusCursor++ % pool.length]
    select(agent.id, { fly: true })
  },

  focusProject: (name) => {
    const plot = colony.plots.get(name)
    if (!plot) return
    rig.focus(plot.middle || plot.center, { distance: 30 })
  },

  /** The legend, and anything else that means "show me this repo". */
  pickProject: (name) => selectProject(name, { fly: true }),

  /** Back out of one repo to the list of all of them. The panel itself never leaves. */
  closeProject: () => {
    selectedProject = null
    select(null, {})
    syncProject()
  },

  select: (id) => select(id, {}),

  focusThread: (id) => select(id, { fly: true }),

  /**
   * A new thread in this repo. The desktop app opens an empty session with the folder as
   * its workspace — nothing here is resumed, and nothing is written to disk.
   */
  newConversation: async () => {
    const name = selectedProject
    const folder = name && pathForProject(name)
    if (!folder) {
      hud.toast('No folder on disk for that project', 'err')
      return
    }
    try {
      const harness = harnessForProject(name)
      await newSession(folder, harness)
      hud.toast(`New thread in ${name} — opening ${harnessLabel(harness)}`)
      // It lands as an astronaut walking down the ramp, once it has a record to scan.
      setTimeout(poll, 6000)
    } catch (err) {
      hud.toast(err.message || 'Could not start a thread there', 'err')
    }
  },

  revealProject: async () => {
    const folder = selectedProject && pathForProject(selectedProject)
    if (!folder) return
    try {
      await revealFolder(folder)
    } catch (err) {
      hud.toast(err.message || 'Could not open that folder', 'err')
    }
  },

  /**
   * Stop a thread asking for you, without touching it.
   *
   * `unread` comes from the harness, and the harness only counts a thread as read when it is
   * focused *in its own app*. Answer one in a terminal, or read it over somebody's shoulder,
   * and it keeps its hand up forever. Marking it viewed here records when you looked; the
   * moment the thread does something newer than that it goes back to waving, which is the
   * behaviour you actually want and the reason this is a timestamp rather than a flag.
   */
  markViewed: () => {
    const thread = threads.find((t) => t.id === selectedId)
    if (!thread) return
    state.viewedAt = { ...(state.viewedAt || {}), [thread.id]: Date.now() }
    queueSave()
    applyThreads(threads)
    hud.toast(`Marked ${thread.title.slice(0, 40)} as viewed`)
  },

  hideProject: () => {
    const name = selectedProject
    if (!name) return
    state.hiddenProjects = hideProject(state.hiddenProjects || [], name)
    queueSave()
    // If the open thread belonged to the repo that just left, nothing is selected any more.
    if (selectedId) {
      const thread = threads.find((t) => t.id === selectedId)
      if (thread?.project === name) select(null, {})
    }
    selectedProject = null
    applyThreads(threads)
    hud.toast(`Hidden ${name} — still in your harness, gone from the colony`)
  },

  unhideProject: (name) => {
    if (!name) return
    state.hiddenProjects = unhideProject(state.hiddenProjects || [], name)
    queueSave()
    applyThreads(threads)
    hud.toast(`Showing ${name} again`)
  },

  copyProjectPath: async () => {
    const folder = selectedProject && pathForProject(selectedProject)
    if (!folder) return
    try {
      await navigator.clipboard.writeText(folder)
      hud.toast('Path copied')
    } catch {
      // The async clipboard needs a permission this page does not always have — inside an
      // embedded preview, say. The old selection-based copy has no such gate.
      const copied = copyFallback(folder)
      hud.toast(copied ? 'Path copied' : 'Could not reach the clipboard', copied ? '' : 'err')
    }
  },

  openThread: async () => {
    const thread = threads.find((t) => t.id === selectedId)
    if (!thread) return
    try {
      await openThread(thread)
      colony.astronauts.celebrate(thread.id)
      hud.toast(`Opened in ${thread.harnessName || 'your harness'}`)
      // Opening is the thing that makes a thread no longer unread, so refresh shortly after.
      setTimeout(poll, 1800)
    } catch (err) {
      hud.toast(err.message || 'Could not open that thread', 'err')
    }
  },

  // Archiving is the colony's own bookkeeping and nothing else: the thread leaves the map and
  // the astronaut walks back to the ship. The harness's own records are never touched — see
  // `reconcileArchived` in server/api.mjs for why that stopped being worth doing.
  archiveThread: () => {
    const thread = threads.find((t) => t.id === selectedId)
    if (!thread) return
    const foldedBefore = new Set(colony.dormantProjects || [])
    state.archived = [...new Set([...state.archived, thread.id])]
    state.archivedAt = { ...state.archivedAt, [thread.id]: Date.now() }
    queueSave()
    select(null, {})
    applyThreads(threads)
    // Retiring the last thread anybody has touched in a repo makes every thread left in it
    // dormant, and the whole zone folds away — sixty astronauts can leave the map on one
    // click. That is the setting working, but silently it reads as the colony breaking, so
    // it says which repo went and why.
    const folded = [...(colony.dormantProjects || [])].filter((n) => !foldedBefore.has(n))
    hud.toast(
      folded.length
        ? `Archived — ${folded.join(', ')} ${folded.length === 1 ? 'is' : 'are'} all quiet now, folded off the map`
        : 'Archived — heading home'
    )
    colony.ship.ping()
  },

  uiVisibility: (visible) => colony.setUiVisible(visible),

  // The card's bar is about the *thread*, not about how much of its building has risen —
  // those were the same number while construction was drawn by burying the structure.
  progressFor: (id) => {
    const thread = threads.find((t) => t.id === id)
    return thread ? transcriptProgress(thread) : 0
  },
}

const hud = new Hud(app, settings, actions)
// The sidebar is permanent, so the card beside an astronaut has a wall to stay clear of.
const sideWidth = () => (window.innerWidth <= 820 ? 0 : 334)
hud.setSideWidth(sideWidth())
window.addEventListener('resize', () => hud.setSideWidth(sideWidth()))

// ── selection ─────────────────────────────────────────────────────────────────────────

function select(id, { fly = false } = {}) {
  selectedId = id
  const agent = id ? colony.agentFor(id) : null
  if (!agent) {
    selectedId = null
    colony.astronauts.setSelected(null)
    hud.setSelection(null, null)
    syncProject()
    return
  }
  colony.astronauts.setSelected(agent)
  const thread = threads.find((t) => t.id === id) || agent.thread
  hud.setSelection(agent, thread)
  // Picking somebody is also picking the zone they are standing on: the sidebar follows.
  if (thread?.project && colony.plots.has(thread.project)) selectedProject = thread.project
  syncProject()
  if (fly) {
    rig.focus(new THREE.Vector3(agent.pos.x, 0, agent.pos.z), { distance: Math.min(rig.desiredDistance, 26) })
  }
}

/** Open a zone's sidebar. Any selected astronaut from a different zone lets go. */
function selectProject(name, { fly = false } = {}) {
  if (!name || !colony.plots.has(name)) return
  selectedProject = name
  const current = threads.find((t) => t.id === selectedId)
  if (current && current.project !== name) select(null, {})
  else syncProject()
  if (fly) actions.focusProject(name)
}

/**
 * The repo folder behind a zone. Plots are keyed by the folder's *name*, which is all the
 * colony needs to draw one — the path itself lives on the threads, so it is read back off
 * them, taking the most common answer if two checkouts somehow share a basename.
 */
/** The human name for a harness id — every thread already carries its own. */
function harnessLabel(id) {
  for (const thread of colony.threads.values()) {
    if (thread.harness === id && thread.harnessName) return thread.harnessName
  }
  return 'your harness'
}

/**
 * Which harness a project's threads belong to, picked the same way its path is: the most
 * common answer among the threads standing there. A repo worked on from two harnesses gets
 * a new thread in whichever one it is mostly used from.
 */
function harnessForProject(name) {
  const counts = new Map()
  for (const thread of colony.threads.values()) {
    if (thread.project !== name || !thread.harness) continue
    counts.set(thread.harness, (counts.get(thread.harness) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [id, n] of counts) {
    if (n <= bestCount) continue
    best = id
    bestCount = n
  }
  return best
}

function pathForProject(name) {
  const counts = new Map()
  for (const thread of colony.threads.values()) {
    if (thread.project !== name) continue
    const dir = thread.projectPath || thread.cwd
    if (!dir) continue
    counts.set(dir, (counts.get(dir) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [dir, n] of counts) {
    if (n <= bestCount) continue
    best = dir
    bestCount = n
  }
  return best
}

/** Push the open zone's current contents at the sidebar. Closes it if the zone is gone. */
function syncProject() {
  const hidden = hiddenCatalog(state.hiddenProjects || [], threads)
  // Folded-away repos are listed alongside the ones you hid by hand. Same principle: nothing
  // leaves the map without somewhere on screen saying where it went.
  const folded = hiddenCatalog([...(colony.dormantProjects || [])], threads)
  const plot = selectedProject ? colony.plots.get(selectedProject) : null
  if (!plot) {
    selectedProject = null
    hud.setProject(null)
    hud.setLegend(legendProjects, null, hidden, folded)
    return
  }
  const now = Date.now()
  const list = [...colony.threads.values()]
    .filter((thread) => thread.project === plot.name)
    .map((thread) => ({
      id: thread.id,
      title: thread.title,
      worktree: thread.worktree,
      lastActivityAt: thread.lastActivityAt,
      status: statusFor(thread, now),
    }))
    // Whoever wants something first, then most recently touched — the same order of
    // importance the badges use above their heads.
    .sort((a, b) => {
      const rank = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      return rank || (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0)
    })

  hud.setProject({
    name: plot.name,
    accent: plot.accent,
    path: pathForProject(plot.name),
    threads: list,
    selectedId,
  })
  // The legend is the same selection seen from the bottom of the screen: keep it in step
  // here rather than only on the next poll.
  hud.setLegend(legendProjects, selectedProject, hidden, folded)
}

// ── pointer ───────────────────────────────────────────────────────────────────────────

/**
 * Where an astronaut is on screen, in CSS pixels, or null if it is behind the camera.
 *
 * Measured off the engine's own viewport rather than the canvas's bounding rect: this runs
 * every frame for the selected agent, and a layout read per frame to learn a number that
 * only changes on resize is the kind of thing that quietly costs a HUD its smoothness.
 */
const cardAnchor = new THREE.Vector3()
function screenOf(agent) {
  cardAnchor.set(agent.pos.x, agent.pos.y + 0.95, agent.pos.z).project(engine.camera)
  if (cardAnchor.z > 1) return null
  const { w, h } = engine.viewport
  return { x: (cardAnchor.x * 0.5 + 0.5) * w, y: (-cardAnchor.y * 0.5 + 0.5) * h }
}

function ndc(e) {
  const rect = engine.canvas.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    aspect: rect.width / rect.height,
  }
}

engine.canvas.addEventListener('pointermove', (e) => {
  // Mid-drag the cursor is the grab hand and nothing else: running a pick every move event
  // while the world is being dragged would flicker the hover ring across the whole colony.
  if (rig.interacting) {
    engine.canvas.style.cursor = rig._mode === 'orbit' ? 'move' : 'grabbing'
    return
  }
  const p = ndc(e)
  const agent = colony.pick(p.x, p.y, p.aspect)
  hoverId = agent?.id ?? null
  colony.astronauts.setHover(agent)
  // Pointing at a quiet plot is what makes its name appear.
  const plot = plotUnder(e, p)
  colony.setHoveredPlot(plot)
  engine.canvas.style.cursor = agent || plot ? 'pointer' : 'grab'
})

/**
 * The zone under the cursor: its name plate first, then the deck itself. The plate is
 * hit-tested whether or not it is currently faded in — pointing at where a quiet project's
 * name would be is exactly what makes it appear.
 */
function plotUnder(e, p) {
  const label = colony.pickLabel(p.x, p.y)
  if (label) return label
  const ground = rig.groundPoint(e.clientX, e.clientY, hoverGround)
  return ground ? colony.plotAt(ground.x, ground.z) : null
}

// Pressing on an astronaut used to suppress the camera, on the theory that grabbing one
// should not also drag the world out from under it. But nothing is draggable *about* an
// astronaut — a press is only ever the start of a selection or the start of a pan — so all
// that suppression did was make the ground refuse to move whenever a drag happened to begin
// on top of somebody. Selection is decided on release instead, where `wasClick` already
// distinguishes a click from a drag.
engine.canvas.addEventListener('pointerup', (e) => {
  if (e.button !== 0 || !rig.wasClick) return
  const p = ndc(e)
  const agent = colony.pick(p.x, p.y, p.aspect)
  if (agent) {
    select(agent.id, {})
    return
  }
  // Nobody there: a zone's deck or its name plate opens that repo's sidebar instead, and
  // bare ground puts everything down.
  const plot = plotUnder(e, p)
  if (plot) selectProject(plot.name, {})
  else {
    select(null, {})
    actions.closeProject()
  }
})

engine.canvas.addEventListener('pointerleave', () => {
  hoverId = null
  colony.astronauts.setHover(null)
  colony.setHoveredPlot(null)
})

// ── keyboard ──────────────────────────────────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
  // Never steal keys from a field the user is actually typing in.
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return

  // ⌘\ (⌃\ elsewhere) dismisses the chrome, the same as H — the shortcut every editor
  // uses for its sidebar, and the one hand that is already on the keyboard.
  if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
    e.preventDefault()
    hud.toggleUi()
    return
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return

  switch (e.key) {
    case 'h':
    case 'H':
      hud.toggleUi()
      break
    case 's':
    case 'S':
      hud.toggleSettings()
      break
    case 'n':
    case 'N':
      actions.focusStatus('waiting')
      break
    case 'p':
    case 'P':
      actions.screenshot()
      break
    case 'l':
    case 'L':
      actions.cycleTime()
      break
    case 'o':
    case 'O':
      hud.setOrbit(actions.toggleOrbit())
      break
    case 'Tab':
      e.preventDefault()
      actions.cyclePlanet()
      break
    case '0':
      actions.resetView()
      hud.setOrbit(false)
      break
    case 'Enter':
      if (selectedId) actions.openThread()
      break
    case 'a':
    case 'A':
      if (selectedId) actions.archiveThread()
      break
    case 'v':
    case 'V':
      if (selectedId) actions.markViewed()
      break
    case 'c':
    case 'C':
      if (selectedProject) actions.newConversation()
      break
    case '?':
      hud.toggleHelp()
      break
    // Arrow keys nudge the view and +/- zoom, the same as Earth's keyboard.
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight': {
      e.preventDefault()
      const step = rig.distance * 0.09
      const forward = new THREE.Vector3(Math.sin(rig.azimuth), 0, Math.cos(rig.azimuth))
      const right = new THREE.Vector3(forward.z, 0, -forward.x)
      if (e.key === 'ArrowUp') rig.desiredTarget.addScaledVector(forward, -step)
      if (e.key === 'ArrowDown') rig.desiredTarget.addScaledVector(forward, step)
      if (e.key === 'ArrowLeft') rig.desiredTarget.addScaledVector(right, -step)
      if (e.key === 'ArrowRight') rig.desiredTarget.addScaledVector(right, step)
      rig._clampTarget()
      rig.idleFor = 0
      break
    }
    case '+':
    case '=':
      rig.desiredDistance = Math.max(4, rig.desiredDistance * 0.82)
      break
    case '-':
    case '_':
      rig.desiredDistance = Math.min(150, rig.desiredDistance * 1.22)
      break
    // One step at a time, outward: the thread, then the zone it belongs to.
    case 'Escape':
      if (document.querySelector('.help.open')) hud.toggleHelp(false)
      else if (selectedId) select(null, {})
      else if (selectedProject) actions.closeProject()
      break
  }
})

// ── data ──────────────────────────────────────────────────────────────────────────────

function applyThreads(list) {
  // A thread you have said you looked at stops counting as unread until it moves on again.
  // Done here rather than in `statusFor` so the card, the badge and the astronaut all agree.
  const viewed = state.viewedAt || {}
  threads = list.map((t) => {
    const at = viewed[t.id]
    return at && t.lastActivityAt <= at ? { ...t, unread: false } : t
  })
  list = threads
  const archivedSet = new Set(state.archived)
  const hiddenSet = new Set(state.hiddenProjects || [])

  // Which threads the colony has met before. Walking out of the ship is meant to *mean*
  // something — a thread that just appeared — and without this every reload staged a
  // hundred-astronaut entrance, which piled up at the ramp and read as a bug because it was
  // one. A thread already on the books is simply already outside.
  const known = new Set(Object.keys(state.seen || {}))
  let firstSeen = false
  for (const t of list) {
    if (state.seen?.[t.id]) continue
    state.seen = { ...(state.seen || {}), [t.id]: Date.now() }
    firstSeen = true
  }
  if (firstSeen) queueSave()

  const stats = colony.setThreads(list, archivedSet, hiddenSet, known)
  hud.setStats(stats)

  legendProjects = colony.plotOrder
    .map((plot) => ({
      name: plot.name,
      accent: plot.accent,
      count: list.filter((t) => !t.archived && !archivedSet.has(t.id) && t.project === plot.name).length,
      urgent: colony.urgentPlots?.has(plot.id) ?? false,
    }))
    .sort((a, b) => b.count - a.count)

  // Keep the card honest if the thread it is showing changed underneath it.
  if (selectedId) {
    const still = colony.agentFor(selectedId)
    if (still) hud.setSelection(still, list.find((t) => t.id === selectedId) || still.thread)
    else select(null, {})
  }
  // Which also repaints the legend, so the open zone's chip is lit by the same pass.
  syncProject()

  // Zones only move when their own footprint changes, and when one does the colony file
  // learns about it — so the map you built up a memory of survives a reload.
  const layout = colony.layoutForSave()
  const signature = JSON.stringify(layout)
  if (signature !== lastLayout) {
    lastLayout = signature
    state.plots = layout
    queueSave()
  }
}

const ENGLISH_NAMES = [
  'Alexander','Amelia','Arthur','Audrey','Benjamin','Charlotte','Daniel','Eleanor','Ethan','Emily',
  'Felix','Florence','Gabriel','Grace','Henry','Hannah','Isaac','Isla','James','Jasper',
  'Julian','Kate','Liam','Lucas','Lucy','Marcus','Maya','Nathan','Oliver','Olivia',
  'Penelope','Rupert','Samuel','Sophia','Sebastian','Stella','Theodore','Violet','William','Zoe',
  'Abigail','Adam','Alice','Andrew','Beatrice','Caleb','Clara','Dominic','Evelyn','Edward',
  'Fiona','George','Georgia','Harrison','Hazel','Ian','Ivy','Jack','Julia','Leo',
  'Lily','Mason','Mia','Nicholas','Nora','Owen','Piper','Quentin','Rose','Rowan',
  'Simon','Scarlett','Thomas','Tessa','Victor','Victoria','Zachary','Ava','Charles','Daisy',
  'Elliott','Eliza','Gavin','Iris','Jude','Laura','Miles','Naomi','Oscar','Paige',
  'Robert','Ruby','Tristan','Willa','Xavier','Yvette','Zacharias','Harper','Logan','Sienna'
]

const ROLES = [
  'Dream Architect','Sound Weaver','Light Sculptor','Mood Alchemist','Beat Crafter',
  'Rhythm Oracle','Pixel Wanderer','Star Navigator','Crystal Guardian','Harmonic Sage',
  'Aura Painter','Cloud Walker','Neon Scribe','Soul Engineer','Vibe Curator',
  'Echo Mapper','Prism Keeper','Wave Dancer','Glow Smith','Night Watcher',
  'Pulse Reader','Flame Tender','Code Poet','Sky Fisher','Root Singer',
  'Dusk Warden','Mist Caller','Bloom Keeper','Tide Listener','Storm Painter'
]

const PLANET_CITIZENS = {
  mercury: {
    culture: 'UNRN Axle Load & Weighbridge AI Center',
    projects: ['4.Weighbridge Data', '11.Axle Load Data', '2.Vehicle Fleet', 'Weighbridges\'s 2020 System Reports(Jan-Oct)', '3.Traffic'],
    roles: ['Weighbridge Station Auditor', 'Axle Load Spectra Analyst', 'Heavy Commercial Fleet Modeler', 'ESAL Equivalency Engineer', 'Overload Penalty Auditor'],
    tasks: ['Auditing Axle Load Weighbridge Compliance Rates', 'Calculating Equivalent Single Axle Load (ESAL) Factors', 'Modeling Commercial Heavy Truck Fleet Growth', 'Processing 2020 Weighbridge System Overload Reports']
  },
  venus: {
    culture: 'UNRN Engineering Manuals & Standards Observatory',
    projects: ['0. Manuals', 'docs', 'Annual National Road Network Performance Monitoring', 'IMPROVEMENTS_GUIDE.md', 'MOWT_FULL_NETWORK_REPORT_2026.md'],
    roles: ['Highway Design Manual Auditor', 'Pavement Specification Engineer', 'MOWT Master Report Analyst', 'Performance Guide Evaluator', 'Standards Compliance Lead'],
    tasks: ['Validating Class 1 Paved Trunk Highway Design Speed Manuals', 'Synthesizing MOWT Full Network Report 2026 Metrics', 'Evaluating Road Network Improvements Guide Criteria', 'Auditing Pavement Standard Specification Guidelines']
  },
  terra: {
    culture: 'UNRA Uganda National Road Network Master Directorate',
    projects: ['1.Road Network', 'uganda_nrms_frontend', 'uganda_nrms_backend', 'Annual National Road Network Performance Monitoring', 'MOWT_FULL_NETWORK_REPORT_2026.md'],
    roles: ['National Road Network Director', 'NRMS Backend Architect', 'NRMS Frontend Engineer', 'Network Performance Auditor', 'Corridor Infrastructure Director'],
    tasks: ['Mapping 21,000 km Classified National Road Network', 'Deploying National Road Management System (NRMS) Frontend', 'Compiling Annual National Road Network Performance Reports', 'Optimizing Trunk & Feeder Corridor Connections']
  },
  moon: {
    culture: 'UNRN Road Condition & Pavement PCI Observatory',
    projects: ['5.Road Condition Data', '6.Road Inventory Data', 'ugnrms', 'Survey Data', 'processed'],
    roles: ['Pavement Condition PCI Analyst', 'Road Roughness (IRI) Specialist', 'Road Inventory Surveyor', 'Crack & Rutting Depth AI Evaluator', 'Pavement Quality Auditor'],
    tasks: ['Evaluating Pavement Condition Index (PCI) Metrics', 'Analyzing International Roughness Index (IRI) Surveys', 'Processing Road Inventory Carriageway & Shoulder Widths', 'Scanning High-Speed Pavement Distress Scans']
  },
  mars: {
    culture: 'UNRN Traffic & ATC Processing Republic',
    projects: ['3.Traffic', 'uganda_atc', 'traffic-spatial-worktree', 'traffic_platform_unified.db', 'uganda_atc'],
    roles: ['Automated Traffic Count AI Lead', 'AADT Flow Modeler', 'Traffic Database Architect', 'Peak Hour Volume Analyst', 'Corridor Traffic Surveyor'],
    tasks: ['Processing Automated Traffic Count (ATC) Station Datasets', 'Modeling Annual Average Daily Traffic (AADT) Flow Maps', 'Querying Unified Traffic Database Spatial Worktrees', 'Calculating Peak Hour Volume Coefficients']
  },
  jupiter: {
    culture: 'UNRN National Bridge Management System (UGNBMS)',
    projects: ['7.Bridge Inventory and Condition Data', 'ugnbms', 'bmc', 'codex_tmp_nbms_serve', 'Structure Repair Hub'],
    roles: ['Bridge Structure Inspector', 'UGNBMS System Architect', 'Abutment & Pier Integrity Auditor', 'Scour Risk Engineer', 'Expansion Joint Specialist'],
    tasks: ['Inspecting National Bridge Bearing & Expansion Joint Seals', 'Deploying National Bridge Management System (UGNBMS)', 'Evaluating Pier Scour Hydraulic & Structural Clearance', 'Auditing Structural Bridge Repair Schedules']
  },
  saturn: {
    culture: 'UNRN GIS Shapefiles & Dynamic Mapping Guild',
    projects: ['8. Shapefiles', '9.Map Layouts', '13.Dynamic Maps(Google Earth Files)', 'uggis', 'traffic-spatial-worktree'],
    roles: ['GIS Shapefile Analyst', 'Map Layout Cartographer', 'Google Earth KML/KMZ Specialist', 'Spatial Database Architect', 'Geodesy Mapping Engineer'],
    tasks: ['Processing National Road Network GIS Spatial Shapefiles', 'Rendering High-Resolution Print Map Layouts', 'Building Dynamic Google Earth KML/KMZ Corridor Overlays', 'Managing Spatial Geodatabase Features']
  },
  uranus: {
    culture: 'UNRN Vehicle Fleet & Transport Information System (NTIS)',
    projects: ['2.Vehicle Fleet', 'uganda_ntis', 'uganda_ntis_main_work', 'ugroads', 'ugroads-build'],
    roles: ['Vehicle Fleet Specialist', 'NTIS Platform Engineer', 'Transport Fleet Analyst', 'Vehicle Growth Modeler', 'System Build Architect'],
    tasks: ['Modeling Commercial & Passenger Vehicle Fleet Growth Rates', 'Building National Transportation Information System (NTIS)', 'Compiling Transport System Build Artifacts', 'Analyzing Vehicle Axle Load Factors']
  },
  neptune: {
    culture: 'UNRN Ferries & Inland Waterway Base',
    projects: ['10.Ferries', '12.Media', 'Reports', 'outputs', 'ugfix'],
    roles: ['Inland Ferry Operator', 'Waterway Crossing Architect', 'Vessel Logistics Coordinator', 'Aerial Video Surveyor', 'Media Asset Curator'],
    tasks: ['Managing Lake Victoria & Nile Inland Ferry Crossing Schedules', 'Coordinating Vessel Cargo Capacity & Tonnage Standards', 'Processing Aerial Drone Corridor Video Surveys', 'Cataloging Network Inspection Media Outputs']
  },
  pluto: {
    culture: 'UNRN Road Reserve Management & Encroachment Observatory',
    projects: ['14.Road Reserve Management', 'Reports', 'docs', 'Claude outputs', 'Archived_Builds'],
    roles: ['Road Reserve Inspector', 'Right-Of-Way Surveyor', 'Encroachment Control Officer', 'Corridor Boundary Auditor', 'Executive Report Analyst'],
    tasks: ['Auditing 60m Road Reserve Right-Of-Way Boundaries', 'Processing Land Encroachment Survey Reports', 'Enforcing Corridor Protection Standards', 'Generating Executive Boundary Compliance Reports']
  }
}

const UNRN_DATA_POINTS = [
  'UNRN Node #01.RN-104: 21,000 km Classified Network (6,000 km Paved Trunk, 15,000 km Unpaved Feeder)',
  'UNRN Node #02.VF-208: Heavy Commercial Vehicle Fleet Ratio 28.4% · Axle Multipliers 2.4 ESAL',
  'UNRN Node #03.TR-312: 2026 ATC Station #104 Traffic Vol 34,200 vpd (Peak Hour Flow 3,850 vph)',
  'UNRN Node #04.WB-416: Weighbridge Station #WB-03 Axle Overload Penalty Compliance Rate 99.1%',
  'UNRN Node #05.RC-520: Pavement Roughness IRI 2.1 m/km · Pavement Condition Index PCI 84/100',
  'UNRN Node #06.RI-624: Road Inventory Section #RI-84 · 7.0m Carriageway + 2.0m Sealed Shoulders',
  'UNRN Node #07.BR-728: National Bridge Inventory #B-108 Nile Crossing Joint Rating 8/10',
  'UNRN Node #08.SH-832: GIS Shapefile Feature #SHP-994 Road Reserve Centerline Alignment Offset 30m',
  'UNRN Node #09.MP-936: Dynamic KML Map Layout #KMZ-402 · Regional Corridor High-Resolution Overlay',
  'UNRN Node #10.FR-040: Inland Ferry #MV-Kabalega Vessel Crossing Schedule · 250 Ton Cargo Rating',
  'UNRN Node #11.AL-114: Axle Load Spectra Spectrum #AL-88 · Equivalent Single Axle Load ESAL 2.45',
  'UNRN Node #14.RR-224: Road Reserve Right-Of-Way Boundary Survey #RR-60 · 60m Corridor Reserve'
]

function generateSyntheticThreads(planetKey = settings.get('planet') || 'moon', count = 1000) {
  const pData = PLANET_CITIZENS[planetKey] || PLANET_CITIZENS.moon
  const list = []
  for (let i = 0; i < count; i++) {
    const name = ENGLISH_NAMES[i % ENGLISH_NAMES.length]
    const role = pData.roles[i % pData.roles.length]
    const project = pData.projects[i % pData.projects.length]
    const task = pData.tasks[i % pData.tasks.length]
    const dataPoint = UNRN_DATA_POINTS[i % UNRN_DATA_POINTS.length]
    const epoch = (i * 7) % 100 + 1
    const loss = (0.008 + (i % 10) * 0.002).toFixed(4)
    const statusIdx = i % 5
    list.push({
      id: `${planetKey}-ai-agent-${i + 1}`,
      title: `${name} — ${role} [UNRN AI Agent]`,
      project: project,
      projectPath: `D:\\OneDrive\\Uganda National Road Network Repository\\${project}`,
      harness: 'antigravity-ai',
      harnessName: `UNRN AI Knowledge Module (Training Epoch ${epoch}/100)`,
      task: `${task} | ${dataPoint}`,
      trainingState: `Building Knowledge: Epoch ${epoch}/100 (Loss: ${loss})`,
      running: statusIdx !== 1, // Active learning & building
      hasError: statusIdx === 1,
      prState: statusIdx === 2 ? 'MERGED' : 'OPEN',
      unread: statusIdx === 3,
      lastActivityAt: Date.now() - (i * 10000),
      createdAt: Date.now() - (i * 30000),
    })
  }
  return list
}

let polling = false
async function poll() {
  if (polling) return
  polling = true
  try {
    const currentPlanet = settings.get('planet') || 'moon'
    const res = await fetchThreads().catch(() => null)
    const list = (res && res.threads && res.threads.length > 0) ? res.threads : generateSyntheticThreads(currentPlanet, 1000)
    applyThreads(list)
    hud.removeBoot()
  } catch (err) {
    applyThreads(generateSyntheticThreads(settings.get('planet') || 'moon', 1000))
    hud.removeBoot()
  } finally {
    polling = false
  }
}

function queueSave() {
  clearTimeout(pendingSave)
  pendingSave = setTimeout(async () => {
    try {
      state = await saveState(state)
    } catch {}
  }, 500)
}

async function boot() {
  const settle = (p) => p.then(() => null, (err) => err)
  const [, kitError, crewError] = await Promise.all([
    fetchState()
      .then((s) => {
        state = s
        colony.restoreLayout(state.plots)
        if (!hasStoredSettings() && state.settings) settings.applyAll(state.settings)
      })
      .catch(() => {}),
    settle(loadKit()),
    settle(loadCrew()),
  ])
  if (kitError || crewError) {
    hud.toast('Could not load the model assets — run `npm run assets`', 'err')
    console.error(kitError || crewError)
  }
  colony.astronauts.setRig(crewRig())
  if (!kitError) colony.onAssetsReady()

  await poll()
  setInterval(poll, POLL_MS)
  window.addEventListener('focus', poll)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) poll()
  })

  if (!localStorage.getItem('botcrossing.seen-help')) {
    hud.toggleHelp(true)
    localStorage.setItem('botcrossing.seen-help', '1')
  } else {
    hud.hint('Drag to move · click an astronaut · H hides everything', 5200)
  }
}

// ── settings plumbing ─────────────────────────────────────────────────────────────────

settings.onChange((changed, scope) => {
  state.settings = { ...settings.values }
  queueSave()
  if (scope.render || changed.has('fov')) engine.applySettings()
  colony.onSettingsChanged(changed, scope)
  if (changed.has('showFps')) hud.syncSettings()
  if (changed.has('hideDormant') || changed.has('maxAgents') || changed.has('planet')) {
    applyThreads(generateSyntheticThreads(settings.get('planet'), 1000))
  }
})

// ── frame ─────────────────────────────────────────────────────────────────────────────

engine.add({
  update(dt, elapsed) {
    rig.update(dt)
    colony.update(dt, elapsed, rig.target)
    // Whatever the camera is orbiting is what should be in focus.
    engine.setFocusDistance(rig.distance)

    if (selectedId) {
      hud.updateAvatar(colony.astronauts.faceTexture.image)
      // A selected astronaut that walked off the roster should not keep a stale card open.
      const agent = colony.agentFor(selectedId)
      if (!agent) select(null, {})
      else hud.placeCard(screenOf(agent))
    }
    hud.setFps(engine.perf, engine.viewport, `${colony.astronauts.visibleCount} crew · ${colony.particles.liveCount} bits`)
  },
})

engine.start()
boot()

// Handy for poking at the running colony from the console.
window.botCrossing = { engine, rig, colony, settings, hud, poll, get threads() { return threads } }

/** `execCommand('copy')` over a throwaway textarea — the copy that predates permissions. */
function copyFallback(text) {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.cssText = 'position:fixed;top:0;opacity:0;pointer-events:none'
  document.body.appendChild(el)
  el.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  el.remove()
  return ok
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
