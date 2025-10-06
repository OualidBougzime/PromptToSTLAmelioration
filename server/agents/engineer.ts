// server/agents/engineer.ts - Agent Ingénieur
import { EventEmitter } from 'events'
import axios from 'axios'

export class EngineerAgent extends EventEmitter {
    private engines = {
        cadquery: 'http://localhost:8788',
        openscad: 'http://localhost:8789',
        jscad: 'http://localhost:8790'
    }

    async engineer(design: any, context: any): Promise<any> {
        this.emit('state', { status: 'engineering', progress: 0 })

        const language = this.selectLanguage(design, context.results.analysis)
        this.emit('state', { status: 'engineering', progress: 20 })

        // PASSE LE PROMPT depuis le context
        const code = await this.generateCADCode(design, language, context.prompt)
        this.emit('state', { status: 'engineering', progress: 60 })

        const validation = await this.validateCode(code, language)
        this.emit('state', { status: 'engineering', progress: 80 })

        const mesh = await this.executeCode(code, language, design)

        this.emit('state', { status: 'complete', progress: 100 })

        return {
            language,
            code,
            validation,
            mesh,
            parameters: this.extractParameters(code),
            documentation: this.generateDocumentation(code, design)
        }
    }

    private selectLanguage(design: any, analysis: any): string {
        // Force CadQuery car il tourne maintenant
        return 'cadquery'
    }

    private async generateCADCode(design: any, language: string, prompt: string): Promise<string> {
        switch (language) {
            case 'cadquery':
                return this.generateCadQueryCode(design, prompt)
            case 'openscad':
                return this.generateOpenSCADCode(design)
            case 'jscad':
                return this.generateJSCADCode(design)
            default:
                throw new Error(`Unsupported language: ${language}`)
        }
    }

    private generateCadQueryCode(design: any, prompt: string = ''): string {
        let code = `import cadquery as cq\n\n`

        const promptLower = prompt.toLowerCase()
        const shape = this.detectShape(promptLower, design)

        code += `# Generated for: ${prompt}\n\n`

        switch (shape) {
            case 'pyramid':
                code += `base_size = 20\nheight = 15\n\n`
                code += `result = (cq.Workplane("XY")\n`
                code += `    .polygon(4, base_size)\n`
                code += `    .workplane(offset=height)\n`
                code += `    .polygon(4, 0.1)\n`
                code += `    .loft())\n`
                break

            case 'cylinder':
                code += `radius = 5\nheight = 20\n\n`
                code += `result = cq.Workplane("XY").circle(radius).extrude(height)\n`
                break

            case 'sphere':
                code += `radius = 10\n\n`
                code += `result = cq.Workplane("XY").sphere(radius)\n`
                break

            default:
                code += `width = 10\nheight = 10\ndepth = 10\n\n`
                code += `result = cq.Workplane("XY").box(width, height, depth)\n`
        }

        code += `\nshow_object(result)\n`
        return code
    }

    private detectShape(prompt: string, design: any): string {
        if (prompt.includes('pyramid') || prompt.includes('cone')) return 'pyramid'
        if (prompt.includes('cylinder') || prompt.includes('tube')) return 'cylinder'
        if (prompt.includes('sphere') || prompt.includes('ball')) return 'sphere'
        if (prompt.includes('phone') && prompt.includes('stand')) return 'phone_stand'
        if (prompt.includes('bracket')) return 'bracket'
        return 'box'
    }

    private generateOpenSCADCode(design: any): string {
        let code = `// Generated OpenSCAD Code\n\n`

        // Paramètres
        code += `// Parameters\n`
        for (const [key, value] of Object.entries(design.concept.parameters || {})) {
            code += `${key} = ${value};\n`
        }
        code += `\n`

        // Module principal
        code += `module main() {\n`

        const mainBody = design.concept.mainBody
        if (mainBody.type === 'primitive-based') {
            const primitive = mainBody.primitives[0]
            switch (primitive.type) {
                case 'box':
                    code += `  cube([width, height, depth], center=true);\n`
                    break
                case 'cylinder':
                    code += `  cylinder(h=height, r=radius, center=true, $fn=64);\n`
                    break
                case 'sphere':
                    code += `  sphere(r=radius, $fn=64);\n`
                    break
            }
        }

        code += `}\n\n`
        code += `main();\n`

        return code
    }

    private generateJSCADCode(design: any): string {
        let code = `// Generated JSCAD Code\n\n`

        code += `function main(params) {\n`
        code += `  const { width = 10, height = 10, depth = 10 } = params;\n\n`

        const mainBody = design.concept.mainBody
        if (mainBody.type === 'primitive-based') {
            const primitive = mainBody.primitives[0]
            switch (primitive.type) {
                case 'box':
                    code += `  return cube({ size: [width, height, depth] });\n`
                    break
                case 'cylinder':
                    code += `  return cylinder({ h: height, r: radius, segments: 64 });\n`
                    break
                case 'sphere':
                    code += `  return sphere({ r: radius, segments: 64 });\n`
                    break
            }
        }

        code += `}\n\n`
        code += `function getParameterDefinitions() {\n`
        code += `  return [\n`
        code += `    { name: 'width', type: 'float', initial: 10, caption: 'Width' },\n`
        code += `    { name: 'height', type: 'float', initial: 10, caption: 'Height' },\n`
        code += `    { name: 'depth', type: 'float', initial: 10, caption: 'Depth' }\n`
        code += `  ];\n`
        code += `}\n`

        return code
    }

    private async validateCode(code: string, language: string): Promise<any> {
        // Validation syntaxique et sémantique
        const validation = {
            syntax: true,
            semantics: true,
            warnings: [],
            errors: []
        }

        try {
            // Envoyer au serveur approprié pour validation
            const response = await axios.post(`${this.engines[language]}/validate`, {
                code
            })

            validation.syntax = response.data.syntax
            validation.warnings = response.data.warnings || []
            validation.errors = response.data.errors || []

        } catch (error) {
            validation.syntax = false
            validation.errors.push(error.message)
        }

        return validation
    }

    private async executeCode(code: string, language: string, design?: any): Promise<any> {
        try {
            const response = await axios.post(`${this.engines[language]}/execute`, {
                code,
                format: 'mesh'
            }, {
                timeout: 3000 // 3 secondes max
            })

            return {
                vertices: response.data.vertices,
                faces: response.data.faces,
                normals: response.data.normals
            }

        } catch (error: any) {
            console.warn(`⚠️ ${language} engine not available, using mock mesh`)

            // Retourne un mesh mock au lieu de crasher
            return this.generateMockMesh()
        }
    }

    // Ajoute cette nouvelle méthode juste après executeCode
    private generateMockMesh(): any {
        // Mesh simple d'un cube 10x10x10
        const s = 5 // demi-taille
        return {
            vertices: [
                // Front face
                -s, -s, s, s, -s, s, s, s, s, -s, s, s,
                // Back face
                -s, -s, -s, s, -s, -s, s, s, -s, -s, s, -s
            ],
            faces: [
                // Front
                0, 1, 2, 0, 2, 3,
                // Back
                4, 6, 5, 4, 7, 6,
                // Left
                4, 0, 3, 4, 3, 7,
                // Right
                1, 5, 6, 1, 6, 2,
                // Top
                3, 2, 6, 3, 6, 7,
                // Bottom
                4, 5, 1, 4, 1, 0
            ],
            normals: []
        }
    }

    private extractParameters(code: string): any {
        const params = {}

        // Extraction basique des paramètres
        const paramPattern = /(\w+)\s*=\s*([\d.]+)/g
        const matches = [...code.matchAll(paramPattern)]

        for (const match of matches) {
            params[match[1]] = parseFloat(match[2])
        }

        return params
    }

    private generateDocumentation(code: string, design: any): string {
        let doc = `# CAD Model Documentation\n\n`

        doc += `## Design Concept\n`
        doc += `- Type: ${design.concept.type}\n`
        doc += `- Approach: ${design.approach}\n\n`

        doc += `## Features\n`
        for (const feature of design.features) {
            doc += `- ${feature.type}: ${JSON.stringify(feature)}\n`
        }

        doc += `\n## Materials\n`
        doc += `- Primary: ${design.materials.primary}\n`
        doc += `- Alternatives: ${design.materials.alternatives.join(', ')}\n`

        doc += `\n## Code\n`
        doc += '```' + design.language + '\n'
        doc += code + '\n'
        doc += '```\n'

        return doc
    }

    async modify(context: any, modification: any): Promise<any> {
        // Modification incrémentale du code
        const currentCode = context.results.engineering.code
        const language = context.results.engineering.language

        let modifiedCode = currentCode

        if (modification.type === 'parameter') {
            // Modification simple de paramètre
            const pattern = new RegExp(`${modification.parameter}\\s*=\\s*[\\d.]+`, 'g')
            modifiedCode = currentCode.replace(pattern, `${modification.parameter} = ${modification.value}`)
        } else if (modification.type === 'feature') {
            // Ajout/suppression de feature
            modifiedCode = await this.modifyFeature(currentCode, modification, language)
        }

        // Revalider et exécuter
        const validation = await this.validateCode(modifiedCode, language)
        const mesh = await this.executeCode(modifiedCode, language)

        return {
            language,
            code: modifiedCode,
            validation,
            mesh,
            parameters: this.extractParameters(modifiedCode)
        }
    }

    private async modifyFeature(code: string, modification: any, language: string): Promise<string> {
        // Logique de modification de features
        // À implémenter selon le langage
        return code
    }

    receiveMessage(msg: any): void {
        if (msg.type === 'request') {
            switch (msg.content.action) {
                case 'validate':
                    this.validateCode(msg.content.code, msg.content.language)
                        .then(result => {
                            this.emit('message', {
                                to: msg.from,
                                type: 'response',
                                content: { validation: result }
                            })
                        })
                    break

                case 'suggest':
                    // Suggestions d'améliorations techniques
                    this.emit('message', {
                        to: msg.from,
                        type: 'response',
                        content: {
                            suggestions: [
                                'Add fillets to reduce stress concentration',
                                'Consider draft angles for molding',
                                'Optimize wall thickness for 3D printing'
                            ]
                        }
                    })
                    break
            }
        }
    }
}