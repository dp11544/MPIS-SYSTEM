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
            <div ref={reportRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 0' }}>
                {/* Top Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <MetricCard title="Active Surveillance Nodes" value={metrics.onlineNodes} unit={`/ ${metrics.totalNodes} CAMERAS`} icon={Activity} color="100,255,218" loading={isLoading} />
                    <MetricCard title="Average AI Confidence" value={metrics.aiConfidenceAvg.toFixed(1)} unit="%" icon={Target} color="0,123,255" loading={isLoading} />
                    <MetricCard title="Registered Persons" value={metrics.totalPersons} unit="CASES" icon={Users} color="168,85,247" loading={isLoading} />
                    <MetricCard title="Alerts Today" value={metrics.alertsToday} unit="MATCHES" icon={ShieldAlert} color="255,77,77" loading={isLoading} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '1.5rem', flex: 1, minHeight: '400px' }}>
                    
                    {/* Left: Timeline Chart (Premium SVG Implementation) */}
                    <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        {/* Background subtle grid */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', zIndex: 1 }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart2 size={18} color="#64ffda" /> Active Incident Frequency
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64ffda', boxShadow: '0 0 10px #64ffda' }}></span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {getDisplayLabel()}
                                </span>
                            </div>
                        </div>

                        <div style={{ flex: 1, position: 'relative', minHeight: '250px', zIndex: 1, marginTop: '10px' }}>
                            {isLoading ? (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(100,255,218,0.2)', borderTopColor: '#64ffda', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                </div>
                            ) : metrics.timeline.length === 0 ? (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <LineChart size={48} color="var(--text-secondary)" style={{ marginBottom: '15px' }} />
                                    <p style={{ color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '2px', margin: 0 }}>NO ANALYTICS DATA</p>
                                </div>
                            ) : (
                                <svg width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%" stopColor="rgba(0,123,255,0.1)" />
                                            <stop offset="100%" stopColor="rgba(100,255,218,0.9)" />
                                        </linearGradient>
                                        <filter id="barGlow">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    
                                    {/* Horizontal Grid lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                                        <g key={`grid-${i}`}>
                                            <line x1="0" y1={`${ratio * 90}%`} x2="100%" y2={`${ratio * 90}%`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={ratio === 1 ? "0" : "4,4"} />
                                            {ratio !== 1 && (
                                                <text x="0" y={`${ratio * 90}%`} dy="-4" fill="rgba(255,255,255,0.2)" fontSize="10" fontFamily="monospace">
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
                                        const gap = metrics.timeline.length > 30 ? 2 : (metrics.timeline.length > 15 ? 5 : 15);
                                        const barWidth = `calc((100% - ${(metrics.timeline.length - 1) * gap}px) / ${metrics.timeline.length})`;
                                        
                                        return (
                                            <g key={`bar-${i}`} transform={`translate(0, 0)`}>
                                                {/* Bar container (for hovering/interaction) */}
                                                <rect 
                                                    x={`calc(${i} * (${barWidth} + ${gap}px))`} 
                                                    y="0" 
                                                    width={barWidth} 
                                                    height="90%" 
                                                    fill="transparent" 
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                {/* Actual colored bar */}
                                                {count > 0 && (
                                                    <rect 
                                                        x={`calc(${i} * (${barWidth} + ${gap}px) + 2px)`} 
                                                        y={`${90 - heightPercent}%`} 
                                                        width={`calc(${barWidth} - 4px)`} 
                                                        height={`${heightPercent}%`} 
                                                        fill="url(#barGradient)" 
                                                        rx="3" 
                                                        ry="3"
                                                        filter="url(#barGlow)"
                                                    />
                                                )}
                                                {/* Top Label (only show for count > 0) */}
                                                {count > 0 && (
                                                    <text 
                                                        x={`calc(${i} * (${barWidth} + ${gap}px) + (${barWidth} / 2))`} 
                                                        y={`${90 - heightPercent}%`} 
                                                        dy="-8" 
                                                        textAnchor="middle" 
                                                        fill="white" 
                                                        fontSize="10" 
                                                        fontFamily="var(--font-mono)" 
                                                        fontWeight="bold"
                                                    >
                                                        {count}
                                                    </text>
                                                )}
                                                {/* Bottom Date Label (rotated if many) */}
                                                <text 
                                                    x={`calc(${i} * (${barWidth} + ${gap}px) + (${barWidth} / 2))`} 
                                                    y="96%" 
                                                    textAnchor="middle" 
                                                    fill="var(--text-secondary)" 
                                                    fontSize="9" 
                                                    fontWeight="bold"
                                                    transform={metrics.timeline.length > 15 ? `rotate(-45, calc(${i} * (${barWidth} + ${gap}px) + (${barWidth} / 2)), 96%)` : ""}
                                                >
                                                    {metrics.timeline.length > 30 && i % 2 !== 0 ? '' : item.label}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Right: Demographics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

                        {/* Gender Breakdown Container */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PieChart size={16} color="#007bff" /> Target Demographics
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                {/* Safe pure CSS fallback for conic-gradient */}
                                <div style={{ 
                                    width: '100px', height: '100px', borderRadius: '50%', 
                                    background: (metrics.demographics.male === 0 && metrics.demographics.female === 0) 
                                        ? 'rgba(255,255,255,0.05)' 
                                        : `conic-gradient(#007bff 0% ${metrics.demographics.male}%, #64ffda ${metrics.demographics.male}% 100%)`, 
                                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    boxShadow: '0 0 20px rgba(0,0,0,0.3)', flexShrink: 0
                                }}>
                                    <div style={{ width: '70px', height: '70px', background: 'var(--bg-secondary)', borderRadius: '50%', border: '4px solid rgba(0,0,0,0.2)' }}></div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>MALE</span>
                                            <span style={{ color: '#007bff', fontWeight: 'bold', fontFamily: 'monospace' }}>{metrics.demographics.male}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${metrics.demographics.male}%`, height: '100%', background: '#007bff', borderRadius: '3px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>FEMALE</span>
                                            <span style={{ color: '#64ffda', fontWeight: 'bold', fontFamily: 'monospace' }}>{metrics.demographics.female}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${metrics.demographics.female}%`, height: '100%', background: '#64ffda', borderRadius: '3px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Age Breakdown Container */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16} color="#a855f7" /> Age Sub-groups
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                                {Object.entries(metrics.demographics.ageGroup).map(([age, pct], idx) => {
                                    // Calculate gradient colors dynamically based on index
                                    const colors = ['#64ffda', '#007bff', '#a855f7', '#ff4d4d'];
                                    const color = colors[idx % colors.length];
                                    
                                    return (
                                        <div key={age}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>{age} YRS</span>
                                                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: color, boxShadow: `0 0 10px ${color}80`, borderRadius: '3px', transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${(idx * 0.1)}s' }}></div>
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
