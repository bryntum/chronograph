import { AnyConstructor, AnyFunction, MixinFunction } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
const MixinIdentity  = Symbol('MixinIdentity')

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

export const buildClass = (base : AnyConstructor, ...mixins : MixinFunction[]) : AnyConstructor => {
    const classId   = mixins.reduce(
        (classId : string, mixin : MixinFunction) => classId + '/' + getClassId(mixin),
        String(getClassId(base))
    )

    let cls         = classCache.get(classId)

    if (!cls) {
        cls       = mixins.reduce((klass : AnyConstructor, mixin : MixinFunction) => mixin ? mixin(klass) : klass, base)
        classCache.set(classId, cls)
    }

    return cls
}
