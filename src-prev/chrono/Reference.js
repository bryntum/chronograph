//---------------------------------------------------------------------------------------------------------------------
export const Reference = (base) => {
    class Reference extends base {
        isResolved() {
            return this.hasValue();
        }
        // should resolve the reference from whatever data it is represented with, and save the resolved atom to `this.value`
        resolve() { }
    }
    return Reference;
};
