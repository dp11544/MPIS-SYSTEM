import React, { useState, useEffect, useRef } from 'react';
import { LineChart, BarChart2, PieChart, Activity, Users, ShieldAlert, Target, RefreshCw, AlertTriangle, Download, Calendar, ChevronDown } from 'lucide-react';
import api from '../api/axios';

const Analytics = () => {
    const [metrics, setMetrics] = useState({
        totalNodes: 0,
        onlineNodes: 0,
        aiConfidenceAvg: 0,
        alertsToday: 0,
        totalPersons: 0,
        timeline: [],
        demographics: {
            male: 0,
            female: 0,
            ageGroup: { '0-18': 0, '19-35': 0, '36-50': 0, '50+': 0 }
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    
    // Date range state
    const [dateRange, setDateRange] = useState('7days');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    
    const reportRef = useRef(null);

    const dateRangeOptions = [
        { value: '7days', label: 'Last 7 Days' },
        { value: '30days', label: 'Last 30 Days' },
        { value: '90days', label: 'Last 3 Months' },
        { value: '365days', label: 'Last Year' },
        { value: 'custom', label: 'Custom Range' }
    ];

    const getDateRangeParams = () => {
        const today = new Date();
        let startDate, endDate;
        
        endDate = today.toISOString().split('T')[0];
        
        switch (dateRange) {
            case '7days':
                startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case '30days':
                startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case '90days':
                startDate = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case '365days':
                startDate = new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case 'custom':
                startDate = customStartDate;
                endDate = customEndDate || endDate;
                break;
            default:
                startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        
        return { startDate, endDate };
    };

    const fetchAnalytics = async () => {
        try {
            setError(null);
            const { startDate, endDate } = getDateRangeParams();
            
            if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
                return; // Don't fetch if custom range is incomplete
            }
            
            const response = await api.get('/analytics', {
                params: { startDate, endDate }
            });
            const data = response.data;
            
            // Calculate percentages for demographics
            const totalGender = (data.maleCount || 0) + (data.femaleCount || 0);
            const malePercent = totalGender > 0 ? Math.round((data.maleCount / totalGender) * 100) : 0;
            const femalePercent = totalGender > 0 ? Math.round((data.femaleCount / totalGender) * 100) : 0;
            
            // Calculate age percentages
            const ageGroups = data.ageGroups || {};
            const totalAge = Object.values(ageGroups).reduce((sum, val) => sum + val, 0);
            const agePercent = {};
            for (const [key, value] of Object.entries(ageGroups)) {
                agePercent[key] = totalAge > 0 ? Math.round((value / totalAge) * 100) : 0;
            }
            
            setMetrics({
                totalNodes: data.totalCameras || 0,
                onlineNodes: data.onlineCameras || 0,
                aiConfidenceAvg: data.avgConfidence || 0,
                alertsToday: data.alertsToday || 0,
                totalPersons: data.totalPersons || 0,
                timeline: data.alertTimeline || [],
                demographics: {
                    male: malePercent,
                    female: femalePercent,
                    ageGroup: agePercent
                }
            });
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError('Failed to load analytics data');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, [dateRange, customStartDate, customEndDate]);

    const handleDateRangeChange = (value) => {
        setDateRange(value);
        setShowDropdown(false);
        if (value === 'custom') {
            setShowCustomPicker(true);
            // Set default custom dates
            const today = new Date();
            setCustomEndDate(today.toISOString().split('T')[0]);
            setCustomStartDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        } else {
            setShowCustomPicker(false);
            setIsLoading(true);
        }
    };

    const getDisplayLabel = () => {
        if (dateRange === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end = new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${start} - ${end}`;
        }
        return dateRangeOptions.find(opt => opt.value === dateRange)?.label || 'Last 7 Days';
    };

    // PDF Export function
    const exportToPDF = async () => {
        setIsExporting(true);
        
        try {
            // Dynamically import libraries
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            
            const element = reportRef.current;
            if (!element) return;

            // Create canvas from the report
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0a0f1a',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Add title
            pdf.setFillColor(10, 15, 26);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            
            pdf.setTextColor(100, 255, 218);
            pdf.setFontSize(20);
            pdf.text('MPIS Intelligence Analytics Report', 14, 15);
            
            pdf.setTextColor(150, 150, 150);
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
            pdf.text(`Reporting Period: ${getDisplayLabel()}`, 14, 27);
            
            // Add the chart image
            const imgWidth = pdfWidth - 28;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const maxHeight = pdfHeight - 40;
            const finalHeight = Math.min(imgHeight, maxHeight);
            const finalWidth = (canvas.width * finalHeight) / canvas.height;
            
            pdf.addImage(imgData, 'PNG', 14, 35, finalWidth, finalHeight);
            
            // Add summary statistics at bottom
            const summaryY = pdfHeight - 15;
            pdf.setTextColor(200, 200, 200);
            pdf.setFontSize(8);
            pdf.text(`Active Cameras: ${metrics.onlineNodes}/${metrics.totalNodes} | AI Confidence: ${metrics.aiConfidenceAvg.toFixed(1)}% | Registered Persons: ${metrics.totalPersons} | Alerts Today: ${metrics.alertsToday}`, 14, summaryY);
            
            pdf.save(`MPIS_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
            setError('Failed to export PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Tactical Metric Card Component
    const MetricCard = ({ title, value, unit, icon: Icon, color, loading }) => (
        <div style={{ 
            background: '#0a0f18', 
            border: '1px solid #1e293b', 
            borderTop: `3px solid rgb(${color})`,
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            position: 'relative'
        }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderBottom: '1px solid #1e293b', borderLeft: '1px solid #1e293b' }}></div>
            <div style={{ color: `rgb(${color})` }}>
                <Icon size={24} />
            </div>
            <div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '4px' }}>
                    {loading ? (
                        <div style={{ width: '60px', height: '1.5rem', background: '#1e293b', borderRadius: '2px', animation: 'pulse 1.5s infinite' }}></div>
                    ) : (
                        <>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#f8fafc', fontFamily: 'monospace' }}>{value}</h2>
                            <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.7rem' }}>{unit}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ animation: 'none', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #1e293b', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        OFFICE OF INTELLIGENCE & ANALYSIS
                    </h1>
                    <p style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <LineChart size={14} /> NATIONAL CASE METRICS LOG
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Refresh Button */}
                    <button 
                        onClick={fetchAnalytics}
                        disabled={isLoading}
                        style={{ 
                            background: '#0f172a', 
                            border: '1px solid #334155', 
                            padding: '6px 12px', 
                            borderRadius: '2px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}
                    >
                        <RefreshCw size={12} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
                        SYNC DEPT DATA
                    </button>
                    
                    {/* PDF Export Button */}
                    <button 
                        onClick={exportToPDF}
                        disabled={isExporting || isLoading}
                        style={{ 
                            background: '#1d4ed8', 
                            border: '1px solid #2563eb', 
                            padding: '6px 16px', 
                            borderRadius: '2px', 
                            cursor: isExporting ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <Download size={14} style={{ animation: isExporting ? 'pulse 1s infinite' : 'none' }} />
                        {isExporting ? 'GENERATING...' : 'EXPORT OFFICIAL DOC'}
                    </button>

                    {/* Date Range Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '8px 16px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                fontSize: '0.85rem', 
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                minWidth: '180px',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={14} />
                                <span>{getDisplayLabel()}</span>
                            </span>
                            <ChevronDown size={14} style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                        </button>
                        
                        {showDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                zIndex: 1000,
                                minWidth: '200px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                            }}>
                                {dateRangeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleDateRangeChange(option.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            background: dateRange === option.value ? 'rgba(100,255,218,0.1)' : 'transparent',
                                            border: 'none',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            color: dateRange === option.value ? 'var(--text-accent)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '0.85rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.target.style.background = dateRange === option.value ? 'rgba(100,255,218,0.1)' : 'transparent'}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker && (
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(100,255,218,0.2)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>CUSTOM RANGE:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>FROM</label>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            max={customEndDate || new Date().toISOString().split('T')[0]}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>TO</label>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            min={customStartDate}
                            max={new Date().toISOString().split('T')[0]}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => { setIsLoading(true); fetchAnalytics(); }}
                        style={{
                            background: 'linear-gradient(135deg, var(--text-accent) 0%, var(--brand-blue) 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 20px',
                            color: 'var(--bg-primary)',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        Apply
                    </button>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div style={{ 
                    background: 'rgba(255,77,77,0.1)', 
                    border: '1px solid rgba(255,77,77,0.3)', 
                    padding: '12px 20px', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: 'var(--status-alert)', fontSize: '0.85rem' }}>
                        <AlertTriangle size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        {error}
                    </span>
                    <button onClick={fetchAnalytics} style={{ background: 'transparent', border: '1px solid var(--status-alert)', color: 'var(--status-alert)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                        Retry
                    </button>
                </div>
            )}

            {/* Report Content - for PDF export */}
            <div ref={reportRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 0' }}>
                {/* Top Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <MetricCard title="ACTIVE DEPLOYED NODES" value={metrics.onlineNodes} unit={`/ ${metrics.totalNodes} CAMS`} icon={Activity} color="59,130,246" loading={isLoading} />
                    <MetricCard title="AI CONFIDENCE INDEX" value={metrics.aiConfidenceAvg.toFixed(1)} unit="%" icon={Target} color="14,165,233" loading={isLoading} />
                    <MetricCard title="OPEN CASE FILES" value={metrics.totalPersons} unit="INDIVIDUALS" icon={Users} color="168,85,247" loading={isLoading} />
                    <MetricCard title="VERIFIED INCIDENTS TODAY" value={metrics.alertsToday} unit="REPORTS" icon={ShieldAlert} color="239,68,68" loading={isLoading} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '1rem', flex: 1, minHeight: '400px' }}>
                    
                    {/* Left: Timeline Chart (Tactical Implementation) */}
                    <div style={{ padding: '1.25rem', background: '#0a0f18', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart2 size={16} color="#3b82f6" /> INCIDENT FREQUENCY TIMELINE
                            </h3>
                            <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 8px', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold' }}>
                                {getDisplayLabel().toUpperCase()}
                            </div>
                        </div>

                        <div style={{ flex: 1, position: 'relative', minHeight: '250px', marginTop: '10px' }}>
                            {isLoading ? (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '30px', height: '30px', border: '2px solid transparent', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                </div>
                            ) : metrics.timeline.length === 0 ? (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <LineChart size={32} color="#475569" style={{ marginBottom: '10px' }} />
                                    <p style={{ color: '#475569', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.75rem', margin: 0 }}>NO RECORDS FOUND</p>
                                </div>
                            ) : (
                                <svg width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                    
                                    {/* Horizontal Grid lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                                        <g key={`grid-${i}`}>
                                            <line x1="0" y1={`${ratio * 90}%`} x2="100%" y2={`${ratio * 90}%`} stroke="#1e293b" strokeWidth="1" strokeDasharray={ratio === 1 ? "0" : "2,2"} />
                                            {ratio !== 1 && (
                                                <text x="0" y={`${ratio * 90}%`} dy="-4" fill="#64748b" fontSize="9" fontFamily="monospace">
                                                    {Math.round(Math.max(...metrics.timeline.map(d => d.count)) * (1 - ratio))}
                                                </text>
                                            )}
                                        </g>
                                    ))}

                                    {/* Bars */}
                                    {metrics.timeline.map((item, i) => {
                                        const maxVal = Math.max(...metrics.timeline.map(d => d.count), 1);
                                        const count = item.count;
                                        const heightPercent = count === 0 ? 0 : (count / maxVal) * 90;
                                        const gap = metrics.timeline.length > 30 ? 1 : (metrics.timeline.length > 15 ? 2 : 10);
                                        const barWidth = `calc((100% - ${(metrics.timeline.length - 1) * gap}px) / ${metrics.timeline.length})`;
                                        
                                        return (
                                            <g key={`bar-${i}`} transform={`translate(0, 0)`}>
                                                {count > 0 && (
                                                    <rect 
                                                        x={`calc(${i} * (${barWidth} + ${gap}px) + 2px)`} 
                                                        y={`${90 - heightPercent}%`} 
                                                        width={`calc(${barWidth} - 4px)`} 
                                                        height={`${heightPercent}%`} 
                                                        fill="#3b82f6" 
                                                    />
                                                )}
                                                {count > 0 && (
                                                    <text 
                                                        x={`calc(${i} * (${barWidth} + ${gap}px) + (${barWidth} / 2))`} 
                                                        y={`${90 - heightPercent}%`} 
                                                        dy="-5" 
                                                        textAnchor="middle" 
                                                        fill="#cbd5e1" 
                                                        fontSize="9" 
                                                        fontFamily="monospace" 
                                                    >
                                                        {count}
                                                    </text>
                                                )}
                                                <text 
                                                    x={`calc(${i} * (${barWidth} + ${gap}px) + (${barWidth} / 2))`} 
                                                    y="96%" 
                                                    textAnchor="middle" 
                                                    fill="#64748b" 
                                                    fontSize="8" 
                                                    fontFamily="monospace"
                                                    transform={metrics.timeline.length > 15 ? `rotate(-45, calc(${i} * (${barWidth} + ${gap}px) + (${barWidth} / 2)), 96%)` : ""}
                                                >
                                                    {metrics.timeline.length > 30 && i % 2 !== 0 ? '' : item.label.toUpperCase()}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Right: Demographics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

                        {/* Gender Breakdown Container */}
                        <div style={{ padding: '1.25rem', background: '#0a0f18', border: '1px solid #1e293b', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 15px 0', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                                TARGET DEMOGRAPHICS (GENDER)
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, marginTop: '10px' }}>
                                <div style={{ 
                                    width: '100px', height: '100px', borderRadius: '50%', 
                                    background: (metrics.demographics.male === 0 && metrics.demographics.female === 0) 
                                        ? '#1e293b' 
                                        : `conic-gradient(#3b82f6 0% ${metrics.demographics.male}%, #8b5cf6 ${metrics.demographics.male}% 100%)`, 
                                    border: '2px solid #0f172a',
                                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <div style={{ width: '60px', height: '60px', background: '#0a0f18', borderRadius: '50%', border: '1px solid #1e293b' }}></div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>MALE IDENTIFIED</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 'bold', fontFamily: 'monospace' }}>{metrics.demographics.male}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: '#1e293b' }}>
                                            <div style={{ width: `${metrics.demographics.male}%`, height: '100%', background: '#3b82f6' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>FEMALE IDENTIFIED</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 'bold', fontFamily: 'monospace' }}>{metrics.demographics.female}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: '#1e293b' }}>
                                            <div style={{ width: `${metrics.demographics.female}%`, height: '100%', background: '#8b5cf6' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Age Breakdown Container */}
                        <div style={{ padding: '1.25rem', background: '#0a0f18', border: '1px solid #1e293b', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 15px 0', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                                AGE SUB-GROUPS
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center', marginTop: '10px' }}>
                                {Object.entries(metrics.demographics.ageGroup).map(([age, pct], idx) => {
                                    const colors = ['#0284c7', '#3b82f6', '#6366f1', '#8b5cf6'];
                                    const color = colors[idx % colors.length];
                                    
                                    return (
                                        <div key={age}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>{age} YEARS OLD</span>
                                                <span style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.75rem' }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: '4px', background: '#1e293b' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 1s' }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes growUp { from { height: 0; opacity: 0; } to { opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
            `}} />
        </div>
    );
};

export default Analytics;
