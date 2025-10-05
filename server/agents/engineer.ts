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

        // 1. Sélectionner le meilleur langage CAD
        const language = this.selectLanguage(design, context.results.analysis)
        this.emit('state', { status: 'engineering', progress: 20 })

        // 2. Générer le code CAD
        const code = await this.generateCADCode(design, language)
        this.emit('state', { status: 'engineering', progress: 60 })

        // 3. Valider le code
        const validation = await this.validateCode(code, language)
        this.emit('state', { status: 'engineering', progress: 80 })

        // 4. Exécuter et obtenir le mesh
        const mesh = await this.executeCode(code, language)

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
        // Sélection intelligente du langage
        const scores = {
            cadquery: 0,
            openscad: 0,
            jscad: 0
        }

        // CadQuery pour complexité élevée
        if (analysis.complexity > 0.7) scores.cadquery += 30
        if (design.concept.type === 'organic') scores.cadquery += 20
        if (design.features.some(f => f.type === 'spline')) scores.cadquery += 20

        // OpenSCAD pour paramétrique simple
        if (design.concept.type === 'primitive-based') scores.openscad += 30
        if (analysis.complexity < 0.5) scores.openscad += 20
        if (design.operations.every(op => ['union', 'difference', 'intersection'].includes(op.type))) {
            scores.openscad += 20
        }

        // JSCAD pour web natif
        if (analysis.entities.properties.includes('interactive')) scores.jscad += 30
        if (analysis.domain === 'web') scores.jscad += 20

        // Retourner le meilleur score
        return Object.entries(scores).reduce((a, b) =>
            scores[a] > scores[b[1]] ? a : b[0]
        ) as string
    }

    private async generateCADCode(design: any, language: string): Promise<string> {
        switch (language) {
            case 'cadquery':
                return this.generateCadQueryCode(design)
            case 'openscad':
                return this.generateOpenSCADCode(design)
            case 'jscad':
                return this.generateJSCADCode(design)
            default:
                throw new Error(`Unsupported language: ${language}`)
        }
    }

    private generateCadQueryCode(design: any): string {
        let code = `import cadquery as cq\n\n`

        // Paramètres
        code += `# Parameters\n`
        for (const [key, value] of Object.entries(design.concept.parameters || {})) {
            code += `${key} = ${value}\n`
        }
        code += `\n`

        // Corps principal
        code += `# Main body\n`
        const mainBody = design.concept.mainBody

        if (mainBody.type === 'primitive-based') {
            const primitive = mainBody.primitives[0]
            switch (primitive.type) {
                case 'box':
                    code += `result = cq.Workplane("XY").box(width, height, depth)\n`
                    break
                case 'cylinder':
                    code += `result = cq.Workplane("XY").circle(radius).extrude(height)\n`
                    break
                case 'sphere':
                    code += `result = cq.Workplane("XY").sphere(radius)\n`
                    break
            }
        } else if (mainBody.type === 'organic') {
            code += `# Organic form using splines and lofts\n`
            code += `result = cq.Workplane("XY").spline([...]).loft([...])\n`
        }

        // Features
        code += `\n# Features\n`
        for (const feature of design.features) {
            switch (feature.type) {
                case 'holes':
                    code += `result = result.faces(">Z").workplane().rarray(${feature.spacing}, ${feature.spacing}, ${feature.count}, ${feature.count}).hole(${feature.diameter})\n`
                    break
                case 'fillets':
                    code += `result = result.edges().fillet(${feature.radius})\n`
                    break
                case 'chamfers':
                    code += `result = result.edges().chamfer(${feature.distance})\n`
                    break
            }
        }

        code += `\n# Export\n`
        code += `show_object(result)\n`

        return code
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

    private async executeCode(code: string, language: string): Promise<any> {
        try {
            const response = await axios.post(`${this.engines[language]}/execute`, {
                code,
                format: 'mesh'
            })

            return {
                vertices: response.data.vertices,
                faces: response.data.faces,
                normals: response.data.normals
            }

        } catch (error) {
            console.error(`Erreur exécution ${language}:`, error)
            throw error
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