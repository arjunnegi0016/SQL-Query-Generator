import { useState, useEffect } from 'react';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { Clock, Database, ChevronRight, Activity, Terminal, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function QueryHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/query/history");
      setHistory(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedQuery(response.data.data[0]); // Select first by default
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOperationBadgeColor = (operation) => {
    const op = operation?.toUpperCase();
    if (op === 'SELECT') return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (op === 'INSERT') return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (op === 'UPDATE') return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    if (op === 'DELETE' || op === 'DROP') return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Query History</h2>
        <p className="text-muted-foreground mt-2">View and manage all previously generated SQL queries.</p>
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Column: History List */}
        <Card className="lg:col-span-1 border-border/50 shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base flex items-center">
              <Clock className="w-4 h-4 mr-2 text-primary" />
              Recent Generations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Database className="w-8 h-8 mb-3 opacity-20" />
                <p>No queries generated yet.</p>
              </div>
            ) : (
              <Table>
                <TableBody>
                  {history.map((record) => (
                    <TableRow 
                      key={record.id} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedQuery?.id === record.id ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary' : ''}`}
                      onClick={() => setSelectedQuery(record)}
                    >
                      <TableCell className="py-4">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-[10px] uppercase font-mono px-2 py-0.5 ${getOperationBadgeColor(record.operationType)}`}>
                              {record.operationType || 'QUERY'}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-medium">
                              {new Date(record.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2 leading-relaxed text-foreground/80">
                            "{record.prompt}"
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Query Detail */}
        <div className="lg:col-span-2 flex flex-col min-h-0 space-y-6">
          {selectedQuery ? (
            <>
              {/* Detailed Prompt Card */}
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-sm flex items-center font-medium">
                    <Terminal className="w-4 h-4 mr-2 text-primary" />
                    Original Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm leading-relaxed text-foreground">
                  {selectedQuery.prompt}
                </CardContent>
              </Card>

              {/* Generated SQL Editor */}
              <Card className="border-border/50 flex-1 flex flex-col overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-100 dark:bg-zinc-950/80 border-b border-border/50">
                  <span className="text-xs font-mono font-medium text-muted-foreground">generated.sql</span>
                </div>
                <div className="flex-1 bg-zinc-50 dark:bg-[#0d0d0f] relative group">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-purple-500 z-10" />
                  <div className="p-4 pt-4">
                    <CodeMirror
                      value={selectedQuery.generatedSql}
                      height="300px"
                      extensions={[sql()]}
                      theme="dark"
                      className="text-[14px] font-mono h-[300px]"
                      readOnly={true}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                        highlightActiveLine: false,
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* AI Explanation */}
              {selectedQuery.explanation && (
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-sm font-semibold flex items-center text-foreground">
                      <Info className="w-4 h-4 mr-2 text-primary" /> AI Explanation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground pt-4 leading-relaxed">
                    {selectedQuery.explanation}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="flex-1 border-dashed border-2 border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a query from the history to view its details.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
