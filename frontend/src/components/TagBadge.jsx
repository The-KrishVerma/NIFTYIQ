// import React from 'react';
// import { cn } from '../utils/cn';

// export default function TagBadge({ label, className }) {
//   if (!label) return null;

//   const getStyle = () => {
//     switch (label.toLowerCase()) {
//       case 'dash pick':
//         return 'bg-green-500/20 text-green-400 border border-green-500/30';
//       case 'watchlist':
//         return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
//       case 'avoid':
//         return 'bg-red-500/20 text-red-400 border border-red-500/30';
//       default:
//         return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
//     }
//   };

//   return (
//     <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStyle(), className)}>
//       {label}
//     </span>
//   );
// }


import React from 'react';
import { cn } from '../utils/cn';

export default function TagBadge({ label, colorOverride }) {
  // Agar IndexDashboard se colorOverride aa raha hai toh wahi dikhao
  // Warna default styles use karo
  const defaultStyles = {
    'dash pick': 'bg-green-500/10 text-green-400 border-green-500/20',
    'watchlist': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'avoid': 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  // FIX: colorOverride ko pehle priority do
  const badgeClass = colorOverride || defaultStyles[label?.toLowerCase()] || 'bg-gray-500/10 text-gray-400 border-gray-700';

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border inline-block whitespace-nowrap transition-all duration-300", 
      badgeClass
    )}>
      {label}
    </span>
  );
}