"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, Focus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: number;
  duration: number;
  completedAt: string;
  sessionType: string;
  createdAt: string;
}

export const SessionLog = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  const fetchSessions = async (offset: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/sessions?limit=${limit + 1}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      
      // Check if there are more items
      setHasMore(data.length > limit);
      
      // Only take the limit amount
      setSessions(data.slice(0, limit));
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load session history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(page * limit);
  }, [refreshTrigger, page]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTotalStats = () => {
    const totalDuration = sessions.reduce((acc, s) => acc + s.duration, 0);
    const focusSessions = sessions.filter(s => s.sessionType === "focus").length;
    const breakSessions = sessions.filter(s => s.sessionType === "break").length;
    
    return { totalDuration, focusSessions, breakSessions };
  };

  if (isLoading && sessions.length === 0) {
    return (
      <Card className="p-8 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading sessions...</span>
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-8 bg-card/50 backdrop-blur-sm">
        <div className="text-center space-y-3">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
          <div className="text-muted-foreground">
            No sessions yet. Start your first timer! ⏱️
          </div>
        </div>
      </Card>
    );
  }

  const stats = getTotalStats();

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Session History</h2>
          <div className="text-sm text-muted-foreground">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.focusSessions}</div>
            <div className="text-xs text-muted-foreground">Focus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.breakSessions}</div>
            <div className="text-xs text-muted-foreground">Break</div>
          </div>
        </div>

        {/* Session List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  session.sessionType === "focus" 
                    ? "bg-blue-500/10 text-blue-500" 
                    : "bg-green-500/10 text-green-500"
                }`}>
                  {session.sessionType === "focus" ? (
                    <Focus className="w-4 h-4" />
                  ) : (
                    <Coffee className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="font-medium capitalize">{session.sessionType}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(session.completedAt)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatDuration(session.duration)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {(page > 0 || hasMore) && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page + 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
