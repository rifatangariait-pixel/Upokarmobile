import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { login, currentUser } = useStore();
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(username);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold uppercase tracking-wider">Angaria ERP</CardTitle>
          <p className="text-sm text-muted-foreground">Staff Login Panel</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
               <label className="text-sm font-medium">Username</label>
               <Input 
                 placeholder="Enter your username" 
                 required 
                 value={username} 
                 onChange={(e) => setUsername(e.target.value)} 
               />
            </div>
            <Button type="submit" className="w-full">Sign In</Button>
            
            <div className="pt-4 text-xs text-muted-foreground text-center space-y-1">
              <p>Demo credentials:</p>
              <p>admin / sales / inventory</p>
            </div>
          </form>
          
          <div className="mt-6 pt-6 border-t text-center">
             <Button variant="link" className="text-sm" onClick={() => window.location.href = '/phones'}>Go to Public Portal</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
