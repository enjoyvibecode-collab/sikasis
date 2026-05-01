import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getDocs, query, collection, where, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  schoolActive: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  schoolActive: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolActive, setSchoolActive] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          let profileDoc = await getDoc(userDocRef);

          if (!profileDoc.exists() && authUser.email) {
            const inviteQuery = query(collection(db, 'users'), where('inviteEmail', '==', authUser.email));
            const inviteSnap = await getDocs(inviteQuery);
            
            if (!inviteSnap.empty) {
              const inviteDoc = inviteSnap.docs[0];
              const inviteData = inviteDoc.data();
              await setDoc(userDocRef, { ...inviteData, inviteEmail: null, status: 'active' });
              await deleteDoc(inviteDoc.ref);
              profileDoc = await getDoc(userDocRef);
            }
          }

          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            setProfile(data);

            // Check if school is active
            if (data.role === 'owner') {
              setSchoolActive(true);
            } else if (data.schoolId) {
              const schoolDoc = await getDoc(doc(db, 'schools', data.schoolId));
              if (schoolDoc.exists()) {
                setSchoolActive(schoolDoc.data().status === 'active');
              }
            } else {
              setSchoolActive(false);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setProfile(null);
        setSchoolActive(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, schoolActive }}>
      {children}
    </AuthContext.Provider>
  );
};
