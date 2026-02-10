use anchor_lang::prelude::*;

#[error_code]
pub enum ClawBetsError {
    #[msg("Title too long (max 128 characters)")]
    TitleTooLong,
    #[msg("Description too long (max 512 characters)")]
    DescriptionTooLong,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
    #[msg("Resolution deadline must be after betting deadline")]
    InvalidResolutionDeadline,
    #[msg("Minimum bet must be greater than zero")]
    InvalidMinBet,
    #[msg("Maximum bet must be >= minimum bet")]
    InvalidMaxBet,
    #[msg("Market is not open for betting")]
    MarketNotOpen,
    #[msg("Betting deadline has passed")]
    BettingClosed,
    #[msg("Bet amount below minimum")]
    BetTooSmall,
    #[msg("Bet amount above maximum")]
    BetTooLarge,
    #[msg("Market cannot be resolved yet (deadline not passed)")]
    MarketNotReady,
    #[msg("Market resolution deadline has passed")]
    ResolutionExpired,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Bet already claimed")]
    AlreadyClaimed,
    #[msg("Bet did not win")]
    BetDidNotWin,
    #[msg("Market has existing bets and cannot be cancelled")]
    MarketHasBets,
    #[msg("Market is not cancelled")]
    MarketNotCancelled,
    #[msg("Only market creator can perform this action")]
    UnauthorizedCreator,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid oracle price data")]
    InvalidOracleData,
    #[msg("Oracle price is stale")]
    StaleOraclePrice,
}
