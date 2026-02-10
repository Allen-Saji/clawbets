use anchor_lang::prelude::*;
use crate::state::Protocol;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [b"protocol"],
        bump,
    )]
    pub protocol: Account<'info, Protocol>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.admin = ctx.accounts.admin.key();
    protocol.market_count = 0;
    protocol.total_volume = 0;
    protocol.bump = ctx.bumps.protocol;
    Ok(())
}
