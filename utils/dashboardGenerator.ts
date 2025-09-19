
import type { DashboardData } from '../types';
import { MONTHS } from '../constants';

function formatNumber(num: number): string {
    if (num === 0) return '-';
    return num.toLocaleString('en-US');
}

function formatValue(value: number, unit: 'M' | 'K' | ''): string {
    if (unit === 'M') {
        return (value / 1_000_000).toFixed(2) + 'M';
    }
    if (unit === 'K') {
        return (value / 1_000).toFixed(1) + 'K';
    }
    return formatNumber(value);
}

function getDisplayUnit(value: number): 'M' | 'K' | '' {
    if (value >= 1_000_000) return 'M';
    if (value >= 10_000) return 'K';
    return '';
}

export const generateDashboardHTML = (data: DashboardData): string => {
    const {
        brandName,
        primaryColor,
        secondaryColor,
        reportingPeriod,
        platforms,
        overallResults,
        channels,
        firstActiveMonthIndex,
    } = data;
    
    const impUnit = getDisplayUnit(overallResults.totalImpressions);
    const reachUnit = getDisplayUnit(overallResults.totalReach);
    const clicksUnit = getDisplayUnit(overallResults.totalClicks);

    const platformRows = platforms.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${formatNumber(p.impressions ?? 0)}</td>
            <td>${formatNumber(p.reach ?? 0)}</td>
            <td>${formatNumber(p.clicks ?? 0)}</td>
            <td><span class="ctr-highlight">${(p.ctr ?? 0).toFixed(2)}%</span></td>
        </tr>
    `).join('');

    const visibleMonths = MONTHS.slice(firstActiveMonthIndex);
    const visibleMonthCount = visibleMonths.length;

    const timelineRows = channels.map(c => `
        <div class="timeline-row">
            <div class="channel-name">${c.name}</div>
            <div class="timeline-months">
                ${c.activeMonths.slice(firstActiveMonthIndex).map(isActive => `
                    <div class="month-status ${isActive ? 'active' : 'inactive'}">${isActive ? '✓' : '-'}</div>
                `).join('')}
            </div>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale-1.0">
    <title>${brandName} Digital Performance Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; padding: 20px; }
        .dashboard { max-width: 1400px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 30px 40px; text-align: center; }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header .subtitle { font-size: 1.2rem; opacity: 0.9; font-weight: 300; }
        .content { padding: 40px; }
        .section { margin-bottom: 50px; }
        .section-title { font-size: 1.8rem; color: #1e3c72; margin-bottom: 25px; font-weight: 600; border-left: 4px solid ${secondaryColor}; padding-left: 20px; }
        .performance-table { background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 20px 15px; text-align: left; font-weight: 600; font-size: 1rem; }
        td { padding: 20px 15px; border-bottom: 1px solid #f0f0f0; font-size: 1rem; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background-color: #f8f9ff; }
        .ctr-highlight { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 5px 12px; border-radius: 20px; font-weight: 600; display: inline-block; min-width: 60px; text-align: center; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 25px; }
        .metric-card { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; transform: translateY(0); transition: all 0.3s ease; }
        .metric-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4); }
        .metric-value { font-size: 2.2rem; font-weight: 700; margin-bottom: 10px; }
        .metric-label { font-size: 1rem; opacity: 0.9; }
        .timeline-container { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .timeline-header { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e8ecf4; padding-bottom: 15px; }
        .channel-label { font-weight: 600; color: #1e3c72; font-size: 1.1rem; align-self: end; }
        .month-labels { display: grid; grid-template-columns: repeat(${visibleMonthCount}, 1fr); gap: 5px; }
        .month { text-align: center; font-weight: 600; color: #1e3c72; background: #f8f9ff; padding: 8px; border-radius: 8px; font-size: 0.9rem; }
        .timeline-row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px; align-items: center; }
        .channel-name { font-weight: 600; color: #333; font-size: 1rem; }
        .timeline-months { display: grid; grid-template-columns: repeat(${visibleMonthCount}, 1fr); gap: 5px; }
        .month-status { text-align: center; padding: 12px 0; border-radius: 8px; font-weight: bold; font-size: 1.1rem; }
        .month-status.active { background: #28a745; color: white; }
        .month-status.inactive { background: #e9ecef; color: #6c757d; }
        .timeline-legend { display: flex; justify-content: center; gap: 30px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e8ecf4; }
        .legend-item { display: flex; align-items: center; gap: 8px; }
        .legend-indicator { width: 20px; height: 20px; border-radius: 4px; }
        .legend-indicator.active { background: #28a745; }
        .legend-indicator.inactive { background: #e9ecef; }
        @media (max-width: 1200px) {
            .timeline-header, .timeline-row { grid-template-columns: 120px 1fr; }
        }
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .content { padding: 20px; }
            .timeline-header, .timeline-row { grid-template-columns: 100px 1fr; gap: 5px; }
            .month, .month-status { font-size: 0.8rem; padding: 6px 2px; }
            .channel-label, .channel-name { font-size: 0.9rem; }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>${brandName}</h1>
            <div class="subtitle">Digital Performance Dashboard | ${reportingPeriod}</div>
        </div>

        <div class="content">
            <div class="section">
                <h2 class="section-title">Platform Performance</h2>
                <div class="performance-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Platform</th>
                                <th>Impressions</th>
                                <th>Reach</th>
                                <th>Clicks</th>
                                <th>CTR</th>
                            </tr>
                        </thead>
                        <tbody>${platformRows}</tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">Overall Results</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${formatValue(overallResults.totalImpressions, impUnit)}</div>
                        <div class="metric-label">Total Impressions</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${formatValue(overallResults.totalReach, reachUnit)}</div>
                        <div class="metric-label">Unique Users Reached</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${formatValue(overallResults.totalClicks, clicksUnit)}</div>
                        <div class="metric-label">Total Clicks</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${overallResults.weightedAvgCTR.toFixed(2)}%</div>
                        <div class="metric-label">Weighted Average CTR</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">Year to Go - Media Timeline</h2>
                <div class="timeline-container">
                    <div class="timeline-header">
                        <div class="channel-label">Channel</div>
                        <div class="month-labels">
                            ${visibleMonths.map(m => `<div class="month">${m.slice(0,3)}</div>`).join('')}
                        </div>
                    </div>
                    ${timelineRows}
                    <div class="timeline-legend">
                        <div class="legend-item">
                            <div class="legend-indicator active"></div>
                            <span>Active</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-indicator inactive"></div>
                            <span>Paused</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
};
