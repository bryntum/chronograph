

git_repo_has_changes() (
    local TARGET_FILE="$1"

    cd $(dirname "$TARGET_FILE")
    TARGET_FILE=$(basename "$TARGET_FILE")

    # Iterate down a (possible) chain of symlinks
    while [[ -L "$TARGET_FILE" ]]
    do
        TARGET_FILE=$(readlink "$TARGET_FILE")
        cd $(dirname "$TARGET_FILE")
        TARGET_FILE=$(basename "$TARGET_FILE")
    done

    local PHYS_DIR=$(pwd -P)
    echo "$PHYS_DIR/$TARGET_FILE"
)



#// const isEmpty = (obj) => {
#//     for (const key in obj) return false
#//
#//     return true
#// }
#//
#// const fs    = require('fs')
#// const git   = require('git-utils')
#//
#// const repo = git.open('.')
#//
#// if (!repo) throw new Error(`Can't find a git repository at ${ process.cwd() }`)
#//
#// const status = repo.getStatus()
#//
#// if (typeof status === 'object' && isEmpty(status)) {
#//     // Repository has no changes
#//     process.exit(0)
#// } else {
#//     // Repository has changes
#//     process.exit(1)
#// }
#//
