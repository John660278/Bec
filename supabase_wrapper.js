// --- Supabase Wrapper to mock Firebase API ---
window.firebase = {
    auth: () => ({
        onAuthStateChanged: (cb) => {
            const user = sessionStorage.getItem('loggedInUser');
            cb(user ? JSON.parse(user) : null);
        }
    }),
    firestore: {
        FieldValue: {
            serverTimestamp: () => new Date().toISOString(),
            increment: (val) => val // Ignored in simple wrapper, handled manually if needed
        }
    }
};

class MockDoc {
    constructor(data, id) {
        this._data = data;
        this.id = id;
    }
    data() { return this._data; }
}

class MockQuery {
    constructor(table) {
        this.table = table;
        this.q = window.myAppDb.from(table).select('*');
        this._order = null;
    }
    where(field, op, val) {
        if (op === '==') this.q = this.q.eq(field, val);
        else if (op === '!=') this.q = this.q.neq(field, val);
        else if (op === '>') this.q = this.q.gt(field, val);
        else if (op === '<') this.q = this.q.lt(field, val);
        return this;
    }
    orderBy(field, dir = 'asc') {
        this._order = { field, ascending: dir === 'asc' };
        this.q = this.q.order(field, { ascending: dir === 'asc' });
        return this;
    }
    limit(n) {
        this.q = this.q.limit(n);
        return this;
    }
    async get() {
        const { data, error } = await this.q;
        if (error) { console.error('Supabase Error:', error); throw error; }
        
        let sortedData = data || [];
        // If sorting by date and it failed in supabase due to text column, sort manually
        if (this._order && this._order.field.includes('At')) {
            sortedData.sort((a,b) => {
                const d1 = new Date(a[this._order.field] || 0);
                const d2 = new Date(b[this._order.field] || 0);
                return this._order.ascending ? d1 - d2 : d2 - d1;
            });
        }
        
        return {
            empty: sortedData.length === 0,
            size: sortedData.length,
            docs: sortedData.map(d => new MockDoc(d, d.id || d.email))
        };
    }
}

class MockCollection {
    constructor(name) { this.name = name; }
    where(f, o, v) { return new MockQuery(this.name).where(f, o, v); }
    orderBy(f, d) { return new MockQuery(this.name).orderBy(f, d); }
    limit(n) { return new MockQuery(this.name).limit(n); }
    async get() { return new MockQuery(this.name).get(); }
    
    doc(id) {
        const docId = id || crypto.randomUUID();
        return {
            id: docId,
            get: async () => {
                const key = this.name === 'users' ? 'email' : 'id';
                const { data, error } = await window.myAppDb.from(this.name).select('*').eq(key, docId).maybeSingle();
                if (error || !data) return { exists: false, data: () => null };
                return { exists: true, data: () => data };
            },
            set: async (data, opts) => {
                const key = this.name === 'users' ? 'email' : 'id';
                data[key] = docId;
                await window.myAppDb.from(this.name).upsert([data]);
            },
            update: async (data) => {
                const key = this.name === 'users' ? 'email' : 'id';
                // Remove FieldValue instances from data before update
                const cleanData = {};
                for (let k in data) {
                    if (typeof data[k] !== 'function') cleanData[k] = data[k];
                }
                await window.myAppDb.from(this.name).update(cleanData).eq(key, docId);
            },
            delete: async () => {
                const key = this.name === 'users' ? 'email' : 'id';
                await window.myAppDb.from(this.name).delete().eq(key, docId);
            }
        };
    }
    async add(data) {
        const docId = crypto.randomUUID();
        data.id = docId;
        await window.myAppDb.from(this.name).insert([data]);
        return { id: docId };
    }
}

window.db = {
    collection: (name) => new MockCollection(name),
    batch: () => {
        let ops = [];
        return {
            set: (ref, data) => ops.push(() => ref.set(data)),
            update: (ref, data) => ops.push(() => ref.update(data)),
            delete: (ref) => ops.push(() => ref.delete()),
            commit: async () => { for (let o of ops) await o(); }
        }
    }
};

// Global polyfill for showToast
window.showToast = window.showToast || function(msg) { alert(msg); };
