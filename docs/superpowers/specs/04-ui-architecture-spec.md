# Chakadi: UI Architecture

## Scope

React 19 renders the engine state and sends user intent. It must not implement Boli, Kaat, turn, card-legality, scoring, or settlement rules.

## State Bridge

`GameSession` owns an engine and adapter. A small bridge subscribes to engine/adapter updates and copies the latest serializable view model into Zustand. Components select view data from Zustand and invoke bridge commands such as `placeBid`, `declareKaat`, and `playCard`.

The bridge obtains valid move affordances from engine selectors (`getLegalCards`, current turn, available bids). The UI may disable impossible controls, but engine validation remains authoritative.

## Mobile-first Screens

| Screen | Content |
| --- | --- |
| Setup | Player count, names, team seating, start game. |
| Deal / Boli | Private hand, current bidder, highest Boli, pass/bid controls. |
| Kaat declaration | Declarer-only suit chooser. |
| Table | Central Haath, current Chaal, player hand, turn indicator, team trick count, Gunti. |
| Settlement | Contract outcome, Haath totals, Gunti transfer, next dealer. |
| Match history (future) | Completed hands, bids, Kaat, settlement summary. |

The active player’s hand is full size at the bottom; other players use compact seat indicators. On a shared device, a privacy hand-off screen must hide the outgoing player’s Patti before the next player views theirs.

## Components

`GameTable`, `PlayerHand`, `Card`, `TrickArea`, `TurnIndicator`, `BidPanel`, `KaatPicker`, `ScorePanel`, and `HandSettlementDialog` are presentational and receive data/callbacks. Feature containers coordinate the bridge, never rules.

## Animation and Accessibility

Motion animations are derived from engine events: deal, card played, Haath won, and settlement. They never delay or alter an engine transition. Respect reduced-motion preferences, use accessible labels for suits/cards, preserve keyboard reachability, and use colour plus symbols/text for suit and turn status.

## PWA

The final polish phase enables `vite-plugin-pwa`, install prompt support, an offline app shell, and a clear offline/network state. Offline support does not imply multi-device synchronization; local games remain fully usable.

