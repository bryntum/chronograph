import {HasId} from "../../src/chronograph/HasId.js";
import {Base} from "../../src/class/Mixin.js";
import {Walkable, WalkableFoward, WalkFowardContext} from "../../src/graph/Walkable.js";

declare const StartTest : any

const Walker    = HasId(WalkableFoward(Walkable(Base)))
type Walker     = InstanceType<typeof Walker>

StartTest(t => {

    t.it('Minimal walk forward', t => {
        const atom5     = Walker.new({ id : 5, getOutgoing : () => [] })

        const atom3     = Walker.new({ id : 3, getOutgoing : () => [ atom5 ] })
        const atom4     = Walker.new({ id : 4, getOutgoing : () => [ atom3 ] })
        // For optimization purposes, walker goes into the last "next" walkable node from the `getOutgoing` result
        // so we use "reverse" to get what we expect
        const atom2     = Walker.new({ id : 2, getOutgoing : () => [ atom3, atom4 ].reverse() })

        const atom1     = Walker.new({ id : 1, getOutgoing : () => [ atom2 ] })

        const walkPath  = []
        const topoPath  = []

        atom1.walkDepth(WalkFowardContext.new({
            onNode : (node: Walker) => {
                walkPath.push(node.id)
            },

            onTopologicalNode : (node: Walker) => {
                topoPath.push(node.id)
            }
        }))

        t.isDeeply(walkPath, [ 1, 2, 3, 5, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 5, 3, 4, 2, 1 ], 'Correct topo path')
    })


    t.xit('Walk with cycle', t => {
        const atom5     = Walker.new({ id : 5, getOutgoing : () => [] })

        const atom3     = Walker.new({ id : 4, getOutgoing : () => [ atom5 ] })
        const atom4     = Walker.new({ id : 3, getOutgoing : () => [ atom3 ] })
        const atom2     = Walker.new({ id : 2, getOutgoing : () => [ atom3, atom4 ] })

        const atom1     = Walker.new({ id : 1, getOutgoing : () => [ atom2 ] })

        const walkPath  = []
        const topoPath  = []

        atom1.walkDepth(WalkFowardContext.new({
            onNode : (node: Walker) => {
                walkPath.push(node.id)
            },

            onTopologicalNode : (node: Walker) => {
                topoPath.push(node.id)
            }
        }))

        t.isDeeply(walkPath, [ 1, 2, 3, 5, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 5, 3, 4, 2, 1 ], 'Correct topo path')
    })


})
