const isEmpty = (obj) => {
    for (const key in obj) return false

    return true
}

const fs    = require('fs')
const git   = require('git-utils')

const repo = git.open('.')

if (!repo) throw new Error(`Can't find a git repository at ${ process.cwd() }`)

const status = repo.getStatus()

if (typeof status === 'object' && isEmpty(status)) {
    console.error("Repository has no changes")
    process.exit(0)
} else {
    console.error("Repository has changed")
    process.exit(1)
}

