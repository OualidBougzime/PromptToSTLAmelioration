// src/components/ModelViewer.tsx
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Stage, PresentationControls } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'

interface ModelViewerProps {
    model: any
}

function Model({ meshData }: { meshData: any }) {
    if (!meshData) return null

    // Convert mesh data to Three.js geometry
    const geometry = React.useMemo(() => {
        const geo = new THREE.BufferGeometry()

        if (meshData.vertices) {
            geo.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3))
        }

        if (meshData.normals) {
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3))
        }

        if (meshData.faces) {
            geo.setIndex(meshData.faces)
        }

        geo.computeBoundingBox()
        geo.computeBoundingSphere()

        return geo
    }, [meshData])

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                color="#8080ff"
                metalness={0.3}
                roughness={0.4}
                envMapIntensity={0.5}
            />
        </mesh>
    )
}

export function ModelViewer({ model }: ModelViewerProps) {
    return (
        <Canvas
            camera={{ position: [50, 50, 50], fov: 50 }}
            gl={{ antialias: true, alpha: false }}
        >
            <Suspense fallback={null}>
                <Stage
                    environment="city"
                    intensity={0.6}
                    contactShadow
                    shadowBias={-0.001}
                >
                    <Model meshData={model.model?.representations?.threejs} />
                </Stage>

                <OrbitControls
                    makeDefault
                    autoRotate
                    autoRotateSpeed={0.5}
                />

                <Grid
                    infiniteGrid
                    fadeDistance={50}
                    fadeStrength={5}
                />

                <EffectComposer>
                    <SSAO radius={0.4} intensity={50} luminanceInfluence={0.4} />
                    <Bloom intensity={0.3} luminanceThreshold={0.9} />
                    <SMAA />
                </EffectComposer>
            </Suspense>
        </Canvas>
    )
}