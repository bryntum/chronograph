//---------------------------------------------------------------------------------------------------------------------
export const uppercaseFirst = (str : string) : string => str.slice(0, 1).toUpperCase() + str.slice(1)


//---------------------------------------------------------------------------------------------------------------------
export const isAtomicValue = (value : any) : boolean => Object(value) !== value


//---------------------------------------------------------------------------------------------------------------------
export const typeOf = (value : any) : string => Object.prototype.toString.call(value).slice(8, -1)


//---------------------------------------------------------------------------------------------------------------------
export function lazyProperty <T extends object, Property extends keyof T> (target : T, storage : string | symbol, builder : () => T[ Property ]) : T[ Property ] {
    if (target[ storage ] !== undefined) return target[ storage ]

    return target[ storage ] = builder()
}


//---------------------------------------------------------------------------------------------------------------------
export function clearLazyProperty (target : object, storage : string | symbol) : any {
    const value         = target[ storage ]

    target[ storage ]   = undefined

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
