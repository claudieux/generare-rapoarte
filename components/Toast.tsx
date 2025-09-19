
import React, { useEffect } from 'react';
import type { ToastType } from '../types';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => {
            clearTimeout(timer);
        };
    }, [onClose]);

    const baseClasses = "fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white z-50 animate-slide-in-up";
    
    const typeClasses = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <div className="flex items-center justify-between">
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 text-white font-bold">&times;</button>
            </div>
             <style>{`
                @keyframes slide-in-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in-up {
                    animation: slide-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Toast;
