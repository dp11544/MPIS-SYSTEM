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

    // Helper component for Stat Cards
    const MetricCard = ({ title, value, unit, icon: Icon, color, loading }) => (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: `rgba(${color}, 0.1)`, padding: '15px', borderRadius: '50%', color: `rgb(${color})` }}>
                <Icon size={28} />
            </div>
            <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    {loading ? (
                        <div style={{ width: '60px', height: '2rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
                    ) : (
                        <>
                            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</h2>
                            <span style={{ color: `rgb(${color})`, fontWeight: 'bold', fontSize: '0.75rem' }}>{unit}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ animation: 'slideDown 0.4s easeOut', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Intelligence Analytics
                    </h1>
                    <p style={{ color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginTop: '5px', fontWeight: 'bold' }}>
                        <LineChart size={16} /> DATA SYNTHESIS & PATTERN RECOGNITION
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Refresh Button */}
                    <button 
                        onClick={fetchAnalytics}
                        disabled={isLoading}
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem'
                        }}
                    >
                        <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                    
                    {/* PDF Export Button */}
                    <button 
                        onClick={exportToPDF}
                        disabled={isExporting || isLoading}
                        style={{ 
                            background: 'linear-gradient(135deg, rgba(100,255,218,0.2) 0%, rgba(0,123,255,0.2) 100%)', 
                            border: '1px solid rgba(100,255,218,0.3)', 
                            padding: '8px 16px', 
                            borderRadius: '8px', 
                            cursor: isExporting ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--text-accent)',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Download size={14} style={{ animation: isExporting ? 'pulse 1s infinite' : 'none' }} />
                        {isExporting ? 'Exporting...' : 'Export PDF'}
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
            <div ref={reportRef}>
                {/* Top Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <MetricCard title="Active Surveillance Nodes" value={metrics.onlineNodes} unit={`/ ${metrics.totalNodes} CAMERAS`} icon={Activity} color="100,255,218" loading={isLoading} />
                    <MetricCard title="Average AI Confidence" value={metrics.aiConfidenceAvg.toFixed(1)} unit="%" icon={Target} color="0,123,255" loading={isLoading} />
                    <MetricCard title="Registered Persons" value={metrics.totalPersons} unit="CASES" icon={Users} color="168,85,247" loading={isLoading} />
                    <MetricCard title="Alerts Today" value={metrics.alertsToday} unit="MATCHES" icon={ShieldAlert} color="255,77,77" loading={isLoading} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flex: 1 }}>

                    {/* Left: Timeline Chart */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BarChart2 size={18} color="var(--text-accent)" /> Alert Activity Volume
                            </h3>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {getDisplayLabel()}
                            </span>
                        </div>

                        <div style={{ height: '280px', display: 'flex', alignItems: 'flex-end', gap: metrics.timeline.length > 15 ? '4px' : '12px', padding: '30px 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                            {/* Grid lines */}
                            <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                            <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

                            {(() => {
                                const maxVal = Math.max(...metrics.timeline.map(d => d.count), 1);
                                const chartHeight = 240; // Fixed pixel height for bars
                                return metrics.timeline.map((item, i) => {
                                    const barHeight = item.count > 0 ? Math.max((item.count / maxVal) * chartHeight, 8) : 4;
                                    return (
                                        <div key={i} style={{ 
                                            flex: 1, 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            justifyContent: 'flex-end',
                                            alignItems: 'center', 
                                            minWidth: metrics.timeline.length > 15 ? '20px' : '40px',
                                            height: '100%',
                                            position: 'relative'
                                        }}>
                                            {/* Count label above bar */}
                                            <span style={{ 
                                                position: 'absolute',
                                                bottom: `${barHeight + 8}px`,
                                                color: 'var(--text-primary)', 
                                                fontSize: metrics.timeline.length > 15 ? '0.65rem' : '0.85rem', 
                                                fontFamily: 'var(--font-mono)',
                                                fontWeight: 'bold'
                                            }}>{item.count}</span>
                                            {/* The actual bar */}
                                            <div style={{
                                                width: metrics.timeline.length > 15 ? '80%' : '70%',
                                                height: `${barHeight}px`,
                                                background: item.count > 0 
                                                    ? 'linear-gradient(0deg, rgba(0,123,255,0.4) 0%, rgba(100,255,218,1) 100%)' 
                                                    : 'rgba(100,255,218,0.2)',
                                                borderRadius: '4px 4px 0 0',
                                                transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: item.count > 0 ? '0 -4px 20px rgba(100,255,218,0.4)' : 'none'
                                            }} />
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div style={{ display: 'flex', gap: metrics.timeline.length > 15 ? '4px' : '12px', marginTop: '10px', overflow: 'hidden' }}>
                            {metrics.timeline.map((item, i) => (
                                <div key={i} style={{ 
                                    flex: 1, 
                                    textAlign: 'center', 
                                    color: 'var(--text-secondary)', 
                                    fontSize: metrics.timeline.length > 15 ? '0.6rem' : '0.7rem', 
                                    fontWeight: 'bold',
                                    minWidth: metrics.timeline.length > 15 ? '20px' : '40px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>{item.label}</div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Demographics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Gender Breakdown */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', flex: 1 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PieChart size={16} color="var(--brand-blue)" /> Gender Distribution
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: 'calc(100% - 40px)' }}>
                                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(var(--brand-blue) 0% ${metrics.demographics.male}%, var(--text-accent) ${metrics.demographics.male}% 100%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                                    <div style={{ width: '85px', height: '85px', background: 'var(--bg-secondary)', borderRadius: '50%' }}></div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>MALE</span>
                                            <span style={{ color: 'var(--brand-blue)', fontWeight: 'bold' }}>{metrics.demographics.male}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                            <div style={{ width: `${metrics.demographics.male}%`, height: '100%', background: 'var(--brand-blue)', borderRadius: '3px', transition: 'width 0.8s ease' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>FEMALE</span>
                                            <span style={{ color: 'var(--text-accent)', fontWeight: 'bold' }}>{metrics.demographics.female}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                            <div style={{ width: `${metrics.demographics.female}%`, height: '100%', background: 'var(--text-accent)', borderRadius: '3px', transition: 'width 0.8s ease' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Age Breakdown */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', flex: 1 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={16} color="var(--text-accent)" /> Age Demographics
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: 'calc(100% - 40px)', justifyContent: 'center' }}>
                                {Object.entries(metrics.demographics.ageGroup).map(([age, pct], idx) => (
                                    <div key={age}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold' }}>{age} YRS</span>
                                            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: `rgba(100,255,218,${1 - (idx * 0.2)})`, borderRadius: '3px', transition: 'width 0.8s ease' }}></div>
                                        </div>
                                    </div>
                                ))}
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
