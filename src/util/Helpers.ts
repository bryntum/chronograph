import { CI } from "../collection/Iterator.js"

//---------------------------------------------------------------------------------------------------------------------
// assume 32-bit platform (https://v8.dev/blog/react-cliff)
// Note - can not use: expression like: -Math.pow(2, 30) - v8 does not recognize it as SMI
export const MIN_SMI = -1073741824
export const MAX_SMI = 1073741823


//---------------------------------------------------------------------------------------------------------------------
export const identity = <V>(value : V) : V => value


//---------------------------------------------------------------------------------------------------------------------
export type Equality = (v1 : unknown, v2 : unknown) => boolean

export const strictEquality : Equality = <V>(v1 : V, v2 : V) : boolean => v1 === v2


//---------------------------------------------------------------------------------------------------------------------
export const uppercaseFirst = (str : string) : string => str.slice(0, 1).toUpperCase() + str.slice(1)


//---------------------------------------------------------------------------------------------------------------------
export const isAtomicValue = (value : any) : boolean => Object(value) !== value


//---------------------------------------------------------------------------------------------------------------------
export const typeOf = (value : any) : string => Object.prototype.toString.call(value).slice(8, -1)


//---------------------------------------------------------------------------------------------------------------------
export const defineProperty = <T extends object, S extends keyof T>(target : T, property : S, value : T[ S ]) : T[ S ] => {
    Object.defineProperty(target, property, { value, enumerable : true, configurable : true })

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


//---------------------------------------------------------------------------------------------------------------------
export const copySetInto = <V>(sourceSet : Set<V>, targetSet : Set<V>) : Set<V> => {
    for (const value of sourceSet) targetSet.add(value)

    return targetSet
}


//---------------------------------------------------------------------------------------------------------------------
export const copyArray = <T>(array : T[]) : T[] => {
    const len       = array.length
    const res       = new Array(len)

    for (let i = 0; i < len; i++) res[ i ] = array[ i ]

    return res
}


//---------------------------------------------------------------------------------------------------------------------
export const delay = (timeout : number) : Promise<any> => new Promise(resolve => setTimeout(resolve, timeout))


//---------------------------------------------------------------------------------------------------------------------
export const matchAll = function* (regexp : RegExp, testStr : string) : Generator<string[]> {
    let match : string[]

    while ((match = regexp.exec(testStr)) !== null) {
        yield match
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const allMatches = function (regexp : RegExp, testStr : string) : string[] {
    return CI(matchAll(regexp, testStr)).map(match => CI(match).drop(1)).concat().toArray()
}


//---------------------------------------------------------------------------------------------------------------------
declare const regeneratorRuntime : any

let isRegeneratorRuntime : boolean | null = null

export const isGeneratorFunction = function (func : any) : boolean {
    if (isRegeneratorRuntime === null) isRegeneratorRuntime = typeof regeneratorRuntime !== 'undefined'

    if (isRegeneratorRuntime === true) {
        return regeneratorRuntime.isGeneratorFunction(func)
    } else {
        return func.constructor.name === 'GeneratorFunction'
    }
}


