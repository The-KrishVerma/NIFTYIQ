import React from 'react';
import { cn } from '../utils/cn';

export default function Table({ columns, data, className, onRowClick }) {
  if (!data || data.length === 0 || !columns) return null;

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-gray-800 bg-insight-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          
          <thead className="bg-insight-dark text-xs uppercase text-gray-400 border-b border-gray-800">
            <tr>
              {/* Dynamically generate headers based on the columns prop */}
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  scope="col" 
                  className={cn("px-6 py-4 font-semibold", col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="border-b border-gray-800 hover:bg-gray-800/80 cursor-pointer transition-colors duration-200"
                onClick={() => onRowClick ? onRowClick(row) : window.open(`/company/${row.name || row.symbol}`, '_blank')}
              >
                {/* Dynamically generate cells */}
                {columns.map((col, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={cn("px-6 py-4", col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left')}
                  >
                    {/* If a custom render function is passed, use it to style the text. Otherwise, just print the raw data. */}
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          
        </table>
      </div>
    </div>
  );
}