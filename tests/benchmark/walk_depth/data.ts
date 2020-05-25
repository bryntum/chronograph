import { Base } from "../../../src/class/Base.js"

//---------------------------------------------------------------------------------------------------------------------
export class Node extends Base {
    count           : number        = 0

    outgoing        : Node[]        = []
}


//---------------------------------------------------------------------------------------------------------------------
export type GraphGenerationResult  = { nodes : Node[] }


//---------------------------------------------------------------------------------------------------------------------
export const deepGraphGen = (nodesNum : number = 1000, edgesNum : number = 5) : GraphGenerationResult => {
    const nodes : Node[]    = []

    for (let i = 0; i < nodesNum; i++) nodes.push(Node.new({ count : i }))

    for (let i = 0; i < nodesNum; i++) {

        for (let k = i + 1; k < i + edgesNum + 1 && k < nodesNum; k++) {
            nodes[ i ].outgoing.push(nodes[ k ])
        }
    }

    return { nodes }
}

