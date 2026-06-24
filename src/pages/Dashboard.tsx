import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Smartphone, Users, CreditCard, TrendingUp, AlertTriangle, Gem } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../components/ui/Modal';

const formatBDT = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT' }).format(amount);

export function Dashboard() {
  const { phones, customers, emiSales, collections, currentUser } = useStore();
  const [isReservedModalOpen, setIsReservedModalOpen] = useState(false);

  if (currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied. Admins only.</div>;
  }
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const getDailyStats = (type: 'NEW' | 'USED') => {
    const typePhones = phones.filter(p => (p.stockType || 'NEW') === type);
    const totalStock = typePhones.filter(p => p.status === 'Available').length;
    
    const soldToday = emiSales.filter(s => {
      const p = phones.find(ph => ph.id === s.phoneId);
      return s.saleDate.startsWith(todayStr) && (p?.stockType || 'NEW') === type;
    });
    
    const collectionsToday = collections.filter(c => {
      const s = emiSales.find(sale => sale.id === c.emiSaleId);
      const p = phones.find(ph => ph.id === s?.phoneId);
      return c.paymentDate.startsWith(todayStr) && (p?.stockType || 'NEW') === type;
    });
    
    const collectionAmount = collectionsToday.reduce((acc, c) => acc + Number(c.amountPaid), 0);
    
    const profitToday = soldToday.reduce((acc, s) => {
      const p = phones.find(ph => ph.id === s.phoneId);
      if (!p) return acc;
      let profit = p.sellingPrice - p.purchasePrice;
      if (type === 'USED' && p.repairCost) profit -= p.repairCost;
      return acc + profit;
    }, 0);

    return { totalStock, soldToday: soldToday.length, collectionAmount, profitToday };
  };

  const newPhoneStats = getDailyStats('NEW');
  const usedPhoneStats = getDailyStats('USED');

  const totalStockValue = phones.filter(p => ['Available', 'Reserved'].includes(p.status)).reduce((acc, p) => acc + p.sellingPrice, 0);
  const availablePhones = phones.filter(p => p.status === 'Available').length;
  const reservedPhonesList = phones.filter(p => p.status === 'Reserved');
  const reservedPhones = reservedPhonesList.length;
  const soldPhones = phones.filter(p => p.status === 'Sold').length;
  const returnedPhones = phones.filter(p => p.status === 'Returned').length;
  const damagedPhones = phones.filter(p => p.status === 'Damaged').length;
  
  const activeEmi = emiSales.filter(s => s.status === 'Active').length;
  const totalCollections = collections.reduce((acc, c) => acc + Number(c.amountPaid), 0);

  // Stats Card data
  const stats = [
    { title: 'মোট স্টক মূল্য (Stock Value)', value: formatBDT(totalStockValue), icon: Smartphone, color: 'text-blue-500' },
    { title: 'অবশিষ্ট ফোন (Available)', value: availablePhones, icon: Smartphone, color: 'text-indigo-500' },
    { title: 'Reserved', value: reservedPhones, icon: Smartphone, color: 'text-cyan-500', onClick: () => setIsReservedModalOpen(true) },
    { title: 'বিক্রি হওয়া ফোন (Sold)', value: soldPhones, icon: TrendingUp, color: 'text-green-500' },
    { title: 'Returned', value: returnedPhones, icon: Smartphone, color: 'text-orange-500' },
    { title: 'Damaged', value: damagedPhones, icon: AlertTriangle, color: 'text-red-500' },
    { title: 'চলমান ইএমআই (Active EMI)', value: activeEmi, icon: Users, color: 'text-purple-500' },
    { title: 'সর্বমোট কালেকশন (Collection)', value: formatBDT(totalCollections), icon: CreditCard, color: 'text-emerald-500' },
  ];

  const currentDate = new Date();
  
  // Monthly Trends Calculation
  const monthlyMap = new Map<string, { sales: number; profit: number }>();
  emiSales.forEach(sale => {
    if (!sale.saleDate) return;
    const date = new Date(sale.saleDate);
    const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    const existing = monthlyMap.get(monthYear) || { sales: 0, profit: 0 };
    existing.sales += Number(sale.totalPrice) || 0;
    existing.profit += Number(sale.totalInterest) || 0;
    monthlyMap.set(monthYear, existing);
  });
  
  const monthlyData = Array.from(monthlyMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => {
      // Basic chronological sort trick using dates
      const [mA, yA] = a.name.split(' ');
      const [mB, yB] = b.name.split(' ');
      return new Date(`${mA} 1, 20${yA}`).getTime() - new Date(`${mB} 1, 20${yB}`).getTime();
    });

  // Top Selling Brands Calculation
  const brandMap = new Map<string, number>();
  phones.filter(p => p.status === 'Sold').forEach(p => {
    if (!p.brand) return;
    const existing = brandMap.get(p.brand) || 0;
    brandMap.set(p.brand, existing + 1);
  });
  
  const brandData = Array.from(brandMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Low Stock Calculation
  const stockMap = new Map<string, number>();
  phones.filter(p => p.status === 'Available').forEach(p => {
    const key = `${p.brand} ${p.model}`;
    const existing = stockMap.get(key) || 0;
    stockMap.set(key, existing + 1);
  });
  
  const lowStockAlerts = Array.from(stockMap.entries())
    .filter(([_, count]) => count <= 2)
    .map(([name, count]) => `${name} - Only ${count} left in stock!`);

  // Overdue Installments
  const overdueSales = emiSales.filter(s => {
    if (s.status !== 'Active' || !s.nextDueDate) return false;
    return new Date(s.nextDueDate) < currentDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">ড্যাশবোর্ড (Overview)</h2>
        <p className="text-muted-foreground w-full">আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায় সমিতির অঙ্গসংগঠন</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="py-3 bg-slate-50/50">
             <CardTitle className="text-md text-blue-700">NEW PHONE SUMMARY (TODAY)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
                <p className="text-xs text-muted-foreground">Total Stock (Available)</p>
                <div className="text-xl font-bold">{newPhoneStats.totalStock}</div>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Sold Today</p>
                <div className="text-xl font-bold">{newPhoneStats.soldToday}</div>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Collection Today</p>
                <div className="text-xl font-bold text-emerald-600">৳{newPhoneStats.collectionAmount.toLocaleString()}</div>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Profit Today</p>
                <div className={`text-xl font-bold ${newPhoneStats.profitToday >= 0 ? 'text-blue-600' : 'text-red-600'}`}>৳{newPhoneStats.profitToday.toLocaleString()}</div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="py-3 bg-purple-50/50">
             <CardTitle className="text-md text-purple-700 flex items-center gap-2"><Gem className="w-4 h-4" /> DIAMOND PHONE</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
                <p className="text-xs text-muted-foreground">Total Stock (Available)</p>
                <div className="text-xl font-bold">{usedPhoneStats.totalStock}</div>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Sold Today</p>
                <div className="text-xl font-bold">{usedPhoneStats.soldToday}</div>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Collection Today</p>
                <div className="text-xl font-bold text-emerald-600">৳{usedPhoneStats.collectionAmount.toLocaleString()}</div>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Profit Today</p>
                <div className={`text-xl font-bold ${usedPhoneStats.profitToday >= 0 ? 'text-blue-600' : 'text-red-600'}`}>৳{usedPhoneStats.profitToday.toLocaleString()}</div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className={stat.onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""} onClick={stat.onClick}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>মাসিক কালেকশন ও রিপোর্ট (Monthly Trend)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full mt-4">
              {monthlyData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No Data Available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>শীর্ষ বিক্রীত ব্র্যান্ড (Top Selling Brands)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              {brandData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No Sales Data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-destructive font-semibold">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Low Stock Alerts</p>
            ) : (
              lowStockAlerts.map((alert, idx) => (
                <p key={idx} className="text-sm border-b pb-1 last:border-0">{alert}</p>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-amber-500 font-semibold">Overdue Installments</CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            {overdueSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Overdue Installments</p>
            ) : (
              <p className="text-sm">{overdueSales.length} customers have missed their deadline.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Modal isOpen={isReservedModalOpen} onClose={() => setIsReservedModalOpen(false)} title="Reserved Phones">
        <div className="space-y-2">
          {reservedPhonesList.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">No phones reserved.</p>
          ) : (
            reservedPhonesList.map((p, idx) => (
              <div key={`${p.id}-${idx}`} className="flex justify-between items-center p-3 border rounded-md">
                <div className="text-sm font-medium">{p.brand} {p.model}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>→</span>
                  <span className="font-medium text-foreground">{p.reservedForCustomerName || 'Unknown Customer'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

    </div>
  );
}
