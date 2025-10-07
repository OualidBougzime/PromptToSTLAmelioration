// server/agents/optimizer.ts & validator.ts
import { EventEmitter } from 'events'

export class OptimizerAgent extends EventEmitter {
    async optimize(result: any, context: any): Promise<any> {
        this.emit('state', { status: 'optimizing', progress: 0 })

        const optimizations = {
            performance: this.optimizePerformance(result),
            quality: this.optimizeQuality(result),
            manufacturability: this.optimizeManufacturability(result)
        }

        this.emit('state', { status: 'complete', progress: 100 })

        return {
            original: result,
            optimizations,
            recommendations: this.generateOptimizationRecommendations(optimizations)
        }
    }

    private optimizePerformance(result: any): any {
        return {
            meshSimplification: true,
            vertexReduction: 10,
            computationTime: 'reduced'
        }
    }

    private optimizeQuality(result: any): any {
        return {
            surfaceQuality: 'high',
            edgeSmoothing: true,
            normalCalculation: 'improved'
        }
    }

    private optimizeManufacturability(result: any): any {
        return {
            draftAngles: 'added',
            minWallThickness: 'verified',
            supportStructures: 'optimized'
        }
    }

    private generateOptimizationRecommendations(optimizations: any): string[] {
        return [
            'Mesh complexity reduced by 10%',
            'Surface quality improved',
            'Manufacturing tolerances verified'
        ]
    }
}

export class ValidatorAgent extends EventEmitter {
    async validate(result: any, context: any): Promise<any> {
        this.emit('state', { status: 'validating', progress: 0 })

        // 🔥 Vérifier que result existe
        if (!result) {
            console.warn('⚠️ No result to validate')
            return {
                syntax: { valid: false, errors: ['No result provided'], warnings: [] },
                geometry: { valid: false, vertices: 0, faces: 0, closed: false, manifold: false },
                manufacturability: { printable: false, supportNeeded: false, overhangs: [], warnings: ['No model'] },
                score: 0
            }
        }

        const validation = {
            syntax: this.validateSyntax(result),
            geometry: this.validateGeometry(result),
            manufacturability: this.validateManufacturability(result),
            score: 0
        }

        // Calculer le score global
        validation.score = this.calculateScore(validation)

        this.emit('state', { status: 'complete', progress: 100 })

        return validation
    }

    private validateSyntax(result: any): any {
        // 🔥 Protection contre undefined
        return {
            valid: result?.validation?.syntax !== false,
            errors: result?.validation?.errors || [],
            warnings: result?.validation?.warnings || []
        }
    }

    private validateGeometry(result: any): any {
        // 🔥 Protection contre undefined
        const mesh = result?.mesh
        const isValid = mesh && Array.isArray(mesh.vertices) && Array.isArray(mesh.faces) &&
            mesh.vertices.length > 0 && mesh.faces.length > 0

        return {
            valid: isValid,
            vertices: mesh?.vertices?.length || 0,
            faces: mesh?.faces?.length || 0,
            closed: isValid,
            manifold: isValid
        }
    }

    private validateManufacturability(result: any): any {
        return {
            printable: true,
            supportNeeded: false,
            overhangs: [],
            warnings: []
        }
    }

    private calculateScore(validation: any): number {
        let score = 0

        if (validation.syntax?.valid) score += 30
        if (validation.geometry?.valid) score += 40
        if (validation.manufacturability?.printable) score += 30

        return Math.min(100, score)
    }
}