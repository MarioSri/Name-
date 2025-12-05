/**
 * Real-time recipient management component
 * Handles dynamic recipient updates across all document systems
 * Uses Supabase for real-time recipient data
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealTimeDocuments } from '@/hooks/useRealTimeDocuments';
import { supabaseStorage } from '@/services/SupabaseStorageService';

interface Recipient {
  id: string;          // UUID from Supabase
  user_id: string;     // user_id field
  name: string;
  role: string;
  department?: string;
  email?: string;
  selected: boolean;
}

interface RealTimeRecipientManagerProps {
  documentId?: string;
  initialRecipients?: string[];
  initialRecipientIds?: string[];
  onRecipientsChange?: (recipients: string[], recipientIds: string[]) => void;
  mode?: 'create' | 'edit';
}

export const RealTimeRecipientManager: React.FC<RealTimeRecipientManagerProps> = ({
  documentId,
  initialRecipients = [],
  initialRecipientIds = [],
  onRecipientsChange,
  mode = 'create'
}) => {
  const { user } = useAuth();
  const { updateRecipients, loading: updateLoading } = useRealTimeDocuments();
  
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recipients from Supabase
  useEffect(() => {
    const loadRecipients = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabaseRecipients = await supabaseStorage.getRecipients();
        
        // Map Supabase data to component format
        const recipients: Recipient[] = supabaseRecipients.map(r => ({
          id: r.id,              // UUID
          user_id: r.user_id,    // user_id for matching
          name: r.name,
          role: r.role,
          department: r.department,
          email: r.email,
          selected: initialRecipientIds.includes(r.id) || 
                   initialRecipientIds.includes(r.user_id) || 
                   initialRecipients.includes(r.name)
        }));

        setAvailableRecipients(recipients);
        setSelectedRecipients(recipients.filter(r => r.selected));
        console.log('✅ Loaded', recipients.length, 'recipients from Supabase');
      } catch (err) {
        console.error('❌ Failed to load recipients:', err);
        setError('Failed to load recipients from database');
      } finally {
        setLoading(false);
      }
    };

    loadRecipients();
  }, [initialRecipients, initialRecipientIds]);

  // Subscribe to real-time recipient updates
  useEffect(() => {
    const channel = supabaseStorage.subscribeToTable('recipients', (payload) => {
      console.log('📡 Recipients update:', payload.eventType);
      
      if (payload.eventType === 'INSERT') {
        const newRecipient: Recipient = {
          id: (payload.new as any).id,
          user_id: (payload.new as any).user_id,
          name: (payload.new as any).name,
          role: (payload.new as any).role,
          department: (payload.new as any).department,
          email: (payload.new as any).email,
          selected: false
        };
        setAvailableRecipients(prev => [...prev, newRecipient]);
      } else if (payload.eventType === 'UPDATE') {
        setAvailableRecipients(prev => prev.map(r => 
          r.id === (payload.new as any).id 
            ? { ...r, ...(payload.new as any), selected: r.selected }
            : r
        ));
      } else if (payload.eventType === 'DELETE') {
        setAvailableRecipients(prev => prev.filter(r => r.id !== (payload.old as any).id));
      }
    });

    return () => {
      channel?.unsubscribe?.();
    };
  }, []);

  // Filter recipients based on search and role
  const filteredRecipients = availableRecipients.filter(recipient => {
    const matchesSearch = recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipient.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipient.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || recipient.role.toLowerCase() === filterRole.toLowerCase();
    
    return matchesSearch && matchesRole;
  });

  // Get unique roles for filter dropdown
  const availableRoles = [...new Set(availableRecipients.map(r => r.role))].sort();

  // Handle recipient selection
  const handleRecipientToggle = (recipient: Recipient) => {
    const updatedRecipients = availableRecipients.map(r => 
      r.id === recipient.id ? { ...r, selected: !r.selected } : r
    );
    
    setAvailableRecipients(updatedRecipients);
    
    const newSelectedRecipients = updatedRecipients.filter(r => r.selected);
    setSelectedRecipients(newSelectedRecipients);
    
    // Notify parent component with user_id for proper Supabase references
    if (onRecipientsChange) {
      const recipients = newSelectedRecipients.map(r => r.name);
      const recipientIds = newSelectedRecipients.map(r => r.user_id);
      onRecipientsChange(recipients, recipientIds);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading recipients...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-red-500">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-4" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Handle real-time update
  const handleUpdateRecipients = async () => {
    if (!documentId) return;
    
    try {
      const recipients = selectedRecipients.map(r => r.name);
      const recipientIds = selectedRecipients.map(r => r.id);
      
      await updateRecipients(documentId, recipients, recipientIds);
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Recipients Updated',
          description: 'Document recipients have been updated in real-time',
          type: 'success'
        }
      }));
      
    } catch (error) {
      console.error('Failed to update recipients:', error);
      
      // Show error notification
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Update Failed',
          description: 'Failed to update recipients. Please try again.',
          type: 'error'
        }
      }));
    }
  };

  // Get unique roles for filter
  const uniqueRoles = [...new Set(availableRecipients.map(r => r.role))];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Real-Time Recipient Management
          {selectedRecipients.length > 0 && (
            <Badge variant="secondary">{selectedRecipients.length} selected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Recipients</Label>
            <Input
              id="search"
              placeholder="Search by name, role, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Label htmlFor="role-filter">Filter by Role</Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Recipients */}
        {selectedRecipients.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Recipients ({selectedRecipients.length})</Label>
            <div className="flex flex-wrap gap-2">
              {selectedRecipients.map(recipient => (
                <Badge key={recipient.id} variant="default" className="flex items-center gap-1">
                  {recipient.name}
                  <button
                    onClick={() => handleRecipientToggle(recipient)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Recipients */}
        <div className="space-y-2">
          <Label>Available Recipients</Label>
          <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
            {filteredRecipients.map(recipient => (
              <div
                key={recipient.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => handleRecipientToggle(recipient)}
              >
                <Checkbox
                  checked={recipient.selected}
                  onChange={() => handleRecipientToggle(recipient)}
                />
                <div className="flex-1">
                  <div className="font-medium">{recipient.name}</div>
                  <div className="text-sm text-gray-500">
                    {recipient.role} • {recipient.department}
                  </div>
                </div>
                <Badge variant="outline">{recipient.role}</Badge>
              </div>
            ))}
            
            {filteredRecipients.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No recipients found matching your criteria
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {mode === 'edit' && documentId && (
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleUpdateRecipients}
              disabled={loading || selectedRecipients.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Update Recipients
            </Button>
          </div>
        )}

        {/* Real-time Status */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Real-time updates enabled
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeRecipientManager;