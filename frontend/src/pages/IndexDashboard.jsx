import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, TrendingUp } from 'lucide-react';
import Table from '../components/Table';
import { fetchIndexScores, fetchAllSectors } from '../utils/dataFetcher';


export default function IndexDashboard() {
    const [indexData, setIndexData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadIndexData = async () => {
            try {
                // Fetch BOTH the company scores AND the sector schemas at the same time
                const [scoresData, sectorsData] = await Promise.all([
                    fetchIndexScores(),
                    fetchAllSectors()
                ]);

                if (!scoresData || !Array.isArray(scoresData) || scoresData.length === 0) {
                    console.warn("No companies returned from API");
                    setLoading(false);
                    return;
                }

                // 1. Build a BULLETPROOF lookup dictionary
                const industryMap = {};

                if (sectorsData && Array.isArray(sectorsData)) {
                    sectorsData.forEach(sector => {
                        const indName = sector.industry ? sector.industry.replace(/_/g, ' ') : null;
                        if (!indName) return;

                        // Check Path 1: Root level company_justifications (From your exact schema)
                        if (Array.isArray(sector.company_justifications)) {
                            sector.company_justifications.forEach(item => {
                                if (item.company) industryMap[item.company.toUpperCase()] = indName;
                            });
                        }

                        // Check Path 2: Nested inside rankings (From your earlier CompanyDashboard code)
                        if (sector.rankings?.fundamental_investor && Array.isArray(sector.rankings.fundamental_investor)) {
                            sector.rankings.fundamental_investor.forEach(item => {
                                if (item.company) industryMap[item.company.toUpperCase()] = indName;
                            });
                        }

                        // Check Path 3: Nested company_justifications inside rankings
                        if (sector.rankings?.company_justifications && Array.isArray(sector.rankings.company_justifications)) {
                            sector.rankings.company_justifications.forEach(item => {
                                if (item.company) industryMap[item.company.toUpperCase()] = indName;
                            });
                        }
                    });
                }

                console.log("✅ Successfully mapped industries for", Object.keys(industryMap).length, "companies");

                // 2. Map the data and inject the real industry name from our dictionary
                const formattedData = scoresData
                    .filter(item => {
                        const val = parseFloat(item.fundamental_score);
                        return !isNaN(val) && val !== 0;
                    })
                    .map(item => {
                        // Ensure we check the map using UPPERCASE to avoid mismatch bugs
                        const safeSymbol = (item.symbol || '').toUpperCase();

                        return {
                            name: item.symbol,
                            industry: industryMap[safeSymbol] || 'Unclassified',
                            score: parseFloat(item.fundamental_score).toFixed(2),
                            val: !isNaN(parseFloat(item.z_score))
                                ? parseFloat(item.z_score).toFixed(4)
                                : 'N/A'
                        };
                    });

                // Sort by Z-Score descending (Best overall companies first)
                formattedData.sort((a, b) => parseFloat(b.val) - parseFloat(a.val));

                setIndexData(formattedData);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch index scores:", err);
                setLoading(false);
            }
        };
        loadIndexData();
    }, []);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Index Leaderboard...</div>;

    if (!indexData || indexData.length === 0) {
        return <div className="p-10 text-center text-gray-400">No companies data available.</div>;
    }

    // ==========================================
    // ADDED: Define the columns for this specific table
    // ==========================================
    const indexColumns = [
        {
            header: 'Company Name',
            accessor: 'name',
            // Custom render function makes the symbol bold and white
            render: (row) => <span className="font-bold text-gray-100">{row.name}</span>
        },
        {
            header: 'Industry',
            accessor: 'industry'
        },
        {
            header: 'Fund. Score',
            accessor: 'score',
            align: 'center',
            // Custom render function gives it a techy monospace font
            render: (row) => <span className="font-mono text-gray-300">{row.score}</span>
        },
        {
            header: 'Global Z-Score',
            accessor: 'val',
            align: 'center',
            // Custom render function makes the Z-score pop with insight-blue
            render: (row) => <span className="font-mono font-bold text-insight-blue-soft">{row.val}</span>
        }
    ];
    // ==========================================

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 fade-in">
            <div className="flex items-center justify-between mb-2">
                <Link to="/" className="text-gray-500 hover:text-insight-blue-soft transition-colors flex items-center gap-2 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
            </div>

            <header className="bg-insight-card p-8 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-insight-blue/20 rounded-lg text-insight-blue">
                            <Globe size={24} className="text-insight-blue" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-100">Whole Index Leaderboard</h1>
                    </div>
                    {/* Cleaned up header description */}
                    <p className="text-gray-400 max-w-2xl">
                        A global comparison of all companies standardized by their <strong>Global Z-Score</strong> and Fundamental Score. Ranked from highest to lowest.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-insight-blue/5 rounded-full blur-[100px]" />
            </header>

            <section>
                <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold flex items-center gap-2">
                        <TrendingUp size={16} /> Global Rankings
                    </h2>
                    <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700">
                        Total Companies: {indexData.length}
                    </span>
                </div>

                {/* ADDED: Pass the columns array into the Table component */}
                <Table
                    columns={indexColumns}
                    data={indexData}
                    onRowClick={(row) => navigate(`/company/${row.name}`)}
                />
            </section>
        </div>
    );
}