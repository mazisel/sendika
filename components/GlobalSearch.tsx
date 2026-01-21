'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, ChevronRight } from 'lucide-react';

interface MenuItem {
    title: string;
    href: string;
    icon: any;
    description: string;
    items?: MenuItem[];
}

interface GlobalSearchProps {
    menuItems: MenuItem[];
}

interface SearchResult {
    title: string;
    href: string;
    description: string;
    group?: string;
    icon: any;
}

export default function GlobalSearch({ menuItems }: GlobalSearchProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Flatten menu items for search
    useEffect(() => {
        const flattenItems = (items: MenuItem[], parentTitle?: string): SearchResult[] => {
            let flat: SearchResult[] = [];

            items.forEach(item => {
                // Add current item if it has a valid href (not just a container)
                if (item.href && item.href !== '#') {
                    flat.push({
                        title: item.title,
                        href: item.href,
                        description: item.description,
                        group: parentTitle,
                        icon: item.icon
                    });
                }

                // Process children
                if (item.items && item.items.length > 0) {
                    flat = [...flat, ...flattenItems(item.items, item.title)];
                }
            });

            return flat;
        };

        const allItems = flattenItems(menuItems);

        if (!query) {
            setResults([]);
            return;
        }

        const searchBuffer = query.toLowerCase();
        const filtered = allItems.filter(item =>
            item.title.toLowerCase().includes(searchBuffer) ||
            item.description.toLowerCase().includes(searchBuffer) ||
            (item.group && item.group.toLowerCase().includes(searchBuffer))
        );

        setResults(filtered);
        setSelectedIndex(0);
    }, [query, menuItems]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    // Global shortcut listener
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const handleSelect = (result: SearchResult) => {
        router.push(result.href);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="relative w-full max-w-sm mr-4 hidden md:block" ref={containerRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Ekran ara... (Örn: Üyeler, İstatistikler)"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5">⌘K</span>
                </div>
            </div>

            {/* Results Dropdown */}
            {isOpen && query && (
                <div className="absolute mt-1 w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto z-50">
                    {results.length > 0 ? (
                        <div className="py-1">
                            {results.map((result, index) => {
                                const Icon = result.icon;
                                return (
                                    <button
                                        key={`${result.href}-${index}`}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full text-left px-4 py-3 flex items-start space-x-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${index === selectedIndex ? 'bg-slate-50 dark:bg-slate-800' : ''
                                            }`}
                                    >
                                        <div className={`mt-0.5 p-1.5 rounded-lg ${index === selectedIndex ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center">
                                                {result.title}
                                                {result.group && (
                                                    <span className="ml-2 flex items-center text-xs text-slate-400 font-normal">
                                                        <ChevronRight className="w-3 h-3 mx-0.5" />
                                                        {result.group}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                {result.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Sonuç bulunamadı: "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
