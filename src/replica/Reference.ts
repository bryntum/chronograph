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

    value           : Set<EntityAny>        = new Set()


    initialize () {
        super.initialize(...arguments)

        this.calculation            = this.doCalculation
        this.calculationContext     = this
    }


    * doCalculation () : IterableIterator<ChronoAtom | Set<EntityAny>> {
        const result        = new Set()

        let atom : ChronoAtom

        for (atom of (this.incoming as Set<ChronoAtom>)) {
            if (!this.oldRefs.has(atom)) {
                const referencee    = yield atom

                if (referencee != null) result.add(referencee)
            }
        }

        for (atom of this.newRefs) {
            const referencee    = yield atom

            if (referencee != null) result.add(referencee)
        }

        return result
    }


    commitValue () {
        super.commitValue()

        this.oldRefs.clear()
        this.newRefs.clear()
    }

    reject () {
        throw "not yet"
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
        return entity.$[ this.field.storageKey ]

        // const id        = `${entity.$internalId}/${this.field.storageKey}`
        //
        // return (this.graph as ChronoGraph).getOrCreateAtom(id, MinimalReferenceStorageAccumulator) as ReferenceStorageAtom
    }


    onEnterGraph (graph : IChronoGraph) {
        super.onEnterGraph(graph)

        if (this.hasValue()) {
            const referenceStorage  = this.getStorage(this.value)

            this.addToStorage(referenceStorage)
        }
    }


    onLeaveGraph (graph : IChronoGraph) {
        if (this.hasValue()) {
            const referenceStorage  = this.getStorage(this.value)

            this.removeFromStorage(referenceStorage)
        }

        super.onLeaveGraph(graph)
    }


    addToStorage (storage : ReferenceStorageAtom) {
        storage.newRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(storage)
    }


    removeFromStorage (storage : ReferenceStorageAtom) {
        storage.oldRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(storage)
    }


    set (value : ChronoValue) {
        if (this.value != null) {
            this.removeFromStorage(this.getStorage(this.value))
        }

        if (value != null) {
            this.addToStorage(this.getStorage(value))
        }

        super.set(value)
    }
}

export type ReferenceAtom = Mixin<typeof ReferenceAtom>


export class MinimalReferenceAtom extends ReferenceAtom(FieldAtom(MinimalChronoAtom)) {}
