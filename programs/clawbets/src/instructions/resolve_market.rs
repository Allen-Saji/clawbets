use anchor_lang::prelude::*;
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

    /// CHECK: Pyth oracle price feed account - validated in handler
    pub oracle_feed: AccountInfo<'info>,
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

    // Verify oracle feed matches
    require!(
        ctx.accounts.oracle_feed.key() == market.oracle_feed,
        ClawBetsError::InvalidOracleData
    );

    // Read Pyth price from oracle account
    // For devnet/testing, we parse the Pyth V2 price feed format
    let oracle_data = ctx.accounts.oracle_feed.try_borrow_data()?;
    
    // Pyth price account layout: offset 208 = price (i64), offset 216 = conf (u64), offset 232 = expo (i32)
    // This is the standard Pyth V2 format
    require!(oracle_data.len() >= 240, ClawBetsError::InvalidOracleData);
    
    let price = i64::from_le_bytes(
        oracle_data[208..216].try_into().map_err(|_| ClawBetsError::InvalidOracleData)?
    );
    let _conf = u64::from_le_bytes(
        oracle_data[216..224].try_into().map_err(|_| ClawBetsError::InvalidOracleData)?
    );
    let expo = i32::from_le_bytes(
        oracle_data[232..236].try_into().map_err(|_| ClawBetsError::InvalidOracleData)?
    );
    let publish_time = i64::from_le_bytes(
        oracle_data[224..232].try_into().map_err(|_| ClawBetsError::InvalidOracleData)?
    );
    
    // Check price is not stale (within 60 seconds)
    require!(
        clock.unix_timestamp - publish_time < 60,
        ClawBetsError::StaleOraclePrice
    );
    
    // Normalize price to same scale as target_price
    // Target price is stored with same exponent as oracle
    let _ = expo; // Both prices use oracle's native scale
    
    // Determine outcome
    let outcome = if market.target_above {
        price >= market.target_price
    } else {
        price < market.target_price
    };

    market.status = MarketStatus::Resolved;
    market.outcome = Some(outcome);
    market.resolved_price = Some(price);
    market.resolved_at = Some(clock.unix_timestamp);

    msg!(
        "Market {} resolved: price={}, target={}, above={}, outcome={}",
        market.market_id,
        price,
        market.target_price,
        market.target_above,
        if outcome { "YES wins" } else { "NO wins" }
    );
    Ok(())
}
