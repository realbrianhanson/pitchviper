import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ToolkitItemType = 'quick_win' | 'battlecard' | 'proof_point' | 'script';

export interface ToolkitItem {
  id: string;
  team_id: string | null;
  item_type: ToolkitItemType;
  category: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ToolkitUsage {
  id: string;
  user_id: string;
  item_id: string;
  used_at: string;
}

export function useToolkit() {
  const { user } = useAuth();
  const [items, setItems] = useState<ToolkitItem[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from('toolkit_items' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order')) as any;

      if (error) throw error;

      setItems((data || []).map((item: any) => ({
        ...item,
        item_type: item.item_type as ToolkitItemType,
        metadata: item.metadata || {}
      })));
    } catch (error) {
      console.error('Error fetching toolkit items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('toolkit_usage' as any)
        .select('item_id')
        .eq('user_id', user.id)
        .order('used_at', { ascending: false })
        .limit(20)) as any;

      if (error) throw error;

      const uniqueItemIds = [...new Set((data || []).map((u: any) => u.item_id))] as string[];
      setRecentlyUsed(uniqueItemIds);
    } catch (error) {
      console.error('Error fetching toolkit usage:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user]);

  const trackUsage = async (itemId: string) => {
    if (!user) return;

    try {
      await (supabase
        .from('toolkit_usage' as any)
        .insert({
          user_id: user.id,
          item_id: itemId
        })) as any;

      // Update local recently used
      setRecentlyUsed(prev => {
        const filtered = prev.filter(id => id !== itemId);
        return [itemId, ...filtered].slice(0, 20);
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  // Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  // Get items by type
  const getItemsByType = (type: ToolkitItemType) => 
    filteredItems.filter(item => item.item_type === type);

  // Get items grouped by category
  const getItemsByTypeAndCategory = (type: ToolkitItemType) => {
    const typeItems = getItemsByType(type);
    const grouped: Record<string, ToolkitItem[]> = {};
    
    typeItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    return grouped;
  };

  // Sort with recently used at top
  const sortWithRecentFirst = (typeItems: ToolkitItem[]) => {
    return [...typeItems].sort((a, b) => {
      const aIndex = recentlyUsed.indexOf(a.id);
      const bIndex = recentlyUsed.indexOf(b.id);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.sort_order - b.sort_order;
    });
  };

  return {
    items: filteredItems,
    isLoading,
    searchQuery,
    setSearchQuery,
    getItemsByType,
    getItemsByTypeAndCategory,
    sortWithRecentFirst,
    recentlyUsed,
    trackUsage,
    refetch: fetchItems
  };
}
