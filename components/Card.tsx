
import React from 'react';

interface CardProps {
    title: string;
    children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">{title}</h2>
            <div>{children}</div>
        </div>
    );
};

export default Card;
