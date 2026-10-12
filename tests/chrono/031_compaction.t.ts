// https://github.com/bryntum/support/issues/13520
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

            t.isLessOrEqual(origins.size, historyLimit + 1, 'Origin chain is bounded by retained history')

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

    t.it('Branch reads survive parent commits that retain history', t => {
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
            const type = past ? EdgeType.Past : EdgeType.Normal
            const edges = (quark : Quark) => past ? quark.getOutgoingPast() : quark.getOutgoing()

            const promote = (origin : Quark, originId : number) => {
                const target = Quark.new({ identifier, originId })
                const shadow = Quark.new({ origin, previous : origin, originId : 1 })

                shadow.addOutgoingTo(target, type)

                const recorded = edges(shadow)

                shadow.mergePreviousOrigin(new Map([ [ identifier, target ] ]))

                t.is(recorded.size, 0, 'The merged temporary map is cleared')

                return { shadow, target }
            }

            const root = Quark.new({ originId : 1, value : 1 })

            root.origin = root
            root.addOutgoingTo(Quark.new({ identifier, originId : 2 }), type)

            let origin = promote(root, 3).shadow

            const storage = edges(origin)
            const retired = edges(root)

            t.is(Object.getPrototypeOf(storage), Map.prototype, 'Promotion stores edges in a plain Map')
            t.isNot(retired, storage, 'The retired root does not reach the transferred storage')
            t.is(retired.size, 0, 'The retired root keeps no edges')

            for (const originId of [ 4, 5 ]) {
                const { shadow, target } = promote(origin, originId)

                origin.clearOutgoing()

                t.is(edges(shadow), storage, 'Every later promotion reuses the same backing map')
                t.is(storage.get(identifier), target, 'The current edge survives promotion and retired-owner cleanup')
                origin = shadow
            }

            const replacement = Quark.new({ identifier, originId : 99 })

            origin.addOutgoingTo(replacement, type)
            t.is(storage.get(identifier), replacement, 'Writes on the promoted quark reach the effective outgoing map')

            origin.clearOutgoing()

            t.is(storage.size, 0, 'Clearing the current owner clears transferred storage')
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
                t.is([ ...outgoing.keys() ].every(id => graph.baseRevision.scope.has(id)), true, 'No removed identifier is retained')
                t.is(readers.every(id => graph.read(id) === 1), true, 'Current values are correct')
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

        // the first promotion copies the root's own edges once, transfer by reference starts from the second one
        for (const input of inputs.slice(0, 10)) graph.write(input, 2)
        graph.commit()

        const storage = graph.baseRevision.getLatestEntryFor(source).getOutgoing()
        const iterators = [ 'keys', 'values', 'entries', 'forEach', Symbol.iterator ]
        let visited = 0

        for (const name of iterators) storage[name] = function (...args) { visited++; return Map.prototype[name].apply(this, args) }

        for (const input of inputs.slice(10, 20)) graph.write(input, 2)
        graph.commit()

        for (const name of iterators) delete storage[name]

        const current = graph.baseRevision.getLatestEntryFor(source)

        t.is(visited, 0, 'Does not iterate the large transferred map')
        t.is(current.getOutgoing(), storage, 'Transfers the existing map by reference')
        t.is(storage.size, readers.length, 'Transferred storage keeps all current consumers')
        t.isNot(current, original, 'The newer quark survives independently of the storage object')
        t.isDeeply(readers.slice(0, 20).map(id => graph.read(id)), Array(20).fill(3), 'Updated readers are correct')
        t.is(graph.read(readers[100]), 1, 'Untouched reader is correct')

        graph.write(source, 2)
        graph.commit()

        t.is(storage.size, 0, 'Replacing the source clears transferred old storage')
        t.is(graph.read(readers[100]), 2, 'Old untouched readers still react to a source change')
    })
})
