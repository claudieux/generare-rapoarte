
import React from 'react';

interface CardProps {
    title: string;
    children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
    return (
        <div className="bg-white/60 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl hover:bg-white/70 transition-all duration-500 group">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full group-hover:h-8 transition-all duration-300"></div>
                <h2 className="text-2xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">{title}</h2>
            </div>
            <div>{children}</div>
        </div>
    );
};

export default Card;
