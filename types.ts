
export interface Platform {
    id: number;
    name: string;
    impressions: number | null;
    reach: number | null;
    clicks: number | null;
    ctr: number | null;
}

export interface Channel {
    id: number;
    name: string;
    activeMonths: boolean[]; // Array of 12 booleans, one for each month
}

export interface OverallResults {
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    weightedAvgCTR: number;
}

export interface DashboardData {
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    reportingPeriod: string;
    platforms: Platform[];
    overallResults: OverallResults;
    channels: Channel[];
    firstActiveMonthIndex: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    message: string;
    type: ToastType;
}