import { useState, useEffect } from 'react';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { Bookmark, Trash2, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import toast from 'react-hot-toast';

export default function SavedQueriesPage() {
  const [queries, setQueries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/saved-queries");
      if (response.data.success) {
        setQueries(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedQuery(response.data.data[0]);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch saved queries.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`http://localhost:5000/api/saved-queries/${id}`);
      toast.success("Query deleted!");
      const updated = queries.filter(q => q.id !== id);
      setQueries(updated);
      if (selectedQuery?.id === id) {
        setSelectedQuery(updated.length > 0 ? updated[0] : null);
      }
    } catch (error) {
      toast.error("Failed to delete query.");
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Saved Queries</h2>
        <p className="text-muted-foreground mt-2">Access your bookmarked and frequently used SQL queries.</p>
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-6 min-h-0">
        <Card className="lg:col-span-1 border-border/50 shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base flex items-center">
              <Bookmark className="w-4 h-4 mr-2 text-primary" />
              Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>
            ) : queries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Code2 className="w-8 h-8 mb-3 opacity-20" />
                <p>No saved queries yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {queries.map((q) => (
                  <div 
                    key={q.id}
                    onClick={() => setSelectedQuery(q)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 flex justify-between items-start group ${selectedQuery?.id === q.id ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary' : ''}`}
                  >
                    <div>
                      <h4 className="font-medium text-sm text-foreground">{q.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(q.id, e)}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1 rounded-md hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex flex-col min-h-0">
          {selectedQuery ? (
            <Card className="border-border/50 flex-1 flex flex-col overflow-hidden shadow-sm">
              <CardHeader className="py-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{selectedQuery.title}</CardTitle>
                  <CardDescription className="mt-1">Saved on {new Date(selectedQuery.createdAt).toLocaleString()}</CardDescription>
                </div>
              </CardHeader>
              <div className="flex-1 bg-zinc-50 dark:bg-[#0d0d0f] relative group">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-purple-500 z-10" />
                <div className="p-4 pt-4 h-full">
                  <CodeMirror
                    value={selectedQuery.generatedSql}
                    height="100%"
                    extensions={[sql()]}
                    theme="dark"
                    className="text-[14px] font-mono h-full"
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
          ) : (
            <Card className="flex-1 border-dashed border-2 border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
              <Bookmark className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a saved query to view its contents.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
