use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Protocol {
    pub admin: Pubkey,
    pub market_count: u64,
    pub total_volume: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Market creator
    pub creator: Pubkey,
    /// Sequential market ID
    pub market_id: u64,
    /// Market title (e.g., "SOL above $250 by Feb 20?")
    #[max_len(128)]
    pub title: String,
    /// Market description
    #[max_len(512)]
    pub description: String,
    /// Pyth oracle price feed account
    pub oracle_feed: Pubkey,
    /// Target price (in oracle price format, scaled)
    pub target_price: i64,
    /// True = bet on price being ABOVE target, False = BELOW
    pub target_above: bool,
    /// Unix timestamp when betting closes
    pub deadline: i64,
    /// Unix timestamp by which market must be resolved
    pub resolution_deadline: i64,
    /// Minimum bet amount in lamports
    pub min_bet: u64,
    /// Maximum bet amount in lamports
    pub max_bet: u64,
    /// Total SOL bet on YES
    pub total_yes: u64,
    /// Total SOL bet on NO
    pub total_no: u64,
    /// Number of YES bettors
    pub yes_count: u32,
    /// Number of NO bettors
    pub no_count: u32,
    /// Market status
    pub status: MarketStatus,
    /// Winning side (set after resolution)
    pub outcome: Option<bool>,
    /// Oracle price at resolution
    pub resolved_price: Option<i64>,
    /// Timestamp of resolution
    pub resolved_at: Option<i64>,
    /// Market creation timestamp
    pub created_at: i64,
    /// Bump seed
    pub bump: u8,
    /// Vault bump seed
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Open,
    Closed,     // Deadline passed, awaiting resolution
    Resolved,   // Resolved with outcome
    Cancelled,  // Cancelled by creator
    Expired,    // Resolution deadline passed without resolution
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    /// Bettor's public key
    pub bettor: Pubkey,
    /// Market this bet belongs to
    pub market: Pubkey,
    /// Amount in lamports
    pub amount: u64,
    /// YES (true) or NO (false)
    pub position: bool,
    /// Whether winnings have been claimed
    pub claimed: bool,
    /// Timestamp of bet placement
    pub placed_at: i64,
    /// Bump seed
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AgentReputation {
    /// Agent's public key
    pub agent: Pubkey,
    /// Total bets placed
    pub total_bets: u32,
    /// Total bets won
    pub wins: u32,
    /// Total bets lost
    pub losses: u32,
    /// Total SOL wagered (in lamports)
    pub total_wagered: u64,
    /// Total SOL won (in lamports)
    pub total_won: u64,
    /// Total SOL lost (in lamports)
    pub total_lost: u64,
    /// Markets created
    pub markets_created: u32,
    /// Accuracy basis points (wins * 10000 / total_bets)
    pub accuracy_bps: u16,
    /// Last activity timestamp
    pub last_active: i64,
    /// Bump seed
    pub bump: u8,
}
