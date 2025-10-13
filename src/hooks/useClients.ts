import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

export type Client = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*');
    if (error) {
      console.error('Error fetching clients', error);
      setClients([]);
    } else {
      setClients((data as any[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (payload: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').insert([payload]);
    if (error) throw error;
    await fetchClients();
    return data;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id);
    if (error) throw error;
    await fetchClients();
    return data;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    await fetchClients();
  };

  return { clients, loading, fetchClients, createClient, updateClient, deleteClient };
}


