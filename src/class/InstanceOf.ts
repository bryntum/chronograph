import { AnyConstructor, AnyFunction } from "./Mixin.js"

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
    const mixin         = arg as unknown as AnyFunction<AnyConstructor<object>>

    const symbol        = Symbol(mixin.name)

    const wrapper       = function (base : AnyConstructor<object>) {
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
