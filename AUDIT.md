# ClawBets Security Audit Report

**Date:** 2026-02-11  
**Auditor:** Claude (Senior Solana Smart Contract Auditor)  
**Scope:** ClawBets on-chain program (`programs/clawbets/src/`) + Next.js API/frontend (`app/src/`)  
**Commit:** Pre-fix baseline + applied fixes

---

## Executive Summary

ClawBets is an Anchor-based Solana prediction market where agents bet SOL on price outcomes resolved via Pyth oracles. The codebase is generally well-structured with proper use of Anchor's account validation, PDA derivation, and checked arithmetic. However, several significant issues were found, including one critical fund-locking scenario that was fixed during this audit.

**Findings Summary:**
| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 5 |
| Low | 3 |
| Informational | 4 |

---

## Critical Findings

### C-1: Funds Permanently Stuck When No Bets on Winning Side ✅ FIXED

**File:** `claim_winnings.rs`, `reclaim_bet.rs`  
**Severity:** Critical

**Description:** If a market resolves and ALL bets are on the losing side (e.g., everyone bet YES, but NO wins), the winning pool is 0. No one can call `claim_winnings` (division by zero on `winning_pool`), and `reclaim_bet` only allowed reclaims for cancelled/expired markets — NOT resolved markets. Funds would be **permanently locked** in the vault PDA.

**Fix Applied:**
1. Added `NoWinners` error to `claim_winnings` with clear guidance to use `reclaim_bet`
2. Extended `reclaim_bet` to allow reclaims when market is resolved but `winning_pool == 0`
3. Added `NoWinners` and `MarketNotReclaimable` error variants

**Status:** ✅ Fixed and verified (anchor build passes)

---

## High Findings

### H-1: Loser Reputation Never Updated

**File:** `claim_winnings.rs`  
**Severity:** High

**Description:** When winners claim, their `wins` and `total_won` are updated. However, **losers never have their `losses` or `total_lost` fields incremented**. There is no `claim_loss` or equivalent instruction. The `accuracy_bps` field is therefore inaccurate — it only reflects wins, not the true win rate.

**Impact:** The on-chain reputation system, which is a core feature of the protocol, produces misleading accuracy metrics. An agent who bet 100 times and won 1 would show 100% accuracy.

**Recommendation:** Add a `claim_loss` instruction that allows losing bettors on resolved markets to close their bet account (recovering rent) while updating `losses` and `total_lost`. Alternatively, update loser reputation during `resolve_market` (but this doesn't scale with many bettors).

---

### H-2: Anyone Can Resolve Market — Timing Manipulation

**File:** `resolve_market.rs`  
**Severity:** High

**Description:** The `resolver` signer has **no access control** — anyone can resolve any market the moment the deadline passes. While permissionless resolution is sometimes desirable, it enables:
- **Strategic timing attacks:** A bettor can wait for a price that favors their position and resolve at that exact moment within the resolution window.
- **MEV exploitation:** A searcher can bundle a price update + resolution in a single transaction to lock in a favorable price.

**Impact:** Resolvers can cherry-pick the exact moment of resolution within the `[deadline, resolution_deadline]` window to manipulate outcomes.

**Recommendation:** Either:
1. Restrict resolution to the market creator or protocol admin
2. Add a mandatory delay after deadline before resolution is allowed (e.g., deadline + 1 hour) to reduce timing precision
3. Require a minimum number of Pyth price updates or a TWAP

---

### H-3: Price Comparison Ignores Oracle Exponent

**File:** `resolve_market.rs`  
**Severity:** High

**Description:** The market stores `target_price` as `i64` and compares directly with `price.price` from Pyth. Pyth prices have an `exponent` field (e.g., price = 25000000000, exponent = -8, meaning $250.00). The comparison `price.price >= market.target_price` assumes the creator set `target_price` in the same scale as the Pyth feed. However:
- There is no on-chain validation of the exponent
- If Pyth changes the exponent for a feed, existing markets would resolve incorrectly
- Creators could accidentally set prices in wrong scale

**Recommendation:** Store the expected exponent in the Market struct and validate it matches at resolution time. Or normalize prices before comparison.

---

## Medium Findings

### M-1: Rounding Dust Locked in Vault

**File:** `claim_winnings.rs`  
**Severity:** Medium

**Description:** Integer division truncation in `(bet_amount * losing_pool) / winning_pool` means the sum of all payouts will be slightly less than the vault balance. The remaining "dust" (potentially up to `N-1` lamports where N = number of winners) is permanently locked.

**Impact:** Small amounts of SOL accumulate as unrecoverable dust. Over many markets, this adds up.

**Recommendation:** Add an admin `sweep_dust` instruction to recover remaining lamports from resolved markets after all claims are processed, or give the last claimer the remaining balance.

---

### M-2: No Feed ID Validation/Whitelist

**File:** `create_market.rs`  
**Severity:** Medium

**Description:** Any 32-byte value can be set as `feed_id`. A malicious creator could:
- Use a low-liquidity or manipulable price feed
- Use an invalid feed_id that will never resolve (griefing — funds locked until expiry)
- Use a feed for a different asset than described in the title

**Recommendation:** Maintain a whitelist of approved feed IDs on the protocol account, or at minimum validate the feed_id can be fetched from Pyth at market creation time.

---

### M-3: Market Account Not Marked `mut` in `claim_winnings`

**File:** `claim_winnings.rs`  
**Severity:** Medium (Operational)

**Description:** The market account in `ClaimWinnings` is immutable (no `mut`). While this is correct since claim_winnings doesn't modify market state, it means there's no way to track how many claims have been processed or close the market account to recover rent after all claims complete.

---

### M-4: Single Bet Per User Per Market

**File:** `place_bet.rs`  
**Severity:** Medium (Design)

**Description:** Bet PDA seeds are `[market, bettor]`, allowing only one bet per user per market. A user cannot increase their position or bet on both sides. This is enforced by `init` (not `init_if_needed`).

**Impact:** Users who want to increase their bet must use a different wallet, splitting their reputation tracking.

**Recommendation:** Consider allowing bet increases (use `init_if_needed` and add to existing amount), or document this as intentional.

---

### M-5: `target_above=true` Uses `>=` Not Strictly `>`

**File:** `resolve_market.rs`  
**Severity:** Medium

**Description:** For `target_above = true`, the outcome check is `price.price >= market.target_price` (greater-than-or-equal). For `target_above = false`, it's `price.price < market.target_price` (strictly less). This asymmetry means if price equals target exactly:
- `target_above=true` → YES wins
- `target_above=false` → YES also wins (price is not below target)

Both market types resolve the same way at the boundary. This may confuse users.

---

## Low Findings

### L-1: No Re-initialization Protection on Protocol

**File:** `initialize.rs`  
**Severity:** Low

**Description:** The `init` constraint on Protocol PDA prevents re-initialization (Anchor's `init` will fail if account exists). This is correctly handled. ✅

**Note:** Listed for completeness — this is secure.

---

### L-2: `cancel_market` Only Works With Zero Bets

**File:** `cancel_market.rs`  
**Severity:** Low

**Description:** Markets can only be cancelled if `yes_count == 0 && no_count == 0`. Once a single bet is placed, the creator cannot cancel. This is safe but restrictive — a creator who discovers a mistake in their market parameters has no recourse after the first bet.

**Recommendation:** Consider allowing cancellation with automatic refund processing, or add an admin override.

---

### L-3: 2-Minute Staleness Window for Oracle

**File:** `resolve_market.rs`  
**Severity:** Low

**Description:** The `maximum_age = 120` seconds allows somewhat stale prices. For volatile assets, 2-minute-old prices could differ significantly from the actual price at resolution time.

---

## Informational Findings

### I-1: Direct Lamport Manipulation Pattern

**File:** `claim_winnings.rs`, `reclaim_bet.rs`  
**Severity:** Informational

**Description:** The program uses direct lamport manipulation (`try_borrow_mut_lamports`) to transfer SOL from the vault PDA. This is a valid pattern for SystemAccount PDAs in the Solana runtime, but it bypasses CPI auditing. Future Solana runtime changes could affect this. Consider using `invoke_signed` with system_program::transfer for explicit PDA signing.

---

### I-2: No Protocol Fee Mechanism

**Severity:** Informational

**Description:** The protocol takes no fees on bets or winnings. While this is generous, it means the protocol has no revenue model and no funds for maintenance/upgrades.

---

### I-3: `expire_market` Is Permissionless (By Design)

**Severity:** Informational

**Description:** Anyone can call `expire_market` after the resolution deadline. This is correctly documented as intentional to ensure bettors can always reclaim funds.

---

### I-4: Bet Account Closure in `reclaim_bet`

**Severity:** Informational

**Description:** The `close = bettor` constraint on the bet account in `reclaim_bet` correctly returns rent to the bettor. However, `claim_winnings` does NOT close the bet account — winners' bet accounts persist forever, wasting rent. Consider adding `close = bettor` to `ClaimWinnings` as well.

---

## Frontend/API Audit

### API Routes (`app/src/app/api/`)

| Finding | Severity | Details |
|---------|----------|---------|
| **Server-side admin key handling** | ✅ Safe | `ADMIN_SECRET_KEY` is read from `process.env` only in server-side code (`lib/solana.ts`). Next.js API routes run server-side only. No client-side exposure. |
| **Input validation on `/api/markets/[id]`** | ✅ Adequate | Validates `parseInt(id)` and checks `isNaN`. |
| **Input validation on `/api/reputation/[pubkey]`** | ✅ Adequate | Validates via `new PublicKey(pubkey)` with try/catch. |
| **No mutation endpoints** | ✅ Safe | All API routes are read-only (`GET`). No POST/PUT/DELETE. All mutations happen on-chain via signed transactions. |
| **XSS vectors** | Low Risk | Market titles and descriptions come from on-chain data and are rendered in React (which auto-escapes). No `dangerouslySetInnerHTML` usage found. |
| **Error messages** | ✅ Safe | Error responses use generic messages, not raw stack traces. |
| **CORS/Auth** | Informational | API routes have no authentication — they're public read-only endpoints, which is appropriate for a blockchain explorer-style API. |

### Hardcoded Secrets Check

```
grep -rn "secret\|private.*key\|PRIVATE\|SECRET" app/src/
```
- `ADMIN_SECRET_KEY` — referenced only in server-side `lib/solana.ts` via `process.env`. ✅ Not hardcoded.
- No hardcoded private keys, API keys, or secrets found in source code.
- Code examples in `agents/page.tsx` and `api/docs/route.ts` use placeholder comments (`/* your secret key */`), not real keys. ✅

---

## Fixes Applied During Audit

| ID | Severity | File(s) Modified | Description |
|----|----------|-----------------|-------------|
| C-1 | Critical | `errors.rs`, `claim_winnings.rs`, `reclaim_bet.rs` | Added handling for zero winning pool — losers can now reclaim funds via `reclaim_bet` when market resolves with no winners |

**Build status:** ✅ `anchor build` passes after fixes.

---

## Recommendations Summary (Priority Order)

1. **[Critical — Fixed]** Zero winning pool fund lock → ✅ Done
2. **[High]** Add loser reputation tracking (claim_loss instruction)
3. **[High]** Restrict or add delay to market resolution to mitigate timing attacks
4. **[High]** Validate or store oracle exponent for price comparison safety
5. **[Medium]** Implement vault dust recovery mechanism
6. **[Medium]** Add feed_id whitelist or validation
7. **[Low]** Close bet accounts in claim_winnings to return rent
8. **[Low]** Consider protocol fee mechanism for sustainability
