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

    const getFullTimeline = () => {
        const { startDate, endDate } = getDateRangeParams();
        if (!startDate || !endDate) return metrics.timeline;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const filled = [];
        
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 366 || daysDiff < 0) return metrics.timeline;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const existing = metrics.timeline.find(t => t.date === dateStr || t.label === label);
            filled.push({
                label: label,
                count: existing ? existing.count : 0
            });
        }
        
        return filled.length > 0 ? filled : metrics.timeline;
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

    // Premium Glassmorphic Metric Card
    const MetricCard = ({ title, value, unit, icon: Icon, color, loading }) => (
        <div style={{ 
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            backdropFilter: 'blur(20px)',
            borderRadius: '20px', 
            padding: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
        }}>
            {/* Subtle glow behind icon */}
            <div style={{ 
                position: 'absolute', 
                top: '50%', left: '26px', 
                width: '60px', height: '60px', 
                background: `radial-gradient(circle, rgba(${color}, 0.25) 0%, transparent 80%)`,
                borderRadius: '50%', zIndex: 0,
                transform: 'translateY(-50%)'
            }}></div>
            
            <div style={{ 
                background: `linear-gradient(135deg, rgba(${color}, 0.2) 0%, rgba(${color}, 0.05) 100%)`, 
                border: `1px solid rgba(${color}, 0.2)`,
                padding: '14px', 
                borderRadius: '16px', 
                color: `rgb(${color})`,
                zIndex: 1,
                boxShadow: `inset 0 2px 10px rgba(255,255,255,0.1), 0 5px 15px rgba(0,0,0,0.2)`
            }}>
                <Icon size={26} strokeWidth={2.5} />
            </div>
            
            <div style={{ zIndex: 1, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '700' }}>{title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                    {loading ? (
                        <div style={{ width: '80px', height: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }}></div>
                    ) : (
                        <>
                            <h2 style={{ margin: 0, fontSize: '2rem', color: '#f8fafc', fontWeight: '800', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.5px' }}>{value}</h2>
                            <span style={{ color: `rgb(${color})`, fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.5px' }}>{unit}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ animation: 'slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1)', height: '100%', display: 'flex', flexDirection: 'column', color: '#e2e8f0', fontFamily: 'var(--font-sans, "Inter", sans-serif)' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                     <h1 style={{ 
                         fontSize: '2rem', 
                         fontWeight: '800', 
                         background: 'linear-gradient(to right, #fff, #94a3b8)', 
                         WebkitBackgroundClip: 'text', 
                         WebkitTextFillColor: 'transparent',
                         margin: 0,
                         letterSpacing: '-0.5px'
                     }}>
                        Intelligence Analytics
                    </h1>
                    <p style={{ color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginTop: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        <LineChart size={16} /> Data Synthesis & Pattern Analysis
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Refresh Button */}
                    <button 
                        onClick={fetchAnalytics}
                        disabled={isLoading}
                        style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            padding: '10px 16px', 
                            borderRadius: '12px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    >
                        <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' : 'none' }} />
                        Refresh Data
                    </button>
                    
                    {/* PDF Export Button */}
                    <button 
                        onClick={exportToPDF}
                        disabled={isExporting || isLoading}
                        style={{ 
                            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            padding: '10px 18px', 
                            borderRadius: '12px', 
                            cursor: isExporting ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Download size={16} style={{ animation: isExporting ? 'bounce 1s infinite' : 'none' }} />
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
                    <MetricCard title="Active Network Nodes" value={metrics.onlineNodes} unit={`/ ${metrics.totalNodes} ONLINE`} icon={Activity} color="16, 185, 129" loading={isLoading} />
                    <MetricCard title="Mean Confidence" value={metrics.aiConfidenceAvg.toFixed(1)} unit="%" icon={Target} color="14, 165, 233" loading={isLoading} />
                    <MetricCard title="Profile Directory" value={metrics.totalPersons} unit="IDENTITIES" icon={Users} color="139, 92, 246" loading={isLoading} />
                    <MetricCard title="Today's Verified Hits" value={metrics.alertsToday} unit="MATCHES" icon={ShieldAlert} color="244, 63, 94" loading={isLoading} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '1.5rem', flex: 1, minHeight: '400px' }}>
                    
                    {/* Left: Timeline Chart (Breathtaking Modern Look) */}
                    <div style={{ 
                        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px', 
                        padding: '2rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        position: 'relative',
                        boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                    }}>
                        {/* Immersive glow */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', zIndex: 1 }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.5px' }}>
                                    <BarChart2 size={18} color="#38bdf8" /> Incident Volume Timeline
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>Comprehensive mapping of alert triggers</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.7rem', color: '#e2e8f0', fontWeight: '600', letterSpacing: '0.5px', backdropFilter: 'blur(10px)' }}>
                                {getDisplayLabel()}
                            </div>
                        </div>

                        <div style={{ flex: 1, position: 'relative', minHeight: '300px', marginTop: '10px', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
                            {isLoading ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(56, 189, 248, 0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s ease-in-out infinite' }}></div>
                                </div>
                            ) : getFullTimeline().length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', marginBottom: '15px' }}>
                                        <LineChart size={36} color="#475569" />
                                    </div>
                                    <p style={{ color: '#94a3b8', fontWeight: '600', letterSpacing: '1px', fontSize: '0.9rem', margin: 0 }}>NO ANALYTICS FOR SELECTED DATES</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
                                    
                                    {/* Y-Axis Grid Lines */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '30px', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', zIndex: 0, pointerEvents: 'none' }}>
                                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                            const maxVal = Math.max(...getFullTimeline().map(d => d.count), 1);
                                            const labelVal = Math.round(maxVal * ratio);
                                            return (
                                                <div key={`grid-${i}`} style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.03)', position: 'relative' }}>
                                                    <span style={{ position: 'absolute', bottom: '2px', left: '0', color: '#64748b', fontSize: '10px', fontWeight: '600', fontFamily: 'var(--font-mono, monospace)' }}>
                                                        {labelVal}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Bars Container */}
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, paddingLeft: '24px', position: 'relative', zIndex: 1, paddingBottom: '30px', gap: getFullTimeline().length > 30 ? '2px' : '8px' }}>
                                        {getFullTimeline().map((item, i) => {
                                            const fullTimelineData = getFullTimeline();
                                            const maxVal = Math.max(...fullTimelineData.map(d => d.count), 1);
                                            const count = item.count;
                                            const heightPercent = count === 0 ? 2 : (count / maxVal) * 100; // Give 2% min height so it's not totally empty
                                            const showLabel = fullTimelineData.length <= 15 || (i % Math.ceil(fullTimelineData.length / 10) === 0);
                                            
                                            return (
                                                <div key={`bar-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', flex: 1, position: 'relative', justifyContent: 'flex-end', group: 'bar-container' }}>
                                                    {/* The bar */}
                                                    <div style={{
                                                        width: '100%',
                                                        height: `${heightPercent}%`,
                                                        background: count > 0 ? 'linear-gradient(180deg, rgba(56, 189, 248, 1) 0%, rgba(56, 189, 248, 0.2) 100%)' : 'rgba(255,255,255,0.03)',
                                                        borderRadius: '4px 4px 0 0',
                                                        position: 'relative',
                                                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                                        boxShadow: count > 0 ? '0 0 15px rgba(56, 189, 248, 0.5)' : 'none',
                                                        border: count > 0 ? '1px solid rgba(56, 189, 248, 0.8)' : '1px dashed rgba(255,255,255,0.05)',
                                                        borderBottom: 'none'
                                                    }}>
                                                        {count > 0 && (
                                                            <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', color: '#ffffff', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 'bold' }}>
                                                                {count}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* X-Axis Label */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-25px',
                                                        left: '50%',
                                                        transform: fullTimelineData.length > 15 ? 'translateX(-50%) rotate(-45deg)' : 'translateX(-50%)',
                                                        color: '#94a3b8',
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        whiteSpace: 'nowrap',
                                                        opacity: showLabel ? 1 : 0
                                                    }}>
                                                        {item.label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Demographics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

                        {/* Gender Demographic Card */}
                        <div style={{ 
                            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
                            border: '1px solid rgba(255, 255, 255, 0.05)', 
                            backdropFilter: 'blur(20px)',
                            borderRadius: '24px', 
                            padding: '1.75rem', 
                            flex: '1 1 auto', 
                            display: 'flex', 
                            flexDirection: 'column',
                            boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '0.5px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PieChart size={18} color="#8b5cf6" /> Identified Gender Spread
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                                <div style={{ 
                                    width: '110px', height: '110px', borderRadius: '50%', 
                                    background: (metrics.demographics.male === 0 && metrics.demographics.female === 0) 
                                        ? 'rgba(255,255,255,0.05)' 
                                        : `conic-gradient(#0ea5e9 0% ${metrics.demographics.male}%, #d946ef ${metrics.demographics.male}% 100%)`, 
                                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
                                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <div style={{ width: '80px', height: '80px', background: '#0f172a', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.02)', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)' }}></div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.5px' }}>Male</span>
                                            <span style={{ color: '#0ea5e9', fontWeight: '800', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem' }}>{metrics.demographics.male}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${metrics.demographics.male}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #0ea5e9)', borderRadius: '3px', transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.5px' }}>Female</span>
                                            <span style={{ color: '#d946ef', fontWeight: '800', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem' }}>{metrics.demographics.female}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${metrics.demographics.female}%`, height: '100%', background: 'linear-gradient(90deg, #a21caf, #d946ef)', borderRadius: '3px', transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Age Demographic Card */}
                        <div style={{ 
                            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
                            border: '1px solid rgba(255, 255, 255, 0.05)', 
                            backdropFilter: 'blur(20px)',
                            borderRadius: '24px', 
                            padding: '1.75rem', 
                            flex: '1 1 auto', 
                            display: 'flex', 
                            flexDirection: 'column',
                            boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '0.5px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={18} color="#10b981" /> Age Distribution
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', flex: 1, justifyContent: 'center' }}>
                                {Object.entries(metrics.demographics.ageGroup).map(([age, pct], idx) => {
                                    const gradients = [
                                        'linear-gradient(90deg, #0284c7, #38bdf8)',
                                        'linear-gradient(90deg, #4f46e5, #818cf8)',
                                        'linear-gradient(90deg, #9333ea, #c084fc)',
                                        'linear-gradient(90deg, #e11d48, #fb7185)'
                                    ];
                                    const glowColors = ['#38bdf8', '#818cf8', '#c084fc', '#fb7185'];
                                    const gradient = gradients[idx % gradients.length];
                                    const glow = glowColors[idx % glowColors.length];
                                    
                                    return (
                                        <div key={age}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.5px' }}>{age} YRS</span>
                                                <span style={{ color: '#f8fafc', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem', fontWeight: '800' }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    width: `${pct}%`, 
                                                    height: '100%', 
                                                    background: gradient, 
                                                    boxShadow: `0 0 10px ${glow}80`,
                                                    borderRadius: '3px', 
                                                    transition: `width 1.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.15}s` 
                                                }}></div>
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
