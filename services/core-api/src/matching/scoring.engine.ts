/**
 * Blood Compatibility Matrix
 * Maps each blood group to the groups it can RECEIVE from (donor compatible)
 */
export const BLOOD_COMPATIBILITY: Record<string, string[]> = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'], // Universal donor — only receives O-
};

/**
 * Get all compatible donor blood groups for a given recipient blood group
 */
export function getCompatibleDonorGroups(recipientGroup: string): string[] {
  return BLOOD_COMPATIBILITY[recipientGroup] ?? [recipientGroup];
}

/**
 * AI-inspired scoring model for donor prioritization (0–1 scale)
 * Weights:
 *   35% — Distance (closer = higher score)
 *   25% — Eligibility (longer since last donation = higher)
 *   25% — Responsiveness (past accept rate + speed)
 *   15% — Recency (was active recently)
 */
export function scoreDonor(donor: {
  distance_km: number;
  last_donation_date: Date | null;
  total_accepted: number;
  total_rejected: number;
  total_ignored: number;
  avg_response_time_seconds: number;
  last_seen_at: Date;
}, maxRadius: number): number {
  // Distance score (0–1, inverse of distance)
  const distanceScore = Math.max(0, 1 - donor.distance_km / maxRadius);

  // Eligibility score (days since donation, capped at 1 after 180 days)
  let eligibilityScore = 0.5;
  if (donor.last_donation_date) {
    const daysSince = (Date.now() - new Date(donor.last_donation_date).getTime()) / (1000 * 86400);
    eligibilityScore = Math.min(1, daysSince / 180);
  } else {
    eligibilityScore = 1.0; // Never donated — fresh donor
  }

  // Responsiveness score
  const total = donor.total_accepted + donor.total_rejected + donor.total_ignored;
  let responsivenessScore = 0.5;
  if (total > 0) {
    const acceptRate = donor.total_accepted / total;
    const ignoreRate = donor.total_ignored / total;
    const speedBonus = donor.avg_response_time_seconds > 0
      ? Math.max(0, 1 - donor.avg_response_time_seconds / 300) // 5 min = worst
      : 0.5;
    responsivenessScore = 0.6 * acceptRate + 0.4 * speedBonus - 0.3 * ignoreRate;
    responsivenessScore = Math.max(0, Math.min(1, responsivenessScore));
  }

  // Recency score (active within last 5 min = 1.0, else decay)
  const minsAgo = (Date.now() - new Date(donor.last_seen_at).getTime()) / (1000 * 60);
  const recencyScore = minsAgo < 5 ? 1.0 : Math.max(0, 1 - minsAgo / 60);

  const score =
    0.35 * distanceScore +
    0.25 * eligibilityScore +
    0.25 * responsivenessScore +
    0.15 * recencyScore;

  return Math.round(score * 1000) / 1000; // Round to 3 decimal places
}
