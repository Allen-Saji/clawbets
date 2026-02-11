use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// Pyth PriceUpdateV2 account — posted on-chain via Hermes + Pyth receiver.
    /// Anchor automatically validates this is owned by the Pyth receiver program.
    pub price_update: Account<'info, PriceUpdateV2>,
}

pub fn handler(ctx: Context<ResolveMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Must be past deadline
    require!(
        clock.unix_timestamp >= market.deadline,
        ClawBetsError::MarketNotReady
    );

    // Must not be past resolution deadline
    require!(
        clock.unix_timestamp <= market.resolution_deadline,
        ClawBetsError::ResolutionExpired
    );

    // Must be open or closed (not already resolved)
    require!(
        market.status == MarketStatus::Open || market.status == MarketStatus::Closed,
        ClawBetsError::MarketNotOpen
    );

    // Get price from Pyth PriceUpdateV2 — validates feed_id and staleness
    let price_update = &ctx.accounts.price_update;
    let maximum_age: u64 = 120; // 2 minutes max staleness
    let price = price_update
        .get_price_no_older_than(&clock, maximum_age, &market.feed_id)
        .map_err(|_| ClawBetsError::InvalidOracleData)?;

    // Determine outcome
    let outcome = if market.target_above {
        price.price >= market.target_price
    } else {
        price.price < market.target_price
    };

    market.status = MarketStatus::Resolved;
    market.outcome = Some(outcome);
    market.resolved_price = Some(price.price);
    market.resolved_at = Some(clock.unix_timestamp);

    msg!(
        "Market {} resolved: price=({} * 10^{}), target={}, above={}, outcome={}",
        market.market_id,
        price.price,
        price.exponent,
        market.target_price,
        market.target_above,
        if outcome { "YES wins" } else { "NO wins" }
    );
    Ok(())
}
