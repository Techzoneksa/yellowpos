"use client";

import { useEffect, useState } from "react";
import { hasSupabaseConfig, getSupabaseError } from "@/integrations/supabase/client";

export function EnvGuard({ children }: { children: React.ReactNode }) {
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!url || !key) {
        setError('إعدادات الاتصال غير مكتملة. يرجى مراجعة متغيرات البيئة.');
        setIsValid(false);
      } else {
        setIsValid(true);
        setError(null);
      }
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-2xl font-bold text-white mb-4">خطأ في الإعدادات</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="bg-gray-700 p-4 rounded text-right text-right text-sm text-gray-300 mb-4">
            <p className="font-semibold mb-2">المتغيرات المطلوبة:</p>
            <code className="block text-yellow-400">
              NEXT_PUBLIC_SUPABASE_URL=url<br/>
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key
            </code>
          </div>
          <a
            href="/api/health"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
          >
            تحقق من الاتصال
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}