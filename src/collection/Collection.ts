import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"


export interface Collection<Element = any> {
    [Symbol.iterator] () : IterableIterator<Element>
}


export interface OrderedForward<Element = any> extends Collection<Element> {
    iterateForwardFrom ()       : IterableIterator<Element>
}


export interface OrderedBackward<Element = any> extends Collection<Element> {
    iterateBackwardFrom ()       : IterableIterator<Element>
}

//---------------------------------------------------------------------------------------------------------------------
export const Indexed = <T extends AnyConstructor<OrderedForward & OrderedBackward>>(base : T) =>

class Indexed extends Base {
    ElementT        : any

    storage         : this[ 'ElementT' ][]


    get [Symbol.iterator] () : () => IterableIterator<this[ 'ElementT' ]> {
        return this.storage[ Symbol.iterator ]
    }


    splice (start, ...args) : this[ 'ElementT' ][] {
        return this.storage.splice(start, ...args)
    }


    * iterateAll () : IterableIterator<this[ 'ElementT' ]> {
        return [ ...this ]
    }


    * iterateTo (index : number) : IterableIterator<this[ 'ElementT' ]> {
        return [ ...this.storage.slice(0, index) ]
    }


    * iterateFrom (index : number) : IterableIterator<this[ 'ElementT' ]> {
        return [ ...this.storage.slice(index) ]
    }


    * iterateTill (index : number) : IterableIterator<this[ 'ElementT' ]> {

    }


    * iterateWhile (index : number) : IterableIterator<this[ 'ElementT' ]> {

    }


    * iterateUntil (index : number) : IterableIterator<this[ 'ElementT' ]> {

    }


    referenceToIndex () {

    }


    referenceToElementAtIndex () {

    }

}

export type Indexed = Mixin<typeof Indexed>



//---------------------------------------------------------------------------------------------------------------------
export const TreeChildNode = <T extends AnyConstructor<OrderedForward & OrderedBackward>>(base : T) =>

class TreeChildNode extends Base {
    ElementT        : any
}

export type TreeChildNode = Mixin<typeof TreeChildNode>



//---------------------------------------------------------------------------------------------------------------------
export const TreeParentNode = <T extends AnyConstructor<OrderedForward & OrderedBackward>>(base : T) =>

class TreeParentNode extends Base {
    ElementT        : any
}

export type TreeParentNode = Mixin<typeof TreeParentNode>



//---------------------------------------------------------------------------------------------------------------------
export const TreeNode = <T extends AnyConstructor<TreeChildNode & TreeParentNode>>(base : T) =>

class TreeNode extends Base {
    ElementT        : any
}

export type TreeNode = Mixin<typeof TreeNode>
