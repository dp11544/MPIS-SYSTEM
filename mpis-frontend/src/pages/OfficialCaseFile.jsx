import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
const BASE_URL = import.meta.env.VITE_API_URL;
import { 
    ArrowLeft, Shield, MapPin, Calendar, User, Phone, FileText, 
    Building2, BadgeCheck, Printer, Download
} from 'lucide-react';

const OfficialCaseFilePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [caseData, setCaseData] = useState(null);

    // Officer details from logged-in user
    const officerDetails = {
        name: user?.username || 'A. DURGA PRASAD',
        rank: 'Sub-Inspector',
        badgeId: user?.batchId || 'admin',
        clearance: user?.role || 'OFFICER',
        phone: '+91 93816 15617',
        jurisdiction: 'Bhimavaram 1 Town P.S.',
        district: 'West Godavari',
        state: 'Andhra Pradesh',
        status: 'Active Duty'
    };

    useEffect(() => {
        // Get case data from localStorage
        const storedCase = localStorage.getItem('officialCaseData');
        if (storedCase) {
            setCaseData(JSON.parse(storedCase));
        } else {
            // No case data, redirect back
            navigate('/registry');
        }
    }, [navigate]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }) + ' — ' + date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }) + ' IST';
    };

    const generateCaseId = (id) => {
        if (!id) return 'MPIS-2026-0001';
        const year = new Date().getFullYear();
        const num = id.substring(0, 4).toUpperCase();
        return `MPIS-${year}-${num}`;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        localStorage.removeItem('officialCaseData');
        navigate('/registry');
    };

    if (!caseData) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading Case File...</p>
            </div>
        );
    }

    const person = caseData.person || caseData;

    return (
        <div style={styles.pageContainer}>
            {/* Top Navigation Bar - Hidden on Print */}
            <div style={styles.navBar} className="no-print">
                <button onClick={handleBack} style={styles.backButton}>
                    <ArrowLeft size={20} />
                    <span>Back to Registry</span>
                </button>
                <div style={styles.navActions}>
                    <button onClick={handlePrint} style={styles.printButton}>
                        <Printer size={18} />
                        Print / Save as PDF
                    </button>
                </div>
            </div>

            {/* Official Document */}
            <div style={styles.documentContainer}>
                <div style={styles.document}>
                    
                    {/* Watermark - Indian Emblem */}
                    <div style={styles.watermark}>
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
                            alt="Indian Emblem"
                            style={styles.emblemWatermark}
                        />
                    </div>

                    {/* Document Header with Emblem */}
                    <div style={styles.header}>
                        <div style={styles.emblemContainer}>
                            <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
                                alt="National Emblem of India"
                                style={styles.emblem}
                            />
                        </div>
                        <div style={styles.headerText}>
                            <p style={styles.govText}>भारत सरकार</p>
                            <p style={styles.govTextEn}>GOVERNMENT OF INDIA</p>
                            <h1 style={styles.titleText}>MISSING PERSON INTELLIGENCE SYSTEM</h1>
                            <p style={styles.subtitleText}>OFFICIAL CASE RECORD</p>
                        </div>
                        <div style={styles.statusBadge}>
                            <span style={{
                                ...styles.statusTag,
                                background: caseData.status === 'LOCATED' ? '#28a745' : '#dc3545'
                            }}>
                                {caseData.status || 'ACTIVE'}
                            </span>
                        </div>
                    </div>

                    {/* Gold Decorative Line */}
                    <div style={styles.goldLine}></div>

                    {/* Case ID Banner */}
                    <div style={styles.caseIdBanner}>
                        <div style={styles.caseIdLeft}>
                            <FileText size={22} color="#8b0000" />
                            <span style={styles.caseIdLabel}>CASE FILE NO:</span>
                            <span style={styles.caseIdValue}>{generateCaseId(person.id)}</span>
                        </div>
                        <div style={styles.caseIdRight}>
                            <span style={styles.filedDate}>Filed: {formatDate(person.createdAt || new Date())}</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={styles.mainContent}>
                        
                        {/* Section 1: Subject Information */}
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>
                                <span style={styles.sectionIcon}>§1</span>
                                SUBJECT INFORMATION
                            </h2>
                            
                            <div style={styles.subjectGrid}>
                                {/* Photo */}
                                <div style={styles.photoSection}>
                                    <div style={styles.photoFrame}>
                                        {person.photoPath ? (
                                            <img 
                                                src={`${BASE_URL}${person.photoPath}`}
                                                alt="Subject"
                                                style={styles.photo}
                                            />
                                        ) : (
                                            <div style={styles.noPhoto}>
                                                <User size={50} color="#8b7355" />
                                                <span>PHOTOGRAPH</span>
                                            </div>
                                        )}
                                    </div>
                                    <p style={styles.photoCaption}>Photograph of Missing Person</p>
                                </div>

                                {/* Details */}
                                <div style={styles.detailsGrid}>
                                    <div style={styles.detailRow}>
                                        <span style={styles.detailLabel}>Full Name</span>
                                        <span style={styles.detailValue}>{person.name || 'N/A'}</span>
                                    </div>
                                    <div style={styles.detailRowDouble}>
                                        <div style={styles.detailHalf}>
                                            <span style={styles.detailLabel}>Age</span>
                                            <span style={styles.detailValue}>{person.age || 'N/A'} Years</span>
                                        </div>
                                        <div style={styles.detailHalf}>
                                            <span style={styles.detailLabel}>Gender</span>
                                            <span style={styles.detailValue}>{person.gender || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div style={styles.detailRow}>
                                        <span style={styles.detailLabel}>
                                            <MapPin size={14} style={{marginRight: '6px'}} />
                                            Last Seen Location
                                        </span>
                                        <span style={styles.detailValueRed}>
                                            {person.lastSeenLocation || person.lastKnownLocation || 'Location Unknown'}
                                        </span>
                                    </div>
                                    <div style={styles.detailRow}>
                                        <span style={styles.detailLabel}>
                                            <Calendar size={14} style={{marginRight: '6px'}} />
                                            Missing Since
                                        </span>
                                        <span style={styles.detailValue}>
                                            {formatDate(person.missingSince || person.createdAt)}
                                        </span>
                                    </div>
                                    <div style={styles.detailRow}>
                                        <span style={styles.detailLabel}>
                                            <Phone size={14} style={{marginRight: '6px'}} />
                                            Emergency Contact
                                        </span>
                                        <span style={styles.detailValueBlue}>
                                            {person.contactNumber || 'Not Provided'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={styles.sectionDivider}></div>

                        {/* Section 2: Case Filed By (Officer Details) */}
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>
                                <span style={styles.sectionIcon}>§2</span>
                                CASE FILED BY
                            </h2>
                            
                            <div style={styles.officerGrid}>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>Officer Name</span>
                                    <span style={styles.officerValue}>{officerDetails.name}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>Designation / Rank</span>
                                    <span style={styles.officerValue}>{officerDetails.rank}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>Badge ID</span>
                                    <span style={styles.officerValue}>{officerDetails.badgeId}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>Police Station / Jurisdiction</span>
                                    <span style={styles.officerValue}>{officerDetails.jurisdiction}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>District</span>
                                    <span style={styles.officerValue}>{officerDetails.district}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>State</span>
                                    <span style={styles.officerValue}>{officerDetails.state}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>Contact Number</span>
                                    <span style={styles.officerValue}>{officerDetails.phone}</span>
                                </div>
                                <div style={styles.officerRow}>
                                    <span style={styles.officerLabel}>Filed On</span>
                                    <span style={styles.officerValue}>{formatDate(person.createdAt || new Date())}</span>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={styles.sectionDivider}></div>

                        {/* Section 3: Official Authorization */}
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>
                                <span style={styles.sectionIcon}>§3</span>
                                OFFICIAL AUTHORIZATION
                            </h2>
                            
                            <div style={styles.authContainer}>
                                <div style={styles.authDetails}>
                                    <div style={styles.authRow}>
                                        <span style={styles.authLabel}>Authorized By:</span>
                                        <span style={styles.authValue}>Superintendent of Police, Missing Persons Division</span>
                                    </div>
                                    <div style={styles.authRow}>
                                        <span style={styles.authLabel}>Department:</span>
                                        <span style={styles.authValue}>Missing Persons Bureau, Government of India</span>
                                    </div>
                                    <div style={styles.authRow}>
                                        <span style={styles.authLabel}>Clearance Level:</span>
                                        <span style={styles.authValue}>{officerDetails.clearance}</span>
                                    </div>
                                </div>

                                {/* Official Seal */}
                                <div style={styles.sealContainer}>
                                    <div style={styles.officialSeal}>
                                        <div style={styles.sealOuter}>
                                            <div style={styles.sealMiddle}>
                                                <div style={styles.sealInner}>
                                                    <BadgeCheck size={20} color="#8b0000" />
                                                    <span style={styles.sealText}>OFFICIAL</span>
                                                    <span style={styles.sealText}>RECORD</span>
                                                    <span style={styles.sealMpis}>— MPIS —</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={styles.footer}>
                        <div style={styles.footerLine}></div>
                        <p style={styles.footerText}>
                            This is an official computer-generated document from the Missing Person Intelligence System (MPIS).
                        </p>
                        <p style={styles.footerText}>
                            Document ID: {generateCaseId(person.id)} | Generated: {new Date().toLocaleString('en-IN')}
                        </p>
                        <p style={styles.footerDisclaimer}>
                            सत्यमेव जयते — Truth Alone Triumphs
                        </p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { 
                        background: white !important; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const styles = {
    pageContainer: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '0'
    },

    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        gap: '20px'
    },

    spinner: {
        width: '50px',
        height: '50px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#d4af37',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },

    navBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 30px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(212,175,55,0.3)'
    },

    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'all 0.2s'
    },

    navActions: {
        display: 'flex',
        gap: '15px'
    },

    printButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'linear-gradient(135deg, #d4af37, #b8860b)',
        border: 'none',
        color: '#1a1a2e',
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
    },

    documentContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: '30px',
        minHeight: 'calc(100vh - 70px)'
    },

    document: {
        width: '850px',
        background: 'linear-gradient(135deg, #fdfcf9 0%, #f8f4eb 50%, #f0ebe0 100%)',
        borderRadius: '4px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,115,85,0.3)',
        position: 'relative',
        fontFamily: '"Times New Roman", Georgia, serif',
        color: '#1a1a1a',
        overflow: 'hidden'
    },

    watermark: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '450px',
        height: '450px',
        opacity: 0.06,
        pointerEvents: 'none',
        zIndex: 0
    },

    emblemWatermark: {
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    },

    header: {
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0f1a2b 100%)',
        padding: '25px 35px',
        display: 'flex',
        alignItems: 'center',
        gap: '25px',
        position: 'relative',
        zIndex: 1
    },

    emblemContainer: {
        width: '80px',
        height: '80px',
        flexShrink: 0
    },

    emblem: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(10deg)'
    },

    headerText: {
        flex: 1,
        textAlign: 'center'
    },

    govText: {
        color: '#d4af37',
        fontSize: '14px',
        letterSpacing: '2px',
        margin: '0 0 2px 0',
        fontWeight: 'bold'
    },

    govTextEn: {
        color: '#d4af37',
        fontSize: '12px',
        letterSpacing: '3px',
        margin: '0 0 8px 0',
        fontWeight: 'bold'
    },

    titleText: {
        color: '#ffffff',
        fontSize: '22px',
        letterSpacing: '3px',
        margin: '0 0 6px 0',
        fontWeight: 'bold'
    },

    subtitleText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: '14px',
        letterSpacing: '5px',
        margin: 0
    },

    statusBadge: {
        position: 'absolute',
        top: '20px',
        right: '30px'
    },

    statusTag: {
        padding: '8px 18px',
        borderRadius: '4px',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        fontFamily: 'Arial, sans-serif'
    },

    goldLine: {
        height: '5px',
        background: 'linear-gradient(90deg, #8b7355 0%, #d4af37 30%, #f0d78c 50%, #d4af37 70%, #8b7355 100%)'
    },

    caseIdBanner: {
        background: 'linear-gradient(135deg, rgba(139,115,85,0.15) 0%, rgba(212,175,55,0.1) 100%)',
        padding: '18px 35px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid rgba(139,115,85,0.3)',
        position: 'relative',
        zIndex: 1
    },

    caseIdLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },

    caseIdLabel: {
        fontSize: '14px',
        color: '#5c4a32',
        fontWeight: 'bold',
        letterSpacing: '1px'
    },

    caseIdValue: {
        fontSize: '20px',
        color: '#8b0000',
        fontWeight: 'bold',
        letterSpacing: '3px',
        fontFamily: '"Courier New", monospace'
    },

    caseIdRight: {},

    filedDate: {
        fontSize: '12px',
        color: '#5c4a32',
        fontFamily: 'Arial, sans-serif'
    },

    mainContent: {
        padding: '30px 35px',
        position: 'relative',
        zIndex: 1
    },

    section: {
        marginBottom: '25px'
    },

    sectionTitle: {
        fontSize: '16px',
        color: '#1a1a2e',
        fontWeight: 'bold',
        letterSpacing: '2px',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '2px solid #8b7355',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'Arial, sans-serif'
    },

    sectionIcon: {
        color: '#8b0000',
        fontWeight: 'bold',
        fontSize: '14px'
    },

    subjectGrid: {
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: '30px'
    },

    photoSection: {
        textAlign: 'center'
    },

    photoFrame: {
        width: '180px',
        height: '220px',
        border: '3px solid #8b7355',
        borderRadius: '4px',
        overflow: 'hidden',
        background: '#f5f0e8',
        boxShadow: 'inset 0 0 20px rgba(139,115,85,0.2), 0 4px 15px rgba(0,0,0,0.1)',
        margin: '0 auto'
    },

    photo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },

    noPhoto: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        color: '#8b7355',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '2px'
    },

    photoCaption: {
        marginTop: '10px',
        fontSize: '10px',
        color: '#5c4a32',
        letterSpacing: '1px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },

    detailsGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        paddingLeft: '25px',
        borderLeft: '3px solid rgba(139,115,85,0.3)'
    },

    detailRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },

    detailRowDouble: {
        display: 'flex',
        gap: '40px'
    },

    detailHalf: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1
    },

    detailLabel: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '11px',
        color: '#5c4a32',
        letterSpacing: '1px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Arial, sans-serif'
    },

    detailValue: {
        fontSize: '18px',
        color: '#1a1a1a',
        fontWeight: 'bold'
    },

    detailValueRed: {
        fontSize: '18px',
        color: '#8b0000',
        fontWeight: 'bold'
    },

    detailValueBlue: {
        fontSize: '18px',
        color: '#003366',
        fontWeight: 'bold',
        fontFamily: 'monospace'
    },

    sectionDivider: {
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, #8b7355 20%, #8b7355 80%, transparent 100%)',
        margin: '25px 0'
    },

    officerGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px 50px'
    },

    officerRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
    },

    officerLabel: {
        fontSize: '10px',
        color: '#5c4a32',
        letterSpacing: '1px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Arial, sans-serif'
    },

    officerValue: {
        fontSize: '15px',
        color: '#1a1a1a',
        fontWeight: 'bold'
    },

    authContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    authDetails: {
        flex: 1
    },

    authRow: {
        marginBottom: '12px'
    },

    authLabel: {
        fontSize: '11px',
        color: '#5c4a32',
        marginRight: '10px',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold'
    },

    authValue: {
        fontSize: '14px',
        color: '#1a1a1a',
        fontWeight: 'bold'
    },

    sealContainer: {
        marginLeft: '30px'
    },

    officialSeal: {
        width: '120px',
        height: '120px'
    },

    sealOuter: {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        border: '3px solid #8b0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(139,0,0,0.08) 0%, rgba(139,0,0,0.15) 100%)',
        boxShadow: '0 4px 15px rgba(139,0,0,0.2), inset 0 2px 4px rgba(0,0,0,0.1)'
    },

    sealMiddle: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: '1px solid #8b0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    sealInner: {
        width: '85px',
        height: '85px',
        borderRadius: '50%',
        border: '2px dashed #8b0000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8b0000',
        textAlign: 'center'
    },

    sealText: {
        fontSize: '10px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        lineHeight: '1.2'
    },

    sealMpis: {
        fontSize: '8px',
        letterSpacing: '2px',
        marginTop: '2px'
    },

    footer: {
        background: 'linear-gradient(180deg, rgba(139,115,85,0.1) 0%, rgba(139,115,85,0.2) 100%)',
        padding: '20px 35px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
    },

    footerLine: {
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, #8b7355 30%, #d4af37 50%, #8b7355 70%, transparent 100%)',
        marginBottom: '15px'
    },

    footerText: {
        fontSize: '10px',
        color: '#5c4a32',
        margin: '4px 0',
        fontFamily: 'Arial, sans-serif'
    },

    footerDisclaimer: {
        fontSize: '12px',
        color: '#8b0000',
        marginTop: '10px',
        fontWeight: 'bold',
        fontStyle: 'italic'
    }
};

export default OfficialCaseFilePage;
