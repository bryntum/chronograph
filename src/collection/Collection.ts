// import { AnyConstructor, Mixin } from "../class/Mixin.js"
//
//
// export interface Collection<Element = any> {
//     [Symbol.iterator] () : IterableIterator<Element>
// }
//
//
// export interface OrderedForward<Element = any> extends Collection<Element> {
//     iterateForwardFrom ()       : IterableIterator<Element>
// }
//
//
// export interface OrderedBackward<Element = any> extends Collection<Element> {
//     iterateBackwardFrom ()       : IterableIterator<Element>
// }
//
//
// interface HKT<F, A> {
//     readonly F  : F
//     readonly A  : A
// }
//
// export interface Mappable<Coll extends Collection> {
//     fmap<Element, Result> (func : (a : Element) => Result, collection : HKT<Coll, Element>) : HKT<Coll, Result>
// }
//
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Indexed = <T extends AnyConstructor<OrderedForward & OrderedBackward>>(base : T) =>
//
// class Indexed extends base {
//     ElementT        : any
//
//     storage         : this[ 'ElementT' ][]
//
//
//     get [Symbol.iterator] () : () => IterableIterator<this[ 'ElementT' ]> {
//         return this.storage[ Symbol.iterator ]
//     }
//
//
//     splice (start, ...args) : this[ 'ElementT' ][] {
//         return this.storage.splice(start, ...args)
//     }
//
//
//     * iterateAll () : IterableIterator<this[ 'ElementT' ]> {
//         return [ ...this ]
//     }
//
//
//     * iterateTo (index : number) : IterableIterator<this[ 'ElementT' ]> {
//         return [ ...this.storage.slice(0, index) ]
//     }
//
//
//     * iterateFrom (index : number) : IterableIterator<this[ 'ElementT' ]> {
//         return [ ...this.storage.slice(index) ]
//     }
//
//
//     * iterateTill (index : number) : IterableIterator<this[ 'ElementT' ]> {
//
//     }
//
//
//     * iterateWhile (index : number) : IterableIterator<this[ 'ElementT' ]> {
//
//     }
//
//
//     * iterateUntil (index : number) : IterableIterator<this[ 'ElementT' ]> {
//
//     }
//
//
//     referenceToIndex () {
//
//     }
//
//
//     referenceToBoxAtIndex () {
//
//     }
//
// }
//
// export type Indexed = Mixin<typeof Indexed>
//
//
//
// // //---------------------------------------------------------------------------------------------------------------------
// // export const TreeLeafNode = <T extends AnyConstructor<OrderedForward & OrderedBackward>>(base : T) =>
// //
// // class TreeLeafNode extends base {
// //     parent          : TreeParentNode
// // }
// //
// // export type TreeLeafNode = Mixin<typeof TreeLeafNode>
// //
// //
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // export const TreeParentNode = <T extends AnyConstructor<TreeLeafNode & OrderedForward & OrderedBackward>>(base : T) =>
// //
// // class TreeParentNode extends base {
// //     ElementT        : any
// //
// //     children        : TreeLeafNode[]
// // }
// //
// // export type TreeParentNode = Mixin<typeof TreeParentNode>
// //
// //
// // export type TreeNode = TreeLeafNode | TreeParentNode
