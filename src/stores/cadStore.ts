// src/stores/cadStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CADModel {
    id: string
    prompt: string
    code: any
    model: any
    timestamp: number
}

interface CADStore {
    models: CADModel[]
    currentModelId: string | null
    addModel: (model: CADModel) => void
    updateModel: (id: string, updates: Partial<CADModel>) => void
    deleteModel: (id: string) => void
    setCurrentModel: (id: string) => void
}

export const useCADStore = create<CADStore>()(
    persist(
        (set) => ({
            models: [],
            currentModelId: null,

            addModel: (model) =>
                set((state) => ({
                    models: [...state.models, model],
                    currentModelId: model.id,
                })),

            updateModel: (id, updates) =>
                set((state) => ({
                    models: state.models.map((m) =>
                        m.id === id ? { ...m, ...updates } : m
                    ),
                })),

            deleteModel: (id) =>
                set((state) => ({
                    models: state.models.filter((m) => m.id !== id),
                    currentModelId:
                        state.currentModelId === id ? null : state.currentModelId,
                })),

            setCurrentModel: (id) => set({ currentModelId: id }),
        }),
        {
            name: 'cad-storage',
        }
    )
)