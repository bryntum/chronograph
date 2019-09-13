import { AnyConstructor, AnyFunction } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
// we want the return type to match the type of the argument
// this does not work:
//      export const instanceOf = <T extends AnyConstructor<AnyFunction<object>>(base : T) : T => {
// the mixins wrapped with such declaration loses the type of return value
// because of this we apply some trickery to the argument type

export const instanceOf = <T>(arg : T) : T => {
    const mixin         = arg as unknown as AnyFunction<AnyConstructor<object>>

    const symbol        = Symbol(mixin.name)

    const isInstanceOf  = function (instance) : boolean {
        return Boolean(instance && instance[ symbol ])
    }

    // can also return a new function?
    return new Proxy(mixin, {
        get : function (target, property, receiver) {
            return property === Symbol.hasInstance ? isInstanceOf : target[ property ]
        },

        apply : function (target, context, args) {
            const extendedClass = target.call(context, ...args)

            extendedClass.prototype[ symbol ] = true

            return extendedClass
        }
    }) as any
}
