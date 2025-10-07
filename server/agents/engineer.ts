// server/agents/engineer.ts - VERSION AVANCÉE
import { EventEmitter } from 'events'
import axios from 'axios'
import { PatternGenerators } from '../generators/pattern-generators'

export class EngineerAgent extends EventEmitter {
    private engines = {
        cadquery: 'http://localhost:8788'
    }

    async engineer(design: any, context: any): Promise<any> {
        this.emit('state', { status: 'engineering', progress: 0 })

        // Utiliser l'analyse géométrique du context
        const analysis = context.results?.analyzer

        if (analysis?.isAdvancedPattern && analysis.pattern) {
            console.log(`✅ Engineering advanced pattern: ${analysis.pattern.type}`)
            const code = this.generatePatternCode(analysis.pattern)

            const validation = await this.validateCode(code)
            const mesh = await this.executeCode(code)

            return {
                language: 'cadquery',
                code,
                validation,
                mesh,
                parameters: analysis.pattern.params || {},
                documentation: `# ${analysis.pattern.type}\n\nGenerated from pattern library`
            }
        }

        if (!analysis || !analysis.geometry) {
            console.warn('⚠️ No analysis found, using fallback geometry')
            // Créer une géométrie par défaut
            return this.generateFallbackCode(context.prompt)
        }

        this.emit('state', { status: 'engineering', progress: 20 })

        // Générer le code basé sur l'arbre géométrique
        const code = this.generateAdvancedCode(analysis.geometry, context.prompt)
        this.emit('state', { status: 'engineering', progress: 60 })

        const validation = await this.validateCode(code)
        this.emit('state', { status: 'engineering', progress: 80 })

        const mesh = await this.executeCode(code)
        this.emit('state', { status: 'complete', progress: 100 })

        return {
            language: 'cadquery',
            code,
            validation,
            mesh,
            parameters: this.extractParameters(code),
            documentation: this.generateDocumentation(code, analysis)
        }
    }

    private generatePatternCode(pattern: any): string {
        console.log(`🎯 Generating code for pattern: ${pattern.type}`)

        switch (pattern.type) {
            case 'composite':
                return this.generateCompositeCode(pattern)

            case 'enclosure':
                return PatternGenerators.enclosure(pattern.params)

            case 'motor-mount':
                return PatternGenerators.motorMount(pattern.params)

            case 'cable-clip':
                return PatternGenerators.cableClip(pattern.params)

            default:
                console.warn(`⚠️ Unknown pattern: ${pattern.type}`)
                return this.generateFallbackCode('Unknown pattern')
        }
    }

    private generateCompositeCode(pattern: any): string {
        // Générer du code pour des formes composites (multi-pièces)
        return PatternGenerators.phoneHolder(pattern.components[0].params)
    }

    private generateAdvancedCode(geometry: any, prompt: string): string {
        let code = `import cadquery as cq\n\n`
        code += `# Generated from: ${prompt}\n\n`

        // 1. Définir les paramètres
        code += this.generateParameters(geometry)
        code += `\n`

        // 2. Créer la forme principale
        code += `# Main shape\n`
        code += this.generateMainShape(geometry.root)
        code += `\n`

        // 3. Appliquer les opérations
        if (geometry.operations.length > 0) {
            code += `# Operations\n`
            for (const operation of geometry.operations) {
                code += this.generateOperation(operation)
                code += `\n`
            }
        }

        // 4. Ajouter les features
        if (geometry.features.length > 0) {
            code += `# Features\n`
            for (const feature of geometry.features) {
                code += this.generateFeature(feature)
                code += `\n`
            }
        }

        code += `show_object(result)\n`
        return code
    }

    private generateParameters(geometry: any): string {
        let code = `# Parameters\n`

        const root = geometry.root
        if (!root) return code

        switch (root.type) {
            case 'box':
                code += `width = ${root.params.width}\n`
                code += `height = ${root.params.height}\n`
                code += `depth = ${root.params.depth}\n`
                break

            case 'cylinder':
                code += `radius = ${root.params.radius}\n`
                code += `height = ${root.params.height}\n`
                break

            case 'sphere':
                code += `radius = ${root.params.radius}\n`
                break

            case 'cone':
                code += `radius = ${root.params.radius}\n`
                code += `height = ${root.params.height}\n`
                break

            case 'torus':
                code += `major_radius = ${root.params.majorRadius}\n`
                code += `minor_radius = ${root.params.minorRadius}\n`
                break
        }

        return code
    }

    private generateMainShape(root: any): string {
        if (!root) return 'result = cq.Workplane("XY").box(10, 10, 10)\n'

        switch (root.type) {
            case 'box':
                return `result = (cq.Workplane("XY")
    .box(width, height, depth))\n`

            case 'cylinder':
                return `result = (cq.Workplane("XY")
    .circle(radius)
    .extrude(height))\n`

            case 'sphere':
                return `result = cq.Workplane("XY").sphere(radius)\n`

            case 'cone':
                return `result = (cq.Workplane("XY")
    .circle(radius)
    .workplane(offset=height)
    .circle(0.1)
    .loft())\n`

            case 'torus':
                return `result = (cq.Workplane("XY")
    .circle(major_radius + minor_radius)
    .circle(major_radius - minor_radius)
    .extrude(minor_radius * 2)
    .revolve(360, (0, 0, 0), (0, 1, 0)))\n`

            default:
                return `result = cq.Workplane("XY").box(10, 10, 10)\n`
        }
    }

    private generateOperation(operation: any): string {
        const { type, shape, params } = operation
        let code = ''

        // Créer la forme secondaire
        const secondaryShape = this.generateSecondaryShape(shape, params)

        switch (type) {
            case 'subtract':
                code += `# Subtract operation\n`
                code += `secondary = ${secondaryShape}\n`
                code += `result = result.cut(secondary)\n`
                break

            case 'union':
                code += `# Union operation\n`
                code += `secondary = ${secondaryShape}\n`
                code += `result = result.union(secondary)\n`
                break

            case 'intersect':
                code += `# Intersect operation\n`
                code += `secondary = ${secondaryShape}\n`
                code += `result = result.intersect(secondary)\n`
                break
        }

        return code
    }

    private generateSecondaryShape(shapeType: string, params: any): string {
        switch (shapeType) {
            case 'box':
                return `(cq.Workplane("XY")
    .box(${params.width}, ${params.height}, ${params.depth}))`

            case 'cylinder':
                return `(cq.Workplane("XY")
    .circle(${params.radius})
    .extrude(${params.height}))`

            case 'sphere':
                return `cq.Workplane("XY").sphere(${params.radius})`

            case 'cone':
                return `(cq.Workplane("XY")
    .circle(${params.radius})
    .workplane(offset=${params.height})
    .circle(0.1)
    .loft())`

            default:
                return `cq.Workplane("XY").box(5, 5, 5)`
        }
    }

    private generateFeature(feature: any): string {
        const { type, params, location } = feature
        let code = ''

        switch (type) {
            case 'fillet':
                code += `# Add fillet\n`
                if (location === 'all') {
                    code += `result = result.edges().fillet(${params.radius || 1})\n`
                } else {
                    code += `result = result.edges("|Z").fillet(${params.radius || 1})\n`
                }
                break

            case 'chamfer':
                code += `# Add chamfer\n`
                if (location === 'all') {
                    code += `result = result.edges().chamfer(${params.radius || 1})\n`
                } else {
                    code += `result = result.edges("|Z").chamfer(${params.radius || 1})\n`
                }
                break

            case 'hole':
                code += `# Add hole\n`
                const dia = params.diameter || 3
                const depth = params.depth || 10

                if (location === 'center') {
                    code += `result = (result
    .faces(">Z")
    .workplane()
    .circle(${dia / 2})
    .cutThruAll())\n`
                } else if (location === 'top') {
                    code += `result = (result
    .faces(">Z")
    .workplane()
    .circle(${dia / 2})
    .cutBlind(-${depth}))\n`
                }
                break

            case 'pattern':
                code += `# Add pattern\n`
                code += `result = result.rarray(10, 10, 3, 3)\n`
                break

            case 'thread':
                code += `# Add thread (simplified)\n`
                code += `# Note: Full thread implementation would require helix\n`
                break
        }

        return code
    }

    private async validateCode(code: string): Promise<any> {
        try {
            const response = await axios.post(`${this.engines.cadquery}/validate`, {
                code
            }, { timeout: 300000 })

            return {
                syntax: response.data.syntax,
                warnings: response.data.warnings || [],
                errors: response.data.errors || []
            }
        } catch (error: any) {
            console.warn('⚠️ Validation unavailable:', error.message)
            return {
                syntax: true,
                warnings: ['Validation service unavailable'],
                errors: []
            }
        }
    }

    private async executeCode(code: string): Promise<any> {
        try {
            const response = await axios.post(`${this.engines.cadquery}/execute`, {
                code,
                format: 'mesh'
            }, { timeout: 300000 })

            return {
                vertices: response.data.vertices,
                faces: response.data.faces,
                normals: response.data.normals || []
            }
        } catch (error: any) {
            console.warn(`⚠️ CadQuery engine not available: ${error.message}`)
            return this.generateMockMesh()
        }
    }

    private generateMockMesh(): any {
        const s = 5
        return {
            vertices: [
                -s, -s, s, s, -s, s, s, s, s, -s, s, s,
                -s, -s, -s, s, -s, -s, s, s, -s, -s, s, -s
            ],
            faces: [
                0, 1, 2, 0, 2, 3,
                4, 6, 5, 4, 7, 6,
                4, 0, 3, 4, 3, 7,
                1, 5, 6, 1, 6, 2,
                3, 2, 6, 3, 6, 7,
                4, 5, 1, 4, 1, 0
            ],
            normals: []
        }
    }

    private extractParameters(code: string): any {
        const params: any = {}
        const paramPattern = /(\w+)\s*=\s*([\d.]+)/g
        const matches = [...code.matchAll(paramPattern)]

        for (const match of matches) {
            params[match[1]] = parseFloat(match[2])
        }

        return params
    }

    private generateDocumentation(code: string, analysis: any): string {
        let doc = `# CAD Model Documentation\n\n`

        doc += `## Design Analysis\n`
        doc += `- Complexity: ${analysis.complexity.level}\n`
        doc += `- Shapes: ${analysis.complexity.factors.shapes}\n`
        doc += `- Features: ${analysis.complexity.factors.features}\n\n`

        doc += `## Generated Code\n`
        doc += '```python\n'
        doc += code + '\n'
        doc += '```\n'

        return doc
    }
    private generateFallbackCode(prompt: string): any {
        console.log('⚠️ Using fallback code generation')

        const code = `import cadquery as cq

        # Fallback for: ${prompt}
        width = 10
        height = 10
        depth = 10

        result = (cq.Workplane("XY")
            .box(width, height, depth))

        show_object(result)
        `

                return {
                    language: 'cadquery',
                    code,
                    validation: { syntax: true, warnings: [], errors: [] },
                    mesh: this.generateMockMesh(),
                    parameters: { width: 10, height: 10, depth: 10 },
                    documentation: `# Fallback code for: ${prompt}`
                }
            }
}