import { CI, MemoizedIterator, MI } from "../collection/Iterator.js"

//---------------------------------------------------------------------------------------------------------------------
const MixinIdentity         = Symbol('MixinIdentity')
const MixinStateProperty    = Symbol('MixinStateProperty')

export const VISITED_TOPOLOGICALLY      = -1

//---------------------------------------------------------------------------------------------------------------------
export type MixinStateExtension = {
    [MixinIdentity]         : symbol
    [MixinStateProperty]    : MixinState
}

export type MixinFunction   = ((base : AnyConstructor) => AnyConstructor) & MixinStateExtension

export type MixinClass      = AnyConstructor & MixinStateExtension


//---------------------------------------------------------------------------------------------------------------------
export type VisitState = {
    visitedAt       : number,
    from            : MixinState,
    topoLevel       : number
}

export class MixinWalkDepthState {
    sourceEl                        : MixinState                    = undefined

    private $elementsByTopoLevel    : Map<number, MixinState[]>     = undefined

    private $topoLevels             : number[]                      = undefined

    linearizedByTopoLevelsSource    : MemoizedIterator<MixinState>  = MI(this.linearizedByTopoLevels())


    static new (props : Partial<MixinWalkDepthState>) {
        const me    = new this()

        props && Object.assign(me, props)

        return me
    }


    get topoLevels () : number[] {
        if (this.$topoLevels !== undefined) return this.$topoLevels

        return this.$topoLevels = this.buildTopoLevels()
    }


    buildTopoLevels () : number[] {
        return Array.from(this.elementsByTopoLevel.keys()).sort((level1, level2) => level1 - level2)
    }


    get elementsByTopoLevel () : Map<number, MixinState[]> {
        if (this.$elementsByTopoLevel !== undefined) return this.$elementsByTopoLevel

        return this.$elementsByTopoLevel = this.buildElementsByTopoLevel()
    }


    getOrCreateLevel<T> (map : Map<number, T[]>, topoLevel : number) : T[] {
        let elementsAtLevel : T[]     = map.get(topoLevel)

        if (!elementsAtLevel) {
            elementsAtLevel     = []

            map.set(topoLevel, elementsAtLevel)
        }

        return elementsAtLevel
    }


    buildElementsByTopoLevel () : Map<number, MixinState[]> {
        let maxTopoLevel : number    = 0

        const map =
            CI(this.sourceEl.requirements)
            .map(mixin => mixin.walkDepthState.elementsByTopoLevel)
            .concat()
            .reduce(
                (elementsByTopoLevel, [ topoLevel, mixins ]) => {
                    if (topoLevel > maxTopoLevel) maxTopoLevel = topoLevel

                    this.getOrCreateLevel(elementsByTopoLevel, topoLevel).push(mixins)

                    return elementsByTopoLevel
                },
                new Map<number, MixinState[][]>()
            )

        this.getOrCreateLevel(map, maxTopoLevel + 1).push([ this.sourceEl ])

        return CI(map).map(([ level, elements ]) => {
            return [ level, CI(elements).concat().uniqueOnly().sort((mixin1, mixin2) => mixin1.id - mixin2.id) ]
        }).toMap()
    }


    * linearizedByTopoLevels () : Iterable<MixinState> {
        yield* CI(this.topoLevels).map(level => this.elementsByTopoLevel.get(level)).concat()
    }
}


//---------------------------------------------------------------------------------------------------------------------
export type MixinId         = number
export type MixinHash       = string

// Note: 65535 mixins only, because of the hashing function implementation
let MIXIN_ID : MixinId      = 1

const identity              = a => a

// possibly will need to use custom root base class, `class ZeroBaseClass {}` due to transpilation complications
const ZeroBaseClass         = Object

//---------------------------------------------------------------------------------------------------------------------
export class MixinState {
    id                          : MixinId               = MIXIN_ID++

    requirements                : MixinState[]          = []

    baseClass                   : AnyConstructor        = ZeroBaseClass

    identitySymbol              : symbol                = undefined

    mixinLambda                 : (base : AnyConstructor) => AnyConstructor  = identity

    walkDepthState              : MixinWalkDepthState   = MixinWalkDepthState.new({ sourceEl : this })

    // private $hash               : MixinHash             = ''
    private $minimalClass       : MixinClass            = undefined

    name                        : string                = ''

    static minimalClassesByLinearHash : Map<MixinHash, AnyConstructor> = new Map()
    static baseClassesIds : Map<AnyConstructor, MixinId> = new Map()


    static new (props : Partial<MixinState>) {
        const me    = new this()

        props && Object.assign(me, props)

        //------------------
        const mixinLambda                   = me.mixinLambda
        const symbol                        = me.identitySymbol = Symbol(mixinLambda.name)

        const mixinLambdaWrapper : MixinFunction          = Object.assign(function (base : AnyConstructor) : AnyConstructor {
            const extendedClass = mixinLambda(base)
            extendedClass.prototype[ symbol ] = true
            return extendedClass
        }, {
            [ MixinIdentity ]       : symbol,
            [ MixinStateProperty ]  : me
        })

        Object.defineProperty(mixinLambdaWrapper, Symbol.hasInstance, { value : isInstanceOfStatic })

        me.mixinLambda                      = mixinLambdaWrapper

        return me
    }


    get minimalClass () : MixinClass {
        if (this.$minimalClass !== undefined) return this.$minimalClass

        return this.$minimalClass = this.buildMinimalClass()
    }


    // get hash () : MixinHash {
    //     if (this.$hash !== '') return this.$hash
    //
    //     return this.$hash = this.buildHash()
    // }

    // buildHash () : MixinHash {
    //     return String.fromCharCode(...this.walkDepthState.linearizedByTopoLevelsSource.map(mixin => mixin.id))
    // }


    getBaseClassMixinId (baseClass : AnyConstructor) : MixinId {
        const constructor       = this.constructor as typeof MixinState

        const mixinId           = constructor.baseClassesIds.get(baseClass)

        if (mixinId !== undefined) return mixinId

        const newId             = MIXIN_ID++

        constructor.baseClassesIds.set(baseClass, newId)

        return newId
    }


    buildMinimalClass () : MixinClass {
        const constructor       = this.constructor as typeof MixinState

        let baseCls : AnyConstructor = this.baseClass

        const minimalClassConstructor : AnyConstructor = this.walkDepthState.linearizedByTopoLevelsSource.reduce(
            (acc, mixin) => {
                const { cls, hash } = acc
                const nextHash      = hash + String.fromCharCode(mixin.id)

                let wrapperCls      = constructor.minimalClassesByLinearHash.get(nextHash)

                if (!wrapperCls) {
                    wrapperCls      = mixin.mixinLambda(cls)
                    mixin.name      = wrapperCls.name

                    constructor.minimalClassesByLinearHash.set(nextHash, wrapperCls)
                }

                acc.cls             = wrapperCls
                acc.hash            = nextHash

                return acc
            },
            { cls : baseCls, hash : String.fromCharCode(this.getBaseClassMixinId(baseCls)) }
        ).cls

        const minimalClass : MixinClass = Object.assign(minimalClassConstructor, {
            [MixinIdentity]         : this.identitySymbol,
            [MixinStateProperty]    : this,
            mix                     : this.mixinLambda,
            $                       : this,
            toString                : this.toString.bind(this)
        })

        Object.defineProperty(minimalClass, Symbol.hasInstance, { value : isInstanceOfStatic })

        return minimalClass
    }


    toString () : string {
        return this.walkDepthState.linearizedByTopoLevelsSource.reduce(
            (acc : string, mixin : MixinState) => `${mixin.name}(${acc})`,
            this.baseClass.name
        )
    }
}



//---------------------------------------------------------------------------------------------------------------------
/*

Recommended base class.

*/
export class Base {

    initialize<T extends Base> (props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    static new<T extends typeof Base> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }
}

export type BaseConstructor             = typeof Base

//---------------------------------------------------------------------------------------------------------------------
export type AnyFunction<A = any>        = (...input : any[]) => A
export type AnyConstructor<A = object>  = new (...input : any[]) => A


//---------------------------------------------------------------------------------------------------------------------
export type MixinClassConstructor<T> =
    T extends AnyFunction<infer M> ?
        (M extends AnyConstructor<Base> ? M & BaseConstructor : M) & { mix : T }
    : never


//---------------------------------------------------------------------------------------------------------------------
export type MixinHelperFuncAny = <T>(required : AnyConstructor[], arg : T) =>
    T extends AnyFunction ?
        MixinClassConstructor<T>
    : never


export type MixinHelperFunc0 = <T>(required : [], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<object> ?
                object extends InstanceType<Base> ?
                    MixinClassConstructor<T>
                : never
            : never
        : never
    : never

export type MixinHelperFunc1 = <A1 extends AnyConstructor, T>(required : [ A1 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1>> ?
                InstanceType<A1> extends InstanceType<Base> ?
                    MixinClassConstructor<T>
                : never
            : never
        : never
    : never

export type MixinHelperFunc2 = <A1 extends AnyConstructor, A2 extends AnyConstructor, T>(required : [ A1, A2 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2>> ?
                InstanceType<A1> & InstanceType<A2> extends InstanceType<Base> ?
                    MixinClassConstructor<T>
                : never
            : never
        : never
    : never

export type MixinHelperFunc3 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, T>(required : [ A1, A2, A3 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> extends InstanceType<Base> ?
                    MixinClassConstructor<T>
                : never
            : never
        : never
    : never

export type MixinHelperFunc4 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, A4 extends AnyConstructor, T>(required : [ A1, A2, A3, A4 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4> extends InstanceType<Base> ?
                    MixinClassConstructor<T>
                : never
            : never
        : never
    : never

export type MixinHelperFunc5 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, A4 extends AnyConstructor, A5 extends AnyConstructor, T>(required : [ A1, A2, A3, A4, A5 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4> & InstanceType<A5>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4 & InstanceType<A5>> extends InstanceType<Base> ?
                    MixinClassConstructor<T>
                : never
            : never
        : never
    : never


//---------------------------------------------------------------------------------------------------------------------
export const mixin = <T>(required : (AnyConstructor | MixinClass)[], mixinLambda : T) : MixinClassConstructor<T> => {
    let baseClass : AnyConstructor

    if (required.length > 0) {
        const lastRequirement    = required[ required.length - 1 ]

        // avoid assigning ZeroBaseClass - it will be applied as default at the end
        if (!lastRequirement[ MixinStateProperty ]) baseClass = lastRequirement === ZeroBaseClass ? undefined : lastRequirement
    }

    const requirements : MixinState[]    = []

    required.forEach((requirement, index) => {
        const mixinState        = requirement[ MixinStateProperty ] as MixinState

        if (mixinState !== undefined) {
            const currentBaseClass  = mixinState.baseClass

            // ignore ZeroBaseClass - since those are compatible with any other base class
            if (currentBaseClass !== ZeroBaseClass) {
                // already found a base class different from ZeroBaseClass among requirements
                if (baseClass) {
                    // non-ZeroBaseClass base class requirements should match for all requirements
                    if (currentBaseClass !== baseClass) throw new Error("Base class mismatch")
                }
                else {
                    baseClass = currentBaseClass
                }
            }

            requirements.push(mixinState)
        }
        else {
            if (index !== required.length - 1) throw new Error("Base class should be provided as the last elements of the requirements array")
        }
    })

    if (!baseClass) baseClass = ZeroBaseClass

    //------------------
    const mixinState    = MixinState.new({ requirements, mixinLambda : mixinLambda as any, baseClass })

    return mixinState.minimalClass as any
}


//---------------------------------------------------------------------------------------------------------------------
// this function works both with default mixin class and mixin application function
// it supplied internally as [Symbol.hasInstance] for the default mixin class and mixin application function
const isInstanceOfStatic  = function (this : MixinStateExtension, instance : any) : boolean {
    return Boolean(instance && instance[ this[ MixinIdentity ] ])
}


//---------------------------------------------------------------------------------------------------------------------
// This is the `instanceof` analog with typeguard:
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
// though, the regular `instanceof` will also provide type narrowing now
export const isInstanceOf = <T>(instance : any, func : T)
    : instance is (T extends AnyConstructor<infer A> ? A : unknown) =>
{
    return Boolean(instance && instance[ func[ MixinIdentity ] ])
}


//---------------------------------------------------------------------------------------
export const Mixin : MixinHelperFunc0 & MixinHelperFunc1 & MixinHelperFunc2 & MixinHelperFunc3 & MixinHelperFunc4 & MixinHelperFunc5 = mixin as any
export const MixinAny : MixinHelperFuncAny = mixin as any
