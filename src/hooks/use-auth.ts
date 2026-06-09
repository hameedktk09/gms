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

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.users);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.users));
      }
    } catch (e) {
      console.warn("Failed to fetch users, using stored:", e);
    }
  };

  useEffect(() => {
    // Sync local storage immediately for fast loads
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
    
    // Fetch fresh database from the backend
    fetchUsers().finally(() => {
      setLoading(false);
    });
  }, []);

  const login = async (username?: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    console.log('Login attempt for:', username);
    if (!username || !password) return { success: false, error: 'Username and password required' };
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
        await fetchUsers(); // load rest of database users
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (e: any) {
      console.warn('Backend login query failed, rolling back to local storage auth', e);
      // Fallback
      const foundUser = allUsers[username];
      if (foundUser) {
        if (foundUser.password !== password) return { success: false, error: 'Invalid credentials' };
        if (!foundUser.approved) return { success: false, error: 'Account pending approval' };
        setUser(foundUser);
        localStorage.setItem(AUTH_KEY, JSON.stringify(foundUser));
        return { success: true };
      }
      return { success: false, error: 'Please contact Admin to add your credentials' };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const addUser = async (newUser: User) => {
    const updated = { ...allUsers, [newUser.username!]: newUser };
    setAllUsers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
    } catch (e) {
      console.error("Backend add user failed:", e);
    }
  };

  const deleteUser = async (username: string) => {
    const updated = { ...allUsers };
    delete updated[username];
    setAllUsers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch(`/api/admin/users/${username}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.error("Backend delete user failed:", e);
    }
  };

  const approveUser = async (username: string) => {
    const updated = { ...allUsers };
    if (updated[username]) {
      updated[username].approved = true;
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      await fetch(`/api/admin/users/${username}/approve`, {
        method: "PUT"
      });
    } catch (e) {
      console.error("Backend approve user failed:", e);
    }
  };

  const resetPassword = async (username: string, newPassword: string) => {
    const updated = { ...allUsers };
    if (updated[username]) {
      updated[username].password = newPassword;
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      await fetch(`/api/admin/users/${username}/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
      });
    } catch (e) {
      console.error("Backend reset password failed:", e);
    }
  };

  const importUsers = async (users: Record<string, User>) => {
    setAllUsers(users);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

    try {
      await fetch("/api/admin/import-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users })
      });
    } catch (e) {
      console.error("Backend import users failed:", e);
    }
  };

  const changePassword = async (newPassword: string) => {
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
      
      try {
        await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username, newPassword })
        });
        toast.success("Password changed successfully");
      } catch (e) {
        console.error("Backend change password failed:", e);
      }
    }
  };

  const skipPasswordChange = async () => {
    if (!user) return;
    const updated = { ...allUsers };
    if (updated[user.username!]) {
      updated[user.username!].mustChangePassword = false;
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      setAllUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
      
      try {
        await fetch("/api/auth/skip-password-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username })
        });
        toast.info("Password change skipped. Default password kept.");
      } catch (e) {
        console.error("Backend skip password change failed:", e);
      }
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
