use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
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
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: Vault PDA holding escrowed SOL
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"reputation", bettor.key().as_ref()],
        bump = reputation.bump,
    )]
    pub reputation: Account<'info, AgentReputation>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &mut ctx.accounts.bet;

    // Validations
    require!(market.status == MarketStatus::Resolved, ClawBetsError::MarketNotResolved);
    require!(!bet.claimed, ClawBetsError::AlreadyClaimed);

    let outcome = market.outcome.ok_or(ClawBetsError::MarketNotResolved)?;
    require!(bet.position == outcome, ClawBetsError::BetDidNotWin);

    // Calculate winnings: proportional share of the losing pool + original bet
    let (winning_pool, losing_pool) = if outcome {
        (market.total_yes, market.total_no)
    } else {
        (market.total_no, market.total_yes)
    };

    // Winnings = bet_amount + (bet_amount / winning_pool) * losing_pool
    // Use u128 to avoid overflow, with safe truncation check
    let share_128 = (bet.amount as u128)
        .checked_mul(losing_pool as u128)
        .ok_or(ClawBetsError::Overflow)?
        .checked_div(winning_pool as u128)
        .ok_or(ClawBetsError::Overflow)?;
    let share: u64 = u64::try_from(share_128).map_err(|_| ClawBetsError::Overflow)?;
    let winnings = bet.amount
        .checked_add(share)
        .ok_or(ClawBetsError::Overflow)?;

    // Transfer from vault PDA to bettor
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= winnings;
    **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? += winnings;

    // We don't need CPI for PDA-to-user lamport transfer when vault is a SystemAccount PDA
    // The above direct lamport manipulation works for PDAs we own

    bet.claimed = true;

    // Update reputation
    let rep = &mut ctx.accounts.reputation;
    let profit = winnings.checked_sub(bet.amount).unwrap_or(0);
    rep.wins = rep.wins.checked_add(1).ok_or(ClawBetsError::Overflow)?;
    rep.total_won = rep.total_won.checked_add(profit).ok_or(ClawBetsError::Overflow)?;
    
    // Recalculate accuracy
    let total = rep.wins.checked_add(rep.losses).ok_or(ClawBetsError::Overflow)?;
    if total > 0 {
        rep.accuracy_bps = ((rep.wins as u64)
            .checked_mul(10000)
            .ok_or(ClawBetsError::Overflow)?
            .checked_div(total as u64)
            .ok_or(ClawBetsError::Overflow)?) as u16;
    }
    rep.last_active = Clock::get()?.unix_timestamp;

    msg!(
        "Claimed {} lamports from market {} (profit: {} lamports)",
        winnings,
        market.market_id,
        profit
    );
    Ok(())
}
