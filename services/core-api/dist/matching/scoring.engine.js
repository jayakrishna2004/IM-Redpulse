"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOOD_COMPATIBILITY = void 0;
exports.getCompatibleDonorGroups = getCompatibleDonorGroups;
exports.scoreDonor = scoreDonor;
exports.BLOOD_COMPATIBILITY = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'],
};
function getCompatibleDonorGroups(recipientGroup) {
    return exports.BLOOD_COMPATIBILITY[recipientGroup] ?? [recipientGroup];
}
function scoreDonor(donor, maxRadius) {
    const distanceScore = Math.max(0, 1 - donor.distance_km / maxRadius);
    let eligibilityScore = 0.5;
    if (donor.last_donation_date) {
        const daysSince = (Date.now() - new Date(donor.last_donation_date).getTime()) / (1000 * 86400);
        eligibilityScore = Math.min(1, daysSince / 180);
    }
    else {
        eligibilityScore = 1.0;
    }
    const total = donor.total_accepted + donor.total_rejected + donor.total_ignored;
    let responsivenessScore = 0.5;
    if (total > 0) {
        const acceptRate = donor.total_accepted / total;
        const ignoreRate = donor.total_ignored / total;
        const speedBonus = donor.avg_response_time_seconds > 0
            ? Math.max(0, 1 - donor.avg_response_time_seconds / 300)
            : 0.5;
        responsivenessScore = 0.6 * acceptRate + 0.4 * speedBonus - 0.3 * ignoreRate;
        responsivenessScore = Math.max(0, Math.min(1, responsivenessScore));
    }
    const minsAgo = (Date.now() - new Date(donor.last_seen_at).getTime()) / (1000 * 60);
    const recencyScore = minsAgo < 5 ? 1.0 : Math.max(0, 1 - minsAgo / 60);
    const score = 0.35 * distanceScore +
        0.25 * eligibilityScore +
        0.25 * responsivenessScore +
        0.15 * recencyScore;
    return Math.round(score * 1000) / 1000;
}
//# sourceMappingURL=scoring.engine.js.map