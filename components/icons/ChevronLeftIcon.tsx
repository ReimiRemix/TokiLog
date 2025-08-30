import React from 'react';

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? "w-5 h-5"}
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export default ChevronLeftIcon;
