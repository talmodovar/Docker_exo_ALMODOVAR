'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AppContext';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading = false,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const { isDarkMode } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, tweets..."
          className={`w-full pl-10 pr-16 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            isDarkMode 
              ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-400' 
              : 'bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-500'
          }`}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            isLoading || !query.trim()
              ? 'bg-purple-300 text-white cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
        >
          {isLoading ? '...' : 'Search'}
        </button>
      </div>
    </form>
  );
};