export const uppercaseFirst = (str : string) : string => {
    return str.slice(0, 1).toUpperCase() + str.slice(1)
}


export const isAtomicValue = (value : any) : boolean => Object(value) !== value


export const lazyBuild = <T extends object, S extends keyof T>(target : T, property : S, value : T[ S ]) : T[ S ] => {
    Object.defineProperty(target, property, { value : value })

    return value
}
