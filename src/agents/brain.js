/**
 * AgentBrain — Lightweight Neural Network & Autonomous Decision Engine
 *
 * Each AI Agent character carries an instance of AgentBrain that:
 * 1. Evaluates local environment inputs (loss, epoch, distance, neighbor density, XP, energy).
 * 2. Runs a 2-layer Neural Network forward pass (8 inputs -> 16 hidden (ReLU) -> 4 output actions (Softmax)).
 * 3. Makes autonomous decisions on what structures to build, data to process, or actions to take.
 * 4. Tracks XP, Level progression (Level 1..100), domain certifications, and skill ranks.
 */

export const ACTION_NAMES = [
  'CONSTRUCT_UNRN_NODE',
  'PROCESS_3D_SCANS',
  'OPTIMIZE_WEIGHTS',
  'COLLABORATE_GUILD'
]

export const ACTION_DESCRIPTIONS = {
  CONSTRUCT_UNRN_NODE: 'Constructing/Upgrading UNRN Infrastructure Node',
  PROCESS_3D_SCANS: 'Analyzing LCMS 3D Laser Crack Scans & Deflections',
  OPTIMIZE_WEIGHTS: 'Backpropagating Error & Optimizing Neural Model',
  COLLABORATE_GUILD: 'Exchanging Spatial Geodatabase Features with Guild'
}

export const CERTIFICATIONS = [
  'UNRA Senior GIS Charter',
  'AASHTO Pavement Design Fellow',
  'UGNBMS Structural Dynamics Lead',
  'LCMS 3D Laser Scanning Maestro',
  'WIM Axle Load Spectra Fellow',
  'NTIS Multi-Modal Logistics Director',
  'MOWT 2026 Master Report Principal'
]

export class AgentBrain {
  constructor(agentId, initialEpoch = 92) {
    this.agentId = agentId
    // overnight training boost: agents progress into Level 90-100 master ranks
    this.level = Math.min(100, Math.max(1, Math.floor(initialEpoch + (Math.random() * 8))))
    this.xp = this.level * 250 + Math.floor(Math.random() * 200)
    this.learningRate = 0.002
    this.loss = Math.max(0.0015, 0.025 - (this.level / 100) * 0.022).toFixed(4)
    this.structuresBuilt = Math.floor(this.level / 6) + 1
    this.certifications = this._getCertifications()
    
    // 8 Inputs -> 16 Hidden
    this.W1 = this._initWeights(16, 8)
    this.b1 = new Float32Array(16).fill(0.01)
    
    // 16 Hidden -> 4 Outputs
    this.W2 = this._initWeights(4, 16)
    this.b2 = new Float32Array(4).fill(0.01)
    
    this.lastInputs = new Float32Array(8)
    this.lastHidden = new Float32Array(16)
    this.lastOutputs = new Float32Array(4)
    this.currentAction = ACTION_NAMES[0]
    this.confidence = 0.92
  }

  _initWeights(rows, cols) {
    const scale = Math.sqrt(2 / cols)
    const w = []
    for (let r = 0; r < rows; r++) {
      const row = new Float32Array(cols)
      for (let c = 0; c < cols; c++) {
        row[c] = (Math.random() * 2 - 1) * scale
      }
      w.push(row)
    }
    return w
  }

  _getCertifications() {
    const count = Math.min(CERTIFICATIONS.length, Math.floor(this.level / 20) + 1)
    return CERTIFICATIONS.slice(0, count)
  }

  /** Run forward pass and compute autonomous action */
  evaluate(inputs = {}) {
    const x = this.lastInputs
    x[0] = (inputs.epoch || 92) / 100
    x[1] = Math.min(1, (inputs.loss || 0.005) * 20)
    x[2] = (inputs.targetDist || 8) / 100
    x[3] = Math.min(1, (inputs.density || 4) / 10)
    x[4] = this.level / 100
    x[5] = ((inputs.unrnId || 1) % 14) / 14
    x[6] = Math.min(1, this.xp / 25000)
    x[7] = inputs.energy || 0.98

    // Hidden layer (ReLU)
    for (let r = 0; r < 16; r++) {
      let sum = this.b1[r]
      const row = this.W1[r]
      for (let c = 0; c < 8; c++) sum += row[c] * x[c]
      this.lastHidden[r] = Math.max(0, sum)
    }

    // Output layer (Raw logits)
    const logits = new Float32Array(4)
    for (let r = 0; r < 4; r++) {
      let sum = this.b2[r]
      const row = this.W2[r]
      for (let c = 0; c < 16; c++) sum += row[c] * this.lastHidden[c]
      logits[r] = sum
    }

    // Softmax
    const maxLogit = Math.max(...logits)
    let expSum = 0
    const probs = this.lastOutputs
    for (let i = 0; i < 4; i++) {
      probs[i] = Math.exp(logits[i] - maxLogit)
      expSum += probs[i]
    }
    for (let i = 0; i < 4; i++) probs[i] /= expSum

    // Argmax action selection
    let bestIdx = 0
    let bestProb = probs[0]
    for (let i = 1; i < 4; i++) {
      if (probs[i] > bestProb) {
        bestProb = probs[i]
        bestIdx = i
      }
    }

    this.currentAction = ACTION_NAMES[bestIdx]
    this.confidence = bestProb

    // Incremental learning / growth tick
    this.xp += Math.floor(2 + Math.random() * 4)
    if (this.xp >= this.level * 250 && this.level < 100) {
      this.level++
      this.loss = Math.max(0.0012, (parseFloat(this.loss) * 0.97)).toFixed(4)
      this.certifications = this._getCertifications()
    }

    return {
      action: this.currentAction,
      description: ACTION_DESCRIPTIONS[this.currentAction],
      confidence: (this.confidence * 100).toFixed(1) + '%',
      level: this.level,
      xp: this.xp,
      loss: this.loss,
      certifications: this.certifications
    }
  }

  getRankTitle() {
    if (this.level >= 98) return 'Principal UNRN System Architect & Infrastructure Master'
    if (this.level >= 90) return 'Senior Infrastructure Fellow & Pavement Modeler'
    if (this.level >= 80) return 'Lead Spatial Cartographer & Bridge Dynamics Specialist'
    if (this.level >= 70) return 'Senior Traffic Volumetric & ATC Data Modeler'
    if (this.level >= 50) return 'LCMS 3D Laser & Weighbridge Specialist'
    return 'Junior Data Collector'
  }
}
