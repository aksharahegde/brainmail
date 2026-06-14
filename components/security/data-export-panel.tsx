'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { exportUserData } from '@/lib/security/api';

export function DataExportPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: 'json' | 'csv') {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await exportUserData({ format });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `brainmail-export.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : 'Export failed',
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-lg font-medium">Data export</h2>
        <p className="text-sm text-muted-foreground">
          Download a portable copy of your workspaces, emails, automations, and
          related records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div data-testid="security-export-json-submit">
          <Button
            type="button"
            variant="outline"
            disabled={isExporting}
            onClick={() => void handleExport('json')}
          >
            {isExporting ? 'Exporting…' : 'Export JSON'}
          </Button>
        </div>
        <div data-testid="security-export-csv-submit">
          <Button
            type="button"
            variant="outline"
            disabled={isExporting}
            onClick={() => void handleExport('csv')}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
