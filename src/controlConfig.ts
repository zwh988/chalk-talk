// Thin-data thresholds for the initiative blocks in Review → Players. Below these a card shows an "Early read" tag.
export const EARLY={
  chances:30,    // Initiative: resolved chances
  safeties:10,   // Defence (S3): safeties with a resolved outcome
  hard:10,       // Hard shots (S3): attempts
  leak:10        // How the initiative was lost: visits that lost the initiative needed before "Biggest leak" is named
};
