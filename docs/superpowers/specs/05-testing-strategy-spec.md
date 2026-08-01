# Chakadi: Testing and Verification Strategy

## Goals

Protect the framework-independent engine with deterministic, fast tests. UI tests verify rendering and interaction wiring, not card-game rules duplicated in React.

## Engine Unit Tests

| Area | Required coverage |
| --- | --- |
| Configuration | Accept valid 4/6 player alternating teams; reject invalid deck/team layouts. |
| Deck and deal | Correct 48/52 cards, no twos in six-player deck, unique ownership, correct hand size. |
| Boli | Minimum opening bid, strictly increasing bids, pass/re-bid behaviour, unauthorised turn rejection, closure-policy scenarios. |
| Kaat | Only the Declarer may select one valid suit after Boli. |
| Chaal legality | Turn ownership, card ownership, follow-Rung enforcement, free discard/Kaat when void. |
| Haath resolution | Led Rung ranking, Kaat precedence, highest Kaat, next leader. |
| Contract | Success at exact/above Boli; failure below Boli; correct penalty award. |
| Dealer transfer | Addition to dealer team, cancellation, exact zero, excess transfer, clockwise dealer rotation. |

## Scenario Tests

Use complete scripted hands for both player counts. Assert state after every action and final settlement. Include a hand where the Declarer succeeds with the exact minimum, a failed high Boli, repeated same dealer, and a transfer to the other dealer team.

## Determinism and Serialization

- The same config and shuffle seed produce identical deals.
- Reducing the same action sequence produces byte-equivalent normalized state.
- Every state serializes through JSON and hydrates to an equivalent validated state.
- Replaying persisted actions reproduces the final state.
- Invalid actions do not mutate the input state.

## Adapter Tests

Test `LocalAdapter` end-to-end: action dispatch, authoritative validation failure, public event delivery, and player-scoped privacy. Future adapters reuse the same contract suite against mocked transport.

## UI Tests

Test that the UI shows engine-provided data, exposes only the active player's legal controls, dispatches an action once, and honours reduced motion. Do not mock rule outcomes inside a component test when an engine scenario can prove them.

## Quality Gates

Before merging engine changes: strict TypeScript check, lint/format check, affected unit/scenario tests, and serialization tests. Add a regression scenario for every fixed rule defect.

