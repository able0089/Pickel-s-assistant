import { useBotConfig, useUpdateBotConfig } from "@/hooks/use-bot-manager";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBotConfigSchema, type InsertBotConfig } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Settings2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = insertBotConfigSchema.extend({
  regionalRoleId: z.string().optional(),
  adminRoleId: z.string().optional(),
});

export function ConfigForm() {
  const { data: configs, isLoading } = useBotConfig();
  const { mutate: updateConfig, isPending } = useUpdateBotConfig();
  const { toast } = useToast();

  const defaultConfig = configs?.[0];

  const form = useForm<InsertBotConfig>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guildId: "",
      targetUserId: "",
      detectionRoleId: "",
      regionalRoleId: "",
      sourceBotId: "",
      adminRoleId: "",
      isSystemEnabled: true,
    },
  });

  useEffect(() => {
    if (defaultConfig) {
      form.reset({
        guildId: defaultConfig.guildId,
        targetUserId: defaultConfig.targetUserId,
        detectionRoleId: defaultConfig.detectionRoleId,
        regionalRoleId: defaultConfig.regionalRoleId || "",
        sourceBotId: defaultConfig.sourceBotId,
        adminRoleId: defaultConfig.adminRoleId || "",
        isSystemEnabled: defaultConfig.isSystemEnabled ?? true,
      });
    }
  }, [defaultConfig, form]);

  const onSubmit = (data: InsertBotConfig) => {
    updateConfig(data, {
      onSuccess: () => {
        toast({
          title: "Configuration Saved",
          description: "Bot settings have been updated successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error Saving Config",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full border-white/5 bg-card/50 shadow-lg">
        <CardHeader>
          <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 w-full bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-white/5 bg-card shadow-xl shadow-black/10 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl text-primary">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Manage IDs and bot behavior settings.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="guildId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discord Guild ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789..." {...field} className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target User ID (To Lock)</FormLabel>
                    <FormControl>
                      <Input placeholder="User ID to restrict..." {...field} className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors font-mono" />
                    </FormControl>
                    <FormDescription>The specific user that will lose permissions.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="detectionRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rare Role ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Role ID for Rare pings..." {...field} className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="regionalRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regional Role ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Role ID for Regional pings..." {...field} value={field.value || ""} className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceBotId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Bot ID (P2A Bot)</FormLabel>
                    <FormControl>
                      <Input placeholder="ID of the bot to listen to..." {...field} className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors font-mono" />
                    </FormControl>
                    <FormDescription>Only messages from this bot will trigger locks.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adminRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Role ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Admin role ID..." {...field} value={field.value || ""} className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors font-mono" />
                    </FormControl>
                    <FormDescription>Users who can bypass locks.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSystemEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/10 bg-background/30 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">System Enabled</FormLabel>
                      <FormDescription>
                        Toggle the entire locking mechanism.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
