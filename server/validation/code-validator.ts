// server/validation/code-validator.ts - VERSION SAFE FINALE

export class CodeValidator {

    static validateAndFix(code: string): {
        code: string
        valid: boolean
        errors: string[]
        warnings: string[]
        fixed: boolean
        fixes: string[]
    } {
        let fixedCode = code
        let fixed = false
        const fixes: string[] = []
        const errors: string[] = []
        const warnings: string[] = []

        // ========================================
        // AUTO-FIXES
        // ========================================

        // 1. Fix angleDegrees
        if (fixedCode.includes('angleDegrees')) {
            fixedCode = fixedCode.replace(/\.workplane\(angleDegrees\s*=\s*(\d+)\)/g, '.workplane(offset=$1.0)')
            fixed = true
            fixes.push('angleDegrees → offset')
        }

        // 2. Fix angle=
        if (fixedCode.includes('angle=')) {
            fixedCode = fixedCode.replace(/\.rotate\(angle\s*=\s*(\d+)\)/g, '.rotate((0,0,0), (0,0,1), $1)')
            fixed = true
            fixes.push('rotate(angle=...) → rotate(...)')
        }

        // 3. Fix integers → floats (VERSION SAFE)
        let integerCount = 0
        const lines = fixedCode.split('\n')
        const processedLines: string[] = []

        for (const line of lines) {
            // Skip comments, imports, ranges
            if (line.trim().startsWith('#') ||
                line.includes('import') ||
                line.includes('range(') ||
                /\[\d+\]/.test(line)) {
                processedLines.push(line)
                continue
            }

            // Fix simple variable assignments: var = 25
            const assignMatch = line.match(/^(\s*)(\w+)\s*=\s*(\d+)\s*$/)
            if (assignMatch) {
                const [, indent, varName, value] = assignMatch
                processedLines.push(`${indent}${varName} = ${value}.0`)
                integerCount++
                continue
            }

            // Fix arithmetic: var = 8 / 2
            const arithmeticMatch = line.match(/^(\s*)(\w+)\s*=\s*(.+)$/)
            if (arithmeticMatch) {
                const [, indent, varName, expression] = arithmeticMatch
                // Replace standalone integers in expression
                const fixedExpr = expression.replace(/\b(\d+)\b/g, (match) => {
                    // Don't fix if already followed by .
                    if (expression.includes(`${match}.`)) return match
                    return `${match}.0`
                })
                if (fixedExpr !== expression) {
                    processedLines.push(`${indent}${varName} = ${fixedExpr}`)
                    integerCount++
                    continue
                }
            }

            processedLines.push(line)
        }

        if (integerCount > 0) {
            fixedCode = processedLines.join('\n')
            fixed = true
            fixes.push(`${integerCount} integers → floats`)
        }

        // ========================================
        // VALIDATIONS
        // ========================================

        if (!fixedCode.includes('import cadquery as cq')) {
            errors.push('CRITICAL: Missing "import cadquery as cq"')
        }

        if (!fixedCode.includes('show_object(')) {
            errors.push('CRITICAL: Missing "show_object(result)"')
        }

        // Paramètres invalides
        if (/centerOption/i.test(fixedCode)) {
            errors.push('CRITICAL: Invalid parameter "centerOption"')
        }

        // Patterns dangereux
        if (/\.sphere\([^)]*\)\.faces\(/i.test(fixedCode)) {
            errors.push('CRITICAL: .sphere().faces() pattern - use .sphere().translate()')
        }

        // Loft validation
        if (fixedCode.includes('.loft()')) {
            const loftIndex = fixedCode.indexOf('.loft()')
            const beforeLoft = fixedCode.substring(Math.max(0, loftIndex - 500), loftIndex)
            const shapeCount = (beforeLoft.match(/\.circle\(|\.rect\(/g) || []).length

            if (shapeCount < 2) {
                errors.push('CRITICAL: .loft() requires at least 2 sections')
            }
        }

        // 3D wire extrusion
        if (fixedCode.includes('.extrude(') &&
            fixedCode.includes('math.cos') &&
            fixedCode.includes('math.sin')) {
            warnings.push('WARNING: 3D path with extrude - use individual struts')
        }

        // Fillet check
        const filletPattern = /\.fillet\((\d+(?:\.\d+)?)\)/g
        let match
        while ((match = filletPattern.exec(fixedCode)) !== null) {
            const radius = parseFloat(match[1])
            if (radius > 10) {
                warnings.push(`WARNING: Large fillet (${radius}mm) may fail`)
            }
        }

        // Complexity
        const complexity = this.analyzeComplexity(fixedCode)
        if (complexity.score > 8) {
            warnings.push(`WARNING: High complexity (${complexity.score}/10)`)
        }

        return {
            code: fixedCode,
            valid: errors.length === 0,
            errors,
            warnings,
            fixed,
            fixes
        }
    }

    private static analyzeComplexity(code: string): { score: number, factors: any } {
        let score = 0
        const factors: any = {}

        factors.unions = (code.match(/\.union\(/g) || []).length
        factors.cuts = (code.match(/\.cut\(/g) || []).length
        score += (factors.unions + factors.cuts) * 0.5

        factors.lofts = (code.match(/\.loft\(/g) || []).length
        score += factors.lofts * 2

        factors.fillets = (code.match(/\.fillet\(/g) || []).length
        score += factors.fillets * 1

        return {
            score: Math.min(10, Math.round(score)),
            factors
        }
    }

    static estimateExecutionTime(code: string): number {
        const complexity = this.analyzeComplexity(code)
        return Math.min(180, 5 + complexity.score * 5)
    }

    static validateCadQueryCode(code: string): {
        valid: boolean
        errors: string[]
        warnings: string[]
    } {
        const result = this.validateAndFix(code)
        return {
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings
        }
    }

    static generateValidationReport(code: string): string {
        const result = this.validateAndFix(code)
        const complexity = this.analyzeComplexity(result.code)

        let report = '=== CODE VALIDATION REPORT ===\n\n'

        if (result.fixed) {
            report += '🔧 AUTO-FIXES:\n'
            result.fixes.forEach(f => report += `  ✓ ${f}\n`)
            report += '\n'
        }

        if (result.errors.length > 0) {
            report += '❌ ERRORS:\n'
            result.errors.forEach(e => report += `  • ${e}\n`)
            report += '\n'
        }

        if (result.warnings.length > 0) {
            report += '⚠️ WARNINGS:\n'
            result.warnings.forEach(w => report += `  • ${w}\n`)
            report += '\n'
        }

        report += `📊 COMPLEXITY: ${complexity.score}/10\n`
        report += result.valid ? '✅ VALID\n' : '❌ INVALID\n'

        return report
    }
}