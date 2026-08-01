# Chakadi: Game Rules and Mechanics

## Purpose

This document defines the house-rule variant of Chakadi used by this project. It is the source of truth for rules-engine behaviour. Hindi/Hinglish names are written in English letters so they can be used consistently in code and product copy.

## Glossary

| Term | Meaning |
| --- | --- |
| `Boli` | Bidding for the contract. |
| `Kaat` | The trump suit for a hand; also playing a trump. |
| `Haath` | A trick: one card played by every player and won by one team. |
| `Chaal` | A card play; also the lead play that begins a trick where context is clear. |
| `Patti` | A playing card. |
| `Rung` | A suit. |
| `Hukum` | Spades (`♠`) only. It does **not** mean trump generically. |
| `Paan` / `Lal` | Hearts (`♥`). |
| `Eet` | Diamonds (`♦`). |
| `Chidi` / `Chidri` | Clubs (`♣`). |
| `Gunti` / `Dhaand` | Accumulated penalty points; lower is better. Wraps around at 48. |
| `Coat` / `Kot` | Major loss tally awarded when a team reaches 48 Gunti. Lower is better. |
| `Dealer team` | The team of the current dealer. It retains the deal until its Gunti is cleared and transferred. |
| `Declarer` | The player who wins the Boli. |

## Table Configuration

Players sit in a circle and teams alternate. A teammate is never adjacent to another teammate.

| Variant | Teams | Deck | Cards each | Tricks | Minimum Boli |
| --- | --- | --- | ---: | ---: | ---: |
| Six-player | 3 vs 3 | 48 cards: remove all four `2`s | 8 | 8 | 5 |
| Four-player | 2 vs 2 | Full 52-card deck | 13 | 13 | 7 |

For six players, seats are `A, B, A, B, A, B`; for four, `A, B, A, B`. Clockwise order is the authoritative play order.

## Cards

All suits use the descending rank order:

`A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3`

There are no special cards, jokers, point cards, or rank exceptions.

## Deal

1. Shuffle the configured deck.
2. The dealer deals clockwise, starting with the player immediately to their left.
3. In the six-player variant, deal four cards to each player, then another four cards to each player.
4. In the four-player variant, each player receives all 13 cards. The visual deal pattern is a UI concern and must not affect the game result.
5. All cards are private to their holder.

## Boli and Kaat

1. Boli begins after dealing, in clockwise order from the player to the dealer's left.
2. The first player is required to open at the variant minimum: `5` for six players or `7` for four players. A hand cannot end with every player passing.
3. A bid is a whole number of tricks, strictly higher than the current highest bid.
4. A player may say `Pass` and may bid again on a later turn if they can raise the current bid.
5. Players state only a number during Boli. They do **not** disclose Kaat while bidding.
6. The highest bidder is the Declarer. Immediately before the first Chaal, the Declarer declares one Rung as Kaat.

### Boli Closing Condition

Boli closes when a full rotation of passes occurs following the highest bid (i.e. every player except the highest bidder has passed in sequence). The highest bidder then becomes the Declarer.

## Playing a Haath

1. The Declarer leads the first Haath.
2. The winner of a Haath leads the next one.
3. A player who has a Patti of the led Rung must follow that Rung.
4. A player unable to follow may play any Patti, including Kaat.
5. The highest Kaat wins if one or more Kaat cards are played. Otherwise, the highest Patti of the led Rung wins.
6. Off-suit non-Kaat cards cannot win a Haath.
7. The winning team receives one trick count, regardless of which teammate won the Haath.
8. Players must not communicate their holdings through speech, signals, or revealed cards.

## Contract Result and Gunti

Let `n` be the winning Boli and `declarerTricks` be the number of Haath won by the Declarer's team.

| Result | Condition | Gunti added |
| --- | --- | --- |
| Contract succeeds | `declarerTricks >= n` | Opposing team receives `n` |
| Contract fails | `declarerTricks < n` | Declarer's team receives `2 × n` |

Gunti is a penalty: the game goal is to move Gunti onto the opposing team and keep the player's own team clear.

## Dealer Rotation, Gunti Transfer, and 48-Point Coat (Kot)

The current dealer's team is special for score settlement and deal rotation:

### 1. Standard Gunti Addition and Transfer
* **Adding Gunti to Dealer Team**: When Gunti is added to the dealer team, add it directly to their total. If the total stays under 48, the **same dealer deals again**.
* **Adding Gunti to Opposing Team (Cancellation & Transfer)**: When Gunti is awarded to the opposing team, it first cancels out the dealer team's existing Gunti:
  * If the dealer team's Gunti remains positive (and under 48), the **same dealer deals again**.
  * If the cancellation brings the dealer team's Gunti to **zero or lower**, the excess points carry over as Gunti for the opposing team: `opponentGunti = award - priorDealerGunti`.
  * **Clockwise Dealer Transfer**: When Gunti crosses zero to the opposing team, the deal passes to the **next player clockwise** (who belongs to the opposing team). The opposing team becomes the new dealer team.

### 2. 48-Point Threshold & Coat (Kot) Mechanics
When a team's accumulated Gunti reaches or exceeds **48 points** (`Gunti >= 48`):
* **Coat (Kot) Award**: The team reaching 48 points receives **+1 Coat** (major penalty marker).
* **Point Reduction**: 48 points are deducted from that team's total: `newGunti = totalGunti - 48`.
* **Coat Reduction**: If a team that previously had Coat points forces the opposing team to hit 48 points, the winning team's Coat total is reduced by 1 (`Coat = max(0, Coat - 1)`).
* **Same-Team Dealer Rotation**: Hitting 48 points triggers a deal rotation **within the same team**: the deal passes to the **next player on the same team** (2 seats clockwise in 4-player, or 2 seats clockwise in 6-player).
* **Independence of Coat and Dealership**: `Coat` markers track major game losses and do **not** alter the Gunti-based dealership transfer logic.

### Example Walkthrough
1. Dealer team starts with **46 Gunti**.
2. Dealer team fails contract (or opponents score), adding **5 Gunti** to the dealer team: `46 + 5 = 51 Gunti`.
3. Since `51 >= 48`:
   * Dealer team receives **+1 Coat**.
   * Dealer team Gunti resets to `51 - 48 = 3 Gunti`.
   * Deal stays with the dealer team, but passes to the **next member of the same team**.
4. On the next hand, the opposing team wins a contract awarding **10 Gunti** against the dealer team:
   * Dealer team Gunti becomes `3 - 10 = -7`.
   * Dealer team Gunti clears to `0`, and opposing team receives `7 Gunti`.
   * Since Gunti crossed zero, deal passes to the **next player clockwise** (on the opposing team).
   * The previous team retains their **1 Coat**; Coat total is unaffected by zero-crossing transfers.

## Match End Condition

A Match ends when a team reaches the configured **Coat (Kot) limit** (e.g. `1 Coat`, `2 Coats`, or `3 Coats`, configurable in `GameConfig`, default `1 Coat`).

When a team reaches the target Coat count, the opposing team wins the match.

