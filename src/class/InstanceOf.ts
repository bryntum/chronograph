import { AnyConstructor, AnyFunction } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
export const instanceOf = <T extends AnyConstructor<object>>(base : AnyFunction<T>) : AnyFunction<T> => {

    const symbol    = Symbol(base.name)

    return new Proxy(base, {
        get : function (target, property, receiver) {

            if (property === Symbol.hasInstance)
                return function (instance) : instance is T {
                    return Boolean(instance && instance[symbol])
                }
            else
                return target[ property ]
        },

        apply : function (target, thisArg, argumentsList) {
            const extendedClass = target.call(thisArg, ...argumentsList)

            extendedClass.prototype[ symbol ] = true

            return extendedClass
        }
    })
}
