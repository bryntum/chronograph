import { DEBUG_ONLY } from "../environment/Debug.js"

const RequiredProperties = Symbol('RequiredProperties')

const emptyFn = () => undefined

export const required : PropertyDecorator = DEBUG_ONLY((proto : object, propertyKey : string | symbol) : void => {
    let required  = proto[ RequiredProperties ]

    if (!required) required = proto[ RequiredProperties ] = []

    required.push(propertyKey)
})


export const validateRequiredProperties = DEBUG_ONLY((context : any) => {
    const required      = context[ RequiredProperties ]

    if (required) {
        for (let i = 0; i < required.length; i++)
            if (context[ required[ i ] ] === undefined) throw new Error(`Required attribute [${ String(required[ i ]) }] is not provided`)
    }
})
