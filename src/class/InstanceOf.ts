import { AnyConstructor, AnyFunction, Mixin } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
// we want the return type to match the type of the argument
// this does not work:
//      export const instanceOf = <T extends AnyConstructor<AnyFunction<object>>(base : T) : T => {
// the mixins wrapped with such declaration loses the type of return value
// because of this we apply some trickery to the argument type

const MixinIdentity  = Symbol('MixinIdentity')

const isInstanceOfStatic  = function (instance) : boolean {
    return Boolean(instance && instance[ this[ MixinIdentity ] ])
}


export const instanceOf = <T>(arg : T) : T => {
    const mixin         = arg as unknown as AnyFunction<AnyConstructor<object>>

    const symbol        = Symbol(mixin.name)

    // seems one can not assign a new value for the `Symbol.hasInstance` property of the function
    // so we have to return proxy to intercept
    return new Proxy(mixin, {
        get : function (target, property, receiver) {
            if (property === Symbol.hasInstance) return isInstanceOfStatic

            if (property === MixinIdentity) return symbol

            return target[ property ]
        },

        apply : function (target, context, args) {
            const extendedClass = target.call(context, ...args)

            extendedClass.prototype[ symbol ] = true

            return extendedClass
        }
    }) as any
}


export const isInstanceOf = <T extends any>(instance : any, func : T)
    : instance is (T extends AnyFunction<infer Z> ? (Z extends AnyConstructor<infer X> ? X : unknown) : unknown) =>
{
    return Boolean(instance && instance[ func[ MixinIdentity ] ])
}
