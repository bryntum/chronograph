import { launchIfStandaloneProcess } from "./graphless/data_generators.js"
import * as graphless from './graphless/suite_graphless.js'

export const run = async () => {
    await graphless.run()
}

launchIfStandaloneProcess(run, 'suite_everything')
