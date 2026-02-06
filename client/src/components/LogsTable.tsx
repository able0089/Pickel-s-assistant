import { useLogs } from "@/hooks/use-bot-manager";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal, Lock, Unlock, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function LogsTable() {
  const { data: logs, isLoading } = useLogs();

  const getIcon = (type: string) => {
    switch (type) {
      case 'LOCK': return <Lock className="w-4 h-4 text-destructive" />;
      case 'UNLOCK': return <Unlock className="w-4 h-4 text-primary" />;
      case 'ERROR': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'LOCK': return "bg-destructive/10 border-destructive/20 text-destructive-foreground";
      case 'UNLOCK': return "bg-primary/10 border-primary/20 text-primary-foreground";
      case 'ERROR': return "bg-orange-500/10 border-orange-500/20 text-orange-200";
      default: return "bg-blue-500/10 border-blue-500/20 text-blue-200";
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl bg-card/50" />;
  }

  return (
    <Card className="col-span-1 lg:col-span-2 border-white/5 bg-card shadow-xl shadow-black/10 flex flex-col h-[500px]">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl text-muted-foreground">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>Real-time activity log of bot actions.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {logs?.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`
                    group flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-background/30 hover:bg-background/50 transition-colors
                  `}
                >
                  <div className={`p-2 rounded-lg ${getColor(log.type)} shrink-0 mt-0.5`}>
                    {getIcon(log.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 uppercase tracking-wider ${
                        log.type === 'LOCK' ? 'text-destructive' : log.type === 'UNLOCK' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {log.timestamp ? format(new Date(log.timestamp), "HH:mm:ss · MMM dd") : "-"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                      {log.message}
                    </p>
                    {log.channelName && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono flex items-center gap-1">
                        <span className="opacity-50">#</span> {log.channelName}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {logs?.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <Terminal className="w-12 h-12 mb-4 opacity-20" />
                <p>No logs recorded yet.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
