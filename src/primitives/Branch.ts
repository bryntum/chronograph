import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
export type RevisionId      = number

let ID : number = 1

export const revisionId = () : RevisionId => ID++


// //---------------------------------------------------------------------------------------------------------------------
// export const BranchNode = <T extends AnyConstructor<object>>(base : T) =>
//
// class BranchNode extends base {
//     previous                : BranchNode
//     branch                  : BranchI
// }
//
// export type BranchNode = Mixin<typeof BranchNode>
//
// export class MinimalBranchNode extends BranchNode(Base) {}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Branch = <T extends AnyConstructor<Base>>(base : T) =>
//
// class Branch extends base {
//     NodeT               : BranchNode
//
//     baseBranch          : Branch
//     baseNodeIndex       : number                = -1
//
//     nodes               : this[ 'NodeT' ][]     = []
//
//     source              : this[ 'NodeT' ]
//
//
//     addNode (node : this[ 'NodeT' ]) {
//         if (node.previous !== this.headNode()) throw new Error("Invalid state")
//
//         this.nodes.push(node)
//     }
//
//
//     isEmpty () : boolean {
//         return this.nodes.length === 0
//     }
//
//
//     branch () : this {
//         const Constructor = this.constructor as BranchConstructor
//
//         return Constructor.new({
//             baseBranch      : this,
//             baseNodeIndex   : this.nodes.length - 1
//         }) as this
//     }
//
//
//     headNode () : this[ 'NodeT' ] {
//         return this.nodes.length > 0 ? this.nodes[ this.nodes.length - 1 ] : this.baseBranch ? this.baseBranch.nodes[ this.baseNodeIndex ] : this.source
//     }
//
// }
//
// export type Branch = Mixin<typeof Branch>
// export interface BranchI extends Mixin<typeof Branch> {}
//
// type BranchConstructor = MixinConstructor<typeof Branch>
