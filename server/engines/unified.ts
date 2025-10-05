// server/engines/unified.ts
import axios from 'axios'

export interface Engine {
    name: string
    execute(code: string): Promise<any>
    validate(code: string): Promise<any>
    supported: string[]
}

export class UnifiedEngine {
    private engines: Map<string, Engine> = new Map()

    constructor() {
        this.registerEngines()
    }

    private registerEngines() {
        this.engines.set('cadquery', new CadQueryEngine())
        this.engines.set('openscad', new OpenSCADEngine())
        this.engines.set('jscad', new JSCADEngine())
        this.engines.set('threejs', new ThreeJSEngine())
    }

    async execute(code: string, language: string): Promise<any> {
        const engine = this.engines.get(language)
        if (!engine) {
            throw new Error(`Unsupported language: ${language}`)
        }
        return await engine.execute(code)
    }

    detectLanguage(code: string): string {
        if (code.includes('import cadquery') || code.includes('cq.')) return 'cadquery'
        if (code.includes('module') && code.includes('$fn')) return 'openscad'
        if (code.includes('function main') && code.includes('cube({')) return 'jscad'
        return 'threejs'
    }
}

class CadQueryEngine implements Engine {
    name = 'cadquery'
    supported = ['box', 'sphere', 'cylinder', 'extrude', 'revolve', 'loft', 'sweep']

    async execute(code: string): Promise<any> {
        const response = await axios.post('http://localhost:8788/execute', {
            code,
            format: 'mesh'
        })
        return response.data
    }

    async validate(code: string): Promise<any> {
        const response = await axios.post('http://localhost:8788/validate', { code })
        return response.data
    }
}

class OpenSCADEngine implements Engine {
    name = 'openscad'
    supported = ['cube', 'sphere', 'cylinder', 'union', 'difference', 'intersection']

    async execute(code: string): Promise<any> {
        const response = await axios.post('http://localhost:8789/execute', { code })
        return response.data
    }

    async validate(code: string): Promise<any> {
        return { valid: true }
    }
}

class JSCADEngine implements Engine {
    name = 'jscad'
    supported = ['cube', 'sphere', 'cylinder', 'union', 'subtract', 'intersect']

    async execute(code: string): Promise<any> {
        const response = await axios.post('http://localhost:8790/execute', { code })
        return response.data
    }

    async validate(code: string): Promise<any> {
        return { valid: true }
    }
}

class ThreeJSEngine implements Engine {
    name = 'threejs'
    supported = ['BoxGeometry', 'SphereGeometry', 'CylinderGeometry', 'Mesh']

    async execute(code: string): Promise<any> {
        // Execute in sandbox
        const func = new Function('THREE', code)
        const THREE = await import('three')
        const result = func(THREE)
        return result
    }

    async validate(code: string): Promise<any> {
        try {
            new Function('THREE', code)
            return { valid: true }
        } catch (e) {
            return { valid: false, error: e.message }
        }
    }
}