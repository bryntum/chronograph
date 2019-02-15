export const uppercaseFirst = (str : string) : string => {
    return str.slice(0, 1).toUpperCase() + str.slice(1)
}


export const isAtomicValue = (value : any) : boolean => Object(value) !== value
