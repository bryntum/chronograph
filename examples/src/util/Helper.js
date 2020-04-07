/**
 * @private
 */
export const uppercaseFirst = (str) => str.slice(0, 1).toUpperCase() + str.slice(1);
/**
 * @private
 */
export const isAtomicValue = (value) => Object(value) !== value;
/**
 * @private
 */
export const lazyBuild = (target, property, value) => {
    Object.defineProperty(target, property, { value });
    return value;
};
/**
 * @private
 */
export const preWalk = (data, childrenFn, fn) => {
    let walkStack = [data], node, children;
    while (walkStack.length) {
        node = walkStack.pop();
        fn(node);
        children = childrenFn(node);
        if (children) {
            walkStack = walkStack.concat(children.slice().reverse());
        }
    }
};
