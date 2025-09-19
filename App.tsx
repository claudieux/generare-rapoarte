
import React, { useState, useCallback } from 'react';
import type { Platform, Channel, OverallResults, ToastMessage, ToastType } from './types';
import { generateDashboardHTML } from './utils/dashboardGenerator';
import { MONTHS, YEARS } from './constants';
import Card from './components/Card';
import Toast from './components/Toast';
import { db, isFirebaseConfigured } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';


interface SavedReport {
    id: string;
    name: string;
}

const App: React.FC = () => {
    const [brandName, setBrandName] = useState<string>('');
    const [primaryColor, setPrimaryColor] = useState<string>('#667eea');
    const [secondaryColor, setSecondaryColor] = useState<string>('#764ba2');
    const [startMonth, setStartMonth] = useState<string>('');
    const [endMonth, setEndMonth] = useState<string>('');
    const [year, setYear] = useState<number>(new Date().getFullYear());

    const [platforms, setPlatforms] = useState<Platform[]>([
        { id: Date.now(), name: '', impressions: null, reach: null, clicks: null, ctr: null },
    ]);

    const [channels, setChannels] = useState<Channel[]>([
        { id: Date.now(), name: '', activeMonths: Array(12).fill(false) },
    ]);

    const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string>('');
    const [toast, setToast] = useState<ToastMessage | null>(null);
    
    const inputClasses = "w-full p-4 border-0 bg-white/70 backdrop-blur-sm text-slate-900 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-400/50 focus:bg-white/90 transition-all duration-300 placeholder-slate-500 hover:shadow-xl";
    const selectClasses = "w-full p-4 border-0 bg-white/70 backdrop-blur-sm text-slate-900 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-400/50 focus:bg-white/90 transition-all duration-300 hover:shadow-xl";
    
    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    const handleAddPlatform = () => {
        setPlatforms([...platforms, { id: Date.now(), name: '', impressions: null, reach: null, clicks: null, ctr: null }]);
    };

    const handleRemovePlatform = (id: number) => {
        setPlatforms(platforms.filter(p => p.id !== id));
    };

    const handlePlatformChange = <K extends keyof Platform>(id: number, field: K, value: Platform[K]) => {
        setPlatforms(platforms.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleAddChannel = () => {
        setChannels([...channels, { id: Date.now(), name: '', activeMonths: Array(12).fill(false) }]);
    };

    const handleRemoveChannel = (id: number) => {
        setChannels(channels.filter(c => c.id !== id));
    };

    const handleChannelChange = (id: number, value: string) => {
        setChannels(channels.map(c => c.id === id ? { ...c, name: value } : c));
    };

    const handleMonthToggle = (id: number, monthIndex: number) => {
        setChannels(channels.map(c => {
            if (c.id === id) {
                const newActiveMonths = [...c.activeMonths];
                newActiveMonths[monthIndex] = !newActiveMonths[monthIndex];
                return { ...c, activeMonths: newActiveMonths };
            }
            return c;
        }));
    };
    
    const formatDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = MONTHS[date.getMonth()].slice(0, 3).toUpperCase();
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const getReportDataPayload = () => {
         const reportingPeriod = !endMonth || startMonth === endMonth
            ? `${startMonth} ${year}`
            : `${startMonth}-${endMonth.slice(0,3)} ${year}`;
        
        const formattedDate = formatDate(new Date());
        const reportName = `[${brandName}] - [${reportingPeriod}] - [${formattedDate}]`;

        return {
            reportName,
            brandName,
            primaryColor,
            secondaryColor,
            startMonth,
            endMonth,
            year,
            platforms: platforms.map(({ id, ...rest }) => rest), 
            channels: channels.map(({ id, ...rest }) => rest), 
        };
    }

    const fetchReports = useCallback(async () => {
        if (!isFirebaseConfigured) return;
        try {
            const reportsCollection = collection(db, 'reports');
            const reportSnapshot = await getDocs(reportsCollection);
            const reportList = reportSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().reportName || 'Untitled Report'
            }));
            setSavedReports(reportList);
            if (reportList.length > 0) {
                 showToast(`Successfully fetched ${reportList.length} report(s).`, 'success');
            } else {
                 showToast("Connected to Firestore, but no saved reports were found.", 'info');
            }
        } catch (error: any) {
            console.error("Error fetching reports: ", error);
            let message = "Could not fetch reports. Check Firestore rules.";
            if (error.code === 'unavailable') {
                message = "Connection Error: Check internet and Firebase setup.";
            }
            showToast(message, 'error');
        }
    }, []);

    const handleSaveAsNewReport = async () => {
        if (!isFirebaseConfigured) {
            showToast("Firebase is not configured. Cannot save.", 'error');
            return;
        }
        
        if (!brandName.trim() || !startMonth) {
            showToast("Brand Name and Start Month are required.", 'error');
            return;
        }

        const reportData = getReportDataPayload();

        try {
            const docRef = await addDoc(collection(db, 'reports'), reportData);
            showToast(`Report "${reportData.reportName}" saved successfully!`, 'success');
            await fetchReports();
            setSelectedReportId(docRef.id); // Select the newly created report
        } catch (error: any) {
            console.error("Error saving new report: ", error);
            let message = "Failed to save report. Check Firestore rules.";
             if (error.code === 'unavailable') {
                message = "Connection Error: Check internet and Firebase setup.";
            }
            showToast(message, 'error');
        }
    };
    
    const handleUpdateReport = async () => {
        if (!selectedReportId) {
            showToast("No report is loaded. Cannot update.", 'info');
            return;
        }
        
        const reportData = getReportDataPayload();
        
        try {
            const reportDocRef = doc(db, 'reports', selectedReportId);
            await updateDoc(reportDocRef, reportData);
            showToast(`Report "${reportData.reportName}" updated successfully!`, 'success');
            await fetchReports(); // Refresh list to show potential name change
        } catch (error: any) {
            console.error("Error updating report: ", error);
            let message = "Failed to update report. Check Firestore rules.";
             if (error.code === 'unavailable') {
                message = "Connection Error: Check internet and Firebase setup.";
            }
            showToast(message, 'error');
        }
    }

    const handleLoadReport = async () => {
        if (!isFirebaseConfigured || !selectedReportId) {
            showToast("Please select a report to load.", 'info');
            return;
        };
        try {
            const reportDocRef = doc(db, 'reports', selectedReportId);
            const reportDoc = await getDoc(reportDocRef);
    
            if (reportDoc.exists()) {
                const data = reportDoc.data();
                setBrandName(data.brandName || '');
                setPrimaryColor(data.primaryColor || '#667eea');
                setSecondaryColor(data.secondaryColor || '#764ba2');
                setStartMonth(data.startMonth || '');
                setEndMonth(data.endMonth || '');
                setYear(data.year || new Date().getFullYear());
                setPlatforms((data.platforms || []).map((p: Omit<Platform, 'id'>) => ({ ...p, id: Date.now() + Math.random() })));
                setChannels((data.channels || []).map((c: Omit<Channel, 'id'>) => ({ ...c, id: Date.now() + Math.random() })));
                showToast(`Report "${data.reportName || 'Untitled'}" loaded successfully!`, 'success');
            } else {
                showToast('Report not found.', 'error');
            }
        } catch(error: any) {
             console.error("Error loading report: ", error);
            let message = "Failed to load report. Check Firestore rules.";
            if (error.code === 'unavailable') {
                message = "Connection Error: Check internet and Firebase setup.";
            }
            showToast(message, 'error');
        }
    };

    const handleGenerateDashboard = useCallback(() => {
        const totalImpressions = platforms.reduce((sum, p) => sum + Number(p.impressions), 0);
        const totalReach = platforms.reduce((sum, p) => sum + Number(p.reach), 0);
        const totalClicks = platforms.reduce((sum, p) => sum + Number(p.clicks), 0);
        const weightedAvgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        const overallResults: OverallResults = {
            totalImpressions,
            totalReach,
            totalClicks,
            weightedAvgCTR,
        };
        
        const reportingPeriod = !endMonth || startMonth === endMonth 
            ? `${startMonth} ${year}` 
            : `${startMonth} - ${endMonth} ${year}`;

        let firstActiveMonthIndex = 0;
        const hasAnyActivity = channels.some(c => c.activeMonths.some(isActive => isActive));
        if (hasAnyActivity) {
            for (let i = 0; i < 12; i++) {
                if (channels.some(channel => channel.activeMonths[i])) {
                    firstActiveMonthIndex = i;
                    break;
                }
            }
        }

        const htmlContent = generateDashboardHTML({
            brandName,
            primaryColor,
            secondaryColor,
            reportingPeriod,
            platforms,
            overallResults,
            channels,
            firstActiveMonthIndex,
        });

        const newTab = window.open();
        if (newTab) {
            newTab.document.write(htmlContent);
            newTab.document.close();
        }

    }, [brandName, primaryColor, secondaryColor, startMonth, endMonth, year, platforms, channels]);


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-slate-900 p-4 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20"></div>
                <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
            </div>
            <div className="max-w-5xl mx-auto relative z-10">
                <header className="text-center mb-12">
                    <div className="inline-block p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">Marketing Dashboard Generator</h1>
                    <p className="text-slate-600 text-lg font-medium max-w-2xl mx-auto leading-relaxed">Create stunning, professional marketing dashboards with advanced analytics and beautiful visualizations.</p>
                </header>

                <div className="space-y-8">
                    {isFirebaseConfigured ? (
                        <Card title="Load Reports">
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedReportId}
                                    onChange={e => setSelectedReportId(e.target.value)}
                                    className={`${selectClasses} flex-grow`}
                                    aria-label="Load a saved report"
                                >
                                    <option value="" disabled>Select a report to load...</option>
                                    {savedReports.map(report => (
                                        <option key={report.id} value={report.id}>{report.name}</option>
                                    ))}
                                </select>
                                <button onClick={fetchReports} className="px-6 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" title="Refresh report list">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button onClick={handleLoadReport} className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none font-semibold" disabled={!selectedReportId}>Load Report</button>
                            </div>
                        </Card>
                    ) : (
                        <Card title="Save & Load Reports (Disabled)">
                            <div className="text-center p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl backdrop-blur-sm">
                                <div className="inline-block p-2 bg-amber-500/10 rounded-xl mb-3">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <p className="text-amber-800 font-medium">
                                    To enable saving and loading, update <code className="bg-amber-200/50 px-2 py-1 rounded font-mono text-sm">firebase.ts</code> with your Firebase project configuration.
                                </p>
                            </div>
                        </Card>
                    )}

                    <Card title="1. General Information">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label htmlFor="brandName" className="block text-sm font-semibold text-slate-700 mb-2">Brand Name</label>
                                <input type="text" id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inputClasses} placeholder="Enter your brand name" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Reporting Period</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <select value={startMonth} onChange={e => setStartMonth(e.target.value)} className={selectClasses}>
                                            <option value="" disabled>Start Month</option>
                                            {MONTHS.map(m => <option key={`start-${m}`} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select value={endMonth} onChange={e => setEndMonth(e.target.value)} className={selectClasses}>
                                            <option value="">End Month (Optional)</option>
                                            {MONTHS.map(m => <option key={`end-${m}`} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select value={year} onChange={e => setYear(Number(e.target.value))} className={selectClasses}>
                                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="2. Design Customization">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label htmlFor="primaryColor" className="block text-sm font-semibold text-slate-700">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <input type="color" id="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-14 h-14 rounded-2xl border-0 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-110" />
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                                    </div>
                                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={`${inputClasses} flex-1`} placeholder="#667eea" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label htmlFor="secondaryColor" className="block text-sm font-semibold text-slate-700">Secondary Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <input type="color" id="secondaryColor" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-14 h-14 rounded-2xl border-0 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-110" />
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                                    </div>
                                    <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className={`${inputClasses} flex-1`} placeholder="#764ba2" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="3. Platform Performance">
                        <div className="hidden md:grid md:grid-cols-6 gap-4 items-center px-6 py-3 mb-4 bg-gradient-to-r from-slate-100/60 to-slate-50/60 backdrop-blur-sm rounded-2xl border border-white/50">
                            <div className="md:col-span-2 text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Platform Name
                            </div>
                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Impressions
                            </div>
                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                Reach
                            </div>
                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                Clicks
                            </div>
                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                                CTR %
                            </div>
                        </div>
                        <div className="space-y-6">
                            {platforms.map((p) => (
                                <div key={p.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 hover:bg-white/60 hover:border-white/50 transition-all duration-300 shadow-lg hover:shadow-xl group">
                                    <input type="text" placeholder="e.g. Facebook, Instagram" value={p.name} onChange={e => handlePlatformChange(p.id, 'name', e.target.value)} className={`${inputClasses} md:col-span-2`} />
                                    <input type="number" placeholder="0" value={p.impressions ?? ''} onChange={e => handlePlatformChange(p.id, 'impressions', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                    <input type="number" placeholder="0" value={p.reach ?? ''} onChange={e => handlePlatformChange(p.id, 'reach', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                    <input type="number" placeholder="0" value={p.clicks ?? ''} onChange={e => handlePlatformChange(p.id, 'clicks', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                    <div className="flex items-center gap-3">
                                        <input type="number" step="0.01" placeholder="0.00" value={p.ctr ?? ''} onChange={e => handlePlatformChange(p.id, 'ctr', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                        <button onClick={() => handleRemovePlatform(p.id)} className="text-red-500 hover:text-red-700 p-3 rounded-xl hover:bg-red-50 transition-all duration-200 group">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddPlatform} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold flex items-center gap-2 group">
                            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Platform
                        </button>
                    </Card>

                    <Card title="4. Media Timeline">
                       <div className="space-y-6">
                            {channels.map(channel => (
                                <div key={channel.id} className="p-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 hover:bg-white/60 hover:border-white/50 transition-all duration-300 shadow-lg hover:shadow-xl group">
                                    <div className="flex items-center gap-4 mb-6">
                                        <input type="text" placeholder="e.g. TV, Radio, Online" value={channel.name} onChange={e => handleChannelChange(channel.id, e.target.value)} className={`${inputClasses} flex-grow`} />
                                        <button onClick={() => handleRemoveChannel(channel.id)} className="text-red-500 hover:text-red-700 p-3 rounded-xl hover:bg-red-50 transition-all duration-200 group">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-6 md:grid-cols-12 gap-3">
                                        {MONTHS.map((month, index) => (
                                            <label key={month} className="flex flex-col items-center space-y-2 text-sm cursor-pointer group/month hover:bg-blue-50 p-2 rounded-xl transition-all duration-200">
                                                <input type="checkbox" checked={channel.activeMonths[index]} onChange={() => handleMonthToggle(channel.id, index)} className="w-4 h-4 text-blue-600 bg-white/70 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200"/>
                                                <span className="text-xs font-medium text-slate-600 group-hover/month:text-blue-600 transition-colors duration-200">{month.slice(0, 3)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddChannel} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold flex items-center gap-2 group">
                            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Channel
                        </button>
                    </Card>

                    <div className="text-center pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                        {selectedReportId ? (
                            <>
                                <button
                                    onClick={handleUpdateReport}
                                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none flex items-center justify-center gap-2 group"
                                    disabled={!isFirebaseConfigured}
                                >
                                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Update Report
                                </button>
                                <button
                                    onClick={handleSaveAsNewReport}
                                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold rounded-2xl shadow-xl hover:from-slate-700 hover:to-slate-800 transform hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none flex items-center justify-center gap-2 group"
                                    disabled={!isFirebaseConfigured}
                                >
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Save as New
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleSaveAsNewReport}
                                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold rounded-2xl shadow-xl hover:from-slate-700 hover:to-slate-800 transform hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none flex items-center justify-center gap-2 group"
                                disabled={!isFirebaseConfigured}
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Save Report
                            </button>
                        )}
                        <button onClick={handleGenerateDashboard} className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-2xl hover:shadow-purple-500/25 transform hover:-translate-y-2 hover:scale-105 transition-all duration-500 flex items-center justify-center gap-3 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="relative z-10 text-lg">Generate Dashboard</span>
                        </button>
                    </div>
                </div>

                <footer className="text-center mt-16 py-8">
                    <div className="max-w-md mx-auto p-6 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/20">
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">Property of <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">MagnaPharm Marketing & Sales Romania</span> - All rights reserved</p>
                    </div>
                </footer>

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default App;