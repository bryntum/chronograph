import { PreviousValueOf } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"
import { Identifier } from "../../src/chrono/Identifier.js"
import { EdgeType, Quark } from "../../src/chrono/Quark.js"

declare const StartTest : any

StartTest(t => {
    for (const historyLimit of [ 0, 1, 2, 10 ]) {
        t.it(`Compaction preserves dependencies and bounds origin chains with history ${historyLimit}`, t => {
            const graph = ChronoGraph.new({ historyLimit })
            const a = graph.variableNamed('a', 5)
            const b = graph.variableNamed('b', 0)
            const c = graph.identifierNamed('c', Y => Y(a) + Y(b))
            const d = graph.identifierNamed('d', Y => Y(a) * 2)

            graph.commit()

            for (let i = 1; i <= 100; i++) {
                graph.write(b, i)
                graph.commit()
            }

            const origins = new Set<Quark>()
            let quark = graph.baseRevision.getLatestEntryFor(a)

            while (quark && !origins.has(quark)) {
                origins.add(quark)
                quark = quark.origin === quark ? undefined : quark.origin
            }

            t.ok(origins.size <= historyLimit + 1, 'Origin chain is bounded by retained history')

            graph.write(a, 6)
            graph.commit()

            t.isDeeply([ graph.read(c), graph.read(d) ], [ 106, 12 ], 'All dependents are invalidated')
        })
    }

    for (const createDuringFinalize of [ false, true ]) {
        t.it(`Compaction preserves next-transaction references, create during finalize: ${createDuringFinalize}`, async t => {
            class FinalizingGraph extends ChronoGraph {
                probe : Identifier
                reader : Identifier

                async finalizeCommitAsync () {
                    if (this.probe) {
                        const source = this.probe

                        this.probe = undefined
                        this.activeTransaction.readCurrentOrProposedOrPrevious(source)

                        if (createDuringFinalize) {
                            this.reader = this.identifierNamed('second', function* () { return (yield source) * 100 })
                            this.read(this.reader)
                        }
                    }
                }
            }

            const graph = FinalizingGraph.new({ historyLimit : 0, onWriteDuringCommit : 'ignore' })
            const source = graph.variableNamed('source', 1)
            const original = graph.identifierNamed('original', function* () { return (yield source) + 1 })

            await graph.commitAsync()
            graph.probe = source

            const first = graph.identifierNamed('first', function* () { return (yield source) * 10 })

            await graph.commitAsync()

            const second = graph.reader || graph.identifierNamed('second', function* () { return (yield source) * 100 })

            await graph.commitAsync()
            graph.write(source, 5)
            await graph.commitAsync()

            t.isDeeply([ original, first, second ].map(id => graph.read(id)), [ 6, 50, 500 ], 'Earlier readers remain connected')
        })
    }

    t.it('Compaction does not mutate a retained branch', t => {
        const graph = ChronoGraph.new({ historyLimit : 1 })
        const source = graph.variableNamed('source', 5)
        const input = graph.variableNamed('input', 0)
        const changing = graph.identifierNamed('changing', Y => Y(source) + Y(input))
        const stable = graph.identifierNamed('stable', Y => Y(source) * 2)

        graph.commit()

        const branch = graph.branch()

        for (let i = 1; i <= 20; i++) {
            graph.write(input, i)
            graph.commit()
        }

        graph.write(source, 6)
        graph.commit()

        t.isDeeply([ changing, stable ].map(id => graph.read(id)), [ 26, 12 ], 'Current graph is correct')
        t.isDeeply([ changing, stable ].map(id => branch.read(id)), [ 5, 10 ], 'Branch keeps its values')

        branch.write(source, 7)
        branch.commit()

        t.isDeeply([ changing, stable ].map(id => branch.read(id)), [ 7, 14 ], 'Branch keeps its dependencies')
        t.isDeeply([ changing, stable ].map(id => graph.read(id)), [ 26, 12 ], 'Branch update leaves current graph intact')
    })

    for (const past of [ false, true ]) {
        t.it(`Repeated compaction reuses one ${past ? 'past' : 'normal'} backing map`, t => {
            const graph = ChronoGraph.new()
            const identifier = graph.variableNamed('target', 1)
            let origin = Quark.new({ originId : 1, value : 1 })

            origin.origin = origin
            origin.addOutgoingTo(Quark.new({ identifier, originId : 2 }), past ? EdgeType.Past : EdgeType.Normal)

            const storage = past ? origin.getOutgoingPast() : origin.getOutgoing()

            for (let i = 0; i < 4; i++) {
                const target = Quark.new({ identifier, originId : i + 3 })
                const shadow = Quark.new({ origin, previous : origin, originId : 1 })

                shadow.addOutgoingTo(target, past ? EdgeType.Past : EdgeType.Normal)

                const recorded = past ? shadow.getOutgoingPast() : shadow.getOutgoing()

                shadow.mergePreviousOrigin(new Map([ [ identifier, target ] ]))

                // The very first normal quark is the physical backing Map. All later retired owners
                // can be cleared independently because their forwarding pointer has been removed.
                if (origin !== storage) origin.clearOutgoing()

                t.is(past ? shadow.getOutgoingPast() : shadow.getOutgoing(), storage, 'Every promotion reuses the same backing map')
                t.is(past ? origin.$outgoingPast : origin.$outgoing, undefined, 'The retired owner has no forwarding pointer')
                t.is(storage.get(identifier), target, 'The current edge survives promotion and retired-owner cleanup')
                t.is(recorded.size, 0, 'The merged temporary map is cleared')
                origin = shadow
            }

            const replacement = Quark.new({ identifier, originId : 99 })

            origin.addOutgoingTo(replacement, past ? EdgeType.Past : EdgeType.Normal)
            t.is(storage.get(identifier), replacement, 'Writes on the promoted quark reach the effective outgoing map')

            origin.clearOutgoing()

            t.is(storage.size, 0, 'Clearing the current owner clears transferred storage')
            t.is(past ? origin.getOutgoingPast() : origin.getOutgoing(), past ? storage : origin, 'Clearing releases normal indirection and keeps empty past storage')
        })
    }

    for (const past of [ false, true ]) {
        t.it(`Compaction releases removed consumers of ${past ? 'past' : 'normal'} edges`, t => {
            const graph = ChronoGraph.new({ historyLimit : 0 })
            const source = graph.variableNamed('source', 1)
            let readers : Identifier[] = []

            graph.commit()

            for (let batch = 0; batch < 20; batch++) {
                for (const reader of readers) graph.removeIdentifier(reader)

                readers = Array.from({ length : 20 }, (_, i) => graph.identifierNamed(`reader-${batch}-${i}`, function* () {
                    return yield (past ? PreviousValueOf(source) : source)
                }))
                graph.commit()

                const quark = graph.baseRevision.getLatestEntryFor(source)
                const outgoing = past ? quark.getOutgoingPast() : quark.getOutgoing()

                t.is(outgoing.size, readers.length, 'Stored edges remain bounded by current consumers')
                t.ok([ ...outgoing.keys() ].every(id => graph.baseRevision.scope.has(id)), 'No removed identifier is retained')
                t.ok(readers.every(id => graph.read(id) === 1), 'Current values are correct')
            }
        })
    }

    t.it('High fan-out compaction transfers storage without visiting unchanged dependents', t => {
        const graph = ChronoGraph.new({ historyLimit : 0 })
        const source = graph.variableNamed('source', 1)
        const inputs = Array.from({ length : 2000 }, (_, i) => graph.variableNamed(`input-${i}`, 0))
        const readers = inputs.map((input, i) => graph.identifierNamed(`reader-${i}`, Y => Y(source) + Y(input)))

        graph.commit()

        const original = graph.baseRevision.getLatestEntryFor(source)
        const outgoing = original.getOutgoing()
        const keys = outgoing.keys
        let visited = 0

        outgoing.keys = function* () {
            for (const identifier of keys.call(this)) {
                visited++
                yield identifier
            }
        }

        for (const input of inputs.slice(0, 10)) graph.write(input, 2)
        graph.commit()

        t.is(visited, 0, 'Does not iterate the large old outgoing map')
        outgoing.keys = keys

        const current = graph.baseRevision.getLatestEntryFor(source)

        t.is(current.getOutgoing(), outgoing, 'Transfers the existing map')
        t.is(outgoing.size, readers.length, 'Transferred storage keeps all current consumers')
        t.is(outgoing, original, 'The original native Map remains the backing container')
        t.is(original.$outgoing, undefined, 'The backing container does not add another forwarding layer')
        t.notOk(current === original, 'The newer quark survives independently of the storage object')
        t.isDeeply(readers.slice(0, 10).map(id => graph.read(id)), Array(10).fill(3), 'Updated readers are correct')
        t.is(graph.read(readers[100]), 1, 'Untouched reader is correct')

        graph.write(source, 2)
        graph.commit()

        t.is(outgoing.size, 0, 'Replacing the source clears transferred old storage')
        t.is(graph.read(readers[100]), 2, 'Old untouched readers still react to a source change')
    })

    for (const past of [ false, true ]) {
        for (const largeOutgoing of [ false, true ]) {
            t.it(`Merge filters changed targets but keeps newly recorded edges: past=${past}, large=${largeOutgoing}`, t => {
                const graph = ChronoGraph.new()
                const source = graph.variableNamed('source', 1)
                const target = graph.variableNamed('target', 2)
                const removed = graph.variableNamed('removed', 3)
                const origin = Quark.new({ identifier : source, originId : 1, value : 1 })
                const shadow = Quark.new({ identifier : source, originId : 1, origin, previous : origin })
                const oldTarget = Quark.new({ identifier : target, originId : 2 })
                const newTarget = Quark.new({ identifier : target, originId : 3 })
                const latestTarget = Quark.new({ identifier : target, originId : 4 })
                const oldRemoved = Quark.new({ identifier : removed, originId : 5 })
                const latestRemoved = Quark.new({ identifier : removed, originId : 6 })
                const inherited = past ? origin.getOutgoingPast() : origin.getOutgoing()
                const recorded = past ? shadow.getOutgoingPast() : shadow.getOutgoing()

                origin.origin = origin
                inherited.set(target, oldTarget)
                inherited.set(removed, oldRemoved)
                recorded.set(target, newTarget)

                const latestScope = new Map([ [ target, latestTarget ], [ removed, latestRemoved ] ])

                if (largeOutgoing) {
                    const untouched = graph.variableNamed('untouched', 4)

                    inherited.set(untouched, Quark.new({ identifier : untouched, originId : 7 }))
                }

                shadow.mergePreviousOrigin(latestScope)

                const outgoing = past ? shadow.getOutgoingPast() : shadow.getOutgoing()

                t.is(outgoing.get(target), newTarget, 'Newly recorded edge takes precedence over latestScope')
                t.notOk(outgoing.has(removed), 'Stale target edge is discarded')
                t.is(shadow.getValue(), 1, 'Promoted shadow owns the unchanged value')
            })
        }
    }
})
