export declare const BLOOD_COMPATIBILITY: Record<string, string[]>;
export declare function getCompatibleDonorGroups(recipientGroup: string): string[];
export declare function scoreDonor(donor: {
    distance_km: number;
    last_donation_date: Date | null;
    total_accepted: number;
    total_rejected: number;
    total_ignored: number;
    avg_response_time_seconds: number;
    last_seen_at: Date;
}, maxRadius: number): number;
