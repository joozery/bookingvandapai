const storage = {
  from: (_bucket?: string) => ({
    upload: async (path: string, body: Blob | string, _options?: { contentType?: string }) => { const form = new FormData(); form.append('file', body instanceof Blob ? body : new Blob([body])); form.append('path', path); const response = await fetch('/api/storage', { method: 'POST', body: form }); return response.ok ? { data: { path }, error: null } : { data: null, error: { message: await response.text() } }; },
    download: async (path: string) => { const response = await fetch(`/api/storage?path=${encodeURIComponent(path)}`); return response.ok ? { data: await response.blob(), error: null } : { data: null, error: { message: 'Download failed' } }; },
    remove: async (paths: string[]) => { const response = await fetch('/api/storage', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths }) }); return response.ok ? { data: null, error: null } : { data: null, error: { message: 'Delete failed' } }; },
    list: async () => ({ data: [], error: null }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''}/${path}` } }),
  }),
};

export const supabase = {
  storage,
  channel: (_name?: string) => ({ on: (_event?: string, _filter?: unknown, _callback?: () => void) => ({ on: (_event2?: string, _filter2?: unknown, _callback2?: () => void) => ({ on: (_event3?: string, _filter3?: unknown, _callback3?: () => void) => ({ subscribe: () => ({}) }), subscribe: () => ({}) }), subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: (_channel?: unknown) => {},
};
