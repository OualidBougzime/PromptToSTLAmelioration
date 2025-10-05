// server/learning/ml-engine.ts
import * as tf from '@tensorflow/tfjs-node'

export class MLEngine {
    private model: tf.LayersModel | null = null
    private patterns: Map<string, any> = new Map()

    constructor() {
        this.initializeModel()
    }

    private async initializeModel() {
        try {
            // Try to load existing model
            this.model = await tf.loadLayersModel('file://./models/cad-generator/model.json')
        } catch {
            // Create new model if not exists
            this.model = this.createModel()
        }
    }

    private createModel(): tf.LayersModel {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [100], units: 128, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 64, activation: 'relu' }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dense({ units: 10, activation: 'softmax' })
            ]
        })

        model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        })

        return model
    }

    async learn(prompt: string, result: any): Promise<void> {
        // Store pattern for analysis
        const pattern = {
            prompt,
            result,
            timestamp: Date.now(),
            success: result.validation?.score > 70
        }

        this.patterns.set(prompt, pattern)

        // Periodic training
        if (this.patterns.size % 10 === 0) {
            await this.train()
        }
    }

    private async train(): Promise<void> {
        if (this.patterns.size < 10) return

        // Prepare training data
        const xs: number[][] = []
        const ys: number[][] = []

        this.patterns.forEach((pattern) => {
            xs.push(this.promptToVector(pattern.prompt))
            ys.push(this.resultToVector(pattern.result))
        })

        const xTensor = tf.tensor2d(xs)
        const yTensor = tf.tensor2d(ys)

        // Train model
        await this.model.fit(xTensor, yTensor, {
            epochs: 10,
            batchSize: 32,
            validationSplit: 0.2
        })

        // Save model
        await this.model.save('file://./models/cad-generator')

        // Cleanup
        xTensor.dispose()
        yTensor.dispose()
    }

    async predict(prompt: string): Promise<any> {
        if (!this.model) return null

        const input = tf.tensor2d([this.promptToVector(prompt)])
        const prediction = this.model.predict(input) as tf.Tensor
        const result = await prediction.array()

        input.dispose()
        prediction.dispose()

        return this.vectorToSuggestion(result[0])
    }

    async getSuggestions(prompt: string): Promise<string[]> {
        const suggestions: string[] = []

        // Find similar patterns
        const similar = this.findSimilarPatterns(prompt)

        similar.forEach(pattern => {
            if (pattern.success) {
                suggestions.push(`Try: ${pattern.result.design?.approach}`)
            }
        })

        // ML predictions
        const prediction = await this.predict(prompt)
        if (prediction) {
            suggestions.push(...prediction.suggestions)
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

    private promptToVector(prompt: string): number[] {
        // Simple bag-of-words vectorization
        const vector = new Array(100).fill(0)
        const words = prompt.toLowerCase().split(' ')

        words.forEach((word, i) => {
            const index = this.hashWord(word) % 100
            vector[index] = 1
        })

        return vector
    }

    private resultToVector(result: any): number[] {
        // Encode result characteristics
        const vector = new Array(10).fill(0)

        vector[0] = result.validation?.score / 100 || 0
        vector[1] = result.analysis?.complexity || 0
        vector[2] = result.design?.features?.length / 10 || 0
        vector[3] = result.model?.representations ? 1 : 0
        // ... more features

        return vector
    }

    private vectorToSuggestion(vector: number[]): any {
        return {
            suggestions: [
                vector[0] > 0.5 ? 'Consider adding more detail' : 'Simplify the design',
                vector[1] > 0.7 ? 'This is a complex model' : 'This is a simple model'
            ]
        }
    }

    private hashWord(word: string): number {
        let hash = 0
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i)
            hash = hash & hash
        }
        return Math.abs(hash)
    }

    private findSimilarPatterns(prompt: string): any[] {
        const words = new Set(prompt.toLowerCase().split(' '))
        const similar: any[] = []

        this.patterns.forEach((pattern, key) => {
            const patternWords = new Set(key.toLowerCase().split(' '))
            const intersection = new Set([...words].filter(x => patternWords.has(x)))
            const similarity = intersection.size / Math.max(words.size, patternWords.size)

            if (similarity > 0.5) {
                similar.push({ ...pattern, similarity })
            }
        })

        return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
    }

    private calculateSuccessRate(): number {
        let success = 0
        this.patterns.forEach(pattern => {
            if (pattern.success) success++
        })
        return (success / this.patterns.size) * 100
    }

    private extractCommonFeatures(): string[] {
        const features = new Map<string, number>()

        this.patterns.forEach(pattern => {
            pattern.result.design?.features?.forEach(f => {
                features.set(f.type, (features.get(f.type) || 0) + 1)
            })
        })

        return Array.from(features.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([feature]) => feature)
    }

    private analyzeTrends(): any {
        // Analyze trends over time
        const trends = {
            complexity: [],
            success: [],
            domains: {}
        }

        // Group by time periods
        const now = Date.now()
        const day = 24 * 60 * 60 * 1000

        for (let i = 7; i >= 0; i--) {
            const start = now - (i + 1) * day
            const end = now - i * day

            let complexity = 0
            let success = 0
            let count = 0

            this.patterns.forEach(pattern => {
                if (pattern.timestamp >= start && pattern.timestamp < end) {
                    complexity += pattern.result.analysis?.complexity || 0
                    if (pattern.success) success++
                    count++
                }
            })

            if (count > 0) {
                trends.complexity.push(complexity / count)
                trends.success.push((success / count) * 100)
            }
        }

        return trends
    }
}