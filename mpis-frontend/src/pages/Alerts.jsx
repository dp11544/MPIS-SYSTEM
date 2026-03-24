import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Eye, Download, ChevronLeft, ChevronRight, Calendar, 
    Bell, Shield, Camera, Clock, AlertTriangle, CheckCircle2, Target,
    Zap, MapPin, Printer, FileText, Radio, X, Siren, TrendingUp,
    Video, BadgeAlert, Activity, ScanFace, User
} from 'lucide-react';
import api, { silentApi } from '../api/axios';
const BASE_URL = import.meta.env.VITE_API_URL;

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [verifiedAlerts, setVerifiedAlerts] = useState(new Set());
    const [personPhotos, setPersonPhotos] = useState({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await api.get('/alerts');
                setAlerts(res.data);
                
                // Fetch person photos for all alerts using silentApi
                // (silentApi never triggers logout on 401/404 — it fails silently)
                const photoMap = {};
                for (const alert of res.data) {
                    if (alert.personId && !photoMap[alert.personId]) {
                        try {
                            const personRes = await silentApi.get(`/persons/${alert.personId}`);
                            if (personRes.data?.photoPath) {
                                photoMap[alert.personId] = personRes.data.photoPath;
                            }
                        } catch (e) {
                            // Person not found or auth error — skip photo silently
                        }
                    }
                }
                setPersonPhotos(photoMap);
            } catch (err) {
                console.error("Failed to fetch alerts", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    const openModal = (alert) => {
        setSelectedAlert(alert);
    };

    const closeModal = () => {
        setSelectedAlert(null);
    };

    // Mark alert as verified
    const markAsVerified = (alertId) => {
        setVerifiedAlerts(prev => new Set([...prev, alertId]));
        alert('✅ Alert marked as VERIFIED! Case has been confirmed.');
    };

    // Generate PDF Report
    const generatePDF = (alertData) => {
        const confidence = getConfidenceDetails(alertData.similarity);
        const timestamp = alertData.detectedAt 
            ? new Date(alertData.detectedAt).toLocaleString('en-GB', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }) : 'N/A';
        
        const photoUrl = personPhotos[alertData.personId] 
    ? `${BASE_URL}${personPhotos[alertData.personId]}` 
    : null;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Alert Incident Report - ${alertData.id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 40px; }
                    .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
                    .header h1 { font-size: 24px; margin-bottom: 5px; letter-spacing: 1px; }
                    .header p { opacity: 0.8; font-size: 14px; }
                    .badge { display: inline-block; background: #ff4d4d; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 15px; }
                    .content { display: grid; grid-template-columns: 200px 1fr; gap: 30px; }
                    .photo-section { text-align: center; }
                    .photo { width: 180px; height: 220px; border: 3px solid #007bff; border-radius: 12px; object-fit: cover; background: #f0f0f0; }
                    .no-photo { width: 180px; height: 220px; border: 3px solid #007bff; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #666; font-size: 14px; }
                    .status-badge { margin-top: 15px; background: #28a745; color: white; padding: 8px 20px; border-radius: 6px; font-weight: bold; font-size: 12px; }
                    .details h2 { font-size: 28px; margin-bottom: 10px; color: #1a1a2e; }
                    .tags { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
                    .tag { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                    .tag-blue { background: #e3f2fd; color: #007bff; border: 1px solid #007bff; }
                    .tag-red { background: #ffebee; color: #ff4d4d; border: 1px solid #ff4d4d; }
                    .match-score { font-size: 48px; font-weight: bold; color: ${confidence.color}; }
                    .match-label { font-size: 14px; color: ${confidence.color}; font-weight: bold; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px; }
                    .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
                    .info-box.red { border-left-color: #ff4d4d; }
                    .info-box.green { border-left-color: #28a745; }
                    .info-box.cyan { border-left-color: #17a2b8; }
                    .info-box label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px; }
                    .info-box p { font-size: 14px; font-weight: bold; color: #1a1a2e; word-break: break-all; }
                    .full-width { grid-column: span 2; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #666; font-size: 12px; }
                    .footer strong { color: #1a1a2e; }
                    @media print { body { padding: 20px; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚨 ALERT INCIDENT REPORT <span class="badge">OFFICIAL</span></h1>
                    <p>Missing Person Intelligence System - Law Enforcement Document</p>
                </div>
                
                <div class="content">
                    <div class="photo-section">
                        ${photoUrl 
                            ? `<img src="${photoUrl}" class="photo" alt="Subject Photo" />` 
                            : `<div class="no-photo">No Photo<br/>Available</div>`
                        }
                        <div class="status-badge">🔍 ACTIVE SURVEILLANCE</div>
                    </div>
                    
                    <div class="details">
                        <h2>${alertData.personName || 'UNKNOWN SUBJECT'}</h2>
                        <div class="tags">
                            <span class="tag tag-blue">ID: ${alertData.personId?.substring(0, 12) || 'N/A'}</span>
                            <span class="tag tag-red">STATUS: MISSING</span>
                            ${verifiedAlerts.has(alertData.id) ? '<span class="tag" style="background:#e8f5e9;color:#28a745;border:1px solid #28a745;">✓ VERIFIED</span>' : ''}
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <div>
                                <div class="match-score">${(alertData.similarity * 100).toFixed(1)}%</div>
                                <div class="match-label">${confidence.label} MATCH CONFIDENCE</div>
                            </div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-box red">
                                <label>Alert Trace ID</label>
                                <p>${alertData.id}</p>
                            </div>
                            <div class="info-box cyan">
                                <label>Detection Source</label>
                                <p>${alertData.cameraId || 'UNKNOWN'}</p>
                            </div>
                            <div class="info-box full-width">
                                <label>Detection Timestamp</label>
                                <p>${timestamp}</p>
                            </div>
                            <div class="info-box">
                                <label>Detection Model</label>
                                <p>HOG + LBP Features v2.0</p>
                            </div>
                            <div class="info-box green">
                                <label>Confidence Level</label>
                                <p style="color: ${confidence.color}">${confidence.label}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Missing Person Intelligence System</strong> | Generated: ${new Date().toLocaleString()}</p>
                    <p>This document is for official law enforcement use only.</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    // Calculate stats
    const totalAlerts = alerts.length;
    const highConfidence = alerts.filter(a => a.similarity >= 0.8).length;
    const mediumConfidence = alerts.filter(a => a.similarity >= 0.6 && a.similarity < 0.8).length;
    const todayAlerts = alerts.filter(a => {
        const alertDate = new Date(a.detectedAt);
        const today = new Date();
        return alertDate.toDateString() === today.toDateString();
    }).length;

    // Filter and paginate
    let filteredAlerts = alerts.filter(a =>
        (a.personName && a.personName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.personId && a.personId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.cameraId && a.cameraId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Apply confidence filter
    if (filterLevel === 'HIGH') {
        filteredAlerts = filteredAlerts.filter(a => a.similarity >= 0.8);
    } else if (filterLevel === 'MEDIUM') {
        filteredAlerts = filteredAlerts.filter(a => a.similarity >= 0.6 && a.similarity < 0.8);
    } else if (filterLevel === 'LOW') {
        filteredAlerts = filteredAlerts.filter(a => a.similarity < 0.6);
    }

    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
    const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Get confidence level details
    const getConfidenceDetails = (similarity) => {
        if (similarity >= 0.85) return { label: 'VERY HIGH', color: '#ff4d4d', bg: 'rgba(255,77,77,0.15)' };
        if (similarity >= 0.75) return { label: 'HIGH', color: '#ff9800', bg: 'rgba(255,152,0,0.15)' };
        if (similarity >= 0.6) return { label: 'MEDIUM', color: '#ffc107', bg: 'rgba(255,193,7,0.15)' };
        return { label: 'LOW', color: '#64ffda', bg: 'rgba(100,255,218,0.15)' };
    };

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out', height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* ===== COMPACT HEADER ===== */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, rgba(255,77,77,0.1) 0%, rgba(120,30,30,0.15) 100%)',
                padding: '15px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,77,77,0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #ff4d4d, #cc0000)',
                        padding: '8px',
                        borderRadius: '8px'
                    }}>
                        <Siren size={20} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                            ALERT INTELLIGENCE CENTER
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.75rem' }}>
                            Real-time biometric match alerts
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255,77,77,0.15)',
                        padding: '4px 10px',
                        borderRadius: '15px',
                        border: '1px solid rgba(255,77,77,0.3)'
                    }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#ff4d4d', boxShadow: '0 0 10px #ff4d4d',
                            animation: 'pulse 1.5s infinite'
                        }} />
                        <span style={{ color: '#ff4d4d', fontSize: '0.7rem', fontWeight: 'bold' }}>LIVE</span>
                    </div>
                    <button 
                        onClick={() => filteredAlerts.length > 0 && generatePDF(filteredAlerts[0])}
                        style={{
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem'
                        }}
                    >
                        <Printer size={14} /> Print Report
                    </button>
                </div>
            </div>

            {/* ===== STATISTICS CARDS ===== */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px', 
                marginBottom: '1.5rem' 
            }}>
                {/* Total Alerts */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0,123,255,0.15) 0%, rgba(0,60,120,0.1) 100%)',
                    border: '1px solid rgba(0,123,255,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Alerts</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{totalAlerts}</h2>
                            <p style={{ color: '#007bff', fontSize: '0.8rem', margin: 0 }}>All Time Records</p>
                        </div>
                        <Bell size={40} style={{ color: 'rgba(0,123,255,0.3)' }} />
                    </div>
                </div>

                {/* High Confidence */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255,77,77,0.15) 0%, rgba(120,30,30,0.1) 100%)',
                    border: '1px solid rgba(255,77,77,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>High Confidence</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{highConfidence}</h2>
                            <p style={{ color: '#ff4d4d', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Target size={12} /> 80%+ Match
                            </p>
                        </div>
                        <AlertTriangle size={40} style={{ color: 'rgba(255,77,77,0.3)' }} />
                    </div>
                </div>

                {/* Today's Detections */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(40,167,69,0.15) 0%, rgba(20,80,40,0.1) 100%)',
                    border: '1px solid rgba(40,167,69,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Today's Alerts</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{todayAlerts}</h2>
                            <p style={{ color: '#28a745', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Activity size={12} /> Last 24 Hours
                            </p>
                        </div>
                        <TrendingUp size={40} style={{ color: 'rgba(40,167,69,0.3)' }} />
                    </div>
                </div>

                {/* Cameras Active */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(100,255,218,0.15) 0%, rgba(50,120,100,0.1) 100%)',
                    border: '1px solid rgba(100,255,218,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Detection Sources</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>
                                {new Set(alerts.map(a => a.cameraId)).size}
                            </h2>
                            <p style={{ color: '#64ffda', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Video size={12} /> Active Cameras
                            </p>
                        </div>
                        <Camera size={40} style={{ color: 'rgba(100,255,218,0.3)' }} />
                    </div>
                </div>
            </div>

            {/* ===== SEARCH & FILTERS BAR ===== */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                background: 'rgba(0,0,0,0.2)',
                padding: '15px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                        { key: 'ALL', label: 'All Alerts', icon: Bell, count: totalAlerts },
                        { key: 'HIGH', label: 'High Priority', icon: AlertTriangle, count: highConfidence },
                        { key: 'MEDIUM', label: 'Medium', icon: Shield, count: mediumConfidence },
                        { key: 'LOW', label: 'Low', icon: CheckCircle2, count: totalAlerts - highConfidence - mediumConfidence }
                    ].map(tab => (
                        <button 
                            key={tab.key}
                            onClick={() => { setFilterLevel(tab.key); setCurrentPage(1); }}
                            style={{
                                background: filterLevel === tab.key 
                                    ? tab.key === 'HIGH' ? 'rgba(255,77,77,0.2)' : 'rgba(0,123,255,0.2)'
                                    : 'transparent',
                                border: filterLevel === tab.key 
                                    ? tab.key === 'HIGH' ? '1px solid rgba(255,77,77,0.5)' : '1px solid rgba(0,123,255,0.5)'
                                    : '1px solid rgba(255,255,255,0.1)',
                                color: filterLevel === tab.key 
                                    ? tab.key === 'HIGH' ? '#ff4d4d' : '#007bff'
                                    : 'var(--text-secondary)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            <span style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0 15px',
                    width: '350px',
                }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input
                        type="text"
                        placeholder="Search by Name, ID, or Camera..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            padding: '12px 10px',
                            width: '100%',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
            </div>

            {/* ===== DATA TABLE ===== */}
            <div style={{ 
                borderRadius: '16px', 
                overflow: 'hidden', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ 
                                background: 'linear-gradient(90deg, rgba(255,77,77,0.2) 0%, rgba(120,30,30,0.15) 100%)',
                                borderBottom: '2px solid rgba(255,77,77,0.3)'
                            }}>
                                <th style={{ padding: '18px 20px', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={14} /> Alert ID
                                    </div>
                                </th>
                                <th style={{ padding: '18px 20px', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ScanFace size={14} /> Subject Identity
                                    </div>
                                </th>
                                <th style={{ padding: '18px 20px', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Target size={14} /> Match Score
                                    </div>
                                </th>
                                <th style={{ padding: '18px 20px', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Camera size={14} /> Detection Source
                                    </div>
                                </th>
                                <th style={{ padding: '18px 20px', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={14} /> Timestamp
                                    </div>
                                </th>
                                <th style={{ padding: '18px 20px', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                            <div style={{
                                                width: '60px', height: '60px',
                                                border: '3px solid rgba(255,77,77,0.2)',
                                                borderTopColor: '#ff4d4d',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                            <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '2px' }}>
                                                QUERYING ALERT DATABASE...
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedAlerts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '80px', textAlign: 'center' }}>
                                        <Shield size={64} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
                                        <div style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 'bold' }}>
                                            No Alerts Found
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            {searchTerm ? 'No matches for your search criteria.' : 'No biometric alerts recorded yet.'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedAlerts.map((alert, index) => {
                                    const simPercent = (alert.similarity * 100).toFixed(1);
                                    const confidence = getConfidenceDetails(alert.similarity);

                                    return (
                                        <tr 
                                            key={alert.id} 
                                            style={{ 
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
                                                transition: 'all 0.2s',
                                                cursor: 'pointer'
                                            }} 
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.05)'}
                                            onMouseOut={e => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)'}
                                            onClick={() => openModal(alert)}
                                        >
                                            {/* Alert ID */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ 
                                                    background: 'linear-gradient(135deg, rgba(255,77,77,0.1), rgba(120,30,30,0.1))',
                                                    color: '#ff4d4d',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 'bold',
                                                    display: 'inline-block',
                                                    border: '1px solid rgba(255,77,77,0.3)',
                                                    letterSpacing: '1px'
                                                }}>
                                                    {alert.id.substring(0, 8).toUpperCase()}...
                                                </div>
                                            </td>

                                            {/* Subject Identity */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '45px',
                                                        height: '45px',
                                                        borderRadius: '10px',
                                                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(255,77,77,0.3)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <User size={20} color="var(--text-secondary)" />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1rem' }}>
                                                            {alert.personName || "Unknown Subject"}
                                                        </p>
                                                        <p style={{ fontSize: '0.75rem', color: '#007bff', margin: 0, fontFamily: 'monospace' }}>
                                                            ID: {alert.personId?.substring(0, 12)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Match Score */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ 
                                                        color: confidence.color, 
                                                        fontWeight: 'bold', 
                                                        fontSize: '1.2rem', 
                                                        background: confidence.bg, 
                                                        padding: '6px 14px', 
                                                        borderRadius: '8px', 
                                                        border: `1px solid ${confidence.color}40`,
                                                        minWidth: '70px',
                                                        textAlign: 'center'
                                                    }}>
                                                        {simPercent}%
                                                    </span>
                                                    <span style={{ 
                                                        fontSize: '0.7rem', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '4px', 
                                                        background: 'rgba(255,255,255,0.08)', 
                                                        color: confidence.color, 
                                                        textTransform: 'uppercase',
                                                        fontWeight: 'bold',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {confidence.label}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Detection Source */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '10px', 
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: '#64ffda',
                                                        boxShadow: '0 0 10px #64ffda'
                                                    }} />
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                        {alert.cameraId || 'UNKNOWN'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Timestamp */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    <Clock size={14} />
                                                    <span>
                                                        {alert.detectedAt 
                                                            ? new Date(alert.detectedAt).toLocaleString('en-GB', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openModal(alert); }}
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(0,123,255,0.2), rgba(0,60,120,0.2))',
                                                        border: '1px solid rgba(0,123,255,0.4)',
                                                        color: '#007bff',
                                                        borderRadius: '8px',
                                                        padding: '8px 16px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        transition: 'all 0.2s',
                                                        letterSpacing: '0.5px'
                                                    }}
                                                >
                                                    <Eye size={14} /> Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredAlerts.length > 0 && (
                    <div style={{ 
                        padding: '15px 20px', 
                        borderTop: '1px solid rgba(255,255,255,0.05)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(0,0,0,0.2)' 
                    }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Showing <strong style={{ color: 'var(--text-primary)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredAlerts.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredAlerts.length}</strong> records
                        </span>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                style={{ 
                                    padding: '8px 16px', 
                                    background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(0,123,255,0.1)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '8px', 
                                    color: currentPage === 1 ? 'rgba(255,255,255,0.2)' : '#007bff', 
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '5px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '5px',
                                background: 'rgba(0,0,0,0.3)',
                                padding: '8px 15px',
                                borderRadius: '8px'
                            }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{currentPage}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>/ {totalPages || 1}</span>
                            </div>
                            <button
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(p => p + 1)}
                                style={{ 
                                    padding: '8px 16px', 
                                    background: (currentPage === totalPages || totalPages === 0) ? 'rgba(255,255,255,0.02)' : 'rgba(0,123,255,0.1)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '8px', 
                                    color: (currentPage === totalPages || totalPages === 0) ? 'rgba(255,255,255,0.2)' : '#007bff', 
                                    cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '5px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== ALERT DETAILS MODAL ===== */}
            {selectedAlert && (
                <div style={{
                    position: 'fixed', 
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', 
                    backdropFilter: 'blur(10px)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={closeModal}>
                    <div style={{
                        background: 'linear-gradient(145deg, #0d1b2a, #1b263b)',
                        borderRadius: '20px',
                        width: '750px',
                        maxWidth: '95%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,77,77,0.3)',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 30px rgba(255,77,77,0.1)'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div style={{
                            background: 'linear-gradient(90deg, rgba(255,77,77,0.3) 0%, rgba(120,30,30,0.2) 100%)',
                            padding: '20px 25px',
                            borderBottom: '1px solid rgba(255,77,77,0.2)',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #ff4d4d, #cc0000)',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 15px rgba(255,77,77,0.4)'
                                }}>
                                    <Siren size={24} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ 
                                        fontSize: '1.3rem', 
                                        fontWeight: 'bold', 
                                        color: 'var(--text-primary)', 
                                        margin: 0,
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase'
                                    }}>
                                        Alert Incident Report
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                        Case #{selectedAlert.id?.substring(0, 12).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={closeModal}
                                style={{
                                    background: 'rgba(255,77,77,0.1)',
                                    border: '1px solid rgba(255,77,77,0.3)',
                                    color: '#ff4d4d',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '25px' }}>
                            
                            {/* Match Confidence Banner */}
                            <div style={{
                                background: `linear-gradient(135deg, ${getConfidenceDetails(selectedAlert.similarity).bg}, rgba(0,0,0,0.2))`,
                                border: `1px solid ${getConfidenceDetails(selectedAlert.similarity).color}40`,
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{
                                        width: '100px',
                                        height: '120px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `3px solid ${getConfidenceDetails(selectedAlert.similarity).color}`,
                                        overflow: 'hidden',
                                        boxShadow: `0 0 20px ${getConfidenceDetails(selectedAlert.similarity).color}40`
                                    }}>
                                        {personPhotos[selectedAlert.personId] ? (
                                            <img 
                                                src={`${BASE_URL}${personPhotos[selectedAlert.personId]}`}
                                                alt="Subject Photo" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        ) : (
                                            <User size={40} color="var(--text-secondary)" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 style={{ 
                                            fontSize: '1.6rem', 
                                            color: 'var(--text-primary)', 
                                            margin: '0 0 8px 0', 
                                            fontWeight: 'bold',
                                            letterSpacing: '1px'
                                        }}>
                                            {selectedAlert.personName || "UNKNOWN SUBJECT"}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: 'rgba(0,123,255,0.1)',
                                                color: '#007bff',
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                border: '1px solid rgba(0,123,255,0.3)',
                                                fontWeight: 'bold',
                                                fontFamily: 'monospace'
                                            }}>
                                                ID: {selectedAlert.personId?.substring(0, 12)}
                                            </span>
                                            <span style={{
                                                background: 'rgba(255,77,77,0.1)',
                                                color: '#ff4d4d',
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                border: '1px solid rgba(255,77,77,0.3)',
                                                fontWeight: 'bold'
                                            }}>
                                                STATUS: MISSING
                                            </span>
                                            {verifiedAlerts.has(selectedAlert.id) && (
                                                <span style={{
                                                    background: 'rgba(40,167,69,0.1)',
                                                    color: '#28a745',
                                                    padding: '4px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    border: '1px solid rgba(40,167,69,0.3)',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <CheckCircle2 size={12} /> VERIFIED
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ 
                                        fontSize: '3rem', 
                                        fontWeight: 'bold', 
                                        lineHeight: 1, 
                                        color: getConfidenceDetails(selectedAlert.similarity).color
                                    }}>
                                        {(selectedAlert.similarity * 100).toFixed(1)}<span style={{ fontSize: '1.5rem' }}>%</span>
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: getConfidenceDetails(selectedAlert.similarity).color, 
                                        marginTop: '5px', 
                                        letterSpacing: '1px',
                                        fontWeight: 'bold'
                                    }}>
                                        {getConfidenceDetails(selectedAlert.similarity).label} MATCH
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '15px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: '3px solid #ff4d4d'
                                }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={12} /> Alert Trace ID
                                    </p>
                                    <p style={{ fontFamily: 'monospace', color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                        {selectedAlert.id}
                                    </p>
                                </div>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '15px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: '3px solid #64ffda'
                                }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Camera size={12} /> Detection Source
                                    </p>
                                    <p style={{ color: '#64ffda', margin: 0, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {selectedAlert.cameraId || 'UNKNOWN'}
                                    </p>
                                </div>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '15px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: '3px solid #007bff',
                                    gridColumn: 'span 2'
                                }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={12} /> Detection Timestamp
                                    </p>
                                    <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {selectedAlert.detectedAt 
                                            ? new Date(selectedAlert.detectedAt).toLocaleString('en-GB', { 
                                                weekday: 'long',
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })
                                            : 'N/A'
                                        }
                                    </p>
                                </div>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '15px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: '3px solid #ffc107'
                                }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Detection Model
                                    </p>
                                    <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 'bold' }}>
                                        {selectedAlert.modelUsed || 'HOG + LBP Features'}
                                        <span style={{ opacity: 0.6, marginLeft: '10px', fontSize: '0.8rem' }}>v2.0</span>
                                    </p>
                                </div>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '15px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: '3px solid #28a745'
                                }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Confidence Level
                                    </p>
                                    <p style={{ 
                                        color: getConfidenceDetails(selectedAlert.similarity).color, 
                                        margin: 0, 
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem'
                                    }}>
                                        {getConfidenceDetails(selectedAlert.similarity).label}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '20px 25px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <button onClick={closeModal} style={{
                                padding: '12px 24px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                            }}>
                                Dismiss
                            </button>
                            <button 
                                onClick={() => markAsVerified(selectedAlert.id)}
                                disabled={verifiedAlerts.has(selectedAlert.id)}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    background: verifiedAlerts.has(selectedAlert.id) 
                                        ? 'rgba(40,167,69,0.3)' 
                                        : 'rgba(40,167,69,0.1)',
                                    color: '#28a745',
                                    cursor: verifiedAlerts.has(selectedAlert.id) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid rgba(40,167,69,0.3)',
                                    opacity: verifiedAlerts.has(selectedAlert.id) ? 0.7 : 1
                                }}
                            >
                                <CheckCircle2 size={16} /> 
                                {verifiedAlerts.has(selectedAlert.id) ? 'Verified ✓' : 'Mark Verified'}
                            </button>
                            <button 
                                onClick={() => generatePDF(selectedAlert)}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 15px rgba(0, 123, 255, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Printer size={16} /> Print Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes fadeIn { 
                        from { opacity: 0; transform: translateY(10px); } 
                        to { opacity: 1; transform: translateY(0); } 
                    }
                    @keyframes spin { 
                        100% { transform: rotate(360deg); } 
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `
            }} />
        </div>
    );
};

export default Alerts;
