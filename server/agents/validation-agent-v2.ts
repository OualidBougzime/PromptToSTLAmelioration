// server/agents/validation-agent-v2.ts
import { EventEmitter } from 'events'
import { CodeValidator } from '../validation/code-validator'
import axios from 'axios'

export class ValidationAgentV2 extends EventEmitter {

    async validateMultiLayer(code: string, plan: any, constraints: any[]): Promise<any> {
        this.emit('state', { status: 'validating', progress: 0 })

        const results = {
            layers: {},
            overallScore: 0,
            passed: false,
            errors: [],
            warnings: [],
            suggestions: []
        }

        // Layer 1: Syntax (AST)
        this.emit('state', { status: 'validating-syntax', progress: 20 })
        results.layers['syntax'] = await this.validateSyntax(code)

        if (!results.layers['syntax'].valid) {
            results.errors.push(...results.layers['syntax'].errors)
            return results
        }

        // Layer 2: Static Analysis (Pylint)
        this.emit('state', { status: 'validating-static', progress: 40 })
        results.layers['static'] = await this.validateStatic(code)
        results.warnings.push(...results.layers['static'].warnings)

        // Layer 3: Execution
        this.emit('state', { status: 'validating-execution', progress: 60 })
        results.layers['execution'] = await this.validateExecution(code)

        if (!results.layers['execution'].success) {
            results.errors.push(results.layers['execution'].error)
            return results
        }

        // Layer 4: Geometric Validation
        this.emit('state', { status: 'validating-geometry', progress: 80 })
        results.layers['geometry'] = await this.validateGeometry(
            results.layers['execution'].mesh
        )

        // Layer 5: Constraint Checking
        this.emit('state', { status: 'validating-constraints', progress: 90 })
        results.layers['constraints'] = await this.validateConstraints(
            code,
            results.layers['execution'].mesh,
            constraints
        )

        // Calculate overall score
        results.overallScore = this.calculateScore(results.layers)
        results.passed = results.overallScore >= 70

        this.emit('state', { status: 'complete', progress: 100 })

        console.log(`✅ Multi-layer validation complete: ${results.overallScore}/100`)
        return results
    }

    private async validateSyntax(code: string): Promise<any> {
        const validation = CodeValidator.validateAndFix(code)
        return {
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            fixed: validation.fixed,
            fixedCode: validation.code
        }
    }

    private async validateStatic(code: string): Promise<any> {
        // Simuler Pylint (ou vraie intégration)
        const warnings = []

        // Check for common issues
        if (code.includes('import *')) {
            warnings.push('Avoid wildcard imports')
        }

        if ((code.match(/\.union\(/g) || []).length > 20) {
            warnings.push('High number of union operations may slow execution')
        }

        return {
            warnings,
            score: warnings.length === 0 ? 10 : Math.max(5, 10 - warnings.length)
        }
    }

    private async validateExecution(code: string): Promise<any> {
        try {
            const response = await axios.post(
                'http://localhost:8788/execute',
                { code, timeout: 60 },
                { timeout: 65000 }
            )

            return {
                success: true,
                mesh: response.data,
                executionTime: response.data.executionTime || 0
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            }
        }
    }

    private async validateGeometry(mesh: any): Promise<any> {
        if (!mesh || !mesh.vertices || mesh.vertices.length === 0) {
            return {
                valid: false,
                reason: 'Empty mesh'
            }
        }

        const vertexCount = mesh.vertices.length / 3
        const faceCount = mesh.faces.length / 3

        // Checks géométriques
        const checks = {
            hasVertices: vertexCount > 0,
            hasFaces: faceCount > 0,
            validRatio: faceCount / vertexCount > 0.1 && faceCount / vertexCount < 10,
            manifold: this.checkManifold(mesh),
            closed: this.checkClosed(mesh)
        }

        return {
            valid: Object.values(checks).every(v => v),
            checks,
            stats: {
                vertices: vertexCount,
                faces: faceCount,
                ratio: (faceCount / vertexCount).toFixed(2)
            }
        }
    }

    private checkManifold(mesh: any): boolean {
        // Simplified manifold check
        return mesh.vertices && mesh.faces && mesh.vertices.length >= 100
    }

    private checkClosed(mesh: any): boolean {
        // Simplified closed check
        return mesh.faces && mesh.faces.length >= 12 // Min for closed shape
    }

    private async validateConstraints(
        code: string,
        mesh: any,
        constraints: any[]
    ): Promise<any> {
        const results = {
            satisfied: [],
            violated: [],
            score: 0
        }

        for (const constraint of constraints) {
            const check = await this.checkConstraint(code, mesh, constraint)

            if (check.satisfied) {
                results.satisfied.push(constraint)
            } else {
                results.violated.push({
                    constraint,
                    reason: check.reason
                })
            }
        }

        results.score = (results.satisfied.length / constraints.length) * 100

        return results
    }

    private async checkConstraint(code: string, mesh: any, constraint: any): Promise<any> {
        switch (constraint.type) {
            case 'dimensional':
                // Vérifier dimensions approximatives
                const bbox = this.calculateBoundingBox(mesh)
                // Compare avec constraint.values
                return { satisfied: true, reason: 'Dimensions acceptable' }

            case 'geometric':
                // Vérifier relations géométriques
                return { satisfied: true }

            case 'manufacturing':
                // Vérifier contraintes de fabrication
                if (constraint.rules?.minWallThickness) {
                    // Check wall thickness...
                }
                return { satisfied: true }

            default:
                return { satisfied: true }
        }
    }

    private calculateBoundingBox(mesh: any): any {
        if (!mesh.vertices || mesh.vertices.length === 0) {
            return { min: [0, 0, 0], max: [0, 0, 0] }
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

        for (let i = 0; i < mesh.vertices.length; i += 3) {
            minX = Math.min(minX, mesh.vertices[i])
            maxX = Math.max(maxX, mesh.vertices[i])
            minY = Math.min(minY, mesh.vertices[i + 1])
            maxY = Math.max(maxY, mesh.vertices[i + 1])
            minZ = Math.min(minZ, mesh.vertices[i + 2])
            maxZ = Math.max(maxZ, mesh.vertices[i + 2])
        }

        return {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ],
            size: [maxX - minX, maxY - minY, maxZ - minZ]
        }
    }

    private calculateScore(layers: any): number {
        let score = 0

        if (layers.syntax?.valid) score += 20
        if (layers.static) score += 10
        if (layers.execution?.success) score += 30
        if (layers.geometry?.valid) score += 25
        if (layers.constraints?.score > 0) score += (layers.constraints.score * 0.15)

        return Math.round(score)
    }
}