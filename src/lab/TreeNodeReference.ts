// import { ChronoGraph } from "../chrono/Graph.js"
// import { CalculatedValueSync, Levels } from "../chrono/Identifier.js"
// import { Quark, QuarkConstructor } from "../chrono/Quark.js"
// import { Transaction } from "../chrono/Transaction.js"
// import { AnyConstructor, ClassUnion, identity, isInstanceOf, Mixin } from "../class/BetterMixin.js"
// import { CalculationSync } from "../primitives/Calculation.js"
// import { Field, Name } from "../schema/Field.js"
// import { prototypeValue } from "../util/Helpers.js"
// import { Entity, FieldDecorator, generic_field } from "./Entity.js"
// import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"
// import { TreeNode } from "./TreeNode.js"
// import { TreeNodeBucketIdentifier } from "./TreeNodeBucket.js"
//
// //---------------------------------------------------------------------------------------------------------------------
// export type ResolverFunc    = (locator : any) => Entity
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class TreeNodeReferenceField extends Mixin(
//     [ Field ],
//     (base : AnyConstructor<Field, typeof Field>) =>
//
// class TreeNodeReferenceField extends base {
//     identifierCls       : FieldIdentifierConstructor    = MinimalTreeNodeReferenceIdentifier
//
//     refType             : 'next' | 'prev'
//
//     resolver            : ResolverFunc
// }){}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const reference_tree_node : FieldDecorator<typeof TreeNodeReferenceField> =
//     (fieldConfig?, fieldCls = TreeNodeReferenceField) => generic_field(fieldConfig, fieldCls)
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class TreeNodeReferenceIdentifier extends Mixin(
//     [ FieldIdentifier ],
//     (base : AnyConstructor<FieldIdentifier, typeof FieldIdentifier>) => {
//
//     class TreeNodeReferenceIdentifier extends base {
//         @prototypeValue(Levels.DependsOnlyOnUserInput)
//         level           : number
//
//         field           : TreeNodeReferenceField    = undefined
//
//         ValueT          : TreeNode
//        
//         self            : TreeNode
//
//         proposedValueIsBuilt    : boolean   = true
//
//         @prototypeValue(Mixin([ CalculationSync, Quark, Map ], identity))
//         quarkClass          : QuarkConstructor
//
//
//         getBucket (entity : TreeNode) : TreeNodeBucketIdentifier {
//             return entity.$.childrenOrdered as TreeNodeBucketIdentifier
//         }
//
//
//         buildProposedValue (me : this, quark : Quark, transaction : Transaction) : this[ 'ValueT' ] {
//             const proposedValue     = quark.proposedValue
//
//             if (proposedValue === null) return null
//
//             const value : TreeNode    = isInstanceOf(proposedValue, TreeNode) ? proposedValue : me.resolve(proposedValue)
//
//             if (value) {
//                 me.getBucket(value).register(me, transaction)
//             }
//
//             return value
//         }
//
//
//         resolve (locator : any) : TreeNode | null {
//             const resolver  = this.field.resolver
//
//             return resolver ? resolver.call(this.self, locator) : null
//         }
//
//
//         leaveGraph (graph : ChronoGraph) {
//             // here we only need to remove from the "previous", "stable" bucket, because
//             // the calculation for the removed treeNodeReference won't be called - the possible `proposedValue` of treeNodeReference will be ignored
//             const value  = graph.activeTransaction.readProposedOrPrevious(this) as TreeNode
//
//             if (value != null) {
//                 this.getBucket(value).unregister(this, graph.activeTransaction)
//             }
//
//             super.leaveGraph(graph)
//         }
//
//
//         write (me : this, transaction : Transaction, quark : InstanceType<this[ 'quarkClass' ]>, proposedValue : this[ 'ValueT' ]) {
//             quark           = quark || transaction.acquireQuarkIfExists(me)
//
//             if (quark) {
//                 const proposedValue     = quark.proposedValue
//
//                 if (proposedValue instanceof TreeNode) {
//                     me.getBucket(proposedValue).unregister(me, transaction)
//                 }
//             }
//             else if (transaction.baseRevision.hasIdentifier(me)) {
//                 const value  = transaction.baseRevision.read(me, transaction.graph) as TreeNode
//
//                 if (value != null) {
//                     me.getBucket(value).unregister(me, transaction)
//                 }
//             }
//
//             super.write(me, transaction, quark, proposedValue)
//         }
//     }
//
//     return TreeNodeReferenceIdentifier
// }){}
//
//
// export class MinimalTreeNodeReferenceIdentifier extends TreeNodeReferenceIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {}
