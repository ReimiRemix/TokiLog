import React from 'react';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? "w-6 h-6"}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default ChevronDownIcon;
