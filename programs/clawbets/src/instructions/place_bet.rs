use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), bettor.key().as_ref()],
        bump,
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: Vault PDA to hold escrowed SOL
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Reputation account for the bettor (init if needed)
    #[account(
        init_if_needed,
        payer = bettor,
        space = 8 + AgentReputation::INIT_SPACE,
        seeds = [b"reputation", bettor.key().as_ref()],
        bump,
    )]
    pub reputation: Account<'info, AgentReputation>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBet>, amount: u64, position: bool) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Validations
    require!(market.status == MarketStatus::Open, ClawBetsError::MarketNotOpen);
    require!(clock.unix_timestamp < market.deadline, ClawBetsError::BettingClosed);
    require!(amount >= market.min_bet, ClawBetsError::BetTooSmall);
    require!(amount <= market.max_bet, ClawBetsError::BetTooLarge);

    // Transfer SOL to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update market totals
    if position {
        market.total_yes = market.total_yes.checked_add(amount).ok_or(ClawBetsError::Overflow)?;
        market.yes_count = market.yes_count.checked_add(1).ok_or(ClawBetsError::Overflow)?;
    } else {
        market.total_no = market.total_no.checked_add(amount).ok_or(ClawBetsError::Overflow)?;
        market.no_count = market.no_count.checked_add(1).ok_or(ClawBetsError::Overflow)?;
    }

    // Update protocol volume
    let protocol = &mut ctx.accounts.protocol;
    protocol.total_volume = protocol.total_volume.checked_add(amount).ok_or(ClawBetsError::Overflow)?;

    // Record bet
    let bet = &mut ctx.accounts.bet;
    bet.bettor = ctx.accounts.bettor.key();
    bet.market = market.key();
    bet.amount = amount;
    bet.position = position;
    bet.claimed = false;
    bet.placed_at = clock.unix_timestamp;
    bet.bump = ctx.bumps.bet;

    // Update reputation
    let rep = &mut ctx.accounts.reputation;
    if rep.agent == Pubkey::default() {
        rep.agent = ctx.accounts.bettor.key();
        rep.bump = ctx.bumps.reputation;
    }
    rep.total_bets = rep.total_bets.checked_add(1).ok_or(ClawBetsError::Overflow)?;
    rep.total_wagered = rep.total_wagered.checked_add(amount).ok_or(ClawBetsError::Overflow)?;
    rep.last_active = clock.unix_timestamp;

    msg!(
        "Bet placed: {} lamports on {} for market {}",
        amount,
        if position { "YES" } else { "NO" },
        market.market_id
    );
    Ok(())
}
