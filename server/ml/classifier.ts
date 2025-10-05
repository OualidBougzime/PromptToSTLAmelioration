// server/ml/classifier.ts
export class DomainClassifier {
    private domains = {
        mechanical: ['gear', 'bearing', 'shaft', 'bracket', 'mount', 'pulley', 'spring'],
        electronics: ['case', 'enclosure', 'housing', 'connector', 'socket', 'terminal'],
        medical: ['implant', 'stent', 'prosthetic', 'surgical', 'orthopedic', 'dental'],
        architectural: ['beam', 'column', 'truss', 'joint', 'facade', 'structure'],
        consumer: ['phone', 'holder', 'stand', 'organizer', 'container', 'clip'],
        artistic: ['vase', 'sculpture', 'art', 'decorative', 'ornament', 'pattern']
    }

    async classify(text: string): Promise<any> {
        const lower = text.toLowerCase()
        const scores: Record<string, number> = {}

        // Calculer les scores pour chaque domaine
        for (const [domain, keywords] of Object.entries(this.domains)) {
            scores[domain] = 0
            keywords.forEach(keyword => {
                if (lower.includes(keyword)) {
                    scores[domain] += 1
                }
            })
        }

        // Trouver le domaine avec le score le plus élevé
        const category = Object.entries(scores).reduce((a, b) =>
            scores[a[0]] > b[1] ? a : b
        )[0]

        const maxScore = Math.max(...Object.values(scores))
        const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.3

        return {
            category: maxScore > 0 ? category : 'general',
            confidence,
            scores,
            features: this.extractDomainFeatures(category, text)
        }
    }

    private extractDomainFeatures(domain: string, text: string): string[] {
        const features: string[] = []

        switch (domain) {
            case 'mechanical':
                if (text.includes('thread')) features.push('threaded')
                if (text.includes('bearing')) features.push('rotating')
                if (text.includes('gear')) features.push('transmission')
                break

            case 'medical':
                if (text.includes('biocompatible')) features.push('biocompatible')
                if (text.includes('implant')) features.push('implantable')
                if (text.includes('sterile')) features.push('sterilizable')
                break

            case 'electronics':
                if (text.includes('waterproof')) features.push('waterproof')
                if (text.includes('vented')) features.push('ventilated')
                if (text.includes('din')) features.push('din-rail')
                break
        }

        return features
    }
}