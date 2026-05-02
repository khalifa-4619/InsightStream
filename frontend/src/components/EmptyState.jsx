import React from 'react';

const EmptyState = ({ icon: Icon, title, description, className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
    {Icon && <Icon size={48} className="text-slate-600 mb-4" />}
    <h3 className="text-lg font-bold text-slate-400 mb-2">{title}</h3>
    {description && <p className="text-sm text-slate-500 max-w-md">{description}</p>}
  </div>
);

export default EmptyState;