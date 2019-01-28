import {ChronoAtom, ChronoValue, MinimalChronoAtom} from "../chrono/Atom.js";
import {ChronoGraph, IChronoGraph} from "../chrono/Graph.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {ReferenceField, ReferenceStorageField} from "../schema/Schema.js";
import {FieldAtom, MinimalFieldAtom} from "./Atom.js";
import {EntityAny} from "./Entity.js";


export type ResolverFunc    = (locator : any) => EntityAny

//---------------------------------------------------------------------------------------------------------------------
export const ReferenceStorageAtom = <T extends Constructable<FieldAtom>>(base : T) =>

class ReferenceStorageAtom extends base {

    oldRefs         : Set<ChronoAtom>       = new Set()
    newRefs         : Set<ChronoAtom>       = new Set()

    value           : Set<EntityAny>        = new Set();


    * calculate (proposedValue : ChronoValue) : IterableIterator<ChronoAtom | this[ 'value' ]> {
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


    addToStorage (storage : ReferenceStorageAtom) {
        storage.newRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(storage)
    }


    removeFromStorage (storage : ReferenceStorageAtom) {
        storage.oldRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(storage)
    }


    * calculate (proposedValue : this[ 'value' ]) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        return this.resolve(proposedValue !== undefined ? proposedValue : this.readValue())
    }


    resolve (referencee : any) : EntityAny {
        const resolver  = this.field.resolver

        if (resolver && referencee !== undefined && Object(referencee) !== referencee) {
            return resolver.call(this.self, referencee)
        } else {
            return referencee
        }
    }


    getStorage (entity : EntityAny) : ReferenceStorageAtom {
        return entity.$[ this.field.storageKey ]
    }


    onEnterGraph (graph : IChronoGraph) {
        const value     = this.readValue()

        let resolves    = true

        if (value !== undefined && Object(value) !== value) {
            resolves        = false

            const resolved  = this.resolve(value)

            // last point where it is safe to just rewrite own value
            // after `super.onEnterGraph` that will be causing effects outside of atom
            if (Object(resolved) === resolved) {
                this.writeValue(resolved)

                resolves    = true
            }
        }

        super.onEnterGraph(graph)

        if (this.hasValue() && resolves) {
            const referenceStorage  = this.getStorage(this.value)

            this.addToStorage(referenceStorage)
        }
    }


    onLeaveGraph (graph : IChronoGraph) {
        if (this.hasValue()) {
            const referenceStorage  = this.getStorage(this.readValue())

            this.removeFromStorage(referenceStorage)
        }

        super.onLeaveGraph(graph)
    }


    put (nextValue : this[ 'value']) {
        const value     = this.readValue()

        // value is not empty and resolved to entity
        if (value != null && Object(value) === value) {
            this.removeFromStorage(this.getStorage(value))
        }

        if (nextValue != null) {
            this.addToStorage(this.getStorage(nextValue))
        }

        super.put(nextValue)
    }
}

export type ReferenceAtom = Mixin<typeof ReferenceAtom>


export class MinimalReferenceAtom extends ReferenceAtom(FieldAtom(MinimalChronoAtom)) {}
