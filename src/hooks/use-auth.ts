import { useState, useEffect } from 'react';
import { User } from '@/src/types';
import { toast } from 'sonner';

const STORAGE_KEY = 'clfs_users';
const AUTH_KEY = 'clfs_auth_user';

const DEFAULT_ADMIN: User = {
  uid: 'admin-1',
  email: 'h.rehman@asu.edu.om',
  fullName: 'System Administrator',
  role: 'admin',
  approved: true,
  username: 'admin',
  password: 'hrk26'
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<{ [key: string]: User }>({});

  useEffect(() => {
    const storedUsers = localStorage.getItem(STORAGE_KEY);
    if (storedUsers) {
      setAllUsers(JSON.parse(storedUsers));
    } else {
      const initialUsers = { [DEFAULT_ADMIN.username!]: DEFAULT_ADMIN };
      setAllUsers(initialUsers);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers));
    }

    const authUser = localStorage.getItem(AUTH_KEY);
    if (authUser) {
      setUser(JSON.parse(authUser));
    }
    setLoading(false);
  }, []);

  const login = async (username?: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!username || !password) return { success: false, error: 'Username and password required' };
    
    const foundUser = allUsers[username];
    
    if (foundUser) {
      if (foundUser.password !== password) return { success: false, error: 'Invalid credentials' };
      if (!foundUser.approved) return { success: false, error: 'Account pending approval' };
      setUser(foundUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(foundUser));
      return { success: true };
    }
    
    return { success: false, error: 'Please contact Admin to add your credentials' };
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const addUser = (newUser: User) => {
    const updated = { ...allUsers, [newUser.username!]: newUser };
    setAllUsers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteUser = (username: string) => {
    const updated = { ...allUsers };
    delete updated[username];
    setAllUsers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const approveUser = (username: string) => {
    const updated = { ...allUsers };
    if (updated[username]) {
      updated[username].approved = true;
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const resetPassword = (username: string, newPassword: string) => {
    const updated = { ...allUsers };
    if (updated[username]) {
      updated[username].password = newPassword;
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const importUsers = (users: Record<string, User>) => {
    setAllUsers(users);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  };

  const changePassword = (newPassword: string) => {
    if (!user) return;
    const updated = { ...allUsers };
    if (updated[user.username!]) {
      updated[user.username!].password = newPassword;
      updated[user.username!].mustChangePassword = false;
      
      const updatedUser = { ...user, password: newPassword, mustChangePassword: false };
      setUser(updatedUser);
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
      toast.success("Password changed successfully");
    }
  };

  const skipPasswordChange = () => {
    if (!user) return;
    const updated = { ...allUsers };
    if (updated[user.username!]) {
      updated[user.username!].mustChangePassword = false;
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
      toast.info("Password change skipped. Default password kept.");
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    addUser,
    deleteUser,
    approveUser,
    resetPassword,
    importUsers,
    changePassword,
    skipPasswordChange,
    allUsers
  };
}
