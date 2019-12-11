//---------------------------------------------------------------------------------------------------------------------
const MixinIdentity         = Symbol('MixinIdentity')

export const VISITED_TOPOLOGICALLY      = -1

//---------------------------------------------------------------------------------------------------------------------
export type MixinFunction = (base : AnyConstructor) => AnyConstructor & { [MixinIdentity] : MixinState }
export type MixinClass = AnyConstructor & { [MixinIdentity] : MixinState }


//---------------------------------------------------------------------------------------------------------------------
export type VisitState = {
    visitedAt       : number,
    from            : MixinState,
    topoLevel       : number
}


export class MixinWalkDepthState {
    visited                 : Map<MixinState, VisitState>   = new Map()

    elementsByTopoLevel     : Map<number, MixinState[]>     = new Map()

    levels                  : number[]                      = []

    // dummy property to fix the leading * syntax error (on the next line)
    semicolon


    * next (mixinState : MixinState) : Iterable<MixinState> {
        yield* mixinState.requirementsAsMixinState()
    }


    * walkDepth (depth : number, fromEl : MixinState | null, iterator : Iterable<MixinState>) : Iterable<MixinState> {
        const visited : Map<MixinState, VisitState>  = this.visited

        for (const el of iterator) {
            let visitInfo       = visited.get(el)

            if (visitInfo.visitedAt == VISITED_TOPOLOGICALLY) {
                continue
            }

            if (visitInfo === undefined) {
                visitInfo       = { visitedAt : depth, from : fromEl, topoLevel : 0 }

                this.visited.set(el, visitInfo)

                yield* this.walkDepth(depth + 1, el, this.next(el))
            }

            if (visitInfo.visitedAt < depth) {
                // this.onCycle(el)

                throw new Error("Cyclic walk depth")
            }

            visitInfo.visitedAt = VISITED_TOPOLOGICALLY

            // yield element in topologically sorted position, however, not yet sorted by topological level
            yield el

            let maxTopoLevel : number    = 0

            for (const nextEl of this.next(el)) {
                const nextElVisit   = visited.get(nextEl)

                if (nextElVisit.topoLevel > maxTopoLevel) maxTopoLevel = nextElVisit.topoLevel
            }

            const topoLevel = visitInfo.topoLevel = maxTopoLevel + 1

            let elementsAtLevel : MixinState[]     = this.elementsByTopoLevel.get(topoLevel)

            if (!elementsAtLevel) {
                elementsAtLevel     = []

                this.elementsByTopoLevel.set(topoLevel, elementsAtLevel)
            }

            elementsAtLevel.push(el)
        }
    }


    processTopoLevels () {
        this.elementsByTopoLevel.forEach(level => level.sort((mixin1, mixin2) => mixin1.id - mixin2.id))

        this.levels     = Array.from(this.elementsByTopoLevel.keys())

        this.levels.sort((level1, level2) => level1 - level2)
    }


    * linearizedByTopoLevels () : Iterable<MixinState> {
        for (const level of this.levels) {
            yield* this.elementsByTopoLevel.get(level)
        }
    }


    restoreCycle (el : MixinState) {

    }
}


//---------------------------------------------------------------------------------------------------------------------
export type MixinId         = number
export type MixinHash       = string

let MIXIN_ID : MixinId      = 0

const identity              = a => a

//---------------------------------------------------------------------------------------------------------------------
export class MixinState {
    id                          : MixinId               = MIXIN_ID++

    requirements                : MixinFunction[]       = []

    linearizedRequirements      : MixinState[]          = undefined

    mixinLambda                 : (base : AnyConstructor) => AnyConstructor  = identity

    walkDepthState              : MixinWalkDepthState   = new MixinWalkDepthState()

    topoLevel                   : number                = 0

    private $hash               : MixinHash             = ''
    private $minimalClass       : AnyConstructor        = undefined


    get linearizedRequirements () : MixinState[] {
    }


    get minimalClass () : AnyConstructor {
        if (this.$minimalClass !== undefined) return this.$minimalClass

        return this.$minimalClass = this.buildMinimalClass()
    }


    get hash () : MixinHash {
        if (this.$hash !== '') return this.$hash

        return this.$hash = this.buildHash()
    }


    * requirementsAsMixinState () : Iterable<MixinState> {
        for (const requirement of this.requirements) yield requirement[ MixinIdentity ]
    }


    buildMinimalClass () : AnyConstructor {
        const walkDepthState    = this.walkDepthState

        for (const _ of walkDepthState.walkDepth(0, this, this.requirementsAsMixinState())) {}

        walkDepthState.processTopoLevels()

        let cls : AnyConstructor = Object

        const linearized        = Array.from(walkDepthState.linearizedByTopoLevels())

        const hash              = String.fromCharCode(...linearized.map(mixinState => mixinState.id))

        const constructor       = this.constructor as typeof MixinState

        const cached            = constructor.minimalClassesByLinearHash.get(hash)

        if (cached !== undefined) return cached

        for (const mixinState of walkDepthState.linearizedByTopoLevels()) {
            cls                 = mixinState.mixinLambda(cls)
        }

        return cls
    }


    buildHash () : MixinHash {
        return ''
    }


    toString () : string {
        return ''
    }

    // static fromAnyConstructor () : MixinState {
    //     return new this
    // }

    static minimalClassesByLinearHash : Map<MixinHash, AnyConstructor> = new Map()
}



//---------------------------------------------------------------------------------------------------------------------
/*

Recommended base class.

*/
export class Base {

    static mix<T extends typeof Base> (this : T, konstructor : AnyConstructor) : AnyConstructor {
        throw new Error("Abstract method 'mix' called")
    }


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
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

export type MixinConstructor<T extends AnyFunction> =
    T extends AnyFunction<infer M> ? (M extends AnyConstructor<Base> ? M & BaseConstructor : M) : ReturnType<T>


//---------------------------------------------------------------------------------------------------------------------
// very rough typing for a mixin function
// export type MixinFunction = (base : AnyConstructor) => AnyConstructor


//---------------------------------------------------------------------------------------------------------------------
export type MixinHelperFuncAny = <T>(required : AnyConstructor[], arg : T) =>
    T extends AnyFunction ?
        MixinConstructor<T> & { [SelfType] : T }
    : never


export type MixinHelperFunc1 = <A1 extends AnyConstructor, T>(required : [ A1 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1>> ?
                InstanceType<A1> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SelfType] : T }
                    : never
            : never
        : never
    : never

export type MixinHelperFunc2 = <A1 extends AnyConstructor, A2 extends AnyConstructor, T>(required : [ A1, A2 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2>> ?
                InstanceType<A1> & InstanceType<A2> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SelfType] : T }
                    : never
                : never
            : never
        : never

export type MixinHelperFunc3 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, T>(required : [ A1, A2, A3 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SelfType] : T }
                    : never
                : never
            : never
        : never

export type MixinHelperFunc4 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, A4 extends AnyConstructor, T>(required : [ A1, A2, A3, A4 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SelfType] : T }
                    : never
                : never
            : never
        : never

export type MixinHelperFunc5 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, A4 extends AnyConstructor, A5 extends AnyConstructor, T>(required : [ A1, A2, A3, A4, A5 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4> & InstanceType<A5>> ?
                    InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4 & InstanceType<A5>> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SelfType] : T }
                    : never
                : never
            : never
        : never


//---------------------------------------------------------------------------------------------------------------------
// const MixinIdentity         = Symbol('MixinIdentity')
const MixinRequirements     = Symbol('MixinRequirements')

const isInstanceOfStatic  = function (instance : any) : boolean {
    return Boolean(instance && instance[ this[ MixinIdentity ] ])
}

// we want the return type to match the type of the argument
// this does not work:
//      export const instanceOf = <T extends AnyConstructor<AnyFunction<object>>(base : T) : T => {
// the mixins wrapped with such declaration loses the type of return value
// because of this we just apply typecasting to the argument
export const instanceOf = <T>(arg : T) : T => {
    const mixin         = arg as unknown as MixinFunction

    const symbol        = Symbol(mixin.name)

    const wrapper       = function (base : AnyConstructor) : AnyConstructor {
        const extendedClass = mixin(base)

        extendedClass.prototype[ symbol ] = true

        return extendedClass
    }

    wrapper[ MixinIdentity ]        = symbol
    Object.defineProperty(wrapper, Symbol.hasInstance, { value : isInstanceOfStatic })

    return wrapper as any
}

export const SelfType = Symbol('SelfType')

export const mixin = <T>(required : (AnyConstructor<object> | MixinFunction)[], arg : T) : (T extends AnyFunction ? MixinConstructor<T> & { [SelfType] : MixinConstructor<T> } : never) => {
    const wrapper                   = instanceOf(arg) as any

    wrapper[ MixinRequirements ]    = required

    const reversed                  = required.slice().reverse() as [ any, ...any[] ]

    // no base class provided or the first provided required dependency is a mixin function
    if (reversed.length === 0 || reversed[ 0 ][ MixinIdentity ] !== undefined) {
        reversed.unshift(Base)
    }

    reversed.push(arg)

    // TODO should build full dependencies graph
    const Minimal                   = buildClass(...reversed) as any

    if (reversed[ 0 ] === Base) {
        wrapper.new         = function (props) {
            const instance      = Minimal.new() as any

            instance.initialize(props)

            return instance
        }
    } else {
        wrapper.new         = function (...args) {
            return new Minimal(...args)
        }
    }

    Object.defineProperty(wrapper, Symbol.species, { value : wrapper.new })

    return wrapper as any
}



//---------------------------------------------------------------------------------------------------------------------
// the `instanceof` analog with typeguard:
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
export const isInstanceOf = <T extends any>(instance : any, func : T)
    : instance is (T extends AnyFunction<infer Z> ? (Z extends AnyConstructor<infer X> ? X : unknown) : unknown) =>
{
    return Boolean(instance && instance[ func[ MixinIdentity ] ])
}


//---------------------------------------------------------------------------------------
const ClassIdentity = Symbol('ClassIdentity')

let counter : number = 0

const getClassId = (cls : AnyFunction | AnyConstructor) : number => {
    let classId = cls[ ClassIdentity ]

    if (!classId) classId = cls[ ClassIdentity ] = ++counter

    return classId
}

const classCache : Map<string, AnyConstructor> = new Map()

export const buildClass = <T extends object>(base : AnyConstructor<T>, ...mixins : MixinFunction[]) : AnyConstructor<T> => {
    const classId   = mixins.reduce(
        (classId : string, mixin : MixinFunction) => classId + '/' + getClassId(mixin),
        String(getClassId(base))
    )

    let cls         = classCache.get(classId)

    if (!cls) {
        cls       = mixins.reduce((klass : AnyConstructor, mixin : MixinFunction) => mixin ? mixin(klass) : klass, base)
        classCache.set(classId, cls)
    }

    return cls as AnyConstructor<T>
}

//---------------------------------------------------------------------------------------
const RequiredProperties = Symbol('RequiredProperties')

export const required : PropertyDecorator = (proto : object, propertyKey : string | symbol) : void => {
    let required  = proto[ RequiredProperties ]

    if (!required) required = proto[ RequiredProperties ] = []

    required.push(propertyKey)
}

export const validateRequiredProperties = (context : any) => {
    const required      = context[ RequiredProperties ]

    if (required) {
        for (let i = 0; i < required.length; i++)
            if (context[ required[ i ] ] === undefined) throw new Error(`Required attribute [${ String(required[ i ]) }] is not provided`)
    }
}


//---------------------------------------------------------------------------------------
export const Mixin : MixinHelperFunc1 & MixinHelperFunc2 & MixinHelperFunc3 & MixinHelperFunc4 & MixinHelperFunc5 = mixin as any
export const MixinAny : MixinHelperFuncAny = mixin as any
