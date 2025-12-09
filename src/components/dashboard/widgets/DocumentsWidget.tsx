import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { AISummarizerModal } from '@/components/AISummarizerModal';
import { supabase } from '@/lib/supabase';
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  User,
  Calendar,
  Building,
  Zap,
  Filter,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: 'Letter' | 'Circular' | 'Report';
  status: 'pending' | 'approved' | 'rejected' | 'in-review' | 'emergency';
  submittedBy: string;
  submittedByRole: string;
  department: string;
  branch?: string;
  year?: string;
  date: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  requiresAction: boolean;
  escalationLevel: number;
  aiSummary?: string;
  approvalCard?: any;  // Store reference to original approval card
}

interface DocumentsWidgetProps {
  userRole: string;
  permissions: any;
  isCustomizing?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const DocumentsWidget: React.FC<DocumentsWidgetProps> = ({
  userRole,
  permissions,
  isCustomizing,
  onSelect,
  isSelected
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'emergency'>('all');
  const [loading, setLoading] = useState(true);
  const [showAISummarizer, setShowAISummarizer] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
  // Refs for debouncing
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Helper function to check if current user is in recipients list
  const isUserInRecipients = useCallback((doc: any): boolean => {
    // If no recipients specified, show to everyone (for backward compatibility)
    if (!doc.recipients || doc.recipients.length === 0) {
      return true;
    }
    
    // Check if current user matches any recipient
    const currentUserName = user?.name || '';
    const currentUserRole = user?.role || '';
    
    // Normalize role for matching (e.g., 'principal' -> 'Principal')
    const normalizedRole = currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1).toLowerCase();
    
    // Common role variations for better matching
    const roleVariations = [
      currentUserRole.toLowerCase(),
      normalizedRole,
      currentUserRole.toUpperCase()
    ];
    
    // Add specific role mappings
    if (currentUserRole.toLowerCase() === 'principal') {
      roleVariations.push('Dr. Principal', 'Principal', 'Dr. Robert Principal');
    } else if (currentUserRole.toLowerCase() === 'registrar') {
      roleVariations.push('Prof. Registrar', 'Registrar', 'Prof. Sarah Registrar');
    } else if (currentUserRole.toLowerCase() === 'hod') {
      roleVariations.push('HOD', 'Dr. HOD', 'Head of Department');
    } else if (currentUserRole.toLowerCase() === 'program-head') {
      roleVariations.push('Program Head', 'Program Department Head', 'Prof. Head');
    }
    
    return doc.recipients.some((recipient: string) => {
      const recipientLower = recipient.toLowerCase();
      
      // Match by full name (exact match)
      if (recipientLower === currentUserName.toLowerCase()) {
        return true;
      }
      
      // Match by any role variation
      if (roleVariations.some(variation => recipientLower.includes(variation.toLowerCase()))) {
        return true;
      }
      
      // Match if recipient contains user's name parts
      if (currentUserName) {
        const nameParts = currentUserName.toLowerCase().split(' ');
        if (nameParts.some(part => part.length > 2 && recipientLower.includes(part))) {
          return true;
        }
      }
      
      // Match by department/branch if applicable
      if (user?.department && recipientLower.includes(user.department.toLowerCase())) {
        return true;
      }
      
      if (user?.branch && recipientLower.includes(user.branch.toLowerCase())) {
        return true;
      }
      
      return false;
    });
  }, [user]);

  useEffect(() => {
    // Load Pending Documents from Supabase
    const fetchDocuments = async () => {
      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log('⏳ [Dashboard] Fetch already in progress, skipping...');
        return;
      }
      
      isFetchingRef.current = true;
      setLoading(true);
      
      try {
        // Fetch documents from Supabase where user is a recipient
        const pendingDocs = await supabaseWorkflowService.getApprovalCards(user?.id || user?.email);
        
        console.log('📥 [Dashboard] Loaded approval cards from Supabase:', pendingDocs.length);
        
        // Convert to Document format
        const documents: Document[] = pendingDocs.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          type: doc.type || 'Letter',
          status: doc.status || 'pending',
          submittedBy: doc.submitter_name || doc.submitter || 'Unknown',
          submittedByRole: doc.submitter_role || 'Faculty',
          department: doc.department || 'General',
          date: doc.created_at ? new Date(doc.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: doc.is_emergency ? 'emergency' : (doc.priority || 'medium'),
          description: doc.description || '',
          requiresAction: doc.status === 'pending',
          escalationLevel: doc.escalation_level || 0,
          approvalCard: doc
        }));
        
        setDocuments(documents);
        console.log('✅ [Dashboard] User-specific documents:', documents.length);
      } catch (error) {
        console.error('❌ [Dashboard] Error fetching documents from Supabase:', error);
        setDocuments([]);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    if (user) {
      fetchDocuments();
    }
    
    // Subscribe to real-time updates from Supabase
    const channel = supabase
      .channel('dashboard-documents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_recipients' },
        (payload) => {
          console.log('📢 [Dashboard] Real-time document update:', payload.eventType);
          fetchDocuments();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          console.log('📢 [Dashboard] Real-time document change:', payload.eventType);
          fetchDocuments();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, user, isUserInRecipients]);

  const getFilteredDocuments = () => {
    switch (filter) {
      case 'pending':
        return documents.filter(doc => doc.status === 'pending' || doc.status === 'in-review');

      case 'emergency':
        return documents.filter(doc => doc.status === 'emergency' || doc.priority === 'emergency');
      default:
        return documents;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'in-review': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: { variant: "success" as const, text: "Approved" },
      rejected: { variant: "destructive" as const, text: "Rejected" },
      pending: { variant: "warning" as const, text: "Pending" },
      'in-review': { variant: "default" as const, text: "In Review" },
      emergency: { variant: "destructive" as const, text: "EMERGENCY" }
    };
    return variants[status as keyof typeof variants] || { variant: "default" as const, text: status };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'text-red-600 animate-pulse';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const filteredDocuments = getFilteredDocuments();
  const urgentCount = documents.filter(doc => doc.requiresAction && (doc.priority === 'high' || doc.priority === 'emergency')).length;

  if (loading) {
    return (
      <Card className={cn(
        "shadow-elegant",
        isSelected && "border-primary",
        isCustomizing && "cursor-pointer"
      )} onClick={onSelect}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <Card className={cn(
      "shadow-elegant hover:shadow-glow transition-all duration-300",
      isSelected && "border-primary",
      isCustomizing && "cursor-pointer"
    )} onClick={onSelect}>
      <CardHeader className={cn(isMobile && "pb-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <FileText className="w-5 h-5 text-primary" />
            Recent Documents
            {urgentCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {urgentCount} urgent
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['all', 'pending', 'emergency'] as const).map(filterType => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className={cn(isMobile && "text-xs px-2")}
                >
                  {filterType === 'all' ? 'All' : 
                   filterType === 'pending' ? 'Pending' : 'Emergency'}
                </Button>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/approvals")}
              className={cn(isMobile && "text-xs")}
            >
              <Eye className="w-4 h-4 mr-1" />
              View All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className={cn(isMobile ? "h-64" : "h-80")}>
          <div className="space-y-3">
            {filteredDocuments.slice(0, isMobile ? 5 : 8).map((doc, index) => (
              <div
                key={doc.id}
                className={cn(
                  "relative p-4 border rounded-lg hover:bg-accent transition-all cursor-pointer animate-fade-in",
                  doc.status === 'emergency' && "border-destructive bg-red-50 animate-pulse",
                  doc.priority === 'emergency' && "border-destructive bg-red-50 animate-pulse",
                  doc.requiresAction && "border-l-4 border-l-warning"
                )}
                onClick={() => {
                  console.log('🖱️ [Dashboard] Card clicked:', doc.id);
                  // Navigate to Approval Center with hash to highlight card
                  if (doc.approvalCard) {
                    navigate(`/approvals#${doc.id}`);
                  } else {
                    navigate("/approvals");
                  }
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-medium line-clamp-2",
                      isMobile ? "text-sm" : "text-base"
                    )}>
                      {doc.title}
                    </h4>
                    {doc.aiSummary && (
                      <p className={cn(
                        "text-muted-foreground mt-1 line-clamp-2",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        🤖 {doc.aiSummary}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    {getStatusIcon(doc.status)}
                    <Badge variant={getStatusBadge(doc.status).variant} className="text-xs">
                      {getStatusBadge(doc.status).text}
                    </Badge>
                  </div>
                </div>
                
                <div className={cn(
                  "grid gap-2 text-xs text-muted-foreground",
                  isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4"
                )}>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{doc.submittedBy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{doc.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{doc.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className={cn("w-3 h-3", getPriorityColor(doc.priority))} />
                    <span className={getPriorityColor(doc.priority)}>
                      {doc.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Branch and Year info for Program Heads */}
                {(userRole === 'program-head' || userRole === 'hod') && (doc.branch || doc.year) && (
                  <div className="flex items-center gap-2 mt-2">
                    {doc.branch && (
                      <Badge variant="outline" className="text-xs">
                        {doc.branch}
                      </Badge>
                    )}
                    {doc.year && (
                      <Badge variant="outline" className="text-xs">
                        {doc.year}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action Required Indicator */}
                {doc.requiresAction && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-warning/10 rounded border border-warning/20">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-sm font-medium text-warning">
                      Action Required
                    </span>
                    {doc.escalationLevel > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Escalated {doc.escalationLevel}x
                      </Badge>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={(e) => {
                    e.stopPropagation();
                    if (doc.approvalCard) {
                      navigate(`/approvals#${doc.id}`);
                    } else {
                      navigate("/approvals");
                    }
                  }}>
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDoc(doc);
                    setShowAISummarizer(true);
                  }}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Summarizer
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredDocuments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className={cn(isMobile ? "text-sm" : "text-base")}>
                  No documents found
                </p>
                <p className="text-xs">
                  {filter === 'all' ? 'No documents available' : `No ${filter} documents`}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Widget Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{filteredDocuments.length} documents</span>
            {urgentCount > 0 && (
              <span className="text-warning font-medium">
                {urgentCount} require action
              </span>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/approvals")}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {cardContent}
      {selectedDoc && (
        <AISummarizerModal
          isOpen={showAISummarizer}
          onClose={() => {
            setShowAISummarizer(false);
            setSelectedDoc(null);
          }}
          document={selectedDoc}
          approvalCard={selectedDoc.approvalCard}
        />
      )}
    </>
  );
};