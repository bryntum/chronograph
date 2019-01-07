import {ChronoAtom, ChronoValue} from "../chrono/Atom.js";
import {ChronoGraph, IChronoGraph} from "../chrono/Graph.js";
import {FieldAtom} from "./Atom.js";
import {Entity} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceStorageAccumulator extends FieldAtom {

    oldRefs         : Set<ChronoAtom>       = new Set()
    newRefs         : Set<ChronoAtom>       = new Set()


    initialize () {
        super.initialize(...arguments)

        // delete value config
        delete this.calculation
        delete this.calculationContext
    }


    // @ts-ignore
    calculation () : Set<Entity> {
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



//---------------------------------------------------------------------------------------------------------------------
export class ReferenceAtom extends FieldAtom {
    referenceStorageAccumulator     : string

    value           : Entity


    // /author/$id/books
    getReferenceStorageAccumulator (entity : Entity) : ReferenceStorageAccumulator {
        const id        = `${entity.internalId}/${this.referenceStorageAccumulator}`

        return (this.graph as ChronoGraph).getOrCreateAtom(id, ReferenceStorageAccumulator) as ReferenceStorageAccumulator
    }


    onEnterGraph (graph : IChronoGraph) {
        super.onEnterGraph(graph)

        if (this.hasValue()) {
            const referenceStorage  = this.getReferenceStorageAccumulator(this.value)

            referenceStorage.newRefs.add(this.self.selfAtom)

            this.graph.markDirty(referenceStorage)
        }
    }


    // onLeaveGraph (graph : IChronoGraph) {
    //     super.onEnterGraph(graph)
    //
    //     if (this.hasValue()) {
    //         this.getReferenceStorageAccumulator(this.value).newRefs.add(this.self.selfAtom)
    //     }
    // }


    update (value : ChronoValue) {
        if (this.value !== undefined) {
            const prevStorage       = this.getReferenceStorageAccumulator(this.value)

            prevStorage.oldRefs.add(this.self.selfAtom)

            this.graph.markDirty(prevStorage)
        }

        super.update(value)

        if (value != null) {
            const newStorage = this.getReferenceStorageAccumulator(value)

            newStorage.newRefs.add(this.self.selfAtom)

            this.graph.markDirty(newStorage)
        }
    }
}
