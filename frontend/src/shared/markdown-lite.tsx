/**
 * Just enough markdown for clinic_faq.md: bold, links, bullets and headings.
 * The FAQ is trusted local content — this only shapes it for display, it is
 * not a general-purpose renderer.
 */
export function markdownLite(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (list.length > 0) {
      out.push(
        <ul className="md-list" key={key}>
          {list}
        </ul>,
      );
      list = [];
    }
  };

  const inline = (s: string, keyPrefix: string): React.ReactNode[] =>
    s
      .split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g)
      .filter(Boolean)
      .map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
        if (/^https?:\/\//.test(part))
          return (
            <a key={`${keyPrefix}-${i}`} href={part} target="_blank" rel="noreferrer">
              {part}
            </a>
          );
        return <span key={`${keyPrefix}-${i}`}>{part}</span>;
      });

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      list.push(<li key={`li-${idx}`}>{inline(line.slice(2), `li-${idx}`)}</li>);
      return;
    }
    flushList(`ul-${idx}`);
    if (!line) return;
    if (line.startsWith('#')) {
      out.push(
        <h4 className="md-heading" key={`h-${idx}`}>
          {line.replace(/^#+\s*/, '')}
        </h4>,
      );
      return;
    }
    out.push(<p key={`p-${idx}`}>{inline(line, `p-${idx}`)}</p>);
  });
  flushList('ul-end');
  return out;
}
