import {ChronoAtom, ChronoValue, MinimalChronoAtom} from "../chrono/Atom.js";
import {ChronoGraph} from "../chrono/Graph.js";
import {Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Field, Name} from "../schema/Field.js";
import {FieldAtom, MinimalFieldAtom} from "./Atom.js";
import {Entity, generic_field} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export type ResolverFunc    = (locator : any) => Entity


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceField extends Field {
    atomCls             : MixinConstructor<typeof FieldAtom>    = MinimalReferenceAtom

    resolver            : ResolverFunc

    storageKey          : Name
}


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceStorageField extends Field {
    persistent          : boolean   = false

    atomCls             : MixinConstructor<typeof FieldAtom>    = MinimalReferenceStorageAccumulator
}


//---------------------------------------------------------------------------------------------------------------------
export const storage : PropertyDecorator = generic_field(ReferenceStorageField)


export const reference = function (storageKey : string) : PropertyDecorator {
    return generic_field(ReferenceField, { storageKey })
}

export const resolver = function (resolverFunc : ResolverFunc) : PropertyDecorator {

    return function (target : Entity, propertyKey : string) : void {
        if (!target.hasOwnProperty('$entity'))
            throw new Error("No entity on the target class - check the order of decorators. " +
                "The `resolver` decorator should be above of one of the fields decorators")

        const entity            = target.$entity
        const field             = entity.getField(propertyKey)

        if (!field)
            throw new Error(`No field [${propertyKey}] on the target class - check the order of decorators.` +
                "The `resolver` decorator should be above of one of the fields decorators")

        if (!(field instanceof ReferenceField))
            throw new Error(`The field [${propertyKey}] on the target class is not a reference field`)
        else
            field.resolver      = resolverFunc
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceStorageAtom = <T extends Constructable<FieldAtom>>(base : T) =>

class ReferenceStorageAtom extends base {
    // upgrade the type of the `incoming` property
    incoming        : Set<MinimalReferenceAtom>

    oldRefs         : Set<ChronoAtom>       = new Set()
    newRefs         : Set<ChronoAtom>       = new Set()

    value           : Set<Entity>           = new Set();


    * calculate (proposedValue : ChronoValue) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        const result        = new Set()

        let atom : ChronoAtom

        for (atom of this.incoming) {
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

    value           : Entity


    addToStorage (storage : ReferenceStorageAtom) {
        storage.newRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(storage)
    }


    removeFromStorage (storage : ReferenceStorageAtom) {
        storage.oldRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(storage)
    }


    * calculate (proposedValue : this[ 'value' ]) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        return this.resolve(proposedValue !== undefined ? proposedValue : this.value)
    }


    resolve (referencee : any) : Entity {
        const resolver  = this.field.resolver

        if (resolver && referencee !== undefined && Object(referencee) !== referencee) {
            return resolver.call(this.self, referencee)
        } else {
            return referencee
        }
    }


    getStorage (entity : Entity) : ReferenceStorageAtom {
        return entity.$[ this.field.storageKey ]
    }


    onEnterGraph (graph : ChronoGraph) {
        const value     = this.value

        let resolves    = true

        if (value !== undefined && Object(value) !== value) {
            resolves        = false

            const resolved  = this.resolve(value)

            // last point where it is safe to just rewrite own value
            // after `super.onEnterGraph` that will be causing effects outside of atom
            if (Object(resolved) === resolved) {
                this.value  = resolved

                resolves    = true
            }
        }

        super.onEnterGraph(graph)

        if (this.hasStableValue() && resolves) {
            const referenceStorage  = this.getStorage(this.value)

            this.addToStorage(referenceStorage)
        }
    }


    onLeaveGraph (graph : ChronoGraph) {
        if (this.hasStableValue()) {
            const referenceStorage  = this.getStorage(this.value)

            this.removeFromStorage(referenceStorage)
        }

        super.onLeaveGraph(graph)
    }


    put (nextValue : this[ 'value']) {
        const value     = this.value

        // value is not empty and resolved to entity
        if (value != null && Object(value) === value) {
            this.removeFromStorage(this.getStorage(value))
        }

        if (nextValue != null && Object(nextValue) === nextValue) {
            this.addToStorage(this.getStorage(nextValue))
        }

        super.put(nextValue)
    }
}

export type ReferenceAtom = Mixin<typeof ReferenceAtom>


export class MinimalReferenceAtom extends ReferenceAtom(FieldAtom(MinimalChronoAtom)) {}
