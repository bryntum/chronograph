import { AnyConstructor, AnyFunction, Base, MixinConstructor, MixinFunction } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
const MixinIdentity         = Symbol('MixinIdentity')
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

export const SELF = Symbol('SELF')

export const mixin = <T>(required : (AnyConstructor<object> | MixinFunction)[], arg : T) : (T extends AnyFunction ? MixinConstructor<T> & { [SELF] : MixinConstructor<T> } : never) => {
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
