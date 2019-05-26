//---------------------------------------------------------------------------------------------------------------------
export const Box = (base) => class Box extends base {
    get value() {
        return this.valueOf();
    }
    hasValue() {
        return this.value !== undefined;
    }
};
