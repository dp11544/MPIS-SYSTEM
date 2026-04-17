import { useState } from 'react';
import { UserPlus, MapPin, Camera, Upload, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import toast from '../utils/toast';

const RegisterCase = () => {
    const [formData, setFormData] = useState({
        name: '', age: '', gender: 'Male', lastSeenLocation: '', contactNumber: '', lastSeenDate: '', notes: ''
    });
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            if (selectedFiles.length > 5) {
                toast.error("You can upload a maximum of 5 photos.");
                return;
            }
            if (selectedFiles.length < 1) {
                return;
            }
            setFiles(selectedFiles);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        if (files.length === 0) {
            setError('At least one photo is required for identification');
            setLoading(false);
            return;
        }

        try {
            // 1. Create Person
            const personPayload = {
                name: formData.name,
                age: parseInt(formData.age),
                gender: formData.gender,
                lastSeenLocation: formData.lastSeenLocation,
                contactNumber: formData.contactNumber
            };

            const createRes = await api.post('/persons', personPayload);
            const personId = createRes.data.id;

            if (!personId) throw new Error("Failed to create person record");

            // 2. Upload Photos
            const uploadData = new FormData();
            files.forEach(f => uploadData.append('images', f));

            await api.post(`/upload/${personId}`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccess(true);
            toast.success("Case registered successfully! Surveillance active.");
            setFormData({ name: '', age: '', gender: 'Male', lastSeenLocation: '', contactNumber: '', lastSeenDate: '', notes: '' });
            setFiles([]);

        } catch (err) {
            setError('Registration failed. Please check the details and try again.');
            console.error("Registration error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Shared input style
    const inputStyle = {
        width: '100%', padding: '14px', background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
        color: 'var(--text-primary)', transition: 'all 0.2s ease', outline: 'none',
        fontFamily: 'var(--font-primary)'
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'slideDown 0.4s easeOut' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Register Missing Person</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '8px' }}>Input subject demographic data to initialize active biometric surveillance.</p>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(16, 26, 43, 0.8), rgba(10, 25, 47, 0.9))', border: '1px solid rgba(0, 123, 255, 0.2)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
                {success && (
                    <div style={{ background: 'rgba(40, 167, 69, 0.1)', border: '1px solid var(--status-success)', color: 'var(--status-success)', padding: '15px', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', background: 'var(--status-success)', borderRadius: '50%', boxShadow: '0 0 10px var(--status-success)' }}></div>
                        TARGET PROFILE INGESTED. SURVEILLANCE NODE ACTIVE.
                    </div>
                )}
                {error && (
                    <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid var(--status-alert)', color: 'var(--status-alert)', padding: '15px', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <AlertCircle size={20} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                    {/* Left Column: Demographics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Demographics</h3>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--text-accent)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Age *</label>
                                <input type="number" name="age" value={formData.age} onChange={handleChange} required
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--text-accent)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--text-accent)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Known Location *</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                                <input type="text" name="lastSeenLocation" value={formData.lastSeenLocation} onChange={handleChange} required
                                    style={{ ...inputStyle, paddingLeft: '45px' }} placeholder="Street, City, Area"
                                    onFocus={e => e.target.style.borderColor = 'var(--text-accent)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Police Contact Number *</label>
                            <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required
                                style={inputStyle} placeholder="Whom to call if identified"
                                onFocus={e => e.target.style.borderColor = 'var(--text-accent)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                    </div>

                    {/* Right Column: Biometrics & Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Biometrics</h3>

                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Identification Photos (1-5 images) *</label>
                        <div style={{
                            flex: 1, minHeight: '200px', border: files.length > 0 ? '2px solid var(--text-accent)' : '2px dashed rgba(255,255,255,0.2)',
                            borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.3)', position: 'relative', cursor: 'pointer', overflow: 'hidden',
                            transition: 'all 0.3s ease'
                        }}
                            onClick={() => document.getElementById('fileUpload').click()}
                            onMouseOver={e => files.length === 0 && (e.currentTarget.style.borderColor = 'rgba(100,255,218,0.5)', e.currentTarget.style.background = 'rgba(100,255,218,0.05)')}
                            onMouseOut={e => files.length === 0 && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)', e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, display: files.length > 0 ? 'flex' : 'none', flexWrap: 'wrap', gap: '5px', padding: '10px' }}>
                                {files.map((f, i) => (
                                    <img key={i} src={URL.createObjectURL(f)} alt={`Preview ${i}`} style={{ width: 'calc(50% - 5px)', height: 'calc(50% - 5px)', objectFit: 'cover', borderRadius: '5px' }} />
                                ))}
                            </div>

                            <div style={{ zIndex: 2, display: files.length > 0 ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Camera size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Click to select secure image file</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '5px', opacity: 0.5 }}>(JPG/PNG, Max 5MB, Front-facing preferred)</p>
                            </div>

                            {files.length > 0 && (
                                <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 3, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', backdropFilter: 'blur(5px)' }}>
                                    {files.length} photo(s) selected
                                </div>
                            )}

                            <input id="fileUpload" type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>

                        <button type="submit" disabled={loading} style={{
                            marginTop: 'auto', padding: '16px', background: loading ? 'var(--bg-tertiary)' : 'var(--brand-blue)',
                            color: loading ? 'var(--text-secondary)' : 'white', border: 'none', borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            boxShadow: loading ? 'none' : '0 8px 20px rgba(0, 123, 255, 0.4)', transition: 'all 0.2s ease',
                            letterSpacing: '1px'
                        }}
                            onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseOut={e => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            {loading ? (
                                <><div className="spin"><Upload size={20} /></div> INGESTING DATA...</>
                            ) : (
                                <><Upload size={20} /> INITIALIZE TO SURVEILLANCE PROTOCOL</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .spin { animation: spin 1.5s linear infinite; display: inline-block; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default RegisterCase;
