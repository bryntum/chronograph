import {ChronoAtom, ChronoValue, MinimalChronoAtom} from "../chrono/Atom.js";
import {ChronoGraph, IChronoGraph} from "../chrono/Graph.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {ReferenceField} from "../schema/Schema.js";
import {FieldAtom, MinimalFieldAtom} from "./Atom.js";
import {EntityAny} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceStorageAtom = <T extends Constructable<FieldAtom>>(base : T) =>

class ReferenceStorageAtom extends base {

    oldRefs         : Set<ChronoAtom>       = new Set()
    newRefs         : Set<ChronoAtom>       = new Set()


    initialize () {
        super.initialize(...arguments)

        this.calculation            = this.doCalculation
        this.calculationContext     = this
    }


    doCalculation () : Set<EntityAny> {
        const result        = new Set()

        this.incoming.forEach((atom : ChronoAtom) => {
            if (!this.oldRefs.has(atom)) {
                const referencee    = atom.get()

                if (referencee != null) result.add(referencee)
            }
        })

        this.newRefs.forEach((atom : ChronoAtom) => {
            const referencee    = atom.get()

            if (referencee != null) result.add(referencee)
        })

        return result
    }


    commit () {
        super.commit()

        this.oldRefs.clear()
        this.newRefs.clear()
    }

    reject () {
        super.reject()

        this.oldRefs.clear()
        this.newRefs.clear()
    }
}

export type ReferenceStorageAtom = Mixin<typeof ReferenceStorageAtom>

export class MinimalReferenceStorageAccumulator extends ReferenceStorageAtom(MinimalFieldAtom) {}


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceAtom = <T extends Constructable<FieldAtom>>(base : T) =>

class ReferenceAtom extends base {
    field           : ReferenceField

    value           : EntityAny


    getStorage (entity : EntityAny) : ReferenceStorageAtom {
        const id        = `${entity.$internalId}/${this.field.storageKey}`

        return (this.graph as ChronoGraph).getOrCreateAtom(id, MinimalReferenceStorageAccumulator) as ReferenceStorageAtom
    }


    onEnterGraph (graph : IChronoGraph) {
        super.onEnterGraph(graph)

        if (this.hasValue()) {
            const referenceStorage  = this.getStorage(this.value)

            this.addToStorage(referenceStorage)
        }
    }


    onLeaveGraph (graph : IChronoGraph) {
        super.onLeaveGraph(graph)

        if (this.hasValue()) {
            const referenceStorage  = this.getStorage(this.value)

            this.removeFromStorage(referenceStorage)
        }
    }


    addToStorage (storage : ReferenceStorageAtom) {
        storage.newRefs.add(this.self.selfAtom)

        this.graph.markDirty(storage)
    }


    removeFromStorage (storage : ReferenceStorageAtom) {
        storage.oldRefs.add(this.self.selfAtom)

        this.graph.markDirty(storage)
    }


    update (value : ChronoValue) {
        if (this.value != null) {
            this.removeFromStorage(this.getStorage(this.value))
        }

        super.update(value)

        if (value != null) {
            this.addToStorage(this.getStorage(value))
        }
    }
}

export type ReferenceAtom = Mixin<typeof ReferenceAtom>


export class MinimalReferenceAtom extends ReferenceAtom(FieldAtom(MinimalChronoAtom)) {}
