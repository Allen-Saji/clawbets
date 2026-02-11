use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct ReclaimBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), bettor.key().as_ref()],
        bump = bet.bump,
        has_one = bettor,
        has_one = market,
        close = bettor,
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: Vault PDA holding escrowed SOL
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReclaimBet>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &ctx.accounts.bet;

    // Allow reclaim if:
    // 1. Market is cancelled
    // 2. Market expired (past resolution deadline without resolution)
    // 3. Market resolved but winning pool is zero (no winners exist, losers get refund)
    let is_cancelled = market.status == MarketStatus::Cancelled;
    let is_expired = market.status == MarketStatus::Expired
        || (market.status != MarketStatus::Resolved
            && Clock::get()?.unix_timestamp > market.resolution_deadline);
    let is_resolved_no_winners = market.status == MarketStatus::Resolved && {
        let outcome = market.outcome.unwrap_or(false);
        let winning_pool = if outcome { market.total_yes } else { market.total_no };
        winning_pool == 0
    };
    require!(
        is_cancelled || is_expired || is_resolved_no_winners,
        ClawBetsError::MarketNotReclaimable
    );

    require!(!bet.claimed, ClawBetsError::AlreadyClaimed);

    let amount = bet.amount;

    // Transfer from vault back to bettor
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? += amount;

    msg!(
        "Reclaimed {} lamports from market {}",
        amount,
        market.market_id
    );
    Ok(())
}
