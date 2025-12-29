import React from 'react';

const Card = ({ children, className = '', header, badge, interactive = true }) => {
  return (
    <div className={`bg-card/70 border border-primary/20 rounded-xl p-4 shadow-soft ${interactive ? 'hover:shadow-lg hover:scale-[1.01] transition-transform duration-150 ease-out' : ''} ${className}`}>
      {header && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-white">{header}</div>
          {badge && <div className="text-xs text-green-300 font-bold bg-green-800/20 px-2 py-1 rounded animate-pop">{badge}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
