import React from 'react';

const LineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
    <path d="M8.8 10.5c.6-.6 1.4-.9 2.2-.9s1.6.3 2.2.9c.6.6.9 1.4.9 2.2s-.3 1.6-.9 2.2c-.6.6-1.4.9-2.2.9s-1.6-.3-2.2-.9c-.6-.6-.9-1.4-.9-2.2s.3-1.6.9-2.2z" />
    <path d="M12 17.5v-5" />
    <path d="M12 12.5h-2.5" />
    <path d="M12 12.5h2.5" />
  </svg>
);

export default LineIcon;
