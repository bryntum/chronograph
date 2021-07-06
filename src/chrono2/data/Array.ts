import { serializable, Serializable } from "typescript-serializable-mixin/index.js"
import { AnyFunction, ClassUnion, Mixin } from "../../class/Mixin.js"
import { FieldAtom } from "../../replica2/Atom.js"
import { AtomState } from "../atom/Atom.js"
import { CalculationFunction, CalculationModeSync } from "../CalculationMode.js"
import { BoxImmutable, BoxUnbound, BoxUnboundPre } from "./Box.js"
import { CalculableBoxUnbound } from "./CalculableBox.js"


//---------------------------------------------------------------------------------------------------------------------
type ArrayMutation = {
    kind        : 'splice',
    at          : number,
    removeCount : number,
    newElements : unknown[]
} | {
    kind        : 'set',
    elements    : unknown[]
}

//---------------------------------------------------------------------------------------------------------------------
@serializable({ id : 'ReactiveArrayQuark' })
export class ReactiveArrayQuark extends Mixin(
    [ BoxImmutable ],
    (base : ClassUnion<typeof BoxImmutable>) =>

    class ReactiveArrayQuark extends base {
        mutations           : ArrayMutation[]   = []

        value               : BoxUnbound[]      = undefined


        hasProposedValue () : boolean {
            return this.mutations.length > 0
        }
    }
){}

const zeroArrayQuark = new ReactiveArrayQuark(undefined)

zeroArrayQuark.freeze()

ReactiveArrayQuark.zero = zeroArrayQuark


//---------------------------------------------------------------------------------------------------------------------
@serializable({ id : 'ReactiveArrayAtom' })
export class ReactiveArray<V> extends Mixin(
    [ FieldAtom, CalculableBoxUnbound ],
    (base : ClassUnion<typeof CalculableBoxUnbound, typeof FieldAtom>) => {

    // @ts-ignore
    class ReactiveArray<V> extends base {
        // @ts-ignore
        declare static new<V> (config? : Partial<ReactiveArray<V>>) : ReactiveArray<V>

        V                   : BoxUnbound<V>[]
        OwnV                : V

        immutable           : ReactiveArrayQuark

        // level               : AtomCalculationPriorityLevel  = AtomCalculationPriorityLevel.DependsOnlyOnDependsOnlyOnUserInput

        lazy                : boolean                       = false
        sync                : boolean                       = true

        override persistent  : boolean                   = true


        hasProposedValue () : boolean {
            return this.immutable.hasProposedValue()
        }


        buildDefaultImmutable () : ReactiveArrayQuark {
            const defaultBoxImmutable       = new ReactiveArrayQuark(this)

            defaultBoxImmutable.previous    = zeroArrayQuark as any

            return defaultBoxImmutable
        }


        itemBox (at : number) : BoxUnbound {
            return this.read()[ at ]
        }


        item (at : number) : V {
            return this.read()[ at ].read()
        }


        addMutation (mutation : ArrayMutation) {
            this.propagateStaleDeep(true)

            const quark             = this.immutableForWrite()

            quark.mutations.push(mutation)

            this.state              = AtomState.Stale

            if (this.graph) {
                this.graph.onDataWrite(this)
            }
        }


        splice (at : number, removeCount : number, ...newElements : unknown[]) {
            this.addMutation({ kind : 'splice', at, removeCount, newElements })
        }


        push (...newElements : unknown[]) {
            const currentValue      = this.read() as BoxUnbound[]

            this.splice(currentValue.length, 0, ...newElements)
        }


        map (func : AnyFunction) /*: MappedReactiveArrayAtom */{
            const mappedReactiveArrayAtom = MappedReactiveArrayAtom as any

            const mappedArray       = mappedReactiveArrayAtom.new()

            Object.assign(mappedArray, { source : this, func })

            this.graph.addAtom(mappedArray)

            return mappedArray
        }


        get (at : number) {
            return this.itemBox(at).read()
        }


        set (at : number, newValue : unknown) {
            this.itemBox(at).write(newValue)
        }


        // @ts-ignore
        get context () : unknown {
            return this
        }
        set context (value : unknown) {
        }

        get calculation () : CalculationFunction<BoxUnbound[], CalculationModeSync> {
            return this.calculate
        }
        set calculation (value : CalculationFunction<BoxUnbound[], CalculationModeSync>) {
        }

        calculate () : BoxUnbound[] {
            const prevValue                 = this.immutable.read()
            let newValue : BoxUnbound[]     = prevValue ? prevValue.slice() : []

            // TODO should clear mutations?
            const mutations     = this.immutable.mutations

            for (let i = 0; i < mutations.length; i++) {
                const mutation  = mutations[ i ]

                switch (mutation.kind) {
                    case 'splice':
                        const newBoxes        = mutation.newElements.map(el => {
                            const newBox        = BoxUnbound.new(el)

                            this.graph.addAtom(newBox)

                            return newBox
                        })

                        newValue.splice(mutation.at, mutation.removeCount, ...newBoxes)
                    break

                    case 'set':
                        newValue            = mutation.elements.map(el => {
                            const newBox        = BoxUnbound.new(el)

                            this.graph.addAtom(newBox)

                            return newBox
                        })

                    break

                    default:
                        const a : never = mutation
                }

            }

            return newValue
        }


        write (value : V[]) {
            this.addMutation({ kind : 'set', elements : value })
        }


        readValues () : this[ 'OwnV' ][] {
            const boxes     = super.read()

            return boxes.map(box => box.read())
        }


        updateValue (newValue : V) {
            super.updateValue(newValue)

            // freeze the immutable so that new mutation will create a new quark
            this.immutable.freeze()
        }
    }

    return ReactiveArray
}){}

export interface ReactiveArray<V> {
    OwnV                : V
    V                   : BoxUnbound<V>[]
}

//---------------------------------------------------------------------------------------------------------------------
@serializable({ id : 'MappedReactiveArrayAtom' })
export class MappedReactiveArrayAtom<V = unknown> extends Mixin(
    [ ReactiveArray, Serializable ],
    (base : ClassUnion<typeof ReactiveArray, typeof Serializable>) => {

    // @ts-ignore
    class MappedReactiveArrayAtom<V = unknown> extends base {
        // @ts-ignore
        declare static new<V> (config? : Partial<MappedReactiveArrayAtom<V>>) : MappedReactiveArrayAtom<V>

        source      : ReactiveArray<V>              = undefined
        sourceQuark : ReactiveArrayQuark            = undefined

        func        : AnyFunction                   = undefined

        override persistent  : boolean              = true


        addMutation (mutation : ArrayMutation) {
            throw new Error("Mapped array is not mutable")
        }


        mapElements (elements : unknown[]) : CalculableBoxUnbound[] {
            return elements.map(el => {
                const newBox        = CalculableBoxUnbound.new({
                    calculation : () => {
                        let value       = el

                        while (value instanceof BoxUnboundPre) value = value.read()

                        return this.func(value)
                    }
                })

                this.graph.addAtom(newBox)

                return newBox
            })
        }


        applyMutation (newValue : BoxUnbound[], mutation : ArrayMutation) : BoxUnbound[] {
            switch (mutation.kind) {
                case 'splice':
                    const newBoxes        = this.mapElements(mutation.newElements)

                    newValue.splice(mutation.at, mutation.removeCount, ...newBoxes)

                    this.immutable.mutations.push({
                        kind            : 'splice',
                        at              : mutation.at,
                        removeCount     : mutation.removeCount,
                        newElements     : newBoxes
                    })
                break

                case 'set':
                    newValue        = this.mapElements(mutation.elements)

                    this.immutable.mutations.push({
                        kind            : 'set',
                        elements        : newValue
                    })
                break

                default:
                    const a : never = mutation
            }

            return newValue
        }


        calculate () : BoxUnbound[] {
            const sourceValue                   = this.source.read()

            if (this.sourceQuark) {
                const pendingSourceQuarks : ReactiveArrayQuark[]       = []

                let quark : ReactiveArrayQuark  = this.source.immutable

                while (quark) {
                    pendingSourceQuarks.push(quark)

                    if (quark === this.sourceQuark) break

                    quark                       = quark.previous
                }

                let newValue : BoxUnbound[]     = this.immutable.read().slice()

                for (let i = pendingSourceQuarks.length - 1; i >= 0; i--) {
                    const mutations             = pendingSourceQuarks[ i ].mutations

                    for (let i = 0; i < mutations.length; i++) newValue = this.applyMutation(newValue, mutations[ i ])
                }

                this.sourceQuark                = this.source.immutable

                return newValue
            } else {
                this.sourceQuark                = this.source.immutable

                return this.mapElements(sourceValue)
            }

            // const prevValue                     = this.immutable.read()
            // let newValue : BoxUnbound[]         = prevValue ? prevValue.slice() : this.mapElements(sourceValue)
            //
            // const mutations                     = this.source.immutable.mutations
            //
            // for (let i = 0; i < mutations.length; i++) {
            //     this.applyMutation(newValue, mutations[ i ])
            // }
            //
            // return newValue
        }
    }

    return MappedReactiveArrayAtom
}){}
