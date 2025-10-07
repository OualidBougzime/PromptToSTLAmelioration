// server/nlp/advanced-processor.ts
interface GeometryPattern {
    name: string
    keywords: string[]
    mustHave?: string[]
    template: (params: any) => any
    defaultParams: any
}

export class AdvancedNLPProcessor {
    private patterns: GeometryPattern[] = [
        // 🔥 PATTERNS COMPLEXES
        {
            name: 'phone-holder',
            keywords: ['phone', 'smartphone', 'holder', 'stand', 'dock'],
            mustHave: ['phone', 'holder'],
            defaultParams: {
                phoneWidth: 75,
                phoneHeight: 150,
                phoneThickness: 10,
                angle: 60,
                baseWidth: 100,
                baseDepth: 80
            },
            template: (p) => ({
                type: 'composite',
                components: [
                    { type: 'box', params: { width: p.baseWidth, depth: p.baseDepth, height: 5 }, name: 'base' },
                    { type: 'box', params: { width: p.phoneWidth + 4, depth: 20, height: p.phoneHeight * 0.6 }, name: 'back', rotation: [p.angle, 0, 0] },
                    { type: 'box', params: { width: p.phoneWidth + 4, depth: 10, height: 5 }, name: 'bottom', position: [0, 0, 5] }
                ],
                operations: [
                    { type: 'union', between: ['base', 'back'] },
                    { type: 'union', between: ['base', 'bottom'] }
                ]
            })
        },

        {
            name: 'enclosure',
            keywords: ['enclosure', 'case', 'box', 'housing', 'container'],
            mustHave: ['enclosure', 'case', 'housing'],
            defaultParams: {
                width: 100,
                height: 60,
                depth: 40,
                wallThickness: 2,
                hasLid: true,
                ventilation: false
            },
            template: (p) => ({
                type: 'enclosure',
                params: p
            })
        },

        {
            name: 'motor-mount',
            keywords: ['motor', 'mount', 'bracket', 'holder'],
            mustHave: ['motor', 'mount'],
            defaultParams: {
                motorDiameter: 28,
                shaftDiameter: 5,
                mountingHoles: 4,
                holeDistance: 40,
                baseThickness: 5
            },
            template: (p) => ({
                type: 'motor-mount',
                params: p
            })
        },

        {
            name: 'cable-clip',
            keywords: ['cable', 'clip', 'organizer', 'holder', 'wire'],
            mustHave: ['cable', 'clip'],
            defaultParams: {
                cableDiameter: 6,
                clipWidth: 20,
                mountType: 'screw'
            },
            template: (p) => ({
                type: 'cable-clip',
                params: p
            })
        },

        {
            name: 'hinge',
            keywords: ['hinge', 'joint', 'pivot'],
            mustHave: ['hinge'],
            defaultParams: {
                pinDiameter: 3,
                width: 30,
                thickness: 2,
                knuckles: 3
            },
            template: (p) => ({
                type: 'hinge',
                params: p
            })
        }
    ]

    async detectPattern(text: string): Promise<any> {
        const lower = text.toLowerCase()

        // Chercher le pattern qui correspond le mieux
        let bestMatch: { pattern: GeometryPattern, score: number } | null = null

        for (const pattern of this.patterns) {
            let score = 0

            // Vérifier les must-have (requis)
            if (pattern.mustHave) {
                const hasAll = pattern.mustHave.every(kw => lower.includes(kw))
                if (!hasAll) continue
            }

            // Calculer le score
            for (const keyword of pattern.keywords) {
                if (lower.includes(keyword)) {
                    score += keyword.length // Plus le mot est long, plus le score est élevé
                }
            }

            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { pattern, score }
            }
        }

        if (bestMatch) {
            console.log(`✅ Pattern detected: ${bestMatch.pattern.name} (score: ${bestMatch.score})`)

            // Extraire les paramètres du texte
            const params = this.extractPatternParams(text, bestMatch.pattern)

            return bestMatch.pattern.template(params)
        }

        return null
    }

    private extractPatternParams(text: string, pattern: GeometryPattern): any {
        const params = { ...pattern.defaultParams }

        // Extraire les dimensions du texte
        const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(n => parseFloat(n)) || []

        // Logique d'extraction intelligente basée sur le contexte
        const lower = text.toLowerCase()

        // Détecter "with lid", "ventilation", etc.
        if (pattern.name === 'enclosure') {
            params.hasLid = lower.includes('lid') || lower.includes('cover')
            params.ventilation = lower.includes('vent') || lower.includes('cooling')
        }

        // Extraire angles
        const angleMatch = text.match(/(\d+)\s*(?:degree|°|deg)/i)
        if (angleMatch) {
            params.angle = parseFloat(angleMatch[1])
        }

        // Extraire dimensions spécifiques
        const widthMatch = text.match(/width[:\s]+(\d+)/i)
        if (widthMatch) params.width = parseFloat(widthMatch[1])

        const heightMatch = text.match(/height[:\s]+(\d+)/i)
        if (heightMatch) params.height = parseFloat(heightMatch[1])

        return params
    }
}