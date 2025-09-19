
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
    
    const inputClasses = "w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400";
    const selectClasses = "w-full p-2 border border-gray-300 bg-white text-slate-900 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
    
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
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900">Marketing Dashboard Generator</h1>
                    <p className="text-slate-600 mt-2">Fill in the details below and click generate to create your custom dashboard.</p>
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
                                <button onClick={fetchReports} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors whitespace-nowrap" title="Refresh report list">
                                    Refresh
                                </button>
                                <button onClick={handleLoadReport} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400 whitespace-nowrap" disabled={!selectedReportId}>Load Report</button>
                            </div>
                        </Card>
                    ) : (
                        <Card title="Save & Load Reports (Disabled)">
                            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm text-yellow-800">
                                    To enable saving and loading, update <code>firebase.ts</code> with your Firebase project configuration.
                                </p>
                            </div>
                        </Card>
                    )}

                    <Card title="1. General Information">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="brandName" className="block text-sm font-medium text-slate-700 mb-1">Brand Name</label>
                                <input type="text" id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Period</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <select value={startMonth} onChange={e => setStartMonth(e.target.value)} className={selectClasses}>
                                        <option value="" disabled>Month</option>
                                        {MONTHS.map(m => <option key={`start-${m}`} value={m}>{m}</option>)}
                                    </select>
                                    <select value={endMonth} onChange={e => setEndMonth(e.target.value)} className={selectClasses}>
                                        <option value="">None</option>
                                        {MONTHS.map(m => <option key={`end-${m}`} value={m}>{m}</option>)}
                                    </select>
                                    <select value={year} onChange={e => setYear(Number(e.target.value))} className={selectClasses}>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="2. Design Customization">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div>
                                <label htmlFor="primaryColor" className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
                                <div className="flex items-center gap-2">
                                     <input type="color" id="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="p-1 h-10 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer" />
                                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputClasses}/>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="secondaryColor" className="block text-sm font-medium text-slate-700 mb-1">Secondary Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" id="secondaryColor" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="p-1 h-10 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer" />
                                    <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className={inputClasses}/>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="3. Platform Performance">
                        <div className="hidden md:grid md:grid-cols-6 gap-2 items-center px-3 mb-2">
                            <div className="md:col-span-2 text-sm font-medium text-slate-600">Platform Name</div>
                            <div className="text-sm font-medium text-slate-600">Impressions</div>
                            <div className="text-sm font-medium text-slate-600">Reach</div>
                            <div className="text-sm font-medium text-slate-600">Clicks</div>
                            <div className="text-sm font-medium text-slate-600">CTR</div>
                        </div>
                        <div className="space-y-4">
                            {platforms.map((p) => (
                                <div key={p.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center p-3 bg-slate-50 rounded-md border">
                                    <input type="text" placeholder="Platform Name" value={p.name} onChange={e => handlePlatformChange(p.id, 'name', e.target.value)} className={`${inputClasses} md:col-span-2`} />
                                    <input type="number" placeholder="Impressions" value={p.impressions ?? ''} onChange={e => handlePlatformChange(p.id, 'impressions', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                    <input type="number" placeholder="Reach" value={p.reach ?? ''} onChange={e => handlePlatformChange(p.id, 'reach', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                    <input type="number" placeholder="Clicks" value={p.clicks ?? ''} onChange={e => handlePlatformChange(p.id, 'clicks', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                    <div className="flex items-center gap-2">
                                        <input type="number" step="0.01" placeholder="CTR" value={p.ctr ?? ''} onChange={e => handlePlatformChange(p.id, 'ctr', e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
                                        <button onClick={() => handleRemovePlatform(p.id)} className="text-red-500 hover:text-red-700 p-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddPlatform} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">+ Add Platform</button>
                    </Card>

                    <Card title="4. Media Timeline">
                       <div className="space-y-4">
                            {channels.map(channel => (
                                <div key={channel.id} className="p-3 bg-slate-50 rounded-md border">
                                    <div className="flex items-center gap-4 mb-2">
                                        <input type="text" placeholder="Channel Name" value={channel.name} onChange={e => handleChannelChange(channel.id, e.target.value)} className={`${inputClasses} flex-grow`} />
                                        <button onClick={() => handleRemoveChannel(channel.id)} className="text-red-500 hover:text-red-700 p-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                                        {MONTHS.map((month, index) => (
                                            <label key={month} className="flex items-center space-x-2 text-sm cursor-pointer">
                                                <input type="checkbox" checked={channel.activeMonths[index]} onChange={() => handleMonthToggle(channel.id, index)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                                <span>{month.slice(0, 3)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddChannel} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">+ Add Channel</button>
                    </Card>

                    <div className="text-center pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                        {selectedReportId ? (
                            <>
                                <button 
                                    onClick={handleUpdateReport} 
                                    className="w-full md:w-auto px-12 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-400"
                                    disabled={!isFirebaseConfigured}
                                >
                                   Update Report
                                </button>
                                <button 
                                    onClick={handleSaveAsNewReport} 
                                    className="w-full md:w-auto px-12 py-3 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-400"
                                    disabled={!isFirebaseConfigured}
                                >
                                   Save as New
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={handleSaveAsNewReport} 
                                className="w-full md:w-auto px-12 py-3 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-400"
                                disabled={!isFirebaseConfigured}
                            >
                               Save Report
                            </button>
                        )}
                        <button onClick={handleGenerateDashboard} className="w-full md:w-auto px-12 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                            Generate Dashboard
                        </button>
                    </div>
                </div>

                <footer className="text-center mt-8 py-4">
                    <p className="text-xs text-slate-500">Property of MagnaPharm Marketing & Sales Romania - All rights reserved</p>
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