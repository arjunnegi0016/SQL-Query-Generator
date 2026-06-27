import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings as SettingsIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ preferredDatabase: 'MySQL', theme: 'dark' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/settings");
      if (response.data.success) {
        setSettings({
          preferredDatabase: response.data.data.preferredDatabase || 'MySQL',
          theme: response.data.data.theme || 'dark'
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put("http://localhost:5000/api/settings", settings);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-2">Manage your preferences and configuration.</p>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground animate-pulse">Loading settings...</div>
      ) : (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base flex items-center">
              <SettingsIcon className="w-4 h-4 mr-2 text-primary" />
              General Settings
            </CardTitle>
            <CardDescription>Update your application preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Database</label>
              <select 
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={settings.preferredDatabase}
                onChange={(e) => setSettings({...settings, preferredDatabase: e.target.value})}
              >
                <option value="MySQL">MySQL</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <select 
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={settings.theme}
                onChange={(e) => {
                  const newTheme = e.target.value;
                  setSettings({...settings, theme: newTheme});
                  if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="pt-4 border-t border-border/50 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
