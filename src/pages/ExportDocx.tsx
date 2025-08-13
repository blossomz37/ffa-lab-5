import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { exportToDocx } from '../lib/api';
import AdvancedExport, { type ExportFormat, type ExportOptions } from '../components/AdvancedExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import type { BookData } from '../lib/api';

/**
 * ExportDocx page component for advanced data export
 * - Accepts selected books from Home page via React Router state
 * - Provides multiple export formats and advanced filtering
 * - Handles download process and error states
 */
export default function ExportDocx() {
  const location = useLocation();
  
  // Get selected books from navigation state
  const selectedBooks = (location.state?.selectedBooks as BookData[]) || [];
  
  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<string>('');

  // Handle export process for different formats
  const handleExport = async (format: ExportFormat, options: ExportOptions) => {
    setLoading(true);
    setError(null);
    setExportProgress(`Preparing ${format.name} export...`);

    try {
      let blob: Blob;
      let filename: string;
      const timestamp = new Date().toISOString().split('T')[0];

      switch (format.type) {
        case 'docx':
          setExportProgress('Generating Word document...');
          blob = await exportToDocx(selectedBooks);
          filename = `book-report-${timestamp}.docx`;
          break;

        case 'csv':
          setExportProgress('Generating CSV file...');
          blob = generateCsvExport(selectedBooks, options);
          filename = `book-data-${timestamp}.csv`;
          break;

        case 'json':
          setExportProgress('Generating JSON file...');
          blob = generateJsonExport(selectedBooks, options);
          filename = `book-data-${timestamp}.json`;
          break;

        case 'xlsx':
          setExportProgress('Generating Excel file...');
          // TODO: Implement XLSX export
          throw new Error('XLSX export not yet implemented');

        default:
          throw new Error(`Unsupported export format: ${format.type}`);
      }

      setExportProgress('Downloading file...');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress('Export completed successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

  // Generate CSV export
  const generateCsvExport = (books: BookData[], options: ExportOptions): Blob => {
    const selectedFields = options.fields;
    
    // Create CSV header
    const header = selectedFields.join(',');
    
    // Create CSV rows
    const rows = books.map(book => 
      selectedFields.map(field => {
        const value = (book as any)[field];
        if (value === null || value === undefined) return '';
        
        // Escape CSV values
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    const csvContent = [header, ...rows].join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  };

  // Generate JSON export
  const generateJsonExport = (books: BookData[], options: ExportOptions): Blob => {
    const selectedFields = options.fields;
    
    // Filter books to only include selected fields
    const filteredBooks = books.map(book => {
      const filteredBook: any = {};
      selectedFields.forEach(field => {
        filteredBook[field] = (book as any)[field];
      });
      return filteredBook;
    });
    
    const jsonContent = JSON.stringify({
      metadata: {
        exportDate: new Date().toISOString(),
        totalBooks: books.length,
        fields: selectedFields,
        filters: options.filters
      },
      books: filteredBooks
    }, null, 2);
    
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  };

  // If no books selected, show message
  if (selectedBooks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Advanced Export</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No Books Selected</CardTitle>
              <CardDescription>
                Please go back to the dashboard and select some books to export.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Advanced Export</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooks.length} book{selectedBooks.length !== 1 ? 's' : ''} ready for export
                  </p>
                </div>
              </div>
            </div>
            
            {/* Export Progress */}
            {(loading || exportProgress) && (
              <div className="text-sm">
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-primary">Exporting...</span>
                  </div>
                )}
                {exportProgress && !loading && (
                  <span className="text-green-600">{exportProgress}</span>
                )}
                {error && (
                  <span className="text-red-600">Error: {error}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <AdvancedExport
          books={selectedBooks}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}