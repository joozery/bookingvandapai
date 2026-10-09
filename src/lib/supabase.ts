type Filter = { field: string; op: 'eq' | 'neq' | 'in'; value: unknown };

function stripId<T extends Record<string, unknown>>(row: T): T {
  const { _id, ...rest } = row;
  return rest as T;
}

function fieldsOf(selection?: string) {
  if (!selection || selection === '*') return undefined;
  return selection.split(',').map((field) => field.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

class MongoQuery<T extends Record<string, unknown> = Record<string, unknown>> {
  private filters: Filter[] = [];
  private sort: Array<{ field: string; direction: 1 | -1 }> = [];
  private projection?: string[];
  private offset?: number;
  private end?: number;
  private max?: number;
  private mode: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: Record<string, unknown> | Record<string, unknown>[] = {};
  private singleMode: 'single' | 'maybe' | undefined;
  private countMode = false;
  private headMode = false;
  private conflictField = 'id';

  constructor(private readonly table: string) {}

  select(selection = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.projection = fieldsOf(selection);
    this.countMode = options?.count === 'exact';
    this.headMode = options?.head === true;
    return this;
  }
  eq(field: string, value: unknown) { this.filters.push({ field, op: 'eq', value }); return this; }
  neq(field: string, value: unknown) { this.filters.push({ field, op: 'neq', value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ field, op: 'in', value }); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.sort.push({ field: field.replaceAll('"', ''), direction: options?.ascending === false ? -1 : 1 }); return this; }
  limit(value: number) { this.max = value; return this; }
  range(from: number, to: number) { this.offset = from; this.end = to; return this; }
  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }
  insert(value: Record<string, unknown> | Record<string, unknown>[]) { this.mode = 'insert'; this.payload = value; return this; }
  upsert(value: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) { this.mode = 'upsert'; this.payload = value; this.conflictField = options?.onConflict || 'id'; return this; }
  update(value: Record<string, unknown>) { this.mode = 'update'; this.payload = value; return this; }
  delete() { this.mode = 'delete'; return this; }

  private async collection() {
    const { getMongoDb } = await import('./mongodb');
    return (await getMongoDb()).collection(this.table);
  }
  private filterQuery() {
    return Object.fromEntries(this.filters.map(({ field, op, value }) => [field, op === 'eq' ? value : op === 'neq' ? { $ne: value } : { $in: value as unknown[] }]));
  }
  private output(row: Record<string, unknown>) {
    const clean = stripId(row);
    if (!this.projection) return clean;
    return Object.fromEntries(this.projection.filter((field) => field in clean).map((field) => [field, clean[field]]));
  }
  async execute(): Promise<{ data: any; error: { message: string; code?: string } | null; count?: number }> {
    try {
      const collection = await this.collection();
      const query = this.filterQuery();
      if (this.mode === 'upsert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const row of rows) await collection.updateOne({ [this.conflictField]: row[this.conflictField] }, { $set: row }, { upsert: true });
        return { data: rows.map((row) => this.output(row)), error: null };
      }
      if (this.mode === 'insert') {
        const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => ({ id: row.id || crypto.randomUUID(), ...row }));
        await collection.insertMany(rows);
        const data = rows.map((row) => this.output(row));
        return { data: this.singleMode ? data[0] || null : data, error: null };
      }
      if (this.mode === 'update') {
        const result = await collection.updateMany(query, { $set: this.payload });
        if (this.projection) {
          // The original filter may contain the old value of a field that
          // was just updated (for example the van's seats array). Querying
          // with it again after the update returns no rows and incorrectly
          // turns a successful update into a 409 at the API layer. When an
          // id filter exists, read the updated document by its stable id;
          // otherwise return the correct affected-row count.
          const idFilter = this.filters.find(filter => filter.field === 'id' && filter.op === 'eq');
          const rows = idFilter
            ? await collection.find({ id: idFilter.value }).toArray()
            : [];
          if (rows.length > 0) {
            return { data: this.singleMode ? this.output(rows[0]) : rows.map((row) => this.output(row)), error: null };
          }
          const affected = result.matchedCount || 0;
          const emptyRows = Array.from({ length: affected }, () => ({}));
          return { data: this.singleMode ? emptyRows[0] || null : emptyRows, error: null };
        }
        return { data: null, error: null };
      }
      if (this.mode === 'delete') { await collection.deleteMany(query); return { data: null, error: null }; }
      const total = this.countMode ? await collection.countDocuments(query) : undefined;
      if (this.headMode) return { data: null, error: null, count: total };
      let cursor = collection.find(query);
      if (this.sort.length) cursor = cursor.sort(Object.fromEntries(this.sort.map(({ field, direction }) => [field, direction])));
      if (this.offset !== undefined) cursor = cursor.skip(this.offset);
      if (this.max !== undefined) cursor = cursor.limit(this.max);
      else if (this.end !== undefined && this.offset !== undefined) cursor = cursor.limit(this.end - this.offset + 1);
      const rows = (await cursor.toArray()).map((row) => this.output(row));
      const data = this.singleMode === 'single' ? rows[0] || null : this.singleMode === 'maybe' ? rows[0] || null : rows;
      return { data, error: null, ...(total === undefined ? {} : { count: total }) };
    } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : 'Database error', code: (error as { code?: string })?.code } }; }
  }
  then(resolve?: (value: { data: any; error: { message: string; code?: string } | null; count?: number }) => any, reject?: (reason: unknown) => any) { return this.execute().then(resolve, reject); }
}

function browserStorage() {
  return {
    from: () => ({
      upload: async (path: string, body: Blob | string) => { const form = new FormData(); form.append('file', body instanceof Blob ? body : new Blob([body])); form.append('path', path); const response = await fetch('/api/storage', { method: 'POST', body: form }); return response.ok ? { data: { path }, error: null } : { data: null, error: { message: await response.text() } }; },
      download: async (path: string) => { const response = await fetch(`/api/storage?path=${encodeURIComponent(path)}`); return response.ok ? { data: await response.blob(), error: null } : { data: null, error: { message: 'Download failed' } }; },
      remove: async (paths: string[]) => { const response = await fetch('/api/storage', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths }) }); return response.ok ? { data: null, error: null } : { data: null, error: { message: 'Delete failed' } }; },
      list: async () => ({ data: [], error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''}/${path}` } }),
    }),
  };
}

export const supabase = {
  from: (table: string) => new MongoQuery<any>(table),
  storage: typeof window === 'undefined' ? {
    from: (bucket: string) => ({
      upload: async (path: string, body: Blob | string, options?: { contentType?: string; upsert?: boolean; cacheControl?: string }) => { const { uploadToR2 } = await import('./r2'); await uploadToR2(path, Buffer.from(body instanceof Blob ? new Uint8Array(await body.arrayBuffer()) : body), options?.contentType); return { data: { path }, error: null }; },
      download: async (path: string) => { try { const { downloadFromR2 } = await import('./r2'); const result = await downloadFromR2(path); const bytes = result.Body ? await result.Body.transformToByteArray() : new Uint8Array(); return { data: new Blob([Buffer.from(bytes)]), error: null }; } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : 'File not found' } }; } },
      remove: async (paths: string[]) => { const { deleteFromR2 } = await import('./r2'); for (const path of paths) await deleteFromR2(path); return { data: null, error: null }; },
      list: async (folder: string, _options?: { limit?: number; offset?: number; sortBy?: unknown }) => { const { listR2 } = await import('./r2'); const items = await listR2(folder); return { data: items.map((item) => ({ name: item.Key?.split('/').pop() || '', id: item.Key || '' })), error: null }; },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${process.env.R2_PUBLIC_URL}/${path}` } }),
    }),
  } : browserStorage(),
  channel: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }), subscribe: () => ({}) }),
  removeChannel: () => {},
};
