import { AtomState } from "../chrono2/atom/Atom.js"
import { AtomCalculationPriorityLevel } from "../chrono2/atom/Meta.js"
import { CalculationFunction, CalculationModeSync } from "../chrono2/CalculationMode.js"
import { BoxImmutable } from "../chrono2/data/Box.js"
import { AnyConstructor, ClassUnion, Mixin } from "../class/Mixin.js"
import { Field } from "../schema2/Field.js"
import { FieldAtomConstructor, FieldCalculableBox } from "./Atom.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a reference bucket field of the entity. Requires the [[Field]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class ReferenceBucketField extends Mixin(
    [ Field ],
    (base : AnyConstructor<Field, typeof Field>) =>

class ReferenceBucketField extends base {
    persistent          : boolean   = false

    atomCls             : FieldAtomConstructor      = ReferenceBucketAtom

    level               : AtomCalculationPriorityLevel = AtomCalculationPriorityLevel.DependsOnlyOnDependsOnlyOnUserInput

    // explicitly not lazy and sync
    lazy                : boolean               = false
    sync                : boolean               = true
}){}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Specialized version of the [field](_replica_entity_.html#field) decorator, which should be used to mark the reference buckets.
 * All it does is replace the default value of the second argument to the [[ReferenceBucketField]].
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
 * @param fieldConfig Object with the field configuration properties
 * @param fieldCls Optional. Default value has been changed to [[ReferenceBucketField]]
 */
export const bucket : FieldDecorator<typeof ReferenceBucketField> =
    (fieldConfig?, fieldCls = ReferenceBucketField) => generic_field(fieldConfig, fieldCls)


enum BucketMutationType {
    'Add'       = 'Add',
    'Remove'    = 'Remove'
}

type BucketMutation  = {
    type        : BucketMutationType,
    entity      : Entity
}

//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketQuark extends Mixin(
    [ BoxImmutable ],
    (base : ClassUnion<typeof BoxImmutable>) =>

class ReferenceBucketQuark extends base {
    mutations           : BucketMutation[]  = []

    // previousValue       : Set<Entity>   = undefined


    // hasProposedValueInner () : boolean {
    //     return this.mutations.length > 0
    // }
}){}



//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketAtom extends Mixin(
    [ FieldCalculableBox ],
    (base : ClassUnion<typeof FieldCalculableBox>) => {

    class ReferenceBucketAtom extends base {
        immutable           : ReferenceBucketQuark

        level               : AtomCalculationPriorityLevel = AtomCalculationPriorityLevel.DependsOnlyOnDependsOnlyOnUserInput

        field               : ReferenceBucketField          = undefined

        lazy                : boolean                       = false


        buildDefaultImmutable () : ReferenceBucketQuark {
            const defaultBoxImmutable       = new ReferenceBucketQuark(this)

            defaultBoxImmutable.previous    = BoxImmutable.zero as any

            return defaultBoxImmutable
        }


        addToBucket (entity : Entity) {
            this.propagateStaleDeep(true)

            const quark         = this.immutableForWrite()

            quark.mutations.push({ type : BucketMutationType.Add, entity })

            this.state              = AtomState.Stale

            if (this.graph) {
                this.graph.onDataWrite(this)
            }
        }


        removeFromBucket (entity : Entity) {
            this.propagateStaleDeep(true)

            const quark         = this.immutableForWrite()

            quark.mutations.push({ type : BucketMutationType.Remove, entity })

            this.state              = AtomState.Stale

            if (this.graph) {
                this.graph.onDataWrite(this)
            }
        }


        get context () : unknown {
            return this
        }
        set context (value : unknown) {
        }

        get calculation () : CalculationFunction<Set<Entity>, CalculationModeSync> {
            return this.calculate
        }
        set calculation (value : CalculationFunction<Set<Entity>, CalculationModeSync>) {
        }

        calculate () : Set<Entity> {
            const newValue : Set<Entity>        = new Set(this.immutable.read())

            const mutations     = this.immutable.mutations

            for (let i = 0; i < mutations.length; i++) {
                const { type, entity } = mutations[ i ]

                if (type === BucketMutationType.Remove) {
                    newValue.delete(entity)
                }
                else if (type === BucketMutationType.Add) {
                    newValue.add(entity)
                }
            }

            return newValue
        }
    }

    return ReferenceBucketAtom
}){}
