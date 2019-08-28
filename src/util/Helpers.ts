//---------------------------------------------------------------------------------------------------------------------
export const uppercaseFirst = (str : string) : string => str.slice(0, 1).toUpperCase() + str.slice(1)


//---------------------------------------------------------------------------------------------------------------------
export const isAtomicValue = (value : any) : boolean => Object(value) !== value


//---------------------------------------------------------------------------------------------------------------------
export const typeOf = (value : any) : string => Object.prototype.toString.call(value).slice(8, -1)


//---------------------------------------------------------------------------------------------------------------------
export const defineProperty = <T extends object, S extends keyof T>(target : T, property : S, value : T[ S ]) : T[ S ] => {
    Object.defineProperty(target, property, { value })

    return value
}


//---------------------------------------------------------------------------------------------------------------------
const Storage   = Symbol('Storage')

export function lazyProperty <T extends object, Property extends keyof T> (target : T, property : Property, builder : () => T[ Property ]) : T[ Property ] {
    if (!target[ Storage ]) Object.defineProperty(target, Storage, { value : {}, enumerable : false })

    if (target[ Storage ][ property ] !== undefined) return target[ Storage ][ property ]

    return target[ Storage ][ property ] = builder()
}


//---------------------------------------------------------------------------------------------------------------------
export function clearLazyProperty <T extends object, Property extends keyof T> (target : T, property : Property) : T[ Property ] {
    if (!target[ Storage ]) Object.defineProperty(target, Storage, { value : {}, enumerable : false })

    const value         = target[ Storage ][ property ]

    target[ Storage ][ property ] = undefined

    return value
}


//---------------------------------------------------------------------------------------------------------------------
export const prototypeValue = (value : any) : PropertyDecorator => {

    return function (target : object, propertyKey : string | symbol) : void {
        target[ propertyKey ] = value
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const copyMapInto = <K, V>(sourceMap : Map<K, V>, targetMap : Map<K, V>) : Map<K, V> => {
    for (const [ key, value ] of sourceMap) targetMap.set(key, value)

    return targetMap
}
