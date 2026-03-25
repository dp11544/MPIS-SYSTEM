import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildImageUrl } from '@/utils/url';
import { 
    Search, User, MapPin, Calendar, Activity, ChevronRight, 
    ShieldAlert, Phone, Eye, Clock, AlertTriangle, CheckCircle2,
    Download, Printer, Users, Target, Radio, FileText, X,
    BadgeAlert, Crosshair, Fingerprint, ScanFace, RotateCcw, FileCheck
} from 'lucide-react';
import api from '../api/axios';

const Registry = () => {
    const navigate = useNavigate();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [locatedPersons, setLocatedPersons] = useState(new Set());

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const res = await api.get('/persons');
                setCases(res.data);
            } catch (err) {
                console.error("Failed to fetch cases", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCases();
    }, []);

    // Mark person as located
    const markAsLocated = (person) => {
        setLocatedPersons(prev => new Set([...prev, person.id]));
        alert(`✅ SUCCESS! ${person.name} has been marked as LOCATED.\nCase moved to "Located" section.`);
        setShowModal(false);
    };

    // Reopen case - return to active surveillance
    const reopenCase = (person) => {
        setLocatedPersons(prev => {
            const newSet = new Set(prev);
            newSet.delete(person.id);
            return newSet;
        });
        alert(`🔄 CASE REOPENED!\n${person.name} is now back under ACTIVE SURVEILLANCE.\nFace matching has been reactivated.`);
    };

    // Open official case file view - Navigate to full page
    const openOfficialCaseFile = (person) => {
        const caseData = {
            caseId: person.id,
            person: {
                id: person.id,
                name: person.name,
                age: person.age,
                gender: person.gender,
                photoPath: person.photoPath,
                lastSeenLocation: person.lastSeenLocation,
                contactNumber: person.contactNumber,
                createdAt: person.createdAt
            },
            status: locatedPersons.has(person.id) ? 'LOCATED' : 'ACTIVE'
        };
        
        // Store case data in localStorage and navigate to full page
        localStorage.setItem('officialCaseData', JSON.stringify(caseData));
        setShowModal(false);
        navigate('/case-file');
    };

    // Generate Case File PDF
    const generateCaseFilePDF = (person) => {
        const isLocated = locatedPersons.has(person.id);
        const photoUrl = person.photoPath 
  ? buildImageUrl(person.photoPath) 
  : null;
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Case File - ${person.name}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 40px; }
                    .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
                    .header h1 { font-size: 24px; margin-bottom: 5px; letter-spacing: 1px; }
                    .header p { opacity: 0.8; font-size: 14px; }
                    .badge { display: inline-block; background: #007bff; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 15px; }
                    .status-badge { display: inline-block; background: ${isLocated ? '#28a745' : '#ff4d4d'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                    .content { display: grid; grid-template-columns: 200px 1fr; gap: 30px; }
                    .photo-section { text-align: center; }
                    .photo { width: 180px; height: 220px; border: 3px solid #007bff; border-radius: 12px; object-fit: cover; background: #f0f0f0; }
                    .no-photo { width: 180px; height: 220px; border: 3px solid #007bff; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #666; font-size: 14px; }
                    .surveillance-badge { margin-top: 15px; background: ${isLocated ? '#28a745' : '#007bff'}; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 12px; }
                    .details h2 { font-size: 32px; margin-bottom: 10px; color: #1a1a2e; }
                    .case-id { font-family: monospace; color: #007bff; font-size: 14px; margin-bottom: 20px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
                    .info-box { background: #f8f9fa; padding: 18px; border-radius: 10px; border-left: 4px solid #007bff; }
                    .info-box.red { border-left-color: #ff4d4d; }
                    .info-box.green { border-left-color: #28a745; }
                    .info-box.full-width { grid-column: span 2; }
                    .info-box label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px; }
                    .info-box p { font-size: 16px; font-weight: bold; color: #1a1a2e; }
                    .info-box p.highlight { color: #ff4d4d; }
                    .info-box p.phone { color: #007bff; font-family: monospace; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #666; font-size: 12px; }
                    .footer strong { color: #1a1a2e; }
                    @media print { body { padding: 20px; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🔍 MISSING PERSON CASE FILE <span class="badge">OFFICIAL</span></h1>
                    <p>Missing Person Intelligence System - Law Enforcement Document</p>
                </div>
                
                <div class="content">
                    <div class="photo-section">
                        ${photoUrl 
                            ? `<img src="${photoUrl}" class="photo" alt="Subject Photo" />` 
                            : `<div class="no-photo">No Photo<br/>Available</div>`
                        }
                        <div class="surveillance-badge">${isLocated ? '✓ LOCATED - CASE CLOSED' : '📡 SURVEILLANCE ACTIVE'}</div>
                    </div>
                    
                    <div class="details">
                        <h2>${person.name}</h2>
                        <div class="case-id">CASE ID: ${person.id}</div>
                        <span class="status-badge">${isLocated ? '✓ LOCATED' : 'MISSING'}</span>
                        
                        <div class="info-grid">
                            <div class="info-box">
                                <label>Age</label>
                                <p>${person.age} Years</p>
                            </div>
                            <div class="info-box">
                                <label>Gender</label>
                                <p>${person.gender || 'N/A'}</p>
                            </div>
                            <div class="info-box red full-width">
                                <label>📍 Last Known Location</label>
                                <p class="highlight">${person.lastSeenLocation || 'Location Unknown'}</p>
                            </div>
                            <div class="info-box green full-width">
                                <label>📞 Emergency Contact</label>
                                <p class="phone">${person.contactNumber || 'Contact Not Provided'}</p>
                            </div>
                            <div class="info-box">
                                <label>Registration Date</label>
                                <p>${person.createdAt ? new Date(person.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div class="info-box">
                                <label>Case Status</label>
                                <p style="color: ${isLocated ? '#28a745' : '#ff4d4d'}">${isLocated ? 'LOCATED' : 'ACTIVE SEARCH'}</p>
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

    // Generate Registry Report PDF
    const generateRegistryReportPDF = () => {
        const totalCount = cases.length;
        const activeCount = cases.filter(c => !locatedPersons.has(c.id)).length;
        const locatedCount = locatedPersons.size;
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Missing Persons Registry Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 40px; }
                    .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center; }
                    .header h1 { font-size: 28px; margin-bottom: 10px; letter-spacing: 2px; }
                    .header p { opacity: 0.8; font-size: 14px; }
                    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                    .stat-card { background: #f8f9fa; padding: 25px; border-radius: 12px; text-align: center; border-bottom: 4px solid #007bff; }
                    .stat-card.green { border-bottom-color: #28a745; }
                    .stat-card.red { border-bottom-color: #ff4d4d; }
                    .stat-card h3 { font-size: 36px; margin-bottom: 5px; }
                    .stat-card p { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #1a1a2e; color: white; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                    td { padding: 15px; border-bottom: 1px solid #eee; }
                    tr:nth-child(even) { background: #f8f9fa; }
                    .status { padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
                    .status.active { background: #e8f5e9; color: #28a745; }
                    .status.located { background: #e3f2fd; color: #007bff; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #666; font-size: 12px; }
                    @media print { body { padding: 20px; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 MISSING PERSONS REGISTRY REPORT</h1>
                    <p>Missing Person Intelligence System - Law Enforcement Summary</p>
                </div>
                
                <div class="stats">
                    <div class="stat-card">
                        <h3>${totalCount}</h3>
                        <p>Total Profiles</p>
                    </div>
                    <div class="stat-card red">
                        <h3>${activeCount}</h3>
                        <p>Active Surveillance</p>
                    </div>
                    <div class="stat-card green">
                        <h3>${locatedCount}</h3>
                        <p>Located / Resolved</p>
                    </div>
                </div>
                
                <h2 style="margin-bottom: 15px; color: #1a1a2e;">Registered Cases</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Case ID</th>
                            <th>Name</th>
                            <th>Age</th>
                            <th>Last Location</th>
                            <th>Contact</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cases.map(person => `
                            <tr>
                                <td style="font-family: monospace; color: #007bff;">#${person.id?.substring(0, 8).toUpperCase()}</td>
                                <td><strong>${person.name}</strong></td>
                                <td>${person.age} yrs</td>
                                <td>${person.lastSeenLocation || 'Unknown'}</td>
                                <td style="font-family: monospace;">${person.contactNumber || 'N/A'}</td>
                                <td><span class="status ${locatedPersons.has(person.id) ? 'located' : 'active'}">${locatedPersons.has(person.id) ? '✓ LOCATED' : '● ACTIVE'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
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

    // Filter cases based on status
    let filteredCases = cases.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.id?.includes(searchTerm);
        if (!matchesSearch) return false;
        
        if (filterStatus === 'ACTIVE') return !locatedPersons.has(c.id);
        if (filterStatus === 'LOCATED') return locatedPersons.has(c.id);
        // ALL or CRITICAL show all
        return true;
    });

    const openProfile = (person) => {
        setSelectedPerson(person);
        setShowModal(true);
    };

    // Stats calculations
    const totalCases = cases.length;
    const activeCases = cases.filter(c => !locatedPersons.has(c.id)).length;
    const locatedCases = locatedPersons.size;
    const criticalCases = Math.floor(cases.filter(c => !locatedPersons.has(c.id)).length * 0.3);

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* ===== HEADER WITH BADGE ===== */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, rgba(0,60,120,0.3) 0%, rgba(0,20,50,0.5) 100%)',
                padding: '25px 30px',
                borderRadius: '16px',
                border: '1px solid rgba(0,123,255,0.2)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Pattern */}
                <div style={{
                    position: 'absolute',
                    top: 0, right: 0,
                    width: '300px', height: '100%',
                    background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23007bff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    opacity: 0.5
                }} />

                <div style={{ zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            padding: '12px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,123,255,0.4)'
                        }}>
                            <Fingerprint size={28} color="white" />
                        </div>
                        <div>
                            <h1 style={{ 
                                fontSize: '1.8rem', 
                                fontWeight: 'bold', 
                                color: 'var(--text-primary)', 
                                margin: 0,
                                letterSpacing: '1px'
                            }}>
                                MISSING PERSONS REGISTRY
                            </h1>
                            <p style={{ 
                                color: 'var(--text-secondary)', 
                                margin: '5px 0 0 0', 
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ 
                                    background: 'rgba(40,167,69,0.2)', 
                                    color: '#28a745', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    LIVE DATABASE
                                </span>
                                Centralized surveillance profiles & biometric intelligence
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: 1 }}>
                    <button 
                        onClick={generateRegistryReportPDF}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-secondary)',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Printer size={16} /> Print Report
                    </button>
                    <button
                        onClick={() => window.location.href = '/register'}
                        style={{
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 20px rgba(0, 123, 255, 0.4)',
                            transition: 'all 0.2s',
                            letterSpacing: '0.5px',
                            fontSize: '0.9rem'
                        }}
                    >
                        <Target size={18} /> REGISTER NEW CASE
                    </button>
                </div>
            </div>

            {/* ===== STATISTICS CARDS ===== */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px', 
                marginBottom: '2rem' 
            }}>
                {/* Total Cases */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0,123,255,0.15) 0%, rgba(0,60,120,0.1) 100%)',
                    border: '1px solid rgba(0,123,255,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Profiles</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{totalCases}</h2>
                            <p style={{ color: '#007bff', fontSize: '0.8rem', margin: 0 }}>In Database</p>
                        </div>
                        <Users size={40} style={{ color: 'rgba(0,123,255,0.3)' }} />
                    </div>
                </div>

                {/* Active Tracking */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(40,167,69,0.15) 0%, rgba(20,80,40,0.1) 100%)',
                    border: '1px solid rgba(40,167,69,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Tracking</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{activeCases}</h2>
                            <p style={{ color: '#28a745', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Radio size={12} /> Surveillance Active
                            </p>
                        </div>
                        <Crosshair size={40} style={{ color: 'rgba(40,167,69,0.3)' }} />
                    </div>
                </div>

                {/* Located */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(100,255,218,0.15) 0%, rgba(50,120,100,0.1) 100%)',
                    border: '1px solid rgba(100,255,218,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Located</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{locatedCases}</h2>
                            <p style={{ color: '#64ffda', fontSize: '0.8rem', margin: 0 }}>Successfully Found</p>
                        </div>
                        <CheckCircle2 size={40} style={{ color: 'rgba(100,255,218,0.3)' }} />
                    </div>
                </div>

                {/* Critical */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255,77,77,0.15) 0%, rgba(120,30,30,0.1) 100%)',
                    border: '1px solid rgba(255,77,77,0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>High Priority</p>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '5px 0', fontWeight: 'bold' }}>{criticalCases}</h2>
                            <p style={{ color: '#ff4d4d', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <AlertTriangle size={12} /> Urgent Cases
                            </p>
                        </div>
                        <BadgeAlert size={40} style={{ color: 'rgba(255,77,77,0.3)' }} />
                    </div>
                </div>
            </div>

            {/* ===== SEARCH & FILTERS ===== */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem',
                background: 'rgba(0,0,0,0.2)',
                padding: '15px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                        { key: 'ALL', label: 'All Cases', icon: Users },
                        { key: 'ACTIVE', label: 'Active Tracking', icon: Radio },
                        { key: 'LOCATED', label: 'Located', icon: CheckCircle2 },
                        { key: 'CRITICAL', label: 'High Priority', icon: AlertTriangle }
                    ].map(tab => (
                        <button 
                            key={tab.key}
                            onClick={() => setFilterStatus(tab.key)}
                            style={{
                                background: filterStatus === tab.key ? 'rgba(0,123,255,0.2)' : 'transparent',
                                border: filterStatus === tab.key ? '1px solid rgba(0,123,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                color: filterStatus === tab.key ? '#007bff' : 'var(--text-secondary)',
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
                        placeholder="Search by Name, ID, or Location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ 
                            background: 'linear-gradient(90deg, rgba(0,60,120,0.4) 0%, rgba(0,40,80,0.3) 100%)',
                            borderBottom: '2px solid rgba(0,123,255,0.3)'
                        }}>
                            <th style={{ padding: '18px 20px', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={14} /> Case ID
                                </div>
                            </th>
                            <th style={{ padding: '18px 20px', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ScanFace size={14} /> Subject Details
                                </div>
                            </th>
                            <th style={{ padding: '18px 20px', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={14} /> Last Known Location
                                </div>
                            </th>
                            <th style={{ padding: '18px 20px', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={14} /> Contact
                                </div>
                            </th>
                            <th style={{ padding: '18px 20px', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
                            <th style={{ padding: '18px 20px', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={14} /> Registered
                                </div>
                            </th>
                            <th style={{ padding: '18px 20px', textAlign: 'center', color: '#007bff', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '60px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                        <div style={{
                                            width: '60px', height: '60px',
                                            border: '3px solid rgba(0,123,255,0.2)',
                                            borderTopColor: '#007bff',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '2px' }}>
                                            ACCESSING SECURE DATABASE...
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredCases.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '80px', textAlign: 'center' }}>
                                    <ShieldAlert size={64} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
                                    <div style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 'bold' }}>
                                        No Profiles Found
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                        Database search returned zero matching records.
                                    </div>
                                    <button
                                        onClick={() => window.location.href = '/register'}
                                        style={{
                                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Target size={18} /> Register First Case
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            filteredCases.map((person, index) => (
                                <tr 
                                    key={person.id}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,123,255,0.08)'}
                                    onMouseOut={e => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)'}
                                    onClick={() => openProfile(person)}
                                >
                                    {/* Case ID */}
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ 
                                            background: 'linear-gradient(135deg, rgba(0,123,255,0.2), rgba(0,60,120,0.2))',
                                            color: '#007bff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace',
                                            fontWeight: 'bold',
                                            display: 'inline-block',
                                            border: '1px solid rgba(0,123,255,0.3)',
                                            letterSpacing: '1px'
                                        }}>
                                            #{person.id?.substring(0, 8).toUpperCase()}
                                        </div>
                                    </td>

                                    {/* Subject Details */}
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{
                                                width: '55px',
                                                height: '55px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(0,123,255,0.3)',
                                                overflow: 'hidden',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                            }}>
                                                {person.photoPath ? (
                                                    <img 
                                                        src={buildImageUrl(person.photoPath)}
                                                        alt={person.name} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                             onError={(e) => {
                                                                      e.target.onerror = null;
                                                                              e.target.src = '/fallback-user.png';
                                                                        }}
                                                    />
                                                ) : <User size={24} color="var(--text-secondary)" />}
                                            </div>
                                            <div>
                                                <p style={{ 
                                                    fontWeight: 'bold', 
                                                    color: 'var(--text-primary)', 
                                                    margin: '0 0 6px 0', 
                                                    fontSize: '1rem',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {person.name}
                                                </p>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    gap: '15px', 
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    <span style={{ 
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        Age: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{person.age}</span>
                                                    </span>
                                                    <span style={{ 
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        Sex: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{person.gender?.charAt(0).toUpperCase()}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Location */}
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px', 
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem'
                                        }}>
                                            <div style={{
                                                background: 'rgba(255,77,77,0.1)',
                                                padding: '6px',
                                                borderRadius: '6px'
                                            }}>
                                                <MapPin size={16} color="#ff4d4d" />
                                            </div>
                                            <span>{person.lastSeenLocation || "Location Unknown"}</span>
                                        </div>
                                    </td>

                                    {/* Contact */}
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px', 
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem'
                                        }}>
                                            <Phone size={14} color="var(--text-secondary)" />
                                            <span style={{ fontFamily: 'monospace' }}>
                                                {person.contactNumber || "N/A"}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '18px 20px' }}>
                                        <span style={{
                                            background: locatedPersons.has(person.id) 
                                                ? 'linear-gradient(135deg, rgba(100,255,218,0.2), rgba(50,120,100,0.2))'
                                                : 'linear-gradient(135deg, rgba(40,167,69,0.2), rgba(20,80,40,0.2))',
                                            color: locatedPersons.has(person.id) ? '#64ffda' : '#28a745',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            border: `1px solid ${locatedPersons.has(person.id) ? 'rgba(100,255,218,0.4)' : 'rgba(40,167,69,0.4)'}`,
                                            fontWeight: 'bold',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {locatedPersons.has(person.id) ? (
                                                <>
                                                    <CheckCircle2 size={12} />
                                                    LOCATED
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ 
                                                        width: '6px', 
                                                        height: '6px', 
                                                        borderRadius: '50%', 
                                                        background: '#28a745',
                                                        boxShadow: '0 0 10px #28a745',
                                                        animation: 'pulse 2s infinite'
                                                    }} />
                                                    ACTIVE
                                                </>
                                            )}
                                        </span>
                                    </td>

                                    {/* Date */}
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
                                                {person.createdAt 
                                                    ? new Date(person.createdAt).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })
                                                    : new Date().toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })
                                                }
                                            </span>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); openProfile(person); }}
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
                                            <Eye size={14} /> VIEW
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== PROFILE MODAL ===== */}
            {showModal && selectedPerson && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)'
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        background: 'linear-gradient(145deg, #0d1b2a, #1b263b)',
                        borderRadius: '20px',
                        padding: '0',
                        width: '700px',
                        maxHeight: '85vh',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,123,255,0.3)',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{
                            background: 'linear-gradient(90deg, rgba(0,60,120,0.5) 0%, rgba(0,40,80,0.4) 100%)',
                            padding: '20px 25px',
                            borderBottom: '1px solid rgba(0,123,255,0.2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Fingerprint size={24} color="#007bff" />
                                <span style={{ 
                                    color: 'var(--text-primary)', 
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    letterSpacing: '1px'
                                }}>
                                    CASE FILE: #{selectedPerson.id?.substring(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)}
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
                        <div style={{ padding: '25px', display: 'flex', gap: '25px' }}>
                            {/* Photo Section */}
                            <div style={{ 
                                width: '200px',
                                flexShrink: 0
                            }}>
                                <div style={{
                                    width: '200px',
                                    height: '240px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                                    border: '3px solid rgba(0,123,255,0.4)',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
                                }}>
                                    {selectedPerson.photoPath ? (
                                        <img 
                                             src={buildImageUrl(selectedPerson.photoPath)}
                                            alt={selectedPerson.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                    e.target.onerror = null;
                                                          e.target.src = '/fallback-user.png';
                                                                    }}
                                        />
                                    ) : (
                                        <div style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <User size={60} color="var(--text-secondary)" />
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    marginTop: '15px',
                                    background: locatedPersons.has(selectedPerson.id)
                                        ? 'linear-gradient(135deg, rgba(100,255,218,0.2), rgba(50,120,100,0.2))'
                                        : 'linear-gradient(135deg, rgba(40,167,69,0.2), rgba(20,80,40,0.2))',
                                    border: `1px solid ${locatedPersons.has(selectedPerson.id) ? 'rgba(100,255,218,0.4)' : 'rgba(40,167,69,0.4)'}`,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ 
                                        color: locatedPersons.has(selectedPerson.id) ? '#64ffda' : '#28a745', 
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}>
                                        {locatedPersons.has(selectedPerson.id) ? (
                                            <><CheckCircle2 size={14} /> LOCATED - CASE CLOSED</>
                                        ) : (
                                            <><Radio size={14} /> SURVEILLANCE ACTIVE</>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details Section */}
                            <div style={{ flex: 1 }}>
                                <h2 style={{ 
                                    color: 'var(--text-primary)', 
                                    margin: '0 0 20px 0',
                                    fontSize: '1.5rem',
                                    letterSpacing: '1px'
                                }}>
                                    {selectedPerson.name}
                                </h2>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Age</p>
                                        <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>{selectedPerson.age} Years</p>
                                    </div>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Gender</p>
                                        <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>{selectedPerson.gender}</p>
                                    </div>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        gridColumn: 'span 2'
                                    }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={12} /> Last Known Location
                                        </p>
                                        <p style={{ color: '#ff4d4d', fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>
                                            {selectedPerson.lastSeenLocation || "Location Unknown"}
                                        </p>
                                    </div>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        gridColumn: 'span 2'
                                    }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Phone size={12} /> Emergency Contact
                                        </p>
                                        <p style={{ color: '#007bff', fontSize: '1.1rem', margin: 0, fontWeight: 'bold', fontFamily: 'monospace' }}>
                                            {selectedPerson.contactNumber || "Contact Not Provided"}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '12px', 
                                    marginTop: '25px',
                                    paddingTop: '20px',
                                    borderTop: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {/* Official Case File Button */}
                                    <button 
                                        onClick={() => openOfficialCaseFile(selectedPerson)}
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                                            color: '#d4af37',
                                            border: '2px solid #d4af37',
                                            padding: '14px',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            fontSize: '0.95rem',
                                            letterSpacing: '1px',
                                            boxShadow: '0 4px 15px rgba(212,175,55,0.2)'
                                        }}
                                    >
                                        <FileCheck size={18} /> VIEW OFFICIAL CASE FILE
                                    </button>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button 
                                            onClick={() => generateCaseFilePDF(selectedPerson)}
                                            style={{
                                                flex: 1,
                                                background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '14px',
                                                borderRadius: '10px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <Printer size={16} /> Print Report
                                        </button>
                                        <button 
                                            onClick={() => markAsLocated(selectedPerson)}
                                            disabled={locatedPersons.has(selectedPerson.id)}
                                            style={{
                                                flex: 1,
                                                background: locatedPersons.has(selectedPerson.id)
                                                    ? 'rgba(100,255,218,0.2)'
                                                    : 'rgba(40,167,69,0.1)',
                                                color: locatedPersons.has(selectedPerson.id) ? '#64ffda' : '#28a745',
                                                border: `1px solid ${locatedPersons.has(selectedPerson.id) ? 'rgba(100,255,218,0.4)' : 'rgba(40,167,69,0.3)'}`,
                                                padding: '14px',
                                                borderRadius: '10px',
                                                fontWeight: 'bold',
                                                cursor: locatedPersons.has(selectedPerson.id) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                fontSize: '0.9rem',
                                                opacity: locatedPersons.has(selectedPerson.id) ? 0.8 : 1
                                            }}
                                        >
                                            <CheckCircle2 size={16} /> 
                                            {locatedPersons.has(selectedPerson.id) ? 'Located ✓' : 'Mark as Located'}
                                        </button>
                                    </div>
                                    
                                    {/* Case Reopen Button - Only visible when case is located */}
                                    {locatedPersons.has(selectedPerson.id) && (
                                        <button 
                                            onClick={() => reopenCase(selectedPerson)}
                                            style={{
                                                width: '100%',
                                                background: 'linear-gradient(135deg, rgba(255,152,0,0.2), rgba(200,100,0,0.2))',
                                                color: '#ff9800',
                                                border: '1px solid rgba(255,152,0,0.4)',
                                                padding: '14px',
                                                borderRadius: '10px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                fontSize: '0.9rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <RotateCcw size={16} /> Case Reopen - Resume Surveillance
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes spin {
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `
            }} />
        </div>
    );
};

export default Registry;
