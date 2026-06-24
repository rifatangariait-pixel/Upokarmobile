import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface AlertProps {
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info';
}

export function AiInsights() {
  const [insights, setInsights] = useState<AlertProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Grab necessary state from store to send to the AI
  const phones = useStore((state) => state.phones);
  const sales = useStore((state) => state.emiSales);
  const collections = useStore((state) => state.collections);
  const customers = useStore((state) => state.customers);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            phones: phones.map(p => ({
              model: p.model, brand: p.brand, status: p.status, price: (p.stockType === 'USED' || p.stockType === 'DIAMOND') ? (p.customerSellingPrice || 0) : p.sellingPrice
            })),
            sales: sales.slice(-100).map(s => ({
              id: s.id, totalPrice: s.totalPrice, date: s.saleDate,
              monthlyInstallment: s.monthlyInstallment, paidInstallments: s.paidInstallments,
              status: s.status
            })),
            collections: collections.slice(-100).map(c => ({
              amount: c.amountPaid, date: c.paymentDate, type: c.paymentType
            })),
            customers: customers.map(c => ({
              status: c.riskRating
            }))
          }
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch insights');
      }

      setInsights(result.insights || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Business Insights
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Powered by Gemini, analyze your inventory and EMI sales to predict trends and mitigate risks.
          </p>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate Insights
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {insights.length === 0 && !loading && !error && (
        <div className="p-12 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Ready to Analyze</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            Click the generate button above to identify risk patterns, top performing brands, and actionable steps for your business.
          </p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-1">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-5 rounded-lg border flex gap-4 transition-all ${
                insight.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                insight.type === 'success' ? 'bg-green-50 border-green-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="shrink-0 mt-1">
                {insight.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-orange-600" /> :
                 insight.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                 <Info className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <h3 className={`font-semibold ${
                  insight.type === 'warning' ? 'text-orange-900' :
                  insight.type === 'success' ? 'text-green-900' :
                  'text-blue-900'
                }`}>
                  {insight.title}
                </h3>
                <p className={`mt-1 text-sm ${
                  insight.type === 'warning' ? 'text-orange-700' :
                  insight.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }`}>
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
