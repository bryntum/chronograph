import { AnyConstructor, AnyFunction } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
export const instanceOf = <T extends AnyConstructor<object>>(base : AnyFunction<T>) : AnyFunction<T> => {

    const symbol        = Symbol(base.name)

    const isInstanceOf  = function (instance) : instance is T {
        return Boolean(instance && instance[ symbol ])
    }

    return new Proxy(base, {
        get : function (target, property, receiver) {
            return property === Symbol.hasInstance ? isInstanceOf : target[ property ]
        },

        apply : function (target, context, args) {
            const extendedClass = target.call(context, ...args)

            extendedClass.prototype[ symbol ] = true

            return extendedClass
        }
    })
}
