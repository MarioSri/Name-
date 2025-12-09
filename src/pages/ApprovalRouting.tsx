import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { WorkflowConfiguration } from '@/components/WorkflowConfiguration';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeDocuments } from '@/hooks/useRealTimeDocuments';
import { cn } from '@/lib/utils';
import { FileViewer } from '@/components/FileViewer';
import {
  Settings,
  Clock,
  CheckCircle2,
  ArrowRightLeft,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Users,
  Bell,
  TrendingUp,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeftRight,
  RotateCcw,
  GitBranch,
  User,
  UserCheck,
  Send,
  ChevronRight,
  ChevronLeft,
  Repeat
} from 'lucide-react';

const ApprovalRouting: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('configuration');
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [viewingFile, setViewingFile] = useState<File | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const { trackDocuments, approvalCards, isConnected } = useRealTimeDocuments();

  // Calculate real statistics from Supabase data
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    completedToday: 0,
    averageTime: '0 hours',
    bypassCount: '0',
    responseRate: 0
  });

  useEffect(() => {
    const allDocs = [...trackDocuments, ...approvalCards];
    // Count pending documents (status can be 'pending' for approval cards)
    const pending = allDocs.filter(d => d.status === 'pending').length;
    const today = new Date().toDateString();
    // Use submittedDate field which exists on DocumentData
    const completedToday = allDocs.filter(d => 
      d.status === 'approved' && 
      new Date(d.submittedDate || '').toDateString() === today
    ).length;
    // Count documents that have bypass enabled in workflow
    const responseRate = allDocs.filter(d => d.workflow?.hasBypass).length;
    
    setStats({
      pendingApprovals: pending,
      completedToday,
      averageTime: '0 hours',
      bypassCount: '0',
      responseRate
    });
  }, [trackDocuments, approvalCards]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleViewFile = (file: File) => {
    // Opens modal viewer instead of new tab
    setViewingFile(file);
    setShowFileViewer(true);
  };

  // Routing Types for Approval Chain with Bypass
  const routingTypes = [
    {
      id: 'sequential',
      icon: ArrowRight,
      title: 'Sequential Routing',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'Documents flow through recipients one at a time in a predefined order. Each recipient must complete their action before the document moves to the next person.',
      mechanism: [
        'Document is submitted and sent to the first recipient in the chain',
        'Recipient 1 reviews and approves/signs the document',
        'Upon approval, the document automatically advances to Recipient 2',
        'This process continues until all recipients have approved',
        'If any recipient rejects, the workflow stops or escalates based on settings'
      ],
      diagram: {
        type: 'sequential',
        nodes: ['Submitter', 'Recipient 1', 'Recipient 2', 'Recipient 3', 'Complete'],
        arrows: ['→', '→', '→', '→']
      }
    },
    {
      id: 'parallel',
      icon: GitBranch,
      title: 'Parallel Routing',
      color: 'text-green-500',
      bgColor: 'bg-green-50 border-green-200',
      description: 'Documents are sent to all recipients simultaneously. All recipients can review and act on the document at the same time, reducing overall processing time.',
      mechanism: [
        'Document is submitted and sent to ALL recipients at the same time',
        'Each recipient receives their own approval card independently',
        'Recipients can approve/reject in any order without waiting',
        'System tracks all responses and consolidates the final status',
        'Document is marked complete when all recipients have responded'
      ],
      diagram: {
        type: 'parallel',
        nodes: ['Submitter', ['Recipient 1', 'Recipient 2', 'Recipient 3'], 'Complete'],
        arrows: ['⇒', '⇒']
      }
    },
    {
      id: 'reverse',
      icon: RotateCcw,
      title: 'Reverse Routing',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 border-orange-200',
      description: 'Documents flow in reverse order from the last recipient to the first. Useful for bottom-up approval workflows where higher authorities review first.',
      mechanism: [
        'Document is submitted and sent to the LAST recipient in the chain first',
        'Recipient 3 (highest authority) reviews and approves first',
        'Upon approval, document moves to Recipient 2',
        'Process continues backwards until reaching Recipient 1',
        'Enables top-down verification before lower-level processing'
      ],
      diagram: {
        type: 'reverse',
        nodes: ['Submitter', 'Recipient 3', 'Recipient 2', 'Recipient 1', 'Complete'],
        arrows: ['→', '→', '→', '→']
      }
    },
    {
      id: 'bidirectional',
      icon: ArrowLeftRight,
      title: 'Bi-Directional Routing',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 border-purple-200',
      description: 'Documents are sent to all recipients simultaneously (like Parallel), with added Resend and Re-Upload capability. If any recipient rejects, the submitter can resend the document to them.',
      mechanism: [
        'Document is submitted and sent to ALL recipients at the same time',
        'All recipients can approve/reject independently and simultaneously',
        'If a recipient rejects, their step is marked as "bypassed"',
        'Submitter sees Resend and Re-Upload buttons for bypassed recipients',
        'Clicking Resend reactivates the approval card for rejected recipients',
        'Re-Upload allows submitter to attach revised documents before resending'
      ],
      diagram: {
        type: 'bidirectional',
        nodes: ['Submitter', ['Recipient 1', 'Recipient 2', 'Recipient 3'], 'Complete'],
        arrows: ['⇒', '⇒'],
        features: ['Resend', 'Re-Upload']
      }
    }
  ];

  const isAdmin = user?.role === 'principal' || user?.role === 'registrar' || user?.role === 'hod' || user?.role === 'program-head';

  return (
    <DashboardLayout userRole={user?.role || 'employee'} onLogout={handleLogout}>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Approval Chain with Bypass</h1>
        <p className="text-muted-foreground">Advanced Routing, Sequential Control, and Recipient Bypass Management</p>
      </div>
      
      {/* Header */}
      <Card className={`shadow-elegant ${isBypassMode ? 'border-green-500 bg-green-50' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className={`w-6 h-6 ${isBypassMode ? 'text-green-600 animate-pulse' : 'text-primary'}`} />
              Approval Chain with Bypass
            </CardTitle>
            
            <Button
              onClick={() => setIsBypassMode(!isBypassMode)}
              variant={isBypassMode ? "default" : "outline"}
              className={`font-bold ${isBypassMode ? 'animate-pulse shadow-glow bg-green-600 hover:bg-green-700 text-white' : ''}`}
              size="lg"

            >
              {isBypassMode ? (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Cancel Bypass
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  ACTIVATE BYPASS
                </>
              )}
            </Button>
          </div>
          
          {isBypassMode && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                <ArrowRightLeft className="w-5 h-5" />
                BYPASS MODE ACTIVE
              </div>

            </div>
          )}
        </CardHeader>
      </Card>

      {/* Quick Stats - Only show when NOT in bypass mode */}
      {!isBypassMode && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedToday}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time</p>
                  <p className="text-2xl font-bold">{stats.averageTime}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bypass Count</p>
                  <p className="text-2xl font-bold">{stats.bypassCount}</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{stats.responseRate}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Routing Mechanisms Overview - Only show when NOT in bypass mode */}
      {!isBypassMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              System Features
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              The Approval Chain with Bypass system supports four distinct routing mechanisms. Each method determines how documents flow between selected recipients during the approval process.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {routingTypes.map((routing, index) => (
              <div key={routing.id} className={cn("border rounded-lg p-5", routing.bgColor)}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("flex-shrink-0 p-2.5 rounded-lg bg-white shadow-sm", routing.color)}>
                    <routing.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {routing.title}
                      <Badge variant="outline" className="text-xs">
                        {index + 1} of 4
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">{routing.description}</p>
                  </div>
                </div>

                {/* Visual Diagram */}
                <div className="bg-white rounded-lg p-4 mb-4 border">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Document Flow Diagram
                  </p>
                  
                  {routing.diagram.type === 'sequential' && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {routing.diagram.nodes.map((node, i) => (
                        <React.Fragment key={i}>
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                            i === 0 ? "bg-blue-100 text-blue-700" :
                            i === routing.diagram.nodes.length - 1 ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {i === 0 && <Send className="w-4 h-4" />}
                            {i > 0 && i < routing.diagram.nodes.length - 1 && <User className="w-4 h-4" />}
                            {i === routing.diagram.nodes.length - 1 && <CheckCircle2 className="w-4 h-4" />}
                            {node}
                          </div>
                          {i < routing.diagram.nodes.length - 1 && (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {routing.diagram.type === 'parallel' && (
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium">
                        <Send className="w-4 h-4" />
                        Submitter
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex gap-2 mb-1">
                          <ChevronRight className="w-4 h-4 text-gray-400 -rotate-45" />
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <ChevronRight className="w-4 h-4 text-gray-400 rotate-45" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(routing.diagram.nodes[1] as string[]).map((recipient, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                            <User className="w-4 h-4" />
                            {recipient}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex gap-2 mb-1">
                          <ChevronRight className="w-4 h-4 text-gray-400 rotate-45" />
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <ChevronRight className="w-4 h-4 text-gray-400 -rotate-45" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Complete
                      </div>
                    </div>
                  )}

                  {routing.diagram.type === 'reverse' && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {routing.diagram.nodes.map((node, i) => (
                        <React.Fragment key={i}>
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                            i === 0 ? "bg-blue-100 text-blue-700" :
                            i === routing.diagram.nodes.length - 1 ? "bg-green-100 text-green-700" :
                            "bg-orange-100 text-orange-700"
                          )}>
                            {i === 0 && <Send className="w-4 h-4" />}
                            {i > 0 && i < routing.diagram.nodes.length - 1 && <User className="w-4 h-4" />}
                            {i === routing.diagram.nodes.length - 1 && <CheckCircle2 className="w-4 h-4" />}
                            {node}
                            {i > 0 && i < routing.diagram.nodes.length - 1 && (
                              <span className="text-xs opacity-70">(Rev)</span>
                            )}
                          </div>
                          {i < routing.diagram.nodes.length - 1 && (
                            <ChevronRight className="w-5 h-5 text-orange-400" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {routing.diagram.type === 'bidirectional' && (
                    <div className="space-y-4">
                      {/* Simultaneous Delivery - Same as Parallel */}
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium">
                          <Send className="w-4 h-4" />
                          Submitter
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex gap-2 mb-1">
                            <ChevronRight className="w-4 h-4 text-purple-400 -rotate-45" />
                            <ChevronRight className="w-4 h-4 text-purple-400" />
                            <ChevronRight className="w-4 h-4 text-purple-400 rotate-45" />
                          </div>
                          <span className="text-xs text-purple-500">Simultaneous</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {(routing.diagram.nodes[1] as string[]).map((recipient, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-sm font-medium">
                              <User className="w-4 h-4" />
                              {recipient}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex gap-2 mb-1">
                            <ChevronRight className="w-4 h-4 text-purple-400 rotate-45" />
                            <ChevronRight className="w-4 h-4 text-purple-400" />
                            <ChevronRight className="w-4 h-4 text-purple-400 -rotate-45" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Complete
                        </div>
                      </div>

                      {/* Rejection Recovery Feature */}
                      <div className="border-t border-purple-200 pt-4">
                        <p className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Rejection Recovery (Unique to Bi-Directional)
                        </p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            Recipient Rejects
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            Status: Bypassed
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
                              <Repeat className="w-3 h-3" />
                              Resend Button
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
                              <FileText className="w-3 h-3" />
                              Re-Upload Button
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-medium">
                            <UserCheck className="w-4 h-4" />
                            Recipient Retry
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Mechanism */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    How It Works
                  </p>
                  <ol className="space-y-2">
                    {routing.mechanism.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2 text-sm">
                        <span className={cn(
                          "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
                          routing.color.replace('text-', 'bg-')
                        )}>
                          {stepIndex + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}

            {/* Additional Info */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Bypass Mode</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    When Bypass Mode is activated, you can configure any of these routing types for your document submission. 
                    The bypass feature allows authorized users to skip certain approval steps in emergency situations while 
                    maintaining a complete audit trail of all actions taken.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bypass Configuration - Show when bypass mode is active */}
      {isBypassMode && (
        <Card className="shadow-elegant border-green-500">
          <CardContent className="p-6">
            <WorkflowConfiguration hideWorkflowsTab={true} />
          </CardContent>
        </Card>
      )}

      </div>

      {/* File Viewer Modal */}
      <FileViewer
        file={viewingFile}
        open={showFileViewer}
        onOpenChange={setShowFileViewer}
      />
    </DashboardLayout>
  );
};

export default ApprovalRouting;
