import { useState, useEffect } from 'react';
import toast from '../../utils/toast';
import { X, CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const unsubscribe = toast.subscribe((event, data) => {
            if (event === 'add') {
                const id = Date.now() + Math.random();
                setToasts((prev) => [...prev, { ...data, id }]);

                // Auto-remove after 5 seconds
                setTimeout(() => {
                    removeToast(id);
                }, 5000);
            }
        });
        return unsubscribe;
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast-message toast-${t.type}`}>
                    <div className="toast-icon">
                        {t.type === 'success' && <CheckCircle size={20} />}
                        {t.type === 'error' && <AlertOctagon size={20} />}
                        {t.type === 'warning' && <AlertTriangle size={20} />}
                        {t.type === 'info' && <Info size={20} />}
                    </div>
                    <span className="toast-text">{t.message}</span>
                    <button onClick={() => removeToast(t.id)} className="toast-close">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
