import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Sale } from '../types';
import { Package, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalProfit: 0,
    lowStockCount: 0
  });
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!db) {
          setLoading(false);
          return;
      }
      setLoading(true);
      try {
        // 1. Fetch Products for Inventory Stats
        const productsSnap = await getDocs(collection(db, 'products'));
        let prodCount = 0;
        let lowStock = 0;
        const lowStockList: Product[] = [];

        productsSnap.forEach((doc) => {
          prodCount++;
          const data = doc.data() as Omit<Product, 'id'>;
          if (data.stock < 5) {
            lowStock++;
            lowStockList.push({ id: doc.id, ...data });
          }
        });

        // 2. Fetch All Sales for Revenue Stats (Might need optimization for huge datasets, okay for MVP)
        // For chart, we'll just group by day for the last 7 days approximately if we had enough data.
        // For simplicity in this demo, we'll load all sales to calc total.
        const salesSnap = await getDocs(query(collection(db, 'sales'), orderBy('date', 'desc')));
        let revenue = 0;
        let profit = 0;
        const salesData: Sale[] = [];
        const dailyMap: Record<string, number> = {};

        salesSnap.forEach((doc) => {
          const data = doc.data() as Omit<Sale, 'id'>;
          revenue += data.totalAmount;
          profit += data.profit;
          salesData.push({ id: doc.id, ...data });

          // Prepare chart data (last 7 days roughly based on data availability)
          const dateStr = new Date(data.date).toLocaleDateString();
          dailyMap[dateStr] = (dailyMap[dateStr] || 0) + data.totalAmount;
        });

        setStats({
          totalProducts: prodCount,
          totalRevenue: revenue,
          totalProfit: profit,
          lowStockCount: lowStock
        });
        setLowStockItems(lowStockList);
        setRecentSales(salesData.slice(0, 5)); // Top 5 recent

        // Format chart data
        const chart = Object.keys(dailyMap).slice(-7).map(date => ({
            name: date,
            sales: dailyMap[date]
        }));
        setChartData(chart);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!db) {
      return <div className="p-4 text-red-500">Database not configured.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading dashboard...</div>;
  }

  const StatCard = ({ title, value, icon: Icon, color, bgColor }: any) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
      <div className={`p-3 rounded-full ${bgColor} mr-4`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title="Total Profit"
          value={`$${stats.totalProfit.toFixed(2)}`}
          icon={TrendingUp}
          color="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          color="text-red-600 dark:text-red-400"
          bgColor="bg-red-100 dark:bg-red-900/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area - Spans 2 cols on large screens */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Sales Trend (Recent Days)</h2>
          <div className="h-80">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#F3F4F6' }}
                        itemStyle={{ color: '#10B981' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Sales ($)" />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No sales data yet</div>
            )}
          </div>
        </div>

        {/* Low Stock & Recent Sales Sidebar */}
        <div className="space-y-6">
            {/* Low Stock */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    Low Stock Alerts
                </h2>
                {lowStockItems.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">All items are well stocked.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
                    {lowStockItems.map(item => (
                        <li key={item.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Category: {item.category}</p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                {item.stock} left
                            </span>
                        </li>
                    ))}
                    </ul>
                )}
            </div>

            {/* Recent Sales */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Sales</h2>
                 {recentSales.length === 0 ? (
                     <p className="text-gray-500 dark:text-gray-400 text-sm">No sales yet.</p>
                 ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentSales.map(sale => (
                            <li key={sale.id} className="py-3">
                                <div className="flex justify-between">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.productName}</p>
                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">+${sale.totalAmount}</p>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>Qty: {sale.quantity}</span>
                                    <span>{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
