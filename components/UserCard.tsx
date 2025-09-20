import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile } from '../types';
import UserIcon from './icons/UserIcon';
import { twMerge } from 'tailwind-merge';
import MenuIcon from './icons/MenuIcon';
import PlusIcon from './icons/PlusIcon';
import CheckIcon from './icons/CheckIcon';
import ClockIcon from './icons/ClockIcon';
import MinusIcon from './icons/MinusIcon';
import LockIcon from './icons/LockIcon';

interface UserCardProps {
  user: UserProfile;
  onClick?: (userId: string) => void;
  children?: React.ReactNode;
  isMutual?: boolean; // New prop for mutual follow
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick, children, isMutual }) => {
  const isClickable = !!onClick;
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [overflowRef]);

  const nonButtonChildren = React.Children.toArray(children).filter(child => 
    React.isValidElement(child) && !child.props.isActionButton
  );

  const allActionButtons = React.Children.toArray(children).filter(child => 
    React.isValidElement(child) && child.props.isActionButton
  );

  const overflowItems = React.Children.toArray(children).filter(child => 
    React.isValidElement(child) && child.props.isOverflowItem
  );

  return (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-soft border border-light-border dark:border-dark-border flex flex-col">
      {/* User Info Section */}
      <div 
        className={twMerge("flex-grow", isClickable && "cursor-pointer")}
        onClick={() => onClick && onClick(user.id)}
      >
        <p className="font-bold text-light-text dark:text-dark-text flex items-center gap-2">
          {user.display_name || user.username}
          {isMutual && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">
              相互フォロー
            </span>
          )}
        </p>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary pl-2">@{user.username}</p>
      </div>

      {/* Separator */}
      <div className="border-t border-light-border dark:border-dark-border my-3"></div>

      {/* Action Buttons Section */}
      <div className="flex flex-wrap gap-2 relative" ref={overflowRef}> {/* Changed to flex-wrap for flowing buttons */}
        {nonButtonChildren} {/* Render non-button children directly (if any) */}

        {allActionButtons.map((child, index) => React.cloneElement(child, { 
          key: index, // Use index as key for now, assuming order is stable
          className: twMerge("px-3 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center justify-center gap-1", child.props.className), // Apply base button styles
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); child.props.onClick(e); }
        }))}

        {/* Overflow menu toggle (if needed, not implemented in this specific layout) */}
        {/* {overflowItems.length > 0 && ( */}
        {/*   <button  */}
        {/*     onClick={(e) => { e.stopPropagation(); setIsOverflowOpen(!isOverflowOpen); }} */}
        {/*     className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 text-light-text-secondary dark:text-dark-text-secondary" */}
        {/*   > */}
        {/*     <MenuIcon className="w-5 h-5" /> */}
        {/*   </button> */}
        {/* )} */}

        {/* {isOverflowOpen && ( */}
        {/*   <div className="absolute right-0 top-full mt-2 w-40 bg-light-card dark:bg-dark-card rounded-lg shadow-lg border border-light-border dark:border-dark-border z-10"> */}
        {/*     {overflowItems.map(child => React.cloneElement(child, {  */}
        {/*       className: twMerge("block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/50", child.props.className), */}
        {/*       onClick: (e: React.MouseEvent) => { e.stopPropagation(); setIsOverflowOpen(false); child.props.onClick(e); } */}
        {/*     }))} */}
        {/*   </div> */}
        {/* )} */}
      </div>
    </div>
  );
};

export default UserCard;