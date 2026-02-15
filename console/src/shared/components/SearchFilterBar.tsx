import React from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@/features/dashboard/context/LanguageContext';

interface SearchOption {
    value: string;
    label: string;
}

interface SearchFilterBarProps {
    keyword: string;
    setKeyword: (val: string) => void;
    filter: string;
    setFilter: (val: string) => void;
    onSearch: (e: React.FormEvent) => void;
    options: SearchOption[];
    placeholder?: string;
}

export function SearchFilterBar({
    keyword,
    setKeyword,
    filter,
    setFilter,
    onSearch,
    options,
    placeholder = "Search..."
}: SearchFilterBarProps) {
    const { t } = useLanguage();

    return (
        <form onSubmit={onSearch} className="flex gap-2">
            <select
                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder={placeholder}
                    className="pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-sm"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />
            </div>
            <button
                type="submit"
                className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-900"
            >
                검색
            </button>
        </form>
    );
}
