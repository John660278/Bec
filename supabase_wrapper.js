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
            increment: (val) => val
        }
    }
};

function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}
function convertKeysToSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj = {};
    for (const key in obj) {
        newObj[toSnakeCase(key)] = obj[key];
    }
    return newObj;
}
function convertKeysToCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj = {};
    for (const key in obj) {
        newObj[toCamelCase(key)] = obj[key];
    }
    return newObj;
}

class MockDoc {
    constructor(data, id) {
        this._data = convertKeysToCamel(data);
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
        const snakeField = toSnakeCase(field);
        if (op === '==') this.q = this.q.eq(snakeField, val);
        else if (op === '!=') this.q = this.q.neq(snakeField, val);
        else if (op === '>') this.q = this.q.gt(snakeField, val);
        else if (op === '<') this.q = this.q.lt(snakeField, val);
        return this;
    }
    orderBy(field, dir = 'asc') {
        const snakeField = toSnakeCase(field);
        this._order = { field: snakeField, ascending: dir === 'asc' };
        this.q = this.q.order(snakeField, { ascending: dir === 'asc' });
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
                return { exists: true, data: () => convertKeysToCamel(data) };
            },
            set: async (data, opts) => {
                const key = this.name === 'users' ? 'email' : 'id';
                data[toCamelCase(key)] = docId;
                await window.myAppDb.from(this.name).upsert([convertKeysToSnake(data)]);
            },
            update: async (data) => {
                const key = this.name === 'users' ? 'email' : 'id';
                const cleanData = {};
                for (let k in data) {
                    if (typeof data[k] !== 'function') cleanData[k] = data[k];
                }
                await window.myAppDb.from(this.name).update(convertKeysToSnake(cleanData)).eq(key, docId);
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
        await window.myAppDb.from(this.name).insert([convertKeysToSnake(data)]);
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

window.showToast = window.showToast || function(msg) { alert(msg); };
