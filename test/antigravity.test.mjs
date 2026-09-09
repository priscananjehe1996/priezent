import test from 'node:test'
import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import antigravity from '../server/harnesses/antigravity.mjs'

test('antigravity harness detects when brain dir exists', async () => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'antigravity-test-'))
  const origEnv = process.env.BOT_CROSSING_ANTIGRAVITY_DIR
  try {
    process.env.BOT_CROSSING_ANTIGRAVITY_DIR = tmpDir
    assert.equal(await antigravity.detect(), false)

    await fsp.mkdir(path.join(tmpDir, 'brain'), { recursive: true })
    assert.equal(await antigravity.detect(), true)
  } finally {
    if (origEnv !== undefined) {
      process.env.BOT_CROSSING_ANTIGRAVITY_DIR = origEnv
    } else {
      delete process.env.BOT_CROSSING_ANTIGRAVITY_DIR
    }
    await fsp.rm(tmpDir, { recursive: true, force: true })
  }
})

test('antigravity harness parses transcripts and scans threads', async () => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'antigravity-test-'))
  const origEnv = process.env.BOT_CROSSING_ANTIGRAVITY_DIR
  try {
    process.env.BOT_CROSSING_ANTIGRAVITY_DIR = tmpDir
    const uuid = '92107b76-3889-4d3e-86b9-de533fffcf45'
    const logDir = path.join(tmpDir, 'brain', uuid, '.system_generated', 'logs')
    await fsp.mkdir(logDir, { recursive: true })

    const sampleTranscript = [
      JSON.stringify({
        step_index: 0,
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: '2026-09-09T09:42:52Z',
        content: '<USER_REQUEST>\nBuild Bot Crossing colony\n</USER_REQUEST>',
      }),
      JSON.stringify({
        step_index: 1,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: '2026-09-09T09:42:56Z',
        tool_calls: [],
      }),
    ].join('\n')

    await fsp.writeFile(path.join(logDir, 'transcript.jsonl'), sampleTranscript, 'utf-8')

    const threads = await antigravity.scanThreads()
    assert.equal(threads.length, 1)
    assert.equal(threads[0].id, `antigravity:${uuid}`)
    assert.equal(threads[0].title, 'Build Bot Crossing colony')
    assert.equal(threads[0].model, 'Gemini')
  } finally {
    if (origEnv !== undefined) {
      process.env.BOT_CROSSING_ANTIGRAVITY_DIR = origEnv
    } else {
      delete process.env.BOT_CROSSING_ANTIGRAVITY_DIR
    }
    await fsp.rm(tmpDir, { recursive: true, force: true })
  }
})
