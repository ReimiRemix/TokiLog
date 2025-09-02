import React from 'react';

const CustomLogIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 2v20"></path>
    <path d="M12 5v17"></path>
    <path d="M8 2v20"></path>
    <path d="M4 12h16"></path>
  </svg>
);

export default CustomLogIcon;
