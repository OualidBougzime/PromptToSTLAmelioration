// server/agents/designer.ts
import { EventEmitter } from 'events'

export class DesignerAgent extends EventEmitter {
    async design(analysis: any, context: any): Promise<any> {
        this.emit('state', { status: 'designing', progress: 0 })

        // Le designer passe simplement l'analyse au suivant
        // Il pourrait enrichir avec des choix de design
        const design = {
            geometry: analysis.geometry,
            domain: analysis.domain,
            constraints: analysis.constraints,
            parameters: this.extractParameters(analysis.geometry)
        }

        this.emit('state', { status: 'complete', progress: 100 })
        return design
    }

    private extractParameters(geometry: any): any {
        const params: any = {}

        // Extraire les paramètres de la géométrie
        if (geometry.root) {
            Object.assign(params, geometry.root.params)
        }

        geometry.operations?.forEach((op: any, idx: number) => {
            Object.entries(op.params).forEach(([key, value]) => {
                params[`op${idx}_${key}`] = value
            })
        })

        return params
    }
}