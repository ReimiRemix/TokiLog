import React from 'react';

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default ChevronRightIcon;
