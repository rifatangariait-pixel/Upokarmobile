import React from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function Reservations() {
  const { reservations, updateReservationStatus, currentUser } = useStore();

  const handleStatusChange = async (id: string, newStatus: any) => {
    await updateReservationStatus(id, newStatus);
    toast.success(`Reservation ${newStatus}`);
  };

  if (currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reservations</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Phone Model</th>
                  <th className="px-4 py-3 font-medium">IMEI</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No reservation requests found.
                    </td>
                  </tr>
                ) : (
                  reservations.map((res, idx) => (
                    <tr key={`${res.id}-${idx}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {res.requestDate ? format(new Date(res.requestDate), 'dd MMM yyyy') : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{res.customerName}</div>
                        <div className="text-xs text-muted-foreground">{res.mobile}</div>
                      </td>
                      <td className="px-4 py-3">{res.phoneModel}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{res.imei}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          res.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          res.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {res.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleStatusChange(res.id, 'Approved')}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange(res.id, 'Rejected')}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
