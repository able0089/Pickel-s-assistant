import { StatusCard } from "@/components/StatusCard";
import { ConfigForm } from "@/components/ConfigForm";
import { LogsTable } from "@/components/LogsTable";
import { motion } from "framer-motion";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-12 text-foreground font-body">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-2">
              ShinyHunt Manager
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Automated channel permission management for Discord Pokémon spawns.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary" />
              SYSTEM ACTIVE
            </div>
          </div>
        </motion.header>

        {/* Status Section */}
        <section>
          <StatusCard />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Configuration - Takes 1 column on large screens */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1 h-full"
          >
            <ConfigForm />
          </motion.div>

          {/* Logs - Takes 2 columns on large screens */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 h-full"
          >
            <LogsTable />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
