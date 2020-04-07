const RequiredProperties = Symbol('RequiredProperties');
export const required = (proto, propertyKey) => {
    let required = proto[RequiredProperties];
    if (!required)
        required = proto[RequiredProperties] = [];
    required.push(propertyKey);
};
export const validateRequiredProperties = (context) => {
    const required = context[RequiredProperties];
    if (required) {
        for (let i = 0; i < required.length; i++)
            if (context[required[i]] === undefined)
                throw new Error(`Required attribute [${String(required[i])}] is not provided`);
    }
};
