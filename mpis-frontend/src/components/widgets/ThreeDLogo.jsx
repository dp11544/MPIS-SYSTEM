import { Shield } from 'lucide-react';
import '../../features/logo.css';

const ThreeDLogo = ({ size = 150 }) => {
    return (
        <div className="logo-3d-container" style={{ width: size, height: size }}>
            <div className="logo-3d-wrapper">
                <div className="logo-face front">
                    <Shield size={size * 0.6} color="var(--brand-blue)" />
                    <div className="logo-text">MPIS</div>
                </div>
                <div className="logo-face back">
                    <Shield size={size * 0.6} color="var(--status-alert)" />
                    <div className="logo-text">POLICE</div>
                </div>
                <div className="logo-ring-outer"></div>
                <div className="logo-ring-inner"></div>
            </div>
            <div className="logo-shadow"></div>
        </div>
    );
};

export default ThreeDLogo;
