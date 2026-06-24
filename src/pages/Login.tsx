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
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const success = await login(username, password);
      if (!success) {
        toast.error('Invalid username or password');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-wider text-primary">উপকার</CardTitle>
          <p className="text-sm font-medium text-muted-foreground">আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায় সমিতির অঙ্গসংগঠন</p>
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
            <div className="space-y-2">
               <label className="text-sm font-medium">Password</label>
               <Input 
                 type="password"
                 placeholder="Enter your password" 
                 required 
                 value={password} 
                 onChange={(e) => setPassword(e.target.value)} 
               />
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t text-center">
             <Button variant="link" className="text-sm" onClick={() => window.location.href = '/phones'}>Go to Public Portal</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
