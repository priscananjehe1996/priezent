/**
 * Harness adapter: Google Antigravity (Google DeepMind) — agent transcripts.
 *
 * Antigravity writes transcript logs at:
 *   `~/.gemini/antigravity/brain/<uuid>/.system_generated/logs/transcript.jsonl`
 *
 * Read-only, no subprocess, and no modifications.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { exists, jsonLines, listDirs, readHead, readTail } from '../lib/fsutil.mjs'

const HOME = os.homedir()
const getAntigravityDir = () => process.env.BOT_CROSSING_ANTIGRAVITY_DIR || path.join(HOME, '.gemini', 'antigravity')
const getBrainDir = () => path.join(getAntigravityDir(), 'brain')

const HEAD_BYTES = 64 * 1024
const TAIL_BYTES = 32 * 1024

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Prefixed, per the contract in `server/harnesses/README.md`. */
const ID = (raw) => `antigravity:${raw}`

function extractUserPrompt(text) {
  if (!text) return ''
  let cleaned = text
    .replace(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/g, '$1')
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '')
    .trim()
  return cleaned
}

function parseTranscript(headText, tailText) {
  let title = ''
  let preview = ''
  let projectPath = ''
  let project = ''
  let model = 'Gemini'
  let createdAt = 0
  let running = false
  let hasError = false

  // Parse head for metadata and initial user input
  for (const line of jsonLines(headText)) {
    if (line.created_at && !createdAt) {
      createdAt = new Date(line.created_at).getTime()
    }

    if (line.type === 'USER_INPUT' && !title) {
      const cleaned = extractUserPrompt(line.content)
      if (cleaned) {
        preview = cleaned.slice(0, 160)
        title = cleaned.split('\n')[0].slice(0, 60)
      }
    }

    if (line.content && typeof line.content === 'string') {
      const pathMatch = line.content.match(/\[URI\] -> \[(.*?)\]/) || line.content.match(/d:\\[^\s\n\r"']+/i)
      if (pathMatch && !projectPath) {
        projectPath = pathMatch[1]
        project = path.basename(projectPath)
      }
    }
  }

  // Parse tail for current state
  const tailLines = Array.from(jsonLines(tailText))
  if (tailLines.length > 0) {
    const last = tailLines[tailLines.length - 1]
    if (last.status === 'ERROR') {
      hasError = true
    }
    if (last.status === 'RUNNING' || (last.type === 'PLANNER_RESPONSE' && last.status !== 'DONE')) {
      running = true
    }
  }

  return {
    title: title || 'Untitled Antigravity session',
    preview: preview || 'Antigravity coding session',
    project: project || 'Antigravity Workspace',
    projectPath: projectPath || '',
    model,
    createdAt,
    running,
    hasError,
  }
}

const transcriptMeta = async (file) => {
  try {
    const st = await fsp.stat(file)
    const [headText, tailText] = await Promise.all([
      readHead(file, HEAD_BYTES),
      readTail(file, TAIL_BYTES, st.size),
    ])

    const parsed = parseTranscript(headText, tailText)
    const lastActivityAt = st.mtimeMs

    return {
      sizeBytes: st.size,
      lastActivityAt,
      ...parsed,
    }
  } catch {
    return null
  }
}

export default {
  id: 'antigravity',
  name: 'Google Antigravity',

  async detect() {
    return exists(getBrainDir())
  },

  async scanThreads() {
    const brainDir = getBrainDir()
    if (!(await exists(brainDir))) return []

    const dirEntries = await listDirs(brainDir)
    const uuids = dirEntries.map((p) => path.basename(p)).filter((name) => UUID.test(name))

    const threads = []
    for (const uuid of uuids) {
      const transcriptFile = path.join(brainDir, uuid, '.system_generated', 'logs', 'transcript.jsonl')
      if (!(await exists(transcriptFile))) continue

      const meta = await transcriptMeta(transcriptFile)
      if (!meta) continue

      threads.push({
        id: ID(uuid),
        title: meta.title,
        preview: meta.preview,
        project: meta.project,
        projectPath: meta.projectPath,
        worktree: '',
        cwd: meta.projectPath,
        gitBranch: '',
        model: meta.model,
        effort: '',
        createdAt: meta.createdAt || meta.lastActivityAt,
        lastActivityAt: meta.lastActivityAt,
        lastFocusedAt: 0,
        running: meta.running,
        unread: false,
        hasError: meta.hasError,
        archived: false,
        sizeBytes: meta.sizeBytes,
        source: 'cli',
        canOpen: false,
        ref: { uuid },
      })
    }

    return threads
  },

  openThread(_ref) {
    return { ok: false, error: 'Antigravity sessions open inside the Google Antigravity IDE.' }
  },

  newSession(_dir) {
    return { ok: false, error: 'Start a new session using the `agy` CLI or Antigravity IDE.' }
  },
}
