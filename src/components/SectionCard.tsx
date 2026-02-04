import React from 'react';

const SectionCard: React.FC<{ children?: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`glass rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${className}`}
  >
    {children}
  </div>
);

export default SectionCard;
