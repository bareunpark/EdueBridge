
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

class PersistenceService {
  private getLocal(key: string): any[] {
    const data = localStorage.getItem(`edu_db_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private setLocal(key: string, data: any[]) {
    localStorage.setItem(`edu_db_${key}`, JSON.stringify(data));
  }

  async getAll<T>(collectionName: string): Promise<T[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, collectionName));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
      } catch (e) {
        console.warn(`Firebase read failed for ${collectionName}, falling back to local.`);
      }
    }
    // Fallback to initial seed data for users if local is empty
    if (collectionName === 'users' && this.getLocal(collectionName).length === 0) {
        const initialUsers = JSON.parse(localStorage.getItem('edu_users') || '[]');
        if (initialUsers.length > 0) return initialUsers;
    }
    return this.getLocal(collectionName) as T[];
  }

  async add<T>(collectionName: string, data: any): Promise<T> {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, collectionName), data);
        return { id: docRef.id, ...data } as unknown as T;
      } catch (e) { console.error(e); throw e; }
    }
    const localData = this.getLocal(collectionName);
    const newItem = { id: Math.random().toString(36).substr(2, 9), ...data };
    this.setLocal(collectionName, [...localData, newItem]);
    return newItem as unknown as T;
  }

  async update(collectionName: string, id: string, data: any): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, collectionName, id), data);
        return;
      } catch (e) { console.error(e); throw e; }
    }
    const localData = this.getLocal(collectionName);
    const updated = localData.map(item => item.id === id ? { ...item, ...data } : item);
    this.setLocal(collectionName, updated);
  }

  async delete(collectionName: string, id: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        return;
      } catch (e) { console.error(e); throw e; }
    }
    const localData = this.getLocal(collectionName);
    const filtered = localData.filter(item => item.id !== id);
    this.setLocal(collectionName, filtered);
  }

  async queryByField<T>(collectionName: string, field: string, value: any): Promise<T[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, collectionName), where(field, "==", value));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
      } catch (e) { console.warn(e); }
    }
    const localData = this.getLocal(collectionName);
    return localData.filter(item => item[field] === value) as T[];
  }
}

export const persistence = new PersistenceService();
