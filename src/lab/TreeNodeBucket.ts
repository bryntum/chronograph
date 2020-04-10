// import { CalculatedValueSync, Levels } from "../chrono/Identifier.js"
// import { Quark, QuarkConstructor } from "../chrono/Quark.js"
// import { Transaction } from "../chrono/Transaction.js"
// import { AnyConstructor, ClassUnion, identity, Mixin } from "../class/BetterMixin.js"
// import { CalculationSync } from "../primitives/Calculation.js"
// import { Field } from "../schema/Field.js"
// import { prototypeValue } from "../util/Helpers.js"
// import { Entity, FieldDecorator, generic_field } from "./Entity.js"
// import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"
// import { TreeNode, TreeNodeBucket } from "./TreeNode.js"
// import { TreeNodeReferenceIdentifier } from "./TreeNodeReference.js"
//
// //---------------------------------------------------------------------------------------------------------------------
// export class TreeNodeBucketField extends Mixin(
//     [ Field ],
//     (base : AnyConstructor<Field, typeof Field>) =>
//
// class TreeNodeBucketField extends base {
//     persistent          : boolean   = false
//
//     identifierCls       : FieldIdentifierConstructor    = MinimalTreeNodeBucketIdentifier
// }){}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const bucket_tree_node : FieldDecorator<typeof TreeNodeBucketField> =
//     (fieldConfig?, fieldCls = TreeNodeBucketField) => generic_field(fieldConfig, fieldCls)
//
//
// export enum BucketMutationType {
//     'Add'       = 'Add',
//     'Remove'    = 'Remove'
// }
//
// export type BucketMutationPosition = {
//     next        : TreeNode,
//     previous    : TreeNode,
// }
//
//
// export type BucketMutation  = {
//     type        : BucketMutationType,
//     node        : TreeNode,
//     position    : BucketMutationPosition
// }
//
// //---------------------------------------------------------------------------------------------------------------------
// export class TreeNodeBucketQuark extends Mixin(
//     [ Quark ],
//     (base : ClassUnion<typeof Quark>) =>
//
// class TreeNodeBucketQuark extends base {
//     mutations           : BucketMutation[]  = []
//
//     previousValue       : TreeNodeBucket   = undefined
//
//
//     hasProposedValueInner () : boolean {
//         return this.mutations.length > 0
//     }
// }){}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class TreeNodeBucketIdentifier extends Mixin(
//     [ FieldIdentifier ],
//     (base : AnyConstructor<FieldIdentifier, typeof FieldIdentifier>) => {
//
//     class TreeNodeBucketIdentifier extends base {
//         @prototypeValue(Levels.DependsOnlyOnDependsOnlyOnUserInput)
//         level               : number
//
//         ValueT              : TreeNodeBucket
//
//         proposedValueIsBuilt    : boolean   = true
//
//         @prototypeValue(Mixin([ TreeNodeBucketQuark, CalculationSync, Quark, Map ], identity))
//         quarkClass          : typeof TreeNodeBucketQuark
//
//
//         register (me : TreeNodeReferenceIdentifier, transaction : Transaction) {
//             const quark         = transaction.getWriteTarget(this) as TreeNodeBucketQuark
//
//             // quark.mutations.push({
//             //     type        : BucketMutationType.Add,
//             //     position    : me.field.refType === 'next' ?
//             //         { next : me.self, prev : undefined }
//             //     :
//             //         { next : undefined, prev : me.self }
//             // })
//
//             const baseRevision  = transaction.baseRevision
//
//             if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = baseRevision.read(this, transaction.graph)
//         }
//
//
//         unregister (me : TreeNodeReferenceIdentifier, transaction : Transaction) {
//             const quark         = transaction.getWriteTarget(this) as TreeNodeBucketQuark
//
//             // quark.mutations.push({
//             //     type        : BucketMutationType.Remove,
//             //     position    : me.field.refType === 'next' ?
//             //         { next : me.self, previous : undefined }
//             //     :
//             //         { next : undefined, previous : me.self }
//             // })
//
//             const baseRevision  = transaction.baseRevision
//
//             if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = baseRevision.read(this, transaction.graph)
//         }
//
//
//         buildProposedValue (me : this, quarkArg : Quark, transaction : Transaction) : Set<Entity> {
//             // const quark                         = quarkArg as TreeNodeBucketQuark
//             //
//             // const previousValue : TreeNodeBucket    = quark.previousValue
//             // const newValue : TreeNodeBucket         = TreeNodeBucket.new({
//             //     first       : previousValue.first,
//             //     last        : previousValue.last,
//             //
//             //     $children   : previousValue.$children ? new Set(previousValue.$children) : undefined
//             // })
//             //
//             // for (let i = 0; i < quark.mutations.length; i++) {
//             //     const { type, position } = quark.mutations[ i ]
//             //
//             //     if (type === BucketMutationType.Remove) {
//             //         newValue.register(entity)
//             //     }
//             //     else if (type === BucketMutationType.Add) {
//             //         newValue.add(entity)
//             //     }
//             // }
//             //
//             // return newValue
//             return
//         }
//     }
//
//     return TreeNodeBucketIdentifier
// }){}
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class MinimalTreeNodeBucketIdentifier extends TreeNodeBucketIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {}
