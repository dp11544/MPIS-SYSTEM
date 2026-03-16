import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const sirenSound = 'https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg';
import { Upload, ScanFace, CheckCircle, XCircle, AlertTriangle, Fingerprint, User, Hash, Percent, FileText } from 'lucide-react';
import api from '../api/axios';
import axios from 'axios';

// AI Engine URL - adjust if different
const AI_ENGINE_URL = 'http://localhost:5000';

const ForensicMatch = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [processingStage, setProcessingStage] = useState(''); // 'extracting' | 'matching'
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [showSirenAlert, setShowSirenAlert] = useState(false);
    const fileInputRef = useRef(null);
    const sirenAudioRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    // Play siren when match is found
    useEffect(() => {
        if (result && result.match) {
            setShowSirenAlert(true);
            if (sirenAudioRef.current) {
                sirenAudioRef.current.currentTime = 0;
                const playPromise = sirenAudioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => console.log("Autoplay prevented:", error));
                }
                
                // Stop audio after 5 seconds
                const audioTimer = setTimeout(() => {
                    if (sirenAudioRef.current) {
                        sirenAudioRef.current.pause();
                        sirenAudioRef.current.currentTime = 0;
                    }
                }, 5000);
            }

            const alertTimer = setTimeout(() => {
                setShowSirenAlert(false);
            }, 5000);

            return () => {
                clearTimeout(alertTimer);
            };
        }
    }, [result]);

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleAnalyzeClick = () => {
        // Unlock audio context on user interaction
        if (sirenAudioRef.current) {
            sirenAudioRef.current.volume = 0.01;
            const p = sirenAudioRef.current.play();
            if (p !== undefined) {
                p.then(() => {
                    sirenAudioRef.current.pause();
                    sirenAudioRef.current.currentTime = 0;
                    sirenAudioRef.current.volume = 1;
                }).catch(() => {});
            }
        }
        analyzeImage();
    };

    const analyzeImage = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            // Stage 1: Extract embedding from AI Engine
            setProcessingStage('extracting');
            
            const formData = new FormData();
            formData.append('image', selectedFile);

            const embeddingResponse = await axios.post(
                `${AI_ENGINE_URL}/extract-embedding`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 30000 // 30 second timeout
                }
            );

            const { embedding } = embeddingResponse.data;

            if (!embedding || !Array.isArray(embedding)) {
                throw new Error('Invalid embedding response from AI Engine');
            }

            // Stage 2: Send embedding to backend for matching
            setProcessingStage('matching');

            const matchResponse = await api.post('/forensic/match', {
                embedding: embedding
            });

            const matchData = matchResponse.data;

            // Transform response to UI format
            setResult({
                match: matchData.status === 'MATCH_FOUND',
                personName: matchData.matchedPerson || 'Unknown',
                personId: matchData.caseId || 'N/A',
                similarity: matchData.similarity || 0,
                confidenceLevel: getConfidenceLevel(matchData.similarity),
                status: matchData.status
            });
            // ...existing code...

        } catch (err) {
            console.error('Forensic analysis error:', err);
            
            if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
                setError('AI Engine is offline. Please ensure the Python AI service is running on port 5001.');
            } else if (err.response?.status === 404) {
                setError('Endpoint not found. Please verify API configuration.');
            } else if (err.response?.status === 500) {
                setError('Server error during analysis. Check AI Engine and Backend logs.');
            } else {
                setError(err.response?.data?.message || err.message || 'Failed to run forensic analysis. Please try again.');
            }
        } finally {
            setIsAnalyzing(false);
            setProcessingStage('');
        }
    };

    const getConfidenceLevel = (similarity) => {
        if (similarity >= 0.85) return 'VERY HIGH';
        if (similarity >= 0.70) return 'HIGH';
        if (similarity >= 0.55) return 'MEDIUM';
        return 'LOW';
    };

    const getConfidenceColor = (level) => {
        switch (level) {
            case 'VERY HIGH': return 'var(--status-success)';
            case 'HIGH': return 'var(--text-accent)';
            case 'MEDIUM': return 'var(--status-warning)';
            default: return 'var(--status-alert)';
        }
    };

    const reset = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setProcessingStage('');
        setIsLoadingProfile(false);
        setShowSirenAlert(false);
        if (sirenAudioRef.current) {
            sirenAudioRef.current.pause();
            sirenAudioRef.current.currentTime = 0;
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleViewProfile = async () => {
        if (!result || !result.personId) return;

        try {
            setIsLoadingProfile(true);
            const response = await api.get(`/persons/${result.personId}`);
            localStorage.setItem('officialCaseData', JSON.stringify(response.data));
            navigate('/case-file');
        } catch (err) {
            console.error('Failed to fetch person details:', err);
            setError('Failed to load profile details. Please try again.');
            setIsLoadingProfile(false);
        }
    };

    const getProcessingMessage = () => {
        switch (processingStage) {
            case 'extracting':
                return 'EXTRACTING BIOMETRIC FEATURES...';
            case 'matching':
                return 'RUNNING DEEP NEURAL MATCH...';
            default:
                return 'PROCESSING...';
        }
    };

    return (
        <div style={{ animation: 'slideDown 0.4s easeOut', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {showSirenAlert && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    background: 'rgba(255, 0, 0, 0.15)',
                    animation: 'sirenFlash 0.5s infinite alternate',
                    border: '8px solid rgba(255, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <h1 style={{ color: 'red', fontSize: '4rem', fontWeight: '900', textShadow: '0 0 20px rgba(255,0,0,0.8)', letterSpacing: '10px', animation: 'sirenFlash 0.5s infinite alternate' }}>CONFIRMED MATCH</h1>
                </div>
            )}
            {/* Siren audio for match confirmation */}
            <audio ref={sirenAudioRef} src={sirenSound} preload="auto" />
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Forensic Analysis Sandbox
                </h1>
                <p style={{ color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginTop: '5px', fontWeight: 'bold' }}>
                    <ScanFace size={16} /> DEEP NEURAL NETWORK MATCHING PROTOCOL
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: '2rem', flex: 1 }}>

                {/* Left Side: Upload Area */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                        Input Target Image
                    </h3>

                    {!selectedFile ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                flex: 1, border: '2px dashed rgba(100, 255, 218, 0.3)', borderRadius: '12px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s', minHeight: '300px'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(100, 255, 218, 0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                        >
                            <div style={{ padding: '20px', background: 'rgba(100,255,218,0.1)', borderRadius: '50%', marginBottom: '15px' }}>
                                <Upload size={40} color="var(--text-accent)" />
                            </div>
                            <h4 style={{ color: 'var(--text-primary)', margin: '0 0 5px 0' }}>DRAG & DROP SUBJECT PHOTO</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>or click to browse local files</p>
                            <input
                                type="file" ref={fileInputRef} onChange={handleFileChange}
                                accept="image/*" style={{ display: 'none' }}
                            />
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(100,255,218,0.3)', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                                <img src={previewUrl} alt="Target" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />

                                {isAnalyzing && (
                                    <>
                                        {/* Scanning Overlay */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(100,255,218,0.1)', zIndex: 5 }}></div>
                                        {/* Sweeping Laser */}
                                        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'var(--text-accent)', boxShadow: '0 0 20px 5px rgba(100,255,218,0.6)', animation: 'scanSweep 2s infinite ease-in-out', zIndex: 10 }}></div>
                                        {/* Reticle */}
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '2px solid rgba(100,255,218,0.6)', width: '60px', height: '60px', borderRadius: '50%', pointerEvents: 'none', animation: 'pulse 1s infinite', zIndex: 6 }}></div>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '1px solid rgba(255,77,77,0.4)', width: '100px', height: '100px', borderRadius: '50%', pointerEvents: 'none', animation: 'pulse 1.5s infinite', zIndex: 6 }}></div>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                                <button
                                    onClick={reset}
                                    disabled={isAnalyzing}
                                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: isAnalyzing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                >
                                    CLEAR IMAGE
                                </button>
                                <button
                                    onClick={handleAnalyzeClick}
                                    disabled={isAnalyzing || result}
                                    style={{ flex: 2, padding: '12px', background: result ? 'var(--status-success)' : 'rgba(0,123,255,0.2)', color: result ? '#000' : 'var(--brand-blue)', border: result ? 'none' : '1px solid var(--brand-blue)', borderRadius: '8px', cursor: (isAnalyzing || result) ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: result ? '0 0 15px rgba(40,167,69,0.5)' : 'none' }}
                                >
                                    {isAnalyzing ? <><ScanFace className="spin" size={18} /> {getProcessingMessage()}</> : (result ? <><CheckCircle size={18} /> ANALYSIS COMPLETE</> : <><Fingerprint size={18} /> RUN FORENSIC MATCH</>)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Results Panel */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                        Intelligence Match Results
                    </h3>

                    {error && (
                        <div style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', padding: '15px', borderRadius: '8px', color: 'var(--status-alert)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                            <AlertTriangle size={20} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{error}</span>
                        </div>
                    )}

                    {!result && !isAnalyzing && !error && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            <Fingerprint size={64} color="var(--text-secondary)" style={{ marginBottom: '15px' }} />
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>Awaiting target image for deep neural network extraction and matching.</p>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '50px', height: '50px', border: '3px solid rgba(100,255,218,0.2)', borderTop: '3px solid var(--text-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <h4 style={{ color: 'var(--text-accent)', marginTop: '20px', letterSpacing: '2px' }}>{getProcessingMessage()}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '10px' }}>
                                {processingStage === 'extracting' ? 'Analyzing facial features via AI Engine...' : 'Searching Missing Persons Registry...'}
                            </p>
                            <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '15px', overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: '100%', background: 'var(--text-accent)', animation: 'progressLoader 2s linear infinite' }}></div>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div style={{ animation: 'fadeIn 0.5s easeOut' }}>
                            {result.match ? (
                                <>
                                    <div style={{ background: 'rgba(40,167,69,0.1)', border: '1px dashed var(--status-success)', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                                        <div style={{ background: 'var(--status-success)', color: '#000', padding: '10px', borderRadius: '50%' }}>
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <h2 style={{ color: 'var(--status-success)', margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>CONFIRMED MATCH</h2>
                                            <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.85rem' }}>Subject located in Missing Persons Registry.</p>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {/* Person Name - Full Width */}
                                        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(100,255,218,0.05)', borderRadius: '8px', border: '1px solid rgba(100,255,218,0.1)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                                <User size={12} /> MATCHED PERSON
                                            </span>
                                            <span style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{result.personName}</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                                                    <FileText size={12} /> CASE ID
                                                </span>
                                                <span style={{ fontSize: '1rem', color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)', background: 'rgba(0,123,255,0.1)', padding: '4px 10px', borderRadius: '4px', display: 'inline-block' }}>{result.personId}</span>
                                            </div>
                                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                                                    <Hash size={12} /> CONFIDENCE LEVEL
                                                </span>
                                                <span style={{ fontSize: '1rem', color: getConfidenceColor(result.confidenceLevel), fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {result.confidenceLevel === 'VERY HIGH' || result.confidenceLevel === 'HIGH' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                                    {result.confidenceLevel}
                                                </span>
                                            </div>
                                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', gridColumn: 'span 2' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                                                    <Percent size={12} /> SIMILARITY SCORE
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ fontSize: '2rem', color: 'var(--text-accent)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{(result.similarity * 100).toFixed(2)}%</span>
                                                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${result.similarity * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-blue), var(--text-accent))', borderRadius: '4px', transition: 'width 1s ease' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
                                        <button 
                                            onClick={handleViewProfile}
                                            disabled={isLoadingProfile}
                                            style={{ padding: '10px 20px', background: 'transparent', color: 'var(--brand-blue)', border: '1px solid var(--brand-blue)', borderRadius: '8px', cursor: isLoadingProfile ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', opacity: isLoadingProfile ? 0.7 : 1 }} 
                                            onMouseOver={e => !isLoadingProfile && (e.currentTarget.style.background = 'rgba(0,123,255,0.1)')} 
                                            onMouseOut={e => !isLoadingProfile && (e.currentTarget.style.background = 'transparent')}
                                        >
                                            {isLoadingProfile ? <><ScanFace className="spin" size={16} /> LOADING PROFILE...</> : 'VIEW FULL PROFILE REPORT'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px dashed var(--status-warning)', padding: '25px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px' }}>
                                    <div style={{ background: 'var(--status-warning)', color: '#000', padding: '15px', borderRadius: '50%' }}>
                                        <XCircle size={32} />
                                    </div>
                                    <h2 style={{ color: 'var(--status-warning)', margin: 0, fontSize: '1.4rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>NO MATCH FOUND</h2>
                                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', maxWidth: '300px' }}>
                                        No match found in Missing Persons Registry. The uploaded image does not correspond to any registered case.
                                    </p>
                                    {result.similarity > 0 && (
                                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                                            Highest similarity score: <strong style={{ color: 'var(--text-primary)' }}>{(result.similarity * 100).toFixed(2)}%</strong>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scanSweep { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
                @keyframes progressLoader { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes sirenFlash { 0% { opacity: 0.3; } 100% { opacity: 1; } }
                .spin { animation: spin 2s linear infinite; }
            `}} />
        </div>
    );
};

export default ForensicMatch;
