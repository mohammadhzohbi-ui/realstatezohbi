import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadFile(file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('survey-files')
    .upload(path, file, { upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data: urlData } = supabase.storage.from('survey-files').getPublicUrl(data.path);
  return urlData.publicUrl;
}
