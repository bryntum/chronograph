import { Benchmark } from "../../../src/benchmark/Benchmark.js"
import { AnyConstructor } from "../../../src/class/Mixin.js"
import { Replica as Replica1 } from "../../../src/replica/Replica.js"
import { Replica as Replica2 } from "../../../src/replica2/Replica.js"
import { launchIfStandaloneProcess } from "../graphless/data_generators.js"
import { TestEntity5 as Chrono1TestEntity5, TestEntity1 as Chrono1TestEntity1 } from "./test_replica_chrono_1.js"
import { TestEntity5 as Chrono2TestEntity5, TestEntity1 as Chrono2TestEntity1 } from "./test_replica_chrono_2.js"


//---------------------------------------------------------------------------------------------------------------------
class AbstractEntity {
}


type AbstractReplica = {
    addEntity (entity : AbstractEntity)
}


//---------------------------------------------------------------------------------------------------------------------
export type ReplicaGenerationResult  = { replica : AbstractReplica, entities : AbstractEntity[] }


//---------------------------------------------------------------------------------------------------------------------
export class ReplicaPopulationBenchmark extends Benchmark<unknown> {
    entityClass     : AnyConstructor<AbstractEntity>    = undefined
    entityClass2    : AnyConstructor<AbstractEntity>    = undefined
    entityCount     : number                            = 10000

    replica         : AbstractReplica                   = undefined


    async setup () : Promise<unknown> {
        return
    }


    cycle (iteration : number, cycle : number, state : unknown) {
        let entities : AbstractEntity[]      = []

        for (let i = 0; i < this.entityCount; i++) {
            const instance  = new this.entityClass()

            this.replica.addEntity(instance)

            const instance2 = new this.entityClass2()

            this.replica.addEntity(instance2)
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (entityCount : number = 1000) => {

    const chronoGraph2 = ReplicaPopulationBenchmark.new({
        profile         : true,
        // keepLastResult  : true,
        name            : `Replica population, entities: ${entityCount}, entity class: ${Chrono2TestEntity5} - ChronoGraph2`,
        entityCount     : entityCount,
        entityClass     : Chrono2TestEntity5,
        entityClass2    : Chrono2TestEntity1,
        replica         : Replica2.new({ historyLimit : 0, autoCommit : false })
    })

    const chronoGraph1 = ReplicaPopulationBenchmark.new({
        profile         : true,
        // keepLastResult  : true,
        name            : `Replica population, entities: ${entityCount}, entity class: ${Chrono1TestEntity5} - ChronoGraph1`,
        entityCount     : entityCount,
        entityClass     : Chrono1TestEntity5,
        entityClass2    : Chrono1TestEntity1,
        replica         : Replica1.new({ autoCommit : false })
    })

    const runInfoChronoGraph2WithGraph  = await chronoGraph2.measureTillMaxTime()
    const runInfoChronoGraph1           = await chronoGraph1.measureTillMaxTime()
}


export const run = async () => {
    await runFor(10000)
}

launchIfStandaloneProcess(run, 'replica_population')
