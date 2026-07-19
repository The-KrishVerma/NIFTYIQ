import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';

// 🟢 Import your fetch functions (Adjust the path if your dataFetcher is in a different folder)
import { fetchIndustrySummary, fetchAllCompanies } from '../utils/dataFetcher';

export default function SearchBar({ className }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [options, setOptions] = useState([]); // 🟢 Replaced useMemo with state for API data

  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  // 🟢 NEW: Fetch BOTH Companies and Industries from the API on load
  useEffect(() => {
    async function loadSearchData() {
      let opts = [];
      try {
        // 1. Fetch Companies
        const companies = await fetchAllCompanies();
        companies.forEach(symbol => {
          opts.push({ label: symbol, type: 'company', value: symbol });
        });

        // 2. Fetch Industries
        const indSummary = await fetchIndustrySummary();
        if (indSummary?.rankings) {
          indSummary.rankings.forEach(r => {
            if (r.industry) {
              const displayName = r.industry.replace(/_/g, ' ');
              opts.push({ label: displayName, type: 'industry', value: r.industry });
            }
          });
        }

        setOptions(opts);
      } catch (e) {
        console.error("Error loading search options from API:", e);
      }
    }

    loadSearchData();
  }, []);

  const filteredOptions = query.trim() === ''
    ? []
    : options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/company/${query.trim().toUpperCase()}`);
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelect = (opt) => {
    setQuery(opt.label);
    setShowDropdown(false);
    setSelectedIndex(-1);
    if (opt.type === 'company') {
      navigate(`/company/${opt.value.toUpperCase()}`);
    } else {
      navigate(`/industry/${opt.value}`);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full max-w-xl", className)}>
      <form onSubmit={handleSearch}>
        <div className="relative flex items-center w-full h-14 rounded-full focus-within:shadow-lg bg-insight-card border border-gray-700 overflow-hidden transition-all duration-300 focus-within:border-insight-blue focus-within:ring-2 focus-within:ring-insight-blue/20">
          <div className="grid place-items-center h-full w-12 text-gray-400">
            <Search size={20} />
          </div>
          <input
            className="peer h-full w-full outline-none text-sm text-gray-100 bg-transparent pr-2 placeholder-gray-500"
            type="text"
            id="search"
            placeholder="Search by company or industry..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <button type="submit" className="h-full px-6 bg-gradient-to-r from-insight-blue via-insight-blue-soft to-insight-blue-lighter text-gray-900 font-semibold text-sm hover:opacity-90 transition-opacity">
  Search
</button>
        </div>
      </form>

      {showDropdown && filteredOptions.length > 0 && (
        <div className="absolute z-[999] top-full mt-2 left-0 w-full bg-insight-dark border border-insight-border rounded-xl overflow-hidden shadow-2xl">
          <ul className="max-h-64 overflow-y-auto w-full">
            {filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-gray-800/50 last:border-none transition-colors ${selectedIndex === idx ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setSelectedIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="text-sm font-medium text-gray-200">{opt.label}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 capitalize">{opt.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}