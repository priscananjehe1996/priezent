import test from 'node:test'
import assert from 'node:assert/strict'
import { PLANETS } from '../src/world/planet.js'
import { Astronauts } from '../src/agents/astronauts.js'

test('all 10 solar system planets are registered with suit trims, visor colors, and gravity values', () => {
  const expectedPlanets = [
    'mercury',
    'venus',
    'terra',
    'moon',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]

  assert.equal(Object.keys(PLANETS).length, 10, 'Should have exactly 10 solar system planets')

  for (const id of expectedPlanets) {
    const planet = PLANETS[id]
    assert.ok(planet, `Planet ${id} should exist in PLANETS`)
    assert.equal(planet.id, id, `Planet id should match ${id}`)
    assert.ok(typeof planet.gravity === 'number' && planet.gravity > 0, `Planet ${id} should have valid gravity`)
    assert.ok(typeof planet.suitTrim === 'number', `Planet ${id} should have a numeric suitTrim color hex`)
    assert.ok(typeof planet.visorColor === 'number', `Planet ${id} should have a numeric visorColor hex`)
    assert.ok(planet.name, `Planet ${id} should have a name`)

    const locRate = Math.sqrt(planet.gravity)
    assert.ok(locRate > 0 && Number.isFinite(locRate), `Planet ${id} should have a valid Math.sqrt(gravity) locomotion factor`)
  }
})

test('Astronauts class prototype supports setPlanet and updates active planet reference', () => {
  const dummyContext = {
    agents: [{ status: 'working', trim: { set: () => {}, copy: () => ({ lerp: () => {} }) }, eye: { setRGB: () => {} } }],
    planet: null,
    setPlanet: Astronauts.prototype.setPlanet,
    _applyStatus: Astronauts.prototype._applyStatus,
  }

  assert.equal(dummyContext.planet, null)

  dummyContext.setPlanet(PLANETS.mercury)
  assert.equal(dummyContext.planet, PLANETS.mercury)
  assert.equal(dummyContext.planet.suitTrim, 0xff6600)
  assert.equal(dummyContext.planet.visorColor, 0xff9900)

  dummyContext.setPlanet(PLANETS.pluto)
  assert.equal(dummyContext.planet, PLANETS.pluto)
  assert.equal(dummyContext.planet.suitTrim, 0xa855f7)
  assert.equal(dummyContext.planet.visorColor, 0xc084fc)
})

