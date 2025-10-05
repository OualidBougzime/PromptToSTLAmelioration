// server/agents/validator.ts - Agent Validateur
import { EventEmitter } from 'events'
import * as THREE from 'three'

export class ValidatorAgent extends EventEmitter {
    private validationRules = {
        geometry: this.validateGeometry.bind(this),
        manufacturing: this.validateManufacturing.bind(this),
        assembly: this.validateAssembly.bind(this),
        standards: this.validateStandards.bind(this),
        physics: this.validatePhysics.bind(this)
    }

    async validate(optimized: any, context: any): Promise<any> {
        this.emit('state', { status: 'validating', progress: 0 })

        const validationResults = {
            geometry: await this.validateGeometry(optimized),
            manufacturing: await this.validateManufacturing(optimized),
            assembly: await this.validateAssembly(optimized),
            standards: await this.validateStandards(optimized, context),
            physics: await this.validatePhysics(optimized)
        }

        this.emit('state', { status: 'validating', progress: 60 })

        // Générer les représentations finales
        const representations = await this.generateRepresentations(optimized)

        this.emit('state', { status: 'validating', progress: 80 })

        // Calculer le score global
        const score = this.calculateValidationScore(validationResults)

        // Générer les suggestions
        const suggestions = this.generateValidationSuggestions(validationResults)

        this.emit('state', { status: 'complete', progress: 100 })

        return {
            valid: score > 70,
            score,
            results: validationResults,
            issues: this.collectIssues(validationResults),
            suggestions,
            ...representations,
            certification: this.generateCertification(score, validationResults)
        }
    }

    private async validateGeometry(design: any): Promise<any> {
        const validation = {
            manifold: true,
            watertight: true,
            intersections: [],
            degenerateTriangles: [],
            normalOrientation: true,
            topologyIssues: []
        }

        // Vérifier si le mesh est manifold
        validation.manifold = this.checkManifold(design.mesh)

        // Vérifier l'étanchéité
        validation.watertight = this.checkWatertight(design.mesh)

        // Détecter les auto-intersections
        validation.intersections = this.detectSelfIntersections(design.mesh)

        // Trouver les triangles dégénérés
        validation.degenerateTriangles = this.findDegenerateTriangles(design.mesh)

        // Vérifier l'orientation des normales
        validation.normalOrientation = this.checkNormalOrientation(design.mesh)

        return validation
    }

    private async validateManufacturing(design: any): Promise<any> {
        const validation = {
            printable: true,
            minWallThickness: 0,
            maxOverhang: 0,
            supportRequired: false,
            estimatedPrintTime: 0,
            materialVolume: 0,
            machinability: true,
            toolAccessibility: true,
            moldability: false,
            draftAngles: true
        }

        // Validation pour impression 3D
        if (design.manufacturing === '3d-printing' || !design.manufacturing) {
            validation.minWallThickness = this.calculateMinWallThickness(design.mesh)
            validation.printable = validation.minWallThickness >= 0.8

            validation.maxOverhang = this.calculateMaxOverhang(design.mesh)
            validation.supportRequired = validation.maxOverhang > 45

            validation.estimatedPrintTime = this.estimatePrintTime(design.mesh)
            validation.materialVolume = this.calculateVolume(design.mesh)
        }

        // Validation pour CNC
        if (design.manufacturing === 'cnc') {
            validation.toolAccessibility = this.checkToolAccessibility(design.mesh)
            validation.machinability = this.evaluateMachinability(design)
        }

        // Validation pour moulage par injection
        if (design.manufacturing === 'injection-molding') {
            validation.moldability = this.checkMoldability(design.mesh)
            validation.draftAngles = this.checkDraftAngles(design.mesh)
        }

        return validation
    }

    private async validateAssembly(design: any): Promise<any> {
        const validation = {
            interfaces: [],
            clearances: true,
            tolerances: true,
            assemblySequence: [],
            fastenerAccess: true
        }

        // Vérifier les interfaces d'assemblage
        if (design.features) {
            validation.interfaces = design.features
                .filter(f => f.type === 'interface')
                .map(f => this.validateInterface(f))
        }

        // Vérifier les jeux fonctionnels
        validation.clearances = this.checkClearances(design)

        // Vérifier les tolérances
        validation.tolerances = this.checkTolerances(design)

        // Générer la séquence d'assemblage
        validation.assemblySequence = this.generateAssemblySequence(design)

        return validation
    }

    private async validateStandards(design: any, context: any): Promise<any> {
        const validation = {
            iso: [],
            din: [],
            ansi: [],
            custom: [],
            compliance: true
        }

        // Vérifier la conformité aux normes
        if (context.results.analysis.references) {
            for (const ref of context.results.analysis.references) {
                if (ref.type === 'standard') {
                    const compliance = await this.checkStandardCompliance(design, ref.value)
                    if (ref.value.startsWith('ISO')) {
                        validation.iso.push(compliance)
                    } else if (ref.value.startsWith('DIN')) {
                        validation.din.push(compliance)
                    } else if (ref.value.startsWith('ANSI')) {
                        validation.ansi.push(compliance)
                    }
                }
            }
        }

        validation.compliance = [...validation.iso, ...validation.din, ...validation.ansi]
            .every(c => c.compliant)

        return validation
    }

    private async validatePhysics(design: any): Promise<any> {
        const validation = {
            centerOfMass: { x: 0, y: 0, z: 0 },
            momentOfInertia: { xx: 0, yy: 0, zz: 0 },
            stability: true,
            naturalFrequency: 0,
            thermalExpansion: 0,
            stressConcentration: []
        }

        // Calculer le centre de masse
        validation.centerOfMass = this.calculateCenterOfMass(design.mesh)

        // Calculer le moment d'inertie
        validation.momentOfInertia = this.calculateMomentOfInertia(design.mesh)

        // Vérifier la stabilité
        validation.stability = this.checkStability(validation.centerOfMass, design.mesh)

        // Calculer la fréquence naturelle
        validation.naturalFrequency = this.calculateNaturalFrequency(design)

        // Zones de concentration de contraintes
        validation.stressConcentration = this.findStressConcentrations(design.mesh)

        return validation
    }

    private async generateRepresentations(design: any): Promise<any> {
        const representations = {
            threejs: null,
            stl: null,
            step: null,
            iges: null,
            obj: null,
            gltf: null
        }

        // Générer le mesh Three.js
        representations.threejs = await this.generateThreeJSMesh(design.mesh)

        // Générer STL
        representations.stl = await this.generateSTL(design.mesh)

        // Formats CAO (si CadQuery)
        if (design.language === 'cadquery') {
            representations.step = await this.generateSTEP(design.code)
            representations.iges = await this.generateIGES(design.code)
        }

        // Formats additionnels
        representations.obj = await this.generateOBJ(design.mesh)
        representations.gltf = await this.generateGLTF(design.mesh)

        return representations
    }

    private calculateValidationScore(results: any): number {
        let score = 100

        // Géométrie (-30 points max)
        if (!results.geometry.manifold) score -= 15
        if (!results.geometry.watertight) score -= 10
        if (results.geometry.intersections.length > 0) score -= 5

        // Fabrication (-30 points max)
        if (!results.manufacturing.printable) score -= 15
        if (results.manufacturing.supportRequired) score -= 5
        if (!results.manufacturing.toolAccessibility) score -= 10

        // Assemblage (-20 points max)
        if (!results.assembly.clearances) score -= 10
        if (!results.assembly.tolerances) score -= 10

        // Standards (-20 points max)
        if (!results.standards.compliance) score -= 20

        return Math.max(0, score)
    }

    private generateValidationSuggestions(results: any): string[] {
        const suggestions = []

        if (!results.geometry.manifold) {
            suggestions.push('Fix non-manifold edges for proper 3D printing')
        }

        if (results.manufacturing.minWallThickness < 0.8) {
            suggestions.push(`Increase minimum wall thickness to 0.8mm (current: ${results.manufacturing.minWallThickness}mm)`)
        }

        if (results.manufacturing.supportRequired) {
            suggestions.push('Consider reorienting the model to reduce support material')
        }

        if (!results.assembly.clearances) {
            suggestions.push('Add proper clearances for moving parts')
        }

        return suggestions
    }

    private collectIssues(results: any): any[] {
        const issues = []

        for (const [category, validation] of Object.entries(results)) {
            for (const [test, result] of Object.entries(validation as any)) {
                if (result === false || (Array.isArray(result) && result.length > 0)) {
                    issues.push({
                        category,
                        test,
                        severity: this.getSeverity(test),
                        description: this.getIssueDescription(test, result)
                    })
                }
            }
        }

        return issues
    }

    private generateCertification(score: number, results: any): any {
        return {
            certified: score >= 80,
            grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
            timestamp: Date.now(),
            details: {
                geometryValid: results.geometry.manifold && results.geometry.watertight,
                manufacturingReady: results.manufacturing.printable || results.manufacturing.machinability,
                standardsCompliant: results.standards.compliance
            }
        }
    }

    // Méthodes de validation détaillées
    private checkManifold(mesh: any): boolean {
        // Vérifier que chaque arête est partagée par exactement 2 faces
        return true // Simplification
    }

    private checkWatertight(mesh: any): boolean {
        // Vérifier qu'il n'y a pas de trous dans le mesh
        return true // Simplification
    }

    private detectSelfIntersections(mesh: any): any[] {
        // Détecter les auto-intersections
        return []
    }

    private findDegenerateTriangles(mesh: any): any[] {
        // Triangles avec aire nulle
        return []
    }

    private checkNormalOrientation(mesh: any): boolean {
        // Vérifier que toutes les normales pointent vers l'extérieur
        return true
    }

    private calculateMinWallThickness(mesh: any): number {
        // Calcul de l'épaisseur minimale
        return 2.0 // mm
    }

    private calculateMaxOverhang(mesh: any): number {
        // Angle de surplomb maximum
        return 35 // degrés
    }

    private estimatePrintTime(mesh: any): number {
        // Estimation basique
        const volume = this.calculateVolume(mesh)
        return volume / 1000 * 60 // minutes
    }

    private calculateVolume(mesh: any): number {
        // Volume en mm³
        return 5000
    }

    private checkToolAccessibility(mesh: any): boolean {
        // Vérifier l'accessibilité pour les outils CNC
        return true
    }

    private evaluateMachinability(design: any): boolean {
        return true
    }

    private checkMoldability(mesh: any): boolean {
        return true
    }

    private checkDraftAngles(mesh: any): boolean {
        return true
    }

    private validateInterface(feature: any): any {
        return { valid: true, type: feature.type }
    }

    private checkClearances(design: any): boolean {
        return true
    }

    private checkTolerances(design: any): boolean {
        return true
    }

    private generateAssemblySequence(design: any): any[] {
        return []
    }

    private checkStandardCompliance(design: any, standard: string): any {
        return { standard, compliant: true }
    }

    private calculateCenterOfMass(mesh: any): any {
        return { x: 0, y: 0, z: 0 }
    }

    private calculateMomentOfInertia(mesh: any): any {
        return { xx: 1000, yy: 1000, zz: 1000 }
    }

    private checkStability(com: any, mesh: any): boolean {
        return true
    }

    private calculateNaturalFrequency(design: any): number {
        return 150 // Hz
    }

    private findStressConcentrations(mesh: any): any[] {
        return []
    }

    private getSeverity(test: string): string {
        const critical = ['manifold', 'watertight', 'compliance']
        const warning = ['supportRequired', 'clearances', 'tolerances']

        if (critical.includes(test)) return 'critical'
        if (warning.includes(test)) return 'warning'
        return 'info'
    }

    private getIssueDescription(test: string, result: any): string {
        const descriptions = {
            manifold: 'Geometry has non-manifold edges',
            watertight: 'Model is not watertight',
            intersections: `Found ${result.length} self-intersections`,
            printable: 'Model is not suitable for 3D printing',
            compliance: 'Does not comply with specified standards'
        }
        return descriptions[test] || `Issue with ${test}`
    }

    // Méthodes de génération de formats
    private async generateThreeJSMesh(meshData: any): Promise<any> {
        return meshData // Déjà au format Three.js
    }

    private async generateSTL(mesh: any): Promise<string> {
        // Générer STL binaire
        return 'base64_stl_data'
    }

    private async generateSTEP(code: string): Promise<string> {
        // Appel au serveur CadQuery pour export STEP
        return 'step_file_data'
    }

    private async generateIGES(code: string): Promise<string> {
        return 'iges_file_data'
    }

    private async generateOBJ(mesh: any): Promise<string> {
        return 'obj_file_data'
    }

    private async generateGLTF(mesh: any): Promise<any> {
        return { gltf: 'data' }
    }

    receiveMessage(msg: any): void {
        this.emit('message', {
            to: msg.from,
            type: 'response',
            content: { acknowledged: true }
        })
    }
}