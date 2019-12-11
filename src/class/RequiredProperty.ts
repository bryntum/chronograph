const RequiredProperties = Symbol('RequiredProperties')

export const required : PropertyDecorator = (proto : object, propertyKey : string | symbol) : void => {
    let required  = proto[ RequiredProperties ]

    if (!required) required = proto[ RequiredProperties ] = []

    required.push(propertyKey)
}

export const validateRequiredProperties = (context : any) => {
    const required      = context[ RequiredProperties ]

    if (required) {
        for (let i = 0; i < required.length; i++)
            if (context[ required[ i ] ] === undefined) throw new Error(`Required attribute [${ String(required[ i ]) }] is not provided`)
    }
}
