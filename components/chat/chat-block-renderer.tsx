import type { UIBlock } from '@/lib/chat/api';

export function ChatBlockRenderer({ block }: { block: UIBlock }) {
  if (block.type === 'markdown' && typeof block.data.content === 'string') {
    return <p className="text-sm">{block.data.content}</p>;
  }

  if (block.type === 'kpi') {
    return (
      <div className="rounded-md border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {String(block.data.title)}
        </p>
        <p className="text-lg font-semibold">{String(block.data.value)}</p>
      </div>
    );
  }

  if (block.type === 'email_list' && Array.isArray(block.data.emails)) {
    return (
      <ul className="space-y-2">
        {block.data.emails.map((email) => {
          const item = email as {
            id: string;
            subject: string | null;
            sender: string | null;
          };
          return (
            <li
              key={item.id}
              className="rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <p className="font-medium">{item.subject ?? 'No subject'}</p>
              <p className="text-xs text-muted-foreground">
                {item.sender ?? 'Unknown sender'}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }

  if (block.type === 'table' && Array.isArray(block.data.rows)) {
    return (
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <tbody>
            {block.data.rows.map((row, index) => (
              <tr key={index} className="border-t">
                {(row as string[]).map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
      {JSON.stringify(block.data, null, 2)}
    </pre>
  );
}
