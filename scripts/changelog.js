const fs    = require('fs')
const path  = require('path')

const now           = Date.now()
const version       = require('./package.json').version
const versionStr    = `${version} ${now.getFullYear()}-${ prependZero(now.getMonth() + 1, 2) }-${ prependZero(now.getDay(), 2) } ${ prependZero(now.getHour(), 2) }:${ prependZero(now.getMinutes(), 2) }`

const prependZero = (int, minLength) => {
    const str   = String(int)

    return '0000000'.slice(0, minLength - str.length) + str
}

const updateVersion = () => {
    let changelog = fs.readFileSync('CHANGELOG.md', 'utf8')

    changelog = changelog.replace(/^\{\{ \$NEXT \}\}/m, versionStr)

    fs.writeFileSync('CHANGELOG.md', changelog, 'utf8')
}


const updateVersionAndStartNew = () => {
    let changelog = fs.readFileSync('CHANGELOG.md', 'utf8')

    changelog = changelog.replace(/^\{\{ \$NEXT \}\}/m, `{{ $NEXT }}\n${versionStr}`)

    fs.writeFileSync('CHANGELOG.md', changelog, 'utf8')
}

module.exports = {
    updateVersion,
    updateVersionAndStartNew
}
