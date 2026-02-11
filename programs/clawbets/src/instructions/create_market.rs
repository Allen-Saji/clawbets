use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawBetsError;

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", protocol.market_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Vault PDA to hold escrowed SOL
    #[account(
        seeds = [b"vault", market.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Reputation account for the creator (init if needed)
    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + AgentReputation::INIT_SPACE,
        seeds = [b"reputation", creator.key().as_ref()],
        bump,
    )]
    pub reputation: Account<'info, AgentReputation>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    title: String,
    description: String,
    feed_id: [u8; 32],
    target_price: i64,
    target_above: bool,
    deadline: i64,
    resolution_deadline: i64,
    min_bet: u64,
    max_bet: u64,
) -> Result<()> {
    // Validations
    require!(title.len() <= 128, ClawBetsError::TitleTooLong);
    require!(description.len() <= 512, ClawBetsError::DescriptionTooLong);

    let clock = Clock::get()?;
    require!(deadline > clock.unix_timestamp, ClawBetsError::DeadlineInPast);
    require!(resolution_deadline > deadline, ClawBetsError::InvalidResolutionDeadline);
    require!(min_bet > 0, ClawBetsError::InvalidMinBet);
    require!(max_bet >= min_bet, ClawBetsError::InvalidMaxBet);

    let protocol = &mut ctx.accounts.protocol;
    let market = &mut ctx.accounts.market;

    market.creator = ctx.accounts.creator.key();
    market.market_id = protocol.market_count;
    market.title = title;
    market.description = description;
    market.feed_id = feed_id;
    market.target_price = target_price;
    market.target_above = target_above;
    market.deadline = deadline;
    market.resolution_deadline = resolution_deadline;
    market.min_bet = min_bet;
    market.max_bet = max_bet;
    market.total_yes = 0;
    market.total_no = 0;
    market.yes_count = 0;
    market.no_count = 0;
    market.status = MarketStatus::Open;
    market.outcome = None;
    market.resolved_price = None;
    market.resolved_at = None;
    market.created_at = clock.unix_timestamp;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;

    // Update protocol
    protocol.market_count = protocol.market_count.checked_add(1).ok_or(ClawBetsError::Overflow)?;

    // Update reputation
    let rep = &mut ctx.accounts.reputation;
    if rep.agent == Pubkey::default() {
        rep.agent = ctx.accounts.creator.key();
        rep.bump = ctx.bumps.reputation;
    }
    rep.markets_created = rep.markets_created.checked_add(1).ok_or(ClawBetsError::Overflow)?;
    rep.last_active = clock.unix_timestamp;

    msg!("Market {} created: {}", market.market_id, market.title);
    Ok(())
}
