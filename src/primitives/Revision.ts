import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Node } from "../graph/Node.js"

//---------------------------------------------------------------------------------------------------------------------
export type RevisionId      = number

let ID : number = 1

export const revisionId = () : RevisionId => ID++


//---------------------------------------------------------------------------------------------------------------------
export const RevisionNode = <T extends AnyConstructor<Node>>(base : T) =>

class RevisionNode extends base {
    revision        : RevisionId    = revisionId()

    NodeT           : RevisionNode


    get previous () : this[ 'NodeT' ] {
        return Array.from(this.incoming.keys())[ 0 ]
    }

    set previous (revisionNode : this[ 'NodeT' ]) {
        this.addEdgeFrom(revisionNode)
    }


    addEdgeFrom (fromNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        if (this.incoming.size > 0) throw new Error("Revision can have only one incoming node")
        if (fromNode.revision > this.revision) throw new Error("Can only depend on earlier revision")

        super.addEdgeFrom(fromNode, label)
    }
}

export type RevisionNode = Mixin<typeof RevisionNode>


