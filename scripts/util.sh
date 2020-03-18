git_repo_has_changes() (
    (
        cd "$1"

        if git diff-index --quiet HEAD --; then
            echo 'false'
        else
            echo 'true'
        fi
    )
)
