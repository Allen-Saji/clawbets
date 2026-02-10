use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct CloseBetting<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
}

/// Anyone can call this after the betting deadline to close the market for new bets.
/// This is a housekeeping instruction — markets auto-reject bets past deadline anyway,
/// but this explicitly marks the status.
pub fn handler(ctx: Context<CloseBetting>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    require!(market.status == MarketStatus::Open, ClawBetsError::MarketNotOpen);
    require!(
        clock.unix_timestamp >= market.deadline,
        ClawBetsError::MarketNotReady
    );

    market.status = MarketStatus::Closed;

    msg!("Market {} betting closed — awaiting resolution", market.market_id);
    Ok(())
}
