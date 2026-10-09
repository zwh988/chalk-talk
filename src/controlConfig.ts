// Thin-data thresholds for the control blocks in Review → Players. Below these a card shows an "Early read" tag.
export const EARLY={
  chances:30,    // Control: resolved chances
  safeties:10,   // Defence (S3): safeties with a resolved outcome
  hard:10,       // Hard shots (S3): attempts
  leak:10        // How control was lost: lost-control visits needed before "Biggest leak" is named
};
