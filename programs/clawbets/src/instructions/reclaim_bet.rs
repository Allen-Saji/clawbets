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

    // Allow reclaim if market is cancelled OR expired (past resolution deadline without resolution)
    require!(
        market.status == MarketStatus::Cancelled
            || (market.status != MarketStatus::Resolved
                && Clock::get()?.unix_timestamp > market.resolution_deadline),
        ClawBetsError::MarketNotCancelled
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
