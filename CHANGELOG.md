# Release history for ChronoGraph:

## {{ $NEXT }}

#### FEATURES / ENHANCEMENTS

- Chronograph now supports running in the "regenerator" environment (transpiled generators)

- Added experimental "hook" utility

#### API CHANGES

- None

#### BUG FIXES

- Fixed a bug, that on-demand calculations for lazy identifiers were performed in separate
transaction. This was breaking the `ProposedOrPrevious` effect. Such calculations are now
performed in the currently running transaction.

- Fixed a bug, that removing and adding an entity back to the graph right away was not updating
the related buckets.

- Fixed a bug, that transaction rejection could lead to exception if there were writes during
`finalizeCommitAsync` method.

- Fixed a bug, that identifier could be considered as unchanged mistakenly and its calculation
method not called.

- Fixed a bug, that using `derive` method of the mixin over the base class, that has extended
another class, in turn created with `derive`, could skip some mixin requirements.


## 1.0.1        2020-04-07 19:56

- Fixed links to docs

## 1.0.0        2020-04-07 19:26

The 1.0.0 release.

## 0.0.5        2020-03-19 20:10

Testing release script.

## 0.0.4        2020-03-18 18:25

This is the initial release of the ChronoGraph.

