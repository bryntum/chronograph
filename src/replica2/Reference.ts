import { AtomState } from "../chrono2/atom/Atom.js"
import { AtomCalculationPriorityLevel } from "../chrono2/atom/Meta.js"
import { CalculationFunction, CalculationMode, CalculationModeSync } from "../chrono2/CalculationMode.js"
import { ChronoGraph } from "../chrono2/graph/Graph.js"
import { AnyConstructor, isInstanceOf, Mixin } from "../class/Mixin.js"
import { Field, Name } from "../schema2/Field.js"
import { FieldAtomConstructor, FieldCalculableBox } from "./Atom.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { ReferenceBucketAtom } from "./ReferenceBucket.js"

//---------------------------------------------------------------------------------------------------------------------
export type ResolverFunc    = (locator : any) => Entity


//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a reference field of the entity. Requires the [[Field]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class ReferenceField extends Mixin(
    [ Field ],
    (base : AnyConstructor<Field, typeof Field>) =>

class ReferenceField extends base {
    atomCls             : FieldAtomConstructor  = ReferenceAtom

    resolver            : ResolverFunc          = undefined

    /**
     * The name of the "bucket" field on this reference's value. The entity to which this reference field belongs
     * will be added to that "bucket"
     */
    bucket              : Name                  = undefined

    level               : AtomCalculationPriorityLevel  = AtomCalculationPriorityLevel.DependsOnlyOnUserInput

    // explicitly not lazy and sync
    lazy                : boolean               = false
    sync                : boolean               = true
}){}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Specialized version of the [field](_replica_entity_.html#field) decorator, which should be used to mark the references.
 * All it does is replace the default value of the second argument to the [[ReferenceField]].
 *
 * ```ts
 * class Author extends Person {
 *     @bucket()
 *     books           : Set<Book>
 * }
 *
 * class Book extends Entity.mix(Base) {
 *     @reference({ bucket : 'books' })
 *     writtenBy       : Author
 * }
 * ```
 *
 * @param fieldConfig Object with the configuration properties
 * @param fieldCls Optional. Default value has been changed to [[ReferenceField]]
 */
export const reference : FieldDecorator<typeof ReferenceField> =
    (fieldConfig?, fieldCls = ReferenceField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceAtom extends Mixin(
    [ FieldCalculableBox ],
    (base : AnyConstructor<FieldCalculableBox, typeof FieldCalculableBox>) => {

    class ReferenceAtom extends base {
        level           : AtomCalculationPriorityLevel  = AtomCalculationPriorityLevel.DependsOnlyOnUserInput

        field           : ReferenceField                = undefined

        lazy            : boolean                       = false


        hasBucket () : boolean {
            return Boolean(this.field.bucket)
        }


        getBucket (entity : Entity) : ReferenceBucketAtom {
            return entity.$[ this.field.bucket ]
        }


        get context () : unknown {
            return this
        }
        set context (value : unknown) {
        }


        get calculation () : CalculationFunction<Entity, CalculationModeSync> {
            return this.calculate
        }
        set calculation (value : CalculationFunction<Entity, CalculationModeSync>) {
        }

        calculate () : Entity {
            const proposedValue     = this.proposedValue

            if (proposedValue === null) return null

            const value : Entity    = isInstanceOf(proposedValue, Entity) ? proposedValue : this.resolve(proposedValue)

            if (value && this.graph && this.hasBucket() && isInstanceOf(value, Entity)) {
                this.getBucket(value).addToBucket(this.self)
            }

            return value
        }


        resolve (locator : any) : Entity | null {
            const resolver  = this.field.resolver

            return resolver ? resolver.call(this.self, locator) : null
        }


        enterGraph (graph : ChronoGraph) {
            if (this.hasBucket()) {
                const value     = this.proposedValue !== undefined ? this.proposedValue : this.immutable.read()

                if (value instanceof Entity) {
                    this.getBucket(value).addToBucket(this.self)
                }
            }

            super.enterGraph(graph)
        }


        leaveGraph (graph : ChronoGraph) {
            if (this.hasBucket()) {
                const value     = this.immutable.read()

                if (value instanceof Entity) {
                    this.getBucket(value).removeFromBucket(this.self)
                }
            }

            super.leaveGraph(graph)
        }


        writeConfirmedDifferentValue (value : Entity) {
            if (this.hasBucket()) {
                const previousValue     = this.immutable.read()

                if (previousValue instanceof Entity) {
                    this.getBucket(previousValue).removeFromBucket(this.self)
                }

                if (value instanceof Entity) {
                    // TODO just the following line ??
                    // this.getBucket(value).addToBucket(this.self)

                    this.getBucket(value).state = AtomState.Stale

                    if (this.graph) {
                        this.graph.onDataWrite(this.getBucket(value))
                    }
                }
            }

            super.writeConfirmedDifferentValue(value)
        }
    }

    return ReferenceAtom
}){}
