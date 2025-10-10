// server/validation/code-validator.ts

export class CodeValidator {
    /**
     * Valide le code CadQuery avant exécution
     */
    static validateCadQueryCode(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = []
        const warnings: string[] = []

        // 1. Vérifier imports
        if (!code.includes('import cadquery as cq')) {
            errors.push('Missing: import cadquery as cq')
        }

        // 2. Vérifier show_object
        if (!code.includes('show_object(')) {
            errors.push('Missing: show_object(result)')
        }

        // 3. Détecter nombres entiers (devrait être float)
        const integerPattern = /=\s*(\d{1,3})(?![.\d])/g
        const integers = code.match(integerPattern)
        if (integers && integers.length > 5) {
            warnings.push(`Found ${integers.length} integer literals. Should use floats: 10.0 not 10`)
        }

        // 4. Détecter fillet potentiellement dangereux
        const filletPattern = /\.fillet\((\d+)\)/g
        const fillets = Array.from(code.matchAll(filletPattern))
        fillets.forEach(match => {
            const radius = parseInt(match[1])
            if (radius > 10) {
                warnings.push(`Large fillet radius (${radius}mm) may fail. Ensure it's < wall thickness`)
            }
        })

        // 5. Détecter boucles excessives
        const forLoopPattern = /for\s+\w+\s+in\s+range\((\d+)\)/g
        const loops = Array.from(code.matchAll(forLoopPattern))
        loops.forEach(match => {
            const iterations = parseInt(match[1])
            if (iterations > 100) {
                warnings.push(`Large loop (${iterations} iterations) may cause timeout`)
            }
        })

        // 6. Vérifier utilisation .close() pour wires
        if (code.includes('.lineTo(') || code.includes('.threePointArc(')) {
            if (!code.includes('.close()')) {
                warnings.push('2D sketch operations detected. Consider adding .close() to ensure wires are closed')
            }
        }

        // 7. Détecter patterns dangereux
        if (code.includes('.sphere().faces(')) {
            errors.push('Dangerous pattern: .sphere().faces() causes errors. Use .sphere().translate() instead')
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Estime le temps d'exécution
     */
    static estimateExecutionTime(code: string): number {
        let timeEstimate = 5 // Base: 5 seconds

        // Count operations
        const unionCount = (code.match(/\.union\(/g) || []).length
        const cutCount = (code.match(/\.cut\(/g) || []).length
        const filletCount = (code.match(/\.fillet\(/g) || []).length

        timeEstimate += unionCount * 2
        timeEstimate += cutCount * 2
        timeEstimate += filletCount * 1

        // Check for loops
        const forLoops = code.match(/for\s+\w+\s+in\s+range\((\d+)\)/g)
        if (forLoops) {
            forLoops.forEach(loop => {
                const iterations = parseInt(loop.match(/\d+/)![0])
                if (iterations > 10) {
                    timeEstimate += iterations * 0.5
                }
            })
        }

        return Math.min(timeEstimate, 180) // Cap at 3 minutes
    }
}