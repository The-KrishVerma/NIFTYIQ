import React from 'react';
import { cn } from '../utils/cn';

export default function MetricCard({ label, value, className }) {
  if (value === null || value === undefined) return null;

  return (
    <div className={cn("p-4 rounded-xl bg-insight-card border border-gray-800 shadow-md flex flex-col items-center justify-center", className)}>
      <p className="text-gray-400 text-sm font-medium mb-1 text-center">{label}</p>
      <p className="text-xl font-bold text-gray-100">{value}</p>
    </div>
  );
}
