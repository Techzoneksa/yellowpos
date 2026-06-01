"use client";
import { useEffect, useState } from 'react';

interface Props {
  required: string[];
  children: React.ReactNode;
}

export default function EnvGuard({ required, children }: Props) {
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    const missingVars = required.filter(
      (key) => !process.env[key] && !process.env[`NEXT_PUBLIC_${key}`]
    );
    setMissing(missingVars);
  }, [required]);

  if (missing.length > 0) {
    return (
      <div style={{ padding: '2rem', border: '1px solid red', borderRadius: 8 }}>
        <h3>متغيرات البيئة المفقودة:</h3>
        <ul>{missing.map((v) => <li key={v}><code>{v}</code></li>)}</ul>
      </div>
    );
  }

  return <>{children}</>;
}