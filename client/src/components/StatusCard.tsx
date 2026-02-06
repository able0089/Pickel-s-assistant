import { useBotStatus } from "@/hooks/use-bot-manager";
import { motion } from "framer-motion";
import { Activity, Clock, ShieldCheck, ShieldAlert, Wifi } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatusCard() {
  const { data: status, isLoading } = useBotStatus();

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-3xl bg-card/50" />;
  }

  const isOnline = status?.online ?? false;
  const uptime = status?.uptime ? Math.floor(status.uptime / 60) : 0; // minutes

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-card border border-white/5 p-8 shadow-2xl shadow-black/20"
    >
      {/* Background Gradient */}
      <div 
        className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${isOnline ? 'from-primary/20' : 'from-destructive/20'} to-transparent rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none`} 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${isOnline ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">System Status</h2>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            {isOnline ? "Operational" : "Offline"}
          </h1>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="bg-background/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex items-center gap-4 min-w-[160px]">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Connection</p>
              <p className={`font-mono font-bold ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
                {isOnline ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>

          <div className="bg-background/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex items-center gap-4 min-w-[160px]">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Uptime</p>
              <p className="font-mono font-bold text-blue-500">
                {uptime > 60 ? `${(uptime / 60).toFixed(1)}h` : `${uptime}m`}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground font-mono bg-black/20 w-fit px-3 py-1.5 rounded-full">
        <span>LAST PING:</span>
        <span className={isOnline ? "text-primary" : "text-destructive"}>
          {status?.lastPing ? new Date(status.lastPing).toLocaleTimeString() : "N/A"}
        </span>
      </div>
    </motion.div>
  );
}
