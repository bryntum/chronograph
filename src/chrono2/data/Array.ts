import { AnyFunction, ClassUnion, Mixin } from "../../class/Mixin.js"
import { FieldAtom } from "../../replica2/Atom.js"
import { AtomState } from "../atom/Atom.js"
import { AtomCalculationPriorityLevel } from "../atom/Meta.js"
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
export class ReactiveArrayAtom<V extends unknown[] = unknown[]> extends Mixin(
    [ FieldAtom, CalculableBoxUnbound ],
    (base : ClassUnion<typeof CalculableBoxUnbound, typeof FieldAtom>) => {

    // @ts-ignore
    class ReactiveArrayAtom<V extends unknown[] = unknown[]> extends base {
        // @ts-ignore
        declare static new<V extends unknown[]> (config? : Partial<ReactiveArrayAtom<V>>) : ReactiveArrayAtom<V>

        immutable           : ReactiveArrayQuark

        level               : AtomCalculationPriorityLevel  = AtomCalculationPriorityLevel.DependsOnlyOnDependsOnlyOnUserInput

        lazy                : boolean                       = false
        sync                : boolean                       = true


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


        // set (at : number, newValue : unknown) {
        //     this.propagateStaleDeep(true)
        //
        //     const quark         = this.immutableForWrite()
        //
        //     quark.mutations.push({ kind : 'set', at, newValue })
        //
        //     this.state              = AtomState.Stale
        //
        //     if (this.graph) {
        //         this.graph.onDataWrite(this)
        //     }
        // }


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


        write (value : V) {
            this.addMutation({ kind : 'set', elements : value })
        }
    }

    return ReactiveArrayAtom
}){}


//---------------------------------------------------------------------------------------------------------------------
export class MappedReactiveArrayAtom<V = unknown> extends Mixin(
    [ ReactiveArrayAtom ],
    (base : ClassUnion<typeof ReactiveArrayAtom>) => {

    // @ts-ignore
    class MappedReactiveArrayAtom<V = unknown> extends base {
        // @ts-ignore
        declare static new<V> (config? : Partial<MappedReactiveArrayAtom<V>>) : MappedReactiveArrayAtom<V>

        source      : ReactiveArrayAtom         = undefined

        // get rootSource () : ReactiveArrayAtom {
        //     let root        = this.source
        //
        //     while (root instanceof MappedReactiveArrayAtom) root = root.source
        //
        //     return root
        // }

        func        : AnyFunction               = undefined


        splice (at : number, removeCount : number, ...newElements : unknown[]) {
            throw new Error("Mapped array is not mutable")
        }


        calculate () : BoxUnbound[] {
            this.source.read()
            // this.rootSource.read()

            const prevValue                     = this.immutable.read()
            let newValue : BoxUnbound[]         = prevValue ? prevValue.slice() : []

            // TODO should clear mutations?
            const mutations     = this.source.immutable.mutations

            for (let i = 0; i < mutations.length; i++) {
                const mutation  = mutations[ i ]

                switch (mutation.kind) {
                    case 'splice':
                        const newBoxes        = mutation.newElements.map(el => {
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

                        newValue.splice(mutation.at, mutation.removeCount, ...newBoxes)

                        this.immutable.mutations.push({
                            kind            : 'splice',
                            at              : mutation.at,
                            removeCount     : mutation.removeCount,
                            newElements     : newBoxes
                        })
                    break

                    case 'set':
                        newValue        = mutation.elements.map(el => {
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

                        this.immutable.mutations.push({
                            kind            : 'set',
                            elements        : newValue
                        })
                    break

                    default:
                        const a : never = mutation
                }
            }

            return newValue
        }
    }

    return MappedReactiveArrayAtom
}){}
