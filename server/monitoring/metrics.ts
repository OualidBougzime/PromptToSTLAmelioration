// server/monitoring/metrics.ts

interface GenerationMetrics {
    prompt: string
    timestamp: number
    duration: number
    attempts: number
    success: boolean
    errorType?: string
    complexity: number
}

export class MetricsCollector {
    private metrics: GenerationMetrics[] = []
    private maxStoredMetrics = 1000

    logGeneration(data: GenerationMetrics) {
        this.metrics.push(data)

        // Garder seulement les 1000 derniers
        if (this.metrics.length > this.maxStoredMetrics) {
            this.metrics = this.metrics.slice(-this.maxStoredMetrics)
        }

        // Log console
        console.log(`📊 Metrics: ${data.success ? '✅' : '❌'} | ${data.duration}ms | ${data.attempts} attempts`)
    }

    getStats() {
        const total = this.metrics.length
        const successful = this.metrics.filter(m => m.success).length
        const failed = total - successful

        const successRate = total > 0 ? (successful / total * 100).toFixed(1) : '0.0'

        const avgDuration = total > 0
            ? Math.round(this.metrics.reduce((sum, m) => sum + m.duration, 0) / total)
            : 0

        const avgAttempts = total > 0
            ? (this.metrics.reduce((sum, m) => sum + m.attempts, 0) / total).toFixed(1)
            : '0.0'

        // Errors by type
        const errorsByType: Record<string, number> = {}
        this.metrics
            .filter(m => !m.success && m.errorType)
            .forEach(m => {
                errorsByType[m.errorType!] = (errorsByType[m.errorType!] || 0) + 1
            })

        return {
            total,
            successful,
            failed,
            successRate: `${successRate}%`,
            avgDuration: `${avgDuration}ms`,
            avgAttempts,
            errorsByType,
            recentMetrics: this.metrics.slice(-10)
        }
    }

    getRecentFailures() {
        return this.metrics
            .filter(m => !m.success)
            .slice(-20)
            .map(m => ({
                prompt: m.prompt.substring(0, 50) + '...',
                errorType: m.errorType,
                timestamp: new Date(m.timestamp).toISOString()
            }))
    }
}