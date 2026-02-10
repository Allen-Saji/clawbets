use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct ExpireMarket<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
}

/// Anyone can call this after the resolution deadline to mark a market as expired.
/// This enables bettors to reclaim their funds.
pub fn handler(ctx: Context<ExpireMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Must be past resolution deadline
    require!(
        clock.unix_timestamp > market.resolution_deadline,
        ClawBetsError::MarketNotReady
    );

    // Must not already be resolved or cancelled
    require!(
        market.status == MarketStatus::Open || market.status == MarketStatus::Closed,
        ClawBetsError::MarketNotOpen
    );

    market.status = MarketStatus::Expired;

    msg!("Market {} expired — bettors can now reclaim funds", market.market_id);
    Ok(())
}
