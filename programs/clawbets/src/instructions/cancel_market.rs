use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        has_one = creator @ ClawBetsError::UnauthorizedCreator,
    )]
    pub market: Account<'info, Market>,
}

pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(market.status == MarketStatus::Open, ClawBetsError::MarketNotOpen);
    require!(
        market.yes_count == 0 && market.no_count == 0,
        ClawBetsError::MarketHasBets
    );

    market.status = MarketStatus::Cancelled;

    msg!("Market {} cancelled", market.market_id);
    Ok(())
}
