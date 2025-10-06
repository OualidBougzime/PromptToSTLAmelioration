// server/learning/ml-engine.ts - Version simplifiée sans TensorFlow
export class MLEngine {
    private patterns: Map<string, any> = new Map()

    constructor() {
        console.log('✅ ML Engine initialized (simple mode - no TensorFlow)')
    }

    async learn(prompt: string, result: any): Promise<void> {
        // Store pattern for simple analysis
        const pattern = {
            prompt,
            result,
            timestamp: Date.now(),
            success: result.validation?.score > 70
        }

        this.patterns.set(prompt, pattern)
        console.log(`📚 Learned pattern: ${prompt} (${this.patterns.size} total)`)
    }

    async getSuggestions(prompt: string): Promise<string[]> {
        const suggestions: string[] = []

        // Find similar patterns based on keywords
        const similar = this.findSimilarPatterns(prompt)

        similar.forEach(pattern => {
            if (pattern.success) {
                suggestions.push(`Similar to: ${pattern.prompt}`)
            }
        })

        // Add generic suggestions based on keywords
        if (prompt.toLowerCase().includes('gear')) {
            suggestions.push('Consider adding tooth profile details')
            suggestions.push('Specify module or pitch')
        }
        if (prompt.toLowerCase().includes('box')) {
            suggestions.push('Add wall thickness parameter')
            suggestions.push('Consider adding mounting holes')
        }

        return suggestions.slice(0, 5)
    }

    async getInsights(): Promise<any> {
        const insights = {
            totalPatterns: this.patterns.size,
            successRate: this.calculateSuccessRate(),
            commonFeatures: this.extractCommonFeatures(),
            trends: this.analyzeTrends()
        }

        return insights
    }

    async predict(prompt: string): Promise<any> {
        // Simple prediction based on patterns
        const similar = this.findSimilarPatterns(prompt)

        if (similar.length === 0) {
            return {
                suggestions: ['Try being more specific with dimensions'],
                confidence: 0.3
            }
        }

        return {
            suggestions: similar.slice(0, 3).map(p =>
                `Based on similar: ${p.prompt}`
            ),
            confidence: similar[0].similarity
        }
    }

    private findSimilarPatterns(prompt: string): any[] {
        const words = new Set(prompt.toLowerCase().split(' '))
        const similar: any[] = []

        this.patterns.forEach((pattern, key) => {
            const patternWords = new Set(key.toLowerCase().split(' '))
            const intersection = new Set([...words].filter(x => patternWords.has(x)))
            const similarity = intersection.size / Math.max(words.size, patternWords.size)

            if (similarity > 0.3) {
                similar.push({ ...pattern, similarity })
            }
        })

        return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
    }

    private calculateSuccessRate(): number {
        if (this.patterns.size === 0) return 0

        let success = 0
        this.patterns.forEach(pattern => {
            if (pattern.success) success++
        })
        return (success / this.patterns.size) * 100
    }

    private extractCommonFeatures(): string[] {
        const features = new Map<string, number>()

        this.patterns.forEach(pattern => {
            const words = pattern.prompt.toLowerCase().split(' ')
            words.forEach(word => {
                if (word.length > 3) { // Ignore short words
                    features.set(word, (features.get(word) || 0) + 1)
                }
            })
        })

        return Array.from(features.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([feature]) => feature)
    }

    private analyzeTrends(): any {
        const trends = {
            complexity: [],
            success: [],
            recentPatterns: []
        }

        // Get last 10 patterns
        const recent = Array.from(this.patterns.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10)

        trends.recentPatterns = recent.map(p => ({
            prompt: p.prompt,
            success: p.success,
            timestamp: new Date(p.timestamp).toISOString()
        }))

        return trends
    }
}